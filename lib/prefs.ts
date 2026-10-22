import { z } from "zod";
import { AREAS, CHARACTER_IDS, GENDER_IDS, LEVELS, SLOT_IDS, type BikeType } from "./constants";
import { bikeInfo, bikeRefSchema } from "./bikes";
import { looksLikeText } from "./text";

// What the matcher needs. The rider reviews (and can correct) every field
// before matching, whether it came from their profile or from the AI reading
// their sentence. The server checks it all again on every request.
export const matchPrefsSchema = z.object({
  name: z
    .string()
    .trim()
    .refine((v) => looksLikeText(v, 2, 40), { message: "Please enter a first name or nickname (2–40 letters)." }),
  level: z.enum(LEVELS, { error: "Please choose your rider level." }),
  bike: bikeRefSchema.nullable(),
  area: z.enum(AREAS, { error: "Please choose roughly where you ride from." }),
  availability: z
    .array(z.enum(SLOT_IDS))
    .min(1, "Please pick at least one time you're free to ride.")
    .refine((a) => new Set(a).size === a.length, "Each time slot should only be picked once."),
  style: z.enum(CHARACTER_IDS, { error: "Please choose your riding style." }),
  gender: z.enum(GENDER_IDS).nullable(),
  womenOnly: z.boolean(),
});

export type MatchPrefs = z.infer<typeof matchPrefsSchema>;

export function parseMatchPrefs(input: unknown):
  | { ok: true; prefs: MatchPrefs }
  | { ok: false; errors: Record<string, string> } {
  const result = matchPrefsSchema.safeParse(input);
  if (result.success) return { ok: true, prefs: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}

export function prefsBikeType(prefs: MatchPrefs): BikeType | null {
  return prefs.bike ? bikeInfo(prefs.bike).type : null;
}

export function prefsBikeLabel(prefs: MatchPrefs): string | null {
  return prefs.bike ? bikeInfo(prefs.bike).label : null;
}
