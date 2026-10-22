import { z } from "zod";
import { AiUnavailableError, planRide } from "@/lib/ai";
import { fail, readJson } from "@/lib/http";
import { buildPlan, codeChoice, demoPlanRider, planBasics, planRiderSchema } from "@/lib/plan";
import { findRider } from "@/lib/riders";

// A demo rider's details come from our own data file. A real rider's come
// from the browser (their public profile, which the requester can already
// see); a tampered profile could only change the requester's own plan.
const bodySchema = z.object({
  me: planRiderSchema,
  partnerId: z.string().max(64),
  partner: planRiderSchema.nullable(),
});

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await readJson(request));
  if (!body.success) return fail(400, "Something in the riders' profiles needs fixing before we can plan a ride.");

  const demo = findRider(body.data.partnerId);
  const partner = demo ? demoPlanRider(demo) : body.data.partner;
  if (!partner) return fail(404, "We couldn't find that rider.");

  const me = body.data.me;
  const result = planBasics(me, partner);
  if (!result.ok) return fail(422, result.error);
  const basics = result.basics;

  try {
    const choice = await planRide(me, partner, basics);
    return Response.json({ plan: buildPlan(basics, choice, "ai") });
  } catch (error) {
    if (!(error instanceof AiUnavailableError)) throw error;
    // The rules still hold without the AI: a plan from code alone.
    return Response.json({ plan: buildPlan(basics, codeChoice(me, partner, basics), "code") });
  }
}
