import { connection } from "next/server";

// Quick check for deployments: says whether each setting is configured.
// It only ever reports yes/no, never the values themselves.
export async function GET() {
  await connection(); // read settings when asked, not once at build time
  const key = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  return Response.json({
    ok: true,
    aiKeyConfigured: key.length > 0,
    aiKeyLooksRight: key.startsWith("sk-or-"),
    supabaseUrlConfigured: supabaseUrl.length > 0,
    supabaseUrlLooksRight: /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(supabaseUrl),
    supabaseKeyConfigured: supabaseKey.length > 0,
    supabaseKeyLooksRight: supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("eyJ"),
  });
}
