import { acceptSample, MAX_ACCURACY_M, routeLengthM } from "./geo";
import type { LngLat, Ride, RoutePoint } from "./model";

// Pure ride-tracking logic (no browser APIs), so it can be unit tested.
// The Map screen feeds GPS fixes in and renders whatever comes out.
//
// Honesty rules baked in here:
// - distance only grows from GPS samples that pass `acceptSample`
// - moving time excludes paused time
// - after a pause, a reload or a long background gap, the next accepted fix
//   starts a new segment: the straight line across the gap is NOT counted.

export type TrackerStatus = "tracking" | "paused" | "ended";

export type RejectReason = "invalid" | "inaccurate" | "too-close" | "jump";

export type TrackerState = {
  status: TrackerStatus;
  startedAt: number;
  endedAt: number | null;
  points: RoutePoint[]; // accepted fixes only
  segmentStarts: number[]; // indexes into `points` where a new segment begins
  distanceM: number; // sum of accepted steps inside segments
  movingMs: number; // closed tracking spans
  runningSince: number | null; // start of the current tracking span (null unless tracking)
  needsAnchor: boolean; // next accepted fix starts a new segment
  lastReject: RejectReason | null;
  rejected: number;
};

export function createTracker(now: number): TrackerState {
  return {
    status: "tracking",
    startedAt: now,
    endedAt: null,
    points: [],
    segmentStarts: [],
    distanceM: 0,
    movingMs: 0,
    runningSince: now,
    needsAnchor: true,
    lastReject: null,
    rejected: 0,
  };
}

export type FixResult = { state: TrackerState; kept: boolean; reason?: RejectReason | "not-tracking" };

// Feed one GPS fix. Only counts while tracking.
export function addFix(state: TrackerState, fix: RoutePoint): FixResult {
  if (state.status !== "tracking") return { state, kept: false, reason: "not-tracking" };
  const prev = state.needsAnchor ? null : (state.points[state.points.length - 1] ?? null);
  const verdict = acceptSample(prev, fix);
  if (!verdict.keep) {
    const reason = (verdict.reason ?? "invalid") as RejectReason;
    return { state: { ...state, lastReject: reason, rejected: state.rejected + 1 }, kept: false, reason };
  }
  const point: RoutePoint = { lng: fix.lng, lat: fix.lat, t: fix.t, acc: fix.acc };
  const step = prev ? routeLengthM([toLngLat(prev), toLngLat(point)]) : 0;
  return {
    kept: true,
    state: {
      ...state,
      points: [...state.points, point],
      segmentStarts: state.needsAnchor ? [...state.segmentStarts, state.points.length] : state.segmentStarts,
      distanceM: state.distanceM + step,
      needsAnchor: false,
      lastReject: null,
    },
  };
}

export function pause(state: TrackerState, now: number): TrackerState {
  if (state.status !== "tracking") return state;
  return {
    ...state,
    status: "paused",
    movingMs: state.movingMs + spanMs(state.runningSince, now),
    runningSince: null,
    needsAnchor: true,
  };
}

export function resume(state: TrackerState, now: number): TrackerState {
  if (state.status !== "paused") return state;
  return { ...state, status: "tracking", runningSince: now, needsAnchor: true, lastReject: null };
}

export function end(state: TrackerState, now: number): TrackerState {
  if (state.status === "ended") return state;
  const paused = pause(state, now);
  return { ...paused, status: "ended", endedAt: now, runningSince: null };
}

// The page was hidden or GPS stopped for a while: don't join the dots
// across the gap (that would invent a straight-line route).
export function breakSegment(state: TrackerState): TrackerState {
  if (state.status !== "tracking" || state.needsAnchor) return state;
  return { ...state, needsAnchor: true };
}

export function movingSeconds(state: TrackerState, now: number): number {
  const running = state.status === "tracking" ? spanMs(state.runningSince, now) : 0;
  return (state.movingMs + running) / 1000;
}

function spanMs(since: number | null, now: number): number {
  return since === null ? 0 : Math.max(0, now - since);
}

export function toLngLat(p: { lng: number; lat: number }): LngLat {
  return [p.lng, p.lat];
}

// Route split into segments (gaps from pauses/reloads are not joined).
export function segments(state: Pick<TrackerState, "points" | "segmentStarts">): LngLat[][] {
  const { points, segmentStarts } = state;
  const starts = segmentStarts.length ? segmentStarts : points.length ? [0] : [];
  return starts
    .map((s, i) => points.slice(s, starts[i + 1] ?? points.length).map(toLngLat))
    .filter((seg) => seg.length > 0);
}

// ---- Ending a ride ----

export const MIN_SAVE_POINTS = 2;
export const MIN_SAVE_DISTANCE_M = 50;

export function hasEnoughData(state: Pick<TrackerState, "points" | "distanceM">): boolean {
  return state.points.length >= MIN_SAVE_POINTS && state.distanceM >= MIN_SAVE_DISTANCE_M;
}

export function defaultRideTitle(startedAt: number): string {
  const h = new Date(startedAt).getHours();
  if (h >= 5 && h < 12) return "Morning ride";
  if (h >= 12 && h < 17) return "Afternoon ride";
  if (h >= 17 && h < 21) return "Evening ride";
  return "Night ride";
}

export function toRide(
  state: TrackerState,
  meta: { title: string; bikeId: string | null; notes: string },
): Omit<Ride, "id" | "sharedPostId"> {
  const endedAt = state.endedAt ?? state.points[state.points.length - 1]?.t ?? state.startedAt;
  return {
    title: meta.title.trim() || defaultRideTitle(state.startedAt),
    startedAt: state.startedAt,
    endedAt,
    movingSec: Math.round(state.movingMs / 1000),
    distanceM: Math.round(state.distanceM),
    points: state.points,
    source: "gps",
    bikeId: meta.bikeId,
    notes: meta.notes.trim(),
  };
}

// ---- Recovering an interrupted ride (page reload / closed tab) ----

export type StoredRide = { v: 1; savedAt: number; tracker: TrackerState };

export function serializeTracker(tracker: TrackerState, savedAt: number): string {
  const stored: StoredRide = { v: 1, savedAt, tracker };
  return JSON.stringify(stored);
}

export function parseStoredTracker(raw: string | null): StoredRide | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<StoredRide>;
    const t = data?.tracker as Partial<TrackerState> | undefined;
    if (data?.v !== 1 || typeof data.savedAt !== "number" || !t) return null;
    if (!["tracking", "paused", "ended"].includes(t.status as string)) return null;
    if (typeof t.startedAt !== "number" || !Array.isArray(t.points) || typeof t.distanceM !== "number") return null;
    if (typeof t.movingMs !== "number") return null;
    const points = t.points.filter(
      (p): p is RoutePoint =>
        !!p && Number.isFinite(p.lng) && Number.isFinite(p.lat) && Number.isFinite(p.t) && Number.isFinite(p.acc),
    );
    const tracker: TrackerState = {
      status: t.status as TrackerStatus,
      startedAt: t.startedAt,
      endedAt: typeof t.endedAt === "number" ? t.endedAt : null,
      points,
      segmentStarts: Array.isArray(t.segmentStarts) ? t.segmentStarts.filter((n) => Number.isInteger(n) && n >= 0 && n < points.length) : [],
      distanceM: t.distanceM,
      movingMs: t.movingMs,
      runningSince: typeof t.runningSince === "number" ? t.runningSince : null,
      needsAnchor: true,
      lastReject: null,
      rejected: typeof t.rejected === "number" ? t.rejected : 0,
    };
    return { v: 1, savedAt: data.savedAt, tracker };
  } catch {
    return null;
  }
}

// Time is only counted up to the last save; the gap while the page was
// closed was not tracked. Returns a paused (or still-ended) tracker.
export function freezeInterrupted(stored: StoredRide): TrackerState {
  const t = stored.tracker;
  if (t.status === "ended") return t;
  return pause(t, Math.max(stored.savedAt, t.runningSince ?? stored.savedAt));
}

// ---- GPS quality & errors (wording for the UI) ----

export type SignalQuality = "good" | "ok" | "weak";

export function signalQuality(accuracyM: number): SignalQuality {
  if (accuracyM <= 12) return "good";
  if (accuracyM <= MAX_ACCURACY_M) return "ok";
  return "weak";
}

export type GeoProblem = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout";

export function geoProblemFromCode(code: number): GeoProblem {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

export const GEO_PROBLEM_TEXT: Record<GeoProblem, { title: string; body: string }> = {
  unsupported: {
    title: "This browser can't share your location",
    body: "GPS tracking needs a browser with location support. You can still enter a ride manually.",
  },
  insecure: {
    title: "Location needs a secure page",
    body: "Browsers only share location on https:// pages (or localhost). Open the app over https to track rides, or enter a ride manually.",
  },
  denied: {
    title: "Location access is blocked",
    body: "To track rides, allow location for this site: tap the lock or site-settings icon next to the address bar, set Location to Allow, then try again. On a phone, also check that your browser is allowed to use location in the system settings.",
  },
  unavailable: {
    title: "Your position isn't available",
    body: "The device couldn't get a GPS fix. Make sure location services are on, move to open sky away from tall buildings, and try again.",
  },
  timeout: {
    title: "Still looking for GPS",
    body: "Getting a position is taking a while. Stay in the open with a clear view of the sky; we'll keep trying.",
  },
};
