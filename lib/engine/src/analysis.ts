/**
 * Audio analysis — in-house DSP, no external libraries.
 *
 * Pipeline: Hann-windowed radix-2 FFT → log-magnitude spectral flux → adaptive
 * peak picking (onsets) → autocorrelation tempo estimate with a log-normal
 * prior → beat/downbeat phase search → grid quantisation → timbre-based
 * instrument classification → DrumPattern + metrics + closest grammars.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getTradition } from "./grammars";
import { METERS, stepSeconds, stepsPerBar } from "./meter";
import { analyzePattern } from "./metrics";
import { clamp, patternId, sortEvents } from "./pattern";
import { closestGrammars } from "./score";
import type { AnalysisResult, DrumEvent, DrumPattern, Meter, Onset, Tradition } from "./types";

/** In-place iterative radix-2 FFT. `re`/`im` length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b]! * cr - im[b]! * ci;
        const ti = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a]! += tr;
        im[a]! += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

export interface Frame {
  /** seconds at frame centre */
  time: number;
  flux: number;
  centroid: number;
  flatness: number;
  bands: [number, number, number];
  energy: number;
}

export const FRAME_SIZE = 1024;
export const HOP_SIZE = 256;

/** Short-time spectral features for a mono signal. */
export function spectralFrames(samples: Float32Array, sampleRate: number, frameSize = FRAME_SIZE, hop = HOP_SIZE): Frame[] {
  const half = frameSize / 2;
  const window = new Float64Array(frameSize);
  for (let i = 0; i < frameSize; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
  const re = new Float64Array(frameSize);
  const im = new Float64Array(frameSize);
  let prev = new Float64Array(half);
  const binHz = sampleRate / frameSize;
  const lowMax = Math.round(200 / binHz);
  const midMax = Math.round(2000 / binHz);
  const frames: Frame[] = [];
  for (let start = 0; start + frameSize <= samples.length || (start === 0 && samples.length > 0); start += hop) {
    for (let i = 0; i < frameSize; i++) {
      re[i] = (samples[start + i] ?? 0) * window[i]!;
      im[i] = 0;
    }
    fft(re, im);
    const mag = new Float64Array(half);
    let flux = 0;
    let sum = 0;
    let weighted = 0;
    let logSum = 0;
    let energy = 0;
    const bands: [number, number, number] = [0, 0, 0];
    for (let k = 1; k < half; k++) {
      const m = Math.sqrt(re[k]! * re[k]! + im[k]! * im[k]!);
      const lm = Math.log1p(1000 * m);
      mag[k] = lm;
      const d = lm - prev[k]!;
      if (d > 0) flux += d;
      sum += m;
      weighted += m * k * binHz;
      logSum += Math.log(m + 1e-12);
      energy += m * m;
      const e = m * m;
      if (k <= lowMax) bands[0] += e;
      else if (k <= midMax) bands[1] += e;
      else bands[2] += e;
    }
    prev = mag;
    const total = bands[0] + bands[1] + bands[2] || 1;
    const geo = Math.exp(logSum / (half - 1));
    const arith = sum / (half - 1) || 1e-12;
    frames.push({
      time: (start + frameSize / 2) / sampleRate,
      flux,
      centroid: sum > 0 ? weighted / sum : 0,
      flatness: clamp(geo / arith, 0, 1),
      bands: [bands[0] / total, bands[1] / total, bands[2] / total],
      energy,
    });
  }
  return frames;
}

/** Adaptive-threshold peak picking on the flux curve. */
export function detectOnsets(frames: Frame[], sampleRate: number, hop = HOP_SIZE): Onset[] {
  if (frames.length === 0) return [];
  const flux = frames.map((f) => f.flux);
  const max = Math.max(...flux) || 1;
  const norm = flux.map((v) => v / max);
  const back = 12;
  const fwd = 6;
  const minGap = Math.max(1, Math.round((0.03 * sampleRate) / hop));
  const onsets: Onset[] = [];
  let lastIdx = -Infinity;
  for (let i = 1; i < norm.length - 1; i++) {
    const lo = Math.max(0, i - back);
    const hi = Math.min(norm.length - 1, i + fwd);
    let mean = 0;
    for (let k = lo; k <= hi; k++) mean += norm[k]!;
    mean /= hi - lo + 1;
    const threshold = mean * 1.5 + 0.05;
    const v = norm[i]!;
    if (v < threshold || v < norm[i - 1]! || v < norm[i + 1]!) continue;
    if (i - lastIdx < minGap) continue;
    lastIdx = i;
    // timbre: average the two frames following the onset (attack transient)
    const f = frames[Math.min(i + 1, frames.length - 1)]!;
    onsets.push({
      time: frames[i]!.time,
      strength: clamp((v - threshold) / (1 - threshold + 1e-9), 0, 1) * 0.7 + 0.3 * v,
      centroid: f.centroid,
      flatness: f.flatness,
      bands: f.bands,
    });
  }
  return onsets;
}

/** Autocorrelation tempo estimate on the flux envelope (quarter-note BPM). */
export function estimateTempo(frames: Frame[], sampleRate: number, hop = HOP_SIZE, range: [number, number] = [60, 200]): number {
  const env = frames.map((f) => f.flux);
  if (env.length < 8) return 120;
  const mean = env.reduce((a, b) => a + b, 0) / env.length;
  const x = env.map((v) => Math.max(0, v - mean));
  const fps = sampleRate / hop;
  const minLag = Math.floor((60 / range[1]) * fps);
  const maxLag = Math.min(x.length - 1, Math.ceil((60 / range[0]) * fps));
  let bestLag = minLag;
  let best = -Infinity;
  const prior = (bpm: number) => Math.exp(-0.5 * ((Math.log2(bpm / 110)) / 0.9) ** 2);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acc = 0;
    for (let i = lag; i < x.length; i++) acc += x[i]! * x[i - lag]!;
    // reward lags whose double also correlates (beat vs. half-beat robustness)
    let acc2 = 0;
    for (let i = 2 * lag; i < x.length; i++) acc2 += x[i]! * x[i - 2 * lag]!;
    const score = ((acc + 0.5 * acc2) / (x.length - lag)) * prior(60 / (lag / fps));
    if (score > best) {
      best = score;
      bestLag = lag;
    }
  }
  return clamp(Math.round((60 * fps) / bestLag), range[0], range[1]);
}

/**
 * Find the grid origin (first downbeat, in seconds): the phase that maximises
 * onset strength on beats, then the beat inside the bar that carries the most
 * low-frequency weight.
 */
export function findDownbeat(onsets: Onset[], tempo: number, meter: Meter): number {
  if (onsets.length === 0) return 0;
  const beat = (60 / tempo) * (4 / meter.beatUnit);
  const first = onsets[0]!.time;
  const candidates = 24;
  let bestPhase = first;
  let bestScore = -1;
  for (let c = 0; c < candidates; c++) {
    const phase = first + (c / candidates) * beat;
    let s = 0;
    for (const o of onsets) {
      const d = Math.abs(((o.time - phase) / beat + 0.5) % 1 - 0.5);
      s += o.strength * Math.max(0, 1 - d * 6);
    }
    if (s > bestScore) {
      bestScore = s;
      bestPhase = phase;
    }
  }
  const barSec = beat * meter.beatsPerBar;
  let bestBeat = 0;
  bestScore = -1;
  for (let b = 0; b < meter.beatsPerBar; b++) {
    const origin = bestPhase + b * beat;
    let s = 0;
    for (const o of onsets) {
      const pos = ((o.time - origin) / barSec) % 1;
      const d = Math.min(Math.abs(pos), Math.abs(1 - Math.abs(pos)));
      if (d < 0.5 / meter.beatsPerBar) s += o.strength * (0.5 + o.bands[0]);
    }
    if (s > bestScore) {
      bestScore = s;
      bestBeat = b;
    }
  }
  return bestPhase + bestBeat * beat - Math.floor((bestPhase + bestBeat * beat) / barSec) * barSec;
}

/** Map an onset's timbre to an instrument of the tradition. */
export function classifyOnset(onset: Onset, tradition: Tradition): string {
  const [low, mid, high] = onset.bands;
  const noisy = onset.flatness > 0.25;
  if (tradition === "samba") {
    if (low > 0.5) return onset.strength > 0.7 ? "surdo1" : "surdo2";
    if (high > 0.55) return noisy ? "ganza" : "agogo_high";
    if (mid > 0.5 && noisy) return "caixa";
    return onset.centroid > 1500 ? "tamborim" : "repinique";
  }
  if (low > 0.5) return onset.strength > 0.7 ? "darbuka_dum" : "daf_dum";
  if (high > 0.55) return noisy ? "riq_jingle" : "sagat";
  if (noisy) return "darbuka_ka";
  return "darbuka_tak";
}

export interface QuantizeOptions {
  tempo: number;
  meter: Meter;
  origin: number;
  maxBars: number;
  tradition: Tradition;
}

/** Snap onsets to the grid; returns events and the fraction that sat within ±0.25 step. */
export function quantizeOnsets(onsets: Onset[], o: QuantizeOptions): { events: DrumEvent[]; bars: number; gridFit: number } {
  const stepSec = stepSeconds(o.tempo, o.meter);
  const spb = stepsPerBar(o.meter);
  const maxSteps = spb * o.maxBars;
  const merged = new Map<string, DrumEvent>();
  let fit = 0;
  let counted = 0;
  for (const on of onsets) {
    const exact = (on.time - o.origin) / stepSec;
    if (exact < -0.5) continue;
    const step = Math.max(0, Math.round(exact));
    if (step >= maxSteps) continue;
    const frac = clamp(exact - step, -0.5, 0.5);
    counted++;
    if (Math.abs(frac) <= 0.25) fit++;
    const instrument = classifyOnset(on, o.tradition);
    const key = `${step}:${instrument}`;
    const ev: DrumEvent = { step, microOffset: frac, instrument, velocity: clamp(0.3 + 0.7 * on.strength, 0.05, 1) };
    const prev = merged.get(key);
    if (!prev || prev.velocity < ev.velocity) merged.set(key, ev);
  }
  const events = sortEvents(Array.from(merged.values()));
  const last = events.reduce((m, e) => Math.max(m, e.step), 0);
  return { events, bars: Math.max(1, Math.ceil((last + 1) / spb)), gridFit: counted ? fit / counted : 0 };
}

export interface AnalyzeAudioOptions {
  /** quarter-note BPM if known; otherwise estimated */
  tempo?: number;
  meter?: Meter;
  tradition?: Tradition;
  /** default 8 */
  maxBars?: number;
}

/** Full analysis of a mono PCM buffer. */
export function analyzeAudio(samples: Float32Array, sampleRate: number, options: AnalyzeAudioOptions = {}): AnalysisResult {
  const tradition = options.tradition ?? "samba";
  const meter = options.meter ?? (tradition === "samba" ? METERS["2/4"]! : METERS["4/4"]!);
  const frames = spectralFrames(samples, sampleRate);
  const onsets = detectOnsets(frames, sampleRate);
  const tempo = options.tempo ?? estimateTempo(frames, sampleRate);
  const origin = findDownbeat(onsets, tempo, meter);
  const { events, bars, gridFit } = quantizeOnsets(onsets, { tempo, meter, origin, maxBars: options.maxBars ?? 8, tradition });
  const instruments = Array.from(new Set(events.map((e) => e.instrument)));
  const base = { tradition, style: getTradition(tradition).defaultStyle, meter, bars, tempo, instruments, events };
  let pattern: DrumPattern = { ...base, id: patternId(base) };
  const closest = events.length ? closestGrammars(pattern, 3) : [];
  if (closest[0]) pattern = { ...pattern, style: closest[0].id, id: patternId({ ...base, style: closest[0].id }) };
  return {
    onsets,
    tempo,
    tempoSource: options.tempo ? "supplied" : "estimated",
    meter,
    bars,
    pattern,
    metrics: analyzePattern(pattern),
    closestGrammars: closest,
    gridFit,
  };
}
