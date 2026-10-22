"use client";

import Link from "next/link";
import { useState } from "react";
import { Bike, Gauge, LogOut, MapPin, Pencil, Route, Timer } from "lucide-react";
import { bikeInfo } from "@/lib/bikes";
import { CHARACTERS, GENDERS } from "@/lib/constants";
import { formatDuration, formatKm } from "@/lib/geo";
import { ME } from "@/lib/model";
import { signOut, useStore } from "@/lib/store";
import { PostCard } from "../home/PostCard";
import { RoutePreview } from "../RoutePreview";
import { openComposer } from "../shell/composer-state";
import { Avatar, Button, Card, Chip, EmptyState, Tabs } from "../ui";
import { EditProfileDialog } from "./EditProfileDialog";
import { Garage } from "./Garage";

type Tab = "posts" | "rides" | "bikes";

export function ProfilePage() {
  const { state } = useStore();
  const me = state.me!;
  const [tab, setTab] = useState<Tab>("posts");
  const [editOpen, setEditOpen] = useState(false);

  const primary = state.garage.find((b) => b.primary);
  const myPosts = state.posts.filter((p) => p.authorId === ME);
  const rides = state.rides;
  // Statistics are calculated only from your saved rides.
  const totalM = rides.reduce((s, r) => s + r.distanceM, 0);
  const totalSec = rides.reduce((s, r) => s + r.movingSec, 0);
  const sharedRidePosts = myPosts.filter((p) => p.kind === "ride").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      <Card className="overflow-hidden">
        <div className="h-24 bg-asphalt sm:h-28">
          <svg aria-hidden viewBox="0 0 400 80" preserveAspectRatio="none" className="h-full w-full">
            <path d="M0 70 C 80 60, 120 20, 200 30 S 330 70, 400 10" fill="none" stroke="#22262b" strokeWidth="18" />
            <path d="M0 70 C 80 60, 120 20, 200 30 S 330 70, 400 10" fill="none" stroke="#f5a400" strokeWidth="1.5" strokeDasharray="8 7" />
          </svg>
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
            <div className="rounded-full border-4 border-surface">
              <Avatar name={me.displayName} src={me.avatar} seed="me" size={88} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit profile
              </Button>
              {state.auth.mode === "cloud" && (
                <Button variant="ghost" onClick={() => void signOut()} className="lg:hidden">
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              )}
            </div>
          </div>
          <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none">{me.displayName}</h1>
          <p className="text-muted">@{me.username}</p>
          {me.bio ? (
            <p className="mt-2 max-w-xl text-ink-2">{me.bio}</p>
          ) : (
            <button type="button" onClick={() => setEditOpen(true)} className="mt-2 text-sm font-semibold text-accent-ink hover:underline">
              Add a short bio
            </button>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip tone="accent">{me.level}</Chip>
            <Chip>{me.style ? CHARACTERS[me.style].name : "Riding style not set"}</Chip>
            {primary && (
              <Chip>
                <Bike className="h-3.5 w-3.5" /> {bikeInfo(primary.bike).label}
              </Chip>
            )}
            {me.region && (
              <Chip>
                <MapPin className="h-3.5 w-3.5" /> {me.region} (approx.)
              </Chip>
            )}
            {me.gender && me.showGender && <Chip>{GENDERS.find((g) => g.id === me.gender)?.label}</Chip>}
          </div>
        </div>
      </Card>

      <section aria-labelledby="stats" className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="stats" className="font-display text-xl font-bold uppercase tracking-wide">
            Riding stats
          </h2>
          <p className="text-xs text-muted">From your saved rides</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile icon={<Route className="h-4 w-4" />} label="Rides completed" value={String(rides.length)} />
          <StatTile icon={<Gauge className="h-4 w-4" />} label="Total distance" value={rides.length ? formatKm(totalM) : "0 km"} />
          <StatTile icon={<Timer className="h-4 w-4" />} label="Riding time" value={rides.length ? formatDuration(totalSec) : "0:00"} />
          <StatTile icon={<Bike className="h-4 w-4" />} label="Bikes" value={String(state.garage.length)} />
          <StatTile label="Favourite style" value={me.style ? CHARACTERS[me.style].short : "Not set"} small />
          <StatTile label="Shared ride posts" value={String(sharedRidePosts)} />
        </div>
      </section>

      <div className="mt-6">
        <Tabs
          label="Profile sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "posts", label: "Posts", count: myPosts.length },
            { id: "rides", label: "Rides", count: rides.length },
            { id: "bikes", label: "Motorcycles", count: state.garage.length },
          ]}
        />
        <div className="mt-4">
          {tab === "posts" &&
            (myPosts.length === 0 ? (
              <EmptyState title="No posts yet" body="Share a ride, your bike or a question with the community." action={<Button onClick={() => openComposer()}>Write a post</Button>} />
            ) : (
              <div className="space-y-4">
                {myPosts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            ))}

          {tab === "rides" &&
            (rides.length === 0 ? (
              <EmptyState
                icon={<Route className="h-8 w-8" />}
                title="No rides yet"
                body="Track a ride with GPS on the Map, or add one you've already done."
                action={
                  <Link href="/map" className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover">
                    Go to Map
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {rides.map((r) => (
                  <li key={r.id}>
                    <Card className="flex gap-4 overflow-hidden">
                      {r.points.length > 1 ? (
                        <RoutePreview route={r.points.map((p) => [p.lng, p.lat])} className="h-28 w-28 shrink-0" />
                      ) : (
                        <div className="flex h-28 w-28 shrink-0 items-center justify-center bg-surface-2 text-center text-xs text-muted">No route</div>
                      )}
                      <div className="min-w-0 flex-1 py-3 pr-4">
                        <p className="truncate font-semibold">{r.title}</p>
                        <p className="text-xs text-muted">{new Date(r.startedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                        <p className="mt-2 font-display text-xl font-bold">
                          {formatKm(r.distanceM)} · {formatDuration(r.movingSec)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Chip>{r.source === "gps" ? "GPS tracked" : "Entered manually"}</Chip>
                          <Chip>{r.sharedPostId ? "Shared to feed" : "Private"}</Chip>
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
                <li className="text-center">
                  <Link href="/map" className="text-sm font-semibold text-accent-ink hover:underline">
                    Manage rides on the Map
                  </Link>
                </li>
              </ul>
            ))}

          {tab === "bikes" && <Garage />}
        </div>
      </div>

      <EditProfileDialog open={editOpen} onClose={() => setEditOpen(false)} me={me} />
    </div>
  );
}

function StatTile({ icon, label, value, small }: { icon?: React.ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </p>
      <p className={`mt-1 font-display font-bold leading-tight ${small ? "text-xl" : "text-3xl"}`}>{value}</p>
    </Card>
  );
}
