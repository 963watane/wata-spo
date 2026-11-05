# Play WATA SPO

On Windows with Node.js installed, double-click `PLAY.cmd`, keep its window open,
then open **http://127.0.0.1:8765/**. On other systems, run `node play.cjs` in this folder.
The existing `python serve.py` launcher also works. No package installation or build is needed.
Internet is needed initially for three.js and the fonts.

This is a local game link: it works on the computer running the server. A public hosted
link requires deploying these files to a static website host.

## Controls

- WASD / arrow keys, or drag on the left: move. Basic attacks happen automatically in range.
- E: Skill. Q: Ultimate at 100% Energy. 1 and 2: Support Skills.
- Space: dodge. F: toggle Auto. Esc: pause.
- Between story areas, follow the path forward or press Enter / Continue for assisted walking.
  Manual movement takes priority. Auto walks between areas too.
- Conversation: tap, Enter or Space; Auto and Skip are available.

## Progress

Use Squad to add your free starter member. Train squad previews exact costs and HP/ATK gains.
Clear 1-2, 1-4 and 2-1 to unlock new tactics, each with a stated tradeoff.
Travel and closing dialogue are excluded from the combat time objective.

Progress uses the existing browser save. Keep the same address and port to keep using that save.
Settings → Export backup lets you move progress between addresses or browsers.

## This build

Original paper-and-sage menus, illustrated conversations/Ultimate cut-ins/MVP results,
painted 2D backgrounds and ground textures, connected 3D story areas, revised enemy silhouettes
and deliberate action poses. Original member art, story text, credits and save key are preserved.
Environment provenance and prompts are in `assets/environment/README.md`.

This remains a browser fan-game prototype. Member models still use the existing simplified rig
and recolours; the art and animation budget is substantially smaller than a commercial gacha.
