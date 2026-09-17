/**
 * Modal-synthesis parameters for the built-in starter kits.
 *
 * Each instrument is a bank of decaying sine modes (the drum head / bell body)
 * plus an optional filtered-noise burst (stick, skin slap, jingles). The web
 * audio layer renders these with plain oscillators, so the starter kits are
 * honest "synthesized" sounds until real samples are contributed.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SynthMode {
  /** Hz */
  freq: number;
  /** exponential decay time constant in seconds */
  decay: number;
  /** relative gain 0..1 */
  gain: number;
}

export interface SynthNoise {
  decay: number;
  gain: number;
  /** band-pass centre Hz */
  centre: number;
  /** band-pass Q */
  q: number;
}

export interface SynthParams {
  modes: SynthMode[];
  noise?: SynthNoise;
  /** pitch drop at the attack: start ratio (e.g. 1.6 = starts 60 % higher) and decay seconds */
  pitchEnv?: { ratio: number; decay: number };
  /** attack seconds */
  attack: number;
  /** total voice length seconds */
  duration: number;
  /** master level 0..1 */
  level: number;
}

const membrane = (f0: number, decay: number, level: number, extra: Partial<SynthParams> = {}): SynthParams => ({
  modes: [
    { freq: f0, decay, gain: 1 },
    { freq: f0 * 1.59, decay: decay * 0.6, gain: 0.45 },
    { freq: f0 * 2.14, decay: decay * 0.4, gain: 0.25 },
    { freq: f0 * 2.65, decay: decay * 0.3, gain: 0.15 },
  ],
  pitchEnv: { ratio: 1.5, decay: 0.03 },
  attack: 0.002,
  duration: decay * 4,
  level,
  ...extra,
});

const bell = (f0: number, decay: number, level: number): SynthParams => ({
  modes: [
    { freq: f0, decay, gain: 1 },
    { freq: f0 * 2.76, decay: decay * 0.7, gain: 0.6 },
    { freq: f0 * 5.4, decay: decay * 0.45, gain: 0.35 },
    { freq: f0 * 8.93, decay: decay * 0.3, gain: 0.2 },
  ],
  noise: { decay: 0.008, gain: 0.25, centre: f0 * 3, q: 1 },
  attack: 0.001,
  duration: decay * 4,
  level,
});

const shaker = (centre: number, decay: number, level: number, q = 1.2): SynthParams => ({
  modes: [],
  noise: { decay, gain: 1, centre, q },
  attack: 0.004,
  duration: decay * 4,
  level,
});

export const SYNTH_PARAMS: Record<string, SynthParams> = {
  // ---- Samba
  surdo1: membrane(58, 0.55, 1, { pitchEnv: { ratio: 1.35, decay: 0.05 }, noise: { decay: 0.02, gain: 0.15, centre: 400, q: 0.8 } }),
  surdo2: membrane(72, 0.45, 0.95, { pitchEnv: { ratio: 1.35, decay: 0.045 }, noise: { decay: 0.02, gain: 0.15, centre: 450, q: 0.8 } }),
  surdo3: membrane(95, 0.3, 0.9, { pitchEnv: { ratio: 1.4, decay: 0.04 }, noise: { decay: 0.02, gain: 0.2, centre: 600, q: 0.8 } }),
  caixa: {
    modes: [
      { freq: 185, decay: 0.09, gain: 0.7 },
      { freq: 330, decay: 0.07, gain: 0.5 },
    ],
    noise: { decay: 0.11, gain: 1, centre: 3200, q: 0.6 },
    pitchEnv: { ratio: 1.3, decay: 0.02 },
    attack: 0.001,
    duration: 0.4,
    level: 0.75,
  },
  repinique: membrane(240, 0.12, 0.85, { noise: { decay: 0.05, gain: 0.5, centre: 2500, q: 0.9 }, pitchEnv: { ratio: 1.6, decay: 0.02 } }),
  tamborim: {
    modes: [
      { freq: 520, decay: 0.05, gain: 1 },
      { freq: 900, decay: 0.035, gain: 0.5 },
    ],
    noise: { decay: 0.03, gain: 0.6, centre: 4000, q: 1 },
    pitchEnv: { ratio: 1.8, decay: 0.012 },
    attack: 0.001,
    duration: 0.2,
    level: 0.8,
  },
  agogo_high: bell(1180, 0.35, 0.7),
  agogo_low: bell(880, 0.4, 0.7),
  ganza: shaker(6500, 0.06, 0.55, 0.8),
  chocalho: shaker(5200, 0.08, 0.6, 0.6),
  pandeiro: {
    modes: [
      { freq: 150, decay: 0.15, gain: 0.8 },
      { freq: 260, decay: 0.09, gain: 0.35 },
    ],
    noise: { decay: 0.12, gain: 0.7, centre: 7000, q: 0.7 },
    pitchEnv: { ratio: 1.4, decay: 0.03 },
    attack: 0.002,
    duration: 0.5,
    level: 0.7,
  },
  cuica: {
    modes: [
      { freq: 420, decay: 0.25, gain: 1 },
      { freq: 840, decay: 0.2, gain: 0.5 },
      { freq: 1270, decay: 0.15, gain: 0.3 },
    ],
    pitchEnv: { ratio: 0.7, decay: 0.18 },
    attack: 0.02,
    duration: 0.6,
    level: 0.6,
  },
  apito: {
    modes: [
      { freq: 2350, decay: 0.2, gain: 1 },
      { freq: 2460, decay: 0.2, gain: 0.8 },
      { freq: 4700, decay: 0.12, gain: 0.3 },
    ],
    noise: { decay: 0.2, gain: 0.35, centre: 2400, q: 4 },
    attack: 0.01,
    duration: 0.35,
    level: 0.5,
  },
  // ---- Arabic
  darbuka_dum: membrane(88, 0.32, 1, { pitchEnv: { ratio: 1.6, decay: 0.04 }, noise: { decay: 0.015, gain: 0.2, centre: 700, q: 1 } }),
  darbuka_tak: {
    modes: [
      { freq: 640, decay: 0.08, gain: 1 },
      { freq: 1310, decay: 0.05, gain: 0.5 },
      { freq: 2100, decay: 0.03, gain: 0.3 },
    ],
    noise: { decay: 0.03, gain: 0.6, centre: 5000, q: 1.2 },
    pitchEnv: { ratio: 1.3, decay: 0.01 },
    attack: 0.001,
    duration: 0.3,
    level: 0.8,
  },
  darbuka_ka: {
    modes: [
      { freq: 700, decay: 0.045, gain: 0.7 },
      { freq: 1450, decay: 0.03, gain: 0.4 },
    ],
    noise: { decay: 0.035, gain: 0.8, centre: 6000, q: 1 },
    attack: 0.001,
    duration: 0.2,
    level: 0.6,
  },
  riq_dum: membrane(170, 0.18, 0.8, { noise: { decay: 0.1, gain: 0.5, centre: 8000, q: 0.8 } }),
  riq_tak: {
    modes: [
      { freq: 560, decay: 0.06, gain: 0.8 },
      { freq: 1120, decay: 0.04, gain: 0.4 },
    ],
    noise: { decay: 0.09, gain: 0.8, centre: 8500, q: 0.7 },
    attack: 0.001,
    duration: 0.35,
    level: 0.7,
  },
  riq_jingle: shaker(9000, 0.14, 0.5, 0.5),
  daf_dum: membrane(110, 0.4, 0.9, { pitchEnv: { ratio: 1.3, decay: 0.05 }, noise: { decay: 0.03, gain: 0.2, centre: 900, q: 0.8 } }),
  daf_tak: {
    modes: [
      { freq: 380, decay: 0.09, gain: 1 },
      { freq: 760, decay: 0.06, gain: 0.4 },
    ],
    noise: { decay: 0.05, gain: 0.5, centre: 3500, q: 0.8 },
    attack: 0.001,
    duration: 0.35,
    level: 0.7,
  },
  tabla_baladi_dum: membrane(75, 0.42, 1, { pitchEnv: { ratio: 1.5, decay: 0.05 } }),
  tabla_baladi_tak: {
    modes: [
      { freq: 520, decay: 0.08, gain: 1 },
      { freq: 1050, decay: 0.05, gain: 0.5 },
    ],
    noise: { decay: 0.04, gain: 0.5, centre: 4200, q: 1 },
    attack: 0.001,
    duration: 0.3,
    level: 0.75,
  },
  doholla_dum: membrane(62, 0.5, 1, { pitchEnv: { ratio: 1.5, decay: 0.06 } }),
  doholla_tak: {
    modes: [
      { freq: 420, decay: 0.1, gain: 1 },
      { freq: 860, decay: 0.06, gain: 0.5 },
    ],
    noise: { decay: 0.04, gain: 0.5, centre: 3800, q: 1 },
    attack: 0.001,
    duration: 0.35,
    level: 0.75,
  },
  sagat: bell(4200, 0.5, 0.45),
};

export function getSynthParams(instrument: string): SynthParams {
  const p = SYNTH_PARAMS[instrument];
  if (!p) throw new Error(`No synth parameters for instrument "${instrument}"`);
  return p;
}
