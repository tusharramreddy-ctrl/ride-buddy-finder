"use client";

import { useId, useState } from "react";
import { Check, Search } from "lucide-react";
import { BIKE_TYPES, type BikeType } from "@/lib/constants";
import { bikeInfo, ccLabel, searchBikes, type BikeRef } from "@/lib/bikes";
import { looksLikeText } from "@/lib/text";
import { Button, ErrorMessage, Field, inputClass, postJson } from "./ui";

// Searchable picker over the structured bike catalogue (data/bikes.json),
// with a "not listed" path for typing a custom make and model.
export function BikePicker({
  value,
  onChange,
  label = "Your bike",
}: {
  value: BikeRef | null;
  onChange: (bike: BikeRef | null) => void;
  label?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(value?.kind === "custom");
  const [make, setMake] = useState(value?.kind === "custom" ? value.make : "");
  const [model, setModel] = useState(value?.kind === "custom" ? value.model : "");
  const [type, setType] = useState<BikeType | "">(value?.kind === "custom" ? value.type : "");
  const [cc, setCc] = useState(value?.kind === "custom" && value.cc ? String(value.cc) : "");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const results = query.trim() ? searchBikes(query, 12) : [];
  const selected = value ? bikeInfo(value) : null;

  async function saveCustom() {
    setError("");
    const ccNum = cc.trim() ? Number(cc) : null;
    if (!looksLikeText(make, 2, 40)) return setError("Please type the make, for example \"Honda\".");
    if (!model.trim() || model.trim().length > 40) return setError("Please type the model, for example \"CB200X\".");
    if (!type) return setError("Please choose what type of bike it is.");
    if (ccNum !== null && (!Number.isInteger(ccNum) || ccNum < 40 || ccNum > 3000))
      return setError("Engine size should be a whole number between 40 and 3000 cc, or left blank.");
    setChecking(true);
    const check = await postJson("/api/check-bike", { make, model });
    setChecking(false);
    if (!check.ok) return setError(check.error);
    onChange({ kind: "custom", make: make.trim(), model: model.trim(), type, cc: ccNum });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink">{label}</p>

      {selected && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-ink bg-surface px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-semibold">{selected.label}</p>
            <p className="text-xs text-muted">
              {selected.type} · {ccLabel(selected.cc)}
              {selected.custom && " · entered by you"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Change
          </Button>
        </div>
      )}

      {!selected && !custom && (
        <>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id={`${id}-search`}
              aria-label="Search bikes by make, model or engine size"
              className={`${inputClass} pl-9`}
              placeholder="Search: e.g. BMW GS, Classic 350, Duke 390"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          {query.trim() && (
            <ul role="listbox" aria-label="Matching bikes" className="max-h-64 overflow-y-auto rounded-xl border border-line bg-surface">
              {results.length === 0 && <li className="px-3.5 py-3 text-sm text-muted">No bikes match &ldquo;{query}&rdquo;.</li>}
              {results.map(({ make: mk, model: md }) => (
                <li key={md.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ kind: "catalog", modelId: md.id });
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2"
                  >
                    <span>
                      <span className="font-semibold">{mk.name}</span> {md.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {md.type} · {ccLabel(md.cc)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted">
            Model availability varies by country and year.{" "}
            <button type="button" className="font-semibold text-accent-ink underline" onClick={() => setCustom(true)}>
              My bike isn&apos;t listed
            </button>
          </p>
        </>
      )}

      {!selected && custom && (
        <div className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Make" htmlFor={`${id}-make`}>
              <input id={`${id}-make`} className={inputClass} value={make} maxLength={40} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Honda" />
            </Field>
            <Field label="Model" htmlFor={`${id}-model`}>
              <input id={`${id}-model`} className={inputClass} value={model} maxLength={40} onChange={(e) => setModel(e.target.value)} placeholder="e.g. CB200X" />
            </Field>
            <Field label="Type" htmlFor={`${id}-type`}>
              <select id={`${id}-type`} className={inputClass} value={type} onChange={(e) => setType(e.target.value as BikeType)}>
                <option value="">Choose…</option>
                {BIKE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Engine size (cc, optional)" htmlFor={`${id}-cc`}>
              <input id={`${id}-cc`} className={inputClass} inputMode="numeric" value={cc} onChange={(e) => setCc(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 184" />
            </Field>
          </div>
          <ErrorMessage>{error}</ErrorMessage>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={saveCustom} loading={checking}>
              <Check className="h-4 w-4" /> {checking ? "Checking…" : "Use this bike"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCustom(false)}>
              Back to search
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
