// app/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client “public” (safe pentru read, dacă ai RLS ok).
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: { persistSession: false },
});
