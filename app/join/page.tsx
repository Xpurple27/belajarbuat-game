"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState(searchParams.get("room") ?? "");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function joinRoom(event: FormEvent) {
    event.preventDefault();
    setError("");
    const code = roomCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6 || !name.trim()) {
      setError("Isi kode room 6 digit dan nama pemain.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), gradeLevel: Number(grade) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal masuk room.");

      sessionStorage.setItem(
        `arena-player-${code}`,
        JSON.stringify({
          id: data.player.id,
          token: data.playerToken,
          side: data.player.side,
          displayName: data.player.display_name,
          gradeLevel: data.player.grade_level,
        }),
      );
      router.push(`/play/${code}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Gagal masuk room.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell narrowShell">
      <section className="panel joinPanel">
        <p className="eyebrow">LEVELUP MATH ARENA</p>
        <h1>Join Room</h1>
        <p className="muted">Masukkan kode dari host. Tidak perlu membuat akun untuk MVP.</p>

        <form onSubmit={joinRoom} className="stack">
          <label className="field">
            <span>Kode room</span>
            <input
              inputMode="numeric"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="527941"
              maxLength={6}
            />
          </label>

          <label className="field">
            <span>Nama pemain</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} placeholder="Nama" />
          </label>

          <label className="field">
            <span>Kelas</span>
            <select value={grade} onChange={(event) => setGrade(event.target.value)}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>Kelas {value}</option>
              ))}
            </select>
          </label>

          {error && <div className="errorBox">{error}</div>}
          <button className="button" disabled={loading} type="submit">
            {loading ? "Masuk..." : "Masuk Arena"}
          </button>
        </form>
      </section>
    </main>
  );
}
