import { describe, expect, it } from "vitest";
import { gmapsAreaUrl, gmapsPointUrl, gmapsRouteUrl, MAX_WAYPOINTS } from "@/lib/gmaps";
import type { LngLat } from "@/lib/model";

const route: LngLat[] = Array.from({ length: 20 }, (_, i) => [77.58 + i * 0.01, 12.93 + i * 0.005]);

describe("Google Maps links", () => {
  it("searches an approximate area in Bengaluru", () => {
    const url = new URL(gmapsAreaUrl("HSR Layout"));
    expect(url.hostname).toBe("www.google.com");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("query")).toBe("HSR Layout, Bengaluru");
  });

  it("opens a map centred on a point, as latitude,longitude", () => {
    const url = new URL(gmapsPointUrl([77.5946, 12.9716], 11.6));
    expect(url.searchParams.get("center")).toBe("12.97160,77.59460");
    expect(url.searchParams.get("zoom")).toBe("12");
  });

  it("turns a route into start, a few stops and end", () => {
    const url = new URL(gmapsRouteUrl(route)!);
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("origin")).toBe("12.93000,77.58000");
    expect(url.searchParams.get("destination")).toBe("13.02500,77.77000");
    const stops = url.searchParams.get("waypoints")!.split("|");
    expect(stops).toHaveLength(MAX_WAYPOINTS);
    expect(new Set(stops).size).toBe(MAX_WAYPOINTS);
  });

  it("handles short routes and missing routes", () => {
    expect(gmapsRouteUrl(null)).toBeNull();
    expect(gmapsRouteUrl([[77.58, 12.93]])).toBeNull();
    expect(new URL(gmapsRouteUrl([[77.58, 12.93], [77.6, 12.95]])!).searchParams.get("waypoints")).toBeNull();
  });
});
