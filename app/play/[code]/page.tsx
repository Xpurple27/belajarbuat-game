"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ArenaVisual from "@/src/components/ArenaVisual";
import { supabase } from "@/src/lib/supabase";
import {
  createGameState,
  type ArenaGameState,
  type GameMode,
  type PlayerSide,
} from "@/src/core/game";

type PlayerSession = {
  id: string;
  token: string;
  side: PlayerSide;
  displayName: string;
  gradeLevel: number;
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
    estimatedTimeSeconds: question.estimatedTimeSeconds ?? question.estimated_time_seconds,
    powerValue: question.powerValue ?? question.power_value,
  };
}

function answerKey(option: string, index: number): string {
  const match = option.match(/^\s*([A-E])(?:[.):-]|\s)/i);
  return match?.[1]?.toUpperCase() ?? String.fromCharCode(65 + index);
}

export default function PlayerPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [roomStatus, setRoomStatus] = useState("waiting");
  const [currentGame, setCurrentGame] = useState<GameMode>("tug-of-war");
  const [round, setRound] = useState(0);
  const [state, setState] = useState<ArenaGameState>(createGameState("tug-of-war"));
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [connection, setConnection] = useState("CONNECTING");
  const startedAtRef = useRef(0);
  const sessionRef = useRef<PlayerSession | null>(null);

  const loadSnapshot = useCallback(async (currentSession: PlayerSession) => {
    const response = await fetch(`/api/rooms/${code}?playerId=${encodeURIComponent(currentSession.id)}`, {
      headers: { "x-player-token": currentSession.token },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    setRoomStatus(data.room.status);
    setCurrentGame(data.room.currentGame);
    setRound(data.room.currentRound);
    if (data.room.gameState) setState(data.room.gameState);
    if (data.question) {
      const normalized = normalizeQuestion(data.question);
      setQuestion(normalized);
      setSecondsLeft(normalized?.estimatedTimeSeconds ?? 60);
      startedAtRef.current = Date.now();
    }
  }, [code]);

  useEffect(() => {
    const raw = sessionStorage.getItem(`arena-player-${code}`);
    if (!raw) {
      router.replace(`/join?room=${code}`);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PlayerSession;
      sessionRef.current = parsed;
      setSession(parsed);
      void loadSnapshot(parsed);
    } catch {
      router.replace(`/join?room=${code}`);
    }
  }, [code, loadSnapshot, router]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel(`arena-room-${code}`, {
      config: { presence: { key: session.id } },
    });

    channel
      .on("broadcast", { event: "round-start" }, ({ payload }) => {
        const activeSession = sessionRef.current;
        if (!activeSession) return;
        const nextQuestion = normalizeQuestion(payload.questions?.[activeSession.side] ?? null);
        if (payload.gameMode) setCurrentGame(payload.gameMode);
        setQuestion(nextQuestion);
        setRound(payload.roundNumber ?? 0);
        setRoomStatus("playing");
        setSubmitted(false);
        setFeedback("");
        setSecondsLeft(nextQuestion?.estimatedTimeSeconds ?? 60);
        startedAtRef.current = Number(payload.startedAt) || Date.now();
      })
      .on("broadcast", { event: "round-resolved" }, ({ payload }) => {
        if (payload.gameMode) setCurrentGame(payload.gameMode);
        setState(payload.state);
        setRoomStatus("paused");
        const ownSide = sessionRef.current?.side;
        if (ownSide && payload.answers?.[ownSide]) {
          const own = payload.answers[ownSide];
          setFeedback(own.correct ? `Benar! +${own.power} power` : "Belum tepat. +0 power");
        }
      })
      .on("broadcast", { event: "game-changed" }, ({ payload }) => {
        setCurrentGame(payload.gameMode);
        setState(payload.state);
        setRound(0);
        setQuestion(null);
        setSubmitted(false);
        setFeedback(`${GAME_LABEL[payload.gameMode as GameMode]} siap. Menunggu host.`);
        setRoomStatus("paused");
      })
      .on("broadcast", { event: "session-finished" }, () => {
        setQuestion(null);
        setRoomStatus("finished");
        setFeedback("Sesi Math Arena selesai. Great job!");
      })
      .on("presence", { event: "sync" }, () => setConnection("ONLINE"))
      .subscribe(async (status) => {
        setConnection(status);
        if (status === "SUBSCRIBED") {
          await channel.track({
            role: "player",
            playerId: session.id,
            side: session.side,
            displayName: session.displayName,
            gradeLevel: session.gradeLevel,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [code, session]);

  const submitAnswer = useCallback(async (answer: string) => {
    const currentSession = sessionRef.current;
    if (!currentSession || submitted || roomStatus !== "playing") return;
    setSubmitted(true);
    const responseTimeMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;

    try {
      const response = await fetch(`/api/rooms/${code}/answer`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-player-token": currentSession.token,
        },
        body: JSON.stringify({ playerId: currentSession.id, answer, responseTimeMs }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Jawaban gagal dikirim.");
      setFeedback(data.correct ? `Benar! +${data.powerAwarded} power` : "Belum tepat. Menunggu lawan...");
    } catch (error) {
      setSubmitted(false);
      setFeedback(error instanceof Error ? error.message : "Jawaban gagal dikirim.");
    }
  }, [code, roomStatus, submitted]);

  useEffect(() => {
    if (roomStatus !== "playing" || submitted || !question || secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [question, roomStatus, secondsLeft, submitted]);

  useEffect(() => {
    if (roomStatus === "playing" && question && secondsLeft === 0 && !submitted) {
      void submitAnswer("__TIMEOUT__");
    }
  }, [question, roomStatus, secondsLeft, submitAnswer, submitted]);

  const questionText = question?.questionText ?? (roomStatus === "finished" ? "Sesi selesai 🎉" : "Menunggu host memulai ronde...");
  const options = useMemo(() => (Array.isArray(question?.options) ? question.options : []), [question]);

  if (!session) return <main className="shell"><div className="panel">Memuat sesi pemain...</div></main>;

  return (
    <main className="shell gameShell">
      <div className="topbar">
        <div>
          <p className="eyebrow">PLAYER {session.side} · KELAS {session.gradeLevel} · {GAME_LABEL[currentGame].toUpperCase()}</p>
          <div className="roomCode">{session.displayName} · ROOM {code}</div>
        </div>
        <div className="status">● {connection}</div>
      </div>

      <ArenaVisual mode={currentGame} state={state} />

      <section className="questionPanel">
        <div className="questionMeta">
          <span>{GAME_LABEL[currentGame]} · Round {round}</span>
          <span>{question?.difficulty?.toUpperCase() ?? "WAITING"}</span>
          <span className={secondsLeft <= 10 && roomStatus === "playing" ? "timer danger" : "timer"}>{secondsLeft}s</span>
        </div>
        <h2>{questionText}</h2>
        {question && <p className="muted">{question.topic}{question.subtopic ? ` · ${question.subtopic}` : ""}</p>}

        <div className="answersGrid">
          {options.map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              disabled={submitted || roomStatus !== "playing"}
              onClick={() => void submitAnswer(answerKey(option, index))}
            >
              {option}
            </button>
          ))}
        </div>

        {feedback && <div className="feedbackBox">{feedback}</div>}
        {roomStatus === "paused" && state.complete && <div className="winnerBox">{GAME_LABEL[currentGame]} selesai. Menunggu host melanjutkan.</div>}
        {roomStatus === "paused" && !state.complete && <p className="muted centerText">Ronde selesai. Menunggu host memulai soal berikutnya.</p>}
      </section>
    </main>
  );
}
