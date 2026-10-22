import { bikeInfo } from "@/lib/bikes";
import { simplify, trimForPrivacy } from "@/lib/geo";
import type { GarageBike, LngLat, Ride } from "@/lib/model";
import { toLngLat } from "@/lib/ride-tracker";
import { openComposer } from "../shell/composer-state";

export function bikeLabel(b: GarageBike): string {
  return b.nickname.trim() || bikeInfo(b.bike).label;
}

export function rideRoute(ride: Pick<Ride, "points">): LngLat[] {
  return ride.points.map(toLngLat);
}

// The route that would be shared: first and last 300 m removed.
export function sharedRoute(ride: Pick<Ride, "points">): LngLat[] | null {
  const trimmed = simplify(trimForPrivacy(rideRoute(ride)));
  return trimmed.length >= 2 ? trimmed : null;
}

// Opens the post composer prefilled. Only ever called from an explicit tap.
export function shareRideToFeed(ride: Ride) {
  openComposer({
    kind: "ride",
    ride: {
      distanceKm: Math.round(ride.distanceM / 100) / 10,
      durationMin: Math.max(1, Math.round(ride.movingSec / 60)),
      route: ride.source === "gps" ? sharedRoute(ride) : null,
      rideId: ride.id,
    },
  });
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function formatSpeed(kmh: number | null): string {
  return kmh === null ? "—" : `${kmh.toFixed(kmh >= 100 ? 0 : 1)}`;
}
