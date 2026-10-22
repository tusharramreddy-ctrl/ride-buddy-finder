import { ExternalLink } from "lucide-react";

// A small "Open in Google Maps" link. Opens in a new tab (or the Google Maps
// app on phones). See lib/gmaps.ts for how the links are built.
export function GoogleMapsLink({ href, label, dark = false }: { href: string; label: string; dark?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${dark ? "text-accent hover:bg-asphalt-line" : "text-accent-ink hover:bg-surface-3"}`}
    >
      <ExternalLink aria-hidden className="h-3.5 w-3.5" />
      {label}
      <span className="sr-only"> (opens Google Maps in a new tab)</span>
    </a>
  );
}
