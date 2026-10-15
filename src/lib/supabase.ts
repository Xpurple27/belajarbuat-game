import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseClientKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseClientKey) {
  console.warn("Supabase env belum dikonfigurasi. Realtime dan database belum aktif.");
}

export const supabase = createClient(
  supabaseUrl ?? "http://127.0.0.1:54321",
  supabaseClientKey ?? "missing-client-key",
);
