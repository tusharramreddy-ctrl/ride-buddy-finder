"use client";

import { CHARACTERS, slotLabel } from "@/lib/constants";
import { riderBike, type DemoRider } from "@/lib/riders";
import { Button, DemoBadge } from "./ui";

export function RiderCard({
  rider,
  reason,
  selected,
  onDraft,
  drafting,
}: {
  rider: DemoRider;
  reason: string;
  selected: boolean;
  onDraft: () => void;
  drafting: boolean;
}) {
  const c = CHARACTERS[rider.character];
  const bike = riderBike(rider);
  return (
    <article
      className={`flex flex-col rounded-2xl border bg-surface p-5 transition-colors ${selected ? "border-accent ring-2 ring-accent/30" : "border-border"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{rider.name}</h3>
          <p className="text-sm text-muted">
            {rider.level} · {rider.area}
          </p>
        </div>
        <span aria-hidden className="text-2xl">{c.emoji}</span>
      </div>
      <div className="mt-2">
        <DemoBadge />
      </div>

      <p className="mt-4 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm">
        <span className="font-semibold">Why you match: </span>
        {reason}
      </p>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted">Character</dt>
          <dd>{c.name}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted">Bike</dt>
          <dd>{bike.label} <span className="text-muted">({bike.type})</span></dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted">Free</dt>
          <dd>{rider.availability.map(slotLabel).join(", ")}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm italic text-muted">&ldquo;{rider.bio}&rdquo;</p>

      <div className="mt-auto pt-5">
        <Button variant={selected ? "primary" : "secondary"} className="w-full" onClick={onDraft} loading={drafting}>
          {drafting ? "Drafting…" : "Draft intro"}
        </Button>
      </div>
    </article>
  );
}
