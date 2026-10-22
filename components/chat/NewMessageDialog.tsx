"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { bikeInfo } from "@/lib/bikes";
import { isCloud } from "@/lib/people";
import { RIDERS, riderBike } from "@/lib/riders";
import { loadDirectory, useStore } from "@/lib/store";
import { Avatar, DemoBadge, Dialog, inputClass } from "../ui";
import { dmHref, matches } from "./chat-utils";

type Row = { id: string; name: string; avatar: string | null; subtitle: string; demo: boolean; search: string[] };

// Pick a rider to message: real riders first (with accounts), then demo riders.
// Opening the conversation doesn't save anything; the first message does.
export function NewMessageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const cloud = isCloud(state);

  useEffect(() => {
    if (open) loadDirectory();
  }, [open]);

  const real: Row[] = Object.values(state.profiles).map((p) => {
    const bike = p.primaryBike ? bikeInfo(p.primaryBike).label : null;
    return {
      id: p.id,
      name: p.displayName,
      avatar: p.avatar,
      subtitle: [p.region, p.level, bike].filter(Boolean).join(" · "),
      demo: false,
      search: [p.displayName, p.username, p.region ?? "", bike ?? ""],
    };
  });
  const demo: Row[] = RIDERS.map((r) => ({
    id: r.id,
    name: r.name,
    avatar: null,
    subtitle: `${r.area} · ${r.level} · ${riderBike(r).label}`,
    demo: true,
    search: [r.name, r.username, r.area, riderBike(r).label],
  }));
  const rows = [...real, ...demo].filter((r) => !state.blocked.includes(r.id)).filter((r) => matches(query, ...r.search));

  function close() {
    setQuery("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title="New message">
      <p className="text-sm text-muted">
        {cloud
          ? "Message riders with Ride Buddy accounts. Riders marked Demo are fictional and can't reply."
          : "All riders here are fictional demo profiles. You can write to them, but they can't reply."}
      </p>
      <div className="relative mt-3">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, area or bike"
          aria-label="Search riders"
          className={`${inputClass} pl-9`}
        />
      </div>
      {rows.length === 0 ? (
        <p role="status" className="py-6 text-center text-sm text-muted">
          No riders match that search.
        </p>
      ) : (
        <ul className="mt-3 max-h-[50vh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  close();
                  router.push(dmHref(r.id));
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <Avatar name={r.name} src={r.avatar} seed={r.id} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-ink">{r.name}</span>
                    {r.demo && <DemoBadge />}
                  </span>
                  {r.subtitle && <span className="block truncate text-xs text-muted">{r.subtitle}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
