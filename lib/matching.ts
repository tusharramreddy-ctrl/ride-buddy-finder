import { codeReason, rankByCode } from "./filters";
import type { MatchPrefs } from "./prefs";
import type { DemoRider } from "./riders";

export type AiPick = { riderId: string; reason: string };
export type Match = { rider: DemoRider; reason: string; reasonSource: "ai" | "code" };

export const MATCH_COUNT = 3;

// Combines the AI's picks with code checks:
// - only riders on the filtered shortlist are allowed (no made-up or filtered-out riders)
// - no duplicates, sensible reason length
// - any gaps are filled from the plain-code ranking with a plain-code reason
export function buildMatches(profile: MatchPrefs, candidates: DemoRider[], aiPicks: AiPick[] | null): Match[] {
  const byId = new Map(candidates.map((r) => [r.id, r]));
  const matches: Match[] = [];
  const used = new Set<string>();

  for (const pick of aiPicks ?? []) {
    if (matches.length >= MATCH_COUNT) break;
    const rider = byId.get(pick.riderId);
    const reason = pick.reason?.trim() ?? "";
    if (!rider || used.has(rider.id) || reason.length < 10 || reason.length > 300) continue;
    matches.push({ rider, reason, reasonSource: "ai" });
    used.add(rider.id);
  }

  for (const rider of rankByCode(profile, candidates)) {
    if (matches.length >= MATCH_COUNT) break;
    if (used.has(rider.id)) continue;
    matches.push({ rider, reason: codeReason(profile, rider), reasonSource: "code" });
    used.add(rider.id);
  }

  return matches;
}
