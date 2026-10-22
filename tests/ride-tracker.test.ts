import { describe, expect, it } from "vitest";
import type { RoutePoint } from "@/lib/model";
import {
  addFix,
  breakSegment,
  createTracker,
  defaultRideTitle,
  end,
  freezeInterrupted,
  hasEnoughData,
  movingSeconds,
  parseStoredTracker,
  pause,
  resume,
  segments,
  serializeTracker,
  toRide,
  type TrackerState,
} from "@/lib/ride-tracker";

const T0 = 1_700_000_000_000;
const LAT0 = 12.9716;
const LNG0 = 77.5946;
// ~11.1 m per 0.0001 degrees of latitude
const fix = (northSteps: number, sec: number, acc = 5): RoutePoint => ({
  lng: LNG0,
  lat: LAT0 + northSteps * 0.0001,
  t: T0 + sec * 1000,
  acc,
});

function feed(state: TrackerState, fixes: RoutePoint[]) {
  return fixes.reduce((s, f) => addFix(s, f).state, state);
}

describe("ride tracker", () => {
  it("accumulates distance from accepted samples", () => {
    const s = feed(createTracker(T0), [fix(0, 0), fix(1, 2), fix(2, 4), fix(3, 6)]);
    expect(s.points).toHaveLength(4);
    expect(s.distanceM).toBeGreaterThan(32);
    expect(s.distanceM).toBeLessThan(35);
  });

  it("ignores jitter while standing still", () => {
    const jitter = [fix(0, 0), fix(0.2, 1), fix(-0.3, 2), fix(0.1, 3), fix(0.4, 4), fix(-0.2, 5)];
    const s = feed(createTracker(T0), jitter);
    expect(s.points).toHaveLength(1);
    expect(s.distanceM).toBe(0);
    expect(s.lastReject).toBe("too-close");
  });

  it("ignores inaccurate fixes", () => {
    const s = feed(createTracker(T0), [fix(0, 0, 80), fix(1, 2, 50), fix(2, 4, 36)]);
    expect(s.points).toHaveLength(0);
    expect(s.rejected).toBe(3);
    expect(s.lastReject).toBe("inaccurate");
    const s2 = addFix(s, fix(3, 6, 20)).state;
    expect(s2.points).toHaveLength(1);
    expect(s2.distanceM).toBe(0);
  });

  it("rejects GPS jumps that would need impossible speed", () => {
    // 5 km in 2 seconds
    const s = feed(createTracker(T0), [fix(0, 0), fix(450, 2), fix(1, 4)]);
    expect(s.points).toHaveLength(2);
    expect(s.distanceM).toBeLessThan(15);
  });

  it("excludes paused time from moving time", () => {
    let s = createTracker(T0);
    expect(movingSeconds(s, T0 + 60_000)).toBe(60);
    s = pause(s, T0 + 60_000);
    expect(movingSeconds(s, T0 + 600_000)).toBe(60);
    s = resume(s, T0 + 600_000);
    expect(movingSeconds(s, T0 + 630_000)).toBe(90);
    s = end(s, T0 + 640_000);
    expect(s.status).toBe("ended");
    expect(movingSeconds(s, T0 + 999_000)).toBe(100);
  });

  it("ignores fixes while paused and doesn't count the distance across a pause", () => {
    let s = feed(createTracker(T0), [fix(0, 0), fix(1, 2)]);
    const before = s.distanceM;
    s = pause(s, T0 + 3000);
    s = addFix(s, fix(5, 10)).state;
    expect(s.points).toHaveLength(2);
    s = resume(s, T0 + 60_000);
    // 1 km away after the pause: starts a new segment, no distance added
    s = feed(s, [fix(100, 60), fix(101, 62)]);
    expect(s.points).toHaveLength(4);
    expect(s.distanceM - before).toBeGreaterThan(10);
    expect(s.distanceM - before).toBeLessThan(12);
    expect(segments(s)).toHaveLength(2);
  });

  it("breakSegment starts a new segment without bridging the gap", () => {
    let s = feed(createTracker(T0), [fix(0, 0), fix(1, 2)]);
    s = breakSegment(s);
    s = feed(s, [fix(50, 120), fix(51, 122)]);
    expect(segments(s)).toHaveLength(2);
    expect(s.distanceM).toBeLessThan(25);
  });

  it("requires real data before a ride can be saved", () => {
    const tiny = feed(createTracker(T0), [fix(0, 0), fix(1, 2)]);
    expect(hasEnoughData(tiny)).toBe(false);
    const ok = feed(createTracker(T0), [0, 1, 2, 3, 4, 5].map((n) => fix(n, n * 2)));
    expect(hasEnoughData(ok)).toBe(true);
  });

  it("builds a GPS ride from the tracker", () => {
    let s = feed(createTracker(T0), [0, 1, 2, 3, 4, 5].map((n) => fix(n, n * 2)));
    s = end(s, T0 + 20_000);
    const ride = toRide(s, { title: "  ", bikeId: null, notes: " hi " });
    expect(ride.source).toBe("gps");
    expect(ride.movingSec).toBe(20);
    expect(ride.points).toHaveLength(6);
    expect(ride.notes).toBe("hi");
    expect(ride.title).toBe(defaultRideTitle(T0));
  });

  it("round-trips through storage and freezes an interrupted ride at the last save", () => {
    const s = feed(createTracker(T0), [fix(0, 0), fix(1, 2)]);
    const stored = parseStoredTracker(serializeTracker(s, T0 + 30_000));
    expect(stored).not.toBeNull();
    const frozen = freezeInterrupted(stored!);
    expect(frozen.status).toBe("paused");
    expect(movingSeconds(frozen, T0 + 3_600_000)).toBe(30);
    expect(parseStoredTracker("{bad json")).toBeNull();
    expect(parseStoredTracker(JSON.stringify({ v: 2 }))).toBeNull();
  });
});
