import { describe, expect, it } from "vitest";
import { findModel } from "@/lib/bikes";
import { areNearby } from "@/lib/constants";
import { failsSafetyRule, passesHardFilters, shortlist } from "@/lib/filters";
import { buildMatches } from "@/lib/matching";
import { RIDERS } from "@/lib/riders";
import { makeProfile, makeRider } from "./helpers";

describe("demo data", () => {
  it("has about 25 riders, all marked as demo, with real bikes", () => {
    expect(RIDERS.length).toBe(25);
    for (const r of RIDERS) {
      expect(r.isDemo).toBe(true);
      expect(findModel(r.bikeId)).toBeDefined();
    }
  });
});

describe("hard filters", () => {
  it("needs a shared time slot", () => {
    const rider = makeRider({ availability: ["weekday-evenings"] });
    expect(passesHardFilters(makeProfile(), rider)).toBe(false);
  });

  it("needs the same or a neighbouring area", () => {
    expect(areNearby("Jayanagar", "JP Nagar")).toBe(true);
    expect(areNearby("JP Nagar", "Jayanagar")).toBe(true);
    expect(areNearby("Jayanagar", "Yelahanka")).toBe(false);
    expect(passesHardFilters(makeProfile(), makeRider({ area: "Yelahanka" }))).toBe(false);
  });

  it("never pairs a beginner with an advanced carver, either way round", () => {
    const fast = makeRider({ level: "Advanced", character: "carver" });
    expect(failsSafetyRule(makeProfile({ level: "Beginner" }), fast)).toBe(true);
    expect(failsSafetyRule(makeProfile({ level: "Intermediate" }), fast)).toBe(false);

    const advancedCarver = makeProfile({ level: "Advanced", character: "carver" });
    expect(failsSafetyRule(advancedCarver, makeRider({ level: "Beginner" }))).toBe(true);
  });

  it("gives the sample beginner in Jayanagar at least 3 safe matches", () => {
    const list = shortlist(makeProfile(), RIDERS);
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.some((r) => r.level === "Advanced" && r.character === "carver")).toBe(false);
  });
});

describe("buildMatches", () => {
  const profile = makeProfile();
  const candidates = shortlist(profile, RIDERS);

  it("keeps valid AI picks in order", () => {
    const picks = candidates.slice(0, 3).map((r) => ({ riderId: r.id, reason: `Great fit with ${r.name} because…` }));
    const matches = buildMatches(profile, candidates, picks);
    expect(matches.map((m) => m.rider.id)).toEqual(candidates.slice(0, 3).map((r) => r.id));
    expect(matches.every((m) => m.reasonSource === "ai")).toBe(true);
  });

  it("drops invented, filtered-out and duplicate riders, then fills gaps from code", () => {
    const first = candidates[0];
    const picks = [
      { riderId: "r999", reason: "This rider does not exist at all." },
      { riderId: "r05", reason: "Advanced carver, should be filtered out." },
      { riderId: first.id, reason: "A perfectly good reason here." },
      { riderId: first.id, reason: "Same rider twice, should be dropped." },
    ];
    const matches = buildMatches(profile, candidates, picks);
    expect(matches).toHaveLength(3);
    expect(new Set(matches.map((m) => m.rider.id)).size).toBe(3);
    expect(matches.every((m) => candidates.includes(m.rider))).toBe(true);
    expect(matches[0].reasonSource).toBe("ai");
    expect(matches[1].reasonSource).toBe("code");
  });

  it("works with no AI answer at all", () => {
    expect(buildMatches(profile, candidates, null)).toHaveLength(3);
  });

  it("shows fewer than 3 rather than inventing riders", () => {
    expect(buildMatches(profile, candidates.slice(0, 1), null)).toHaveLength(1);
    expect(buildMatches(profile, [], null)).toHaveLength(0);
  });
});
