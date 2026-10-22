import type { Profile } from "@/lib/profile";
import type { DemoRider } from "@/lib/riders";

// Quiz answers where every answer is option 0 ("cruiser").
export const CRUISER_ANSWERS = [0, 0, 0, 0, 0, 0, 0];

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    version: 1,
    name: "Asha",
    level: "Beginner",
    bike: { brand: "Royal Enfield", modelId: "re-classic-350" },
    area: "Jayanagar",
    availability: ["weekend-mornings"],
    quizAnswers: CRUISER_ANSWERS,
    character: "cruiser",
    ...overrides,
  };
}

export function makeRider(overrides: Partial<DemoRider> = {}): DemoRider {
  return {
    id: "t1",
    name: "Test R.",
    isDemo: true,
    level: "Intermediate",
    bikeId: "re-classic-350",
    character: "cruiser",
    area: "Jayanagar",
    availability: ["weekend-mornings"],
    bio: "Test rider.",
    ...overrides,
  };
}
