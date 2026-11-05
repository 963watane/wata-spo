// 3D chibi members for the action battles.
// Each member is built from simple shapes (spheres, capsules, cones) with toon
// shading and an ink outline: stand-ins until real models exist. To use a real
// model, put <id>.glb in assets/models and list it in assets/models/models.json
// (see the README there); the built chibi stays as the fallback.

// Resolves true once three.js has loaded, or false if it can't (offline).
function whenThree(ms = 12000) {
  if (window.THREE) return Promise.resolve(true);
  return new Promise(res => {
    const t = setTimeout(() => res(false), ms);
    window.addEventListener('three-ready', () => { clearTimeout(t); res(true); }, { once: true });
  });
}

const INK = '#2a1d2c';     // outline colour
const INK_W = 0.01;       // outline thickness (world units at scale 1)

// Shared three.js resources, created on first use (three.js loads after this file).
const C3 = {};
function c3() {
  if (C3.ready) return C3;
  // Three-tone toon ramp: soft shadow, a mid band, then full light.
  const ramp = new THREE.DataTexture(new Uint8Array([120, 120, 120, 188, 188, 255, 255, 255]), 8, 1, THREE.RedFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  Object.assign(C3, { ready: true, ramp, geo: {}, ink: {}, faces: {} });
  return C3;
}
const geo = (key, make) => c3().geo[key] || (C3.geo[key] = make());
const G = {
  sph: (seg = 1) => geo('sph' + seg, () => new THREE.SphereGeometry(1, 28 * seg, 18 * seg)),
  lo: () => geo('lo', () => new THREE.SphereGeometry(1, 12, 9)),
  cap: (r, l) => geo(`cap${r}|${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 14)),
  cone: (r, h, s = 10) => geo(`cone${r}|${h}|${s}`, () => new THREE.ConeGeometry(r, h, s)),
  cyl: (rt, rb, h, s = 16, open = false) => geo(`cyl${rt}|${rb}|${h}|${s}|${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open)),
  tor: (r, t, arc = Math.PI * 2, s = 24) => geo(`tor${r}|${t}|${arc}|${s}`, () => new THREE.TorusGeometry(r, t, 8, s, arc)),
  box: (x, y, z) => geo(`box${x}|${y}|${z}`, () => new THREE.BoxGeometry(x, y, z)),
};

// Back-face "inverted hull" outline, pushed out along the normals.
function inkMat(thick, color = INK) {
  const t = Math.max(0.002, Math.round(thick * 1000) / 1000), k = t + color;
  return c3().ink[k] || (C3.ink[k] = new THREE.ShaderMaterial({
    uniforms: { thick: { value: t }, ink: { value: new THREE.Color(color) } },
    vertexShader: 'uniform float thick; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * thick, 1.0); }',
    fragmentShader: 'uniform vec3 ink; void main() { gl_FragColor = vec4(ink, 1.0); }',
    side: THREE.BackSide,
  }));
}

// Outline for a skinned model: the same inverted hull, bent by the skeleton first.
function inkSkinMat(thick, color = INK) {
  return new THREE.ShaderMaterial({
    uniforms: { thick: { value: thick }, ink: { value: new THREE.Color(color) } },
    vertexShader: `uniform float thick;
      #include <common>
      #include <skinning_pars_vertex>
      void main() {
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        transformed += normalize(objectNormal) * thick;
        #include <project_vertex>
      }`,
    fragmentShader: 'uniform vec3 ink; void main() { gl_FragColor = vec4(ink, 1.0); }',
    side: THREE.BackSide,
  });
}

// Toon material with a soft rim light, the anime "edge glow".
const RIM_CHUNK = `float rimF = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0);
  outgoingLight += rimColor * smoothstep(0.62, 1.0, rimF) * rimAmt;
  #include <opaque_fragment>`;
// Recolours a model's texture for another member: texels in the hair's hue take her hair colour
// (on Hinano, split down the middle), and the dark cloth takes her outfit colour. Shading is kept.
const RECOLOR_CHUNK = `#include <map_fragment>
  {
    vec3 c = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
    float mx = max(c.r, max(c.g, c.b)), d = mx - min(c.r, min(c.g, c.b)), s = mx > 0.0 ? d / mx : 0.0, hue = 0.0;
    if (d > 0.0) hue = (mx == c.r ? mod((c.g - c.b) / d, 6.0) : mx == c.g ? (c.b - c.r) / d + 2.0 : (c.r - c.g) / d + 4.0) / 6.0;
    float mHair = (1.0 - smoothstep(0.05, 0.09, abs(fract(hue - recHue + 0.5) - 0.5))) * smoothstep(0.3, 0.5, s) * smoothstep(0.2, 0.35, mx);
    float mDark = (1.0 - smoothstep(0.26, 0.4, mx)) * (1.0 - smoothstep(0.25, 0.45, s));
    c = mix(c, mix(recHair, recHair2, recSplit * step(vRecX, 0.0)) * (mx / 0.85), mHair);
    c = mix(c, recDark * (mx / 0.3), mDark);
    diffuseColor.rgb = pow(c, vec3(2.2));
  }`;
function toonMat(color, o = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: c3().ramp });
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei || 1; }
  if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
  if (o.side) m.side = o.side;
  if (o.flat) m.flatShading = true;
  const rim = new THREE.Color(o.rim || '#ffffff'), amt = o.rimAmt == null ? 0.3 : o.rimAmt, rc = o.recolor;
  m.onBeforeCompile = sh => {
    sh.uniforms.rimColor = { value: rim };
    sh.uniforms.rimAmt = { value: amt };
    sh.fragmentShader = 'uniform vec3 rimColor;\nuniform float rimAmt;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', RIM_CHUNK);
    if (!rc) return;
    Object.assign(sh.uniforms, { recHue: { value: rc.hue }, recHair: { value: new THREE.Color(rc.hair) }, recHair2: { value: new THREE.Color(rc.hair2 || rc.hair) },
      recSplit: { value: rc.hair2 ? 1 : 0 }, recDark: { value: new THREE.Color(rc.dark || '#2a2733') } });
    // the uniform colours are compared in sRGB, like the texture's own colours
    ['recHair', 'recHair2', 'recDark'].forEach(k => sh.uniforms[k].value.convertLinearToSRGB());
    sh.vertexShader = 'varying float vRecX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRecX = position.x;');
    sh.fragmentShader = 'uniform float recHue;\nuniform vec3 recHair;\nuniform vec3 recHair2;\nuniform float recSplit;\nuniform vec3 recDark;\nvarying float vRecX;\n' +
      sh.fragmentShader.replace('#include <map_fragment>', RECOLOR_CHUNK);
  };
  // Recoloured materials compile to a different shader, so they need their own program.
  if (rc) m.customProgramCacheKey = () => 'toon-recolor';
  m.userData.emissive0 = m.emissive.clone();
  m.userData.ei0 = m.emissiveIntensity;
  m.userData.rim = rim;   // the shader reads this Color, so it can be retinted to suit an arena
  return m;
}

// Lighten (amt > 0) or darken (amt < 0) a hex colour.
function shadeHex(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return '#' + c.getHexString();
}

// ---------- faces ----------
// The face is a canvas texture on a patch of sphere just in front of the head.
// Frames: 0 normal, 1 blink, 2 happy, 3 hurt, 4 fierce.
const FACE_FRAMES = 5;
const FACE_PX = 200;                        // texture pixels per radian of head
const FACE_PHI = 1.7, FACE_T0 = 1.15, FACE_TL = 1.05;
const FACE_W = Math.round(FACE_PHI * FACE_PX), FACE_H = Math.round(FACE_TL * FACE_PX);

function drawEye(g, x, y, look, side, frame) {
  const ink = '#2a1d2c', w = 29, h = 40;
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (frame === 1) {           // blink: closed lid
    g.strokeStyle = ink; g.lineWidth = 7;
    g.beginPath(); g.ellipse(x, y + 6, w, 12, 0, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    return;
  }
  if (frame === 2) {           // happy: ^ ^
    g.strokeStyle = ink; g.lineWidth = 8;
    g.beginPath(); g.ellipse(x, y + 14, w - 2, 22, 0, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke();
    return;
  }
  if (frame === 3) {           // hurt: > <
    g.strokeStyle = ink; g.lineWidth = 8;
    g.beginPath(); g.moveTo(x - side * 18, y - 16); g.lineTo(x + side * 14, y + 2); g.lineTo(x - side * 18, y + 20); g.stroke();
    return;
  }
  // Open eye: white, gradient iris, pupil, two highlights, thick upper lash.
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(x, y + 3, w, h, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createLinearGradient(0, y - h, 0, y + h);
  gr.addColorStop(0, shadeHex(look.eyes, -0.3)); gr.addColorStop(0.5, look.eyes); gr.addColorStop(1, shadeHex(look.eyes, 0.25));
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(x, y + 6, w - 4, h - 3, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = shadeHex(look.eyes, -0.42);
  g.beginPath(); g.ellipse(x, y + 1, 10, 15, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath(); g.ellipse(x - side * 8, y - 11, 8, 10, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(x + side * 9, y + 18, 4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = ink; g.lineWidth = frame === 4 ? 9 : 7;
  g.beginPath();
  if (frame === 4) { g.moveTo(x - side * (w + 2), y - h + 18); g.lineTo(x + side * (w + 2), y - h + 4); }
  else g.ellipse(x, y + 6, w + 3, h + 1, 0, 1.08 * Math.PI, 1.92 * Math.PI);
  g.stroke();
  // little outer flick of the lash
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(x + side * (w + 1), y - h + 14); g.lineTo(x + side * (w + 9), y - h + 8); g.stroke();
}

function drawFace(g, ox, look, frame) {
  const cx = ox + FACE_W / 2;
  const eyeY = Math.round((Math.acos(-0.1) - FACE_T0) * FACE_PX);
  const mouthY = Math.round((Math.acos(-0.43) - FACE_T0) * FACE_PX);
  // blush
  g.fillStyle = 'rgba(255,120,150,.38)';
  [-1, 1].forEach(s => { g.beginPath(); g.ellipse(cx + s * 86, eyeY + 46, 22, 10, 0, 0, Math.PI * 2); g.fill(); });
  [-1, 1].forEach(s => drawEye(g, cx + s * 64, eyeY, look, s, frame));
  // mouth
  const ink = '#4a2430';
  g.strokeStyle = ink; g.fillStyle = '#c2405a'; g.lineWidth = 4.5; g.lineCap = 'round';
  g.beginPath();
  if (frame === 2 || (frame === 0 && look.mouth === 'grin')) {
    g.moveTo(cx - 13, mouthY - 6); g.quadraticCurveTo(cx, mouthY + 14, cx + 13, mouthY - 6); g.closePath(); g.fill(); g.stroke();
  } else if (frame === 3) {
    g.ellipse(cx, mouthY, 6, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  } else if (frame === 4) {
    g.moveTo(cx - 9, mouthY); g.lineTo(cx + 9, mouthY - 2); g.stroke();
  } else if (look.mouth === 'cat') {
    g.arc(cx - 6, mouthY - 3, 6, 0.1 * Math.PI, 0.95 * Math.PI); g.moveTo(cx + 12, mouthY - 3); g.arc(cx + 6, mouthY - 3, 6, 0.05 * Math.PI, 0.9 * Math.PI); g.stroke();
  } else if (look.mouth === 'pout') {
    g.moveTo(cx - 7, mouthY); g.quadraticCurveTo(cx, mouthY - 5, cx + 7, mouthY); g.stroke();
  } else {
    g.arc(cx, mouthY - 8, 9, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  }
}

function faceTexture(look) {
  const key = look.eyes + look.mouth;
  if (!c3().faces[key]) {
    const cv = document.createElement('canvas');
    cv.width = FACE_W * FACE_FRAMES; cv.height = FACE_H;
    const g = cv.getContext('2d');
    for (let f = 0; f < FACE_FRAMES; f++) drawFace(g, f * FACE_W, look, f);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    C3.faces[key] = tex;
  }
  // Each chibi gets its own Texture (same image) so it can change expression on its own.
  const t = C3.faces[key].clone();
  t.repeat.set(1 / FACE_FRAMES, 1);
  t.needsUpdate = true;
  return t;
}

// ---------- looks ----------
// Colours and features taken from each member's art in assets/.
const CHIBI_LOOKS = {
  sendo:  { skin: '#ffe4d4', hair: '#9e6a44', hair2: '#e8b55e', eyes: '#e03e5c', mouth: 'grin',
            torso: '#f2d59c', sleeve: '#fbf8f2', skirt: '#2c3463', legs: '#ffe4d4', shoes: '#3a2a23', socks: '#272b3d', weapon: 'sunorb' },
  hinano: { skin: '#ffe6dc', hair: '#4a2b25', hair2: '#ff8fbe', eyes: '#5a78ff', mouth: 'pout',
            torso: '#fbf8fa', sleeve: '#fbf8fa', skirt: '#4b3129', trim: '#ffb3cf', legs: '#ffe6dc', shoes: '#3b2621', weapon: 'lollipop' },
  noah:   { skin: '#ffe6d8', hair: '#f2d475', eyes: '#22c4a4', mouth: 'smile',
            torso: '#2a2f58', sleeve: '#2a2f58', skirt: '#b72a3d', trim: '#e9c25a', legs: '#262a46', shoes: '#18192a', weapon: 'sabre' },
  tsuna:  { skin: '#ffe4d8', hair: '#dd2f3d', eyes: '#f0a01c', mouth: 'cat',
            torso: '#1e1d24', sleeve: '#1e1d24', skirt: '#1e1d24', trim: '#ffffff', legs: '#f4f2f6', shoes: '#18171c', hands: '#1e1d24', weapon: 'brush' },
  uruha:  { skin: '#ffe6dc', hair: '#1d2030', hair2: '#2f5cff', eyes: '#b07dff', mouth: 'smile',
            torso: '#21232f', sleeve: '#21232f', skirt: '#21232f', trim: '#3150ff', legs: '#3a2f30', shoes: '#141419', weapon: 'pistol' },
  lisa:   { skin: '#ffe6dc', hair: '#cfc58e', eyes: '#3f8cff', mouth: 'smile',
            torso: '#fbfbff', sleeve: '#f6c3d2', skirt: '#f3bfcf', legs: '#f2f1f6', shoes: '#f2f1f6', hands: '#8f80ae', weapon: 'fork' },
};
const CHIBI_DEFAULT = { skin: '#ffe4d6', hair: '#6b5a8a', eyes: '#6b8cff', mouth: 'smile', torso: '#f4f4f8', sleeve: '#f4f4f8', skirt: '#5060a0', legs: '#ffe4d6', shoes: '#2a2a35', weapon: null };

// A glTF saved as JSON (.gltf.json, as tools/model-prep.html writes it) with its data inline,
// repacked as a binary .glb in memory so the loader never has to fetch a data: URL.
function gltfJsonToGlb(json) {
  const s = atob(json.buffers[0].uri.split(',')[1]), bin = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bin[i] = s.charCodeAt(i);
  json.buffers[0] = { byteLength: bin.length };
  const txt = new TextEncoder().encode(JSON.stringify(json)), jl = (txt.length + 3) & ~3, bl = (bin.length + 3) & ~3;
  const out = new ArrayBuffer(28 + jl + bl), dv = new DataView(out), u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.byteLength, true);   // "glTF", version 2
  dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); u8.fill(0x20, 20, 20 + jl); u8.set(txt, 20);   // JSON chunk
  dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004E4942, true); u8.set(bin, 28 + jl);   // BIN chunk
  return out;
}

// Real models listed in assets/models/models.json, loaded once per session. An entry is a file
// name, or { file, map: colour texture, tint: recolour for this member }. Members that share a
// file share one download.
const CHIBI_GLB = {};
let chibiGlbLoad = null;
function loadChibiModels() {
  if (chibiGlbLoad) return chibiGlbLoad;
  const files = {}, maps = {};
  const gltf = f => files[f] || (files[f] = /\.json$/i.test(f)
    ? fetch('assets/models/' + f).then(r => r.json()).then(j => new Promise(res => new THREE_X.GLTFLoader().parse(gltfJsonToGlb(j), 'assets/models/', res, () => res(null)))).catch(() => null)
    : new Promise(res => new THREE_X.GLTFLoader().load('assets/models/' + f, res, undefined, () => res(null))));
  const tex = f => maps[f] || (maps[f] = new Promise(res => new THREE.TextureLoader().load('assets/models/' + f, t => {
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t);
  }, undefined, () => res(null))));
  chibiGlbLoad = fetch('assets/models/models.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))
    .then(list => Promise.all(Object.entries(list || {}).map(async ([id, e]) => {
      const cfg = typeof e === 'string' ? { file: e } : e;
      const [g, map] = await Promise.all([gltf(cfg.file), cfg.map ? tex(cfg.map) : null]);
      if (g) CHIBI_GLB[id] = Object.assign({}, cfg, { gltf: g, map });
    })));
  return chibiGlbLoad;
}

// ---------- the chibi ----------
// Animation channels: body bob / lean / twist / tilt, head, arms, legs, and rig
// extras (jump height, squash, spin, knocked-out fall).
const CH0 = { by: 0, bx: 0, bry: 0, brz: 0, hx: 0, hy: 0, hz: 0, alx: 0, alz: 0.14, arx: 0, arz: -0.14, llx: 0, lrx: 0, jy: 0, sq: 1, ko: 0 };

// One-shot actions: keyframes over 0..1 of the action's duration.
const CHIBI_ACTS = {
  slashA: { dur: 0.3, face: 4, keys: [[0, { arx: -0.65, arz: -0.6, bry: 0.12 }], [0.2, { arx: -1.15, arz: -1.15, bry: 0.48, bx: -0.04 }], [0.42, { arx: -1.4, arz: -0.2, bry: -0.48, bx: 0.16 }], [0.7, { arx: -0.85, arz: -0.25, bry: -0.24, bx: 0.08 }], [1, { arx: -0.55, arz: -0.3, bry: 0 }]] },
  slashB: { dur: 0.3, face: 4, keys: [[0, { arx: -0.85, arz: -0.2, bry: -0.22 }], [0.2, { arx: -1.15, arz: 0.1, bry: -0.45, bx: -0.03 }], [0.42, { arx: -1.35, arz: -1.2, bry: 0.5, bx: 0.12 }], [0.7, { arx: -0.8, arz: -0.9, bry: 0.25 }], [1, { arx: -0.55, arz: -0.3, bry: 0 }]] },
  slam: { dur: 0.42, face: 4, keys: [[0, { arx: -1, alx: -0.8, bx: -0.05 }], [0.26, { arx: -2.1, alx: -1.8, bx: -0.12, sq: 0.96 }], [0.48, { arx: -0.6, alx: -0.5, bx: 0.25, sq: 0.94 }], [0.7, { arx: -0.5, alx: -0.3, bx: 0.1 }], [1, { arx: -0.4, alx: -0.25, bx: 0, sq: 1 }]] },
  shoot: { dur: 0.24, face: 4, keys: [[0, { arx: -1.42, arz: -0.1, bry: 0.16, hy: -0.1 }], [0.24, { arx: -1.53, bry: 0.22, bx: 0.04 }], [0.38, { arx: -1.72, bry: 0.29, bx: -0.07 }], [1, { arx: -1.4, bry: 0.18, hx: 0, bx: 0 }]] },
  throw: { dur: 0.3, face: 4, keys: [[0, { arx: -0.3, arz: -0.3, bry: 0.12 }], [0.23, { arx: 0.25, arz: -0.38, bry: 0.4 }], [0.42, { arx: -1.75, arz: -0.18, bry: -0.32, bx: 0.1 }], [0.7, { arx: -0.9, bry: -0.14 }], [1, { arx: -0.4, bry: 0, bx: 0 }]] },
  cast: { dur: 0.6, face: 4, keys: [[0, { alx: -0.5, arx: -0.5, alz: 0.5, arz: -0.5 }], [0.3, { alx: -1.4, arx: -1.4, alz: 0.65, arz: -0.65, bx: -0.08 }], [0.5, { alx: -2.1, arx: -2.1, alz: 0.38, arz: -0.38, hx: -0.1 }], [1, { alx: -1.3, arx: -1.3, alz: 0.5, arz: -0.5, bx: 0 }]] },
  spin:   { dur: 0.5, face: 4, spin: Math.PI * 2, keys: [[0, { arz: -1.45, alz: 1.45, jy: 0.05 }], [1, { arz: -1.45, alz: 1.45, jy: 0 }]] },
  dash:   { dur: 0.3, keys: [[0, { bx: 0.55, alx: 1.0, arx: 1.0, llx: 0.7, lrx: -0.4, jy: 0.04 }], [1, { bx: 0.45, alx: 0.8, arx: 0.8, llx: 0.5, lrx: -0.3, jy: 0 }]] },
  hit:    { dur: 0.32, face: 3, keys: [[0, { bx: -0.35, hx: -0.3, alz: 0.7, arz: -0.7 }], [1, { bx: 0, hx: 0 }]] },
  cheer:  { dur: 0.9, face: 2, keys: [[0, { arx: -2.9, arz: -0.3, alz: 0.5, hz: 0.1 }], [0.3, { jy: 0.36, arx: -3.0, arz: -0.2, sq: 1.08 }], [0.6, { jy: 0, sq: 0.9, arx: -2.8 }], [1, { jy: 0, sq: 1, arx: -2.7, arz: -0.3 }]] },
  talk:   { dur: 0.55, keys: [[0, { hz: 0.08, arx: -0.5, arz: -0.45, jy: 0 }], [0.45, { hz: -0.06, hx: 0.06, arx: -1.05, arz: -0.35, jy: 0.06 }], [1, { hz: 0, arx: -0.35, arz: -0.3, jy: 0 }]] },
  peace:  { dur: 0.8, face: 2, keys: [[0, { arx: -2.5, arz: -0.8, hz: 0.14, bry: -0.2 }], [1, { arx: -2.6, arz: -0.85, hz: 0.18, bry: -0.25 }]] },
  leap:   { dur: 0.45, face: 2, spin: Math.PI * 2, keys: [[0, { jy: 1.25, alz: 1.2, arz: -1.2, sq: 1.15 }], [0.75, { jy: 0, alz: 0.8, arz: -0.8, sq: 0.82 }], [1, { jy: 0, sq: 1 }]] },
};

class Chibi {
  constructor(id, o = {}) {
    c3();
    this.id = id;
    this.look = Object.assign({}, CHIBI_DEFAULT, CHIBI_LOOKS[id] || {}, o.look || {});
    this.mats = [];
    this.matCache = {};
    this.sway = [];            // secondary motion: hair, tails, wings
    this.root = new THREE.Group();
    this.rig = new THREE.Group();
    this.root.add(this.rig);
    this.j = {};
    this.ch = Object.assign({}, CH0);
    this.state = 'idle'; this.t = Math.random() * 10; this.runPhase = 0; this.move = 0;
    this.action = null; this.spinNow = 0;
    this.frame = 0; this.faceHold = 0; this.blinkAt = 1 + Math.random() * 3;
    this.flashT = 0; this.flashColor = new THREE.Color('#ffffff');
    if (CHIBI_GLB[id] && !o.hologram) this.buildGlb(CHIBI_GLB[id]);
    else this.build();
    if (o.hologram) this.hologram(o.hologram);
    this.root.traverse(m => { if (m.isMesh) m.frustumCulled = false; });
  }

  mat(color, o = {}) {
    const k = color + JSON.stringify(o);
    if (!this.matCache[k]) { this.matCache[k] = toonMat(color, o); this.mats.push(this.matCache[k]); }
    return this.matCache[k];
  }

  // Adds a mesh with an outline. o: p position, r rotation, s scale, ink (false = no outline).
  part(parent, geometry, color, o = {}) {
    const m = new THREE.Mesh(geometry, typeof color === 'string' ? this.mat(color, o.m || {}) : color);
    if (o.p) m.position.set(o.p[0], o.p[1], o.p[2]);
    if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]);
    if (o.s != null) { if (typeof o.s === 'number') m.scale.setScalar(o.s); else m.scale.set(o.s[0], o.s[1], o.s[2]); }
    if (o.ink !== false) {
      const sc = (m.scale.x + m.scale.y + m.scale.z) / 3;
      m.add(new THREE.Mesh(geometry, inkMat((o.inkW || INK_W) / sc)));
    }
    parent.add(m);
    return m;
  }

  group(parent, p = [0, 0, 0], r = [0, 0, 0]) {
    const g = new THREE.Group();
    g.position.set(p[0], p[1], p[2]); g.rotation.set(r[0], r[1], r[2]);
    parent.add(g);
    return g;
  }

  build() {
    const L = this.look, j = this.j;
    // Hips carry the legs and skirt; the torso pivots on top of them.
    j.hips = this.group(this.rig, [0, 0.36, 0]);
    [['legL', 0.075], ['legR', -0.075]].forEach(([k, x]) => {
      j[k] = this.group(j.hips, [x, 0, 0]);
      this.part(j[k], G.cap(0.058, 0.19), L.legs, { p: [0, -0.16, 0] });
      if (L.socks) this.part(j[k], G.cap(0.056, 0.06), L.socks, { p: [0, -0.26, 0] });
      this.part(j[k], G.sph(), L.shoes, { p: [0, -0.32, 0.025], s: [0.068, 0.052, 0.098] });
    });
    j.skirt = this.group(j.hips, [0, -0.02, 0]);
    this.part(j.skirt, G.cyl(0.15, 0.27, 0.2, 12, true), L.skirt, { m: { side: THREE.DoubleSide, flat: true } });
    if (L.trim) this.part(j.skirt, G.tor(0.265, 0.018, Math.PI * 2, 32), L.trim, { p: [0, -0.1, 0], r: [Math.PI / 2, 0, 0], ink: false });
    j.torso = this.group(j.hips, [0, 0.04, 0]);
    this.part(j.torso, G.cap(0.145, 0.1), L.torso, { p: [0, 0.12, 0], s: [1, 1, 0.86] });
    // Arms hang from the shoulders; the right hand holds the weapon.
    [['armL', 0.175, 1], ['armR', -0.175, -1]].forEach(([k, x]) => {
      j[k] = this.group(j.torso, [x, 0.25, 0]);
      this.part(j[k], G.cap(0.05, 0.12), L.sleeve, { p: [0, -0.09, 0] });
      this.part(j[k], G.sph(), L.sleeve, { p: [0, -0.01, 0], s: 0.07 });
      this.part(j[k], G.sph(), L.hands || L.skin, { p: [0, -0.2, 0], s: 0.062, m: { rimAmt: 0.08 } });
    });
    j.hand = this.group(j.armR, [0, -0.2, 0.01], [Math.PI / 2, 0, 0]);
    // Head: skin sphere, the face patch, ears; hair hangs off the head group.
    j.head = this.group(j.torso, [0, 0.56, 0]);
    j.head.scale.setScalar(1.07);       // a slightly bigger head reads cuter
    const shape = this.group(j.head);
    shape.scale.set(1, 0.94, 0.97);
    // A little self-glow keeps the face evenly lit, the way anime faces are drawn.
    this.part(shape, G.sph(), L.skin, { s: 0.3, m: { emissive: L.skin, ei: 0.34, rimAmt: 0.06 } });
    const faceGeo = geo('face', () => new THREE.SphereGeometry(0.3 * 1.006, 28, 16, Math.PI / 2 - FACE_PHI / 2, FACE_PHI, FACE_T0, FACE_TL));
    this.faceTex = faceTexture(L);
    const face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: this.faceTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    face.renderOrder = 2;
    shape.add(face);
    this.faceMesh = face;
    (CHIBI_BUILD[this.id] || CHIBI_BUILD.default).call(this, L, j);
    if (L.weapon && WEAPONS[L.weapon]) WEAPONS[L.weapon].call(this, j.hand, L);
  }

  // ----- hair & accessory helpers -----
  hairCap(color, tilt = -0.42, r = 0.318) {
    this.part(this.j.head, geo('hcap' + r, () => new THREE.SphereGeometry(r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2)), color, { r: [tilt, 0, 0] });
    this.hairShine(shadeHex(color, 0.26), tilt, r);
  }
  // The glossy "angel ring" highlight that anime hair has, drawn unlit.
  hairShine(color, tilt = -0.42, r = 0.318) {
    const g = geo('shine' + r, () => new THREE.SphereGeometry(r * 1.012, 48, 1, Math.PI / 2 + 0.55, Math.PI * 2 - 1.1, 0.52, 0.075));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = tilt;
    m.renderOrder = 1;
    this.j.head.add(m);
  }
  // A tapered lock of hair: a flattened cone hanging from p, its tip flaring outward by `out`.
  strand(parent, color, p, yaw, out, len, w, flat = 0.42) {
    const g = this.group(parent, p, [0, yaw, 0]);
    const t = this.group(g, [0, 0, 0], [-out, 0, 0]);
    this.part(t, G.cone(w, len, 8), color, { p: [0, -len / 2, 0], r: [Math.PI, 0, 0], s: [1, 1, flat] });
    return g;
  }
  // Short pointed locks along the bottom edge of the back hair: the jagged anime hairline.
  backFringe(colorAt, o = {}) {
    const n = o.n || 9, y = o.y == null ? -0.12 : o.y, R = 0.318, spread = o.spread || 1.75;
    const rr = Math.sqrt(Math.max(0.01, R * R - y * y)) + 0.012;
    for (let i = 0; i < n; i++) {
      const a = Math.PI - spread + 2 * spread * i / (n - 1);
      const len = (o.len || 0.13) * (0.85 + 0.3 * Math.abs(Math.sin(i * 1.7)));
      this.strand(this.j.head, colorAt(a), [Math.sin(a) * rr, y + 0.05, Math.cos(a) * rr], a, o.out || 0.22, len, o.w || 0.085);
    }
  }
  // Long locks fanning down the back.
  longHair(colorAt, o = {}) {
    const n = o.n || 5;
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) - 0.5 : 0, a = Math.PI + k * (o.spread || 2.0), r = 0.24;
      const len = (o.len || 0.6) * (1 - Math.abs(k) * 0.3);
      const g = this.strand(this.j.head, colorAt(a), [Math.sin(a) * r, o.y == null ? 0.05 : o.y, Math.cos(a) * r], a, 0.12 + Math.abs(k) * 0.3, len, o.w || 0.12, 0.5);
      this.sway.push({ obj: g, base: g.rotation.clone(), amp: 0.035, f: 1.7, ph: i * 0.7, axis: 'z' });
    }
  }
  // A single springy strand on top of the head.
  ahoge(color, p = [0.03, 0.3, 0.04]) {
    const g = this.group(this.j.head, p, [0.15, 0, -0.25]);
    this.tube(g, [[0, 0, 0], [0.015, 0.07, 0.01], [0.06, 0.12, 0.02], [0.11, 0.1, 0.03]], 0.013, color);
    this.sway.push({ obj: g, base: g.rotation.clone(), amp: 0.22, f: 3.2, ph: 1, axis: 'z' });
  }
  hairBack(color, bottom = 2.05, r = 0.33, flare = 1.04) {
    this.part(this.j.head, geo(`hback${bottom}|${r}`, () => new THREE.SphereGeometry(r, 32, 16, Math.PI, Math.PI, 0.3, bottom - 0.3)), color, { s: [flare, 1, 1], m: { side: THREE.DoubleSide } });
    this.backShine(shadeHex(color, 0.26), r, flare);
  }
  // The highlight band across the back of the hair (what the battle camera sees most).
  backShine(color, r = 0.33, flare = 1.04) {
    const m = new THREE.Mesh(geo('bshine' + r, () => new THREE.SphereGeometry(r * 1.012, 40, 1, Math.PI - 0.15, Math.PI + 0.3, 0.6, 0.085)),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
    m.scale.set(flare, 1, 1);
    m.renderOrder = 1;
    this.j.head.add(m);
  }
  // A fringe of strands across the forehead; colorAt(angle) picks each strand's colour.
  bangs(colorAt, o = {}) {
    const n = o.n || 6, from = o.from == null ? -1.1 : o.from, to = o.to == null ? 1.1 : o.to;
    for (let i = 0; i < n; i++) {
      const a = from + (to - from) * i / (n - 1);
      // Strands get longer toward the sides; the middle ones stop just above the eyes.
      const len = (o.len || 0.15) * (1 + 0.35 * Math.pow(Math.abs(a) / 1.2, 2)) * (1 - 0.1 * Math.abs(Math.sin(i * 2.3)));
      const g = this.group(this.j.head, [0, 0, 0], [0, a, 0]);
      // Each clump is a soft rounded lock with only a hint of a point, overlapping its neighbours.
      const w = (o.w || 0.12) * 0.7, col = colorAt(a), y = (o.y || 0.215) - len / 2;
      this.part(g, G.sph(), col, { p: [0, y + len * 0.04, 0.287], r: [-0.22, 0, 0], s: [w, len * 0.52, w * 0.45] });
      this.part(g, G.cone(w * 0.5, len * 0.2, 8), col, { p: [0, y - len * 0.42, 0.293], r: [Math.PI - 0.22, 0, 0], s: [1, 1, 0.45], ink: false });
    }
  }
  // Long strands down the sides of the face.
  sideLocks(colorAt, len = 0.34, a = 1.42, y = 0.1) {
    [-1, 1].forEach(s => {
      const g = this.group(this.j.head, [0, 0, 0], [0, s * a, 0]);
      this.part(g, G.cone(0.075, len, 7), colorAt(s * a), { p: [0, y - len / 2, 0.29], r: [Math.PI - 0.08, 0, 0], s: [1, 1, 0.5] });
    });
  }
  // A swinging tail of hair (ponytail / twin tail) from a pivot on the head.
  hairTail(color, p, r, len = 0.42, rad = 0.085, o = {}) {
    const piv = this.group(this.j.head, p, r);
    // The tie, a tapered main lock, and a thinner lock beside it.
    this.part(piv, G.sph(), color, { s: rad * 0.95 });
    this.part(piv, G.cone(rad * 1.3, len + rad, 10), color, { p: [0, -(len + rad) / 2, 0], r: [Math.PI, 0, 0], s: [1, 1, o.flat || 0.72] });
    this.part(piv, G.cone(rad * 0.8, len * 0.78, 8), color, { p: [rad * 0.55, -len * 0.42, -rad * 0.3], r: [Math.PI, 0, -0.2], s: [1, 1, 0.7] });
    this.sway.push({ obj: piv, base: piv.rotation.clone(), amp: o.amp || 0.12, f: o.f || 2.2, ph: Math.random() * 6, axis: o.axis || 'z' });
    return piv;
  }
  bow(parent, color, p, s = 1, r = [0, 0, 0], tails = false) {
    const g = this.group(parent, p, r);
    g.scale.setScalar(s);
    [-1, 1].forEach(k => this.part(g, G.cone(0.05, 0.1, 8), color, { p: [k * 0.05, 0, 0], r: [0, 0, -k * Math.PI / 2], s: [1, 1, 0.55] }));
    this.part(g, G.sph(), shadeHex(color, -0.08), { s: 0.026 });
    if (tails) [-1, 1].forEach(k => this.part(g, G.cap(0.014, 0.08), color, { p: [k * 0.025, -0.06, 0], r: [0, 0, k * 0.3] }));
    return g;
  }
  tube(parent, pts, rad, color, o = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    return this.part(parent, new THREE.TubeGeometry(curve, 16, rad, 7, false), color, o);
  }

  // ----- real model (.glb) -----
  buildGlb(entry) {
    let rigged = false;
    entry.gltf.scene.traverse(m => { if (m.isSkinnedMesh && m.userData.rig) rigged = true; });
    if (rigged) return this.buildRigged(entry);
    const gltf = entry.gltf, scene = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene), size = box.getSize(new THREE.Vector3());
    const k = 1.3 / Math.max(0.01, size.y);
    scene.scale.setScalar(k);
    scene.position.y = -box.min.y * k;
    this.rig.add(scene);
    this.glb = { mixer: new THREE.AnimationMixer(scene), clips: {} };
    gltf.animations.forEach(c => { this.glb.clips[c.name.toLowerCase()] = this.glb.mixer.clipAction(c); });
    scene.traverse(m => { if (m.isMesh && m.material) [].concat(m.material).forEach(x => { if (x.emissive) { x.userData.emissive0 = x.emissive.clone(); x.userData.ei0 = x.emissiveIntensity; this.mats.push(x); } }); });
  }
  // A model from tools/model-prep.html: a skinned mesh whose bones are named like the chibi's
  // joints, so apply() moves it with the same animations. A tint recolours it for another member.
  buildRigged(entry) {
    const L = this.look, j = this.j, scene = THREE_X.SkeletonUtils.clone(entry.gltf.scene);
    let mesh = null;
    scene.traverse(m => { if (m.isSkinnedMesh) mesh = mesh || m; });
    const info = mesh.userData.rig, h = info.height, k = 1.3 / h;
    scene.scale.setScalar(k);
    this.rig.add(scene);
    const mat = toonMat('#ffffff', { rimAmt: 0.2, recolor: entry.tint && Object.assign({ hue: 20 / 360 }, entry.tint) });
    mat.map = entry.map;
    mesh.material = mat;
    this.mats.push(mat);
    // outline: a second copy on the same skeleton, pushed out a little
    const ink = new THREE.SkinnedMesh(mesh.geometry, inkSkinMat(0.0032));
    ink.position.copy(mesh.position); ink.quaternion.copy(mesh.quaternion); ink.scale.copy(mesh.scale);
    mesh.parent.add(ink);
    ink.bind(mesh.skeleton, mesh.bindMatrix);
    ['hips', 'torso', 'head', 'armL', 'armR', 'legL', 'legR'].forEach(n => { j[n] = mesh.skeleton.getBoneByName(n); });
    this.rigged = { k, hipsY: j.hips.position.y, armRest: info.armRest };
    // eye level for the Ultimate close-up (a chibi's face is at about 1.0)
    this.faceY = (j.hips.position.y + j.torso.position.y + j.head.position.y + 0.07 * h) * k;
    // The weapon hand sits at her right hand, turned like a chibi fist (weapons are sized in chibi units).
    j.hand = new THREE.Group();
    j.hand.position.fromArray(info.hand);
    j.hand.quaternion.setFromEuler(new THREE.Euler(0, 0, -info.armRest)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
    j.hand.scale.setScalar(1 / k);
    j.armR.add(j.hand);
    // Member extras go on a "chibi head" (radius 0.3) fitted over hers.
    if (entry.tint && GLB_EXTRAS[this.id]) {
      const acc = this.group(j.head, [0, 0.115 * h, -0.01 * h]);
      acc.scale.setScalar(0.105 * h / 0.3);
      GLB_EXTRAS[this.id].call(this, acc, entry.tint);
    }
    if (L.weapon && WEAPONS[L.weapon]) WEAPONS[L.weapon].call(this, j.hand, L);
  }
  glbPlay(names) {
    const g = this.glb, name = names.find(n => g.clips[n]);
    if (!name || g.now === name) return;
    const next = g.clips[name];
    next.reset().fadeIn(0.15).play();
    if (g.now) g.clips[g.now].fadeOut(0.15);
    g.now = name;
  }

  // Echo enemies: the same chibi as a cyan hologram.
  hologram(color) {
    const glow = new THREE.MeshToonMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.55, gradientMap: c3().ramp, transparent: true, opacity: 0.78 });
    glow.userData.emissive0 = glow.emissive.clone(); glow.userData.ei0 = 0.55;
    this.mats = [glow];
    this.root.traverse(m => {
      if (!m.isMesh) return;
      if (m.material.isShaderMaterial) m.material = inkMat(m.material.uniforms.thick.value, '#0a5a7a');
      else if (m !== this.faceMesh) m.material = glow;
    });
  }

  // ----- control -----
  setState(s) { this.state = s; }
  play(name, speed = 1) {
    const def = CHIBI_ACTS[name];
    if (!def) return;
    this.action = { def, t: 0, dur: def.dur / speed };
    if (def.face != null) this.setFace(def.face, def.dur / speed + 0.1);
    if (this.glb) this.glbPlay(name === 'hit' ? ['hit', 'damage'] : name === 'cheer' || name === 'peace' ? ['victory', 'win', 'cheer'] : name === 'cast' ? ['skill', 'cast', 'attack'] : ['attack', 'skill']);
  }
  setFace(frame, hold = 0.6) { this.frame = frame; this.faceHold = hold; }
  flash(color = '#ffffff', t = 0.12) { this.flashColor.set(color); this.flashT = t; this.flashMax = t; }

  update(dt) {
    this.t += dt;
    const c = this.ch, tg = Object.assign({}, CH0), t = this.t;
    if (this.state === 'run') {
      this.runPhase += dt * 13;
      const p = this.runPhase, s = Math.sin(p);
      // Run: big bouncy strides with a forward lean and a squash on each landing.
      const c = Math.abs(Math.cos(p));
      Object.assign(tg, { llx: -s * 0.95, lrx: s * 0.95, alx: s * 1.0, arx: -s * 1.0, alz: 0.28, arz: -0.28,
        by: c * 0.07 - 0.015, sq: 0.94 + c * 0.1, bx: 0.26, hx: -0.12, bry: s * 0.14, brz: s * 0.04 });
    } else if (this.state === 'ko') {
      Object.assign(tg, { ko: 1, alz: 1.1, arz: -1.1, hx: 0.2, llx: -0.2, lrx: 0.15 });
      this.frame = 3;
    } else if (this.state === 'win') {
      Object.assign(tg, { jy: Math.max(0, Math.sin(t * 5)) * 0.18, arx: -2.7, arz: -0.4, alz: 0.4, hz: Math.sin(t * 2) * 0.1 });
      this.frame = 2;
    } else {
      // Idle: a springy breathing bob, a gentle sway and the weapon hand held a little forward.
      const b = Math.sin(t * 2.6);
      Object.assign(tg, { by: b * 0.012, sq: 1 + b * 0.012, bx: 0.05, brz: Math.sin(t * 1.1) * 0.03, hz: Math.sin(t * 0.9) * 0.06, hx: Math.sin(t * 1.3) * 0.03,
        alx: b * 0.06, alz: 0.16 + b * 0.03, arx: -0.35 - b * 0.05, arz: -0.2 - b * 0.03, llx: 0.06, lrx: -0.06 });
    }
    let rate = 16, spin = 0;
    const a = this.action;
    if (a) {
      a.t += dt;
      const k = Math.min(1, a.t / a.dur), keys = a.def.keys;
      let i = 0;
      while (i < keys.length - 2 && k > keys[i + 1][0]) i++;
      const [k0, p0] = keys[i], [k1, p1] = keys[Math.min(i + 1, keys.length - 1)];
      const f = k1 > k0 ? Math.min(1, (k - k0) / (k1 - k0)) : 1, e = f * f * (3 - 2 * f);
      Object.keys(Object.assign({}, p0, p1)).forEach(ch => {
        const v0 = ch in p0 ? p0[ch] : tg[ch], v1 = ch in p1 ? p1[ch] : tg[ch];
        tg[ch] = v0 + (v1 - v0) * e;
      });
      if (a.def.spin) spin = a.def.spin * (1 - Math.pow(1 - k, 2));
      rate = 34;
      if (k >= 1) this.action = null;
    }
    const kk = 1 - Math.exp(-dt * rate);
    Object.keys(CH0).forEach(ch => { c[ch] += (tg[ch] - c[ch]) * kk; });
    // jump height follows the keys directly so leaps land crisply
    if (a && 'jy' in (a.def.keys[0][1])) c.jy = tg.jy;
    this.spinNow = spin;
    this.apply(dt);
  }

  apply(dt) {
    const c = this.ch, j = this.j, r = this.rig;
    r.position.y = c.jy * .72 + c.ko * 0.1;
    r.position.z = -c.ko * 0.35;
    r.rotation.set(-c.ko * 1.42, this.spinNow, 0);
    const sq = Math.max(.85, 1 + (c.sq - 1) * .35);
    r.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    if (this.glb) {
      this.glb.mixer.update(dt);
      if (!this.action) this.glbPlay(this.state === 'run' ? ['run', 'walk'] : this.state === 'ko' ? ['ko', 'die', 'death'] : this.state === 'win' ? ['victory', 'win'] : ['idle']);
    } else {
      if (this.rigged) {
        // Her arms already hang out at armRest in the model, and her skirt is long: shorter strides.
        const R = this.rigged;
        j.hips.position.y = R.hipsY + c.by / R.k;
        j.torso.rotation.set(c.bx * 0.7, c.bry, c.brz);
        j.head.rotation.set(c.hx, c.hy, c.hz);
        j.armL.rotation.set(c.alx, 0, c.alz - R.armRest);
        j.armR.rotation.set(c.arx, 0, c.arz + R.armRest);
        j.legL.rotation.x = c.llx * 0.5; j.legR.rotation.x = c.lrx * 0.5;
      } else {
        j.hips.position.y = 0.36 + c.by;
        j.torso.rotation.set(c.bx, c.bry, c.brz);
        j.head.rotation.set(c.hx, c.hy, c.hz);
        j.armL.rotation.set(c.alx, 0, c.alz);
        j.armR.rotation.set(c.arx, 0, c.arz);
        j.legL.rotation.x = c.llx; j.legR.rotation.x = c.lrx;
        j.skirt.rotation.x = Math.max(-0.2, Math.min(0.2, (c.llx + c.lrx) * 0.1)) + c.bx * 0.2;
      }
      const runAmp = this.state === 'run' ? 2.2 : 1;
      this.sway.forEach(s => {
        const w = Math.sin(this.t * s.f + s.ph) * s.amp * runAmp;
        s.obj.rotation[s.axis] = s.base[s.axis] + w;
        if (s.lag) s.obj.rotation.x = s.base.x + (this.state === 'run' ? s.lag : 0);
      });
    }
    // Face: blink every few seconds unless an expression is being held.
    if (this.faceTex) {
      if (this.faceHold > 0) this.faceHold -= dt;
      else if (this.state !== 'ko' && this.state !== 'win') {
        this.blinkAt -= dt;
        this.frame = this.blinkAt < 0 ? 1 : 0;
        if (this.blinkAt < -0.12) this.blinkAt = 1.5 + Math.random() * 3;
      }
      this.faceTex.offset.x = this.frame / FACE_FRAMES;
    }
    // Hit flash.
    if (this.flashT > 0 || this.flashing) {
      this.flashT = Math.max(0, this.flashT - dt);
      const k = this.flashT / (this.flashMax || 1);
      this.mats.forEach(m => {
        m.emissive.copy(m.userData.emissive0).lerp(this.flashColor, k);
        m.emissiveIntensity = Math.max(m.userData.ei0, k * 0.9);
      });
      this.flashing = this.flashT > 0;
    }
  }

  dispose() { if (this.faceTex) this.faceTex.dispose(); this.mats.forEach(m => m.dispose && m.dispose()); }
}

// ---------- 3D model viewer (Members screen) ----------
// A turntable for a member's chibi with buttons for each animation. Drag to turn her.
async function openChibiViewer(id) {
  const c = CHARACTERS[id], kit = ACTION_KITS[id];
  const acts = [['idle', 'Idle'], ['run', 'Run'], ['attack', 'Attack'], ['cast', 'Ultimate'], ['dodge', 'Dodge'], ['hit', 'Hit'], ['win', 'Victory'], ['ko', 'Knocked out']];
  openModal(`<div class="picker-head"><h3>${ic('eye')} ${c.name}</h3><button class="btn small close">${ic('close')}</button></div>
    <div class="cz"><canvas class="cz-cv"></canvas><div class="cz-load">Loading 3D…</div></div>
    <div class="cz-acts">${acts.map(([k, l]) => `<button class="pill ${k === 'idle' ? 'yellow' : 'dark'}" data-cz="${k}">${l}</button>`).join('')}</div>
    <p class="cz-note">A stand-in chibi built from simple shapes, coloured from ${c.short}'s art. Drag to turn her around.</p>`);
  const box = document.querySelector('#pull .picker-box');
  box.classList.add('cz-box');
  if (!(await whenThree())) { const l = box.querySelector('.cz-load'); if (l) l.textContent = 'The 3D engine could not load. Check your connection.'; return; }
  await loadChibiModels();
  const cv = box.querySelector('.cz-cv');
  if (!cv || !cv.isConnected) return;
  box.querySelector('.cz-load').remove();
  const credit = CHIBI_GLB[id] && MODEL_CREDITS[CHIBI_GLB[id].file];
  if (credit) box.querySelector('.cz-note').textContent = `3D model: ${credit.title.split(' (')[0]} by ${credit.by} (${credit.license})` +
    (CHIBI_GLB[id].tint ? `, recoloured as a stand-in for ${c.short}.` : '.') + ' Drag to turn her around.';
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  cam.position.set(0, 1.0, 3.7);
  cam.lookAt(0, 0.62, 0);
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9aacb', 1.2));
  const sun = new THREE.DirectionalLight('#fff3e6', 1.9);
  sun.position.set(-2, 4, 3);
  scene.add(sun);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.08, 48), toonMat(shadeHex(c.color, -0.1)));
  disc.position.y = -0.04;
  scene.add(disc);
  const ch = new Chibi(id);
  scene.add(ch.root);
  let rot = 0.5, drag = null, last = performance.now(), mode = 'idle', next = 0, step = 0;
  const size = () => { const w = cv.clientWidth || 400, h = cv.clientHeight || 400; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  size();
  cv.onpointerdown = e => { e.stopPropagation(); drag = e.clientX; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } };
  cv.onpointermove = e => { if (drag != null) { rot += (e.clientX - drag) * 0.012; drag = e.clientX; } };
  cv.onpointerup = () => { drag = null; };
  cv.onclick = e => e.stopPropagation();
  box.querySelectorAll('[data-cz]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    mode = b.dataset.cz; next = 0; step = 0;
    box.querySelectorAll('[data-cz]').forEach(x => x.className = 'pill ' + (x === b ? 'yellow' : 'dark'));
  });
  const loop = t => {
    if (!cv.isConnected) { ch.dispose(); r.dispose(); return; }
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (drag == null) rot += dt * 0.45;
    ch.root.rotation.y = rot;
    next -= dt;
    ch.setState(mode === 'run' ? 'run' : mode === 'win' ? 'win' : mode === 'ko' ? 'ko' : 'idle');
    if (next <= 0) {
      if (mode === 'attack') { const s = kit.basic.combo[step++ % kit.basic.combo.length]; ch.play(s.act); next = s.t + 0.08; }
      else if (mode === 'cast') { ch.play('cast'); next = 1.2; }
      else if (mode === 'dodge') { ch.play('dash'); next = 0.8; }
      else if (mode === 'hit') { ch.play('hit'); ch.flash('#ff3355', 0.18); next = 0.9; }
      else next = 1;
    }
    ch.update(dt);
    r.render(scene, cam);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------- per-member features ----------
// Called with this = the Chibi, after the body and face exist.
const CHIBI_BUILD = {
  default(L) {
    const hc = () => L.hair;
    this.hairCap(L.hair); this.hairBack(L.hair, 2.15);
    this.bangs(hc); this.sideLocks(hc, 0.3);
    this.backFringe(hc, { y: -0.17 });
  },
  // Short brown bob with a blonde streak and a small knot on her left; vest, green bow, backpack.
  sendo(L, j) {
    const hc = a => (a > 0.75 && a < 1.2 ? L.hair2 : L.hair);
    this.hairCap(L.hair, -0.4, 0.322);
    this.hairBack(L.hair, 2.3, 0.335, 1.1);
    this.bangs(hc, { n: 7, len: 0.15, from: -1.2, to: 1.2 });
    this.sideLocks(a => (a > 0 ? L.hair2 : L.hair), 0.3, 1.32, 0.08);
    this.sideLocks(() => L.hair, 0.28, 1.75, 0.06);
    this.backFringe(() => L.hair, { y: -0.2, len: 0.12, n: 10, spread: 1.95 });
    this.ahoge(L.hair, [-0.03, 0.3, 0.05]);
    const knot = this.group(j.head, [0.17, 0.25, -0.06]);
    this.part(knot, G.sph(), L.hair, { s: 0.085 });
    this.part(knot, G.tor(0.05, 0.02), L.hair, { p: [0.04, 0.07, 0], r: [0, 0.3, 0.6] });
    this.bow(j.torso, '#2f7d4a', [0, 0.24, 0.13], 0.75, [0.25, 0, 0], true);
    // collar
    this.part(j.torso, G.cone(0.06, 0.06, 3), '#fbf8f2', { p: [0.045, 0.27, 0.11], r: [Math.PI + 0.4, 0, 0.3], ink: false });
    this.part(j.torso, G.cone(0.06, 0.06, 3), '#fbf8f2', { p: [-0.045, 0.27, 0.11], r: [Math.PI + 0.4, 0, -0.3], ink: false });
    // jacket tied round the waist
    this.part(j.hips, G.tor(0.17, 0.035, Math.PI * 2, 28), '#3c414f', { p: [0, 0.07, 0], r: [Math.PI / 2, 0, 0] });
    this.part(j.hips, G.cap(0.035, 0.12), '#3c414f', { p: [0.04, 0.0, 0.16], r: [0.2, 0, 0.35] });
    this.part(j.hips, G.cap(0.035, 0.12), '#3c414f', { p: [-0.04, 0.0, 0.16], r: [0.2, 0, -0.35] });
    // backpack
    this.part(j.torso, G.cap(0.12, 0.1), '#25262c', { p: [0, 0.13, -0.16], s: [1.05, 1, 0.55] });
    this.part(j.torso, G.tor(0.12, 0.016, Math.PI, 16), '#25262c', { p: [0.09, 0.2, -0.02], r: [0, Math.PI / 2, 0], ink: false });
    this.part(j.torso, G.tor(0.12, 0.016, Math.PI, 16), '#25262c', { p: [-0.09, 0.2, -0.02], r: [0, Math.PI / 2, 0], ink: false });
  },
  // Split hair: pink on her right, dark brown on her left; long and wavy; pink ribbons; frilly blouse.
  hinano(L, j) {
    const hc = a => (a < 0 ? L.hair2 : L.hair);
    const capL = this.group(j.head), capR = this.group(j.head);
    this.part(capL, geo('hcapH', () => new THREE.SphereGeometry(0.318, 20, 14, Math.PI / 2, Math.PI, 0, Math.PI / 2)), L.hair, { r: [-0.42, 0, 0] });
    this.part(capR, geo('hcapH2', () => new THREE.SphereGeometry(0.318, 20, 14, -Math.PI / 2, Math.PI, 0, Math.PI / 2)), L.hair2, { r: [-0.42, 0, 0] });
    this.part(j.head, geo('hbackHL', () => new THREE.SphereGeometry(0.33, 18, 16, Math.PI, Math.PI / 2, 0.3, 1.85)), L.hair, { m: { side: THREE.DoubleSide } });
    this.part(j.head, geo('hbackHR', () => new THREE.SphereGeometry(0.33, 18, 16, Math.PI * 1.5, Math.PI / 2, 0.3, 1.85)), L.hair2, { m: { side: THREE.DoubleSide } });
    this.bangs(hc, { n: 7, len: 0.155 });
    this.sideLocks(hc, 0.5, 1.4, 0.08);
    // long locks down the back, pink on her right and brown on her left
    const split = a => (Math.sin(a) < 0 ? L.hair2 : L.hair);
    this.longHair(split, { n: 6, len: 0.64, w: 0.125, spread: 2.2 });
    this.backFringe(split, { y: -0.17, len: 0.12 });
    this.hairShine('#ffe0ee');
    this.backShine('#ffe0ee', 0.33, 1);
    this.bow(j.head, '#ff9cc4', [0.27, 0.12, -0.06], 1.1, [0, 0.9, -0.3], true);
    this.bow(j.head, '#ff9cc4', [-0.27, 0.12, -0.06], 0.9, [0, -0.9, 0.3], true);
    this.bow(j.torso, '#1c1417', [0, 0.24, 0.13], 0.8, [0.25, 0, 0], true);
    this.part(j.torso, G.sph(), '#3f6dff', { p: [0, 0.24, 0.155], s: 0.02, ink: false, m: { emissive: '#3f6dff', ei: 0.4 } });
    // frilly collar
    this.part(j.torso, G.tor(0.11, 0.03, Math.PI * 2, 18), '#ffffff', { p: [0, 0.27, 0.01], r: [Math.PI / 2 - 0.15, 0, 0] });
  },
  // Blonde short hair with a braid, teal eyes, navy officer cap with a red band and gold badge.
  noah(L, j) {
    const hc = () => L.hair;
    this.hairCap(L.hair, -0.38);
    this.hairBack(L.hair, 2.2, 0.332, 1.08);
    this.bangs(hc, { n: 7, len: 0.15 });
    this.sideLocks(hc, 0.32, 1.38, 0.08);
    this.backFringe(hc, { y: -0.18, len: 0.12 });
    // braid on her right side
    for (let i = 0; i < 4; i++) this.part(j.head, G.sph(), L.hair, { p: [-0.29 - i * 0.004, 0.02 - i * 0.07, 0.06 - i * 0.01], s: 0.04 - i * 0.003 });
    // cap
    const cap = this.group(j.head, [0, 0.21, -0.02], [-0.18, 0, 0.06]);
    this.part(cap, G.cyl(0.36, 0.3, 0.13, 28), '#262b4d', { p: [0, 0.07, 0] });
    this.part(cap, G.cyl(0.302, 0.302, 0.055, 28), '#b8233a', { p: [0, 0.01, 0] });
    this.part(cap, G.tor(0.3, 0.012, Math.PI * 2, 28), '#e9c25a', { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0], ink: false });
    this.part(cap, geo('visor', () => new THREE.CylinderGeometry(0.33, 0.33, 0.02, 24, 1, false, -Math.PI / 2, Math.PI)), '#15172a', { p: [0, -0.02, 0.06], r: [0.18, 0, 0] });
    this.part(cap, G.sph(), '#e9c25a', { p: [0, 0.09, 0.33], s: [0.06, 0.06, 0.03], m: { emissive: '#e9c25a', ei: 0.25 } });
    this.part(cap, G.sph(), '#44e0c8', { p: [0, 0.09, 0.355], s: [0.025, 0.025, 0.012], ink: false, m: { emissive: '#44e0c8', ei: 0.6 } });
    // uniform details: gold buttons, teal sash, red front
    [0.18, 0.12, 0.06].forEach(y => this.part(j.torso, G.sph(), '#e9c25a', { p: [0.05, y, 0.125], s: 0.015, ink: false }));
    this.part(j.torso, G.tor(0.15, 0.022, Math.PI, 16), '#5fe0c8', { p: [0, 0.12, 0.01], r: [0, 0, 0.9] });
    this.bow(j.hips, '#b8233a', [0, 0.02, 0.17], 1.1, [0.1, 0, 0], true);
  },
  // Red side ponytail, cat ears and tail, maid headdress; black dress with a paint-splashed apron.
  tsuna(L, j) {
    const hc = () => L.hair;
    this.hairCap(L.hair, -0.4);
    this.hairBack(L.hair, 2.2, 0.332, 1.06);
    this.bangs(hc, { n: 7, len: 0.16 });
    this.sideLocks(hc, 0.36, 1.4, 0.08);
    this.backFringe(hc, { y: -0.18, len: 0.13 });
    this.ahoge(L.hair);
    const tail = this.hairTail(L.hair, [0.22, 0.2, -0.14], [0.3, 0, 0.26], 0.46, 0.09, { amp: 0.1 });
    this.bow(tail, '#18171c', [0, 0.02, 0], 0.8, [0, 0, 0], true);
    // cat ears
    [-1, 1].forEach(s => {
      const ear = this.group(j.head, [s * 0.18, 0.25, -0.04], [-0.1, 0, -s * 0.42]);
      this.part(ear, G.cone(0.085, 0.16, 4), L.hair, { p: [0, 0.06, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 0.55] });
      this.part(ear, G.cone(0.05, 0.1, 4), '#ff9db0', { p: [0, 0.05, 0.025], r: [0, Math.PI / 4, 0], s: [1, 1, 0.3], ink: false });
    });
    // maid headdress: a white band with frills across the top
    this.part(j.head, G.tor(0.3, 0.022, Math.PI, 20), '#ffffff', { p: [0, 0.03, 0.02], r: [-0.25, 0, 0] });
    for (let i = 0; i < 5; i++) {
      const a = 0.35 + i * 0.6;
      this.part(j.head, G.sph(), '#ffffff', { p: [Math.cos(a) * 0.3, 0.03 + Math.sin(a) * 0.29 * Math.cos(0.25), 0.02 + Math.sin(a) * 0.3 * Math.sin(-0.25) + 0.03], s: 0.04, ink: false });
    }
    // apron with paint splashes, bell at the collar
    this.part(j.torso, G.sph(), '#ffffff', { p: [0, 0.11, 0.1], s: [0.11, 0.13, 0.05] });
    this.part(j.hips, G.cyl(0.16, 0.24, 0.17, 14, true), '#ffffff', { p: [0, -0.06, 0.012], s: [1, 1, 1], m: { side: THREE.DoubleSide } });
    [['#ff5aa0', 0.04, 0.16], ['#ffcf3a', -0.05, 0.09], ['#4d8bff', 0.03, 0.04]].forEach(([col, x, y]) =>
      this.part(j.torso, G.sph(), col, { p: [x, y, 0.152], s: [0.025, 0.025, 0.006], ink: false }));
    this.part(j.torso, G.sph(), '#f3c24a', { p: [0, 0.235, 0.14], s: 0.024, m: { emissive: '#f3c24a', ei: 0.3 } });
    // cat tail
    const piv = this.group(j.hips, [0, 0.02, -0.15]);
    this.tube(piv, [[0, 0, 0], [0.02, -0.08, -0.12], [0.08, 0.02, -0.24], [0.1, 0.16, -0.26]], 0.028, L.hair);
    this.sway.push({ obj: piv, base: piv.rotation.clone(), amp: 0.35, f: 2.6, ph: 0, axis: 'y' });
  },
  // Black hair with blue streaks and two side-ups; blue devil horns, wings and tail; gothic dress.
  uruha(L, j) {
    const hc = a => (Math.abs(a - 0.55) < 0.2 || Math.abs(a + 0.9) < 0.15 ? L.hair2 : L.hair);
    this.hairCap(L.hair, -0.4);
    this.hairBack(L.hair, 2.2, 0.334, 1.07);
    this.bangs(hc, { n: 8, len: 0.165, from: -1.2, to: 1.2, w: 0.105 });
    this.sideLocks(a => (a > 0 ? L.hair2 : L.hair), 0.5, 1.4, 0.08);
    // long black locks with a blue streak on her left
    this.longHair(a => (Math.abs(a - Math.PI + 0.45) < 0.2 ? L.hair2 : L.hair), { n: 6, len: 0.68, w: 0.125, spread: 2.2 });
    this.backFringe(hc, { y: -0.18, len: 0.13 });
    [-1, 1].forEach(s => {
      const t = this.hairTail(L.hair, [s * 0.2, 0.22, -0.12], [0.3, 0, s * 0.9], 0.16, 0.06, { amp: 0.08 });
      this.bow(t, '#2f4fe8', [0, 0, 0.02], 0.7);
      // horns
      this.part(j.head, G.cone(0.045, 0.17, 8), '#2a4bd6', { p: [s * 0.15, 0.3, 0.02], r: [-0.25, 0, -s * 0.5], m: { emissive: '#2a4bd6', ei: 0.15 } });
    });
    // wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(0.55, 0.32); wingShape.lineTo(0.62, 0.1);
    wingShape.quadraticCurveTo(0.5, 0.0, 0.42, -0.12); wingShape.quadraticCurveTo(0.32, -0.02, 0.24, -0.14);
    wingShape.quadraticCurveTo(0.14, -0.04, 0, -0.1); wingShape.lineTo(0, 0);
    const wingGeo = geo('wing', () => new THREE.ExtrudeGeometry(wingShape, { depth: 0.012, bevelEnabled: false }));
    [-1, 1].forEach(s => {
      const piv = this.group(j.torso, [s * 0.06, 0.2, -0.12], [0, s > 0 ? -0.5 : Math.PI + 0.5, 0]);
      this.part(piv, wingGeo, '#2445c8', { s: 0.5, m: { side: THREE.DoubleSide, emissive: '#1b2f9a', ei: 0.2 } });
      this.sway.push({ obj: piv, base: piv.rotation.clone(), amp: 0.22, f: 3.2, ph: s > 0 ? 0 : Math.PI, axis: 'y' });
    });
    // devil tail with a spade tip
    const piv = this.group(j.hips, [0, 0.02, -0.15]);
    this.tube(piv, [[0, 0, 0], [0.04, -0.1, -0.12], [0.12, -0.02, -0.25], [0.16, 0.13, -0.3]], 0.016, '#2445c8');
    this.part(piv, G.cone(0.05, 0.09, 4), '#2445c8', { p: [0.165, 0.18, -0.3], r: [0, 0, 0], s: [1, 1, 0.4] });
    this.sway.push({ obj: piv, base: piv.rotation.clone(), amp: 0.3, f: 2.1, ph: 2, axis: 'y' });
    // white frills and blue bow on the dress
    this.part(j.torso, G.cone(0.07, 0.16, 8), '#f2f2f6', { p: [0, 0.16, 0.1], r: [Math.PI, 0, 0], s: [1, 1, 0.5] });
    this.bow(j.torso, '#2f4fe8', [0, 0.25, 0.135], 0.85, [0.2, 0, 0]);
    [-1, 1].forEach(s => this.part(j['arm' + (s > 0 ? 'L' : 'R')], G.cone(0.075, 0.1, 10, false), L.sleeve, { p: [0, -0.15, 0], s: [1, 1, 1] }));
  },
  // Ash-blonde double buns with long twin tails, black ribbons and a white flower; pink and white.
  lisa(L, j) {
    const hc = () => L.hair;
    this.hairCap(L.hair, -0.42);
    this.hairBack(L.hair, 2.1, 0.332, 1.04);
    this.bangs(hc, { n: 7, len: 0.155 });
    this.sideLocks(hc, 0.4, 1.4, 0.08);
    this.backFringe(hc, { y: -0.15, len: 0.12 });
    [-1, 1].forEach(s => {
      this.part(j.head, G.sph(), L.hair, { p: [s * 0.2, 0.25, -0.08], s: 0.1 });
      const t = this.hairTail(L.hair, [s * 0.24, 0.12, -0.12], [0.08, 0, s * 0.28], 0.62, 0.08, { tip: true, amp: 0.07, s: [1, 1, 0.75] });
      this.bow(t, '#1b1a22', [0, 0.02, 0.02], 0.7, [0, 0, 0], true);
    });
    // white flower on her left bun
    const fl = this.group(j.head, [0.27, 0.27, -0.02], [0, 0.6, 0]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; this.part(fl, G.sph(), '#ffffff', { p: [Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0], s: [0.028, 0.028, 0.014], ink: false }); }
    this.part(fl, G.sph(), '#ffd36b', { s: 0.016, ink: false });
    // qipao details: high collar knots, puffy pink sleeves
    this.part(j.torso, G.cyl(0.075, 0.09, 0.05, 14), '#fbfbff', { p: [0, 0.29, 0] });
    [0.24, 0.19].forEach(y => this.part(j.torso, G.tor(0.016, 0.006), '#1b1a22', { p: [0.02, y, 0.135], ink: false }));
    [-1, 1].forEach(s => this.part(j['arm' + (s > 0 ? 'L' : 'R')], G.sph(), '#f6c3d2', { p: [0, -0.05, 0], s: [0.085, 0.09, 0.085] }));
  },
};

// Weapons held in the right hand (local +Y points forward from the fist).
const WEAPONS = {
  sunorb(hand) {
    const g = this.group(hand, [0, 0.12, 0]);
    this.part(g, G.sph(), '#ffcf5a', { s: 0.07, m: { emissive: '#ff9a2e', ei: 1.2 }, ink: false });
    this.part(g, G.tor(0.1, 0.008), '#ffe08a', { r: [0.6, 0, 0], ink: false, m: { emissive: '#ffb347', ei: 1 } });
    this.sway.push({ obj: g, base: g.rotation.clone(), amp: 3, f: 0.5, ph: 0, axis: 'y' });
  },
  lollipop(hand) {
    this.part(hand, G.cyl(0.016, 0.016, 0.5, 8), '#fff4f8', { p: [0, 0.18, 0] });
    const head = this.group(hand, [0, 0.5, 0]);
    this.part(head, G.sph(), '#ff7eb6', { s: 0.15 });
    [0, 1.05, 2.1].forEach(a => this.part(head, G.tor(0.151, 0.014, Math.PI * 2, 28), '#ffffff', { r: [a, a * 0.7, 0], ink: false }));
    this.bow(hand, '#ff9cc4', [0, 0.32, 0], 0.6, [0, 0, 0], true);
    this.tip = this.group(hand, [0, 0.62, 0]); this.tipBase = this.group(hand, [0, 0.3, 0]);
  },
  sabre(hand) {
    this.part(hand, G.cyl(0.02, 0.02, 0.12, 8), '#2a1d2c', { p: [0, -0.02, 0] });
    this.part(hand, G.tor(0.045, 0.012, Math.PI * 1.2), '#e9c25a', { p: [0, 0.04, 0], r: [0, Math.PI / 2, 0], ink: false });
    this.part(hand, G.box(0.04, 0.6, 0.012), '#e4ebfa', { p: [0, 0.36, 0], m: { emissive: '#9fc2ff', ei: 0.25 } });
    this.part(hand, G.cone(0.02, 0.07, 4), '#e4ebfa', { p: [0, 0.69, 0], s: [1, 1, 0.3], m: { emissive: '#9fc2ff', ei: 0.25 } });
    this.tip = this.group(hand, [0, 0.72, 0]); this.tipBase = this.group(hand, [0, 0.16, 0]);
  },
  brush(hand) {
    this.part(hand, G.cyl(0.02, 0.024, 0.48, 8), '#8a5a3a', { p: [0, 0.14, 0] });
    this.part(hand, G.cyl(0.032, 0.03, 0.08, 10), '#cfd6e2', { p: [0, 0.41, 0] });
    this.part(hand, G.cone(0.05, 0.16, 10), '#ff3a52', { p: [0, 0.53, 0], m: { emissive: '#ff2a44', ei: 0.35 } });
    this.tip = this.group(hand, [0, 0.62, 0]); this.tipBase = this.group(hand, [0, 0.3, 0]);
  },
  pistol(hand) {
    this.part(hand, G.box(0.05, 0.08, 0.05), '#1a1c26', { p: [0, 0.02, -0.02] });
    this.part(hand, G.box(0.055, 0.22, 0.06), '#232638', { p: [0, 0.1, 0.03] });
    this.part(hand, G.cyl(0.018, 0.018, 0.08, 10), '#3f66ff', { p: [0, 0.23, 0.04], m: { emissive: '#3f66ff', ei: 0.8 }, ink: false });
  },
  fork(hand) {
    this.part(hand, G.cyl(0.018, 0.018, 0.42, 8), '#e9ebf2', { p: [0, 0.14, 0] });
    this.part(hand, G.box(0.11, 0.05, 0.02), '#e9ebf2', { p: [0, 0.37, 0] });
    [-0.04, 0, 0.04].forEach(x => this.part(hand, G.box(0.016, 0.13, 0.016), '#e9ebf2', { p: [x, 0.45, 0] }));
    this.part(hand, G.tor(0.06, 0.03, Math.PI * 2, 18), '#c9884e', { p: [0, 0.47, 0], r: [0, 0, 0] });
    this.part(hand, G.tor(0.06, 0.018, Math.PI * 2, 18), '#ff8fb8', { p: [0, 0.47, 0.016], ink: false });
    this.tip = this.group(hand, [0, 0.52, 0]); this.tipBase = this.group(hand, [0, 0.22, 0]);
  },
};

// Signature extras for members wearing a recoloured stand-in model, placed on a "chibi head"
// (radius 0.3) fitted over hers, so they reuse the chibi coordinates above. t = her tint.
const GLB_EXTRAS = {
  hinano(acc) {
    this.bow(acc, '#ff9cc4', [0.29, 0.14, -0.06], 1.1, [0, 0.9, -0.3], true);
    this.bow(acc, '#ff9cc4', [-0.29, 0.14, -0.06], 0.9, [0, -0.9, 0.3], true);
  },
  noah(acc) {
    const cap = this.group(acc, [0, 0.25, -0.02], [-0.18, 0, 0.06]);
    this.part(cap, G.cyl(0.36, 0.3, 0.13, 28), '#262b4d', { p: [0, 0.07, 0] });
    this.part(cap, G.cyl(0.302, 0.302, 0.055, 28), '#b8233a', { p: [0, 0.01, 0] });
    this.part(cap, G.tor(0.3, 0.012, Math.PI * 2, 28), '#e9c25a', { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0], ink: false });
    this.part(cap, geo('visor', () => new THREE.CylinderGeometry(0.33, 0.33, 0.02, 24, 1, false, -Math.PI / 2, Math.PI)), '#15172a', { p: [0, -0.02, 0.06], r: [0.18, 0, 0] });
    this.part(cap, G.sph(), '#e9c25a', { p: [0, 0.09, 0.33], s: [0.06, 0.06, 0.03], m: { emissive: '#e9c25a', ei: 0.25 } });
  },
  tsuna(acc, t) {
    [-1, 1].forEach(s => {
      const ear = this.group(acc, [s * 0.19, 0.27, -0.04], [-0.1, 0, -s * 0.42]);
      this.part(ear, G.cone(0.085, 0.16, 4), t.hair, { p: [0, 0.06, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 0.55] });
      this.part(ear, G.cone(0.05, 0.1, 4), '#ff9db0', { p: [0, 0.05, 0.025], r: [0, Math.PI / 4, 0], s: [1, 1, 0.3], ink: false });
    });
  },
  uruha(acc) {
    [-1, 1].forEach(s => this.part(acc, G.cone(0.045, 0.17, 8), '#2a4bd6', { p: [s * 0.16, 0.31, 0.02], r: [-0.25, 0, -s * 0.5], m: { emissive: '#2a4bd6', ei: 0.15 } }));
    this.bow(acc, '#2f4fe8', [-0.28, 0.16, -0.05], 0.8, [0, -0.9, 0.3]);
  },
  lisa(acc, t) {
    [-1, 1].forEach(s => {
      this.part(acc, G.sph(), t.hair, { p: [s * 0.21, 0.27, -0.08], s: 0.1 });
      this.bow(acc, '#1b1a22', [s * 0.27, 0.2, -0.1], 0.7, [0, s * 0.9, 0], true);
    });
    const fl = this.group(acc, [0.29, 0.29, -0.02], [0, 0.6, 0]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; this.part(fl, G.sph(), '#ffffff', { p: [Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0], s: [0.028, 0.028, 0.014], ink: false }); }
    this.part(fl, G.sph(), '#ffd36b', { s: 0.016, ink: false });
  },
};

// Third-party 3D models, by file in assets/models (listed under Settings > About).
const MODEL_CREDITS = {
  'claude-child.gltf.json': { title: 'Claude · 幼年 (Sendo, and the stand-in for the other members)', by: 'Manny / ningfangtianwai-pixel, AI Girls 3D',
    license: 'CC BY 4.0', url: 'https://github.com/ningfangtianwai-pixel/ai-girls-3d', changes: 'simplified, rigged and recoloured for this game' },
};
