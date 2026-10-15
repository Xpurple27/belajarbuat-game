import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { createOpaqueToken, hashToken } from "@/src/lib/tokens";
import { AI_PROFILES } from "@/src/core/ai";
import type { AiDifficulty, OpponentMode, PlayerSide } from "@/src/core/game";

interface JoinBody {
  displayName?: string;
  gradeLevel?: number;
}

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = (await request.json()) as JoinBody;
    const displayName = body.displayName?.trim().slice(0, 24);
    const gradeLevel = Number(body.gradeLevel);

    if (!displayName || !Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
      return NextResponse.json({ error: "Nama atau kelas tidak valid." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: room, error: roomError } = await supabase
      .from("arena_rooms")
      .select("id, code, status, opponent_mode, ai_difficulty")
      .eq("code", code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
    }

    if (room.status !== "waiting") {
      return NextResponse.json({ error: "Game sudah dimulai." }, { status: 409 });
    }

    const opponentMode = room.opponent_mode as OpponentMode;
    const aiDifficulty = room.ai_difficulty as AiDifficulty;
    const { data: existingPlayers, error: playersError } = await supabase
      .from("arena_players")
      .select("side, player_type, is_host_player")
      .eq("room_id", room.id);

    if (playersError) throw playersError;

    const humans = (existingPlayers ?? []).filter((player) => player.player_type === "human");
    const usedSides = new Set((existingPlayers ?? []).map((player) => player.side));

    if (opponentMode === "ai" && humans.length >= 1) {
      return NextResponse.json({ error: "Room vs AI ini sudah memiliki pemain manusia." }, { status: 409 });
    }

    const side: PlayerSide | null = !usedSides.has("A") ? "A" : !usedSides.has("B") ? "B" : null;
    if (!side) {
      return NextResponse.json({ error: "Room sudah penuh." }, { status: 409 });
    }

    const playerToken = createOpaqueToken();
    const { data: player, error: insertError } = await supabase
      .from("arena_players")
      .insert({
        room_id: room.id,
        player_token_hash: hashToken(playerToken),
        display_name: displayName,
        grade_level: gradeLevel,
        side,
        player_type: "human",
        is_host_player: false,
      })
      .select("id, display_name, grade_level, side, player_type, is_host_player")
      .single();

    if (insertError || !player) throw insertError;

    try {
      if (opponentMode === "ai") {
        const aiSide: PlayerSide = side === "A" ? "B" : "A";
        const aiToken = createOpaqueToken();
        const { error: aiError } = await supabase.from("arena_players").insert({
          room_id: room.id,
          player_token_hash: hashToken(aiToken),
          display_name: AI_PROFILES[aiDifficulty].label,
          grade_level: gradeLevel,
          side: aiSide,
          player_type: "ai",
          is_host_player: false,
        });
        if (aiError) throw aiError;
      }
    } catch (aiError) {
      await supabase.from("arena_players").delete().eq("id", player.id);
      throw aiError;
    }

    return NextResponse.json({
      room: { code: room.code, opponentMode, aiDifficulty },
      player,
      playerToken,
    });
  } catch (error) {
    console.error("join room failed", error);
    return NextResponse.json({ error: "Gagal masuk room." }, { status: 500 });
  }
}
