"use client";

import dynamic from "next/dynamic";
import { BrandMark } from "../Brand";

// The app reads data saved on this device, which only exists in the browser,
// so the whole shell renders in the browser only.
export const ClientShell = dynamic(() => import("./Shell").then((m) => m.Shell), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center" aria-label="Loading Ride Buddy">
      <BrandMark size={48} className="animate-pulse" />
    </div>
  ),
});
