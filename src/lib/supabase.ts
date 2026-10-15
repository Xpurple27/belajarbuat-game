import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn("Supabase env belum dikonfigurasi. Realtime dan database belum aktif.");
}

export const supabase = createClient(
  supabaseUrl ?? "http://127.0.0.1:54321",
  supabasePublishableKey ?? "missing-publishable-key",
);
