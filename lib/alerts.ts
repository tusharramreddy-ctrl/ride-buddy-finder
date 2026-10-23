// Small pop-ups for incoming messages. Each one stays for ALERT_MS, with a bar
// that empties over the same time, then leaves the screen.

export const ALERT_MS = 3000;
const MAX_SHOWN = 3;

export type MessageAlert = {
  id: string; // the message id, so the same message never pops up twice
  fromId: string; // sender's user id; the name and photo are looked up when shown
  groupId: string | null; // set for group messages
  text: string;
  href: string; // the conversation to open
};

let alerts: MessageAlert[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeAlerts(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function currentAlerts() {
  return alerts;
}

export function dismissAlert(id: string) {
  if (!alerts.some((a) => a.id === id)) return;
  alerts = alerts.filter((a) => a.id !== id);
  emit();
}

export function showMessageAlert(alert: MessageAlert) {
  // No pop-up for the conversation that's already open.
  if (typeof window !== "undefined" && decodeURIComponent(window.location.pathname) === alert.href) return;
  if (alerts.some((a) => a.id === alert.id)) return;
  alerts = [...alerts, alert].slice(-MAX_SHOWN);
  emit();
  setTimeout(() => dismissAlert(alert.id), ALERT_MS);
}
