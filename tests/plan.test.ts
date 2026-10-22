import { describe, expect, it } from "vitest";
import { buildPlan, codeChoice, DESTINATIONS, pairPace, planBasics, planMessage, startTimeInWindow, type PlanRider } from "@/lib/plan";

function rider(overrides: Partial<PlanRider> = {}): PlanRider {
  return {
    name: "Asha",
    level: "Intermediate",
    style: "cruiser",
    area: "Jayanagar",
    availability: ["weekend-mornings"],
    bikeType: "Cruiser",
    ...overrides,
  };
}

function basicsFor(a: PlanRider, b: PlanRider) {
  const result = planBasics(a, b);
  if (!result.ok) throw new Error(result.error);
  return result.basics;
}

describe("ride planning rules", () => {
  it("needs a free time both riders share", () => {
    const result = planBasics(rider(), rider({ name: "Ravi", availability: ["weekday-evenings"] }));
    expect(result.ok).toBe(false);
  });

  it("prefers weekend mornings when several times are shared", () => {
    const both = ["weekday-evenings", "weekend-mornings"] as const;
    const b = basicsFor(rider({ availability: [...both] }), rider({ name: "Ravi", availability: [...both] }));
    expect(b.slot).toBe("weekend-mornings");
  });

  it("rides at the slower rider's pace, and relaxed with any beginner", () => {
    expect(pairPace(rider({ style: "carver" }), rider({ style: "explorer" }))).toBe("moderate");
    expect(pairPace(rider({ style: "carver", level: "Advanced" }), rider({ style: "carver", level: "Beginner" }))).toBe("relaxed");
    expect(pairPace(rider({ style: null }), rider({ style: "carver" }))).toBe("relaxed");
  });

  it("keeps beginners to short, beginner-friendly destinations", () => {
    const b = basicsFor(rider({ level: "Beginner" }), rider({ name: "Ravi", level: "Advanced", style: "carver" }));
    expect(b.candidates.length).toBeGreaterThan(0);
    for (const d of b.candidates) {
      expect(d.beginnerFriendly).toBe(true);
      expect(d.km).toBeLessThanOrEqual(50);
    }
  });

  it("keeps weekday rides short", () => {
    const b = basicsFor(rider({ level: "Advanced", availability: ["weekday-mornings"] }), rider({ name: "Ravi", level: "Advanced", availability: ["weekday-mornings"] }));
    for (const d of b.candidates) expect(d.km).toBeLessThanOrEqual(40);
  });

  it("lists destinations that suit both styles first", () => {
    const b = basicsFor(rider({ level: "Advanced", style: "carver" }), rider({ name: "Ravi", level: "Advanced", style: "explorer" }));
    const top = b.candidates[0];
    expect(top.styles).toContain("carver");
    expect(top.styles).toContain("explorer");
  });

  it("meets in the shared area, or between two areas", () => {
    expect(basicsFor(rider(), rider({ name: "Ravi" })).meetArea).toBe("Jayanagar");
    expect(basicsFor(rider(), rider({ name: "Ravi", area: "JP Nagar" })).meetArea).toBe("between Jayanagar and JP Nagar");
  });
});

describe("checking the AI's choice", () => {
  const a = rider({ level: "Beginner" });
  const b = rider({ name: "Ravi" });
  const basics = basicsFor(a, b);

  it("replaces a destination outside the allowed list", () => {
    const nandi = DESTINATIONS.find((d) => d.id === "nandi-hills")!;
    expect(basics.candidates).not.toContain(nandi);
    const plan = buildPlan(basics, { ...codeChoice(a, b, basics), destinationId: "nandi-hills", backupId: "made-up" }, "ai");
    expect(basics.candidates).toContain(plan.destination);
    expect(plan.backup?.id).not.toBe(plan.destination.id);
  });

  it("keeps the start time inside the free-time window", () => {
    expect(startTimeInWindow("07:15", "weekend-mornings")).toBe("07:15");
    expect(startTimeInWindow("22:00", "weekend-mornings")).toBe("06:30");
    expect(startTimeInWindow("7am", "weekend-mornings")).toBe("06:30");
  });

  it("adds the beginner safety note from code", () => {
    const plan = buildPlan(basics, codeChoice(a, b, basics), "code");
    expect(plan.safety.some((s) => s.includes("beginner"))).toBe(true);
  });

  it("fits the plan into one chat message", () => {
    const plan = buildPlan(basics, { ...codeChoice(a, b, basics), summary: "x".repeat(2000) }, "ai");
    expect(planMessage(plan).length).toBeLessThanOrEqual(1000);
  });
});
