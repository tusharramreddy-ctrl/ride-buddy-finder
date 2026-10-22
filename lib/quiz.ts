import { CHARACTER_IDS, type CharacterId } from "./constants";

// Each answer gives one point to one riding character.
// Scoring is plain code, so the same answers always give the same result.

export type QuizOption = { text: string; character: CharacterId };
export type QuizQuestion = { id: string; question: string; options: QuizOption[] };

export const QUIZ: QuizQuestion[] = [
  {
    id: "sunday",
    question: "Your perfect Sunday ride is…",
    options: [
      { text: "A slow, scenic loop to Nandi Hills for the sunrise", character: "cruiser" },
      { text: "Heading somewhere you've never been, maybe 300 km away", character: "explorer" },
      { text: "A twisty ghat road, ridden again and again", character: "carver" },
      { text: "A group breakfast run to a dosa place", character: "social" },
    ],
  },
  {
    id: "hairpins",
    question: "A mountain road full of hairpin bends makes you feel…",
    options: [
      { text: "Careful. I'll take it slow and enjoy the view", character: "cruiser" },
      { text: "Curious about what's at the top", character: "explorer" },
      { text: "Excited. This is the best part", character: "carver" },
      { text: "Happy, as long as we regroup at the top", character: "social" },
    ],
  },
  {
    id: "stop",
    question: "Your favourite kind of stop is…",
    options: [
      { text: "A quiet viewpoint with nobody around", character: "cruiser" },
      { text: "A small village you'd never find on a map", character: "explorer" },
      { text: "A fuel stop, then straight back to riding", character: "carver" },
      { text: "A chai tapri where the whole group can hang out", character: "social" },
    ],
  },
  {
    id: "trip",
    question: "Someone says \"let's do a ride\". You're picturing…",
    options: [
      { text: "Two or three easy hours with no fixed plan", character: "cruiser" },
      { text: "A multi-day trip with luggage packed", character: "explorer" },
      { text: "An early-morning blast on empty roads", character: "carver" },
      { text: "Ten bikes in formation and lots of photos", character: "social" },
    ],
  },
  {
    id: "road",
    question: "The road turns into gravel and mud. You…",
    options: [
      { text: "Turn around and find a smoother route", character: "cruiser" },
      { text: "Keep going. Adventure starts here", character: "explorer" },
      { text: "Turn around. I'd rather have grip and corners", character: "carver" },
      { text: "Do whatever the group decides", character: "social" },
    ],
  },
  {
    id: "upgrade",
    question: "Your next bike upgrade would be…",
    options: [
      { text: "A comfier seat and a good phone mount", character: "cruiser" },
      { text: "Panniers, crash guards and a bigger tank", character: "explorer" },
      { text: "Better tyres and suspension", character: "carver" },
      { text: "A Bluetooth intercom to chat while riding", character: "social" },
    ],
  },
  {
    id: "best",
    question: "The best part of riding is…",
    options: [
      { text: "The calm. It clears my head", character: "cruiser" },
      { text: "Discovering new places", character: "explorer" },
      { text: "The skill and the thrill", character: "carver" },
      { text: "The people I ride with", character: "social" },
    ],
  },
];

// answers[i] is the index of the option chosen for QUIZ[i].
// Returns null if any question is unanswered or the answer is out of range.
export function scoreQuiz(answers: readonly number[]): CharacterId | null {
  if (answers.length !== QUIZ.length) return null;

  const points: Record<CharacterId, number> = { cruiser: 0, explorer: 0, carver: 0, social: 0 };
  const picked: CharacterId[] = [];

  for (let i = 0; i < QUIZ.length; i++) {
    const option = QUIZ[i].options[answers[i]];
    if (!Number.isInteger(answers[i]) || !option) return null;
    points[option.character] += 1;
    picked.push(option.character);
  }

  const best = Math.max(...Object.values(points));
  const tied = CHARACTER_IDS.filter((c) => points[c] === best);
  if (tied.length === 1) return tied[0];

  // Tie-break: whichever tied character the rider chose first in the quiz.
  return picked.find((c) => tied.includes(c)) ?? tied[0];
}
