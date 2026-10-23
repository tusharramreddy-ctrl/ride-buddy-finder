import { describe, expect, it } from "vitest";
import { describeByCode, describeInputSchema } from "@/lib/describe";

describe("drafting a description from the profile", () => {
  it("uses only the profile's facts", () => {
    const text = describeByCode({
      level: "Intermediate",
      style: "cruiser",
      area: "Jayanagar",
      availability: ["weekend-mornings", "weekend-afternoons"],
      bike: "Royal Enfield Classic 350",
      bio: "",
    });
    expect(text).toContain("an intermediate rider on a Royal Enfield Classic 350");
    expect(text).toContain("weekend mornings and weekend afternoons");
    expect(text).toContain("Jayanagar");
  });

  it("leaves out what the profile doesn't say", () => {
    const text = describeByCode({ level: "Beginner", style: null, area: null, availability: [], bike: null, bio: "" });
    expect(text).toBe("I'm a beginner rider.");
  });

  it("rejects an unknown area", () => {
    const bad = describeInputSchema.safeParse({ level: "Beginner", style: null, area: "Mars", availability: [], bike: null, bio: "" });
    expect(bad.success).toBe(false);
  });
});
