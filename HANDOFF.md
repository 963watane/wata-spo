# Handoff log

Shared notes between the AI assistants working on this repo (ChatGPT and Claude), newest first.
Before starting: pull the latest `main`, then read this file and `AGENTS.md`.
When you stop: add an entry here and push.

## 2026-11-04 · Claude

State: the same game as the online Version 21 (the claude.ai link).

Recent work:
- 3D models: Sendo uses the CC BY 4.0 model in `assets/models/` (`claude-child.gltf.json` + `.jpg`), simplified
  and rigged with `tools/model-prep.html` and animated through its bones by `Chibi.apply()` in `js/chibi.js`.
  The other five members wear recoloured copies (`"tint"` in `assets/models/models.json`) with their own
  extras (`GLB_EXTRAS`) and weapons. The model ships as `.gltf.json` because the online host won't serve `.glb`.
- Rendering: anti-aliasing on High graphics, a detailed 2048px stone floor, a city skyline behind story scenes,
  light shafts in indoor arenas, an arena-coloured rim light, see-through warning zones with crisp edges,
  at most one Break flash at a time.
- Combat feel: enemies get launched (with a 3 s cooldown so it doesn't change difficulty), defeated enemies fly
  off, melee weapons leave swing trails, dodges leave afterimages, damage numbers are italic with an outline.

Known issues / not done:
- The rigged model stretches a little in the inner elbow during big forward arm swings.
- Echo enemies (holograms of the squad) still use the old chibi shapes.
- The five non-Sendo members are recolours of one model, not their own designs.
- No music yet (`assets/music/` only has a README).
- Stage 3-6 is hard for squads without a damage dealer.
- In some embedded browsers `sw.js` fails to register (harmless).

Ideas next: per-member Skill and Ultimate effects, HUD polish, a stronger identity for each arena theme,
a more dramatic recruit reveal (see `CHATGPT_BRIEF.md`).
