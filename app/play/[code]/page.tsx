"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ArenaVisual from "@/src/components/ArenaVisual";
import { normalizeHeroId, type HeroId } from "@/src/components/PixelAvatar";
import { supabase } from "@/src/lib/supabase";
import { playSfx } from "@/src/lib/sfx";
import {
  createGameState,
  type AiDifficulty,
  type ArenaGameState,
  type GameMode,
  type OpponentMode,
  type PlayerSide,
} from "@/src/core/game";

type PlayerSession = {
  id: string;
  token: string;
  side: PlayerSide;
  displayName: string;
  gradeLevel: number;
  characterId?: HeroId;
};

type PlayerInfo = {
  id: string;
  displayName: string;
  gradeLevel: number;
  side: PlayerSide;
  playerType: "human" | "ai";
  isHostPlayer: boolean;
};

type PublicQuestion = {
  id: string;
  gradeLevel?: number;
  grade_level?: number;
  topic: string;
  subtopic?: string | null;
  difficulty: "easy" | "medium" | "hard";
  questionType?: string;
  question_type?: string;
  questionText?: string;
  question_text?: string;
  questionImageUrl?: string | null;
  question_image_url?: string | null;
  options: string[] | null;
  estimatedTimeSeconds?: number;
  estimated_time_seconds?: number;
  powerValue?: number;
  power_value?: number;
};

const ROUND_DURATION_SECONDS = 60;
const GAME_LABEL: Record<GameMode, string> = {
  "tug-of-war": "Tug of War",
  racing: "Math Racing",
  "boss-battle": "Boss Battle",
  "bomb-defuse": "Bomb Defuse",
};

function normalizeQuestion(question: PublicQuestion | null): PublicQuestion | null {
  if (!question) return null;
  return {
    ...question,
    gradeLevel: question.gradeLevel ?? question.grade_level,
    questionType: question.questionType ?? question.question_type,
    questionText: question.questionText ?? question.question_text,
    questionImageUrl: question.questionImageUrl ?? question.question_image_url,
    estimatedTimeSeconds: question.estimatedTimeSeconds ?? question.estimated_time_seconds ?? ROUND_DURATION_SECONDS,
    powerValue: question.powerValue ?? question.power_value,
  };
}

function answerKey(option: string, index: number): string {
  const match = option.match(/^\s*([A-E])(?:[.):-]|\s)/i);
  return match?.[1]?.toUpperCase() ?? String.fromCharCode(65 + index);
}

function secondsRemaining(startedAtMs: number, duration = ROUND_DURATION_SECONDS): number {
  if (!startedAtMs) return duration;
  return Math.max(0, duration - Math.floor((Date.now() - startedAtMs) / 1000));
}

export default function PlayerPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [characters, setCharacters] = useState<Record<string, HeroId>>({});
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [roomStatus, setRoomStatus] = useState("waiting");
  const [opponentMode, setOpponentMode] = useState<OpponentMode>("multiplayer");
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("medium");
  const [currentGame, setCurrentGame] = useState<GameMode>("tug-of-war");
  const [round, setRound] = useState(0);
  const [state, setState] = useState<ArenaGameState>(createGameState("tug-of-war"));
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [connection, setConnection] = useState("CONNECTING");
  const [soundOn, setSoundOn] = useState(true);
  const startedAtRef = useRef(0);
  const currentQuestionIdRef = useRef<string | null>(null);
  const sessionRef = useRef<PlayerSession | null>(null);
  const soundOnRef = useRef(true);

  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  const loadCharacters = useCallback(async () => {
    const response = await fetch(`/api/rooms/${code}/character`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const next: Record<string, HeroId> = {};
    for (const item of data.characters ?? []) next[item.id] = normalizeHeroId(item.characterId);
    setCharacters(next);
  }, [code]);

  const syncQuestion = useCallback((incoming: PublicQuestion | null, startedAtMs: number) => {
    const normalized = normalizeQuestion(incoming);
    if (!normalized) return;
    const isNew = currentQuestionIdRef.current !== normalized.id;
    currentQuestionIdRef.current = normalized.id;
    startedAtRef.current = startedAtMs || Date.now();
    setQuestion(normalized);
    setSecondsLeft(secondsRemaining(startedAtRef.current, normalized.estimatedTimeSeconds ?? ROUND_DURATION_SECONDS));
    if (isNew) {
      setSubmitted(false);
      setFeedback("");
    }
  }, []);

  const loadSnapshot = useCallback(async (currentSession: PlayerSession) => {
    const response = await fetch(`/api/rooms/${code}?playerId=${encodeURIComponent(currentSession.id)}`, {
      headers: { "x-player-token": currentSession.token }, cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    setRoomStatus(data.room.status);
    setOpponentMode(data.room.opponentMode ?? "multiplayer");
    setAiDifficulty(data.room.aiDifficulty ?? "medium");
    setCurrentGame(data.room.currentGame);
    setRound(data.room.currentRound);
    if (data.room.gameState) setState(data.room.gameState);
    if (Array.isArray(data.players)) {
      setPlayers(data.players.map((player: { id:string; display_name:string; grade_level:number; side:PlayerSide; player_type?:"human"|"ai"; is_host_player?:boolean }) => ({
        id:player.id, displayName:player.display_name, gradeLevel:player.grade_level, side:player.side,
        playerType:player.player_type ?? "human", isHostPlayer:Boolean(player.is_host_player),
      })));
    }
    if (data.question && data.room.status === "playing") {
      const startedAtMs = data.room.roundStartedAt ? new Date(data.room.roundStartedAt).getTime() : Date.now();
      syncQuestion(data.question, startedAtMs);
    }
    void loadCharacters();
  }, [code, loadCharacters, syncQuestion]);

  useEffect(() => {
    const raw = sessionStorage.getItem(`arena-player-${code}`);
    if (!raw) { router.replace(`/join?room=${code}`); return; }
    try {
      const parsed = JSON.parse(raw) as PlayerSession;
      sessionRef.current = parsed;
      setSession(parsed);
      void loadSnapshot(parsed);
    } catch { router.replace(`/join?room=${code}`); }
  }, [code, loadSnapshot, router]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel(`arena-room-${code}`, { config: { presence: { key: session.id } } });

    channel
      .on("broadcast", { event: "round-start" }, ({ payload }) => {
        const activeSession = sessionRef.current;
        if (!activeSession) return;
        if (payload.gameMode) setCurrentGame(payload.gameMode);
        setRound(payload.roundNumber ?? 0);
        setRoomStatus("playing");
        syncQuestion(payload.questions?.[activeSession.side] ?? null, Number(payload.startedAt) || Date.now());
        if (soundOnRef.current) playSfx("start");
      })
      .on("broadcast", { event: "round-resolved" }, ({ payload }) => {
        const gameMode = payload.gameMode as GameMode;
        setCurrentGame(gameMode);
        setState(payload.state);
        setRoomStatus("paused");
        const ownSide = sessionRef.current?.side;
        if (ownSide && payload.answers?.[ownSide]) {
          const own = payload.answers[ownSide];
          setFeedback(own.correct ? `Benar! +${own.power} power` : "Belum tepat. +0 power");
        }
        if (soundOnRef.current) {
          if (gameMode === "tug-of-war") playSfx(payload.gameComplete ? "win" : "rope");
          else if (gameMode === "racing") playSfx(payload.gameComplete ? "win" : "engine");
          else if (gameMode === "boss-battle") playSfx(payload.gameComplete ? (payload.state?.success ? "win" : "defeat") : "bossHit");
          else if (gameMode === "bomb-defuse" && payload.gameComplete) {
            if (payload.state?.success) playSfx("win");
            else { playSfx("alarm"); window.setTimeout(() => { if (soundOnRef.current) playSfx("explosion"); }, 520); }
          } else playSfx("impact");
        }
      })
      .on("broadcast", { event: "character-changed" }, ({ payload }) => {
        if (payload.playerId) setCharacters((current) => ({ ...current, [String(payload.playerId)]: normalizeHeroId(payload.characterId) }));
      })
      .on("broadcast", { event: "game-changed" }, ({ payload }) => {
        setCurrentGame(payload.gameMode); setState(payload.state); setRound(0); setQuestion(null);
        currentQuestionIdRef.current = null; startedAtRef.current = 0; setSubmitted(false);
        setFeedback(`${GAME_LABEL[payload.gameMode as GameMode]} siap. Menunggu host.`); setRoomStatus("paused");
      })
      .on("broadcast", { event: "session-finished" }, () => {
        setQuestion(null); currentQuestionIdRef.current = null; setRoomStatus("finished");
        setFeedback("Sesi Math Arena selesai. Great job!"); if (soundOnRef.current) playSfx("win");
      })
      .on("presence", { event: "sync" }, () => setConnection("ONLINE"))
      .subscribe(async (status) => {
        setConnection(status);
        if (status === "SUBSCRIBED") await channel.track({ role:"player",playerId:session.id,side:session.side,displayName:session.displayName,gradeLevel:session.gradeLevel,onlineAt:new Date().toISOString() });
      });

    return () => { void channel.untrack(); void supabase.removeChannel(channel); };
  }, [code, session, syncQuestion]);

  useEffect(() => {
    if (!session || roomStatus === "finished") return;
    const timer = window.setInterval(() => void loadSnapshot(session), 7000);
    return () => window.clearInterval(timer);
  }, [loadSnapshot, roomStatus, session]);

  const submitAnswer = useCallback(async (answer: string) => {
    const currentSession = sessionRef.current;
    if (!currentSession || submitted || roomStatus !== "playing") return;
    setSubmitted(true);
    const responseTimeMs = startedAtRef.current ? Math.max(0, Date.now() - startedAtRef.current) : 0;
    try {
      const response = await fetch(`/api/rooms/${code}/answer`, {
        method:"POST", headers:{"content-type":"application/json","x-player-token":currentSession.token},
        body:JSON.stringify({playerId:currentSession.id,answer,responseTimeMs}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Jawaban gagal dikirim.");
      setFeedback(data.correct ? `Benar! +${data.powerAwarded} power` : data.waitingForOpponent ? "Belum tepat. Menunggu lawan..." : "Belum tepat. Ronde selesai.");
      if (soundOnRef.current) playSfx(data.correct ? "correct" : "wrong");
    } catch (error) {
      setSubmitted(false); setFeedback(error instanceof Error ? error.message : "Jawaban gagal dikirim.");
    }
  }, [code, roomStatus, submitted]);

  useEffect(() => {
    if (roomStatus !== "playing" || submitted || !question || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft(secondsRemaining(startedAtRef.current, question.estimatedTimeSeconds ?? ROUND_DURATION_SECONDS)), 1000);
    return () => window.clearTimeout(timer);
  }, [question, roomStatus, secondsLeft, submitted]);

  useEffect(() => { if (roomStatus === "playing" && question && secondsLeft === 0 && !submitted) void submitAnswer("__TIMEOUT__"); }, [question, roomStatus, secondsLeft, submitAnswer, submitted]);

  const questionText = question?.questionText ?? (roomStatus === "finished" ? "Sesi selesai" : "Menunggu host memulai ronde...");
  const options = useMemo(() => (Array.isArray(question?.options) ? question.options : []), [question]);
  const playerA = players.find((item) => item.side === "A");
  const playerB = players.find((item) => item.side === "B");
  const opponent = players.find((item) => item.side !== session?.side);
  const playerACharacter = playerA ? characters[playerA.id] ?? (playerA.playerType === "ai" ? "lyra" : "nova") : "nova";
  const playerBCharacter = playerB ? characters[playerB.id] ?? "lyra" : "lyra";

  if (!session) return <main className="shell"><div className="panel">Memuat sesi pemain...</div></main>;

  return (
    <main className="shell gameShell">
      <div className="topbar">
        <div>
          <p className="eyebrow">KELAS {session.gradeLevel} · {GAME_LABEL[currentGame].toUpperCase()}</p>
          <div className="roomCode">{session.displayName} <span style={{ color:"#66738b" }}>VS</span> {opponent?.displayName ?? "..."}</div>
          <div className="setupSummary"><span className="infoChip">ROOM {code}</span><span className="infoChip">{opponentMode === "ai" ? `CPU ${aiDifficulty.toUpperCase()}` : "MULTIPLAYER"}</span></div>
        </div>
        <div style={{display:"flex",gap:8}}><button className="button ghost" onClick={() => setSoundOn((value) => !value)}>{soundOn ? "🔊 Sound On" : "🔇 Sound Off"}</button><div className="status">● {connection}</div></div>
      </div>

      <ArenaVisual mode={currentGame} state={state} playerALabel={playerA?.displayName ?? "Player 1"} playerBLabel={playerB?.displayName ?? "Player 2"} playerACharacter={playerACharacter} playerBCharacter={playerBCharacter} />

      <section className="questionPanel">
        <div className="questionMeta">
          <span>{GAME_LABEL[currentGame]} · Round {round}</span><span>{question?.difficulty?.toUpperCase() ?? "WAITING"}</span>
          <span className={secondsLeft <= 10 && roomStatus === "playing" ? "timer danger" : "timer"}>{roomStatus === "playing" ? `${secondsLeft}s` : roomStatus.toUpperCase()}</span>
        </div>
        <h2>{questionText}</h2>
        {question && <p className="muted">{question.topic}{question.subtopic ? ` · ${question.subtopic}` : ""}</p>}
        <div className="answersGrid">{options.map((option,index) => <button key={`${option}-${index}`} type="button" disabled={submitted || roomStatus !== "playing"} onClick={() => void submitAnswer(answerKey(option,index))}>{option}</button>)}</div>
        {feedback && <div className="feedbackBox">{feedback}</div>}
        {roomStatus === "paused" && state.complete && <div className="winnerBox">{GAME_LABEL[currentGame]} selesai. Menunggu host melanjutkan.</div>}
        {roomStatus === "paused" && !state.complete && <p className="muted centerText">Ronde selesai. Menunggu host memulai soal berikutnya.</p>}
      </section>
    </main>
  );
}
