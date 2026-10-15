import type { AiDifficulty, Difficulty } from "@/src/core/game";

export interface AiProfile {
  accuracy: number;
  minResponseMs: number;
  maxResponseMs: number;
  label: string;
}

export const AI_PROFILES: Record<AiDifficulty, AiProfile> = {
  easy: {
    accuracy: 0.5,
    minResponseMs: 12000,
    maxResponseMs: 28000,
    label: "Rookie Bot",
  },
  medium: {
    accuracy: 0.73,
    minResponseMs: 7000,
    maxResponseMs: 18000,
    label: "Challenger Bot",
  },
  hard: {
    accuracy: 0.9,
    minResponseMs: 3000,
    maxResponseMs: 10500,
    label: "Master Bot",
  },
};

interface SimulateAiInput {
  aiDifficulty: AiDifficulty;
  questionDifficulty: Difficulty;
  correctAnswer: string;
  optionCount: number;
}

export interface SimulatedAiAnswer {
  submittedAnswer: string;
  correct: boolean;
  responseTimeMs: number;
}

function difficultyAdjustment(questionDifficulty: Difficulty): number {
  if (questionDifficulty === "hard") return -0.08;
  if (questionDifficulty === "easy") return 0.05;
  return 0;
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function simulateAiAnswer({
  aiDifficulty,
  questionDifficulty,
  correctAnswer,
  optionCount,
}: SimulateAiInput): SimulatedAiAnswer {
  const profile = AI_PROFILES[aiDifficulty];
  const effectiveAccuracy = Math.max(0.2, Math.min(0.97, profile.accuracy + difficultyAdjustment(questionDifficulty)));
  const correct = Math.random() < effectiveAccuracy;
  const responseTimeMs = randomInt(profile.minResponseMs, profile.maxResponseMs);
  const normalizedCorrect = correctAnswer.trim().toUpperCase();

  if (correct) {
    return { submittedAnswer: normalizedCorrect, correct: true, responseTimeMs };
  }

  const optionLetters = Array.from({ length: Math.max(2, Math.min(optionCount, 5)) }, (_, index) => String.fromCharCode(65 + index));
  const wrongOptions = optionLetters.filter((letter) => letter !== normalizedCorrect);
  const submittedAnswer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)] ?? "__AI_WRONG__";

  return { submittedAnswer, correct: false, responseTimeMs };
}
