"use client";

import { useEffect, useRef, useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, LoaderCircle, X } from "lucide-react";

// ---------- Buttons ----------

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "dark";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

const VARIANTS = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover shadow-sm",
  secondary: "bg-surface border border-line-strong text-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-2",
  danger: "text-danger hover:bg-danger-soft",
  dark: "bg-ink text-on-ink hover:bg-ink-2",
};
const SIZES = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm", lg: "h-12 px-5 text-base" };

export function Button({ variant = "primary", size = "md", loading, disabled, children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {loading && <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${active ? "text-accent-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"} ${className}`}
    >
      {children}
    </button>
  );
}

// ---------- Surfaces & labels ----------

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface shadow-sm ${className}`}>{children}</section>;
}

export function DemoBadge({ label = "Demo" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line-strong bg-surface-2 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
      {label}
    </span>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tone === "accent" ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-ink-2"}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink">{children}</h2>
      {action}
    </div>
  );
}

// ---------- Avatars ----------

const AVATAR_COLOURS = ["#2f4858", "#33658a", "#55433b", "#3d5a40", "#6b4e71", "#7a5c3a", "#4a4e69", "#2d6a4f"];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, src, seed, size = 40 }: { name: string; src?: string | null; seed?: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bg = AVATAR_COLOURS[hashString(seed ?? name) % AVATAR_COLOURS.length];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {initials || "?"}
    </span>
  );
}

// ---------- Form fields ----------

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted focus:border-accent-ink focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:bg-surface-2";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function ChoicePills<T extends string>({
  options,
  value,
  onChange,
  multiple,
  label,
}: {
  options: readonly { id: T; label: string; hint?: string }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  multiple?: boolean;
  label: string;
}) {
  const isOn = (id: T) => (Array.isArray(value) ? value.includes(id) : value === id);
  return (
    <div role={multiple ? "group" : "radiogroup"} aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role={multiple ? "checkbox" : "radio"}
          aria-checked={isOn(o.id)}
          title={o.hint}
          onClick={() => onChange(o.id)}
          className={`min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors ${isOn(o.id) ? "border-ink bg-ink text-on-ink" : "border-line-strong bg-surface text-ink-2 hover:border-ink-2"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Tabs ----------

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: readonly { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${value === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-xs font-medium text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- States ----------

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
      <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "accent" }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${tone === "accent" ? "bg-accent-soft text-ink" : "bg-info-soft text-ink-2"}`}>
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
      <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
      {label}
    </span>
  );
}

// ---------- Toasts ----------

type Toast = { id: number; text: string; tone: "success" | "error" | "info" };
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
let toastId = 0;

export function toast(text: string, tone: Toast["tone"] = "success") {
  const t = { id: ++toastId, text, tone };
  toasts = [...toasts, t];
  toastListeners.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    toastListeners.forEach((l) => l());
  }, 3200);
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {list.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-on-ink shadow-md"
        >
          {t.tone === "error" ? (
            <CircleAlert aria-hidden className="h-4 w-4 text-on-ink-accent" />
          ) : t.tone === "info" ? (
            <Info aria-hidden className="h-4 w-4 text-on-ink-accent" />
          ) : (
            <CircleCheck aria-hidden className="h-4 w-4 text-on-ink-accent" />
          )}
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ---------- Dialog ----------

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-md backdrop:bg-black/40 ${wide ? "max-w-2xl" : "max-w-lg"}`}
    >
      {open && (
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
            <h2 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h2>
            <IconButton label="Close" onClick={onClose}>
              <X className="h-5 w-5" />
            </IconButton>
          </div>
          <div className="p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

// ---------- Network helper ----------

// Calls one of our API routes and always comes back with either data or a
// friendly message. It never throws, so screens can't crash on a bad response.
export async function postJson<T>(
  url: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json) return { ok: true, data: json as T };
    return {
      ok: false,
      error: json?.error ?? "Something went wrong on our side. Please try again.",
      fieldErrors: json?.fieldErrors,
    };
  } catch {
    return { ok: false, error: "We couldn't reach the server. Check your internet connection and try again." };
  }
}

// ---------- Time ----------

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
