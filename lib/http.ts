// Small helpers so every API route answers in the same friendly shape:
// { error: "message for the rider", fieldErrors?: {...} }

export function fail(status: number, error: string, fieldErrors?: Record<string, string>) {
  return Response.json({ error, ...(fieldErrors ? { fieldErrors } : {}) }, { status });
}

export const PROFILE_PROBLEM =
  "Something in your profile needs fixing. Please check your level, bike, area, free times and quiz answers.";

export async function readJson(request: Request): Promise<unknown> {
  try {
    const text = await request.text();
    if (text.length > 10_000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
