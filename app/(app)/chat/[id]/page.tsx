"use client";

import { use } from "react";
import { ChatFrame } from "@/components/chat/ChatFrame";
import { ChatNotFound } from "@/components/chat/ChatParts";
import { DirectChat } from "@/components/chat/DirectChat";
import { GroupChat } from "@/components/chat/GroupChat";
import { parseChatId } from "@/components/chat/chat-utils";

// /chat/dm-<riderId>  direct conversation with a demo rider
// /chat/g-<groupId>   group chat
// Optional ?draft=<text> pre-fills the message box (never sent automatically).
export default function ChatThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const rawDraft = query.draft;
  const draft = typeof rawDraft === "string" ? rawDraft : "";
  const target = parseChatId(id);

  return (
    <ChatFrame selectedId={target.kind === "invalid" ? "invalid" : target.id}>
      {target.kind === "dm" ? (
        <DirectChat key={target.id} rider={target.rider} draft={draft} />
      ) : target.kind === "group" ? (
        <GroupChat key={target.id} group={target.group} draft={draft} />
      ) : (
        <ChatNotFound />
      )}
    </ChatFrame>
  );
}
