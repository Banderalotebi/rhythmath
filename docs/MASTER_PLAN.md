# Rhythmath — Master Plan

**An open-source, in-house music engine: the most controllable, legally clean, and culturally literate AI music generator.**
Consolidated from the six-phase plan you brought (≈10,000 lines, half of it duplicated), a fresh read of the market as of September 2026, and your rule: fully open source, every tool built in-house, no third-party generation APIs.

---

## 0. The verdict — read this first

Your document describes a real and unusual product: an engine that understands rhythm as mathematics, renders sound from physics, and trains only on data you have the rights to. What it does **not** describe is "the best AI music generator in the market" in the way most people hear that phrase. Suno V5 with Studio 2.0, Udio, Google Lyria 3, MiniMax and others generate full songs with vocals from one sentence, on models built with hundreds of millions of dollars. Racing them on "type a prompt, get a radio song" is unwinnable for a small team — and with the current lawsuits, not even desirable.

"Best" *is* winnable on five axes where every incumbent is structurally weak:

1. **Control.** We generate music as data (every hit, note, chord and micro-timing offset), so everything is editable and any layer can be regenerated while the others stay locked. Suno's MIDI is extracted from finished audio after the fact; ours is the source of truth.
2. **Legal cleanliness.** 100% provenance-tracked training data: commissioned sessions you own plus CC-licensed public datasets. Sony sued Udio again in July 2026 over 30,000 recordings scraped from YouTube; SOCAN sued Suno in September 2026. Games, brands, agencies and labels need a generator they can actually indemnify.
3. **Cultural literacy.** Rhythm-first and microtone-capable: Rio batucada, Arabic iqāʿāt and maqām, Afro-Cuban clave, odd meters. 2026 research still calls maqām music "among the traditions most underserved by generative music models." The math in your plan (rhythm grammars, polyrhythm detection, Tonnetz) generalizes to these systems natively; a diffusion model trained on Western pop does not. Saudi music streaming alone is ≈$700M in 2026, heading to $1.7B by 2031.
4. **Real time and cheap.** Symbolic generation runs in the browser in milliseconds, so there are no credits and no queues. That unlocks adaptive music for games and apps, live performance, and education — use cases a 60-second diffusion render cannot serve.
5. **Open and inspectable.** The whole stack — analysis, grammars, models, training scripts, renderer, benchmarks — is open source and built in-house. No call ever leaves the app to Suno, Udio, OpenAI or anyone else. Anyone can audit what it learned from, reproduce a model, or run it on their own machine. None of the incumbents can say that, and the open-weight audio models that exist (ACE-Step, MusicGen, Stable Audio Open) are full-song black boxes with no symbolic control and no provenance story.

The thesis in one line: **Suno is a camera. Rhythmath is an instrument — and the instrument's blueprints are public.**

---

## 1. Ground rules (your constraints, made explicit)

- **Fully open source.** The code, the grammars, the training scripts, the evaluation suite and the model weights are published. Recommended licensing in section 6.
- **Built in-house.** Every model is trained by us on data with known provenance. Every tool in the pipeline lives in our repository.
- **No third-party AI APIs.** No Suno, Udio, OpenAI, Google or similar API anywhere in analysis, generation or rendering. Not in the product, not in the build pipeline.
- **Open-source libraries are building blocks, not brains.** Tone.js, Meyda, PyTorch, ONNX Runtime and similar are fine — they are open, run locally, and do not generate music for us.
- **Self-hostable.** One command runs the whole thing on a laptop or a server. The hosted version on Replit is a convenience, not a dependency.

---

## 2. Market reality, September 2026

| Player | What they do well | Where they are weak (our opening) |
|---|---|---|
| Suno V5 + Studio 2.0 | Full songs with vocals, up to 12 time-aligned stems, MIDI export, browser DAW, Warner Music deal | Closed; MIDI is post-hoc extraction; credit-based; SOCAN lawsuit; generic in non-Western idioms |
| Udio | High-fidelity songs, inpainting, extension | Closed; Sony lawsuit (30k scraped recordings); download terms in flux |
| Google Lyria 3 / Lyria RealTime | Quality; real-time streaming variant | Closed; limited control and export; generic idioms |
| Stable Audio, ElevenLabs Music, MiniMax, Mureka | Sound design, SFX, songs | Same black-box pattern, same licensing questions |
| Open-weight models (ACE-Step, MusicGen, Stable Audio Open) | Free to run locally | Full-song audio black boxes; several have non-commercial weight licenses; no symbolic control, no provenance, no product |
| Splice, Output, LANDR | Sample marketplaces with AI assistants | No generation engine of their own |

**Not in the market:** an open-source, controllable, explainable, licensable, culture-aware symbolic + physics music engine with a developer API. That is the seat we take.

---

## 3. Who it is for, in order

1. **Producers and beatmakers** (samba, Arabic, Afro-Latin, hip-hop) who want authentic grooves as MIDI and stems inside their DAW.
2. **Developers** (games, fitness, meditation, ad-tech, kids' apps) who need adaptive, royalty-safe music through an API or an embeddable open-source SDK, in real time.
3. **Educators, researchers and institutions** (music schools, national music bodies, samba schools, MIR labs) who want analysis, visualization, reproducible models and stylistically correct material.
4. **Brands and agencies** that need licensable music with an audit trail.

Consumers who want "a song about my dog" with vocals are not our user in v1. That is Suno's market and they can keep it for now.

---

## 4. Product definition — five pillars

| Pillar | What the user gets |
|---|---|
| **Analyze** | Upload audio or MIDI → onsets, instrument classes, tempo, swing ratio, syncopation, polyrhythm ratio, style fingerprint ("carnaval caixa, cortador surdo, 0.72 confidence"), harmonic path |
| **Generate** | Style or prompt → 100 candidates → scorer → top 5, each with a plain-language "why". Rhythm first; then bass, harmony, melody, arrangement |
| **Edit** | Everything is data: step grid, velocity, micro-timing, instrument, chord, contour. Regenerate any layer while the others stay locked |
| **Render** | Multi-sample libraries (commissioned and user-uploaded) → later physics-based modal synthesis; learned micro-timing; learned room impulse responses |
| **Export / API / SDK** | MIDI, per-instrument stems, .dawproject, WAV; REST API with keys and webhooks; open-source JavaScript SDK for real-time adaptive music |

**The unified pipeline** (kept from your document — it is right):

```
Prompt or spec  →  GRAMMAR LAYER      rhythm template · harmony skeleton · melodic contour
                →  GENERATIVE LAYER   in-house rhythm model · voice-leading optimizer · melody CSP
                →  RENDERER           samples / modal synthesis · micro-timing · room
                →  SCORER             100 candidates → score → novelty filter → top 5
                →  MIDI + stems + project file + scores
```

**Natural-language front door, in-house.** No LLM API. A deterministic *music-spec parser* — a multilingual lexicon (English, Arabic, Portuguese) plus grammar rules — turns "samba at 132 BPM in D minor with a melodic break" into a strict JSON spec: tempo, meter, key or maqām, style, energy curve, structure. It is small, testable, instant, and it never hallucinates a tempo. If we ever want free-form conversation, we run a small open-weights model locally inside our own stack; it still only emits the spec, never audio.

---

## 5. Architecture and stack (consolidated, all open source)

| Layer | Choice | Why |
|---|---|---|
| Client | React + Vite + TypeScript + Tailwind; Tone.js for playback; onnxruntime-web for in-browser inference; SVG/Canvas visualizations (three.js for the Tonnetz later) | Instant generation, zero server cost per pattern |
| Engine | A pure TypeScript package `@rhythmath/engine` shared by client and server: representations, grammars, metrics, scorer, humanization, harmony math, spec parser, MIDI I/O | This is the IP. Dependency-light, unit-tested, runs anywhere |
| API | Node 20 + Express (TypeScript), Zod validation; Server-Sent Events for progress; BullMQ + Redis for long jobs from Phase 1 | Boring, reliable, Replit-native |
| Analysis | Meyda for spectral features, our own spectral-flux onset detector (already written in your Phase 4), essentia.js (open source) as an optional upgrade; Python (librosa/madmom) only for offline corpus work | Keeps the deployable app in one language |
| ML | PyTorch training scripts in the repo → ONNX; small models run in the browser, larger ones behind our own GPU endpoint (FastAPI + onnxruntime-gpu, also in the repo); model registry with metrics and model cards | Never train on Replit CPU; anyone can reproduce a model |
| Data | Postgres via Drizzle ORM; S3-compatible object storage for samples and models (Replit App Storage when hosted, MinIO when self-hosted); `provenance.json` beside every asset | Cheap, auditable, portable |
| Auth and billing | Replit Auth for the hosted version, local accounts for self-hosting; Stripe only on the hosted service, behind a feature flag | The open-source app runs with neither |
| Ops | Replit Autoscale deployment; Sentry and PostHog (both open source and self-hostable) | OpenTelemetry/Grafana only after 1k users |

Repository layout (monorepo): `packages/engine`, `packages/grammars`, `packages/sdk`, `apps/web`, `apps/api`, `apps/inference`, `training/`, `datasets/` (manifests and provenance only, never audio), `benchmarks/`, `docs/`.

---

## 6. Open-source strategy

| Asset | License | Reasoning |
|---|---|---|
| `@rhythmath/engine`, grammars, SDK | Apache-2.0 | Maximum adoption: plugin developers, game studios and researchers can embed it without friction |
| Web app, API, inference server | AGPL-3.0 (with a commercial license available) | Anyone can self-host and modify; nobody can run a closed SaaS clone without contributing back or paying. This is the Plausible / Cal.com / Grafana playbook |
| Model weights | Apache-2.0, published with a model card listing the exact corpus | Open weights are the proof that "legally clean" is real |
| Training scripts, benchmark suite | Apache-2.0 | "Best" must be reproducible by strangers or it is marketing |
| Datasets | Manifests + provenance published; CC assets referenced by URL; a subset of commissioned recordings released as CC BY 4.0 to seed the community, the full multitrack kept for the hosted service and licensed sample packs | Your call — see decisions below |

Governance from day one: public roadmap, `CONTRIBUTING.md`, model cards, reproducible training, a public benchmark leaderboard for rhythm authenticity, and GitHub Actions running the engine tests on every pull request. Your GitHub account is already connected here; the repository can be created the moment we start.

---

## 7. What to keep, change and cut from the six-phase plan

### Keep (this is the moat)

- Rhythm as a point process; histogram, syncopation, swing, interlocking and cross-rhythm metrics.
- The batucada grammar and bateria classifier — and generalize it into a **Grammar Registry** (samba, iqāʿāt, clave, …) so every new tradition is data, not code.
- **100-candidate generation + scorer re-ranking.** The single biggest quality lever and it needs no training. It ships in week 1.
- Learned micro-timing and velocity from Groove MIDI / E-GMD.
- Real multi-sample engine: velocity bands, round-robins, signed URLs.
- MIDI, stems and .dawproject export.
- Provenance-first data pipeline, the commissioned-recording brief, the sample-contributor license.
- API-first business model with no credits.
- Harmony math (pitch-class sets, Tonnetz/PLR, Krumhansl key finding) — extended beyond 12-tone equal temperament for maqām.

### Change

| In the document | Do instead | Why |
|---|---|---|
| Hand-written FFT, k-means, DBSCAN, PCA, DTW, MIDI-file writer, DAWproject XML | Maintained open-source libraries (fft.js, ml.js, @tonejs/midi, an XML builder). Test the math; do not re-derive it | Saves roughly three weeks; the moat is the grammar and the data, not the FFT |
| A GRU ("nanoMPC") as the centrepiece from day one | v1 = grammar + Markov + scorer (ships week 1). v2 = our own small transformer trained on Groove MIDI + E-GMD + your corpus, exported to ONNX (Phase 1) | Quality first from structure, then from learning |
| essentia.js / aubiojs WebAssembly on the server | Meyda + our onset detector in TypeScript; Python worker only for offline corpus jobs | Fewer moving parts in production |
| Prisma | Drizzle | Replit-native and lighter. Either works — pick one and stop |
| Cloudflare R2 | S3-compatible storage behind one interface: Replit App Storage hosted, MinIO self-hosted | Self-hosting must work without a Cloudflare account |
| An LLM API for prompts | In-house music-spec parser (section 4) | Your no-external-API rule, and it is better engineering anyway |
| "Web app free forever, meter only the API" | Keep free generation and playback; gate hosted extras (stems rendering, .dawproject, storage, GPU models) behind a Creator tier | Producers should be able to pay you too — and self-hosters get everything |
| Samba only | Samba first, with the registry designed for a second tradition from day one (recommendation: Arabic iqāʿāt) | Two underserved markets, one engine |

### Cut or defer

- Yjs real-time collaboration → Phase 4. Not differentiating; complexity tax.
- React Native mobile app → Phase 4. The web app must simply work well on phones.
- DDSP modal synthesis and VAE room impulse responses → Phase 3. Research-grade; good samples get you 90% of the way.
- Termux prototype → retire.
- Full OpenTelemetry / Prometheus / Grafana → Sentry + PostHog until the traffic justifies more.
- Public API v1 at launch → weeks 7–12, after the web product proves activation.

---

## 8. Roadmap

### Phase 0 — "The Groove Engine" (weeks 1–2): ship something musicians use

**Goal:** a musician generates authentic samba grooves, hears them with real samples, tweaks them and exports MIDI — free, in the browser, from a public repository.

Deliverables:
- Public repo, licenses, README, CONTRIBUTING, CI running engine tests.
- Engine package: `DrumPattern` model on a 16/32-step grid; histogram, syncopation (Longuet-Higgins & Lee), swing ratio, interlocking strength; batucada grammar (surdo, caixa, repinique, tamborim, agogô templates); Markov variation generator; scorer v0 (density, interlocking, syncopation target, grammar fit, novelty); 100→5 pipeline; spec parser v0.
- Humanization v0: hand-tuned micro-timing and velocity distributions per instrument.
- Playback: Tone.js sampler with a CC0 starter kit (velocity layers), mixer (gain, pan, mute), step-grid editor with velocity.
- Analysis v0: upload a loop → onset detection → class guess → grid → metrics + syncopation heatmap.
- Accounts, saved projects, MIDI export, landing page with a demo pattern. `docker compose up` for self-hosters.

**Exit criteria:** 10 musicians in private alpha; ≥60% say the grooves "sound like samba"; first loop in under 3 seconds; MIDI round-trips into Ableton and Logic; a stranger can clone and run it.

### Phase 1 — "Understanding" (weeks 3–6): the engine learns from real recordings

- Physics features (STFT, centroid, flatness, inharmonicity, ADSR) via libraries; Corpus Explorer with clusters and a 2D projection.
- Bateria classifier and style fingerprint; Bateria Lab visualization (rings per instrument, animated cross-rhythm ratio, swing bars).
- Learned humanization from Groove MIDI / E-GMD: per-style micro-timing and velocity distributions.
- Rhythm model v1: our own small transformer, trained with the repo's scripts on any GPU → ONNX in the browser, grammar-conditioned; A/B-tested against Markov with the scorer and human ratings. Weights published with a model card.
- Sample library on object storage with signed URLs; user sample uploader with contributor license and loudness normalization.
- Stems export; job progress over SSE.
- **Second grammar: Arabic iqāʿāt** (maqsūm, baladī, ṣaʿīdī, malfūf, waḥda, samāʿī thaqīl in 10/8, Khaleeji/sāmrī in 6/8, ʿarḍah) — if approved.

**Exit criteria:** style classifier ≥85% on held-out data; blind test — percussionists prefer our samba over Suno's ≥60% of the time; 100 saved projects; first outside contributor merged.

### Phase 2 — "From groove to music" (weeks 7–12)

- Harmony engine: pitch-class sets, Tonnetz/PLR distance, key finding; functional-harmony grammar; voice-leading optimizer (shortest path by dynamic programming).
- Melody: contour model + constraint-based realization over the chord scaffold; maqām mode with jins-based scales in 24-TET and sayr (melodic path) rules.
- Bass generator locked to the drum grammar; arrangement engine (intro, verse, break, chorus as an energy curve; paradinhas as structural events).
- Instruments beyond drums: multi-sampled bass, keys, cavaquinho, oud, qanun.
- .dawproject export; spec parser v1 in English, Arabic and Portuguese.
- Public API v1 (keys, rate tiers, webhooks, OpenAPI); open-source JavaScript SDK; Stripe billing on the hosted service; Creator and Pro tiers.

**Exit criteria:** a full 8-bar arrangement (drums, bass, chords, melody) from a prompt in under 5 seconds; first paying users; three developers building on the API or SDK.

### Phase 3 — "Realism and moat" (months 4–6)

- Commissioned sessions: a Rio bateria (brief already drafted) and a Saudi or Egyptian percussion ensemble (riq, darbuka, tabla baladi, daf/tar, doholla) — same four-microphone + MIDI-trigger specification.
- Physics-based modal synthesis per commissioned drum; learned room impulse responses; fractional-sample onset placement.
- Model registry, public model changelog, evaluation harness (automated metrics + human panels), public leaderboard.
- Adaptive-music SDK for games and apps: tempo, energy and section control in real time.

**Exit criteria:** "sounds like a live recording" ≥70% in blind tests; API revenue growing faster than web revenue; dataset ownership fully documented.

### Phase 4 — "Scale" (months 6–12)

Mobile app (Expo), Yjs collaboration, sample-contributor marketplace with revenue share, enterprise features (SSO, DPA, on-prem inference), more grammars (Afro-Cuban, West African, Indian tāla, flamenco compás).

---

## 9. Data and legal strategy

| Tier | Source | License | When |
|---|---|---|---|
| 1 | Groove MIDI, E-GMD (Magenta) | CC BY 4.0 | Now |
| 1 | Freesound single hits | CC0 | Now |
| 1 | OpenAIR room impulse responses | Free, professionally recorded | Phase 3 |
| 2 | Commissioned multitrack sessions, work-for-hire, MIDI triggers on every drum | You own it | Phase 3 — $2.5k–6k per 4-hour session; two ensembles ≈ $10k all-in |
| 3 | Curated CC audio (archive.org, Free Music Archive, ccMixter) with a per-item `provenance.json` | Per item | Phase 1–2 |
| Never | YouTube scraping | — | The other AI was right; the 2026 lawsuits are exactly about this |

Every training asset carries a SHA-256, license, attribution and import date. The model card lists the corpus. Because the weights and the manifests are public, this is verifiable by anyone — a sales feature, not just compliance.

The Sample Contributor License Agreement from your document ships with the uploader in Phase 1, not after.

---

## 10. The scoreboard — how we know it is the best

| Metric | Target | By |
|---|---|---|
| Style authenticity (blind test with musicians) | ≥60% prefer Rhythmath over Suno/Udio for samba and iqāʿāt grooves | Phase 1–2 |
| Editability | 100% of output available as MIDI + stems + project file | Phase 0–1 |
| Latency | Groove < 3 s in the browser; full arrangement < 5 s | Phase 0 / 2 |
| Style classifier accuracy | ≥85% on held-out recordings | Phase 1 |
| Provenance coverage | 100% of training data, publicly verifiable | Always |
| Reproducibility | Any published model retrainable from the repo within one day on one GPU | Phase 1 |
| Activation | ≥40% of sign-ups generate 10+ patterns | Phase 0–1 |
| Ecosystem | 3 external apps on the API/SDK by end of Phase 2, 25 by end of Phase 3; 10 outside contributors by month 6 | Phase 2–3 |

---

## 11. Business model — open source plus hosted

The code is free; convenience, compute and content are the business. Same playbook as Supabase, Plausible and Cal.com.

| Tier | Price | Includes |
|---|---|---|
| Self-hosted | $0 | Everything, forever. `docker compose up` |
| Hosted Free | $0 | Unlimited generation and playback in the browser, MIDI export, 3 saved projects |
| Creator | $9/mo | Stems rendering, .dawproject, unlimited projects, cloud storage, all styles as they ship |
| Pro | $49/mo | API at scale, webhooks, custom sample libraries, GPU-hosted larger models, priority support |
| Studio | $199/mo | SLA, dedicated inference, SSO, team keys |
| Enterprise | Custom | Custom models on their data, white-label, DPA, security review, commercial license for the AGPL parts |

- **No credits, no per-generation pricing.** Possible because generation is symbolic and nearly free to serve — and a marketing weapon against credit-based incumbents.
- Additional lines: licensed sample libraries and datasets from the commissioned sessions; institutional licenses for music education in Saudi Arabia and Brazil; support contracts.
- The moat in an open-source business is not the code. It is the dataset you own, the community that forms around the grammars, the benchmark everyone cites, and the hosted product that just works. Optimize for those four.

---

## 12. Risks and what we do about them

| Risk | Mitigation |
|---|---|
| "Sounds like a drum machine" | Scorer + humanization + real samples in Phase 0; physics synthesis in Phase 3 |
| Over-building math from scratch | Libraries for the commodity math; effort goes into grammars, scorer and data |
| Suno keeps expanding into control (Studio 2.0) | They extract structure from audio; we generate structure natively. Stay symbolic-first, culture-first and open, and move fast in the niches |
| Someone forks and out-ships us | AGPL on the platform, Apache on the engine; the dataset, the community and the hosted product are the moat |
| Data acquisition slips | Phases 0–2 need zero commissioned data |
| One-person bandwidth | Replit Agent builds the software; your time goes to musicians, data, contributors and distribution |
| Uploader without a license | The Contributor License Agreement ships with the uploader |

---

## 13. The first two weeks on Replit — sprint plan

| Days | Build |
|---|---|
| 1–2 | Public GitHub repo, licenses, CI; monorepo; `@rhythmath/engine` with tests: pattern model, metrics, batucada grammar, Markov generator, scorer, spec parser |
| 3–4 | Step sequencer UI, Tone.js sampler with starter kit, mixer |
| 5–6 | Generate 100 → 5 flow; candidate cards with scores and plain-language "why"; humanization |
| 7–8 | Analysis: upload → onsets → grid → metrics → syncopation heatmap |
| 9–10 | Auth, saved projects, MIDI export, landing page, deployment, `docker compose` for self-hosting |
| 11–14 | Private alpha with 10 musicians; measure; fix |

### Decisions (locked September 17, 2026)

1. **Second tradition:** Samba + Arabic iqāʿāt/maqām. The grammar registry supports both from day one; Arabic templates land in Phase 0 as v0 data and are validated with musicians in Phase 1.
2. **Licensing:** Apache-2.0 for `packages/engine` and `packages/sdk`; AGPL-3.0 for the platform (web, API, inference server). Commercial license available for the AGPL parts.
3. **Commissioned recordings:** open — decide before the Phase 3 sessions are booked. Default: release a CC BY 4.0 subset, keep the full multitrack for the hosted service and sample packs.
4. **Working name:** Rhythmath. Repository: github.com/Banderalotebi/rhythmath (public).
5. **Vocals:** out of scope for v1 — "instrumental, editable, open, yours."
6. **Hard rule:** no third-party AI APIs anywhere. Every model is trained in-house from provenance-tracked data.
