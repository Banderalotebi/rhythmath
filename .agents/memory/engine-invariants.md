---
name: Engine design invariants
description: Non-obvious rules behind lib/engine that downstream code (web, API) must keep honouring
---
- Determinism: everything musical derives from a seed (mulberry32) or a content hash (hashString/patternId). No Math.random anywhere in engine, synth or UI music logic.
  **Why:** reproducible generations are a product promise (share a seed, get the same groove) and make tests stable.
- Meter is data: steps per bar = beatsPerBar * stepsPerBeat (2/4 samba = 8 steps, 10/8 samāʿī = 20). Never assume 16.
- Tempo is always quarter-note BPM; x/8 meters convert via beatSeconds(). MIDI ticks per step = ppq*(4/beatUnit)/stepsPerBeat.
- pattern.swing (0.5..0.75) is a playback parameter; humanised timing lives in event.microOffset. Do not bake swing into offsets.
- ScoreBreakdown.total is already 0..100. The first design pass multiplied it by 100 in the UI — watch for that regression.
- Grammar templates carry source: "standard reference, to be validated in alpha". Musician validation is a pending alpha step; do not present templates as verified.
- Spec parser is a deterministic alias matcher (EN/PT/AR) that reports unparsed tokens and confidence; it must never guess. Arabic text is normalised (tashkeel stripped, alef/ta-marbuta unified, Arabic-Indic digits mapped).
**How to apply:** when adding grammars, metrics, exports or UI controls, check each bullet before shipping; add a vitest case in lib/engine/src/engine.test.ts.
