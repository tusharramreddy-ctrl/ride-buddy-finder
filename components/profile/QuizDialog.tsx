"use client";

import { useState } from "react";
import { CHARACTERS, type CharacterId } from "@/lib/constants";
import { QUIZ, scoreQuiz } from "@/lib/quiz";
import { Button, Dialog, ErrorMessage } from "../ui";

// Optional riding-style quiz. Scored by plain code (lib/quiz.ts).
export function QuizDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (style: CharacterId, answers: number[]) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Riding-style quiz">
      {open && <QuizBody onDone={onDone} />}
    </Dialog>
  );
}

function QuizBody({ onDone }: { onDone: (style: CharacterId, answers: number[]) => void }) {
  const [answers, setAnswers] = useState<number[]>(() => QUIZ.map(() => -1));
  const [i, setI] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CharacterId | null>(null);
  const q = QUIZ[i];

  if (result) {
    const c = CHARACTERS[result];
    return (
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-ink">Your riding style</p>
        <p className="mt-1 font-display text-4xl font-extrabold uppercase">{c.name}</p>
        <p className="mx-auto mt-2 max-w-sm text-ink-2">{c.blurb}</p>
        <Button className="mt-5" onClick={() => onDone(result, answers)}>
          Save to my profile
        </Button>
      </div>
    );
  }

  function next() {
    if (answers[i] < 0) return setError("Pick the answer that fits you best. There are no wrong answers!");
    setError("");
    if (i < QUIZ.length - 1) return setI(i + 1);
    const style = scoreQuiz(answers);
    if (style) setResult(style);
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Question {i + 1} of {QUIZ.length}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((i + 1) / QUIZ.length) * 100}%` }} />
      </div>
      <h3 className="mt-4 text-lg font-bold">{q.question}</h3>
      <div role="radiogroup" aria-label={q.question} className="mt-3 grid gap-2">
        {q.options.map((o, k) => (
          <button
            key={o.text}
            type="button"
            role="radio"
            aria-checked={answers[i] === k}
            onClick={() => (setError(""), setAnswers((a) => a.map((v, j) => (j === i ? k : v))))}
            className={`rounded-xl border p-3 text-left text-sm transition-colors ${answers[i] === k ? "border-ink bg-ink text-white" : "border-line-strong hover:border-ink-2"}`}
          >
            {o.text}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <ErrorMessage>{error}</ErrorMessage>
      </div>
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          Back
        </Button>
        <Button onClick={next}>{i === QUIZ.length - 1 ? "See my style" : "Next"}</Button>
      </div>
    </div>
  );
}
