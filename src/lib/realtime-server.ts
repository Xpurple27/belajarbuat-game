import { createSupabaseAdmin } from "@/src/lib/supabase-server";

export async function broadcastRoomEvent(
  roomCode: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const supabase = createSupabaseAdmin();
  const channel = supabase.channel(`arena-room-${roomCode}`);

  try {
    const status = await channel.send({
      type: "broadcast",
      event,
      payload,
    });

    if (status !== "ok") {
      console.warn("Realtime broadcast returned", status, event, roomCode);
    }
  } finally {
    await supabase.removeChannel(channel);
  }
}
