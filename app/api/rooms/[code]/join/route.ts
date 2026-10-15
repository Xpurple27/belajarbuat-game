import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase-server";
import { createOpaqueToken, hashToken } from "@/src/lib/tokens";

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
      .select("id, code, status")
      .eq("code", code)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room tidak ditemukan." }, { status: 404 });
    }

    if (room.status !== "waiting") {
      return NextResponse.json({ error: "Game sudah dimulai." }, { status: 409 });
    }

    const { data: existingPlayers, error: playersError } = await supabase
      .from("arena_players")
      .select("side")
      .eq("room_id", room.id);

    if (playersError) throw playersError;

    const usedSides = new Set((existingPlayers ?? []).map((player) => player.side));
    const side = !usedSides.has("A") ? "A" : !usedSides.has("B") ? "B" : null;

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
      })
      .select("id, display_name, grade_level, side")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      room: { code: room.code },
      player,
      playerToken,
    });
  } catch (error) {
    console.error("join room failed", error);
    return NextResponse.json({ error: "Gagal masuk room." }, { status: 500 });
  }
}
