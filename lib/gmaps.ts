import type { LngLat } from "./model";

// Links that open Google Maps (app on phones, website on computers) using
// Google's public "Maps URLs" format. No API key, no billing, nothing is
// sent to Google until the rider taps the link.
// https://developers.google.com/maps/documentation/urls/get-started

const BASE = "https://www.google.com/maps";

const fmt = ([lng, lat]: LngLat) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

// Search for a place or rough area, e.g. "Jayanagar, Bengaluru".
export function gmapsSearchUrl(query: string): string {
  return `${BASE}/search/?api=1&query=${encodeURIComponent(query)}`;
}

// An approximate Bengaluru area (never an exact address).
export function gmapsAreaUrl(area: string): string {
  return gmapsSearchUrl(`${area}, Bengaluru`);
}

// A single point, e.g. the centre of the map view.
export function gmapsPointUrl(point: LngLat, zoom?: number): string {
  const z = zoom ? `&zoom=${Math.max(3, Math.min(21, Math.round(zoom)))}` : "";
  return `${BASE}/@?api=1&map_action=map&center=${fmt(point)}${z}`;
}

// Google Maps accepts only a few stops in a link (fewer on phones), so a
// route becomes start → up to 3 evenly spaced stops → end. Good enough to
// open the same roads in Google Maps; it isn't the exact GPS trace.
export const MAX_WAYPOINTS = 3;

export function gmapsRouteUrl(route: LngLat[] | null): string | null {
  if (!route || route.length < 2) return null;
  const origin = route[0];
  const destination = route[route.length - 1];
  const inner = route.slice(1, -1);
  const stops: LngLat[] = [];
  if (inner.length) {
    const n = Math.min(MAX_WAYPOINTS, inner.length);
    for (let i = 1; i <= n; i++) stops.push(inner[Math.round((i * (inner.length + 1)) / (n + 1)) - 1]);
  }
  const params = new URLSearchParams({ api: "1", origin: fmt(origin), destination: fmt(destination), travelmode: "driving" });
  if (stops.length) params.set("waypoints", stops.map(fmt).join("|"));
  return `${BASE}/dir/?${params.toString()}`;
}
