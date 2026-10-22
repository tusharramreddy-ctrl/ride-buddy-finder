import groupsData from "@/data/groups.json";
import postsData from "@/data/demo-posts.json";
import type { Area } from "./constants";
import type { Comment, LngLat, Message, Post, PostKind } from "./model";

// Demo content: fictional riders, posts and groups that make the prototype
// feel alive. Everything here is always shown with a "Demo" label.

type RawPost = {
  id: string;
  authorId: string;
  hoursAgo: number;
  kind: PostKind;
  text: string;
  bikeId: string;
  baseLikes: number;
  ride?: { distanceKm: number; durationMin: number; route: number[][] };
  plan?: { when: string; area: string };
  comments: { authorId: string; text: string; hoursAgo: number }[];
};

type RawGroup = {
  id: string;
  name: string;
  description: string;
  interests: string[];
  region: string;
  members: string[];
  messages: { from: string; text: string; hoursAgo: number }[];
};

export type Group = Omit<RawGroup, "messages">;

const HOUR = 3_600_000;
// Demo times are relative to when the app is opened, so the feed looks recent.
const OPENED_AT = Date.now();

export const DEMO_POSTS: Post[] = (postsData as RawPost[]).map((p) => ({
  id: p.id,
  authorId: p.authorId,
  createdAt: OPENED_AT - p.hoursAgo * HOUR,
  editedAt: null,
  kind: p.kind,
  text: p.text,
  image: null,
  bike: { kind: "catalog", modelId: p.bikeId },
  ride: p.ride ? { distanceKm: p.ride.distanceKm, durationMin: p.ride.durationMin, route: p.ride.route as LngLat[], rideId: null } : null,
  plan: p.plan ? { when: p.plan.when, area: p.plan.area as Area } : null,
  demo: true,
  baseLikes: p.baseLikes,
}));

export const DEMO_COMMENTS: Comment[] = (postsData as RawPost[]).flatMap((p) =>
  p.comments.map((c, i) => ({
    id: `${p.id}-c${i}`,
    postId: p.id,
    authorId: c.authorId,
    text: c.text,
    createdAt: OPENED_AT - c.hoursAgo * HOUR,
    demo: true,
  })),
);

export const GROUPS: Group[] = (groupsData as RawGroup[]).map((g) => ({
  id: g.id,
  name: g.name,
  description: g.description,
  interests: g.interests,
  region: g.region,
  members: g.members,
}));

export const DEMO_GROUP_MESSAGES: Record<string, Message[]> = Object.fromEntries(
  (groupsData as RawGroup[]).map((g) => [
    g.id,
    g.messages.map((m, i) => ({ id: `${g.id}-m${i}`, from: m.from, text: m.text, at: OPENED_AT - m.hoursAgo * HOUR, demo: true })),
  ]),
);

export function findGroup(id: string): Group | undefined {
  return GROUPS.find((g) => g.id === id);
}
