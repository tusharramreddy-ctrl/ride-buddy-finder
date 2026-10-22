"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Flag, Trash, UserRound } from "lucide-react";
import { riderBike, type DemoRider } from "@/lib/riders";
import { blockRider, deleteConversation, sendDirectMessage, unblockRider, useStore } from "@/lib/store";
import { Avatar, Button, DemoBadge, Notice, toast } from "../ui";
import { ChatHeader, ChatMenu, ConfirmDialog, type MenuItem } from "./ChatParts";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { ReportDialog } from "./ReportDialog";

export function DirectChat({ rider, draft }: { rider: DemoRider; draft: string }) {
  const { state } = useStore();
  const router = useRouter();
  const [dialog, setDialog] = useState<"block" | "report" | "delete" | null>(null);

  const convo = state.conversations.find((c) => c.riderId === rider.id);
  const messages = convo?.messages ?? [];
  const blocked = state.blocked.includes(rider.id);
  const firstName = rider.name.split(" ")[0];

  const menu: MenuItem[] = [
    { label: "View profile", icon: <UserRound aria-hidden className="h-4 w-4" />, onSelect: () => router.push(`/riders/${rider.id}`) },
    ...(convo
      ? [{ label: "Delete chat", icon: <Trash aria-hidden className="h-4 w-4" />, onSelect: () => setDialog("delete") }]
      : []),
    ...(blocked
      ? []
      : [{ label: "Block rider", icon: <Ban aria-hidden className="h-4 w-4" />, onSelect: () => setDialog("block"), danger: true }]),
    { label: "Report rider", icon: <Flag aria-hidden className="h-4 w-4" />, onSelect: () => setDialog("report"), danger: true },
  ];

  return (
    <>
      <ChatHeader actions={<ChatMenu label={`More options for ${rider.name}`} items={menu} />}>
        <Link href={`/riders/${rider.id}`} className="flex min-w-0 items-center gap-3 rounded-xl py-1 pr-2 hover:bg-surface-2">
          <Avatar name={rider.name} seed={rider.id} size={40} />
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold text-ink">{rider.name}</span>
              <DemoBadge />
            </span>
            <span className="block truncate text-xs text-muted">
              {rider.area} · {rider.level} · {riderBike(rider).label}
            </span>
          </span>
        </Link>
      </ChatHeader>

      <MessageList
        label={`Conversation with ${rider.name}`}
        messages={messages}
        state={state}
        top={
          <div className="mb-2">
            <Notice>Demo rider. Messages are saved on this device only and demo riders can&apos;t reply.</Notice>
          </div>
        }
        empty={
          <div className="flex flex-col items-center py-10 text-center">
            <Avatar name={rider.name} seed={rider.id} size={64} />
            <p className="mt-3 font-semibold text-ink">{rider.name}</p>
            <p className="mt-1 max-w-xs text-sm text-muted">{rider.bio}</p>
            {!blocked && <p className="mt-3 text-sm text-ink-2">No messages yet. Say hi to {firstName}.</p>}
          </div>
        }
      />

      {blocked ? (
        <div className="flex flex-col items-start gap-3 border-t border-line bg-surface px-4 py-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-ink-2">
            <Ban aria-hidden className="mr-1.5 inline h-4 w-4 align-[-3px] text-danger" />
            You blocked {rider.name}. Unblock to send messages again.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              unblockRider(rider.id);
              toast(`${rider.name} unblocked`);
            }}
          >
            Unblock
          </Button>
        </div>
      ) : (
        <Composer
          key={rider.id}
          initialText={draft}
          placeholder={`Message ${firstName}`}
          onSend={(text) => sendDirectMessage(rider.id, text)}
        />
      )}

      <ConfirmDialog
        open={dialog === "block"}
        onClose={() => setDialog(null)}
        title="Block rider"
        confirmLabel="Block"
        body={
          <p>
            Block {rider.name}? Their chat and group messages will be hidden on this device and you won&apos;t be able to message
            them. You can unblock them later.
          </p>
        }
        onConfirm={() => {
          blockRider(rider.id);
          router.push("/chat");
          toast(`${rider.name} blocked on this device`);
        }}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title="Delete chat"
        confirmLabel="Delete"
        body={<p>Delete your conversation with {rider.name} from this device? This can&apos;t be undone.</p>}
        onConfirm={() => {
          deleteConversation(rider.id);
          router.push("/chat");
          toast("Chat deleted from this device");
        }}
      />
      <ReportDialog
        open={dialog === "report"}
        onClose={() => setDialog(null)}
        targetType="rider"
        targetId={rider.id}
        subject={rider.name}
      />
    </>
  );
}
