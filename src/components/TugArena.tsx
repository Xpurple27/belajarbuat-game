"use client";

import { useEffect, useRef } from "react";
import type { HeroId } from "@/src/components/PixelAvatar";

interface TugArenaProps {
  position:number; target?:number; winner?:"A"|"B"|"draw"|null;
  playerALabel?:string; playerBLabel?:string; playerACharacter?:HeroId; playerBCharacter?:HeroId;
}
type SceneController={setMatchState:(position:number,winner:"A"|"B"|"draw"|null)=>void};

export default function TugArena({position,target=10,winner=null,playerALabel="Player 1",playerBLabel="Player 2",playerACharacter="nova",playerBCharacter="lyra"}:TugArenaProps){
  const containerRef=useRef<HTMLDivElement>(null);const gameRef=useRef<{destroy:(removeCanvas:boolean)=>void}|null>(null);const sceneRef=useRef<SceneController|null>(null);
  useEffect(()=>{
    let cancelled=false;
    async function boot(){
      if(!containerRef.current||gameRef.current)return;const Phaser=await import("phaser");if(cancelled||!containerRef.current)return;
      class TugScene extends Phaser.Scene implements SceneController{
        private arenaGraphics!:InstanceType<typeof Phaser.GameObjects.Graphics>;private currentPosition=position;private currentWinner:"A"|"B"|"draw"|null=winner;
        constructor(){super("TugScene")}
        create(){this.arenaGraphics=this.add.graphics();this.drawArena()}
        setMatchState(nextPosition:number,nextWinner:"A"|"B"|"draw"|null){const previous=this.currentPosition;this.currentWinner=nextWinner;this.tweens.addCounter({from:previous,to:nextPosition,duration:520,ease:"Back.Out",onUpdate:t=>{this.currentPosition=t.getValue()??nextPosition;this.drawArena()},onComplete:()=>{this.currentPosition=nextPosition;this.drawArena()}})}
        private pixelPerson(x:number,groundY:number,facing:1|-1,hero:HeroId){
          const g=this.arenaGraphics,px=7,lean=Math.min(8,Math.abs(this.currentPosition)*.7),directionLean=facing===1?-lean:lean,bodyX=x+directionLean;
          const palette=hero==="nova"?{primary:0x2f9dff,secondary:0x1554b8,accent:0x58f4ff,hair:0x17283f,pants:0x213650}:{primary:0xff4f94,secondary:0x9d2e8b,accent:0xffd45a,hair:0x4b2447,pants:0x32304f};
          const headX=bodyX-px*2,headY=groundY-px*12;
          // hair / silhouette
          g.fillStyle(palette.hair,1);g.fillRect(headX-px,headY-px,px*6,px*2);g.fillRect(headX-px,headY+px,px,px*4);g.fillRect(headX+px*4,headY+px,px,px*3);
          if(hero==="lyra"){g.fillRect(headX+px*4,headY+px*3,px*2,px*5);g.fillStyle(palette.accent,1);g.fillRect(headX-px,headY,px*6,px/2)}
          g.fillStyle(0xf1bd91,1);g.fillRect(headX,headY+px,px*4,px*4);g.fillStyle(0x172033,1);g.fillRect(headX+(facing===1?px*3:px/2),headY+px*3,px/2,px/2);
          // jacket
          g.fillStyle(palette.primary,1);g.fillRect(bodyX-px*2,groundY-px*7,px*4,px*4);g.fillStyle(palette.secondary,1);g.fillRect(bodyX-px*2,groundY-px*7,px*4,px);g.fillStyle(palette.accent,1);g.fillRect(bodyX-px/2,groundY-px*6,px,px*2);
          // pulling arms
          g.fillStyle(0xf1bd91,1);if(facing===1){g.fillRect(bodyX+px*2,groundY-px*6,px*4,px);g.fillStyle(palette.accent,1);g.fillRect(bodyX+px*5,groundY-px*6,px,px)}else{g.fillRect(bodyX-px*6,groundY-px*6,px*4,px);g.fillStyle(palette.accent,1);g.fillRect(bodyX-px*6,groundY-px*6,px,px)}
          // belt / legs / shoes
          g.fillStyle(0x101827,1);g.fillRect(bodyX-px*2,groundY-px*3,px*4,px);g.fillStyle(palette.pants,1);g.fillRect(bodyX-px*2,groundY-px*2,px*2,px*2);g.fillRect(bodyX+px/2,groundY-px*2,px*2,px*2);g.fillStyle(0x0d1727,1);g.fillRect(bodyX-px*3,groundY-px/2,px*3,px/2);g.fillRect(bodyX+px/2,groundY-px/2,px*3,px/2);
        }
        private drawArena(){
          const g=this.arenaGraphics;g.clear();
          g.fillStyle(0x8ed4f3,1);g.fillRect(0,0,960,420);g.fillStyle(0xffffff,.78);g.fillRoundedRect(75,52,138,30,15);g.fillRoundedRect(744,72,140,30,15);
          g.fillStyle(0x74bd63,1);g.fillRect(0,285,960,135);g.fillStyle(0x62a553,1);for(let x=0;x<960;x+=32)g.fillRect(x,308+((x/32)%2)*10,18,12);
          const centerX=480,ropeShift=-(this.currentPosition/target)*210,flagX=centerX+ropeShift,ropeY=245;
          g.lineStyle(8,0x8a5a32,1);g.lineBetween(195,ropeY,765,ropeY);g.lineStyle(3,0xffffff,.82);g.lineBetween(centerX,145,centerX,310);
          g.fillStyle(0xe43f4f,1);g.fillRect(flagX-6,ropeY-42,12,48);g.fillTriangle(flagX+6,ropeY-42,flagX+52,ropeY-28,flagX+6,ropeY-15);
          this.pixelPerson(170,310,1,playerACharacter);this.pixelPerson(790,310,-1,playerBCharacter);
          if(this.currentWinner){g.fillStyle(0x101820,.86);g.fillRoundedRect(310,104,340,88,14);g.fillStyle(0xffdf5d,1);if(this.currentWinner==="A")g.fillRect(268,150,22,22);if(this.currentWinner==="B")g.fillRect(670,150,22,22);if(this.currentWinner==="draw")g.fillRect(469,150,22,22)}
        }
      }
      const scene=new TugScene();sceneRef.current=scene;gameRef.current=new Phaser.Game({type:Phaser.AUTO,parent:containerRef.current,width:960,height:420,backgroundColor:"#9dd7f5",pixelArt:true,antialias:false,scene,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
    }
    void boot();return()=>{cancelled=true;sceneRef.current=null;gameRef.current?.destroy(true);gameRef.current=null};
  },[playerACharacter,playerBCharacter]);
  useEffect(()=>{sceneRef.current?.setMatchState(position,winner)},[position,winner]);
  return <div className="tugArenaWrap"><div className="tugPlayerNames" aria-hidden="true"><strong>{playerALabel}</strong><span>VS</span><strong>{playerBLabel}</strong></div><div ref={containerRef} className="phaserArena" aria-label={`Tarik tambang ${playerALabel} melawan ${playerBLabel}`}/></div>;
}
