// Ride Buddy brand: a rounded "badge" with a road sweeping through a bend,
// centre line in road-line amber. Original artwork; not based on any other brand.

export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className={className}>
      <rect width="40" height="40" rx="11" fill="#16181b" />
      <path d="M8 33 C 14 33, 14 22, 20 20 S 27 9, 33 7" fill="none" stroke="#f3f1ec" strokeWidth="7.5" strokeLinecap="round" />
      <path
        d="M8 33 C 14 33, 14 22, 20 20 S 27 9, 33 7"
        fill="none"
        stroke="#f5a400"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3.5 3.5"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-2xl font-extrabold uppercase italic leading-none tracking-wide text-ink ${className}`}>
      Ride<span className="text-accent-ink">Buddy</span>
    </span>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={size} />
      <Wordmark />
    </span>
  );
}

export const TAGLINE = "Find your people. Ride your road.";
