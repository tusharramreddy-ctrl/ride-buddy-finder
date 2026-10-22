import { describe, expect, it } from "vitest";
import { bikeInfo, bikeRefSchema, findMake, MAKES, searchBikes } from "@/lib/bikes";
import { parseMatchPrefs } from "@/lib/prefs";
import { looksLikeText } from "@/lib/text";
import { makePrefs } from "./helpers";

describe("bike catalogue", () => {
  it("includes BMW Motorrad with the common models", () => {
    const bmw = findMake("bmw");
    expect(bmw?.name).toBe("BMW Motorrad");
    const names = bmw!.models.map((m) => m.name);
    for (const n of ["G 310 R", "G 310 GS", "F 900 GS", "F 900 R", "R 1300 GS", "S 1000 RR"]) expect(names).toContain(n);
  });

  it("includes every requested manufacturer", () => {
    const names = MAKES.map((m) => m.name);
    for (const n of [
      "BMW Motorrad", "Royal Enfield", "KTM", "Honda", "Yamaha", "Kawasaki", "Suzuki", "Ducati", "Triumph",
      "Harley-Davidson", "TVS", "Bajaj", "Hero", "Aprilia", "Husqvarna", "Benelli", "CFMoto", "Moto Guzzi", "Indian Motorcycle",
    ]) expect(names).toContain(n);
  });

  it("has unique model ids and sensible engine sizes", () => {
    const ids = MAKES.flatMap((m) => m.models.map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MAKES.flatMap((x) => x.models)) {
      if (m.cc !== null) expect(m.cc).toBeGreaterThan(40);
    }
  });

  it("search matches every word across make, model and cc", () => {
    const gs = searchBikes("bmw gs").map((r) => r.model.name);
    expect(gs).toEqual(expect.arrayContaining(["G 310 GS", "F 900 GS", "R 1300 GS"]));
    expect(searchBikes("bmw gs").every((r) => r.make.id === "bmw")).toBe(true);
    expect(searchBikes("1300").some((r) => r.model.id === "bmw-r1300gs")).toBe(true);
    expect(searchBikes("zzzz")).toHaveLength(0);
  });

  it("supports custom bikes", () => {
    const custom = { kind: "custom", make: "Honda", model: "CB200X", type: "Adventure", cc: 184 } as const;
    expect(bikeRefSchema.safeParse(custom).success).toBe(true);
    expect(bikeInfo(custom).label).toBe("Honda CB200X");
    expect(bikeRefSchema.safeParse({ kind: "catalog", modelId: "made-up" }).success).toBe(false);
  });
});

describe("match preferences", () => {
  it("accepts complete preferences", () => {
    expect(parseMatchPrefs(makePrefs()).ok).toBe(true);
  });

  it("rejects empty and tampered input with friendly messages", () => {
    const empty = parseMatchPrefs({});
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(Object.keys(empty.errors).length).toBeGreaterThan(3);
    expect(parseMatchPrefs(makePrefs({ availability: [] })).ok).toBe(false);
    expect(parseMatchPrefs({ ...makePrefs(), area: "Mars" }).ok).toBe(false);
    expect(parseMatchPrefs({ ...makePrefs(), bike: { kind: "catalog", modelId: "fake" } }).ok).toBe(false);
  });
});

describe("looksLikeText", () => {
  it("rejects empty, symbols-only and repeated characters", () => {
    expect(looksLikeText("Asha", 2, 40)).toBe(true);
    for (const bad of ["", "   ", "!!!", "1234", "aaaaaa"]) expect(looksLikeText(bad, 2, 40)).toBe(false);
  });
});
