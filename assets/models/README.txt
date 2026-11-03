3D models for the action battles
================================

Every member has a built-in 3D chibi made of simple shapes (js/chibi.js). Any member listed
in models.json uses a real model instead.

What is here now
----------------
claude-child.gltf.json / claude-child.jpg
  "Claude · 幼年" by Manny / ningfangtianwai-pixel (AI Girls 3D),
  https://github.com/ningfangtianwai-pixel/ai-girls-3d
  License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
  Changes for this game: simplified from 261k to 50k triangles, texture saved as JPEG,
  given a simple skeleton, and recoloured in the game for members other than Sendo.
  Sendo uses it as it is; the other members use recoloured copies with their own extras
  (cap, cat ears, bows, horns, buns) until they get models of their own.
  Keep this credit (it is also shown under Settings > About) if you share the game.

Adding a model (for example one made with an image-to-3D tool)
--------------------------------------------------------------
1. Run the game's server:  py serve.py
2. Open http://localhost:8765/tools/model-prep.html and pick the .glb.
   - The model should stand facing you (+Z), arms a little away from the body.
   - Check the joint numbers on that page: the "Bones" view should show the arms green/red,
     the head yellow and the legs orange/purple, and the "Test pose" should not tear.
3. Press Process, then "Save to assets/models". The model is saved as <name>.gltf.json (glTF in its JSON form:
   web hosts serve it, unlike .glb) plus <name>.jpg; the page also offers the .glb for Blender.
4. List it in models.json by member id:

   "noah": { "file": "noah.gltf.json", "map": "noah.jpg" }

   Member ids: sendo, hinano, noah, tsuna, uruha, lisa

   "tint" recolours a shared model for a member: "hair" replaces the hair colour (and
   anything else in the same orange hue), "hair2" (optional) colours her right half,
   "dark" replaces the dark cloth.

Models made in Blender
----------------------
Export as glTF Binary (.glb), facing -Y in Blender (+Z in the file), feet at the origin, and
list it as  "noah": "noah.glb".  If the file has animation clips the game plays them by name:
   idle, run (or walk), attack, skill (or cast), hit (or damage), ko (or die), victory (or win)
A rig with bones named hips, torso, head, armL, armR, legL, legR (and a "rig" entry in the
mesh's custom properties, as model-prep writes) is animated by the game itself instead.

Members without an entry keep their built-in chibi.
