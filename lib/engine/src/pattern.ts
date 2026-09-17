/**
 * Pattern construction and immutable editing helpers.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getGrammar, templateVelocities } from "./grammars";
import { stepsPerBar, totalSteps } from "./meter";
import { hashString } from "./rng";
import type { DrumEvent, DrumPattern, Grid, GrammarTemplate, Meter } from "./types";

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Deterministic id derived from the pattern content (so equal patterns share an id). */
export function patternId(pattern: Omit<DrumPattern, "id">): string {
  const key = JSON.stringify([pattern.style, pattern.tempo, pattern.bars, pattern.swing ?? null, pattern.events]);
  return `p_${hashString(key).toString(36)}`;
}

export function withId(pattern: DrumPattern, id?: string): DrumPattern {
  const { id: _old, ...rest } = pattern;
  return { ...rest, id: id ?? patternId(rest) };
}

export function sortEvents(events: DrumEvent[]): DrumEvent[] {
  return events.slice().sort((a, b) => a.step - b.step || a.instrument.localeCompare(b.instrument));
}

/** A silent pattern for a grammar, ready for the grid editor. */
export function emptyPattern(styleId: string, bars = 2, tempo?: number, meter?: Meter): DrumPattern {
  const g = getGrammar(styleId);
  const base = {
    tradition: g.tradition,
    style: g.id,
    meter: meter ?? g.meter,
    bars,
    tempo: tempo ?? g.defaultTempo,
    swing: g.defaultSwing,
    instruments: g.instruments.slice(),
    events: [] as DrumEvent[],
  };
  return { ...base, id: patternId(base) };
}

/** Expand a one-bar template across `bars` bars. */
export function templateEvents(instrument: string, template: GrammarTemplate, bars: number, spb: number, barsMask?: boolean[]): DrumEvent[] {
  const vel = templateVelocities(template);
  const out: DrumEvent[] = [];
  for (let bar = 0; bar < bars; bar++) {
    if (barsMask && barsMask[bar] === false) continue;
    template.steps.forEach((s, i) => {
      if (s >= spb) return;
      const v = vel[i] ?? vel[vel.length - 1] ?? 0.9;
      if (v <= 0) return;
      out.push({ step: bar * spb + s, microOffset: 0, instrument, velocity: clamp(v, 0, 1) });
    });
  }
  return out;
}

/** The first template of every instrument = the grammar's canonical skeleton. */
export function skeletonPattern(styleId: string, bars = 1, tempo?: number): DrumPattern {
  const g = getGrammar(styleId);
  const spb = stepsPerBar(g.meter);
  const events: DrumEvent[] = [];
  for (const inst of g.instruments) {
    const tpl = g.templates[inst]?.[0];
    if (tpl) events.push(...templateEvents(inst, tpl, bars, spb));
  }
  const base = {
    tradition: g.tradition,
    style: g.id,
    meter: g.meter,
    bars,
    tempo: tempo ?? g.defaultTempo,
    swing: g.defaultSwing,
    instruments: g.instruments.slice(),
    events: sortEvents(events),
  };
  return { ...base, id: patternId(base) };
}

export function toGrid(pattern: DrumPattern): Grid {
  const spb = stepsPerBar(pattern.meter);
  const total = totalSteps(pattern);
  const rows = pattern.instruments.map((instrument) => ({
    instrument,
    cells: new Array<DrumEvent | null>(total).fill(null),
  }));
  const rowIndex = new Map(pattern.instruments.map((inst, i) => [inst, i]));
  for (const ev of pattern.events) {
    const r = rowIndex.get(ev.instrument);
    if (r === undefined || ev.step < 0 || ev.step >= total) continue;
    rows[r]!.cells[ev.step] = ev;
  }
  return { stepsPerBar: spb, totalSteps: total, rows };
}

export function eventsFor(pattern: DrumPattern, instrument: string): DrumEvent[] {
  return pattern.events.filter((e) => e.instrument === instrument);
}

function replaceEvents(pattern: DrumPattern, events: DrumEvent[]): DrumPattern {
  return withId({ ...pattern, events: sortEvents(events) });
}

/** Set (velocity > 0) or clear (null / 0) one cell. */
export function setCell(pattern: DrumPattern, instrument: string, step: number, velocity: number | null): DrumPattern {
  const others = pattern.events.filter((e) => !(e.instrument === instrument && e.step === step));
  if (velocity === null || velocity <= 0) return replaceEvents(pattern, others);
  const existing = pattern.events.find((e) => e.instrument === instrument && e.step === step);
  const ev: DrumEvent = { step, instrument, velocity: clamp(velocity, 0.01, 1), microOffset: existing?.microOffset ?? 0 };
  const instruments = pattern.instruments.includes(instrument) ? pattern.instruments : [...pattern.instruments, instrument];
  return replaceEvents({ ...pattern, instruments }, [...others, ev]);
}

export function toggleCell(pattern: DrumPattern, instrument: string, step: number, velocity = 0.9): DrumPattern {
  const existing = pattern.events.find((e) => e.instrument === instrument && e.step === step);
  return setCell(pattern, instrument, step, existing ? null : velocity);
}

export function nudgeCell(pattern: DrumPattern, instrument: string, step: number, microOffset: number): DrumPattern {
  const events = pattern.events.map((e) =>
    e.instrument === instrument && e.step === step ? { ...e, microOffset: clamp(microOffset, -0.5, 0.5) } : e,
  );
  return replaceEvents(pattern, events);
}

export function setRowVelocityScale(pattern: DrumPattern, instrument: string, factor: number): DrumPattern {
  const events = pattern.events.map((e) => (e.instrument === instrument ? { ...e, velocity: clamp(e.velocity * factor, 0.02, 1) } : e));
  return replaceEvents(pattern, events);
}

export function clearRow(pattern: DrumPattern, instrument: string): DrumPattern {
  return replaceEvents(pattern, pattern.events.filter((e) => e.instrument !== instrument));
}

export function replaceRow(pattern: DrumPattern, instrument: string, events: DrumEvent[]): DrumPattern {
  const others = pattern.events.filter((e) => e.instrument !== instrument);
  const instruments = pattern.instruments.includes(instrument) ? pattern.instruments : [...pattern.instruments, instrument];
  return replaceEvents({ ...pattern, instruments }, [...others, ...events.map((e) => ({ ...e, instrument }))]);
}

export function withTempo(pattern: DrumPattern, tempo: number): DrumPattern {
  return withId({ ...pattern, tempo: clamp(Math.round(tempo * 10) / 10, 30, 300) });
}

export function withSwing(pattern: DrumPattern, swing: number): DrumPattern {
  return withId({ ...pattern, swing: clamp(swing, 0.5, 0.75) });
}

/** Loop or truncate the pattern to `bars` bars. */
export function withBars(pattern: DrumPattern, bars: number): DrumPattern {
  const spb = stepsPerBar(pattern.meter);
  const current = totalSteps(pattern);
  const target = Math.max(1, Math.round(bars)) * spb;
  if (target === current) return pattern;
  let events: DrumEvent[];
  if (target < current) {
    events = pattern.events.filter((e) => e.step < target);
  } else {
    events = [];
    for (let offset = 0; offset < target; offset += current) {
      for (const e of pattern.events) {
        const step = e.step + offset;
        if (step < target) events.push({ ...e, step });
      }
    }
  }
  return withId({ ...pattern, bars: Math.max(1, Math.round(bars)), events: sortEvents(events) });
}

/** Fold all bars onto one bar (steps modulo stepsPerBar). */
export function foldToBar(pattern: DrumPattern): DrumEvent[] {
  const spb = stepsPerBar(pattern.meter);
  return pattern.events.map((e) => ({ ...e, step: e.step % spb }));
}

export function clonePattern(pattern: DrumPattern): DrumPattern {
  return JSON.parse(JSON.stringify(pattern)) as DrumPattern;
}

/** Validate a pattern coming from JSON (API, MIDI import, URL state). Throws on structural problems. */
export function assertPattern(p: unknown): asserts p is DrumPattern {
  if (!p || typeof p !== "object") throw new Error("pattern must be an object");
  const x = p as Record<string, unknown>;
  if (typeof x.style !== "string") throw new Error("pattern.style missing");
  if (!Array.isArray(x.events)) throw new Error("pattern.events missing");
  if (!Array.isArray(x.instruments)) throw new Error("pattern.instruments missing");
  const m = x.meter as Meter | undefined;
  if (!m || typeof m.beatsPerBar !== "number" || typeof m.stepsPerBeat !== "number") throw new Error("pattern.meter invalid");
  if (typeof x.bars !== "number" || x.bars < 1) throw new Error("pattern.bars invalid");
  if (typeof x.tempo !== "number") throw new Error("pattern.tempo invalid");
}
