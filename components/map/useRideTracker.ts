"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_ACCURACY_M } from "@/lib/geo";
import type { RoutePoint } from "@/lib/model";
import {
  addFix,
  breakSegment,
  createTracker,
  end as endTracker,
  freezeInterrupted,
  geoProblemFromCode,
  parseStoredTracker,
  pause as pauseTracker,
  resume as resumeTracker,
  serializeTracker,
  type GeoProblem,
  type StoredRide,
  type TrackerState,
} from "@/lib/ride-tracker";

// Browser side of ride tracking: geolocation, wake lock, persistence.
// All maths lives in lib/ride-tracker.ts.

export const ACTIVE_RIDE_KEY = "ride-buddy-active-ride";

// If the page was hidden this long, we likely missed fixes: start a new segment.
const BACKGROUND_GAP_MS = 20_000;

export type Phase = "idle" | "requesting" | "waiting" | "active" | "ended";
export type Fix = RoutePoint;
export type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

function readStored(): StoredRide | null {
  try {
    return parseStoredTracker(window.localStorage.getItem(ACTIVE_RIDE_KEY));
  } catch {
    return null;
  }
}

function writeStored(tracker: TrackerState) {
  try {
    window.localStorage.setItem(ACTIVE_RIDE_KEY, serializeTracker(tracker, Date.now()));
  } catch {
    // Storage full or blocked: tracking still works, recovery after reload won't.
  }
}

function clearStored() {
  try {
    window.localStorage.removeItem(ACTIVE_RIDE_KEY);
  } catch {
    // ignore
  }
}

function toFix(pos: GeolocationPosition): Fix {
  const now = Date.now();
  const t = Number.isFinite(pos.timestamp) && Math.abs(pos.timestamp - now) < 120_000 ? pos.timestamp : now;
  return { lng: pos.coords.longitude, lat: pos.coords.latitude, acc: pos.coords.accuracy, t };
}

function preflightProblem(): GeoProblem | null {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  if (!("geolocation" in navigator)) return "unsupported";
  return null;
}

export function useRideTracker() {
  const [tracker, setTracker] = useState<TrackerState | null>(null);
  const [watching, setWatching] = useState(false);
  const [gotFix, setGotFix] = useState(false); // any fix since the current watch started
  const [lastFix, setLastFix] = useState<Fix | null>(null);
  const [problem, setProblem] = useState<GeoProblem | null>(null); // blocks tracking
  const [signalWarning, setSignalWarning] = useState<GeoProblem | null>(null); // non-blocking
  const [gapNotice, setGapNotice] = useState(false);
  const [wakeLockOn, setWakeLockOn] = useState(false);
  const [permission, setPermission] = useState<GeoPermission>("unknown");
  const [interrupted, setInterrupted] = useState<StoredRide | null>(readStored);
  const [now, setNow] = useState(() => Date.now());
  const [locating, setLocating] = useState(false);

  const watchId = useRef<number | null>(null);
  const trackerRef = useRef<TrackerState | null>(null);
  useEffect(() => {
    trackerRef.current = tracker;
  }, [tracker]);

  // ---- Permission state (read-only query; never prompts) ----
  useEffect(() => {
    let cancelled = false;
    let status: PermissionStatus | null = null;
    const onChange = () => status && setPermission(status.state as GeoPermission);
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((s) => {
        if (cancelled) return;
        status = s;
        setPermission(s.state as GeoPermission);
        s.addEventListener("change", onChange);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      status?.removeEventListener("change", onChange);
    };
  }, []);

  // ---- Geolocation watch ----
  const stopWatch = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  }, []);

  const startWatch = useCallback(() => {
    if (watchId.current !== null) return true;
    const pre = preflightProblem();
    if (pre) {
      setProblem(pre);
      return false;
    }
    setProblem(null);
    setSignalWarning(null);
    setGotFix(false);
    setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (watchId.current === null) return;
        const fix = toFix(pos);
        setPermission("granted");
        setLastFix(fix);
        setGotFix(true);
        setSignalWarning(null);
        setTracker((prev) => {
          if (prev) return addFix(prev, fix).state;
          // Start the clock at the first accurate fix.
          if (fix.acc <= MAX_ACCURACY_M) return addFix(createTracker(Date.now()), fix).state;
          return prev;
        });
      },
      (err) => {
        if (watchId.current === null) return;
        const p = geoProblemFromCode(err.code);
        if (p === "denied") {
          if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
          setWatching(false);
          setPermission("denied");
          setProblem("denied");
          setTracker((t) => (t && t.status === "tracking" ? pauseTracker(t, Date.now()) : t));
          return;
        }
        setSignalWarning(p);
        // GPS went quiet: don't draw a straight line across the gap.
        setTracker((t) => (t ? breakSegment(t) : t));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );
    return true;
  }, []);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const isTracking = tracker?.status === "tracking";
  const keepAwake = isTracking || (watching && !tracker);

  // ---- Clock ----
  useEffect(() => {
    if (!keepAwake) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [keepAwake]);

  // ---- Persist the in-progress ride so a reload can recover it ----
  useEffect(() => {
    if (tracker) writeStored(tracker);
  }, [tracker]);

  useEffect(() => {
    if (!isTracking) return;
    const id = window.setInterval(() => {
      if (trackerRef.current) writeStored(trackerRef.current);
    }, 10_000);
    return () => window.clearInterval(id);
  }, [isTracking]);

  // ---- Page hidden: browsers usually stop delivering GPS ----
  useEffect(() => {
    if (!isTracking) return;
    let hiddenAt: number | null = document.visibilityState === "hidden" ? Date.now() : null;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        if (trackerRef.current) writeStored(trackerRef.current);
      } else if (hiddenAt !== null) {
        const gap = Date.now() - hiddenAt;
        hiddenAt = null;
        if (gap > BACKGROUND_GAP_MS) {
          setTracker((t) => (t ? breakSegment(t) : t));
          setGapNotice(true);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isTracking]);

  // ---- Screen wake lock (best effort) ----
  useEffect(() => {
    if (!keepAwake || !("wakeLock" in navigator)) return;
    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) {
          s.release().catch(() => {});
          return;
        }
        sentinel = s;
        setWakeLockOn(true);
        s.addEventListener("release", () => setWakeLockOn(false));
      } catch {
        setWakeLockOn(false);
      }
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      sentinel?.release().catch(() => {});
      setWakeLockOn(false);
    };
  }, [keepAwake]);

  // ---- Actions ----
  const start = useCallback(() => {
    setGapNotice(false);
    setNow(Date.now());
    startWatch();
  }, [startWatch]);

  const cancel = useCallback(() => {
    stopWatch();
    setSignalWarning(null);
    setTracker(null);
    clearStored();
  }, [stopWatch]);

  const pause = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setTracker((s) => (s ? pauseTracker(s, t) : s));
  }, []);

  const resume = useCallback(() => {
    if (!startWatch()) return;
    const t = Date.now();
    setNow(t);
    setGapNotice(false);
    setTracker((s) => (s ? resumeTracker(s, t) : s));
  }, [startWatch]);

  const end = useCallback(() => {
    const t = Date.now();
    setNow(t);
    stopWatch();
    setSignalWarning(null);
    setTracker((s) => (s ? endTracker(s, t) : s));
  }, [stopWatch]);

  // Ride saved or discarded: forget it.
  const reset = useCallback(() => {
    stopWatch();
    setTracker(null);
    setSignalWarning(null);
    setGapNotice(false);
    clearStored();
  }, [stopWatch]);

  // ---- Interrupted ride from a previous page load ----
  const resumeInterrupted = useCallback(() => {
    if (!interrupted) return;
    const frozen = freezeInterrupted(interrupted);
    setInterrupted(null);
    if (frozen.status === "ended") {
      setTracker(frozen);
      return;
    }
    setTracker(frozen); // paused until GPS restarts
    if (!startWatch()) return;
    const t = Date.now();
    setNow(t);
    setTracker(resumeTracker(frozen, t));
  }, [interrupted, startWatch]);

  const finishInterrupted = useCallback(() => {
    if (!interrupted) return;
    const frozen = freezeInterrupted(interrupted);
    setInterrupted(null);
    setTracker(frozen.status === "ended" ? frozen : endTracker(frozen, Math.max(interrupted.savedAt, frozen.startedAt)));
  }, [interrupted]);

  const discardInterrupted = useCallback(() => {
    setInterrupted(null);
    clearStored();
  }, []);

  // One-off "where am I" (only when the user taps locate).
  const locateOnce = useCallback(() => {
    if (watchId.current !== null) return;
    const pre = preflightProblem();
    if (pre) {
      setProblem(pre);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPermission("granted");
        setLastFix(toFix(pos));
      },
      (err) => {
        setLocating(false);
        const p = geoProblemFromCode(err.code);
        if (p === "denied") {
          setPermission("denied");
          setProblem("denied");
        } else setSignalWarning(p);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }, []);

  let phase: Phase = "idle";
  if (tracker) phase = tracker.status === "ended" ? "ended" : "active";
  else if (watching) phase = gotFix ? "waiting" : "requesting";

  return {
    phase,
    tracker,
    now,
    lastFix,
    problem,
    signalWarning,
    gapNotice,
    wakeLockOn,
    permission,
    interrupted,
    locating,
    dismissProblem: () => setProblem(null),
    dismissSignalWarning: () => setSignalWarning(null),
    dismissGapNotice: () => setGapNotice(false),
    start,
    cancel,
    pause,
    resume,
    end,
    reset,
    resumeInterrupted,
    finishInterrupted,
    discardInterrupted,
    locateOnce,
  };
}
