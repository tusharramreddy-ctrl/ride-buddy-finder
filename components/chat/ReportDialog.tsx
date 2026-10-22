"use client";

import { useId, useState } from "react";
import { report } from "@/lib/store";
import { Button, Dialog, Field, inputClass, toast } from "../ui";

const REASONS = [
  "Spam or scam",
  "Harassment or hateful language",
  "Inappropriate or offensive content",
  "Unsafe riding or meet-up behaviour",
  "Fake or misleading profile",
  "Something else",
] as const;

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  subject,
}: {
  open: boolean;
  onClose: () => void;
  targetType: "rider" | "group-message";
  targetId: string;
  subject: string;
}) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const name = useId();

  function close() {
    setReason("");
    setDetails("");
    setError("");
    onClose();
  }

  function submit() {
    if (!reason) {
      setError("Choose a reason so we know what's wrong.");
      return;
    }
    const extra = details.trim().slice(0, 500);
    report({ targetType, targetId, reason: extra ? `${reason}: ${extra}` : reason });
    toast("Report saved. Thanks. (No moderation team reviews reports yet.)", "info");
    close();
  }

  return (
    <Dialog open={open} onClose={close} title={targetType === "rider" ? "Report rider" : "Report message"}>
      <p className="text-sm text-ink-2">
        What&apos;s wrong with {subject}? <span className="text-muted">Reports are saved, but no moderation team reviews them yet.</span>
      </p>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold text-ink">Reason</legend>
        <div className="space-y-1.5">
          {REASONS.map((r) => (
            <label
              key={r}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/50 ${reason === r ? "border-ink bg-surface-2 font-semibold text-ink" : "border-line text-ink-2 hover:bg-surface-2"}`}
            >
              <input
                type="radio"
                name={name}
                value={r}
                checked={reason === r}
                onChange={() => {
                  setReason(r);
                  setError("");
                }}
                className="h-4 w-4 accent-[var(--ink)]"
              />
              {r}
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </fieldset>
      <div className="mt-4">
        <Field label="Details (optional)" htmlFor={`${name}-details`} hint={`${500 - details.length} characters left`}>
          <textarea
            id={`${name}-details`}
            value={details}
            maxLength={500}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button variant="dark" onClick={submit}>
          Save report
        </Button>
      </div>
    </Dialog>
  );
}
