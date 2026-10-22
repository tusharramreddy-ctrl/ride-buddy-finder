"use client";

import { useSyncExternalStore } from "react";
import { emptyState, ME, newId, type AppState, type Comment, type GarageBike, type MeProfile, type Message, type Post, type Report, type Ride } from "./model";

// PROTOTYPE STORAGE: everything is saved in this browser's localStorage.
// It is not a real account, nothing is shared with other people or devices,
// and clearing site data deletes it. A real backend would replace this file.

const KEY = "ride-buddy-v2";

let state: AppState = emptyState();
let loaded = false;
let saveError: string | null = null;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) throw new Error("unknown version");
    // Merge onto a fresh state so missing fields get safe defaults.
    state = { ...emptyState(), ...parsed };
  } catch {
    state = emptyState();
    saveError = "We couldn't read your saved data on this device, so the app started fresh.";
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    saveError = null;
  } catch {
    saveError =
      "This browser's storage is full or blocked, so your latest change may not be saved. Try removing a photo or two.";
  }
}

function update(fn: (s: AppState) => AppState) {
  load();
  state = fn(state);
  persist();
  snapshot = { state, saveError };
  listeners.forEach((l) => l());
}

type Snapshot = { state: AppState; saveError: string | null };
let snapshot: Snapshot = { state, saveError };

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Snapshot {
  if (!loaded) {
    load();
    snapshot = { state, saveError };
  }
  return snapshot;
}

const serverSnapshot: Snapshot = { state: emptyState(), saveError: null };

export function useStore(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function readState(): AppState {
  return getSnapshot().state;
}

// ---- Profile & garage ----

export function saveMe(me: MeProfile) {
  update((s) => ({ ...s, me }));
}

export function addBike(bike: Omit<GarageBike, "id" | "addedAt" | "primary">, makePrimary: boolean): string {
  const id = newId("bike");
  update((s) => {
    const primary = makePrimary || s.garage.length === 0;
    const garage = s.garage.map((b) => (primary ? { ...b, primary: false } : b));
    return { ...s, garage: [...garage, { ...bike, id, addedAt: Date.now(), primary }] };
  });
  return id;
}

export function updateBike(id: string, patch: Partial<Omit<GarageBike, "id">>) {
  update((s) => ({ ...s, garage: s.garage.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
}

export function setPrimaryBike(id: string) {
  update((s) => ({ ...s, garage: s.garage.map((b) => ({ ...b, primary: b.id === id })) }));
}

export function removeBike(id: string) {
  update((s) => {
    const garage = s.garage.filter((b) => b.id !== id);
    if (garage.length && !garage.some((b) => b.primary)) garage[0] = { ...garage[0], primary: true };
    return { ...s, garage };
  });
}

// ---- Posts, comments, likes ----

export function createPost(input: Omit<Post, "id" | "authorId" | "createdAt" | "editedAt" | "demo" | "baseLikes">): string {
  const id = newId("post");
  update((s) => ({
    ...s,
    posts: [{ ...input, id, authorId: ME, createdAt: Date.now(), editedAt: null, demo: false, baseLikes: 0 }, ...s.posts],
  }));
  return id;
}

export function editPost(id: string, patch: Partial<Pick<Post, "text" | "image" | "kind" | "bike" | "plan">>) {
  update((s) => ({
    ...s,
    posts: s.posts.map((p) => (p.id === id && p.authorId === ME ? { ...p, ...patch, editedAt: Date.now() } : p)),
  }));
}

export function deletePost(id: string) {
  update((s) => ({
    ...s,
    posts: s.posts.filter((p) => !(p.id === id && p.authorId === ME)),
    comments: s.comments.filter((c) => c.postId !== id),
    likes: s.likes.filter((l) => l !== id),
    rides: s.rides.map((r) => (r.sharedPostId === id ? { ...r, sharedPostId: null } : r)),
  }));
}

export function toggleLike(postId: string) {
  update((s) => ({
    ...s,
    likes: s.likes.includes(postId) ? s.likes.filter((l) => l !== postId) : [...s.likes, postId],
  }));
}

export function addComment(postId: string, text: string): Comment {
  const comment: Comment = { id: newId("c"), postId, authorId: ME, text, createdAt: Date.now(), demo: false };
  update((s) => ({ ...s, comments: [...s.comments, comment] }));
  return comment;
}

export function deleteComment(id: string) {
  update((s) => ({ ...s, comments: s.comments.filter((c) => !(c.id === id && c.authorId === ME)) }));
}

export function hidePost(postId: string) {
  update((s) => ({ ...s, hiddenPosts: [...new Set([...s.hiddenPosts, postId])] }));
}

// ---- Direct messages (with demo riders) ----

export function sendDirectMessage(riderId: string, text: string) {
  const msg: Message = { id: newId("m"), from: ME, text, at: Date.now(), demo: false };
  update((s) => {
    const existing = s.conversations.find((c) => c.riderId === riderId);
    const conversations = existing
      ? s.conversations.map((c) => (c.riderId === riderId ? { ...c, messages: [...c.messages, msg], updatedAt: msg.at } : c))
      : [...s.conversations, { riderId, messages: [msg], updatedAt: msg.at }];
    return { ...s, conversations };
  });
}

export function startConversation(riderId: string) {
  update((s) =>
    s.conversations.some((c) => c.riderId === riderId)
      ? s
      : { ...s, conversations: [...s.conversations, { riderId, messages: [], updatedAt: Date.now() }] },
  );
}

export function deleteConversation(riderId: string) {
  update((s) => ({ ...s, conversations: s.conversations.filter((c) => c.riderId !== riderId) }));
}

// ---- Groups ----

export function joinGroup(groupId: string) {
  update((s) => ({ ...s, joinedGroups: [...new Set([...s.joinedGroups, groupId])] }));
}

export function leaveGroup(groupId: string) {
  update((s) => ({ ...s, joinedGroups: s.joinedGroups.filter((g) => g !== groupId) }));
}

export function sendGroupMessage(groupId: string, text: string) {
  const msg: Message = { id: newId("gm"), from: ME, text, at: Date.now(), demo: false };
  update((s) => ({ ...s, groupMessages: { ...s.groupMessages, [groupId]: [...(s.groupMessages[groupId] ?? []), msg] } }));
}

// ---- Safety: block & report (prototype: only affects this device) ----

export function blockRider(riderId: string) {
  update((s) => ({ ...s, blocked: [...new Set([...s.blocked, riderId])] }));
}

export function unblockRider(riderId: string) {
  update((s) => ({ ...s, blocked: s.blocked.filter((b) => b !== riderId) }));
}

export function report(r: Omit<Report, "at">) {
  update((s) => ({ ...s, reports: [...s.reports, { ...r, at: Date.now() }] }));
}

// ---- Rides ----

export function saveRide(ride: Omit<Ride, "id" | "sharedPostId">): string {
  const id = newId("ride");
  update((s) => ({ ...s, rides: [{ ...ride, id, sharedPostId: null }, ...s.rides] }));
  return id;
}

export function updateRide(id: string, patch: Partial<Pick<Ride, "title" | "notes" | "bikeId" | "sharedPostId">>) {
  update((s) => ({ ...s, rides: s.rides.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
}

export function deleteRide(id: string) {
  update((s) => ({ ...s, rides: s.rides.filter((r) => r.id !== id) }));
}

// ---- Everything ----

export function resetEverything() {
  update(() => emptyState());
}
