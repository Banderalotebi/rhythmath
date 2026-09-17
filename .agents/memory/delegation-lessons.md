---
name: Delegation lessons
description: What went wrong/right when delegating work in this project
---
- The design subagent, when asked to build pages before the engine/audio modules existed, produced shallow pages and 1-line stubs for every module it could not import (audio engine, kits, export, licence). 
  **Why:** it cannot block on missing dependencies, so it fabricates the minimum to compile.
  **How to apply:** write and typecheck the engine/audio/API contracts first, then delegate UI with explicit file paths to the real modules and an explicit "no stubs, no placeholders" instruction; check for placeholder text (grep "coming next", "stub") before accepting.
- GitHub Contents-API uploads must be sequential; parallel PUTs on the same branch produce 409 conflicts.
