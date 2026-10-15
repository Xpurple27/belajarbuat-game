"use client";

import TugArena from "@/src/components/TugArena";
import PixelAvatar, { type HeroId } from "@/src/components/PixelAvatar";
import type { ArenaGameState, GameMode } from "@/src/core/game";

interface ArenaVisualProps {
  mode: GameMode;
  state: ArenaGameState;
  playerALabel?: string;
  playerBLabel?: string;
  playerACharacter?: HeroId;
  playerBCharacter?: HeroId;
}

function RoundChip({ current, max }: { current: number; max: number }) {
  return <span className="roundChip">R{Math.min(current, max)}/{max}</span>;
}

function winnerText(winner: "A" | "B" | "draw" | null, playerALabel: string, playerBLabel: string) {
  if (winner === "draw") return "HASIL SERI";
  if (winner === "A") return `${playerALabel.toUpperCase()} MENANG!`;
  if (winner === "B") return `${playerBLabel.toUpperCase()} MENANG!`;
  return "";
}

export default function ArenaVisual({
  mode,
  state,
  playerALabel = "Player 1",
  playerBLabel = "Player 2",
  playerACharacter = "nova",
  playerBCharacter = "lyra",
}: ArenaVisualProps) {
  if (mode === "tug-of-war" && state.kind === "tug-of-war") {
    return (
      <div className="arenaFrame">
        <div className="arenaTitleRow">
          <div><span className="modeKicker">POWER DUEL</span><strong>Tug of War</strong></div>
          <RoundChip current={state.roundsPlayed} max={state.maxRounds} />
        </div>
        <TugArena
          position={state.position}
          target={state.target}
          winner={state.winner}
          playerALabel={playerALabel}
          playerBLabel={playerBLabel}
          playerACharacter={playerACharacter}
          playerBCharacter={playerBCharacter}
        />
        <div className="arenaScoreStrip">
          <span><strong>{playerALabel}</strong> · {state.totalPowerA} power</span>
          <strong>{state.complete ? winnerText(state.winner, playerALabel, playerBLabel) : `${state.position > 0 ? "+" : ""}${state.position}`}</strong>
          <span>{state.totalPowerB} power · <strong>{playerBLabel}</strong></span>
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
          <div className="raceLaneWrap namedLane">
            <div className="laneLabel laneName" title={playerALabel}>{playerALabel}</div>
            <div className="raceLane">
              <div className="finishLine" />
              <div className="pixelKart kartA" style={{ left: `calc(${a}% - ${a > 92 ? 54 : 28}px)` }}>
                <div className="kartHero"><PixelAvatar characterId={playerACharacter} side="A" state={state.complete && state.winner === "A" ? "celebrate" : "run"} compact /></div>
                <div className="kartBody" /><div className="kartSeat" /><div className="wheel wheelOne" /><div className="wheel wheelTwo" />
              </div>
            </div>
            <span className="distanceTag">{state.distanceA}/{state.target}</span>
          </div>
          <div className="raceLaneWrap namedLane">
            <div className="laneLabel laneName" title={playerBLabel}>{playerBLabel}</div>
            <div className="raceLane">
              <div className="finishLine" />
              <div className="pixelKart kartB" style={{ left: `calc(${b}% - ${b > 92 ? 54 : 28}px)` }}>
                <div className="kartHero"><PixelAvatar characterId={playerBCharacter} side="B" state={state.complete && state.winner === "B" ? "celebrate" : "run"} compact /></div>
                <div className="kartBody" /><div className="kartSeat" /><div className="wheel wheelOne" /><div className="wheel wheelTwo" />
              </div>
            </div>
            <span className="distanceTag">{state.distanceB}/{state.target}</span>
          </div>
        </div>
        <div className="arenaScoreStrip">
          <span>{playerALabel}</span>
          <strong>{state.complete ? winnerText(state.winner, playerALabel, playerBLabel) : "FINISH LINE"}</strong>
          <span>{playerBLabel}</span>
        </div>
      </div>
    );
  }

  if (mode === "boss-battle" && state.kind === "boss-battle") {
    const hp = Math.max(0, (state.bossHp / state.maxBossHp) * 100);
    const attacking = state.lastDamage > 0 && !state.complete;
    const heroState = state.complete ? (state.success ? "celebrate" : "lose") : attacking ? "attack" : "idle";
    const completeLabel = state.success ? "BOSS DIKALAHKAN!" : "BOSS BERTAHAN · TIM KALAH";
    return (
      <div className={`arenaFrame bossWorld ${state.complete ? (state.success ? "bossVictory" : "bossDefeat") : ""}`} aria-label="Boss Battle">
        <div className="arenaTitleRow">
          <div><span className="modeKicker">CO-OP MISSION</span><strong>Boss Battle</strong></div>
          <RoundChip current={state.roundsPlayed} max={state.maxRounds} />
        </div>
        <div className="bossHud">
          <div className="bossName"><span>FINAL BOSS</span><strong>Lord Algebra</strong></div>
          <div className="hpTrack"><div className="hpFill" style={{ width: `${hp}%` }} /></div>
          <span className="hpText">{state.bossHp}/{state.maxBossHp} HP</span>
        </div>
        <div className={`battleStage ${attacking ? "battleImpact" : ""}`}>
          <PixelAvatar side="A" characterId={playerACharacter} label={playerALabel} state={heroState} />
          <div className={`${attacking ? "bossMonster bossHit bossFlash" : "bossMonster"} ${state.complete && state.success ? "bossCollapse" : ""} ${state.complete && !state.success ? "bossLaugh" : ""}`}>
            <div className="bossHorn left" /><div className="bossHorn right" />
            <div className="bossFace"><i className="bossEye left" /><i className="bossEye right" /><i className="bossMouth" /></div>
            {attacking && <><span className="damageBurst">-{state.lastDamage}</span><span className="impactSlash slashOne" /><span className="impactSlash slashTwo" /></>}
            {state.complete && !state.success && <span className="bossSpeech">HA! HA!</span>}
          </div>
          <PixelAvatar side="B" characterId={playerBCharacter} label={playerBLabel} state={heroState} />
        </div>
        <div className="arenaScoreStrip">
          <span>{playerALabel} · {state.totalDamageA} damage</span>
          <strong>{state.complete ? completeLabel : state.lastCombo ? "⚡ COMBO ATTACK!" : attacking ? `💥 ${state.lastDamage} DAMAGE` : "SERANG BERSAMA"}</strong>
          <span>{playerBLabel} · {state.totalDamageB} damage</span>
        </div>
      </div>
    );
  }

  if (mode === "bomb-defuse" && state.kind === "bomb-defuse") {
    const progress = Math.min(100, (state.correctContributions / state.targetContributions) * 100);
    const exploded = state.complete && !state.success;
    return (
      <div className={`arenaFrame bombWorld ${exploded ? "bombFailedWorld" : ""}`} aria-label="Bomb Defuse">
        <div className="arenaTitleRow">
          <div><span className="modeKicker">FINAL CO-OP</span><strong>Bomb Defuse</strong></div>
          <RoundChip current={state.roundsPlayed} max={state.maxRounds} />
        </div>
        <div className={`bombStage ${exploded ? "bombStageExploded" : ""}`}>
          <div className={exploded ? "bombDevice dangerDevice explodedDevice" : "bombDevice"}>
            <div className="bombTop">
              <div className="bombTimer">{state.complete ? (state.success ? "SAFE" : "00:00") : "ARMED"}</div>
              <div className="bombLedRow"><i /><i /><i className={state.strikes > 0 ? "redLed" : ""} /></div>
            </div>
            <div className="bombProgress"><span style={{ width: `${progress}%` }} /></div>
            <div className="wireBoard">
              {[["cyan",1],["pink",2],["yellow",3],["lime",4],["violet",5],["orange",6]].map(([color,step]) => (
                <div key={String(color)} className={`wireSlot ${Number(step) <= state.correctContributions ? "wireSolved" : ""}`}>
                  <span className={`wireCable ${color}`} /><b>{Number(step) <= state.correctContributions ? "✓" : step}</b>
                </div>
              ))}
            </div>
          </div>
          {exploded && <div className="explosionCinematic" aria-label="Bomb meledak"><div className="explosionCore" /><i className="blast b1" /><i className="blast b2" /><i className="blast b3" /><i className="smoke s1" /><i className="smoke s2" /><i className="smoke s3" /><strong>BOMB MELEDAK!</strong><span>MISI GAGAL</span></div>}
          <div className="missionMeters">
            <div><span>DEFUSE PROGRESS</span><strong>{state.correctContributions}/{state.targetContributions}</strong></div>
            <div><span>STRIKES</span><strong>{state.strikes}/{state.maxStrikes}</strong></div>
          </div>
        </div>
        <div className="arenaScoreStrip">
          <span>{playerALabel}</span>
          <strong>{state.complete ? (state.success ? "BOMB DEFUSED!" : "BOMB MELEDAK · MISI GAGAL") : "SOLVE TOGETHER"}</strong>
          <span>{playerBLabel}</span>
        </div>
      </div>
    );
  }

  return <div className="arenaFrame"><div className="arenaEmpty">Menyiapkan arena...</div></div>;
}
