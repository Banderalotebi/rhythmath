import { describe, expect, it } from "vitest";
import {
  GRAMMARS,
  INSTRUMENTS,
  SYNTH_PARAMS,
  analyzeAudio,
  analyzePattern,
  fromMidi,
  generateGrooves,
  getGrammar,
  hasInstrument,
  metricWeights,
  parseSpec,
  scorePattern,
  skeletonPattern,
  stepsPerBar,
  toMidi,
  toggleCell,
  toGrid,
} from "./index";

describe("registry consistency", () => {
  it("every grammar references known instruments and templates fit the bar", () => {
    for (const g of GRAMMARS) {
      const spb = stepsPerBar(g.meter);
      for (const id of g.instruments) expect(hasInstrument(id), `${g.id} -> ${id}`).toBe(true);
      for (const [inst, templates] of Object.entries(g.templates)) {
        expect(g.instruments, `${g.id} template for ${inst}`).toContain(inst);
        for (const t of templates) for (const s of t.steps) expect(s, `${g.id}/${inst}/${t.name}`).toBeLessThan(spb);
      }
      expect(g.instruments).toContain(g.constraints.anchorInstrument);
    }
  });
  it("every instrument has synth params", () => {
    for (const i of Object.values(INSTRUMENTS)) expect(SYNTH_PARAMS[i.id], i.id).toBeDefined();
  });
  it("metric weights: downbeat strongest, length = steps per bar", () => {
    const w = metricWeights(getGrammar("arabic.samai_thaqil").meter);
    expect(w).toHaveLength(20);
    expect(w[0]).toBe(1);
    expect(Math.max(...w.slice(1))).toBeLessThan(1);
  });
});

describe("generation", () => {
  it("is deterministic for a seed and returns ranked, scored winners", () => {
    const a = generateGrooves({ style: "samba.batucada", bars: 2 }, { seed: 7, candidates: 40, keep: 3 });
    const b = generateGrooves({ style: "samba.batucada", bars: 2 }, { seed: 7, candidates: 40, keep: 3 });
    expect(a.winners.map((w) => w.pattern.id)).toEqual(b.winners.map((w) => w.pattern.id));
    expect(a.winners.length).toBeGreaterThan(0);
    expect(a.winners[0]!.rank).toBe(1);
    for (const w of a.winners) {
      expect(w.score.total).toBeGreaterThanOrEqual(0);
      expect(w.score.total).toBeLessThanOrEqual(100);
      expect(w.pattern.events.length).toBeGreaterThan(0);
      for (const e of w.pattern.events) expect(e.step).toBeLessThan(stepsPerBar(w.pattern.meter) * w.pattern.bars);
    }
  });
  it("works for every grammar and respects locked rows", () => {
    for (const g of GRAMMARS) {
      const r = generateGrooves({ style: g.id, bars: 1 }, { seed: 3, candidates: 12, keep: 2 });
      expect(r.winners.length, g.id).toBeGreaterThan(0);
    }
    const anchor = getGrammar("arabic.maqsum").constraints.anchorInstrument;
    const locked = skeletonPattern("arabic.maqsum", 2).events.filter((e) => e.instrument === anchor);
    const r = generateGrooves({ style: "arabic.maqsum", bars: 2 }, { seed: 1, candidates: 10, keep: 1, locked: { [anchor]: locked } });
    const got = r.winners[0]!.pattern.events.filter((e) => e.instrument === anchor).map((e) => e.step).sort((x, y) => x - y);
    expect(got).toEqual(locked.map((e) => e.step).sort((x, y) => x - y));
  });
  it("skeleton scores well against its own grammar", () => {
    const p = skeletonPattern("samba.batucada", 2);
    const s = scorePattern(p);
    expect(s.total).toBeGreaterThan(55);
    expect(s.explanation.length).toBeGreaterThan(0);
  });
});

describe("editing", () => {
  it("toggleCell round-trips and grid has one row per instrument", () => {
    const p = skeletonPattern("samba.bossa", 1);
    const g = toGrid(p);
    expect(g.rows).toHaveLength(p.instruments.length);
    const before = p.events.length;
    const p2 = toggleCell(p, p.instruments[0]!, 1);
    const p3 = toggleCell(p2, p.instruments[0]!, 1);
    expect(p2.events.length).not.toBe(before);
    expect(p3.events.length).toBe(before);
    expect(p3.id).not.toBe(p2.id);
  });
});

describe("spec parser", () => {
  it("parses english, portuguese and arabic without guessing", () => {
    const en = parseSpec("fast samba batucada at 140 bpm, 4 bars, high energy, no cuica");
    expect(en.spec.style).toBe("samba.batucada");
    expect(en.spec.tempo).toBe(140);
    expect(en.spec.bars).toBe(4);
    expect(en.spec.energy).toBeGreaterThan(0.7);
    expect(en.spec.instruments).not.toContain("cuica");
    expect(en.language).toBe("en");
    expect(en.confidence).toBeGreaterThan(0.8);

    const pt = parseSpec("partido alto lento e suave, 2 compassos");
    expect(pt.spec.style).toBe("samba.partido_alto");
    expect(pt.spec.bars).toBe(2);
    expect(pt.spec.tempo).toBeLessThan(getGrammar("samba.partido_alto").defaultTempo);
    expect(pt.language).toBe("pt");

    const ar = parseSpec("مقسوم سريع قوي ١١٠");
    expect(ar.spec.style).toBe("arabic.maqsum");
    expect(ar.spec.tempo).toBe(110);
    expect(ar.language).toBe("ar");

    const junk = parseSpec("purple elephants");
    expect(junk.confidence).toBe(0);
    expect(junk.unparsed).toEqual(["purple", "elephants"]);
  });
  it("keeps tonal hints and meter aliases", () => {
    const r = parseSpec("samai in maqam hijaz 10/8");
    expect(r.spec.style).toBe("arabic.samai_thaqil");
    expect(r.tonalHint).toBe("maqam hijaz");
  });
});

describe("midi", () => {
  it("round-trips a pattern including 10/8", () => {
    for (const style of ["samba.batucada", "arabic.samai_thaqil"]) {
      const p = skeletonPattern(style, 2);
      const bytes = toMidi(p);
      expect(bytes.length).toBeGreaterThan(50);
      const back = fromMidi(bytes, { tradition: p.tradition, style });
      expect(back.tempo).toBe(p.tempo);
      expect(back.meter).toEqual(p.meter);
      expect(back.bars).toBe(p.bars);
      const key = (e: { step: number; instrument: string }) => `${e.step}:${e.instrument}`;
      expect(back.events.map(key).sort()).toEqual(p.events.map(key).sort());
    }
  });
});

describe("audio analysis", () => {
  it("recovers tempo and onsets from a synthetic click track", () => {
    const sr = 22050;
    const bpm = 120;
    const seconds = 8;
    const buf = new Float32Array(sr * seconds);
    const beat = 60 / bpm;
    for (let t = 0; t < seconds / beat; t++) {
      const start = Math.round(t * beat * sr);
      const strong = t % 4 === 0;
      for (let i = 0; i < 600; i++) {
        const env = Math.exp(-i / 120);
        buf[start + i] = (strong ? Math.sin(i * 0.05) : (Math.sin(i * 1.7) * 0.5 + Math.sin(i * 0.9))) * env * (strong ? 1 : 0.6);
      }
    }
    const r = analyzeAudio(buf, sr, { meter: { beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4 } });
    expect(Math.abs(r.tempo - bpm)).toBeLessThanOrEqual(2);
    expect(r.onsets.length).toBeGreaterThanOrEqual(14);
    expect(r.gridFit).toBeGreaterThan(0.8);
    expect(r.pattern.events.length).toBeGreaterThan(0);
    expect(r.closestGrammars.length).toBeGreaterThan(0);
    expect(analyzePattern(r.pattern).density).toBeGreaterThan(0);
  });
});
