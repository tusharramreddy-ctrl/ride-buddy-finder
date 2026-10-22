import { Suspense } from "react";
import { BrandMark } from "@/components/Brand";
import { ClientShell } from "@/components/shell/ClientShell";

// The shell reads data saved in the browser, so it renders only there.
// The Suspense fallback is what loads instantly (and what's prerendered).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center" aria-label="Loading Ride Buddy">
          <BrandMark size={48} className="animate-pulse" />
        </div>
      }
    >
      <ClientShell>{children}</ClientShell>
    </Suspense>
  );
}
