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

          // Sky depth bands.
          g.fillStyle(0x77d2f5, 1);
          g.fillRect(0, 0, 960, 135);
          g.fillStyle(0x9adff8, 1);
          g.fillRect(0, 135, 960, 85);
          g.fillStyle(0xc4efff, 0.7);
          g.fillRect(0, 205, 960, 38);

          // Soft clouds.
          g.fillStyle(0xffffff, 0.88);
          g.fillRoundedRect(58, 56, 115, 29, 15);
          g.fillCircle(92, 58, 23);
          g.fillCircle(128, 55, 18);
          g.fillRoundedRect(760, 74, 130, 29, 15);
          g.fillCircle(798, 72, 20);
          g.fillCircle(846, 70, 17);

          // Distant hills / academy silhouette.
          g.fillStyle(0x72b7c9, 0.74);
          g.fillTriangle(65, 235, 206, 126, 340, 235);
          g.fillTriangle(225, 235, 405, 111, 548, 235);
          g.fillTriangle(490, 235, 674, 118, 845, 235);
          g.fillTriangle(690, 235, 862, 140, 960, 235);
          g.fillStyle(0x4d78a6, 0.7);
          for (let x = 74; x < 900; x += 118) {
            g.fillRect(x, 135 + ((x / 118) % 2) * 18, 54, 98);
            g.fillTriangle(x - 6, 137 + ((x / 118) % 2) * 18, x + 27, 98 + ((x / 118) % 2) * 18, x + 60, 137 + ((x / 118) % 2) * 18);
            g.fillStyle(0xffd45a, 0.85);
            g.fillRect(x + 20, 165 + ((x / 118) % 2) * 18, 8, 13);
            g.fillStyle(0x4d78a6, 0.7);
          }

          // Stadium stands.
          g.fillStyle(0x244a84, 0.92);
          g.fillRect(0, 210, 960, 66);
          g.fillStyle(0x173765, 0.95);
          g.fillRect(0, 260, 960, 28);
          g.fillStyle(0xf7c84b, 0.9);
          for (let x = 32; x < 960; x += 92) {
            g.fillRect(x, 220, 7, 50);
            g.fillTriangle(x - 13, 221, x + 3, 236, x + 19, 221);
          }
          // Crowd dots.
          for (let x = 15; x < 960; x += 24) {
            g.fillStyle((x / 24) % 3 === 0 ? 0xffd45a : (x / 24) % 2 === 0 ? 0xf4f7ff : 0x62d5ff, 0.9);
            g.fillCircle(x, 242 + ((x / 24) % 2) * 8, 4);
          }

          // Grass field with perspective stripes.
          g.fillStyle(0x5dbb65, 1);
          g.fillRect(0, 286, 960, 134);
          for (let x = -40; x < 1000; x += 90) {
            g.fillStyle(0x69c973, 0.65);
            g.fillTriangle(x, 420, x + 50, 286, x + 105, 420);
          }
          g.fillStyle(0x39964d, 0.46);
          for (let x = 8; x < 960; x += 31) {
            const y = 327 + ((x / 31) % 3) * 24;
            g.fillRect(x, y, 19, 4);
          }

          const centerX = 480;
          // Position > 0 means player A (left side) has more power, so flag moves left.
          const ropeShift = -(this.currentPosition / target) * 210;
          const flagX = centerX + ropeShift;
          const ropeY = 305;

          // Win-zone floor glows.
          g.fillStyle(0x25c7ff, 0.08 + Math.max(0, this.currentPosition / target) * 0.14);
          g.fillRoundedRect(90, 289, 250, 70, 20);
          g.fillStyle(0xff5fc9, 0.08 + Math.max(0, -this.currentPosition / target) * 0.14);
          g.fillRoundedRect(620, 289, 250, 70, 20);

          // Center marker shadow + beam.
          g.fillStyle(0x0c2549, 0.16);
          g.fillRect(centerX - 5, 265, 10, 118);
          g.fillStyle(0xffffff, 0.92);
          g.fillRect(centerX - 2, 265, 4, 118);
          g.fillStyle(0x7ee7ff, 0.14);
          g.fillRect(centerX - 9, 265, 18, 118);

          // Rope shadow and rope body.
          g.lineStyle(12, 0x4e2f20, 0.25);
          g.lineBetween(176, ropeY + 7, 784, ropeY + 7);
          g.lineStyle(10, 0x9a6234, 1);
          g.lineBetween(176, ropeY, 784, ropeY);
          g.lineStyle(3, 0xd8a15c, 0.72);
          g.lineBetween(176, ropeY - 2, 784, ropeY - 2);

          // Rope braid marks.
          g.lineStyle(1.5, 0x714323, 0.7);
          for (let x = 182; x < 780; x += 18) {
            g.lineBetween(x, ropeY - 5, x + 9, ropeY + 5);
          }

          // Center flag.
          g.fillStyle(0x7a182b, 0.25);
          g.fillRect(flagX - 8, ropeY - 67, 14, 69);
          g.fillStyle(0xf13d57, 1);
          g.fillRoundedRect(flagX - 6, ropeY - 70, 12, 70, 3);
          g.fillTriangle(flagX + 5, ropeY - 68, flagX + 64, ropeY - 48, flagX + 5, ropeY - 29);
          g.fillStyle(0xff6b75, 0.45);
          g.fillTriangle(flagX + 8, ropeY - 64, flagX + 49, ropeY - 49, flagX + 8, ropeY - 45);

          // Result aura behind winning side.
          if (this.currentWinner === "A") {
            g.fillStyle(0x28d5ff, 0.18);
            g.fillCircle(198, 310, 86);
          }
          if (this.currentWinner === "B") {
            g.fillStyle(0xff63d1, 0.18);
            g.fillCircle(762, 310, 86);
          }
          if (this.currentWinner === "draw") {
            g.fillStyle(0xffd45a, 0.16);
            g.fillCircle(centerX, 310, 70);
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
        backgroundColor: "#8edcf7",
        pixelArt: false,
        antialias: true,
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
        className={`tugPremiumHero tugPremiumA hero-${playerACharacter}`}
        src={HERO_ART[playerACharacter].src}
        alt={playerALabel}
        draggable={false}
      />
      <img
        className={`tugPremiumHero tugPremiumB hero-${playerBCharacter}`}
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
