import { describe, expect, it } from "vitest";
import { findModel } from "@/lib/bikes";
import { areNearby } from "@/lib/constants";
import { failsSafetyRule, failsWomenOnly, inCommon, passesHardFilters, shortlist } from "@/lib/filters";
import { buildMatches } from "@/lib/matching";
import { RIDERS } from "@/lib/riders";
import { makePrefs, makeRider } from "./helpers";

describe("demo data", () => {
  it("has 25 riders, all marked as demo, with real catalogue bikes", () => {
    expect(RIDERS.length).toBe(25);
    for (const r of RIDERS) {
      expect(r.isDemo).toBe(true);
      expect(findModel(r.bikeId)).toBeDefined();
    }
  });
});

describe("hard filters", () => {
  it("needs a shared time slot", () => {
    expect(passesHardFilters(makePrefs(), makeRider({ availability: ["weekday-evenings"] }))).toBe(false);
  });

  it("needs the same or a neighbouring area", () => {
    expect(areNearby("Jayanagar", "JP Nagar")).toBe(true);
    expect(areNearby("JP Nagar", "Jayanagar")).toBe(true);
    expect(areNearby("Jayanagar", "Yelahanka")).toBe(false);
    expect(passesHardFilters(makePrefs(), makeRider({ area: "Yelahanka" }))).toBe(false);
  });

  it("never pairs a beginner with an advanced carver, either way round", () => {
    const fast = makeRider({ level: "Advanced", character: "carver" });
    expect(failsSafetyRule(makePrefs({ level: "Beginner" }), fast)).toBe(true);
    expect(failsSafetyRule(makePrefs({ level: "Intermediate" }), fast)).toBe(false);
    expect(failsSafetyRule(makePrefs({ level: "Advanced", style: "carver" }), makeRider({ level: "Beginner" }))).toBe(true);
  });

  it("women-only: only shows riders who describe themselves as women", () => {
    const prefs = makePrefs({ womenOnly: true });
    expect(failsWomenOnly(prefs, makeRider({ gender: "woman" }))).toBe(false);
    expect(failsWomenOnly(prefs, makeRider({ gender: "man" }))).toBe(true);
    expect(failsWomenOnly(prefs, makeRider({ gender: null }))).toBe(true);
  });

  it("women-only works both ways: women-only riders are hidden from anyone not self-described as a woman", () => {
    const wo = makeRider({ gender: "woman", womenOnly: true });
    expect(failsWomenOnly(makePrefs({ gender: null }), wo)).toBe(true);
    expect(failsWomenOnly(makePrefs({ gender: "man" }), wo)).toBe(true);
    expect(failsWomenOnly(makePrefs({ gender: "woman" }), wo)).toBe(false);
  });

  it("women-only results from the real demo data contain only women", () => {
    const list = shortlist(makePrefs({ womenOnly: true, gender: "woman", availability: ["weekend-mornings", "weekend-afternoons", "weekday-evenings"] }), RIDERS);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.gender === "woman")).toBe(true);
  });

  it("gives the sample beginner in Jayanagar at least 3 safe matches", () => {
    const list = shortlist(makePrefs(), RIDERS);
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.some((r) => r.level === "Advanced" && r.character === "carver")).toBe(false);
  });

  it("works without a bike", () => {
    expect(shortlist(makePrefs({ bike: null }), RIDERS).length).toBeGreaterThanOrEqual(3);
  });

  it("lists only true shared facts", () => {
    const facts = inCommon(makePrefs(), makeRider());
    expect(facts).toContain("both are The Cruiser riders");
    expect(facts).toContain("both ride a Royal Enfield Classic 350");
    expect(facts).toContain("both ride from Jayanagar");
  });
});

describe("buildMatches", () => {
  const prefs = makePrefs();
  const candidates = shortlist(prefs, RIDERS);

  it("keeps valid AI picks in order", () => {
    const picks = candidates.slice(0, 3).map((r) => ({ riderId: r.id, reason: `Great fit with ${r.name} because…` }));
    const matches = buildMatches(prefs, candidates, picks);
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
    const matches = buildMatches(prefs, candidates, picks);
    expect(matches).toHaveLength(3);
    expect(new Set(matches.map((m) => m.rider.id)).size).toBe(3);
    expect(matches.every((m) => candidates.includes(m.rider))).toBe(true);
    expect(matches[0].reasonSource).toBe("ai");
    expect(matches[1].reasonSource).toBe("code");
  });

  it("shows fewer than 3 rather than inventing riders", () => {
    expect(buildMatches(prefs, candidates.slice(0, 1), null)).toHaveLength(1);
    expect(buildMatches(prefs, [], null)).toHaveLength(0);
  });
});
