export type Difficulty = "easy" | "medium" | "hard";
export type PlayerSide = "A" | "B";
export type GameMode = "tug-of-war" | "racing" | "boss-battle" | "bomb-defuse";

export const POWER_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export interface RoundAnswer {
  player: PlayerSide;
  correct: boolean;
  difficulty: Difficulty;
  responseTimeMs: number;
}

export interface TugOfWarState {
  position: number;
  target: number;
  winner: PlayerSide | null;
}

export function createTugOfWarState(target = 10): TugOfWarState {
  return { position: 0, target, winner: null };
}

export function resolveTugOfWarRound(
  state: TugOfWarState,
  answerA: RoundAnswer,
  answerB: RoundAnswer,
): TugOfWarState {
  if (state.winner) return state;

  const powerA = answerA.correct ? POWER_BY_DIFFICULTY[answerA.difficulty] : 0;
  const powerB = answerB.correct ? POWER_BY_DIFFICULTY[answerB.difficulty] : 0;
  const rawPosition = state.position + powerA - powerB;
  const position = Math.max(-state.target, Math.min(state.target, rawPosition));

  return {
    ...state,
    position,
    winner: position >= state.target ? "A" : position <= -state.target ? "B" : null,
  };
}

export function tugProgressPercent(state: TugOfWarState): number {
  return ((state.position + state.target) / (state.target * 2)) * 100;
}
