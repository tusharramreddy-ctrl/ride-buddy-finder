"use client";

import { useRef, useState } from "react";
import { Button, Card } from "./ui";

export function IntroPanel({
  riderName,
  text,
  onChange,
  onRedraft,
  redrafting,
}: {
  riderName: string;
  text: string;
  onChange: (text: string) => void;
  onRedraft: () => void;
  redrafting: boolean;
}) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const boxRef = useRef<HTMLTextAreaElement>(null);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Some browsers block the modern clipboard API; fall back to the older
      // "select the text and copy" method.
      const box = boxRef.current;
      if (box) {
        box.focus();
        box.select();
        try {
          ok = document.execCommand("copy");
        } catch {
          ok = false;
        }
      }
    }
    setCopied(ok ? "done" : "failed");
    setTimeout(() => setCopied("idle"), 2500);
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">Your intro to {riderName}</h2>
      <p className="mt-1 text-sm text-muted">
        Edit it however you like, then copy it. Nothing is sent from this app.
      </p>
      <label htmlFor="intro" className="sr-only">Introduction message</label>
      <textarea
        id="intro"
        ref={boxRef}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="mt-4 w-full resize-y rounded-xl border border-border bg-surface p-3.5 text-base leading-relaxed focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button onClick={copy} disabled={!text.trim()}>
          {copied === "done" ? "Copied ✓" : "Copy"}
        </Button>
        <Button variant="secondary" onClick={onRedraft} loading={redrafting}>
          {redrafting ? "Drafting…" : "Draft again"}
        </Button>
        {copied === "failed" && (
          <p className="text-sm text-danger">Couldn&apos;t copy automatically. Select the text and copy it instead.</p>
        )}
      </div>
    </Card>
  );
}
