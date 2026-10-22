import { z } from "zod";
import {
  AREAS,
  BIKE_TYPES,
  CHARACTER_IDS,
  LEVELS,
  SLOT_IDS,
  type BikeType,
} from "./constants";
import { findBrand, findModel, OTHER_MODEL } from "./bikes";
import { QUIZ, scoreQuiz } from "./quiz";

// Plain-code text check: right length and contains real letters,
// not just "!!!" or "aaaa".
export function looksLikeText(value: string, min: number, max: number): boolean {
  const v = value.trim();
  if (v.length < min || v.length > max) return false;
  if (!/\p{L}/u.test(v)) return false;
  if (/^(.)\1+$/u.test(v.replace(/\s/g, ""))) return false;
  return true;
}

const nameSchema = z
  .string()
  .trim()
  .refine((v) => looksLikeText(v, 2, 40), {
    message: "Please enter a first name or nickname (2–40 letters).",
  });

const bikeSchema = z
  .object({
    brand: z.string().min(1, "Please choose your bike's brand."),
    modelId: z.string().min(1, "Please choose your bike's model."),
    customModel: z.string().trim().optional(),
    customType: z.enum(BIKE_TYPES).optional(),
  })
  .superRefine((bike, ctx) => {
    const brand = findBrand(bike.brand);
    if (!brand) {
      ctx.addIssue({ code: "custom", path: ["brand"], message: "Please choose a brand from the list." });
      return;
    }
    if (bike.modelId === OTHER_MODEL) {
      if (!bike.customModel || !looksLikeText(bike.customModel, 2, 40)) {
        ctx.addIssue({ code: "custom", path: ["customModel"], message: "Please type your bike's model name." });
      }
      if (!bike.customType) {
        ctx.addIssue({ code: "custom", path: ["customType"], message: "Please choose what type of bike it is." });
      }
      return;
    }
    if (!brand.models.some((m) => m.id === bike.modelId)) {
      ctx.addIssue({ code: "custom", path: ["modelId"], message: "Please choose a model from the list." });
    }
  });

// Everything the rider fills in. This is what gets saved on the device
// and what the server checks again on every request.
export const profileSchema = z.object({
  version: z.literal(1),
  name: nameSchema,
  level: z.enum(LEVELS, { error: "Please choose your rider level." }),
  bike: bikeSchema,
  area: z.enum(AREAS, { error: "Please choose your area." }),
  availability: z
    .array(z.enum(SLOT_IDS))
    .min(1, "Please tick at least one time you're free to ride.")
    .refine((a) => new Set(a).size === a.length, "Each time slot should only be ticked once."),
  quizAnswers: z
    .array(z.number().int())
    .length(QUIZ.length, "Please answer every quiz question.")
    .refine((a) => scoreQuiz(a) !== null, "Please answer every quiz question."),
  character: z.enum(CHARACTER_IDS),
});

export type Profile = z.infer<typeof profileSchema>;

// Checks a profile and, importantly, recalculates the riding character from
// the quiz answers, so an edited "character" value can't be trusted blindly.
export function parseProfile(input: unknown):
  | { ok: true; profile: Profile }
  | { ok: false; errors: Record<string, string> } {
  const result = profileSchema.safeParse(input);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.map(String).join(".") || "form";
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const profile = result.data;
  profile.character = scoreQuiz(profile.quizAnswers)!;
  return { ok: true, profile };
}

export function bikeLabel(bike: Profile["bike"]): string {
  if (bike.modelId === OTHER_MODEL) return `${bike.brand} ${bike.customModel ?? ""}`.trim();
  const m = findModel(bike.modelId);
  return m ? `${m.brand} ${m.name}` : bike.brand;
}

export function bikeType(bike: Profile["bike"]): BikeType {
  if (bike.modelId === OTHER_MODEL) return bike.customType ?? "Commuter";
  return findModel(bike.modelId)?.type ?? "Commuter";
}

// ---- Saving on this device ----
// localStorage can throw (private browsing, blocked storage), so every
// access is wrapped and the app simply carries on without saving.

const STORAGE_KEY = "ride-buddy-profile";

export function loadProfile(): { profile: Profile | null; wasBroken: boolean } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profile: null, wasBroken: false };
    const parsed = parseProfile(JSON.parse(raw));
    return parsed.ok ? { profile: parsed.profile, wasBroken: false } : { profile: null, wasBroken: true };
  } catch {
    return { profile: null, wasBroken: true };
  }
}

export function saveProfile(profile: Profile): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function deleteProfile(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do; there was nothing we could delete.
  }
}
