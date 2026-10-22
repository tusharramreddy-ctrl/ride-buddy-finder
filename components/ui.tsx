import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

const VARIANTS = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface border border-border text-foreground hover:bg-surface-muted",
  ghost: "text-muted hover:text-foreground hover:bg-surface-muted",
  danger: "text-danger hover:bg-danger-soft",
};

export function Button({ variant = "primary", loading, disabled, children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANTS[variant]} ${className}`}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-surface p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
      {children}
    </p>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-danger">{message}</p>;
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted">
      Fictional demo profile
    </span>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

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
