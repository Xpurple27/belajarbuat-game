"use client";

export type HeroId = "nova" | "lyra" | "kael" | "mira";
export const HERO_IDS: HeroId[] = ["nova", "lyra", "kael", "mira"];
export function normalizeHeroId(value: unknown, fallback: HeroId = "nova"): HeroId {
  return typeof value === "string" && HERO_IDS.includes(value as HeroId) ? value as HeroId : fallback;
}
export type HeroState = "idle" | "think" | "correct" | "wrong" | "pull" | "run" | "attack" | "hurt" | "celebrate" | "lose";

interface PixelAvatarProps {
  side?: "A" | "B";
  label?: string;
  state?: HeroState;
  compact?: boolean;
  characterId?: HeroId;
}

const HERO = {
  nova: {
    name: "Nova",
    primary: "#2f9dff",
    secondary: "#1554b8",
    accent: "#58f4ff",
    hair: "#17283f",
    pants: "#213650",
    shoe: "#0d1727",
  },
  lyra: {
    name: "Lyra",
    primary: "#ff4f94",
    secondary: "#9d2e8b",
    accent: "#ffd45a",
    hair: "#4b2447",
    pants: "#32304f",
    shoe: "#171526",
  },
} as const;

export default function PixelAvatar({
  side = "A",
  label,
  state = "idle",
  compact = false,
  characterId = side === "A" ? "nova" : "lyra",
}: PixelAvatarProps) {
  if (characterId === "kael" || characterId === "mira") {
    const premiumSrc = characterId === "kael" ? "/heroes/kael.webp" : "/heroes/mira.webp";
    const premiumName = characterId === "kael" ? "Kael" : "Mira";
    return (
      <div
        className={`pixelAvatar hero-${characterId} premiumHero ${compact ? "compact" : ""} avatar-${state}`}
        aria-label={`${label ?? premiumName} · ${state}`}
        data-hero={characterId}
        data-state={state}
      >
        <img className={`premiumHeroImage premiumSide-${side}`} src={premiumSrc} alt={label ?? premiumName} draggable={false} />
        {label && <span>{label}</span>}
      </div>
    );
  }

  const hero = HERO[characterId];
  const skin = "#f1bd91";
  const facing = side === "A" ? 1 : -1;
  const armAttackX = side === "A" ? 72 : 4;
  const isHappy = state === "correct" || state === "celebrate";
  const isDown = state === "wrong" || state === "lose";

  return (
    <div
      className={`pixelAvatar hero-${characterId} ${compact ? "compact" : ""} avatar-${state}`}
      aria-label={`${label ?? hero.name} · ${state}`}
      data-hero={characterId}
      data-state={state}
    >
      <svg viewBox="0 0 96 112" role="img" shapeRendering="crispEdges">
        <ellipse cx="48" cy="104" rx="28" ry="6" fill="#050914" opacity=".3" />

        {/* hair silhouette */}
        {characterId === "nova" ? (
          <>
            <rect x="30" y="8" width="36" height="10" fill={hero.hair} />
            <rect x="24" y="16" width="48" height="14" fill={hero.hair} />
            <rect x="20" y="22" width="10" height="18" fill={hero.hair} />
            <rect x="66" y="22" width="10" height="12" fill={hero.hair} />
            <rect x="34" y="4" width="10" height="8" fill={hero.hair} />
          </>
        ) : (
          <>
            <rect x="28" y="8" width="40" height="12" fill={hero.hair} />
            <rect x="22" y="16" width="52" height="18" fill={hero.hair} />
            <rect x="18" y="24" width="12" height="32" fill={hero.hair} />
            <rect x="66" y="22" width="12" height="36" fill={hero.hair} />
            <rect x="72" y="36" width="10" height="26" fill={hero.hair} />
            <rect x="22" y="12" width="52" height="5" fill={hero.accent} />
          </>
        )}

        {/* face */}
        <rect x="28" y="20" width="40" height="30" fill={skin} />
        <rect x="24" y="28" width="6" height="12" fill={skin} />
        <rect x="66" y="28" width="6" height="12" fill={skin} />
        <rect x="36" y="30" width="5" height="5" fill="#172033" />
        <rect x="55" y="30" width="5" height="5" fill="#172033" />
        {state === "hurt" || state === "wrong" ? (
          <rect x="42" y="42" width="12" height="3" fill="#a95763" />
        ) : isHappy ? (
          <>
            <rect x="40" y="40" width="16" height="4" fill="#b9686c" />
            <rect x="44" y="44" width="8" height="3" fill="#b9686c" />
          </>
        ) : (
          <rect x="43" y="42" width="10" height="3" fill="#b9686c" />
        )}

        {/* tech collar / hoodie */}
        <rect x="30" y="50" width="36" height="8" fill={hero.secondary} />
        <rect x="24" y="56" width="48" height="34" fill={hero.primary} />
        <rect x="30" y="56" width="36" height="7" fill={hero.secondary} />
        <rect x="44" y="58" width="8" height="22" fill={hero.accent} opacity=".9" />
        <rect x="39" y="65" width="18" height="8" fill="#0b1730" opacity=".5" />
        <rect x="44" y="67" width="8" height="4" fill={hero.accent} />

        {/* arms */}
        {state === "celebrate" ? (
          <>
            <rect x="16" y="42" width="9" height="28" fill={skin} />
            <rect x="71" y="42" width="9" height="28" fill={skin} />
            <rect x="13" y="37" width="12" height="9" fill={hero.primary} />
            <rect x="71" y="37" width="12" height="9" fill={hero.primary} />
          </>
        ) : state === "pull" ? (
          <>
            <rect x={side === "A" ? 66 : 14} y="60" width="20" height="9" fill={skin} />
            <rect x={side === "A" ? 58 : 22} y="58" width="16" height="12" fill={hero.primary} />
            <rect x={side === "A" ? 82 : 7} y="59" width="8" height="11" fill={hero.accent} />
          </>
        ) : state === "attack" ? (
          <>
            <rect x={side === "A" ? 64 : 10} y="58" width="24" height="9" fill={skin} />
            <rect x={side === "A" ? 56 : 22} y="55" width="16" height="14" fill={hero.primary} />
            <rect x={armAttackX} y="55" width="16" height="15" fill={hero.accent} opacity=".95" />
            <rect x={side === "A" ? 84 : 0} y="58" width="12" height="8" fill="#ffffff" opacity=".8" />
          </>
        ) : (
          <>
            <rect x="17" y="60" width="9" height="27" fill={skin} />
            <rect x="70" y="60" width="9" height="27" fill={skin} />
            <rect x="18" y="56" width="12" height="13" fill={hero.primary} />
            <rect x="66" y="56" width="12" height="13" fill={hero.primary} />
            <rect x={side === "A" ? 69 : 18} y="74" width="10" height="7" fill={hero.accent} />
          </>
        )}

        {/* utility belt */}
        <rect x="24" y="86" width="48" height="7" fill="#121b2c" />
        <rect x="44" y="85" width="9" height="8" fill={hero.accent} />
        <rect x="28" y="84" width="9" height="8" fill={hero.secondary} />

        {/* legs */}
        <rect x="29" y="92" width="16" height="14" fill={hero.pants} />
        <rect x="52" y="92" width="16" height="14" fill={hero.pants} />
        <rect x="24" y="103" width="22" height="7" fill={hero.shoe} />
        <rect x="52" y="103" width="22" height="7" fill={hero.shoe} />

        {/* state FX */}
        {state === "think" && <>
          <rect x={facing === 1 ? 76 : 8} y="18" width="8" height="8" fill="#ffffff" opacity=".9" />
          <rect x={facing === 1 ? 84 : 2} y="8" width="6" height="6" fill={hero.accent} />
        </>}
        {state === "correct" && <>
          <rect x="75" y="12" width="7" height="18" fill="#6effb0" />
          <rect x="82" y="18" width="10" height="7" fill="#6effb0" />
        </>}
        {isDown && <rect x="7" y="92" width="18" height="4" fill="#67738b" opacity=".8" />}
        {state === "attack" && <>
          <rect x={side === "A" ? 82 : 2} y="45" width="8" height="8" fill={hero.accent} opacity=".85" />
          <rect x={side === "A" ? 88 : 0} y="38" width="5" height="5" fill="#fff6a8" />
        </>}
      </svg>
      {label && <span>{label}</span>}
    </div>
  );
}
