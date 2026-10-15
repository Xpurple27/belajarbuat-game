type ArenaApiPayload = Record<string, unknown>;

export interface ArenaApiResult<T = Record<string, unknown>> {
  status: number;
  data: T;
}

function arenaEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase Arena environment belum dikonfigurasi.");
  }
  return { supabaseUrl, publishableKey };
}

export async function callSupabaseFunction<T = Record<string, unknown>>(
  functionName: string,
  payload: ArenaApiPayload = {},
): Promise<ArenaApiResult<T>> {
  const { supabaseUrl, publishableKey } = arenaEnv();
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: publishableKey,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({
    error: `${functionName} mengembalikan respons yang tidak valid.`,
  }))) as T;

  return { status: response.status, data };
}

export async function callArenaApi<T = Record<string, unknown>>(
  action: string,
  payload: ArenaApiPayload = {},
): Promise<ArenaApiResult<T>> {
  return callSupabaseFunction<T>("arena-api", { action, ...payload });
}
