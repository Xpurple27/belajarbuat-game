"use client";

import TugArena from "@/src/components/TugArena";
import PixelAvatar from "@/src/components/PixelAvatar";
import type { ArenaGameState, GameMode } from "@/src/core/game";

interface ArenaVisualProps {
  mode: GameMode;
  state: ArenaGameState;
  playerALabel?: string;
  playerBLabel?: string;
}

function RoundChip({ current, max }: { current: number; max: number }) {
  return <span className="roundChip">R{Math.min(current, max)}/{max}</span>;
}

function winnerText(winner: "A" | "B" | "draw" | null) {
  if (winner === "draw") return "DRAW";
  return winner ? `PLAYER ${winner} WINS` : "";
}

export default function ArenaVisual({
  mode,
  state,
  playerALabel = "Player A",
  playerBLabel = "Player B",
}: ArenaVisualProps) {
  if (mode === "tug-of-war" && state.kind === "tug-of-war") {
    return (
      <div className="arenaFrame">
        <div className="arenaTitleRow">
          <div><span className="modeKicker">POWER DUEL</span><strong>Tug of War</strong></div>
          <RoundChip current={state.roundsPlayed} max={state.maxRounds} />
        </div>
        <TugArena position={state.position} target={state.target} winner={state.winner} />
        <div className="arenaScoreStrip">
          <span><b>A</b> {playerALabel} · {state.totalPowerA} power</span>
          <strong>{state.complete ? winnerText(state.winner) : `${state.position > 0 ? "+" : ""}${state.position}`}</strong>
          <span>{state.totalPowerB} power · {playerBLabel} <b>B</b></span>
        </div>
      </div>
    );
  }

  if (mode === "racing" && state.kind === "racing") {
    const a = Math.min(100, (state.distanceA / state.target) * 100);
    const b = Math.min(100, (state.distanceB / state.target) * 100);
    return (
      <div className="arenaFrame raceWorld" aria-label="Math Racing">
        <div className="arenaTitleRow">
          <div><span className="modeKicker">SPEED + ACCURACY</span><strong>Math Racing</strong></div>
          <RoundChip current={state.roundsPlayed} max={state.maxRounds} />
        </div>
        <div className="raceScene">
          <div className="raceBackdrop"><i /><i /><i /></div>
          <div className="raceLaneWrap">
            <div className="laneLabel">A</div>
            <div className="raceLane">
              <div className="finishLine" />
              <div className="pixelKart kartA" style={{ left: `calc(${a}% - ${a > 92 ? 54 : 28}px)` }}>
                <div className="kartBody" /><div className="kartSeat" /><div className="wheel wheelOne" /><div className="wheel wheelTwo" />
              </div>
            </div>
            <span className="distanceTag">{state.distanceA}/{state.target}</span>
          </div>
          <div className="raceLaneWrap">
            <div className="laneLabel">B</div>
            <div className="raceLane">
              <div className="finishLine" />
              <div className="pixelKart kartB" style={{ left: `calc(${b}% - ${b > 92 ? 54 : 28}px)` }}>
                <div className="kartBody" /><div className="kartSeat" /><div className="wheel wheelOne" /><div className="wheel wheelTwo" />
              </div>
            </div>
            <span className="distanceTag">{state.distanceB}/{state.target}</span>
          </div>
        </div>
        <div className="arenaScoreStrip">
          <span>{playerALabel}</span>
          <strong>{state.complete ? winnerText(state.winner) : "FINISH LINE"}</strong>
          <span>{playerBLabel}</span>
        </div>
      </div>
    );
  }

  if (mode === "boss-battle" && state.kind === "boss-battle") {
    const hp = Math.max(0, (state.bossHp / state.maxBossHp) * 100);
    return (
      <div className="arenaFrame bossWorld" aria-label="Boss Battle">
        <div className="arenaTitleRow">
          <div><span className="modeKicker">CO-OP MISSION</span><strong>Boss Battle</strong></div>
          <RoundChip current={state.roundsPlayed} max={state.maxRounds} />
        </div>
        <div className="bossHud">
          <div className="bossName"><span>FINAL BOSS</span><strong>Lord Algebra</strong></div>
          <div className="hpTrack"><div className="hpFill" style={{ width: `${hp}%` }} /></div>
          <span className="hpText">{state.bossHp}/{state.maxBossHp} HP</span>
        </div>
        <div className="battleStage">
          <PixelAvatar side="A" label={playerALabel} state={state.lastCombo ? "attack" : "idle"} />
          <div className={state.lastDamage > 0 ? "bossMonster bossHit" : "bossMonster"}>
            <div className="bossHorn left" /><div className="bossHorn right" />
            <div className="bossFace"><i className="bossEye left" /><i className="bossEye right" /><i className="bossMouth" /></div>
            {state.lastDamage > 0 && <span className="damageBurst">-{state.lastDamage}</span>}
          </div>
          <PixelAvatar side="B" label={playerBLabel} state={state.lastCombo ? "attack" : "idle"} />
        </div>
        <div className="arenaScoreStrip">
          <span>A damage {state.totalDamageA}</span>
          <strong>{state.complete ? (state.success ? "BOSS DEFEATED" : "BOSS SURVIVED") : state.lastCombo ? "COMBO ATTACK" : "ATTACK TOGETHER"}</strong>
          <span>B damage {state.totalDamageB}</span>
        </div>
      </div>
    );
  }

  if (mode === "bomb-defuse" && state.kind === "bomb-defuse") {
    const progress = Math.min(100, (state.correctContributions / state.targetContributions) * 100);
    return (
      <div className="arenaFrame bombWorld" aria-label="Bomb Defuse">
        <div className="arenaTitleRow">
          <div><span className="modeKicker">FINAL CO-OP</span><strong>Bomb Defuse</strong></div>
          <RoundChip current={state.roundsPlayed} max={state.maxRounds} />
        </div>
        <div className="bombStage">
          <div className={state.complete && !state.success ? "bombDevice dangerDevice" : "bombDevice"}>
            <div className="bombTop">
              <div className="bombTimer">{state.complete ? (state.success ? "SAFE" : "FAIL") : "ARMED"}</div>
              <div className="bombLedRow"><i /><i /><i className={state.strikes > 0 ? "redLed" : ""} /></div>
            </div>
            <div className="bombProgress"><span style={{ width: `${progress}%` }} /></div>
            <div className="wireBoard">
              {[
                ["cyan", 1], ["pink", 2], ["yellow", 3], ["lime", 4], ["violet", 5], ["orange", 6],
              ].map(([color, step]) => (
                <div key={String(color)} className={`wireSlot ${Number(step) <= state.correctContributions ? "wireSolved" : ""}`}>
                  <span className={`wireCable ${color}`} /><b>{Number(step) <= state.correctContributions ? "✓" : step}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="missionMeters">
            <div><span>DEFUSE PROGRESS</span><strong>{state.correctContributions}/{state.targetContributions}</strong></div>
            <div><span>STRIKES</span><strong>{state.strikes}/{state.maxStrikes}</strong></div>
          </div>
        </div>
        <div className="arenaScoreStrip">
          <span>{playerALabel}</span>
          <strong>{state.complete ? (state.success ? "BOMB DEFUSED" : "MISSION FAILED") : "SOLVE TOGETHER"}</strong>
          <span>{playerBLabel}</span>
        </div>
      </div>
    );
  }

  return <div className="arenaFrame"><div className="arenaEmpty">Menyiapkan arena...</div></div>;
}
