"use client";

import { useEffect, useRef } from "react";
import { HERO_ART, type HeroId } from "@/src/components/PixelAvatar";

interface TugArenaProps {
  position: number;
  target?: number;
  winner?: "A" | "B" | "draw" | null;
  playerALabel?: string;
  playerBLabel?: string;
  playerACharacter?: HeroId;
  playerBCharacter?: HeroId;
}

type SceneController = {
  setMatchState: (position: number, winner: "A" | "B" | "draw" | null) => void;
};

export default function TugArena({
  position,
  target = 10,
  winner = null,
  playerALabel = "Player 1",
  playerBLabel = "Player 2",
  playerACharacter = "nova",
  playerBCharacter = "lyra",
}: TugArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const sceneRef = useRef<SceneController | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!containerRef.current || gameRef.current) return;
      const Phaser = await import("phaser");
      if (cancelled || !containerRef.current) return;

      class TugScene extends Phaser.Scene implements SceneController {
        private arenaGraphics!: InstanceType<typeof Phaser.GameObjects.Graphics>;
        private currentPosition = position;
        private currentWinner: "A" | "B" | "draw" | null = winner;

        constructor() {
          super("TugScene");
        }

        create() {
          this.arenaGraphics = this.add.graphics();
          this.drawArena();
        }

        setMatchState(nextPosition: number, nextWinner: "A" | "B" | "draw" | null) {
          const previous = this.currentPosition;
          this.currentWinner = nextWinner;
          this.tweens.addCounter({
            from: previous,
            to: nextPosition,
            duration: 520,
            ease: "Back.Out",
            onUpdate: (tween) => {
              this.currentPosition = tween.getValue() ?? nextPosition;
              this.drawArena();
            },
            onComplete: () => {
              this.currentPosition = nextPosition;
              this.drawArena();
            },
          });
        }

        private drawArena() {
          const g = this.arenaGraphics;
          g.clear();

          g.fillStyle(0x8ed4f3, 1);
          g.fillRect(0, 0, 960, 420);
          g.fillStyle(0xffffff, 0.78);
          g.fillRoundedRect(75, 52, 138, 30, 15);
          g.fillRoundedRect(744, 72, 140, 30, 15);

          g.fillStyle(0x74bd63, 1);
          g.fillRect(0, 285, 960, 135);
          g.fillStyle(0x62a553, 1);
          for (let x = 0; x < 960; x += 32) {
            g.fillRect(x, 308 + ((x / 32) % 2) * 10, 18, 12);
          }

          const centerX = 480;
          const ropeShift = -(this.currentPosition / target) * 210;
          const flagX = centerX + ropeShift;
          const ropeY = 245;

          g.lineStyle(8, 0x8a5a32, 1);
          g.lineBetween(195, ropeY, 765, ropeY);
          g.lineStyle(3, 0xffffff, 0.82);
          g.lineBetween(centerX, 145, centerX, 310);

          g.fillStyle(0xe43f4f, 1);
          g.fillRect(flagX - 6, ropeY - 42, 12, 48);
          g.fillTriangle(flagX + 6, ropeY - 42, flagX + 52, ropeY - 28, flagX + 6, ropeY - 15);

          if (this.currentWinner) {
            g.fillStyle(0x101820, 0.86);
            g.fillRoundedRect(310, 104, 340, 88, 14);
            g.fillStyle(0xffdf5d, 1);
            if (this.currentWinner === "A") g.fillRect(268, 150, 22, 22);
            if (this.currentWinner === "B") g.fillRect(670, 150, 22, 22);
            if (this.currentWinner === "draw") g.fillRect(469, 150, 22, 22);
          }
        }
      }

      const scene = new TugScene();
      sceneRef.current = scene;
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 960,
        height: 420,
        backgroundColor: "#9dd7f5",
        pixelArt: true,
        antialias: false,
        scene,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      });
    }

    void boot();
    return () => {
      cancelled = true;
      sceneRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [playerACharacter, playerBCharacter, target]);

  useEffect(() => {
    sceneRef.current?.setMatchState(position, winner);
  }, [position, winner]);

  return (
    <div className="tugArenaWrap">
      <div className="tugPlayerNames" aria-hidden="true">
        <strong>{playerALabel}</strong>
        <span>VS</span>
        <strong>{playerBLabel}</strong>
      </div>
      <img
        className="tugPremiumHero tugPremiumA"
        src={HERO_ART[playerACharacter].src}
        alt={playerALabel}
        draggable={false}
      />
      <img
        className="tugPremiumHero tugPremiumB"
        src={HERO_ART[playerBCharacter].src}
        alt={playerBLabel}
        draggable={false}
      />
      <div
        ref={containerRef}
        className="phaserArena"
        aria-label={`Tarik tambang ${playerALabel} melawan ${playerBLabel}`}
      />
    </div>
  );
}
