import { NextRequest, NextResponse } from "next/server";
import { callArenaApi } from "@/src/lib/arena-edge";

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await callArenaApi("join-room", { code, ...body });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("join room proxy failed", error);
    return NextResponse.json({ error: "Gagal menghubungi Arena API." }, { status: 502 });
  }
}
