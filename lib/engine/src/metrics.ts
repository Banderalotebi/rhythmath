/**
 * Rhythm metrics: histogram, syncopation (LHL), swing, interlocking, density,
 * cross-rhythm and similarity measures.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getGrammar, hasGrammar } from "./grammars";
import { metricWeights, offbeatSteps, stepsPerBar, totalSteps } from "./meter";
import { foldToBar } from "./pattern";
import type { DrumEvent, DrumPattern, PatternMetrics } from "./types";

/** Summed velocity per step of one bar, normalised to max 1. */
export function histogram(pattern: DrumPattern, instrument?: string): number[] {
  const spb = stepsPerBar(pattern.meter);
  const h = new Array<number>(spb).fill(0);
  for (const e of pattern.events) {
    if (instrument && e.instrument !== instrument) continue;
    h[e.step % spb] = (h[e.step % spb] ?? 0) + e.velocity;
  }
  const max = Math.max(...h, 0);
  return max > 0 ? h.map((v) => v / max) : h;
}

/** Histogram of a plain event list on a bar of `spb` steps. */
export function eventHistogram(events: DrumEvent[], spb: number): number[] {
  const h = new Array<number>(spb).fill(0);
  for (const e of events) h[e.step % spb] = (h[e.step % spb] ?? 0) + e.velocity;
  const max = Math.max(...h, 0);
  return max > 0 ? h.map((v) => v / max) : h;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    na += (a[i] ?? 0) ** 2;
    nb += (b[i] ?? 0) ** 2;
  }
  if (na === 0 || nb === 0) return na === nb ? 1 : 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** 1 - cosine similarity, 0 (identical) .. 1 (orthogonal). */
export function histogramDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/** Resample a histogram to another number of steps (nearest-position mapping). */
export function resampleHistogram(h: number[], targetSteps: number): number[] {
  if (h.length === targetSteps) return h.slice();
  const out = new Array<number>(targetSteps).fill(0);
  for (let i = 0; i < h.length; i++) {
    const j = Math.round((i / h.length) * targetSteps) % targetSteps;
    out[j] = Math.max(out[j] ?? 0, h[i] ?? 0);
  }
  return out;
}

/**
 * Longuet-Higgins & Lee syncopation, normalised 0..1.
 * For every onset followed by a rest on a metrically stronger position, the
 * weight difference counts as syncopation. The folded one-bar histogram is
 * used so multi-bar patterns compare with one-bar templates.
 */
export function syncopation(pattern: DrumPattern, instrument?: string): number {
  const spb = stepsPerBar(pattern.meter);
  const weights = metricWeights(pattern.meter);
  const h = histogram(pattern, instrument);
  const onsets = h.map((v) => v > 0.05);
  const count = onsets.filter(Boolean).length;
  if (count === 0) return 0;
  let sum = 0;
  for (let i = 0; i < spb; i++) {
    if (!onsets[i]) continue;
    // find the next rest position
    let j = (i + 1) % spb;
    let guard = 0;
    while (onsets[j] && guard < spb) {
      j = (j + 1) % spb;
      guard++;
    }
    if (guard >= spb) break; // every step filled
    const diff = (weights[j] ?? 0) - (weights[i] ?? 0);
    if (diff > 0) sum += diff * (h[i] ?? 0);
  }
  // maximum possible: every onset on the weakest level followed by the downbeat
  return Math.min(1, sum / count);
}

/**
 * Swing ratio = timing of the "and" relative to the beat. 0.5 = straight.
 * Combines the pattern's playback swing with the micro-timing of offbeat hits.
 */
export function swingRatio(pattern: DrumPattern): number {
  const S = pattern.meter.stepsPerBeat;
  const spb = stepsPerBar(pattern.meter);
  const off = new Set(offbeatSteps(pattern.meter));
  let sum = 0;
  let n = 0;
  for (const e of pattern.events) {
    if (off.has(e.step % spb)) {
      sum += e.microOffset;
      n++;
    }
  }
  const base = pattern.swing ?? 0.5;
  if (n === 0) return base;
  return Math.min(0.75, Math.max(0.5, base + sum / n / S));
}

/** 1 - coincident onsets / total onsets between two instruments (1 = perfectly complementary). */
export function interlockingStrength(pattern: DrumPattern, a: string, b: string): number {
  const spb = stepsPerBar(pattern.meter);
  const A = new Set(pattern.events.filter((e) => e.instrument === a).map((e) => e.step % spb));
  const B = new Set(pattern.events.filter((e) => e.instrument === b).map((e) => e.step % spb));
  const total = A.size + B.size;
  if (total === 0) return 1;
  let coincident = 0;
  for (const s of A) if (B.has(s)) coincident += 2;
  return 1 - coincident / total;
}

/** Onsets per beat across all instruments. */
export function density(pattern: DrumPattern): number {
  const beats = pattern.meter.beatsPerBar * pattern.bars;
  return beats > 0 ? pattern.events.length / beats : 0;
}

export function velocityVariance(pattern: DrumPattern): number {
  const n = pattern.events.length;
  if (n === 0) return 0;
  const mean = pattern.events.reduce((s, e) => s + e.velocity, 0) / n;
  return pattern.events.reduce((s, e) => s + (e.velocity - mean) ** 2, 0) / n;
}

function dominantIoi(steps: number[]): number {
  if (steps.length < 2) return 0;
  const sorted = Array.from(new Set(steps)).sort((a, b) => a - b);
  const counts = new Map<number, number>();
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i]! - sorted[i - 1]!;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = -1;
  for (const [d, c] of counts) {
    if (c > bestCount || (c === bestCount && d < best)) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

/**
 * Ratio of the dominant inter-onset intervals of the two busiest instruments
 * (e.g. 1.5 for a 3:2 relationship, 1 for parallel motion).
 */
export function crossRhythmRatio(pattern: DrumPattern): number {
  const byInst = new Map<string, number[]>();
  for (const e of pattern.events) {
    const arr = byInst.get(e.instrument) ?? [];
    arr.push(e.step);
    byInst.set(e.instrument, arr);
  }
  const busiest = Array.from(byInst.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2);
  if (busiest.length < 2) return 1;
  const a = dominantIoi(busiest[0]![1]);
  const b = dominantIoi(busiest[1]![1]);
  if (a === 0 || b === 0) return 1;
  return Math.max(a, b) / Math.min(a, b);
}

export function onsetsPerInstrument(pattern: DrumPattern): Record<string, number> {
  const out: Record<string, number> = {};
  for (const inst of pattern.instruments) out[inst] = 0;
  for (const e of pattern.events) out[e.instrument] = (out[e.instrument] ?? 0) + 1;
  return out;
}

/** All metrics at once. Interlocking pairs come from the pattern's grammar when known. */
export function analyzePattern(pattern: DrumPattern): PatternMetrics {
  const pairs: Array<[string, string]> = hasGrammar(pattern.style) ? getGrammar(pattern.style).constraints.interlockPairs : [];
  const present = new Set(pattern.events.map((e) => e.instrument));
  return {
    histogram: histogram(pattern),
    syncopation: syncopation(pattern),
    swingRatio: swingRatio(pattern),
    density: density(pattern),
    velocityVariance: velocityVariance(pattern),
    crossRhythmRatio: crossRhythmRatio(pattern),
    onsetsPerInstrument: onsetsPerInstrument(pattern),
    interlocking: pairs
      .filter(([a, b]) => present.has(a) && present.has(b))
      .map(([a, b]) => ({ a, b, strength: interlockingStrength(pattern, a, b) })),
  };
}

/** Whole-pattern histogram resampled to a common resolution for cross-meter comparisons. */
export function comparableHistogram(pattern: DrumPattern, steps = 48): number[] {
  return resampleHistogram(histogram(pattern), steps);
}

export { foldToBar, totalSteps };
