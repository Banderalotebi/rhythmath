/**
 * Generation: grammar templates -> Markov variation -> fills -> humanize ->
 * score 100 candidates -> keep the best five that sound different.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getGrammar, templateVelocities } from "./grammars";
import { metricWeights, stepSeconds, stepsPerBar } from "./meter";
import { analyzePattern } from "./metrics";
import { clamp, patternId, sortEvents, templateEvents } from "./pattern";
import { mulberry32, type Rng } from "./rng";
import { scorePattern, selectTop } from "./score";
import type { DrumEvent, DrumPattern, GenerationOptions, GenerationResult, GenerationSpec, Grammar, HumanizeProfile, ScoredCandidate } from "./types";

/**
 * First-order Markov chain per instrument estimated from the grammar
 * templates: P(onset at step s | onset at s-1) and P(onset | rest at s-1).
 */
interface Chain {
  pOnsetAfterOnset: number;
  pOnsetAfterRest: number;
  meanVelocity: number;
}

function chainFor(grammar: Grammar, instrument: string): Chain {
  const spb = stepsPerBar(grammar.meter);
  const templates = grammar.templates[instrument] ?? [];
  let oo = 1;
  let oTotal = 2;
  let ro = 1;
  let rTotal = 2;
  let velSum = 0;
  let velN = 0;
  for (const tpl of templates) {
    const on = new Array<boolean>(spb).fill(false);
    const vel = templateVelocities(tpl);
    tpl.steps.forEach((s, i) => {
      if (s < spb && (vel[i] ?? 0) > 0) {
        on[s] = true;
        velSum += vel[i] ?? 0;
        velN++;
      }
    });
    for (let s = 0; s < spb; s++) {
      const prev = on[(s - 1 + spb) % spb];
      if (prev) {
        oTotal++;
        if (on[s]) oo++;
      } else {
        rTotal++;
        if (on[s]) ro++;
      }
    }
  }
  return { pOnsetAfterOnset: oo / oTotal, pOnsetAfterRest: ro / rTotal, meanVelocity: velN > 0 ? velSum / velN : 0.8 };
}

function buildInstrumentRow(grammar: Grammar, instrument: string, bars: number, energy: number, rng: Rng, weights: number[]): DrumEvent[] {
  const spb = stepsPerBar(grammar.meter);
  const templates = grammar.templates[instrument] ?? [];
  if (templates.length === 0) return [];
  const chain = chainFor(grammar, instrument);
  const isAnchor = instrument === grammar.constraints.anchorInstrument;
  const temperature = 0.5 + energy; // 0.5 .. 1.5
  const mutation = grammar.variation.mutationRate * temperature * (isAnchor ? 0.25 : 1);

  // choose a template per bar: mostly one, occasionally switch
  let current = rng.pick(templates);
  const events: DrumEvent[] = [];
  for (let bar = 0; bar < bars; bar++) {
    if (bar > 0 && rng.chance(0.3 * temperature)) current = rng.pick(templates);
    const barEvents = templateEvents(instrument, current, 1, spb).map((e) => ({ ...e, step: e.step + bar * spb }));
    const on = new Array<DrumEvent | null>(spb).fill(null);
    for (const e of barEvents) on[e.step - bar * spb] = e;

    // Markov mutation pass
    for (let s = 0; s < spb; s++) {
      const prev = on[(s - 1 + spb) % spb] !== null;
      const ev = on[s];
      const weight = weights[s] ?? 0;
      if (ev) {
        // drop: more likely on weak positions and for low energy, never the downbeat of the anchor
        const pDrop = mutation * (1 - weight) * (1.2 - energy);
        if (!(isAnchor && s === 0) && rng.chance(pDrop)) on[s] = null;
      } else {
        const pChain = prev ? chain.pOnsetAfterOnset : chain.pOnsetAfterRest;
        const pAdd = mutation * pChain * (0.4 + energy) * (isAnchor ? 0.5 : 1);
        if (rng.chance(pAdd)) {
          const v = clamp(chain.meanVelocity * (0.55 + 0.35 * weight) * (0.85 + 0.3 * energy), 0.15, 1);
          on[s] = { step: bar * spb + s, microOffset: 0, instrument, velocity: v };
        }
      }
    }
    for (const e of on) if (e) events.push(e);
  }

  // energy shapes velocity
  const gain = 0.8 + 0.3 * energy;
  return events.map((e) => ({ ...e, velocity: clamp(e.velocity * gain, 0.05, 1) }));
}

function addFills(grammar: Grammar, events: DrumEvent[], bars: number, energy: number, rng: Rng): DrumEvent[] {
  const every = grammar.variation.fillEveryBars;
  if (!every || bars < every) return events;
  const spb = stepsPerBar(grammar.meter);
  const S = grammar.meter.stepsPerBeat;
  const out = events.slice();
  for (let bar = every - 1; bar < bars; bar += every) {
    if (!rng.chance(0.5 + 0.5 * energy)) continue;
    const inst = rng.pick(grammar.variation.fillInstruments);
    const lastBeatStart = bar * spb + spb - S;
    // remove that instrument's hits in the last beat and write a rising fill
    const keep = out.filter((e) => !(e.instrument === inst && e.step >= lastBeatStart && e.step < (bar + 1) * spb));
    out.length = 0;
    out.push(...keep);
    const n = S;
    for (let i = 0; i < n; i++) {
      if (i > 0 && rng.chance(0.25 * (1 - energy))) continue;
      out.push({ step: lastBeatStart + i, microOffset: 0, instrument: inst, velocity: clamp(0.5 + (0.5 * i) / Math.max(1, n - 1), 0.3, 1) });
    }
  }
  return out;
}

/** Apply timing and velocity humanisation (deterministic with the given rng). */
export function humanize(pattern: DrumPattern, profile?: HumanizeProfile, rngOrSeed: Rng | number = 1): DrumPattern {
  const p = profile ?? getGrammar(pattern.style).humanize;
  const rng = typeof rngOrSeed === "number" ? mulberry32(rngOrSeed) : rngOrSeed;
  const stepMs = stepSeconds(pattern.tempo, pattern.meter) * 1000;
  const events = pattern.events.map((e) => {
    const sigma = p.timingSigmaMs[e.instrument] ?? p.defaultTimingSigmaMs;
    const bias = p.timingBiasMs[e.instrument] ?? 0;
    const ms = bias + rng.gaussian() * sigma;
    const micro = clamp(ms / stepMs, -0.45, 0.45);
    const vel = clamp(e.velocity + rng.gaussian() * p.velocitySigma, 0.05, 1);
    return { ...e, microOffset: Math.round(micro * 1000) / 1000, velocity: Math.round(vel * 1000) / 1000 };
  });
  const base = { ...pattern, events: sortEvents(events) };
  return { ...base, id: patternId(base) };
}

export interface ResolvedSpec {
  style: string;
  tempo: number;
  bars: number;
  energy: number;
  swing: number;
  instruments: string[];
}

export function resolveSpec(spec: GenerationSpec): { grammar: Grammar; resolved: ResolvedSpec } {
  const grammar = getGrammar(spec.style);
  const [lo, hi] = grammar.tempoRange;
  return {
    grammar,
    resolved: {
      style: grammar.id,
      tempo: clamp(spec.tempo ?? grammar.defaultTempo, Math.min(lo, 30), Math.max(hi, 300)),
      bars: clamp(Math.round(spec.bars ?? 4), 1, 64),
      energy: clamp(spec.energy ?? 0.5, 0, 1),
      swing: clamp(spec.swing ?? grammar.defaultSwing, 0.5, 0.75),
      instruments: (spec.instruments ?? grammar.instruments).filter((i) => grammar.templates[i]),
    },
  };
}

/** Generate `n` raw (humanised, unscored) candidates. */
export function generateCandidates(spec: GenerationSpec, n = 100, seed = 1, locked: Record<string, DrumEvent[]> = {}): DrumPattern[] {
  const { grammar, resolved } = resolveSpec(spec);
  const meter = spec.meter ?? grammar.meter;
  const weights = metricWeights(meter);
  const root = mulberry32(seed);
  const out: DrumPattern[] = [];
  for (let i = 0; i < n; i++) {
    const rng = root.fork();
    const events: DrumEvent[] = [];
    for (const inst of resolved.instruments) {
      if (locked[inst]) {
        events.push(...locked[inst]!.map((e) => ({ ...e, instrument: inst })));
        continue;
      }
      const optional = grammar.variation.optionalInstruments.includes(inst);
      // low energy thins the ensemble
      if (optional && rng.chance(0.15 + 0.35 * (1 - resolved.energy))) continue;
      events.push(...buildInstrumentRow(grammar, inst, resolved.bars, resolved.energy, rng, weights));
    }
    const withFills = addFills(grammar, events, resolved.bars, resolved.energy, rng);
    const base: Omit<DrumPattern, "id"> = {
      tradition: grammar.tradition,
      style: grammar.id,
      meter,
      bars: resolved.bars,
      tempo: resolved.tempo,
      swing: resolved.swing,
      instruments: resolved.instruments.slice(),
      events: sortEvents(withFills),
    };
    out.push(humanize({ ...base, id: patternId(base) }, grammar.humanize, rng));
  }
  return out;
}

/** The whole pipeline. Deterministic for a given (spec, options.seed). */
export function generateGrooves(spec: GenerationSpec, options: GenerationOptions = {}): GenerationResult {
  const started = now();
  const seed = options.seed ?? 1;
  const n = options.candidates ?? 100;
  const { grammar, resolved } = resolveSpec(spec);
  const raw = generateCandidates(spec, n, seed, options.locked ?? {});
  const scored: Array<Omit<ScoredCandidate, "rank">> = raw.map((pattern) => {
    const metrics = analyzePattern(pattern);
    return { pattern, metrics, score: scorePattern(pattern, grammar, metrics) };
  });
  const winners = selectTop(scored, options.keep ?? 5, options.noveltyMin ?? 0.18);
  return {
    spec: { ...spec, style: resolved.style, tempo: resolved.tempo, bars: resolved.bars, energy: resolved.energy },
    grammar,
    winners,
    candidateCount: raw.length,
    durationMs: Math.max(0, now() - started),
    seed,
  };
}

function now(): number {
  const p = (globalThis as { performance?: { now(): number } }).performance;
  return p ? p.now() : Date.now();
}
