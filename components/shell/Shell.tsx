"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { House, Map as MapIcon, MessageCircle, Plus, Route, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { Logo } from "../Brand";
import { Avatar, Button, ErrorMessage, Toaster } from "../ui";
import { ComposerDialog } from "../home/Composer";
import { Welcome } from "./Welcome";
import { openComposer } from "./composer-state";

const NAV = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" || p.startsWith("/find") || p.startsWith("/riders") },
  { href: "/chat", label: "Chat", icon: MessageCircle, match: (p: string) => p.startsWith("/chat") },
  { href: "/map", label: "Map", icon: MapIcon, match: (p: string) => p.startsWith("/map") },
  { href: "/profile", label: "Profile", icon: User, match: (p: string) => p.startsWith("/profile") },
];

export function Shell({ children }: { children: ReactNode }) {
  const { state, saveError } = useStore();
  const pathname = usePathname();

  if (!state.me) return <Welcome />;
  const me = state.me;
  const onMap = pathname.startsWith("/map");

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link href="/" className="px-2" aria-label="Ride Buddy home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors ${active ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
              >
                <Icon aria-hidden className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => openComposer()} size="lg">
            <Plus className="h-5 w-5" /> New post
          </Button>
          <Link
            href="/map"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong text-sm font-semibold text-ink hover:bg-surface-2"
          >
            <Route className="h-4 w-4" /> Start a ride
          </Link>
        </div>
        <div className="mt-auto space-y-3">
          <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-muted">
            <strong className="text-ink-2">Prototype.</strong> Your profile, posts, chats and rides are saved on this device
            only. Other riders are fictional demo profiles.
          </p>
          <Link href="/profile" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
            <Avatar name={me.displayName} src={me.avatar} seed="me" size={36} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{me.displayName}</span>
              <span className="block truncate text-xs text-muted">@{me.username}</span>
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile top bar (not on the full-screen map) */}
      {!onMap && (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <Link href="/" aria-label="Ride Buddy home">
            <Logo size={30} />
          </Link>
          <Link href="/profile" aria-label="Your profile">
            <Avatar name={me.displayName} src={me.avatar} seed="me" size={34} />
          </Link>
        </header>
      )}

      <main className={`min-w-0 flex-1 ${onMap ? "" : "pb-24 lg:pb-10"}`}>
        {saveError && (
          <div className="mx-auto max-w-5xl px-4 pt-4">
            <ErrorMessage>{saveError}</ErrorMessage>
          </div>
        )}
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${active ? "text-ink" : "text-muted"}`}
            >
              <span className={`flex h-8 w-12 items-center justify-center rounded-full ${active ? "bg-accent" : ""}`}>
                <Icon aria-hidden className="h-5 w-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <ComposerDialog />
      <Toaster />
    </div>
  );
}
