/**
 * Meters, grid arithmetic and metric weights (Longuet-Higgins & Lee style
 * hierarchy, generalised to additive meters such as 10/8 = 3+2+2+3).
 * SPDX-License-Identifier: Apache-2.0
 */
import type { DrumPattern, Meter } from "./types";

export const METERS: Record<string, Meter> = {
  "4/4": { beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4 },
  "2/4": { beatsPerBar: 2, beatUnit: 4, stepsPerBeat: 4 },
  "3/4": { beatsPerBar: 3, beatUnit: 4, stepsPerBeat: 4 },
  "6/8": { beatsPerBar: 6, beatUnit: 8, stepsPerBeat: 2 },
  "7/8": { beatsPerBar: 7, beatUnit: 8, stepsPerBeat: 2 },
  "9/8": { beatsPerBar: 9, beatUnit: 8, stepsPerBeat: 2 },
  "10/8": { beatsPerBar: 10, beatUnit: 8, stepsPerBeat: 2 },
  "12/8": { beatsPerBar: 12, beatUnit: 8, stepsPerBeat: 2 },
};

export function stepsPerBar(meter: Meter): number {
  return meter.beatsPerBar * meter.stepsPerBeat;
}

export function totalSteps(pattern: Pick<DrumPattern, "meter" | "bars">): number {
  return stepsPerBar(pattern.meter) * pattern.bars;
}

export function meterLabel(meter: Meter): string {
  return `${meter.beatsPerBar}/${meter.beatUnit}`;
}

export function sameMeter(a: Meter, b: Meter): boolean {
  return a.beatsPerBar === b.beatsPerBar && a.beatUnit === b.beatUnit && a.stepsPerBeat === b.stepsPerBeat;
}

/** Duration of one beat (as defined by beatUnit) in seconds at a quarter-note tempo. */
export function beatSeconds(tempo: number, meter: Meter): number {
  return (60 / tempo) * (4 / meter.beatUnit);
}

/** Duration of one grid step in seconds. */
export function stepSeconds(tempo: number, meter: Meter): number {
  return beatSeconds(tempo, meter) / meter.stepsPerBeat;
}

/** Duration of the whole pattern in seconds. */
export function patternSeconds(pattern: Pick<DrumPattern, "meter" | "bars" | "tempo">): number {
  return stepSeconds(pattern.tempo, pattern.meter) * totalSteps(pattern);
}

/**
 * Beat grouping of a meter, expressed in beats. Simple meters split into
 * halves; compound / additive meters use the conventional groupings
 * (6/8 = 3+3, 10/8 samāʿī thaqīl = 3+2+2+3, 7/8 = 2+2+3, 9/8 = 2+2+2+3).
 */
export function beatGroups(meter: Meter): number[] {
  const n = meter.beatsPerBar;
  if (meter.beatUnit === 4) {
    if (n === 4) return [2, 2];
    if (n === 3) return [3];
    if (n === 2) return [1, 1];
    if (n === 5) return [3, 2];
    if (n === 6) return [3, 3];
    if (n === 7) return [4, 3];
    return [n];
  }
  switch (n) {
    case 6:
      return [3, 3];
    case 9:
      return [2, 2, 2, 3];
    case 12:
      return [3, 3, 3, 3];
    case 10:
      return [3, 2, 2, 3];
    case 7:
      return [2, 2, 3];
    case 5:
      return [2, 3];
    case 8:
      return [3, 3, 2];
    default:
      return [n];
  }
}

/**
 * Metric weight of every step in one bar. Higher = metrically stronger.
 * Levels: bar start > group start > beat start > half-beat > remaining
 * subdivisions. Values are normalised to 0..1.
 */
export function metricWeights(meter: Meter): number[] {
  const spb = stepsPerBar(meter);
  const S = meter.stepsPerBeat;
  const groups = beatGroups(meter);
  const groupStarts = new Set<number>();
  let acc = 0;
  for (const g of groups) {
    groupStarts.add(acc * S);
    acc += g;
  }
  const levels = new Array<number>(spb).fill(4);
  for (let step = 0; step < spb; step++) {
    const inBeat = step % S;
    if (step === 0) levels[step] = 0;
    else if (groupStarts.has(step)) levels[step] = 1;
    else if (inBeat === 0) levels[step] = 2;
    else if (S % 2 === 0 && inBeat === S / 2) levels[step] = 3;
    else if (S === 3) levels[step] = 3;
    else levels[step] = 4;
  }
  const max = 4;
  return levels.map((l) => (max - l) / max);
}

/** Index of the beat (0-based) that a step belongs to within its bar. */
export function beatOfStep(step: number, meter: Meter): number {
  return Math.floor((step % stepsPerBar(meter)) / meter.stepsPerBeat);
}

/** Steps that fall on the "and" (second half) of each beat — used for swing. */
export function offbeatSteps(meter: Meter): number[] {
  const S = meter.stepsPerBeat;
  if (S % 2 !== 0) return [];
  const out: number[] = [];
  for (let b = 0; b < meter.beatsPerBar; b++) out.push(b * S + S / 2);
  return out;
}
