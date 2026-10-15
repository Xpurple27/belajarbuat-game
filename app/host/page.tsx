"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TugArena from "@/src/components/TugArena";
import { supabase } from "@/src/lib/supabase";

type Side = "A" | "B";
type TugState = { position: number; target: number; winner: Side | null };
type PlayerInfo = { id: string; displayName: string; gradeLevel: number; side: Side };
type HostSession = { code: string; token: string };

export default function HostPage() {
  const [hostSession, setHostSession] = useState<HostSession | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [roomStatus, setRoomStatus] = useState("idle");
  const [round, setRound] = useState(0);
  const [state, setState] = useState<TugState>({ position: 0, target: 10, winner: null });
  const [connection, setConnection] = useState("OFFLINE");
  const [lastRound, setLastRound] = useState<{ A?: { correct: boolean; power: number }; B?: { correct: boolean; power: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const refreshSnapshot = useCallback(async (session: HostSession) => {
    const response = await fetch(`/api/rooms/${session.code}`, {
      headers: { "x-host-token": session.token },
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    setRoomStatus(data.room.status);
    setRound(data.room.currentRound);
    if (data.room.gameState) setState(data.room.gameState);
    if (data.players) {
      setPlayers(data.players.map((player: { id: string; display_name: string; grade_level: number; side: Side }) => ({
        id: player.id,
        displayName: player.display_name,
        gradeLevel: player.grade_level,
        side: player.side,
      })));
    }
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("arena-host-session");
    if (!raw) return;
    try {
      const session = JSON.parse(raw) as HostSession;
      setHostSession(session);
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
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "round-start" }, ({ payload }) => {
        setRound(payload.roundNumber ?? 0);
        setRoomStatus("playing");
        setLastRound(null);
      })
      .on("broadcast", { event: "round-resolved" }, ({ payload }) => {
        setState(payload.state);
        setLastRound(payload.answers ?? null);
        setRoomStatus(payload.matchFinished ? "finished" : "paused");
      })
      .on("presence", { event: "sync" }, () => {
        const presence = channel.presenceState<Record<string, unknown>>();
        const onlinePlayers: PlayerInfo[] = [];
        Object.values(presence).flat().forEach((entry) => {
          if (entry.role === "player" && (entry.side === "A" || entry.side === "B")) {
            onlinePlayers.push({
              id: String(entry.playerId),
              displayName: String(entry.displayName),
              gradeLevel: Number(entry.gradeLevel),
              side: entry.side,
            });
          }
        });
        setPlayers(onlinePlayers.sort((a, b) => a.side.localeCompare(b.side)));
        setConnection("ONLINE");
      })
      .subscribe(async (status) => {
        setConnection(status);
        if (status === "SUBSCRIBED") {
          await channel.track({ role: "host", onlineAt: new Date().toISOString() });
        }
      });

    return () => {
      channelRef.current = null;
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [hostSession]);

  async function createRoom() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal membuat room.");
      const session = { code: data.room.code, token: data.hostToken };
      sessionStorage.setItem("arena-host-session", JSON.stringify(session));
      setHostSession(session);
      setRoomStatus(data.room.status);
      setRound(data.room.current_round ?? 0);
      setState(data.room.game_state ?? { position: 0, target: 10, winner: null });
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

  const joinUrl = useMemo(() => hostSession ? `/join?room=${hostSession.code}` : "/join", [hostSession]);
  const canStart = players.length === 2 && roomStatus !== "playing" && roomStatus !== "finished";

  if (!hostSession) {
    return (
      <main className="shell narrowShell">
        <section className="panel joinPanel">
          <p className="eyebrow">HOST CONTROL</p>
          <h1>Buat Math Arena</h1>
          <p className="muted">Buat room, lalu berikan kode 6 digit kepada dua pemain.</p>
          {error && <div className="errorBox">{error}</div>}
          <button className="button" disabled={loading} onClick={() => void createRoom()}>
            {loading ? "Membuat..." : "Create Room"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell gameShell">
      <div className="topbar">
        <div>
          <p className="eyebrow">HOST CONTROL · TUG OF WAR</p>
          <div className="roomCode">ROOM {hostSession.code}</div>
          <a className="smallLink" href={joinUrl}>Buka halaman join</a>
        </div>
        <div className="status">● {connection}</div>
      </div>

      <TugArena position={state.position} target={state.target} winner={state.winner} />

      <div className="hostGrid liveHostGrid">
        <section className="panel">
          <div className="scoreRow">
            <span>Player A</span>
            <strong>Power {state.position > 0 ? state.position : 0}</strong>
            <span>Player B</span>
          </div>
          <div className="playerCards">
            {["A", "B"].map((side) => {
              const player = players.find((item) => item.side === side);
              const result = lastRound?.[side as Side];
              return (
                <div className="playerCard" key={side}>
                  <strong>{side === "A" ? "🧒" : "🧑"} Player {side}</strong>
                  <span>{player ? `${player.displayName} · Kelas ${player.gradeLevel}` : "Menunggu pemain..."}</span>
                  {result && <span>{result.correct ? `✓ +${result.power} power` : "✕ +0 power"}</span>}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="panel">
          <p className="eyebrow">MATCH CONTROL</p>
          <h2>Round {round || 0}</h2>
          <p className="muted">Status: <strong>{roomStatus}</strong></p>
          <p className="muted">Balance: {state.position} / ±{state.target}</p>
          {error && <div className="errorBox">{error}</div>}
          {state.winner ? (
            <div className="winnerBox">Player {state.winner} menang! 🎉</div>
          ) : (
            <button className="button" style={{ width: "100%" }} disabled={!canStart || loading} onClick={() => void startRound()}>
              {roomStatus === "paused" ? "Next Round" : loading ? "Memulai..." : "Start Round"}
            </button>
          )}
          {players.length < 2 && <p className="muted centerText">Menunggu {2 - players.length} pemain lagi.</p>}
        </aside>
      </div>
    </main>
  );
}
