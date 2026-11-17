import { createClient } from "@supabase/supabase-js";

// Client serveur uniquement : la clé secrète contourne la RLS et ne doit jamais atteindre le navigateur.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL ou SUPABASE_SECRET_KEY manquant");
  return createClient(url, key, { auth: { persistSession: false } });
}
