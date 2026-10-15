"use client";

import { useMemo, useState } from "react";
import {
  createTugOfWarState,
  Difficulty,
  resolveTugOfWarRound,
  RoundAnswer,
  tugProgressPercent,
} from "@/src/core/game";

const roomCode = "527941";

function makeAnswer(player: "A" | "B", correct: boolean, difficulty: Difficulty): RoundAnswer {
  return { player, correct, difficulty, responseTimeMs: 0 };
}

export default function HostPage() {
  const [state, setState] = useState(createTugOfWarState());
  const [difficultyA, setDifficultyA] = useState<Difficulty>("medium");
  const [difficultyB, setDifficultyB] = useState<Difficulty>("medium");
  const [round, setRound] = useState(1);

  const flagLeft = useMemo(() => `${tugProgressPercent(state)}%`, [state]);

  function applyRound(correctA: boolean, correctB: boolean) {
    setState((current) =>
      resolveTugOfWarRound(
        current,
        makeAnswer("A", correctA, difficultyA),
        makeAnswer("B", correctB, difficultyB),
      ),
    );
    setRound((value) => value + 1);
  }

  function reset() {
    setState(createTugOfWarState());
    setRound(1);
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <p className="eyebrow">HOST CONTROL</p>
          <div className="roomCode">ROOM {roomCode}</div>
        </div>
        <div className="status">● Prototype lokal aktif</div>
      </div>

      <div className="hostGrid">
        <section>
          <div className="arena" aria-label="Arena tarik tambang">
            <div className="rope" />
            <div className="track" />
            <div className="pixelCharacter a" aria-label="Player A">🧒</div>
            <div className="pixelCharacter b" aria-label="Player B">🧑</div>
            <div className="flag" style={{ left: flagLeft }}>🚩</div>
          </div>

          <div className="scoreRow">
            <span>Player A</span>
            <span>Round {round}</span>
            <span>Player B</span>
          </div>
          <p className="muted" style={{ textAlign: "center" }}>
            Power balance: {state.position}. Target kemenangan: ±{state.target}.
          </p>
          {state.winner && (
            <div className="status" style={{ marginTop: 12, textAlign: "center" }}>
              Player {state.winner} MENANG 🎉
            </div>
          )}
        </section>

        <aside className="panel">
          <p className="eyebrow">SIMULASI ROUND</p>
          <h2>Kontrol jawaban</h2>
          <p className="muted">
            Tombol ini sementara menggantikan event realtime. Setelah Supabase terhubung, jawaban dari dua device akan memanggil mechanic yang sama.
          </p>

          <label className="field">
            <span>Kesulitan Player A</span>
            <select value={difficultyA} onChange={(e) => setDifficultyA(e.target.value as Difficulty)}>
              <option value="easy">Easy · 1 power</option>
              <option value="medium">Medium · 2 power</option>
              <option value="hard">Hard · 3 power</option>
            </select>
          </label>

          <label className="field">
            <span>Kesulitan Player B</span>
            <select value={difficultyB} onChange={(e) => setDifficultyB(e.target.value as Difficulty)}>
              <option value="easy">Easy · 1 power</option>
              <option value="medium">Medium · 2 power</option>
              <option value="hard">Hard · 3 power</option>
            </select>
          </label>

          <div className="controlGrid">
            <button onClick={() => applyRound(true, false)}>A ✓ · B ✕</button>
            <button onClick={() => applyRound(false, true)}>A ✕ · B ✓</button>
            <button onClick={() => applyRound(true, true)}>A ✓ · B ✓</button>
            <button onClick={() => applyRound(false, false)}>A ✕ · B ✕</button>
          </div>

          <button className="button" style={{ width: "100%", marginTop: 12 }} onClick={reset}>
            Reset Match
          </button>
        </aside>
      </div>
    </main>
  );
}
