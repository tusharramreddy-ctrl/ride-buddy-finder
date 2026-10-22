"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { MAX_MESSAGE } from "./chat-utils";

// Message box: Enter sends, Shift+Enter adds a new line. Text is trimmed and
// limited to MAX_MESSAGE characters. Drafts passed in are only a prefill.
export function Composer({
  onSend,
  placeholder,
  initialText = "",
}: {
  onSend: (text: string) => void;
  placeholder: string;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText.slice(0, MAX_MESSAGE * 2));
  const errorId = useId();
  const trimmed = text.trim();
  const tooLong = trimmed.length > MAX_MESSAGE;
  const canSend = trimmed.length > 0 && !tooLong;

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    onSend(trimmed);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const rows = Math.min(5, Math.max(1, text.split("\n").length));

  return (
    <form onSubmit={submit} className="border-t border-line bg-surface px-3 py-3 sm:px-4">
      <div className="flex items-end gap-2">
        <label htmlFor={`${errorId}-input`} className="sr-only">
          Message
        </label>
        <textarea
          id={`${errorId}-input`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={tooLong || undefined}
          aria-describedby={errorId}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-line-strong bg-surface-2/60 px-4 py-2.5 text-[15px] text-ink placeholder:text-muted focus:border-accent-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          title="Send (Enter)"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send aria-hidden className="h-5 w-5" />
        </button>
      </div>
      <div id={errorId} aria-live="polite" className="px-1">
        {tooLong ? (
          <p className="mt-1.5 text-sm text-danger">
            Messages can be up to {MAX_MESSAGE} characters. This one is {trimmed.length}.
          </p>
        ) : trimmed.length > MAX_MESSAGE - 150 ? (
          <p className="mt-1.5 text-xs text-muted">
            {MAX_MESSAGE - trimmed.length} characters left
          </p>
        ) : null}
      </div>
      <p className="mt-1 hidden px-1 text-[11px] text-muted sm:block">Enter to send · Shift+Enter for a new line</p>
    </form>
  );
}
