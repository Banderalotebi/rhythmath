# Contributing to Rhythmath

Thanks for helping build an open, culturally literate music engine.

## Ground rules
- No third-party AI APIs, anywhere. Pull requests that call hosted models (Suno, Udio, OpenAI, Google, etc.) will not be merged.
- No audio or MIDI corpora in the repository. Reference data by manifest with full provenance.
- Grammars are data: new rhythmic traditions go in `packages/engine/src/grammars/*.json` with a `source` field for every template and, ideally, a musician who validated it.
- Engine code is pure TypeScript with no DOM or Node dependencies and must be covered by tests.

## Workflow
1. Open an issue describing the change (bug, grammar, feature).
2. Fork, branch, and keep pull requests focused.
3. `npm ci && npm test` must pass; CI runs typecheck, engine tests and the web build.
4. By contributing you agree your code is licensed under the license of the directory it lives in (see LICENSING.md).

## Adding a rhythmic tradition
Open an issue with: tradition name, meter(s), instruments and strokes, canonical patterns with a citable source, tempo range, and what "authentic" means to players of that tradition. We will pair with you on the grammar file and the scorer constraints.
