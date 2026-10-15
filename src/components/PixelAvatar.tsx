"use client";

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

export const HERO_ART: Record<HeroId, { name: string; src: string }> = {
  nova: { name: "Nova", src: "/heroes/nova.webp" },
  lyra: { name: "Lyra", src: "/heroes/lyra.webp" },
  kael: { name: "Kael", src: "/heroes/kael.webp" },
  mira: { name: "Mira", src: "/heroes/mira.webp" },
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
    >
      <img
        className={`premiumHeroImage premiumSide-${side}`}
        src={hero.src}
        alt={label ?? hero.name}
        draggable={false}
      />
      {label && <span>{label}</span>}
    </div>
  );
}
