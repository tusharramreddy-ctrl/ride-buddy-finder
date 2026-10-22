"use client";

import { useRef, useState } from "react";
import { CalendarClock, Gauge, MapPin, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react";
import { bikeInfo } from "@/lib/bikes";
import { CHARACTERS, slotLabel } from "@/lib/constants";
import { formatClock, demoPlanRider, planBasics, planMessage, type PlanRider, type RidePlan } from "@/lib/plan";
import { findRider } from "@/lib/riders";
import { sendDirectMessage, useStore } from "@/lib/store";
import { GoogleMapsLink } from "../GoogleMapsLink";
import { Button, Dialog, ErrorMessage, Notice, postJson, toast } from "../ui";
import type { ChatPartner } from "./chat-utils";

// "Plan a ride" in a one-to-one chat: code works out when, how fast and how
// far; the AI picks a destination from the allowed list and explains it.
export function PlanRideDialog({ open, onClose, partner }: { open: boolean; onClose: () => void; partner: ChatPartner }) {
  return (
    <Dialog open={open} onClose={onClose} title={`Plan a ride with ${partner.name.split(" ")[0]}`} wide>
      {open && <PlanBody partner={partner} onClose={onClose} />}
    </Dialog>
  );
}

function PlanBody({ partner, onClose }: { partner: ChatPartner; onClose: () => void }) {
  const { state } = useStore();
  const [plan, setPlan] = useState<RidePlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);
  const firstName = partner.name.split(" ")[0];

  const me = state.me;
  const primary = state.garage.find((b) => b.primary)?.bike ?? null;
  const mine: PlanRider | null = me
    ? { name: me.displayName, level: me.level, style: me.style, area: me.region, availability: me.availability, bikeType: primary ? bikeInfo(primary).type : null }
    : null;
  const demo = findRider(partner.id);
  const profile = state.profiles[partner.id];
  const theirs: PlanRider | null = demo
    ? demoPlanRider(demo)
    : profile
      ? {
          name: profile.displayName,
          level: profile.level,
          style: profile.style,
          area: profile.region,
          availability: profile.availability,
          bikeType: profile.primaryBike ? bikeInfo(profile.primaryBike).type : null,
        }
      : null;

  if (!mine || !theirs) return <ErrorMessage>We couldn&apos;t load both profiles. Please try again in a moment.</ErrorMessage>;
  const basics = planBasics(mine, theirs);

  async function makePlan() {
    setError("");
    setPlanning(true);
    const res = await postJson<{ plan: RidePlan }>("/api/plan", { me: mine, partnerId: partner.id, partner: demo ? null : theirs });
    setPlanning(false);
    if (!res.ok) return setError(res.error);
    setPlan(res.data.plan);
    // Show the new plan from its top (the destination), not where the button was.
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start" }));
  }

  function send() {
    if (!plan) return;
    sendDirectMessage(partner.id, planMessage(plan));
    toast(`Plan sent to ${firstName}`);
    onClose();
  }

  const styleName = (r: PlanRider) => (r.style ? CHARACTERS[r.style].name : "style not set");

  if (!plan) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-2">
          We&apos;ll plan around both of your profiles: <strong>{styleName(mine)}</strong> ({mine.level}) and{" "}
          <strong>{styleName(theirs)}</strong> ({theirs.level}).
        </p>
        {basics.ok ? (
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <CalendarClock aria-hidden className="h-4 w-4 text-accent-ink" />
              You&apos;re both free on {basics.basics.sharedSlots.map((s) => slotLabel(s).toLowerCase()).join(" and ")}
            </li>
            <li className="flex items-center gap-2">
              <Gauge aria-hidden className="h-4 w-4 text-accent-ink" />
              Pace: {basics.basics.pace}, up to about {basics.basics.maxKm} km each way
            </li>
            <li className="flex items-center gap-2">
              <MapPin aria-hidden className="h-4 w-4 text-accent-ink" />
              Meet {basics.basics.meetArea === "a spot you both agree on" ? "at a spot you both agree on" : `in ${basics.basics.meetArea}`}
            </li>
          </ul>
        ) : (
          <Notice>{basics.error}</Notice>
        )}
        {!mine.style && <p className="text-xs text-muted">Take the style quiz on your profile for a plan that fits you better.</p>}
        <ErrorMessage>{error}</ErrorMessage>
        {basics.ok && (
          <Button size="lg" onClick={makePlan} loading={planning}>
            <Sparkles className="h-4 w-4" /> {planning ? "Planning your ride…" : "Plan our ride"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-20 space-y-4">
      <div className="rounded-2xl bg-asphalt p-4 text-on-asphalt">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Your ride</p>
        <p className="font-display text-3xl font-bold uppercase leading-tight">{plan.destination.name}</p>
        <p className="text-sm text-on-asphalt-muted">
          About {plan.destination.km} km each way · {plan.destination.road}
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">When</dt>
          <dd className="font-semibold">{plan.when}</dd>
          <dd>Start around {formatClock(plan.startTime)}</dd>
        </div>
        <div>
          <dt className="text-muted">Meet</dt>
          <dd className="font-semibold">{plan.meetArea}</dd>
        </div>
        <div>
          <dt className="text-muted">Pace</dt>
          <dd className="font-semibold capitalize">{plan.pace}</dd>
        </div>
      </dl>

      <p className="text-ink-2">{plan.summary}</p>
      <p className="text-sm text-ink-2">
        <span className="font-semibold text-ink">Stops: </span>
        {plan.stops}
      </p>
      {plan.backup && (
        <p className="text-sm text-ink-2">
          <span className="font-semibold text-ink">Backup: </span>
          {plan.backup.name} (about {plan.backup.km} km each way)
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        <GoogleMapsLink href={plan.routeUrl ?? plan.destinationUrl} label={plan.routeUrl ? "Route in Google Maps" : "Destination in Google Maps"} />
        {plan.meetUrl && <GoogleMapsLink href={plan.meetUrl} label={`${plan.meetArea} in Google Maps`} />}
      </div>

      <div className="rounded-xl border border-line p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
          <ShieldCheck aria-hidden className="h-4 w-4 text-success" /> Ride safe
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
          {plan.safety.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted">
        {plan.source === "ai"
          ? "Destination and summary suggested by AI from a list our rules allow. Time, pace, distance and safety notes come from those rules."
          : "AI wasn't available, so this plan comes from our simple rules."}{" "}
        Distances are approximate; check the route before you ride.
      </p>

      <ErrorMessage>{error}</ErrorMessage>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={makePlan} loading={planning}>
          <RefreshCw className="h-4 w-4" /> Plan again
        </Button>
        <Button onClick={send}>
          <Send className="h-4 w-4" /> Send plan to {firstName}
        </Button>
      </div>
    </div>
  );
}
