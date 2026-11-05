# WATA☆SPO (wata-spo)

wata's first gacha game.

An unofficial, non-commercial VSPO! fan game: a gacha with real-time 3D action battles
(a squad of three, dodges, skills, support calls, Ultimates, Break) and an illustrated
visual-novel story. Plain HTML, CSS and JavaScript: no build step, no npm.

## Run it

With Node.js installed, double-click `PLAY.cmd` on Windows or run `node play.cjs`.
Open http://127.0.0.1:8765 and keep the server window open. Python users can still run
`py serve.py` and open http://localhost:8765. See [PLAYING.md](PLAYING.md) for controls and progress.

Opening `index.html` straight from the disk does not work: the browser blocks loading the
art and 3D models from local files.

## Where things are

| Path | What |
|---|---|
| `index.html`, `wata-spo.html` | The page. Two copies with the same scripts; `wata-spo.html` is the one published online |
| `js/` | All the game code (file-by-file map in `AGENTS.md`) |
| `style.css`, `skin.css`, `v3.css`, `action.css`, `visual.css`, `studio.css` | Styles; `studio.css` is the current paper-and-sage visual direction |
| `assets/` | Art, backgrounds, lobby video, 3D models (`assets/models/README.txt`), music and sound slots |
| `tools/model-prep.html` | Prepares a 3D model for the game (simplify, texture, skeleton) |
| `serve.py` | Local server |
| `play.cjs`, `PLAY.cmd` | Dependency-free Node.js local server and Windows launcher |
| `assets/environment/README.md` | Original environment assets, provenance and generation prompts |
| `tests/experience.test.cjs` | Save migration, training, tactics and combat-clock regression checks |
| `CLOUD_SETUP.md` | Optional cloud saves and leaderboard (Supabase) |

## Credits

Characters belong to VSPO! / Brave group. Art belongs to its artists; credits are in the
game under Settings > About. 3D model "Claude · 幼年" by Manny / ningfangtianwai-pixel
(AI Girls 3D, https://github.com/ningfangtianwai-pixel/ai-girls-3d), CC BY 4.0: simplified,
rigged and recoloured for this game.
