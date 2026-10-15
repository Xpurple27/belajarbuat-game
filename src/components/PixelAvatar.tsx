"use client";

import { NOVA_HERO_SRC } from "@/src/lib/heroData/nova";
import { LYRA_HERO_SRC } from "@/src/lib/heroData/lyra";

export type HeroId = "nova" | "lyra" | "kael" | "mira";
export const HERO_IDS: HeroId[] = ["nova", "lyra", "kael", "mira"];

export function normalizeHeroId(value: unknown, fallback: HeroId = "nova"): HeroId {
  return typeof value === "string" && HERO_IDS.includes(value as HeroId) ? (value as HeroId) : fallback;
}

export type HeroState = "idle" | "think" | "correct" | "wrong" | "pull" | "run" | "attack" | "hurt" | "celebrate" | "lose";

interface PixelAvatarProps {
  side?: "A" | "B";
  label?: string;
  state?: HeroState;
  compact?: boolean;
  characterId?: HeroId;
}

/**
 * Hero asset registry.
 * Nova/Lyra are embedded as validated WebP data URIs so they can never be
 * corrupted by a text-mode deployment. Kael/Mira are real binary WebP blobs
 * under /public/heroes and are validated during the V3 rollout.
 */
export const HERO_ART: Record<HeroId, { name: string; src: string; accent: string }> = {
  nova: { name: "Nova", src: NOVA_HERO_SRC, accent: "#36c8ff" },
  lyra: { name: "Lyra", src: LYRA_HERO_SRC, accent: "#d77cff" },
  kael: { name: "Kael", src: "/heroes/kael.webp?v=3", accent: "#ffbe45" },
  mira: { name: "Mira", src: "/heroes/mira.webp?v=3", accent: "#ff6cab" },
};

export default function PixelAvatar({
  side = "A",
  label,
  state = "idle",
  compact = false,
  characterId = side === "A" ? "nova" : "lyra",
}: PixelAvatarProps) {
  const hero = HERO_ART[characterId];

  return (
    <div
      className={`pixelAvatar hero-${characterId} premiumHero ${compact ? "compact" : ""} avatar-${state}`}
      aria-label={`${label ?? hero.name} · ${state}`}
      data-hero={characterId}
      data-state={state}
      style={{ "--hero-accent": hero.accent } as React.CSSProperties}
    >
      <img
        className={`premiumHeroImage premiumSide-${side}`}
        src={hero.src}
        alt={label ?? hero.name}
        draggable={false}
        decoding="async"
      />
      {label && <span>{label}</span>}
    </div>
  );
}
