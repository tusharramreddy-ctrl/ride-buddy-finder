import { AiUnavailableError, draftDescription } from "@/lib/ai";
import { describeByCode, describeInputSchema } from "@/lib/describe";
import { fail, readJson } from "@/lib/http";

// Drafts the rider's "how I ride" sentence from their profile.
export async function POST(request: Request) {
  const body = describeInputSchema.safeParse(await readJson(request));
  if (!body.success) return fail(400, "Something in your profile needs fixing before we can draft this.");

  try {
    return Response.json({ text: await draftDescription(body.data), source: "ai" });
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) throw error;
    return Response.json({ text: describeByCode(body.data), source: "code" });
  }
}
