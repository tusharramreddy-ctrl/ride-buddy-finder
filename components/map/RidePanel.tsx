"use client";

import { useState, type ReactNode } from "react";
import {
  CircleAlert,
  Info,
  LoaderCircle,
  Pause,
  PenLine,
  Play,
  Satellite,
  Share2,
  Square,
  Sun,
  Trash,
  X,
} from "lucide-react";
import { avgSpeedKmh, formatDuration, formatKm, MAX_ACCURACY_M, PRIVACY_TRIM_M } from "@/lib/geo";
import type { GarageBike, Ride } from "@/lib/model";
import {
  defaultRideTitle,
  GEO_PROBLEM_TEXT,
  hasEnoughData,
  MIN_SAVE_DISTANCE_M,
  movingSeconds,
  signalQuality,
  type GeoProblem,
  type StoredRide,
  type TrackerState,
} from "@/lib/ride-tracker";
import type { Fix, Phase } from "./useRideTracker";
import { bikeLabel, formatClock, formatDate, formatSpeed, sharedRoute } from "./ride-utils";

// ---------- Building blocks (dark, high contrast, big numbers) ----------

const primaryBtn =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-accent px-6 font-display text-xl font-bold uppercase tracking-wide text-on-accent shadow-md hover:bg-accent-hover disabled:opacity-60";
const secondaryBtn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-on-asphalt/30 px-5 font-semibold text-on-asphalt hover:bg-asphalt-2";
const textBtn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-on-asphalt-muted hover:bg-asphalt-2 hover:text-on-asphalt";
const darkInput =
  "w-full rounded-xl border border-asphalt-line bg-asphalt-2 px-3.5 py-2.5 text-base text-on-asphalt placeholder:text-on-asphalt-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

function Stat({ label, value, unit, big }: { label: string; value: string; unit?: string; big?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-on-asphalt-muted">{label}</dt>
      <dd className={`font-display font-bold leading-none tabular-nums text-white ${big ? "text-5xl" : "text-3xl"}`}>
        {value}
        {unit && <span className="ml-1 text-base font-semibold text-on-asphalt-muted">{unit}</span>}
      </dd>
    </div>
  );
}

function kmValue(m: number): string {
  return formatKm(m).replace(" km", "");
}

function Alert({ tone = "warn", title, children, onDismiss }: { tone?: "warn" | "error" | "info"; title?: string; children: ReactNode; onDismiss?: () => void }) {
  const colours = {
    warn: "bg-accent/15 text-on-asphalt ring-accent/40",
    error: "bg-[#5c1a14] text-white ring-[#ff8a80]/40",
    info: "bg-asphalt-2 text-on-asphalt ring-asphalt-line",
  }[tone];
  const Icon = tone === "info" ? Info : CircleAlert;
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ring-1 ${colours}`}>
      <Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "error" ? "text-[#ff8a80]" : "text-accent"}`} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? "mt-0.5 text-on-asphalt-muted" : ""}>{children}</div>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
          <X aria-hidden className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

const KEEP_OPEN =
  "Keep this page open on the Map screen — browsers stop tracking when the screen locks or you switch apps.";

function AccuracyLine({ fix }: { fix: Fix | null }) {
  if (!fix) return <span className="text-on-asphalt-muted">No GPS fix yet</span>;
  const q = signalQuality(fix.acc);
  const label = q === "good" ? "Good" : q === "ok" ? "OK" : "Weak — not recorded";
  const colour = q === "good" ? "text-[#8fe0b0]" : q === "ok" ? "text-accent" : "text-[#ff8a80]";
  return (
    <span>
      GPS ±{Math.round(fix.acc)} m · <span className={`font-semibold ${colour}`}>{label}</span>
    </span>
  );
}

// ---------- Panel ----------

export type PanelProps = {
  phase: Phase;
  tracker: TrackerState | null;
  now: number;
  lastFix: Fix | null;
  problem: GeoProblem | null;
  signalWarning: GeoProblem | null;
  gapNotice: boolean;
  wakeLockOn: boolean;
  interrupted: StoredRide | null;
  garage: GarageBike[];
  savedRide: Ride | null;
  selectedRide: Ride | null;
  onStart: () => void;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onRequestEnd: () => void;
  onRequestDiscard: () => void;
  onSave: (meta: { title: string; bikeId: string | null; notes: string }) => void;
  onShare: (ride: Ride) => void;
  onDone: () => void;
  onManual: (prefill?: { date?: number; durationMin?: number }) => void;
  onClearSelection: () => void;
  onResumeInterrupted: () => void;
  onFinishInterrupted: () => void;
  onDiscardInterrupted: () => void;
  onDismissProblem: () => void;
  onDismissSignalWarning: () => void;
  onDismissGap: () => void;
};

export function RidePanel(p: PanelProps) {
  return (
    <div className="space-y-4 p-4">
      <StatusAnnouncer phase={p.phase} tracker={p.tracker} hasSaved={!!p.savedRide} />
      <PanelBody {...p} />
    </div>
  );
}

// Announces state changes (not every tick) to screen readers.
function StatusAnnouncer({ phase, tracker, hasSaved }: { phase: Phase; tracker: TrackerState | null; hasSaved: boolean }) {
  let text = "";
  if (hasSaved) text = "Ride saved.";
  else if (phase === "requesting") text = "Waiting for location permission.";
  else if (phase === "waiting") text = "Waiting for a good GPS signal.";
  else if (phase === "active") text = tracker?.status === "paused" ? "Ride paused." : "Recording ride.";
  else if (phase === "ended") text = "Ride ended. Review the summary.";
  return (
    <p aria-live="polite" role="status" className="sr-only">
      {text}
    </p>
  );
}

function PanelBody(p: PanelProps) {
  if (p.savedRide) return <SavedView ride={p.savedRide} onShare={p.onShare} onDone={p.onDone} />;
  if (p.interrupted && p.phase === "idle") return <InterruptedView {...p} interrupted={p.interrupted} />;
  if (p.phase === "requesting" || p.phase === "waiting") return <WaitingView {...p} />;
  if (p.phase === "active" && p.tracker) return <TrackingView {...p} tracker={p.tracker} />;
  if (p.phase === "ended" && p.tracker) return <SummaryView {...p} tracker={p.tracker} />;
  return <IdleView {...p} />;
}

function IdleView(p: PanelProps) {
  const blocked = p.problem === "unsupported" || p.problem === "insecure";
  return (
    <>
      {p.selectedRide && <SelectedRideCard ride={p.selectedRide} garage={p.garage} onClose={p.onClearSelection} onShare={p.onShare} />}
      {p.problem && (
        <Alert tone="error" title={GEO_PROBLEM_TEXT[p.problem].title} onDismiss={blocked ? undefined : p.onDismissProblem}>
          {GEO_PROBLEM_TEXT[p.problem].body}
        </Alert>
      )}
      {!p.selectedRide && (
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">Ready to ride?</h1>
          <p className="mt-1 text-sm text-on-asphalt-muted">
            Track your route with GPS. We only ask for your location when you tap Start.
          </p>
        </div>
      )}
      <button type="button" onClick={p.onStart} disabled={blocked} className={primaryBtn}>
        <Play aria-hidden className="h-6 w-6 fill-current" /> Start ride
      </button>
      <p className="flex items-start gap-2 text-xs text-on-asphalt-muted">
        <Sun aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {KEEP_OPEN}
      </p>
      <div className="flex justify-center">
        <button type="button" onClick={() => p.onManual()} className={textBtn}>
          <PenLine aria-hidden className="h-4 w-4" /> Forgot to track? Add a ride manually
        </button>
      </div>
    </>
  );
}

function SelectedRideCard({ ride, garage, onClose, onShare }: { ride: Ride; garage: GarageBike[]; onClose: () => void; onShare: (r: Ride) => void }) {
  const bike = ride.bikeId ? garage.find((b) => b.id === ride.bikeId) : undefined;
  return (
    <div className="rounded-xl bg-asphalt-2 p-3 ring-1 ring-asphalt-line">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">On the map</p>
          <p className="truncate font-semibold text-white">{ride.title}</p>
          <p className="text-xs text-on-asphalt-muted">
            {formatDate(ride.startedAt)} · {formatClock(ride.startedAt)}–{formatClock(ride.endedAt)}
            {bike && ` · ${bikeLabel(bike)}`}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Hide this ride from the map" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-asphalt-line">
          <X aria-hidden className="h-5 w-5" />
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Distance" value={kmValue(ride.distanceM)} unit="km" />
        <Stat label="Moving" value={formatDuration(ride.movingSec)} />
        <Stat label="Avg" value={formatSpeed(avgSpeedKmh(ride.distanceM, ride.movingSec))} unit="km/h" />
      </dl>
      {!ride.sharedPostId && (
        <button type="button" onClick={() => onShare(ride)} className={`${textBtn} mt-2 px-2! text-accent`}>
          <Share2 aria-hidden className="h-4 w-4" /> Share to feed
        </button>
      )}
    </div>
  );
}

function InterruptedView(p: PanelProps & { interrupted: StoredRide }) {
  const t = p.interrupted.tracker;
  const ended = t.status === "ended";
  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">Unfinished ride found</h1>
        <p className="mt-1 text-sm text-on-asphalt-muted">
          Started {formatDate(t.startedAt)} at {formatClock(t.startedAt)}. Last saved at {formatClock(p.interrupted.savedAt)}.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Distance" value={kmValue(t.distanceM)} unit="km" />
        <Stat label="Moving time" value={formatDuration(t.movingMs / 1000)} />
      </dl>
      {!ended && (
        <Alert tone="info">
          The page was closed or reloaded. Anything after {formatClock(p.interrupted.savedAt)} wasn&apos;t tracked, and that gap won&apos;t
          be counted.
        </Alert>
      )}
      {p.problem && (
        <Alert tone="error" title={GEO_PROBLEM_TEXT[p.problem].title}>
          {GEO_PROBLEM_TEXT[p.problem].body}
        </Alert>
      )}
      {!ended && (
        <button type="button" onClick={p.onResumeInterrupted} className={primaryBtn}>
          <Play aria-hidden className="h-6 w-6 fill-current" /> Resume ride
        </button>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={p.onFinishInterrupted} className={secondaryBtn}>
          {ended ? "Review & save" : "End & save"}
        </button>
        <button type="button" onClick={p.onDiscardInterrupted} className={`${secondaryBtn} text-[#ff8a80]`}>
          <Trash aria-hidden className="h-4 w-4" /> Discard
        </button>
      </div>
    </>
  );
}

function WaitingView(p: PanelProps) {
  const requesting = p.phase === "requesting";
  return (
    <>
      <div className="flex items-center gap-3">
        <LoaderCircle aria-hidden className="h-8 w-8 shrink-0 animate-spin text-accent" />
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
            {requesting ? "Allow location access" : "Waiting for a good GPS signal…"}
          </h1>
          <p className="text-sm text-on-asphalt-muted">
            {requesting
              ? "Your browser should ask to share your location. Choose Allow to start tracking."
              : `Recording starts once accuracy is ±${MAX_ACCURACY_M} m or better. Open sky helps.`}
          </p>
        </div>
      </div>
      {!requesting && (
        <p className="flex items-center gap-2 text-base text-on-asphalt">
          <Satellite aria-hidden className="h-5 w-5 text-on-asphalt-muted" />
          <AccuracyLine fix={p.lastFix} />
        </p>
      )}
      {p.signalWarning && (
        <Alert title={GEO_PROBLEM_TEXT[p.signalWarning].title}>{GEO_PROBLEM_TEXT[p.signalWarning].body}</Alert>
      )}
      <p className="text-xs text-on-asphalt-muted">{KEEP_OPEN}</p>
      <button type="button" onClick={p.onCancel} className={`${secondaryBtn} w-full`}>
        Cancel
      </button>
    </>
  );
}

function TrackingView(p: PanelProps & { tracker: TrackerState }) {
  const t = p.tracker;
  const paused = t.status === "paused";
  const secs = movingSeconds(t, p.now);
  const speed = avgSpeedKmh(t.distanceM, secs);
  const waitingForFix = !paused && t.needsAnchor && t.points.length > 0;
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wider">
          <span aria-hidden className={`h-3 w-3 rounded-full ${paused ? "bg-on-asphalt-muted" : "animate-pulse bg-[#ff5a4e]"}`} />
          <span className={paused ? "text-on-asphalt-muted" : "text-white"}>{paused ? "Paused" : "Recording"}</span>
        </p>
        <p className="text-sm text-on-asphalt">
          <AccuracyLine fix={p.lastFix} />
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <div className="col-span-2">
          <Stat big label="Distance" value={kmValue(t.distanceM)} unit="km" />
        </div>
        <Stat label="Moving time" value={formatDuration(secs)} />
        <Stat label="Avg speed" value={formatSpeed(speed)} unit={speed === null ? undefined : "km/h"} />
      </dl>

      {waitingForFix && <Alert tone="info">Waiting for a good GPS fix to continue the route…</Alert>}
      {p.problem && (
        <Alert tone="error" title={GEO_PROBLEM_TEXT[p.problem].title} onDismiss={p.onDismissProblem}>
          {GEO_PROBLEM_TEXT[p.problem].body}
        </Alert>
      )}
      {p.signalWarning && !paused && (
        <Alert title={GEO_PROBLEM_TEXT[p.signalWarning].title} onDismiss={p.onDismissSignalWarning}>
          {GEO_PROBLEM_TEXT[p.signalWarning].body} The route won&apos;t be joined across the gap.
        </Alert>
      )}
      {p.gapNotice && (
        <Alert title="Tracking may have stopped in the background" onDismiss={p.onDismissGap}>
          This page was hidden for a while, so part of your route may be missing. It isn&apos;t filled in.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        {paused ? (
          <button type="button" onClick={p.onResume} className={`${primaryBtn} text-lg!`}>
            <Play aria-hidden className="h-5 w-5 fill-current" /> Resume
          </button>
        ) : (
          <button type="button" onClick={p.onPause} className={`${secondaryBtn} min-h-14 text-lg`}>
            <Pause aria-hidden className="h-5 w-5 fill-current" /> Pause
          </button>
        )}
        <button type="button" onClick={p.onRequestEnd} className={`${secondaryBtn} min-h-14 border-[#ff8a80]/60 text-lg text-[#ffb4ab]`}>
          <Square aria-hidden className="h-5 w-5 fill-current" /> End
        </button>
      </div>

      <p className="text-xs leading-relaxed text-on-asphalt-muted">
        {KEEP_OPEN} {p.wakeLockOn ? "The screen is being kept awake while recording." : ""}
      </p>
    </>
  );
}

function SummaryView(p: PanelProps & { tracker: TrackerState }) {
  const t = p.tracker;
  const [title, setTitle] = useState(() => defaultRideTitle(t.startedAt));
  const [bikeId, setBikeId] = useState(() => p.garage.find((b) => b.primary)?.id ?? "");
  const [notes, setNotes] = useState("");
  const secs = t.movingMs / 1000;
  const enough = hasEnoughData(t);

  if (!enough) {
    return (
      <>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">Not enough GPS data</h1>
        <p className="text-sm text-on-asphalt-muted">
          We recorded {t.points.length} usable GPS {t.points.length === 1 ? "point" : "points"} covering {Math.round(t.distanceM)} m. A ride
          needs at least 2 points and {MIN_SAVE_DISTANCE_M} m to be saved, so we won&apos;t make up the numbers.
        </p>
        <p className="text-sm text-on-asphalt-muted">If you did ride, you can enter it manually instead.</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => p.onManual({ date: t.startedAt, durationMin: secs >= 60 ? Math.round(secs / 60) : undefined })}
            className={secondaryBtn}
          >
            <PenLine aria-hidden className="h-4 w-4" /> Enter manually
          </button>
          <button type="button" onClick={p.onRequestDiscard} className={`${secondaryBtn} text-[#ff8a80]`}>
            <Trash aria-hidden className="h-4 w-4" /> Discard
          </button>
        </div>
      </>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        p.onSave({ title, bikeId: bikeId || null, notes });
      }}
    >
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">Ride summary</h1>
        <p className="text-sm text-on-asphalt-muted">
          {formatDate(t.startedAt)} · {formatClock(t.startedAt)}–{formatClock(t.endedAt ?? t.startedAt)}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Distance" value={kmValue(t.distanceM)} unit="km" />
        <Stat label="Moving" value={formatDuration(secs)} />
        <Stat label="Avg" value={formatSpeed(avgSpeedKmh(t.distanceM, secs))} unit="km/h" />
      </dl>
      <div>
        <label htmlFor="ride-title" className="mb-1.5 block text-sm font-semibold text-on-asphalt">
          Title
        </label>
        <input id="ride-title" className={darkInput} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="ride-bike" className="mb-1.5 block text-sm font-semibold text-on-asphalt">
          Bike (optional)
        </label>
        <select id="ride-bike" className={darkInput} value={bikeId} onChange={(e) => setBikeId(e.target.value)} disabled={!p.garage.length}>
          <option value="">{p.garage.length ? "No bike selected" : "No bikes in your garage yet"}</option>
          {p.garage.map((b) => (
            <option key={b.id} value={b.id}>
              {bikeLabel(b)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ride-notes" className="mb-1.5 block text-sm font-semibold text-on-asphalt">
          Notes (optional)
        </label>
        <textarea id="ride-notes" rows={2} maxLength={500} className={darkInput} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button type="submit" className={primaryBtn}>
        Save ride
      </button>
      <div className="flex justify-center">
        <button type="button" onClick={p.onRequestDiscard} className={`${textBtn} text-[#ff8a80]`}>
          <Trash aria-hidden className="h-4 w-4" /> Discard ride
        </button>
      </div>
      <p className="text-xs text-on-asphalt-muted">Private to you. Nothing is shared unless you choose to.</p>
    </form>
  );
}

function SavedView({ ride, onShare, onDone }: { ride: Ride; onShare: (r: Ride) => void; onDone: () => void }) {
  const route = sharedRoute(ride);
  return (
    <>
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">Ride saved</h1>
        <p className="text-sm text-on-asphalt-muted">&ldquo;{ride.title}&rdquo; is in Your rides.</p>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <Stat label="Distance" value={kmValue(ride.distanceM)} unit="km" />
        <Stat label="Moving" value={formatDuration(ride.movingSec)} />
        <Stat label="Avg" value={formatSpeed(avgSpeedKmh(ride.distanceM, ride.movingSec))} unit="km/h" />
      </dl>
      {ride.sharedPostId ? (
        <Alert tone="info">Shared to your feed.</Alert>
      ) : (
        <>
          <button type="button" onClick={() => onShare(ride)} className={primaryBtn}>
            <Share2 aria-hidden className="h-5 w-5" /> Share to feed
          </button>
          <p className="text-xs text-on-asphalt-muted">
            {route
              ? `For your privacy, the first and last ${PRIVACY_TRIM_M} m of the route are hidden when shared, so your start and end points aren't shown.`
              : `This route is too short to share once the first and last ${PRIVACY_TRIM_M} m are hidden for privacy, so only the distance and time will be shared.`}{" "}
            You can review the post before it&apos;s published.
          </p>
        </>
      )}
      <button type="button" onClick={onDone} className={`${secondaryBtn} w-full`}>
        Done
      </button>
    </>
  );
}
