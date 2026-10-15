"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArenaVisual from "@/src/components/ArenaVisual";
import { supabase } from "@/src/lib/supabase";
import {
  GAME_ORDER,
  createGameState,
  type AiDifficulty,
  type ArenaGameState,
  type GameMode,
  type OpponentMode,
  type PlayerSide,
} from "@/src/core/game";

type PlayerInfo = {
  id: string;
  displayName: string;
  gradeLevel: number;
  side: PlayerSide;
  playerType: "human" | "ai";
  isHostPlayer: boolean;
};

type PlayerSession = {
  id: string;
  token: string;
  side: PlayerSide;
  displayName: string;
  gradeLevel: number;
  playerType?: "human" | "ai";
  isHostPlayer?: boolean;
};

type HostSession = {
  code: string;
  token: string;
  playerSession?: PlayerSession | null;
};

type RoundResult = {
  A?: { correct: boolean; power: number; responseTimeMs?: number };
  B?: { correct: boolean; power: number; responseTimeMs?: number };
};

type PublicQuestion = {
  id: string;
  topic: string;
  subtopic?: string | null;
  difficulty: "easy" | "medium" | "hard";
  questionText?: string;
  question_text?: string;
  options: string[] | null;
  estimatedTimeSeconds?: number;
  estimated_time_seconds?: number;
};

const GAME_LABEL: Record<GameMode, string> = {
  "tug-of-war": "Tug of War",
  racing: "Math Racing",
  "boss-battle": "Boss Battle",
  "bomb-defuse": "Bomb Defuse",
};

function normalizedQuestion(question: PublicQuestion | null): PublicQuestion | null {
  if (!question) return null;
  return {
    ...question,
    questionText: question.questionText ?? question.question_text,
    estimatedTimeSeconds: question.estimatedTimeSeconds ?? question.estimated_time_seconds ?? 60,
  };
}

function answerKey(option: string, index: number): string {
  const match = option.match(/^\s*([A-E])(?:[.):-]|\s)/i);
  return match?.[1]?.toUpperCase() ?? String.fromCharCode(65 + index);
}

export default function HostPage() {
  const [hostSession, setHostSession] = useState<HostSession | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [onlineHumanIds, setOnlineHumanIds] = useState<Set<string>>(new Set());
  const [roomStatus, setRoomStatus] = useState("idle");
  const [opponentMode, setOpponentMode] = useState<OpponentMode>("multiplayer");
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("medium");
  const [hostPlays, setHostPlays] = useState(false);
  const [hostName, setHostName] = useState("Coach");
  const [hostGrade, setHostGrade] = useState(7);
  const [currentGame, setCurrentGame] = useState<GameMode>("tug-of-war");
  const [round, setRound] = useState(0);
  const [state, setState] = useState<ArenaGameState>(createGameState("tug-of-war"));
  const [connection, setConnection] = useState("OFFLINE");
  const [lastRound, setLastRound] = useState<RoundResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [hostQuestion, setHostQuestion] = useState<PublicQuestion | null>(null);
  const [hostSeconds, setHostSeconds] = useState(0);
  const [hostSubmitted, setHostSubmitted] = useState(false);
  const [hostFeedback, setHostFeedback] = useState("");
  const hostStartedAtRef = useRef(0);
  const hostPlayerRef = useRef<PlayerSession | null>(null);

  const mapPlayers = useCallback((rows: Array<{
    id: string;
    display_name: string;
    grade_level: number;
    side: PlayerSide;
    player_type?: "human" | "ai";
    is_host_player?: boolean;
  }>) => rows.map((player) => ({
    id: player.id,
    displayName: player.display_name,
    gradeLevel: player.grade_level,
    side: player.side,
    playerType: player.player_type ?? "human",
    isHostPlayer: Boolean(player.is_host_player),
  })), []);

  const loadHostPlayerQuestion = useCallback(async (session: HostSession) => {
    const playerSession = session.playerSession;
    if (!playerSession) return;
    const response = await fetch(`/api/rooms/${session.code}?playerId=${encodeURIComponent(playerSession.id)}`, {
      headers: { "x-player-token": playerSession.token },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data.question && data.room?.status === "playing") {
      const next = normalizedQuestion(data.question);
      setHostQuestion(next);
      setHostSeconds(next?.estimatedTimeSeconds ?? 60);
      setHostSubmitted(false);
      hostStartedAtRef.current = Date.now();
    }
  }, []);

  const refreshSnapshot = useCallback(async (session: HostSession) => {
    const response = await fetch(`/api/rooms/${session.code}`, {
      headers: { "x-host-token": session.token },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    setRoomStatus(data.room.status);
    setOpponentMode(data.room.opponentMode ?? "multiplayer");
    setAiDifficulty(data.room.aiDifficulty ?? "medium");
    setCurrentGame(data.room.currentGame);
    setRound(data.room.currentRound);
    if (data.room.gameState) setState(data.room.gameState);
    if (data.players) setPlayers(mapPlayers(data.players));
    await loadHostPlayerQuestion(session);
  }, [loadHostPlayerQuestion, mapPlayers]);

  useEffect(() => {
    const raw = sessionStorage.getItem("arena-host-session");
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as HostSession;
      hostPlayerRef.current = session.playerSession ?? null;
      setHostSession(session);
      setHostPlays(Boolean(session.playerSession));
      void refreshSnapshot(session);
    } catch {
      sessionStorage.removeItem("arena-host-session");
    }
  }, [refreshSnapshot]);

  useEffect(() => {
    if (!hostSession) return;
    const channel = supabase.channel(`arena-room-${hostSession.code}`, {
      config: { presence: { key: `host-${hostSession.code}` } },
    });

    channel
      .on("broadcast", { event: "round-start" }, ({ payload }) => {
        setRound(payload.roundNumber ?? 0);
        setRoomStatus("playing");
        setLastRound(null);
        const hostPlayer = hostPlayerRef.current;
        if (hostPlayer) {
          const next = normalizedQuestion(payload.questions?.[hostPlayer.side] ?? null);
          setHostQuestion(next);
          setHostSeconds(next?.estimatedTimeSeconds ?? 60);
          setHostSubmitted(false);
          setHostFeedback("");
          hostStartedAtRef.current = Number(payload.startedAt) || Date.now();
        }
      })
      .on("broadcast", { event: "round-resolved" }, ({ payload }) => {
        setState(payload.state);
        setLastRound(payload.answers ?? null);
        setRoomStatus("paused");
        const side = hostPlayerRef.current?.side;
        if (side && payload.answers?.[side]) {
          const own = payload.answers[side];
          setHostFeedback(own.correct ? `Benar! +${own.power} power` : "Belum tepat. Ronde selesai.");
        }
      })
      .on("broadcast", { event: "game-changed" }, ({ payload }) => {
        setCurrentGame(payload.gameMode);
        setState(payload.state);
        setRound(0);
        setLastRound(null);
        setHostQuestion(null);
        setHostSubmitted(false);
        setHostFeedback("");
        setRoomStatus("paused");
      })
      .on("broadcast", { event: "session-finished" }, () => {
        setRoomStatus("finished");
        setHostQuestion(null);
      })
      .on("presence", { event: "sync" }, () => {
        const presence = channel.presenceState<Record<string, unknown>>();
        const ids = new Set<string>();
        Object.values(presence).flat().forEach((entry) => {
          if (entry.role === "player" && entry.playerId) ids.add(String(entry.playerId));
        });
        setOnlineHumanIds(ids);
        setConnection("ONLINE");
      })
      .subscribe(async (status) => {
        setConnection(status);
        if (status === "SUBSCRIBED") {
          await channel.track({
            role: "host",
            hostPlayerId: hostPlayerRef.current?.id ?? null,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [hostSession]);

  useEffect(() => {
    if (!hostSession || roomStatus === "finished") return;
    const timer = window.setInterval(() => void refreshSnapshot(hostSession), 5000);
    return () => window.clearInterval(timer);
  }, [hostSession, refreshSnapshot, roomStatus]);

  async function createRoom() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          opponentMode,
          aiDifficulty,
          hostPlays,
          hostDisplayName: hostName,
          hostGradeLevel: hostGrade,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal membuat room.");

      const playerSession = data.hostPlayerSession as PlayerSession | null;
      const session: HostSession = { code: data.room.code, token: data.hostToken, playerSession };
      sessionStorage.setItem("arena-host-session", JSON.stringify(session));
      if (playerSession) sessionStorage.setItem(`arena-player-${data.room.code}`, JSON.stringify(playerSession));
      hostPlayerRef.current = playerSession;
      setHostSession(session);
      setRoomStatus(data.room.status);
      setCurrentGame(data.room.current_game);
      setRound(data.room.current_round ?? 0);
      setState(data.room.game_state ?? createGameState("tug-of-war"));
      await refreshSnapshot(session);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gagal membuat room.");
    } finally {
      setLoading(false);
    }
  }

  async function startRound() {
    if (!hostSession) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${hostSession.code}/round`, {
        method: "POST",
        headers: { "x-host-token": hostSession.token },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal memulai ronde.");
      setRound(data.roundNumber);
      setRoomStatus("playing");
    } catch (roundError) {
      setError(roundError instanceof Error ? roundError.message : "Gagal memulai ronde.");
    } finally {
      setLoading(false);
    }
  }

  async function advanceGame() {
    if (!hostSession) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${hostSession.code}/advance`, {
        method: "POST",
        headers: { "x-host-token": hostSession.token },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal melanjutkan game.");
      if (data.finished) {
        setRoomStatus("finished");
      } else {
        setCurrentGame(data.gameMode);
        setState(data.state);
        setRound(0);
        setLastRound(null);
        setHostQuestion(null);
        setHostFeedback("");
        setRoomStatus("paused");
      }
    } catch (advanceError) {
      setError(advanceError instanceof Error ? advanceError.message : "Gagal melanjutkan game.");
    } finally {
      setLoading(false);
    }
  }

  const submitHostAnswer = useCallback(async (answer: string) => {
    const playerSession = hostPlayerRef.current;
    if (!hostSession || !playerSession || hostSubmitted || roomStatus !== "playing") return;
    setHostSubmitted(true);
    const responseTimeMs = hostStartedAtRef.current ? Date.now() - hostStartedAtRef.current : 0;
    try {
      const response = await fetch(`/api/rooms/${hostSession.code}/answer`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-player-token": playerSession.token,
        },
        body: JSON.stringify({ playerId: playerSession.id, answer, responseTimeMs }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Jawaban gagal dikirim.");
      setHostFeedback(data.correct ? `Benar! +${data.powerAwarded} power` : "Belum tepat. Menunggu lawan...");
    } catch (submitError) {
      setHostSubmitted(false);
      setHostFeedback(submitError instanceof Error ? submitError.message : "Jawaban gagal dikirim.");
    }
  }, [hostSession, hostSubmitted, roomStatus]);

  useEffect(() => {
    if (!hostQuestion || hostSubmitted || roomStatus !== "playing" || hostSeconds <= 0) return;
    const timer = window.setTimeout(() => setHostSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [hostQuestion, hostSeconds, hostSubmitted, roomStatus]);

  useEffect(() => {
    if (hostQuestion && roomStatus === "playing" && hostSeconds === 0 && !hostSubmitted) {
      void submitHostAnswer("__TIMEOUT__");
    }
  }, [hostQuestion, hostSeconds, hostSubmitted, roomStatus, submitHostAnswer]);

  function newRoom() {
    sessionStorage.removeItem("arena-host-session");
    if (hostSession) sessionStorage.removeItem(`arena-player-${hostSession.code}`);
    hostPlayerRef.current = null;
    setHostSession(null);
    setPlayers([]);
    setOnlineHumanIds(new Set());
    setRoomStatus("idle");
    setCurrentGame("tug-of-war");
    setRound(0);
    setState(createGameState("tug-of-war"));
    setHostQuestion(null);
    setError("");
  }

  const joinUrl = useMemo(() => hostSession ? `${window.location.origin}/join?room=${hostSession.code}` : "", [hostSession]);
  const playerA = players.find((item) => item.side === "A");
  const playerB = players.find((item) => item.side === "B");
  const externalHumans = players.filter((item) => item.playerType === "human" && !item.isHostPlayer);
  const allExternalHumansOnline = externalHumans.every((player) => onlineHumanIds.has(player.id));
  const canStart = players.length === 2 && allExternalHumansOnline && roomStatus !== "playing" && roomStatus !== "finished" && !state.complete;
  const hostOptions = Array.isArray(hostQuestion?.options) ? hostQuestion.options : [];
  const currentGameIndex = GAME_ORDER.indexOf(currentGame);

  async function copyJoinLink() {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  if (!hostSession) {
    return (
      <main className="shell narrowShell">
        <section className="setupCard">
          <div className="setupHeader">
            <p className="eyebrow">LEVELUP MATH ARENA</p>
            <h1>Buat Arena</h1>
            <p className="muted">Pilih cara bermain. Setiap pemain mendapat soal sesuai kelasnya, tetapi power dinormalisasi berdasarkan tingkat kesulitan.</p>
          </div>

          <div className="setupGrid">
            <div>
              <p className="eyebrow">1 · LAWAN</p>
              <div className="choiceGrid">
                <button className={`choiceCard ${opponentMode === "multiplayer" ? "active" : ""}`} onClick={() => setOpponentMode("multiplayer")}>
                  <strong>Multiplayer</strong>
                  <span>Dua manusia bermain dari device berbeda. Host boleh menjadi salah satunya.</span>
                </button>
                <button className={`choiceCard ${opponentMode === "ai" ? "active" : ""}`} onClick={() => setOpponentMode("ai")}>
                  <strong>Versus Computer</strong>
                  <span>Satu manusia melawan CPU. Cocok untuk latihan mandiri atau duel host.</span>
                </button>
              </div>
            </div>

            <div>
              <p className="eyebrow">2 · PERAN HOST</p>
              <div className="choiceGrid">
                <button className={`choiceCard ${!hostPlays ? "active" : ""}`} onClick={() => setHostPlays(false)}>
                  <strong>Host Only</strong>
                  <span>Guru hanya mengontrol room dan mengamati permainan.</span>
                </button>
                <button className={`choiceCard ${hostPlays ? "active" : ""}`} onClick={() => setHostPlays(true)}>
                  <strong>Host + Player</strong>
                  <span>Guru ikut menjawab langsung dari dashboard host.</span>
                </button>
              </div>
            </div>

            {hostPlays && (
              <div className="formGrid">
                <div className="field"><label>Nama pemain host</label><input value={hostName} maxLength={24} onChange={(event) => setHostName(event.target.value)} /></div>
                <div className="field"><label>Kelas soal host</label><select value={hostGrade} onChange={(event) => setHostGrade(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((grade) => <option key={grade} value={grade}>Kelas {grade}</option>)}</select></div>
              </div>
            )}

            {opponentMode === "ai" && (
              <div>
                <p className="eyebrow">3 · LEVEL COMPUTER</p>
                <div className="aiLevelRow">
                  {(["easy", "medium", "hard"] as AiDifficulty[]).map((level) => <button key={level} className={`aiLevelButton ${aiDifficulty === level ? "active" : ""}`} onClick={() => setAiDifficulty(level)}>{level.toUpperCase()}</button>)}
                </div>
                <p className="muted">Easy lebih lambat dan lebih sering salah; Hard lebih cepat dan jauh lebih akurat.</p>
              </div>
            )}

            <div className="setupSummary">
              <span className="infoChip">4 game / session</span>
              <span className="infoChip">Realtime</span>
              <span className="infoChip">Grade-specific questions</span>
              <span className="infoChip">Learning analytics</span>
            </div>

            {error && <div className="errorBox">{error}</div>}
            <button className="button primary full" disabled={loading || (hostPlays && !hostName.trim())} onClick={() => void createRoom()}>{loading ? "Membuat arena..." : "Create Arena"}</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell gameShell">
      <div className="topbar">
        <div>
          <p className="eyebrow">HOST CONTROL · {opponentMode === "ai" ? `VS CPU ${aiDifficulty.toUpperCase()}` : "MULTIPLAYER"}</p>
          <div className="roomCode">ROOM {hostSession.code}</div>
          <div className="setupSummary">
            {GAME_ORDER.map((mode, index) => <span key={mode} className="infoChip" style={{ opacity: index <= currentGameIndex ? 1 : .45 }}>{index + 1}. {GAME_LABEL[mode]}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}><div className="status">● {connection}</div><button className="button ghost" onClick={newRoom}>New Room</button></div>
      </div>

      <ArenaVisual
        mode={currentGame}
        state={state}
        playerALabel={playerA?.displayName ?? "Player A"}
        playerBLabel={playerB?.displayName ?? "Player B"}
      />

      <div className="hostControlLayout">
        <section className="panel">
          <p className="eyebrow">PLAYERS</p>
          <div className="playerRoster">
            {(["A", "B"] as PlayerSide[]).map((side) => {
              const player = players.find((item) => item.side === side);
              const result = lastRound?.[side];
              const online = player?.playerType === "ai" || player?.isHostPlayer || (player ? onlineHumanIds.has(player.id) : false);
              return <div className={`rosterCard player${side}`} key={side}>
                <div className="rosterTop"><strong>Player {side}</strong><span className="typeBadge">{player?.playerType === "ai" ? `CPU ${aiDifficulty}` : player?.isHostPlayer ? "HOST" : "HUMAN"}</span></div>
                <span>{player ? `${player.displayName} · Kelas ${player.gradeLevel}` : "Menunggu pemain..."}</span>
                <span><i className={`onlineDot ${online ? "" : "offlineDot"}`} />{player ? (online ? "Ready" : "Offline") : "Empty slot"}</span>
                {result && <strong>{result.correct ? `✓ +${result.power} power` : "✕ +0 power"}</strong>}
              </div>;
            })}
          </div>

          {hostSession.playerSession && (
            <div className="hostPlayPanel">
              <p className="eyebrow">HOST PLAYER · SIDE {hostSession.playerSession.side}</p>
              <h3>{hostQuestion?.questionText ?? (roomStatus === "playing" ? "Memuat soal..." : "Menunggu ronde dimulai")}</h3>
              {hostQuestion && <p className="muted">{hostQuestion.topic}{hostQuestion.subtopic ? ` · ${hostQuestion.subtopic}` : ""} · {hostQuestion.difficulty.toUpperCase()}</p>}
              {roomStatus === "playing" && <div className={hostSeconds <= 10 ? "timer danger" : "timer"}>{hostSeconds}s</div>}
              <div className="answersGrid">
                {hostOptions.map((option, index) => <button key={`${option}-${index}`} disabled={hostSubmitted || roomStatus !== "playing"} onClick={() => void submitHostAnswer(answerKey(option, index))}>{option}</button>)}
              </div>
              {hostFeedback && <div className="feedbackBox">{hostFeedback}</div>}
            </div>
          )}
        </section>

        <aside className="controlStack">
          <section className="panel">
            <p className="eyebrow">MATCH CONTROL</p>
            <h2>{GAME_LABEL[currentGame]} · Round {round}</h2>
            <p className="muted">Status: <strong>{roomStatus}</strong></p>
            {error && <div className="errorBox">{error}</div>}
            {roomStatus === "finished" ? (
              <>
                <div className="winnerBox">Sesi 4 game selesai</div>
                <a className="button primary full" href={`/host/results/${hostSession.code}`}>Lihat Hasil Belajar</a>
              </>
            ) : state.complete ? (
              <>
                <div className="winnerBox">{GAME_LABEL[currentGame]} selesai</div>
                <button className="button primary full" disabled={loading} onClick={() => void advanceGame()}>{currentGame === "bomb-defuse" ? "Finish Session" : "Next Game"}</button>
              </>
            ) : (
              <button className="button primary full" disabled={!canStart || loading} onClick={() => void startRound()}>{roomStatus === "paused" ? "Next Round" : loading ? "Memulai..." : "Start Round"}</button>
            )}
            {players.length < 2 && <p className="muted centerText">Menunggu {2 - players.length} slot pemain.</p>}
            {players.length === 2 && !allExternalHumansOnline && <p className="muted centerText">Menunggu pemain remote online.</p>}
          </section>

          {opponentMode === "multiplayer" && players.length < 2 && (
            <section className="panel">
              <p className="eyebrow">INVITE PLAYER</p>
              <p className="muted">Bagikan kode atau link ini ke device pemain berikutnya.</p>
              <div className="copyRow"><div className="copyCode">{joinUrl}</div><button className="button secondary" onClick={() => void copyJoinLink()}>{copied ? "Copied" : "Copy Link"}</button></div>
            </section>
          )}

          {opponentMode === "ai" && (
            <section className="panel"><p className="eyebrow">CPU PROFILE</p><h3>{aiDifficulty.toUpperCase()}</h3><p className="muted">CPU menjawab server-side. Semakin tinggi level, semakin tinggi akurasi dan semakin pendek response time.</p></section>
          )}
        </aside>
      </div>
    </main>
  );
}
