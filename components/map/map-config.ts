import { getVersion, setWorkerUrl } from "maplibre-gl";

// Map provider setup in one place so it can be swapped.
//
// Default: OpenFreeMap (free, no API key, OpenStreetMap data). Attribution is
// shown by MapLibre's attribution control and must stay visible.
// To use another provider, set NEXT_PUBLIC_MAP_STYLE_URL to any MapLibre
// style JSON URL (e.g. a MapTiler or self-hosted style).

export const OPENFREEMAP_DARK = "https://tiles.openfreemap.org/styles/dark";
export const OPENFREEMAP_LIBERTY = "https://tiles.openfreemap.org/styles/liberty";

export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || OPENFREEMAP_DARK;

// Bengaluru. Shown on load without asking for location.
export const DEFAULT_CENTER: [number, number] = [77.5946, 12.9716];
export const DEFAULT_ZOOM = 11;
export const FOLLOW_ZOOM = 15;

// If the style hasn't loaded in this long, show the error overlay.
export const STYLE_LOAD_TIMEOUT_MS = 25_000;

export const ROUTE_COLOR = "#f5a400";
export const ROUTE_CASING = "#16181b";

// MapLibre runs tile parsing in a Web Worker that it locates relative to its
// own module URL, which bundlers rewrite. Browsers also refuse to start a
// worker from another website, so we serve the exact installed version from
// our own site: scripts/copy-map-worker.mjs copies it into public/ before
// every dev and build. Override with NEXT_PUBLIC_MAPLIBRE_WORKER_URL if needed.
let workerConfigured = false;
export function configureMapWorker() {
  if (workerConfigured) return;
  workerConfigured = true;
  const url = process.env.NEXT_PUBLIC_MAPLIBRE_WORKER_URL || `/maplibre-gl-worker.mjs?v=${getVersion()}`;
  setWorkerUrl(url);
}
