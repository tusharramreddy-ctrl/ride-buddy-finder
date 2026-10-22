import { describe, expect, it } from "vitest";
import { looksLikeText, parseProfile } from "@/lib/profile";
import { makeProfile } from "./helpers";

describe("looksLikeText", () => {
  it("accepts normal names", () => {
    expect(looksLikeText("Asha", 2, 40)).toBe(true);
    expect(looksLikeText("Classic 350", 2, 40)).toBe(true);
  });
  it("rejects empty, symbols-only and repeated characters", () => {
    expect(looksLikeText("", 2, 40)).toBe(false);
    expect(looksLikeText("   ", 2, 40)).toBe(false);
    expect(looksLikeText("!!!", 2, 40)).toBe(false);
    expect(looksLikeText("1234", 2, 40)).toBe(false);
    expect(looksLikeText("aaaaaa", 2, 40)).toBe(false);
    expect(looksLikeText("x".repeat(41), 2, 40)).toBe(false);
  });
});

describe("parseProfile", () => {
  it("accepts a complete profile", () => {
    expect(parseProfile(makeProfile()).ok).toBe(true);
  });

  it("rejects an empty form with friendly messages", () => {
    const result = parseProfile({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).length).toBeGreaterThan(3);
  });

  it("rejects a model that isn't in the brand's list (tampered request)", () => {
    const result = parseProfile(makeProfile({ bike: { brand: "Honda", modelId: "made-up-bike" } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["bike.modelId"]).toBeDefined();
  });

  it("rejects a model from a different brand", () => {
    const result = parseProfile(makeProfile({ bike: { brand: "Honda", modelId: "re-classic-350" } }));
    expect(result.ok).toBe(false);
  });

  it("needs a typed model and type for 'Other'", () => {
    expect(parseProfile(makeProfile({ bike: { brand: "Honda", modelId: "other" } })).ok).toBe(false);
    expect(
      parseProfile(makeProfile({ bike: { brand: "Honda", modelId: "other", customModel: "asdf" } })).ok,
    ).toBe(false);
    expect(
      parseProfile(
        makeProfile({ bike: { brand: "Honda", modelId: "other", customModel: "CB200X", customType: "Adventure" } }),
      ).ok,
    ).toBe(true);
  });

  it("rejects no availability and skipped quiz questions", () => {
    expect(parseProfile(makeProfile({ availability: [] })).ok).toBe(false);
    expect(parseProfile(makeProfile({ quizAnswers: [0, 0, 0] })).ok).toBe(false);
  });

  it("recalculates the character from the quiz instead of trusting it", () => {
    const result = parseProfile(makeProfile({ character: "carver" }));
    expect(result.ok && result.profile.character).toBe("cruiser");
  });
});
