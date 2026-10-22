"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Ban, Flag, Trash, UserRound } from "lucide-react";
import { isCloud } from "@/lib/people";
import { blockRider, deleteConversation, loadProfile, sendDirectMessage, unblockRider, useStore } from "@/lib/store";
import { Avatar, Button, DemoBadge, Notice, Spinner, toast } from "../ui";
import { ChatHeader, ChatMenu, ChatNotFound, ConfirmDialog, type MenuItem } from "./ChatParts";
import { partnerFor } from "./chat-utils";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { ReportDialog } from "./ReportDialog";

export function DirectChat({ partnerId, draft }: { partnerId: string; draft: string }) {
  const { state } = useStore();
  const router = useRouter();
  const [dialog, setDialog] = useState<"block" | "report" | "delete" | null>(null);
  const partner = partnerFor(partnerId, state);
  const cloud = isCloud(state);

  useEffect(() => {
    if (!partner) loadProfile(partnerId);
  }, [partner, partnerId]);

  if (!partner) {
    // A real rider's profile we haven't loaded yet, or an id that doesn't exist.
    return cloud ? (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading conversation" />
      </div>
    ) : (
      <ChatNotFound />
    );
  }

  const convo = state.conversations.find((c) => c.riderId === partner.id);
  const messages = convo?.messages ?? [];
  const blocked = state.blocked.includes(partner.id);
  const firstName = partner.name.split(" ")[0];
  const where = cloud ? "" : " on this device";

  const notice = partner.demo
    ? cloud
      ? "Demo rider. They can't reply. Your messages are saved to your account."
      : "Demo rider. Messages are saved on this device only and demo riders can't reply."
    : `Only you and ${firstName} can read this conversation.`;

  const menu: MenuItem[] = [
    { label: "View profile", icon: <UserRound aria-hidden className="h-4 w-4" />, onSelect: () => router.push(`/riders/${partner.id}`) },
    ...(convo?.messages.some((m) => m.from === "me")
      ? [{ label: "Delete my messages", icon: <Trash aria-hidden className="h-4 w-4" />, onSelect: () => setDialog("delete") }]
      : []),
    ...(blocked
      ? []
      : [{ label: "Block rider", icon: <Ban aria-hidden className="h-4 w-4" />, onSelect: () => setDialog("block"), danger: true }]),
    { label: "Report rider", icon: <Flag aria-hidden className="h-4 w-4" />, onSelect: () => setDialog("report"), danger: true },
  ];

  return (
    <>
      <ChatHeader actions={<ChatMenu label={`More options for ${partner.name}`} items={menu} />}>
        <Link href={`/riders/${partner.id}`} className="flex min-w-0 items-center gap-3 rounded-xl py-1 pr-2 hover:bg-surface-2">
          <Avatar name={partner.name} src={partner.avatar} seed={partner.id} size={40} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold text-ink">{partner.name}</span>
              {partner.demo && <DemoBadge />}
            </span>
            {partner.subtitle && <span className="block truncate text-xs text-muted">{partner.subtitle}</span>}
          </span>
        </Link>
      </ChatHeader>

      <MessageList
        label={`Conversation with ${partner.name}`}
        messages={messages}
        state={state}
        top={
          <div className="mb-2">
            <Notice>{notice}</Notice>
          </div>
        }
        empty={
          <div className="flex flex-col items-center py-10 text-center">
            <Avatar name={partner.name} src={partner.avatar} seed={partner.id} size={64} />
            <p className="mt-3 font-semibold text-ink">{partner.name}</p>
            {partner.bio && <p className="mt-1 max-w-xs text-sm text-muted">{partner.bio}</p>}
            {!blocked && <p className="mt-3 text-sm text-ink-2">No messages yet. Say hi to {firstName}.</p>}
          </div>
        }
      />

      {blocked ? (
        <div className="flex flex-col items-start gap-3 border-t border-line bg-surface px-4 py-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-ink-2">
            <Ban aria-hidden className="mr-1.5 inline h-4 w-4 align-[-3px] text-danger" />
            You blocked {partner.name}. Unblock to send messages again.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              unblockRider(partner.id);
              toast(`${partner.name} unblocked`);
            }}
          >
            Unblock
          </Button>
        </div>
      ) : (
        <Composer
          key={partner.id}
          initialText={draft}
          placeholder={`Message ${firstName}`}
          onSend={(text) => sendDirectMessage(partner.id, text)}
        />
      )}

      <ConfirmDialog
        open={dialog === "block"}
        onClose={() => setDialog(null)}
        title="Block rider"
        confirmLabel="Block"
        body={
          <p>
            Block {partner.name}? Their posts, chat and group messages will be hidden for you
            {partner.demo ? "" : ", and they won't be able to message you"}. You can unblock them later.
          </p>
        }
        onConfirm={() => {
          blockRider(partner.id);
          router.push("/chat");
          toast(`${partner.name} blocked`);
        }}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title="Delete my messages"
        confirmLabel="Delete"
        body={
          <p>
            Delete the messages you sent to {partner.name}
            {where}?{!partner.demo && " Messages they sent you stay with them."} This can&apos;t be undone.
          </p>
        }
        onConfirm={() => {
          deleteConversation(partner.id);
          router.push("/chat");
          toast("Your messages were deleted");
        }}
      />
      <ReportDialog open={dialog === "report"} onClose={() => setDialog(null)} targetType="rider" targetId={partner.id} subject={partner.name} />
    </>
  );
}
