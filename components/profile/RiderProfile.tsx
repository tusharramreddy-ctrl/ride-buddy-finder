"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Ban, Bike, Flag, MapPin, MessageCircle } from "lucide-react";
import { ccLabel } from "@/lib/bikes";
import { CHARACTERS, slotLabel } from "@/lib/constants";
import { DEMO_POSTS, GROUPS } from "@/lib/demo";
import { formatMinutes } from "@/lib/geo";
import { isUuid } from "@/lib/model";
import { findRider, riderBike } from "@/lib/riders";
import { blockRider, report, unblockRider, useStore } from "@/lib/store";
import { PostCard, ReportDialog } from "../home/PostCard";
import { RealRiderProfile } from "./RealRiderProfile";
import { Avatar, Button, Card, Chip, DemoBadge, Dialog, EmptyState, Notice, Tabs, toast } from "../ui";

type Tab = "posts" | "rides" | "bikes";

export function RiderProfile({ id }: { id: string }) {
  const { state } = useStore();
  const rider = findRider(id);
  const [tab, setTab] = useState<Tab>("posts");
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reporting, setReporting] = useState(false);

  if (!rider && isUuid(id)) return <RealRiderProfile id={id} />;
  if (!rider) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState title="Rider not found" body="This profile doesn't exist." action={<Link href="/" className="font-semibold text-accent-ink underline">Back to Home</Link>} />
      </div>
    );
  }

  const blocked = state.blocked.includes(rider.id);
  const bike = riderBike(rider);
  const posts = DEMO_POSTS.filter((p) => p.authorId === rider.id && !state.hiddenPosts.includes(p.id));
  const ridePosts = posts.filter((p) => p.kind === "ride" && p.ride);
  const groups = GROUPS.filter((g) => g.members.includes(rider.id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <Card className="mt-3 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={rider.name} seed={rider.id} size={84} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-4xl font-extrabold uppercase leading-none">{rider.name}</h1>
              <DemoBadge label="Demo profile" />
            </div>
            <p className="text-muted">@{rider.username}</p>
            <p className="mt-2 max-w-xl text-ink-2">{rider.bio}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip tone="accent">{rider.level}</Chip>
              <Chip>{CHARACTERS[rider.character].name}</Chip>
              <Chip>
                <Bike className="h-3.5 w-3.5" /> {bike.label}
              </Chip>
              <Chip>
                <MapPin className="h-3.5 w-3.5" /> {rider.area} (approx.)
              </Chip>
            </div>
            <p className="mt-2 text-sm text-muted">Usually free: {rider.availability.map(slotLabel).join(", ")}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {!blocked && (
            <Link
              href={`/chat/dm-${rider.id}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
            >
              <MessageCircle className="h-4 w-4" /> Message
            </Link>
          )}
          {blocked ? (
            <Button variant="secondary" onClick={() => (unblockRider(rider.id), toast(`${rider.name} unblocked`))}>
              Unblock
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmBlock(true)}>
              <Ban className="h-4 w-4" /> Block
            </Button>
          )}
          <Button variant="ghost" onClick={() => setReporting(true)}>
            <Flag className="h-4 w-4" /> Report
          </Button>
        </div>
      </Card>

      <div className="mt-4">
        <Notice>
          Fictional demo rider used to show how Ride Buddy works. Not a real person, and not verified. No ride statistics are shown
          because there&apos;s no real activity data.
        </Notice>
      </div>

      {blocked ? (
        <div className="mt-6">
          <EmptyState title="You've blocked this rider" body="Their posts, comments and messages are hidden from you." />
        </div>
      ) : (
        <div className="mt-6">
          <Tabs
            label="Profile sections"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "posts", label: "Posts", count: posts.length },
              { id: "rides", label: "Rides", count: ridePosts.length },
              { id: "bikes", label: "Motorcycles", count: 1 },
            ]}
          />
          <div className="mt-4 space-y-4">
            {tab === "posts" && (posts.length ? posts.map((p) => <PostCard key={p.id} post={p} />) : <EmptyState title="No posts yet" />)}
            {tab === "rides" &&
              (ridePosts.length ? (
                <>
                  <p className="text-sm text-muted">
                    From shared demo posts: {ridePosts.length} ride{ridePosts.length > 1 ? "s" : ""},{" "}
                    {ridePosts.reduce((s, p) => s + p.ride!.distanceKm, 0).toFixed(1)} km,{" "}
                    {formatMinutes(ridePosts.reduce((s, p) => s + p.ride!.durationMin, 0))}
                  </p>
                  {ridePosts.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </>
              ) : (
                <EmptyState title="No shared rides" />
              ))}
            {tab === "bikes" && (
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{bike.make}</p>
                <p className="font-display text-2xl font-bold uppercase">{bike.model}</p>
                <div className="mt-2 flex gap-1.5">
                  <Chip>{bike.type}</Chip>
                  <Chip>{ccLabel(bike.cc)}</Chip>
                </div>
              </Card>
            )}
          </div>
          {groups.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 font-display text-xl font-bold uppercase tracking-wide">Groups</h2>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <Link key={g.id} href={`/chat/g-${g.id}`} className="rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-medium hover:bg-surface-2">
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={confirmBlock} onClose={() => setConfirmBlock(false)} title={`Block ${rider.name}?`}>
        <p className="text-sm text-ink-2">
          You won&apos;t see their posts, comments or messages, and they won&apos;t appear in your matches. You can unblock them any time.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmBlock(false)}>
            Cancel
          </Button>
          <Button
            variant="dark"
            onClick={() => {
              blockRider(rider.id);
              setConfirmBlock(false);
              toast(`${rider.name} blocked`);
            }}
          >
            Block
          </Button>
        </div>
      </Dialog>

      <ReportDialog
        open={reporting}
        onClose={() => setReporting(false)}
        onSubmit={(reason) => {
          report({ targetType: "rider", targetId: rider.id, reason });
          setReporting(false);
          toast("Report saved. No moderation team reviews reports yet.");
        }}
      />
    </div>
  );
}
