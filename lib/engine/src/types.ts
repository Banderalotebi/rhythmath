/**
 * Rhythmath engine — core types.
 *
 * Pure data. No DOM, no Node. Everything the platform (web, API, CLI) needs to
 * describe a rhythm lives here.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/** Rhythmic traditions currently modelled by the grammar registry. */
export type Tradition = "samba" | "arabic";

/** Instrument families group instruments for display and mixing. */
export type InstrumentFamily =
  | "low_drum"
  | "mid_drum"
  | "high_drum"
  | "snare"
  | "bell"
  | "shaker"
  | "frame_drum"
  | "goblet_drum"
  | "whistle";

/**
 * Time signature + grid resolution.
 * Steps per bar = beatsPerBar * stepsPerBeat. Never hard-code 16.
 */
export interface Meter {
  /** e.g. 4 for 4/4, 2 for 2/4, 6 for 6/8, 10 for 10/8 */
  beatsPerBar: number;
  /** 4 = quarter-note beats, 8 = eighth-note beats */
  beatUnit: 4 | 8;
  /** grid subdivisions per beat (4 = sixteenths in x/4, 2 = sixteenths in x/8) */
  stepsPerBeat: number;
}

/** One hit on the grid. */
export interface DrumEvent {
  /** absolute step index across all bars (0-based) */
  step: number;
  /** fractional step offset, -0.5..0.5 — the "human" timing deviation */
  microOffset: number;
  /** instrument id from the instrument registry */
  instrument: string;
  /** 0..1 */
  velocity: number;
}

/** A complete multi-instrument pattern. Serialisable as JSON. */
export interface DrumPattern {
  id: string;
  tradition: Tradition;
  /** grammar id, e.g. "samba.batucada" */
  style: string;
  meter: Meter;
  bars: number;
  /** beats per minute (quarter-note = beat in x/4; dotted quarter in 6/8 counts as 2 grid beats) */
  tempo: number;
  /** playback swing ratio 0.5 (straight) .. 0.75; grammar default if omitted */
  swing?: number;
  /** instrument ids in display order (rows of the grid) */
  instruments: string[];
  events: DrumEvent[];
}

export interface Instrument {
  id: string;
  tradition: Tradition;
  displayName: string;
  /** Portuguese or Arabic name for the UI */
  localName: string;
  family: InstrumentFamily;
  /** General MIDI percussion note (channel 10) used by toMidi */
  midiNote: number;
  /** short description used in tooltips / docs */
  role: string;
  /** default gain 0..1 for the mixer */
  defaultGain: number;
  /** default stereo position -1..1 */
  defaultPan: number;
}

/** Template = one canonical way an instrument plays one bar of a style. */
export interface GrammarTemplate {
  name: string;
  /** step indices within ONE bar (0 .. stepsPerBar-1) */
  steps: number[];
  /** velocity per step (same length as steps) or a single value applied to all */
  velocity?: number[] | number;
  /** provenance of the template: reference / musician / dataset */
  source: string;
}

export interface GrammarConstraints {
  /** [min, max] acceptable normalised syncopation */
  syncopationRange: [number, number];
  /** desired swing ratio for the timeline instruments */
  targetSwing: number;
  /** [min, max] onsets per beat (all instruments) */
  densityRange: [number, number];
  /** pairs of instruments that must interlock (complement each other) */
  interlockPairs: Array<[string, string]>;
  /** minimum acceptable interlocking strength for those pairs */
  interlockMin: number;
  /** instrument whose pattern is the anchor (heaviest weight in the score) */
  anchorInstrument: string;
}

export interface GrammarVariation {
  /** instruments that may be dropped entirely in a candidate */
  optionalInstruments: string[];
  /** instruments that play fills / calls */
  fillInstruments: string[];
  /** every N bars a fill is inserted (0 = never) */
  fillEveryBars: number;
  /** probability that any given hit is dropped / added by the Markov layer at energy 0.5 */
  mutationRate: number;
  /** velocity accent pattern position weights per beat (length = beatsPerBar) */
  beatAccents: number[];
}

export interface HumanizeProfile {
  /** per-instrument timing sigma in milliseconds (default used for others) */
  timingSigmaMs: Record<string, number>;
  /** per-instrument systematic push (negative = ahead of the beat) in ms */
  timingBiasMs: Record<string, number>;
  /** velocity jitter sigma 0..1 */
  velocitySigma: number;
  defaultTimingSigmaMs: number;
}

export interface Grammar {
  id: string;
  tradition: Tradition;
  displayName: string;
  /** Portuguese / Arabic name */
  localName: string;
  description: string;
  meter: Meter;
  tempoRange: [number, number];
  defaultTempo: number;
  defaultSwing: number;
  /** instrument ids in display order */
  instruments: string[];
  /** instrument id -> templates */
  templates: Record<string, GrammarTemplate[]>;
  constraints: GrammarConstraints;
  variation: GrammarVariation;
  humanize: HumanizeProfile;
  /** tags used by the spec parser (english, portuguese, arabic) */
  aliases: string[];
}

export interface TraditionInfo {
  id: Tradition;
  displayName: string;
  localName: string;
  description: string;
  /** default grammar id */
  defaultStyle: string;
}

/** What the user asked for (from controls or the free-text parser). */
export interface GenerationSpec {
  /** grammar id */
  style: string;
  tempo?: number;
  bars?: number;
  /** 0..1, drives density, velocity and mutation temperature */
  energy?: number;
  /** override the grammar's swing */
  swing?: number;
  /** override the grammar's meter (only for grammars that allow it) */
  meter?: Meter;
  /** instruments to include; defaults to the grammar's list */
  instruments?: string[];
}

export interface ScoreTerm {
  key: string;
  label: string;
  /** 0..1 */
  value: number;
  /** contribution weight */
  weight: number;
  /** plain-language sentence for the UI */
  explanation: string;
}

export interface ScoreBreakdown {
  /** 0..100 */
  total: number;
  terms: ScoreTerm[];
  /** sentences, best first */
  explanation: string[];
}

export interface PatternMetrics {
  /** normalised summed-velocity per step of ONE bar (folded) */
  histogram: number[];
  /** 0..1 */
  syncopation: number;
  /** 0.5 straight .. 0.75 heavy */
  swingRatio: number;
  /** onsets per beat */
  density: number;
  velocityVariance: number;
  /** ratio of dominant inter-onset intervals between the two busiest instruments */
  crossRhythmRatio: number;
  /** instrument id -> onsets count */
  onsetsPerInstrument: Record<string, number>;
  /** interlocking strength per constraint pair */
  interlocking: Array<{ a: string; b: string; strength: number }>;
}

export interface ScoredCandidate {
  pattern: DrumPattern;
  score: ScoreBreakdown;
  metrics: PatternMetrics;
  /** rank 1..k after novelty filtering */
  rank: number;
}

export interface GenerationOptions {
  /** number of candidates generated before re-ranking (default 100) */
  candidates?: number;
  /** number of winners returned (default 5) */
  keep?: number;
  /** minimum histogram distance between winners (default 0.18) */
  noveltyMin?: number;
  /** deterministic seed */
  seed?: number;
  /** instrument -> events to keep verbatim (locked rows in the editor) */
  locked?: Record<string, DrumEvent[]>;
}

export interface GenerationResult {
  spec: Required<Pick<GenerationSpec, "style" | "tempo" | "bars" | "energy">> & GenerationSpec;
  grammar: Grammar;
  winners: ScoredCandidate[];
  candidateCount: number;
  durationMs: number;
  seed: number;
}

/** Output of the free-text spec parser. Never guesses: unknown words go to `unparsed`. */
export interface ParsedSpec {
  spec: GenerationSpec;
  /** detected language of the majority of recognised tokens */
  language: "en" | "pt" | "ar" | "mixed" | "unknown";
  /** 0..1 fraction of tokens understood */
  confidence: number;
  /** what each recognised token meant, for the UI */
  recognised: Array<{ token: string; meaning: string }>;
  unparsed: string[];
  /** key / maqam mentioned (stored for the harmony phase, unused by generation) */
  tonalHint?: string;
}

/** An onset detected in audio. */
export interface Onset {
  /** seconds */
  time: number;
  /** 0..1 */
  strength: number;
  /** spectral centroid in Hz at the onset */
  centroid: number;
  /** spectral flatness 0..1 */
  flatness: number;
  /** low/mid/high band energy ratios (sum to 1) */
  bands: [number, number, number];
}

export interface AnalysisResult {
  onsets: Onset[];
  /** estimated or supplied tempo */
  tempo: number;
  tempoSource: "estimated" | "supplied";
  meter: Meter;
  bars: number;
  pattern: DrumPattern;
  metrics: PatternMetrics;
  /** closest grammar templates, best first */
  closestGrammars: Array<{ id: string; displayName: string; similarity: number }>;
  /** fraction of onsets that landed within ±0.25 step of the grid */
  gridFit: number;
}

export interface GridRow {
  instrument: string;
  /** length = bars * stepsPerBar; null = rest */
  cells: Array<DrumEvent | null>;
}

export interface Grid {
  stepsPerBar: number;
  totalSteps: number;
  rows: GridRow[];
}
