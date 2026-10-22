import { bikeInfo } from "./bikes";
import { ME, type AppState } from "./model";
import { findRider, riderBike } from "./riders";

// One way to show any author: me, another real rider (cloud mode), or a demo rider.
export type Person = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  href: string;
  demo: boolean;
  bikeLabel: string | null;
};

export function personFor(id: string, state: AppState): Person {
  if (id === ME && state.me) {
    const primary = state.garage.find((b) => b.primary);
    return {
      id: ME,
      name: state.me.displayName,
      username: state.me.username,
      avatar: state.me.avatar,
      href: "/profile",
      demo: false,
      bikeLabel: primary ? bikeInfo(primary.bike).label : null,
    };
  }
  const real = state.profiles[id];
  if (real) {
    return {
      id,
      name: real.displayName,
      username: real.username,
      avatar: real.avatar,
      href: `/riders/${id}`,
      demo: false,
      bikeLabel: real.primaryBike ? bikeInfo(real.primaryBike).label : null,
    };
  }
  const rider = findRider(id);
  if (rider) {
    return {
      id,
      name: rider.name,
      username: rider.username,
      avatar: null,
      href: `/riders/${rider.id}`,
      demo: true,
      bikeLabel: riderBike(rider).label,
    };
  }
  return { id, name: "Ride Buddy rider", username: "rider", avatar: null, href: `/riders/${id}`, demo: false, bikeLabel: null };
}

// Is this app running with real accounts (Supabase) right now?
export function isCloud(state: AppState): boolean {
  return state.auth.mode === "cloud";
}
