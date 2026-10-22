import { z } from "zod";
import { AiUnavailableError, draftIntro } from "@/lib/ai";
import { passesHardFilters } from "@/lib/filters";
import { fail, PROFILE_PROBLEM, readJson } from "@/lib/http";
import { parseProfile } from "@/lib/profile";
import { findRider } from "@/lib/riders";

const bodySchema = z.object({ riderId: z.string(), profile: z.unknown() });

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await readJson(request));
  if (!body.success) return fail(400, "Please pick one of your matches first.");

  const parsed = parseProfile(body.data.profile);
  if (!parsed.ok) return fail(422, PROFILE_PROBLEM, parsed.errors);

  // The rider's details always come from our own data file, never from the browser.
  const rider = findRider(body.data.riderId);
  if (!rider || !passesHardFilters(parsed.profile, rider)) {
    return fail(404, "That rider isn't one of your matches. Please find riders again.");
  }

  try {
    const message = await draftIntro(parsed.profile, rider);
    return Response.json({ message });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return fail(503, "We couldn't draft your intro just now. Please try again in a moment.");
    }
    throw error;
  }
}
