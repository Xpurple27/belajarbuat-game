"use client";

import PixelAvatar, { type HeroId } from "@/src/components/PixelAvatar";

export const HERO_OPTIONS: Array<{ id: HeroId; name: string; subtitle: string }> = [
  { id: "nova", name: "Nova", subtitle: "Tech Runner · fokus & cepat" },
  { id: "lyra", name: "Lyra", subtitle: "Puzzle Scout · tenang & presisi" },
];

export default function CharacterPicker({ value, onChange }: { value: HeroId; onChange: (hero: HeroId) => void }) {
  return (
    <div className="characterPicker" role="radiogroup" aria-label="Pilih karakter">
      {HERO_OPTIONS.map((hero, index) => (
        <button
          key={hero.id}
          type="button"
          role="radio"
          aria-checked={value === hero.id}
          className={`characterCard ${value === hero.id ? "active" : ""}`}
          onClick={() => onChange(hero.id)}
        >
          <div className="characterPreview">
            <PixelAvatar characterId={hero.id} side={index === 0 ? "A" : "B"} state="idle" compact />
          </div>
          <div>
            <strong>{hero.name}</strong>
            <span>{hero.subtitle}</span>
          </div>
          <i>{value === hero.id ? "✓ DIPILIH" : "PILIH"}</i>
        </button>
      ))}
    </div>
  );
}
