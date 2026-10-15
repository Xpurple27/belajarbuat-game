"use client";

import { useEffect, useRef } from "react";

interface TugArenaProps {
  position: number;
  target?: number;
  winner?: "A" | "B" | "draw" | null;
}

type SceneController = {
  setMatchState: (position: number, winner: "A" | "B" | "draw" | null) => void;
};

export default function TugArena({ position, target = 10, winner = null }: TugArenaProps) {
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
            duration: 420,
            ease: "Quad.Out",
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

        private pixelPerson(x: number, groundY: number, facing: 1 | -1, shirtColor: number) {
          const g = this.arenaGraphics;
          const px = 8;
          const headX = x - px * 2;
          const headY = groundY - px * 11;

          g.fillStyle(0xf2c6a0, 1);
          g.fillRect(headX, headY, px * 4, px * 4);
          g.fillStyle(0x2d241f, 1);
          g.fillRect(headX, headY, px * 4, px);
          g.fillRect(headX + (facing === 1 ? px * 3 : 0), headY + px, px, px);
          g.fillStyle(0x1a1a1a, 1);
          g.fillRect(headX + (facing === 1 ? px * 3 : 0), headY + px * 2, px / 2, px / 2);

          g.fillStyle(shirtColor, 1);
          g.fillRect(x - px * 2, groundY - px * 7, px * 4, px * 4);
          g.fillStyle(0xf2c6a0, 1);
          if (facing === 1) g.fillRect(x + px * 2, groundY - px * 7, px * 3, px);
          else g.fillRect(x - px * 5, groundY - px * 7, px * 3, px);
          g.fillStyle(0x30415d, 1);
          g.fillRect(x - px * 2, groundY - px * 3, px * 2, px * 3);
          g.fillRect(x + px / 2, groundY - px * 3, px * 2, px * 3);
          g.fillStyle(0x202020, 1);
          g.fillRect(x - px * 3, groundY - px, px * 3, px);
          g.fillRect(x + px / 2, groundY - px, px * 3, px);
        }

        private drawArena() {
          const g = this.arenaGraphics;
          g.clear();

          g.fillStyle(0x9dd7f5, 1);
          g.fillRect(0, 0, 960, 420);
          g.fillStyle(0xffffff, 0.82);
          g.fillRect(90, 55, 120, 28);
          g.fillRect(700, 80, 145, 26);
          g.fillStyle(0x74bd63, 1);
          g.fillRect(0, 285, 960, 135);
          g.fillStyle(0x62a553, 1);
          for (let x = 0; x < 960; x += 32) g.fillRect(x, 308 + ((x / 32) % 2) * 10, 18, 12);

          const centerX = 480;
          const ropeShift = (this.currentPosition / target) * 210;
          const flagX = centerX + ropeShift;
          const ropeY = 245;

          g.lineStyle(8, 0x8a5a32, 1);
          g.lineBetween(195, ropeY, 765, ropeY);
          g.lineStyle(3, 0xffffff, 0.8);
          g.lineBetween(centerX, 165, centerX, 310);

          g.fillStyle(0xe43f4f, 1);
          g.fillRect(flagX - 6, ropeY - 42, 12, 48);
          g.fillTriangle(flagX + 6, ropeY - 42, flagX + 52, ropeY - 28, flagX + 6, ropeY - 15);

          this.pixelPerson(170, 310, 1, 0x2785d9);
          this.pixelPerson(790, 310, -1, 0xe45673);

          const barX = 250;
          const barY = 35;
          const barW = 460;
          g.fillStyle(0x263238, 0.85);
          g.fillRect(barX, barY, barW, 22);
          g.fillStyle(0xf7f3df, 1);
          g.fillRect(barX + barW / 2 - 2, barY - 5, 4, 32);
          g.fillStyle(this.currentPosition >= 0 ? 0x2785d9 : 0xe45673, 1);
          const markerX = barX + ((this.currentPosition + target) / (target * 2)) * barW;
          g.fillRect(markerX - 7, barY - 6, 14, 34);

          if (this.currentWinner) {
            g.fillStyle(0x101820, 0.78);
            g.fillRoundedRect(330, 120, 300, 76, 12);
            g.fillStyle(0xffdf5d, 1);
            if (this.currentWinner === "A") g.fillRect(285, 180, 18, 18);
            if (this.currentWinner === "B") g.fillRect(657, 180, 18, 18);
            if (this.currentWinner === "draw") g.fillRect(471, 180, 18, 18);
          }
        }
      }

      const scene = new TugScene();
      sceneRef.current = scene;
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 960,
        height: 420,
        backgroundColor: "#9dd7f5",
        pixelArt: true,
        antialias: false,
        scene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      });
      gameRef.current = game;
    }

    void boot();
    return () => {
      cancelled = true;
      sceneRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setMatchState(position, winner);
  }, [position, winner]);

  return <div ref={containerRef} className="phaserArena" aria-label="Pixel art tarik tambang" />;
}
