import { NextRequest, NextResponse } from "next/server";
import { callArenaApi } from "@/src/lib/arena-edge";

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await callArenaApi("answer", {
      code,
      playerToken: request.headers.get("x-player-token"),
      ...body,
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("answer proxy failed", error);
    return NextResponse.json({ error: "Gagal menghubungi Arena API." }, { status: 502 });
  }
}
