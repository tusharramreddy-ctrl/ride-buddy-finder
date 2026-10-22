"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BikeRef } from "./bikes";
import type { Area, CharacterId, Gender, Level, SlotId } from "./constants";
import { DEMO_POSTS } from "./demo";
import {
  ME,
  newId,
  type AppState,
  type Comment,
  type Conversation,
  type GarageBike,
  type MeProfile,
  type Message,
  type Post,
  type PublicProfile,
  type Report,
  type Ride,
  type RoutePoint,
} from "./model";
import { MEDIA_BUCKET, supabase } from "./supabase";

// Supabase data layer. Inside the app your own user id is shown as ME, so
// screens work the same in both modes; these helpers translate at the edges.

function db() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

const local = (uid: string) => (id: string) => (id === uid ? ME : id);
const remote = (uid: string) => (id: string) => (id === ME ? uid : id);
const ts = (v: string | null) => (v ? new Date(v).getTime() : null);
const iso = (n: number) => new Date(n).toISOString();

// Unwraps a Supabase response: throws on error, otherwise returns the rows
// typed as the caller expects (the schema lives in supabase/setup.sql).
function check<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------------------------------------------------------------- photos

// Uploads a data-URL photo into the rider's own folder; returns its public URL.
// Anything that's already a URL (or empty) is returned unchanged.
export async function uploadIfNeeded(uid: string, image: string | null, folder: string): Promise<string | null> {
  if (!image || !image.startsWith("data:")) return image;
  const blob = await (await fetch(image)).blob();
  const path = `${uid}/${folder}/${newId()}.jpg`;
  check(await db().storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false }));
  return db().storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------- mapping

type ProfileRow = {
  id: string;
  display_name: string;
  username: string;
  bio: string;
  region: string | null;
  level: string;
  style: string | null;
  quiz_answers: number[] | null;
  availability: string[];
  gender_shown: string | null;
  avatar_url: string | null;
  created_at: string;
};

function toPublicProfile(r: ProfileRow, primaryBike: BikeRef | null): PublicProfile {
  return {
    id: r.id,
    displayName: r.display_name,
    username: r.username,
    bio: r.bio,
    region: r.region as Area | null,
    level: r.level as Level,
    style: r.style as CharacterId | null,
    availability: r.availability as SlotId[],
    genderShown: r.gender_shown as Gender | null,
    avatar: r.avatar_url,
    primaryBike,
  };
}

type PostRow = {
  id: string;
  author_id: string;
  kind: Post["kind"];
  body: string;
  image_url: string | null;
  bike: BikeRef | null;
  ride: Post["ride"];
  plan: Post["plan"];
  created_at: string;
  edited_at: string | null;
};

export function toPost(r: PostRow, uid: string): Post {
  return {
    id: r.id,
    authorId: local(uid)(r.author_id),
    createdAt: ts(r.created_at)!,
    editedAt: ts(r.edited_at),
    kind: r.kind,
    text: r.body,
    image: r.image_url,
    bike: r.bike,
    ride: r.ride,
    plan: r.plan,
    demo: false,
    baseLikes: 0,
  };
}

type CommentRow = { id: string; post_id: string; author_id: string; body: string; created_at: string };
export function toComment(r: CommentRow, uid: string): Comment {
  return { id: r.id, postId: r.post_id, authorId: local(uid)(r.author_id), text: r.body, createdAt: ts(r.created_at)!, demo: false };
}

type DmRow = { id: string; sender_id: string; recipient_id: string | null; demo_rider_id: string | null; body: string; created_at: string };
type GroupMsgRow = { id: string; group_id: string; sender_id: string; body: string; created_at: string };

function toMessage(id: string, from: string, body: string, at: string, uid: string): Message {
  return { id, from: local(uid)(from), text: body, at: ts(at)!, demo: false };
}

// The other person in a DM, from my point of view.
function dmPartner(r: DmRow, uid: string): string {
  if (r.demo_rider_id) return r.demo_rider_id;
  return r.sender_id === uid ? r.recipient_id! : r.sender_id;
}

export function addDm(conversations: Conversation[], r: DmRow, uid: string): Conversation[] {
  const partner = dmPartner(r, uid);
  const msg = toMessage(r.id, r.sender_id, r.body, r.created_at, uid);
  const existing = conversations.find((c) => c.riderId === partner);
  if (existing?.messages.some((m) => m.id === msg.id)) return conversations;
  if (!existing) return [...conversations, { riderId: partner, messages: [msg], updatedAt: msg.at }];
  return conversations.map((c) =>
    c.riderId === partner
      ? { ...c, messages: [...c.messages, msg].sort((a, b) => a.at - b.at), updatedAt: Math.max(c.updatedAt, msg.at) }
      : c,
  );
}

export function addGroupMessage(groupMessages: Record<string, Message[]>, r: GroupMsgRow, uid: string): Record<string, Message[]> {
  const list = groupMessages[r.group_id] ?? [];
  if (list.some((m) => m.id === r.id)) return groupMessages;
  const msg = toMessage(r.id, r.sender_id, r.body, r.created_at, uid);
  return { ...groupMessages, [r.group_id]: [...list, msg].sort((a, b) => a.at - b.at) };
}

// ---------------------------------------------------------------- loading

// Fetches profiles (plus their main bike) for any user ids we don't have yet.
export async function fetchProfiles(ids: string[]): Promise<Record<string, PublicProfile>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const [rows, bikes] = await Promise.all([
    db().from("profiles").select("*").in("id", unique).then(check<ProfileRow[]>),
    db().from("garage_bikes").select("user_id, bike").in("user_id", unique).eq("is_primary", true).then(check<{ user_id: string; bike: BikeRef }[]>),
  ]);
  const bikeBy = new Map(bikes.map((b) => [b.user_id, b.bike]));
  return Object.fromEntries(rows.map((r) => [r.id, toPublicProfile(r, bikeBy.get(r.id) ?? null)]));
}

// Newest real riders (for "New message" and "Riders to know").
export async function fetchDirectory(limit = 200): Promise<Record<string, PublicProfile>> {
  const rows = check<{ id: string }[]>(await db().from("profiles").select("id").order("created_at", { ascending: false }).limit(limit));
  return fetchProfiles(rows.map((r) => r.id));
}

export async function fetchBikesOf(userId: string): Promise<GarageBike[]> {
  const rows = check(
    await db().from("garage_bikes").select("*").eq("user_id", userId).order("created_at"),
  ) as { id: string; bike: BikeRef; year: number | null; nickname: string; is_primary: boolean; created_at: string }[];
  return rows.map((b) => ({ id: b.id, bike: b.bike, year: b.year, nickname: b.nickname, primary: b.is_primary, addedAt: ts(b.created_at)! }));
}

export async function loadEverything(uid: string): Promise<Partial<AppState>> {
  const c = db();
  const [meRow, priv, garage, posts, blocks, dms, members, groupMsgs, rides] = await Promise.all([
    c.from("profiles").select("*").eq("id", uid).maybeSingle().then(check<ProfileRow | null>),
    c.from("profile_private").select("gender").eq("user_id", uid).maybeSingle().then(check<{ gender: string | null } | null>),
    fetchBikesOf(uid),
    c.from("posts").select("*").order("created_at", { ascending: false }).limit(100).then(check<PostRow[]>),
    c.from("blocks").select("blocked_id").then(check<{ blocked_id: string }[]>),
    c.from("direct_messages").select("*").order("created_at").limit(1000).then(check<DmRow[]>),
    c.from("group_members").select("group_id, user_id").then(check<{ group_id: string; user_id: string }[]>),
    c.from("group_messages").select("*").order("created_at", { ascending: false }).limit(500).then(check<GroupMsgRow[]>),
    c.from("rides").select("*").order("started_at", { ascending: false }).limit(500).then(check<RideRow[]>),
  ]);

  const postIds = [...posts.map((p) => p.id), ...DEMO_POSTS.map((p) => p.id)];
  const [comments, likes] = await Promise.all([
    c.from("comments").select("*").in("post_id", postIds).order("created_at").then(check<CommentRow[]>),
    c.from("post_likes").select("post_id, user_id").in("post_id", postIds).then(check<{ post_id: string; user_id: string }[]>),
  ]);

  const likeCounts: Record<string, number> = {};
  for (const l of likes) if (l.user_id !== uid) likeCounts[l.post_id] = (likeCounts[l.post_id] ?? 0) + 1;

  const groupMembers: Record<string, string[]> = {};
  for (const m of members) if (m.user_id !== uid) (groupMembers[m.group_id] ??= []).push(m.user_id);

  let conversations: Conversation[] = [];
  for (const d of dms) conversations = addDm(conversations, d, uid);
  let groupMessages: Record<string, Message[]> = {};
  for (const g of groupMsgs) groupMessages = addGroupMessage(groupMessages, g, uid);

  // Profiles of everyone we'll show: authors, commenters, chat partners, group members.
  const others = [
    ...posts.map((p) => p.author_id),
    ...comments.map((x) => x.author_id),
    ...dms.map((d) => (d.demo_rider_id ? "" : dmPartner(d, uid))),
    ...members.map((m) => m.user_id),
    ...groupMsgs.map((g) => g.sender_id),
  ].filter((id) => id && id !== uid);
  const profiles = await fetchProfiles(others);

  return {
    me: meRow ? toMe(meRow, priv?.gender ?? null) : null,
    garage,
    posts: posts.map((p) => toPost(p, uid)),
    comments: comments.map((x) => toComment(x, uid)),
    likes: likes.filter((l) => l.user_id === uid).map((l) => l.post_id),
    likeCounts,
    conversations,
    joinedGroups: members.filter((m) => m.user_id === uid).map((m) => m.group_id),
    groupMembers,
    groupMessages,
    rides: rides.map(toRide),
    blocked: blocks.map((b) => b.blocked_id),
    profiles,
  };
}

function toMe(r: ProfileRow, gender: string | null): MeProfile {
  return {
    displayName: r.display_name,
    username: r.username,
    bio: r.bio,
    region: r.region as Area | null,
    level: r.level as Level,
    style: r.style as CharacterId | null,
    quizAnswers: r.quiz_answers,
    gender: gender as Gender | null,
    showGender: r.gender_shown !== null,
    availability: r.availability as SlotId[],
    avatar: r.avatar_url,
    createdAt: ts(r.created_at)!,
  };
}

type RideRow = {
  id: string;
  title: string;
  started_at: string;
  ended_at: string;
  moving_sec: number;
  distance_m: number;
  points: RoutePoint[];
  source: "gps" | "manual";
  bike_id: string | null;
  notes: string;
  shared_post_id: string | null;
};

function toRide(r: RideRow): Ride {
  return {
    id: r.id,
    title: r.title,
    startedAt: ts(r.started_at)!,
    endedAt: ts(r.ended_at)!,
    movingSec: r.moving_sec,
    distanceM: r.distance_m,
    points: r.points ?? [],
    source: r.source,
    bikeId: r.bike_id,
    notes: r.notes,
    sharedPostId: r.shared_post_id,
  };
}

// ---------------------------------------------------------------- writes
// Each returns once the database has accepted the change, or throws.

export async function saveProfile(uid: string, me: MeProfile): Promise<string | null> {
  const avatar = await uploadIfNeeded(uid, me.avatar, "avatars");
  check(
    await db().from("profiles").upsert({
      id: uid,
      display_name: me.displayName,
      username: me.username,
      bio: me.bio,
      region: me.region,
      level: me.level,
      style: me.style,
      quiz_answers: me.quizAnswers,
      availability: me.availability,
      gender_shown: me.showGender ? me.gender : null,
      avatar_url: avatar,
      updated_at: new Date().toISOString(),
    }),
  );
  check(await db().from("profile_private").upsert({ user_id: uid, gender: me.gender }));
  return avatar;
}

export async function insertBike(uid: string, b: GarageBike) {
  check(await db().from("garage_bikes").insert({ id: b.id, user_id: uid, bike: b.bike, year: b.year, nickname: b.nickname, is_primary: b.primary }));
}
export async function updateBike(id: string, patch: Partial<GarageBike>) {
  const row: Record<string, unknown> = {};
  if (patch.bike) row.bike = patch.bike;
  if (patch.year !== undefined) row.year = patch.year;
  if (patch.nickname !== undefined) row.nickname = patch.nickname;
  if (patch.primary !== undefined) row.is_primary = patch.primary;
  check(await db().from("garage_bikes").update(row).eq("id", id));
}
export async function setPrimaryBike(uid: string, id: string) {
  check(await db().from("garage_bikes").update({ is_primary: false }).eq("user_id", uid).neq("id", id));
  check(await db().from("garage_bikes").update({ is_primary: true }).eq("id", id));
}
export async function deleteBike(id: string) {
  check(await db().from("garage_bikes").delete().eq("id", id));
}

export async function insertPost(uid: string, p: Post): Promise<string | null> {
  const image = await uploadIfNeeded(uid, p.image, "posts");
  check(
    await db().from("posts").insert({ id: p.id, author_id: uid, kind: p.kind, body: p.text, image_url: image, bike: p.bike, ride: p.ride, plan: p.plan, created_at: iso(p.createdAt) }),
  );
  return image;
}
export async function updatePost(uid: string, id: string, patch: Partial<Post>): Promise<string | null | undefined> {
  const row: Record<string, unknown> = { edited_at: new Date().toISOString() };
  let image: string | null | undefined;
  if (patch.text !== undefined) row.body = patch.text;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.bike !== undefined) row.bike = patch.bike;
  if (patch.plan !== undefined) row.plan = patch.plan;
  if (patch.image !== undefined) row.image_url = image = await uploadIfNeeded(uid, patch.image, "posts");
  check(await db().from("posts").update(row).eq("id", id));
  return image;
}
export async function deletePost(id: string) {
  check(await db().from("posts").delete().eq("id", id));
}

export async function setLike(uid: string, postId: string, liked: boolean) {
  if (liked) check(await db().from("post_likes").upsert({ post_id: postId, user_id: uid }));
  else check(await db().from("post_likes").delete().eq("post_id", postId).eq("user_id", uid));
}

export async function insertComment(uid: string, c: Comment) {
  check(await db().from("comments").insert({ id: c.id, post_id: c.postId, author_id: uid, body: c.text, created_at: iso(c.createdAt) }));
}
export async function deleteComment(id: string) {
  check(await db().from("comments").delete().eq("id", id));
}

export async function insertDirectMessage(uid: string, partner: string, m: Message, partnerIsDemo: boolean) {
  check(
    await db().from("direct_messages").insert({
      id: m.id,
      sender_id: uid,
      recipient_id: partnerIsDemo ? null : partner,
      demo_rider_id: partnerIsDemo ? partner : null,
      body: m.text,
      created_at: iso(m.at),
    }),
  );
}
export async function deleteConversationMessages(uid: string, partner: string, partnerIsDemo: boolean) {
  // You can only delete messages you sent (the other person keeps theirs).
  const q = db().from("direct_messages").delete().eq("sender_id", uid);
  check(await (partnerIsDemo ? q.eq("demo_rider_id", partner) : q.eq("recipient_id", partner)));
}

export async function joinGroup(uid: string, groupId: string) {
  check(await db().from("group_members").upsert({ group_id: groupId, user_id: uid }));
}
export async function leaveGroup(uid: string, groupId: string) {
  check(await db().from("group_members").delete().eq("group_id", groupId).eq("user_id", uid));
}
export async function insertGroupMessage(uid: string, groupId: string, m: Message) {
  check(await db().from("group_messages").insert({ id: m.id, group_id: groupId, sender_id: uid, body: m.text, created_at: iso(m.at) }));
}

export async function setBlocked(uid: string, riderId: string, blocked: boolean) {
  if (blocked) check(await db().from("blocks").upsert({ blocker_id: uid, blocked_id: riderId }));
  else check(await db().from("blocks").delete().eq("blocker_id", uid).eq("blocked_id", riderId));
}
export async function insertReport(uid: string, r: Report) {
  check(await db().from("reports").insert({ reporter_id: uid, target_type: r.targetType, target_id: r.targetId, reason: r.reason }));
}

export async function insertRide(uid: string, r: Ride) {
  check(
    await db().from("rides").insert({
      id: r.id,
      user_id: uid,
      title: r.title,
      started_at: iso(r.startedAt),
      ended_at: iso(r.endedAt),
      moving_sec: Math.round(r.movingSec),
      distance_m: r.distanceM,
      points: r.points,
      source: r.source,
      bike_id: r.bikeId,
      notes: r.notes,
      shared_post_id: r.sharedPostId,
    }),
  );
}
export async function updateRide(id: string, patch: Partial<Ride>) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.bikeId !== undefined) row.bike_id = patch.bikeId;
  if (patch.sharedPostId !== undefined) row.shared_post_id = patch.sharedPostId;
  check(await db().from("rides").update(row).eq("id", id));
}
export async function deleteRide(id: string) {
  check(await db().from("rides").delete().eq("id", id));
}

// Removes everything you created in Ride Buddy. (Your sign-in account itself
// stays; removing it needs the Supabase dashboard or a server-side function.)
export async function deleteAllMyData(uid: string) {
  const c = db();
  for (const [table, col] of [
    ["rides", "user_id"],
    ["comments", "author_id"],
    ["post_likes", "user_id"],
    ["posts", "author_id"],
    ["direct_messages", "sender_id"],
    ["group_messages", "sender_id"],
    ["group_members", "user_id"],
    ["blocks", "blocker_id"],
    ["garage_bikes", "user_id"],
    ["profile_private", "user_id"],
    ["profiles", "id"],
  ] as const) {
    check(await c.from(table).delete().eq(col, uid));
  }
}

// ---------------------------------------------------------------- realtime

export type LiveHandlers = {
  dm: (row: DmRow) => void;
  groupMessage: (row: GroupMsgRow) => void;
  post: (event: "INSERT" | "UPDATE" | "DELETE", row: PostRow | { id: string }) => void;
  comment: (event: "INSERT" | "DELETE", row: CommentRow | { id: string }) => void;
};

export function subscribeLive(h: LiveHandlers): () => void {
  const c = db();
  const channel: RealtimeChannel = c
    .channel("ride-buddy-live")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (p) => h.dm(p.new as DmRow))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, (p) => h.groupMessage(p.new as GroupMsgRow))
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, (p) =>
      h.post(p.eventType as "INSERT" | "UPDATE" | "DELETE", (p.eventType === "DELETE" ? p.old : p.new) as PostRow),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, (p) => {
      if (p.eventType === "INSERT" || p.eventType === "DELETE")
        h.comment(p.eventType, (p.eventType === "DELETE" ? p.old : p.new) as CommentRow);
    })
    .subscribe();
  return () => {
    c.removeChannel(channel);
  };
}

export const toRemoteId = remote;
