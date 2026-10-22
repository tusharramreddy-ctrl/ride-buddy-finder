import bikesData from "@/data/bikes.json";
import type { BikeType } from "./constants";

export type BikeModel = { id: string; name: string; type: BikeType };
export type BikeBrand = { brand: string; models: BikeModel[] };

export const BIKES = bikesData as BikeBrand[];

// Special model id for "my bike isn't in the list".
export const OTHER_MODEL = "other";

export function findBrand(brand: string): BikeBrand | undefined {
  return BIKES.find((b) => b.brand === brand);
}

export function findModel(modelId: string): (BikeModel & { brand: string }) | undefined {
  for (const b of BIKES) {
    const m = b.models.find((x) => x.id === modelId);
    if (m) return { ...m, brand: b.brand };
  }
  return undefined;
}
