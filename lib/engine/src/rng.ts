/**
 * Deterministic pseudo-random numbers (mulberry32) so every generation is
 * reproducible from its seed.
 * SPDX-License-Identifier: Apache-2.0
 */
export interface Rng {
  /** uniform in [0, 1) */
  next(): number;
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number;
  /** standard normal (Box–Muller) */
  gaussian(): number;
  /** true with probability p */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** weighted pick; weights need not sum to 1 */
  pickWeighted<T>(items: readonly T[], weights: readonly number[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** derive an independent child stream */
  fork(): Rng;
  readonly seed: number;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const rng: Rng = {
    seed,
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    gaussian: () => {
      if (spare !== null) {
        const s = spare;
        spare = null;
        return s;
      }
      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      const mag = Math.sqrt(-2.0 * Math.log(u));
      spare = mag * Math.sin(2 * Math.PI * v);
      return mag * Math.cos(2 * Math.PI * v);
    },
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)]!,
    pickWeighted: (items, weights) => {
      let total = 0;
      for (const w of weights) total += Math.max(0, w);
      if (total <= 0) return items[Math.floor(next() * items.length)]!;
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= Math.max(0, weights[i] ?? 0);
        if (r <= 0) return items[i]!;
      }
      return items[items.length - 1]!;
    },
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    fork: () => mulberry32(Math.floor(next() * 4294967295)),
  };
  return rng;
}

/** Stable 32-bit FNV-1a hash of a string (used for deterministic ids). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed from any string (e.g. the user's text), stable across runs. */
export function seedFromString(input: string): number {
  return hashString(input);
}
