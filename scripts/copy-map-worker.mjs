// Copies MapLibre's web worker into public/ so the browser loads it from our
// own site. Browsers refuse to start workers from another website, and
// bundlers can't locate MapLibre's worker on their own. Runs before dev/build.
import { copyFileSync, mkdirSync } from "node:fs";

const from = "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs";
const to = "public/maplibre-gl-worker.mjs";
mkdirSync("public", { recursive: true });
copyFileSync(from, to);
console.log(`Copied ${from} -> ${to}`);
