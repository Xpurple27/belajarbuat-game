"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PixelAvatar, { normalizeHeroId, type HeroId } from "@/src/components/PixelAvatar";

type TopicStat={topic:string;attempts:number;correct:number;accuracy:number;avgResponseMs:number};
type PlayerResult={id:string;displayName:string;gradeLevel:number;side:"A"|"B";totalQuestions:number;correct:number;accuracy:number;avgResponseMs:number;strongestTopic:string|null;needsPractice:string|null;topicStats:TopicStat[]};

export default function HostResultsPage(){
  const params=useParams<{code:string}>();const router=useRouter();const code=params.code;
  const [results,setResults]=useState<PlayerResult[]>([]);const [characters,setCharacters]=useState<Record<string,HeroId>>({});const [loading,setLoading]=useState(true);const [error,setError]=useState("");

  useEffect(()=>{
    const raw=sessionStorage.getItem("arena-host-session");if(!raw){router.replace("/host");return}
    try{
      const session=JSON.parse(raw) as {code:string;token:string};if(session.code!==code){router.replace("/host");return}
      void Promise.all([
        fetch(`/api/rooms/${code}/results`,{headers:{"x-host-token":session.token},cache:"no-store"}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error??"Gagal memuat hasil.");setResults(data.results??[])}),
        fetch(`/api/rooms/${code}/character`,{cache:"no-store"}).then(async response=>{if(!response.ok)return;const data=await response.json();const next:Record<string,HeroId>={};for(const item of data.characters??[])next[item.id]=normalizeHeroId(item.characterId);setCharacters(next)}),
      ]).catch(resultError=>setError(resultError instanceof Error?resultError.message:"Gagal memuat hasil.")).finally(()=>setLoading(false));
    }catch{router.replace("/host")}
  },[code,router]);

  return <main className="shell">
    <div className="topbar"><div><p className="eyebrow">LEARNING ANALYTICS</p><div className="roomCode">ROOM {code}</div></div><div className="resultActions"><a className="button ghost" href="/">Home</a><a className="button primary" href="/host">Main Lagi</a></div></div>
    {loading&&<section className="panel">Menghitung hasil belajar...</section>}{error&&<div className="errorBox">{error}</div>}
    <div className="resultsGrid">{results.map(result=><section className="panel resultCard" key={result.id}>
      <div className="resultCardHeader"><div><p className="eyebrow">KELAS {result.gradeLevel} · HASIL PEMAIN</p><h2>{result.displayName}</h2></div></div>
      <div className="resultHeroGrid"><div><div className="metricGrid"><div><strong>{result.accuracy}%</strong><span>Accuracy</span></div><div><strong>{result.correct}/{result.totalQuestions}</strong><span>Correct</span></div><div><strong>{(result.avgResponseMs/1000).toFixed(1)}s</strong><span>Avg response</span></div></div><div className="insightGrid"><div><span>💪 Strongest</span><strong>{result.strongestTopic??"Belum cukup data"}</strong></div><div><span>🎯 Needs practice</span><strong>{result.needsPractice??"Belum cukup data"}</strong></div></div></div>
      <aside className="resultHeroPanel" aria-label={`Karakter ${result.displayName}`}><PixelAvatar side={result.side} characterId={characters[result.id]??(result.side==="A"?"nova":"lyra")} label={result.displayName} state="celebrate"/><span className="muted">LevelUP Hero</span></aside></div>
      <div className="topicTable"><div className="topicRow header"><span>Topik</span><span>Akurasi</span><span>Waktu</span></div>{result.topicStats.map(topic=><div className="topicRow" key={topic.topic}><span>{topic.topic}<small>{topic.correct}/{topic.attempts} benar</small></span><strong>{topic.accuracy}%</strong><span>{(topic.avgResponseMs/1000).toFixed(1)}s</span></div>)}</div>
      <div className="resultActions"><a className="button ghost" href="/">Kembali ke Home</a><a className="button primary" href="/host">Buat Arena Baru</a></div>
    </section>)}</div>
  </main>;
}
