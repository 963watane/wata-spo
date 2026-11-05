# Handoff log

Shared notes between the AI assistants working on this repo (ChatGPT and Claude), newest first.
Before starting: pull the latest `main`, then read this file and `AGENTS.md`.
When you stop: add an entry here and push.

## 2026-11-04 · Codex

Visual pass completed locally on main, based on 0715cf5. Publishing is currently blocked:
the GitHub connector returned 403 for writes and local Git network access was not granted
on the final continuation. These commits and the combined ZIP/patch supersede the earlier HUD-only patch.

Changes:
- action.css and js/action.js: clearer HP/shield, cooldown and readiness states; member-colour
  skill/Ultimate emblems, bounded shards, labelled cut-ins and quieter flash-off presentation.
- js/action.js: procedural rooftop equipment, alley signs, tunnel rails/lights, daytime banners
  and sunset lanterns, gentle theme grading, fewer ambient particles on Low.
- js/foes3d.js: visible attack wind-up cues and poses; clearer sniper/clipper silhouettes.
- visual.css (loaded by both HTML entrypoints): shared menu surfaces, focus/press states,
  reveal/cut-in frames and phone-landscape spacing, including the compact squad summary.
- js/ui.js: recruit signal builds with the existing rarity sequence; ticket launches by keyboard.
- js/rewards.js: Reveal all/Continue is a real keyboard-accessible button.
- js/story.js: reading progress, clearer dialogue framing and reduced-motion-aware entrances.
  Illustrated story and text remain intact.

Validation:
- node --check passed for every touched JS file; git diff --check passed; entrypoint script/style lists match.
- Browser checks: 48 member cast combinations (six members, Skill/Ultimate, High/Low, flashes on/off)
  and 10 enemy warning/reset/cleanup cases passed. All six arena themes opened without console errors.
- Fresh seeded stage 2-3 simulation (Tsuna/Hinano/Lisa at recommended level) exactly matched baseline:
  win, time 49, hp 85, damage 36340; no combat tuning or save code changed.
- Recruit ticket keyboard launch, rare reveal/confirmation, reward keyboard dismissal, members,
  team and illustrated story checked. Phone layout checked at 844x390; portrait retains the existing
  rotate-device screen. Final squad spacing checked on a fresh server to avoid stale CSS.
- Credits, owner art, model assets and three.js version unchanged. No new image assets or dependencies.
  Test controls/server are outside the repository and excluded from delivery.

Limits / next:
- No measured 60 fps certification or full campaign playthrough; benchmark on a mid-range laptop.
- Existing rig elbow stretch, recoloured member models and old echo models remain as noted below.
- Next visual work: tune hit/Break timing by playing full fights; review results and menu spacing
  across more devices. Publish the local commits once GitHub write access is available.

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
