import { z } from "zod";
import bikesData from "@/data/bikes.json";
import { BIKE_TYPES, type BikeType } from "./constants";

// Structured catalogue: manufacturers -> models (with engine size where known).
// To add a bike, add it to data/bikes.json. Nothing else needs changing.
// Availability differs by country and model year; this list is a starting
// point, and riders can always enter a custom make and model.

export type BikeModel = { id: string; name: string; cc: number | null; type: BikeType };
export type Make = { id: string; name: string; models: BikeModel[] };

export const MAKES = bikesData as Make[];

export function findMake(id: string): Make | undefined {
  return MAKES.find((m) => m.id === id);
}

export function findModel(modelId: string): (BikeModel & { makeId: string; makeName: string }) | undefined {
  for (const make of MAKES) {
    const model = make.models.find((x) => x.id === modelId);
    if (model) return { ...model, makeId: make.id, makeName: make.name };
  }
  return undefined;
}

// A bike as riders choose it: either from the catalogue or typed in.
export const bikeRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("catalog"), modelId: z.string().refine((id) => !!findModel(id), "Unknown model") }),
  z.object({
    kind: z.literal("custom"),
    make: z.string().trim().min(2).max(40),
    model: z.string().trim().min(1).max(40),
    type: z.enum(BIKE_TYPES),
    cc: z.number().int().min(40).max(3000).nullable(),
  }),
]);
export type BikeRef = z.infer<typeof bikeRefSchema>;

export type BikeInfo = { label: string; make: string; model: string; type: BikeType; cc: number | null; custom: boolean };

export function bikeInfo(ref: BikeRef): BikeInfo {
  if (ref.kind === "custom") {
    return { label: `${ref.make} ${ref.model}`, make: ref.make, model: ref.model, type: ref.type, cc: ref.cc, custom: true };
  }
  const m = findModel(ref.modelId);
  if (!m) return { label: "Unknown bike", make: "", model: "", type: "Commuter", cc: null, custom: false };
  return { label: `${m.makeName} ${m.name}`, make: m.makeName, model: m.name, type: m.type, cc: m.cc, custom: false };
}

export function ccLabel(cc: number | null): string {
  return cc ? `${cc} cc` : "Electric / n.a.";
}

// Search across "make model cc type". Every word typed must match somewhere,
// so "bmw gs" finds the G 310 GS, F 900 GS and R 1300 GS.
export type BikeSearchResult = { make: Make; model: BikeModel };

export function searchBikes(query: string, limit = 30): BikeSearchResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results: BikeSearchResult[] = [];
  for (const make of MAKES) {
    for (const model of make.models) {
      const haystack = `${make.name} ${make.id} ${model.name} ${model.cc ?? ""} ${model.type}`.toLowerCase();
      if (words.every((w) => haystack.includes(w))) results.push({ make, model });
    }
  }
  return results.slice(0, limit);
}
