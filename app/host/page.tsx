"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ArenaVisual from "@/src/components/ArenaVisual";
import CharacterPicker from "@/src/components/CharacterPicker";
import { normalizeHeroId, type HeroId } from "@/src/components/PixelAvatar";
import { supabase } from "@/src/lib/supabase";
import { playSfx } from "@/src/lib/sfx";
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
  characterId?: HeroId;
  playerType?: "human" | "ai";
  isHostPlayer?: boolean;
};

type HostSession = { code: string; token: string; playerSession?: PlayerSession | null };
type RoundResult = { A?: { correct:boolean; power:number; responseTimeMs?:number }; B?: { correct:boolean; power:number; responseTimeMs?:number } };
type PublicQuestion = {
  id:string; topic:string; subtopic?:string|null; difficulty:"easy"|"medium"|"hard";
  questionText?:string; question_text?:string; options:string[]|null;
  estimatedTimeSeconds?:number; estimated_time_seconds?:number;
};

const SUPPORTED_GRADES=[4,7];
const ROUND_DURATION_SECONDS=60;
const GAME_LABEL:Record<GameMode,string>={"tug-of-war":"Tug of War",racing:"Math Racing","boss-battle":"Boss Battle","bomb-defuse":"Bomb Defuse"};

function normalizeQuestion(question:PublicQuestion|null):PublicQuestion|null{
  if(!question)return null;
  return {...question,questionText:question.questionText??question.question_text,estimatedTimeSeconds:question.estimatedTimeSeconds??question.estimated_time_seconds??ROUND_DURATION_SECONDS};
}
function answerKey(option:string,index:number){const match=option.match(/^\s*([A-E])(?:[.):-]|\s)/i);return match?.[1]?.toUpperCase()??String.fromCharCode(65+index)}
function secondsRemaining(startedAtMs:number,duration=ROUND_DURATION_SECONDS){if(!startedAtMs)return duration;return Math.max(0,duration-Math.floor((Date.now()-startedAtMs)/1000))}

export default function HostPage(){
  const [hostSession,setHostSession]=useState<HostSession|null>(null);
  const [players,setPlayers]=useState<PlayerInfo[]>([]);
  const [characters,setCharacters]=useState<Record<string,HeroId>>({});
  const [onlineHumanIds,setOnlineHumanIds]=useState<Set<string>>(new Set());
  const [roomStatus,setRoomStatus]=useState("idle");
  const [opponentMode,setOpponentMode]=useState<OpponentMode>("multiplayer");
  const [aiDifficulty,setAiDifficulty]=useState<AiDifficulty>("medium");
  const [hostPlays,setHostPlays]=useState(false);
  const [hostName,setHostName]=useState("Coach");
  const [hostGrade,setHostGrade]=useState(7);
  const [hostCharacter,setHostCharacter]=useState<HeroId>("nova");
  const [currentGame,setCurrentGame]=useState<GameMode>("tug-of-war");
  const [round,setRound]=useState(0);
  const [state,setState]=useState<ArenaGameState>(createGameState("tug-of-war"));
  const [connection,setConnection]=useState("OFFLINE");
  const [lastRound,setLastRound]=useState<RoundResult|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);
  const [hostQuestion,setHostQuestion]=useState<PublicQuestion|null>(null);
  const [hostSeconds,setHostSeconds]=useState(0);
  const [hostSubmitted,setHostSubmitted]=useState(false);
  const [hostFeedback,setHostFeedback]=useState("");
  const [soundOn,setSoundOn]=useState(true);

  const hostStartedAtRef=useRef(0);
  const hostQuestionIdRef=useRef<string|null>(null);
  const hostPlayerRef=useRef<PlayerSession|null>(null);
  const soundOnRef=useRef(true);
  useEffect(()=>{soundOnRef.current=soundOn},[soundOn]);

  const mapPlayers=useCallback((rows:Array<{id:string;display_name:string;grade_level:number;side:PlayerSide;player_type?:"human"|"ai";is_host_player?:boolean}>)=>rows.map(player=>({
    id:player.id,displayName:player.display_name,gradeLevel:player.grade_level,side:player.side,playerType:player.player_type??"human",isHostPlayer:Boolean(player.is_host_player),
  })),[]);

  const loadCharacters=useCallback(async(code:string)=>{
    const response=await fetch(`/api/rooms/${code}/character`,{cache:"no-store"});
    if(!response.ok)return;
    const data=await response.json();
    const next:Record<string,HeroId>={};
    for(const item of data.characters??[])next[item.id]=normalizeHeroId(item.characterId);
    setCharacters(next);
  },[]);

  const syncHostQuestion=useCallback((incoming:PublicQuestion|null,startedAtMs:number)=>{
    const next=normalizeQuestion(incoming);if(!next)return;
    const isNew=hostQuestionIdRef.current!==next.id;
    hostQuestionIdRef.current=next.id;hostStartedAtRef.current=startedAtMs||Date.now();setHostQuestion(next);
    setHostSeconds(secondsRemaining(hostStartedAtRef.current,next.estimatedTimeSeconds??ROUND_DURATION_SECONDS));
    if(isNew){setHostSubmitted(false);setHostFeedback("")}
  },[]);

  const loadHostPlayerQuestion=useCallback(async(session:HostSession)=>{
    const playerSession=session.playerSession;if(!playerSession)return;
    const response=await fetch(`/api/rooms/${session.code}?playerId=${encodeURIComponent(playerSession.id)}`,{headers:{"x-player-token":playerSession.token},cache:"no-store"});
    if(!response.ok)return;const data=await response.json();
    if(data.question&&data.room?.status==="playing")syncHostQuestion(data.question,data.room.roundStartedAt?new Date(data.room.roundStartedAt).getTime():Date.now());
  },[syncHostQuestion]);

  const refreshSnapshot=useCallback(async(session:HostSession)=>{
    const response=await fetch(`/api/rooms/${session.code}`,{headers:{"x-host-token":session.token},cache:"no-store"});if(!response.ok)return;
    const data=await response.json();setRoomStatus(data.room.status);setOpponentMode(data.room.opponentMode??"multiplayer");setAiDifficulty(data.room.aiDifficulty??"medium");
    setCurrentGame(data.room.currentGame);setRound(data.room.currentRound);if(data.room.gameState)setState(data.room.gameState);if(data.players)setPlayers(mapPlayers(data.players));
    void loadCharacters(session.code);if(session.playerSession&&data.room.status==="playing")await loadHostPlayerQuestion(session);
  },[loadCharacters,loadHostPlayerQuestion,mapPlayers]);

  useEffect(()=>{
    const raw=sessionStorage.getItem("arena-host-session");if(!raw)return;
    try{const session=JSON.parse(raw) as HostSession;hostPlayerRef.current=session.playerSession??null;setHostSession(session);setHostPlays(Boolean(session.playerSession));if(session.playerSession?.characterId)setHostCharacter(session.playerSession.characterId);void refreshSnapshot(session)}catch{sessionStorage.removeItem("arena-host-session")}
  },[refreshSnapshot]);

  useEffect(()=>{
    if(!hostSession)return;
    const channel=supabase.channel(`arena-room-${hostSession.code}`,{config:{presence:{key:`host-${hostSession.code}`}}});
    channel
      .on("broadcast",{event:"round-start"},({payload})=>{setRound(payload.roundNumber??0);setRoomStatus("playing");setLastRound(null);const hp=hostPlayerRef.current;if(hp)syncHostQuestion(payload.questions?.[hp.side]??null,Number(payload.startedAt)||Date.now());if(soundOnRef.current)playSfx("start")})
      .on("broadcast",{event:"round-resolved"},({payload})=>{
        setState(payload.state);setLastRound(payload.answers??null);setRoomStatus("paused");const side=hostPlayerRef.current?.side;if(side&&payload.answers?.[side]){const own=payload.answers[side];setHostFeedback(own.correct?`Benar! +${own.power} power`:"Belum tepat. Ronde selesai.")}
        if(soundOnRef.current){const game=payload.gameMode as GameMode;if(game==="tug-of-war")playSfx(payload.gameComplete?"win":"rope");else if(game==="racing")playSfx(payload.gameComplete?"win":"engine");else if(game==="boss-battle")playSfx(payload.gameComplete?(payload.state?.success?"win":"defeat"):"bossHit");else if(game==="bomb-defuse"&&payload.gameComplete){if(payload.state?.success)playSfx("win");else{playSfx("alarm");window.setTimeout(()=>{if(soundOnRef.current)playSfx("explosion")},520)}}}
      })
      .on("broadcast",{event:"character-changed"},({payload})=>{if(payload.playerId)setCharacters(current=>({...current,[String(payload.playerId)]:normalizeHeroId(payload.characterId)}))})
      .on("broadcast",{event:"game-changed"},({payload})=>{setCurrentGame(payload.gameMode);setState(payload.state);setRound(0);setLastRound(null);setHostQuestion(null);hostQuestionIdRef.current=null;hostStartedAtRef.current=0;setHostSubmitted(false);setHostFeedback("");setRoomStatus("paused")})
      .on("broadcast",{event:"session-finished"},()=>{setRoomStatus("finished");setHostQuestion(null);hostQuestionIdRef.current=null})
      .on("presence",{event:"sync"},()=>{const presence=channel.presenceState<Record<string,unknown>>();const ids=new Set<string>();Object.values(presence).flat().forEach(entry=>{if(entry.role==="player"&&entry.playerId)ids.add(String(entry.playerId))});setOnlineHumanIds(ids);setConnection("ONLINE")})
      .subscribe(async status=>{setConnection(status);if(status==="SUBSCRIBED")await channel.track({role:"host",hostPlayerId:hostPlayerRef.current?.id??null,onlineAt:new Date().toISOString()})});
    return()=>{void channel.untrack();void supabase.removeChannel(channel)};
  },[hostSession,syncHostQuestion]);

  useEffect(()=>{if(!hostSession||roomStatus==="finished")return;const timer=window.setInterval(()=>void refreshSnapshot(hostSession),5000);return()=>window.clearInterval(timer)},[hostSession,refreshSnapshot,roomStatus]);

  async function createRoom(){
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/rooms",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({opponentMode,aiDifficulty,hostPlays,hostDisplayName:hostName,hostGradeLevel:hostGrade})});
      const data=await response.json();if(!response.ok)throw new Error(data.error??"Gagal membuat room.");
      let playerSession=data.hostPlayerSession as PlayerSession|null;
      if(playerSession){
        const characterResponse=await fetch(`/api/rooms/${data.room.code}/character`,{method:"POST",headers:{"content-type":"application/json","x-player-token":playerSession.token},body:JSON.stringify({playerId:playerSession.id,characterId:hostCharacter})});
        if(!characterResponse.ok)throw new Error("Room dibuat, tetapi hero host gagal disimpan.");
        playerSession={...playerSession,characterId:hostCharacter};
      }
      const session:HostSession={code:data.room.code,token:data.hostToken,playerSession};sessionStorage.setItem("arena-host-session",JSON.stringify(session));if(playerSession)sessionStorage.setItem(`arena-player-${data.room.code}`,JSON.stringify(playerSession));
      hostPlayerRef.current=playerSession;setHostSession(session);setRoomStatus(data.room.status);setCurrentGame(data.room.current_game);setRound(data.room.current_round??0);setState(data.room.game_state??createGameState("tug-of-war"));await refreshSnapshot(session);
    }catch(e){setError(e instanceof Error?e.message:"Gagal membuat room.")}finally{setLoading(false)}
  }

  async function startRound(){if(!hostSession)return;setLoading(true);setError("");try{const response=await fetch(`/api/rooms/${hostSession.code}/round`,{method:"POST",headers:{"x-host-token":hostSession.token}});const data=await response.json();if(!response.ok)throw new Error(data.error??"Gagal memulai ronde.");setRound(data.roundNumber);setRoomStatus("playing")}catch(e){setError(e instanceof Error?e.message:"Gagal memulai ronde.")}finally{setLoading(false)}}
  async function advanceGame(){if(!hostSession)return;setLoading(true);setError("");try{const response=await fetch(`/api/rooms/${hostSession.code}/advance`,{method:"POST",headers:{"x-host-token":hostSession.token}});const data=await response.json();if(!response.ok)throw new Error(data.error??"Gagal melanjutkan game.");if(data.finished)setRoomStatus("finished");else{setCurrentGame(data.gameMode);setState(data.state);setRound(0);setLastRound(null);setHostQuestion(null);hostQuestionIdRef.current=null;setHostFeedback("");setRoomStatus("paused")}}catch(e){setError(e instanceof Error?e.message:"Gagal melanjutkan game.")}finally{setLoading(false)}}

  const submitHostAnswer=useCallback(async(answer:string)=>{const ps=hostPlayerRef.current;if(!hostSession||!ps||hostSubmitted||roomStatus!=="playing")return;setHostSubmitted(true);const responseTimeMs=hostStartedAtRef.current?Math.max(0,Date.now()-hostStartedAtRef.current):0;try{const response=await fetch(`/api/rooms/${hostSession.code}/answer`,{method:"POST",headers:{"content-type":"application/json","x-player-token":ps.token},body:JSON.stringify({playerId:ps.id,answer,responseTimeMs})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Jawaban gagal dikirim.");setHostFeedback(data.correct?`Benar! +${data.powerAwarded} power`:"Belum tepat. Menunggu lawan...");if(soundOnRef.current)playSfx(data.correct?"correct":"wrong")}catch(e){setHostSubmitted(false);setHostFeedback(e instanceof Error?e.message:"Jawaban gagal dikirim.")}},[hostSession,hostSubmitted,roomStatus]);
  useEffect(()=>{if(!hostQuestion||hostSubmitted||roomStatus!=="playing"||hostSeconds<=0)return;const timer=window.setTimeout(()=>setHostSeconds(secondsRemaining(hostStartedAtRef.current,hostQuestion.estimatedTimeSeconds??ROUND_DURATION_SECONDS)),1000);return()=>window.clearTimeout(timer)},[hostQuestion,hostSeconds,hostSubmitted,roomStatus]);
  useEffect(()=>{if(hostQuestion&&roomStatus==="playing"&&hostSeconds===0&&!hostSubmitted)void submitHostAnswer("__TIMEOUT__")},[hostQuestion,hostSeconds,hostSubmitted,roomStatus,submitHostAnswer]);

  function newRoom(){sessionStorage.removeItem("arena-host-session");if(hostSession)sessionStorage.removeItem(`arena-player-${hostSession.code}`);hostPlayerRef.current=null;hostQuestionIdRef.current=null;setHostSession(null);setPlayers([]);setCharacters({});setOnlineHumanIds(new Set());setRoomStatus("idle");setCurrentGame("tug-of-war");setRound(0);setState(createGameState("tug-of-war"));setHostQuestion(null);setError("")}

  const joinPath=hostSession?`/join?room=${hostSession.code}`:"/join";
  const playerA=players.find(item=>item.side==="A"),playerB=players.find(item=>item.side==="B");
  const externalHumans=players.filter(item=>item.playerType==="human"&&!item.isHostPlayer),allExternalHumansOnline=externalHumans.every(player=>onlineHumanIds.has(player.id));
  const canStart=players.length===2&&allExternalHumansOnline&&roomStatus!=="playing"&&roomStatus!=="finished"&&!state.complete;
  const hostOptions=Array.isArray(hostQuestion?.options)?hostQuestion.options:[],currentGameIndex=GAME_ORDER.indexOf(currentGame);
  const charA:HeroId=playerA?.playerType==="ai"?"lyra":playerA?characters[playerA.id]??"nova":"nova";
  const charB:HeroId=playerB?.playerType==="ai"?"lyra":playerB?characters[playerB.id]??"lyra":"lyra";

  async function copyJoinLink(){if(!hostSession)return;await navigator.clipboard.writeText(`${window.location.origin}${joinPath}`);setCopied(true);window.setTimeout(()=>setCopied(false),1400)}

  if(!hostSession)return <main className="shell narrowShell"><section className="setupCard"><div className="setupHeader"><p className="eyebrow">LEVELUP MATH ARENA</p><h1>Buat Arena</h1><p className="muted">Pilih mode, peran host, dan hero. Soal menyesuaikan kelas masing-masing.</p></div><div className="setupGrid">
    <div><p className="eyebrow">1 · LAWAN</p><div className="choiceGrid"><button className={`choiceCard ${opponentMode==="multiplayer"?"active":""}`} onClick={()=>setOpponentMode("multiplayer")}><strong>Multiplayer</strong><span>Dua manusia dari device berbeda. Host boleh ikut.</span></button><button className={`choiceCard ${opponentMode==="ai"?"active":""}`} onClick={()=>setOpponentMode("ai")}><strong>Versus Computer</strong><span>Lawan CPU Easy, Medium, atau Hard.</span></button></div></div>
    <div><p className="eyebrow">2 · PERAN HOST</p><div className="choiceGrid"><button className={`choiceCard ${!hostPlays?"active":""}`} onClick={()=>setHostPlays(false)}><strong>Host Only</strong><span>Kontrol dan observasi.</span></button><button className={`choiceCard ${hostPlays?"active":""}`} onClick={()=>setHostPlays(true)}><strong>Host + Player</strong><span>Host ikut menjawab dan bermain.</span></button></div></div>
    {hostPlays&&<><div className="formGrid"><div className="field"><label>Nama pemain host</label><input value={hostName} maxLength={24} onChange={e=>setHostName(e.target.value)}/></div><div className="field"><label>Kelas soal host</label><select value={hostGrade} onChange={e=>setHostGrade(Number(e.target.value))}>{SUPPORTED_GRADES.map(g=><option key={g} value={g}>Kelas {g}</option>)}</select></div></div><div><p className="eyebrow">PILIH HERO HOST</p><CharacterPicker value={hostCharacter} onChange={setHostCharacter}/></div></>}
    {opponentMode==="ai"&&<div><p className="eyebrow">3 · LEVEL COMPUTER</p><div className="aiLevelRow">{(["easy","medium","hard"] as AiDifficulty[]).map(level=><button key={level} className={`aiLevelButton ${aiDifficulty===level?"active":""}`} onClick={()=>setAiDifficulty(level)}>{level.toUpperCase()}</button>)}</div><p className="muted">Easy lebih lambat dan sering salah; Hard cepat dan akurat.</p></div>}
    <div className="setupSummary"><span className="infoChip">4 game</span><span className="infoChip">Realtime</span><span className="infoChip">120 soal aktif</span><span className="infoChip">Anti-repeat</span></div>{error&&<div className="errorBox">{error}</div>}<button className="button primary full" disabled={loading||(hostPlays&&!hostName.trim())} onClick={()=>void createRoom()}>{loading?"Membuat arena...":"Create Arena"}</button>
  </div></section></main>;

  return <main className="shell gameShell"><div className="topbar"><div><p className="eyebrow">HOST CONTROL · {opponentMode==="ai"?`VS CPU ${aiDifficulty.toUpperCase()}`:"MULTIPLAYER"}</p><div className="roomCode">ROOM {hostSession.code}</div><div className="setupSummary">{GAME_ORDER.map((mode,index)=><span key={mode} className="infoChip" style={{opacity:index<=currentGameIndex?1:.45}}>{index+1}. {GAME_LABEL[mode]}</span>)}</div></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><button className="button ghost" onClick={()=>setSoundOn(v=>!v)}>{soundOn?"🔊 Sound On":"🔇 Sound Off"}</button><div className="status">● {connection}</div><button className="button ghost" onClick={newRoom}>New Room</button></div></div>

    <ArenaVisual mode={currentGame} state={state} playerALabel={playerA?.displayName??"Player 1"} playerBLabel={playerB?.displayName??"Player 2"} playerACharacter={charA} playerBCharacter={charB}/>

    <div className="hostControlLayout"><section className="panel"><p className="eyebrow">PLAYERS</p><div className="playerRoster">{(["A","B"] as PlayerSide[]).map(side=>{const player=players.find(item=>item.side===side),result=lastRound?.[side],online=player?.playerType==="ai"||player?.isHostPlayer||(player?onlineHumanIds.has(player.id):false);return <div className={`rosterCard player${side}`} key={side}><div className="rosterTop"><strong>{player?.displayName??"Menunggu pemain..."}</strong><span className="typeBadge">{player?.playerType==="ai"?`CPU ${aiDifficulty}`:player?.isHostPlayer?"HOST":"HUMAN"}</span></div><span>{player?`Kelas ${player.gradeLevel}`:"Slot kosong"}</span><span><i className={`onlineDot ${online?"":"offlineDot"}`}/>{player?(online?"Ready":"Offline"):"Menunggu"}</span>{result&&<strong>{result.correct?`✓ +${result.power} power`:"✕ +0 power"}</strong>}</div>})}</div>
      {hostSession.playerSession&&<div className="hostPlayPanel"><p className="eyebrow">{hostSession.playerSession.displayName} · KELAS {hostSession.playerSession.gradeLevel}</p><h3>{hostQuestion?.questionText??(roomStatus==="playing"?"Memuat soal...":"Menunggu ronde dimulai")}</h3>{hostQuestion&&<p className="muted">{hostQuestion.topic}{hostQuestion.subtopic?` · ${hostQuestion.subtopic}`:""} · {hostQuestion.difficulty.toUpperCase()}</p>}{roomStatus==="playing"&&<div className={hostSeconds<=10?"timer danger":"timer"}>{hostSeconds}s</div>}<div className="answersGrid">{hostOptions.map((option,index)=><button key={`${option}-${index}`} disabled={hostSubmitted||roomStatus!=="playing"} onClick={()=>void submitHostAnswer(answerKey(option,index))}>{option}</button>)}</div>{hostFeedback&&<div className="feedbackBox">{hostFeedback}</div>}</div>}
    </section><aside className="controlStack"><section className="panel"><p className="eyebrow">MATCH CONTROL</p><h2>{GAME_LABEL[currentGame]} · Round {round}</h2><p className="muted">Status: <strong>{roomStatus}</strong></p>{error&&<div className="errorBox">{error}</div>}{roomStatus==="finished"?<><div className="winnerBox">Sesi 4 game selesai</div><a className="button primary full" href={`/host/results/${hostSession.code}`}>Lihat Hasil Belajar</a></>:state.complete?<><div className="winnerBox">{GAME_LABEL[currentGame]} selesai</div><button className="button primary full" disabled={loading} onClick={()=>void advanceGame()}>{currentGame==="bomb-defuse"?"Finish Session":"Next Game"}</button></>:<button className="button primary full" disabled={!canStart||loading} onClick={()=>void startRound()}>{roomStatus==="paused"?"Next Round":loading?"Memulai...":"Start Round"}</button>}{players.length<2&&<p className="muted centerText">Menunggu {2-players.length} slot pemain.</p>}{players.length===2&&!allExternalHumansOnline&&<p className="muted centerText">Menunggu pemain remote online.</p>}</section>
      {opponentMode==="multiplayer"&&players.length<2&&<section className="panel"><p className="eyebrow">INVITE PLAYER</p><p className="muted">Bagikan kode atau link ke device pemain berikutnya.</p><div className="copyRow"><div className="copyCode">{joinPath}</div><button className="button secondary" onClick={()=>void copyJoinLink()}>{copied?"Copied":"Copy Link"}</button></div></section>}{opponentMode==="ai"&&<section className="panel"><p className="eyebrow">CPU PROFILE</p><h3>{aiDifficulty.toUpperCase()}</h3><p className="muted">CPU menjawab server-side sesuai profil akurasi dan response time.</p></section>}
    </aside></div>
  </main>;
}
