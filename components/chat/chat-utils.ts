import { bikeInfo } from "@/lib/bikes";
import { DEMO_GROUP_MESSAGES, findGroup, type Group } from "@/lib/demo";
import { isUuid, ME, type AppState, type Message } from "@/lib/model";
import { findRider, riderBike } from "@/lib/riders";

// Chat URL convention (other screens link here):
//   /chat/dm-<riderId>  direct conversation with a demo rider or a real rider (user id)
//   /chat/g-<groupId>   group view / chat
export const MAX_MESSAGE = 1000;

// Who you're talking to in a direct conversation.
export type ChatPartner = {
  id: string;
  name: string;
  avatar: string | null;
  subtitle: string;
  bio: string;
  demo: boolean;
};

export function partnerFor(id: string, state: AppState): ChatPartner | null {
  const demo = findRider(id);
  if (demo) {
    return { id, name: demo.name, avatar: null, subtitle: `${demo.area} · ${demo.level} · ${riderBike(demo).label}`, bio: demo.bio, demo: true };
  }
  const p = state.profiles[id];
  if (p) {
    const bits = [p.region, p.level, p.primaryBike ? bikeInfo(p.primaryBike).label : null].filter(Boolean);
    return { id, name: p.displayName, avatar: p.avatar, subtitle: bits.join(" · "), bio: p.bio, demo: false };
  }
  return null;
}

export function dmHref(riderId: string, draft?: string) {
  return `/chat/dm-${riderId}${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`;
}

export function groupHref(groupId: string) {
  return `/chat/g-${groupId}`;
}

export type ChatTarget =
  | { kind: "dm"; id: string; partnerId: string }
  | { kind: "group"; id: string; group: Group }
  | { kind: "invalid"; id: string };

// A real rider's id is a UUID; their profile may still be loading.
export function parseChatId(raw: string): ChatTarget {
  const id = safeDecode(raw);
  if (id.startsWith("dm-")) {
    const partnerId = id.slice(3);
    if (findRider(partnerId) || isUuid(partnerId)) return { kind: "dm", id, partnerId };
  } else if (id.startsWith("g-")) {
    const group = findGroup(id.slice(2));
    if (group) return { kind: "group", id, group };
  }
  return { kind: "invalid", id };
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Demo messages from the data file plus the ones I sent, oldest first. */
export function groupMessages(groupId: string, state: AppState): Message[] {
  return [...(DEMO_GROUP_MESSAGES[groupId] ?? []), ...(state.groupMessages[groupId] ?? [])].sort((a, b) => a.at - b.at);
}

// Demo members + other real members + you (if joined). Real numbers only.
export function groupMemberCount(group: Group, state: AppState) {
  const joined = state.joinedGroups.includes(group.id);
  const realOthers = state.groupMembers[group.id]?.length ?? 0;
  return group.members.filter((m) => m !== ME).length + realOthers + (joined ? 1 : 0);
}

export function groupMemberIds(group: Group, state: AppState): string[] {
  return [...group.members, ...(state.groupMembers[group.id] ?? [])];
}

export function memberLabel(n: number) {
  return `${n} ${n === 1 ? "member" : "members"}`;
}

export function clockTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dayLabel(ts: number) {
  const now = new Date();
  const today = dayKey(now.getTime());
  const yesterday = dayKey(now.getTime() - 86_400_000);
  const key = dayKey(ts);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function matches(query: string, ...fields: (string | undefined | null)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}
