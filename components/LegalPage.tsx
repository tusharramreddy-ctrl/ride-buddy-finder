import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Brand";

// Simple, readable layout for the Privacy policy and Terms pages.
// These pages are public (no sign-in) so Google and visitors can read them.

export const CONTACT_URL = "https://github.com/tusharramreddy-ctrl/ride-buddy-finder/issues";
export const LAST_UPDATED = "22 October 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="Ride Buddy home">
            <Logo size={30} />
          </Link>
          <nav className="flex gap-4 text-sm font-semibold text-ink-2">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {LAST_UPDATED}</p>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-ink-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-ink [&_li]:mt-1.5 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:font-semibold [&_a]:text-accent-ink [&_a]:underline">
          {children}
        </div>
        <p className="mt-12 border-t border-line pt-6 text-sm">
          <Link href="/" className="font-semibold text-accent-ink underline">
            Back to Ride Buddy
          </Link>
        </p>
      </main>
    </div>
  );
}
