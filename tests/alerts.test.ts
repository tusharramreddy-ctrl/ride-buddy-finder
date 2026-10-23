import { afterEach, describe, expect, it, vi } from "vitest";
import { ALERT_MS, currentAlerts, dismissAlert, showMessageAlert, type MessageAlert } from "@/lib/alerts";

const alert = (id: string): MessageAlert => ({ id, fromId: "u1", groupId: null, text: "Ride on Sunday?", href: "/chat/dm-u1" });

describe("message pop-ups", () => {
  afterEach(() => {
    currentAlerts().forEach((a) => dismissAlert(a.id));
    vi.useRealTimers();
  });

  it("leaves the screen after 3 seconds", () => {
    vi.useFakeTimers();
    showMessageAlert(alert("m1"));
    expect(ALERT_MS).toBe(3000);
    vi.advanceTimersByTime(2999);
    expect(currentAlerts().map((a) => a.id)).toEqual(["m1"]);
    vi.advanceTimersByTime(1);
    expect(currentAlerts()).toEqual([]);
  });

  it("never shows the same message twice, and keeps at most 3", () => {
    vi.useFakeTimers();
    ["a", "b", "a", "c", "d"].forEach((id) => showMessageAlert(alert(id)));
    expect(currentAlerts().map((a) => a.id)).toEqual(["b", "c", "d"]);
  });

  it("can be closed early", () => {
    vi.useFakeTimers();
    showMessageAlert(alert("m2"));
    dismissAlert("m2");
    expect(currentAlerts()).toEqual([]);
  });
});
