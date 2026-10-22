"use client";

import { useState } from "react";
import { MessageCircle, Route, Users } from "lucide-react";
import { AREAS, GENDERS, LEVELS, SLOTS, type Area, type Gender, type Level, type SlotId } from "@/lib/constants";
import type { BikeRef } from "@/lib/bikes";
import { addBike, saveMe } from "@/lib/store";
import { looksLikeText } from "@/lib/text";
import { BikePicker } from "../BikePicker";
import { BrandMark, TAGLINE, Wordmark } from "../Brand";
import { ThemeButton } from "../ThemeToggle";
import { Button, ChoicePills, ErrorMessage, Field, inputClass, Notice } from "../ui";

const LEVEL_OPTIONS = LEVELS.map((l) => ({ id: l, label: l }));
const SLOT_OPTIONS = SLOTS.map((s) => ({ id: s.id, label: s.label }));

function toUsername(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
}

// Prototype "sign-up": creates a rider profile saved on this device only.
// There is deliberately no password field, because there is no real account.
export function Welcome() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [level, setLevel] = useState<Level | null>(null);
  const [area, setArea] = useState<Area | "">("");
  const [availability, setAvailability] = useState<SlotId[]>([]);
  const [gender, setGender] = useState<Gender | "">("");
  const [bike, setBike] = useState<BikeRef | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handle = usernameTouched ? username : toUsername(name);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!looksLikeText(name, 2, 40)) next.name = "Please enter your first name or a nickname (2–40 letters).";
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) next.username = "3–20 lowercase letters, numbers or underscores.";
    if (!level) next.level = "Please choose your riding level.";
    if (availability.length === 0) next.availability = "Pick at least one time you usually ride.";
    setErrors(next);
    if (Object.keys(next).length) return;

    saveMe({
      displayName: name.trim(),
      username: handle,
      bio: "",
      region: area || null,
      level: level!,
      style: null,
      quizAnswers: null,
      gender: gender || null,
      showGender: false,
      availability,
      avatar: null,
      createdAt: Date.now(),
    });
    if (bike) addBike({ bike, year: null, nickname: "" }, true);
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_minmax(0,560px)]">
      {/* Brand panel */}
      <section className="relative overflow-hidden bg-asphalt px-6 py-10 text-on-asphalt sm:px-10 lg:flex lg:flex-col lg:justify-between lg:py-14">
        <RoadArt />
        <div className="relative flex items-center gap-3">
          <BrandMark size={40} />
          <Wordmark className="!text-on-asphalt [&>span]:!text-accent" />
        </div>
        <div className="relative mt-10 max-w-lg lg:mt-0">
          <h1 className="font-display text-5xl font-extrabold uppercase italic leading-[0.95] sm:text-6xl">{TAGLINE}</h1>
          <p className="mt-4 text-lg text-on-asphalt-muted">
            A community for motorcycle riders: find compatible riding buddies, share your rides and bikes, chat with
            groups, and track your journeys.
          </p>
          <ul className="mt-8 space-y-3 text-on-asphalt">
            <li className="flex items-center gap-3"><Users className="h-5 w-5 text-accent" /> Matched by riding style, pace and free time</li>
            <li className="flex items-center gap-3"><Route className="h-5 w-5 text-accent" /> Track rides and share them when you choose</li>
            <li className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-accent" /> Groups for every kind of rider</li>
          </ul>
        </div>
        <p className="relative mt-10 text-xs text-on-asphalt-muted lg:mt-0">Bengaluru · Prototype</p>
      </section>

      {/* Sign-up form */}
      <section className="relative bg-bg px-5 py-8 sm:px-10 lg:overflow-y-auto lg:py-14">
        <ThemeButton className="absolute right-3 top-3" />
        <form onSubmit={submit} noValidate className="mx-auto max-w-md space-y-6">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase">Create your rider profile</h2>
            <p className="mt-1 text-sm text-muted">Takes about a minute. You can change everything later.</p>
          </div>

          <Notice>
            <strong>This is a prototype, not a real account.</strong> There&apos;s no password: your profile is saved only in
            this browser on this device, and nothing is shared with other people.
          </Notice>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name or nickname" htmlFor="w-name" error={errors.name}>
              <input id="w-name" className={inputClass} value={name} maxLength={40} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Username" htmlFor="w-user" error={errors.username}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">@</span>
                <input
                  id="w-user"
                  className={`${inputClass} pl-8`}
                  value={handle}
                  maxLength={20}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                  }}
                />
              </div>
            </Field>
          </div>

          <Field label="Riding experience" error={errors.level}>
            <ChoicePills label="Riding experience" options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
          </Field>

          <Field label="When do you usually ride?" error={errors.availability}>
            <ChoicePills
              label="When do you usually ride?"
              multiple
              options={SLOT_OPTIONS}
              value={availability}
              onChange={(id) => setAvailability((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))}
            />
          </Field>

          <Field label="Rough area (optional)" htmlFor="w-area" hint="Only an approximate area. We never ask for your exact address.">
            <select id="w-area" className={inputClass} value={area} onChange={(e) => setArea(e.target.value as Area | "")}>
              <option value="">Prefer not to say</option>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>

          <BikePicker value={bike} onChange={setBike} label="Your main bike (optional)" />

          <Field
            label="Gender (optional)"
            htmlFor="w-gender"
            hint="Only used if you choose the 'women riders only' match filter. Hidden on your profile unless you turn it on."
          >
            <select id="w-gender" className={inputClass} value={gender} onChange={(e) => setGender(e.target.value as Gender | "")}>
              <option value="">Prefer not to say</option>
              {GENDERS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>

          {Object.keys(errors).length > 0 && <ErrorMessage>Please fix the highlighted fields.</ErrorMessage>}

          <Button type="submit" size="lg" className="w-full">
            Start riding with Ride Buddy
          </Button>
        </form>
      </section>
    </div>
  );
}

// Decorative contour lines and a winding road, drawn in code (no stock images).
function RoadArt() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-60" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M-50 ${120 + i * 70} C 120 ${60 + i * 70}, 260 ${200 + i * 70}, 420 ${110 + i * 70} S 680 ${170 + i * 70}, 700 ${140 + i * 70}`}
          fill="none"
          stroke="#343a41"
          strokeWidth="1.2"
        />
      ))}
      <path d="M520 820 C 460 640, 260 640, 300 470 S 520 260, 420 -20" fill="none" stroke="#22262b" strokeWidth="46" strokeLinecap="round" />
      <path d="M520 820 C 460 640, 260 640, 300 470 S 520 260, 420 -20" fill="none" stroke="#f5a400" strokeWidth="3" strokeDasharray="18 16" strokeLinecap="round" />
    </svg>
  );
}
