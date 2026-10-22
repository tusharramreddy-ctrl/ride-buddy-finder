import type { Area, CharacterId, Gender, Level, SlotId } from "./constants";
import type { BikeRef } from "./bikes";

// Data models for the prototype. Everything here is stored in this browser
// only (see lib/store.ts). A real backend would keep the same shapes in
// database tables: users, bikes, posts, comments, reactions, conversations,
// messages, groups, memberships, rides and route points.

export const ME = "me";

export type MeProfile = {
  displayName: string;
  username: string;
  bio: string;
  region: Area | null; // approximate area only, never an exact location
  level: Level;
  style: CharacterId | null;
  quizAnswers: number[] | null;
  gender: Gender | null;
  showGender: boolean;
  availability: SlotId[];
  avatar: string | null; // small compressed image (data URL)
  createdAt: number;
};

export type GarageBike = {
  id: string;
  bike: BikeRef;
  year: number | null;
  nickname: string;
  primary: boolean;
  addedAt: number;
};

export const POST_KINDS = [
  { id: "ride", label: "Ride", hint: "A ride you completed" },
  { id: "bike", label: "My bike", hint: "Your motorcycle or a new purchase" },
  { id: "journey", label: "Journey", hint: "Your riding progress" },
  { id: "road", label: "Road & place", hint: "A scenic road or trip story" },
  { id: "question", label: "Question", hint: "Ask the community" },
  { id: "group-ride", label: "Group ride", hint: "Plan a ride together" },
] as const;
export type PostKind = (typeof POST_KINDS)[number]["id"];

// [longitude, latitude] pairs, already trimmed for privacy when shared.
export type LngLat = [number, number];

export type RideStats = {
  distanceKm: number;
  durationMin: number;
  route: LngLat[] | null;
  rideId: string | null;
};

export type Post = {
  id: string;
  authorId: string; // ME or a demo rider id
  createdAt: number;
  editedAt: number | null;
  kind: PostKind;
  text: string;
  image: string | null;
  bike: BikeRef | null;
  ride: RideStats | null;
  plan: { when: string; area: Area | null } | null;
  demo: boolean;
  baseLikes: number; // likes from demo riders (demo posts only)
};

export type Comment = { id: string; postId: string; authorId: string; text: string; createdAt: number; demo: boolean };

export type Message = { id: string; from: string; text: string; at: number; demo: boolean };

export type Conversation = { riderId: string; messages: Message[]; updatedAt: number };

export type RoutePoint = { lng: number; lat: number; t: number; acc: number };

export type Ride = {
  id: string;
  title: string;
  startedAt: number;
  endedAt: number;
  movingSec: number;
  distanceM: number;
  points: RoutePoint[];
  source: "gps" | "manual";
  bikeId: string | null;
  notes: string;
  sharedPostId: string | null;
};

export type Report = { targetType: "post" | "rider" | "group-message"; targetId: string; reason: string; at: number };

export type AppState = {
  version: 1;
  me: MeProfile | null;
  garage: GarageBike[];
  posts: Post[]; // only posts I wrote; demo posts come from data files
  comments: Comment[]; // only comments I wrote
  likes: string[]; // post ids I liked
  conversations: Conversation[];
  joinedGroups: string[];
  groupMessages: Record<string, Message[]>; // messages I sent in groups
  rides: Ride[];
  blocked: string[]; // demo rider ids
  hiddenPosts: string[];
  reports: Report[];
};

export function emptyState(): AppState {
  return {
    version: 1,
    me: null,
    garage: [],
    posts: [],
    comments: [],
    likes: [],
    conversations: [],
    joinedGroups: [],
    groupMessages: {},
    rides: [],
    blocked: [],
    hiddenPosts: [],
    reports: [],
  };
}

export function newId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}
