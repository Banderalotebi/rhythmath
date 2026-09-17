/**
 * Free-text spec parser — English, Portuguese and Arabic.
 *
 * Deterministic and in-house: a token/alias matcher, no language model.
 * It never guesses: every word it does not understand is reported in
 * `unparsed`, and `confidence` is the fraction of meaningful tokens matched.
 * SPDX-License-Identifier: Apache-2.0
 */
import { GRAMMARS, TRADITIONS, getGrammar, getTradition } from "./grammars";
import { INSTRUMENTS } from "./instruments";
import type { GenerationSpec, ParsedSpec, Tradition } from "./types";

type Lang = "en" | "pt" | "ar";

interface Hit {
  token: string;
  meaning: string;
  lang: Lang;
}

const ARABIC_RE = /[\u0600-\u06FF]/;
const TASHKEEL_RE = /[\u064B-\u0652\u0670\u0640]/g;
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Lower-case, strip diacritics/tashkeel, unify Arabic letter variants, map Arabic-Indic digits. */
export function normaliseSpecText(text: string): string {
  let s = text.normalize("NFKC").toLowerCase();
  s = s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  s = s.replace(TASHKEEL_RE, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // keep 10/8-style meters and hyphenated words, drop the rest of the punctuation
  s = s.replace(/[^\p{L}\p{N}\/\-\s']/gu, " ");
  return s.replace(/\s+/g, " ").trim();
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "with", "in", "at", "of", "for", "some", "please", "me", "give", "make", "create",
  "generate", "groove", "beat", "rhythm", "pattern", "loop", "style", "like", "one", "want", "i", "on", "to",
  "e", "o", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "com", "em", "no", "na", "por", "favor",
  "quero", "faz", "faça", "cria", "ritmo", "batida", "levada", "estilo", "tipo", "pra", "para",
  "و", "في", "مع", "من", "على", "الى", "ب", "اريد", "اعمل", "ايقاع", "ريتم", "نمط", "لو", "سمحت", "بس", "ال",
]);

const TEMPO_UNITS = new Set(["bpm", "bpms", "tempo", "andamento", "سرعه", "بي", "beats"]);
const BAR_UNITS: Record<string, Lang> = { bar: "en", bars: "en", measure: "en", measures: "en", compasso: "pt", compassos: "pt", مازوره: "ar", موازير: "ar", ميزان: "ar" };

interface Word {
  lang: Lang;
  kind: "energy" | "tempo" | "swing";
  value: number;
  label: string;
}

const WORDS: Record<string, Word> = {
  // energy
  intense: { lang: "en", kind: "energy", value: 0.9, label: "energy 0.9" },
  heavy: { lang: "en", kind: "energy", value: 0.85, label: "energy 0.85" },
  energetic: { lang: "en", kind: "energy", value: 0.85, label: "energy 0.85" },
  busy: { lang: "en", kind: "energy", value: 0.8, label: "energy 0.8" },
  loud: { lang: "en", kind: "energy", value: 0.8, label: "energy 0.8" },
  driving: { lang: "en", kind: "energy", value: 0.75, label: "energy 0.75" },
  medium: { lang: "en", kind: "energy", value: 0.5, label: "energy 0.5" },
  moderate: { lang: "en", kind: "energy", value: 0.5, label: "energy 0.5" },
  relaxed: { lang: "en", kind: "energy", value: 0.35, label: "energy 0.35" },
  soft: { lang: "en", kind: "energy", value: 0.25, label: "energy 0.25" },
  calm: { lang: "en", kind: "energy", value: 0.25, label: "energy 0.25" },
  gentle: { lang: "en", kind: "energy", value: 0.25, label: "energy 0.25" },
  light: { lang: "en", kind: "energy", value: 0.3, label: "energy 0.3" },
  sparse: { lang: "en", kind: "energy", value: 0.2, label: "energy 0.2" },
  quiet: { lang: "en", kind: "energy", value: 0.2, label: "energy 0.2" },
  minimal: { lang: "en", kind: "energy", value: 0.1, label: "energy 0.1" },
  forte: { lang: "pt", kind: "energy", value: 0.85, label: "energia 0.85" },
  pesado: { lang: "pt", kind: "energy", value: 0.85, label: "energia 0.85" },
  intenso: { lang: "pt", kind: "energy", value: 0.9, label: "energia 0.9" },
  quente: { lang: "pt", kind: "energy", value: 0.8, label: "energia 0.8" },
  cheio: { lang: "pt", kind: "energy", value: 0.8, label: "energia 0.8" },
  medio: { lang: "pt", kind: "energy", value: 0.5, label: "energia 0.5" },
  suave: { lang: "pt", kind: "energy", value: 0.25, label: "energia 0.25" },
  leve: { lang: "pt", kind: "energy", value: 0.3, label: "energia 0.3" },
  calmo: { lang: "pt", kind: "energy", value: 0.25, label: "energia 0.25" },
  vazio: { lang: "pt", kind: "energy", value: 0.15, label: "energia 0.15" },
  قوي: { lang: "ar", kind: "energy", value: 0.85, label: "طاقة 0.85" },
  حماسي: { lang: "ar", kind: "energy", value: 0.85, label: "طاقة 0.85" },
  عالي: { lang: "ar", kind: "energy", value: 0.8, label: "طاقة 0.8" },
  ثقيل: { lang: "ar", kind: "energy", value: 0.8, label: "طاقة 0.8" },
  متوسط: { lang: "ar", kind: "energy", value: 0.5, label: "طاقة 0.5" },
  هادئ: { lang: "ar", kind: "energy", value: 0.25, label: "طاقة 0.25" },
  خفيف: { lang: "ar", kind: "energy", value: 0.3, label: "طاقة 0.3" },
  ناعم: { lang: "ar", kind: "energy", value: 0.25, label: "طاقة 0.25" },
  // tempo words (value = position inside the grammar's tempo range)
  fast: { lang: "en", kind: "tempo", value: 0.9, label: "fast tempo" },
  quick: { lang: "en", kind: "tempo", value: 0.85, label: "fast tempo" },
  uptempo: { lang: "en", kind: "tempo", value: 0.85, label: "fast tempo" },
  slow: { lang: "en", kind: "tempo", value: 0.1, label: "slow tempo" },
  "laid-back": { lang: "en", kind: "tempo", value: 0.25, label: "slow tempo" },
  rapido: { lang: "pt", kind: "tempo", value: 0.9, label: "andamento rápido" },
  acelerado: { lang: "pt", kind: "tempo", value: 0.9, label: "andamento rápido" },
  lento: { lang: "pt", kind: "tempo", value: 0.1, label: "andamento lento" },
  devagar: { lang: "pt", kind: "tempo", value: 0.15, label: "andamento lento" },
  سريع: { lang: "ar", kind: "tempo", value: 0.9, label: "سرعة عالية" },
  بطيء: { lang: "ar", kind: "tempo", value: 0.1, label: "سرعة بطيئة" },
  // swing
  straight: { lang: "en", kind: "swing", value: 0.5, label: "swing 0.50 (straight)" },
  swung: { lang: "en", kind: "swing", value: 0.62, label: "swing 0.62" },
  swing: { lang: "en", kind: "swing", value: 0.62, label: "swing 0.62" },
  shuffle: { lang: "en", kind: "swing", value: 0.66, label: "swing 0.66" },
  reto: { lang: "pt", kind: "swing", value: 0.5, label: "swing 0.50 (reto)" },
  swingado: { lang: "pt", kind: "swing", value: 0.62, label: "swing 0.62" },
  balanco: { lang: "pt", kind: "swing", value: 0.6, label: "swing 0.60" },
  متأرجح: { lang: "ar", kind: "swing", value: 0.6, label: "swing 0.60" },
  مستقيم: { lang: "ar", kind: "swing", value: 0.5, label: "swing 0.50" },
};

const TRADITION_WORDS: Record<string, { tradition: Tradition; lang: Lang }> = {
  samba: { tradition: "samba", lang: "en" },
  brazil: { tradition: "samba", lang: "en" },
  brazilian: { tradition: "samba", lang: "en" },
  rio: { tradition: "samba", lang: "en" },
  brasil: { tradition: "samba", lang: "pt" },
  brasileiro: { tradition: "samba", lang: "pt" },
  سامبا: { tradition: "samba", lang: "ar" },
  برازيلي: { tradition: "samba", lang: "ar" },
  arabic: { tradition: "arabic", lang: "en" },
  arab: { tradition: "arabic", lang: "en" },
  egyptian: { tradition: "arabic", lang: "en" },
  egypt: { tradition: "arabic", lang: "en" },
  levantine: { tradition: "arabic", lang: "en" },
  iqa: { tradition: "arabic", lang: "en" },
  iqaat: { tradition: "arabic", lang: "en" },
  arabe: { tradition: "arabic", lang: "pt" },
  عربي: { tradition: "arabic", lang: "ar" },
  عربيه: { tradition: "arabic", lang: "ar" },
  مصري: { tradition: "arabic", lang: "ar" },
  شرقي: { tradition: "arabic", lang: "ar" },
};

const NEGATIONS = new Set(["no", "without", "sem", "بدون", "بلا"]);
const NOTE_RE = /^[a-g][#b]?$/;
const MODE_WORDS = new Set(["major", "minor", "maior", "menor", "dorian", "phrygian", "lydian", "mixolydian", "aeolian"]);

function langOf(token: string, fallback: Lang): Lang {
  return ARABIC_RE.test(token) ? "ar" : fallback;
}

/** alias -> grammar id, longest aliases first so multi-word aliases win. */
function aliasTable(): Array<{ alias: string[]; id: string; lang: Lang }> {
  const rows: Array<{ alias: string[]; id: string; lang: Lang }> = [];
  for (const g of GRAMMARS) {
    const names = [g.id.split(".")[1]!.replace(/_/g, " "), g.displayName, g.localName, ...g.aliases];
    for (const raw of names) {
      const n = normaliseSpecText(raw);
      if (!n) continue;
      const lang: Lang = ARABIC_RE.test(n) ? "ar" : g.aliases.indexOf(raw) >= 0 && /[ãçéô]/.test(raw) ? "pt" : "en";
      rows.push({ alias: n.split(" "), id: g.id, lang });
    }
  }
  return rows.sort((a, b) => b.alias.length - a.alias.length);
}

function instrumentTable(): Array<{ alias: string[]; id: string; lang: Lang }> {
  const rows: Array<{ alias: string[]; id: string; lang: Lang }> = [];
  for (const inst of Object.values(INSTRUMENTS)) {
    const base = inst.id.replace(/_(dum|tak|ka|jingle|high|low)$/, "").replace(/\d$/, "");
    for (const raw of [inst.id, base, inst.displayName, inst.localName]) {
      const n = normaliseSpecText(raw.replace(/_/g, " "));
      if (n) rows.push({ alias: n.split(" "), id: inst.id, lang: ARABIC_RE.test(n) ? "ar" : "en" });
    }
  }
  return rows.sort((a, b) => b.alias.length - a.alias.length);
}

let ALIASES: ReturnType<typeof aliasTable> | undefined;
let INSTRUMENT_ALIASES: ReturnType<typeof instrumentTable> | undefined;

function matchAt(tokens: string[], i: number, table: Array<{ alias: string[]; id: string; lang: Lang }>) {
  for (const row of table) {
    const n = row.alias.length;
    if (i + n > tokens.length) continue;
    let ok = true;
    for (let k = 0; k < n; k++) if (tokens[i + k] !== row.alias[k]) { ok = false; break; }
    if (ok) return { row, length: n };
  }
  return undefined;
}

export interface ParseOptions {
  /** grammar used when the text names no style or tradition */
  defaultStyle?: string;
}

/** Parse a free-text request into a GenerationSpec. */
export function parseSpec(text: string, options: ParseOptions = {}): ParsedSpec {
  ALIASES ??= aliasTable();
  INSTRUMENT_ALIASES ??= instrumentTable();
  const tokens = normaliseSpecText(text).split(" ").filter(Boolean);
  const hits: Hit[] = [];
  const unparsed: string[] = [];
  let style: string | undefined;
  let tradition: Tradition | undefined;
  let tempo: number | undefined;
  let tempoWord: number | undefined;
  let bars: number | undefined;
  let energy: number | undefined;
  let swing: number | undefined;
  let tonalHint: string | undefined;
  const include: string[] = [];
  const exclude: string[] = [];
  let negate = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    const next = tokens[i + 1];

    // numbers: tempo, bars, meters
    const num = /^\d+(?:\.\d+)?$/.test(tok) ? Number(tok) : undefined;
    if (num !== undefined) {
      if (next && BAR_UNITS[next]) {
        bars = Math.max(1, Math.min(64, Math.round(num)));
        hits.push({ token: `${tok} ${next}`, meaning: `${bars} bars`, lang: BAR_UNITS[next]! });
        i++;
        continue;
      }
      if ((next && TEMPO_UNITS.has(next)) || (num >= 40 && num <= 300)) {
        tempo = Math.max(30, Math.min(300, num));
        const unit = next && TEMPO_UNITS.has(next) ? ` ${next}` : "";
        hits.push({ token: `${tok}${unit}`, meaning: `tempo ${tempo} BPM`, lang: langOf(unit, "en") });
        if (unit) i++;
        continue;
      }
      unparsed.push(tok);
      continue;
    }
    const bpmAttached = /^(\d{2,3})bpm$/.exec(tok);
    if (bpmAttached) {
      tempo = Math.max(30, Math.min(300, Number(bpmAttached[1])));
      hits.push({ token: tok, meaning: `tempo ${tempo} BPM`, lang: "en" });
      continue;
    }
    if ((tok === "tempo" || tok === "andamento" || tok === "سرعه" || tok === "bpm") && next && /^\d+$/.test(next)) {
      tempo = Math.max(30, Math.min(300, Number(next)));
      hits.push({ token: `${tok} ${next}`, meaning: `tempo ${tempo} BPM`, lang: langOf(tok, tok === "andamento" ? "pt" : "en") });
      i++;
      continue;
    }

    // style aliases (longest first) — also catch meters like 10/8 that alias a grammar
    const styleHit = matchAt(tokens, i, ALIASES);
    if (styleHit) {
      style ??= styleHit.row.id;
      tradition ??= getGrammar(styleHit.row.id).tradition;
      hits.push({ token: tokens.slice(i, i + styleHit.length).join(" "), meaning: `style ${styleHit.row.id}`, lang: styleHit.row.lang });
      i += styleHit.length - 1;
      negate = false;
      continue;
    }
    if (/^\d+\/(4|8)$/.test(tok)) {
      hits.push({ token: tok, meaning: `meter ${tok} (grammar decides the meter)`, lang: "en" });
      continue;
    }

    // tonal hints: "maqam hijaz", "in d minor", "key of g"
    if ((tok === "maqam" || tok === "مقام") && next) {
      tonalHint = `maqam ${next}`;
      hits.push({ token: `${tok} ${next}`, meaning: `tonal hint ${tonalHint} (stored, harmony phase)`, lang: langOf(tok, "en") });
      i++;
      continue;
    }
    if (NOTE_RE.test(tok) && next && MODE_WORDS.has(next)) {
      tonalHint = `${tok.toUpperCase()} ${next}`;
      hits.push({ token: `${tok} ${next}`, meaning: `tonal hint ${tonalHint} (stored, harmony phase)`, lang: /maior|menor/.test(next) ? "pt" : "en" });
      i++;
      continue;
    }

    if (NEGATIONS.has(tok)) {
      negate = true;
      hits.push({ token: tok, meaning: "exclude next instrument", lang: langOf(tok, tok === "sem" ? "pt" : "en") });
      continue;
    }

    const instHit = matchAt(tokens, i, INSTRUMENT_ALIASES);
    if (instHit) {
      (negate ? exclude : include).push(instHit.row.id);
      hits.push({
        token: tokens.slice(i, i + instHit.length).join(" "),
        meaning: `${negate ? "without" : "with"} ${instHit.row.id}`,
        lang: instHit.row.lang,
      });
      i += instHit.length - 1;
      negate = false;
      continue;
    }
    negate = false;

    const trad = TRADITION_WORDS[tok];
    if (trad) {
      tradition ??= trad.tradition;
      hits.push({ token: tok, meaning: `tradition ${trad.tradition}`, lang: trad.lang });
      continue;
    }

    const word = WORDS[tok];
    if (word) {
      // "high energy" / "low energy" / "energia alta" handled by the bare adjective
      if (word.kind === "energy") energy = word.value;
      else if (word.kind === "tempo") tempoWord = word.value;
      else swing = word.value;
      hits.push({ token: tok, meaning: word.label, lang: word.lang });
      continue;
    }
    if (tok === "high" || tok === "alta" || tok === "alto" || tok === "عاليه") {
      energy = 0.85;
      hits.push({ token: tok, meaning: "energy 0.85", lang: langOf(tok, tok === "high" ? "en" : "pt") });
      continue;
    }
    if (tok === "low" || tok === "baixa" || tok === "baixo" || tok === "منخفض" || tok === "منخفضه") {
      energy = 0.2;
      hits.push({ token: tok, meaning: "energy 0.2", lang: langOf(tok, tok === "low" ? "en" : "pt") });
      continue;
    }
    if (tok === "energy" || tok === "energia" || tok === "طاقه" || tok === "swing" || tok === "tempo") continue;

    if (STOP_WORDS.has(tok)) continue;
    unparsed.push(tok);
  }

  const fallbackTradition = tradition ?? (style ? getGrammar(style).tradition : undefined);
  const resolvedStyle = style ?? (fallbackTradition ? getTradition(fallbackTradition).defaultStyle : options.defaultStyle ?? TRADITIONS[0]!.defaultStyle);
  const grammar = getGrammar(resolvedStyle);
  if (tempo === undefined && tempoWord !== undefined) {
    const [lo, hi] = grammar.tempoRange;
    tempo = Math.round(lo + (hi - lo) * tempoWord);
  }

  const spec: GenerationSpec = { style: grammar.id };
  if (tempo !== undefined) spec.tempo = tempo;
  if (bars !== undefined) spec.bars = bars;
  if (energy !== undefined) spec.energy = energy;
  if (swing !== undefined) spec.swing = swing;
  if (include.length || exclude.length) {
    const inGrammar = (id: string) => grammar.templates[id] !== undefined;
    const base = include.filter(inGrammar).length ? Array.from(new Set([...grammar.instruments.filter((i) => include.includes(i)), ...include.filter(inGrammar)])) : grammar.instruments.slice();
    const list = grammar.instruments.filter((i) => base.includes(i) && !exclude.includes(i));
    if (list.length) spec.instruments = list;
  }

  const counts: Record<Lang, number> = { en: 0, pt: 0, ar: 0 };
  for (const h of hits) counts[h.lang]++;
  const total = hits.length;
  let language: ParsedSpec["language"] = "unknown";
  if (total > 0) {
    const ranked = (Object.keys(counts) as Lang[]).sort((a, b) => counts[b] - counts[a]);
    const top = ranked[0]!;
    language = counts[ranked[1]!] / total > 0.34 ? "mixed" : top;
  }
  const meaningful = hits.length + unparsed.length;
  return {
    spec,
    language,
    confidence: meaningful === 0 ? 0 : hits.length / meaningful,
    recognised: hits.map(({ token, meaning }) => ({ token, meaning })),
    unparsed,
    ...(tonalHint ? { tonalHint } : {}),
  };
}
