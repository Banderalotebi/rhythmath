/**
 * Instrument registry with General MIDI percussion mapping (channel 10).
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Instrument, Tradition } from "./types";

const list: Instrument[] = [
  // ---- Samba (Rio batucada)
  { id: "surdo1", tradition: "samba", displayName: "Surdo 1 (primeira)", localName: "surdo de primeira", family: "low_drum", midiNote: 36, role: "Lowest drum. Marks beat 2 — the heartbeat of the bateria.", defaultGain: 1.0, defaultPan: -0.1 },
  { id: "surdo2", tradition: "samba", displayName: "Surdo 2 (segunda)", localName: "surdo de segunda", family: "low_drum", midiNote: 35, role: "Answers surdo 1 on beat 1, slightly higher.", defaultGain: 0.9, defaultPan: 0.1 },
  { id: "surdo3", tradition: "samba", displayName: "Surdo 3 (terceira)", localName: "surdo de terceira / cortador", family: "mid_drum", midiNote: 41, role: "Cuts syncopated phrases between the two marcação surdos.", defaultGain: 0.8, defaultPan: 0.2 },
  { id: "caixa", tradition: "samba", displayName: "Caixa", localName: "caixa de guerra", family: "snare", midiNote: 38, role: "Snare. Constant sixteenths with the telecoteco accent — carries the swing.", defaultGain: 0.75, defaultPan: -0.25 },
  { id: "repinique", tradition: "samba", displayName: "Repinique", localName: "repique", family: "high_drum", midiNote: 48, role: "Leader's drum: calls, viradas and paradinhas.", defaultGain: 0.8, defaultPan: 0.3 },
  { id: "tamborim", tradition: "samba", displayName: "Tamborim", localName: "tamborim", family: "high_drum", midiNote: 76, role: "Tiny frame drum, sharp crack. Plays the carreteiro and desenhos.", defaultGain: 0.7, defaultPan: -0.4 },
  { id: "agogo_high", tradition: "samba", displayName: "Agogô (high)", localName: "agogô agudo", family: "bell", midiNote: 67, role: "High bell of the samba timeline.", defaultGain: 0.6, defaultPan: 0.45 },
  { id: "agogo_low", tradition: "samba", displayName: "Agogô (low)", localName: "agogô grave", family: "bell", midiNote: 68, role: "Low bell of the samba timeline.", defaultGain: 0.6, defaultPan: 0.45 },
  { id: "ganza", tradition: "samba", displayName: "Ganzá", localName: "ganzá", family: "shaker", midiNote: 70, role: "Metal shaker, straight sixteenths with a swung feel.", defaultGain: 0.5, defaultPan: -0.55 },
  { id: "chocalho", tradition: "samba", displayName: "Chocalho", localName: "chocalho / rocar", family: "shaker", midiNote: 69, role: "Jingle shaker, adds wash and drive.", defaultGain: 0.45, defaultPan: 0.55 },
  { id: "pandeiro", tradition: "samba", displayName: "Pandeiro", localName: "pandeiro", family: "frame_drum", midiNote: 54, role: "Hand frame drum with jingles: bass, slap and jingle in one instrument.", defaultGain: 0.7, defaultPan: 0.15 },
  { id: "cuica", tradition: "samba", displayName: "Cuíca", localName: "cuíca", family: "high_drum", midiNote: 79, role: "Friction drum, the laughing voice of samba.", defaultGain: 0.55, defaultPan: -0.3 },
  { id: "apito", tradition: "samba", displayName: "Apito", localName: "apito (whistle)", family: "whistle", midiNote: 71, role: "Leader's whistle — signals breaks and entrances.", defaultGain: 0.5, defaultPan: 0.0 },

  // ---- Arabic (iqāʿāt)
  { id: "darbuka_dum", tradition: "arabic", displayName: "Darbuka — dum", localName: "دربكة — دم", family: "goblet_drum", midiNote: 64, role: "Deep open stroke in the centre of the head. The skeleton of every iqāʿ.", defaultGain: 1.0, defaultPan: 0.0 },
  { id: "darbuka_tak", tradition: "arabic", displayName: "Darbuka — tak", localName: "دربكة — تك", family: "goblet_drum", midiNote: 63, role: "Sharp rim stroke that answers the dum.", defaultGain: 0.85, defaultPan: 0.15 },
  { id: "darbuka_ka", tradition: "arabic", displayName: "Darbuka — ka", localName: "دربكة — كا", family: "goblet_drum", midiNote: 62, role: "Weak-hand rim stroke used for ornamentation and fills.", defaultGain: 0.6, defaultPan: -0.15 },
  { id: "riq_dum", tradition: "arabic", displayName: "Riq — dum", localName: "رق — دم", family: "frame_drum", midiNote: 61, role: "Low stroke of the tambourine, doubles the skeleton.", defaultGain: 0.7, defaultPan: -0.35 },
  { id: "riq_tak", tradition: "arabic", displayName: "Riq — tak", localName: "رق — تك", family: "frame_drum", midiNote: 60, role: "Rim stroke of the riq.", defaultGain: 0.65, defaultPan: -0.35 },
  { id: "riq_jingle", tradition: "arabic", displayName: "Riq — jingles", localName: "رق — صنوج", family: "shaker", midiNote: 54, role: "Brass jingles filling the offbeats.", defaultGain: 0.45, defaultPan: -0.5 },
  { id: "daf_dum", tradition: "arabic", displayName: "Daf — dum", localName: "دف — دم", family: "frame_drum", midiNote: 45, role: "Large frame drum, warm bass stroke.", defaultGain: 0.85, defaultPan: 0.3 },
  { id: "daf_tak", tradition: "arabic", displayName: "Daf — tak", localName: "دف — تك", family: "frame_drum", midiNote: 47, role: "Edge stroke of the daf.", defaultGain: 0.7, defaultPan: 0.3 },
  { id: "tabla_baladi_dum", tradition: "arabic", displayName: "Tabla baladi — dum", localName: "طبلة بلدي — دم", family: "low_drum", midiNote: 36, role: "Big double-headed drum of the Ṣaʿīd; bass side.", defaultGain: 1.0, defaultPan: -0.1 },
  { id: "tabla_baladi_tak", tradition: "arabic", displayName: "Tabla baladi — tak", localName: "طبلة بلدي — تك", family: "mid_drum", midiNote: 43, role: "Stick on the high side of the tabla baladi.", defaultGain: 0.8, defaultPan: 0.1 },
  { id: "doholla_dum", tradition: "arabic", displayName: "Doholla — dum", localName: "دهلة — دم", family: "low_drum", midiNote: 35, role: "Bass darbuka; anchors the ensemble.", defaultGain: 0.95, defaultPan: 0.0 },
  { id: "doholla_tak", tradition: "arabic", displayName: "Doholla — tak", localName: "دهلة — تك", family: "mid_drum", midiNote: 66, role: "Rim stroke of the doholla.", defaultGain: 0.75, defaultPan: 0.2 },
  { id: "sagat", tradition: "arabic", displayName: "Sagat", localName: "صاجات", family: "bell", midiNote: 53, role: "Finger cymbals, bright accents on the taks.", defaultGain: 0.5, defaultPan: 0.5 },
];

export const INSTRUMENTS: Record<string, Instrument> = Object.fromEntries(list.map((i) => [i.id, i]));

export function getInstrument(id: string): Instrument {
  const inst = INSTRUMENTS[id];
  if (!inst) throw new Error(`Unknown instrument: ${id}`);
  return inst;
}

export function hasInstrument(id: string): boolean {
  return id in INSTRUMENTS;
}

export function instrumentsFor(tradition: Tradition): Instrument[] {
  return list.filter((i) => i.tradition === tradition);
}

/** Reverse lookup for MIDI import: note -> best instrument for a tradition. */
export function instrumentForMidiNote(note: number, tradition?: Tradition): Instrument | undefined {
  const candidates = list.filter((i) => i.midiNote === note && (!tradition || i.tradition === tradition));
  return candidates[0] ?? list.find((i) => i.midiNote === note);
}
