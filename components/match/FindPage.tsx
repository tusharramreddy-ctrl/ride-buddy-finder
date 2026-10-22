"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, Copy, MessageCircle, PencilLine, RefreshCw, Sparkles, UserRound } from "lucide-react";
import { AREAS, CHARACTER_IDS, CHARACTERS, GENDERS, LEVELS, SLOTS, slotLabel, type Area, type CharacterId, type Level, type SlotId } from "@/lib/constants";
import type { BikeRef } from "@/lib/bikes";
import { parseMatchPrefs, type MatchPrefs } from "@/lib/prefs";
import { findRider, riderBike } from "@/lib/riders";
import { useStore } from "@/lib/store";
import { BikePicker } from "../BikePicker";
import { Avatar, Button, Card, ChoicePills, DemoBadge, ErrorMessage, Field, inputClass, Notice, postJson, toast } from "../ui";

type Step = "describe" | "review" | "results";
type Suggestion = {
  level: Level | null;
  area: Area | null;
  availability: SlotId[];
  style: CharacterId | null;
  womenOnly: boolean;
  bike: BikeRef | null;
  bikeText: string | null;
};
type MatchResult = { riderId: string; reason: string; reasonSource: "ai" | "code" };

const EXAMPLE =
  "I ride a Royal Enfield Classic 350, about a year of experience, I like relaxed scenic breakfast rides on Sunday mornings, I'm around Jayanagar.";

export function FindPage() {
  const { state } = useStore();
  const me = state.me!;
  const primary = state.garage.find((b) => b.primary)?.bike ?? null;

  const [step, setStep] = useState<Step>("describe");
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [describeError, setDescribeError] = useState("");
  const [fromText, setFromText] = useState<Set<string>>(new Set());
  const [unmatchedBike, setUnmatchedBike] = useState<string | null>(null);

  // Review form, pre-filled from the rider's profile.
  const [level, setLevel] = useState<Level | null>(me.level);
  const [area, setArea] = useState<Area | "">(me.region ?? "");
  const [availability, setAvailability] = useState<SlotId[]>(me.availability);
  const [style, setStyle] = useState<CharacterId | null>(me.style);
  const [bike, setBike] = useState<BikeRef | null>(primary);
  const [womenOnly, setWomenOnly] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [finding, setFinding] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [note, setNote] = useState("");
  const [usedPrefs, setUsedPrefs] = useState<MatchPrefs | null>(null);

  async function readDescription() {
    setDescribeError("");
    if (!text.trim()) {
      setDescribeError("Tell us a bit about how you ride first, or fill in your preferences by hand.");
      return;
    }
    setReading(true);
    const res = await postJson<{ suggestion: Suggestion }>("/api/interpret", { text });
    setReading(false);
    if (!res.ok) {
      setDescribeError(res.error);
      return;
    }
    const s = res.data.suggestion;
    // Only fields the AI actually found replace the profile values.
    const filled = new Set<string>();
    if (s.level) {
      setLevel(s.level);
      filled.add("level");
    }
    if (s.area) {
      setArea(s.area);
      filled.add("area");
    }
    if (s.availability.length) {
      setAvailability(s.availability);
      filled.add("availability");
    }
    if (s.style) {
      setStyle(s.style);
      filled.add("style");
    }
    if (s.bike) {
      setBike(s.bike);
      filled.add("bike");
    }
    if (s.womenOnly) {
      setWomenOnly(true);
      filled.add("womenOnly");
    }
    setUnmatchedBike(!s.bike && s.bikeText ? s.bikeText : null);
    setFromText(filled);
    setStep("review");
  }

  async function findRiders() {
    setMatchError("");
    const candidate = {
      name: me.displayName,
      level,
      bike,
      area: area || undefined,
      availability,
      style: style ?? undefined,
      gender: me.gender,
      womenOnly,
    };
    const parsed = parseMatchPrefs(candidate);
    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      setMatchError("A few details are missing. Please check the highlighted fields.");
      return;
    }
    setFieldErrors({});
    setFinding(true);
    const res = await postJson<{ matches: MatchResult[]; note?: string }>("/api/match", { prefs: parsed.prefs });
    setFinding(false);
    if (!res.ok) {
      setMatchError(res.error);
      return;
    }
    setUsedPrefs(parsed.prefs);
    setResults(res.data.matches.filter((m) => !state.blocked.includes(m.riderId)));
    setNote(res.data.note ?? "");
    setStep("results");
  }

  const tag = (key: string) =>
    fromText.has(key) ? (
      <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-ink">From your description</span>
    ) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>
      <header className="mt-3">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-ink">
          <Sparkles className="h-4 w-4" /> Rider matching
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">Find riding buddies</h1>
        <ol className="mt-4 flex gap-2 text-xs font-semibold text-muted" aria-label="Steps">
          {(["describe", "review", "results"] as Step[]).map((s, i) => (
            <li key={s} aria-current={step === s ? "step" : undefined} className={`flex items-center gap-1.5 ${step === s ? "text-ink" : ""}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === s ? "bg-accent text-on-accent" : "bg-surface-2"}`}>{i + 1}</span>
              {s === "describe" ? "Describe" : s === "review" ? "Review" : "Riders"}
            </li>
          ))}
        </ol>
      </header>

      <div className="mt-6 space-y-5">
        {step === "describe" && (
          <Card className="space-y-4 p-5">
            <Field label="Describe how you ride, in a sentence or two" htmlFor="describe">
              <textarea
                id="describe"
                rows={4}
                maxLength={600}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={EXAMPLE}
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </Field>
            <p className="text-xs text-muted">
              Mention your bike, experience, preferred pace, ride type, when you&apos;re free and roughly where you are. You&apos;ll
              review everything before we search.
            </p>
            <ErrorMessage>{describeError}</ErrorMessage>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={readDescription} loading={reading} size="lg">
                <Sparkles className="h-4 w-4" /> {reading ? "Reading your description…" : "Read my description"}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => (setFromText(new Set()), setStep("review"))}>
                <PencilLine className="h-4 w-4" /> Fill in by hand
              </Button>
            </div>
          </Card>
        )}

        {step === "review" && (
          <Card className="space-y-6 p-5">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase">Check your preferences</h2>
              <p className="text-sm text-muted">
                {fromText.size
                  ? "We filled in what we could from your description; the rest comes from your profile. Correct anything that's off."
                  : "Pre-filled from your profile. Change anything you like."}
              </p>
            </div>

            <Field label="Experience" error={fieldErrors.level}>
              <div className="flex items-center">
                <ChoicePills label="Experience" options={LEVELS.map((l) => ({ id: l, label: l }))} value={level} onChange={setLevel} />
                {tag("level")}
              </div>
            </Field>

            <div>
              <p className="mb-2 text-sm font-semibold">Riding style {tag("style")}</p>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Riding style">
                {CHARACTER_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={style === id}
                    onClick={() => setStyle(id)}
                    className={`rounded-xl border p-3 text-left transition-colors ${style === id ? "border-ink bg-ink text-on-ink" : "border-line-strong hover:border-ink-2"}`}
                  >
                    <span className="block font-semibold">{CHARACTERS[id].name}</span>
                    <span className={`block text-xs ${style === id ? "text-on-ink/75" : "text-muted"}`}>{CHARACTERS[id].blurb}</span>
                  </button>
                ))}
              </div>
              {fieldErrors.style && <p className="mt-1.5 text-sm text-danger">{fieldErrors.style}</p>}
            </div>

            <Field label="When you're free" error={fieldErrors.availability}>
              <ChoicePills
                label="When you're free"
                multiple
                options={SLOTS.map((s) => ({ id: s.id, label: s.label }))}
                value={availability}
                onChange={(id) => setAvailability((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))}
              />
              {tag("availability")}
            </Field>

            <Field label="Where you ride from" htmlFor="f-area" error={fieldErrors.area} hint="Approximate area only. Matches are riders in the same or a neighbouring area.">
              <select id="f-area" className={inputClass} value={area} onChange={(e) => setArea(e.target.value as Area | "")}>
                <option value="">Choose your area…</option>
                {AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              {tag("area")}
            </Field>

            <div>
              <BikePicker value={bike} onChange={setBike} label="Your bike (optional)" />
              {tag("bike")}
              {unmatchedBike && !bike && (
                <p className="mt-1.5 text-xs text-muted">
                  You mentioned &ldquo;{unmatchedBike}&rdquo;, which isn&apos;t in our list. Search for it above or add it as a custom bike.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-line p-4">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--ink)]" />
                <span>
                  <span className="block text-sm font-semibold">Women riders only {tag("womenOnly")}</span>
                  <span className="block text-xs text-muted">
                    Only shows riders who describe themselves as women. Enforced by plain rules, not AI. Some demo riders only want
                    to ride with women, so they only appear if your profile says you&apos;re a woman
                    {me.gender ? ` (yours says: ${GENDERS.find((g) => g.id === me.gender)?.label})` : " (yours doesn't say)"}.
                  </span>
                </span>
              </label>
            </div>

            <ErrorMessage>{matchError}</ErrorMessage>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStep("describe")}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button size="lg" onClick={findRiders} loading={finding}>
                {finding ? "Finding riders…" : "Find 3 riders"}
              </Button>
            </div>
          </Card>
        )}

        {step === "results" && usedPrefs && (
          <Results results={results} note={note} prefs={usedPrefs} onBack={() => setStep("review")} onRetry={findRiders} retrying={finding} />
        )}
      </div>
    </div>
  );
}

function Results({
  results,
  note,
  prefs,
  onBack,
  onRetry,
  retrying,
}: {
  results: MatchResult[];
  note: string;
  prefs: MatchPrefs;
  onBack: () => void;
  onRetry: () => void;
  retrying: boolean;
}) {
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [intro, setIntro] = useState("");
  const [introError, setIntroError] = useState("");
  const introRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  async function draft(riderId: string) {
    setIntroError("");
    setDrafting(riderId);
    const res = await postJson<{ message: string }>("/api/intro", { prefs, riderId });
    setDrafting(null);
    if (!res.ok) return setIntroError(res.error);
    setDraftFor(riderId);
    setIntro(res.data.message);
    requestAnimationFrame(() => introRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(intro);
      toast("Intro copied");
    } catch {
      boxRef.current?.select();
      const ok = (() => {
        try {
          return document.execCommand("copy");
        } catch {
          return false;
        }
      })();
      toast(ok ? "Intro copied" : "Couldn't copy automatically. Select the text and copy it.", ok ? "success" : "error");
    }
  }

  const draftRider = draftFor ? findRider(draftFor) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase">{results.length ? "Riders you might enjoy riding with" : "No matches yet"}</h2>
          {note && <p className="mt-1 text-sm text-muted">{note}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onBack}>
            <PencilLine className="h-4 w-4" /> Edit preferences
          </Button>
          <Button variant="ghost" size="sm" onClick={onRetry} loading={retrying}>
            <RefreshCw className="h-4 w-4" /> Search again
          </Button>
        </div>
      </div>

      <Notice>These are fictional demo riders. Ride Buddy doesn&apos;t verify riders, so always meet in public and ride within your limits.</Notice>

      <div className="grid gap-4 md:grid-cols-3">
        {results.map((m) => {
          const r = findRider(m.riderId);
          if (!r) return null;
          const bike = riderBike(r);
          const selected = draftFor === r.id;
          return (
            <Card key={r.id} className={`flex flex-col p-4 ${selected ? "ring-2 ring-accent" : ""}`}>
              <div className="flex items-start gap-3">
                <Avatar name={r.name} seed={r.id} size={44} />
                <div className="min-w-0">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted">
                    {r.level} · {r.area}
                  </p>
                  <div className="mt-1">
                    <DemoBadge label="Demo profile" />
                  </div>
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2.5 text-sm">
                <span className="font-semibold">Why you match: </span>
                {m.reason}
              </p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-muted">Style</dt>
                  <dd>{CHARACTERS[r.character].name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-muted">Bike</dt>
                  <dd>{bike.label}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-muted">Free</dt>
                  <dd>{r.availability.map(slotLabel).join(", ")}</dd>
                </div>
              </dl>
              <div className="mt-auto flex gap-2 pt-4">
                <Link
                  href={`/riders/${r.id}`}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-line-strong text-sm font-semibold hover:bg-surface-2"
                >
                  <UserRound className="h-4 w-4" /> Profile
                </Link>
                <Button size="sm" className="h-10 flex-1" onClick={() => draft(r.id)} loading={drafting === r.id}>
                  {drafting === r.id ? "Drafting…" : "Draft intro"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <ErrorMessage>{introError}</ErrorMessage>

      {draftRider && (
        <div ref={introRef} className="scroll-mt-4">
          <Card className="p-5">
            <h2 className="font-display text-2xl font-bold uppercase">Your intro to {draftRider.name}</h2>
            <p className="mt-1 text-sm text-muted">Edit it however you like. Nothing is sent until you choose to.</p>
            <label htmlFor="intro" className="sr-only">
              Introduction message
            </label>
            <textarea
              id="intro"
              ref={boxRef}
              rows={8}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              className={`${inputClass} mt-4 resize-y leading-relaxed`}
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button onClick={copy} disabled={!intro.trim()}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Link
                href={`/chat/dm-${draftRider.id}?draft=${encodeURIComponent(intro.slice(0, 1000))}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-2"
              >
                <MessageCircle className="h-4 w-4" /> Open in Chat
              </Link>
              <Button variant="ghost" onClick={() => draft(draftRider.id)} loading={drafting === draftRider.id}>
                <RefreshCw className="h-4 w-4" /> Draft again
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted">
              &ldquo;Open in Chat&rdquo; puts the intro in a message box for you to send. It&apos;s a demo rider, so they can&apos;t reply.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
