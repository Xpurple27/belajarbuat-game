import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { tokenMatches } from "@/src/lib/tokens";
import { broadcastRoomEvent } from "@/src/lib/realtime-server";
import { createGameState, nextGameMode, type ArenaGameState, type GameMode } from "@/src/core/game";

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const hostToken = request.headers.get("x-host-token");
    const supabase = createSupabaseAdmin();

    const { data: room, error } = await supabase
      .from("arena_rooms")
      .select("id, code, host_token_hash, current_game, game_state, status")
      .eq("code", code)
      .single();

    if (error || !room) return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
    if (!tokenMatches(hostToken, room.host_token_hash)) {
      return NextResponse.json({ error: "Host token tidak valid." }, { status: 401 });
    }

    const state = room.game_state as ArenaGameState;
    if (!state?.complete) {
      return NextResponse.json({ error: "Game saat ini belum selesai." }, { status: 409 });
    }

    const next = nextGameMode(room.current_game as GameMode);
    if (!next) {
      const { error: finishError } = await supabase
        .from("arena_rooms")
        .update({ status: "finished", updated_at: new Date().toISOString() })
        .eq("id", room.id);
      if (finishError) throw finishError;
      await broadcastRoomEvent(code, "session-finished", { code });
      return NextResponse.json({ finished: true });
    }

    const nextState = createGameState(next);
    const { error: updateError } = await supabase
      .from("arena_rooms")
      .update({
        current_game: next,
        current_round: 0,
        game_state: nextState,
        status: "paused",
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id);
    if (updateError) throw updateError;

    await broadcastRoomEvent(code, "game-changed", { gameMode: next, state: nextState });
    return NextResponse.json({ finished: false, gameMode: next, state: nextState });
  } catch (error) {
    console.error("advance game failed", error);
    return NextResponse.json({ error: "Gagal melanjutkan game." }, { status: 500 });
  }
}
