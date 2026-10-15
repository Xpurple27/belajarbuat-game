export type SfxName = "correct" | "wrong" | "start" | "win" | "impact";

let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

function note(ctx: AudioContext, frequency: number, start: number, duration: number, gainValue = 0.035) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playSfx(name: SfxName) {
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  if (name === "correct") {
    note(ctx, 520, now, .11); note(ctx, 720, now + .09, .13);
  } else if (name === "wrong") {
    note(ctx, 260, now, .14); note(ctx, 190, now + .1, .18);
  } else if (name === "start") {
    note(ctx, 420, now, .08); note(ctx, 520, now + .08, .08); note(ctx, 650, now + .16, .12);
  } else if (name === "win") {
    note(ctx, 520, now, .1); note(ctx, 660, now + .1, .1); note(ctx, 820, now + .2, .2);
  } else {
    note(ctx, 120, now, .08, .05);
  }
}
