"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, Ellipsis, MessageCircle, SearchX } from "lucide-react";
import { Button, Dialog } from "../ui";

export function ChatHeader({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex min-h-16 items-center gap-2 border-b border-line bg-surface px-2 py-2 sm:px-4">
      <Link
        href="/chat"
        aria-label="Back to all chats"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <ArrowLeft aria-hidden className="h-5 w-5" />
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}

export type MenuItem = { label: string; icon: ReactNode; onSelect: () => void; danger?: boolean };

// Small accessible overflow menu (button + list of actions).
export function ChatMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    wrap.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMenuKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const els = [...(wrap.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
    els[next]?.focus();
  }

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <Ellipsis aria-hidden className="h-5 w-5" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="absolute right-0 top-11 z-30 min-w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-md"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium focus:outline-none focus-visible:bg-surface-2 ${item.danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-surface-2"}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="text-sm text-ink-2">{body}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="dark"
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

export function ChatPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <span aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-on-ink-accent">
          <MessageCircle className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-wide text-ink">Your messages</h2>
        <p className="mt-2 text-sm text-muted">
          Pick a conversation or group on the left, or start a new message. Riders marked Demo are fictional and
          can&apos;t reply.
        </p>
      </div>
    </div>
  );
}

export function ChatNotFound() {
  return (
    <>
      <ChatHeader>
        <span className="font-semibold text-ink">Chat not found</span>
      </ChatHeader>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <span aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
            <SearchX className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold uppercase tracking-wide text-ink">We can&apos;t find that chat</h2>
          <p className="mt-2 text-sm text-muted">The link may be mistyped, or the rider or group doesn&apos;t exist.</p>
          <Link
            href="/chat"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-on-ink hover:bg-ink-2"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" /> Back to chats
          </Link>
        </div>
      </div>
    </>
  );
}
