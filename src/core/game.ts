export type Difficulty = "easy" | "medium" | "hard";
export type PlayerSide = "A" | "B";
export type GameMode = "tug-of-war" | "racing" | "boss-battle" | "bomb-defuse";

export const GAME_ORDER: GameMode[] = ["tug-of-war", "racing", "boss-battle", "bomb-defuse"];

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
  kind: "tug-of-war";
  position: number;
  target: number;
  winner: PlayerSide | null;
  complete: boolean;
}

export interface RacingState {
  kind: "racing";
  distanceA: number;
  distanceB: number;
  target: number;
  winner: PlayerSide | "draw" | null;
  complete: boolean;
}

export interface BossBattleState {
  kind: "boss-battle";
  bossHp: number;
  maxBossHp: number;
  totalDamageA: number;
  totalDamageB: number;
  lastCombo: boolean;
  complete: boolean;
}

export interface BombDefuseState {
  kind: "bomb-defuse";
  correctContributions: number;
  targetContributions: number;
  strikes: number;
  maxStrikes: number;
  complete: boolean;
  success: boolean;
}

export type ArenaGameState = TugOfWarState | RacingState | BossBattleState | BombDefuseState;

export function createTugOfWarState(target = 10): TugOfWarState {
  return { kind: "tug-of-war", position: 0, target, winner: null, complete: false };
}

export function createRacingState(target = 20): RacingState {
  return { kind: "racing", distanceA: 0, distanceB: 0, target, winner: null, complete: false };
}

export function createBossBattleState(maxBossHp = 200): BossBattleState {
  return {
    kind: "boss-battle",
    bossHp: maxBossHp,
    maxBossHp,
    totalDamageA: 0,
    totalDamageB: 0,
    lastCombo: false,
    complete: false,
  };
}

export function createBombDefuseState(targetContributions = 6, maxStrikes = 4): BombDefuseState {
  return {
    kind: "bomb-defuse",
    correctContributions: 0,
    targetContributions,
    strikes: 0,
    maxStrikes,
    complete: false,
    success: false,
  };
}

export function createGameState(mode: GameMode): ArenaGameState {
  switch (mode) {
    case "tug-of-war": return createTugOfWarState();
    case "racing": return createRacingState();
    case "boss-battle": return createBossBattleState();
    case "bomb-defuse": return createBombDefuseState();
  }
}

export function resolveTugOfWarRound(
  state: TugOfWarState,
  answerA: RoundAnswer,
  answerB: RoundAnswer,
): TugOfWarState {
  if (state.complete) return state;
  const powerA = answerA.correct ? POWER_BY_DIFFICULTY[answerA.difficulty] : 0;
  const powerB = answerB.correct ? POWER_BY_DIFFICULTY[answerB.difficulty] : 0;
  const rawPosition = state.position + powerA - powerB;
  const position = Math.max(-state.target, Math.min(state.target, rawPosition));
  const winner = position >= state.target ? "A" : position <= -state.target ? "B" : null;
  return { ...state, position, winner, complete: winner !== null };
}

export function resolveRacingRound(
  state: RacingState,
  answerA: RoundAnswer,
  answerB: RoundAnswer,
): RacingState {
  if (state.complete) return state;
  const distanceA = Math.min(state.target, state.distanceA + (answerA.correct ? POWER_BY_DIFFICULTY[answerA.difficulty] : 0));
  const distanceB = Math.min(state.target, state.distanceB + (answerB.correct ? POWER_BY_DIFFICULTY[answerB.difficulty] : 0));
  const aFinished = distanceA >= state.target;
  const bFinished = distanceB >= state.target;
  let winner: RacingState["winner"] = null;
  if (aFinished && bFinished) {
    winner = answerA.responseTimeMs === answerB.responseTimeMs ? "draw" : answerA.responseTimeMs < answerB.responseTimeMs ? "A" : "B";
  } else if (aFinished) winner = "A";
  else if (bFinished) winner = "B";
  return { ...state, distanceA, distanceB, winner, complete: winner !== null };
}

export function resolveBossBattleRound(
  state: BossBattleState,
  answerA: RoundAnswer,
  answerB: RoundAnswer,
): BossBattleState {
  if (state.complete) return state;
  const damageFor = (answer: RoundAnswer) => answer.correct ? POWER_BY_DIFFICULTY[answer.difficulty] * 10 : 0;
  const damageA = damageFor(answerA);
  const damageB = damageFor(answerB);
  const combo = answerA.correct && answerB.correct;
  const comboDamage = combo ? 10 : 0;
  const bossHp = Math.max(0, state.bossHp - damageA - damageB - comboDamage);
  return {
    ...state,
    bossHp,
    totalDamageA: state.totalDamageA + damageA,
    totalDamageB: state.totalDamageB + damageB,
    lastCombo: combo,
    complete: bossHp === 0,
  };
}

export function resolveBombDefuseRound(
  state: BombDefuseState,
  answerA: RoundAnswer,
  answerB: RoundAnswer,
): BombDefuseState {
  if (state.complete) return state;
  const correctThisRound = Number(answerA.correct) + Number(answerB.correct);
  const wrongThisRound = 2 - correctThisRound;
  const correctContributions = Math.min(state.targetContributions, state.correctContributions + correctThisRound);
  const strikes = Math.min(state.maxStrikes, state.strikes + wrongThisRound);
  const success = correctContributions >= state.targetContributions;
  const failed = strikes >= state.maxStrikes && !success;
  return {
    ...state,
    correctContributions,
    strikes,
    success,
    complete: success || failed,
  };
}

export function resolveArenaRound(
  state: ArenaGameState,
  answerA: RoundAnswer,
  answerB: RoundAnswer,
): ArenaGameState {
  switch (state.kind) {
    case "tug-of-war": return resolveTugOfWarRound(state, answerA, answerB);
    case "racing": return resolveRacingRound(state, answerA, answerB);
    case "boss-battle": return resolveBossBattleRound(state, answerA, answerB);
    case "bomb-defuse": return resolveBombDefuseRound(state, answerA, answerB);
  }
}

export function tugProgressPercent(state: TugOfWarState): number {
  return ((state.position + state.target) / (state.target * 2)) * 100;
}

export function nextGameMode(current: GameMode): GameMode | null {
  const index = GAME_ORDER.indexOf(current);
  return index >= 0 && index < GAME_ORDER.length - 1 ? GAME_ORDER[index + 1] : null;
}
