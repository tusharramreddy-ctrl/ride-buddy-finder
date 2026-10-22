import { describe, expect, it } from "vitest";
import { acceptSample, distanceM, routeLengthM, simplify, trimForPrivacy } from "@/lib/geo";
import type { LngLat } from "@/lib/model";

// A straight line going north from Jayanagar, one point every ~111 m.
const line: LngLat[] = Array.from({ length: 30 }, (_, i) => [77.58, 12.93 + i * 0.001]);

describe("distance", () => {
  it("measures about 111 m per 0.001° of latitude", () => {
    expect(distanceM([77.58, 12.93], [77.58, 12.931])).toBeGreaterThan(105);
    expect(distanceM([77.58, 12.93], [77.58, 12.931])).toBeLessThan(115);
    expect(routeLengthM(line)).toBeGreaterThan(3100);
  });
});

describe("GPS sample filtering", () => {
  const p = (lat: number, t: number, acc = 10) => ({ lng: 77.58, lat, t, acc });
  it("rejects inaccurate fixes, jitter and impossible jumps", () => {
    expect(acceptSample(null, p(12.93, 0, 80)).keep).toBe(false);
    expect(acceptSample(p(12.93, 0), p(12.93002, 1000)).keep).toBe(false); // ~2 m jitter
    expect(acceptSample(p(12.93, 0), p(12.94, 1000)).keep).toBe(false); // 1.1 km in 1 s
    expect(acceptSample(p(12.93, 0), p(12.9302, 5000)).keep).toBe(true); // ~22 m in 5 s
  });
});

describe("privacy trim", () => {
  it("removes roughly the first and last 300 m of a shared route", () => {
    const trimmed = trimForPrivacy(line);
    expect(trimmed.length).toBeLessThan(line.length);
    expect(distanceM(line[0], trimmed[0])).toBeGreaterThanOrEqual(300);
    expect(distanceM(line[line.length - 1], trimmed[trimmed.length - 1])).toBeGreaterThanOrEqual(300);
  });

  it("shares no route at all for very short rides", () => {
    expect(trimForPrivacy(line.slice(0, 5))).toEqual([]);
  });

  it("simplify keeps the ends and caps the size", () => {
    const s = simplify(line, 10);
    expect(s).toHaveLength(10);
    expect(s[0]).toEqual(line[0]);
    expect(s[9]).toEqual(line[29]);
  });
});
