import type { LngLat } from "@/lib/model";

// A small, map-free route drawing for feed cards and ride lists.
// It only draws coordinates that really exist; with no route, it renders nothing.
export function RoutePreview({ route, className = "", dark = true }: { route: LngLat[] | null; className?: string; dark?: boolean }) {
  if (!route || route.length < 2) return null;

  const lngs = route.map((p) => p[0]);
  const lats = route.map((p) => p[1]);
  const minX = Math.min(...lngs);
  const maxX = Math.max(...lngs);
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  // Correct for longitude lines getting closer together away from the equator.
  const kx = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const w = Math.max((maxX - minX) * kx, 1e-6);
  const h = Math.max(maxY - minY, 1e-6);
  const size = 100;
  const pad = 10;
  const scale = (size - pad * 2) / Math.max(w, h);
  const offX = (size - w * scale) / 2;
  const offY = (size - h * scale) / 2;
  const pts = route.map(([x, y]) => [offX + (x - minX) * kx * scale, size - (offY + (y - minY) * scale)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Route preview" className={`${dark ? "bg-asphalt" : "bg-surface-2"} ${className}`}>
      <defs>
        <pattern id="rp-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke={dark ? "#22262b" : "#e7e1d7"} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#rp-grid)" />
      <path d={d} fill="none" stroke={dark ? "#f3f1ec" : "#1b1a18"} strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#f5a400" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sx} cy={sy} r="2.6" fill="#17703f" stroke="#fff" strokeWidth="1" />
      <circle cx={ex} cy={ey} r="2.6" fill={dark ? "#f3f1ec" : "#1b1a18"} stroke="#f5a400" strokeWidth="1" />
    </svg>
  );
}
