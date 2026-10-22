import { areNearby, CHARACTERS, LEVELS, slotLabel, type SlotId } from "./constants";
import { bikeType, type Profile } from "./profile";
import { riderBike, type DemoRider } from "./riders";

// ---- Hard filters ----
// Plain code, not AI. A rider who fails any of these is never shown.

export function sharedSlots(profile: Profile, rider: DemoRider): SlotId[] {
  return profile.availability.filter((s) => rider.availability.includes(s));
}

// Safety rule: beginners are never paired with advanced, spirited-pace riders
// (and the other way round).
export function failsSafetyRule(profile: Profile, rider: DemoRider): boolean {
  const isFastExpert = (level: string, character: string) =>
    level === "Advanced" && character === "carver";
  return (
    (profile.level === "Beginner" && isFastExpert(rider.level, rider.character)) ||
    (rider.level === "Beginner" && isFastExpert(profile.level, profile.character))
  );
}

export function passesHardFilters(profile: Profile, rider: DemoRider): boolean {
  return (
    sharedSlots(profile, rider).length > 0 &&
    areNearby(profile.area, rider.area) &&
    !failsSafetyRule(profile, rider)
  );
}

export function shortlist(profile: Profile, riders: DemoRider[]): DemoRider[] {
  return riders.filter((r) => passesHardFilters(profile, r));
}

// ---- Simple backup score ----
// Used to order the shortlist and to fill gaps if the AI ranking fails.

const PACE_ORDER = ["relaxed", "moderate", "spirited"];

export function codeScore(profile: Profile, rider: DemoRider): number {
  let score = 0;
  if (profile.area === rider.area) score += 3;
  score += sharedSlots(profile, rider).length;
  if (profile.character === rider.character) score += 3;

  const paceGap = Math.abs(
    PACE_ORDER.indexOf(CHARACTERS[profile.character].pace) -
      PACE_ORDER.indexOf(CHARACTERS[rider.character].pace),
  );
  score += 2 - paceGap;

  const levelGap = Math.abs(LEVELS.indexOf(profile.level) - LEVELS.indexOf(rider.level));
  score += 2 - levelGap;

  if (bikeType(profile.bike) === riderBike(rider).type) score += 1;
  return score;
}

export function rankByCode(profile: Profile, riders: DemoRider[]): DemoRider[] {
  return [...riders].sort((a, b) => codeScore(profile, b) - codeScore(profile, a) || a.id.localeCompare(b.id));
}

// Facts that are true for both people, worked out by code. The AI is told to
// write its reasons only from this list, so it can't mix up who is who.
export function inCommon(profile: Profile, rider: DemoRider): string[] {
  const facts: string[] = [];
  const bike = riderBike(rider);
  if (profile.character === rider.character) facts.push(`both are ${CHARACTERS[rider.character].name} riders`);
  else if (CHARACTERS[profile.character].pace === CHARACTERS[rider.character].pace)
    facts.push(`both like a ${CHARACTERS[rider.character].pace} pace`);
  if (profile.level === rider.level) facts.push(`both are ${rider.level} riders`);
  if (profile.bike.modelId === rider.bikeId) facts.push(`both ride a ${bike.label}`);
  else if (bikeType(profile.bike) === bike.type) facts.push(`both ride ${bike.type.toLowerCase()} bikes`);
  facts.push(profile.area === rider.area ? `both ride from ${rider.area}` : `${rider.area} is next to ${profile.area}`);
  const slots = sharedSlots(profile, rider).map((s) => slotLabel(s).toLowerCase());
  facts.push(`both are free on ${slots.join(" and ")}`);
  return facts;
}

// A plain, honest reason built only from facts we know.
export function codeReason(profile: Profile, rider: DemoRider): string {
  const parts: string[] = [];
  if (profile.character === rider.character) parts.push(`also ${CHARACTERS[rider.character].name}`);
  parts.push(profile.area === rider.area ? `rides from ${rider.area} too` : `rides nearby in ${rider.area}`);
  const slots = sharedSlots(profile, rider).map((s) => slotLabel(s).toLowerCase());
  parts.push(`free on ${slots.join(" and ")}`);
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}
