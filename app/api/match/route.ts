import { z } from "zod";
import { AiUnavailableError, rankMatches } from "@/lib/ai";
import { rankByCode, shortlist } from "@/lib/filters";
import { fail, PROFILE_PROBLEM, readJson } from "@/lib/http";
import { buildMatches, MATCH_COUNT, type AiPick } from "@/lib/matching";
import { parseMatchPrefs } from "@/lib/prefs";
import { RIDERS } from "@/lib/riders";

const bodySchema = z.object({ prefs: z.unknown() });

// Give the AI a short list to choose from, so the request stays quick.
const MAX_CANDIDATES = 10;

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await readJson(request));
  const parsed = parseMatchPrefs(body.success ? body.data.prefs : undefined);
  if (!parsed.ok) return fail(422, PROFILE_PROBLEM, parsed.errors);
  const prefs = parsed.prefs;

  // 1. Hard filters in plain code: shared time, nearby area, safety rule, women-only.
  const candidates = rankByCode(prefs, shortlist(prefs, RIDERS)).slice(0, MAX_CANDIDATES);

  if (candidates.length === 0) {
    return Response.json({
      matches: [],
      note: "None of our demo riders fit your area, free times and filters right now. Try ticking more times or a nearby area.",
    });
  }

  // 2. Let the AI rank them (only when there's a real choice to make).
  let aiPicks: AiPick[] | null = null;
  let aiFailed = false;
  if (candidates.length > 1) {
    try {
      aiPicks = await rankMatches(prefs, candidates);
    } catch (error) {
      if (!(error instanceof AiUnavailableError)) throw error;
      aiFailed = true;
    }
  }

  // 3. Code checks the AI's picks and fills any gaps.
  const matches = buildMatches(prefs, candidates, aiPicks);

  return Response.json({
    matches: matches.map((m) => ({ riderId: m.rider.id, reason: m.reason, reasonSource: m.reasonSource })),
    note:
      matches.length < MATCH_COUNT
        ? `Only ${matches.length} demo rider${matches.length === 1 ? "" : "s"} fit your area, free times and filters right now.`
        : aiFailed
          ? "Our AI helper is busy, so these matches were ranked by simple rules instead."
          : undefined,
  });
}
