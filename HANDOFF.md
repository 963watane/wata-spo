# Handoff log

Shared notes between the AI assistants working on this repo (ChatGPT and Claude), newest first.
Before starting: pull the latest `main`, then read this file and `AGENTS.md`.
When you stop: add an entry here and push.

## 2026-11-05 · Codex · Cinematic game interface and walkable floor passages

The owner rejected the framed paper/sage dashboard and supplied visual references for a full game UI,
layered combat and architectural traversal between floors. This pass supersedes that menu treatment.
All compositions, procedural architecture and constellation graphics are original. Existing owner art,
story lines, credits, three.js r160, save key and ACTION_KITS/ACT tuning remain intact.

Changes:
- cinema.css, js/ui.js, both HTML: full-screen illustrated lobby with floating serif navigation,
  chapter action and banner strip; illustrated recruit stage; constellation ticket/reveal/results;
  dark member/squad menus, chapter world path, Tower/Ranked/Boost/reward/settlement surfaces.
  The SVG constellation backdrop is original code-authored art at assets/ui/constellations.svg (7.7 KB).
  studio.css default selector specificity is lowered with :where so the new presentation can override it.
- Recruitment rates show the actual base probabilities per result, with explicit pity exceptions.
  Spark exchange previews the exact featured result and cost before spending; the existing atomic
  sparkExchange rechecks affordability on confirmation. Modal keyboard escape/focus trapping added.
- js/expedition.js: curved coastal waterworks passage, ivory rotunda, teal rails, lamps, elevated stairs,
  animated water and exit arch. Navigation projects onto a continuous path/height; manual input takes
  priority over assisted walking. Court bounds keep movement away from the planted edges and raised
  gallery wings; the north gate leads to the passage. Path clearance also accounts for inside rail bends.
  A compact illustrated exchange stays visible while walking.
- js/action.js: every connected story floor transition has a real illustrated loading phase. It clears
  old foes/effects/scenery, rebuilds the next floor, compiles shaders, then resumes combat. HP/Energy/
  cooldowns carry forward. Loading/travel are excluded from the objective timer. Retry and disposal
  guards prevent duplicate or late wave starts. Standalone Tower/other stage entries also show loading.
- js/environment.js: open colonnades and raised galleries frame combat; different floor inlays and trim
  distinguish successive encounters. Inlays share three small cached alpha textures rather than copying
  full floor maps. Painted scenery textures preload behind the loading screen. Geometry remains cached.
- js/combat-art.js: bounded layered waves, crescents, light spires and lance ribbons wrap larger existing
  casts. High/Low budgets, flash-off normal blending, cached geometry and effect material cleanup.
  Light contact effects and all original damage/range/hit schedules are preserved.
- Isometric camera and screen-relative manual controls; compact circular skill cluster and remaining-
  targets floor objective. Illustrated settlement identifies the actual highest-damage MVP.
- js/help.js and PLAYING.md describe the new passage and loading flow.

Verified in this pass:
- Shared scripts compile together; both HTML script/style lists match. 16 node regression checks pass:
  save migration, exact-cost atomic training, tactic gates, clocks, route projection/heights and
  screen-relative manual input. Existing save key unchanged.
- 54/54 headless campaign runs won at recommended levels (18 stages, seeds 17/42/93).
- Actual rendered Lv3 Tsuna/Sendo/Noah 1-2 run cleared both floors via Auto, including the passage and
  loading screen: 27 seconds, 1194/1204 HP, three stars and Spotlight unlock. This was not a forced win.
- Held the real shader-compile loading boundary to inspect the illustrated Floor 2 screen. On release,
  Floor 2 resumed with the same HP/Energy. Separate intentional compilation-failure audit passed retry,
  exact floor index, carried resources, single scenery root and disposal-before-resume guards.
  The intentionally injected QA compilation error is expected in that audit's console only.
- Four High/Low × flashes on/off layered-effect budget/beam-length/scene-cleanup cases passed.
  Real recruit ticket, ten-card lineup, rare illustration, keyboard continuation and rates table checked.
  Lobby, chapter route, members, squad/tactics, Tower and illustrated victory/defeat rendered.
- Local frame samples: High approximately 137 fps, Low 144 fps, p95 7.1 ms. These describe this computer,
  not certification on all mid-range hardware. Phone landscape layout checked at 844×390.
- No QA server or injected test controls are shipped in the repository.

Remaining limits:
- Simplified shared member rig/recolours and existing boss/Echo art remain; commercial bespoke character
  models, a full animation studio and licensed music are outside this prototype's assets. No claim of
  commercial-game parity. The environment and interface are substantially reworked.
- No complete manual campaign or physical touch-device certification. OS reduced-motion preference was
  not emulated; matching CSS and in-game Low/flash/shake/cut-in branches remain present.
- Publication/source archive status is recorded in the release follow-up once verified.

## 2026-11-04 · Codex · Studio redesign and connected story areas

The owner requested a complete original redesign inspired by the polish of an anime action RPG,
including gameplay/progression changes. This supersedes the rejected Daylight recolour.
Keep WATA SPO's own layout and assets; no Stella Sora assets or copied layouts were used.

Changes:
- studio.css, js/ui.js, both HTML entrypoints: new framed-art lobby, navigation rail, readable chapter
  route, side-by-side encounter preparation, matching recruit/reward/login/member/menu surfaces.
- js/experience.js and js/save.js: exact-cost squad training with HP/ATK previews; free-switching
  milestone tactics (1-2 Spotlight, 1-4 Safe Harbor, 2-1 Relay). Old presets migrate to Balanced.
  Ranked, tutorial and Bracket Run keep their own rules. Save key and existing progress preserved.
- js/environment.js: painted ground and cool slate, rounded planters, original tree/cafe billboards,
  panorama scenery, connected courtyards and passages. Geometry/textures cached; Low has fewer props.
  Eight original generated environment assets under assets/environment/ (each below 500 KB);
  README there records all prompts/provenance. PNGs preserve alpha. No member art was generated/edited.
- js/action.js: manual or assisted forward travel between story encounters; Auto travels too.
  World rebasing keeps collision and skill maths local. Travel and closing dialogue are excluded from
  the star clock. Idempotent result rewards; actual highest-damage MVP uses existing owner illustration.
  Field conversations and Ultimate cut-ins also use the existing illustrated member art.
- js/chibi.js: finer outlines, restrained grounded action poses with anticipation/contact/recovery,
  less squash, lower leap/spin. js/foes3d.js and js/icons.js: hooded enemy silhouettes and matching portraits.
- Combat: quieter bloom/particles, subdued paint residue, bounded/briefly combined damage numbers,
  compact enemy status icons, input buffering near the end of a manual action, explicit Auto state.
- js/story.js: painted story backgrounds, evening context for the opening scene; original visual-novel
  dialogue and member art retained. js/rift.js: illustrated round-clear MVP over the Boost choices.
- js/help.js, js/screens.js, js/live.js: current controls, travel/training/tactic guidance and correct
  90-second/12x-HP Ranked explanation. Original credits are all retained.
- PLAY.cmd/play.cjs/PLAYING.md: optional Node local launcher; original Python launcher remains.

Validation completed:
- All shared browser scripts compile together; both HTML script/style lists match. JS syntax checks,
  diff whitespace and 12 node regression checks pass (migration, cost atomicity, tactic gates, clocks).
- 54/54 headless story runs won: all 18 stages, seeds 17/42/93, Tsuna/Hinano/Lisa at recommended level.
  Compared with previous HEAD 9854283 under identical save/seed: exactly matching 2-3 simulation
  (win/time51/hp90/dmg38377). Earlier log baselines used different save snapshots.
- 11 tactical battle checks passed (four stat/support modifiers + seeded wins, special-mode isolation).
- Actual rendered starter-profile 1-2 clear with Lv3 Tsuna/Sendo/Noah, Auto: traversed both areas,
  won with >90% HP, 19-second result, three stars and Spotlight unlock. Closing dialogue was left open
  substantially longer; its reading time did not inflate the result. No forced victory for this check.
- Real fresh onboarding in plain production entrypoint reached the first victory, after-story,
  starter choice/recruit, then persisted the owned starter and subsequent training across reloads.
- Keyboard ticket launch, card reveal, illustrated recruit continuation and rewards; exact 900-token
  three-member upgrade; insufficient-funds disabled state; desktop and 844x390 layouts checked.
- Actual Bracket Run round reached victory and the illustrated Boost screen. Tower/Ranked menus reviewed.
- Local eight-second frame sample at 844x390 High: 144 fps, p95 7.1ms. This is this computer only,
  not certification on every mid-range laptop. Post-process draw-call counters were not a scene benchmark.

Limits / next work:
- No complete manual campaign playthrough or every special-mode payout checked. OS-level reduced-motion
  preference was not emulated; CSS and Low/flash/shake/cut-in branches are present. Continue real-device QA.
- Member models still share the simplified original rig/recolours; elbow stretch is reduced by the poses,
  not eliminated. Echo/boss models retain their earlier designs. Music slots still need licensed tracks.
  This is a much improved browser fan-game prototype, not commercial-game art/animation parity.
- Legacy hall-building helpers remain unused in action.js as a fallback reference. Current buildArena
  delegates to SpoEnvironment. Do not remove shared texture/geometry helpers without checking usages.
- QA buttons/servers/screenshots live outside the repo and are not part of the shipped game.
- Publication and final archive/link status will be recorded in the follow-up entry after verification.

## 2026-11-04 · Codex · Combat payoff and results

Next visual pass in js/action.js and action.css:
- Cached four/eight-point contact sprites distinguish light and heavy hits; bounded hit emission,
  smaller particle counts on Low, dim normal-blended contact marks when flashes are disabled.
- Break labels capped at three, clamped away from screen edges, with a separate single cue for
  boss Breaks/charge cancellations. Reduced Break particle load and white glare.
- Perfect Dodge gets a compact dedicated cue explaining energy and cooldown gains; its existing
  slow motion, rewards and timing are unchanged.
- Results have a stage header, readable objectives/rewards, portrait damage bars and a scrolling
  body with fixed action buttons. Removed the inaccurate leader-as-MVP label. Default action gets
  keyboard focus. Leader now faces the results camera instead of sometimes showing her back.
- Reduced-motion CSS disables new cue/panel/bar animations. No new assets, dependencies or tuning.

Checked: JS syntax and diff whitespace; eight impact cases across High/Low, flashes on/off and
light/heavy (emission caps and scene cleanup); real rendered combat cue; desktop victory;
844x390 Low victory/defeat, keyboard Continue, camera-facing fix. Browser console clean.
Fresh seeded 2-3 simulation exactly matches the earlier baseline: win/time49/hp85/dmg36340.
The results demonstrations deliberately force win/loss in the local-only QA harness; they are
layout checks, not campaign clears. No production saves touched by the harness.

Still to test: full campaign, actual device frame-rate benchmark, OS reduced-motion preference,
and all special-mode result payloads (raid/event/tower). Arena/model-art limitations remain below.
Local preview: http://127.0.0.1:8768/ while the preview server is running. QA files stay outside repo.
Git fetch still cannot connect to GitHub from this environment; commits remain local until published.

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
