"use client";

import { FormEvent, useState } from "react";

export default function JoinPage() {
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("4");
  const [room, setRoom] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || room.trim().length < 4) return;
    setJoined(true);
  }

  return (
    <main className="shell" style={{ maxWidth: 620 }}>
      <p className="eyebrow">PLAYER JOIN</p>
      <h1 style={{ fontSize: "clamp(38px, 8vw, 64px)" }}>Masuk ke Math Arena</h1>

      {!joined ? (
        <form className="panel" onSubmit={submit}>
          <label className="field">
            <span>Kode room</span>
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="527941"
              value={room}
              onChange={(event) => setRoom(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="field">
            <span>Nama pemain</span>
            <input maxLength={24} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama panggilan" />
          </label>
          <label className="field">
            <span>Kelas</span>
            <select value={grade} onChange={(event) => setGrade(event.target.value)}>
              <option value="4">Kelas 4 SD</option>
              <option value="7">Kelas 7 SMP</option>
            </select>
          </label>
          <button className="button primary" style={{ width: "100%" }} type="submit">JOIN ROOM</button>
        </form>
      ) : (
        <section className="panel">
          <div className="status">● Terhubung ke prototype room {room}</div>
          <h2 style={{ marginTop: 22 }}>{name}</h2>
          <p className="muted">Kelas {grade} · menunggu host memulai permainan.</p>
          <div className="arena" style={{ minHeight: 220, marginTop: 20 }}>
            <div className="pixelCharacter a">🧒</div>
            <div className="track" />
          </div>
        </section>
      )}
    </main>
  );
}
