import { NextRequest, NextResponse } from "next/server";
import { callArenaApi } from "@/src/lib/arena-edge";

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const result = await callArenaApi("results", {
      code,
      hostToken: request.headers.get("x-host-token"),
      playerToken: request.headers.get("x-player-token"),
      playerId: request.nextUrl.searchParams.get("playerId"),
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("results proxy failed", error);
    return NextResponse.json({ error: "Gagal menghubungi Arena API." }, { status: 502 });
  }
}
