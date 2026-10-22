import ridersData from "@/data/riders.json";
import { findModel } from "./bikes";
import type { Area, BikeType, CharacterId, Level, SlotId } from "./constants";

export type DemoRider = {
  id: string;
  name: string;
  isDemo: true;
  level: Level;
  bikeId: string;
  character: CharacterId;
  area: Area;
  availability: SlotId[];
  bio: string;
};

export const RIDERS = ridersData as DemoRider[];

export function findRider(id: string): DemoRider | undefined {
  return RIDERS.find((r) => r.id === id);
}

export function riderBike(r: DemoRider): { label: string; type: BikeType } {
  const m = findModel(r.bikeId);
  return m ? { label: `${m.brand} ${m.name}`, type: m.type } : { label: r.bikeId, type: "Commuter" };
}
