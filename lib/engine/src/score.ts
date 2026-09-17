/**
 * Scoring: how well does a pattern fit its grammar? Returns numbers AND
 * plain-language explanations.
 * SPDX-License-Identifier: Apache-2.0
 */
import { GRAMMARS, getGrammar, hasGrammar, templateVelocities } from "./grammars";
import { getInstrument, hasInstrument } from "./instruments";
import { stepsPerBar } from "./meter";
import { comparableHistogram, cosineSimilarity, eventHistogram, histogram, histogramDistance, analyzePattern } from "./metrics";
import { skeletonPattern } from "./pattern";
import type { DrumEvent, DrumPattern, Grammar, PatternMetrics, ScoreBreakdown, ScoreTerm, ScoredCandidate } from "./types";

const fmt = (v: number, digits = 2): string => v.toFixed(digits);
const name = (id: string): string => (hasInstrument(id) ? getInstrument(id).displayName : id);

function rangeFit(value: number, [lo, hi]: [number, number], tolerance: number): number {
  if (value >= lo && value <= hi) return 1;
  const d = value < lo ? lo - value : value - hi;
  return Math.max(0, 1 - d / tolerance);
}

/** Best template similarity per instrument, averaged (anchor instrument counts double). */
export function grammarFit(pattern: DrumPattern, grammar: Grammar): { value: number; worst?: { instrument: string; sim: number } } {
  const spb = stepsPerBar(pattern.meter);
  const byInst = new Map<string, DrumEvent[]>();
  for (const e of pattern.events) {
    const arr = byInst.get(e.instrument) ?? [];
    arr.push(e);
    byInst.set(e.instrument, arr);
  }
  let sum = 0;
  let weight = 0;
  let worst: { instrument: string; sim: number } | undefined;
  for (const [inst, events] of byInst) {
    const templates = grammar.templates[inst];
    if (!templates || templates.length === 0) continue;
    const h = eventHistogram(events, spb);
    let best = 0;
    for (const tpl of templates) {
      const th = new Array<number>(spb).fill(0);
      const vel = templateVelocities(tpl);
      tpl.steps.forEach((s, i) => {
        if (s < spb) th[s] = vel[i] ?? 0.9;
      });
      best = Math.max(best, cosineSimilarity(h, th));
    }
    const w = inst === grammar.constraints.anchorInstrument ? 2 : 1;
    sum += best * w;
    weight += w;
    if (!worst || best < worst.sim) worst = { instrument: inst, sim: best };
  }
  return { value: weight > 0 ? sum / weight : 0, worst };
}

function velocityShape(pattern: DrumPattern, grammar: Grammar): number {
  const S = pattern.meter.stepsPerBeat;
  const spb = stepsPerBar(pattern.meter);
  const beats = pattern.meter.beatsPerBar;
  const sums = new Array<number>(beats).fill(0);
  const counts = new Array<number>(beats).fill(0);
  for (const e of pattern.events) {
    const b = Math.floor((e.step % spb) / S);
    sums[b] = (sums[b] ?? 0) + e.velocity;
    counts[b] = (counts[b] ?? 0) + 1;
  }
  const means = sums.map((s, i) => ((counts[i] ?? 0) > 0 ? s / counts[i]! : 0));
  const accents = grammar.variation.beatAccents;
  if (accents.length !== beats) return 0.7;
  return cosineSimilarity(means, accents);
}

export function scorePattern(pattern: DrumPattern, grammar?: Grammar, metrics?: PatternMetrics): ScoreBreakdown {
  const g = grammar ?? (hasGrammar(pattern.style) ? getGrammar(pattern.style) : undefined);
  const m = metrics ?? analyzePattern(pattern);
  const terms: ScoreTerm[] = [];
  if (!g) {
    return { total: 0, terms, explanation: ["No grammar found for this style; nothing to compare against."] };
  }
  const c = g.constraints;

  const fit = grammarFit(pattern, g);
  terms.push({
    key: "grammarFit",
    label: "Grammar fit",
    value: fit.value,
    weight: 0.3,
    explanation:
      fit.value > 0.85
        ? `Every part stays close to a ${g.displayName} template (fit ${fmt(fit.value)}).`
        : fit.worst
          ? `${name(fit.worst.instrument)} strays furthest from the ${g.displayName} templates (similarity ${fmt(fit.worst.sim)}).`
          : `Template fit ${fmt(fit.value)}.`,
  });

  const [sLo, sHi] = c.syncopationRange;
  const syncFit = rangeFit(m.syncopation, c.syncopationRange, 0.25);
  terms.push({
    key: "syncopation",
    label: "Syncopation",
    value: syncFit,
    weight: 0.15,
    explanation:
      syncFit === 1
        ? `Syncopation ${fmt(m.syncopation)} sits inside the ${g.displayName} window (${fmt(sLo)}–${fmt(sHi)}).`
        : m.syncopation < sLo
          ? `Syncopation ${fmt(m.syncopation)} is a little square for ${g.displayName} (wants ${fmt(sLo)}–${fmt(sHi)}).`
          : `Syncopation ${fmt(m.syncopation)} is busier than ${g.displayName} usually is (wants ${fmt(sLo)}–${fmt(sHi)}).`,
  });

  const swingDiff = Math.abs(m.swingRatio - c.targetSwing);
  const swingFit = Math.max(0, 1 - swingDiff / 0.08);
  terms.push({
    key: "swing",
    label: "Swing",
    value: swingFit,
    weight: 0.1,
    explanation:
      swingFit > 0.75
        ? `Swing ${fmt(m.swingRatio)} — right where ${g.displayName} lives (target ${fmt(c.targetSwing)}).`
        : `Swing ${fmt(m.swingRatio)} is ${m.swingRatio > c.targetSwing ? "heavier" : "straighter"} than the ${g.displayName} target ${fmt(c.targetSwing)}.`,
  });

  if (m.interlocking.length > 0) {
    const vals = m.interlocking.map((p) => Math.min(1, p.strength / c.interlockMin));
    const value = vals.reduce((a, b) => a + b, 0) / vals.length;
    const best = m.interlocking.reduce((a, b) => (b.strength > a.strength ? b : a));
    const worst = m.interlocking.reduce((a, b) => (b.strength < a.strength ? b : a));
    terms.push({
      key: "interlock",
      label: "Interlocking",
      value,
      weight: 0.2,
      explanation:
        value >= 0.999
          ? `${name(best.a)} and ${name(best.b)} interlock perfectly (${fmt(best.strength)}).`
          : `${name(worst.a)} and ${name(worst.b)} collide on some steps (interlock ${fmt(worst.strength)}, wants ≥ ${fmt(c.interlockMin)}).`,
    });
  } else {
    terms.push({ key: "interlock", label: "Interlocking", value: 0.6, weight: 0.2, explanation: "Not enough voices to measure interlocking." });
  }

  const [dLo, dHi] = c.densityRange;
  const densFit = rangeFit(m.density, c.densityRange, 3);
  terms.push({
    key: "density",
    label: "Density",
    value: densFit,
    weight: 0.15,
    explanation:
      densFit === 1
        ? `${fmt(m.density, 1)} hits per beat — a natural ${g.displayName} density.`
        : m.density < dLo
          ? `Sparse: ${fmt(m.density, 1)} hits per beat, ${g.displayName} usually carries ${fmt(dLo, 1)}–${fmt(dHi, 1)}.`
          : `Dense: ${fmt(m.density, 1)} hits per beat, above the usual ${fmt(dLo, 1)}–${fmt(dHi, 1)}.`,
  });

  const vshape = velocityShape(pattern, g);
  terms.push({
    key: "velocity",
    label: "Accent shape",
    value: vshape,
    weight: 0.1,
    explanation: vshape > 0.95 ? "Accents fall on the beats this style stresses." : `Accent shape matches the style at ${fmt(vshape)}.`,
  });

  const total = Math.round(terms.reduce((s, t) => s + t.value * t.weight, 0) * 1000) / 10;
  const explanation = terms
    .slice()
    .sort((a, b) => b.value * b.weight - a.value * a.weight)
    .map((t) => t.explanation);
  return { total, terms, explanation };
}

/**
 * Greedy novelty filter: rank by score, then only keep candidates whose
 * histogram is at least `noveltyMin` away from every already-selected one.
 */
export function selectTop(candidates: Array<Omit<ScoredCandidate, "rank">>, k = 5, noveltyMin = 0.18): ScoredCandidate[] {
  const sorted = candidates.slice().sort((a, b) => b.score.total - a.score.total);
  const chosen: ScoredCandidate[] = [];
  const chosenHists: number[][] = [];
  for (const c of sorted) {
    if (chosen.length >= k) break;
    const h = histogram(c.pattern);
    const novel = chosenHists.every((ch) => histogramDistance(h, ch) >= noveltyMin);
    if (!novel) continue;
    chosen.push({ ...c, rank: chosen.length + 1 });
    chosenHists.push(h);
  }
  // relax if the filter was too strict
  if (chosen.length < k) {
    for (const c of sorted) {
      if (chosen.length >= k) break;
      if (chosen.some((x) => x.pattern.id === c.pattern.id)) continue;
      chosen.push({ ...c, rank: chosen.length + 1 });
    }
  }
  return chosen;
}

/** Which grammars does this pattern resemble? Compares against each grammar's skeleton at a common resolution. */
export function closestGrammars(pattern: DrumPattern, k = 3): Array<{ id: string; displayName: string; similarity: number }> {
  const h = comparableHistogram(pattern);
  return GRAMMARS.map((g) => ({
    id: g.id,
    displayName: g.displayName,
    similarity: cosineSimilarity(h, comparableHistogram(skeletonPattern(g.id, 1))),
  }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}
