import { NextRequest, NextResponse } from "next/server";
import { callArenaApi } from "@/src/lib/arena-edge";

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const result = await callArenaApi("start-round", {
      code,
      hostToken: request.headers.get("x-host-token"),
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("start round proxy failed", error);
    return NextResponse.json({ error: "Gagal menghubungi Arena API." }, { status: 502 });
  }
}
