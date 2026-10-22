"use client";

import { useSyncExternalStore } from "react";
import type { Post, PostKind, RideStats } from "@/lib/model";

// Lets any screen open the post composer (e.g. "Share ride" on the Map).
export type ComposerPreset = {
  kind?: PostKind;
  text?: string;
  ride?: RideStats;
  editing?: Post;
};

let current: { open: boolean; preset: ComposerPreset } = { open: false, preset: {} };
const listeners = new Set<() => void>();

export function openComposer(preset: ComposerPreset = {}) {
  current = { open: true, preset };
  listeners.forEach((l) => l());
}

export function closeComposer() {
  current = { open: false, preset: {} };
  listeners.forEach((l) => l());
}

export function useComposer() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
