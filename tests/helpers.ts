import type { MatchPrefs } from "@/lib/prefs";
import type { DemoRider } from "@/lib/riders";

export function makePrefs(overrides: Partial<MatchPrefs> = {}): MatchPrefs {
  return {
    name: "Asha",
    level: "Beginner",
    bike: { kind: "catalog", modelId: "re-classic-350" },
    area: "Jayanagar",
    availability: ["weekend-mornings"],
    style: "cruiser",
    gender: null,
    womenOnly: false,
    ...overrides,
  };
}

export function makeRider(overrides: Partial<DemoRider> = {}): DemoRider {
  return {
    id: "t1",
    name: "Test R.",
    username: "testr",
    isDemo: true,
    level: "Intermediate",
    bikeId: "re-classic-350",
    character: "cruiser",
    area: "Jayanagar",
    availability: ["weekend-mornings"],
    gender: null,
    womenOnly: false,
    bio: "Test rider.",
    ...overrides,
  };
}
