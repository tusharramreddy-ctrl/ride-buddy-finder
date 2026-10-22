import { ClientApp } from "@/components/ClientApp";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Bengaluru · Demo</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Ride Buddy Finder</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Tell us how you ride and we&apos;ll suggest three riders you&apos;re likely to enjoy riding with, then help
          you write a first message.
        </p>
        <p className="mt-3 inline-block rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted">
          All riders shown are fictional demo profiles. This demo shows matching, not a live rider network.
        </p>
      </header>
      <ClientApp />
    </main>
  );
}
