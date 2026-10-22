"use client";

import { useState, type FormEvent } from "react";
import type { GarageBike } from "@/lib/model";
import { saveRide } from "@/lib/store";
import { Button, Dialog, ErrorMessage, Field, inputClass, Notice } from "../ui";
import { bikeLabel } from "./ride-utils";

export type ManualPrefill = { date?: number; durationMin?: number; title?: string };

function isoDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ManualRideDialog({
  open,
  onClose,
  garage,
  prefill,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  garage: GarageBike[];
  prefill: ManualPrefill | null;
  onSaved: (id: string) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Add a ride manually">
      {open && <ManualRideForm garage={garage} prefill={prefill} onCancel={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function ManualRideForm({
  garage,
  prefill,
  onCancel,
  onSaved,
}: {
  garage: GarageBike[];
  prefill: ManualPrefill | null;
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const [today] = useState(() => isoDate(Date.now()));
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [date, setDate] = useState(() => isoDate(prefill?.date ?? Date.now()));
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState(prefill?.durationMin ? String(prefill.durationMin) : "");
  const [bikeId, setBikeId] = useState(garage.find((b) => b.primary)?.id ?? "");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const km = Number(distance.replace(",", "."));
    const min = Number(duration);
    if (!title.trim()) errs.title = "Give the ride a name.";
    if (!date) errs.date = "Pick the date of the ride.";
    else if (date > today) errs.date = "The date can't be in the future.";
    if (!distance.trim() || !Number.isFinite(km) || km < 0.1 || km > 2000) errs.distance = "Enter a distance between 0.1 and 2000 km.";
    if (!duration.trim() || !Number.isInteger(min) || min < 1 || min > 2880) errs.duration = "Enter whole minutes between 1 and 2880.";
    if (!errs.distance && !errs.duration && km / (min / 60) > 250) errs.duration = "That's faster than 250 km/h on average. Check the numbers.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    // Only the date is known; noon is a neutral placeholder and the time is never shown for manual rides.
    const [y, m, d] = date.split("-").map(Number);
    const startedAt = new Date(y, m - 1, d, 12, 0, 0).getTime();
    const id = saveRide({
      title: title.trim(),
      startedAt,
      endedAt: startedAt + min * 60_000,
      movingSec: min * 60,
      distanceM: Math.round(km * 1000),
      points: [],
      source: "manual",
      bikeId: bikeId || null,
      notes: notes.trim(),
    });
    onSaved(id);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Notice>Manual rides are labelled &ldquo;Entered manually&rdquo; and have no route on the map.</Notice>
      <Field label="Title" htmlFor="mr-title" error={errors.title}>
        <input id="mr-title" className={inputClass} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Sunday loop to Nandi Hills" />
      </Field>
      <Field label="Date" htmlFor="mr-date" error={errors.date}>
        <input id="mr-date" type="date" className={inputClass} value={date} max={today} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Distance (km)" htmlFor="mr-km" error={errors.distance}>
          <input id="mr-km" inputMode="decimal" className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="42.5" />
        </Field>
        <Field label="Riding time (min)" htmlFor="mr-min" error={errors.duration}>
          <input id="mr-min" inputMode="numeric" className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="75" />
        </Field>
      </div>
      <Field label="Bike (optional)" htmlFor="mr-bike" hint={garage.length ? undefined : "Add bikes to your garage in your profile."}>
        <select id="mr-bike" className={inputClass} value={bikeId} onChange={(e) => setBikeId(e.target.value)} disabled={!garage.length}>
          <option value="">No bike selected</option>
          {garage.map((b) => (
            <option key={b.id} value={b.id}>
              {bikeLabel(b)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes (optional)" htmlFor="mr-notes">
        <textarea id="mr-notes" rows={3} maxLength={500} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {Object.keys(errors).length > 0 && <ErrorMessage>Please fix the highlighted fields.</ErrorMessage>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg">
          Save ride
        </Button>
      </div>
    </form>
  );
}
