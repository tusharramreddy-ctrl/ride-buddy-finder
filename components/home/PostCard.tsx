"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Ellipsis, EyeOff, Flag, Heart, MapPin, MessageSquare, Pencil, Share2, Trash } from "lucide-react";
import { bikeInfo } from "@/lib/bikes";
import { DEMO_COMMENTS } from "@/lib/demo";
import { formatMinutes } from "@/lib/geo";
import { ME, POST_KINDS, type Comment, type Post } from "@/lib/model";
import { personFor } from "@/lib/people";
import { addComment, deleteComment, deletePost, hidePost, report, toggleLike, useStore } from "@/lib/store";
import { RoutePreview } from "../RoutePreview";
import { openComposer } from "../shell/composer-state";
import { Avatar, Button, Card, Chip, DemoBadge, Dialog, IconButton, timeAgo, toast } from "../ui";

const KIND_LABEL = Object.fromEntries(POST_KINDS.map((k) => [k.id, k.label]));

export function PostCard({ post }: { post: Post }) {
  const { state } = useStore();
  const author = personFor(post.authorId, state);
  const mine = post.authorId === ME;
  const liked = state.likes.includes(post.id);
  const likeCount = post.baseLikes + (liked ? 1 : 0);
  const comments = [...DEMO_COMMENTS.filter((c) => c.postId === post.id), ...state.comments.filter((c) => c.postId === post.id)]
    .filter((c) => !state.blocked.includes(c.authorId))
    .sort((a, b) => a.createdAt - b.createdAt);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const bike = post.bike ? bikeInfo(post.bike) : null;
  const isRide = post.kind === "ride" && post.ride;

  async function share() {
    const text = `${author.name} on Ride Buddy: ${post.text}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ride Buddy", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast("Post text copied, ready to paste");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // user closed the share sheet
      toast("Couldn't share or copy on this browser", "error");
    }
  }

  return (
    <Card className="overflow-hidden">
      <article aria-label={`Post by ${author.name}`}>
        <header className="flex items-start gap-3 px-4 pt-4 sm:px-5">
          <Link href={author.href} aria-label={`${author.name}'s profile`}>
            <Avatar name={author.name} src={author.avatar} seed={author.id} size={44} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Link href={author.href} className="font-semibold hover:underline">
                {author.name}
              </Link>
              {author.demo && <DemoBadge />}
              <span className="text-sm text-muted">
                · <time dateTime={new Date(post.createdAt).toISOString()}>{timeAgo(post.createdAt)}</time>
                {post.editedAt && " · edited"}
              </span>
            </div>
            <p className="text-sm text-muted">
              {KIND_LABEL[post.kind]}
              {bike && ` · ${bike.label}`}
            </p>
          </div>
          <div className="relative">
            <IconButton label="Post options" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
              <Ellipsis className="h-5 w-5" />
            </IconButton>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-md"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {mine ? (
                  <>
                    <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => (setMenuOpen(false), openComposer({ editing: post }))}>
                      Edit post
                    </MenuItem>
                    <MenuItem icon={<Trash className="h-4 w-4" />} danger onClick={() => (setMenuOpen(false), setConfirmDelete(true))}>
                      Delete post
                    </MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem
                      icon={<EyeOff className="h-4 w-4" />}
                      onClick={() => {
                        setMenuOpen(false);
                        hidePost(post.id);
                        toast("Post hidden from your feed");
                      }}
                    >
                      Hide post
                    </MenuItem>
                    <MenuItem icon={<Flag className="h-4 w-4" />} onClick={() => (setMenuOpen(false), setReporting(true))}>
                      Report post
                    </MenuItem>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <p className="whitespace-pre-line px-4 pt-3 text-[15px] leading-relaxed sm:px-5">{post.text}</p>

        {isRide && (
          <div className="mx-4 mt-3 overflow-hidden rounded-xl border border-line sm:mx-5">
            <div className="grid grid-cols-3 divide-x divide-line bg-surface">
              <Stat label="Distance" value={`${post.ride!.distanceKm.toFixed(1)} km`} />
              <Stat label="Time" value={formatMinutes(post.ride!.durationMin)} />
              <Stat
                label="Avg speed"
                value={post.ride!.durationMin > 0 ? `${((post.ride!.distanceKm / post.ride!.durationMin) * 60).toFixed(0)} km/h` : "—"}
              />
            </div>
            {post.ride!.route ? (
              <RoutePreview route={post.ride!.route} className="h-48 w-full" />
            ) : (
              <p className="border-t border-line bg-surface-2 px-4 py-2 text-xs text-muted">Distance and time entered by the rider. No GPS route.</p>
            )}
            {post.demo && post.ride!.route && <p className="border-t border-line bg-surface-2 px-4 py-1.5 text-[11px] text-muted">Demo route for illustration</p>}
          </div>
        )}

        {post.plan && (
          <div className="mx-4 mt-3 flex flex-wrap gap-2 sm:mx-5">
            <Chip tone="accent">
              <CalendarDays className="h-3.5 w-3.5" /> {post.plan.when}
            </Chip>
            {post.plan.area && (
              <Chip>
                <MapPin className="h-3.5 w-3.5" /> {post.plan.area}
              </Chip>
            )}
          </div>
        )}

        {post.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image} alt="" className="mt-3 max-h-[480px] w-full border-y border-line object-cover" />
        )}

        <footer className="mt-2 flex items-center gap-1 px-2 pb-2 sm:px-3">
          <IconButton
            label={liked ? "Unlike" : "Like"}
            active={liked}
            aria-pressed={liked}
            onClick={() => toggleLike(post.id)}
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-accent text-accent-ink" : ""}`} />
            <span>{likeCount}</span>
          </IconButton>
          <IconButton label="Comments" aria-expanded={showComments} onClick={() => setShowComments((s) => !s)}>
            <MessageSquare className="h-5 w-5" />
            <span>{comments.length}</span>
          </IconButton>
          <IconButton label="Share" onClick={share}>
            <Share2 className="h-5 w-5" />
          </IconButton>
        </footer>

        {showComments && <Comments postId={post.id} comments={comments} />}
      </article>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete post?">
        <p className="text-sm text-ink-2">This removes the post and its comments from this device. It can&apos;t be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="dark"
            onClick={() => {
              deletePost(post.id);
              setConfirmDelete(false);
              toast("Post deleted");
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>

      <ReportDialog
        open={reporting}
        onClose={() => setReporting(false)}
        onSubmit={(reason) => {
          report({ targetType: "post", targetId: post.id, reason });
          hidePost(post.id);
          setReporting(false);
          toast("Report saved on this device and post hidden (prototype: no moderation team)");
        }}
      />
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-2xl font-bold leading-tight">{value}</p>
    </div>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm hover:bg-surface-2 ${danger ? "text-danger" : "text-ink"}`}
    >
      {icon}
      {children}
    </button>
  );
}

function Comments({ postId, comments }: { postId: string; comments: Comment[] }) {
  const { state } = useStore();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return setError("Write a comment first.");
    if (body.length > 500) return setError("Comments can be up to 500 characters.");
    addComment(postId, body);
    setText("");
    setError("");
  }

  return (
    <div className="border-t border-line bg-surface-2/50 px-4 py-3 sm:px-5">
      {comments.length === 0 && <p className="pb-2 text-sm text-muted">No comments yet. Start the conversation.</p>}
      <ul className="space-y-3">
        {comments.map((c) => {
          const who = personFor(c.authorId, state);
          return (
            <li key={c.id} className="flex gap-2.5">
              <Link href={who.href} aria-label={`${who.name}'s profile`}>
                <Avatar name={who.name} src={who.avatar} seed={who.id} size={30} />
              </Link>
              <div className="min-w-0 flex-1 rounded-xl bg-surface px-3 py-2">
                <p className="text-sm">
                  <Link href={who.href} className="font-semibold hover:underline">
                    {who.name}
                  </Link>{" "}
                  <span className="text-xs text-muted">· {timeAgo(c.createdAt)}</span>
                </p>
                <p className="text-sm text-ink-2">{c.text}</p>
              </div>
              {c.authorId === ME && (
                <IconButton label="Delete comment" onClick={() => (deleteComment(c.id), toast("Comment deleted"))}>
                  <Trash className="h-4 w-4" />
                </IconButton>
              )}
            </li>
          );
        })}
      </ul>
      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <label htmlFor={`comment-${postId}`} className="sr-only">
          Add a comment
        </label>
        <input
          id={`comment-${postId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={520}
          placeholder="Add a comment…"
          className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-4 text-sm focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <Button type="submit" size="sm" disabled={!text.trim()}>
          Reply
        </Button>
      </form>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}

const REPORT_REASONS = ["Spam or scam", "Harassment or hate", "Unsafe riding promoted", "Shares someone's private location", "Something else"];

export function ReportDialog({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  return (
    <Dialog open={open} onClose={onClose} title="Report">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm text-ink-2">What&apos;s wrong with it?</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm has-[:checked]:border-ink">
            <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--ink)]" />
            {r}
          </label>
        ))}
      </fieldset>
      <p className="mt-4 text-xs text-muted">Prototype: reports are saved on this device only. No moderation team reviews them yet.</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="dark" onClick={() => onSubmit(reason)}>
          Submit report
        </Button>
      </div>
    </Dialog>
  );
}
