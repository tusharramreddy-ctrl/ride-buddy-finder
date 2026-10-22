"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { RIDERS, riderBike } from "@/lib/riders";
import { useStore } from "@/lib/store";
import { Avatar, DemoBadge, Dialog, inputClass } from "../ui";
import { dmHref, matches } from "./chat-utils";

// Pick a demo rider to message. Opening the conversation doesn't save
// anything; it's created when the first message is sent.
export function NewMessageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const riders = RIDERS.filter((r) => !state.blocked.includes(r.id)).filter((r) =>
    matches(query, r.name, r.username, r.area, riderBike(r).label),
  );

  function close() {
    setQuery("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title="New message">
      <p className="text-sm text-muted">
        All riders here are fictional demo profiles. You can write to them, but they can&apos;t reply.
      </p>
      <div className="relative mt-3">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, area or bike"
          aria-label="Search demo riders"
          className={`${inputClass} pl-9`}
        />
      </div>
      {riders.length === 0 ? (
        <p role="status" className="py-6 text-center text-sm text-muted">
          No riders match that search.
        </p>
      ) : (
        <ul className="mt-3 max-h-[50vh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {riders.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  close();
                  router.push(dmHref(r.id));
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <Avatar name={r.name} seed={r.id} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-ink">{r.name}</span>
                    <DemoBadge />
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {r.area} · {r.level} · {riderBike(r).label}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
