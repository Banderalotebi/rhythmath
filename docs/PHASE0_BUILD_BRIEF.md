# Rhythmath — Phase 0 Build Brief ("The Groove Engine")

This is the concrete build specification for the first two weeks. The strategy behind it is in `RHYTHMATH_MASTER_PLAN.md`. The original six-phase source document is `attached_assets/aimusicapp_1789622947785.txt` (reference only; it is duplicated and partly superseded by the master plan).

## Hard rules

1. **Fully open source.** Root license AGPL-3.0. `packages/engine` and `packages/sdk` are Apache-2.0 (each has its own `LICENSE`). `LICENSING.md` at the root explains the split.
2. **Built in-house. No third-party AI APIs.** Nothing calls Suno, Udio, OpenAI, Google or any hosted model. Open-source libraries that run locally (Tone.js, Meyda, onnxruntime-web, PyTorch) are fine.
3. **Self-hostable.** `docker compose up` runs web + API + Postgres. Replit-specific pieces (Replit Auth, App Storage) sit behind interfaces with local fallbacks (local accounts, local disk).
4. **Provenance.** No audio or MIDI datasets are committed to the repo. `datasets/` holds manifests, licenses and `provenance.json` schemas only.

## Repository

- GitHub: `Banderalotebi/rhythmath` (public). It already has an initial commit: README, AGPL-3.0 `LICENSE`, `LICENSING.md`, `packages/engine/LICENSE` (Apache-2.0), `docs/MASTER_PLAN.md`. Add it as `origin`, pull before the first push, then push the scaffold.
- Monorepo with npm workspaces:

```
rhythmath/
  packages/engine/      pure TypeScript, zero DOM/Node deps, Apache-2.0   ← the IP
  packages/sdk/         thin browser/Node client for the API + engine re-exports, Apache-2.0
  apps/web/             React + Vite + TypeScript + Tailwind, Tone.js, AGPL-3.0
  apps/api/             Node 20 + Express + TypeScript, Drizzle + Postgres, AGPL-3.0
  datasets/             manifests + provenance schema + license table (no media)
  benchmarks/           rhythm-authenticity benchmark harness (skeleton in Phase 0)
  training/             Python training scripts (empty placeholder + README in Phase 0)
  docs/                 master plan, architecture notes, model-card template
  .github/workflows/    CI: install, typecheck, engine tests on every PR
  docker-compose.yml, Dockerfile, .env.example, CONTRIBUTING.md, CODE_OF_CONDUCT.md
```

## `packages/engine` — Phase 0 scope

All functions pure, deterministic given a seed, fully unit-tested with Vitest.

### Representation
- `Meter { beatsPerBar, beatUnit, stepsPerBeat }` — must support 4/4 (16 steps), 2/4 (8), 6/8 (12), 10/8 (20 or 40). Steps per bar = beatsPerBar × stepsPerBeat. Never hard-code 16.
- `DrumEvent { step: number; microOffset: number /* fraction of a step, −0.5..0.5 */; instrument: string; velocity: number /* 0..1 */ }`
- `DrumPattern { id; tradition; style; meter; bars; tempo; events: DrumEvent[]; instruments: string[] }`
- `Instrument` registry with families: `samba` (surdo1, surdo2, surdo3, caixa, repinique, tamborim, agogo_high, agogo_low, ganza, chocalho, apito) and `arabic` (darbuka_dum, darbuka_tak, darbuka_ka, riq_dum, riq_tak, riq_jingle, daf_dum, daf_tak, tabla_baladi_dum, tabla_baladi_tak, katim, doholla). Each instrument carries a General MIDI note (channel 10) mapping for export plus a documented custom map.

### Metrics (`metrics.ts`)
- `histogram(pattern, instrument?)` — summed velocity per step, normalized.
- `syncopation(pattern)` — Longuet-Higgins & Lee metric weights per meter (define weight trees for 4/4, 2/4, 6/8, 10/8).
- `swingRatio(pattern)` — timing of the second subdivision relative to the first (0.5 straight; samba caixa ≈ 0.56–0.60).
- `interlockingStrength(a, b)` — 1 − coincident onsets / total onsets between two instrument tracks.
- `density(pattern)` — onsets per beat; `velocityVariance`.
- `crossRhythmRatio(pattern)` — from inter-onset intervals of the two most active instruments.
- `cosineSimilarity`, `histogramDistance`.

### Grammar Registry (`grammars/*.json` + `grammar.ts`)
A grammar is data, not code:

```json
{
  "id": "samba.batucada",
  "tradition": "samba",
  "displayName": "Samba batucada (Rio)",
  "meter": { "beatsPerBar": 2, "beatUnit": 4, "stepsPerBeat": 4 },
  "tempoRange": [96, 148],
  "instruments": ["surdo1", "surdo2", "surdo3", "caixa", "repinique", "tamborim", "agogo_high", "agogo_low", "ganza"],
  "templates": {
    "surdo1": { "marcacao": { "steps": [4], "velocity": [1.0] }, "cortador": { "steps": [...] } },
    "caixa":  { "telecoteco": { "steps": [...], "accents": [...] }, "carnaval": { ... } }
  },
  "constraints": { "surdo1_vs_surdo2_interlock_min": 0.9, "target_swing": 0.58, "target_syncopation": [0.35, 0.6] },
  "variation": { "allowedDrops": ["ganza"], "fillInstruments": ["repinique"], "fillEveryBars": 4 }
}
```

Ship these grammars in Phase 0 (v0 data; encode standard patterns and mark every template with `"source": "standard reference, to be validated in alpha"`):
- `samba.batucada` (surdo marcação primeira/segunda/terceira, cortador; caixa telecoteco/carnaval/straight; repinique call/resposta/paradinha simple + double; tamborim carreteiro; agogô samba timeline; ganzá straight 16ths).
- `samba.partido_alto`, `samba.bossa` (light: surdo/caixa/tamborim only).
- `arabic.maqsum` (4/4: D – T – – T D – T –), `arabic.baladi`, `arabic.saidi`, `arabic.malfuf` (2/4), `arabic.wahda`, `arabic.ayyub` (2/4), `arabic.samai_thaqil` (10/8: D – – T – D D T – –), `arabic.khaleeji_samri` (6/8 Khaleeji feel, daf + tabla).
- Strokes for Arabic instruments are dum/tak/ka with velocity accents; the grammar defines the skeleton (the iqāʿ) and the ornamentation layer (fills of ka strokes) separately.

### Generation (`generate.ts`)
- `generateCandidates(spec, n=100, seed)`: pick templates per instrument from the grammar → apply Markov variation (per-instrument step-transition matrices seeded from the templates, temperature from `spec.energy`) → insert fills/paradinhas per `variation` rules → humanize.
- `humanize(pattern, profile)`: per-instrument micro-timing Gaussian (σ in ms, converted to `microOffset`) and velocity jitter; v0 profiles hand-tuned per tradition (samba caixa pushes ahead, surdo sits back; darbuka dum slightly late and heavy).
- `score(pattern, grammar)`: weighted terms — grammar fit (template distance), syncopation-in-range, swing target, interlocking (surdo pairs, dum/tak complementarity), density-in-range, velocity shape. Returns `{ total, terms, explanation: string[] }` where explanations are plain sentences ("Surdo 1 and 2 interlock perfectly (1.00)", "Swing 0.57 — inside the samba window").
- `selectTop(candidates, k=5, noveltyMin=0.25)`: rank by score, then greedy novelty filter by histogram distance so the five are audibly different.
- Whole pipeline must finish in < 300 ms in the browser for 100 candidates × 8 bars.

### Spec parser (`spec.ts`)
- `parseSpec(text: string): Spec` — deterministic, lexicon-driven, languages EN / AR / PT. Extracts tempo ("132 bpm", "١٣٢"), tradition/style ("samba", "batucada", "maqsum", "مقسوم", "سماعي ثقيل", "khaleeji", "خليجي"), bars, energy ("calm", "carnival", "هادئ"), meter override, key/maqām (stored for Phase 2; no harmony yet). Unknown words are ignored, never guessed. Returns `confidence` and `unparsed` tokens for the UI to show.

### MIDI (`midi.ts`)
- `toMidi(pattern): Uint8Array` via `@tonejs/midi` (channel 10, GM map, micro-offsets applied in ticks, tempo + time signature meta events). `fromMidi(bytes): DrumPattern` for round-trip tests.

## `apps/web` — pages

Dark, professional music-tool aesthetic (think hardware sequencer, not SaaS dashboard). Works on phones. Arabic UI strings can come later, but layout must not break under RTL.

1. **Landing** — one-line thesis, a live demo groove (samba + maqsūm toggles, play/stop), "Open source · No credits · MIDI out", GitHub link, sign-in.
2. **Compose** — left: tradition → style, tempo, bars, energy, seed, free-text spec box (parser fills the controls and shows what it understood). Centre: five candidate cards (score, 2–3 explanation lines, mini-histogram, play). Selecting a card loads it into the **step grid editor**: rows per instrument, columns per step, velocity by brightness, drag to paint, per-step micro-timing nudge, per-instrument mute/solo/gain/pan mixer, swing control, transport with lookahead scheduler (Tone.js `Transport`). Buttons: Regenerate (keeps locked rows), Save, Export MIDI.
3. **Analyze** — drop a WAV/MP3 → decode in browser → onset detection (spectral flux + adaptive threshold, our own code) → instrument guess by spectral centroid/flatness bands → quantize to the chosen meter → show waveform with onset markers, the grid, metrics, syncopation heatmap, and "closest grammar" (cosine similarity against all templates). "Send to Compose" seeds generation from the analysed pattern.
4. **Sounds** — kit selector (starter kits per tradition) and **sample uploader**: WAV/MP3/FLAC → assign instrument + velocity band → RMS/peak normalize in browser → stored via the storage interface → kit manifest updated. Uploader shows and requires acceptance of the Sample Contributor License (text from the source document, section "Sample Contributor License Agreement").
5. **Library** — saved projects (name, tradition, tempo, updated), open/duplicate/delete.
6. **About/Docs** — license split, provenance promise, link to master plan.

### Audio
- Tone.js `Sampler` per instrument with velocity layers and round-robins from a kit manifest (`{ instrument: { band: [urls] } }`).
- **Starter kits are produced in-house:** a build script synthesizes each instrument with modal synthesis (sum of damped sinusoids + noise burst, per-instrument parameters, 4 velocity bands × 2 round-robins) and writes WAVs to `apps/web/public/kits/<tradition>/`. Real recordings arrive via the uploader and, later, commissioned sessions. Document this honestly in the UI ("starter kit is synthesized — upload real samples for studio sound").

## `apps/api`
- Express + TypeScript, Zod-validated routes, structured logging, health check.
- Auth: Replit Auth when running on Replit; local email+password accounts otherwise (interface `AuthProvider`).
- Postgres via Drizzle: `users`, `projects` (pattern JSON, tradition, style, tempo, meter, kit id), `samples` (owner, instrument, band, storage key, license acceptance timestamp, sha256), `kits`.
- Storage interface `ObjectStore` with `LocalDiskStore` (dev/self-host) and `ReplitAppStorageStore` (hosted); S3-compatible adapter stubbed for MinIO.
- Routes: `POST /api/analyze` (server-side fallback of the browser analysis for large files), `GET/POST/PUT/DELETE /api/projects`, `POST /api/samples`, `GET /api/kits`, `POST /api/export/midi`.
- Rate limit POST routes; file size limits; MIME sniffing on uploads.

## Self-hosting and CI
- `Dockerfile` (multi-stage: build web, run API serving `apps/web/dist`), `docker-compose.yml` (app + postgres), `.env.example`, `docs/SELF_HOSTING.md`.
- GitHub Actions: `npm ci`, typecheck, `packages/engine` tests, web build.

## Definition of done (Phase 0)
- A visitor can generate five distinct samba or maqsūm grooves, hear them, edit the grid, and download a MIDI that opens correctly in Ableton/Logic/Reaper with the right tempo and time signature (including 10/8).
- Engine tests cover metrics on known patterns (e.g., telecoteco swing window, marcação interlock = 1.0, samāʿī thaqīl skeleton recognized at 10/8), MIDI round-trip, parser in three languages, determinism by seed.
- Analyze detects onsets on a clean drum loop and lands within ±1 step for ≥90% of hits.
- `docker compose up` works from a clean clone; CI green; repo has README (what/why/how to run/how to contribute/licensing), CONTRIBUTING, model-card template, provenance schema.
- Deployed on Replit with a public URL for the 10-musician alpha.

## Explicit non-goals for Phase 0
Harmony/melody, trained neural models, stems rendering, .dawproject, public API keys/billing, collaboration, mobile app, DDSP synthesis. All scheduled in the master plan.
