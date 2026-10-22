import { z } from "zod";
import { AiUnavailableError, checkBike } from "@/lib/ai";
import { findBrand } from "@/lib/bikes";
import { fail, readJson } from "@/lib/http";
import { looksLikeText } from "@/lib/profile";

const bodySchema = z.object({ brand: z.string(), model: z.string() });

// Only used when a rider picks "Other / not listed" and types their model.
export async function POST(request: Request) {
  const body = bodySchema.safeParse(await readJson(request));
  if (!body.success || !findBrand(body.data.brand)) {
    return fail(400, "Please choose your bike's brand first.");
  }
  const model = body.data.model.trim();
  if (!looksLikeText(model, 2, 40)) {
    return fail(422, "Please type your bike's model name, for example \"CB200X\".");
  }

  try {
    const isReal = await checkBike(body.data.brand, model);
    if (!isReal) {
      return fail(422, `We couldn't find a ${body.data.brand} model called "${model}". Which bike do you ride?`);
    }
    return Response.json({ ok: true });
  } catch (error) {
    // If the AI is down, don't block the rider; plain-code checks already passed.
    if (error instanceof AiUnavailableError) return Response.json({ ok: true, unchecked: true });
    throw error;
  }
}
