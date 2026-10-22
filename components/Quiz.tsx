"use client";

import { useState } from "react";
import { QUIZ } from "@/lib/quiz";
import { Button, Card, ErrorMessage } from "./ui";

// One question at a time. answers[i] is the chosen option index, or -1.
export function Quiz({ onDone, onBack }: { onDone: (answers: number[]) => void; onBack: () => void }) {
  const [answers, setAnswers] = useState<number[]>(() => QUIZ.map(() => -1));
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");

  const q = QUIZ[index];
  const isLast = index === QUIZ.length - 1;

  function choose(option: number) {
    setError("");
    setAnswers((a) => a.map((v, i) => (i === index ? option : v)));
  }

  function next() {
    if (answers[index] < 0) {
      setError("Pick the answer that fits you best. There are no wrong answers!");
      return;
    }
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    const firstMissing = answers.findIndex((a) => a < 0);
    if (firstMissing >= 0) {
      setIndex(firstMissing);
      setError("Please answer this question too.");
      return;
    }
    onDone(answers);
  }

  return (
    <Card>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Riding character quiz · {index + 1} of {QUIZ.length}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${((index + 1) / QUIZ.length) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="text-xl font-bold">{q.question}</h2>

      <div role="radiogroup" aria-label={q.question} className="mt-4 grid gap-2">
        {q.options.map((o, i) => {
          const on = answers[index] === i;
          return (
            <button
              key={o.text}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(i)}
              className={`rounded-xl border p-3.5 text-left text-sm transition-colors ${on ? "border-accent bg-accent-soft font-semibold" : "border-border hover:bg-surface-muted"}`}
            >
              {o.text}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <ErrorMessage>{error}</ErrorMessage>
      </div>

      <div className="mt-5 flex justify-between gap-2">
        <Button variant="ghost" onClick={() => (index === 0 ? onBack() : (setError(""), setIndex(index - 1)))}>
          Back
        </Button>
        <Button onClick={next}>{isLast ? "See my riding character" : "Next"}</Button>
      </div>
    </Card>
  );
}
