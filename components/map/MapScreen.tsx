"use client";

import { useMemo, useState } from "react";
import { ListOrdered } from "lucide-react";
import type { LngLat, Ride } from "@/lib/model";
import { segments, toRide } from "@/lib/ride-tracker";
import { deleteRide, saveRide, useStore } from "@/lib/store";
import { toast } from "../ui";
import { ConfirmDialog } from "./ConfirmDialog";
import { ManualRideDialog, type ManualPrefill } from "./ManualRideDialog";
import { RideHistory } from "./RideHistory";
import { RideMap } from "./RideMap";
import { RidePanel } from "./RidePanel";
import { rideRoute, shareRideToFeed } from "./ride-utils";
import { useRideTracker } from "./useRideTracker";

type Confirm = { kind: "end" } | { kind: "discard" } | { kind: "delete"; ride: Ride } | null;

const NO_ROUTES: LngLat[][] = [];

export function MapScreen() {
  const { state } = useStore();
  const rt = useRideTracker();
  const [follow, setFollow] = useState(true);
  const [centerNonce, setCenterNonce] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [manual, setManual] = useState<ManualPrefill | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const savedRide = savedId ? (state.rides.find((r) => r.id === savedId) ?? null) : null;
  const selectedRide = selectedId ? (state.rides.find((r) => r.id === selectedId) ?? null) : null;
  const inRide = rt.phase !== "idle";

  // What the map shows: live/ended ride > just-saved ride > selected history ride.
  const tracker = rt.tracker;
  const liveRoutes = useMemo(() => (tracker ? segments(tracker) : NO_ROUTES), [tracker]);
  const savedRoutes = useMemo(() => (savedRide && savedRide.points.length ? [rideRoute(savedRide)] : NO_ROUTES), [savedRide]);
  const selectedRoutes = useMemo(
    () => (selectedRide && selectedRide.points.length ? [rideRoute(selectedRide)] : NO_ROUTES),
    [selectedRide],
  );

  let routes = NO_ROUTES;
  let fitKey: string | null = null;
  if (tracker) {
    routes = liveRoutes;
    if (rt.phase === "ended") fitKey = `ended-${tracker.startedAt}`;
  } else if (savedRide) {
    routes = savedRoutes;
    fitKey = `ride-${savedRide.id}`;
  } else if (selectedRide && !inRide) {
    routes = selectedRoutes;
    fitKey = `ride-${selectedRide.id}`;
  }

  const position = rt.lastFix ? { lng: rt.lastFix.lng, lat: rt.lastFix.lat } : null;
  const active = rt.phase === "active" || rt.phase === "waiting";
  const canLocate = rt.permission === "granted" || !!rt.lastFix;

  const start = () => {
    setSelectedId(null);
    setSavedId(null);
    setFollow(true);
    rt.start();
  };

  const save = (meta: { title: string; bikeId: string | null; notes: string }) => {
    if (!tracker) return;
    const id = saveRide(toRide(tracker, meta));
    rt.reset();
    setSavedId(id);
    toast("Ride saved on this device");
  };

  const share = (ride: Ride) => shareRideToFeed(ride);

  const locate = () => {
    if (active) setFollow(true);
    else rt.locateOnce();
    setCenterNonce((n) => n + 1);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col bg-asphalt text-on-asphalt lg:relative lg:block lg:h-dvh">
      <h1 className="sr-only">Map and ride tracking</h1>
      <div className="relative min-h-0 flex-1 lg:absolute lg:inset-0">
        <RideMap
          routes={routes}
          fitKey={fitKey}
          position={position}
          follow={active && follow}
          onFollowChange={setFollow}
          showFollowToggle={active && !!position}
          onLocate={canLocate ? locate : null}
          centerNonce={centerNonce}
        />

        {!inRide && !historyOpen && (
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="absolute left-3 top-3 z-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-asphalt-2/95 px-4 text-sm font-semibold text-on-asphalt shadow-md ring-1 ring-asphalt-line hover:bg-asphalt-line lg:left-auto lg:right-14"
          >
            <ListOrdered aria-hidden className="h-4 w-4 text-accent" />
            Your rides
            <span className="rounded-full bg-asphalt-line px-1.5 text-xs tabular-nums">{state.rides.length}</span>
          </button>
        )}

        {historyOpen && (
          <RideHistory
            rides={state.rides}
            garage={state.garage}
            selectedId={selectedId}
            onSelect={(ride) => {
              setSavedId(null);
              setSelectedId(ride.id);
              setHistoryOpen(false);
            }}
            onShare={share}
            onDelete={(ride) => setConfirm({ kind: "delete", ride })}
            onAddManual={() => setManual({})}
            onClose={() => setHistoryOpen(false)}
          />
        )}
      </div>

      <section
        aria-label="Ride controls"
        className="max-h-[60%] shrink-0 overflow-y-auto rounded-t-2xl border-t border-asphalt-line bg-asphalt shadow-[0_-8px_24px_rgba(0,0,0,0.35)] lg:absolute lg:left-4 lg:top-4 lg:z-10 lg:max-h-[calc(100%-2rem)] lg:w-[380px] lg:rounded-2xl lg:border lg:shadow-md"
      >
        <RidePanel
          phase={rt.phase}
          tracker={tracker}
          now={rt.now}
          lastFix={rt.lastFix}
          problem={rt.problem}
          signalWarning={rt.signalWarning}
          gapNotice={rt.gapNotice}
          wakeLockOn={rt.wakeLockOn}
          interrupted={rt.interrupted}
          garage={state.garage}
          savedRide={savedRide}
          selectedRide={selectedRide && !inRide ? selectedRide : null}
          onStart={start}
          onCancel={rt.cancel}
          onPause={rt.pause}
          onResume={rt.resume}
          onRequestEnd={() => setConfirm({ kind: "end" })}
          onRequestDiscard={() => setConfirm({ kind: "discard" })}
          onSave={save}
          onShare={share}
          onDone={() => setSavedId(null)}
          onManual={(prefill) => setManual(prefill ?? {})}
          onClearSelection={() => setSelectedId(null)}
          onResumeInterrupted={() => {
            setFollow(true);
            rt.resumeInterrupted();
          }}
          onFinishInterrupted={rt.finishInterrupted}
          onDiscardInterrupted={() => setConfirm({ kind: "discard" })}
          onDismissProblem={rt.dismissProblem}
          onDismissSignalWarning={rt.dismissSignalWarning}
          onDismissGap={rt.dismissGapNotice}
        />
      </section>

      <ManualRideDialog
        open={manual !== null}
        onClose={() => setManual(null)}
        garage={state.garage}
        prefill={manual}
        onSaved={(id) => {
          setManual(null);
          if (tracker && rt.phase === "ended") rt.reset();
          setSelectedId(null);
          setSavedId(id);
          toast("Ride saved on this device");
        }}
      />

      <ConfirmDialog
        open={confirm?.kind === "end"}
        title="End this ride?"
        confirmLabel="End ride"
        onConfirm={rt.end}
        onClose={() => setConfirm(null)}
      >
        GPS tracking will stop and you&apos;ll see a summary. You can save or discard it there.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm?.kind === "discard"}
        title="Discard this ride?"
        confirmLabel="Discard"
        danger
        onConfirm={() => {
          if (rt.interrupted && !tracker) rt.discardInterrupted();
          else rt.reset();
          toast("Ride discarded", "info");
        }}
        onClose={() => setConfirm(null)}
      >
        The recorded route and stats will be deleted from this device. This can&apos;t be undone.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm?.kind === "delete"}
        title="Delete ride?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirm?.kind !== "delete") return;
          deleteRide(confirm.ride.id);
          if (selectedId === confirm.ride.id) setSelectedId(null);
          if (savedId === confirm.ride.id) setSavedId(null);
          toast("Ride deleted", "info");
        }}
        onClose={() => setConfirm(null)}
      >
        {confirm?.kind === "delete" && (
          <>
            &ldquo;{confirm.ride.title}&rdquo; will be removed from this device.
            {confirm.ride.sharedPostId && " The post you shared stays in the feed; you can delete it there."}
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
