"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Ban, Bike, Flag, MapPin, MessageCircle } from "lucide-react";
import { bikeInfo, ccLabel } from "@/lib/bikes";
import { CHARACTERS, GENDERS, slotLabel } from "@/lib/constants";
import type { GarageBike } from "@/lib/model";
import { blockRider, fetchRiderBikes, loadProfile, report, unblockRider, useStore } from "@/lib/store";
import { PostCard, ReportDialog } from "../home/PostCard";
import { Avatar, Button, Card, Chip, Dialog, EmptyState, Notice, Spinner, Tabs, toast } from "../ui";

// A real rider with an account (cloud mode). Their rides stay private to them;
// only rides they chose to share appear, as posts.
export function RealRiderProfile({ id }: { id: string }) {
  const { state } = useStore();
  const profile = state.profiles[id];
  const [tab, setTab] = useState<"posts" | "bikes">("posts");
  const [bikes, setBikes] = useState<GarageBike[] | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reporting, setReporting] = useState(false);
  const cloud = state.auth.mode === "cloud";

  useEffect(() => {
    if (!profile) loadProfile(id);
  }, [profile, id]);

  useEffect(() => {
    if (!cloud) return;
    let alive = true;
    fetchRiderBikes(id)
      .then((b) => alive && setBikes(b))
      .catch(() => alive && setBikes([]));
    return () => {
      alive = false;
    };
  }, [id, cloud]);

  if (!profile) {
    return (
      <div className="mx-auto flex max-w-2xl justify-center px-4 py-16">
        {cloud ? <Spinner label="Loading rider" /> : <EmptyState title="Rider not found" body="This profile doesn't exist." />}
      </div>
    );
  }

  const blocked = state.blocked.includes(id);
  const posts = state.posts.filter((p) => p.authorId === id && !state.hiddenPosts.includes(p.id));
  const primary = profile.primaryBike ? bikeInfo(profile.primaryBike) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <Card className="mt-3 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={profile.displayName} src={profile.avatar} seed={id} size={84} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none">{profile.displayName}</h1>
            <p className="text-muted">@{profile.username}</p>
            {profile.bio && <p className="mt-2 max-w-xl text-ink-2">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip tone="accent">{profile.level}</Chip>
              {profile.style && <Chip>{CHARACTERS[profile.style].name}</Chip>}
              {primary && (
                <Chip>
                  <Bike className="h-3.5 w-3.5" /> {primary.label}
                </Chip>
              )}
              {profile.region && (
                <Chip>
                  <MapPin className="h-3.5 w-3.5" /> {profile.region} (approx.)
                </Chip>
              )}
              {profile.genderShown && <Chip>{GENDERS.find((g) => g.id === profile.genderShown)?.label}</Chip>}
            </div>
            {profile.availability.length > 0 && (
              <p className="mt-2 text-sm text-muted">Usually free: {profile.availability.map(slotLabel).join(", ")}</p>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {!blocked && (
            <Link
              href={`/chat/dm-${id}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
            >
              <MessageCircle className="h-4 w-4" /> Message
            </Link>
          )}
          {blocked ? (
            <Button
              variant="secondary"
              onClick={() => {
                unblockRider(id);
                toast(`${profile.displayName} unblocked`);
              }}
            >
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
        <Notice>Ride Buddy doesn&apos;t verify riders. Meet in public places and ride within your limits.</Notice>
      </div>

      {blocked ? (
        <div className="mt-6">
          <EmptyState title="You've blocked this rider" body="Their posts, comments and messages are hidden from you, and they can't message you." />
        </div>
      ) : (
        <div className="mt-6">
          <Tabs
            label="Profile sections"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "posts", label: "Posts", count: posts.length },
              { id: "bikes", label: "Motorcycles", count: bikes?.length },
            ]}
          />
          <div className="mt-4 space-y-4">
            {tab === "posts" &&
              (posts.length ? (
                posts.map((p) => <PostCard key={p.id} post={p} />)
              ) : (
                <EmptyState title="No posts yet" body="Rides they share appear here as posts. Other rides stay private." />
              ))}
            {tab === "bikes" &&
              (bikes === null ? (
                <Spinner label="Loading bikes" />
              ) : bikes.length === 0 ? (
                <EmptyState title="No bikes added yet" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {bikes.map((b) => {
                    const info = bikeInfo(b.bike);
                    return (
                      <Card key={b.id} className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{info.make}</p>
                        <p className="font-display text-2xl font-bold uppercase">{info.model}</p>
                        {b.nickname && <p className="text-sm text-ink-2">&ldquo;{b.nickname}&rdquo;</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Chip>{info.type}</Chip>
                          <Chip>{ccLabel(info.cc)}</Chip>
                          {b.year && <Chip>{b.year}</Chip>}
                          {b.primary && <Chip tone="accent">Main bike</Chip>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      )}

      <Dialog open={confirmBlock} onClose={() => setConfirmBlock(false)} title={`Block ${profile.displayName}?`}>
        <p className="text-sm text-ink-2">
          You won&apos;t see their posts, comments or messages, and they won&apos;t be able to message you. You can unblock them any
          time.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmBlock(false)}>
            Cancel
          </Button>
          <Button
            variant="dark"
            onClick={() => {
              blockRider(id);
              setConfirmBlock(false);
              toast(`${profile.displayName} blocked`);
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
          report({ targetType: "rider", targetId: id, reason });
          setReporting(false);
          toast("Report saved. No moderation team reviews reports yet.");
        }}
      />
    </div>
  );
}
