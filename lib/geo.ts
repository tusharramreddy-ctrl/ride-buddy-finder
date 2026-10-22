import type { LngLat, RoutePoint } from "./model";

// Distance between two points on Earth, in metres (haversine formula).
export function distanceM(a: LngLat, b: LngLat): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function routeLengthM(points: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceM(points[i - 1], points[i]);
  return total;
}

// ---- Deciding which GPS samples to keep ----
// Phones report fixes with an accuracy radius. Poor fixes and tiny jitter
// while standing still would inflate the distance, so they are skipped.
export const MAX_ACCURACY_M = 35;
export const MIN_STEP_M = 8;
export const MAX_SPEED_MS = 70; // ~250 km/h: anything faster is a GPS jump

export function acceptSample(prev: RoutePoint | null, next: RoutePoint): { keep: boolean; reason?: string } {
  if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return { keep: false, reason: "invalid" };
  if (next.acc > MAX_ACCURACY_M) return { keep: false, reason: "inaccurate" };
  if (!prev) return { keep: true };
  const d = distanceM([prev.lng, prev.lat], [next.lng, next.lat]);
  if (d < MIN_STEP_M) return { keep: false, reason: "too-close" };
  const dt = (next.t - prev.t) / 1000;
  if (dt > 0 && d / dt > MAX_SPEED_MS) return { keep: false, reason: "jump" };
  return { keep: true };
}

// ---- Privacy ----
// Shared routes drop the first and last stretch so a public post never
// shows exactly where a ride started or ended (often someone's home).
export const PRIVACY_TRIM_M = 300;

export function trimForPrivacy(points: LngLat[], trimM = PRIVACY_TRIM_M): LngLat[] {
  if (points.length < 2 || routeLengthM(points) <= trimM * 2 + 50) return [];
  const cut = (pts: LngLat[]) => {
    let run = 0;
    for (let i = 1; i < pts.length; i++) {
      run += distanceM(pts[i - 1], pts[i]);
      if (run >= trimM) return pts.slice(i);
    }
    return [];
  };
  return cut([...cut(points)].reverse()).reverse();
}

// Keep at most `max` points for storing in a post (evenly spaced, ends kept).
export function simplify(points: LngLat[], max = 120): LngLat[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

// ---- Formatting ----
export function formatKm(m: number): string {
  const km = m / 1000;
  return km >= 100 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`;
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

export function avgSpeedKmh(distanceMeters: number, seconds: number): number | null {
  if (seconds < 30 || distanceMeters < 100) return null;
  return distanceMeters / 1000 / (seconds / 3600);
}
