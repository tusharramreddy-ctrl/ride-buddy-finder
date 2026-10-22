"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { setThemePref, useThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: { id: ThemePref; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

// Full control: three options side by side (desktop sidebar).
export function ThemeToggle() {
  const pref = useThemePref();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const on = pref === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setThemePref(id)}
            className={`flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors ${on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            <Icon aria-hidden className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Compact control: one button that steps Light → Dark → System (mobile top bar).
export function ThemeButton({ className = "" }: { className?: string }) {
  const pref = useThemePref();
  const i = OPTIONS.findIndex((o) => o.id === pref);
  const current = OPTIONS[i];
  const next = OPTIONS[(i + 1) % OPTIONS.length];
  const Icon = current.icon;
  return (
    <button
      type="button"
      onClick={() => setThemePref(next.id)}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
      title={`Theme: ${current.label}`}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink ${className}`}
    >
      <Icon aria-hidden className="h-5 w-5" />
    </button>
  );
}
