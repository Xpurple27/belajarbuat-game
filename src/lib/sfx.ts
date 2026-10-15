export type SfxName = "correct" | "wrong" | "start" | "win" | "impact" | "rope" | "bossHit" | "defeat" | "alarm" | "explosion" | "engine";

let audioContext: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

function note(ctx: AudioContext, frequency: number, start: number, duration: number, gainValue = 0.035, type: OscillatorType = "square") {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function noise(ctx: AudioContext, start: number, duration: number, gainValue = .06) {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(start);
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
    note(ctx, 520, now, .1); note(ctx, 660, now + .1, .1); note(ctx, 820, now + .2, .2); note(ctx, 980, now + .36, .28);
  } else if (name === "defeat") {
    note(ctx, 330, now, .14); note(ctx, 260, now + .13, .16); note(ctx, 185, now + .28, .32);
  } else if (name === "rope") {
    noise(ctx, now, .12, .025); note(ctx, 95, now, .11, .025, "sawtooth");
  } else if (name === "bossHit") {
    noise(ctx, now, .18, .065); note(ctx, 110, now, .14, .055, "sawtooth"); note(ctx, 220, now + .05, .08, .035);
  } else if (name === "alarm") {
    note(ctx, 760, now, .12, .04); note(ctx, 760, now + .22, .12, .04); note(ctx, 760, now + .44, .12, .04);
  } else if (name === "explosion") {
    noise(ctx, now, .75, .11); note(ctx, 72, now, .7, .08, "sawtooth"); note(ctx, 48, now + .1, .62, .065, "triangle");
  } else if (name === "engine") {
    note(ctx, 105, now, .18, .018, "sawtooth"); note(ctx, 130, now + .05, .15, .014, "sawtooth");
  } else {
    note(ctx, 120, now, .08, .05);
  }
}
