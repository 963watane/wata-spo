# WATA☆SPO

An unofficial, non-commercial VSPO! fan game: a gacha with real-time 3D action battles
(a squad of three, dodges, skills, support calls, Ultimates, Break) and an illustrated
visual-novel story. Plain HTML, CSS and JavaScript: no build step, no npm.

## Run it

1. Install Python 3 (on Windows the command is `py`).
2. In this folder run `py serve.py`
3. Open http://localhost:8765

Opening `index.html` straight from the disk does not work: the browser blocks loading the
art and 3D models from local files.

## Where things are

| Path | What |
|---|---|
| `index.html`, `wata-spo.html` | The page. Two copies with the same scripts; `wata-spo.html` is the one published online |
| `js/` | All the game code (file-by-file map in `AGENTS.md`) |
| `style.css`, `skin.css`, `v3.css`, `action.css` | Styles (`action.css` is the 3D battle HUD) |
| `assets/` | Art, backgrounds, lobby video, 3D models (`assets/models/README.txt`), music and sound slots |
| `tools/model-prep.html` | Prepares a 3D model for the game (simplify, texture, skeleton) |
| `serve.py` | Local server |
| `CLOUD_SETUP.md` | Optional cloud saves and leaderboard (Supabase) |

## Credits

Characters belong to VSPO! / Brave group. Art belongs to its artists; credits are in the
game under Settings > About. 3D model "Claude · 幼年" by Manny / ningfangtianwai-pixel
(AI Girls 3D, https://github.com/ningfangtianwai-pixel/ai-girls-3d), CC BY 4.0: simplified,
rigged and recoloured for this game.
