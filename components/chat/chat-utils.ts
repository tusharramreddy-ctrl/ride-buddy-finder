import { DEMO_GROUP_MESSAGES, findGroup, type Group } from "@/lib/demo";
import { ME, type AppState, type Message } from "@/lib/model";
import { findRider, type DemoRider } from "@/lib/riders";

// Chat URL convention (other screens link here):
//   /chat/dm-<riderId>  direct conversation with a demo rider
//   /chat/g-<groupId>   group view / chat
export const MAX_MESSAGE = 1000;

export function dmHref(riderId: string, draft?: string) {
  return `/chat/dm-${riderId}${draft ? `?draft=${encodeURIComponent(draft)}` : ""}`;
}

export function groupHref(groupId: string) {
  return `/chat/g-${groupId}`;
}

export type ChatTarget =
  | { kind: "dm"; id: string; rider: DemoRider }
  | { kind: "group"; id: string; group: Group }
  | { kind: "invalid"; id: string };

export function parseChatId(raw: string): ChatTarget {
  const id = safeDecode(raw);
  if (id.startsWith("dm-")) {
    const rider = findRider(id.slice(3));
    if (rider) return { kind: "dm", id, rider };
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

export function groupMemberCount(group: Group, state: AppState) {
  const joined = state.joinedGroups.includes(group.id);
  return group.members.filter((m) => m !== ME).length + (joined ? 1 : 0);
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
