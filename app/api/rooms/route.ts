import { NextRequest, NextResponse } from "next/server";
import { callArenaApi } from "@/src/lib/arena-edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await callArenaApi("create-room", body);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("create room proxy failed", error);
    return NextResponse.json({ error: "Gagal menghubungi Arena API." }, { status: 502 });
  }
}
