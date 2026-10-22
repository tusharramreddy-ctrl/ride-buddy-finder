import ridersData from "@/data/riders.json";
import { bikeInfo, type BikeInfo } from "./bikes";
import type { Area, CharacterId, Gender, Level, SlotId } from "./constants";

// Fictional demo riders. Always shown with a "Demo profile" label until a real
// rider database and real accounts exist.
export type DemoRider = {
  id: string;
  name: string;
  username: string;
  isDemo: true;
  level: Level;
  bikeId: string;
  character: CharacterId;
  area: Area;
  availability: SlotId[];
  gender: Gender | null;
  womenOnly: boolean;
  bio: string;
};

export const RIDERS = ridersData as DemoRider[];

export function findRider(id: string): DemoRider | undefined {
  return RIDERS.find((r) => r.id === id);
}

export function riderBike(r: DemoRider): BikeInfo {
  return bikeInfo({ kind: "catalog", modelId: r.bikeId });
}
