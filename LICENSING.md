# Licensing

Rhythmath is open source under a split license, chosen so the engine spreads as widely as possible while the platform stays open:

| Path | License |
|---|---|
| `packages/engine/`, `packages/sdk/` | Apache License 2.0 — embed it in anything: plugins, games, research, commercial products. |
| Everything else (`apps/web`, `apps/api`, inference server, training scripts, benchmarks, docs) | GNU Affero General Public License v3.0 — self-host and modify freely; if you run a modified version as a network service you must publish your changes. |

A commercial license for the AGPL-covered parts is available for organizations that cannot comply with the AGPL. Open an issue or contact the maintainers.

## Models and data

- Published model weights: Apache License 2.0, each with a model card listing the exact training corpus.
- Datasets: this repository never contains audio or MIDI corpora. `datasets/` holds manifests and `provenance.json` records (source, license, attribution, SHA-256, import date) so every training asset is traceable.

## Hard rule

No third-party AI APIs are used anywhere in Rhythmath — not for analysis, generation, rendering, or prompting. Every model is trained in-house from provenance-tracked data.
