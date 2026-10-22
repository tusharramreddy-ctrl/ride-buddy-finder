"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Bike, CalendarDays, CircleHelp, Route, Sparkles, Users } from "lucide-react";
import { bikeInfo } from "@/lib/bikes";
import { areNearby, CHARACTERS } from "@/lib/constants";
import { DEMO_POSTS, GROUPS } from "@/lib/demo";
import { personFor } from "@/lib/people";
import { RIDERS, riderBike } from "@/lib/riders";
import { loadDirectory, useStore } from "@/lib/store";
import { openComposer } from "../shell/composer-state";
import { Avatar, Button, Card, DemoBadge, EmptyState, SectionTitle } from "../ui";
import { PostCard } from "./PostCard";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function HomePage() {
  const { state } = useStore();
  const me = state.me!;

  const feed = [...state.posts, ...DEMO_POSTS]
    .filter((p) => !state.hiddenPosts.includes(p.id) && !state.blocked.includes(p.authorId))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:py-8">
      <div className="min-w-0 flex-1 space-y-5 lg:max-w-2xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-ink">Home</p>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">
            {greeting()}, {me.displayName}
          </h1>
          <p className="mt-2 text-ink-2">See what riders are up to, share your own rides, and find people to ride with.</p>
        </header>

        {/* Find riding buddies: the heart of Ride Buddy */}
        <section className="relative overflow-hidden rounded-2xl bg-asphalt p-5 text-on-asphalt sm:p-6">
          <div className="relative z-10 max-w-md">
            <p className="flex items-center gap-2 text-sm font-semibold text-accent">
              <Sparkles className="h-4 w-4" /> Rider matching
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold uppercase leading-tight">Find riding buddies</h2>
            <p className="mt-1 text-sm text-on-asphalt-muted">
              Describe how you ride in a sentence. We&apos;ll suggest three compatible riders and help you write a first message.
            </p>
            <Link
              href="/find"
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
            >
              Find my riders <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <svg aria-hidden viewBox="0 0 200 120" className="absolute -right-6 bottom-0 h-full w-1/2 opacity-70">
            <path d="M10 120 C 60 100, 70 60, 110 55 S 170 20, 200 0" fill="none" stroke="#22262b" strokeWidth="22" strokeLinecap="round" />
            <path d="M10 120 C 60 100, 70 60, 110 55 S 170 20, 200 0" fill="none" stroke="#f5a400" strokeWidth="2" strokeDasharray="8 7" />
          </svg>
        </section>

        {/* Composer prompt */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar name={me.displayName} src={me.avatar} seed="me" size={42} />
            <button
              type="button"
              onClick={() => openComposer()}
              className="h-11 flex-1 rounded-full border border-line-strong bg-surface-2/60 px-4 text-left text-sm text-muted hover:bg-surface-2"
            >
              Share a ride, your bike or a question…
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 pl-[54px]">
            <QuickAction icon={<Route className="h-4 w-4" />} label="Ride" onClick={() => openComposer({ kind: "ride" })} />
            <QuickAction icon={<Bike className="h-4 w-4" />} label="My bike" onClick={() => openComposer({ kind: "bike" })} />
            <QuickAction icon={<CircleHelp className="h-4 w-4" />} label="Question" onClick={() => openComposer({ kind: "question" })} />
            <QuickAction icon={<CalendarDays className="h-4 w-4" />} label="Group ride" onClick={() => openComposer({ kind: "group-ride" })} />
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Latest from riders</h2>
          <span className="text-xs text-muted">Newest first</span>
        </div>

        {feed.length === 0 ? (
          <EmptyState
            title="Your feed is empty"
            body="You've hidden every post. Share something of your own to get things going."
            action={<Button onClick={() => openComposer()}>Write a post</Button>}
          />
        ) : (
          <div className="space-y-4">
            {feed.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            <p className="py-4 text-center text-sm text-muted">You&apos;re all caught up.</p>
          </div>
        )}
      </div>

      <SideColumn />
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      {icon}
      {label}
    </button>
  );
}

function SideColumn() {
  const { state } = useStore();
  const me = state.me!;

  useEffect(() => {
    loadDirectory();
  }, []);

  // Newest real riders (cloud mode), not blocked.
  const realRiders = Object.values(state.profiles)
    .filter((p) => !state.blocked.includes(p.id))
    .slice(0, 4);

  // Simple, explainable suggestions: shared free time first, then nearby area.
  const suggested = RIDERS.filter((r) => !state.blocked.includes(r.id))
    .map((r) => ({
      r,
      score:
        r.availability.filter((s) => me.availability.includes(s)).length * 2 +
        (me.region && areNearby(me.region, r.area) ? 3 : 0) +
        (me.style && me.style === r.character ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id))
    .slice(0, 3)
    .map((x) => x.r);

  const groups = GROUPS.filter((g) => !state.joinedGroups.includes(g.id)).slice(0, 3);
  const plans = [...state.posts, ...DEMO_POSTS].filter((p) => p.kind === "group-ride" && p.plan && !state.hiddenPosts.includes(p.id)).slice(0, 3);

  return (
    <aside className="hidden w-80 shrink-0 space-y-6 xl:block">
      {realRiders.length > 0 && (
        <Card className="p-4">
          <SectionTitle>New riders</SectionTitle>
          <ul className="space-y-3">
            {realRiders.map((p) => (
              <li key={p.id}>
                <Link href={`/riders/${p.id}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-surface-2">
                  <Avatar name={p.displayName} src={p.avatar} seed={p.id} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.displayName}</span>
                    <span className="block truncate text-xs text-muted">
                      {[p.level, p.region, p.primaryBike ? bikeInfo(p.primaryBike).label : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <SectionTitle action={<DemoBadge />}>Riders to know</SectionTitle>
        <ul className="space-y-3">
          {suggested.map((r) => (
            <li key={r.id}>
              <Link href={`/riders/${r.id}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-surface-2">
                <Avatar name={r.name} seed={r.id} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {CHARACTERS[r.character].short} · {riderBike(r).label}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/find" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink hover:underline">
          Find better matches <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>

      <Card className="p-4">
        <SectionTitle action={<DemoBadge />}>Groups</SectionTitle>
        {groups.length === 0 ? (
          <p className="text-sm text-muted">You&apos;ve joined every group. Nice!</p>
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/chat/g-${g.id}`} className="flex items-start gap-3 rounded-xl p-1 hover:bg-surface-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                    <Users className="h-5 w-5 text-ink-2" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{g.name}</span>
                    <span className="block text-xs text-muted">
                      {g.members.length} members · {g.region}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {plans.length > 0 && (
        <Card className="p-4">
          <SectionTitle>Upcoming community rides</SectionTitle>
          <ul className="space-y-3">
            {plans.map((p) => {
              const who = personFor(p.authorId, state);
              return (
                <li key={p.id} className="rounded-xl bg-surface-2/70 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4 text-accent-ink" /> {p.plan!.when}
                    {p.plan!.area && <span className="font-normal text-muted">· {p.plan!.area}</span>}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-2">{p.text}</p>
                  <p className="mt-1 text-xs text-muted">
                    by {who.name}
                    {who.demo && " (demo)"}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </aside>
  );
}
