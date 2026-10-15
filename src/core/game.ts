export type Difficulty = "easy" | "medium" | "hard";
export type PlayerSide = "A" | "B";
export type GameMode = "tug-of-war" | "racing" | "boss-battle" | "bomb-defuse";
export type OpponentMode = "multiplayer" | "ai";
export type AiDifficulty = "easy" | "medium" | "hard";
export type ArenaWinner = PlayerSide | "draw" | null;

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

interface RoundBoundedState {
  roundsPlayed: number;
  maxRounds: number;
  complete: boolean;
}

export interface TugOfWarState extends RoundBoundedState {
  kind: "tug-of-war";
  position: number;
  target: number;
  winner: ArenaWinner;
  totalPowerA: number;
  totalPowerB: number;
  lastDelta: number;
}

export interface RacingState extends RoundBoundedState {
  kind: "racing";
  distanceA: number;
  distanceB: number;
  target: number;
  winner: ArenaWinner;
  totalTimeA: number;
  totalTimeB: number;
}

export interface BossBattleState extends RoundBoundedState {
  kind: "boss-battle";
  bossHp: number;
  maxBossHp: number;
  totalDamageA: number;
  totalDamageB: number;
  lastCombo: boolean;
  lastDamage: number;
  success: boolean;
}

export interface BombDefuseState extends RoundBoundedState {
  kind: "bomb-defuse";
  correctContributions: number;
  targetContributions: number;
  strikes: number;
  maxStrikes: number;
  success: boolean;
  lastCorrect: number;
}

export type ArenaGameState = TugOfWarState | RacingState | BossBattleState | BombDefuseState;

export function createTugOfWarState(target = 10, maxRounds = 10): TugOfWarState {
  return {
    kind: "tug-of-war",
    position: 0,
    target,
    winner: null,
    complete: false,
    roundsPlayed: 0,
    maxRounds,
    totalPowerA: 0,
    totalPowerB: 0,
    lastDelta: 0,
  };
}

export function createRacingState(target = 18, maxRounds = 8): RacingState {
  return {
    kind: "racing",
    distanceA: 0,
    distanceB: 0,
    target,
    winner: null,
    complete: false,
    roundsPlayed: 0,
    maxRounds,
    totalTimeA: 0,
    totalTimeB: 0,
  };
}

export function createBossBattleState(maxBossHp = 220, maxRounds = 6): BossBattleState {
  return {
    kind: "boss-battle",
    bossHp: maxBossHp,
    maxBossHp,
    totalDamageA: 0,
    totalDamageB: 0,
    lastCombo: false,
    lastDamage: 0,
    complete: false,
    success: false,
    roundsPlayed: 0,
    maxRounds,
  };
}

export function createBombDefuseState(targetContributions = 6, maxStrikes = 4, maxRounds = 4): BombDefuseState {
  return {
    kind: "bomb-defuse",
    correctContributions: 0,
    targetContributions,
    strikes: 0,
    maxStrikes,
    complete: false,
    success: false,
    lastCorrect: 0,
    roundsPlayed: 0,
    maxRounds,
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

function powerFor(answer: RoundAnswer): number {
  return answer.correct ? POWER_BY_DIFFICULTY[answer.difficulty] : 0;
}

export function resolveTugOfWarRound(
  state: TugOfWarState,
  answerA: RoundAnswer,
  answerB: RoundAnswer,
): TugOfWarState {
  if (state.complete) return state;
  const powerA = powerFor(answerA);
  const powerB = powerFor(answerB);
  const lastDelta = powerA - powerB;
  const rawPosition = state.position + lastDelta;
  const position = Math.max(-state.target, Math.min(state.target, rawPosition));
  const roundsPlayed = state.roundsPlayed + 1;
  const totalPowerA = state.totalPowerA + powerA;
  const totalPowerB = state.totalPowerB + powerB;

  let winner: ArenaWinner = position >= state.target ? "A" : position <= -state.target ? "B" : null;
  if (!winner && roundsPlayed >= state.maxRounds) {
    if (position > 0) winner = "A";
    else if (position < 0) winner = "B";
    else if (totalPowerA > totalPowerB) winner = "A";
    else if (totalPowerB > totalPowerA) winner = "B";
    else if (answerA.responseTimeMs < answerB.responseTimeMs) winner = "A";
    else if (answerB.responseTimeMs < answerA.responseTimeMs) winner = "B";
    else winner = "draw";
  }

  return {
    ...state,
    position,
    winner,
    complete: winner !== null,
    roundsPlayed,
    totalPowerA,
    totalPowerB,
    lastDelta,
  };
}

export function resolveRacingRound(
  state: RacingState,
  answerA: RoundAnswer,
  answerB: RoundAnswer,
): RacingState {
  if (state.complete) return state;
  const distanceA = Math.min(state.target, state.distanceA + powerFor(answerA));
  const distanceB = Math.min(state.target, state.distanceB + powerFor(answerB));
  const totalTimeA = state.totalTimeA + answerA.responseTimeMs;
  const totalTimeB = state.totalTimeB + answerB.responseTimeMs;
  const roundsPlayed = state.roundsPlayed + 1;
  const aFinished = distanceA >= state.target;
  const bFinished = distanceB >= state.target;

  let winner: ArenaWinner = null;
  if (aFinished && bFinished) {
    winner = answerA.responseTimeMs === answerB.responseTimeMs ? "draw" : answerA.responseTimeMs < answerB.responseTimeMs ? "A" : "B";
  } else if (aFinished) winner = "A";
  else if (bFinished) winner = "B";
  else if (roundsPlayed >= state.maxRounds) {
    if (distanceA > distanceB) winner = "A";
    else if (distanceB > distanceA) winner = "B";
    else if (totalTimeA < totalTimeB) winner = "A";
    else if (totalTimeB < totalTimeA) winner = "B";
    else winner = "draw";
  }

  return {
    ...state,
    distanceA,
    distanceB,
    winner,
    complete: winner !== null,
    roundsPlayed,
    totalTimeA,
    totalTimeB,
  };
}

export function resolveBossBattleRound(
  state: BossBattleState,
  answerA: RoundAnswer,
  answerB: RoundAnswer,
): BossBattleState {
  if (state.complete) return state;
  const damageA = powerFor(answerA) * 10;
  const damageB = powerFor(answerB) * 10;
  const combo = answerA.correct && answerB.correct;
  const comboDamage = combo ? 10 : 0;
  const lastDamage = damageA + damageB + comboDamage;
  const bossHp = Math.max(0, state.bossHp - lastDamage);
  const roundsPlayed = state.roundsPlayed + 1;
  const success = bossHp === 0;
  const complete = success || roundsPlayed >= state.maxRounds;

  return {
    ...state,
    bossHp,
    totalDamageA: state.totalDamageA + damageA,
    totalDamageB: state.totalDamageB + damageB,
    lastCombo: combo,
    lastDamage,
    success,
    complete,
    roundsPlayed,
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
  const roundsPlayed = state.roundsPlayed + 1;
  const success = correctContributions >= state.targetContributions;
  const failed = strikes >= state.maxStrikes || (roundsPlayed >= state.maxRounds && !success);

  return {
    ...state,
    correctContributions,
    strikes,
    success,
    complete: success || failed,
    lastCorrect: correctThisRound,
    roundsPlayed,
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
