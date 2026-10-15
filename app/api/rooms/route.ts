import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { createOpaqueToken, hashToken } from "@/src/lib/tokens";
import { AI_PROFILES } from "@/src/core/ai";
import {
  createGameState,
  type AiDifficulty,
  type OpponentMode,
} from "@/src/core/game";

interface CreateRoomBody {
  opponentMode?: OpponentMode;
  aiDifficulty?: AiDifficulty;
  hostPlays?: boolean;
  hostDisplayName?: string;
  hostGradeLevel?: number;
}

function randomRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateRoomBody;
    const opponentMode: OpponentMode = body.opponentMode === "ai" ? "ai" : "multiplayer";
    const aiDifficulty: AiDifficulty = body.aiDifficulty === "easy" || body.aiDifficulty === "hard" ? body.aiDifficulty : "medium";
    const hostPlays = Boolean(body.hostPlays);
    const hostDisplayName = body.hostDisplayName?.trim().slice(0, 24) || "Host";
    const hostGradeLevel = Number(body.hostGradeLevel ?? 7);

    if (hostPlays && (!Number.isInteger(hostGradeLevel) || hostGradeLevel < 1 || hostGradeLevel > 12)) {
      return NextResponse.json({ error: "Kelas host tidak valid." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const hostToken = createOpaqueToken();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = randomRoomCode();
      const { data: room, error } = await supabase
        .from("arena_rooms")
        .insert({
          code,
          host_token_hash: hashToken(hostToken),
          status: "waiting",
          current_game: "tug-of-war",
          current_round: 0,
          game_state: createGameState("tug-of-war"),
          opponent_mode: opponentMode,
          ai_difficulty: aiDifficulty,
        })
        .select("id, code, status, current_game, current_round, game_state, opponent_mode, ai_difficulty")
        .single();

      if (error?.code === "23505") continue;
      if (error || !room) throw error;

      let hostPlayerSession = null;

      try {
        if (hostPlays) {
          const playerToken = createOpaqueToken();
          const { data: hostPlayer, error: hostPlayerError } = await supabase
            .from("arena_players")
            .insert({
              room_id: room.id,
              player_token_hash: hashToken(playerToken),
              display_name: hostDisplayName,
              grade_level: hostGradeLevel,
              side: "A",
              player_type: "human",
              is_host_player: true,
            })
            .select("id, display_name, grade_level, side, player_type, is_host_player")
            .single();

          if (hostPlayerError || !hostPlayer) throw hostPlayerError;

          hostPlayerSession = {
            id: hostPlayer.id,
            token: playerToken,
            side: hostPlayer.side,
            displayName: hostPlayer.display_name,
            gradeLevel: hostPlayer.grade_level,
            playerType: hostPlayer.player_type,
            isHostPlayer: true,
          };

          if (opponentMode === "ai") {
            const aiToken = createOpaqueToken();
            const { error: aiError } = await supabase.from("arena_players").insert({
              room_id: room.id,
              player_token_hash: hashToken(aiToken),
              display_name: AI_PROFILES[aiDifficulty].label,
              grade_level: hostGradeLevel,
              side: "B",
              player_type: "ai",
              is_host_player: false,
            });
            if (aiError) throw aiError;
          }
        }
      } catch (playerSetupError) {
        await supabase.from("arena_rooms").delete().eq("id", room.id);
        throw playerSetupError;
      }

      return NextResponse.json({
        room,
        hostToken,
        hostPlayerSession,
      });
    }

    return NextResponse.json({ error: "Gagal membuat kode room unik." }, { status: 503 });
  } catch (error) {
    console.error("create room failed", error);
    return NextResponse.json({ error: "Gagal membuat room." }, { status: 500 });
  }
}
