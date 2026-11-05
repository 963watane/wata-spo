// Real-time 3D action battles.
// You steer the squad leader. Auto-attacks fire on their own whenever an enemy
// is in reach; you move, dodge (a last-moment dodge is a Perfect Dodge with
// slow motion), use the leader's Skill, call the two supports in for their
// Support Skills, and fire the Ultimate when Energy is full. Enemies warn
// before every attack with a red zone on the ground.

// Weakness Break effects in real time, by the element of whoever breaks the enemy.
const BREAK_FX_A = {
  sun:   { name: 'Sunburn',     desc: 'burns for 50% of the breaker\'s ATK every second for 4s', apply: (b, e, s) => b.addStatus(e, 'burn', b.statAtk(s) * 0.5, 4, 'BURN') },
  candy: { name: 'Sugar Crash', desc: 'deals 25% less damage for 8s', apply: (b, e) => b.addStatus(e, 'weaken', 0.25, 8, 'ATK↓') },
  night: { name: 'Nightfall',   desc: 'stays stunned 1.5s longer', apply: (b, e) => { e.brokenT += 1.5; } },
  paint: { name: 'Splatter',    desc: 'takes 50% of the breaker\'s ATK as Paint damage every second for 4s', apply: (b, e, s) => b.addStatus(e, 'paint', b.statAtk(s) * 0.5, 4, 'PAINT') },
  aim:   { name: 'Exposed',     desc: 'takes +25% crit chance from everyone for 8s', apply: (b, e) => b.addStatus(e, 'exposed', 0.25, 8, 'EXPOSED') },
  snack: { name: 'Food Coma',   desc: 'moves and attacks 30% slower for 8s', apply: (b, e) => b.addStatus(e, 'slow', 0.3, 8, 'SPD↓') },
};

// Arena look for each stage backdrop: sky gradient (top, horizon, bottom), floor, accent glow.
const ARENA_THEMES = {
  'street-day':    { sky: ['#3a8cf0', '#a6d2ff', '#d6c8ff'], ground: '#a3b3d8', tile: '#8e9fc8', accent: '#3fd3ff', fog: '#bcd8f6', mote: '#ffffff', light: 0.95, outdoor: true },
  'city-day':      { sky: ['#2f7de6', '#a8cbf6', '#f0d9be'], ground: '#a4aec6', tile: '#8f9ab4', accent: '#ffc93a', fog: '#bad0ee', mote: '#fff4c8', light: 0.95, outdoor: true },
  'sunset-street': { sky: ['#3a2a6e', '#ff8a5c', '#ffd49c'], ground: '#d8a993', tile: '#c6927c', accent: '#ff7a3a', fog: '#ffae86', mote: '#ffd9a0', light: 0.95, outdoor: true },
  'alley':         { sky: ['#0c0922', '#3a1d5e', '#ff4fa3'], ground: '#565080', tile: '#655c90', accent: '#ff4fd8', fog: '#2a1a4c', mote: '#ff8af0', light: 0.95 },
  'rooftop':       { sky: ['#060a20', '#1a2a5e', '#4a6bd8'], ground: '#5f6a94', tile: '#6d78a4', accent: '#5f86ff', fog: '#1a2a5e', mote: '#9fc2ff', light: 0.95 },
  'tunnel':        { sky: ['#0a0306', '#3a0712', '#ff2a4d'], ground: '#5c4250', tile: '#6c4c5e', accent: '#ff2a4d', fog: '#2a0710', mote: '#ff6b8a', light: 0.92 },
};

// ---------- canvas textures ----------
const TEX = {};
function canvasTex(key, w, h, draw) {
  if (TEX[key]) return TEX[key];
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return (TEX[key] = t);
}
const glowTex = () => canvasTex('glow', 128, 128, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
const starTex = () => canvasTex('star', 128, 128, (g, w) => {
  const c = w / 2;
  const gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
  g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(c, 0); g.quadraticCurveTo(c + 6, c - 6, w, c); g.quadraticCurveTo(c + 6, c + 6, c, w); g.quadraticCurveTo(c - 6, c + 6, 0, c); g.quadraticCurveTo(c - 6, c - 6, c, 0); g.fill();
});
const ringTex = () => canvasTex('ring', 256, 256, (g, w) => {
  const c = w / 2, gr = g.createRadialGradient(c, c, c * 0.55, c, c, c);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.75, 'rgba(255,255,255,.55)'); gr.addColorStop(0.92, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
const slashTex = () => canvasTex('slash', 256, 64, (g, w, h) => {
  // Along the arc (x): bright head fading to a thin tail. Across (y): soft edges.
  const gx = g.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.7, 'rgba(255,255,255,.8)'); gx.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gx; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const gy = g.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.5, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, w, h);
});
const zoneTex = () => canvasTex('zone', 256, 256, (g, w) => {
  const c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(0.85, 'rgba(255,255,255,.45)'); gr.addColorStop(0.97, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
const splatTex = () => canvasTex('splat', 256, 256, g => {
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(128, 128, 70, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + Math.sin(i * 7) * 0.3, d = 70 + (i % 3) * 18, r = 14 + (i % 4) * 6;
    g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(128 + Math.cos(a) * (d + r + 10), 128 + Math.sin(a) * (d + r + 10), r * 0.35, 0, Math.PI * 2); g.fill();
  }
});
// Hall floor: bevelled bands of curved tiles with a little wear, inlaid glowing rings
// and a star medallion, lit a touch brighter in the middle.
function hallFloorTex(th, size = 2048) {
  const t = canvasTex('hall' + size + th.ground + th.accent, size, size, (g, w) => {
    const c = w / 2, k = w / 1024, rnd = seeded(7), TAU = Math.PI * 2;   // seeded() lives in audio.js
    const tileA = shadeHex(th.ground, -0.03), tileB = shadeHex(th.ground, -0.12), line = shadeHex(th.ground, -0.32);
    const ring = (r, lw, col, a) => { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); g.globalAlpha = 1; };
    const star = (n, r0, r1) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r1 : r0; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } g.closePath(); g.fill(); };
    g.fillStyle = tileA; g.fillRect(0, 0, w, w);
    // concentric bands of curved tiles, each shaded slightly differently, with a bevel
    [[c, c * 0.84, 36], [c * 0.84, c * 0.62, 28], [c * 0.62, c * 0.4, 20]].forEach(([r0, r1, n], band) => {
      for (let i = 0; i < n; i++) {
        const a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
        const tile = () => { g.beginPath(); g.arc(c, c, r0, a0, a1); g.arc(c, c, r1, a1, a0, true); g.closePath(); };
        tile(); g.fillStyle = shadeHex((i + band) % 2 ? tileA : tileB, (rnd() - 0.5) * 0.045); g.fill();
        g.save(); g.clip();
        g.lineWidth = 6 * k;
        g.strokeStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.arc(c, c, r0 - 4 * k, a0, a1); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.arc(c, c, r1 + 4 * k, a0, a1); g.stroke();
        g.restore();
        tile(); g.strokeStyle = line; g.lineWidth = 3 * k; g.stroke();
      }
    });
    // the inner disc with fine engraved circles
    g.fillStyle = shadeHex(th.ground, -0.08); g.beginPath(); g.arc(c, c, c * 0.4, 0, TAU); g.fill();
    for (let r = c * 0.05; r < c * 0.39; r += 16 * k) ring(r, 2 * k, '#ffffff', 0.06);
    // grain and scuffs, so it reads as stone rather than plastic
    [['rgba(255,255,255,.05)', 13000], ['rgba(0,0,0,.06)', 13000]].forEach(([col, n]) => {
      g.fillStyle = col;
      for (let i = 0; i < n; i++) g.fillRect(rnd() * w, rnd() * w, (1 + rnd() * 2.5) * k, (1 + rnd() * 2.5) * k);
    });
    g.lineCap = 'round';
    for (let i = 0; i < 80; i++) {
      const a = rnd() * TAU, d = rnd() * c * 0.98, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d, len = (20 + rnd() * 70) * k, ang = rnd() * Math.PI;
      g.strokeStyle = rnd() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; g.lineWidth = (2 + rnd() * 4) * k;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + 10 * k, y + Math.sin(ang) * len * 0.5 - 6 * k, x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke();
    }
    // inlaid accent rings: a wide faint stroke under a thin bright one reads as a glow
    [[0.995, 8], [0.84, 4], [0.62, 4], [0.4, 6], [0.26, 3]].forEach(([r, lw]) => { ring(c * r, lw * 3.4 * k, th.accent, 0.16); ring(c * r, lw * k, th.accent, 0.7); });
    // studs around the outer band and spokes round the inner one
    g.fillStyle = th.accent; g.globalAlpha = 0.55;
    for (let i = 0; i < 72; i++) { const a = i / 72 * TAU; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.92, c + Math.sin(a) * c * 0.92, (i % 6 ? 3 : 6) * k, 0, TAU); g.fill(); }
    g.globalAlpha = 0.28; g.strokeStyle = th.accent; g.lineWidth = 2 * k;
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.42, c + Math.sin(a) * c * 0.42); g.lineTo(c + Math.cos(a) * c * 0.6, c + Math.sin(a) * c * 0.6); g.stroke(); }
    // the medallion: an eight-point star with a brighter core
    g.globalAlpha = 0.45; g.fillStyle = th.accent; star(8, c * 0.24, c * 0.09);
    g.globalAlpha = 0.6; g.fillStyle = shadeHex(th.accent, 0.2); star(8, c * 0.11, c * 0.045);
    g.globalAlpha = 1;
    // light pool: brighter in the middle, a little darker out towards the rail
    const lp = g.createRadialGradient(c, c, c * 0.1, c, c, c);
    lp.addColorStop(0, 'rgba(255,255,255,.10)'); lp.addColorStop(0.55, 'rgba(255,255,255,0)'); lp.addColorStop(1, 'rgba(0,0,0,.16)');
    g.fillStyle = lp; g.fillRect(0, 0, w, w);
  });
  t.anisotropy = 8;
  return t;
}
// Soft vertical light shaft: bright at the top, fading towards the floor and the sides.
const shaftTex = () => canvasTex('shaft', 64, 256, (g, w, h) => {
  const gy = g.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, 'rgba(255,255,255,.9)'); gy.addColorStop(0.55, 'rgba(255,255,255,.3)'); gy.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gy; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const gx = g.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.5, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gx; g.fillRect(0, 0, w, h);
});
// Walkway outside the arena: plain square flagstones.
function walkTex(th) {
  const t = canvasTex('walk' + th.ground, 512, 512, (g, w) => {
    g.fillStyle = shadeHex(th.ground, -0.18); g.fillRect(0, 0, w, w);
    g.strokeStyle = shadeHex(th.ground, -0.34); g.lineWidth = 4;
    for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, w); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
// Outer wall: stone panels with tall arched windows that glow in the accent colour.
function wallTex(th) {
  const t = canvasTex('wall' + th.ground + th.accent, 256, 256, (g, w) => {
    g.fillStyle = shadeHex(th.ground, -0.26); g.fillRect(0, 0, w, w);
    g.fillStyle = shadeHex(th.ground, -0.36); g.fillRect(0, 0, w, 26); g.fillRect(0, w - 30, w, 30);
    g.fillStyle = shadeHex(th.ground, -0.2); g.fillRect(0, 26, 18, w - 56); g.fillRect(w - 18, 26, 18, w - 56);
    const gr = g.createLinearGradient(0, 60, 0, w - 40);
    gr.addColorStop(0, th.accent); gr.addColorStop(1, shadeHex(th.accent, -0.3));
    g.globalAlpha = 0.75; g.fillStyle = gr;
    g.beginPath(); g.moveTo(70, w - 44); g.lineTo(70, 110); g.arc(128, 110, 58, Math.PI, 0); g.lineTo(186, w - 44); g.closePath(); g.fill();
    g.globalAlpha = 1; g.strokeStyle = shadeHex(th.ground, -0.42); g.lineWidth = 6; g.stroke();
    g.beginPath(); g.moveTo(128, 52); g.lineTo(128, w - 44); g.moveTo(70, 150); g.lineTo(186, 150); g.stroke();
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
// Floating "stream" screen: a LIVE tag, a play button and scrolling chat bars.
function holoTex(th) {
  return canvasTex('holo' + th.accent, 320, 200, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(20,24,52,.92)'); gr.addColorStop(1, 'rgba(10,12,30,.92)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = shadeHex(th.accent, -0.35); g.globalAlpha = 0.35; g.fillRect(12, 34, 196, 150); g.globalAlpha = 1;
    g.fillStyle = '#ff3355'; g.fillRect(12, 10, 46, 18);
    g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.fillText('LIVE', 20, 24);
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.moveTo(92, 82); g.lineTo(92, 138); g.lineTo(140, 110); g.closePath(); g.fill();
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 3 ? 'rgba(255,255,255,.35)' : th.accent; g.fillRect(222, 40 + i * 20, 40 + ((i * 37) % 50), 8); }
    g.fillStyle = '#ff7eb6';
    g.beginPath(); g.arc(262, 176, 7, Math.PI, 0); g.arc(276, 176, 7, Math.PI, 0); g.lineTo(269, 192); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.05)';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  });
}
// Hanging banner in the stage's accent colour with a simple star emblem.
function bannerTex(th) {
  return canvasTex('banner' + th.accent, 128, 320, (g, w, h) => {
    g.fillStyle = shadeHex(th.accent, -0.28);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h - 40); g.lineTo(w / 2, h); g.lineTo(0, h - 40); g.closePath(); g.fill();
    g.fillStyle = th.accent; g.fillRect(0, 0, w, 18); g.fillRect(10, 18, 6, h - 70); g.fillRect(w - 16, 18, 6, h - 70);
    g.fillStyle = '#ffffff'; g.globalAlpha = 0.9;
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 14 : 34; g.lineTo(w / 2 + Math.cos(a) * r, 120 + Math.sin(a) * r); }
    g.closePath(); g.fill();
    g.globalAlpha = 1;
  });
}

// Target reticle drawn on the ground under the enemy you're attacking.
const reticleTex = () => canvasTex('reticle', 256, 256, g => {
  const c = 128;
  g.strokeStyle = '#fff'; g.lineWidth = 10;
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.22; g.beginPath(); g.arc(c, c, 108, a, a + Math.PI / 2 - 0.44); g.stroke(); }
  g.lineWidth = 8;
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.beginPath(); g.moveTo(c + Math.cos(a) * 84, c + Math.sin(a) * 84); g.lineTo(c + Math.cos(a) * 124, c + Math.sin(a) * 124); g.stroke(); }
});
// Backdrop for the Ultimate close-up: rays bursting out from the centre.
const raysTex = () => canvasTex('rays', 512, 512, g => {
  const c = 256, gr = g.createRadialGradient(c, c, 20, c, c, 360);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, '#d8d8e8'); gr.addColorStop(1, '#5a5a78');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2 + (i % 3) * 0.03, w = 0.012 + (i % 4) * 0.008;
    g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a - w) * 400, c + Math.sin(a - w) * 400); g.lineTo(c + Math.cos(a + w) * 400, c + Math.sin(a + w) * 400); g.closePath(); g.fill();
  }
});

// Manga-style impact burst: thin spikes radiating from a bright core.
const burstTex = () => canvasTex('burst', 256, 256, g => {
  const c = 128;
  g.fillStyle = '#fff';
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2 + (i % 3) * 0.05, len = 70 + ((i * 37) % 50), w = 0.05 + (i % 4) * 0.012;
    g.beginPath();
    g.moveTo(c + Math.cos(a - w) * 20, c + Math.sin(a - w) * 20);
    g.lineTo(c + Math.cos(a) * (len + 50), c + Math.sin(a) * (len + 50));
    g.lineTo(c + Math.cos(a + w) * 20, c + Math.sin(a + w) * 20);
    g.closePath(); g.fill();
  }
  const gr = g.createRadialGradient(c, c, 0, c, c, 46);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, 46, 0, Math.PI * 2); g.fill();
});
// Glowing magic circle drawn under skills and Ultimates.
const circleTex = () => canvasTex('mcircle', 512, 512, g => {
  const c = 256;
  g.strokeStyle = '#fff'; g.fillStyle = '#fff';
  [[240, 6], [222, 2], [160, 3], [148, 1.5], [70, 3]].forEach(([r, w]) => { g.lineWidth = w; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); });
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, r0 = i % 4 ? 226 : 214; g.lineWidth = i % 4 ? 2 : 4; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * 238, c + Math.sin(a) * 238); g.stroke(); }
  g.lineWidth = 3;
  [0, Math.PI].forEach(o => { g.beginPath(); for (let i = 0; i <= 3; i++) { const a = o + i / 3 * Math.PI * 2 - Math.PI / 2; g[i ? 'lineTo' : 'moveTo'](c + Math.cos(a) * 158, c + Math.sin(a) * 158); } g.stroke(); });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * 190, c + Math.sin(a) * 190, i % 3 ? 4 : 8, 0, Math.PI * 2); g.fill(); }
});
// Diagonal stripes that scroll inside the red warning zones.
const stripeTex = () => {
  const t = canvasTex('stripes', 64, 64, g => {
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,255,1)';
    for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 - 64, 64); g.lineTo(i - 64, 64); g.closePath(); g.fill(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
// Hard-edged square: glitch enemies burst into pixels.
const pixelTex = () => canvasTex('pixel', 32, 32, g => { g.fillStyle = '#fff'; g.fillRect(6, 6, 20, 20); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(2, 2, 28, 28); });

// ---------- particles ----------
// Fast sparks drawn as streaks stretched along their motion.
class Streaks {
  constructor(scene, max = 700) {
    this.max = max; this.n = 0;
    const quad = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    const A = (n) => new THREE.InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
    this.aPos = A(3); this.aVel = A(3); this.aCol = A(3); this.aA = A(1); this.aS = A(2);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iVel', this.aVel); g.setAttribute('iCol', this.aCol); g.setAttribute('iA', this.aA); g.setAttribute('iS', this.aS);
    g.instanceCount = 0;
    this.geo = g;
    this.life = new Float32Array(max); this.life0 = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.w = new Float32Array(max);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `attribute vec3 iPos; attribute vec3 iVel; attribute vec3 iCol; attribute float iA; attribute vec2 iS;
        varying vec3 vC; varying float vA; varying vec2 vUv;
        void main() {
          vC = iCol; vA = iA; vUv = uv;
          vec4 a = modelViewMatrix * vec4(iPos, 1.0);
          vec4 b = modelViewMatrix * vec4(iPos - iVel * iS.y, 1.0);
          vec2 d = a.xy / max(0.1, -a.z) - b.xy / max(0.1, -b.z);
          vec2 dir = length(d) > 1e-5 ? normalize(d) : vec2(0.0, 1.0);
          vec4 p = mix(b, a, position.y + 0.5);
          p.xy += vec2(-dir.y, dir.x) * position.x * iS.x;
          gl_Position = projectionMatrix * p;
        }`,
      fragmentShader: `varying vec3 vC; varying float vA; varying vec2 vUv;
        void main() { float e = 1.0 - abs(vUv.x * 2.0 - 1.0); float t = smoothstep(0.0, 0.5, vUv.y); gl_FragColor = vec4(vC, e * e * t * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    scene.add(this.mesh);
    this.tmp = new THREE.Color();
  }
  // o: n, speed, color, bright, width, life, grav, drag, dir {x,y,z} + spread, up
  emit(x, y, z, o = {}) {
    const n = o.n || 10, c = this.tmp.set(o.color || '#ffffff'), br = o.bright || 2;
    for (let i = 0; i < n; i++) {
      if (this.n >= this.max) return;
      const k = this.n++, k3 = k * 3;
      let dx = Math.random() * 2 - 1, dy = Math.random() * 2 - 1, dz = Math.random() * 2 - 1;
      if (o.dir) { const s = o.spread == null ? 0.6 : o.spread; dx = o.dir.x + dx * s; dy = (o.dir.y || 0) + dy * s * 0.6 + (o.up || 0); dz = o.dir.z + dz * s; }
      else dy = Math.abs(dy) * 0.8 + (o.up || 0.2);
      const len = Math.hypot(dx, dy, dz) || 1, sp = (o.speed || 9) * (0.45 + Math.random() * 0.55);
      this.aPos.array[k3] = x; this.aPos.array[k3 + 1] = y; this.aPos.array[k3 + 2] = z;
      this.aVel.array[k3] = dx / len * sp; this.aVel.array[k3 + 1] = dy / len * sp; this.aVel.array[k3 + 2] = dz / len * sp;
      this.aCol.array[k3] = c.r * br; this.aCol.array[k3 + 1] = c.g * br; this.aCol.array[k3 + 2] = c.b * br;
      this.w[k] = (o.width || 0.07) * (0.6 + Math.random() * 0.8);
      this.life0[k] = this.life[k] = (o.life || 0.35) * (0.6 + Math.random() * 0.6);
      this.grav[k] = o.grav == null ? 9 : o.grav; this.drag[k] = o.drag == null ? 3 : o.drag;
    }
  }
  update(dt) {
    const P = this.aPos.array, V = this.aVel.array;
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const j = --this.n;
        if (i !== j) {
          for (let q = 0; q < 3; q++) { P[i * 3 + q] = P[j * 3 + q]; V[i * 3 + q] = V[j * 3 + q]; this.aCol.array[i * 3 + q] = this.aCol.array[j * 3 + q]; }
          this.life[i] = this.life[j]; this.life0[i] = this.life0[j]; this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j]; this.w[i] = this.w[j];
        }
        i--; continue;
      }
      const i3 = i * 3, d = Math.max(0, 1 - this.drag[i] * dt);
      V[i3 + 1] -= this.grav[i] * dt;
      V[i3] *= d; V[i3 + 1] *= d; V[i3 + 2] *= d;
      P[i3] += V[i3] * dt; P[i3 + 1] += V[i3 + 1] * dt; P[i3 + 2] += V[i3 + 2] * dt;
      const k = this.life[i] / this.life0[i];
      this.aA.array[i] = Math.min(1, k * 1.8);
      this.aS.array[i * 2] = this.w[i] * (0.4 + 0.6 * k);
      this.aS.array[i * 2 + 1] = 0.045;
    }
    this.geo.instanceCount = this.n;
    this.aPos.needsUpdate = this.aVel.needsUpdate = this.aCol.needsUpdate = this.aA.needsUpdate = this.aS.needsUpdate = true;
  }
}

// One THREE.Points cloud per texture, updated on the CPU.
class Sparks {
  constructor(scene, map, max = 1400, scale = 600) {
    this.max = max; this.n = 0;
    const A = n => new Float32Array(max * n);
    Object.assign(this, { pos: A(3), col: A(3), size: A(1), alpha: A(1), vel: A(3), life: A(1), life0: A(1), size0: A(1), grav: A(1), drag: A(1), grow: A(1) });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('psize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('palpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, scale: { value: scale } },
      vertexShader: `attribute vec3 pcolor; attribute float psize; attribute float palpha; uniform float scale;
        varying vec3 vC; varying float vA;
        void main() { vC = pcolor; vA = palpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = psize * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
        void main() { vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb, t.a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.tmp = new THREE.Color();
  }
  // o: n, speed, color, bright, size, life, grav, drag, up (bias upward), dir {x,z} + spread, jitter, grow
  emit(x, y, z, o = {}) {
    const n = o.n || 10, c = this.tmp.set(o.color || '#ffffff'), br = o.bright || 1.6;
    for (let i = 0; i < n; i++) {
      if (this.n >= this.max) return;
      const k = this.n++, k3 = k * 3;
      let dx = Math.random() * 2 - 1, dy = Math.random() * 2 - 1, dz = Math.random() * 2 - 1;
      if (o.dir) { dx = o.dir.x + dx * (o.spread || 0.5); dz = o.dir.z + dz * (o.spread || 0.5); dy = dy * (o.spread || 0.5) + (o.up || 0.2); }
      else if (o.flat) dy = Math.abs(dy) * 0.25;
      else dy = Math.abs(dy) * (o.up == null ? 1 : o.up) + (o.up || 0) * 0.5;
      const len = Math.hypot(dx, dy, dz) || 1, sp = (o.speed == null ? 4 : o.speed) * (0.35 + Math.random() * 0.65);
      const j = o.jitter || 0.08;
      this.pos[k3] = x + (Math.random() - 0.5) * j; this.pos[k3 + 1] = y + (Math.random() - 0.5) * j; this.pos[k3 + 2] = z + (Math.random() - 0.5) * j;
      this.vel[k3] = dx / len * sp; this.vel[k3 + 1] = dy / len * sp; this.vel[k3 + 2] = dz / len * sp;
      this.col[k3] = c.r * br; this.col[k3 + 1] = c.g * br; this.col[k3 + 2] = c.b * br;
      this.size0[k] = (o.size || 0.22) * (0.6 + Math.random() * 0.8);
      this.life0[k] = this.life[k] = (o.life || 0.6) * (0.6 + Math.random() * 0.6);
      this.grav[k] = o.grav == null ? 5 : o.grav; this.drag[k] = o.drag == null ? 2.5 : o.drag; this.grow[k] = o.grow || 0;
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); i--; continue; }
      const i3 = i * 3, d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3 + 1] -= this.grav[i] * dt;
      this.vel[i3] *= d; this.vel[i3 + 1] *= d; this.vel[i3 + 2] *= d;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      if (this.pos[i3 + 1] < 0.02) { this.pos[i3 + 1] = 0.02; this.vel[i3 + 1] *= -0.3; }
      const k = this.life[i] / this.life0[i];
      this.alpha[i] = Math.min(1, k * 2.2);
      this.size[i] = this.size0[i] * (this.grow[i] ? 1 + (1 - k) * this.grow[i] : 0.4 + 0.6 * k);
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = a.pcolor.needsUpdate = a.psize.needsUpdate = a.palpha.needsUpdate = true;
    this.geo.setDrawRange(0, this.n);
  }
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    const i3 = i * 3, j3 = j * 3;
    for (let q = 0; q < 3; q++) { this.pos[i3 + q] = this.pos[j3 + q]; this.vel[i3 + q] = this.vel[j3 + q]; this.col[i3 + q] = this.col[j3 + q]; }
    this.size0[i] = this.size0[j]; this.life[i] = this.life[j]; this.life0[i] = this.life0[j]; this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j]; this.grow[i] = this.grow[j];
    this.size[i] = this.size[j]; this.alpha[i] = this.alpha[j];
  }
}

// A glowing ribbon that follows a weapon through its swing and fades behind it.
class SwingTrail {
  constructor(scene, color, n = 16) {
    // Tinted towards white so it shows up even on a member of the same colour.
    this.n = n; this.pts = []; this.life = 0.22; this.col = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4).multiplyScalar(1.8);
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3); this.rgba = new Float32Array(n * 2 * 4);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.rgba, 4).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.geo = g;
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    scene.add(this.mesh);
  }
  push(tip, base, t) { this.pts.unshift({ tip: tip.clone(), base: base.clone(), t }); if (this.pts.length > this.n) this.pts.pop(); }
  update(t) {
    this.pts = this.pts.filter(p => t - p.t < this.life);
    const P = this.pos, C = this.rgba, c = this.col;
    for (let i = 0; i < this.n; i++) {
      const p = this.pts[Math.min(i, this.pts.length - 1)], a = p ? Math.max(0, 1 - (t - p.t) / this.life) * (1 - i / this.n) : 0;
      for (let k = 0; k < 2; k++) {
        const v = p ? (k ? p.base : p.tip) : null, o = (i * 2 + k) * 3, q = (i * 2 + k) * 4;
        P[o] = v ? v.x : 0; P[o + 1] = v ? v.y : -10; P[o + 2] = v ? v.z : 0;
        C[q] = c.r; C[q + 1] = c.g; C[q + 2] = c.b; C[q + 3] = k ? a * 0.15 : a * 0.9;
      }
    }
    this.geo.attributes.position.needsUpdate = this.geo.attributes.color.needsUpdate = true;
    this.mesh.visible = this.pts.length > 1;
  }
}

// Does nothing: stands in for visuals in headless (simulation) runs.
const NOOP = new Proxy(function () {}, { get: (t, k) => (k === 'root' ? null : NOOP), apply: () => NOOP });

// ---------- visual effects ----------
class ActionFx {
  constructor(b) { this.b = b; this.list = []; }
  add(obj, dur, tick, done) { this.b.scene.add(obj); this.list.push({ obj, t: 0, dur, tick, done }); return obj; }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      f.tick && f.tick(k, f.obj, dt);
      if (k >= 1) { this.b.scene.remove(f.obj); f.done && f.done(); this.list.splice(i, 1); }
    }
  }
  basic(color, o = {}) {
    return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(o.bright || 1.8), map: o.map || null, transparent: true,
      opacity: o.opacity == null ? 1 : o.opacity, depthWrite: false, blending: o.normal ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide });
  }
  flatRing(x, z, color, r0, r1, dur, o = {}) {
    const m = new THREE.Mesh(geo('fxRing', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), this.basic(color, { map: ringTex(), bright: o.bright || 2.2 }));
    m.position.set(x, o.y || 0.06, z);
    return this.add(m, dur, k => { const r = r0 + (r1 - r0) * (1 - Math.pow(1 - k, 3)); m.scale.set(r, 1, r); m.material.opacity = (1 - k) * (o.alpha || 1); }, () => m.material.dispose());
  }
  // Caps how many flashes can start in a short window, so crowded fights stay readable.
  budget(kind, max) {
    const now = this.b.time, k = '_' + kind;
    if (!this[k] || now - this[k].t > 0.1) this[k] = { t: now, n: 0 };
    return ++this[k].n <= max;
  }
  glow(x, y, z, color, size, dur, o = {}) {
    if (!this.budget('glow', 7)) return null;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(color).multiplyScalar(o.bright || 2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(x, y, z);
    return this.add(s, dur, k => { const sc = size * (o.shrink ? 1 - k * 0.6 : 0.6 + k * 0.6); s.scale.set(sc, sc, 1); s.material.opacity = 1 - k; }, () => s.material.dispose());
  }
  // A burst on the ground: shockwave ring, flash and rising sparks.
  nova(x, z, r, color) {
    this.circle(x, z, r * 0.9, color, 0.7);
    this.b.streaks.emit(x, 0.4, z, { n: 22, speed: r * 4.5, color, up: 0.25, life: 0.35, width: 0.09, grav: 4 });
    this.flatRing(x, z, color, r * 0.25, r, 0.5);
    this.flatRing(x, z, '#ffffff', r * 0.1, r * 0.75, 0.3, { bright: 0.9, alpha: 0.6 });
    this.glow(x, 0.6, z, color, r * 0.7, 0.3, { bright: 1.5 });
    this.b.sparks.emit(x, 0.3, z, { n: 26, speed: r * 2.2, color, up: 0.5, life: 0.7, size: 0.26 });
    this.b.stars.emit(x, 0.5, z, { n: 8, speed: r * 1.2, color: '#ffffff', up: 1, life: 0.8, size: 0.4, grav: 1 });
  }
  dome(x, z, r, color) {
    const m = new THREE.Mesh(geo('fxDome', () => new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), this.basic(color, { opacity: 0.5, bright: 1.2 }));
    m.position.set(x, 0, z);
    this.add(m, 0.9, k => { const s = r * (0.3 + 0.7 * Math.min(1, k * 3)); m.scale.set(s, s * 0.8, s); m.material.opacity = 0.45 * (1 - k); }, () => m.material.dispose());
    this.nova(x, z, r, color);
  }
  splat(x, z, r, color) {
    const m = new THREE.Mesh(geo('fxSplat', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)),
      new THREE.MeshBasicMaterial({ color, map: splatTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.position.set(x, 0.03, z);
    m.rotation.y = Math.random() * 6.28;
    // Kept translucent and short-lived so splats don't bury the red warning zones.
    this.add(m, 2.6, k => { const s = r * Math.min(1, 0.4 + k * 12); m.scale.set(s, 1, s); m.material.opacity = k < 0.7 ? 0.6 : 0.6 * (1 - (k - 0.7) / 0.3); }, () => m.material.dispose());
    this.b.sparks.emit(x, 0.4, z, { n: 22, speed: r * 3, color, up: 1.2, life: 0.6, size: 0.24, grav: 12, bright: 1.2 });
    this.glow(x, 0.5, z, color, r * 1.2, 0.25);
  }
  // A crescent swipe in front of a unit (full = a 360° spin slash).
  slash(u, color, scale = 1, full = false, tilt = 0) {
    const arc = full ? Math.PI * 2 : 2.3;
    const geoKey = full ? 'fxSlashFull' : 'fxSlash';
    const g = geo(geoKey, () => {
      const r = new THREE.RingGeometry(0.75, 1.15, 40, 1, 0, arc);
      const uv = r.attributes.uv, pos = r.attributes.position;
      for (let i = 0; i < uv.count; i++) {
        const a = Math.atan2(pos.getY(i), pos.getX(i)), d = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, ((a + Math.PI * 2) % (Math.PI * 2)) / arc, (d - 0.75) / 0.4);
      }
      return r.rotateX(-Math.PI / 2);
    });
    // A coloured crescent with a thinner white-hot core inside it.
    const m = new THREE.Mesh(g, this.basic(color, { map: slashTex(), bright: 2.6 }));
    const core = new THREE.Mesh(g, this.basic('#ffffff', { map: slashTex(), bright: 1.3 }));
    core.scale.set(0.93, 1, 0.93);
    core.position.y = 0.01;
    const holder = new THREE.Group();
    holder.position.set(u.pos.x, 0.65, u.pos.z);
    holder.rotation.set(tilt, u.facing - (full ? 0 : Math.PI / 2 + arc / 2), 0);
    holder.add(m, core);
    const dir = Math.random() < 0.5 ? -1 : 1;
    return this.add(holder, 0.24, k => {
      const s = scale * (0.95 + 0.4 * k);
      holder.scale.set(s, s, s);
      m.material.opacity = 1 - k * k; core.material.opacity = (1 - k) * 0.8;
      m.rotation.y = core.rotation.y = dir * k * 0.45;
    }, () => { m.material.dispose(); core.material.dispose(); });
  }
  // A quick X-shaped double slash on a target.
  slashAt(p, color, scale = 1) {
    [0.7, -0.7].forEach((tilt, i) => {
      const fake = { pos: p, facing: Math.random() * 6.28 };
      this.slash(fake, color, scale * 0.9, false, tilt + (i ? Math.PI : 0));
    });
    this.b.sparks.emit(p.x, 0.7, p.z, { n: 10, speed: 6, color, life: 0.35, size: 0.2 });
  }
  beam(from, ang, len, color, dur = 0.22) {
    const m = new THREE.Mesh(geo('fxBeam', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5)), this.basic(color, { bright: 2.8 }));
    m.position.set(from.x, 0.7, from.z);
    m.rotation.y = ang;
    this.add(m, dur, k => { const w = 0.32 * (1 - k); m.scale.set(w, w, len); m.material.opacity = 1 - k; }, () => m.material.dispose());
    this.glow(from.x + Math.sin(ang) * 0.4, 0.7, from.z + Math.cos(ang) * 0.4, color, 1.4, 0.15);
  }
  pillar(x, z, color, dur = 0.8, r = 0.8, h = 6) {
    const m = new THREE.Mesh(geo('fxPillar', () => new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0)), this.basic(color, { opacity: 0.6, bright: 1.6 }));
    m.position.set(x, 0, z);
    return this.add(m, dur, k => { m.scale.set(r * (1 - k * 0.7), h * Math.min(1, k * 5), r * (1 - k * 0.7)); m.material.opacity = 0.55 * (1 - k); }, () => m.material.dispose());
  }
  // dir: which way the blow travels, so sparks spray out the far side.
  hit(p, color, big = false, dir = null) {
    const low = SAVE.settings.gfx === 'low', quiet = SAVE.settings.flashes === false;
    if (!this.budget('hit', low ? 3 : 6)) return;
    this.impact(p, color, big ? 2.5 : 1.1, big);
    this.b.streaks.emit(p.x, p.y, p.z, { n: low ? 3 : big ? 11 : 5, speed: big ? 13 : 9, color, life: big ? 0.3 : 0.18, width: big ? 0.09 : 0.05, dir: dir || undefined, spread: 0.65, grav: 6, bright: quiet ? 0.8 : 1.6 });
    if (!low && !quiet) this.b.streaks.emit(p.x, p.y, p.z, { n: big ? 3 : 1, speed: 10, color: '#ffffff', life: 0.12, width: 0.04, dir: dir || undefined, spread: 0.4, grav: 4 });
  }
  // Crisp ink-like contact marks expand once, then release; no full-screen flash.
  impact(p, color, size = 2.4, heavy = true) {
    if (!this.budget('impact', SAVE.settings.gfx === 'low' ? 3 : 6)) return null;
    const quiet = SAVE.settings.flashes === false;
    const map = canvasTex(heavy ? 'impactHeavy' : 'impactLight', 128, 128, g => {
      g.translate(64, 64); g.fillStyle = '#ffffff';
      for (let i = 0; i < (heavy ? 8 : 4); i++) {
        g.rotate(Math.PI / (heavy ? 4 : 2));
        const r = i % 2 ? 35 : 59;
        g.beginPath(); g.moveTo(7, 0); g.lineTo(16, heavy ? 7 : 4);
        g.lineTo(r, 0); g.lineTo(16, heavy ? -7 : -4); g.closePath(); g.fill();
      }
    });
    const mat = new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false,
      blending: quiet ? THREE.NormalBlending : THREE.AdditiveBlending, rotation: heavy ? Math.PI / 8 : Math.PI / 4 });
    const mark = new THREE.Sprite(mat); mark.position.copy(p);
    return this.add(mark, heavy ? 0.24 : 0.14, k => {
      const sc = size * (0.55 + 0.6 * Math.min(1, k * 4));
      mark.scale.set(sc, sc, 1); mat.opacity = (quiet ? 0.7 : 1) * (1 - k) * (1 - k);
    }, () => mat.dispose());
  }

  // A glowing magic circle on the ground that spins open and fades.
  circle(x, z, r, color, dur = 0.9) {
    const m = new THREE.Mesh(geo('fxCircle', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), this.basic(color, { map: circleTex(), bright: 1.9 }));
    m.position.set(x, 0.05, z);
    const spin = (Math.random() < 0.5 ? -1 : 1) * 1.2;
    return this.add(m, dur, (k, o, dt) => { const sc = r * (0.6 + 0.4 * Math.min(1, k * 4)); m.scale.set(sc, 1, sc); m.rotation.y += spin * dt; m.material.opacity = k < 0.7 ? Math.min(1, k * 6) : (1 - k) / 0.3; }, () => m.material.dispose());
  }
  tint(color, dur) { this.b.screenTint(color, dur); }
  // One cached emblem per member; cast shapes stay separate from red danger zones.
  signature(u, ultimate = false) {
    if (!this.budget('signature', 2)) return;
    const low = SAVE.settings.gfx === 'low', quiet = SAVE.settings.flashes === false;
    const map = canvasTex('memberCast:' + u.id, 256, 256, g => {
      g.translate(128, 128); g.strokeStyle = g.fillStyle = '#ffffff';
      g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
      const circle = r => { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
      if (u.id === 'sendo') {
        circle(34);
        for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(54, 0); g.lineTo(92, 0); g.stroke(); }
      } else if (u.id === 'hinano') {
        g.beginPath(); g.moveTo(0, -92); g.lineTo(75, -55); g.lineTo(60, 38); g.quadraticCurveTo(30, 77, 0, 94); g.quadraticCurveTo(-30, 77, -60, 38); g.lineTo(-75, -55); g.closePath(); g.stroke();
        circle(30); g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.moveTo(0, -14); g.lineTo(0, 14); g.stroke();
      } else if (u.id === 'noah') {
        g.beginPath(); g.arc(0, 0, 85, 0.5, 5.8); g.stroke();
        g.beginPath(); g.moveTo(-65, 45); g.lineTo(48, -64); g.moveTo(-34, 65); g.lineTo(65, -34); g.stroke();
      } else if (u.id === 'tsuna') {
        for (let i = 0; i < 5; i++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -55, 15, 35, 0, 0, Math.PI * 2); g.fill(); }
        circle(17);
      } else if (u.id === 'uruha') {
        circle(58); circle(25);
        for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(44, 0); g.lineTo(102, 0); g.stroke(); }
      } else {
        circle(70); circle(38);
        for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(50, -6); g.lineTo(58, 6); g.stroke(); }
      }
    });
    const mat = this.basic(u.def.color, { map, bright: quiet ? 0.9 : 1.3, normal: quiet });
    const emblem = new THREE.Mesh(geo('memberCastPlane', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), mat);
    emblem.position.set(u.pos.x, 0.12, u.pos.z);
    const size = ultimate ? 3.2 : 1.65, dur = ultimate ? 1.15 : 0.7;
    const spin = u.id === 'uruha' || u.id === 'hinano' ? 0 : u.id === 'noah' ? -0.7 : 0.35;
    this.add(emblem, dur, k => {
      const scale = size * (k < 0.22 ? 1.2 - k : 0.98 + (k - 0.22) * 0.5);
      emblem.scale.set(scale, 1, scale); emblem.rotation.y = u.facing + k * spin;
      mat.opacity = (quiet ? 0.45 : 0.7) * Math.min(1, k * 9) * Math.min(1, (1 - k) * 3);
    }, () => mat.dispose());
    if (low) return;
    const count = ultimate ? 8 : 4, shards = new THREE.Group();
    const shardMat = this.basic(u.def.color, { bright: quiet ? 0.9 : 1.4, normal: quiet });
    const shape = u.id === 'hinano' ? 'guard' : u.id === 'uruha' || u.id === 'noah' ? 'blade' : 'petal';
    const geometry = geo('memberShard:' + shape, () => shape === 'guard' ? new THREE.RingGeometry(0.7, 1, 6) : new THREE.PlaneGeometry(shape === 'blade' ? 0.12 : 0.3, 0.8));
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2, m = new THREE.Mesh(geometry, shardMat);
      m.position.set(Math.sin(a) * size * 0.65, 0.4, Math.cos(a) * size * 0.65);
      m.rotation.set(-0.4, a, shape === 'blade' ? 0.6 : 0); m.scale.setScalar(shape === 'guard' ? 0.3 : 0.65);
      shards.add(m);
    }
    shards.position.set(u.pos.x, 0, u.pos.z);
    this.add(shards, dur, k => {
      shards.scale.setScalar(0.7 + k * 0.8); shards.position.y = k * (ultimate ? 1.8 : 0.8);
      shards.rotation.y = u.facing + k * spin; shardMat.opacity = (quiet ? 0.35 : 0.65) * (1 - k);
    }, () => shardMat.dispose());
  }
  shake(a) { this.b.shake = Math.min(1, this.b.shake + a); }
}

// ---------- the battle ----------
class ActionBattle {
  constructor(container, stage, team, onExit, opts = {}) {
    this.stage = stage; this.onExit = onExit; this.opts = opts;
    this.headless = !!opts.headless;
    this.run = opts.run || null;                 // roguelite run state (rift.js)
    this.perks = (this.run && this.run.perks) || {};
    this.mods = new Set(stage.mods || []);
    this.team = team.filter(Boolean).slice(0, 3);
    this.time = 0; this.over = false; this.paused = false; this.timeScale = 1; this.slowT = 0; this.hitStop = 0;
    this.shake = 0; this.events = []; this.foes = []; this.projectiles = []; this.zones = []; this.pickups = []; this.puddles = []; this.pulses = [];
    this.combo = 0; this.comboIdle = 0; this.coached = {};
    this.stat = { hits: 0, crits: 0, breaks: 0, kills: 0, ults: 0, perfect: 0, maxCombo: 0, taken: 0 };
    this.auto = this.headless || (!stage.tutorial && BATTLE_PREFS.auto);
    this.keys = {}; this.stick = { x: 0, z: 0, on: false };
    this.waveIdx = 0; this.waveClear = false; this.sndAt = {};
    this.raidTime = stage.raid ? RAID_TIME : 0;
    this.root = document.createElement('div');
    this.root.className = 'ab';
    if (!this.headless) container.replaceChildren(this.root);
    this.buildDom();
    this.initScene();
    this.fx = this.headless ? NOOP : new ActionFx(this);
    this.player = this.makeHero(this.team[0]);
    this.supports = this.team.slice(1).map(id => this.makeSupport(id));
    this.applyStartBonuses();
    this.t0 = 0; this.npcs = []; this.sceneActors = []; this.tallies = [];
    // The squad walks into the arena and talks before the enemies show up (not in headless sims).
    const intro = this.headless ? null : this.sceneLines('start');
    if (intro) this.startIntro(intro); else this.beginFight();
    if (!this.headless) {
      this.bindInput();
      const bossId = stage.waves.flat().find(k => ENEMIES[k] && ENEMIES[k].boss);
      if (typeof playMusic === 'function') playMusic(bossId ? bossTrack(bossId) : 'battle');
      this.updateHud(true);
      this.last = performance.now();
      this.raf = requestAnimationFrame(t => this.frame(t));
    }
  }

  // Seconds of actual fighting (the story scene before it doesn't count).
  fightTime() { return Math.max(0, (this.over ? this.endTime : this.time) - this.t0); }

  // ---------- story scenes in the arena ----------
  // Lines for the scene before ('start') or after ('end') the fight. Story stages
  // play their written scene the first time; otherwise the squad trades a quick line.
  sceneLines(part) {
    const st = this.stage;
    if (st.raid) return null;
    if (this.run) return part === 'start' ? [] : null;
    const f = FIELD[st.id] && FIELD[st.id][part];
    if (f && !SAVE.seen[st.id + ':field-' + part]) { this.sceneQuick = false; return f; }
    this.sceneQuick = true;
    const lead = this.team[0], sup = this.team[1];
    if (part === 'start') return [[lead, voice(lead, 'battleStart')]].concat(sup ? [[sup, voice(sup, 'battleStart')]] : []);
    return [[lead, voice(lead, 'victory')]];
  }

  // Squad members (and story members who speak) placed for a scene.
  sceneCast(lines) {
    const cast = [this.player];
    this.supports.forEach(s => {
      if (!s.model || s.model === NOOP) this.attachModel(s, new Chibi(s.id), 0.62, CHIBI_SCALE);
      s.model.root.visible = s.shadow.visible = true;
      s.model.root.scale.setScalar(s.ms);
      cast.push(s);
    });
    const ids = [...new Set(lines.map(l => l[0]).filter(id => CHARACTERS[id] && !this.team.includes(id)))];
    ids.forEach(id => {
      const n = { id, def: CHARACTERS[id], pos: new THREE.Vector3(), facing: Math.PI, npc: true };
      this.attachModel(n, new Chibi(id), 0.62, CHIBI_SCALE);
      this.npcs.push(n);
      cast.push(n);
    });
    this.sceneActors = cast;
    return cast;
  }

  startIntro(lines) {
    this.phase = 'scene';
    this.root.classList.add('scene');
    const cast = this.sceneCast(lines);
    cast.forEach((u, i) => {
      const m = SCENE_MARKS[Math.min(i, SCENE_MARKS.length - 1)];
      u.pos.set(m[0], 0, m[1] + 5.5);
      u.walkTo = new THREE.Vector3(m[0], 0, m[1]);
      u.facing = Math.PI;
      this.syncModel(u);
    });
    this.camAt.set(0, 0, 8.5);
    this.camFocus = new THREE.Vector3(0, 0, 4);
    this.after(0.7, () => { if (this.phase === 'scene') this.cam.to = { yaw: Math.PI * 0.94, dist: 6.6, h: 2.5 }; });
    this.after(1.25, () => (lines.length ? this.playScene(lines, () => this.beginFight()) : this.beginFight()));
  }

  beginFight() {
    this.phase = 'fight';
    this.t0 = this.time;
    if (!this.headless) {
      if (this.sceneActors.length && !this.sceneQuick) SAVE.seen[this.stage.id + ':field-start'] = true;
      this.root.classList.remove('scene');
      this.q('.ab-scene').classList.add('hidden');
      this.cam.to = battleCam();
      this.camFocus = null;
      // Story guests step out; supports wait off the field until they're called.
      this.npcs.forEach(n => this.poof(n, true));
      this.npcs = [];
      this.supports.forEach(s => { if (s.model && s.model.root && s.model.root.visible && s.on <= 0) this.poof(s); });
      this.sceneActors = [];
      this.player.walkTo = null;
      if (this.stage.tutorial) this.after(0.8, () => this.coach('move'));
    }
    this.spawnWave();
    this.titleCard();
  }

  // After the last enemy: everyone gathers round the leader for a closing exchange.
  startOutro() {
    if (this.over) return;
    const lines = this.headless ? null : this.sceneLines('end');
    if (!lines || !lines.length) return this.finish(true);
    this.phase = 'scene';
    this.root.classList.add('scene');
    this.zones.forEach(z => this.removeZone(z)); this.zones = [];
    this.projectiles.forEach(p => { if (p.mesh) this.scene.remove(p.mesh); }); this.projectiles = [];
    const h = this.player;
    h.atk_ = null; h.dodgeTime = 0;
    const cast = this.sceneCast(lines);
    cast.forEach((u, i) => {
      if (u === h) return;
      const a = Math.PI + (i % 2 ? 1 : -1) * (0.7 + Math.floor((i - 1) / 2) * 0.55), d = 1.6 + Math.floor((i - 1) / 2) * 0.5;
      u.pos.set(h.pos.x + Math.sin(a) * d, 0, h.pos.z + Math.cos(a) * d);
      this.keepInArena(u);
      u.facing = Math.PI;
      this.syncModel(u);
      if (!u.npc) u.on = 0;
      this.fx.pillar(u.pos.x, u.pos.z, u.def.color, 0.5, 0.6);
      this.stars.emit(u.pos.x, 0.8, u.pos.z, { n: 8, speed: 2, color: u.def.color, life: 0.6, size: 0.4, grav: -1 });
    });
    this.camFocus = h.pos.clone();
    this.cam.to = { yaw: Math.PI * 0.94, dist: 6.2, h: 2.4 };
    cast.forEach((u, i) => this.after(0.1 * i, () => u.model.play('cheer')));
    this.after(0.7, () => this.playScene(lines, () => {
      if (!this.sceneQuick) SAVE.seen[this.stage.id + ':field-end'] = true;
      this.finish(true);
    }));
  }

  // A member vanishes in a burst of sparkles (remove = an NPC leaving for good).
  poof(u, remove = false) {
    if (this.headless || !u.model || !u.model.root) return;
    this.stars.emit(u.pos.x, 0.8, u.pos.z, { n: 10, speed: 2.5, color: u.def.color, life: 0.6, size: 0.45, grav: -1 });
    this.fx.glow(u.pos.x, 0.7, u.pos.z, u.def.color, 1.8, 0.3);
    if (remove) { this.scene.remove(u.model.root); this.scene.remove(u.shadow); u.model.dispose(); }
    else { u.model.root.visible = false; u.shadow.visible = false; }
  }

  playScene(lines, done) {
    if (this.disposed) return;
    this.q('.ab-scene').classList.remove('hidden');
    this.sceneQueue = lines.slice();
    this.sceneDone = done;
    this.nextLine();
  }

  nextLine() {
    const line = this.sceneQueue && this.sceneQueue.shift();
    const box = this.q('.abs-box');
    if (!line) {
      this.sceneLine = null; this.sceneSpeaker = null;
      this.q('.ab-scene').classList.add('hidden');
      const d = this.sceneDone; this.sceneDone = null;
      return d && d();
    }
    const [who, text, name] = line, actor = this.sceneActors.find(u => u.id === who);
    this.sceneSpeaker = actor || null;
    this.sceneLine = { text, shown: 0, wait: 0, talkT: 0, chat: who === 'chat' };
    box.className = 'abs-box' + (who === 'narrator' ? ' narr' : '') + (who === 'chat' ? ' chat' : '');
    const c = CHARACTERS[who];
    box.style.setProperty('--c', c ? c.color : who === 'chat' ? '#ff5c9a' : '#cfd5ff');
    this.q('.abs-name').textContent = c ? c.short : who === 'chat' ? 'LIVE CHAT' : who === 'narrator' ? '' : (name || (ENEMIES[who] ? ENEMIES[who].name : who));
    this.q('.abs-text').textContent = '';
    this.q('.abs-face').setAttribute('style', c ? faceStyle(who) : 'display:none');
    if (who === 'chat') {
      // Chat lines pop up as stream comments instead of a typed line.
      const log = this.q('.abs-chat');
      text.split(' / ').forEach((m, i) => setTimeout(() => {
        const el = document.createElement('div');
        el.innerHTML = `<b>${['viewer', 'fan', 'lurker', 'mod', 'clipper'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 900 + 100)}</b>${escapeHtml(m)}`;
        log.appendChild(el);
        while (log.childElementCount > 6) log.firstChild.remove();
      }, i * 260));
      this.sceneLine.shown = text.length;
      this.q('.abs-text').textContent = text.split(' / ').join('  ·  ');
    }
    if (actor) {
      // Lean the camera toward the speaker but keep the group in frame.
      this.camFocus = this.sceneCenter().lerp(actor.pos, 0.55);
      actor.model.play('talk');
      if (/!/.test(text) && !/\.\.\./.test(text)) actor.model.setFace(2, 2.2);
    } else if (who === 'narrator') this.camFocus = this.sceneCenter();
  }

  sceneCenter() {
    const a = this.sceneActors;
    if (!a.length) return this.player.pos.clone();
    return a.reduce((v, u) => v.add(u.pos), new THREE.Vector3()).multiplyScalar(1 / a.length);
  }

  // Tap / Space: finish the line being typed, or go to the next one.
  advance() {
    const L = this.sceneLine;
    if (this.phase !== 'scene' || !L) return;
    if (L.shown < L.text.length) { L.shown = L.text.length; this.q('.abs-text').textContent = L.text; return; }
    this.nextLine();
  }

  updateScene(dt) {
    const sp = this.sceneSpeaker;
    this.sceneActors.forEach(u => {
      if (u.walkTo) {
        const dx = u.walkTo.x - u.pos.x, dz = u.walkTo.z - u.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.05) {
          const s = Math.min(d, dt * 3.6);
          u.pos.x += dx / d * s; u.pos.z += dz / d * s;
          u.facing = turnTo(u.facing, Math.atan2(dx, dz), dt * 10);
          u.model.setState('run');
          return;
        }
        u.walkTo = null;
      }
      u.model.setState('idle');
      // The speaker turns to the camera, everyone else looks at the speaker.
      const look = sp && sp !== u ? sp.pos : this.camera.position;
      u.facing = turnTo(u.facing, Math.atan2(look.x - u.pos.x, look.z - u.pos.z), dt * 5);
    });
    if (this.camFocus && this.phase === 'scene' && !sp && this.sceneActors.some(u => u.walkTo)) this.camFocus.copy(this.sceneCenter());
    const L = this.sceneLine;
    if (!L) return;
    if (L.shown < L.text.length) {
      L.shown = Math.min(L.text.length, L.shown + dt * 48);
      this.q('.abs-text').textContent = L.text.slice(0, Math.floor(L.shown));
      L.talkT -= dt;
      if (sp && L.talkT <= 0) { L.talkT = 0.9; sp.model.play('talk'); }
    } else {
      L.wait += dt;
      const auto = this.sceneQuick || L.chat || this.sceneAuto;
      if (auto && L.wait > (L.chat ? 1.8 : 1.1 + L.text.length * 0.025)) this.nextLine();
    }
    this.q('.abs-box').classList.toggle('done', L.shown >= L.text.length);
  }

  // ---------- setup ----------
  q(sel) { return this.root.querySelector(sel); }

  buildDom() {
    const st = this.stage, n = st.waves.length;
    this.root.classList.toggle('hud-quiet', SAVE.settings.flashes === false || SAVE.settings.gfx === 'low');
    const dodgeSvg = '<svg viewBox="0 0 24 24" class="ic"><path d="M4 16c4 0 6-2 9-6M4 11c3 0 5-1.5 7-4M14 5l6 0-1 6M20 5l-7 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.root.innerHTML = `
      <canvas class="ab-cv"></canvas>
      <div class="ab-labels"></div>
      <div class="ab-tint"></div>
      <div class="ab-top">
        <div class="ab-stage"><span class="live"><i></i>LIVE</span><b>${st.raid ? 'RANKED RAID' : st.run ? 'BRACKET RUN' : st.tower ? 'TOWER' : st.id}</b><span class="ab-name">${st.name}</span><em class="ab-wave"></em></div>
        <div class="ab-ctrl"><button class="ctl auto ${this.auto ? 'on' : ''}" title="Auto battle (F)">${ic('auto')}<span>AUTO</span></button><button class="ctl pause" title="Pause (Esc)">${ic('pause')}</button></div>
      </div>
      <div class="ab-clock"><b>0:00</b><small></small></div>
      <div class="ab-boss hidden"><div class="abb-head"><b class="abb-name"></b><span class="abb-weak"></span><span class="abb-phase"></span></div>
        <div class="abb-hp"><i class="abb-trail"></i><i class="abb-fill"></i><u style="left:50%"></u><u style="left:25%"></u></div><div class="abb-poise"><i></i></div><div class="abb-cast"></div></div>
      ${st.raid ? '<div class="ab-raid"><small>RAID SCORE</small><b>0</b></div>' : ''}
      <div class="ab-hero">
        <div class="abh-face"></div>
        <div class="abh-main"><div class="abh-name"></div><div class="abh-hp"><i class="abh-trail"></i><i class="abh-fill"></i></div><div class="abh-guard hidden"><span>SHIELD</span><div><s class="abh-shield"></s></div><b></b></div><div class="abh-num"></div><div class="abh-buffs"></div></div>
      </div>
      <div class="ab-combo hidden"><b>0</b><span>HITS</span></div>
      <div class="ab-title"><b></b><span></span></div>
      <div class="ab-autotag">AUTO BATTLE</div>
      <div class="ab-banner"></div>
      <div class="ab-stick hidden"><i></i></div>
      <div class="ab-btns">
        <button class="ab-b ult" data-k="ult"><span class="abb-ring"></span><span class="abb-face"></span><em>ULTIMATE</em><small class="abb-charge"></small><kbd>Q</kbd></button>
        <button class="ab-b skill" data-k="skill"><span class="abb-cd"></span>${ic('skill')}<em>SKILL</em><kbd>E</kbd><small class="abb-t"></small></button>
        <button class="ab-b dodge" data-k="dodge"><span class="abb-cd"></span>${dodgeSvg}<em>DODGE</em><kbd>SPACE</kbd><span class="abb-pips"></span></button>
        ${this.team.slice(1).map((id, i) => `<button class="ab-b sup" data-k="sup${i}" style="--c:${CHARACTERS[id].color}"><span class="abb-cd"></span><span class="abb-face" style="${faceStyle(id)}"></span><kbd>${i + 1}</kbd><small class="abb-t"></small></button>`).join('')}
      </div>
      <div class="ab-cut hidden"></div>
      <div class="ab-scene hidden"><i class="abs-bar top"></i><i class="abs-bar bot"></i><div class="abs-chat"></div>
        <div class="abs-ctrl"><button class="abs-auto">AUTO</button><button class="abs-skip">SKIP ›</button></div>
        <div class="abs-box"><span class="abs-face"></span><div class="abs-name"></div><p class="abs-text"></p><i class="abs-next"></i></div></div>
      <div class="ab-coach hidden"><p></p></div>
      <div class="ab-flash"></div>
      <div class="pause-menu hidden"></div>
      <div class="end hidden"></div>`;
    if (n > 1) this.q('.ab-wave').textContent = `WAVE 1/${n}`;
  }

  initScene() {
    const th = ARENA_THEMES[stageBg(this.stage)] || ARENA_THEMES['street-day'];
    this.theme = th;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.3, 300);
    // Orbit camera: yaw 0 = behind the squad (battle view), PI = in front of them (story scenes).
    this.cam = Object.assign(battleCam(), { to: battleCam() });
    this.camFocus = null;
    this.camAt = new THREE.Vector3(0, 0, 2);
    this.camLook = new THREE.Vector3();
    this.punch = 0; this.baseFov = 36;
    this.camZoom = 1; this.camZoomTo = 1;
    if (this.headless) { this.sparks = this.stars = this.streaks = this.pixels = NOOP; return; }
    // Rim light on every model: warm in daylight, the arena's neon accent at night.
    this.rimTint = th.outdoor ? new THREE.Color('#fff1d8') : new THREE.Color(th.accent).lerp(new THREE.Color('#ffffff'), 0.35);
    const cv = this.q('.ab-cv');
    const hq = SAVE.settings.gfx !== 'low';
    this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !hq, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hq ? 1.5 : 1.25));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Real shadows on High graphics; Fast keeps the soft blob under each unit.
    if (hq) { this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    this.scene.fog = new THREE.Fog(th.fog, 34, 95);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b9aacb', 1.4 * th.light));
    const sun = new THREE.DirectionalLight('#fff3e6', 1.85 * th.light);
    sun.position.set(-7, 14, 6);
    if (hq) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
      sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    }
    this.scene.add(sun, sun.target);
    this.buildArena(th);
    // Ring under the leader and a lock-on reticle under her current target.
    this.heroRing = new THREE.Mesh(geo('heroRing', () => new THREE.RingGeometry(0.66, 0.74, 48).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8f4ff').multiplyScalar(1.3), transparent: true, opacity: 0.6, depthWrite: false }));
    this.heroRing.position.y = 0.025;
    this.lockRing = new THREE.Mesh(geo('lockRing', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ map: reticleTex(), color: new THREE.Color('#ff3d5a').multiplyScalar(1.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.lockRing.position.y = 0.03;
    this.scene.add(this.heroRing, this.lockRing);
    this.sparks = new Sparks(this.scene, glowTex(), 1600);
    this.stars = new Sparks(this.scene, starTex(), 500);
    this.streaks = new Streaks(this.scene, 800);
    this.pixels = new Sparks(this.scene, pixelTex(), 600);
    if (hq) {
      const X = THREE_X;
      // A multisampled target: without it the post-processing chain drops anti-aliasing
      // and every outline comes out jagged.
      this.composer = new X.EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
      this.composer.addPass(new X.RenderPass(this.scene, this.camera));
      this.bloom = new X.UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.32, 1.0);
      this.composer.addPass(this.bloom);
      // Gentle vignette and a touch more saturation: the anime-game finish.
      this.grade = new X.ShaderPass({
        uniforms: { tDiffuse: { value: null }, dark: { value: th.outdoor ? 0.65 : 0.9 }, sat: { value: th.outdoor ? 1.08 : 1.14 },
          tone: { value: new THREE.Color(th.outdoor ? '#fff1de' : th === ARENA_THEMES.rooftop ? '#dce9ff' : th === ARENA_THEMES.alley ? '#f2ddff' : '#ffe6dc') } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform sampler2D tDiffuse; uniform float dark; uniform float sat; uniform vec3 tone; varying vec2 vUv; void main() { vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(0.299, 0.587, 0.114)); c.rgb = mix(vec3(l), c.rgb, sat) * mix(vec3(1.0), tone, 0.16); vec2 d = vUv - 0.5; c.rgb *= 1.0 - dot(d, d) * dark; gl_FragColor = c; }',
      });
      this.composer.addPass(this.grade);
      this.composer.addPass(new X.OutputPass());
    }
    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
  }

  resize() {
    if (!this.renderer) return;
    const w = this.root.clientWidth || window.innerWidth, h = this.root.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // Narrow screens pull the camera back so the arena still fits.
    this.baseFov = this.camera.fov = w / h < 1.4 ? 44 : 36;
    this.camera.updateProjectionMatrix();
    const ph = this.renderer.getPixelRatio() * h;
    [this.sparks, this.stars].forEach(s => { if (s.mat) s.mat.uniforms.scale.value = ph / (2 * Math.tan(this.camera.fov * Math.PI / 360)); });
  }

  buildArena(th) {
    const s = this.scene, R = ACT.arena;
    // Sky dome with a vertical gradient.
    const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(th.sky[0]) }, mid: { value: new THREE.Color(th.sky[1]) }, bot: { value: new THREE.Color(th.sky[2]) } },
      vertexShader: 'varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
        void main() { float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bot, pow(-h, 0.5)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    }));
    sky.renderOrder = -1;
    s.add(sky);
    this.sky = sky;
    // A round hall: patterned arena floor, a walkway ring, a railing with two gates,
    // pillars with banners, an arched wall around the far side and an entrance stair.
    this.props = [];
    const shadows = this.renderer.shadowMap.enabled, dark = shadeHex(th.ground, -0.32), stone = shadeHex(th.ground, -0.12);
    const put = (m, cast = true, recv = true) => { m.castShadow = cast && shadows; m.receiveShadow = recv && shadows; s.add(m); return m; };
    const toon = (c, o) => toonMat(c, Object.assign({ rimAmt: 0.12 }, o || {}));
    const glow = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2) });
    const isGate = a => { const d = Math.abs(angDiff(a, 0)), n = Math.abs(angDiff(a, Math.PI)); return d < 0.32 || n < 0.32; };
    put(new THREE.Mesh(new THREE.CircleGeometry(R + 0.8, 72).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ map: hallFloorTex(th, SAVE.settings.gfx === 'low' ? 1024 : 2048), gradientMap: c3().ramp })), false).position.y = 0.001;
    put(new THREE.Mesh(new THREE.RingGeometry(R + 0.8, R + 10, 72, 1).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ map: walkTex(th), gradientMap: c3().ramp })), false).position.y = -0.2;
    put(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.8, R + 0.8, 0.2, 72, 1, true), toon(dark, { side: THREE.DoubleSide })), false).position.y = -0.1;
    put(new THREE.Mesh(new THREE.TorusGeometry(R + 0.8, 0.05, 6, 120).rotateX(Math.PI / 2), glow(th.accent)), false, false).position.y = 0.02;
    // railing: posts and a top rail in two arcs, leaving the gates open
    const railR = R + 1.3;
    for (let i = 0; i < 44; i++) {
      const a = i / 44 * Math.PI * 2;
      if (isGate(a)) continue;
      const post = put(new THREE.Mesh(G.box(0.16, 0.95, 0.16), toon(stone)));
      post.position.set(Math.sin(a) * railR, 0.27, Math.cos(a) * railR);
      post.rotation.y = a;
    }
    [0.32, Math.PI + 0.32].forEach(start => {
      const rail = put(new THREE.Mesh(new THREE.TorusGeometry(railR, 0.07, 6, 60, Math.PI - 0.64), toon(dark)), true, false);
      // Laid flat, a torus arc spans angles (PI/2 - len - z .. PI/2 - z); spin it to start just past a gate.
      rail.rotation.set(Math.PI / 2, 0, Math.PI / 2 - start - (Math.PI - 0.64));
      rail.position.y = 0.76;
      const trimArc = put(new THREE.Mesh(new THREE.TorusGeometry(railR, 0.025, 4, 60, Math.PI - 0.64), glow(th.accent)), false, false);
      trimArc.rotation.copy(rail.rotation);
      trimArc.position.y = 0.86;
    });
    // pillars and banners around the far half of the hall (the near half stays open for the camera)
    const pillR = R + 3.6, banner = bannerTex(th);
    for (let i = 0; i < 12; i++) {
      const a = (i + 0.5) / 12 * Math.PI * 2;
      if (Math.cos(a) > 0.45 || isGate(a)) continue;
      const x = Math.sin(a) * pillR, z = Math.cos(a) * pillR;
      put(new THREE.Mesh(G.box(1.1, 0.5, 1.1), toon(dark))).position.set(x, 0.05, z);
      put(new THREE.Mesh(G.cyl(0.42, 0.48, 5.4, 12), toon(stone))).position.set(x, 2.9, z);
      put(new THREE.Mesh(G.box(1.15, 0.45, 1.15), toon(dark))).position.set(x, 5.75, z);
      const band = put(new THREE.Mesh(G.cyl(0.5, 0.5, 0.12, 12), glow(th.accent)), false, false);
      band.position.set(x, 1.4, z);
      if (i % 2 === 0) {
        const b = put(new THREE.Mesh(geo('bannerPlane', () => new THREE.PlaneGeometry(1.2, 3)), new THREE.MeshToonMaterial({ map: banner, gradientMap: c3().ramp, side: THREE.DoubleSide, transparent: true })), false, false);
        b.position.set(Math.sin(a) * (pillR - 0.5), 3.9, Math.cos(a) * (pillR - 0.5));
        b.rotation.y = a + Math.PI;
        this.props.push({ obj: b, y: 3.9, ph: i, amp: 0.03 });
      }
      const lamp = put(new THREE.Mesh(geo('lampGem', () => new THREE.OctahedronGeometry(0.22, 0)), glow(th.mote === '#ffffff' ? th.accent : th.mote)), false, false);
      lamp.position.set(Math.sin(a) * (pillR - 0.9), 6.6, Math.cos(a) * (pillR - 0.9));
      this.props.push({ obj: lamp, y: 6.6, ph: i * 1.3, amp: 0.18, spin: 0.8 });
    }
    this.buildDressing(th, put, toon, glow, isGate);
    // the arched outer wall, around the far side only (indoor stages)
    if (!th.outdoor) {
    const wallMat = new THREE.MeshToonMaterial({ map: wallTex(th), gradientMap: c3().ramp, side: THREE.DoubleSide });
    wallMat.map.repeat.set(10, 1);
    const wall = put(new THREE.Mesh(new THREE.CylinderGeometry(R + 9, R + 9, 9, 64, 1, true, Math.PI - 2.1, 4.2), wallMat), false);
    wall.position.y = 4.3;
    // soft light shafts slanting into the hall from high up on the far side
    const shaft = new THREE.MeshBasicMaterial({ map: shaftTex(), color: new THREE.Color(th.mote === '#ffffff' ? th.accent : th.mote).lerp(new THREE.Color('#ffffff'), 0.55),
      transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    [-0.95, -0.35, 0.35, 0.95].forEach((k, i) => {
      const a = Math.PI + k, d = R + 3.4 + (i % 2) * 2.2, holder = new THREE.Group(), lean = new THREE.Group();
      holder.position.set(Math.sin(a) * d, 11.5, Math.cos(a) * d);
      holder.rotation.y = a;
      lean.rotation.x = 0.3;   // the foot of the shaft leans in towards the arena
      // two crossed planes give the beam some volume from any angle
      [0, Math.PI / 2].forEach(ry => { const m = new THREE.Mesh(geo('shaft', () => new THREE.PlaneGeometry(2.6, 13).translate(0, -6.5, 0)), shaft); m.rotation.y = ry; lean.add(m); });
      holder.add(lean);
      s.add(holder);
    });
    }
    // entrance stair through the near gate
    for (let k = 0; k < 6; k++) put(new THREE.Mesh(G.box(3.2, 0.2, 0.6), toon(k % 2 ? stone : dark))).position.set(0, -0.3 - k * 0.2, R + 1.4 + k * 0.6);
    // Drifting motes.
    this.motes = new Sparks(s, glowTex(), 140);
    for (let i = 0; i < (SAVE.settings.gfx === 'low' ? 24 : 90); i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * (R + 8);
      this.motes.emit(Math.sin(a) * d, Math.random() * 7, Math.cos(a) * d, { n: 1, speed: 0.35, up: 1, color: th.mote, life: 1e6, size: 0.12, grav: 0, drag: 0, bright: 1.3 });
    }
  }

  // Set dressing: floating stream screens, speaker stacks, crates and lights around the
  // walkway and a skyline beyond; outdoor stages add planters and lamp posts instead of the wall.
  buildDressing(th, put, toon, glow, isGate) {
    const s = this.scene, R = ACT.arena, dark = shadeHex(th.ground, -0.36), mid = shadeHex(th.ground, -0.2);
    this.buildLandmarks(th, toon, glow);
    const screen = new THREE.MeshBasicMaterial({ map: holoTex(th), transparent: true, opacity: 0.92, side: THREE.DoubleSide, color: new THREE.Color('#ffffff').multiplyScalar(1.25) });
    // floating screens over the far half
    [-1.15, -0.55, 0, 0.55, 1.15].forEach((k, i) => {
      const a = Math.PI + k, d = R + 6.2;
      const m = put(new THREE.Mesh(geo('holo', () => new THREE.PlaneGeometry(3.2, 2)), screen), false, false);
      m.position.set(Math.sin(a) * d, 4.2 + (i % 2) * 0.8, Math.cos(a) * d);
      m.lookAt(0, 3, 0);
      this.props.push({ obj: m, y: m.position.y, ph: i * 1.7, amp: 0.25 });
      const frame = put(new THREE.Mesh(geo('holoFrame', () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.3, 2.1))), new THREE.LineBasicMaterial({ color: new THREE.Color(th.accent).multiplyScalar(2) })), false, false);
      frame.position.copy(m.position); frame.quaternion.copy(m.quaternion);
      this.props.push({ obj: frame, y: frame.position.y, ph: i * 1.7, amp: 0.25 });
    });
    // speaker stacks, crates and standing lights on the walkway (never in the gates or the near side)
    const spots = [[2.35, 'speaker'], [2.75, 'crate'], [3.05, 'light'], [3.5, 'crate'], [3.85, 'speaker'], [4.2, 'light'], [1.95, 'light'], [4.45, 'crate']];
    spots.forEach(([a, kind], i) => {
      if (isGate(a) || Math.cos(a) > 0.3) return;
      const d = R + 2.2 + (i % 2) * 0.9, x = Math.sin(a) * d, z = Math.cos(a) * d;
      if (kind === 'speaker') {
        const box = put(new THREE.Mesh(G.box(1, 1.4, 0.8), toon(dark)));
        box.position.set(x, 0.5, z); box.lookAt(0, 0.5, 0);
        [0.25, -0.25].forEach(h => { const c = put(new THREE.Mesh(G.cyl(0.24, 0.24, 0.06, 18), toon(mid)), false); c.position.set(0, h, 0.41); c.rotation.x = Math.PI / 2; box.add(c); });
        const led = new THREE.Mesh(G.box(0.8, 0.05, 0.02), glow(th.accent)); led.position.set(0, 0.6, 0.41); box.add(led);
      } else if (kind === 'crate') {
        const c = put(new THREE.Mesh(G.box(0.8, 0.8, 0.8), toon(mid)));
        c.position.set(x, 0.2, z); c.rotation.y = a * 3;
        const c2 = put(new THREE.Mesh(G.box(0.55, 0.55, 0.55), toon(shadeHex(th.ground, -0.08))));
        c2.position.set(x + 0.2, 0.88, z - 0.1); c2.rotation.y = a * 5;
      } else {
        put(new THREE.Mesh(G.cyl(0.07, 0.1, 2.4, 8), toon(dark))).position.set(x, 1, z);
        const bulb = put(new THREE.Mesh(G.sph(), glow(th.mote === '#ffffff' ? th.accent : th.mote)), false, false);
        bulb.position.set(x, 2.3, z); bulb.scale.setScalar(0.2);
      }
    });
    this.buildSkyline(th, glow);
    if (!th.outdoor) return;
    // Outdoor plaza: planters and lamp posts round the far side.
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i - 4) * 0.42, d = R + 4.4, x = Math.sin(a) * d, z = Math.cos(a) * d;
      const pot = put(new THREE.Mesh(G.cyl(0.7, 0.6, 0.7, 12), toon(shadeHex(th.ground, -0.25))));
      pot.position.set(x, 0.15, z);
      [[0, 0.75, 0, 0.55], [0.3, 0.95, 0.1, 0.38], [-0.28, 0.9, -0.1, 0.4]].forEach(([bx, by, bz, r]) => {
        const bush = put(new THREE.Mesh(G.sph(), toon(i % 3 ? '#5fae6b' : '#7cc47a')), true, false);
        bush.position.set(x + bx, by, z + bz); bush.scale.setScalar(r);
      });
      if (i % 2 === 0) {
        const lx = Math.sin(a) * (d + 1.4), lz = Math.cos(a) * (d + 1.4);
        put(new THREE.Mesh(G.cyl(0.08, 0.12, 4, 8), toon('#3a3f52'))).position.set(lx, 1.8, lz);
        const lamp = put(new THREE.Mesh(G.sph(), glow('#fff2c8')), false, false);
        lamp.position.set(lx, 3.9, lz); lamp.scale.setScalar(0.28);
      }
    }
  }

  // Theme silhouettes sit outside the playable ring and leave the gates clear.
  buildLandmarks(th, toon, glow) {
    const bg = stageBg(this.stage), low = SAVE.settings.gfx === 'low';
    this.arenaSignals = [];
    const metal = toon('#37445b'), trim = toon('#93a5bd');
    const box = geo('arenaDetailBox', () => new THREE.BoxGeometry(1, 1, 1));
    const add = (parent, geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
    };
    const signal = (parent, x, y, z, color, phase) => {
      const mat = glow(color); add(parent, box, mat, x, y, z, 0.2, 0.12, 0.2);
      this.arenaSignals.push({ mat, base: mat.color.clone(), phase });
    };
    for (let side = -1; side <= 1; side += 2) {
      const group = new THREE.Group(); group.position.set(side * (ACT.arena + 4), 0, -5); group.rotation.y = -side * 0.5;
      this.scene.add(group);
      if (bg === 'rooftop') {
        add(group, box, metal, 0, 0.9, 0, 2.8, 1.8, 1.7);
        if (!low) for (let i = 0; i < 5; i++) add(group, box, trim, 0, 0.35 + i * 0.25, 0.88, 2.3, 0.06, 0.05);
        const tank = geo('arenaWaterTank', () => new THREE.CylinderGeometry(1.1, 1.1, 2, 16));
        add(group, tank, trim, 0, 4, -2.5);
        [-0.7, 0.7].forEach(x => add(group, box, metal, x, 1.8, -2.5, 0.12, 3.4, 0.12));
        add(group, box, trim, side * 1.6, 3, 0, 0.07, 6, 0.07);
        signal(group, side * 1.6, 6, 0, '#8edfff', side);
      } else if (bg === 'alley') {
        add(group, box, metal, 0, 2.5, 0, 0.14, 5, 0.14);
        const tex = canvasTex('arenaNeon:' + side, 256, 128, g => {
          g.fillStyle = '#11162d'; g.fillRect(0, 0, 256, 128);
          g.strokeStyle = '#ff92e7'; g.lineWidth = 5; g.strokeRect(8, 8, 240, 112);
          g.fillStyle = '#8eeeff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
          g.fillText(side < 0 ? 'ON AIR' : 'LIVE / 24', 128, 66);
          g.fillStyle = '#ff92e7'; g.fillRect(55, 88, 146, 5);
        });
        const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        add(group, geo('arenaNeonBoard', () => new THREE.PlaneGeometry(3.4, 1.7)), mat, 0, 4.4, 0.12);
        if (!low) this.arenaSignals.push({ mat, base: mat.color.clone(), phase: side * 2 });
        add(group, box, trim, side * 1.2, 2, -0.6, 0.14, 4, 0.14);
        add(group, box, trim, side * 0.5, 3.9, -0.6, 1.5, 0.14, 0.14);
      } else if (bg === 'tunnel') {
        for (let i = 0; i < (low ? 2 : 4); i++) {
          add(group, box, metal, 0, 1.4, i * 2 - 3, 0.18, 2.8, 0.18);
          signal(group, 0, 2.9, i * 2 - 3, '#ffd896', i + side);
        }
        add(group, box, trim, 0, 1.2, 0, 0.12, 0.12, 9);
        add(group, box, trim, 0, 0.6, 0, 0.12, 0.12, 9);
        add(group, box, metal, 0, 3.8, 0, 0.35, 0.35, 11);
      } else {
        const warm = bg === 'sunset-street', festival = bg === 'city-day';
        add(group, box, metal, 0, 2.8, 0, 0.12, 5.6, 0.12);
        add(group, box, metal, 1.1, 5.5, 0, 2.3, 0.1, 0.1);
        const mat = toon(warm ? '#ffd69a' : festival ? '#9edcff' : '#f5b8d8');
        if (warm) {
          add(group, geo('arenaLantern', () => new THREE.SphereGeometry(0.6, 12, 8)), glow('#ffd6a1'), 1.8, 4.9, 0, 0.7, 1, 0.7);
        } else {
          add(group, box, mat, 1.1, 4.4, 0, 1.8, 1.8, 0.04);
          add(group, box, trim, 1.1, 4.4, 0.05, 1.3, 0.1, 0.02);
          if (!low) add(group, geo('arenaBannerSeal', () => new THREE.RingGeometry(0.28, 0.36, 6)), trim, 1.1, 4.8, 0.06);
        }
      }
    }
  }

  // A city skyline beyond the hall. By day it rings the whole arena; at night it fills the
  // open near side (the backdrop behind the squad in story scenes) with lit windows and neon signs.
  buildSkyline(th, glow) {
    const s = this.scene, night = !th.outdoor, n = night ? 60 : 110;
    // One texture stretches over each whole building, so the window grid is drawn fine.
    const wtex = canvasTex('win' + th.fog + night, 128, 512, (g, w, hh) => {
      g.fillStyle = shadeHex(th.fog, night ? -0.1 : -0.34); g.fillRect(0, 0, w, hh);
      for (let y = 6; y < hh - 4; y += 10) for (let x = 5; x < w - 4; x += 10) {
        const r = Math.random();
        g.fillStyle = night ? (r < 0.28 ? '#ffd98a' : r < 0.36 ? th.mote : shadeHex(th.fog, -0.22)) : (r < 0.85 ? shadeHex(th.fog, 0.06) : shadeHex(th.fog, -0.45));
        g.fillRect(x, y, 5, 6);
      }
    });
    // Unfogged at night, or the lit windows would sink into the dark fog.
    const city = new THREE.InstancedMesh(geo('bld', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), new THREE.MeshBasicMaterial({ map: wtex, color: night ? '#ffffff' : '#d4dcf0', fog: !night }), n);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const a = night ? (Math.random() - 0.5) * 2.4 : Math.random() * Math.PI * 2, d = 40 + Math.random() * 45;
      ps.set(Math.sin(a) * d, -14 + Math.random() * 6, Math.cos(a) * d);
      sc.set(4 + Math.random() * 6, 14 + Math.random() * 30, 4 + Math.random() * 6);
      q.setFromAxisAngle(up, Math.random() * 3);
      city.setMatrixAt(i, mtx.compose(ps, q, sc));
    }
    s.add(city);
    if (!night) return;
    for (let i = 0; i < 9; i++) {
      const a = (Math.random() - 0.5) * 2.2, d = 39 + Math.random() * 18;
      const sign = new THREE.Mesh(geo('sign', () => new THREE.PlaneGeometry(1, 1)), glow(i % 3 ? th.accent : th.mote));
      sign.scale.set(2 + Math.random() * 4, 0.6 + Math.random() * 0.8, 1);
      sign.position.set(Math.sin(a) * d, 2 + Math.random() * 12, Math.cos(a) * d);
      sign.lookAt(0, sign.position.y, 0);
      s.add(sign);
    }
  }

  // Blob shadow under a unit.
  shadowFor(r) {
    const m = new THREE.Mesh(geo('shadow', () => new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2)),
      new THREE.MeshBasicMaterial({ color: '#000000', map: glowTex(), transparent: true, opacity: this.renderer.shadowMap.enabled ? 0.14 : 0.32, depthWrite: false }));
    m.scale.setScalar(r * 1.5);
    m.position.y = 0.012;
    this.scene.add(m);
    return m;
  }

  // ---------- units ----------
  baseStats(id) {
    const s = charStats(id), mid = s.memory;
    return { def: CHARACTERS[id], id, lvl: s.lvl, atk: s.atk, def_: s.def, hp: s.hp, crit: s.crit, critDmg: s.critDmg, spd: s.spd,
      power: { basic: skillPower(id, 'basic'), skill: skillPower(id, 'skill'), ult: skillPower(id, 'ult') },
      mem: mid && ACTION_MEM[mid] ? { id: mid, type: ACTION_MEM[mid].type, v: memValue(mid, id) } : null };
  }

  makeHero(id) {
    const b = this.baseStats(id), share = ACT.supportShare;
    let hp = b.hp, atk = b.atk, df = b.def_;
    this.team.slice(1).forEach(sid => { const s = charStats(sid); hp += s.hp * share; atk += s.atk * share; df += s.def * share; });
    const P = this.perks;
    hp *= 1 + (P.hp || 0); atk *= 1 + (P.atk || 0);
    const u = Object.assign(b, { kind: 'hero', side: 'ally', kit: ACTION_KITS[id], pos: new THREE.Vector3(0, 0, 4), facing: Math.PI, r: 0.4,
      maxHp: Math.round(hp), atk: Math.round(atk), def_: Math.round(df), crit: b.crit + (P.crit || 0), critDmg: b.critDmg + (P.critDmg || 0),
      energy: 0, skillCd: 1.5, dodge: ACT.dodgeCharges + (P.dodge || 0), dodgeT: 0, iframes: 0, dodgeTime: 0, perfectWin: 0, perfectUsed: false,
      step: 0, stepIdle: 9, atk_: null, busy: 0, shield: 0, shieldT: 0, statuses: [], alive: true, dmg: 0 });
    u.hp = this.run && this.run.hp != null ? Math.min(u.maxHp, Math.max(1, Math.round(this.run.hp * u.maxHp))) : u.maxHp;
    u.dodgeMax = u.dodge;
    u.vel = new THREE.Vector3();
    this.attachModel(u, new Chibi(id), 0.62, CHIBI_SCALE);
    if (!this.headless && u.model.tip) this.trail = new SwingTrail(this.scene, u.def.color);
    return u;
  }

  makeSupport(id) {
    const b = this.baseStats(id), k = ACTION_KITS[id];
    return Object.assign(b, { kind: 'support', side: 'ally', kit: k, pos: new THREE.Vector3(), facing: Math.PI, r: 0.4, cd: 3 + Math.random() * 2, model: this.headless ? NOOP : null,
      cdMax: k.support.cd * (1 - (this.perks.supCdr || 0)) * (this.mods.has('hype') ? 0.5 : 1), on: 0, dmg: 0, alive: true, statuses: [] });
  }

  // ms = model scale: members and small foes are drawn a little larger than their hit circles.
  attachModel(u, model, shadow, ms = 1) {
    u.model = this.headless ? NOOP : model;
    u.ms = ms;
    if (this.headless) return;
    model.root.scale.setScalar(ms);
    model.root.traverse(m => {
      if (!m.isMesh || !m.material) return;
      if (this.renderer.shadowMap.enabled && m.material.isMeshToonMaterial) m.castShadow = true;
      if (m.material.userData && m.material.userData.rim) m.material.userData.rim.copy(this.rimTint);
    });
    this.scene.add(model.root);
    u.shadow = this.shadowFor(shadow);
    this.syncModel(u);
  }

  syncModel(u) {
    if (this.headless || !u.model || !u.model.root) return;
    u.model.root.position.set(u.pos.x, u.pos.y || 0, u.pos.z);
    u.model.root.rotation.y = u.facing;
    if (u.shadow) u.shadow.position.set(u.pos.x, 0.012, u.pos.z);
  }

  applyStartBonuses() {
    const h = this.player;
    const all = [h, ...this.supports];
    all.forEach(u => {
      if (!u.mem) return;
      if (u.mem.type === 'startShield') this.shieldHero(baseHp(u) * u.mem.v / 100, 12, true);
      if (u.mem.type === 'startEnergy') h.energy += u.mem.v;
    });
    if (this.perks.startEnergy) h.energy += this.perks.startEnergy;
    h.energy = Math.min(100, h.energy);
  }

  // elite: a tougher, bigger version with a gold ring (one per wave in later stages).
  makeFoe(key, x, z, elite = false) {
    const e = ENEMIES[key], ai = FOE_AI[key] || FOE_AI.grunt, lv = this.stage.level - 1, boss = !!e.boss;
    const raid = this.stage.raid && boss ? RAID_HP_MULT_A : 1, el = elite && !boss;
    const hp = Math.round(e.hp * ACT.foeHp * (1 + ACT.foeHpPerLv * lv) * (boss ? ACT.bossHp : ai.hp) * raid * (this.opts.hpMult || 1) * (el ? ACT.eliteHp : 1));
    const atk = e.atk * ACT.foeAtk * (1 + ACT.foeAtkPerLv * lv) * (boss ? ACT.bossAtk : 1) * (this.opts.atkMult || 1) * (el ? ACT.eliteAtk : 1);
    const poise = (boss ? BOSS_POISE_A : FOE_POISE[key] || 30) * (el ? 1.6 : 1);
    const u = { kind: 'foe', side: 'enemy', key, id: key, def: e, ai, boss, elite: el, name: (el ? 'Elite ' : '') + e.name, lvl: this.stage.level,
      pos: new THREE.Vector3(x, 0, z), facing: Math.atan2(this.player.pos.x - x, this.player.pos.z - z), r: ai.size || 0.5,
      maxHp: hp, hp, atk, def_: Math.round(e.def * (1 + 0.05 * lv)), crit: e.crit, critDmg: e.critDmg,
      speed: ai.speed * (this.mods.has('swift') ? 1.25 : 1), poise, maxPoise: poise, broken: false, brokenT: 0, flinch: 0,
      statuses: [], alive: true, spawnT: 0.7, mode: 'move', modeT: 0, cds: (ai.moves || []).map(() => 0.6 + Math.random() * 1.6),
      phase: 1, pi: 0, nextT: 1.4, dotT: 0, strafe: Math.random() < 0.5 ? -1 : 1, kb: new THREE.Vector3() };
    const model = this.headless ? null : key === 'echo' ? new Chibi(this.team[Math.floor(Math.random() * this.team.length)] || 'noah', { hologram: '#5fe8ff' }) : new FoeModel(key);
    const ms = boss ? 0.92 : el ? 1.22 : 1.0;
    if (el) { u.r *= 1.25; u.speed *= 0.9; }
    this.attachModel(u, model, u.r * 1.1, ms);
    if (!this.headless) {
      model.root.scale.setScalar(0.01);
      if (el) {
        const ring = new THREE.Mesh(geo('eliteRing', () => new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2)), this.fx.basic('#ffc93a', { bright: 2.2, opacity: 0.9 }));
        ring.position.y = 0.03;
        ring.scale.setScalar(u.r * 1.7 / ms);
        model.root.add(ring);
        u.eliteRing = ring;
      }
      u.bar = document.createElement('div');
      u.bar.className = 'abl-bar' + (boss ? ' boss' : '') + (el ? ' elite' : '');
      u.bar.innerHTML = `${el ? '<b class="abl-elite">ELITE</b>' : ''}<div class="abl-weak">${(e.weak || []).map(w => elIc(w)).join('')}</div><div class="abl-hp"><i class="t"></i><i class="f"></i></div><div class="abl-poise"><i></i></div><div class="abl-st"></div>`;
      if (!boss) this.q('.ab-labels').appendChild(u.bar);
      this.fx.pillar(x, z, boss ? '#ff3355' : '#b98bff', 0.8, boss ? 2 : 0.9);
      this.fx.flatRing(x, z, boss ? '#ff3355' : '#b98bff', 0.2, boss ? 3 : 1.4, 0.6);
    }
    this.foes.push(u);
    return u;
  }

  // ---------- waves ----------
  spawnWave() {
    const list = this.stage.waves[this.waveIdx], h = this.player;
    const keys = [];
    list.forEach(k => { const n = (FOE_AI[k] || {}).boss ? 1 : (FOE_AI[k] || {}).pack || 1; for (let i = 0; i < n; i++) keys.push(k); });
    // Spread enemies on an arc in front of the leader; bosses take the far centre.
    const away = Math.atan2(-h.pos.x, -h.pos.z || -0.01);
    let ring = 0;
    // From chapter 2 on, one enemy per wave (two in Elite rounds) comes as an Elite.
    const normal = keys.map((k, i) => i).filter(i => !ENEMIES[keys[i]].boss);
    const eliteN = this.stage.raid || this.stage.tutorial ? 0 : this.opts.elite ? 2 : this.stage.level >= 5 && Math.random() < 0.65 ? 1 : 0;
    const elites = new Set(normal.sort(() => Math.random() - 0.5).slice(0, eliteN));
    keys.forEach((k, i) => {
      if (ENEMIES[k].boss) {
        const d = Math.min(7, Math.hypot(h.pos.x, h.pos.z) + 5);
        this.makeFoe(k, Math.max(-6, Math.min(6, h.pos.x + Math.sin(away) * d)), Math.max(-6, Math.min(6, h.pos.z + Math.cos(away) * d)));
        return;
      }
      const a = away + (ring - (keys.length - 1) / 2) * 0.5 + (Math.random() - 0.5) * 0.2, d = 5 + (i % 2) * 1.4 + Math.random();
      ring++;
      let x = h.pos.x + Math.sin(a) * d, z = h.pos.z + Math.cos(a) * d;
      const m = Math.hypot(x, z);
      if (m > ACT.arena - 1) { x *= (ACT.arena - 1) / m; z *= (ACT.arena - 1) / m; }
      this.makeFoe(k, x, z, elites.has(i));
    });
    const n = this.stage.waves.length;
    if (!this.headless) {
      this.q('.ab-wave').textContent = n > 1 ? `WAVE ${this.waveIdx + 1}/${n}` : '';
      const boss = this.foes.find(f => f.boss && f.alive);
      this.bossUnit = boss || null;
      this.q('.ab-boss').classList.toggle('hidden', !boss);
      if (boss) {
        this.q('.abb-name').textContent = boss.name;
        this.q('.abb-weak').innerHTML = `<small>WEAK</small>${(boss.def.weak || []).map(w => elIc(w)).join('')}`;
        this.banner(`BOSS · ${boss.name}`, 'boss');
        sfx('phase');
      } else if (this.waveIdx > 0) this.banner(`WAVE ${this.waveIdx + 1}`, 'wave');
    } else this.bossUnit = this.foes.find(f => f.boss && f.alive) || null;
    this.waveClear = false;
  }

  livingFoes() { return this.foes.filter(f => f.alive && f.spawnT <= 0.35); }

  // ---------- input ----------
  bindInput() {
    const down = e => {
      if (this.over) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { this.paused ? this.resume() : this.pause(); return; }
      if (this.paused) return;
      if (this.phase === 'scene') { if ([' ', 'enter', 'e', 'j'].includes(k)) { e.preventDefault(); if (!e.repeat) this.advance(); } return; }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { this.keys[k] = true; e.preventDefault(); }
      if (e.repeat) return;
      if (k === ' ' || k === 'shift') { this.want = 'dodge'; e.preventDefault(); }
      else if (k === 'e' || k === 'j') this.want = 'skill';
      else if (k === 'q' || k === 'k') this.want = 'ult';
      else if (k === '1') this.want = 'sup0';
      else if (k === '2') this.want = 'sup1';
      else if (k === 'f') this.toggleAuto();
    };
    const up = e => { this.keys[e.key.toLowerCase()] = false; };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    const blur = () => { this.keys = {}; this.stick.on = false; };
    window.addEventListener('blur', blur);
    this.unbind = () => { document.removeEventListener('keydown', down); document.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
    // Virtual stick: press anywhere on the left part of the screen and drag.
    const cv = this.q('.ab-labels'), stickEl = this.q('.ab-stick'), knob = stickEl.querySelector('i');
    let pid = null, ox = 0, oy = 0;
    this.root.addEventListener('pointerdown', e => {
      if (this.over || this.paused || pid !== null || this.phase === 'scene') return;
      if (e.target.closest('button, .ab-coach, .pause-menu, .end, .ab-cut, .ab-scene')) return;
      const r = this.root.getBoundingClientRect();
      if (e.clientX - r.left > r.width * 0.62) return;
      pid = e.pointerId; ox = e.clientX; oy = e.clientY;
      stickEl.style.left = (ox - r.left) + 'px'; stickEl.style.top = (oy - r.top) + 'px';
      stickEl.classList.remove('hidden');
      knob.style.transform = 'translate(-50%,-50%)';
      try { this.root.setPointerCapture(pid); } catch (err) { /* ignore */ }
    });
    this.root.addEventListener('pointermove', e => {
      if (e.pointerId !== pid) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const d = Math.hypot(dx, dy), max = 56;
      if (d > max) { dx *= max / d; dy *= max / d; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.stick = d > 8 ? { x: dx / max, z: dy / max, on: true } : { x: 0, z: 0, on: false };
    });
    const end = e => { if (e.pointerId !== pid) return; pid = null; this.stick = { x: 0, z: 0, on: false }; stickEl.classList.add('hidden'); };
    this.root.addEventListener('pointerup', end);
    this.root.addEventListener('pointercancel', end);
    this.root.querySelectorAll('.ab-b').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!this.paused) this.want = b.dataset.k; }));
    // Story scenes: tap anywhere to continue; Auto plays the lines by itself, Skip jumps to the fight.
    const sc = this.q('.ab-scene');
    sc.addEventListener('pointerdown', e => { e.stopPropagation(); if (!e.target.closest('button')) this.advance(); });
    this.q('.abs-skip').onclick = e => { e.stopPropagation(); this.sceneQueue = []; this.nextLine(); };
    const au = this.q('.abs-auto');
    au.onclick = e => { e.stopPropagation(); this.sceneAuto = !this.sceneAuto; au.classList.toggle('on', this.sceneAuto); };
    this.q('.auto').onclick = () => this.toggleAuto();
    this.q('.pause').onclick = () => this.pause();
    void cv;
  }

  toggleAuto() {
    this.auto = BATTLE_PREFS.auto = !this.auto; saveBattlePrefs();
    this.q('.auto').classList.toggle('on', this.auto);
  }

  moveInput() {
    const k = this.keys;
    let x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), z = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
    if (this.stick.on) { x = this.stick.x; z = this.stick.z; }
    const d = Math.hypot(x, z);
    if (d < 0.1) return null;
    return { x: x / Math.max(1, d), z: z / Math.max(1, d) };
  }

  // ---------- loop ----------
  frame(now) {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(t => this.frame(t));
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) {
      let dt = raw;
      if (this.hitStop > 0) { this.hitStop -= raw; dt *= 0.05; }
      if (this.slowT > 0) { this.slowT -= raw; dt *= this.timeScale; if (this.slowT <= 0) this.timeScale = 1; }
      if (this.cutT > 0) { this.cutT -= raw; dt = 0; }
      this.step(dt);
      this.visuals(dt, raw);
    }
    this.render(raw);
  }

  // Game logic for one time step (also used by headless simulations).
  step(dt) {
    if (dt <= 0) return;
    this.time += dt;
    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      if (ev.at <= this.time) { this.events.splice(i, 1); i--; if (!this.disposed) ev.fn(); }
    }
    if (this.phase === 'scene') {
      this.updateScene(dt);
      this.foes.slice().forEach(e => { if (e.dying) this.updateFoe(e, dt); });
      return;
    }
    if (!this.over) {
      this.updateHero(dt);
      this.updateSupports(dt);
      this.foes.slice().forEach(e => this.updateFoe(e, dt));
      this.updateProjectiles(dt);
      this.updateZones(dt);
      this.updatePickups(dt);
      this.comboIdle += dt;
      if (this.comboIdle > ACT.comboReset && this.combo) { this.combo = 0; }
      if (this.raidTime) {
        this.raidTime = Math.max(0, RAID_TIME - this.fightTime());
        if (this.raidTime <= 0) this.finish(true);
      }
      this.checkWave();
    } else {
      this.foes.slice().forEach(e => { if (e.dying) this.updateFoe(e, dt); });
    }
  }

  after(sec, fn) { this.events.push({ at: this.time + sec, fn }); }

  visuals(dt, raw) {
    const all = [this.player, ...this.supports.filter(s => s.on > 0 || (this.phase === 'scene' && s.model && s.model.root)), ...this.npcs, ...this.foes];
    all.forEach(u => { if (u.model && u.model.update) { u.model.update(dt); this.syncModel(u); } });
    this.fx.update(dt);
    this.sparks.update(dt); this.stars.update(dt); this.motes.update(raw); this.streaks.update(dt); this.pixels.update(dt);
    if (TEX.stripes) TEX.stripes.offset.x = (TEX.stripes.offset.x + raw * 0.8) % 1;
    const mp = this.motes.pos;
    for (let i = 0; i < this.motes.n; i++) if (mp[i * 3 + 1] > 7.5) mp[i * 3 + 1] = 0.05;
    this.props.forEach(p => { p.obj.position.y = p.y + Math.sin(this.time * 0.8 + p.ph) * (p.amp || 0.15); if (p.spin) p.obj.rotation.y += p.spin * raw; });
    if (this.arenaSignals && SAVE.settings.flashes !== false && SAVE.settings.gfx !== 'low') {
      for (let i = 0; i < this.arenaSignals.length; i++) {
        const p = this.arenaSignals[i];
        p.mat.color.copy(p.base).multiplyScalar(0.86 + Math.sin(this.time * 1.8 + p.phase) * 0.14);
      }
    }
    if (this.clouds) this.clouds.rotation.y += raw * 0.012;
    if (this.bloom && this.bloom.strength > 0.55) this.bloom.strength = Math.max(0.55, this.bloom.strength - raw * 0.45);
    // Ring under the leader; the reticle sits under whatever she is attacking.
    const h = this.player;
    if (this.heroRing) {
      this.heroRing.visible = this.phase === 'fight' && h.alive && !this.over && !this.closeUp;
      this.heroRing.position.x = h.pos.x; this.heroRing.position.z = h.pos.z;
      const t = this.heroRing.visible ? (h.atk_ && h.atk_.tgt && h.atk_.tgt.alive ? h.atk_.tgt : this.nearestFoe(h.pos, 9)) : null;
      this.lockRing.visible = !!t;
      if (t) { this.lockRing.position.x = t.pos.x; this.lockRing.position.z = t.pos.z; this.lockRing.scale.setScalar(t.r * 1.3 + 0.35); this.lockRing.rotation.y += raw * 1.6; }
    }
    if (this.closeUp) { this.closeUp.t += raw; h.model.update(raw); this.closeUp.back.rotation.z += raw * 0.6; if (this.closeUp.t >= this.closeUp.dur) this.endCloseUp(); }
    this.updateTallies();
    // Weapon swing trail while attacking or casting.
    if (this.trail) {
      const m = h.model, swinging = (h.atk_ && !h.atk_.s.shot) || h.busy > 0;
      if (swinging && m.tip) {
        m.root.updateMatrixWorld(true);
        this._tv1 = this._tv1 || new THREE.Vector3(); this._tv2 = this._tv2 || new THREE.Vector3();
        // The arc reaches past the weapon itself, like a stylised swing.
        const base = m.tipBase.getWorldPosition(this._tv2), tip = m.tip.getWorldPosition(this._tv1).sub(base).multiplyScalar(2.2).add(base);
        this.trail.push(tip, base, this.time);
      }
      this.trail.update(this.time);
    }
    this.updateCamera(raw);
    this.updateLabels();
    this.updateHud();
  }

  render() {
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  updateCamera(raw) {
    const h = this.player, at = this.camAt, cam = this.cam;
    if (this.closeUp) {
      // Ultimate close-up: just in front of her face, slightly off to one side.
      // Level with her face and a little to one side, easing back so her upper body shows.
      const u = this.closeUp.u, f = u.facing, head = (u.model.faceY || 1) * (u.ms || 1), k = Math.min(1, this.closeUp.t / this.closeUp.dur);
      const d = 2.3 + 0.6 * k, side = 0.55;
      this.camera.position.set(u.pos.x + Math.sin(f) * d + Math.cos(f) * side, head - 0.05, u.pos.z + Math.cos(f) * d - Math.sin(f) * side);
      this.camera.fov = 34; this.camera.updateProjectionMatrix();
      this.camera.lookAt(u.pos.x + Math.cos(f) * side * 0.4, head - 0.12, u.pos.z - Math.sin(f) * side * 0.4);
      this.closeUp.back.lookAt(this.camera.position);
      return;
    }
    let tx, tz;
    if (this.camFocus) { tx = this.camFocus.x; tz = this.camFocus.z; }
    else {
      // Lead the camera a little toward the nearest enemies so you see what is coming.
      const t = this.over ? null : this.nearestFoe(h.pos, 12), look = this.camLook;
      let lx = 0, lz = 0;
      if (t) { const dx = t.pos.x - h.pos.x, dz = t.pos.z - h.pos.z, d = Math.hypot(dx, dz) || 1, m = Math.min(1.8, d * 0.28); lx = dx / d * m; lz = dz / d * m; }
      const kl = 1 - Math.exp(-raw * 2.2);
      look.x += (lx - look.x) * kl; look.z += (lz - look.z) * kl;
      tx = Math.max(-7, Math.min(7, h.pos.x + look.x)); tz = Math.max(-6.5, Math.min(7.5, h.pos.z + look.z));
    }
    const k = 1 - Math.exp(-raw * (this.camFocus ? 3 : 5));
    at.x += (tx - at.x) * k; at.z += (tz - at.z) * k;
    // Swing smoothly between the battle view and the scene view.
    const kc = 1 - Math.exp(-raw * 2.4);
    cam.yaw += (cam.to.yaw - cam.yaw) * kc; cam.dist += (cam.to.dist - cam.dist) * kc; cam.h += (cam.to.h - cam.h) * kc;
    this.camZoom += (this.camZoomTo - this.camZoom) * (1 - Math.exp(-raw * 6));
    const c = this.camera, z = this.camZoom, sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    c.position.set(at.x + sy * cam.dist * z, cam.h * z, at.z + cy * cam.dist * z);
    const s = this.shake * this.shake * (SAVE.settings.shake === false ? 0 : 0.5);
    if (s > 0.001) c.position.add(new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
    this.shake = Math.max(0, this.shake - raw * 2.2);
    // A quick zoom "punch" on big moments (breaks, finishers, Ultimates).
    if (this.punch > 0.001 || c.fov !== this.baseFov) {
      this.punch = Math.max(0, this.punch - raw * 3);
      c.fov = this.baseFov * (1 - this.punch * 0.07);
      c.updateProjectionMatrix();
    }
    const lookY = this.camFocus ? 0.9 : 0.75 + (1 - z) * 0.35;
    c.lookAt(at.x - sy * 0.6, lookY, at.z - cy * 0.6);
  }

  // ---------- hero ----------
  updateHero(dt) {
    const h = this.player;
    if (!h.alive) return;
    h.skillCd = Math.max(0, h.skillCd - dt);
    h.busy = Math.max(0, h.busy - dt);
    h.iframes = Math.max(0, h.iframes - dt);
    h.perfectWin = Math.max(0, h.perfectWin - dt);
    if (h.dodge < h.dodgeMax) { h.dodgeT += dt; if (h.dodgeT >= ACT.dodgeRecharge) { h.dodge++; h.dodgeT = 0; } }
    if (h.shieldT > 0) { h.shieldT -= dt; if (h.shieldT <= 0) h.shield = 0; }
    this.addEnergy(ACT.energyPerSec * dt * (this.mods.has('overcharge') ? 1.4 : 1), true);
    this.tickStatuses(h, dt);
    if (h.mem && h.mem.type === 'regen') { h.regenT = (h.regenT || 0) + dt; if (h.regenT >= 6) { h.regenT = 0; this.healHero(h.maxHp * h.mem.v / 100, h, true); } }
    const mv = this.auto ? this.autoMove() : this.moveInput();
    if (this.auto && !this.want) this.want = this.autoAct();
    if (this.want) { const w = this.want; this.want = null; this.doAction(w, mv); }
    if (h.dodgeTime > 0) {
      h.dodgeTime -= dt;
      h.pos.addScaledVector(h.dodgeVel, dt);
      if (Math.random() < 0.6) this.sparks.emit(h.pos.x, 0.4, h.pos.z, { n: 2, speed: 0.5, color: h.def.color, life: 0.35, size: 0.3, grav: 0 });
    } else {
      let spd = ACT.speed * (1 + (this.perks.speed || 0)) * (1 - this.sumStatus(h, 'slow'));
      if (h.busy > 0) spd *= 0.25;
      else if (h.atk_) spd *= h.kit.style === 'melee' ? 0.4 : 0.7;
      // A quick ease in and out keeps movement snappy without feeling robotic.
      const kv = 1 - Math.exp(-dt * 18);
      h.vel.x += ((mv ? mv.x * spd : 0) - h.vel.x) * kv; h.vel.z += ((mv ? mv.z * spd : 0) - h.vel.z) * kv;
      h.pos.x += h.vel.x * dt; h.pos.z += h.vel.z * dt;
      if (mv) {
        if (!h.atk_ && !h.busy) h.facing = turnTo(h.facing, Math.atan2(mv.x, mv.z), dt * 16);
        h.model.setState('run');
        // Little puffs of dust at her feet while running.
        h.dustT = (h.dustT || 0) - dt;
        if (h.dustT <= 0) { h.dustT = 0.16; this.sparks.emit(h.pos.x - Math.sin(h.facing) * 0.3, 0.08, h.pos.z - Math.cos(h.facing) * 0.3, { n: 2, speed: 0.6, up: 0.6, color: '#d8d4e8', bright: 0.45, life: 0.45, size: 0.5, grav: -0.4, drag: 3, grow: 1.2 }); }
        if (!this.coached.moved) { this.movedT = (this.movedT || 0) + dt; if (this.movedT > 1) { this.coached.moved = true; this.coachDone('move'); } }
      } else {
        h.model.setState('idle');
        // Standing still: turn to face the closest enemy.
        const t = !h.atk_ && !h.busy && this.nearestFoe(h.pos, 9);
        if (t) h.facing = turnTo(h.facing, Math.atan2(t.pos.x - h.pos.x, t.pos.z - h.pos.z), dt * 6);
      }
    }
    this.keepInArena(h);
    this.foes.forEach(e => { if (e.alive && h.dodgeTime <= 0) this.separate(h, e, 0.3); });
    this.updateAttack(dt);
  }

  doAction(w, mv) {
    const h = this.player;
    if (w === 'dodge') return this.tryDodge(mv);
    if (w === 'skill') return this.useSkill();
    if (w === 'ult') return this.useUlt();
    if (w.startsWith('sup')) return this.useSupport(Number(w.slice(3)));
  }

  tryDodge(mv) {
    const h = this.player;
    if (h.dodge <= 0 || h.dodgeTime > 0) return;
    h.dodge--;
    const a = mv ? Math.atan2(mv.x, mv.z) : h.facing + Math.PI;
    h.dodgeVel = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(ACT.dodgeDist / ACT.dodgeTime);
    h.dodgeTime = ACT.dodgeTime;
    h.iframes = ACT.iframes;
    h.perfectWin = ACT.perfect;
    h.perfectUsed = false;
    h.facing = a;
    h.atk_ = null;
    h.model.play('dash');
    this.snd('whoosh', 0.05);
    if (!this.headless) [0, 0.07, 0.14].forEach(t => this.after(t, () => this.ghost(h)));
    this.coachDone('dodge');
    if (this.perks.dodgeNova) this.after(0.2, () => { this.fx.nova(h.pos.x, h.pos.z, 2.4, h.def.color); this.hitCircle(h, h.pos.x, h.pos.z, 2.4, 0.8 * this.perks.dodgeNova, { kind: 'follow' }); });
  }

  // A hit landed during the opening of a dodge: slow motion and rewards.
  perfectDodge() {
    const h = this.player;
    if (h.perfectUsed) return;
    h.perfectUsed = true;
    this.stat.perfect++;
    this.slow(0.3, 0.9);
    this.addEnergy(ACT.energyPerfect);
    h.skillCd = Math.max(0, h.skillCd - 2);
    this.combatCue('perfect', 'PERFECT DODGE', 'ENERGY UP · SKILL COOLDOWN −2s', '#9fe8ff');
    this.fx.flatRing(h.pos.x, h.pos.z, '#9fe8ff', 0.4, 4, 0.6);
    this.stars.emit(h.pos.x, 0.8, h.pos.z, { n: SAVE.settings.gfx === 'low' ? 4 : 10, speed: 3, color: '#bff4ff', life: 0.9, size: 0.5, grav: 0, up: 0.6 });
    this.snd('crit');
    if (this.perks.perfectBlast) this.after(0.05, () => { this.fx.nova(h.pos.x, h.pos.z, 3.2, '#9fe8ff'); this.hitCircle(h, h.pos.x, h.pos.z, 3.2, 1.5 * this.perks.perfectBlast, { kind: 'follow' }); });
  }

  slow(scale, sec) { this.timeScale = scale; this.slowT = sec; }

  // A see-through copy of a unit that fades out (dodge afterimages).
  ghost(u) {
    if (!u.model || !u.model.root) return;
    u.model.root.updateMatrixWorld(true);
    const g = u.model.root.clone(true);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(u.def.color).multiplyScalar(1.3), transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending });
    g.traverse(m => { if (m.isMesh) { if (m.material.isShaderMaterial) m.visible = false; else m.material = mat; m.castShadow = false; } });
    this.fx.add(g, 0.32, k => { mat.opacity = 0.38 * (1 - k); }, () => mat.dispose());
  }

  // Auto-attacks charge Energy once per swing or shot, by how strong the hit is.
  basicEnergy(mult) { this.addEnergy(ACT.energyHit * mult * (1 + (this.perks.energy || 0))); }

  useSkill() {
    const h = this.player;
    if (h.skillCd > 0 || h.busy > 0 || h.dodgeTime > 0) return;
    if (this.hasStatus(h, 'silence')) { this.floatText(h, 'SILENCED', 'muted'); return; }
    h.skillCd = h.skillCdMax = h.kit.skill.cd * (1 - (this.perks.cdr || 0)) * (this.mods.has('spcap') ? 1.4 : 1);
    h.busy = 0.35;
    h.atk_ = null;
    const t = this.nearestFoe(h.pos, 12);
    if (t) this.faceTo(h, t.pos);
    this.fx.signature(h);
    this.skillName(h, h.kit.skill.name);
    this.startTally(h, 'skill');
    h.kit.skill.run(this, h);
    this.afterSkill(h, 'skill');
    this.coachDone('skill');
    this.snd('buff');
  }

  afterSkill(u, kind) {
    const h = this.player, m = u.mem;
    if (m && m.type === 'skillHeal' && kind === 'skill') this.healHero(baseHp(u) * m.v / 100, u, true);
    if (m && m.type === 'skillAtk' && kind === 'skill') this.buff(h, 'atk', m.v / 100, 6, 'ATK↑');
    if (m && m.type === 'actionHeal') this.healHero(baseHp(u) * m.v / 100, u, true);
    if (this.perks.skillShield && kind === 'skill') this.shieldHero(h.maxHp * 0.06 * this.perks.skillShield, 6);
  }

  useUlt() {
    const h = this.player;
    if (h.energy < 100 || h.busy > 0 || this.cutT > 0) return;
    if (this.hasStatus(h, 'silence')) { this.floatText(h, 'SILENCED', 'muted'); return; }
    h.energy = 0;
    h.busy = 0.6;
    h.iframes = Math.max(h.iframes, 1.2);
    h.atk_ = null;
    this.stat.ults++;
    SAVE.stats.ults++; bumpDaily('ults');
    this.coachDone('ult');
    const go = () => {
      this.startTally(h, 'ult');
      h.model.play('cast');
      this.fx.signature(h, true);
      h.kit.ult.run(this, h);
      if (h.mem && h.mem.type === 'ultAtk') this.buff(h, 'atk', h.mem.v / 100, 10, 'ATK↑');
      if (this.perks.ultHeal) this.healHero(h.maxHp * 0.1 * this.perks.ultHeal, h);
    };
    if (this.headless) return go();
    this.cutIn(h, h.kit.ult.name);
    this.after(0.01, go);
  }

  useSupport(i) {
    const s = this.supports[i], h = this.player;
    if (!s || s.cd > 0 || s.on > 0 || !h.alive) return;
    if (this.hasStatus(h, 'silence')) { this.floatText(h, 'SILENCED', 'muted'); return; }
    s.cd = s.cdMax;
    s.on = 1.25;
    SAVE.stats.collabs++;
    // Jump in beside the leader.
    const side = i === 0 ? 1 : -1, a = h.facing + side * 1.9;
    s.pos.set(h.pos.x + Math.sin(a) * 1.6, 0, h.pos.z + Math.cos(a) * 1.6);
    this.keepInArena(s);
    s.facing = h.facing;
    const t = this.nearestFoe(s.pos, 14);
    if (t) this.faceTo(s, t.pos);
    if (!this.headless) {
      if (!s.model || s.model === NOOP) this.attachModel(s, new Chibi(s.id), 0.62, CHIBI_SCALE);
      s.model.root.visible = true; s.shadow.visible = true;
      s.model.root.scale.setScalar(s.ms);
      s.model.play('leap');
      this.fx.pillar(s.pos.x, s.pos.z, s.def.color, 0.5, 0.7);
      this.fx.circle(s.pos.x, s.pos.z, 1.3, s.def.color, 0.8);
      this.snd('sparkle');
      this.callout(s);
    }
    this.coachDone('support');
    this.after(0.32, () => {
      if (this.over) return;
      if (!this.headless) this.fx.flatRing(s.pos.x, s.pos.z, s.def.color, 0.3, 1.8, 0.4);
      this.skillName(s, s.kit.support.name);
      this.startTally(s, 'support');
      s.kit.support.run(this, s);
      this.addEnergy(4);
      this.afterSkill(s, 'support');
      if (this.perks.supEcho) this.after(0.6, () => { if (!this.over) s.kit.support.run(this, s); });
    });
  }

  updateSupports(dt) {
    this.supports.forEach(s => {
      s.cd = Math.max(0, s.cd - dt);
      if (s.on > 0) {
        s.on -= dt;
        if (s.on <= 0 && !this.headless && s.model.root) {
          // Leave with a sparkle and a hop.
          this.stars.emit(s.pos.x, 0.8, s.pos.z, { n: 10, speed: 2.5, color: s.def.color, life: 0.6, size: 0.45, grav: -1 });
          this.fx.glow(s.pos.x, 0.7, s.pos.z, s.def.color, 1.8, 0.3);
          s.model.root.visible = false; s.shadow.visible = false;
        }
      }
    });
  }

  // ---------- auto-attacks ----------
  updateAttack(dt) {
    const h = this.player, kit = h.kit;
    h.stepIdle += dt;
    if (h.stepIdle > 1.1) h.step = 0;
    if (h.atk_) {
      const a = h.atk_;
      a.t += dt;
      if (a.tgt && a.tgt.alive) h.facing = turnTo(h.facing, Math.atan2(a.tgt.pos.x - h.pos.x, a.tgt.pos.z - h.pos.z), dt * 20);
      if (a.lunge > 0 && a.t < a.hitAt) { const m = Math.min(a.lunge, dt * 7); a.lunge -= m; h.pos.x += Math.sin(h.facing) * m; h.pos.z += Math.cos(h.facing) * m; }
      if (!a.fired && a.t >= a.hitAt) { a.fired = true; this.basicHit(h, a.s, a.tgt); }
      if (a.t >= a.dur) { h.atk_ = null; h.stepIdle = 0; }
      return;
    }
    if (h.busy > 0 || h.dodgeTime > 0) return;
    const reach = kit.range + (this.perks.range || 0) * (kit.style === 'melee' ? 0.5 : 1.5);
    const t = this.nearestFoe(h.pos, reach + 0.6);
    if (!t) return;
    const s = kit.basic.combo[h.step % kit.basic.combo.length];
    h.step++;
    const rate = (h.spd / 105) * (1 + (this.perks.aspd || 0));
    const dist = Math.hypot(t.pos.x - h.pos.x, t.pos.z - h.pos.z) - t.r;
    h.atk_ = { s, t: 0, dur: s.t / rate, hitAt: s.hit / rate, fired: false, tgt: t, lunge: kit.style === 'melee' ? Math.max(0, Math.min(0.9, dist - 1.1)) : 0 };
    this.faceTo(h, t.pos);
    h.model.play(s.act, rate * (s.t < 0.35 ? 1.1 : 1));
    this.coach('attack');
  }

  basicHit(h, s, tgt) {
    const last = s === h.kit.basic.combo[h.kit.basic.combo.length - 1];
    const extra = { kind: 'basic', stagger: s.stagger || 1, def: s.def, knock: s.knock, paint: s.paint, launch: last && !s.shot ? 5.5 : 0 };
    if (s.shot) {
      if (tgt && tgt.alive) this.shoot(h, tgt, Object.assign({ mult: s.mult, style: s.shot, splash: s.splash }, extra));
    } else {
      const hits = this.foesInArc(h.pos, h.facing, (s.range || 2) + (this.perks.range || 0) * 0.5, s.arc || 2);
      const col = h.def.color;
      this.fx.slash(h, col, (s.range || 2) / 1.9, s.arc > 6, s.act === 'slam' ? 0.9 : 0);
      if (s.act === 'slam') this.fx.flatRing(h.pos.x + Math.sin(h.facing) * 0.8, h.pos.z + Math.cos(h.facing) * 0.8, col, 0.3, 2.2, 0.35);
      hits.forEach(e => this.damage(h, e, s.mult, extra));
      if (hits.length) {
        // Weight: a tiny freeze and shake on every hit, more on the combo finisher.
        const fin = s === h.kit.basic.combo[h.kit.basic.combo.length - 1];
        this.basicEnergy(s.mult);
        this.hitStop = Math.max(this.hitStop, fin ? 0.075 : 0.04);
        this.fx.shake(fin ? 0.16 : 0.07);
        if (fin) this.punch = Math.max(this.punch, 0.5);
        hits.forEach(e => {
          if (e.boss || !e.alive) return;
          const dx = e.pos.x - h.pos.x, dz = e.pos.z - h.pos.z, d = Math.hypot(dx, dz) || 1, f = fin ? 4.5 : 1.8;
          if (e.kb.lengthSq() < f * f) e.kb.set(dx / d * f, 0, dz / d * f);
        });
        this.snd(h.id === 'hinano' ? 'bonk' : fin ? 'crit' : 'hit', 0.05);
      } else this.snd('whoosh', 0.08);
    }
    // Lisa trips into a bonus hit sometimes.
    if (h.id === 'lisa' && Math.random() < 0.25 && tgt && tgt.alive) {
      this.after(0.12, () => { if (!tgt.alive) return; this.floatText(h, 'OOPS!', 'heal'); this.damage(h, tgt, 0.6, { kind: 'basic' }); this.healHero(h.maxHp * 0.03, h, true); });
    }
  }

  // ---------- projectiles ----------
  shoot(src, tgt, o) {
    const st = SHOT_STYLE[o.style] || SHOT_STYLE.sun;
    const from = new THREE.Vector3(src.pos.x + Math.sin(src.facing) * 0.4, 0.65, src.pos.z + Math.cos(src.facing) * 0.4);
    const to = new THREE.Vector3(tgt.pos.x, 0.55, tgt.pos.z);
    const dir = to.sub(from).normalize();
    const p = { side: 'ally', src, pos: from, vel: dir.multiplyScalar(st.speed), life: 1.4, r: 0.35 + (o.splash ? 0.1 : 0), o, st, tgt, hit: new Set() };
    if (!this.headless) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: st.star ? starTex() : glowTex(), color: new THREE.Color(st.color).multiplyScalar(2.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.scale.setScalar(st.size);
      m.position.copy(from);
      this.scene.add(m);
      p.mesh = m;
    }
    this.projectiles.push(p);
    if (st.snd) this.snd(st.snd, 0.06);
  }

  // A thrown object on an arc that lands after dur seconds.
  lob(src, to, dur, color, onLand) {
    const from = new THREE.Vector3(src.pos.x, 0.8, src.pos.z), target = new THREE.Vector3(to.x, 0, to.z);
    let m = null;
    if (!this.headless) {
      m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(color).multiplyScalar(2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.scale.setScalar(0.8);
      this.scene.add(m);
    }
    const t0 = this.time;
    const tick = () => {
      const k = Math.min(1, (this.time - t0) / dur);
      if (m) {
        m.position.lerpVectors(from, target, k);
        m.position.y = from.y * (1 - k) + Math.sin(k * Math.PI) * 2.4;
        this.sparks.emit(m.position.x, m.position.y, m.position.z, { n: 1, speed: 0.2, color, life: 0.3, size: 0.3, grav: 0 });
      }
      if (k >= 1) { if (m) { this.scene.remove(m); m.material.dispose(); } if (!this.over) onLand(); return; }
      this.after(0.016, tick);
    };
    tick();
  }

  updateProjectiles(dt) {
    const h = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      // Soft homing keeps auto-attacks from missing moving targets.
      if (p.side === 'ally' && p.tgt && p.tgt.alive) {
        const want = new THREE.Vector3(p.tgt.pos.x - p.pos.x, 0.55 - p.pos.y, p.tgt.pos.z - p.pos.z).normalize().multiplyScalar(p.vel.length());
        p.vel.lerp(want, Math.min(1, dt * 8));
      }
      p.pos.addScaledVector(p.vel, dt);
      let done = p.life <= 0 || Math.hypot(p.pos.x, p.pos.z) > ACT.arena + 2;
      if (p.side === 'ally') {
        for (const e of this.foes) {
          if (!e.alive || e.spawnT > 0.3 || p.hit.has(e)) continue;
          if (Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < e.r + p.r) {
            p.hit.add(e);
            if (p.o.kind === 'basic' && p.hit.size === 1) this.basicEnergy(p.o.mult);
            if (p.o.splash) {
              this.fx.flatRing(p.pos.x, p.pos.z, p.st.color, 0.2, p.o.splash, 0.3);
              this.hitCircle(p.src, p.pos.x, p.pos.z, p.o.splash, p.o.mult, p.o);
            } else this.damage(p.src, e, p.o.mult, p.o);
            done = !p.o.pierce;
            if (done) break;
          }
        }
      } else if (h.alive && Math.hypot(h.pos.x - p.pos.x, h.pos.z - p.pos.z) < h.r + p.r) {
        this.hurtHero(p.src, p.mult, p.o || {});
        done = true;
      }
      if (p.mesh) {
        p.mesh.position.copy(p.pos);
        if (Math.random() < 0.7) this.sparks.emit(p.pos.x, p.pos.y, p.pos.z, { n: 1, speed: 0.3, color: p.st ? p.st.color : '#ff4d6d', life: 0.25, size: (p.st ? p.st.size : 0.6) * 0.5, grav: 0 });
      }
      if (done) {
        if (p.mesh) { this.scene.remove(p.mesh); p.mesh.material.dispose(); }
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ---------- area helpers ----------
  foesInArc(pos, ang, range, arc) {
    return this.livingFoes().filter(e => {
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z, d = Math.hypot(dx, dz);
      if (d > range + e.r) return false;
      if (arc >= 6.2 || d < e.r + 0.3) return true;
      return Math.abs(angDiff(Math.atan2(dx, dz), ang)) <= arc / 2 + Math.atan2(e.r, d);
    });
  }
  foesNear(x, z, r) { return this.livingFoes().filter(e => Math.hypot(e.pos.x - x, e.pos.z - z) <= r + e.r); }
  hitCircle(src, x, z, r, mult, o = {}) {
    const hits = this.foesNear(x, z, r);
    hits.forEach(e => {
      this.damage(src, e, mult, o);
      if (o.pull && !e.boss) { const dx = x - e.pos.x, dz = z - e.pos.z, d = Math.hypot(dx, dz) || 1; e.kb.set(dx / d * o.pull * 6, 0, dz / d * o.pull * 6); }
    });
    return hits;
  }
  hitLine(src, x, z, ang, len, w, mult, o = {}) {
    const dx = Math.sin(ang), dz = Math.cos(ang);
    const hits = this.livingFoes().filter(e => {
      const rx = e.pos.x - x, rz = e.pos.z - z, along = rx * dx + rz * dz, perp = Math.abs(rx * dz - rz * dx);
      return along > -e.r && along < len + e.r && perp < w / 2 + e.r;
    });
    hits.forEach(e => this.damage(src, e, mult, o));
    return hits;
  }
  nearestFoe(pos, max = 99) {
    let best = null, bd = max;
    this.livingFoes().forEach(e => { const d = Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z) - e.r; if (d < bd) { bd = d; best = e; } });
    return best;
  }
  toughestFoe() { return this.livingFoes().sort((a, b) => b.hp - a.hp)[0] || null; }
  // The point that catches the most enemies (an enemy's position), within range of pos.
  cluster(pos, range) {
    let best = null, bn = 0;
    this.livingFoes().forEach(e => {
      if (Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z) > range) return;
      const n = this.foesNear(e.pos.x, e.pos.z, 2.6).length;
      if (n > bn) { bn = n; best = e; }
    });
    return best ? best.pos.clone() : null;
  }
  ahead(u, d) { return new THREE.Vector3(u.pos.x + Math.sin(u.facing) * d, 0, u.pos.z + Math.cos(u.facing) * d); }
  faceTo(u, p) { u.facing = Math.atan2(p.x - u.pos.x, p.z - u.pos.z); }
  keepInArena(u) {
    const d = Math.hypot(u.pos.x, u.pos.z), max = ACT.arena - (u.r || 0.4);
    if (d > max) { u.pos.x *= max / d; u.pos.z *= max / d; }
  }
  // Push two units apart (k = share the first one moves).
  separate(a, b, k = 0.5) {
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = a.r + b.r;
    if (d >= min || d < 1e-4) return;
    const push = (min - d);
    a.pos.x -= dx / d * push * k; a.pos.z -= dz / d * push * k;
    if (!b.boss) { b.pos.x += dx / d * push * (1 - k); b.pos.z += dz / d * push * (1 - k); }
  }

  // Noah's dash: moves the leader forward, hitting everything along the way.
  dashHero(dist, dur, onEnd, o) {
    const h = this.player, a = h.facing;
    const x0 = h.pos.x, z0 = h.pos.z;
    h.dodgeVel = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(dist / dur);
    h.dodgeTime = dur;
    h.iframes = Math.max(h.iframes, dur + 0.15);
    this.after(dur, () => {
      this.hitLine(h, x0, z0, a, dist + 0.6, o.w || 1.6, o.mult, o);
      this.fx.beam(new THREE.Vector3(x0, 0, z0), a, dist, h.def.color, 0.3);
      onEnd && onEnd();
    });
  }

  puddle(src, x, z, r, dur, color) {
    const p = { x, z, r, t: dur, tick: 0, src, color };
    this.puddles.push(p);
    const end = this.time + dur;
    const loop = () => {
      if (this.over || this.time >= end) { this.puddles.splice(this.puddles.indexOf(p), 1); return; }
      this.foesNear(x, z, r).forEach(e => { this.addStatus(e, 'paint', this.statAtk(src) * 0.3, 3, 'PAINT'); this.addStatus(e, 'slow', 0.3, 1, 'SPD↓'); });
      this.after(0.5, loop);
    };
    loop();
    if (!this.headless) {
      const m = new THREE.Mesh(geo('fxSplat', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ color, map: splatTex(), transparent: true, depthWrite: false, opacity: 0.5 }));
      m.position.set(x, 0.025, z); m.scale.set(r, 1, r);
      this.fx.add(m, dur, k => { m.material.opacity = 0.5 * (k < 0.85 ? 1 : (1 - k) / 0.15); }, () => m.material.dispose());
    }
  }

  dropSnack(x, z, heal) {
    const p = { x, z, heal, t: 12 };
    const d = Math.hypot(x, z);
    if (d > ACT.arena - 1) { p.x *= (ACT.arena - 1) / d; p.z *= (ACT.arena - 1) / d; }
    if (!this.headless) {
      const m = new THREE.Group();
      const donut = new THREE.Mesh(G.tor(0.18, 0.09, Math.PI * 2, 18), toonMat('#e8b26a'));
      const icing = new THREE.Mesh(G.tor(0.18, 0.06, Math.PI * 2, 18), toonMat('#ff8fb8'));
      icing.position.y = 0.03;
      donut.rotation.x = icing.rotation.x = Math.PI / 2;
      m.add(donut, icing);
      m.position.set(p.x, 0.4, p.z);
      this.scene.add(m);
      p.mesh = m;
      this.fx.glow(p.x, 0.4, p.z, '#ffd36b', 1.2, 0.4);
    }
    this.pickups.push(p);
  }

  updatePickups(dt) {
    const h = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.t -= dt;
      if (p.mesh) { p.mesh.rotation.y += dt * 2.5; p.mesh.position.y = 0.4 + Math.sin(this.time * 4 + i) * 0.08; }
      const d = Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
      if (d < 1.4 || p.t <= 0) {
        if (d < 1.4) { this.healHero(h.maxHp * p.heal, null); this.snd('munch'); }
        if (p.mesh) { this.scene.remove(p.mesh); }
        this.pickups.splice(i, 1);
      }
    }
  }

  // ---------- damage ----------
  statAtk(u) { return u.atk * Math.max(0.2, 1 + this.sumStatus(u, 'atk') - this.sumStatus(u, 'weaken')) * (u.enrage || 1); }
  statDef(u) { return u.def_; }

  damage(src, e, mult, o = {}) {
    if (!e.alive || e.spawnT > 0.35 || this.over) return 0;
    const kind = o.kind || 'basic', P = this.perks;
    const power = kind === 'ult' ? src.power.ult : kind === 'basic' ? src.power.basic : kind === 'dot' || kind === 'follow' ? 1 : src.power.skill;
    let base = this.statAtk(src) * mult * power + (o.def ? this.statDef(src) * o.def : 0);
    const m = src.mem;
    if (m && m.type === 'ultDmg' && kind === 'ult') base *= 1 + m.v / 100;
    if (m && m.type === 'skillDmg' && (kind === 'skill' || kind === 'support')) base *= 1 + m.v / 100;
    if (src.nextSkillBoost && kind === 'skill') base *= 1.2;
    if (kind === 'basic') base *= 1 + (P.basicDmg || 0);
    if (kind === 'skill') base *= 1 + (P.skillDmg || 0);
    if (kind === 'support') base *= 1 + (P.supDmg || 0);
    if (kind === 'ult') base *= 1 + (P.ultDmg || 0);
    let dmg = base * ACT.defEnemy / (ACT.defEnemy + e.def_);
    const weak = (e.def.weak || []).includes(src.def.element);
    if (weak) { dmg *= ACT.weakDmg + (P.weakDmg || 0); if (kind !== 'dot') SAVE.stats.weakHits = (SAVE.stats.weakHits || 0) + 1; }
    if (e.broken) dmg *= (ACT.breakDmg + (P.brokenDmg || 0)) * (this.mods.has('breaker') ? 1.2 : 1) * (1 + (o.brokenBonus || 0));
    dmg *= Math.max(0.1, 1 + this.sumStatus(e, 'mark') - this.sumStatus(e, 'guard'));
    if (this.mods.has('glass')) dmg *= 1.3;
    if (src.id === 'tsuna' && kind !== 'basic' && kind !== 'dot' && this.hasStatus(e, 'paint')) dmg *= 1.25;
    if (e.boss) dmg *= 1 + (P.bossDmg || 0);
    if (e.air) dmg *= 1.1;   // juggling bonus
    let crit = false;
    if (kind !== 'dot') {
      crit = Math.random() < src.crit + (o.critBonus || 0) + this.sumStatus(e, 'exposed');
      if (crit) { dmg *= 1 + src.critDmg; this.stat.crits++; SAVE.stats.crits++; }
    }
    dmg = Math.max(1, Math.round(dmg * (0.94 + Math.random() * 0.12)));
    e.hp -= dmg;
    src.dmg = (src.dmg || 0) + dmg;
    if (kind === 'skill' || kind === 'ult' || kind === 'support') { const t = this.tallies.find(x => x.u === src && x.kind === kind); if (t) { t.sum += dmg; t.hits++; t.last = this.time; } }
    this.totalDmg = (this.totalDmg || 0) + dmg;
    if (kind !== 'dot') {
      SAVE.stats.bestHit = Math.max(SAVE.stats.bestHit, dmg);
      this.stat.hits++;
      this.combo++; this.comboIdle = 0;
      this.stat.maxCombo = Math.max(this.stat.maxCombo, this.combo);
      const stg = (ACT.stagger[kind] == null ? 6 : ACT.stagger[kind]) * (o.stagger || 1) * (weak ? ACT.weakStagger : 1) * (this.mods.has('breaker') ? 1.5 : 1) * (1 + (P.stagger || 0));
      if (!e.broken && stg > 0) this.stagger(e, stg, src);
      if (o.mark) this.addStatus(e, 'mark', o.mark, 6, 'MARK');
      if (o.paint) this.addStatus(e, 'paint', this.statAtk(src) * 0.3, 4, 'PAINT');
      if (o.knock && !e.boss) { const dx = e.pos.x - src.pos.x, dz = e.pos.z - src.pos.z, d = Math.hypot(dx, dz) || 1; e.kb.set(dx / d * o.knock * 5, 0, dz / d * o.knock * 5); }
      // Finishers and heavy skills pop regular enemies into the air.
      const launch = o.launch || (o.knock && kind !== 'basic' ? 5 : 0) || (kind === 'ult' && Math.random() < 0.35 ? 4.5 : 0);
      if (launch && !e.boss && !e.elite && e.alive && e.hp > 0 && (e.air || !(e.launchCd > 0))) { e.vy = Math.max(e.vy || 0, launch); if (!e.air) { e.air = true; this.cancelMove(e); } }
      if (!e.boss && !e.broken && (kind !== 'basic' || dmg > e.maxHp * 0.15)) e.flinch = Math.max(e.flinch, 0.18);
      if (kind === 'skill' || kind === 'support') this.addEnergy(0.4);
      if (P.lifesteal && kind === 'basic') this.healHero(dmg * 0.02 * P.lifesteal, null, true);
      if (P.burnHit && Math.random() < 0.2 * P.burnHit) this.addStatus(e, 'burn', this.statAtk(src) * 0.25, 3, 'BURN');
      if (P.critChain && crit && kind !== 'follow') this.chain(src, e, P.critChain);
    }
    if (!this.headless) {
      // Only crits and heavy single blows get the big flash, so multi-hit Ultimates don't white out the screen.
      const big = crit || mult >= 2 || kind === 'support';
      e.model.flash(crit ? '#ffe9a8' : '#ffffff', big ? 0.1 : 0.06);
      if (kind !== 'dot') {
        e.model.play('hit');
        const dx = e.pos.x - (src.pos ? src.pos.x : e.pos.x), dz = e.pos.z - (src.pos ? src.pos.z : e.pos.z), dl = Math.hypot(dx, dz) || 1;
        this.fx.hit(new THREE.Vector3(e.pos.x, 0.55 * (e.boss ? 2 : e.ms || 1), e.pos.z), weak ? ELEMENTS[src.def.element].color : src.def.color, big, { x: dx / dl, y: 0.25, z: dz / dl });
        if (crit || kind === 'ult') this.hitStop = Math.max(this.hitStop, crit ? 0.05 : 0.035);
        if (crit) this.fx.shake(0.12);
      }
      this.number(e, dmg, crit ? 'crit' : kind === 'dot' ? 'dot' : weak ? 'weak' : big ? 'big' : '', weak ? ELEMENTS[src.def.element].color : null);
      if (crit) this.snd('crit', 0.08);
      else if (weak && kind !== 'dot') this.snd('weak', 0.12);
    }
    if (e.hp <= 0) this.killFoe(e, src);
    return dmg;
  }

  // Perk: crits arc to another enemy.
  chain(src, from, lvl) {
    const t = this.livingFoes().filter(e => e !== from).sort((a, b) => a.pos.distanceTo(from.pos) - b.pos.distanceTo(b.pos))[0];
    if (!t || t.pos.distanceTo(from.pos) > 6) return;
    this.fx.beam(from.pos, Math.atan2(t.pos.x - from.pos.x, t.pos.z - from.pos.z), t.pos.distanceTo(from.pos), '#9fe8ff', 0.15);
    this.damage(src, t, 0.5 * lvl, { kind: 'follow' });
  }

  stagger(e, amt, src) {
    if (e.broken || !e.alive) return;
    e.poise -= amt;
    if (e.poise <= 0) this.breakFoe(e, src);
  }

  breakFoe(e, src) {
    e.poise = 0; e.broken = true;
    e.brokenT = e.boss ? ACT.bossBreakTime : ACT.breakTime;
    this.stat.breaks++; SAVE.stats.breaks++; bumpDaily('breaks');
    // A Break interrupts whatever the enemy was winding up.
    const wasCharge = e.mode === 'windup' && e.move && e.move.charge;
    this.cancelMove(e);
    const bfx = BREAK_FX_A[src.def.element];
    if (bfx) bfx.apply(this, e, src);
    const h = this.player;
    if (this.team.includes('sendo')) { const s = h.id === 'sendo' ? h : this.supports.find(x => x.id === 'sendo'); if (s) this.healHero(baseHp(s) * 0.04, s, true); }
    if (this.team.includes('noah')) {
      const n = h.id === 'noah' ? h : this.supports.find(x => x.id === 'noah');
      if (n) this.after(0.25, () => { if (e.alive) { this.fx.slashAt(e.pos, '#c58bff', 1.2); this.damage(n, e, 1.2, { kind: 'follow' }); } });
    }
    if (src.id === 'uruha') { this.addEnergy(25); src.nextSkillBoost = true; }
    if (this.perks.breakHeal) this.healHero(h.maxHp * 0.04 * this.perks.breakHeal, null, true);
    if (this.perks.breakNova) this.after(0.1, () => { this.fx.nova(e.pos.x, e.pos.z, 3, '#ffffff'); this.hitCircle(h, e.pos.x, e.pos.z, 3, 1.2 * this.perks.breakNova, { kind: 'follow' }); });
    if (this.headless) return;
    sfx('break');
    this.slow(0.25, 0.32);
    this.fx.shake(0.35);
    this.punch = Math.max(this.punch, 0.8);
    this.fx.flatRing(e.pos.x, e.pos.z, src.def.color, 0.5, e.boss ? 6 : 3.5, 0.5, { bright: 1, alpha: 0.45 });
    this.fx.impact(new THREE.Vector3(e.pos.x, e.boss ? 2 : 0.9, e.pos.z), bfx ? ELEMENTS[src.def.element].color : '#ffffff', e.boss ? 7 : 4.2);
    this.streaks.emit(e.pos.x, 0.9, e.pos.z, { n: SAVE.settings.gfx === 'low' ? 6 : 16, speed: 16, color: bfx ? ELEMENTS[src.def.element].color : '#ffffff', life: 0.4, width: 0.1, grav: 5 });
    this.stars.emit(e.pos.x, 0.9, e.pos.z, { n: SAVE.settings.gfx === 'low' ? 3 : 8, speed: 7, color: bfx ? ELEMENTS[src.def.element].color : '#ffffff', life: 0.8, size: 0.55, grav: 4 });
    this.sparks.emit(e.pos.x, 0.9, e.pos.z, { n: SAVE.settings.gfx === 'low' ? 4 : 12, speed: 9, color: src.def.color, life: 0.3, size: 0.12, bright: 0.8 });
    this.breakSplash(e, bfx, src, wasCharge);
    this.coach('break');
  }

  cancelMove(e) {
    this.zones = this.zones.filter(z => { if (z.src === e) { this.removeZone(z); return false; } return true; });
    if (e.mode === 'windup' || e.mode === 'dash' || e.mode === 'sweep') { e.mode = 'move'; e.modeT = 0; }
    e.model.setState && e.model.setState('idle');
    if (e.boss) this.q('.abb-cast').textContent = '';
  }

  killFoe(e, src) {
    e.alive = false; e.hp = 0; e.dying = 0.55; e.air = false;
    // Blasted away from whoever landed the blow, tumbling, before popping.
    if (src && src.pos) { const dx = e.pos.x - src.pos.x, dz = e.pos.z - src.pos.z, d = Math.hypot(dx, dz) || 1, f = e.boss ? 0 : 5; e.dieVel = new THREE.Vector3(dx / d * f, 0, dz / d * f); e.vy = e.boss ? 0 : 6.5; }
    this.cancelMove(e);
    this.stat.kills++;
    SAVE.stats.kills++;
    SAVE.dex[e.key] = (SAVE.dex[e.key] || 0) + 1;
    this.addEnergy(ACT.energyKill);
    if (this.perks.killHeal) this.healHero(this.player.maxHp * 0.02 * this.perks.killHeal, null, true);
    if (!e.boss && Math.random() < ACT.heartChance + (this.perks.hearts || 0)) this.dropSnack(e.pos.x, e.pos.z, ACT.heartHeal);
    if (this.run) this.run.coins = (this.run.coins || 0) + (e.boss ? 60 : 4 + Math.floor(Math.random() * 4));
    if (this.headless) return;
    this.snd('kill', 0.06);
    // Glitch monsters burst into pixels.
    const col = e.def.hue != null ? hueHex(e.def.hue, 0.8, 0.65) : '#ff4d6d';
    this.fx.glow(e.pos.x, 0.6, e.pos.z, '#ffffff', e.boss ? 5 : 1.4, 0.2);
    this.streaks.emit(e.pos.x, 0.6, e.pos.z, { n: e.boss ? 30 : 10, speed: 12, color: '#ffffff', life: 0.3, width: 0.07 });
    this.after(e.boss ? 0.1 : 0.42, () => {
      const y = (e.pos.y || 0) + 0.6 * (e.ms || 1);
      this.pixels.emit(e.pos.x, y, e.pos.z, { n: e.boss ? 90 : 26, speed: e.boss ? 9 : 5.5, color: col, life: 0.9, size: e.boss ? 0.34 : 0.22, up: 0.9, grav: 7, drag: 1.5, bright: 1.4 });
      this.fx.flatRing(e.pos.x, e.pos.z, col, 0.3, e.boss ? 5 : 1.8, 0.4);
      this.stars.emit(e.pos.x, y, e.pos.z, { n: e.boss ? 20 : 6, speed: 4, color: '#ffffff', life: 0.7, size: 0.45, grav: -1 });
    });
    if (e.bar) e.bar.remove();
  }

  hurtHero(e, mult, o = {}) {
    const h = this.player;
    if (!h.alive || this.over) return;
    if (h.iframes > 0) { if (h.perfectWin > 0) this.perfectDodge(); return; }
    let dmg = this.statAtk(e) * mult * ACT.defAlly / (ACT.defAlly + this.statDef(h));
    dmg *= 1 - Math.min(0.75, this.sumStatus(h, 'dr') + (this.perks.dr || 0));
    if (this.mods.has('glass')) dmg *= 1.3;
    if (Math.random() < (e.crit || 0)) dmg *= 1.4;
    dmg = Math.max(1, Math.round(dmg * (0.94 + Math.random() * 0.12)));
    if (h.shield > 0) {
      const a = Math.min(h.shield, dmg);
      h.shield -= a; dmg -= a;
      if (h.id === 'hinano' && e.alive && e.side === 'enemy') this.damage(h, e, 0.5, { kind: 'follow', def: 0.6 });
      if (!dmg) { this.floatText(h, 'BLOCK', 'shield'); this.snd('shield', 0.1); return; }
    }
    h.hp -= dmg;
    this.stat.taken += dmg;
    this.addEnergy(ACT.energyHurt);
    if (o.drain) this.player.energy = Math.max(0, this.player.energy - o.drain);
    if (o.steal) this.player.energy = Math.max(0, this.player.energy - o.steal);
    if (o.silence) this.addStatus(h, 'silence', 1, o.silence, 'SILENCED');
    if (!this.headless) {
      h.model.flash('#ff3355', 0.18);
      h.model.play('hit');
      this.number(h, dmg, 'hurt');
      this.fx.shake(0.22);
      this.hitStop = Math.max(this.hitStop, 0.04);
      this.flashScreen('hurt');
      this.snd('hit', 0.08);
    }
    if (h.hp <= 0) this.heroDown();
  }

  heroDown() {
    const h = this.player;
    if (this.perks.revive && !this.revived && !(this.run && this.run.reviveUsed)) {
      this.revived = true;
      h.hp = Math.round(h.maxHp * 0.4);
      h.iframes = 2;
      this.banner('SECOND WIND', 'perfect');
      this.fx.pillar(h.pos.x, h.pos.z, '#7dffa0', 1, 1.2);
      return;
    }
    h.hp = 0; h.alive = false;
    h.model.setState('ko');
    this.snd('ko');
    this.slow(0.3, 1.2);
    this.after(1.1, () => this.finish(false));
  }

  healHero(amount, src, quiet = false) {
    const h = this.player;
    if (!h.alive) return;
    const boost = src && src.mem && src.mem.type === 'healBoost' ? 1 + src.mem.v / 100 : 1;
    const a = Math.round(Math.min(h.maxHp - h.hp, amount * boost * (1 + (this.perks.healBoost || 0))));
    if (a <= 0) return;
    h.hp += a;
    if (this.headless) return;
    this.number(h, a, 'heal');
    if (!quiet) {
      this.snd('heal', 0.2);
      this.stars.emit(h.pos.x, 0.4, h.pos.z, { n: 10, speed: 1.2, color: '#7dffa0', life: 0.9, size: 0.4, grav: -2, up: 1 });
      this.fx.flatRing(h.pos.x, h.pos.z, '#7dffa0', 0.4, 1.6, 0.5);
    }
  }

  shieldHero(amount, dur, quiet = false) {
    const h = this.player;
    const a = amount * (this.mods.has('fragile') ? 0.5 : 1) * (1 + (this.perks.shieldBoost || 0));
    h.shield = Math.max(h.shield, Math.round(a));
    h.shieldT = Math.max(h.shieldT, dur);
    if (this.headless || quiet) return;
    this.snd('shield', 0.2);
    this.floatText(h, 'SHIELD', 'shield');
  }

  buff(u, key, val, dur, label) { this.addStatus(u, key, val, dur, label); if (!this.headless && key === 'atk') this.snd('buff', 0.2); }

  addEnergy(n, quiet) {
    const h = this.player;
    if (!h || !h.alive) return;
    const was = h.energy;
    h.energy = Math.min(100, h.energy + n * (quiet ? 1 : this.mods.has('overcharge') ? 1.4 : 1));
    if (was < 100 && h.energy >= 100 && !this.headless) { this.snd('rise'); this.coach('ult'); }
  }

  // ---------- statuses ----------
  addStatus(u, key, val, dur, label) {
    const ex = u.statuses.find(s => s.key === key && s.label === label);
    if (ex) { ex.val = Math.max(ex.val, val); ex.t = Math.max(ex.t, dur); return; }
    u.statuses.push({ key, val, t: dur, label });
  }
  sumStatus(u, key) { let v = 0; for (const s of u.statuses) if (s.key === key) v += s.val; return v; }
  hasStatus(u, key) { return u.statuses.some(s => s.key === key); }
  tickStatuses(u, dt) {
    if (!u.statuses.length) return;
    u.statuses.forEach(s => { s.t -= dt; });
    u.statuses = u.statuses.filter(s => s.t > 0);
  }

  // ---------- enemies ----------
  updateFoe(e, dt) {
    if (e.dying != null && !e.alive) {
      e.dying -= dt;
      if (e.dieVel) { e.pos.addScaledVector(e.dieVel, dt); e.vy -= 20 * dt; e.pos.y = Math.max(0, (e.pos.y || 0) + e.vy * dt); this.keepInArena(e); }
      if (!this.headless && e.model.root) {
        // Full size while flying, then a quick pop.
        const k = Math.max(0, e.dying / 0.55);
        e.model.root.scale.setScalar(e.ms * (k < 0.25 ? k / 0.25 : 1));
        e.facing += dt * 14;
        e.model.root.rotation.x = (1 - k) * 2.4;
        if (e.dying <= 0) { this.scene.remove(e.model.root); this.scene.remove(e.shadow); e.model.dispose && e.model.dispose(); }
      }
      if (e.dying <= 0) { e.dying = null; this.foes.splice(this.foes.indexOf(e), 1); }
      return;
    }
    if (!e.alive) return;
    if (e.launchCd > 0) e.launchCd -= dt;   // can't be launched again right after landing
    this.tickStatuses(e, dt);
    // Burn / Paint tick once a second.
    e.dotT += dt;
    if (e.dotT >= 1) {
      e.dotT -= 1;
      const dot = this.sumStatus(e, 'burn') + this.sumStatus(e, 'paint');
      if (dot > 0) this.damage({ atk: dot, def: { element: 'none', color: '#ff8a5c' }, crit: 0, critDmg: 0, power: {}, statuses: [], id: 'dot' }, e, 1, { kind: 'dot' });
      if (!e.alive) return;
    }
    if (e.spawnT > 0) {
      e.spawnT -= dt;
      if (!this.headless) { const k = 1 - Math.max(0, e.spawnT) / 0.7; e.model.root.scale.setScalar(e.ms * Math.max(0.01, Math.min(1.1, k * 1.25) - Math.max(0, k - 0.8) * 0.5)); }
      return;
    }
    if (!this.headless && e.model.root.scale.x !== e.ms) e.model.root.scale.setScalar(e.ms);
    // knockback slides
    if (e.kb.lengthSq() > 0.01) { e.pos.addScaledVector(e.kb, dt); e.kb.multiplyScalar(Math.max(0, 1 - dt * 8)); this.keepInArena(e); }
    // Launched into the air: helpless until it lands (with one small bounce).
    if (e.air) {
      e.vy -= 20 * dt;
      e.pos.y += e.vy * dt;
      if (e.pos.y <= 0) {
        e.pos.y = 0;
        if (e.vy < -5) { e.vy = -e.vy * 0.3; if (!this.headless) this.sparks.emit(e.pos.x, 0.1, e.pos.z, { n: 6, speed: 1.6, color: '#d8d4e8', bright: 0.5, life: 0.4, size: 0.45, grav: -0.3, flat: true }); }
        else { e.air = false; e.vy = 0; e.flinch = Math.max(e.flinch, 0.3); e.launchCd = 3; }
      }
      e.model.setState('stun');
      return;
    }
    if (e.broken) {
      e.brokenT -= dt;
      e.model.setState('stun');
      if (!this.headless && Math.random() < dt * 6) this.stars.emit(e.pos.x, e.boss ? 3 : 1.3, e.pos.z, { n: 1, speed: 1, color: '#fff3a0', life: 0.6, size: 0.35, grav: 0 });
      if (e.brokenT <= 0) { e.broken = false; e.poise = e.maxPoise; e.model.setState('idle'); }
      return;
    }
    if (e.flinch > 0) { e.flinch -= dt; return; }
    const slow = 1 - this.sumStatus(e, 'slow');
    if (e.boss) return this.bossAI(e, dt * slow);
    this.foeAI(e, dt * slow);
  }

  foeAI(e, dt) {
    const h = this.player, ai = e.ai;
    e.cds = e.cds.map(c => c - dt);
    if (this.runMode(e, dt)) return;
    const d = Math.hypot(h.pos.x - e.pos.x, h.pos.z - e.pos.z);
    // Pick a move that is ready (at most a few enemies wind up at once, to stay fair).
    if (h.alive) {
      const busy = this.foes.filter(f => f.alive && f.mode === 'windup' && !f.boss).length;
      for (let i = 0; i < ai.moves.length; i++) {
        const mv = ai.moves[i];
        if (e.cds[i] > 0 || d > mv.range) continue;
        if (mv.heal && !this.foes.some(f => f.alive && f !== e && f.hp < f.maxHp * 0.7)) continue;
        if (mv.guard && this.foes.some(f => f.alive && this.hasStatus(f, 'guard'))) continue;
        if (!mv.heal && !mv.guard && busy >= 4) continue;
        e.cds[i] = mv.cd * (0.72 + Math.random() * 0.26) * (this.mods.has('swift') ? 0.8 : 1);
        this.startMove(e, mv);
        return;
      }
    }
    // Move: melee closes in, ranged keeps its distance and strafes.
    const keep = ai.keep || 0;
    let mx = 0, mz = 0;
    const dx = (h.pos.x - e.pos.x) / (d || 1), dz = (h.pos.z - e.pos.z) / (d || 1);
    if (keep) {
      if (d > keep + 0.8) { mx = dx; mz = dz; } else if (d < keep - 1.2) { mx = -dx; mz = -dz; }
      mx += -dz * e.strafe * 0.6; mz += dx * e.strafe * 0.6;
      if (Math.random() < dt * 0.3) e.strafe *= -1;
    } else if (d > h.r + e.r + 0.5) { mx = dx; mz = dz; }
    const ml = Math.hypot(mx, mz);
    if (ml > 0.05 && h.alive) {
      e.pos.x += mx / ml * e.speed * dt; e.pos.z += mz / ml * e.speed * dt;
      e.model.setState('run');
    } else e.model.setState('idle');
    e.facing = turnTo(e.facing, Math.atan2(dx, dz), dt * 8);
    this.foes.forEach(f => { if (f !== e && f.alive) this.separate(e, f, 0.5); });
    this.keepInArena(e);
  }

  // Shared windup / recover / dash handling. Returns true while the enemy is busy.
  runMode(e, dt) {
    if (e.mode === 'windup') {
      e.modeT -= dt;
      if (e.move && !e.move.shape && !e.move.lock) this.faceTo(e, this.player.pos);
      if (e.modeT <= 0) this.fireMove(e, e.move);
      return true;
    }
    if (e.mode === 'dash') {
      e.modeT -= dt;
      e.pos.addScaledVector(e.dashVel, dt);
      this.keepInArena(e);
      if (!this.headless && Math.random() < 0.8) this.sparks.emit(e.pos.x, 0.6, e.pos.z, { n: 2, speed: 0.4, color: '#ff4d6d', life: 0.3, size: 0.4, grav: 0 });
      if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = 0.5; }
      return true;
    }
    if (e.mode === 'sweep') { this.updateSweep(e, dt); return true; }
    if (e.mode === 'recover') {
      e.modeT -= dt;
      if (e.modeT <= 0) e.mode = 'move';
      return true;
    }
    return false;
  }

  startMove(e, mv) {
    const h = this.player;
    e.move = mv;
    this.faceTo(e, h.pos);
    const wind = mv.windup * (this.mods.has('swift') ? 0.8 : 1) * (e.boss && e.phase === 3 ? 0.85 : 1);
    if (mv.heal || mv.guard) {
      e.model.play('cast');
      if (mv.heal) this.foes.filter(f => f.alive && f !== e).forEach(f => {
        const a = Math.round(f.maxHp * mv.heal * (f.boss ? 0.15 : 1));   // bosses only get a sliver, or healers could stall a fight forever
        f.hp = Math.min(f.maxHp, f.hp + a);
        if (!this.headless) { this.number(f, a, 'heal'); this.fx.flatRing(f.pos.x, f.pos.z, '#7dffa0', 0.3, 1.4, 0.4); }
      });
      if (mv.guard) (e.boss ? [e] : this.foes.filter(f => f.alive)).forEach(f => {
        this.addStatus(f, 'guard', mv.guard, mv.dur, 'GUARD');
        if (!this.headless) this.fx.dome(f.pos.x, f.pos.z, 1.2 * (f.boss ? 2 : 1), '#ffb347');
      });
      if (!this.headless) this.floatText(e, mv.name.toUpperCase(), 'foe');
      e.mode = 'recover'; e.modeT = 0.6;
      return;
    }
    if (mv.summon) {
      e.model.play('cast');
      this.floatText(e, mv.name.toUpperCase(), 'foe');
      mv.summon.forEach((k, i) => {
        const a = e.facing + (i - (mv.summon.length - 1) / 2) * 1.2;
        let x = e.pos.x + Math.sin(a) * 3, z = e.pos.z + Math.cos(a) * 3;
        const m = Math.hypot(x, z); if (m > ACT.arena - 1) { x *= (ACT.arena - 1) / m; z *= (ACT.arena - 1) / m; }
        this.makeFoe(k, x, z);
      });
      e.mode = 'recover'; e.modeT = 1;
      return;
    }
    e.mode = 'windup';
    e.modeT = wind;
    e.model.play('windup', wind);
    e.model.setState(mv.charge ? 'charge' : 'windup');
    if (mv.charge && !this.headless) { this.banner(`!! ${mv.name}`, 'warn'); this.coach('charge'); }
    if (e.boss && !this.headless) this.q('.abb-cast').textContent = mv.name;
    // Blink: vanish and reappear right next to the leader before striking.
    if (mv.blink) {
      if (!this.headless) { this.fx.glow(e.pos.x, 0.6, e.pos.z, '#e24bd0', 1.6, 0.3); this.sparks.emit(e.pos.x, 0.6, e.pos.z, { n: 12, speed: 3, color: '#e24bd0', life: 0.4, size: 0.25 }); }
      const a = Math.random() * Math.PI * 2;
      e.pos.set(h.pos.x + Math.sin(a) * 2.1, 0, h.pos.z + Math.cos(a) * 2.1);
      this.keepInArena(e);
      this.faceTo(e, h.pos);
      if (!this.headless) { this.fx.glow(e.pos.x, 0.6, e.pos.z, '#4be2e2', 1.6, 0.3); this.syncModel(e); }
    }
    // Red warning zones for the attack.
    const z = { src: e, mult: mv.mult, dur: wind, t: 0, o: { drain: mv.drain, steal: mv.steal, silence: mv.silence } };
    if (mv.shape === 'cone') this.addZone(Object.assign({}, z, { shape: 'cone', x: e.pos.x, z: e.pos.z, r: mv.r, ang: e.facing, arc: mv.arc }));
    else if (mv.shape === 'line') {
      // fan: several narrower lines spread out like a shotgun.
      const n = mv.fan || 1;
      for (let i = 0; i < n; i++) this.addZone(Object.assign({}, z, { shape: 'line', x: e.pos.x, z: e.pos.z, len: mv.len, w: mv.w, ang: e.facing + (i - (n - 1) / 2) * 0.34 }));
    } else if (mv.shape === 'circle') {
      const spots = [];
      if (mv.at === 'self') spots.push([e.pos.x, e.pos.z]);
      else {
        spots.push([h.pos.x, h.pos.z]);
        for (let i = 0; i < (mv.count || 1) - 1; i++) { const a = Math.random() * Math.PI * 2, d = 2 + Math.random() * 3.5; spots.push([h.pos.x + Math.sin(a) * d, h.pos.z + Math.cos(a) * d]); }
      }
      // leap: the enemy jumps onto the first spot when the attack lands.
      if (mv.leap) e.leapTo = spots[0];
      spots.forEach(([x, zz]) => this.addZone(Object.assign({}, z, { shape: 'circle', x, z: zz, r: mv.r })));
    } else if (mv.grid) {
      // Viral Surge: rows of zones across the arena with gaps to escape through.
      const off = Math.random() < 0.5 ? 0 : 1;
      for (let gx = -4; gx <= 4; gx++) for (let gz = -4; gz <= 4; gz++) {
        if ((gx + gz + off) % 2 === 0) continue;
        const x = gx * 2.4, zz = gz * 2.4;
        if (Math.hypot(x, zz) > ACT.arena - 0.5) continue;
        this.addZone(Object.assign({}, z, { shape: 'circle', x, z: zz, r: mv.r * 0.75 }));
      }
    } else if (mv.ring) {
      this.addZone(Object.assign({}, z, { shape: 'circle', x: e.pos.x, z: e.pos.z, r: 2.2, noHit: true }));
    } else if (mv.sweep) {
      this.addZone(Object.assign({}, z, { shape: 'line', x: e.pos.x, z: e.pos.z, len: mv.len, w: mv.w, ang: e.facing, noHit: true }));
    } else if (mv.volley && !this.headless) {
      this.fx.glow(e.pos.x, 0.8 * (e.boss ? 2 : 1), e.pos.z, '#ff4d6d', 1.6, wind);
    }
  }

  fireMove(e, mv) {
    const h = this.player;
    e.mode = 'recover'; e.modeT = mv.recover || (e.boss ? 0.7 : 0.75);
    e.model.setState('idle');
    e.model.play('strike');
    if (e.boss && !this.headless) this.q('.abb-cast').textContent = '';
    if (mv.dash) {
      const a = e.facing, len = (mv.len || 6) - 0.5;
      e.mode = 'dash'; e.modeT = 0.2;
      e.dashVel = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(len / 0.2);
    }
    if (mv.leap && e.leapTo) {
      e.mode = 'dash'; e.modeT = 0.14;
      e.dashVel = new THREE.Vector3(e.leapTo[0] - e.pos.x, 0, e.leapTo[1] - e.pos.z).multiplyScalar(1 / 0.14);
      e.leapTo = null;
      if (!this.headless) this.fx.flatRing(e.pos.x, e.pos.z, '#b98bff', 0.3, 1.6, 0.35);
    }
    if (mv.volley) {
      const n = mv.volley, base = Math.atan2(h.pos.x - e.pos.x, h.pos.z - e.pos.z);
      for (let i = 0; i < n; i++) {
        const a = mv.spread >= 6 ? base + i / n * Math.PI * 2 : base + (n > 1 ? (i / (n - 1) - 0.5) * mv.spread : 0);
        this.enemyShot(e, a, mv.speed || 5.5, mv.mult);
      }
      this.snd('shot', 0.1);
    }
    if (mv.ring) this.startPulse(e, mv);
    if (mv.sweep) { e.mode = 'sweep'; e.modeT = 2.2; e.sweepDir = Math.random() < 0.5 ? -1 : 1; e.sweepTick = 0; this.startSweep(e, mv); }
  }

  enemyShot(e, a, speed, mult) {
    const p = { side: 'enemy', src: e, pos: new THREE.Vector3(e.pos.x, 0.6 * (e.boss ? 1.8 : 1), e.pos.z), vel: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(speed), life: 4, r: 0.32, mult };
    if (!this.headless) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color('#ff3d6a').multiplyScalar(2.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.scale.setScalar(0.9);
      m.position.copy(p.pos);
      this.scene.add(m);
      p.mesh = m;
    }
    this.projectiles.push(p);
  }

  // Core Pulse: a ring of energy that expands from the boss; dodge through it.
  startPulse(e, mv) {
    const x = e.pos.x, z = e.pos.z, t0 = this.time;
    let hitDone = false, m = null;
    const pulse = { x, z, r: 1 };
    this.pulses.push(pulse);
    if (!this.headless) {
      m = new THREE.Mesh(geo('pulse', () => new THREE.RingGeometry(0.85, 1, 64).rotateX(-Math.PI / 2)), this.fx.basic('#ff3d6a', { bright: 2.4 }));
      m.position.set(x, 0.08, z);
      this.scene.add(m);
    }
    const tick = () => {
      const r = (this.time - t0) * mv.speed + 1;
      pulse.r = r;
      if (m) { m.scale.set(r, 1, r); m.material.opacity = Math.max(0, 1 - r / mv.r); }
      const d = Math.hypot(this.player.pos.x - x, this.player.pos.z - z);
      if (!hitDone && Math.abs(d - r) < 0.55) { hitDone = true; this.hurtHero(e, mv.mult); }
      if (r >= mv.r || this.over) { if (m) { this.scene.remove(m); m.material.dispose(); } this.pulses.splice(this.pulses.indexOf(pulse), 1); return; }
      this.after(0.016, tick);
    };
    tick();
  }

  // Sweeping Beam: a laser that rotates around the boss.
  startSweep(e, mv) {
    e.sweepAng = e.facing;
    e.sweepMv = mv;
    if (!this.headless) {
      const m = new THREE.Mesh(geo('fxBeam', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5)), this.fx.basic('#ff3d6a', { bright: 2.6 }));
      m.scale.set(mv.w * 0.6, 0.4, mv.len);
      m.position.set(e.pos.x, 0.9, e.pos.z);
      this.scene.add(m);
      e.sweepMesh = m;
    }
  }
  updateSweep(e, dt) {
    const mv = e.sweepMv;
    e.modeT -= dt;
    e.sweepAng += e.sweepDir * dt * 1.25;
    e.facing = e.sweepAng;
    if (e.sweepMesh) { e.sweepMesh.rotation.y = e.sweepAng; e.sweepMesh.position.set(e.pos.x, 0.9, e.pos.z); }
    e.sweepTick -= dt;
    const h = this.player, rx = h.pos.x - e.pos.x, rz = h.pos.z - e.pos.z, dx = Math.sin(e.sweepAng), dz = Math.cos(e.sweepAng);
    const along = rx * dx + rz * dz, perp = Math.abs(rx * dz - rz * dx);
    if (e.sweepTick <= 0 && along > 0 && along < mv.len && perp < mv.w / 2 + h.r) { e.sweepTick = 0.3; this.hurtHero(e, mv.mult); }
    if (e.modeT <= 0) {
      if (e.sweepMesh) { this.scene.remove(e.sweepMesh); e.sweepMesh.material.dispose(); e.sweepMesh = null; }
      e.mode = 'recover'; e.modeT = 0.6;
    }
  }

  bossAI(e, dt) {
    const h = this.player, frac = e.hp / e.maxHp;
    if (e.phase === 1 && frac <= 0.5) this.bossPhase(e, 2);
    else if (e.phase === 2 && frac <= 0.25) this.bossPhase(e, 3);
    if (this.runMode(e, dt)) return;
    const d = Math.hypot(h.pos.x - e.pos.x, h.pos.z - e.pos.z);
    const pat = BOSS_PATTERN[e.key][e.phase - 1], moves = BOSS_MOVES[e.key];
    let mv = moves[pat[e.pi % pat.length]];
    e.nextT -= dt;
    // Movement: the Phantom hunts you, the Core drifts to the centre, the Algorithm hovers at range.
    let tx = h.pos.x, tz = h.pos.z, keep = 2.6;
    if (e.key === 'core') { tx = 0; tz = -1; keep = 0; }
    if (e.key === 'algorithm') keep = 6;
    const dx = tx - e.pos.x, dz = tz - e.pos.z, dd = Math.hypot(dx, dz);
    const sp = e.speed * (e.phase === 3 ? 1.3 : 1);
    if (dd > keep + 0.4) { e.pos.x += dx / dd * sp * dt; e.pos.z += dz / dd * sp * dt; e.model.setState('run'); }
    else if (keep && dd < keep - 1.5) { e.pos.x -= dx / dd * sp * dt * 0.6; e.pos.z -= dz / dd * sp * dt * 0.6; }
    else e.model.setState('idle');
    e.facing = turnTo(e.facing, Math.atan2(h.pos.x - e.pos.x, h.pos.z - e.pos.z), dt * 5);
    this.keepInArena(e);
    if (e.nextT > 0 || !h.alive) return;
    // Melee moves wait until in range (or give up after a while and skip ahead).
    if (d > mv.range) { e.waitT = (e.waitT || 0) + dt; if (e.waitT < 2.5) return; e.pi++; e.waitT = 0; mv = moves[pat[e.pi % pat.length]]; if (d > mv.range) return; }
    e.waitT = 0;
    e.pi++;
    e.nextT = (e.phase === 3 ? 0.6 : 0.95) + Math.random() * 0.4;
    this.startMove(e, mv);
  }

  bossPhase(e, n) {
    e.phase = n;
    this.cancelMove(e);
    e.pi = 0; e.nextT = 1.2;
    if (n === 3) e.enrage = 1.2;
    if (n === 2 && e.key === 'phantom') ['grunt', 'grunt'].forEach((k, i) => this.makeFoe(k, e.pos.x + (i ? 3 : -3), e.pos.z + 1));
    if (this.headless) return;
    sfx('phase');
    this.banner(n === 3 ? 'FINAL PHASE' : 'PHASE 2', 'boss');
    this.q('.abb-phase').textContent = n === 3 ? 'FINAL' : 'PHASE 2';
    this.fx.flatRing(e.pos.x, e.pos.z, '#ff3355', 1, 9, 0.8);
    this.fx.shake(0.5);
    this.slow(0.4, 0.5);
  }

  // ---------- zones (red attack warnings) ----------
  addZone(z) {
    this.zones.push(z);
    if (this.headless) return z;
    // Plain translucent red (not additive), so overlapping warnings stay readable and don't glow.
    const col = '#ff3346';
    const g = new THREE.Group();
    g.position.set(z.x, 0.04 + this.zones.length * 0.0004, z.z);
    let edge, fill;
    const mat = o => this.fx.basic(col, Object.assign({ map: o.map || null, opacity: o.opacity, bright: 1, normal: true }, o));
    if (z.shape === 'circle') {
      edge = new THREE.Mesh(geo('zc', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), mat({ map: zoneTex(), opacity: 0.85 }));
      edge.scale.set(z.r, 1, z.r);
      fill = new THREE.Mesh(geo('zcf', () => new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2)), mat({ opacity: 0.35, map: stripeTex() }));
    } else if (z.shape === 'cone') {
      const sector = r => new THREE.CircleGeometry(r, 32, -Math.PI / 2 - z.arc / 2, z.arc).rotateX(-Math.PI / 2);
      edge = new THREE.Mesh(sector(z.r), mat({ opacity: 0.28 }));
      const rim = new THREE.Mesh(new THREE.RingGeometry(z.r - 0.08, z.r, 32, 1, -Math.PI / 2 - z.arc / 2, z.arc).rotateX(-Math.PI / 2), mat({ opacity: 0.95 }));
      edge.add(rim);
      fill = new THREE.Mesh(sector(z.r), mat({ opacity: 0.35, map: stripeTex() }));
      g.rotation.y = z.ang;
      z.ownGeo = true;
    } else {
      edge = new THREE.Mesh(geo('zl', () => new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0).rotateX(-Math.PI / 2)), mat({ opacity: 0.14 }));
      edge.scale.set(z.w, 1, z.len);
      // crisp borders down both long sides, so the lane reads without a heavy fill
      [-1, 1].forEach(sd => {
        const side = new THREE.Mesh(geo('zl', () => null), mat({ opacity: 0.85 }));
        side.scale.set(0.06, 1, z.len);
        side.position.set(sd * (z.w / 2 - 0.03), 0.002, 0);
        g.add(side);
      });
      fill = new THREE.Mesh(geo('zl', () => null), mat({ opacity: 0.4, map: stripeTex() }));
      fill.scale.set(z.w, 1, 0.001);
      g.rotation.y = z.ang;
    }
    g.add(edge, fill);
    z.mesh = g; z.fill = fill;
    this.scene.add(g);
    return z;
  }

  removeZone(z) {
    if (!z.mesh) return;
    this.scene.remove(z.mesh);
    z.mesh.traverse(m => { if (m.material) m.material.dispose(); if (z.ownGeo && m.geometry) m.geometry.dispose(); });
    z.mesh = null;
  }

  updateZones(dt) {
    // Walk a copy: a zone landing can kill its owner (counters, thorns), which cancels other zones.
    for (const z of this.zones.slice()) {
      const i = this.zones.indexOf(z);
      if (i < 0) continue;
      z.t += dt;
      const k = Math.min(1, z.t / z.dur);
      if (z.fill) {
        if (z.shape === 'line') z.fill.scale.set(z.w, 1, Math.max(0.001, z.len * k));
        else { const s = z.shape === 'circle' ? z.r * k : k; z.fill.scale.set(s, 1, s); }
        z.fill.material.opacity = 0.12 + 0.3 * k;
      }
      if (k >= 1) {
        this.zones.splice(i, 1);
        if (!z.noHit && z.src.alive && this.inZone(z, this.player)) this.hurtHero(z.src, z.mult, z.o);
        if (!this.headless) {
          if (z.shape === 'circle' && !z.noHit) { this.fx.flatRing(z.x, z.z, '#ff4d6d', z.r * 0.5, z.r, 0.3); this.sparks.emit(z.x, 0.3, z.z, { n: 8, speed: z.r * 2.5, color: '#ff6b4d', up: 0.6, life: 0.4, size: 0.25 }); }
          if (z.shape === 'cone' && z.src.model) this.fx.slash(z.src, '#ff4d6d', z.r / 1.6);
          if (z.shape === 'line' && !z.noHit) this.fx.beam(new THREE.Vector3(z.x, 0, z.z), z.ang, z.len, '#ff3d6a', 0.25);
        }
        this.removeZone(z);
      }
    }
  }

  inZone(z, u) {
    const rx = u.pos.x - z.x, rz = u.pos.z - z.z, d = Math.hypot(rx, rz), pad = u.r * 0.7;
    if (z.shape === 'circle') return d <= z.r + pad;
    if (z.shape === 'cone') return d <= z.r + pad && (d < 0.6 || Math.abs(angDiff(Math.atan2(rx, rz), z.ang)) <= z.arc / 2 + 0.12);
    const dx = Math.sin(z.ang), dz = Math.cos(z.ang), along = rx * dx + rz * dz, perp = Math.abs(rx * dz - rz * dx);
    return along > -pad && along < z.len + pad && perp < z.w / 2 + pad;
  }

  // ---------- auto battle ----------
  // Moves away from incoming zones, otherwise towards a good attack distance.
  autoMove() {
    const h = this.player;
    if (!h.alive) return null;
    // Auto reacts a little late and now and then misses a warning, so playing by hand is better.
    const danger = this.zones.find(z => {
      if (z.noHit) return false;
      const big = (z.r || 0) > 4 || z.len > 12;
      if (z.autoMiss == null) z.autoMiss = !big && Math.random() < 0.25;
      return !z.autoMiss && z.t / z.dur > (big ? 0 : 0.45) && this.inZone(z, h);
    });
    // Dodge through energy rings and sweeping beams just before they reach us.
    if (h.dodge > 0 && h.dodgeTime <= 0) {
      this.pulses.forEach(p => { const d = Math.hypot(h.pos.x - p.x, h.pos.z - p.z) - p.r; if (d > 0 && d < 0.9) this.want = 'dodge'; });
      this.foes.forEach(e => {
        if (e.mode !== 'sweep') return;
        const a = Math.atan2(h.pos.x - e.pos.x, h.pos.z - e.pos.z), ahead = angDiff(a, e.sweepAng) * e.sweepDir;
        if (ahead > 0 && ahead < 0.35 && Math.hypot(h.pos.x - e.pos.x, h.pos.z - e.pos.z) < e.sweepMv.len) this.want = 'dodge';
      });
    }
    if (danger) {
      if (h.dodge > 0 && h.dodgeTime <= 0 && z_left(danger) < 0.3) this.want = 'dodge';
      let ax = h.pos.x - danger.x, az = h.pos.z - danger.z;
      if (danger.shape === 'line') {
        // Step sideways out of a line, on whichever side we already are.
        const dx = Math.sin(danger.ang), dz = Math.cos(danger.ang), side = ax * dz - az * dx >= 0 ? 1 : -1;
        ax = dz * side; az = -dx * side;
      }
      if (Math.hypot(h.pos.x + ax, h.pos.z + az) > ACT.arena - 1.5) { ax = -h.pos.x; az = -h.pos.z; }
      const l = Math.hypot(ax, az) || 1;
      return { x: ax / l, z: az / l };
    }
    const shot = this.projectiles.find(p => p.side === 'enemy' && p.pos.distanceTo(h.pos) < 2.2);
    if (shot && h.dodge > 0 && Math.random() < 0.5) this.want = 'dodge';
    const t = this.nearestFoe(h.pos, 99);
    if (!t) {
      const p = this.pickups[0];
      if (p) { const dx = p.x - h.pos.x, dz = p.z - h.pos.z, l = Math.hypot(dx, dz); return l > 0.5 ? { x: dx / l, z: dz / l } : null; }
      return null;
    }
    const want = h.kit.style === 'melee' ? h.kit.range * 0.7 : h.kit.range * 0.75;
    const dx = t.pos.x - h.pos.x, dz = t.pos.z - h.pos.z, d = Math.hypot(dx, dz) - t.r;
    if (h.hp < h.maxHp * 0.6 && this.pickups.length) { const p = this.pickups[0]; const px = p.x - h.pos.x, pz = p.z - h.pos.z, l = Math.hypot(px, pz); if (l > 0.5) return { x: px / l, z: pz / l }; }
    if (d > want) return { x: dx / (d + t.r), z: dz / (d + t.r) };
    if (h.kit.style !== 'melee' && d < want * 0.5) return { x: -dx / (d + t.r), z: -dz / (d + t.r) };
    return null;
  }

  autoAct() {
    const h = this.player;
    const foes = this.livingFoes();
    if (!foes.length || !h.alive) return null;
    const near = this.foesNear(h.pos.x, h.pos.z, h.kit.style === 'melee' ? 4 : 9).length;
    if (h.energy >= 100 && (near >= 2 || foes.some(f => f.boss) || foes.length === 1)) return 'ult';
    if (h.skillCd <= 0 && near >= 1 && h.busy <= 0) return 'skill';
    for (let i = 0; i < this.supports.length; i++) {
      const s = this.supports[i];
      if (s.cd > 0) continue;
      const healer = s.id === 'lisa' || s.id === 'hinano' || s.id === 'sendo';
      if (healer && h.hp > h.maxHp * 0.75 && !foes.some(f => f.boss)) continue;
      return 'sup' + i;
    }
    return null;
  }

  // ---------- wave flow & end ----------
  checkWave() {
    if (this.waveClear || this.over) return;
    if (this.foes.some(f => f.alive)) return;
    this.waveClear = true;
    if (this.waveIdx < this.stage.waves.length - 1) {
      this.after(0.6, () => { if (this.over) return; this.waveIdx++; this.spawnWave(); });
      return;
    }
    if (this.stage.raid) return this.finish(true);
    if (this.headless) return this.finish(true);
    this.slow(0.25, 1);
    this.banner('FINISH!', 'finish');
    sfx('finish');
    this.after(0.9, () => this.startOutro());
  }

  finish(win) {
    if (this.over) return;
    this.over = true; this.won = win;
    this.endTime = this.time;
    const h = this.player;
    this.zones.forEach(z => this.removeZone(z)); this.zones = [];
    if (this.opts.onFinish) return this.opts.onFinish(this, win);
    if (this.headless) return;
    h.model.setState(win ? 'win' : 'ko');
    // Swing round in front of the leader and keep her on the left; results go on the right.
    this.camFocus = new THREE.Vector3(h.pos.x - 1.3, 0, h.pos.z);
    this.cam.to = { yaw: Math.PI * 0.92, dist: 4.4, h: 1.8 };
    h.facing = Math.atan2(-1.3 + Math.sin(this.cam.to.yaw) * 4.4, Math.cos(this.cam.to.yaw) * 4.4);
    this.syncModel(h);
    this.root.classList.add('scene', 'ended');
    sfx(win ? 'win' : 'lose');
    if (win && typeof playMusic === 'function') playMusic('victory');
    setTimeout(() => this.showResults(win), win ? 900 : 600);
  }

  showResults(win) {
    if (this.disposed) return;
    const st = this.stage, h = this.player, secs = Math.round(this.fightTime());
    SAVE.stats.battles++;
    SAVE.stats.bestCombo = Math.max(SAVE.stats.bestCombo, this.stat.maxCombo);
    if (win) { bumpDaily('wins'); SAVE.stats.wins++; }
    const bondUps = win ? this.team.map(id => addBondXp(id, BOND_WIN_XP)).filter(Boolean) : [];
    let rewardHtml = '', stars = null;
    if (st.raid) {
      const bossDown = this.foes.every(f => !f.alive || !f.boss) && this.waveClear;
      const score = Math.round((this.totalDmg || 0) * (bossDown ? 1.2 : 1));
      const r = raidResult(score);
      win = true;
      rewardHtml = `<div class="raid-score"><small>RAID SCORE</small><b>${score.toLocaleString()}</b>
          ${r.newBest ? '<em>NEW WEEKLY BEST</em>' : `<span>Weekly best ${r.best.toLocaleString()}</span>`}</div>
        ${r.label ? `<div class="rewards"><div class="first">TIER REWARDS</div>${r.label}</div>` : ''}`;
    } else if (win && st.event) {
      rewardHtml = eventStageResult(st);
    } else if (win && st.daily) {
      rewardHtml = dailyStageResult(st);
    } else if (win && st.tower) {
      const first = st.floor > SAVE.tower.best;
      if (first) SAVE.tower.best = st.floor;
      bumpDaily('farm');
      const label = first ? giveReward(st.reward) : '';
      const xp = 15 + st.level * 10, ranks = addPlayerXp(xp);
      rewardHtml = `<div class="rewards">${first ? `<div class="first">FLOOR ${st.floor} CLEARED</div>` : '<div class="first">ALREADY CLEARED</div>'}
        ${label ? `<span class="coin">${label}</span>` : ''}<span class="xp">+${xp} XP</span></div>
        ${ranks ? `<div class="rank-up">RANK UP! Rank ${SAVE.player.rank} · ${amt('gem', ranks * RANK_UP_GEMS)}</div>` : ''}`;
    } else if (win) {
      const id = st.id, first = !SAVE.cleared[id];
      stars = [true, h.hp >= h.maxHp * 0.5, secs <= stageTime(st)];
      const prev = SAVE.stars[id] || [false, false, false];
      const newStars = stars.filter((g, i) => g && !prev[i]).length;
      SAVE.stars[id] = prev.map((p, i) => p || stars[i]);
      const gems = Math.round(st.reward.gems * (first ? 1 : REPLAY_REWARD)) + newStars * STAR_GEMS;
      const exp = Math.round(st.reward.exp * (first ? 1 : REPLAY_EXP));
      SAVE.gems += gems; SAVE.exp += exp; SAVE.cleared[id] = true;
      const xp = 20 + st.level * 15, ranks = addPlayerXp(xp);
      rewardHtml = `<div class="objectives">${stageObjectives(st).map((t, i) =>
          `<div class="obj ${stars[i] ? 'ok' : ''}"><span>★</span>${t}${stars[i] && !prev[i] ? ' <em>NEW</em>' : ''}</div>`).join('')}</div>
        <div class="rewards">${first ? '<div class="first">FIRST CLEAR</div>' : ''}
        <span class="gem">${amt('gem', gems)}</span><span class="tok">${amt('token', exp)}</span><span class="xp">+${xp} XP</span></div>
        ${ranks ? `<div class="rank-up">RANK UP! Rank ${SAVE.player.rank} · ${amt('gem', ranks * RANK_UP_GEMS)}</div>` : ''}`;
    }
    if (!win && !st.raid) rewardHtml = `<div class="tips"><b>How to win next time</b>${this.defeatTips().map(t => `<p>${t}</p>`).join('')}</div>`;
    if (bondUps.length) rewardHtml += `<div class="bond-up">${bondUps.map(b => `${ic('heart')} ${CHARACTERS[b.id].short} bond Lv ${b.lvl}!`).join(' · ')}</div>`;
    persist();
    const units = [h, ...this.supports], top = Math.max(1, ...units.map(u => u.dmg || 0));
    const end = this.q('.end');
    end.classList.add('ab-end');
    end.innerHTML = `
      <div class="abe-quote" style="--c:${h.def.color}"><em>${win ? 'LEADER · ' : ''}${h.def.short}</em>${voice(h.id, win ? 'victory' : 'ko')}</div>
      <div class="end-box ${win ? 'win' : 'lose'}" role="dialog" aria-modal="true" aria-labelledby="abe-title">
        <div class="abe-kicker">${st.raid ? 'RANKED RAID' : win ? 'STREAM COMPLETE' : 'STREAM ENDED'}<span>${st.id || ''}</span></div>
        <h1 id="abe-title">${st.raid ? 'RAID OVER' : win ? 'VICTORY' : 'DEFEAT'}</h1>
        <div class="abe-stage">${st.name}</div>
        <div class="abe-scroll">
        <div class="abe-stats"><span>${ic('timer')} ${fmtClock(secs)}</span><span>${this.stat.maxCombo} max combo</span><span>${this.stat.breaks} breaks</span>${this.stat.perfect ? `<span>${this.stat.perfect} perfect dodges</span>` : ''}</div>
        ${rewardHtml}
        <div class="abe-section">SQUAD DAMAGE <span>${Math.round(units.reduce((n, u) => n + (u.dmg || 0), 0)).toLocaleString()} TOTAL</span></div>
        <div class="abe-damage">${units.map(u => `<div class="abe-unit" style="--unit:${u.def.color}"><div class="face" style="${faceStyle(u.id)}"></div><div><span>${u.def.short}</span><b>${Math.round(u.dmg || 0).toLocaleString()}</b><i><em style="width:${(u.dmg || 0) / top * 100}%"></em></i></div></div>`).join('')}</div>
        </div>
        <div class="end-btns"><button class="btn retry">Retry</button><button class="btn ${win && nextStageOf(st) ? '' : 'primary'} back">Continue</button>
          ${win && nextStageOf(st) ? `<button class="btn primary next">Next ${ic('play')}</button>` : ''}</div>
      </div>`;
    end.classList.remove('hidden');
    end.querySelector('.retry').onclick = () => this.exit('retry');
    end.querySelector('.back').onclick = () => this.exit('back');
    const nx = end.querySelector('.next');
    if (nx) nx.onclick = () => this.exit('next');
    (nx || end.querySelector('.back')).focus({ preventScroll: true });
  }

  defeatTips() {
    const out = [], st = this.stage;
    const avg = Math.round(this.team.reduce((a, id) => a + SAVE.chars[id].lvl, 0) / this.team.length), rec = recLevel(st.level);
    if (avg < rec) out.push(`Your squad averages <b>Lv ${avg}</b>; <b>Lv ${rec}</b> is recommended. Level up on the Members screen.`);
    out.push('Red zones on the ground show where an attack will land. Dodge (Space) just before it hits for a <b>Perfect Dodge</b>.');
    const weak = [...new Set(st.waves.flat().flatMap(k => ENEMIES[k].weak || []))];
    if (!this.team.some(id => weak.includes(CHARACTERS[id].element))) out.push(`Enemies here are weak to ${weak.map(w => `${elIc(w)} ${ELEMENTS[w].name}`).join(', ')}. Weakness hits Break them much faster.`);
    if (!this.team.some(id => ['lisa', 'sendo', 'hinano'].includes(id))) out.push('Bring Lisa, Sendo or Hinano as a support: their Support Skills heal or shield the leader.');
    if (this.team.length < 3) out.push('Fill all 3 squad slots: supports add Support Skills and 10% of their stats to the leader.');
    return out.slice(0, 3);
  }

  exit(reason) {
    if (this.disposed) return;
    this.dispose();
    this.onExit(reason, !!this.won);
  }

  dispose() {
    this.disposed = true; this.over = true;
    cancelAnimationFrame(this.raf);
    if (this.unbind) this.unbind();
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.renderer) {
      this.scene.traverse(o => { if (o.material && !o.material.isShaderMaterial) [].concat(o.material).forEach(m => m.dispose()); });
      if (this.composer) this.composer.dispose && this.composer.dispose();
      this.renderer.dispose();
      this.renderer.forceContextLoss && this.renderer.forceContextLoss();
    }
  }

  // ---------- pause ----------
  pause() {
    if (this.over || this.paused) return;
    this.paused = true; this.keys = {}; this.stick.on = false;
    this.renderPause();
  }
  renderPause() {
    const m = this.q('.pause-menu');
    m.innerHTML = `<div class="pm-box">
      <h2>PAUSED</h2><small>${this.stage.id || ''} · ${this.stage.name}</small>
      <div class="pm-row"><span>Auto battle</span><button class="toggle ${this.auto ? 'on' : ''}" data-pm="auto"><i></i></button></div>
      <div class="pm-row"><span>Camera shake</span><button class="toggle ${SAVE.settings.shake !== false ? 'on' : ''}" data-pm="shake"><i></i></button></div>
      <div class="pm-row"><span>Camera</span><div class="seg">${[['close', 'Close'], ['normal', 'Normal'], ['far', 'Far']].map(([v, l]) => `<button data-cam="${v}" class="${(SAVE.settings.camDist || 'normal') === v ? 'sel' : ''}">${l}</button>`).join('')}</div></div>
      <div class="pm-row"><span>Graphics</span><div class="seg">${[['high', 'High'], ['low', 'Fast']].map(([v, l]) => `<button data-gfx="${v}" class="${(SAVE.settings.gfx || 'high') === v ? 'sel' : ''}">${l}</button>`).join('')}</div></div>
      <div class="pm-keys"><kbd>WASD</kbd> Move <kbd>Space</kbd> Dodge <kbd>E</kbd> Skill <kbd>1</kbd><kbd>2</kbd> Supports <kbd>Q</kbd> Ultimate <kbd>F</kbd> Auto <kbd>Esc</kbd> Pause</div>
      <div class="pm-btns"><button class="pill yellow pm-resume">${ic('play')} Resume</button><button class="pill dark pm-help">${ic('info')} How to play</button>
        ${this.run ? '' : `<button class="pill dark pm-retry">${ic('replay')} Retry</button>`}<button class="pill dark pm-quit">${ic('close')} ${this.run ? 'Give up run' : 'Retreat'}</button></div>
    </div>`;
    m.classList.remove('hidden');
    m.querySelector('[data-pm="auto"]').onclick = () => { this.toggleAuto(); this.renderPause(); };
    m.querySelector('[data-pm="shake"]').onclick = () => { SAVE.settings.shake = SAVE.settings.shake === false; persist(); this.renderPause(); };
    m.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => { SAVE.settings.camDist = b.dataset.cam; persist(); if (this.phase === 'fight' && !this.over) this.cam.to = battleCam(); this.renderPause(); });
    m.querySelectorAll('[data-gfx]').forEach(b => b.onclick = () => { SAVE.settings.gfx = b.dataset.gfx; persist(); this.renderPause(); toast('Graphics change applies from the next battle'); });
    m.querySelector('.pm-resume').onclick = () => this.resume();
    m.querySelector('.pm-help').onclick = () => openHelp('battle');
    const rt = m.querySelector('.pm-retry');
    if (rt) rt.onclick = () => { this.paused = false; this.exit('retry'); };
    const quit = m.querySelector('.pm-quit');
    quit.onclick = () => {
      if (!quit.classList.contains('armed')) { quit.classList.add('armed'); quit.innerHTML = `${ic('close')} Tap again to ${this.run ? 'end the run' : 'retreat'}`; return; }
      this.paused = false; this.exit(this.run ? 'quit' : 'back');
    };
  }
  resume() {
    this.paused = false;
    this.q('.pause-menu').classList.add('hidden');
    this.last = performance.now();
  }

  // ---------- HUD ----------
  updateHud(force) {
    if (this.headless) return;
    const h = this.player;
    const hp = Math.max(0, h.hp) / h.maxHp;
    if (force || this.hudHp !== Math.round(h.hp) || this.hudSh !== h.shield) {
      this.hudHp = Math.round(h.hp); this.hudSh = h.shield;
      this.q('.abh-fill').style.width = (hp * 100) + '%';
      this.q('.abh-trail').style.width = (hp * 100) + '%';
      this.q('.abh-shield').style.width = Math.min(100, h.shield / h.maxHp * 100) + '%';
      this.q('.abh-num').textContent = `${Math.max(0, Math.round(h.hp)).toLocaleString()} / ${h.maxHp.toLocaleString()} HP`;
      this.q('.abh-guard').classList.toggle('hidden', h.shield <= 0);
      this.q('.abh-guard b').textContent = Math.round(h.shield).toLocaleString();
      this.root.classList.toggle('low-hp', hp < 0.3 && h.alive);
    }
    if (force) {
      this.root.style.setProperty('--member', h.def.color);
      this.q('.ab-b.skill').setAttribute('aria-label', h.kit.skill.name + ' (E)');
      this.q('.ab-b.ult').setAttribute('aria-label', h.kit.ult.name + ' (Q)');
      this.q('.ab-b.dodge').setAttribute('aria-label', 'Dodge (Space)');
      this.q('.abh-face').setAttribute('style', faceStyle(h.id) + `;--c:${h.def.color}`);
      this.q('.abh-name').innerHTML = `<b>${h.def.short}</b><span>Lv ${h.lvl}</span>${elIc(h.def.element)}`;
      this.q('.ab-b.ult .abb-face').setAttribute('style', faceStyle(h.id));
      this.q('.ab-b.ult').style.setProperty('--c', h.def.color);
    }
    // buttons
    const blocked = this.hasStatus(h, 'silence') || !h.alive;
    const ult = this.q('.ab-b.ult');
    ult.style.setProperty('--e', (h.energy / 100 * 360) + 'deg');
    ult.classList.toggle('ready', h.energy >= 100 && !blocked);
    const energy = Math.min(100, Math.max(0, Math.floor(h.energy)));
    if (force || this.hudEnergy !== energy || this.hudBlocked !== blocked) {
      this.hudEnergy = energy; this.hudBlocked = blocked;
      ult.querySelector('.abb-charge').textContent = blocked ? 'LOCKED' : energy >= 100 ? 'READY' : energy + '%';
    }
    const sk = this.q('.ab-b.skill'), skMax = h.skillCdMax || h.kit.skill.cd;
    sk.style.setProperty('--cd', (h.skillCd / skMax * 360) + 'deg');
    sk.classList.toggle('cool', h.skillCd > 0);
    sk.classList.toggle('ready', h.skillCd <= 0 && !blocked);
    sk.querySelector('.abb-t').textContent = h.skillCd > 0 ? Math.ceil(h.skillCd) : '';
    const dg = this.q('.ab-b.dodge');
    dg.classList.toggle('cool', h.dodge <= 0);
    dg.style.setProperty('--cd', (h.dodge <= 0 ? (1 - h.dodgeT / ACT.dodgeRecharge) * 360 : 0) + 'deg');
    // Rebuild charge pips only when a charge changes, not every HUD update.
    if (force || this.hudDodge !== h.dodge || this.hudDodgeMax !== h.dodgeMax) {
      this.hudDodge = h.dodge; this.hudDodgeMax = h.dodgeMax;
      dg.querySelector('.abb-pips').innerHTML = Array.from({ length: h.dodgeMax }, (_, i) => `<i class="${i < h.dodge ? 'on' : ''}"></i>`).join('');
    }
    this.supports.forEach((s, i) => {
      const b = this.q(`.ab-b[data-k="sup${i}"]`);
      if (!b) return;
      b.style.setProperty('--cd', (s.cd / s.cdMax * 360) + 'deg');
      b.classList.toggle('cool', s.cd > 0);
      b.classList.toggle('ready', s.cd <= 0 && s.on <= 0 && !blocked);
      if (force) b.setAttribute('aria-label', s.def.short + ': ' + s.kit.support.name + ' (' + (i + 1) + ')');
      b.querySelector('.abb-t').textContent = s.cd > 0 ? Math.ceil(s.cd) : '';
    });
    this.root.classList.toggle('silenced', this.hasStatus(h, 'silence'));
    this.q('.ab-autotag').classList.toggle('on', this.auto && this.phase === 'fight' && !this.over);
    // buffs
    const bk = h.statuses.map(s => s.label).join('|') + (h.shield ? '|SH' : '');
    if (bk !== this.hudBuffs) {
      this.hudBuffs = bk;
      this.q('.abh-buffs').innerHTML = h.statuses.map(s => `<span class="${s.key}">${s.label}</span>`).join('');
    }
    // clock
    const t = this.stage.raid ? this.raidTime : this.fightTime();
    const sec = Math.floor(t);
    if (sec !== this.hudSec) {
      this.hudSec = sec;
      this.q('.ab-clock b').textContent = fmtClock(sec);
      if (!this.stage.raid && !this.stage.tower && !this.stage.hub && !this.run && STAGES.some(s => s.id === this.stage.id)) {
        const lim = stageTime(this.stage);
        const sm = this.q('.ab-clock small');
        sm.textContent = `★ ${fmtClock(lim)}`;
        sm.classList.toggle('miss', sec > lim);
      }
      if (this.stage.raid) this.root.classList.toggle('raid-low', sec <= 10);
    }
    if (this.stage.raid) this.q('.ab-raid b').textContent = Math.round(this.totalDmg || 0).toLocaleString();
    // combo
    const cb = this.q('.ab-combo');
    if (this.combo >= 5) {
      cb.classList.remove('hidden');
      if (this.hudCombo !== this.combo) { this.hudCombo = this.combo; cb.querySelector('b').textContent = this.combo; cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop'); }
    } else cb.classList.add('hidden');
    // boss bar
    const b = this.bossUnit;
    if (b) {
      const f = Math.max(0, b.hp) / b.maxHp;
      this.q('.abb-fill').style.width = (f * 100) + '%';
      this.q('.abb-trail').style.width = (f * 100) + '%';
      this.q('.abb-poise i').style.width = (b.broken ? 0 : b.poise / b.maxPoise * 100) + '%';
      this.q('.ab-boss').classList.toggle('broken', b.broken);
      if (!b.alive) this.q('.ab-boss').classList.add('dead');
    }
  }

  // Enemy health bars and status tags follow their 3D positions.
  updateLabels() {
    const w = this.root.clientWidth, hgt = this.root.clientHeight, v = new THREE.Vector3();
    // Small health bar under the leader's feet.
    const h = this.player;
    if (!this.heroBar) { this.heroBar = document.createElement('div'); this.heroBar.className = 'abl-herobar'; this.heroBar.innerHTML = '<i class="f"></i><s></s>'; this.q('.ab-labels').appendChild(this.heroBar); }
    v.set(h.pos.x, 0, h.pos.z).project(this.camera);
    this.heroBar.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * hgt + 12}px)`;
    this.heroBar.style.display = this.phase === 'fight' && h.alive && !this.over && !this.closeUp ? '' : 'none';
    this.heroBar.firstChild.style.width = Math.max(0, h.hp / h.maxHp * 100) + '%';
    this.heroBar.lastChild.style.width = Math.min(100, h.shield / h.maxHp * 100) + '%';
    this.heroBar.classList.toggle('low', h.hp < h.maxHp * 0.3);
    this.foes.forEach(e => {
      // Arrow at the screen edge for enemies out of view (red while they wind up an attack).
      if (e.alive && e.spawnT <= 0) {
        v.set(e.pos.x, 0.6, e.pos.z).project(this.camera);
        const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * hgt, out = sx < 0 || sx > w || sy < 0 || sy > hgt || v.z > 1;
        if (out) {
          if (!e.off) { e.off = document.createElement('i'); e.off.className = 'abl-off'; this.q('.ab-labels').appendChild(e.off); }
          const cx = w / 2, cy = hgt / 2, dx = sx - cx, dy = sy - cy, k = Math.min((w / 2 - 26) / Math.abs(dx || 1), (hgt / 2 - 26) / Math.abs(dy || 1));
          e.off.style.transform = `translate(${cx + dx * k}px, ${cy + dy * k}px) rotate(${Math.atan2(dy, dx)}rad)`;
          e.off.classList.toggle('danger', e.mode === 'windup');
          e.off.classList.toggle('boss', e.boss);
          e.off.style.display = '';
        } else if (e.off) e.off.style.display = 'none';
      } else if (e.off) { e.off.remove(); e.off = null; }
      if (!e.bar || !e.alive) return;
      v.set(e.pos.x, (e.boss ? 3.2 : 1.45 * (e.ms || 1)) + (e.key === 'firewall' ? 0.2 : 0), e.pos.z).project(this.camera);
      e.bar.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * hgt}px)`;
      const f = Math.max(0, e.hp) / e.maxHp;
      if (e.barHp !== f) { e.barHp = f; e.bar.querySelector('.f').style.width = (f * 100) + '%'; e.bar.querySelector('.t').style.width = (f * 100) + '%'; }
      const pz = e.broken ? 0 : e.poise / e.maxPoise;
      if (e.barPz !== pz) { e.barPz = pz; e.bar.querySelector('.abl-poise i').style.width = (pz * 100) + '%'; }
      e.bar.classList.toggle('broken', e.broken);
      e.bar.classList.toggle('show', e.hp < e.maxHp || e.broken);
      const sk = e.statuses.map(s => s.label).join(' ');
      if (e.barSt !== sk) { e.barSt = sk; e.bar.querySelector('.abl-st').innerHTML = e.statuses.map(s => `<span class="${s.key}">${s.label}</span>`).join(''); }
    });
  }

  screenPos(u, y = 1.3) {
    const v = new THREE.Vector3(u.pos.x, y, u.pos.z).project(this.camera);
    return [(v.x * 0.5 + 0.5) * this.root.clientWidth, (-v.y * 0.5 + 0.5) * this.root.clientHeight];
  }

  number(u, n, cls, color) {
    if (this.headless) return;
    const lay = this.q('.ab-labels');
    if (lay.childElementCount > 70) return;
    const [x, y] = this.screenPos(u, (u.boss ? 2.6 : 1.1) + Math.random() * 0.4);
    const el = document.createElement('div');
    el.className = 'abl-num ' + cls;
    el.textContent = cls === 'heal' ? '+' + n.toLocaleString() : n.toLocaleString();
    if (color) el.style.setProperty('--c', color);
    el.style.left = (x + (Math.random() - 0.5) * 40) + 'px';
    el.style.top = y + 'px';
    lay.appendChild(el);
    setTimeout(() => el.remove(), cls === 'crit' ? 1000 : 800);
  }

  floatText(u, text, cls) {
    if (this.headless) return;
    const [x, y] = this.screenPos(u, u.boss ? 3.4 : 1.7);
    const el = document.createElement('div');
    el.className = 'abl-tag ' + cls;
    el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    this.q('.ab-labels').appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  banner(text, cls = '') {
    if (this.headless) return;
    const b = this.q('.ab-banner');
    b.className = 'ab-banner ' + cls;
    b.innerHTML = `<b>${text}</b>`;
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => b.classList.remove('show'), cls === 'finish' ? 1400 : 1300);
  }

  combatCue(kind, title, detail, color) {
    if (this.headless) return;
    // One cue at a time keeps simultaneous Breaks from hiding the arena.
    this.root.querySelector('.ab-combat-cue')?.remove();
    const cue = document.createElement('div');
    cue.className = 'ab-combat-cue ' + kind;
    cue.style.setProperty('--cue', color);
    cue.innerHTML = '<i></i><div><b></b><span></span></div><i></i>';
    cue.querySelector('b').textContent = title;
    cue.querySelector('span').textContent = detail;
    this.root.appendChild(cue);
    setTimeout(() => cue.remove(), 1100);
  }

  breakSplash(e, bfx, src, charge) {
    if (this.headless) return;
    if (e.boss || charge) this.combatCue('break', charge ? 'CHARGE CANCELLED' : 'BOSS BREAK', 'OPENING CREATED', src.def.color);
    const layer = this.q('.ab-labels');
    if (layer.querySelectorAll('.ab-break').length >= 3) layer.querySelector('.ab-break').remove();
    const el = document.createElement('div');
    el.className = 'ab-break';
    el.style.setProperty('--c', ELEMENTS[src.def.element] ? ELEMENTS[src.def.element].color : '#fff');
    el.innerHTML = `<b>BREAK</b><span>${bfx ? `${elIc(src.def.element)} ${bfx.name}` : ''}${charge ? ' · CHARGE CANCELLED' : ''}</span>`;
    const [x, y] = this.screenPos(e, e.boss ? 2.4 : 1.2);
    el.style.left = Math.max(110, Math.min(this.root.clientWidth - 110, x)) + 'px';
    el.style.top = Math.max(110, y) + 'px';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  flashScreen(kind) {
    if (SAVE.settings.flashes === false) return;
    const f = this.q('.ab-flash');
    f.className = 'ab-flash ' + kind;
    void f.offsetWidth;
    f.classList.add('on');
  }

  screenTint(color, dur) {
    const t = this.q('.ab-tint');
    t.style.background = color;
    t.style.transition = 'none'; t.style.opacity = 0.55;
    void t.offsetWidth;
    t.style.transition = `opacity ${dur}s ease-in`; t.style.opacity = 0;
  }

  // A support's name pops up when she jumps in.
  callout(s) {
    const el = document.createElement('div');
    el.className = 'ab-callout';
    el.style.setProperty('--c', s.def.color);
    el.innerHTML = `<i style="${faceStyle(s.id)}"></i><b>${s.kit.support.name}</b><span>${s.def.short}</span>`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  // Ultimate cut-in: the member's art slides across, then the camera punches in.
  cutIn(u, name) {
    const cut = SAVE.settings.cutins || 'full';
    this.snd('ult');
    // Dim the arena and let the glow bloom harder while the Ultimate plays out.
    this.screenTint('#120a24', 1.4);
    if (this.bloom) this.bloom.strength = 0.8;
    this.punch = 1;
    this.fx.flatRing(u.pos.x, u.pos.z, u.def.color, 0.5, 5, 0.6, { bright: 1.4, alpha: 0.8 });
    this.stars.emit(u.pos.x, 0.8, u.pos.z, { n: 24, speed: 5, color: u.def.color, life: 0.9, size: 0.5, grav: 0, up: 0.8 });
    this.camZoomTo = 0.62;
    setTimeout(() => { this.camZoomTo = 1; }, cut === 'off' ? 500 : 1300);
    if (cut === 'off') return;
    // 3D close-up: the camera cuts in on her face against a burst of rays in her colour.
    const dur = cut === 'short' ? 0.55 : 1.0;
    const back = new THREE.Mesh(geo('cutBack', () => new THREE.PlaneGeometry(9, 9)),
      new THREE.MeshBasicMaterial({ map: raysTex(), color: new THREE.Color(u.def.color).lerp(new THREE.Color('#ffffff'), 0.25), fog: false }));
    back.position.set(u.pos.x - Math.sin(u.facing) * 0.8, (u.model.faceY || 1) * (u.ms || 1), u.pos.z - Math.cos(u.facing) * 0.8);
    this.scene.add(back);
    this.closeUp = { u, t: 0, dur, back };
    u.model.play('cheer');
    u.model.setFace(2, dur);
    const el = this.q('.ab-cut');
    el.style.setProperty('--c', u.def.color);
    el.innerHTML = `<i class="abc-band"></i><div class="abc-name"><em>${u.def.short} / ULTIMATE</em><b>${name}</b></div>`;
    el.classList.remove('hidden', 'go');
    void el.offsetWidth;
    el.classList.add('go');
    this.cutT = dur;
    setTimeout(() => el.classList.add('hidden'), dur * 1000 + 250);
  }

  endCloseUp() {
    const c = this.closeUp;
    if (!c) return;
    this.scene.remove(c.back);
    c.back.material.dispose();
    this.closeUp = null;
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  // Multi-hit Skills and Ultimates add their hits up into one "TOTAL" popup.
  startTally(u, kind) { this.tallies.push({ u, kind, sum: 0, hits: 0, start: this.time, last: this.time }); }
  updateTallies() {
    this.tallies = this.tallies.filter(t => {
      if (this.time - t.last < 0.7 || this.time - t.start < 0.5) return true;
      if (t.hits >= 2 && !this.headless) this.totalPopup(t);
      return false;
    });
  }
  totalPopup(t) {
    const u = t.u.kind === 'support' && t.u.model && t.u.model.root && t.u.model.root.visible ? t.u : this.player;
    const [x, y] = this.screenPos(u, 2.4);
    const el = document.createElement('div');
    el.className = 'abl-total';
    el.style.setProperty('--c', t.u.def.color);
    el.innerHTML = `<small>TOTAL</small><b>${t.sum.toLocaleString()}</b>`;
    el.style.left = (x + 60) + 'px'; el.style.top = y + 'px';
    this.q('.ab-labels').appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
  // The skill's name pops up over whoever used it.
  skillName(u, name) {
    if (this.headless) return;
    const [x, y] = this.screenPos(u, 2.1);
    const el = document.createElement('div');
    el.className = 'abl-skill';
    el.style.setProperty('--c', u.def.color);
    el.textContent = name;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    this.q('.ab-labels').appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  // The stage name across the top as the fight begins.
  titleCard() {
    if (this.headless) return;
    const st = this.stage, el = this.q('.ab-title');
    el.querySelector('b').textContent = st.name;
    el.querySelector('span').textContent = st.raid ? 'RANKED RAID' : st.run ? 'BRACKET RUN' : st.tower ? `STREAM TOWER · FLOOR ${st.floor}/${TOWER_FLOORS}`
      : st.event ? 'EVENT' : st.daily ? 'DAILY STREAM' : `STAGE ${st.id}${this.stage.waves.length > 1 ? ` · ${this.stage.waves.length} WAVES` : ''}`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  snd(name, gap = 0) {
    if (this.headless) return;
    const now = performance.now();
    if (gap && this.sndAt[name] && now - this.sndAt[name] < gap * 1000) return;
    this.sndAt[name] = now;
    sfx(name);
  }

  // ---------- tutorial tips ----------
  coach(key) {
    if (!this.stage.tutorial || this.coached[key] || this.headless) return;
    const tips = {
      move: 'Move with <kbd>WASD</kbd> or drag on the left side of the screen.',
      attack: 'Your leader <b>attacks on her own</b> when an enemy is in reach. Just stay close.',
      skill: 'Press <kbd>E</kbd> (or the Skill button) to use your leader\'s <b>Skill</b>.',
      dodge: '<b>Red zones</b> show where an attack will land. Press <kbd>Space</kbd> to dodge. Dodge right before it hits for a <b>Perfect Dodge</b>!',
      support: 'Press <kbd>1</kbd> or <kbd>2</kbd> to call a <b>support</b> in for her Support Skill.',
      ult: 'Energy is full! Press <kbd>Q</kbd> for your <b>Ultimate</b>.',
      break: 'You emptied the white bar: <b>BREAK!</b> Broken enemies are stunned and take extra damage.',
      charge: 'A <b>charged attack</b> is coming. Break the enemy to cancel it, or get out of the zone!',
    };
    if (!tips[key]) return;
    if (this.coachKey && !this.coached[this.coachKey] && key !== 'dodge' && key !== 'ult') return;
    this.coachKey = key;
    const c = this.q('.ab-coach');
    c.querySelector('p').innerHTML = tips[key];
    c.classList.remove('hidden');
    clearTimeout(this.coachT);
    this.coachT = setTimeout(() => this.coachDone(key), 7000);
    if (key === 'attack') this.after(3, () => { this.coachDone('attack'); this.coach('skill'); });
    if (key === 'skill' || key === 'attack') this.after(9, () => { if (!this.coached.support) this.coach('support'); });
  }
  coachDone(key) {
    if (this.coached[key] && key !== this.coachKey) return;
    this.coached[key] = true;
    if (this.coachKey === key && !this.headless) this.q('.ab-coach').classList.add('hidden');
    if (key === 'move' && this.stage.tutorial) this.after(0.5, () => this.coach('attack'));
  }
}

// Shot looks for auto-attacks.
const SHOT_STYLE = {
  sun:    { color: '#ffb547', size: 0.7, speed: 15, snd: 'sparkle' },
  sunBig: { color: '#ffcf5a', size: 1.2, speed: 13, star: true, snd: 'sparkle' },
  bullet: { color: '#7f9cff', size: 0.5, speed: 30, snd: 'shot' },
  paint:  { color: '#ff5a5a', size: 0.9, speed: 14, snd: 'splat' },
  donut:  { color: '#e8b26a', size: 0.8, speed: 12, snd: 'munch' },
  cake:   { color: '#ff8fb8', size: 1.1, speed: 11, star: true, snd: 'munch' },
};

const RAID_HP_MULT_A = 12;
const CHIBI_SCALE = 1.15;   // members are drawn a little bigger than their hit circles
// Battle camera: high and fairly far back, so you see the whole fight around you.
const BATTLE_CAM = { yaw: 0, dist: 7.4, h: 9.0 };
// Camera distance setting (pause menu): multiplies the battle camera's distance and height.
const CAM_ZOOM = { close: 0.8, normal: 1, far: 1.22 };
const battleCam = () => { const k = CAM_ZOOM[SAVE.settings.camDist] || 1; return { yaw: 0, dist: BATTLE_CAM.dist * k, h: BATTLE_CAM.h * k }; };
// Where the cast stands during the opening scene: leader in front, supports and guests fanned out behind.
const SCENE_MARKS = [[0, 3.0], [-1.6, 3.3], [1.6, 3.3], [-3.1, 3.9], [3.1, 3.9], [-4.5, 4.7], [4.5, 4.7]];

function turnTo(a, b, k) { return a + angDiff(b, a) * Math.min(1, k); }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function z_left(z) { return z.dur - z.t; }
// Max HP of the leader, or a support's own HP (supports never take damage).
const baseHp = u => (u.kind === 'hero' ? u.maxHp : u.hp);
const fmtClock = s => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

// Runs a battle without graphics as fast as possible (for balancing).
// Returns { won, time, hp, ... }. Needs three.js loaded.
function simulateBattle(stage, team, opts = {}) {
  const b = new ActionBattle(document.createElement('div'), stage, team, () => {}, Object.assign({ headless: true }, opts));
  const dt = 1 / 30;
  while (!b.over && b.time < (opts.maxTime || 400)) b.step(dt);
  return { won: !!b.won, time: Math.round(b.time), hp: Math.round(b.player.hp / b.player.maxHp * 100), dmg: Math.round(b.totalDmg || 0), stats: b.stat };
}
