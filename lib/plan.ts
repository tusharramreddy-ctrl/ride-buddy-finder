import { z } from "zod";
import { AREAS, BIKE_TYPES, CHARACTER_IDS, CHARACTERS, LEVELS, SLOT_IDS, slotLabel, type Area, type CharacterId, type Level, type SlotId } from "./constants";
import { gmapsAreaUrl, gmapsDirectionsUrl, gmapsSearchUrl } from "./gmaps";
import { riderBike, type DemoRider } from "./riders";
import { looksLikeText } from "./text";

// Planning a ride for two riders. Plain code decides everything that has to
// be right every time: when (a free time both share), how fast (the slower
// rider's pace), how far (shorter when a beginner is riding) and which
// destinations are allowed. The AI only picks from the allowed list and
// writes the friendly parts (see planRide in lib/ai.ts).

export const planRiderSchema = z.object({
  name: z.string().trim().refine((v) => looksLikeText(v, 2, 40), "Name needed"),
  level: z.enum(LEVELS),
  style: z.enum(CHARACTER_IDS).nullable(),
  area: z.enum(AREAS).nullable(),
  availability: z.array(z.enum(SLOT_IDS)).max(SLOT_IDS.length),
  bikeType: z.enum(BIKE_TYPES).nullable(),
});
export type PlanRider = z.infer<typeof planRiderSchema>;

export function demoPlanRider(r: DemoRider): PlanRider {
  return { name: r.name, level: r.level, style: r.character, area: r.area, availability: r.availability, bikeType: riderBike(r).type };
}

// Well-known day-ride destinations around Bengaluru. Distances are rough,
// one way from central Bengaluru, and riders check the route in Google Maps.
export type Destination = {
  id: string;
  name: string;
  km: number;
  road: string;
  styles: CharacterId[];
  beginnerFriendly: boolean;
};

export const DESTINATIONS: Destination[] = [
  { id: "big-banyan", name: "Big Banyan Tree", km: 28, road: "an easy, flat ride out of the city", styles: ["cruiser", "social"], beginnerFriendly: true },
  { id: "hesaraghatta", name: "Hesaraghatta Lake", km: 30, road: "quiet roads north of the city", styles: ["cruiser", "social"], beginnerFriendly: true },
  { id: "manchanabele", name: "Manchanabele Dam", km: 40, road: "scenic countryside with a few rough patches", styles: ["cruiser", "explorer"], beginnerFriendly: true },
  { id: "muthyala-maduvu", name: "Muthyala Maduvu", km: 40, road: "a short, easy ride out past Anekal", styles: ["cruiser", "social"], beginnerFriendly: true },
  { id: "ramanagara", name: "Ramanagara", km: 50, road: "a highway run to rocky hills", styles: ["explorer", "cruiser"], beginnerFriendly: true },
  { id: "nandi-hills", name: "Nandi Hills", km: 60, road: "the classic early-morning ride, with a hairpin climb at the end", styles: ["carver", "social", "cruiser"], beginnerFriendly: false },
  { id: "savandurga", name: "Savandurga", km: 60, road: "country roads to a giant rock hill", styles: ["explorer", "cruiser"], beginnerFriendly: false },
  { id: "chunchi-falls", name: "Chunchi Falls", km: 85, road: "twisty stretches past Kanakapura", styles: ["carver", "explorer"], beginnerFriendly: false },
  { id: "avalabetta", name: "Avalabetta", km: 95, road: "a hill road with wide views", styles: ["carver", "explorer"], beginnerFriendly: false },
  { id: "mekedatu", name: "Mekedatu", km: 100, road: "a longer ride with twisty sections near the river", styles: ["explorer", "carver"], beginnerFriendly: false },
  { id: "lepakshi", name: "Lepakshi", km: 120, road: "a long highway run to an old temple town", styles: ["explorer", "social", "cruiser"], beginnerFriendly: false },
];

// The times each free slot stands for, as 24-hour "HH:MM". Mornings start
// at 06:30 so the ride begins after sunrise all year in Bengaluru.
export const SLOT_WINDOWS: Record<SlotId, { day: string; from: string; to: string; start: string }> = {
  "weekend-mornings": { day: "Saturday or Sunday", from: "06:30", to: "10:00", start: "06:30" },
  "weekend-afternoons": { day: "Saturday or Sunday", from: "13:30", to: "16:30", start: "14:30" },
  "weekday-mornings": { day: "a weekday", from: "06:30", to: "08:00", start: "06:30" },
  "weekday-evenings": { day: "a weekday", from: "16:30", to: "18:00", start: "17:00" },
};

// Weekend mornings suit a day ride best; a weekday evening the least.
const SLOT_PREFERENCE: SlotId[] = ["weekend-mornings", "weekend-afternoons", "weekday-mornings", "weekday-evenings"];

// How far out (one way, km) the least experienced rider should go.
export const MAX_KM: Record<Level, number> = { Beginner: 50, Intermediate: 100, Advanced: 140 };
// Weekday rides have to fit around work.
const WEEKDAY_MAX_KM = 40;

const PACES = ["relaxed", "moderate", "spirited"] as const;
export type Pace = (typeof PACES)[number];

export type PlanBasics = {
  slot: SlotId;
  sharedSlots: SlotId[];
  pace: Pace;
  maxKm: number;
  hasBeginner: boolean;
  meetArea: string;
  routeFrom: Area | null;
  candidates: Destination[];
};

export function sharedFreeSlots(a: PlanRider, b: PlanRider): SlotId[] {
  return SLOT_PREFERENCE.filter((s) => a.availability.includes(s) && b.availability.includes(s));
}

// The pair rides at the slower rider's pace, and always relaxed with a beginner.
// A rider with no style yet counts as relaxed.
export function pairPace(a: PlanRider, b: PlanRider): Pace {
  if (a.level === "Beginner" || b.level === "Beginner") return "relaxed";
  const pace = (r: PlanRider) => PACES.indexOf(r.style ? CHARACTERS[r.style].pace : "relaxed");
  return PACES[Math.min(pace(a), pace(b))];
}

export function meetingArea(a: PlanRider, b: PlanRider): string {
  if (a.area && b.area) return a.area === b.area ? a.area : `between ${a.area} and ${b.area}`;
  return a.area ?? b.area ?? "a spot you both agree on";
}

// Everything the plan rests on, or the reason there can't be a plan yet.
export function planBasics(a: PlanRider, b: PlanRider): { ok: true; basics: PlanBasics } | { ok: false; error: string } {
  const shared = sharedFreeSlots(a, b);
  if (!shared.length) {
    return { ok: false, error: `You and ${b.name} don't share a free time yet. Agree on a time in the chat, or update the times on your profiles.` };
  }
  const slot = shared[0];
  const hasBeginner = a.level === "Beginner" || b.level === "Beginner";
  const least = LEVELS[Math.min(LEVELS.indexOf(a.level), LEVELS.indexOf(b.level))];
  const maxKm = slot.startsWith("weekday") ? Math.min(MAX_KM[least], WEEKDAY_MAX_KM) : MAX_KM[least];
  const pace = pairPace(a, b);

  const fit = (d: Destination) => [a, b].filter((r) => r.style && d.styles.includes(r.style)).length;
  const candidates = DESTINATIONS.filter((d) => d.km <= maxKm && (!hasBeginner || d.beginnerFriendly)).sort(
    (x, y) => fit(y) - fit(x) || x.km - y.km,
  );
  if (!candidates.length) {
    return { ok: false, error: "We couldn't find a destination short enough for that time. Try planning a weekend ride." };
  }
  const basics = { slot, sharedSlots: shared, pace, maxKm, hasBeginner, meetArea: meetingArea(a, b), routeFrom: a.area ?? b.area, candidates };
  return { ok: true, basics };
}

// Safety notes come from code, never from the AI.
export function safetyNotes(basics: PlanBasics): string[] {
  const notes = [`Ride at the slower rider's pace: ${basics.pace}.`];
  if (basics.hasBeginner) notes.push(`A beginner is riding, so ride in daylight and stay within about ${basics.maxKm} km each way.`);
  if (basics.slot === "weekday-evenings") notes.push("Keep it short and be home before dark.");
  notes.push("Meet in a busy public place, and tell someone at home your plan.");
  notes.push("Check the route and the weather in Google Maps before you leave.");
  return notes;
}

// What the AI is allowed to choose. Code checks every field afterwards.
export type PlanChoice = { destinationId: string; backupId: string | null; startTime: string; summary: string; stops: string };

export type RidePlan = {
  when: string;
  slot: SlotId;
  startTime: string;
  meetArea: string;
  meetUrl: string | null;
  destination: Destination;
  destinationUrl: string;
  routeUrl: string | null;
  backup: Destination | null;
  pace: Pace;
  maxKm: number;
  summary: string;
  stops: string;
  safety: string[];
  source: "ai" | "code";
};

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function startTimeInWindow(time: string, slot: SlotId): string {
  const w = SLOT_WINDOWS[slot];
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return w.start;
  const m = toMinutes(time);
  return m >= toMinutes(w.from) && m <= toMinutes(w.to) ? time : w.start;
}

export function formatClock(time: string): string {
  const h = Number(time.slice(0, 2));
  const suffix = h < 12 ? "am" : "pm";
  return `${h % 12 || 12}:${time.slice(3, 5)} ${suffix}`;
}

export function codeChoice(a: PlanRider, b: PlanRider, basics: PlanBasics): PlanChoice {
  const d = basics.candidates[0];
  return {
    destinationId: d.id,
    backupId: basics.candidates[1]?.id ?? null,
    startTime: SLOT_WINDOWS[basics.slot].start,
    summary: `A ${basics.pace} ride to ${d.name}, ${d.road}. It suits ${a.name} and ${b.name}, and fits a time you're both free.`,
    stops: "A breakfast or chai stop on the way, and a break at the destination.",
  };
}

// Turns the AI's (or code's) choice into a plan, replacing anything outside the rules.
export function buildPlan(basics: PlanBasics, choice: PlanChoice, source: "ai" | "code"): RidePlan {
  const allowed = (id: string | null) => basics.candidates.find((d) => d.id === id) ?? null;
  const destination = allowed(choice.destinationId) ?? basics.candidates[0];
  const pickedBackup = allowed(choice.backupId);
  const backup = pickedBackup && pickedBackup.id !== destination.id ? pickedBackup : (basics.candidates.find((d) => d.id !== destination.id) ?? null);
  const area = AREAS.find((x) => x === basics.meetArea);
  const w = SLOT_WINDOWS[basics.slot];
  return {
    when: `${w.day} (${slotLabel(basics.slot).toLowerCase()})`,
    slot: basics.slot,
    startTime: startTimeInWindow(choice.startTime, basics.slot),
    meetArea: basics.meetArea,
    meetUrl: area ? gmapsAreaUrl(area) : null,
    destination,
    destinationUrl: gmapsSearchUrl(`${destination.name}, Karnataka`),
    routeUrl: basics.routeFrom ? gmapsDirectionsUrl(`${basics.routeFrom}, Bengaluru`, `${destination.name}, Karnataka`) : null,
    backup,
    pace: basics.pace,
    maxKm: basics.maxKm,
    summary: choice.summary.trim().slice(0, 400),
    stops: choice.stops.trim().slice(0, 200),
    safety: safetyNotes(basics),
    source,
  };
}

// The plan as a chat message (chat messages are at most 1000 characters).
export function planMessage(plan: RidePlan): string {
  const lines = [
    `Ride plan: ${plan.destination.name} (about ${plan.destination.km} km each way)`,
    `When: ${plan.when}, start around ${formatClock(plan.startTime)}`,
    `Meet: ${plan.meetArea}`,
    `Pace: ${plan.pace}`,
    plan.summary,
    `Stops: ${plan.stops}`,
    plan.backup ? `Backup: ${plan.backup.name}` : "",
    `Map: ${plan.routeUrl ?? plan.destinationUrl}`,
  ];
  return lines.filter(Boolean).join("\n").slice(0, 1000);
}
