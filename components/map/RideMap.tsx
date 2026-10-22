"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  type GeoJSONSource,
} from "maplibre-gl";
import { Crosshair, LocateFixed, LocateOff, MapPinOff, RefreshCw, WifiOff } from "lucide-react";
import type { LngLat } from "@/lib/model";
import {
  configureMapWorker,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  FOLLOW_ZOOM,
  MAP_STYLE_URL,
  ROUTE_CASING,
  ROUTE_COLOR,
  STYLE_LOAD_TIMEOUT_MS,
} from "./map-config";

export type MapPosition = { lng: number; lat: number };

type Props = {
  routes: LngLat[][]; // segments; gaps between them are not joined
  fitKey: string | null; // fit the route whenever this changes
  position: MapPosition | null; // only ever set after location permission was granted
  follow: boolean;
  onFollowChange: (follow: boolean) => void;
  showFollowToggle: boolean;
  onLocate: (() => void) | null; // null hides the "locate me" button
  centerNonce: number; // bump to centre on `position` once it's available
  onViewChange?: (center: LngLat, zoom: number) => void; // reports where the map is looking
};

type LoadState = { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };

const ROUTE_SRC = "ride-route";
const ENDS_SRC = "ride-route-ends";

function routeData(routes: LngLat[][]): GeoJSON.FeatureCollection {
  const lines = routes.filter((r) => r.length >= 2);
  return {
    type: "FeatureCollection",
    features: lines.length ? [{ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: lines } }] : [],
  };
}

function endsData(routes: LngLat[][]): GeoJSON.FeatureCollection {
  const flat = routes.flat();
  if (!flat.length) return { type: "FeatureCollection", features: [] };
  const pts: { p: LngLat; role: string }[] = [{ p: flat[0], role: "start" }];
  if (flat.length > 1) pts.push({ p: flat[flat.length - 1], role: "end" });
  return {
    type: "FeatureCollection",
    features: pts.map(({ p, role }) => ({ type: "Feature", properties: { role }, geometry: { type: "Point", coordinates: p } })),
  };
}

function fitPadding() {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
  return wide ? { top: 64, bottom: 64, right: 72, left: 420 } : { top: 72, bottom: 40, right: 56, left: 40 };
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function RideMap(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const readyRef = useRef(false);
  const propsRef = useRef(props);
  const lastFitKey = useRef<string | null>(null);
  const handledNonce = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [webgl] = useState(hasWebGL);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [tileWarning, setTileWarning] = useState(false);

  useEffect(() => {
    propsRef.current = props;
  });

  // ---- Create the map (again on retry) ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !webgl) return;
    configureMapWorker();
    let styleLoaded = false;
    let disposed = false;
    const fail = (message: string) => {
      if (!disposed) setLoad({ kind: "error", message });
    };

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container: el,
        style: MAP_STYLE_URL,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: { compact: false },
      });
    } catch {
      fail("The map couldn't start in this browser.");
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(new ScaleControl({ unit: "metric", maxWidth: 110 }), "bottom-right");

    const timer = window.setTimeout(() => {
      if (!styleLoaded) fail("The map is taking too long to load. You may be offline or the map service is unavailable.");
    }, STYLE_LOAD_TIMEOUT_MS);

    map.on("style.load", () => {
      styleLoaded = true;
      window.clearTimeout(timer);
    });

    map.on("error", () => {
      if (!styleLoaded) fail("The map couldn't load. You may be offline or the map service is unavailable.");
      else if (!disposed) setTileWarning(true);
    });

    const reportView = () => {
      const c = map.getCenter();
      propsRef.current.onViewChange?.([c.lng, c.lat], map.getZoom());
    };
    map.on("moveend", reportView);

    map.on("load", () => {
      if (disposed) return;
      reportView();
      const p = propsRef.current;
      map.addSource(ROUTE_SRC, { type: "geojson", data: routeData(p.routes) });
      map.addSource(ENDS_SRC, { type: "geojson", data: endsData(p.routes) });
      map.addLayer({
        id: "ride-route-casing",
        type: "line",
        source: ROUTE_SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROUTE_CASING, "line-width": 9, "line-opacity": 0.9 },
      });
      map.addLayer({
        id: "ride-route-line",
        type: "line",
        source: ROUTE_SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ROUTE_COLOR, "line-width": 5 },
      });
      map.addLayer({
        id: "ride-route-ends",
        type: "circle",
        source: ENDS_SRC,
        paint: {
          "circle-radius": 6,
          "circle-color": ["match", ["get", "role"], "start", "#17703f", "#f3f1ec"],
          "circle-stroke-color": ["match", ["get", "role"], "start", "#ffffff", ROUTE_COLOR],
          "circle-stroke-width": 2,
        },
      });
      readyRef.current = true;
      setLoad({ kind: "ready" });
      syncAll();
    });

    // Moving the map by hand turns follow mode off.
    map.on("dragstart", (e) => {
      if (e.originalEvent) propsRef.current.onFollowChange(false);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      ro.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      readyRef.current = false;
      lastFitKey.current = null;
      mapRef.current = null;
      map.remove();
    };
    // syncAll reads the latest props from a ref, so it isn't a dependency.
  }, [attempt, webgl]);

  // ---- Keep map contents in sync with props ----
  function syncAll() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const p = propsRef.current;

    map.getSource<GeoJSONSource>(ROUTE_SRC)?.setData(routeData(p.routes));
    map.getSource<GeoJSONSource>(ENDS_SRC)?.setData(endsData(p.routes));

    if (p.position) {
      if (!markerRef.current) {
        const dot = document.createElement("div");
        dot.className = "ride-position-dot";
        dot.setAttribute("aria-hidden", "true");
        dot.style.cssText =
          "width:22px;height:22px;border-radius:9999px;background:#f5a400;border:3px solid #fff;box-shadow:0 0 0 6px rgba(245,164,0,.28),0 2px 6px rgba(0,0,0,.5);";
        markerRef.current = new Marker({ element: dot }).setLngLat([p.position.lng, p.position.lat]).addTo(map);
      } else {
        markerRef.current.setLngLat([p.position.lng, p.position.lat]);
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (p.fitKey && p.fitKey !== lastFitKey.current) {
      const flat = p.routes.flat();
      if (flat.length) {
        lastFitKey.current = p.fitKey;
        if (flat.length === 1) {
          map.easeTo({ center: flat[0], zoom: FOLLOW_ZOOM, duration: 600 });
        } else {
          const bounds = flat.reduce((b, c) => b.extend(c), new LngLatBounds(flat[0], flat[0]));
          map.fitBounds(bounds, { padding: fitPadding(), maxZoom: 16, duration: 700 });
        }
      }
    } else if (!p.fitKey) {
      lastFitKey.current = null;
    }

    if (p.position && p.centerNonce !== handledNonce.current) {
      handledNonce.current = p.centerNonce;
      map.easeTo({ center: [p.position.lng, p.position.lat], zoom: Math.max(map.getZoom(), FOLLOW_ZOOM), duration: 700 });
    } else if (p.position && p.follow) {
      map.easeTo({ center: [p.position.lng, p.position.lat], zoom: Math.max(map.getZoom(), FOLLOW_ZOOM), duration: 500 });
    }
  }

  useEffect(() => {
    syncAll();
  }, [props.routes, props.fitKey, props.position, props.follow, props.centerNonce]);

  const retry = () => {
    setLoad({ kind: "loading" });
    setTileWarning(false);
    setAttempt((a) => a + 1);
  };

  const error: string | null = !webgl
    ? "Your browser or device can't display the interactive map (WebGL is unavailable). Ride tracking still works without it."
    : load.kind === "error"
      ? load.message
      : null;

  return (
    <div className="relative h-full w-full bg-asphalt">
      <div
        ref={containerRef}
        // MapLibre's CSS sets this element to position: relative, so size it
        // explicitly rather than relying on absolute positioning.
        className="absolute inset-0 h-full w-full"
        role="region"
        aria-label="Map. Use the arrow keys to pan and plus or minus to zoom."
      />

      {load.kind === "loading" && webgl && (
        <p role="status" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-on-asphalt-muted">
          Loading map…
        </p>
      )}

      {error && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center bg-asphalt p-6">
          <div className="max-w-sm text-center text-on-asphalt">
            <MapPinOff aria-hidden className="mx-auto mb-3 h-10 w-10 text-accent" />
            <p className="font-display text-xl font-bold uppercase tracking-wide">Map unavailable</p>
            <p className="mt-2 text-sm text-on-asphalt-muted">{error}</p>
            <p className="mt-1 text-sm text-on-asphalt-muted">Ride stats keep working without the map.</p>
            {webgl && (
              <button
                type="button"
                onClick={retry}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover"
              >
                <RefreshCw aria-hidden className="h-4 w-4" /> Try again
              </button>
            )}
          </div>
        </div>
      )}

      {tileWarning && !error && (
        <div className="absolute left-1/2 top-3 z-10 flex max-w-[calc(100%-7rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-asphalt-2/95 py-1 pl-3 pr-1 text-xs text-on-asphalt shadow-md">
          <WifiOff aria-hidden className="h-4 w-4 shrink-0 text-accent" />
          <span>Some map tiles didn&apos;t load.</span>
          <button
            type="button"
            onClick={() => setTileWarning(false)}
            className="min-h-9 rounded-full px-2 font-semibold text-accent hover:bg-asphalt-line"
          >
            Dismiss
          </button>
        </div>
      )}

      {!error && (props.onLocate || props.showFollowToggle) && (
        <div className="absolute right-2.5 top-[118px] z-10 flex flex-col gap-2">
          {props.onLocate && (
            <button
              type="button"
              onClick={props.onLocate}
              aria-label="Centre the map on my location"
              title="Centre on my location"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-asphalt-2 text-on-asphalt shadow-md ring-1 ring-asphalt-line hover:bg-asphalt-line"
            >
              <Crosshair aria-hidden className="h-5 w-5" />
            </button>
          )}
          {props.showFollowToggle && (
            <button
              type="button"
              onClick={() => props.onFollowChange(!props.follow)}
              aria-pressed={props.follow}
              aria-label="Follow my position"
              title={props.follow ? "Following your position" : "Follow your position"}
              className={`flex h-11 w-11 items-center justify-center rounded-full shadow-md ring-1 ${props.follow ? "bg-accent text-on-accent ring-accent" : "bg-asphalt-2 text-on-asphalt ring-asphalt-line hover:bg-asphalt-line"}`}
            >
              {props.follow ? <LocateFixed aria-hidden className="h-5 w-5" /> : <LocateOff aria-hidden className="h-5 w-5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
