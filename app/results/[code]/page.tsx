"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PixelAvatar, { normalizeHeroId, type HeroId } from "@/src/components/PixelAvatar";

type TopicStat = { topic:string; attempts:number; correct:number; accuracy:number; avgResponseMs:number };
type PlayerResult = {
  id:string; displayName:string; gradeLevel:number; side:"A"|"B";
  totalQuestions:number; correct:number; accuracy:number; avgResponseMs:number;
  strongestTopic:string|null; needsPractice:string|null; topicStats:TopicStat[];
};
type PlayerSession = { id:string; token:string; displayName:string; gradeLevel:number; side:"A"|"B"; characterId?:HeroId };

export default function PlayerResultsPage() {
  const params = useParams<{ code:string }>();
  const router = useRouter();
  const code = params.code;
  const [result, setResult] = useState<PlayerResult|null>(null);
  const [hero, setHero] = useState<HeroId>("nova");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(`arena-player-${code}`);
    if (!raw) { router.replace(`/join?room=${code}`); return; }
    try {
      const session = JSON.parse(raw) as PlayerSession;
      setHero(normalizeHeroId(session.characterId));
      void Promise.all([
        fetch(`/api/rooms/${code}/results?playerId=${encodeURIComponent(session.id)}`, {
          headers: { "x-player-token": session.token }, cache:"no-store",
        }).then(async response => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Gagal memuat hasil.");
          setResult(data.results?.[0] ?? null);
        }),
        fetch(`/api/rooms/${code}/character`, { cache:"no-store" }).then(async response => {
          if (!response.ok) return;
          const data = await response.json();
          const own = (data.characters ?? []).find((item:{id:string;characterId:string}) => item.id === session.id);
          if (own?.characterId) setHero(normalizeHeroId(own.characterId));
        }),
      ]).catch(loadError => setError(loadError instanceof Error ? loadError.message : "Gagal memuat hasil."))
        .finally(() => setLoading(false));
    } catch {
      router.replace(`/join?room=${code}`);
    }
  }, [code, router]);

  return (
    <main className="shell narrowShell">
      <div className="topbar">
        <div><p className="eyebrow">SESSION COMPLETE</p><div className="roomCode">HASIL ARENA</div></div>
        <div className="resultActions"><a className="button ghost" href="/">Home</a><a className="button primary" href="/join">Main Lagi</a></div>
      </div>

      {loading && <section className="panel">Menghitung hasil belajarmu...</section>}
      {error && <div className="errorBox">{error}</div>}
      {!loading && !error && !result && <section className="panel">Belum ada hasil yang bisa ditampilkan.</section>}

      {result && <section className="panel resultCard playerResultCard">
        <div className="resultHeroGrid">
          <div>
            <p className="eyebrow">KELAS {result.gradeLevel} · ROOM {code}</p>
            <h2>{result.displayName}</h2>
            <p className="muted">Sesi selesai. Ini ringkasan performamu dari empat arena.</p>
            <div className="metricGrid">
              <div><strong>{result.accuracy}%</strong><span>Accuracy</span></div>
              <div><strong>{result.correct}/{result.totalQuestions}</strong><span>Correct</span></div>
              <div><strong>{(result.avgResponseMs/1000).toFixed(1)}s</strong><span>Avg response</span></div>
            </div>
            <div className="insightGrid">
              <div><span>💪 Strongest</span><strong>{result.strongestTopic ?? "Belum cukup data"}</strong></div>
              <div><span>🎯 Needs practice</span><strong>{result.needsPractice ?? "Belum cukup data"}</strong></div>
            </div>
          </div>
          <aside className="resultHeroPanel">
            <PixelAvatar side={result.side} characterId={hero} label={result.displayName} state="celebrate" />
            <strong>Great job!</strong>
            <span className="muted">LevelUP Hero</span>
          </aside>
        </div>

        <div className="topicTable">
          <div className="topicRow header"><span>Topik</span><span>Akurasi</span><span>Waktu</span></div>
          {result.topicStats.map(topic => <div className="topicRow" key={topic.topic}>
            <span>{topic.topic}<small>{topic.correct}/{topic.attempts} benar</small></span>
            <strong>{topic.accuracy}%</strong>
            <span>{(topic.avgResponseMs/1000).toFixed(1)}s</span>
          </div>)}
        </div>

        <div className="resultActions resultNextActions">
          <a className="button ghost" href="/">Kembali ke Home</a>
          <a className="button primary" href="/join">Main Lagi</a>
        </div>
      </section>}
    </main>
  );
}
