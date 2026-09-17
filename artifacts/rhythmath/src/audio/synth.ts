// SPDX-License-Identifier: AGPL-3.0-or-later

import { getSynthParams, hashString, mulberry32 } from "@workspace/engine";

type BufferContext = Pick<BaseAudioContext, "createBuffer" | "sampleRate">;

const cache = new Map<number, Map<string, AudioBuffer>>();

/** Render a deterministic modal-synthesis voice directly into an AudioBuffer. */
export function synthBuffer(
  context: BufferContext,
  instrument: string,
  velocity = 1,
): AudioBuffer {
  const v = Math.max(0, Math.min(1, velocity));
  const velocityBand = Math.round(v * 16) / 16;
  let rateCache = cache.get(context.sampleRate);
  if (!rateCache) {
    rateCache = new Map();
    cache.set(context.sampleRate, rateCache);
  }
  const key = `${instrument}:${velocityBand}`;
  const cached = rateCache.get(key);
  if (cached) return cached;

  const params = getSynthParams(instrument);
  const length = Math.max(1, Math.ceil(params.duration * context.sampleRate));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const output = buffer.getChannelData(0);
  const phases = params.modes.map(() => 0);
  const rng = mulberry32(hashString(`${instrument}:${context.sampleRate}`));

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let a1 = 0;
  let a2 = 0;
  if (params.noise) {
    const centre = Math.min(params.noise.centre, context.sampleRate * 0.49);
    const omega = (2 * Math.PI * centre) / context.sampleRate;
    const alpha = Math.sin(omega) / (2 * Math.max(0.01, params.noise.q));
    const a0 = 1 + alpha;
    b0 = alpha / a0;
    b1 = 0;
    b2 = -alpha / a0;
    a1 = (-2 * Math.cos(omega)) / a0;
    a2 = (1 - alpha) / a0;
  }
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  for (let i = 0; i < length; i++) {
    const t = i / context.sampleRate;
    const attack = params.attack <= 0 ? 1 : Math.min(1, t / params.attack);
    let sample = 0;
    for (let m = 0; m < params.modes.length; m++) {
      const mode = params.modes[m];
      const pitchRatio = params.pitchEnv
        ? 1 + (params.pitchEnv.ratio - 1) * Math.exp(-t / params.pitchEnv.decay)
        : 1;
      phases[m] += (2 * Math.PI * mode.freq * pitchRatio) / context.sampleRate;
      sample += Math.sin(phases[m]) * mode.gain * Math.exp(-t / mode.decay);
    }
    if (params.noise) {
      const x0 = rng.next() * 2 - 1;
      const filtered = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = filtered;
      // Harder hits contain proportionally more high-frequency attack.
      sample += filtered * params.noise.gain * velocityBand * Math.exp(-t / params.noise.decay);
    }
    output[i] = Math.tanh(sample * params.level * attack);
  }
  rateCache.set(key, buffer);
  return buffer;
}