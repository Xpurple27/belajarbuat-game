"use client";

import TugArena from "@/src/components/TugArena";
import type { ArenaGameState, GameMode } from "@/src/core/game";

interface ArenaVisualProps {
  mode: GameMode;
  state: ArenaGameState;
}

export default function ArenaVisual({ mode, state }: ArenaVisualProps) {
  if (mode === "tug-of-war" && state.kind === "tug-of-war") {
    return <TugArena position={state.position} target={state.target} winner={state.winner} />;
  }

  if (mode === "racing" && state.kind === "racing") {
    const a = Math.min(100, (state.distanceA / state.target) * 100);
    const b = Math.min(100, (state.distanceB / state.target) * 100);
    return (
      <div className="modeArena raceArena" aria-label="Math Racing">
        <div className="arenaSky">MATH RACING <span>🏁</span></div>
        <div className="raceLane"><div className="raceGrid" /><div className="raceCar carA" style={{ left: `calc(${a}% - 42px)` }}>🏎️</div></div>
        <div className="raceLane"><div className="raceGrid" /><div className="raceCar carB" style={{ left: `calc(${b}% - 42px)` }}>🚙</div></div>
        <div className="arenaFooter">A {state.distanceA}/{state.target} · B {state.distanceB}/{state.target}{state.winner ? ` · Winner: ${state.winner}` : ""}</div>
      </div>
    );
  }

  if (mode === "boss-battle" && state.kind === "boss-battle") {
    const hp = Math.max(0, (state.bossHp / state.maxBossHp) * 100);
    return (
      <div className="modeArena bossArena" aria-label="Boss Battle">
        <div className="bossHud"><strong>👹 LORD ALGEBRA</strong><div className="hpTrack"><div className="hpFill" style={{ width: `${hp}%` }} /></div><span>{state.bossHp}/{state.maxBossHp} HP</span></div>
        <div className="battleStage"><div className="pixelHero">🧙‍♂️<small>A</small></div><div className={state.lastCombo ? "bossSprite combo" : "bossSprite"}>👹</div><div className="pixelHero">🧙‍♀️<small>B</small></div></div>
        <div className="arenaFooter">Damage A: {state.totalDamageA} · Damage B: {state.totalDamageB}{state.lastCombo ? " · COMBO +10!" : ""}</div>
      </div>
    );
  }

  if (mode === "bomb-defuse" && state.kind === "bomb-defuse") {
    return (
      <div className="modeArena bombArena" aria-label="Bomb Defuse">
        <div className="bombIcon">💣</div>
        <div className="bombDisplay">CLUES {state.correctContributions}/{state.targetContributions}</div>
        <div className="wireRow"><span className="wire red" /><span className="wire blue" /><span className="wire yellow" /><span className="wire green" /></div>
        <div className="bombMeters"><span>✅ {state.correctContributions}/{state.targetContributions}</span><span>⚠️ {state.strikes}/{state.maxStrikes}</span></div>
        <div className="arenaFooter">{state.complete ? (state.success ? "BOMB DEFUSED!" : "BOOM — mission failed") : "Jawab bersama untuk membuka prosedur defuse."}</div>
      </div>
    );
  }

  return <div className="modeArena"><div className="arenaFooter">Menyiapkan arena...</div></div>;
}
