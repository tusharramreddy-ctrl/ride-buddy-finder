"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircle, Search, SquarePen, Users } from "lucide-react";
import { GROUPS, type Group } from "@/lib/demo";
import { ME } from "@/lib/model";
import { findRider } from "@/lib/riders";
import { useStore } from "@/lib/store";
import { Avatar, Button, Chip, DemoBadge, EmptyState, IconButton, Tabs, inputClass, timeAgo } from "../ui";
import { NewMessageDialog } from "./NewMessageDialog";
import { dmHref, groupHref, groupMemberCount, groupMessages, matches, memberLabel } from "./chat-utils";

type Tab = "messages" | "groups";

export function ChatList({ selectedId }: { selectedId: string | null }) {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>(selectedId?.startsWith("g-") ? "groups" : "messages");
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);

  const conversations = useMemo(
    () =>
      state.conversations
        .filter((c) => !state.blocked.includes(c.riderId))
        .map((c) => ({ convo: c, rider: findRider(c.riderId) }))
        .filter((x): x is { convo: typeof x.convo; rider: NonNullable<typeof x.rider> } => !!x.rider)
        .sort((a, b) => b.convo.updatedAt - a.convo.updatedAt),
    [state.conversations, state.blocked],
  );

  const shownConvos = conversations.filter(({ convo, rider }) =>
    matches(query, rider.name, rider.username, convo.messages.at(-1)?.text),
  );

  const groupRows = GROUPS.map((g) => {
    const msgs = groupMessages(g.id, state).filter((m) => m.from === ME || !state.blocked.includes(m.from));
    return { group: g, last: msgs.at(-1), joined: state.joinedGroups.includes(g.id) };
  }).filter(({ group, last }) => matches(query, group.name, group.description, last?.text));

  const yourGroups = groupRows.filter((g) => g.joined);
  const discover = groupRows.filter((g) => !g.joined);

  return (
    <>
      <div className="border-b border-line px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">Chat</h1>
          <IconButton label="New message" onClick={() => setPicking(true)}>
            <SquarePen aria-hidden className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="relative mt-3">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and groups"
            aria-label="Search chats and groups"
            className={`${inputClass} rounded-full py-2 pl-9 text-sm`}
          />
        </div>
        <div className="mt-2">
          <Tabs
            label="Chat sections"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "messages", label: "Messages", count: conversations.length },
              { id: "groups", label: "Groups", count: state.joinedGroups.filter((id) => GROUPS.some((g) => g.id === id)).length },
            ]}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" role="tabpanel" aria-label={tab === "messages" ? "Messages" : "Groups"}>
        {tab === "messages" ? (
          conversations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<MessageCircle className="h-8 w-8" />}
                title="No conversations yet"
                body="Start one from a rider's profile or from Find riding buddies. Messages are saved on this device only, and demo riders can't reply."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => setPicking(true)}>
                      <SquarePen aria-hidden className="h-4 w-4" /> New message
                    </Button>
                    <Link
                      href="/find"
                      className="inline-flex h-11 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-2"
                    >
                      Find riding buddies
                    </Link>
                  </div>
                }
              />
            </div>
          ) : shownConvos.length === 0 ? (
            <NoResults query={query} />
          ) : (
            <ul>
              {shownConvos.map(({ convo, rider }) => {
                const last = convo.messages.at(-1);
                const id = `dm-${rider.id}`;
                const active = selectedId === id;
                return (
                  <li key={rider.id}>
                    <Link
                      href={dmHref(rider.id)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 border-b border-line px-4 py-3 transition-colors ${active ? "bg-accent-soft" : "hover:bg-surface-2"}`}
                    >
                      <Avatar name={rider.name} seed={rider.id} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold text-ink">{rider.name}</span>
                          <DemoBadge />
                          <span className="ml-auto shrink-0 text-xs text-muted">{timeAgo(convo.updatedAt)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted">
                          {last ? `${last.from === ME ? "You: " : ""}${last.text}` : "No messages yet"}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )
        ) : groupRows.length === 0 ? (
          <NoResults query={query} />
        ) : (
          <div className="space-y-5 px-4 py-4">
            <GroupSection title="Your groups" rows={yourGroups} selectedId={selectedId} empty="You haven't joined a group yet. Pick one below to read along, then join to chat." />
            <GroupSection title="Discover groups" rows={discover} selectedId={selectedId} empty="You've joined every group. Nice." />
          </div>
        )}
      </div>

      <p className="border-t border-line px-4 py-2 text-[11px] leading-snug text-muted">
        Prototype: chats are saved on this device only. Other riders are demo profiles and can&apos;t reply.
      </p>

      <NewMessageDialog open={picking} onClose={() => setPicking(false)} />
    </>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <p role="status" className="px-4 py-8 text-center text-sm text-muted">
      Nothing matches &ldquo;{query.trim()}&rdquo;.
    </p>
  );
}

function GroupSection({
  title,
  rows,
  selectedId,
  empty,
}: {
  title: string;
  rows: { group: Group; joined: boolean; last?: { text: string } }[];
  selectedId: string | null;
  empty: string;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ group, joined }) => (
            <li key={group.id}>
              <GroupCard group={group} joined={joined} active={selectedId === `g-${group.id}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GroupCard({ group, joined, active }: { group: Group; joined: boolean; active: boolean }) {
  const { state } = useStore();
  const count = groupMemberCount(group, state);
  return (
    <Link
      href={groupHref(group.id)}
      aria-current={active ? "page" : undefined}
      className={`block rounded-2xl border p-3.5 transition-colors ${active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"}`}
    >
      <span className="flex items-start gap-3">
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-accent">
          <Users className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-ink">{group.name}</span>
            <DemoBadge />
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            {group.region} · {memberLabel(count)}
            {joined && <span className="font-semibold text-accent-ink"> · Joined</span>}
          </span>
        </span>
      </span>
      <span className="mt-2 line-clamp-2 block text-sm text-ink-2">{group.description}</span>
      <span className="mt-2 flex flex-wrap gap-1.5">
        {group.interests.map((i) => (
          <Chip key={i}>{i}</Chip>
        ))}
      </span>
    </Link>
  );
}
