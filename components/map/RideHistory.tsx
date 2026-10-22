"use client";

import { useEffect, useRef } from "react";
import { PenLine, Plus, Route, Share2, Trash, X } from "lucide-react";
import { avgSpeedKmh, formatDuration, formatKm } from "@/lib/geo";
import type { GarageBike, Ride } from "@/lib/model";
import { RoutePreview } from "../RoutePreview";
import { bikeLabel, formatClock, formatDate, formatSpeed, rideRoute } from "./ride-utils";

export function RideHistory({
  rides,
  garage,
  selectedId,
  onSelect,
  onShare,
  onDelete,
  onAddManual,
  onClose,
}: {
  rides: Ride[];
  garage: GarageBike[];
  selectedId: string | null;
  onSelect: (ride: Ride) => void;
  onShare: (ride: Ride) => void;
  onDelete: (ride: Ride) => void;
  onAddManual: () => void;
  onClose: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const sorted = [...rides].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <aside
      aria-labelledby="ride-history-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="absolute inset-0 z-20 flex flex-col bg-asphalt text-on-asphalt lg:inset-y-4 lg:left-auto lg:right-4 lg:w-[400px] lg:rounded-2xl lg:shadow-md lg:ring-1 lg:ring-asphalt-line"
    >
      <div className="flex items-center justify-between gap-2 border-b border-asphalt-line px-4 py-3">
        <h2 id="ride-history-title" ref={headingRef} tabIndex={-1} className="font-display text-xl font-bold uppercase tracking-wide outline-none">
          Your rides <span className="text-base text-on-asphalt-muted">({rides.length})</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close your rides"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-asphalt-2"
        >
          <X aria-hidden className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {sorted.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-asphalt-line px-6 py-10 text-center">
            <Route aria-hidden className="mb-3 h-8 w-8 text-on-asphalt-muted" />
            <p className="font-semibold">No rides yet</p>
            <p className="mt-1 max-w-xs text-sm text-on-asphalt-muted">
              Track a ride with GPS, or add one you&apos;ve already done. Rides are private to you.
            </p>
            <button
              type="button"
              onClick={onAddManual}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-asphalt-line px-4 text-sm font-semibold hover:bg-asphalt-2"
            >
              <Plus aria-hidden className="h-4 w-4" /> Add a ride manually
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((ride) => {
              const bike = ride.bikeId ? garage.find((b) => b.id === ride.bikeId) : undefined;
              const speed = avgSpeedKmh(ride.distanceM, ride.movingSec);
              const gps = ride.source === "gps";
              const selected = ride.id === selectedId;
              const RowTag = gps ? "button" : "div";
              return (
                <li key={ride.id} className={`rounded-xl bg-asphalt-2 ring-1 ${selected ? "ring-accent" : "ring-asphalt-line"}`}>
                  <RowTag
                    {...(gps
                      ? { type: "button" as const, onClick: () => onSelect(ride), "aria-pressed": selected, title: "Show route on map" }
                      : {})}
                    className={`flex w-full items-start gap-3 rounded-t-xl p-3 text-left ${gps ? "hover:bg-asphalt-line/40" : ""}`}
                  >
                    {gps && ride.points.length >= 2 ? (
                      <RoutePreview route={rideRoute(ride)} className="h-14 w-14 shrink-0 rounded-lg" />
                    ) : (
                      <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-asphalt text-on-asphalt-muted">
                        <PenLine className="h-5 w-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{ride.title}</span>
                      <span className="block text-xs text-on-asphalt-muted">
                        {formatDate(ride.startedAt)}
                        {gps && ` · ${formatClock(ride.startedAt)}`}
                      </span>
                      <span className="mt-1 block text-sm tabular-nums">
                        {formatKm(ride.distanceM)} · {formatDuration(ride.movingSec)}
                        {speed !== null && ` · ${formatSpeed(speed)} km/h`}
                      </span>
                      {bike && <span className="block truncate text-xs text-on-asphalt-muted">{bikeLabel(bike)}</span>}
                    </span>
                  </RowTag>
                  <div className="flex flex-wrap items-center gap-2 border-t border-asphalt-line px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${gps ? "bg-accent text-on-accent" : "bg-asphalt-line text-on-asphalt"}`}
                    >
                      {gps ? "GPS" : "Entered manually"}
                    </span>
                    {ride.sharedPostId && (
                      <span className="rounded-full bg-success/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#8fe0b0]">
                        Shared
                      </span>
                    )}
                    <span className="ml-auto flex gap-1">
                      {!ride.sharedPostId && (
                        <button
                          type="button"
                          onClick={() => onShare(ride)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-accent hover:bg-asphalt-line"
                        >
                          <Share2 aria-hidden className="h-4 w-4" /> Share
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDelete(ride)}
                        aria-label={`Delete ${ride.title}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#ff8a80] hover:bg-asphalt-line"
                      >
                        <Trash aria-hidden className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {sorted.length > 0 && (
        <div className="border-t border-asphalt-line p-3">
          <button
            type="button"
            onClick={onAddManual}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-asphalt-line text-sm font-semibold hover:bg-asphalt-2"
          >
            <Plus aria-hidden className="h-4 w-4" /> Add a ride manually
          </button>
        </div>
      )}
    </aside>
  );
}
