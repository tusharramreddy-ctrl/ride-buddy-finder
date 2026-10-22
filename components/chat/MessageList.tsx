"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { Flag } from "lucide-react";
import { ME, type AppState, type Message } from "@/lib/model";
import { personFor } from "@/lib/people";
import { Avatar } from "../ui";
import { clockTime, dayKey, dayLabel } from "./chat-utils";

// Scrollable message log. Scrolls to the newest message on open and whenever a
// message is added. role="log" makes screen readers announce new messages.
export function MessageList({
  messages,
  state,
  showSenders,
  onReport,
  top,
  empty,
  label,
}: {
  messages: Message[];
  state: AppState;
  showSenders?: boolean;
  onReport?: (m: Message) => void;
  top?: ReactNode;
  empty?: ReactNode;
  label: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
      <div className="mx-auto flex max-w-3xl flex-col">
        {top}
        <div role="log" aria-label={label} aria-live="polite" className="flex flex-col">
          {messages.length === 0
            ? empty
            : messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay = !prev || dayKey(prev.at) !== dayKey(m.at);
                const grouped = !newDay && prev?.from === m.from && m.at - prev.at < 5 * 60_000;
                return (
                  <Fragment key={m.id}>
                    {newDay && (
                      <div className="my-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                        <span className="h-px flex-1 bg-line" />
                        {dayLabel(m.at)}
                        <span className="h-px flex-1 bg-line" />
                      </div>
                    )}
                    <Bubble
                      message={m}
                      state={state}
                      withAvatars={!!showSenders}
                      showSender={!!showSenders && !grouped}
                      grouped={grouped}
                      onReport={onReport}
                    />
                  </Fragment>
                );
              })}
        </div>
      </div>
    </div>
  );
}

function Bubble({
  message,
  state,
  withAvatars,
  showSender,
  grouped,
  onReport,
}: {
  message: Message;
  state: AppState;
  withAvatars: boolean;
  showSender: boolean;
  grouped: boolean;
  onReport?: (m: Message) => void;
}) {
  const mine = message.from === ME;
  const time = clockTime(message.at);

  if (mine) {
    return (
      <div className={`flex justify-end ${grouped ? "mt-1" : "mt-3"}`}>
        <div className="max-w-[80%] sm:max-w-[70%]">
          <p className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[15px] leading-snug text-white">
            <span className="sr-only">You: </span>
            {message.text}
          </p>
          <p className="mt-0.5 text-right text-[11px] text-muted">
            <time dateTime={new Date(message.at).toISOString()}>{time}</time>
          </p>
        </div>
      </div>
    );
  }

  const person = personFor(message.from, state);
  return (
    <div className={`group flex items-end gap-2 ${grouped ? "mt-1" : "mt-3"}`}>
      {showSender ? (
        <Link href={person.href} aria-label={`${person.name} profile`} className="shrink-0 self-start rounded-full">
          <Avatar name={person.name} src={person.avatar} seed={person.id} size={32} />
        </Link>
      ) : withAvatars ? (
        <span aria-hidden className="w-8 shrink-0" />
      ) : null}
      <div className="min-w-0 max-w-[80%] sm:max-w-[70%]">
        {showSender && (
          <p className="mb-0.5 flex items-center gap-1.5 px-1 text-xs">
            <Link href={person.href} className="font-semibold text-ink-2 hover:underline">
              {person.name}
            </Link>
            {(message.demo || person.demo) && <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Demo</span>}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-2 text-[15px] leading-snug text-ink">
          {!showSender && <span className="sr-only">{person.name}: </span>}
          {message.text}
        </p>
        <p className="mt-0.5 px-1 text-[11px] text-muted">
          <time dateTime={new Date(message.at).toISOString()}>{time}</time>
        </p>
      </div>
      {onReport && (
        <button
          type="button"
          onClick={() => onReport(message)}
          aria-label={`Report message from ${person.name}`}
          title="Report message"
          className="mb-5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted opacity-60 transition hover:bg-surface-2 hover:text-danger hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Flag aria-hidden className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
