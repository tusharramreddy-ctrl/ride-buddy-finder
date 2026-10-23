import { z } from "zod";
import { AREAS, CHARACTER_IDS, CHARACTERS, LEVELS, SLOT_IDS, slotLabel } from "./constants";

// What the matching page sends so the AI can draft the rider's "how I ride"
// sentence from their profile, instead of the rider typing it.
export const describeInputSchema = z.object({
  level: z.enum(LEVELS),
  style: z.enum(CHARACTER_IDS).nullable(),
  area: z.enum(AREAS).nullable(),
  availability: z.array(z.enum(SLOT_IDS)).max(SLOT_IDS.length),
  bike: z.string().trim().max(80).nullable(),
  bio: z.string().trim().max(170),
});
export type DescribeInput = z.infer<typeof describeInputSchema>;

const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

// The plain sentence used when the AI isn't available. Built only from the profile.
export function describeByCode(p: DescribeInput): string {
  const parts = [`I'm ${p.level === "Intermediate" ? "an" : "a"} ${p.level.toLowerCase()} rider`];
  if (p.bike) parts.push(`on a ${p.bike}`);
  let text = parts.join(" ") + ".";
  if (p.style) text += ` I like ${CHARACTERS[p.style].blurb.charAt(0).toLowerCase()}${CHARACTERS[p.style].blurb.slice(1)}`;
  if (p.availability.length) text += ` I'm usually free on ${list(p.availability.map((s) => slotLabel(s).toLowerCase()))}.`;
  if (p.area) text += ` I ride from around ${p.area}.`;
  return text;
}
