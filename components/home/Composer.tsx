"use client";

import { useState } from "react";
import { ImagePlus, Lock, X } from "lucide-react";
import { AREAS, type Area } from "@/lib/constants";
import { bikeInfo, type BikeRef } from "@/lib/bikes";
import { formatMinutes } from "@/lib/geo";
import { compressImage } from "@/lib/image";
import { POST_KINDS, type PostKind, type RideStats } from "@/lib/model";
import { createPost, editPost, updateRide, useStore } from "@/lib/store";
import { RoutePreview } from "../RoutePreview";
import { closeComposer, useComposer, type ComposerPreset } from "../shell/composer-state";
import { Avatar, Button, ChoicePills, Dialog, ErrorMessage, Field, inputClass, toast } from "../ui";

const MAX_TEXT = 1000;

export function ComposerDialog() {
  const { open, preset } = useComposer();
  return (
    <Dialog open={open} onClose={closeComposer} title={preset.editing ? "Edit post" : "New post"} wide>
      {/* Re-mount the form for each opening so it starts from the preset. */}
      {open && <ComposerForm key={preset.editing?.id ?? preset.ride?.rideId ?? "new"} preset={preset} />}
    </Dialog>
  );
}

function ComposerForm({ preset }: { preset: ComposerPreset }) {
  const { state } = useStore();
  const editing = preset.editing;
  const me = state.me!;

  const [kind, setKind] = useState<PostKind>(editing?.kind ?? preset.kind ?? "journey");
  const [text, setText] = useState(editing?.text ?? preset.text ?? "");
  const [image, setImage] = useState<string | null>(editing?.image ?? null);
  const [bike, setBike] = useState<BikeRef | null>(
    editing?.bike ?? state.garage.find((b) => b.primary)?.bike ?? null,
  );
  // Ride stats from a tracked ride are fixed; manual stats can be typed in.
  const trackedRide = editing?.ride?.rideId ? editing.ride : preset.ride ?? null;
  const [distance, setDistance] = useState(editing?.ride && !editing.ride.rideId ? String(editing.ride.distanceKm) : "");
  const [duration, setDuration] = useState(editing?.ride && !editing.ride.rideId ? String(editing.ride.durationMin) : "");
  const [when, setWhen] = useState(editing?.plan?.when ?? "");
  const [area, setArea] = useState<Area | "">(editing?.plan?.area ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      setImage(await compressImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't add that photo.");
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    setError("");
    const body = text.trim();
    if (!body) return setError("Write something to share, even a line or two.");
    if (body.length > MAX_TEXT) return setError(`Please keep posts under ${MAX_TEXT} characters.`);

    let ride: RideStats | null = null;
    if (kind === "ride") {
      if (trackedRide) ride = trackedRide;
      else if (distance || duration) {
        const km = Number(distance);
        const min = Number(duration);
        if (!(km > 0 && km < 5000)) return setError("Distance should be a number of kilometres, e.g. 42.5.");
        if (!(min > 0 && min < 6000)) return setError("Duration should be a number of minutes, e.g. 75.");
        ride = { distanceKm: Math.round(km * 10) / 10, durationMin: Math.round(min), route: null, rideId: null };
      }
    }
    let plan = null;
    if (kind === "group-ride") {
      if (!when.trim()) return setError("Say roughly when the ride is, e.g. \"Sunday morning\".");
      plan = { when: when.trim().slice(0, 60), area: area || null };
    }

    if (editing) {
      editPost(editing.id, { text: body, image, kind, bike, plan });
      toast("Post updated");
    } else {
      const id = createPost({ kind, text: body, image, bike, ride, plan });
      if (ride?.rideId) updateRide(ride.rideId, { sharedPostId: id });
      toast("Posted to your feed");
    }
    closeComposer();
  }

  const garage = state.garage;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Avatar name={me.displayName} src={me.avatar} seed="me" size={44} />
        <div className="min-w-0 flex-1">
          <label htmlFor="composer-text" className="sr-only">
            Post text
          </label>
          <textarea
            id="composer-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={MAX_TEXT + 50}
            placeholder={POST_KINDS.find((k) => k.id === kind)?.hint + "…"}
            className="w-full resize-y rounded-xl border border-line-strong bg-surface p-3.5 text-base leading-relaxed focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <p className={`mt-1 text-right text-xs ${text.length > MAX_TEXT ? "text-danger" : "text-muted"}`}>
            {text.length}/{MAX_TEXT}
          </p>
        </div>
      </div>

      <Field label="What's this about?">
        <ChoicePills label="Post type" options={POST_KINDS} value={kind} onChange={setKind} />
      </Field>

      {kind === "ride" &&
        (trackedRide ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <RoutePreview route={trackedRide.route} className="h-40 w-full" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-sm">
              <span>
                <strong>{trackedRide.distanceKm.toFixed(1)} km</strong> distance
              </span>
              <span>
                <strong>{formatMinutes(trackedRide.durationMin)}</strong> riding
              </span>
              <span className="flex items-center gap-1 text-xs text-muted">
                <Lock className="h-3.5 w-3.5" /> Start and end of the route are hidden for privacy
              </span>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Distance (km, optional)" htmlFor="c-dist" hint="Entered by you, not GPS-tracked.">
              <input id="c-dist" inputMode="decimal" className={inputClass} value={distance} onChange={(e) => setDistance(e.target.value.replace(/[^\d.]/g, ""))} placeholder="e.g. 42.5" />
            </Field>
            <Field label="Duration (minutes, optional)" htmlFor="c-dur">
              <input id="c-dur" inputMode="numeric" className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 75" />
            </Field>
          </div>
        ))}

      {kind === "group-ride" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="When" htmlFor="c-when" hint="Keep it general. Agree exact times in chat.">
            <input id="c-when" className={inputClass} value={when} maxLength={60} onChange={(e) => setWhen(e.target.value)} placeholder="e.g. Sunday morning" />
          </Field>
          <Field label="Rough area (optional)" htmlFor="c-area">
            <select id="c-area" className={inputClass} value={area} onChange={(e) => setArea(e.target.value as Area | "")}>
              <option value="">Not specified</option>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bike (optional)" htmlFor="c-bike" hint={garage.length ? undefined : "Add bikes on your Profile to tag them here."}>
          <select
            id="c-bike"
            className={inputClass}
            value={bike ? garage.findIndex((g) => JSON.stringify(g.bike) === JSON.stringify(bike)) : -1}
            onChange={(e) => {
              const i = Number(e.target.value);
              setBike(i >= 0 ? garage[i].bike : null);
            }}
          >
            <option value={-1}>No bike</option>
            {garage.map((g, i) => (
              <option key={g.id} value={i}>
                {g.nickname ? `${g.nickname} (${bikeInfo(g.bike).label})` : bikeInfo(g.bike).label}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Photo (optional)</p>
          {image ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Selected photo" className="h-28 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove photo"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-sm font-semibold text-ink-2 hover:bg-surface-2">
              <ImagePlus className="h-4 w-4" /> Add a photo
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickImage(e.target.files?.[0])} />
            </label>
          )}
        </div>
      </div>

      <ErrorMessage>{error}</ErrorMessage>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">Visible in your feed on this device (prototype: not shared with others).</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={closeComposer}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            {editing ? "Save changes" : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}
