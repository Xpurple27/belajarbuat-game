import { NextRequest, NextResponse } from "next/server";
import { callSupabaseFunction } from "@/src/lib/arena-edge";

export async function GET(_request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const result = await callSupabaseFunction("arena-character", { action: "list", code });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("character list proxy failed", error);
    return NextResponse.json({ error: "Gagal memuat karakter Arena." }, { status: 502 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const result = await callSupabaseFunction("arena-character", {
      action: "set",
      code,
      playerId: body.playerId,
      playerToken: request.headers.get("x-player-token"),
      characterId: body.characterId,
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("character set proxy failed", error);
    return NextResponse.json({ error: "Gagal menyimpan karakter Arena." }, { status: 502 });
  }
}
