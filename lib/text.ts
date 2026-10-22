// Plain-code text check: right length and contains real letters,
// not just "!!!" or "aaaa".
export function looksLikeText(value: string, min: number, max: number): boolean {
  const v = value.trim();
  if (v.length < min || v.length > max) return false;
  if (!/\p{L}/u.test(v)) return false;
  if (/^(.)\1+$/u.test(v.replace(/\s/g, ""))) return false;
  return true;
}
