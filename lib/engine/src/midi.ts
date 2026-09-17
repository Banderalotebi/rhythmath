/**
 * Standard MIDI file import / export.
 *
 * Percussion goes on channel 10 (index 9) using the General MIDI note of each
 * instrument. Tempo is always the quarter-note BPM; ticks per grid step follow
 * the meter, so 6/8 and 10/8 round-trip correctly.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Midi } from "@tonejs/midi";
import { getTradition } from "./grammars";
import { getInstrument, instrumentForMidiNote } from "./instruments";
import { stepsPerBar } from "./meter";
import { clamp, patternId, sortEvents } from "./pattern";
import { closestGrammars } from "./score";
import type { DrumEvent, DrumPattern, Meter, Tradition } from "./types";

/** MIDI ticks in one grid step for a given resolution. */
export function ticksPerStep(meter: Meter, ppq: number): number {
  return (ppq * (4 / meter.beatUnit)) / meter.stepsPerBeat;
}

export interface ToMidiOptions {
  /** track name written into the file (default: pattern style) */
  name?: string;
  /** note length as a fraction of a step (default 0.5) */
  gate?: number;
}

/** Serialise a pattern to a type-1 Standard MIDI File. */
export function toMidi(pattern: DrumPattern, options: ToMidiOptions = {}): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(pattern.tempo);
  midi.header.timeSignatures = [{ ticks: 0, timeSignature: [pattern.meter.beatsPerBar, pattern.meter.beatUnit] }];
  midi.header.name = options.name ?? `Rhythmath ${pattern.style}`;
  midi.header.update();
  const track = midi.addTrack();
  track.name = options.name ?? pattern.style;
  track.channel = 9;
  const tps = ticksPerStep(pattern.meter, midi.header.ppq);
  const gate = clamp(options.gate ?? 0.5, 0.05, 1);
  for (const ev of sortEvents(pattern.events)) {
    const inst = getInstrument(ev.instrument);
    const ticks = Math.max(0, Math.round((ev.step + ev.microOffset) * tps));
    track.addNote({
      midi: inst.midiNote,
      ticks,
      durationTicks: Math.max(1, Math.round(tps * gate)),
      velocity: clamp(ev.velocity, 0.01, 1),
    });
  }
  return midi.toArray();
}

export interface FromMidiOptions {
  /** tradition used to map GM notes back to instruments (default: majority vote) */
  tradition?: Tradition;
  /** grammar id to attach; default = closest grammar by histogram */
  style?: string;
  /** cap on bars imported (default 16) */
  maxBars?: number;
}

/** Parse a Standard MIDI File back into a DrumPattern. */
export function fromMidi(data: Uint8Array | ArrayBuffer, options: FromMidiOptions = {}): DrumPattern {
  const midi = new Midi(data);
  const tempo = clamp(Math.round(midi.header.tempos[0]?.bpm ?? 120), 30, 300);
  const sig = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4];
  const beatUnit: 4 | 8 = sig[1] === 8 ? 8 : 4;
  const meter: Meter = { beatsPerBar: clamp(sig[0] ?? 4, 1, 16), beatUnit, stepsPerBeat: beatUnit === 8 ? 2 : 4 };
  const tps = ticksPerStep(meter, midi.header.ppq);
  const spb = stepsPerBar(meter);

  const drumTracks = midi.tracks.filter((t) => t.channel === 9 && t.notes.length > 0);
  const tracks = drumTracks.length ? drumTracks : midi.tracks.filter((t) => t.notes.length > 0);
  const notes = tracks.flatMap((t) => t.notes);

  let tradition = options.tradition;
  if (!tradition) {
    const votes: Record<Tradition, number> = { samba: 0, arabic: 0 };
    for (const n of notes) {
      const inst = instrumentForMidiNote(n.midi);
      if (inst) votes[inst.tradition]++;
    }
    tradition = votes.arabic > votes.samba ? "arabic" : "samba";
  }

  const maxSteps = spb * (options.maxBars ?? 16);
  const merged = new Map<string, DrumEvent>();
  for (const n of notes) {
    const inst = instrumentForMidiNote(n.midi, tradition) ?? instrumentForMidiNote(n.midi);
    if (!inst) continue;
    const exact = n.ticks / tps;
    const step = Math.round(exact);
    if (step >= maxSteps) continue;
    const key = `${step}:${inst.id}`;
    const prev = merged.get(key);
    const ev: DrumEvent = { step, microOffset: clamp(exact - step, -0.5, 0.5), instrument: inst.id, velocity: clamp(n.velocity, 0.01, 1) };
    if (!prev || prev.velocity < ev.velocity) merged.set(key, ev);
  }
  const events = sortEvents(Array.from(merged.values()));
  const lastStep = events.reduce((m, e) => Math.max(m, e.step), 0);
  const bars = Math.max(1, Math.ceil((lastStep + 1) / spb));
  const instruments = Array.from(new Set(events.map((e) => e.instrument)));

  const base = {
    tradition,
    style: options.style ?? getTradition(tradition).defaultStyle,
    meter,
    bars,
    tempo,
    instruments,
    events,
  };
  const draft: DrumPattern = { ...base, id: patternId(base) };
  if (!options.style && events.length) {
    const best = closestGrammars(draft, 1)[0];
    if (best) return { ...draft, style: best.id, id: patternId({ ...base, style: best.id }) };
  }
  return draft;
}
