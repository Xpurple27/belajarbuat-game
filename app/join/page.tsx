"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CharacterPicker from "@/src/components/CharacterPicker";
import type { HeroId } from "@/src/components/PixelAvatar";

const SUPPORTED_GRADES = [4, 7];

export default function JoinPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("4");
  const [characterId, setCharacterId] = useState<HeroId>("nova");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) setRoomCode(room.replace(/\D/g, "").slice(0, 6));
  }, []);

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

      const session = {
        id: data.player.id,
        token: data.playerToken,
        side: data.player.side,
        displayName: data.player.display_name,
        gradeLevel: data.player.grade_level,
        characterId,
      };

      const characterResponse = await fetch(`/api/rooms/${code}/character`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-player-token": data.playerToken },
        body: JSON.stringify({ playerId: data.player.id, characterId }),
      });
      if (!characterResponse.ok) {
        const characterData = await characterResponse.json().catch(() => ({}));
        throw new Error(characterData.error ?? "Gagal menyimpan pilihan karakter.");
      }

      sessionStorage.setItem(`arena-player-${code}`, JSON.stringify(session));
      router.push(`/play/${code}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Gagal masuk room.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell narrowShell">
      <section className="setupCard">
        <div className="setupHeader">
          <p className="eyebrow">LEVELUP MATH ARENA</p>
          <h1>Join Arena</h1>
          <p className="muted">Masukkan kode dari host, pilih hero, lalu bermain dari perangkatmu sendiri.</p>
        </div>

        <form onSubmit={joinRoom} className="stack">
          <label className="field">
            <span>Kode room</span>
            <input inputMode="numeric" value={roomCode} onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="527941" maxLength={6} autoComplete="off" />
          </label>

          <label className="field">
            <span>Nama pemain</span>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} placeholder="Nama / nickname" autoComplete="off" />
          </label>

          <label className="field">
            <span>Kelas</span>
            <select value={grade} onChange={(event) => setGrade(event.target.value)}>
              {SUPPORTED_GRADES.map((value) => <option key={value} value={value}>Kelas {value}</option>)}
            </select>
          </label>

          <div>
            <p className="eyebrow">PILIH HERO</p>
            <CharacterPicker value={characterId} onChange={setCharacterId} />
          </div>

          <div className="noticeBox">Bank soal aktif: 60 soal kelas 4 dan 60 soal kelas 7. Soal yang sudah keluar tidak diulang selama masih ada soal lain pada session yang sama.</div>
          {error && <div className="errorBox">{error}</div>}
          <button className="button primary full" disabled={loading} type="submit">{loading ? "Masuk ke arena..." : "Masuk Arena"}</button>
        </form>
      </section>
    </main>
  );
}
