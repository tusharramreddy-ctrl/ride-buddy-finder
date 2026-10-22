"use client";

import { useSyncExternalStore } from "react";
import * as cloud from "./cloud";
import type { CharacterId } from "./constants";
import {
  emptyState,
  isUuid,
  ME,
  newId,
  type AppState,
  type Comment,
  type GarageBike,
  type MeProfile,
  type Message,
  type Post,
  type Report,
  type Ride,
} from "./model";
import { supabase, supabaseConfigured } from "./supabase";

// The app's single store. Two modes:
// - device: the original prototype; everything saved in this browser.
// - cloud:  Supabase accounts. Changes appear instantly, then save to the
//           database in order; if a save fails, we say so and reload.

const DEVICE_KEY = "ride-buddy-v2"; // device-mode data (also the source for "import")
const HIDDEN_KEY = "ride-buddy-hidden"; // cloud mode: posts you hid, per device

let state: AppState = emptyState();
let started = false;
let saveError: string | null = null;
const listeners = new Set<() => void>();

type Snapshot = { state: AppState; saveError: string | null };
let snapshot: Snapshot = { state, saveError };

function emit() {
  snapshot = { state, saveError };
  listeners.forEach((l) => l());
}

function isCloud() {
  return state.auth.mode === "cloud";
}

function uid(): string | null {
  return state.auth.mode === "cloud" && state.auth.status === "signed-in" ? state.auth.userId : null;
}

// ---------------------------------------------------------------- start-up

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (supabaseConfigured && supabase) {
    state = { ...emptyState(), auth: { mode: "cloud", status: "loading", userId: null, email: null }, hiddenPosts: readHidden() };
    supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      if (!user) {
        stopLive();
        state = { ...emptyState(), auth: { mode: "cloud", status: "signed-out", userId: null, email: null }, hiddenPosts: readHidden() };
        emit();
        return;
      }
      if (state.auth.mode === "cloud" && state.auth.userId === user.id && state.auth.status === "signed-in") return;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      suggested = {
        name: typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null,
        avatar: typeof meta.avatar_url === "string" ? meta.avatar_url : typeof meta.picture === "string" ? meta.picture : null,
      };
      // Defer database calls out of the auth callback, as Supabase recommends.
      setTimeout(() => void signedIn(user.id, user.email ?? null), 0);
    });
    return;
  }
  // Device mode: load what's saved in this browser.
  try {
    const raw = window.localStorage.getItem(DEVICE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version !== 1) throw new Error("unknown version");
      state = { ...emptyState(), ...parsed, auth: { mode: "device" } };
    }
  } catch {
    state = emptyState();
    saveError = "We couldn't read your saved data on this device, so the app started fresh.";
  }
}

let suggested: { name: string | null; avatar: string | null } = { name: null, avatar: null };

async function signedIn(userId: string, email: string | null) {
  const auth = (status: "loading" | "signed-in") =>
    ({ mode: "cloud", status, userId, email, suggestedName: suggested.name, suggestedAvatar: suggested.avatar }) as const;
  state = { ...state, auth: auth("loading") };
  emit();
  try {
    const data = await cloud.loadEverything(userId);
    state = { ...emptyState(), ...data, auth: auth("signed-in"), hiddenPosts: readHidden() };
    saveError = null;
    startLive(userId);
  } catch (e) {
    console.error("Loading from Supabase failed:", e);
    state = { ...state, auth: auth("signed-in") };
    saveError = "We couldn't load your data from the server. Check your connection and reload the page.";
  }
  emit();
}

export async function reloadFromServer() {
  const id = uid();
  if (id) await signedIn(id, state.auth.mode === "cloud" ? state.auth.email : null);
}

// ---------------------------------------------------------------- saving

function readHidden(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(HIDDEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistLocal() {
  try {
    if (isCloud()) window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(state.hiddenPosts));
    else window.localStorage.setItem(DEVICE_KEY, JSON.stringify(state));
    if (!isCloud()) saveError = null;
  } catch {
    saveError = "This browser's storage is full or blocked, so your latest change may not be saved. Try removing a photo or two.";
  }
}

function update(fn: (s: AppState) => AppState) {
  start();
  state = fn(state);
  persistLocal();
  emit();
}

// Cloud writes run one after another (so e.g. a post exists before a ride
// points at it). A failure shows a message and reloads the true state.
let queue: Promise<void> = Promise.resolve();
function sync(task: (userId: string) => Promise<void>, what: string) {
  const id = uid();
  if (!id) return;
  queue = queue.then(() =>
    task(id).catch(async (e) => {
      console.error(`Saving failed (${what}):`, e);
      saveError = `We couldn't save ${what}. Please check your connection and try again.`;
      emit();
      await reloadFromServer();
      saveError = `We couldn't save ${what}. Please check your connection and try again.`;
      emit();
    }),
  );
}

// ---------------------------------------------------------------- live updates

let stopLiveFn: (() => void) | null = null;

function stopLive() {
  stopLiveFn?.();
  stopLiveFn = null;
}

function ensureProfiles(ids: string[]) {
  const missing = ids.filter((id) => id !== ME && isUuid(id) && !state.profiles[id]);
  if (!missing.length) return;
  void cloud.fetchProfiles(missing).then((found) => {
    state = { ...state, profiles: { ...state.profiles, ...found } };
    emit();
  });
}

// Loads a real rider's public profile if we don't have it yet (e.g. a shared link).
export function loadProfile(id: string) {
  if (uid()) ensureProfiles([id]);
}

// Loads the newest real riders into the store (cloud mode only). Fetches at most once a minute.
let directoryLoadedAt = 0;
export function loadDirectory() {
  const id = uid();
  if (!id || Date.now() - directoryLoadedAt < 60_000) return;
  directoryLoadedAt = Date.now();
  void cloud
    .fetchDirectory()
    .then((found) => {
      delete found[id];
      state = { ...state, profiles: { ...state.profiles, ...found } };
      emit();
    })
    .catch((e) => console.error("Loading riders failed:", e));
}

// Another real rider's garage (their bikes are public within the community).
export function fetchRiderBikes(userId: string) {
  return cloud.fetchBikesOf(userId);
}

function startLive(userId: string) {
  stopLive();
  stopLiveFn = cloud.subscribeLive({
    dm: (row) => {
      state = { ...state, conversations: cloud.addDm(state.conversations, row, userId) };
      ensureProfiles([row.sender_id, row.recipient_id ?? ""].filter((x) => x && x !== userId));
      emit();
    },
    groupMessage: (row) => {
      state = { ...state, groupMessages: cloud.addGroupMessage(state.groupMessages, row, userId) };
      ensureProfiles([row.sender_id].filter((x) => x !== userId));
      emit();
    },
    post: (event, row) => {
      if (event === "DELETE") state = { ...state, posts: state.posts.filter((p) => p.id !== row.id) };
      else {
        const post = cloud.toPost(row as Parameters<typeof cloud.toPost>[0], userId);
        // Keep our own optimistic copy (it may still hold a local photo preview).
        if (event === "INSERT" && state.posts.some((p) => p.id === post.id)) return;
        state = {
          ...state,
          posts: event === "INSERT" ? [post, ...state.posts] : state.posts.map((p) => (p.id === post.id ? post : p)),
        };
        ensureProfiles([post.authorId]);
      }
      emit();
    },
    comment: (event, row) => {
      if (event === "DELETE") state = { ...state, comments: state.comments.filter((c) => c.id !== row.id) };
      else {
        const c = cloud.toComment(row as Parameters<typeof cloud.toComment>[0], userId);
        if (state.comments.some((x) => x.id === c.id)) return;
        state = { ...state, comments: [...state.comments, c] };
        ensureProfiles([c.authorId]);
      }
      emit();
    },
  });
}

// ---------------------------------------------------------------- reading

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Snapshot {
  if (!started) {
    start();
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

// ---------------------------------------------------------------- sign-in (cloud)

export async function signInWithGoogle(): Promise<string | null> {
  if (!supabase) return "Sign-in isn't set up yet.";
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  return error ? "We couldn't start Google sign-in. Please try again." : null;
}

export async function signInWithEmail(email: string): Promise<string | null> {
  if (!supabase) return "Sign-in isn't set up yet.";
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  if (!error) return null;
  return /rate|limit/i.test(error.message)
    ? "Too many sign-in emails were sent. Please wait a minute and try again."
    : "We couldn't send the sign-in link. Check the email address and try again.";
}

export async function signOut() {
  stopLive();
  await supabase?.auth.signOut();
}

// ---------------------------------------------------------------- profile & garage

// Returns an error message, or null when saved. Awaited by the profile forms
// so we can report problems such as a username that's already taken.
export async function saveMe(me: MeProfile): Promise<string | null> {
  const previous = state.me;
  update((s) => ({ ...s, me }));
  const id = uid();
  if (!id) return null;
  try {
    const avatar = await cloud.saveProfile(id, me);
    if (avatar !== me.avatar) update((s) => ({ ...s, me: s.me ? { ...s.me, avatar } : s.me }));
    return null;
  } catch (e) {
    update((s) => ({ ...s, me: previous }));
    const msg = e instanceof Error ? e.message : "";
    if (/duplicate|unique/i.test(msg)) return "That username is already taken. Please choose another.";
    return "We couldn't save your profile. Please check your connection and try again.";
  }
}

// The quiz result goes straight onto the profile, so nobody has to pick a
// style by hand after taking it.
export async function saveQuizResult(style: CharacterId, answers: number[]): Promise<string | null> {
  if (!state.me) return "Set up your profile first.";
  return saveMe({ ...state.me, style, quizAnswers: answers });
}

export function addBike(bike: Omit<GarageBike, "id" | "addedAt" | "primary">, makePrimary: boolean): string {
  const id = newId();
  const primary = makePrimary || state.garage.length === 0;
  const row: GarageBike = { ...bike, id, addedAt: Date.now(), primary };
  update((s) => ({ ...s, garage: [...s.garage.map((b) => (primary ? { ...b, primary: false } : b)), row] }));
  sync(async (u) => {
    await cloud.insertBike(u, { ...row, primary: false });
    if (primary) await cloud.setPrimaryBike(u, id);
  }, "your bike");
  return id;
}

export function updateBike(id: string, patch: Partial<Omit<GarageBike, "id">>) {
  update((s) => ({ ...s, garage: s.garage.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  sync(() => cloud.updateBike(id, patch), "your bike");
}

export function setPrimaryBike(id: string) {
  update((s) => ({ ...s, garage: s.garage.map((b) => ({ ...b, primary: b.id === id })) }));
  sync((u) => cloud.setPrimaryBike(u, id), "your main bike");
}

export function removeBike(id: string) {
  let newPrimary: string | null = null;
  update((s) => {
    const garage = s.garage.filter((b) => b.id !== id);
    if (garage.length && !garage.some((b) => b.primary)) {
      garage[0] = { ...garage[0], primary: true };
      newPrimary = garage[0].id;
    }
    return { ...s, garage };
  });
  sync(async (u) => {
    await cloud.deleteBike(id);
    if (newPrimary) await cloud.setPrimaryBike(u, newPrimary);
  }, "your garage");
}

// ---------------------------------------------------------------- posts, comments, likes

export function createPost(input: Omit<Post, "id" | "authorId" | "createdAt" | "editedAt" | "demo" | "baseLikes">): string {
  const post: Post = { ...input, id: newId(), authorId: ME, createdAt: Date.now(), editedAt: null, demo: false, baseLikes: 0 };
  update((s) => ({ ...s, posts: [post, ...s.posts] }));
  sync(async (u) => {
    const image = await cloud.insertPost(u, post);
    if (image !== post.image) update((s) => ({ ...s, posts: s.posts.map((p) => (p.id === post.id ? { ...p, image } : p)) }));
  }, "your post");
  return post.id;
}

export function editPost(id: string, patch: Partial<Pick<Post, "text" | "image" | "kind" | "bike" | "plan">>) {
  update((s) => ({
    ...s,
    posts: s.posts.map((p) => (p.id === id && p.authorId === ME ? { ...p, ...patch, editedAt: Date.now() } : p)),
  }));
  sync(async (u) => {
    const image = await cloud.updatePost(u, id, patch);
    if (image !== undefined && image !== patch.image) update((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, image } : p)) }));
  }, "your changes");
}

export function deletePost(id: string) {
  update((s) => ({
    ...s,
    posts: s.posts.filter((p) => !(p.id === id && p.authorId === ME)),
    comments: s.comments.filter((c) => c.postId !== id),
    likes: s.likes.filter((l) => l !== id),
    rides: s.rides.map((r) => (r.sharedPostId === id ? { ...r, sharedPostId: null } : r)),
  }));
  sync(() => cloud.deletePost(id), "that deletion");
}

export function toggleLike(postId: string) {
  const liked = !state.likes.includes(postId);
  update((s) => ({ ...s, likes: liked ? [...s.likes, postId] : s.likes.filter((l) => l !== postId) }));
  sync((u) => cloud.setLike(u, postId, liked), "your like");
}

export function addComment(postId: string, text: string): Comment {
  const comment: Comment = { id: newId(), postId, authorId: ME, text, createdAt: Date.now(), demo: false };
  update((s) => ({ ...s, comments: [...s.comments, comment] }));
  sync((u) => cloud.insertComment(u, comment), "your comment");
  return comment;
}

export function deleteComment(id: string) {
  update((s) => ({ ...s, comments: s.comments.filter((c) => !(c.id === id && c.authorId === ME)) }));
  sync(() => cloud.deleteComment(id), "that deletion");
}

export function hidePost(postId: string) {
  update((s) => ({ ...s, hiddenPosts: [...new Set([...s.hiddenPosts, postId])] }));
}

// ---------------------------------------------------------------- direct messages

export function sendDirectMessage(riderId: string, text: string) {
  const msg: Message = { id: newId(), from: ME, text, at: Date.now(), demo: false };
  update((s) => {
    const existing = s.conversations.find((c) => c.riderId === riderId);
    const conversations = existing
      ? s.conversations.map((c) => (c.riderId === riderId ? { ...c, messages: [...c.messages, msg], updatedAt: msg.at } : c))
      : [...s.conversations, { riderId, messages: [msg], updatedAt: msg.at }];
    return { ...s, conversations };
  });
  sync((u) => cloud.insertDirectMessage(u, riderId, msg, !isUuid(riderId)), "your message");
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
  sync((u) => cloud.deleteConversationMessages(u, riderId, !isUuid(riderId)), "that deletion");
}

// ---------------------------------------------------------------- groups

export function joinGroup(groupId: string) {
  update((s) => ({ ...s, joinedGroups: [...new Set([...s.joinedGroups, groupId])] }));
  sync((u) => cloud.joinGroup(u, groupId), "your group membership");
}

export function leaveGroup(groupId: string) {
  update((s) => ({ ...s, joinedGroups: s.joinedGroups.filter((g) => g !== groupId) }));
  sync((u) => cloud.leaveGroup(u, groupId), "your group membership");
}

export function sendGroupMessage(groupId: string, text: string) {
  const msg: Message = { id: newId(), from: ME, text, at: Date.now(), demo: false };
  update((s) => ({ ...s, groupMessages: { ...s.groupMessages, [groupId]: [...(s.groupMessages[groupId] ?? []), msg] } }));
  sync((u) => cloud.insertGroupMessage(u, groupId, msg), "your message");
}

// ---------------------------------------------------------------- safety

export function blockRider(riderId: string) {
  update((s) => ({ ...s, blocked: [...new Set([...s.blocked, riderId])] }));
  sync((u) => cloud.setBlocked(u, riderId, true), "the block");
}

export function unblockRider(riderId: string) {
  update((s) => ({ ...s, blocked: s.blocked.filter((b) => b !== riderId) }));
  sync((u) => cloud.setBlocked(u, riderId, false), "the unblock");
}

export function report(r: Omit<Report, "at">) {
  const full = { ...r, at: Date.now() };
  update((s) => ({ ...s, reports: [...s.reports, full] }));
  sync((u) => cloud.insertReport(u, full), "your report");
}

// ---------------------------------------------------------------- rides

export function saveRide(ride: Omit<Ride, "id" | "sharedPostId">): string {
  const full: Ride = { ...ride, id: newId(), sharedPostId: null };
  update((s) => ({ ...s, rides: [full, ...s.rides] }));
  sync((u) => cloud.insertRide(u, full), "your ride");
  return full.id;
}

export function updateRide(id: string, patch: Partial<Pick<Ride, "title" | "notes" | "bikeId" | "sharedPostId">>) {
  update((s) => ({ ...s, rides: s.rides.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  sync(() => cloud.updateRide(id, patch), "your ride");
}

export function deleteRide(id: string) {
  update((s) => ({ ...s, rides: s.rides.filter((r) => r.id !== id) }));
  sync(() => cloud.deleteRide(id), "that deletion");
}

// ---------------------------------------------------------------- everything

export async function resetEverything(): Promise<string | null> {
  const id = uid();
  if (id) {
    try {
      await queue;
      await cloud.deleteAllMyData(id);
    } catch {
      return "We couldn't delete everything. Please try again.";
    }
    await reloadFromServer();
    return null;
  }
  update(() => emptyState());
  return null;
}

// ---------------------------------------------------------------- import (device → account)

export type DeviceData = Pick<AppState, "me" | "garage" | "posts" | "rides" | "joinedGroups" | "blocked">;

// The prototype data saved in this browser before signing in, if any.
export function readDeviceData(): DeviceData | null {
  try {
    const raw = window.localStorage.getItem(DEVICE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<AppState>;
    if (!s.me) return null;
    return {
      me: s.me,
      garage: s.garage ?? [],
      posts: (s.posts ?? []).filter((p) => p.authorId === ME),
      rides: s.rides ?? [],
      joinedGroups: s.joinedGroups ?? [],
      blocked: s.blocked ?? [],
    };
  } catch {
    return null;
  }
}

// Copies device data into the signed-in account (new ids, so it's safe to
// run once). Your profile is saved separately by the sign-up form.
export async function importDeviceData(data: DeviceData): Promise<string | null> {
  const id = uid();
  if (!id) return "Please sign in first.";
  try {
    const bikeIds = new Map<string, string>();
    for (const b of data.garage) {
      const nb = { ...b, id: newId() };
      bikeIds.set(b.id, nb.id);
      await cloud.insertBike(id, { ...nb, primary: false });
    }
    const primary = data.garage.find((b) => b.primary);
    if (primary) await cloud.setPrimaryBike(id, bikeIds.get(primary.id)!);
    const postIds = new Map<string, string>();
    for (const p of [...data.posts].reverse()) {
      const np = { ...p, id: newId() };
      postIds.set(p.id, np.id);
      await cloud.insertPost(id, np);
    }
    for (const r of data.rides) {
      await cloud.insertRide(id, {
        ...r,
        id: newId(),
        bikeId: r.bikeId ? (bikeIds.get(r.bikeId) ?? null) : null,
        sharedPostId: r.sharedPostId ? (postIds.get(r.sharedPostId) ?? null) : null,
      });
    }
    for (const g of data.joinedGroups) await cloud.joinGroup(id, g);
    for (const b of data.blocked) await cloud.setBlocked(id, b, true);
    window.localStorage.setItem(`${DEVICE_KEY}-imported`, String(Date.now()));
  } catch (e) {
    console.error("Import failed:", e);
    await reloadFromServer();
    return "Some of your device data couldn't be imported. Anything that was saved is in your account.";
  }
  await reloadFromServer();
  return null;
}

export function deviceDataImported(): boolean {
  try {
    return !!window.localStorage.getItem(`${DEVICE_KEY}-imported`);
  } catch {
    return false;
  }
}
