import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { tokenMatches } from "@/src/lib/tokens";

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const supabase = createSupabaseAdmin();
    const { data: room, error: roomError } = await supabase
      .from("arena_rooms")
      .select("id, code, host_token_hash, status, current_game, current_round, game_state, opponent_mode, ai_difficulty")
      .eq("code", code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
    }

    const hostToken = request.headers.get("x-host-token");
    const playerToken = request.headers.get("x-player-token");
    const playerId = request.nextUrl.searchParams.get("playerId");

    const isHost = tokenMatches(hostToken, room.host_token_hash);
    let requestingPlayer: { id: string; side: string; player_token_hash: string; player_type: string } | null = null;

    if (!isHost && playerId && playerToken) {
      const { data } = await supabase
        .from("arena_players")
        .select("id, side, player_token_hash, player_type")
        .eq("id", playerId)
        .eq("room_id", room.id)
        .single();
      if (data && data.player_type === "human" && tokenMatches(playerToken, data.player_token_hash)) requestingPlayer = data;
    }

    if (!isHost && !requestingPlayer) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const { data: players } = await supabase
      .from("arena_players")
      .select("id, display_name, grade_level, side, is_connected, player_type, is_host_player")
      .eq("room_id", room.id)
      .order("side");

    let question = null;
    if (requestingPlayer && room.current_round > 0 && room.status !== "waiting") {
      const { data: assignment } = await supabase
        .from("arena_round_assignments")
        .select("question_id")
        .eq("room_id", room.id)
        .eq("player_id", requestingPlayer.id)
        .eq("game_mode", room.current_game)
        .eq("round_number", room.current_round)
        .maybeSingle();

      if (assignment) {
        const { data } = await supabase
          .from("arena_questions")
          .select("id, grade_level, topic, subtopic, difficulty, question_type, question_text, question_image_url, options, estimated_time_seconds, power_value")
          .eq("id", assignment.question_id)
          .single();
        question = data;
      }
    }

    return NextResponse.json({
      room: {
        code: room.code,
        status: room.status,
        currentGame: room.current_game,
        currentRound: room.current_round,
        gameState: room.game_state,
        opponentMode: room.opponent_mode,
        aiDifficulty: room.ai_difficulty,
      },
      players,
      question,
    });
  } catch (error) {
    console.error("room snapshot failed", error);
    return NextResponse.json({ error: "Gagal membaca room." }, { status: 500 });
  }
}
