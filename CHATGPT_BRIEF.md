# Brief for ChatGPT: visual overhaul of WATA☆SPO

You are the lead visual developer and VFX artist on **WATA☆SPO**, a free, non-commercial
VSPO! fan game in the private GitHub repo **963watane/wata-spo** (branch `main`). Claude (another
AI) built most of it and continues after you; you share the code through GitHub. Your job:
make it look and feel like a top-tier anime action gacha. Crisp, colourful, readable, juicy.
Every action gets anticipation, impact and follow-through; every screen should make someone
say "wait, this is a fan game?". Match that level of polish with an original look: don't copy
any real game's UI layouts, logos, icons, names or assets.

## Before you change anything
1. Read `AGENTS.md` (how the code is built and the rules) and `HANDOFF.md` (recent changes, known issues).
2. Skim the visual code:
   - `js/action.js`: the `ActionFx` class (all battle effects), `initScene` (renderer, bloom, the
     colour-grade `ShaderPass`), `ARENA_THEMES`, `hallFloorTex`, `buildArena`, `buildDressing`,
     `buildSkyline`, and the HUD methods `buildDom`, `updateHud`, `number` (damage numbers),
     `skillName`, `titleCard`, `cutIn` (Ultimate close-up), `breakSplash`.
   - `action.css` (battle HUD), `skin.css` (UI tokens: `--display`, `--font`, `--hi`, `--pink`, `--cyan`, `--slab`, ...).
   - `js/ui.js`: `RENDER.lobby`, `RENDER.recruit`, `playPull` (recruit reveal), `RENDER.members`, `RENDER.team`.
   - `js/rewards.js` (`showRewards`), `js/story.js` (`playStory`), `js/chibi.js` (`toonMat`, `WEAPONS`,
     `GLB_EXTRAS`), `js/foes3d.js` (`FOE_BUILD`).
3. Reply with a plan of 5 to 8 items, biggest visual impact first, before editing.

## Hard rules (breaking these breaks the game)
- No frameworks, no npm, no build step, no ES modules (except `js/three-boot.js`). Plain scripts share
  globals in the order `index.html` loads them. Before adding a top-level `const` or `function`, search
  the repo: a duplicate name stops the whole file (`seeded` already lives in `js/audio.js`).
- `index.html` and `wata-spo.html` list the same scripts and styles: edit both if you add a file.
- three.js stays r160 from cdn.jsdelivr.net (`js/three-boot.js` sets `window.THREE` and `THREE_X`).
- Don't rename or break the save (`localStorage` key `spostars_save_v1`); new settings get defaults in `js/save.js`.
- Leave gameplay numbers (`ACT`, `ACTION_KITS`, `FOE_AI` in `js/action-data.js`) alone unless a change is
  purely visual.
- Keep every credit: art credits in `js/data.js`, `MODEL_CREDITS` in `js/chibi.js`, `assets/models/README.txt`
  (the 3D model is CC BY 4.0, which requires the credit).
- Respect the settings: `SAVE.settings.gfx` (`'low'` = no post-processing, fewer particles),
  `SAVE.settings.flashes` (bright flashes off), `SAVE.settings.shake`, `SAVE.settings.cutins`.
- Performance: 60 fps on a mid-range laptop. Reuse geometry with `geo(key, make)` and textures with
  `canvasTex(key, w, h, draw)`; dispose materials you create per effect; cap particle counts; no
  allocations inside per-frame loops.
- The story stays a visual novel with the illustrated art (the owner's favourite part). Polish its
  presentation (text box, transitions, portrait motion); don't replace it.
- Art: make new visuals procedurally (canvas textures, shaders, CSS, SVG) or generate ORIGINAL images
  (backgrounds, UI textures, effect sprites, icons, enemy designs). Never generate or edit pictures of the
  VSPO members themselves: their art comes from the owner. New images go in `assets/` as WebP or JPG under
  about 500 KB, and get listed in `HANDOFF.md`.

## Where to cook (pick by impact)
1. **Battle HUD** (`action.css`, `buildDom`, `updateHud`): skill and Ultimate buttons with cooldown sweeps
   and a "ready" glow, the leader portrait with HP and shield bars, combo counter, boss bar with phases,
   damage numbers (`number`), skill banners (`skillName`), wave and title cards (`titleCard`).
2. **Combat VFX** (`ActionFx`, the `Sparks` / `Streaks` particles): give each member's Skill and Ultimate a
   distinct signature in her colour (`CHARACTERS[id].color`) and element; sharper hit sparks; a bigger Break
   moment (`breakSplash`); a Perfect Dodge slow-motion beat; a stronger graphic frame for the Ultimate
   cut-in (`cutIn`). Red always means enemy danger, the member's colour means hers, gold means loot.
3. **Arenas** (`ARENA_THEMES`, `buildDressing`, `buildSkyline`): give each theme its own identity, such as
   flickering neon signs in the alley, water towers, AC units and blinking antenna lights on the rooftop,
   rails and warning lights in the tunnel, drifting petals or confetti by day. Add per-theme colour grading
   in the grade `ShaderPass`.
4. **Menus**: lobby, recruit (`RENDER.recruit`, `playPull`: make the reveal feel like hitting a jackpot,
   with the rarity building up before it pays off), members and team prep, rewards (`showRewards`), the
   battle results screen. Consistent spacing, type scale, and motion (150 to 250 ms, ease-out), hover and
   press states, a layout that still works on a phone.
5. **Enemies** (`FOE_BUILD` in `js/foes3d.js`): more personality, silhouettes that read from the high battle
   camera, wind-up poses that telegraph attacks.

## How to work
- Small, focused commits to `main`, one improvement each, with messages saying what changed on screen and
  in which files.
- If you can run code: `python serve.py` (`py serve.py` on Windows), open http://localhost:8765, watch the
  console for errors, and run `node --check` on every JS file you touch. In the browser console,
  `simulateBattle(STAGES.find(s => s.id === '2-3'), ['tsuna', 'hinano', 'lisa'])` should still return a win.
- If you can't run it, say so plainly, keep changes smaller, and never call something tested when it isn't.
- Don't reformat files or rewrite whole systems. Match the existing style: 2-space indent, semicolons,
  single quotes, short comments that say why.
- When you stop, add an entry at the top of `HANDOFF.md`: the date, what you changed (with files), what you
  couldn't test, anything half-done, and ideas for next time. Claude reads it before continuing.

Start now: read the files, post your plan, then build item 1.
