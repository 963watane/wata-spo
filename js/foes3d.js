// 3D enemy models: small toon monsters built from simple shapes, and three
// bosses. Same look as the chibis (toon shading + ink outline) with glowing
// eyes that the bloom picks up.

const hueHex = (h, s, l) => '#' + new THREE.Color().setHSL(((h % 360) + 360) % 360 / 360, s, l).getHexString();

// Foe animation channels: bob, lean, squash, lunge, tilt, shake.
const FOE_ACTS = {
  windup: { dur: 0.5, keys: [[0, { sq: 1 }], [1, { sq: 0.82, lean: -0.25 }]] },
  strike: { dur: 0.32, keys: [[0, { sq: 1.2, lean: 0.45, lunge: 0.35 }], [1, { sq: 1, lean: 0, lunge: 0 }]] },
  hit:    { dur: 0.22, keys: [[0, { lean: -0.35, sq: 0.9 }], [1, { lean: 0, sq: 1 }]] },
  cast:   { dur: 0.6, keys: [[0, { sq: 0.9 }], [0.4, { sq: 1.18, y: 0.25 }], [1, { sq: 1, y: 0 }]] },
};

class FoeModel {
  constructor(key, o = {}) {
    c3();
    this.key = key; this.def = ENEMIES[key] || ENEMIES.grunt;
    this.hue = this.def.hue == null ? 300 : this.def.hue;
    this.mats = []; this.matCache = {}; this.spin = []; this.pulse = []; this.sway = [];
    this.root = new THREE.Group();
    this.rig = new THREE.Group();
    this.root.add(this.rig);
    this.t = Math.random() * 10; this.state = 'idle'; this.action = null;
    this.ch = { y: 0, lean: 0, sq: 1, lunge: 0, tilt: 0 };
    this.flashT = 0; this.flashColor = new THREE.Color('#ffffff');
    this.float = 0.06;
    this.eyes = []; this.blinkT = 1 + Math.random() * 3;
    if (['grunt', 'sniper', 'spammer', 'firewall', 'desync', 'troll', 'clipper'].includes(key)) this.buildShade(key);
    else (FOE_BUILD[key] || FOE_BUILD.grunt).call(this);
    // A solid overhead cue stays legible when ground warnings overlap.
    const warningMat = new THREE.MeshBasicMaterial({ color: '#ff526b', transparent: true, opacity: 0.9, depthWrite: false });
    this.mats.push(warningMat);
    this.warning = new THREE.Group();
    this.warning.position.y = this.def.boss ? 3.4 : 1.7;
    const warningGeo = geo('foeWarningBar', () => new THREE.BoxGeometry(1, 1, 1));
    const stem = new THREE.Mesh(warningGeo, warningMat), dot = new THREE.Mesh(warningGeo, warningMat);
    stem.scale.set(0.1, 0.36, 0.1); dot.scale.setScalar(0.1); dot.position.y = -0.3;
    this.warning.add(stem, dot); this.warning.visible = false; this.root.add(this.warning);
    this.root.traverse(m => { if (m.isMesh) m.frustumCulled = false; });
  }
  play(name, dur) { const def = FOE_ACTS[name]; if (def) this.action = { def, t: 0, dur: dur || def.dur }; }
  setState(s) { this.state = s; }
  // Cloaked signal fragments: narrow masks, draped silhouettes and distinct weapons.
  buildShade(kind) {
    const T = THREE, heavy = kind === 'firewall' || kind === 'troll';
    const body = hueHex(this.hue, .16, .26), trim = hueHex(this.hue, .24, .58);
    const g = this.group(this.rig, [0, .15, 0]);
    const cloth = geo('shadeCloak:' + heavy, () => new T.LatheGeometry([
      new T.Vector2(.12, 0), new T.Vector2(heavy ? .54 : .38, .12), new T.Vector2(heavy ? .5 : .3, .47),
      new T.Vector2(heavy ? .42 : .24, .8), new T.Vector2(.18, 1.1), new T.Vector2(.05, 1.16),
    ], 28));
    this.part(g, cloth, body, { inkW: .009 });
    const hood = this.part(g, G.sph(), body, { p: [0, 1.08, .02], s: [.3, .34, .28], inkW: .009 });
    this.part(g, G.sph(), '#18282e', { p: [0, 1.06, .21], s: [.21, .24, .07], ink: false });
    // One luminous slit rather than a cartoon face.
    this.part(g, G.box(.21, .025, .018), '#e3a2a1', { p: [0, 1.1, .28], r: [0, 0, -.08], ink: false, m: { emissive: '#cb777c', ei: .45 } });
    this.part(g, G.tor(.25, .018, Math.PI * 1.55, 28), trim, { p: [0, 1.1, .1], r: [.3, 0, .8], ink: false });
    for (const side of [-1, 1]) {
      const shoulder = this.group(g, [side * .26, .82, 0], [0, 0, side * .34]);
      this.part(shoulder, G.cone(.18, .63, 24), body, { p: [side * .12, -.17, 0], r: [0, 0, side * .45], s: [1, 1, .65], inkW: .008 });
      const tail = this.part(g, G.cone(.07, .68, 18), trim, { p: [side * .22, .08, -.08], r: [0, 0, side * .35], s: [1, 1, .36], ink: false });
      this.sway.push({ obj: tail, axis: 'z', base: side * .35, amp: .08, f: 2, ph: side });
    }
    if (kind === 'sniper') {
      const staff = this.group(g, [.46, .57, .08], [0, 0, -.13]);
      this.part(staff, G.cyl(.026, .026, 1.5, 12), '#8eaaac', { ink: false });
      this.part(staff, G.tor(.2, .035, Math.PI * 1.7, 28), '#bf969f', { p: [0, .75, 0], r: [0, .4, .3], ink: false });
      const lens = this.eye(staff, [0, .75, 0], [.08, .12, .04], '#cf9d9d', .5);
      this.pulse.push({ obj: lens, base: .08, amp: .08, f: 2 });
    } else if (kind === 'firewall') {
      const shield = this.part(g, geo('shadeShield', () => new T.SphereGeometry(.48, 24, 18, 0, Math.PI)), '#8f9d91', { p: [0, .56, .33], s: [1.18, 1.25, .22], inkW: .01 });
      this.part(g, G.tor(.26, .024, Math.PI * 1.8, 24), '#ceb78d', { p: [0, .62, .48], r: [0, 0, .3], ink: false });
    } else if (kind === 'desync') {
      for (const side of [-1, 1]) {
        const shard = this.part(g, geo('shadeShard', () => new T.OctahedronGeometry(1)), side < 0 ? '#9aafbc' : '#c0a2b5', { p: [side * .48, .56, 0], s: [.12, .4, .1], inkW: .008 });
        this.sway.push({ obj: shard, axis: 'z', base: side * .2, amp: .14, f: 1.9, ph: side });
      }
    } else if (kind === 'clipper') {
      for (const side of [-1, 1]) this.part(g, G.cone(.055, .94, 12), '#c0c9ba', { p: [side * .5, .62, .12], r: [.1, 0, side * -.65], inkW: .007 });
    } else if (kind === 'troll') {
      for (const side of [-1, 1]) this.part(g, G.cone(.08, .5, 16), '#c6aa8a', { p: [side * .24, 1.43, -.04], r: [0, 0, -side * .4], inkW: .008 });
    } else if (kind === 'spammer') {
      const orbit = this.group(g, [0, .65, 0]);
      for (let i = 0; i < 3; i++) this.part(orbit, geo('shadePage', () => new T.PlaneGeometry(.2, .3)), '#c6cab3', { p: [Math.sin(i * 2.094) * .63, Math.cos(i * 2.094) * .16, Math.cos(i * 2.094) * .4], r: [.2, i * 2.094, .2], ink: false, m: { side: T.DoubleSide } });
      this.spin.push({ obj: orbit, axis: 'y', speed: .45 });
    }
    this.float = .035;
  }
  flash(color = '#ffffff', t = 0.1) { this.flashColor.set(color); this.flashT = t; this.flashMax = t; }
  eye(parent, p, s, color = '#fff6c2', glow = 1.6) {
    return this.part(parent, G.sph(), color, { p, s, ink: false, m: { emissive: color, ei: glow } });
  }
  // A cartoon eye (white, dark pupil, a glint), big enough to read from the battle camera. It blinks.
  toonEye(parent, p, s, r = [0, 0, 0], pupil = '#22172e') {
    const e = this.group(parent, p, r);
    this.part(e, G.sph(), '#ffffff', { s: [s, s * 1.2, s * 0.5], inkW: 0.012, m: { emissive: '#ffffff', ei: 0.25 } });
    this.part(e, G.sph(), pupil, { p: [0, -s * 0.12, s * 0.3], s: [s * 0.62, s * 0.8, s * 0.3], ink: false });
    this.part(e, G.sph(), '#ffffff', { p: [-s * 0.2, s * 0.22, s * 0.5], s: s * 0.24, ink: false, m: { emissive: '#ffffff', ei: 1.2 } });
    this.eyes.push(e);
    return e;
  }
  update(dt) {
    this.t += dt;
    const t = this.t, c = this.ch, tg = { y: 0, lean: 0, sq: 1, lunge: 0, tilt: 0 };
    if (this.state === 'run') { tg.lean = 0.22; tg.y = Math.abs(Math.sin(t * 9)) * 0.08; }
    else if (this.state === 'stun') { tg.tilt = Math.sin(t * 7) * 0.32; tg.sq = 0.9; }
    else { tg.y = Math.sin(t * 2.6) * this.float; tg.sq = 1 + Math.sin(t * 2.6 + 1.2) * 0.035; }   // idle: bob and breathe
    if (this.state === 'charge') { tg.sq = 0.82; tg.lean = -0.22; }
    const warning = this.state === 'charge' || this.state === 'windup';
    this.warning.visible = warning;
    if (warning) this.warning.scale.setScalar(1 + Math.min(1, (this.action ? this.action.t / this.action.dur : 1)) * 0.3);
    const a = this.action;
    if (a) {
      a.t += dt;
      const k = Math.min(1, a.t / a.dur), keys = a.def.keys;
      let i = 0;
      while (i < keys.length - 2 && k > keys[i + 1][0]) i++;
      const [k0, p0] = keys[i], [k1, p1] = keys[Math.min(i + 1, keys.length - 1)];
      const f = k1 > k0 ? Math.min(1, (k - k0) / (k1 - k0)) : 1, e = f * f * (3 - 2 * f);
      Object.keys(Object.assign({}, p0, p1)).forEach(ch => { const v0 = ch in p0 ? p0[ch] : tg[ch], v1 = ch in p1 ? p1[ch] : tg[ch]; tg[ch] = v0 + (v1 - v0) * e; });
      if (k >= 1) this.action = null;
    }
    const kk = 1 - Math.exp(-dt * (a ? 30 : 12));
    Object.keys(tg).forEach(ch => { c[ch] += (tg[ch] - c[ch]) * kk; });
    const r = this.rig, sq = Math.max(.85, 1 + (c.sq - 1) * .4);
    r.position.set(0, c.y, c.lunge);
    r.rotation.set(c.lean, 0, c.tilt);
    r.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    if (warning && SAVE.settings.shake !== false) r.position.x = Math.sin(t * 24) * 0.018;
    this.spin.forEach(s => { s.obj.rotation[s.axis] += s.speed * dt; });
    this.pulse.forEach(p => { const k = 0.5 + 0.5 * Math.sin(t * p.f + (p.ph || 0)); p.obj.scale.setScalar(p.base * (1 + k * p.amp)); });
    this.sway.forEach(s => { s.obj.rotation[s.axis] = s.base + Math.sin(t * s.f + s.ph) * s.amp; });
    // Blink every few seconds; eyes stay squeezed shut while stunned.
    if (this.eyes.length) {
      this.blinkT -= dt;
      const b = this.state === 'stun' ? 0.15 : this.blinkT < 0.14 ? Math.max(0.12, Math.abs(this.blinkT - 0.07) / 0.07) : 1;
      this.eyes.forEach(e => { e.scale.y = b; });
      if (this.blinkT <= 0) this.blinkT = 2 + Math.random() * 3;
    }
    if (this.flashT > 0 || this.flashing) {
      this.flashT = Math.max(0, this.flashT - dt);
      const k = this.flashT / (this.flashMax || 1);
      // A quick tint rather than a full white-out, so enemies stay readable under constant hits.
      this.mats.forEach(m => { if (!m.emissive) return; m.emissive.copy(m.userData.emissive0).lerp(this.flashColor, k * 0.65); m.emissiveIntensity = Math.max(m.userData.ei0, k * 0.7); });
      this.flashing = this.flashT > 0;
    }
  }
  dispose() { this.mats.forEach(m => m.dispose && m.dispose()); }
}
// Shares the part / material helpers with the chibis.
['mat', 'part', 'group', 'tube', 'bow'].forEach(k => { FoeModel.prototype[k] = Chibi.prototype[k]; });

const FOE_BUILD = {
  // Lag Shade: a little ghost with a spinning loading ring.
  grunt() {
    const body = hueHex(this.hue, 0.5, 0.5), g = this.group(this.rig, [0, 0.52, 0]);
    this.part(g, G.sph(), body, { s: [0.42, 0.4, 0.42] });
    [[-0.22, 0.05], [0, -0.12], [0.22, 0.05], [0, 0.18]].forEach(([x, z]) => this.part(g, G.cone(0.12, 0.28, 10), body, { p: [x, -0.4, z], r: [Math.PI, 0, 0] }));
    [-1, 1].forEach(s => this.toonEye(g, [s * 0.15, 0.07, 0.34], 0.105, [-0.2, s * 0.4, 0]));
    this.part(g, G.tor(0.045, 0.014, Math.PI, 12), '#3a1d3c', { p: [0, -0.09, 0.4], r: [0.2, 0, Math.PI], ink: false });
    const ring = this.part(this.rig, G.tor(0.2, 0.035, Math.PI * 1.5, 20), '#7ff3ff', { p: [0, 1.12, 0], r: [Math.PI / 2 - 0.4, 0, 0], ink: false, m: { emissive: '#4fe8ff', ei: 1.6 } });
    this.spin.push({ obj: ring, axis: 'z', speed: -6 });
  },
  // Ping Wraith: a floating one-eyed wraith with an antenna that blinks.
  sniper() {
    const body = hueHex(this.hue, 0.6, 0.55), g = this.group(this.rig, [0, 0.62, 0]);
    this.part(g, G.sph(), body, { p: [0, 0.22, 0], s: 0.3 });
    this.part(g, G.cone(0.28, 0.62, 12), body, { p: [0, -0.2, 0], r: [Math.PI, 0, 0] });
    this.part(g, G.sph(), '#ffffff', { p: [0, 0.24, 0.24], s: [0.18, 0.18, 0.09] });
    this.eye(g, [0, 0.24, 0.32], [0.1, 0.1, 0.035], '#ff4d6d', 1.8);
    this.part(g, G.cyl(0.012, 0.012, 0.3, 6), '#cfd6e2', { p: [0, 0.62, 0], ink: false });
    const tip = this.eye(g, [0, 0.8, 0], 0.05, '#ff4d6d', 2.2);
    [-1, 1].forEach(s => this.part(g, G.box(0.06, 0.5, 0.22), '#cfd6e2', { p: [s * 0.3, 0.42, -0.08], r: [0, 0, -s * 0.45] }));
    this.pulse.push({ obj: tip, base: 0.05, amp: 0.8, f: 8 });
    [-1, 1].forEach(s => this.part(g, G.sph(), body, { p: [s * 0.4, -0.02, 0.1], s: 0.08 }));
    this.float = 0.12;
  },
  // Spam Bot: a chat bubble on legs whose "..." dots bounce.
  spammer() {
    const body = hueHex(this.hue, 0.55, 0.55), g = this.group(this.rig, [0, 0.62, 0]);
    this.part(g, G.sph(), body, { s: [0.46, 0.36, 0.3] });
    this.part(g, G.cone(0.1, 0.2, 6), body, { p: [-0.26, -0.33, 0.04], r: [Math.PI + 0.5, 0, 0.4] });
    [-1, 1].forEach(s => this.toonEye(g, [s * 0.13, 0.13, 0.24], 0.085, [-0.25, s * 0.35, 0]));
    [-0.14, 0, 0.14].forEach((x, i) => { const d = this.part(g, G.sph(), '#173a22', { p: [x, -0.07, 0.28], s: 0.05, ink: false, m: { emissive: '#7dffa0', ei: 0.3 } }); this.pulse.push({ obj: d, base: 0.05, amp: 0.45, f: 6, ph: i * 1.2 }); });
    [-1, 1].forEach(s => this.part(this.rig, G.cap(0.05, 0.14), shadeHex(body, -0.2), { p: [s * 0.13, 0.15, 0] }));
  },
  // Firewall: a brick golem with a crown of fire.
  firewall() {
    const a = '#d9652a', b2 = '#ec8640';
    this.part(this.rig, G.box(0.95, 0.34, 0.55), a, { p: [0, 0.27, 0] });
    this.part(this.rig, G.box(0.85, 0.34, 0.52), b2, { p: [0, 0.62, 0] });
    this.part(this.rig, G.box(0.72, 0.32, 0.5), a, { p: [0, 0.96, 0] });
    [-1, 1].forEach(s => {
      this.part(this.rig, G.box(0.13, 0.05, 0.02), '#ffe36b', { p: [s * 0.16, 0.66, 0.27], r: [0, 0, s * 0.25], ink: false, m: { emissive: '#ffd34a', ei: 2 } });
      this.part(this.rig, G.box(0.2, 0.42, 0.24), b2, { p: [s * 0.6, 0.55, 0] });
    });
    [[0, 1.3, 0.42, 0.15, '#ff9a2e'], [-0.2, 1.22, 0.3, 0.11, '#ffd34a'], [0.2, 1.22, 0.3, 0.11, '#ffd34a']].forEach(([x, y, h, r, col], i) => {
      const f = this.part(this.rig, G.cone(r, h, 10), col, { p: [x, y, 0], ink: false, m: { emissive: col, ei: 1.8 } });
      this.pulse.push({ obj: f, base: 1, amp: 0.18, f: 9 + i * 2, ph: i });
    });
    this.float = 0;
  },
  // Desync: two cubes that never quite line up.
  desync() {
    const g = this.group(this.rig, [0, 0.6, 0]);
    const a = this.part(g, G.box(0.52, 0.52, 0.52), '#e24bd0', {});
    const b2 = this.part(g, G.box(0.5, 0.5, 0.5), '#4be2e2', { p: [0.12, 0.08, -0.08], ink: false, m: { opacity: 0.55, emissive: '#4be2e2', ei: 0.5 } });
    [-1, 1].forEach(s => this.toonEye(a, [s * 0.11, 0.06, 0.255], 0.09));
    this.spin.push({ obj: b2, axis: 'y', speed: 2.4 });
    this.float = 0.1;
  },
  // Flame Troll: round, horned, grinning, hair on fire.
  troll() {
    const body = hueHex(this.hue, 0.65, 0.5), g = this.group(this.rig, [0, 0.55, 0]);
    this.part(g, G.sph(), body, { s: [0.52, 0.48, 0.5] });
    this.part(g, G.sph(), '#3a0d12', { p: [0, -0.12, 0.42], s: [0.22, 0.1, 0.06], ink: false });
    [-1, 1].forEach(s => {
      this.part(g, G.cone(0.03, 0.07, 4), '#ffffff', { p: [s * 0.1, -0.06, 0.47], r: [Math.PI, 0, 0], ink: false });
      this.eye(g, [s * 0.16, 0.12, 0.43], [0.085, 0.1, 0.035], '#fff3a8', 1.6);
      this.part(g, G.box(0.14, 0.03, 0.03), '#2a0a0e', { p: [s * 0.16, 0.22, 0.44], r: [0, 0, s * 0.35], ink: false });
      this.part(g, G.cone(0.07, 0.22, 8), '#f2e2c8', { p: [s * 0.27, 0.45, 0], r: [0, 0, -s * 0.5] });
      this.part(g, G.sph(), body, { p: [s * 0.56, -0.1, 0.1], s: 0.13 });
    });
    [[0, 0.56, '#ff9a2e', 0.32], [-0.15, 0.5, '#ffd34a', 0.24], [0.15, 0.5, '#ffd34a', 0.24]].forEach(([x, y, col, h], i) => {
      const f = this.part(g, G.cone(0.1, h, 8), col, { p: [x, y, -0.05], ink: false, m: { emissive: col, ei: 1.8 } });
      this.pulse.push({ obj: f, base: 1, amp: 0.2, f: 10 + i, ph: i });
    });
    this.float = 0.03;
  },
  // Clip Thief: a masked yellow blob with giant scissors.
  clipper() {
    const body = hueHex(this.hue, 0.8, 0.58), g = this.group(this.rig, [0, 0.45, 0]);
    this.part(g, G.sph(), body, { s: [0.36, 0.34, 0.36] });
    this.part(g, G.tor(0.34, 0.06, Math.PI * 2, 24), '#1b1b22', { p: [0, 0.08, 0], r: [Math.PI / 2, 0, 0], ink: false });
    this.eye(g, [-0.12, 0.08, 0.36], [0.065, 0.065, 0.025], '#ffffff', 1.2);
    this.eye(g, [0.12, 0.08, 0.36], [0.065, 0.065, 0.025], '#ffffff', 1.2);
    const sc = this.group(g, [0.42, 0.05, 0.12], [0, 0, -0.4]);
    sc.scale.setScalar(1.3);
    [-1, 1].forEach(s => {
      const blade = this.group(sc, [0, 0, 0], [0, 0, s * 0.3]);
      this.part(blade, G.box(0.05, 0.46, 0.015), '#dfe6f2', { p: [0, 0.2, 0] });
      this.part(blade, G.tor(0.06, 0.018), '#ff4d6d', { p: [0, -0.08, 0], ink: false });
      this.sway.push({ obj: blade, axis: 'z', base: s * 0.3, amp: 0.25 * s, f: 7, ph: 0 });
    });
  },
  // Echo: a member's chibi as a cyan hologram (made by makeFoe in action.js).
  echo() {},
  // Crimson Phantom: a hooded giant with two orbiting blades.
  phantom() {
    const g = this.group(this.rig, [0, 0, 0]);
    this.part(g, G.cone(0.85, 2.0, 16), '#6a1224', { p: [0, 1.0, 0] });
    this.part(g, G.sph(), '#a3182f', { p: [0, 1.95, 0], s: 0.45 });
    this.part(g, G.sph(), '#14030a', { p: [0, 1.92, 0.2], s: [0.33, 0.3, 0.26], ink: false });
    [-1, 1].forEach(s => {
      this.eye(g, [s * 0.13, 1.95, 0.44], [0.07, 0.045, 0.03], '#ff3355', 2.6);
      this.part(g, G.sph(), '#a3182f', { p: [s * 0.62, 1.55, 0], s: [0.3, 0.24, 0.3] });
      this.part(g, G.cone(0.08, 0.36, 6), '#ff3355', { p: [s * 0.25, 2.42, -0.05], r: [0, 0, -s * 0.35], m: { emissive: '#ff3355', ei: 0.6 } });
    });
    this.part(g, G.cone(0.1, 0.45, 6), '#ff3355', { p: [0, 2.5, -0.08], m: { emissive: '#ff3355', ei: 0.6 } });
    const orbit = this.group(g, [0, 1.3, 0]);
    [-1, 1].forEach(s => {
      const blade = this.group(orbit, [s * 1.25, 0, 0], [0, 0, s * 0.2]);
      this.part(blade, G.box(0.13, 1.25, 0.04), '#ff4d6d', { m: { emissive: '#ff2244', ei: 1.4 } });
      this.part(blade, G.box(0.36, 0.07, 0.07), '#2a0a12', { p: [0, -0.5, 0] });
    });
    this.spin.push({ obj: orbit, axis: 'y', speed: 1.4 });
    this.float = 0.05;
  },
  // Glitch Core: a floating crystal inside spinning rings.
  core() {
    const g = this.group(this.rig, [0, 1.7, 0]);
    const crystal = this.part(g, geo('ico', () => new THREE.IcosahedronGeometry(0.65, 0)), '#ff2a6d', { m: { emissive: '#ff2a6d', ei: 0.7, flat: true } });
    this.spin.push({ obj: crystal, axis: 'y', speed: 0.8 });
    [[Math.PI / 2, 0, 1.1, 1.3], [0.4, 0.8, 1.3, -1.0], [-0.5, -0.6, 1.5, 0.7]].forEach(([rx, ry, r, sp]) => {
      const ringG = this.group(g, [0, 0, 0], [rx, ry, 0]);
      this.part(ringG, G.tor(r, 0.045, Math.PI * 2, 40), '#5ff3ff', { ink: false, m: { emissive: '#5ff3ff', ei: 1.5 } });
      this.spin.push({ obj: ringG, axis: 'z', speed: sp });
    });
    const orbit = this.group(g);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      this.part(orbit, G.box(0.22, 0.22, 0.22), '#2a2440', { p: [Math.cos(a) * 1.9, Math.sin(a * 2) * 0.3, Math.sin(a) * 1.9], r: [a, a, 0], m: { emissive: '#5ff3ff', ei: 0.25 } });
    }
    this.spin.push({ obj: orbit, axis: 'y', speed: 0.6 });
    this.part(this.rig, G.cyl(0.9, 0.5, 0.18, 24), '#2a2440', { p: [0, 0.35, 0], m: { emissive: '#ff2a6d', ei: 0.15 } });
    this.float = 0.1;
  },
  // The Algorithm: a giant eye in a frame of orbiting feed panels.
  algorithm() {
    const g = this.group(this.rig, [0, 1.9, 0]);
    this.lookAt = this.group(g);
    this.part(this.lookAt, G.sph(), '#f2f6ff', { s: 0.72 });
    this.part(this.lookAt, G.sph(), '#2bd5ff', { p: [0, 0, 0.6], s: [0.36, 0.36, 0.16], ink: false, m: { emissive: '#2bd5ff', ei: 0.9 } });
    this.part(this.lookAt, G.sph(), '#0a0f1e', { p: [0, 0, 0.7], s: [0.16, 0.16, 0.07], ink: false });
    this.part(this.lookAt, G.sph(), '#ffffff', { p: [-0.1, 0.1, 0.74], s: 0.05, ink: false, m: { emissive: '#ffffff', ei: 1 } });
    const frame = this.part(g, geo('octa', () => new THREE.OctahedronGeometry(1.25, 0)), '#1a2240', { ink: false, m: { opacity: 0.18, emissive: '#3a6bff', ei: 0.4, flat: true } });
    this.spin.push({ obj: frame, axis: 'y', speed: 0.4 });
    const orbit = this.group(g);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, panel = this.group(orbit, [Math.sin(a) * 1.9, Math.cos(a * 2) * 0.25, Math.cos(a) * 1.9], [0, a, 0]);
      this.part(panel, G.box(0.62, 0.4, 0.04), '#141a33', { m: { emissive: '#3a6bff', ei: 0.35 } });
      this.part(panel, G.box(0.5, 0.06, 0.05), '#7fd0ff', { p: [0, 0.08, 0], ink: false, m: { emissive: '#7fd0ff', ei: 1.2 } });
      this.part(panel, G.box(0.34, 0.05, 0.05), '#ff6b9a', { p: [-0.07, -0.06, 0], ink: false, m: { emissive: '#ff6b9a', ei: 1.2 } });
    }
    this.spin.push({ obj: orbit, axis: 'y', speed: -0.5 });
    this.float = 0.12;
  },
};
