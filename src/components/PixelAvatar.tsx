"use client";

interface PixelAvatarProps {
  side?: "A" | "B";
  label?: string;
  state?: "idle" | "run" | "attack" | "hurt" | "celebrate";
  compact?: boolean;
}

export default function PixelAvatar({ side = "A", label, state = "idle", compact = false }: PixelAvatarProps) {
  const primary = side === "A" ? "#36a8ff" : "#ff5f8f";
  const secondary = side === "A" ? "#1558a6" : "#a92258";
  const skin = "#f2bc8f";
  const hair = side === "A" ? "#26364a" : "#4a2b39";

  return (
    <div className={`pixelAvatar ${compact ? "compact" : ""} avatar-${state}`} aria-label={label ?? `Player ${side}`}>
      <svg viewBox="0 0 64 80" role="img" shapeRendering="crispEdges">
        <rect x="20" y="4" width="24" height="8" fill={hair} />
        <rect x="16" y="12" width="32" height="20" fill={skin} />
        <rect x="16" y="12" width="8" height="8" fill={hair} />
        <rect x="40" y="12" width="8" height="8" fill={hair} />
        <rect x="24" y="20" width="4" height="4" fill="#1b2430" />
        <rect x="36" y="20" width="4" height="4" fill="#1b2430" />
        <rect x="28" y="28" width="8" height="4" fill="#d98270" />
        <rect x="16" y="36" width="32" height="24" fill={primary} />
        <rect x="12" y="40" width="8" height="20" fill={skin} />
        <rect x="44" y="40" width="8" height="20" fill={skin} />
        <rect x="20" y="36" width="24" height="6" fill={secondary} opacity=".72" />
        <rect x="18" y="60" width="12" height="16" fill="#26364a" />
        <rect x="34" y="60" width="12" height="16" fill="#26364a" />
        <rect x="14" y="72" width="16" height="6" fill="#111b27" />
        <rect x="34" y="72" width="16" height="6" fill="#111b27" />
        {state === "attack" && <rect x={side === "A" ? 48 : 4} y="38" width="12" height="6" fill="#ffe36e" />}
        {state === "celebrate" && <><rect x="8" y="26" width="8" height="16" fill={skin} /><rect x="48" y="26" width="8" height="16" fill={skin} /></>}
      </svg>
      {label && <span>{label}</span>}
    </div>
  );
}
