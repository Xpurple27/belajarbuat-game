# Hero Visual Pipeline

The runtime hero API is intentionally `characterId + state` so generated sprite atlases can replace the procedural SVG renderer without changing gameplay logic.

Locked hero IDs:
- `nova`: male student-adventurer / tech runner
- `lyra`: female student-adventurer / puzzle scout

Locked animation states:
- idle
- think
- correct
- wrong
- pull
- run
- attack
- hurt
- celebrate
- lose

Planned sprite-gen flow:
1. Produce one approved base still per hero.
2. `sprite-gen prepare` / `gen-set` for the locked state rows.
3. `extract` and `compose-atlas` to obtain transparent atlas + frame-layout manifest.
4. QA loops in curation/contact sheets.
5. Export Phaser-ready atlas; swap renderer behind the existing `PixelAvatar` API.

The current procedural pixel heroes are the fallback/runtime baseline until the generated atlases pass motion QA.
