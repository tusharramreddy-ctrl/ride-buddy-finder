import { areNearby, CHARACTERS, LEVELS, slotLabel, type SlotId } from "./constants";
import { prefsBikeType, type MatchPrefs } from "./prefs";
import { riderBike, type DemoRider } from "./riders";

// ---- Hard filters ----
// Plain code, not AI. A rider who fails any of these is never shown.

export function sharedSlots(prefs: MatchPrefs, rider: DemoRider): SlotId[] {
  return prefs.availability.filter((s) => rider.availability.includes(s));
}

// Safety rule: beginners are never paired with advanced, spirited-pace riders
// (and the other way round).
export function failsSafetyRule(prefs: MatchPrefs, rider: DemoRider): boolean {
  const isFastExpert = (level: string, style: string) => level === "Advanced" && style === "carver";
  return (
    (prefs.level === "Beginner" && isFastExpert(rider.level, rider.character)) ||
    (rider.level === "Beginner" && isFastExpert(prefs.level, prefs.style))
  );
}

// Women-only works both ways: a rider asking for women riders only sees
// riders who describe themselves as women, and a demo rider who asked for
// women riders only is never shown to someone who isn't.
export function failsWomenOnly(prefs: MatchPrefs, rider: DemoRider): boolean {
  if (prefs.womenOnly && rider.gender !== "woman") return true;
  if (rider.womenOnly && prefs.gender !== "woman") return true;
  return false;
}

export function passesHardFilters(prefs: MatchPrefs, rider: DemoRider): boolean {
  return (
    sharedSlots(prefs, rider).length > 0 &&
    areNearby(prefs.area, rider.area) &&
    !failsSafetyRule(prefs, rider) &&
    !failsWomenOnly(prefs, rider)
  );
}

export function shortlist(prefs: MatchPrefs, riders: DemoRider[]): DemoRider[] {
  return riders.filter((r) => passesHardFilters(prefs, r));
}

// ---- Simple backup score ----
// Used to order the shortlist and to fill gaps if the AI ranking fails.

const PACE_ORDER = ["relaxed", "moderate", "spirited"];

export function codeScore(prefs: MatchPrefs, rider: DemoRider): number {
  let score = 0;
  if (prefs.area === rider.area) score += 3;
  score += sharedSlots(prefs, rider).length;
  if (prefs.style === rider.character) score += 3;

  const paceGap = Math.abs(
    PACE_ORDER.indexOf(CHARACTERS[prefs.style].pace) - PACE_ORDER.indexOf(CHARACTERS[rider.character].pace),
  );
  score += 2 - paceGap;

  const levelGap = Math.abs(LEVELS.indexOf(prefs.level) - LEVELS.indexOf(rider.level));
  score += 2 - levelGap;

  if (prefsBikeType(prefs) === riderBike(rider).type) score += 1;
  return score;
}

export function rankByCode(prefs: MatchPrefs, riders: DemoRider[]): DemoRider[] {
  return [...riders].sort((a, b) => codeScore(prefs, b) - codeScore(prefs, a) || a.id.localeCompare(b.id));
}

// Facts that are true for both people, worked out by code. The AI is told to
// write its reasons only from this list, so it can't mix up who is who.
export function inCommon(prefs: MatchPrefs, rider: DemoRider): string[] {
  const facts: string[] = [];
  const bike = riderBike(rider);
  if (prefs.style === rider.character) facts.push(`both are ${CHARACTERS[rider.character].name} riders`);
  else if (CHARACTERS[prefs.style].pace === CHARACTERS[rider.character].pace)
    facts.push(`both like a ${CHARACTERS[rider.character].pace} pace`);
  if (prefs.level === rider.level) facts.push(`both are ${rider.level} riders`);
  if (prefs.bike?.kind === "catalog" && prefs.bike.modelId === rider.bikeId) facts.push(`both ride a ${bike.label}`);
  else if (prefsBikeType(prefs) === bike.type) facts.push(`both ride ${bike.type.toLowerCase()} bikes`);
  facts.push(prefs.area === rider.area ? `both ride from ${rider.area}` : `${rider.area} is next to ${prefs.area}`);
  const slots = sharedSlots(prefs, rider).map((s) => slotLabel(s).toLowerCase());
  facts.push(`both are free on ${slots.join(" and ")}`);
  return facts;
}

// A plain, honest reason built only from facts we know.
export function codeReason(prefs: MatchPrefs, rider: DemoRider): string {
  const parts: string[] = [];
  if (prefs.style === rider.character) parts.push(`also ${CHARACTERS[rider.character].name}`);
  parts.push(prefs.area === rider.area ? `rides from ${rider.area} too` : `rides nearby in ${rider.area}`);
  const slots = sharedSlots(prefs, rider).map((s) => slotLabel(s).toLowerCase());
  parts.push(`free on ${slots.join(" and ")}`);
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}
