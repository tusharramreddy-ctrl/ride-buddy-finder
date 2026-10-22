"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Info, MapPin, Users } from "lucide-react";
import type { Group } from "@/lib/demo";
import { ME, type Message } from "@/lib/model";
import { personFor } from "@/lib/people";
import { joinGroup, leaveGroup, sendGroupMessage, useStore } from "@/lib/store";
import { Avatar, Button, Chip, DemoBadge, Notice, toast } from "../ui";
import { groupMemberCount, groupMessages, memberLabel } from "./chat-utils";
import { ChatHeader, ConfirmDialog } from "./ChatParts";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { ReportDialog } from "./ReportDialog";

export function GroupChat({ group, draft }: { group: Group; draft: string }) {
  const { state } = useStore();
  const joined = state.joinedGroups.includes(group.id);
  const [aboutOpen, setAboutOpen] = useState(!joined);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [reporting, setReporting] = useState<Message | null>(null);

  const all = groupMessages(group.id, state);
  const visible = all.filter((m) => m.from === ME || !state.blocked.includes(m.from));
  const hiddenCount = all.length - visible.length;
  const count = groupMemberCount(group, state);

  function join() {
    joinGroup(group.id);
    setAboutOpen(false);
    toast(`You joined ${group.name}`);
  }

  const reportedPerson = reporting ? personFor(reporting.from, state) : null;

  return (
    <>
      <ChatHeader
        actions={
          <>
            <button
              type="button"
              onClick={() => setAboutOpen((o) => !o)}
              aria-expanded={aboutOpen}
              aria-controls="group-about"
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <Info aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">About</span>
              <span className="sr-only sm:hidden">About this group</span>
              <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${aboutOpen ? "rotate-180" : ""}`} />
            </button>
            {joined ? (
              <Button variant="secondary" size="sm" onClick={() => setConfirmLeave(true)}>
                Leave
              </Button>
            ) : (
              <Button size="sm" onClick={join}>
                Join
              </Button>
            )}
          </>
        }
      >
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-accent">
          <Users className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-ink">{group.name}</span>
            <DemoBadge />
          </span>
          <span className="block truncate text-xs text-muted">
            {memberLabel(count)}
            {joined && <span className="font-semibold text-accent-ink"> · You&apos;re a member</span>}
          </span>
        </span>
      </ChatHeader>

      {aboutOpen && (
        <section
          id="group-about"
          aria-label={`About ${group.name}`}
          className="max-h-[45%] shrink-0 overflow-y-auto border-b border-line bg-surface px-4 py-4 sm:px-5"
        >
          <div className="mx-auto max-w-3xl">
            <p className="text-sm text-ink-2">{group.description}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <MapPin aria-hidden className="h-4 w-4" /> {group.region}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {group.interests.map((i) => (
                <Chip key={i} tone="accent">
                  {i}
                </Chip>
              ))}
            </div>
            <h3 className="mt-4 font-display text-sm font-bold uppercase tracking-wider text-muted">Members · {count}</h3>
            <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {joined && state.me && (
                <li>
                  <Link href="/profile" className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                    <Avatar name={state.me.displayName} src={state.me.avatar} seed="me" size={32} />
                    <span className="truncate text-sm font-semibold text-ink">{state.me.displayName}</span>
                    <span className="text-xs text-muted">(You)</span>
                  </Link>
                </li>
              )}
              {group.members
                .filter((id) => id !== ME)
                .map((id) => {
                  const p = personFor(id, state);
                  const isBlocked = state.blocked.includes(id);
                  return (
                    <li key={id}>
                      <Link href={p.href} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-2">
                        <Avatar name={p.name} seed={p.id} size={32} />
                        <span className="truncate text-sm font-medium text-ink">{p.name}</span>
                        {isBlocked ? (
                          <span className="text-xs font-semibold text-danger">Blocked</span>
                        ) : (
                          p.demo && <DemoBadge />
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        </section>
      )}

      <MessageList
        label={`${group.name} messages`}
        messages={visible}
        state={state}
        showSenders
        onReport={(m) => setReporting(m)}
        top={
          <div className="mb-2 space-y-2">
            <Notice>Demo group. Messages are saved on this device only and demo riders can&apos;t reply.</Notice>
            {hiddenCount > 0 && (
              <p className="text-center text-xs text-muted">
                {hiddenCount} {hiddenCount === 1 ? "message" : "messages"} from a blocked rider hidden
              </p>
            )}
          </div>
        }
        empty={<p className="py-10 text-center text-sm text-muted">No messages yet.</p>}
      />

      {joined ? (
        <Composer key={group.id} initialText={draft} placeholder={`Message ${group.name}`} onSend={(text) => sendGroupMessage(group.id, text)} />
      ) : (
        <div className="flex flex-col items-start gap-3 border-t border-line bg-surface px-4 py-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-ink-2">You can read along. Join the group to chat.</p>
          <Button onClick={join}>Join to chat</Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave group"
        confirmLabel="Leave"
        body={<p>Leave {group.name}? You can still read the chat and rejoin any time. Messages you sent stay on this device.</p>}
        onConfirm={() => {
          leaveGroup(group.id);
          toast(`You left ${group.name}`);
        }}
      />
      <ReportDialog
        open={!!reporting}
        onClose={() => setReporting(null)}
        targetType="group-message"
        targetId={reporting?.id ?? ""}
        subject={reportedPerson ? `this message from ${reportedPerson.name}` : "this message"}
      />
    </>
  );
}
