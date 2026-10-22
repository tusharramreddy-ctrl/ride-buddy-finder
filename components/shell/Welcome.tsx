"use client";

import { useState, type ReactNode } from "react";
import { Mail, MessageCircle, Route, Users } from "lucide-react";
import { AREAS, GENDERS, LEVELS, SLOTS, type Area, type Gender, type Level, type SlotId } from "@/lib/constants";
import type { BikeRef } from "@/lib/bikes";
import { isCloud } from "@/lib/people";
import {
  addBike,
  deviceDataImported,
  importDeviceData,
  readDeviceData,
  saveMe,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  useStore,
} from "@/lib/store";
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

// Brand panel on the left, form on the right (stacked on mobile).
function AuthLayout({ children }: { children: ReactNode }) {
  const { state } = useStore();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_minmax(0,560px)]">
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
        <p className="relative mt-10 text-xs text-on-asphalt-muted lg:mt-0">Bengaluru{isCloud(state) ? "" : " · Prototype"}</p>
      </section>
      <section className="relative bg-bg px-5 py-8 sm:px-10 lg:overflow-y-auto lg:py-14">
        <ThemeButton className="absolute right-3 top-3" />
        <div className="mx-auto max-w-md">{children}</div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- sign in (cloud)

export function SignIn() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function google() {
    setError("");
    setBusy("google");
    const err = await signInWithGoogle(); // on success the browser leaves for Google
    if (err) {
      setError(err);
      setBusy(null);
    }
  }

  async function emailLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError("Please enter a valid email address.");
    setBusy("email");
    const err = await signInWithEmail(value);
    setBusy(null);
    if (err) setError(err);
    else setSentTo(value);
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase">Sign in to Ride Buddy</h2>
          <p className="mt-1 text-sm text-muted">New here? Signing in creates your account.</p>
        </div>

        <Button size="lg" variant="secondary" className="w-full" onClick={google} loading={busy === "google"}>
          <GoogleIcon /> Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-line" /> or use your email <span className="h-px flex-1 bg-line" />
        </div>

        {sentTo ? (
          <Notice tone="accent">
            <strong>Check your inbox.</strong> We sent a sign-in link to {sentTo}. Open it on this device to continue. It can take a
            minute, so check spam too.{" "}
            <button type="button" className="font-semibold underline" onClick={() => setSentTo(null)}>
              Use a different email
            </button>
          </Notice>
        ) : (
          <form onSubmit={emailLink} noValidate className="space-y-3">
            <Field label="Email" htmlFor="signin-email">
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={busy === "email"}>
              <Mail className="h-4 w-4" /> Email me a sign-in link
            </Button>
          </form>
        )}

        <ErrorMessage>{error}</ErrorMessage>

        <p className="text-xs leading-relaxed text-muted">
          We use your email only to sign you in. Your profile, posts and messages are stored in Ride Buddy&apos;s database.
          Riders marked <strong>Demo</strong> are fictional examples. Ride Buddy doesn&apos;t verify riders, so always meet
          in public and ride within your limits.
        </p>
      </div>
    </AuthLayout>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

// ---------------------------------------------------------------- profile set-up (both modes)

// Device mode: the prototype "sign-up" (no password, saved in this browser).
// Cloud mode: the first-time profile for a signed-in account.
export function Welcome() {
  const { state } = useStore();
  const cloud = isCloud(state);
  const auth = state.auth.mode === "cloud" ? state.auth : null;
  const device = cloud && !deviceDataImported() ? readDeviceData() : null;
  const prefill = device?.me ?? null;

  const [name, setName] = useState(prefill?.displayName ?? auth?.suggestedName?.split(" ")[0] ?? "");
  const [username, setUsername] = useState(prefill?.username ?? "");
  const [usernameTouched, setUsernameTouched] = useState(!!prefill);
  const [level, setLevel] = useState<Level | null>(prefill?.level ?? null);
  const [area, setArea] = useState<Area | "">(prefill?.region ?? "");
  const [availability, setAvailability] = useState<SlotId[]>(prefill?.availability ?? []);
  const [gender, setGender] = useState<Gender | "">(prefill?.gender ?? "");
  const [bike, setBike] = useState<BikeRef | null>(null);
  const [importDevice, setImportDevice] = useState(!!device);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handle = usernameTouched ? username : toUsername(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!looksLikeText(name, 2, 40)) next.name = "Please enter your first name or a nickname (2–40 letters).";
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) next.username = "3–20 lowercase letters, numbers or underscores.";
    if (!level) next.level = "Please choose your riding level.";
    if (availability.length === 0) next.availability = "Pick at least one time you usually ride.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const error = await saveMe({
      displayName: name.trim(),
      username: handle,
      bio: importDevice && prefill ? prefill.bio : "",
      region: area || null,
      level: level!,
      style: importDevice && prefill ? prefill.style : null,
      quizAnswers: importDevice && prefill ? prefill.quizAnswers : null,
      gender: gender || null,
      showGender: importDevice && prefill ? prefill.showGender : false,
      availability,
      avatar: importDevice && prefill?.avatar ? prefill.avatar : (auth?.suggestedAvatar ?? null),
      createdAt: Date.now(),
    });
    if (error) {
      setSaving(false);
      setErrors(/username/i.test(error) ? { username: error } : { form: error });
      return;
    }
    if (importDevice && device) {
      const importError = await importDeviceData(device);
      if (importError) setErrors({ form: importError });
    }
    if (bike) addBike({ bike, year: null, nickname: "" }, true);
    setSaving(false);
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} noValidate className="space-y-6">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase">Create your rider profile</h2>
          <p className="mt-1 text-sm text-muted">Takes about a minute. You can change everything later.</p>
        </div>

        {cloud ? (
          <Notice>
            Signed in{auth?.email ? ` as ${auth.email}` : ""}. Your profile is visible to other signed-in riders.{" "}
            <button type="button" className="font-semibold underline" onClick={() => void signOut()}>
              Not you?
            </button>
          </Notice>
        ) : (
          <Notice>
            <strong>This is a prototype, not a real account.</strong> There&apos;s no password: your profile is saved only in
            this browser on this device, and nothing is shared with other people.
          </Notice>
        )}

        {device && (
          <label className="flex items-start gap-3 rounded-xl border border-accent bg-accent-soft p-4">
            <input type="checkbox" checked={importDevice} onChange={(e) => setImportDevice(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--ink)]" />
            <span>
              <span className="block text-sm font-semibold">Bring over what&apos;s saved on this device</span>
              <span className="block text-xs text-ink-2">
                {device.garage.length} bike{device.garage.length === 1 ? "" : "s"}, {device.posts.length} post
                {device.posts.length === 1 ? "" : "s"}, {device.rides.length} ride{device.rides.length === 1 ? "" : "s"} and{" "}
                {device.joinedGroups.length} group{device.joinedGroups.length === 1 ? "" : "s"} from the prototype. Your posts will
                become visible to other riders. Chats with demo riders aren&apos;t copied.
              </span>
            </span>
          </label>
        )}

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

        {!(importDevice && device?.garage.length) && <BikePicker value={bike} onChange={setBike} label="Your main bike (optional)" />}

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

        {Object.keys(errors).some((k) => k !== "form") && <ErrorMessage>Please fix the highlighted fields.</ErrorMessage>}
        <ErrorMessage>{errors.form}</ErrorMessage>

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          {saving ? "Setting up your profile…" : "Start riding with Ride Buddy"}
        </Button>
      </form>
    </AuthLayout>
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
