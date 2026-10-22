"use client";

import type { CSSProperties, ReactNode } from "react";
import { ChatList } from "./ChatList";

// Two-column chat layout. Desktop: list on the left, conversation on the right.
// Mobile: /chat shows only the list, /chat/[id] shows only the conversation.
// The frame fills the space between the mobile top bar and bottom nav
// (or the full viewport height on desktop), cancelling <main>'s bottom padding
// so the composer stays pinned just above the bottom navigation.
export function ChatFrame({ selectedId, children }: { selectedId: string | null; children: ReactNode }) {
  return (
    <div
      // 55px = mobile top bar, 4rem = mobile bottom nav (plus the device's safe area).
      style={{ "--chat-h": "calc(100dvh - 55px - 4rem - env(safe-area-inset-bottom, 0px))" } as CSSProperties}
      className="-mb-24 flex h-(--chat-h) min-h-[22rem] lg:-mb-10 lg:h-dvh"
    >
      <div
        className={`${selectedId ? "hidden lg:flex" : "flex"} w-full min-w-0 flex-col border-line bg-surface lg:w-[340px] lg:shrink-0 lg:border-r`}
      >
        <ChatList selectedId={selectedId} />
      </div>
      <div className={`${selectedId ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col bg-bg`}>{children}</div>
    </div>
  );
}
