"use client";

import { ChatFrame } from "@/components/chat/ChatFrame";
import { ChatPlaceholder } from "@/components/chat/ChatParts";

// /chat: conversation & group list (desktop shows an empty state on the right).
export default function ChatPage() {
  return (
    <ChatFrame selectedId={null}>
      <ChatPlaceholder />
    </ChatFrame>
  );
}
