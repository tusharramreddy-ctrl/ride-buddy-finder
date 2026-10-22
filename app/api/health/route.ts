import { connection } from "next/server";

// Quick check for deployments: says whether an AI key is configured.
// It only ever reports yes/no, never the key itself.
export async function GET() {
  await connection(); // read settings when asked, not once at build time
  const key = process.env.OPENROUTER_API_KEY?.trim() ?? "";
  return Response.json({
    ok: true,
    aiKeyConfigured: key.length > 0,
    aiKeyLooksRight: key.startsWith("sk-or-"),
  });
}
