"use client";

import { useState } from "react";
import { AREAS, BIKE_TYPES, LEVELS, SLOTS, type SlotId } from "@/lib/constants";
import { BIKES, findBrand, findModel, OTHER_MODEL } from "@/lib/bikes";
import { profileSchema, type Profile } from "@/lib/profile";
import { Button, Card, ErrorMessage, FieldError, inputClass, postJson } from "./ui";

export type ProfileBasics = Pick<Profile, "name" | "level" | "bike" | "area" | "availability">;

// Same checks as the server, minus the quiz (that comes next).
const basicsSchema = profileSchema.pick({ name: true, level: true, bike: true, area: true, availability: true });

const LEVEL_HINTS: Record<string, string> = {
  Beginner: "Under 2 years, still building confidence",
  Intermediate: "Comfortable on highways and in traffic",
  Advanced: "Years of riding, long trips, all conditions",
};

type Draft = {
  name: string;
  level: string;
  brand: string;
  modelId: string;
  customModel: string;
  customType: string;
  area: string;
  availability: SlotId[];
};

function toDraft(p?: ProfileBasics): Draft {
  return {
    name: p?.name ?? "",
    level: p?.level ?? "",
    brand: p?.bike.brand ?? "",
    modelId: p?.bike.modelId ?? "",
    customModel: p?.bike.customModel ?? "",
    customType: p?.bike.customType ?? "",
    area: p?.area ?? "",
    availability: p?.availability ?? [],
  };
}

export function ProfileForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: ProfileBasics;
  onDone: (basics: ProfileBasics) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [checking, setChecking] = useState(false);

  // Changing a field clears its error message straight away.
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    const errorKey = ["brand", "modelId", "customModel", "customType"].includes(key) ? `bike.${key}` : key;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  };
  const brand = findBrand(draft.brand);
  const isOther = draft.modelId === OTHER_MODEL;
  const autoType = !isOther && draft.modelId ? findModel(draft.modelId)?.type : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const candidate = {
      name: draft.name,
      level: draft.level || undefined,
      bike: {
        brand: draft.brand,
        modelId: draft.modelId,
        ...(isOther ? { customModel: draft.customModel, customType: draft.customType || undefined } : {}),
      },
      area: draft.area || undefined,
      availability: draft.availability,
    };

    const result = basicsSchema.safeParse(candidate);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[issue.path.map(String).join(".")] ??= issue.message;
      setErrors(next);
      setFormError("A few details are missing. Please check the highlighted fields.");
      return;
    }
    setErrors({});

    if (isOther) {
      setChecking(true);
      const check = await postJson("/api/check-bike", { brand: draft.brand, model: draft.customModel });
      setChecking(false);
      if (!check.ok) {
        setErrors({ "bike.customModel": check.error });
        return;
      }
    }

    onDone(result.data);
  }

  const toggleSlot = (id: SlotId) =>
    set("availability", draft.availability.includes(id) ? draft.availability.filter((s) => s !== id) : [...draft.availability, id]);

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">{initial ? "Edit your rider profile" : "Create your rider profile"}</h2>
          <p className="mt-1 text-sm text-muted">Saved on this device only. No sign-up needed.</p>
        </div>

        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">First name or nickname</label>
          <input
            id="name"
            className={inputClass}
            value={draft.name}
            maxLength={40}
            autoComplete="given-name"
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Asha"
          />
          <FieldError message={errors["name"]} />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">What kind of rider are you?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {LEVELS.map((level) => (
              <label
                key={level}
                className={`cursor-pointer rounded-xl border p-3 transition-colors ${draft.level === level ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-muted"}`}
              >
                <input
                  type="radio"
                  name="level"
                  value={level}
                  className="sr-only"
                  checked={draft.level === level}
                  onChange={() => set("level", level)}
                />
                <span className="block font-semibold">{level}</span>
                <span className="block text-xs text-muted">{LEVEL_HINTS[level]}</span>
              </label>
            ))}
          </div>
          <FieldError message={errors["level"]} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold">Your bike</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="brand" className="mb-1 block text-xs text-muted">Brand</label>
              <select
                id="brand"
                className={inputClass}
                value={draft.brand}
                onChange={(e) => {
                  set("brand", e.target.value);
                  setDraft((d) => ({ ...d, modelId: "", customModel: "", customType: "" }));
                }}
              >
                <option value="">Choose a brand…</option>
                {BIKES.map((b) => (
                  <option key={b.brand} value={b.brand}>{b.brand}</option>
                ))}
              </select>
              <FieldError message={errors["bike.brand"]} />
            </div>
            <div>
              <label htmlFor="model" className="mb-1 block text-xs text-muted">Model</label>
              <select
                id="model"
                className={inputClass}
                value={draft.modelId}
                disabled={!brand}
                onChange={(e) => set("modelId", e.target.value)}
              >
                <option value="">{brand ? "Choose a model…" : "Choose a brand first"}</option>
                {brand?.models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
                {brand && <option value={OTHER_MODEL}>Other / not listed</option>}
              </select>
              <FieldError message={errors["bike.modelId"]} />
            </div>
          </div>

          {autoType && (
            <p className="text-sm text-muted">
              Bike type: <span className="font-semibold text-foreground">{autoType}</span>
            </p>
          )}

          {isOther && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="customModel" className="mb-1 block text-xs text-muted">Type your model</label>
                <input
                  id="customModel"
                  className={inputClass}
                  value={draft.customModel}
                  maxLength={40}
                  onChange={(e) => set("customModel", e.target.value)}
                  placeholder="e.g. CB200X"
                />
                <FieldError message={errors["bike.customModel"]} />
              </div>
              <div>
                <label htmlFor="customType" className="mb-1 block text-xs text-muted">Bike type</label>
                <select
                  id="customType"
                  className={inputClass}
                  value={draft.customType}
                  onChange={(e) => set("customType", e.target.value)}
                >
                  <option value="">Choose a type…</option>
                  {BIKE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <FieldError message={errors["bike.customType"]} />
              </div>
            </div>
          )}
        </fieldset>

        <div>
          <label htmlFor="area" className="mb-1.5 block text-sm font-semibold">Where in Bengaluru do you ride from?</label>
          <select id="area" className={inputClass} value={draft.area} onChange={(e) => set("area", e.target.value)}>
            <option value="">Choose your area…</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <FieldError message={errors["area"]} />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">When are you usually free to ride?</legend>
          <div className="grid grid-cols-2 gap-2">
            {SLOTS.map((slot) => {
              const on = draft.availability.includes(slot.id);
              return (
                <label
                  key={slot.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm transition-colors ${on ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-muted"}`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggleSlot(slot.id)} className="accent-[var(--accent)]" />
                  {slot.label}
                </label>
              );
            })}
          </div>
          <FieldError message={errors["availability"]} />
        </fieldset>

        <ErrorMessage>{formError}</ErrorMessage>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          )}
          <Button type="submit" loading={checking}>
            {checking ? "Checking your bike…" : initial ? "Save changes" : "Next: riding character quiz"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
