// Fixed lists used by the form, the filters and the demo data.
// Keeping them in one place means the browser and server always agree.

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export type Level = (typeof LEVELS)[number];

// Self-described and always optional. Only shown on a profile if the rider
// chooses, and only used by plain code for the "women riders only" filter.
export const GENDERS = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "non-binary", label: "Non-binary" },
] as const;
export type Gender = (typeof GENDERS)[number]["id"];
export const GENDER_IDS = GENDERS.map((g) => g.id) as [Gender, ...Gender[]];

export const BIKE_TYPES = [
  "Cruiser",
  "Sport",
  "Naked",
  "Adventure",
  "Tourer",
  "Commuter",
  "Scooter",
] as const;
export type BikeType = (typeof BIKE_TYPES)[number];

export const SLOTS = [
  { id: "weekday-mornings", label: "Weekday mornings" },
  { id: "weekday-evenings", label: "Weekday evenings" },
  { id: "weekend-mornings", label: "Weekend mornings" },
  { id: "weekend-afternoons", label: "Weekend afternoons" },
] as const;
export type SlotId = (typeof SLOTS)[number]["id"];
export const SLOT_IDS = SLOTS.map((s) => s.id) as [SlotId, ...SlotId[]];

export function slotLabel(id: SlotId): string {
  return SLOTS.find((s) => s.id === id)?.label ?? id;
}

export const AREAS = [
  "Whitefield",
  "Marathahalli",
  "Indiranagar",
  "Koramangala",
  "HSR Layout",
  "Electronic City",
  "JP Nagar",
  "Jayanagar",
  "Basavanagudi",
  "Malleshwaram",
  "Hebbal",
  "Yelahanka",
] as const;
export type Area = (typeof AREAS)[number];

// Areas that are a reasonable ride apart. Listed one way here and made
// two-way below, so we never forget the reverse direction.
const NEIGHBOUR_PAIRS: [Area, Area][] = [
  ["Whitefield", "Marathahalli"],
  ["Marathahalli", "Indiranagar"],
  ["Marathahalli", "HSR Layout"],
  ["Indiranagar", "Koramangala"],
  ["Indiranagar", "Hebbal"],
  ["Koramangala", "HSR Layout"],
  ["Koramangala", "Jayanagar"],
  ["HSR Layout", "Electronic City"],
  ["Electronic City", "JP Nagar"],
  ["JP Nagar", "Jayanagar"],
  ["Jayanagar", "Basavanagudi"],
  ["Basavanagudi", "Malleshwaram"],
  ["Malleshwaram", "Hebbal"],
  ["Hebbal", "Yelahanka"],
];

export function areNearby(a: Area, b: Area): boolean {
  if (a === b) return true;
  return NEIGHBOUR_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

// Riding styles ("characters"). Pace drives the matching score.
export const CHARACTERS = {
  cruiser: {
    name: "The Cruiser",
    short: "Scenic cruising",
    pace: "relaxed",
    blurb: "Relaxed pace, scenic roads and no rush. The ride itself is the point.",
  },
  explorer: {
    name: "The Explorer",
    short: "Touring & adventure",
    pace: "moderate",
    blurb: "Long tours, new places and the odd dirt trail. Always planning the next trip.",
  },
  carver: {
    name: "The Carver",
    short: "Twisties & spirited",
    pace: "spirited",
    blurb: "Twisty roads and a spirited pace. You love getting the lines right.",
  },
  social: {
    name: "The Social Rider",
    short: "Group & breakfast rides",
    pace: "relaxed",
    blurb: "Group rides, breakfast runs and chai stops. Riding is better together.",
  },
} as const;
export type CharacterId = keyof typeof CHARACTERS;
export const CHARACTER_IDS = Object.keys(CHARACTERS) as [CharacterId, ...CharacterId[]];
