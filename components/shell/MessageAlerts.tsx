"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { ALERT_MS, currentAlerts, dismissAlert, subscribeAlerts } from "@/lib/alerts";
import { findGroup } from "@/lib/demo";
import { useStore } from "@/lib/store";
import { Avatar } from "../ui";

// Pop-ups for incoming messages. Each shows for 3 seconds; the amber bar
// along the bottom empties over that time, and the pop-up leaves when it's gone.
export function MessageAlerts() {
  const alerts = useSyncExternalStore(subscribeAlerts, currentAlerts, currentAlerts);
  const { state } = useStore();
  if (!alerts.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-3 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-80 sm:items-stretch"
    >
      {alerts.map((a) => {
        const sender = state.profiles[a.fromId];
        const name = sender?.displayName ?? "A rider";
        const group = a.groupId ? findGroup(a.groupId) : null;
        return (
          <div
            key={a.id}
            className="message-alert pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-md"
          >
            <Link href={a.href} onClick={() => dismissAlert(a.id)} className="flex items-start gap-3 p-3 pr-10 hover:bg-surface-2">
              <Avatar name={name} src={sender?.avatar} seed={a.fromId} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {name}
                  {group && <span className="font-normal text-muted"> in {group.name}</span>}
                </span>
                <span className="line-clamp-2 block text-sm text-ink-2">{a.text}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => dismissAlert(a.id)}
              aria-label="Dismiss notification"
              className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
            {/* The timer bar: empties over ALERT_MS, then the pop-up is gone. */}
            <div aria-hidden className="h-1 bg-surface-2">
              <div className="alert-timer h-full bg-accent" style={{ animationDuration: `${ALERT_MS}ms` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
