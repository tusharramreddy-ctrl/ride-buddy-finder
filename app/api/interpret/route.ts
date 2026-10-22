import { z } from "zod";
import { AiUnavailableError, interpretDescription } from "@/lib/ai";
import { searchBikes } from "@/lib/bikes";
import { fail, readJson } from "@/lib/http";
import { looksLikeText } from "@/lib/text";

const bodySchema = z.object({ text: z.string() });

const NEED_DESCRIPTION =
  "Tell us a bit about how you ride: your bike, how long you've been riding, your pace, the kind of rides you like, when you're free and roughly where you are.";

// Reads a rider's sentence into suggested preferences. Everything returned is
// a suggestion the rider reviews; plain code decides whether it's usable.
export async function POST(request: Request) {
  const body = bodySchema.safeParse(await readJson(request));
  const text = body.success ? body.data.text.trim() : "";
  if (!looksLikeText(text, 12, 600) || text.split(/\s+/).length < 3) {
    return fail(422, NEED_DESCRIPTION);
  }

  let result;
  try {
    result = await interpretDescription(text);
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return fail(503, "We couldn't read your description just now. You can fill in your preferences by hand instead.");
    }
    throw error;
  }

  // Code decides if the sentence was usable: it must be about riding and give
  // at least two concrete details. Otherwise we ask again rather than guess.
  const found = [result.level, result.area, result.style, result.bikeText, result.availability.length ? "y" : null].filter(
    Boolean,
  ).length;
  if (!result.isAboutRiding || found < 2) return fail(422, NEED_DESCRIPTION);

  // Match the bike to our catalogue with plain search (not AI). No match = leave it for the rider.
  const bikeMatch = result.bikeText ? searchBikes(result.bikeText, 1)[0] : undefined;

  return Response.json({
    suggestion: {
      level: result.level,
      area: result.area,
      availability: result.availability,
      style: result.style,
      womenOnly: result.womenOnly,
      bike: bikeMatch ? { kind: "catalog", modelId: bikeMatch.model.id } : null,
      bikeText: result.bikeText,
    },
  });
}
