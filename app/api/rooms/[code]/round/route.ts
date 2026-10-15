import { NextRequest, NextResponse } from "next/server";
import { callSupabaseFunction } from "@/src/lib/arena-edge";

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const result = await callSupabaseFunction("arena-round-v2", {
      code,
      hostToken: request.headers.get("x-host-token"),
    });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("start round v2 proxy failed", error);
    return NextResponse.json({ error: "Gagal menghubungi selector ronde Arena." }, { status: 502 });
  }
}
