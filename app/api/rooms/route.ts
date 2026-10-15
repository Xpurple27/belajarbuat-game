import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { createOpaqueToken, hashToken } from "@/src/lib/tokens";
import { createGameState } from "@/src/core/game";

function randomRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST() {
  try {
    const supabase = createSupabaseAdmin();
    const hostToken = createOpaqueToken();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = randomRoomCode();
      const { data, error } = await supabase
        .from("arena_rooms")
        .insert({
          code,
          host_token_hash: hashToken(hostToken),
          status: "waiting",
          current_game: "tug-of-war",
          current_round: 0,
          game_state: createGameState("tug-of-war"),
        })
        .select("id, code, status, current_game, current_round, game_state")
        .single();

      if (!error && data) {
        return NextResponse.json({ room: data, hostToken });
      }

      if (error?.code !== "23505") throw error;
    }

    return NextResponse.json({ error: "Gagal membuat kode room unik." }, { status: 503 });
  } catch (error) {
    console.error("create room failed", error);
    return NextResponse.json({ error: "Gagal membuat room." }, { status: 500 });
  }
}
