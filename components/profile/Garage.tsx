"use client";

import { useState } from "react";
import { Bike, Pencil, Plus, Star, Trash } from "lucide-react";
import { bikeInfo, ccLabel, type BikeRef } from "@/lib/bikes";
import type { GarageBike } from "@/lib/model";
import { addBike, removeBike, setPrimaryBike, updateBike, useStore } from "@/lib/store";
import { BikePicker } from "../BikePicker";
import { Button, Card, Chip, Dialog, EmptyState, ErrorMessage, Field, IconButton, inputClass, toast } from "../ui";

export function Garage() {
  const { state } = useStore();
  const [editing, setEditing] = useState<GarageBike | "new" | null>(null);
  const [removing, setRemoving] = useState<GarageBike | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{state.garage.length ? `${state.garage.length} bike${state.garage.length > 1 ? "s" : ""}` : ""}</p>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Add bike
        </Button>
      </div>

      {state.garage.length === 0 ? (
        <EmptyState icon={<Bike className="h-8 w-8" />} title="No bikes yet" body="Add the bikes you ride. Search by make, model or engine size." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.garage.map((g) => {
            const info = bikeInfo(g.bike);
            return (
              <li key={g.id}>
                <Card className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{info.make}</p>
                      <p className="font-display text-2xl font-bold uppercase leading-tight">{info.model}</p>
                      {g.nickname && <p className="text-sm text-ink-2">&ldquo;{g.nickname}&rdquo;</p>}
                    </div>
                    {g.primary && (
                      <Chip tone="accent">
                        <Star className="h-3.5 w-3.5 fill-current" /> Main bike
                      </Chip>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Chip>{info.type}</Chip>
                    <Chip>{ccLabel(info.cc)}</Chip>
                    {g.year && <Chip>{g.year}</Chip>}
                    {info.custom && <Chip>Entered by you</Chip>}
                  </div>
                  <div className="mt-auto flex items-center gap-1 pt-3">
                    {!g.primary && (
                      <Button variant="ghost" size="sm" onClick={() => (setPrimaryBike(g.id), toast(`${info.label} is now your main bike`))}>
                        <Star className="h-4 w-4" /> Make main
                      </Button>
                    )}
                    <span className="ml-auto" />
                    <IconButton label={`Edit ${info.label}`} onClick={() => setEditing(g)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Remove ${info.label}`} onClick={() => setRemoving(g)}>
                      <Trash className="h-4 w-4" />
                    </IconButton>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add a bike" : "Edit bike"}>
        {editing !== null && <BikeForm existing={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
      </Dialog>

      <Dialog open={!!removing} onClose={() => setRemoving(null)} title="Remove bike?">
        {removing && (
          <>
            <p className="text-sm text-ink-2">Remove {bikeInfo(removing.bike).label} from your garage? Past posts keep their bike tag.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                Cancel
              </Button>
              <Button
                variant="dark"
                onClick={() => {
                  removeBike(removing.id);
                  setRemoving(null);
                  toast("Bike removed");
                }}
              >
                Remove
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function BikeForm({ existing, onDone }: { existing: GarageBike | null; onDone: () => void }) {
  const [bike, setBike] = useState<BikeRef | null>(existing?.bike ?? null);
  const [year, setYear] = useState(existing?.year ? String(existing.year) : "");
  const [nickname, setNickname] = useState(existing?.nickname ?? "");
  const [primary, setPrimary] = useState(existing?.primary ?? false);
  const [error, setError] = useState("");
  const thisYear = new Date().getFullYear();

  function save() {
    if (!bike) return setError("Choose a bike from the list, or add yours as a custom bike.");
    const y = year ? Number(year) : null;
    if (y !== null && (y < 1950 || y > thisYear + 1)) return setError(`Year should be between 1950 and ${thisYear + 1}, or left blank.`);
    if (nickname.length > 30) return setError("Nicknames can be up to 30 characters.");
    if (existing) {
      updateBike(existing.id, { bike, year: y, nickname: nickname.trim() });
      if (primary && !existing.primary) setPrimaryBike(existing.id);
      toast("Bike updated");
    } else {
      addBike({ bike, year: y, nickname: nickname.trim() }, primary);
      toast("Bike added to your garage");
    }
    onDone();
  }

  return (
    <div className="space-y-4">
      <BikePicker value={bike} onChange={setBike} label="Bike" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Year (optional)" htmlFor="g-year">
          <input id="g-year" inputMode="numeric" className={inputClass} value={year} maxLength={4} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} placeholder={String(thisYear)} />
        </Field>
        <Field label="Nickname (optional)" htmlFor="g-nick">
          <input id="g-nick" className={inputClass} value={nickname} maxLength={30} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. The Beast" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
        This is my main bike
      </label>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={save}>{existing ? "Save" : "Add bike"}</Button>
      </div>
    </div>
  );
}
