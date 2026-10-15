type ArenaApiPayload = Record<string, unknown>;

export interface ArenaApiResult<T = Record<string, unknown>> {
  status: number;
  data: T;
}

export async function callArenaApi<T = Record<string, unknown>>(
  action: string,
  payload: ArenaApiPayload = {},
): Promise<ArenaApiResult<T>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase Arena environment belum dikonfigurasi.");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/arena-api`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: publishableKey,
    },
    body: JSON.stringify({ action, ...payload }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({
    error: "Arena API mengembalikan respons yang tidak valid.",
  }))) as T;

  return { status: response.status, data };
}
