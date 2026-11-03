# Notes for AI coding assistants

This is a hobby fan game by a first-time game maker, edited by more than one AI assistant
(ChatGPT and Claude take turns). Keep each change focused, don't reformat or restructure
files you aren't changing, and describe what you changed in plain words in the commit
message so the next assistant can pick up where you left off.

## How it is built

- Plain browser scripts with no modules (except `js/three-boot.js`), no build step, no npm.
  Every file in `js/` runs in the page's global scope in the order `index.html` lists them,
  and later files use globals from earlier ones (`SAVE`, `CHARACTERS`, `STAGES`, `$`, `ic`, ...).
  Two files can't declare the same top-level name (for example `seeded` already lives in `audio.js`).
- `index.html` and `wata-spo.html` must list the same scripts and styles: change both.
- three.js r160 loads from cdn.jsdelivr.net in `js/three-boot.js`, which sets `window.THREE`
  and `window.THREE_X` and fires `three-ready`; code waits for it with `whenThree()`.
- Saves live in localStorage under `spostars_save_v1` (`js/save.js`). Never rename it; give new
  fields defaults and a migration so old saves keep working.
- Style: 2-space indent, semicolons, single quotes, short comments that say why. Match the
  code around your change.

## Files in js/

| File | What it does |
|---|---|
| `data.js` | Characters, elements, enemies, stages, banners, backgrounds and art credits |
| `save.js` | The save object, defaults and migrations |
| `ui.js` | Lobby, recruit, members, team prep, stage select; `startBattle()` |
| `screens.js` | Stream Tower, shop, settings (with the credits list), recruit history |
| `menu.js` | Profile card, news board, full-screen menu |
| `story-data.js`, `story.js` | The visual-novel story text and its player |
| `voice.js` | Everything the members say: voice lines, talks, chat reactions |
| `live-data.js`, `live.js` | Events, weekly Ranked Raid, stream schedule, bonds and gifts, achievements, onboarding |
| `gacha.js`, `rewards.js` | Recruit rates and pity; the rewards screen |
| `action.js` | The real-time 3D battle engine (`ActionBattle`), arenas, effects, HUD, in-arena scenes; `simulateBattle()` |
| `action-data.js` | Battle tuning (`ACT`), each member's moves (`ACTION_KITS`), enemy behaviour, stage time targets |
| `field-data.js` | Short 3D story exchanges at the start and end of each stage |
| `chibi.js` | 3D members: built-in chibis, the `models.json` loader, rigged models, recolours, weapons, model credits |
| `foes3d.js` | 3D enemy models |
| `rift.js` | Bracket Run (roguelite mode) and its Boost cards |
| `battle.js` | The older turn-based battle; some helpers it defines are still used |
| `art.js`, `icons.js` | Character art loading; SVG icons |
| `audio.js`, `music.js` | Synthesised sound effects; music slots (files in `assets/music`) |
| `help.js` | How-to-play pages and the "What's new" notes |
| `cloud.js` | Optional Supabase cloud save (off until configured, see `CLOUD_SETUP.md`) |
| `three-boot.js` | Loads three.js |

## Testing

- Run `py serve.py` and open http://localhost:8765; watch the browser console for errors.
- Battle balance without graphics, in the browser console:
  `simulateBattle(STAGES.find(s => s.id === '2-3'), ['tsuna', 'hinano', 'lisa'])`
  returns `{ won, time, hp }`. Set the members' levels to `recLevel(stage.level)` first to test
  at the recommended level; a normal stage should be won with health to spare.

## Content rules

- The members are real VTubers: keep them likeable and in character, don't invent quotes and
  present them as real, nothing sexual or mean-spirited.
- The story stays a visual novel with the illustrated art (the owner's favourite part); battles
  add short 3D in-arena exchanges on top.
- Keep every credit: art credits in `js/data.js`, model credits in `MODEL_CREDITS` (`js/chibi.js`)
  and `assets/models/README.txt`. The 3D model is CC BY 4.0, which requires the credit.
- Don't add music, sounds or art the owner doesn't have the right to use.
