import { describe, expect, it } from "vitest";
import { QUIZ, scoreQuiz } from "@/lib/quiz";

describe("scoreQuiz", () => {
  it("has 7 questions with one option per character", () => {
    expect(QUIZ).toHaveLength(7);
    for (const q of QUIZ) {
      expect(new Set(q.options.map((o) => o.character)).size).toBe(4);
    }
  });

  it("picks the character with the most points", () => {
    expect(scoreQuiz([2, 2, 2, 2, 0, 1, 3])).toBe("carver");
    expect(scoreQuiz([3, 3, 3, 3, 3, 3, 3])).toBe("social");
  });

  it("breaks ties using the earliest choice", () => {
    // 2 explorer, 2 cruiser, 2 social, 1 carver -> explorer was picked first
    expect(scoreQuiz([1, 0, 3, 1, 0, 3, 2])).toBe("explorer");
  });

  it("rejects unanswered or invalid quizzes", () => {
    expect(scoreQuiz([])).toBeNull();
    expect(scoreQuiz([0, 0, 0])).toBeNull();
    expect(scoreQuiz([0, 0, 0, 0, 0, 0, 9])).toBeNull();
    expect(scoreQuiz([0, 0, 0, 0, 0, 0, 1.5])).toBeNull();
  });
});
