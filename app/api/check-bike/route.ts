import { z } from "zod";
import { AiUnavailableError, checkBike } from "@/lib/ai";
import { fail, readJson } from "@/lib/http";
import { looksLikeText } from "@/lib/text";

const bodySchema = z.object({ make: z.string(), model: z.string() });

// Only used when a rider's bike isn't in the catalogue and they type it in.
export async function POST(request: Request) {
  const body = bodySchema.safeParse(await readJson(request));
  if (!body.success) return fail(400, "Please type your bike's make and model.");
  const make = body.data.make.trim();
  const model = body.data.model.trim();
  if (!looksLikeText(make, 2, 40)) return fail(422, "Please type the make, for example \"Honda\".");
  if (!looksLikeText(model, 1, 40) && !/\d/.test(model)) {
    return fail(422, "Please type your bike's model name, for example \"CB200X\".");
  }

  try {
    const isReal = await checkBike(make, model);
    if (!isReal) {
      return fail(422, `We couldn't find a ${make} model called "${model}". Which bike do you ride?`);
    }
    return Response.json({ ok: true });
  } catch (error) {
    // If the AI is down, don't block the rider; plain-code checks already passed.
    if (error instanceof AiUnavailableError) return Response.json({ ok: true, unchecked: true });
    throw error;
  }
}
