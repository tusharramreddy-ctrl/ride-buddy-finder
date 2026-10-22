"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-script";

// Light / dark / follow-the-system theme. The choice is a per-device
// convenience, so it lives in localStorage (separate from app data).
// THEME_SCRIPT (lib/theme-script.ts, in the root layout) applies it before
// the first paint; this file handles switching afterwards.

export type ThemePref = "light" | "dark" | "system";
const THEME_COLOURS = { light: "#f6f3ee", dark: "#121314" };

function systemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readPref(): ThemePref {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const resolved = pref === "system" ? (systemDark() ? "dark" : "light") : pref;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOURS[resolved]);
}

let pref: ThemePref | null = null;
const listeners = new Set<() => void>();

export function setThemePref(next: ThemePref) {
  pref = next;
  try {
    if (next === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
  apply(next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Follow the system setting live while "system" is chosen.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if ((pref ?? readPref()) === "system") apply("system");
  };
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(listener);
    mq.removeEventListener("change", onChange);
  };
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    subscribe,
    () => (pref ??= readPref()),
    () => "system",
  );
}
