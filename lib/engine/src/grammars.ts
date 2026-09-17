/**
 * Grammar registry — the rhythm knowledge of Rhythmath as DATA.
 *
 * Every template is a standard reference pattern, marked with its provenance.
 * v0 templates are to be validated with musicians during the alpha.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Grammar, GrammarTemplate, HumanizeProfile, Tradition, TraditionInfo } from "./types";

const REF = "standard reference, to be validated in alpha";

/** helper: template with per-step velocities or a single velocity */
const t = (name: string, steps: number[], velocity: number[] | number = 0.9, source = REF): GrammarTemplate => ({
  name,
  steps,
  velocity,
  source,
});

/** helper: every step of a bar with an accent shape */
const all = (name: string, velocities: number[], source = REF): GrammarTemplate => ({
  name,
  steps: velocities.map((_, i) => i),
  velocity: velocities,
  source,
});

const sambaHumanize: HumanizeProfile = {
  defaultTimingSigmaMs: 6,
  timingSigmaMs: { caixa: 7, ganza: 8, chocalho: 8, tamborim: 6, surdo1: 4, surdo2: 4, surdo3: 5, repinique: 6, pandeiro: 7 },
  timingBiasMs: { caixa: -9, ganza: -6, chocalho: -5, tamborim: -4, surdo1: 6, surdo2: 4, surdo3: 0, repinique: -2, agogo_high: -3, agogo_low: -3 },
  velocitySigma: 0.06,
};

const arabicHumanize: HumanizeProfile = {
  defaultTimingSigmaMs: 5,
  timingSigmaMs: { darbuka_ka: 8, riq_jingle: 7, darbuka_dum: 4, darbuka_tak: 5, daf_dum: 5, daf_tak: 6, sagat: 6 },
  timingBiasMs: { darbuka_dum: 5, doholla_dum: 6, daf_dum: 4, darbuka_tak: -2, darbuka_ka: -4, riq_jingle: -3, sagat: -2 },
  velocitySigma: 0.08,
};

export const TRADITIONS: TraditionInfo[] = [
  {
    id: "samba",
    displayName: "Samba",
    localName: "Samba do Rio",
    description: "Rio de Janeiro batucada: interlocking surdos, swung caixa sixteenths, tamborim desenhos and the agogô timeline.",
    defaultStyle: "samba.batucada",
  },
  {
    id: "arabic",
    displayName: "Arabic iqāʿāt",
    localName: "الإيقاعات العربية",
    description: "Dum/tak skeletons of the Arab world — maqsūm, baladi, ṣaʿīdī, malfūf, samāʿī thaqīl in 10/8 and the Khaleeji samri.",
    defaultStyle: "arabic.maqsum",
  },
];

// ----------------------------------------------------------------------------
// Samba grammars — meter 2/4 with 4 steps per beat = 8 steps per bar
// ----------------------------------------------------------------------------

const sambaBatucada: Grammar = {
  id: "samba.batucada",
  tradition: "samba",
  displayName: "Samba batucada",
  localName: "batucada (escola de samba)",
  description: "The full Rio bateria: surdos de primeira/segunda marking 2 and 1, terceira cutting across, caixa telecoteco, repinique calls, tamborim carreteiro, agogô and ganzá.",
  meter: { beatsPerBar: 2, beatUnit: 4, stepsPerBeat: 4 },
  tempoRange: [96, 148],
  defaultTempo: 128,
  defaultSwing: 0.58,
  instruments: ["surdo1", "surdo2", "surdo3", "caixa", "repinique", "tamborim", "agogo_high", "agogo_low", "ganza", "chocalho"],
  templates: {
    surdo1: [t("marcação", [4], [1.0]), t("marcação dobrada", [4, 7], [1.0, 0.55])],
    surdo2: [t("marcação (resposta)", [0], [0.85]), t("resposta com puxada", [0, 3], [0.85, 0.5])],
    surdo3: [t("cortador A", [2, 6, 7], [0.8, 0.7, 0.9]), t("cortador B", [1, 2, 6], [0.7, 0.8, 0.85]), t("cortador C", [3, 6], [0.85, 0.75])],
    caixa: [
      all("telecoteco A", [1.0, 0.45, 0.5, 0.92, 0.45, 0.5, 0.92, 0.45]),
      all("telecoteco B", [0.5, 0.45, 0.92, 0.45, 0.92, 0.45, 0.5, 0.95]),
      all("carnaval", [1.0, 0.4, 0.55, 0.4, 0.95, 0.4, 0.55, 0.4]),
      all("ida", [0.9, 0.5, 0.6, 0.5, 0.9, 0.5, 0.6, 0.85]),
    ],
    repinique: [
      t("repique base", [0, 2, 3, 4, 6, 7], [0.9, 0.6, 0.8, 0.9, 0.6, 0.8]),
      t("virada", [1, 2, 3, 5, 6, 7], [0.7, 0.8, 0.9, 0.7, 0.8, 0.95]),
      t("chamada", [0, 3, 4, 7], [0.95, 0.8, 0.95, 0.85]),
    ],
    tamborim: [
      all("carreteiro", [0.9, 0.4, 0.4, 0.85, 0.4, 0.4, 0.85, 0.4]),
      t("desenho A", [0, 3, 6], [0.95, 0.85, 0.9]),
      t("desenho B", [1, 4, 6], [0.85, 0.95, 0.85]),
    ],
    agogo_high: [t("timeline A", [2, 4, 7], [0.85, 0.9, 0.8]), t("timeline B", [2, 6, 7], [0.85, 0.85, 0.9])],
    agogo_low: [t("timeline A", [0, 6], [0.9, 0.8]), t("timeline B", [1, 4], [0.8, 0.9])],
    ganza: [all("straight sixteenths", [1.0, 0.5, 0.7, 0.5, 1.0, 0.5, 0.7, 0.5]), all("acentuado", [0.9, 0.45, 0.8, 0.45, 0.9, 0.45, 0.95, 0.45])],
    chocalho: [all("wash", [0.9, 0.5, 0.65, 0.5, 0.95, 0.5, 0.65, 0.5])],
  },
  constraints: {
    syncopationRange: [0.2, 0.6],
    targetSwing: 0.58,
    densityRange: [3.5, 8],
    interlockPairs: [["surdo1", "surdo2"], ["agogo_high", "agogo_low"]],
    interlockMin: 0.9,
    anchorInstrument: "surdo1",
  },
  variation: {
    optionalInstruments: ["chocalho", "agogo_low", "surdo3"],
    fillInstruments: ["repinique"],
    fillEveryBars: 4,
    mutationRate: 0.12,
    beatAccents: [0.85, 1.0],
  },
  humanize: sambaHumanize,
  aliases: ["batucada", "bateria", "escola de samba", "samba enredo", "carnaval", "carnival", "باتوكادا", "سامبا"],
};

const sambaPartidoAlto: Grammar = {
  id: "samba.partido_alto",
  tradition: "samba",
  displayName: "Partido alto",
  localName: "partido-alto",
  description: "The two-bar partido-alto cell on pandeiro and tamborim over a light surdo, the groove of samba de roda and pagode.",
  meter: { beatsPerBar: 2, beatUnit: 4, stepsPerBeat: 4 },
  tempoRange: [88, 124],
  defaultTempo: 104,
  defaultSwing: 0.57,
  instruments: ["surdo1", "surdo2", "pandeiro", "tamborim", "agogo_high", "agogo_low", "ganza"],
  templates: {
    surdo1: [t("marcação", [4], [1.0])],
    surdo2: [t("resposta", [0], [0.8]), t("resposta leve", [0, 7], [0.8, 0.4])],
    pandeiro: [
      all("partido A", [1.0, 0.5, 0.6, 0.95, 0.55, 0.9, 0.95, 0.5]),
      all("partido B", [0.55, 0.95, 0.6, 0.5, 0.95, 0.55, 0.95, 0.5]),
    ],
    tamborim: [t("partido A", [0, 3, 5, 6], [0.95, 0.85, 0.8, 0.9]), t("partido B", [1, 4, 6], [0.85, 0.95, 0.85])],
    agogo_high: [t("timeline", [2, 4, 7], [0.8, 0.85, 0.8])],
    agogo_low: [t("timeline", [0, 6], [0.85, 0.8])],
    ganza: [all("sixteenths", [0.95, 0.5, 0.7, 0.5, 0.95, 0.5, 0.7, 0.5])],
  },
  constraints: {
    syncopationRange: [0.25, 0.65],
    targetSwing: 0.57,
    densityRange: [2.5, 6],
    interlockPairs: [["surdo1", "surdo2"]],
    interlockMin: 0.9,
    anchorInstrument: "pandeiro",
  },
  variation: {
    optionalInstruments: ["agogo_low", "ganza", "surdo2"],
    fillInstruments: ["tamborim"],
    fillEveryBars: 4,
    mutationRate: 0.1,
    beatAccents: [0.85, 1.0],
  },
  humanize: sambaHumanize,
  aliases: ["partido alto", "partido-alto", "pagode", "samba de roda", "roda"],
};

const sambaBossa: Grammar = {
  id: "samba.bossa",
  tradition: "samba",
  displayName: "Bossa nova",
  localName: "bossa nova",
  description: "The quiet samba: bass drum on the surdo figure, cross-stick bossa clave, brushed caixa and a soft shaker.",
  meter: { beatsPerBar: 2, beatUnit: 4, stepsPerBeat: 4 },
  tempoRange: [60, 96],
  defaultTempo: 76,
  defaultSwing: 0.53,
  instruments: ["surdo1", "caixa", "tamborim", "ganza"],
  templates: {
    surdo1: [t("bossa bass", [0, 3, 4, 7], [0.9, 0.6, 0.85, 0.6])],
    caixa: [all("brush", [0.5, 0.35, 0.45, 0.35, 0.5, 0.35, 0.45, 0.35])],
    tamborim: [t("bossa clave A", [0, 3, 6], [0.8, 0.75, 0.8]), t("bossa clave B", [2, 5], [0.8, 0.75])],
    ganza: [all("soft sixteenths", [0.6, 0.35, 0.5, 0.35, 0.6, 0.35, 0.5, 0.35])],
  },
  constraints: {
    syncopationRange: [0.2, 0.6],
    targetSwing: 0.53,
    densityRange: [2, 5],
    interlockPairs: [["surdo1", "tamborim"]],
    interlockMin: 0.5,
    anchorInstrument: "surdo1",
  },
  variation: {
    optionalInstruments: ["ganza"],
    fillInstruments: ["caixa"],
    fillEveryBars: 8,
    mutationRate: 0.06,
    beatAccents: [1.0, 0.9],
  },
  humanize: { ...sambaHumanize, velocitySigma: 0.04 },
  aliases: ["bossa", "bossa nova", "bossanova", "بوسا نوفا", "jazz samba"],
};

// ----------------------------------------------------------------------------
// Arabic grammars — 4/4 with 4 steps per beat = 16 steps; 2/4 = 8 steps;
// 10/8 and 6/8 with 2 steps per eighth = 20 and 12 steps.
// Skeleton (iqāʿ) and ornamentation (ka / jingles) are separate templates.
// ----------------------------------------------------------------------------

const riqJingles16 = [
  all("offbeat jingles", [0, 0.45, 0, 0.45, 0, 0.45, 0, 0.45, 0, 0.45, 0, 0.45, 0, 0.45, 0, 0.45].map((v) => v)),
  t("light jingles", [2, 6, 10, 14], [0.4, 0.4, 0.4, 0.4]),
];

const arabicMaqsum: Grammar = {
  id: "arabic.maqsum",
  tradition: "arabic",
  displayName: "Maqsūm",
  localName: "مقسوم",
  description: "The most common 4/4 iqāʿ of the Levant and Egypt: D T _ T D _ T _ — the backbone of popular Arabic song.",
  meter: { beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4 },
  tempoRange: [90, 140],
  defaultTempo: 112,
  defaultSwing: 0.5,
  instruments: ["darbuka_dum", "darbuka_tak", "darbuka_ka", "riq_dum", "riq_tak", "riq_jingle", "doholla_dum", "sagat"],
  templates: {
    darbuka_dum: [t("maqsūm skeleton", [0, 8], [1.0, 0.95])],
    darbuka_tak: [t("maqsūm skeleton", [2, 6, 12], [0.9, 0.85, 0.9]), t("maqsūm with pickup", [2, 6, 12, 14], [0.9, 0.85, 0.9, 0.6])],
    darbuka_ka: [
      t("light ornament", [10, 14], [0.35, 0.4]),
      t("medium ornament", [3, 7, 10, 11, 14, 15], [0.35, 0.4, 0.35, 0.4, 0.4, 0.45]),
      t("dense ornament", [1, 3, 5, 7, 9, 10, 11, 13, 14, 15], [0.3, 0.35, 0.3, 0.4, 0.3, 0.35, 0.4, 0.3, 0.4, 0.45]),
    ],
    riq_dum: [t("skeleton", [0, 8], [0.8, 0.75])],
    riq_tak: [t("skeleton", [2, 6, 12], [0.7, 0.65, 0.7])],
    riq_jingle: riqJingles16,
    doholla_dum: [t("bass", [0, 8], [0.9, 0.8]), t("bass with anticipation", [0, 7, 8], [0.9, 0.5, 0.8])],
    sagat: [t("taks", [2, 6, 12], [0.6, 0.55, 0.6])],
  },
  constraints: {
    syncopationRange: [0.15, 0.5],
    targetSwing: 0.5,
    densityRange: [1.5, 5],
    interlockPairs: [["darbuka_dum", "darbuka_tak"], ["riq_dum", "riq_tak"]],
    interlockMin: 0.95,
    anchorInstrument: "darbuka_dum",
  },
  variation: {
    optionalInstruments: ["sagat", "doholla_dum", "riq_dum", "riq_tak"],
    fillInstruments: ["darbuka_ka", "darbuka_tak"],
    fillEveryBars: 4,
    mutationRate: 0.1,
    beatAccents: [1.0, 0.7, 0.9, 0.7],
  },
  humanize: arabicHumanize,
  aliases: ["maqsum", "maqsoum", "maksoum", "مقسوم", "belly dance", "raqs sharqi", "رقص شرقي"],
};

const arabicBaladi: Grammar = {
  id: "arabic.baladi",
  tradition: "arabic",
  displayName: "Baladi",
  localName: "بلدي",
  description: "Earthy 4/4 with two dums up front: D D _ T D _ T _ — the countryside cousin of maqsūm.",
  meter: { beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4 },
  tempoRange: [80, 124],
  defaultTempo: 100,
  defaultSwing: 0.5,
  instruments: ["darbuka_dum", "darbuka_tak", "darbuka_ka", "riq_dum", "riq_tak", "riq_jingle", "doholla_dum"],
  templates: {
    darbuka_dum: [t("baladi skeleton", [0, 2, 8], [1.0, 0.85, 0.95])],
    darbuka_tak: [t("baladi skeleton", [6, 12], [0.9, 0.9]), t("baladi with pickup", [6, 12, 14], [0.9, 0.9, 0.55])],
    darbuka_ka: [t("light ornament", [10, 14], [0.35, 0.4]), t("medium ornament", [4, 7, 10, 11, 14, 15], [0.3, 0.4, 0.35, 0.4, 0.4, 0.45])],
    riq_dum: [t("skeleton", [0, 2, 8], [0.75, 0.6, 0.7])],
    riq_tak: [t("skeleton", [6, 12], [0.7, 0.7])],
    riq_jingle: riqJingles16,
    doholla_dum: [t("bass", [0, 2, 8], [0.9, 0.7, 0.85])],
  },
  constraints: {
    syncopationRange: [0.1, 0.45],
    targetSwing: 0.5,
    densityRange: [1.5, 5],
    interlockPairs: [["darbuka_dum", "darbuka_tak"]],
    interlockMin: 0.95,
    anchorInstrument: "darbuka_dum",
  },
  variation: {
    optionalInstruments: ["doholla_dum", "riq_dum", "riq_tak"],
    fillInstruments: ["darbuka_ka", "darbuka_tak"],
    fillEveryBars: 4,
    mutationRate: 0.09,
    beatAccents: [1.0, 0.75, 0.9, 0.7],
  },
  humanize: arabicHumanize,
  aliases: ["baladi", "beledi", "balady", "بلدي", "masmoudi saghir", "مصمودي صغير"],
};

const arabicSaidi: Grammar = {
  id: "arabic.saidi",
  tradition: "arabic",
  displayName: "Ṣaʿīdī",
  localName: "صعيدي",
  description: "Upper Egypt's stick-dance rhythm on the big tabla baladi: D T _ D D _ T _ — heavy, marching, joyful.",
  meter: { beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4 },
  tempoRange: [84, 128],
  defaultTempo: 104,
  defaultSwing: 0.5,
  instruments: ["tabla_baladi_dum", "tabla_baladi_tak", "darbuka_dum", "darbuka_tak", "darbuka_ka", "riq_tak", "riq_jingle", "sagat"],
  templates: {
    tabla_baladi_dum: [t("ṣaʿīdī skeleton", [0, 6, 8], [1.0, 0.95, 0.95])],
    tabla_baladi_tak: [t("ṣaʿīdī skeleton", [2, 12], [0.9, 0.9]), t("with pickup", [2, 12, 14], [0.9, 0.9, 0.6])],
    darbuka_dum: [t("doubling", [0, 6, 8], [0.85, 0.8, 0.8])],
    darbuka_tak: [t("doubling", [2, 12], [0.8, 0.8]), t("tak fill", [2, 10, 12, 14], [0.8, 0.5, 0.8, 0.55])],
    darbuka_ka: [t("light ornament", [4, 10, 14], [0.35, 0.4, 0.4]), t("medium ornament", [3, 4, 10, 11, 14, 15], [0.35, 0.35, 0.4, 0.4, 0.4, 0.45])],
    riq_tak: [t("taks", [2, 12], [0.65, 0.65])],
    riq_jingle: riqJingles16,
    sagat: [t("taks", [2, 12], [0.6, 0.6]), t("busy", [2, 4, 10, 12, 14], [0.6, 0.45, 0.5, 0.6, 0.5])],
  },
  constraints: {
    syncopationRange: [0.15, 0.5],
    targetSwing: 0.5,
    densityRange: [1.5, 5.5],
    interlockPairs: [["tabla_baladi_dum", "tabla_baladi_tak"], ["darbuka_dum", "darbuka_tak"]],
    interlockMin: 0.95,
    anchorInstrument: "tabla_baladi_dum",
  },
  variation: {
    optionalInstruments: ["sagat", "riq_tak", "darbuka_dum", "darbuka_tak"],
    fillInstruments: ["darbuka_ka", "tabla_baladi_tak"],
    fillEveryBars: 4,
    mutationRate: 0.09,
    beatAccents: [1.0, 0.75, 0.95, 0.7],
  },
  humanize: arabicHumanize,
  aliases: ["saidi", "saiidi", "said", "صعيدي", "tahtib", "تحطيب", "upper egypt"],
};

const arabicMalfuf: Grammar = {
  id: "arabic.malfuf",
  tradition: "arabic",
  displayName: "Malfūf",
  localName: "ملفوف",
  description: "Fast rolling 2/4 for entrances and processions: D _ _ T _ _ T _.",
  meter: { beatsPerBar: 2, beatUnit: 4, stepsPerBeat: 4 },
  tempoRange: [110, 170],
  defaultTempo: 136,
  defaultSwing: 0.5,
  instruments: ["darbuka_dum", "darbuka_tak", "darbuka_ka", "riq_tak", "riq_jingle", "doholla_dum"],
  templates: {
    darbuka_dum: [t("malfūf skeleton", [0], [1.0])],
    darbuka_tak: [t("malfūf skeleton", [3, 6], [0.9, 0.9])],
    darbuka_ka: [t("light ornament", [5, 7], [0.35, 0.4]), t("medium ornament", [1, 2, 5, 7], [0.3, 0.35, 0.35, 0.4])],
    riq_tak: [t("taks", [3, 6], [0.65, 0.65])],
    riq_jingle: [all("jingles", [0, 0.45, 0, 0.45, 0, 0.45, 0, 0.45])],
    doholla_dum: [t("bass", [0], [0.9]), t("bass doubled", [0, 4], [0.9, 0.6])],
  },
  constraints: {
    syncopationRange: [0.2, 0.6],
    targetSwing: 0.5,
    densityRange: [1.5, 5],
    interlockPairs: [["darbuka_dum", "darbuka_tak"]],
    interlockMin: 0.95,
    anchorInstrument: "darbuka_dum",
  },
  variation: {
    optionalInstruments: ["doholla_dum", "riq_tak"],
    fillInstruments: ["darbuka_ka"],
    fillEveryBars: 4,
    mutationRate: 0.08,
    beatAccents: [1.0, 0.8],
  },
  humanize: arabicHumanize,
  aliases: ["malfuf", "malfouf", "laff", "ملفوف", "لف"],
};

const arabicWahda: Grammar = {
  id: "arabic.wahda",
  tradition: "arabic",
  displayName: "Wāḥda",
  localName: "واحدة",
  description: "Spacious 4/4 with a single dum: D _ _ _ T _ T _ — the classic accompaniment of ṭarab song.",
  meter: { beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4 },
  tempoRange: [70, 110],
  defaultTempo: 88,
  defaultSwing: 0.5,
  instruments: ["darbuka_dum", "darbuka_tak", "darbuka_ka", "riq_dum", "riq_tak", "riq_jingle"],
  templates: {
    darbuka_dum: [t("wāḥda skeleton", [0], [1.0])],
    darbuka_tak: [t("wāḥda skeleton", [8, 12], [0.9, 0.85]), t("wāḥda kabīra", [6, 10, 12], [0.8, 0.85, 0.85])],
    darbuka_ka: [t("light ornament", [14], [0.4]), t("medium ornament", [3, 7, 11, 14, 15], [0.3, 0.35, 0.35, 0.4, 0.45])],
    riq_dum: [t("skeleton", [0], [0.8])],
    riq_tak: [t("skeleton", [8, 12], [0.7, 0.65])],
    riq_jingle: riqJingles16,
  },
  constraints: {
    syncopationRange: [0.05, 0.4],
    targetSwing: 0.5,
    densityRange: [1, 4],
    interlockPairs: [["darbuka_dum", "darbuka_tak"]],
    interlockMin: 0.95,
    anchorInstrument: "darbuka_dum",
  },
  variation: {
    optionalInstruments: ["riq_dum", "riq_tak"],
    fillInstruments: ["darbuka_ka"],
    fillEveryBars: 8,
    mutationRate: 0.07,
    beatAccents: [1.0, 0.65, 0.85, 0.7],
  },
  humanize: arabicHumanize,
  aliases: ["wahda", "wahda kabira", "wehda", "واحدة", "واحدة كبيرة", "tarab", "طرب"],
};

const arabicAyyub: Grammar = {
  id: "arabic.ayyub",
  tradition: "arabic",
  displayName: "Ayyūb",
  localName: "أيوب",
  description: "Hypnotic 2/4 trance rhythm of the zār: D _ _ D _ T _ _.",
  meter: { beatsPerBar: 2, beatUnit: 4, stepsPerBeat: 4 },
  tempoRange: [100, 160],
  defaultTempo: 124,
  defaultSwing: 0.5,
  instruments: ["darbuka_dum", "darbuka_tak", "darbuka_ka", "daf_dum", "daf_tak", "riq_jingle"],
  templates: {
    darbuka_dum: [t("ayyūb skeleton", [0, 3], [1.0, 0.85])],
    darbuka_tak: [t("ayyūb skeleton", [5], [0.9]), t("ayyūb doubled", [5, 7], [0.9, 0.5])],
    darbuka_ka: [t("light ornament", [2, 7], [0.35, 0.4]), t("medium ornament", [1, 2, 6, 7], [0.3, 0.35, 0.35, 0.4])],
    daf_dum: [t("skeleton", [0, 3], [0.9, 0.75])],
    daf_tak: [t("skeleton", [5], [0.8])],
    riq_jingle: [all("jingles", [0, 0.4, 0, 0.4, 0, 0.4, 0, 0.4])],
  },
  constraints: {
    syncopationRange: [0.2, 0.6],
    targetSwing: 0.5,
    densityRange: [1.5, 5],
    interlockPairs: [["darbuka_dum", "darbuka_tak"], ["daf_dum", "daf_tak"]],
    interlockMin: 0.95,
    anchorInstrument: "darbuka_dum",
  },
  variation: {
    optionalInstruments: ["daf_dum", "daf_tak", "riq_jingle"],
    fillInstruments: ["darbuka_ka"],
    fillEveryBars: 4,
    mutationRate: 0.08,
    beatAccents: [1.0, 0.8],
  },
  humanize: arabicHumanize,
  aliases: ["ayyub", "ayoub", "ayub", "zar", "أيوب", "زار"],
};

const arabicSamaiThaqil: Grammar = {
  id: "arabic.samai_thaqil",
  tradition: "arabic",
  displayName: "Samāʿī thaqīl",
  localName: "سماعي ثقيل",
  description: "The stately 10/8 of the Ottoman-Arab classical suite, grouped 3+2+2+3: D _ _ T _ D D T _ _.",
  meter: { beatsPerBar: 10, beatUnit: 8, stepsPerBeat: 2 },
  tempoRange: [66, 100],
  defaultTempo: 84,
  defaultSwing: 0.5,
  instruments: ["darbuka_dum", "darbuka_tak", "darbuka_ka", "riq_dum", "riq_tak", "riq_jingle"],
  templates: {
    darbuka_dum: [t("samāʿī skeleton", [0, 10, 12], [1.0, 0.9, 0.95])],
    darbuka_tak: [t("samāʿī skeleton", [6, 14], [0.9, 0.9]), t("samāʿī with closing taks", [6, 14, 16, 18], [0.9, 0.9, 0.55, 0.6])],
    darbuka_ka: [t("light ornament", [3, 9, 17, 19], [0.35, 0.4, 0.35, 0.4]), t("medium ornament", [2, 3, 8, 9, 15, 17, 18, 19], [0.3, 0.35, 0.35, 0.4, 0.35, 0.35, 0.4, 0.45])],
    riq_dum: [t("skeleton", [0, 10, 12], [0.8, 0.7, 0.75])],
    riq_tak: [t("skeleton", [6, 14], [0.7, 0.7])],
    riq_jingle: [t("offbeat jingles", [1, 3, 5, 7, 9, 11, 13, 15, 17, 19], 0.4)],
  },
  constraints: {
    syncopationRange: [0.1, 0.5],
    targetSwing: 0.5,
    densityRange: [1, 4],
    interlockPairs: [["darbuka_dum", "darbuka_tak"], ["riq_dum", "riq_tak"]],
    interlockMin: 0.95,
    anchorInstrument: "darbuka_dum",
  },
  variation: {
    optionalInstruments: ["riq_dum", "riq_tak"],
    fillInstruments: ["darbuka_ka"],
    fillEveryBars: 4,
    mutationRate: 0.06,
    beatAccents: [1.0, 0.5, 0.6, 0.85, 0.5, 0.9, 0.9, 0.8, 0.5, 0.6],
  },
  humanize: { ...arabicHumanize, velocitySigma: 0.06 },
  aliases: ["samai", "samai thaqil", "sama'i", "semai", "سماعي", "سماعي ثقيل", "10/8"],
};

const arabicKhaleejiSamri: Grammar = {
  id: "arabic.khaleeji_samri",
  tradition: "arabic",
  displayName: "Khaleeji samri",
  localName: "سامري خليجي",
  description: "Gulf samri feel in 6/8 on daf and tabla with jingles — the rhythm of the seated Khaleeji song.",
  meter: { beatsPerBar: 6, beatUnit: 8, stepsPerBeat: 2 },
  tempoRange: [112, 160],
  defaultTempo: 136,
  defaultSwing: 0.5,
  instruments: ["tabla_baladi_dum", "tabla_baladi_tak", "daf_dum", "daf_tak", "darbuka_tak", "darbuka_ka", "riq_jingle"],
  templates: {
    tabla_baladi_dum: [t("samri skeleton", [0], [1.0]), t("samri doubled", [0, 6], [1.0, 0.7])],
    tabla_baladi_tak: [t("samri skeleton", [4, 10], [0.9, 0.85]), t("samri busy", [4, 8, 10], [0.9, 0.6, 0.85])],
    daf_dum: [t("skeleton", [0, 6], [0.9, 0.8])],
    daf_tak: [t("skeleton", [4, 8, 10], [0.8, 0.7, 0.85]), t("skeleton light", [4, 10], [0.8, 0.85])],
    darbuka_tak: [t("answer", [4, 10], [0.7, 0.7]), t("answer busy", [2, 4, 8, 10], [0.5, 0.75, 0.55, 0.75])],
    darbuka_ka: [t("light ornament", [3, 9, 11], [0.35, 0.35, 0.4]), t("medium ornament", [1, 3, 5, 7, 9, 11], 0.35)],
    riq_jingle: [t("offbeats", [1, 3, 5, 7, 9, 11], 0.4)],
  },
  constraints: {
    syncopationRange: [0.1, 0.5],
    targetSwing: 0.5,
    densityRange: [1.5, 5],
    interlockPairs: [["tabla_baladi_dum", "tabla_baladi_tak"], ["daf_dum", "daf_tak"]],
    interlockMin: 0.9,
    anchorInstrument: "tabla_baladi_dum",
  },
  variation: {
    optionalInstruments: ["riq_jingle", "darbuka_tak", "darbuka_ka"],
    fillInstruments: ["darbuka_ka", "daf_tak"],
    fillEveryBars: 4,
    mutationRate: 0.08,
    beatAccents: [1.0, 0.5, 0.7, 0.9, 0.5, 0.75],
  },
  humanize: arabicHumanize,
  aliases: ["khaleeji", "khaliji", "samri", "gulf", "خليجي", "سامري", "6/8"],
};

export const GRAMMARS: Grammar[] = [
  sambaBatucada,
  sambaPartidoAlto,
  sambaBossa,
  arabicMaqsum,
  arabicBaladi,
  arabicSaidi,
  arabicMalfuf,
  arabicWahda,
  arabicAyyub,
  arabicSamaiThaqil,
  arabicKhaleejiSamri,
];

const byId: Record<string, Grammar> = Object.fromEntries(GRAMMARS.map((g) => [g.id, g]));

export function getGrammar(id: string): Grammar {
  const g = byId[id];
  if (!g) throw new Error(`Unknown grammar: ${id}`);
  return g;
}

export function hasGrammar(id: string): boolean {
  return id in byId;
}

export function grammarsFor(tradition: Tradition): Grammar[] {
  return GRAMMARS.filter((g) => g.tradition === tradition);
}

export function getTradition(id: Tradition): TraditionInfo {
  const t = TRADITIONS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tradition: ${id}`);
  return t;
}

/** Velocity array for a template (expands a scalar velocity). */
export function templateVelocities(template: GrammarTemplate): number[] {
  if (Array.isArray(template.velocity)) return template.velocity;
  const v = template.velocity ?? 0.9;
  return template.steps.map(() => v);
}
