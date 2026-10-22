"use client";

import dynamic from "next/dynamic";

// The app reads the profile saved on this device, which only exists in the
// browser, so it is not rendered on the server.
export const ClientApp = dynamic(() => import("./App").then((m) => m.App), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-surface-muted" aria-label="Loading" />,
});
