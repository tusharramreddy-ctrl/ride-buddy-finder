"use client";

import { CHARACTERS, slotLabel } from "@/lib/constants";
import { bikeLabel, bikeType, type Profile } from "@/lib/profile";
import { Button, Card } from "./ui";

export function ProfileCard({
  profile,
  justCreated,
  onFind,
  finding,
  onEdit,
  onRetake,
  onDelete,
}: {
  profile: Profile;
  justCreated: boolean;
  onFind: () => void;
  finding: boolean;
  onEdit: () => void;
  onRetake: () => void;
  onDelete: () => void;
}) {
  const c = CHARACTERS[profile.character];
  return (
    <Card>
      {justCreated && (
        <p className="mb-4 text-sm font-semibold text-success">Profile saved on this device.</p>
      )}
      <div className="flex items-start gap-4">
        <div aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-3xl">
          {c.emoji}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold">Hi {profile.name}, you&apos;re {c.name}</h2>
          <p className="mt-1 text-sm text-muted">{c.blurb}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Level</dt>
          <dd className="font-semibold">{profile.level}</dd>
        </div>
        <div>
          <dt className="text-muted">Bike</dt>
          <dd className="font-semibold">{bikeLabel(profile.bike)}</dd>
          <dd className="text-xs text-muted">{bikeType(profile.bike)}</dd>
        </div>
        <div>
          <dt className="text-muted">Area</dt>
          <dd className="font-semibold">{profile.area}</dd>
        </div>
        <div>
          <dt className="text-muted">Free</dt>
          <dd className="font-semibold">{profile.availability.map(slotLabel).join(", ")}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button onClick={onFind} loading={finding} className="sm:mr-auto">
          {finding ? "Finding riders…" : "Find riders"}
        </Button>
        <Button variant="secondary" onClick={onEdit} disabled={finding}>Edit profile</Button>
        <Button variant="secondary" onClick={onRetake} disabled={finding}>Retake quiz</Button>
        <Button variant="danger" onClick={onDelete} disabled={finding}>Delete profile</Button>
      </div>
    </Card>
  );
}
