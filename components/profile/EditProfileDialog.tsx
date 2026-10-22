"use client";

import { useState } from "react";
import { Camera, Trash } from "lucide-react";
import { AREAS, CHARACTER_IDS, CHARACTERS, GENDERS, LEVELS, SLOTS, type Area, type CharacterId, type Gender, type Level, type SlotId } from "@/lib/constants";
import { compressImage } from "@/lib/image";
import type { MeProfile } from "@/lib/model";
import { isCloud } from "@/lib/people";
import { resetEverything, saveMe, saveQuizResult, useStore } from "@/lib/store";
import { looksLikeText } from "@/lib/text";
import { Avatar, Button, ChoicePills, Dialog, ErrorMessage, Field, inputClass, toast } from "../ui";
import { QuizDialog } from "./QuizDialog";

export function EditProfileDialog({ open, onClose, me }: { open: boolean; onClose: () => void; me: MeProfile }) {
  return (
    <Dialog open={open} onClose={onClose} title="Edit profile" wide>
      {open && <EditForm me={me} onClose={onClose} />}
    </Dialog>
  );
}

function EditForm({ me, onClose }: { me: MeProfile; onClose: () => void }) {
  const [name, setName] = useState(me.displayName);
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio);
  const [region, setRegion] = useState<Area | "">(me.region ?? "");
  const [level, setLevel] = useState<Level>(me.level);
  const [availability, setAvailability] = useState<SlotId[]>(me.availability);
  const [style, setStyle] = useState<CharacterId | null>(me.style);
  const [quizAnswers, setQuizAnswers] = useState<number[] | null>(me.quizAnswers);
  const [gender, setGender] = useState<Gender | "">(me.gender ?? "");
  const [showGender, setShowGender] = useState(me.showGender);
  const [avatar, setAvatar] = useState<string | null>(me.avatar);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quizOpen, setQuizOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const { state } = useStore();
  const cloud = isCloud(state);

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    try {
      setAvatar(await compressImage(file, 320, 0.85));
    } catch (e) {
      setErrors({ avatar: e instanceof Error ? e.message : "We couldn't use that photo." });
    }
  }

  async function save() {
    const next: Record<string, string> = {};
    if (!looksLikeText(name, 2, 40)) next.name = "2–40 characters, including letters.";
    if (!/^[a-z0-9_]{3,20}$/.test(username)) next.username = "3–20 lowercase letters, numbers or underscores.";
    if (bio.length > 160) next.bio = "Keep your bio to 160 characters.";
    if (availability.length === 0) next.availability = "Pick at least one time you usually ride.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    const error = await saveMe({
      ...me,
      displayName: name.trim(),
      username,
      bio: bio.trim(),
      region: region || null,
      level,
      availability,
      style,
      quizAnswers,
      gender: gender || null,
      showGender: gender ? showGender : false,
      avatar,
    });
    setSaving(false);
    if (error) {
      setErrors(/username/i.test(error) ? { username: error } : { form: error });
      return;
    }
    toast("Profile saved");
    onClose();
  }

  async function deleteEverything() {
    setSaving(true);
    const error = await resetEverything();
    setSaving(false);
    if (error) {
      setConfirmReset(false);
      setErrors({ form: error });
      return;
    }
    toast("Your data was deleted");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} src={avatar} seed="me" size={72} />
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-semibold hover:bg-surface-2">
            <Camera className="h-4 w-4" /> {avatar ? "Change photo" : "Add photo"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickAvatar(e.target.files?.[0])} />
          </label>
          {avatar && (
            <Button variant="ghost" size="sm" onClick={() => setAvatar(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      {errors.avatar && <ErrorMessage>{errors.avatar}</ErrorMessage>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" htmlFor="e-name" error={errors.name}>
          <input id="e-name" className={inputClass} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Username" htmlFor="e-user" error={errors.username}>
          <input id="e-user" className={inputClass} value={username} maxLength={20} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
        </Field>
      </div>

      <Field label="Short bio" htmlFor="e-bio" error={errors.bio} hint={`${bio.length}/160`}>
        <textarea id="e-bio" rows={2} className={`${inputClass} resize-none`} value={bio} maxLength={170} onChange={(e) => setBio(e.target.value)} placeholder="What kind of riding do you love?" />
      </Field>

      <Field label="Experience">
        <ChoicePills label="Experience" options={LEVELS.map((l) => ({ id: l, label: l }))} value={level} onChange={setLevel} />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Riding style</p>
          <Button variant="ghost" size="sm" onClick={() => setQuizOpen(true)}>
            Take the quiz
          </Button>
        </div>
        <ChoicePills
          label="Riding style"
          options={CHARACTER_IDS.map((id) => ({ id, label: CHARACTERS[id].name, hint: CHARACTERS[id].blurb }))}
          value={style}
          onChange={(id) => (setStyle(id), setQuizAnswers(null))}
        />
      </div>

      <Field label="When you usually ride" error={errors.availability}>
        <ChoicePills
          label="When you usually ride"
          multiple
          options={SLOTS.map((s) => ({ id: s.id, label: s.label }))}
          value={availability}
          onChange={(id) => setAvailability((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))}
        />
      </Field>

      <Field label="Rough area (optional)" htmlFor="e-area" hint="Approximate only. Never your exact address.">
        <select id="e-area" className={inputClass} value={region} onChange={(e) => setRegion(e.target.value as Area | "")}>
          <option value="">Prefer not to say</option>
          {AREAS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <Field label="Gender (optional)" htmlFor="e-gender" hint="Used only for the 'women riders only' match filter.">
          <select id="e-gender" className={inputClass} value={gender} onChange={(e) => setGender(e.target.value as Gender | "")}>
            <option value="">Prefer not to say</option>
            {GENDERS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <label className={`flex items-center gap-2 pb-2.5 text-sm ${gender ? "" : "opacity-50"}`}>
          <input type="checkbox" disabled={!gender} checked={showGender && !!gender} onChange={(e) => setShowGender(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
          Show on my profile
        </label>
      </div>

      {errors.form && <ErrorMessage>{errors.form}</ErrorMessage>}
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
          <Trash className="h-4 w-4" /> Delete all my Ride Buddy data
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>Save profile</Button>
        </div>
      </div>

      <QuizDialog
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        onDone={async (s, answers) => {
          setStyle(s);
          setQuizAnswers(answers);
          setQuizOpen(false);
          const error = await saveQuizResult(s, answers);
          if (error) setErrors({ form: error });
          else toast(`Riding style saved: ${CHARACTERS[s].name}`);
        }}
      />

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Delete everything?">
        <p className="text-sm text-ink-2">
          This removes your profile, bikes, posts, messages, groups and rides{cloud ? " from your account" : " from this device"}. It can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Keep my data
          </Button>
          <Button variant="dark" onClick={deleteEverything} loading={saving}>
            Delete everything
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
