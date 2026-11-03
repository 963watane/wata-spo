// Sound effects in an anime-gacha style: glassy chimes, harp runs, airy swooshes,
// sparkle showers and layered impacts with a sub-bass punch, all through a hall
// reverb. Every sound is rendered once (OfflineAudioContext) into a buffer, so
// sfx('hit') plays instantly; busy sounds get a few variations so repeats don't
// sound copy-pasted. Plain buttons are silent on purpose: sounds mark moments.
// Follows SAVE.settings.sound / volume. Real recordings can replace any sound
// (see assets/sfx/README.txt).

const SFX_RATE = 32000;
let audioCtx = null, sfxOut = null;
const SFX_BUF = {};       // name -> [AudioBuffer, ...] variations
const SFX_WAIT = {};      // name -> render in progress
let sfxFiles = null;      // name -> AudioBuffer from assets/sfx (optional)

function audio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    // A gentle limiter so stacked sounds never clip.
    const lim = audioCtx.createDynamicsCompressor();
    lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 10; lim.attack.value = 0.002; lim.release.value = 0.2;
    sfxOut = audioCtx.createGain();
    sfxOut.connect(lim); lim.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ---------- rendering helpers ----------
let rnd = Math.random;   // seeded while a sound renders, so variations are repeatable
const seeded = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rr = (a, b) => a + (b - a) * rnd();
const N = m => 440 * Math.pow(2, (m - 69) / 12);   // MIDI note -> Hz
const PENTA = [0, 2, 4, 7, 9];                     // E major pentatonic (64 = E4)
function snapPenta(m) {
  const rel = ((m - 64) % 12 + 12) % 12;
  let best = 0;
  PENTA.forEach(p => { if (Math.abs(p - rel) < Math.abs(best - rel)) best = p; });
  return m - rel + best;
}

// Noise and reverb impulses, made once per sample rate.
const SHARED = {};
function shared(c) {
  if (SHARED.rate === c.sampleRate) return SHARED;
  const sr = c.sampleRate, white = c.createBuffer(1, sr * 2, sr), pink = c.createBuffer(1, sr * 2, sr);
  const w = white.getChannelData(0), p = pink.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < w.length; i++) {
    const x = Math.random() * 2 - 1;
    w[i] = x;
    b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
    b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
    p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
  }
  Object.assign(SHARED, { rate: sr, white, pink, hall: impulse(c, 2.6, 0.5), room: impulse(c, 0.8, 0.4) });
  return SHARED;
}

// Stereo reverb: a few early reflections, then a tail that darkens as it decays.
function impulse(c, secs, bright) {
  const sr = c.sampleRate, n = Math.floor(sr * secs), buf = c.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      lp += (Math.random() * 2 - 1 - lp) * (bright * (1 - t) + 0.05);
      d[i] = lp * Math.pow(1 - t, 2.4) * Math.min(1, i / (sr * 0.012));
    }
    [0.011, 0.019, 0.027, 0.041].forEach((s, j) => { const i = Math.floor(sr * (s + ch * 0.0031)); if (i < n) d[i] += (0.45 - j * 0.09) * (ch ? -1 : 1); });
  }
  return buf;
}

const SAT = {};
function satCurve(k) {
  if (SAT[k]) return SAT[k];
  const n = 2048, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; curve[i] = Math.tanh(x * k) / Math.tanh(k); }
  return (SAT[k] = curve);
}

// Per-render mix bus: dry out, a reverb send and an optional ping-pong delay send.
function makeBus(c, def) {
  const S = shared(c), out = c.createGain();
  out.connect(c.destination);
  const verb = c.createConvolver(), vin = c.createGain(), hp = c.createBiquadFilter();
  verb.buffer = S[def.room || 'hall'];
  hp.type = 'highpass'; hp.frequency.value = 260;
  vin.connect(hp); hp.connect(verb); verb.connect(out);
  let din = null;
  if (def.delay) {
    din = c.createGain();
    const l = c.createDelay(1), r = c.createDelay(1), fb = c.createGain(), tone = c.createBiquadFilter(), merge = c.createChannelMerger(2), wet = c.createGain();
    l.delayTime.value = def.delay; r.delayTime.value = def.delay;
    fb.gain.value = 0.36; tone.type = 'lowpass'; tone.frequency.value = 5200; wet.gain.value = 0.55;
    din.connect(l); l.connect(tone); tone.connect(r); r.connect(fb); fb.connect(l);
    l.connect(merge, 0, 0); r.connect(merge, 0, 1);
    merge.connect(wet); wet.connect(out); wet.connect(vin);
  }
  return { out, vin, din };
}

// A voice channel: gain -> (saturation) -> pan -> dry, reverb and delay sends.
function chan(c, B, { vol = 1, pan = 0, verb = 0.2, delay = 0, sat = 0 } = {}) {
  const g = c.createGain();
  g.gain.value = vol;
  let node = g;
  if (sat) { const ws = c.createWaveShaper(); ws.curve = satCurve(sat); ws.oversample = '2x'; node.connect(ws); node = ws; }
  const p = c.createStereoPanner();
  p.pan.value = pan;
  node.connect(p); p.connect(B.out);
  if (verb) { const s = c.createGain(); s.gain.value = verb; p.connect(s); s.connect(B.vin); }
  if (delay && B.din) { const s = c.createGain(); s.gain.value = delay; p.connect(s); s.connect(B.din); }
  return g;
}

function env(param, t, { a = 0.004, d = 0.3, hold = 0, peak = 1 }) {
  param.setValueAtTime(0.0001, Math.max(0, t));
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  if (hold) param.setValueAtTime(Math.max(0.0002, peak), t + a + hold);
  param.exponentialRampToValueAtTime(0.0001, t + a + hold + d);
}

// ---------- voices ----------
// Oscillator(s), optionally several detuned copies, gliding from f to f2.
function tone(c, dst, { f, f2 = 0, type = 'sine', at = 0, a = 0.004, d = 0.3, hold = 0, vol = 0.3, glide = 0, voices = 1, spread = 0 }) {
  const g = c.createGain(), end = at + a + hold + d;
  env(g.gain, at, { a, d, hold, peak: vol / Math.sqrt(voices) });
  g.connect(dst);
  for (let i = 0; i < voices; i++) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + (glide || a + hold + d));
    if (voices > 1) o.detune.value = (i / (voices - 1) - 0.5) * 2 * spread;
    o.connect(g); o.start(at); o.stop(end + 0.05);
  }
}

// Struck objects: sine partials at fixed ratios, each with its own decay.
const MODES = {
  glass:   { r: [1, 2.32, 4.25, 6.63], a: [1, 0.45, 0.22, 0.1], d: [1, 0.6, 0.35, 0.2] },
  celesta: { r: [1, 2, 3, 4.16], a: [1, 0.32, 0.1, 0.05], d: [1, 0.5, 0.3, 0.18] },
  glock:   { r: [1, 2.76, 5.4, 8.93], a: [1, 0.4, 0.2, 0.08], d: [1, 0.45, 0.22, 0.12] },
  bowl:    { r: [1, 2.71, 5.15, 8.1], a: [1, 0.55, 0.28, 0.12], d: [1, 0.8, 0.55, 0.3] },
  metal:   { r: [1, 1.58, 2.33, 3.17, 4.3], a: [1, 0.8, 0.6, 0.45, 0.3], d: [1, 0.7, 0.5, 0.35, 0.25] },
  coin:    { r: [1, 2.32, 3.86, 5.41], a: [1, 0.7, 0.4, 0.25], d: [1, 0.6, 0.4, 0.25] },
  wood:    { r: [1, 2.6, 4.1], a: [1, 0.35, 0.12], d: [1, 0.4, 0.18] },
};
function strike(c, dst, { f, mode = 'glass', at = 0, d = 0.8, vol = 0.2, shimmer = 1.3 }) {
  const m = MODES[mode];
  m.r.forEach((r, i) => {
    const fr = f * r;
    if (fr > c.sampleRate / 2.3) return;
    // A twin a hair sharp beats slowly against the partial: glass shimmer.
    [0, 1].forEach(tw => {
      const o = c.createOscillator(), g = c.createGain(), dd = d * m.d[i];
      o.frequency.value = fr + (tw ? shimmer * (i + 1) : 0);
      env(g.gain, at, { a: 0.0015, d: dd, peak: vol * m.a[i] * (tw ? 0.35 : 0.65) });
      o.connect(g); g.connect(dst); o.start(at); o.stop(at + dd + 0.05);
    });
  });
}

// Plucked string (Karplus-Strong with an allpass for exact tuning): harp and koto.
function pluck(c, dst, { f, at = 0, d = 1.2, vol = 0.3, bright = 0.6 }) {
  const sr = c.sampleRate, n = Math.floor(sr * d), buf = c.createBuffer(1, n, sr), out = buf.getChannelData(0);
  const Nf = sr / f - 0.5, L = Math.max(2, Math.floor(Nf)), frac = Nf - L, C = (1 - frac) / (1 + frac);
  const ring = new Float32Array(L);
  for (let i = 0; i < L; i++) ring[i] = rnd() * 2 - 1;
  for (let k = 0; k < Math.round((1 - bright) * 4); k++) for (let i = 1; i < L; i++) ring[i] = (ring[i] + ring[i - 1]) * 0.5;
  const damp = 0.9965 - (1 - bright) * 0.003;
  let idx = 0, apX = 0, apY = 0;
  for (let i = 0; i < n; i++) {
    const x0 = ring[idx], x1 = ring[(idx + 1) % L];
    out[i] = x0;
    const avg = (x0 + x1) * 0.5 * damp, y = C * avg + apX - C * apY;
    apX = avg; apY = y; ring[idx] = y;
    idx = (idx + 1) % L;
  }
  for (let i = Math.max(0, n - 300); i < n; i++) out[i] *= (n - i) / 300;
  const s = c.createBufferSource(), g = c.createGain();
  s.buffer = buf; g.gain.value = vol;
  s.connect(g); g.connect(dst); s.start(at);
}

// Filtered noise, optionally sweeping (f -> f2) and panning (pan: [from, to]).
function noise(c, dst, { at = 0, a = 0.003, d = 0.2, hold = 0, vol = 0.3, color = 'white', type = 'bandpass', f = 2000, f2 = 0, q = 0.8, pan = null }) {
  const S = shared(c), s = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain(), end = at + a + hold + d;
  s.buffer = S[color]; s.loop = true;
  flt.type = type; flt.Q.value = q; flt.frequency.setValueAtTime(f, at);
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, end);
  env(g.gain, at, { a, d, hold, peak: vol });
  s.connect(flt); flt.connect(g);
  if (pan) {
    const p = c.createStereoPanner();
    p.pan.setValueAtTime(pan[0], at); p.pan.linearRampToValueAtTime(pan[1], end);
    g.connect(p); p.connect(dst);
  } else g.connect(dst);
  s.start(at, rnd() * 1.5); s.stop(end + 0.05);
}

// Rising swell (reverse-cymbal feel) that peaks exactly at at + dur.
function riser(c, dst, { at = 0, dur = 0.8, vol = 0.25, f = 400, f2 = 7000, q = 1.2 }) {
  const S = shared(c), s = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
  s.buffer = S.white; s.loop = true;
  flt.type = 'bandpass'; flt.Q.value = q;
  flt.frequency.setValueAtTime(f, at); flt.frequency.exponentialRampToValueAtTime(f2, at + dur);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + dur); g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.05);
  s.connect(flt); flt.connect(g); g.connect(dst);
  s.start(at, rnd()); s.stop(at + dur + 0.1);
}

// Detuned saw stack through a lowpass that can open up: chords, swells, brass stabs.
function saws(c, dst, { notes, at = 0, a = 0.05, d = 1, hold = 0, vol = 0.1, cutoff = 1200, cutoff2 = 0, q = 0.7, voices = 5, spread = 14 }) {
  const flt = c.createBiquadFilter(), g = c.createGain(), end = at + a + hold + d;
  flt.type = 'lowpass'; flt.Q.value = q; flt.frequency.setValueAtTime(cutoff, at);
  if (cutoff2) flt.frequency.exponentialRampToValueAtTime(cutoff2, at + (a + hold + d) * 0.6);
  env(g.gain, at, { a, d, hold, peak: vol });
  flt.connect(g); g.connect(dst);
  notes.forEach(fr => {
    for (let i = 0; i < voices; i++) {
      const o = c.createOscillator(), og = c.createGain(), p = c.createStereoPanner();
      o.type = 'sawtooth'; o.frequency.value = fr;
      o.detune.value = (i / (voices - 1) - 0.5) * 2 * spread + rr(-3, 3);
      og.gain.value = 1 / (voices * Math.sqrt(notes.length));
      p.pan.value = (i / (voices - 1) - 0.5) * 1.2;
      o.connect(og); og.connect(p); p.connect(flt);
      o.start(at + rnd() * 0.01); o.stop(end + 0.05);
    }
  });
}

// Sub-bass drop under impacts.
const boom = (c, dst, { at = 0, f = 110, f2 = 32, d = 0.6, vol = 0.6 }) => tone(c, dst, { f, f2, at, a: 0.003, d, vol, glide: d * 0.7 });

// Shower of tiny chimes on the pentatonic scale, spread across the stereo field.
function glitter(c, dst, { at = 0, span = 0.4, count = 10, lo = 88, hi = 108, vol = 0.05, mode = 'glock', up = false }) {
  for (let i = 0; i < count; i++) {
    const k = i / Math.max(1, count - 1);
    const m = snapPenta(Math.round(up ? lo + (hi - lo) * k : rr(lo, hi)));
    const p = c.createStereoPanner();
    p.pan.value = rr(-0.85, 0.85); p.connect(dst);
    strike(c, p, { f: N(m), mode, at: at + (up ? k * span : rnd() * span), d: rr(0.12, 0.38), vol: vol * rr(0.6, 1) });
  }
}

// Crunchy noise burst (bites, gravel, paper).
function crunch(c, dst, { at = 0, d = 0.07, vol = 0.3, f = 2500, rate = 38 }) {
  const am = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
  am.gain.value = 0.5; lfo.type = 'square'; lfo.frequency.value = rate; depth.gain.value = 0.5;
  lfo.connect(depth); depth.connect(am.gain); am.connect(dst);
  lfo.start(at); lfo.stop(at + d + 0.05);
  noise(c, am, { at, d, vol, f, q: 1.4 });
}

// Layered hit: crack + crunchy body + sub thump, pushed through saturation.
function punch(c, B, { at = 0, vol = 1, bright = 1, low = 1 } = {}) {
  const s = chan(c, B, { vol, verb: 0.12, sat: 2.4 });
  noise(c, s, { at, color: 'white', type: 'highpass', f: rr(2600, 3800) * bright, d: 0.012, vol: 0.5 });
  noise(c, s, { at, color: 'pink', f: rr(1100, 1700) * bright, f2: 380, q: 0.8, a: 0.002, d: 0.09, vol: 0.85 });
  tone(c, s, { at, f: rr(140, 170), f2: 50, d: 0.14 * low, vol: 0.9, glide: 0.1 });
}

// ---------- the sounds ----------
// level: loudness target (dBFS of the loudest 40 ms). variants: renders per sound.
// vary: random pitch spread on playback. room / delay: reverb type, ping-pong time.
const SOUNDS = {
  // Interface (meaningful moments only; buttons themselves are silent)
  select: { level: -26, dur: 1, delay: 0.12, build: (c, B) => {
    const o = chan(c, B, { verb: 0.3, delay: 0.18 });
    strike(c, o, { f: N(95), d: 0.7, vol: 0.5 });
    strike(c, o, { f: N(100), at: 0.04, d: 0.6, vol: 0.26 });
    noise(c, chan(c, B, { verb: 0.25 }), { color: 'pink', f: 3500, f2: 9000, q: 1.1, a: 0.015, d: 0.09, vol: 0.16 });
  } },
  tap: { level: -24, dur: 0.9, delay: 0.1, build: (c, B) => {
    const o = chan(c, B, { verb: 0.25, delay: 0.12 });
    pluck(c, o, { f: N(88), d: 0.6, vol: 0.5, bright: 0.7 });
    strike(c, o, { f: N(95), at: 0.01, d: 0.5, vol: 0.3 });
    tone(c, chan(c, B, { verb: 0 }), { f: 180, f2: 90, d: 0.07, vol: 0.35 });
  } },
  back: { level: -29, dur: 0.7, build: (c, B) => {
    const o = chan(c, B, { verb: 0.25 });
    strike(c, o, { f: N(92), d: 0.4, vol: 0.4 });
    strike(c, o, { f: N(88), at: 0.06, d: 0.45, vol: 0.35 });
  } },
  whoosh: { level: -31, dur: 0.8, build: (c, B) => {
    noise(c, chan(c, B, { verb: 0.3 }), { color: 'pink', f: 450, f2: 4200, q: 1.3, a: 0.16, d: 0.3, vol: 0.5, pan: [-0.6, 0.6] });
    noise(c, chan(c, B, { verb: 0.4 }), { type: 'highpass', f: 6000, f2: 9000, at: 0.1, a: 0.08, d: 0.28, vol: 0.07, pan: [-0.3, 0.5] });
  } },
  open: { level: -27, dur: 1.2, delay: 0.14, build: (c, B) => {
    noise(c, chan(c, B, { verb: 0.3 }), { color: 'pink', f: 1200, f2: 6000, q: 1, a: 0.12, d: 0.25, vol: 0.25 });
    const o = chan(c, B, { verb: 0.45, delay: 0.2 });
    [88, 95, 100].forEach((m, i) => strike(c, o, { f: N(m), mode: 'celesta', at: 0.08 + i * 0.03, d: 0.8, vol: 0.22 }));
  } },
  coin: { level: -22, dur: 1, variants: 2, vary: 0.03, delay: 0.1, build: (c, B) => {
    const o = chan(c, B, { verb: 0.3, delay: 0.1 });
    strike(c, o, { f: rr(2500, 2700), mode: 'coin', d: 0.35, vol: 0.5 });
    strike(c, o, { f: rr(3000, 3250), mode: 'coin', at: 0.075, d: 0.4, vol: 0.45 });
    glitter(c, chan(c, B, { verb: 0.5 }), { at: 0.1, span: 0.3, count: 5, lo: 96, hi: 108, vol: 0.06 });
  } },
  // Rewards screen: a shimmer swell that blooms into a chord, chimes and sparkles.
  reward: { level: -18, dur: 2.6, delay: 0.16, build: (c, B) => {
    riser(c, chan(c, B, { verb: 0.4 }), { dur: 0.45, vol: 0.22, f: 800, f2: 9000 });
    const t = 0.45, o = chan(c, B, { verb: 0.5, delay: 0.15 });
    saws(c, chan(c, B, { verb: 0.45, sat: 1.5 }), { notes: [64, 68, 71, 75, 78].map(N), at: t, a: 0.02, d: 1.6, vol: 0.18, cutoff: 900, cutoff2: 5000 });
    [88, 92, 95, 100, 104].forEach((m, i) => strike(c, o, { f: N(m), mode: 'celesta', at: t + 0.02 + i * 0.055, d: 1, vol: 0.3 }));
    boom(c, chan(c, B, { verb: 0.15, sat: 2 }), { at: t, f: 95, f2: 40, d: 0.7, vol: 0.5 });
    glitter(c, chan(c, B, { verb: 0.6 }), { at: t + 0.1, span: 0.9, count: 14, lo: 95, hi: 112, vol: 0.05 });
  } },
  rewardItem: { level: -25, dur: 0.8, variants: 3, vary: 0.02, delay: 0.12, build: (c, B) => {
    const o = chan(c, B, { verb: 0.35, delay: 0.12 });
    tone(c, o, { f: 700, f2: 1500, d: 0.05, vol: 0.22, glide: 0.04 });
    strike(c, o, { f: N(snapPenta(Math.round(rr(92, 104)))), mode: 'glock', at: 0.02, d: 0.5, vol: 0.4 });
    glitter(c, chan(c, B, { verb: 0.5 }), { at: 0.04, span: 0.15, count: 3, lo: 100, hi: 110, vol: 0.05 });
  } },
  chest: { level: -19, dur: 2, delay: 0.15, build: (c, B) => {
    strike(c, chan(c, B, { verb: 0.15 }), { f: 170, mode: 'wood', d: 0.35, vol: 0.7 });
    noise(c, chan(c, B, { verb: 0.1 }), { type: 'highpass', f: 2500, d: 0.03, vol: 0.2 });
    riser(c, chan(c, B, { verb: 0.4 }), { at: 0.05, dur: 0.35, vol: 0.15, f: 1500, f2: 9000 });
    const o = chan(c, B, { verb: 0.5, delay: 0.15 });
    [76, 80, 83, 88, 92, 95].forEach((m, i) => strike(c, o, { f: N(m), mode: 'celesta', at: 0.3 + i * 0.05, d: 0.9, vol: 0.3 }));
    glitter(c, chan(c, B, { verb: 0.6 }), { at: 0.35, span: 0.8, count: 12, lo: 96, hi: 112, vol: 0.05 });
  } },
  levelup: { level: -18, dur: 2.4, delay: 0.14, build: (c, B) => {
    const h = chan(c, B, { verb: 0.4, delay: 0.1 });
    [64, 66, 68, 71, 73, 76, 78, 80, 83, 85, 88].forEach((m, i) => pluck(c, h, { f: N(m), at: i * 0.028, d: 1.1, vol: 0.3, bright: 0.65 }));
    const t = 0.32, o = chan(c, B, { verb: 0.5, delay: 0.15 });
    [88, 95, 100].forEach((m, i) => strike(c, o, { f: N(m), at: t + i * 0.02, d: 1.2, vol: 0.3 }));
    saws(c, chan(c, B, { verb: 0.5 }), { notes: [52, 59, 64, 68].map(N), at: t, a: 0.08, d: 1.4, vol: 0.12, cutoff: 700, cutoff2: 3500 });
    boom(c, chan(c, B, { sat: 2, verb: 0.1 }), { at: t, f: 100, f2: 45, d: 0.5, vol: 0.4 });
    glitter(c, chan(c, B, { verb: 0.6 }), { at: t, span: 0.8, count: 12, lo: 96, hi: 112, vol: 0.05 });
  } },

  // Battle
  hit: { level: -18, dur: 0.55, variants: 3, vary: 0.05, room: 'room', build: (c, B) => {
    punch(c, B);
    strike(c, chan(c, B, { verb: 0.2 }), { f: rr(2800, 3600), mode: 'metal', d: 0.12, vol: 0.1 });
    noise(c, chan(c, B, { verb: 0.25 }), { color: 'pink', f: 3000, f2: 7000, q: 1, a: 0.02, d: 0.07, vol: 0.1, pan: [-0.4, 0.4] });
  } },
  crit: { level: -16, dur: 1.1, variants: 2, vary: 0.03, build: (c, B) => {
    punch(c, B, { vol: 1.1, bright: 1.25, low: 1.4 });
    boom(c, chan(c, B, { sat: 2.5, verb: 0.1 }), { f: 120, f2: 36, d: 0.3, vol: 0.6 });
    strike(c, chan(c, B, { verb: 0.45, delay: 0 }), { f: rr(1900, 2300), mode: 'metal', d: 0.7, vol: 0.25 });
    glitter(c, chan(c, B, { verb: 0.5 }), { at: 0.03, span: 0.25, count: 6, lo: 100, hi: 112, vol: 0.05 });
  } },
  weak: { level: -17, dur: 0.9, variants: 2, vary: 0.04, build: (c, B) => {
    punch(c, B, { bright: 1.15 });
    const g = chan(c, B, { verb: 0.35 });
    for (let i = 0; i < 6; i++) strike(c, g, { f: rr(3000, 7000), mode: 'glass', at: rr(0, 0.06), d: rr(0.05, 0.12), vol: 0.12 });
    strike(c, chan(c, B, { verb: 0.4 }), { f: N(103), at: 0.02, d: 0.45, vol: 0.18 });
  } },
  // Weakness Break: glass shatter over a deep boom and a short chord stab.
  break: { level: -15, dur: 1.8, build: (c, B) => {
    punch(c, B, { vol: 1.2, low: 1.6 });
    boom(c, chan(c, B, { sat: 3, verb: 0.15 }), { f: 95, f2: 28, d: 0.65, vol: 0.7 });
    noise(c, chan(c, B, { verb: 0.3, sat: 1.5 }), { color: 'pink', type: 'lowpass', f: 2400, f2: 300, d: 0.35, vol: 0.4 });
    const g = chan(c, B, { verb: 0.45 });
    for (let i = 0; i < 26; i++) {
      const p = c.createStereoPanner(); p.pan.value = rr(-0.9, 0.9); p.connect(g);
      strike(c, p, { f: rr(2500, 9000), mode: 'glass', at: rr(0, 0.28) * rr(0.3, 1), d: rr(0.05, 0.22), vol: 0.09 });
    }
    saws(c, chan(c, B, { verb: 0.4, sat: 1.4 }), { notes: [61, 68, 73].map(N), at: 0.02, a: 0.01, d: 0.55, vol: 0.12, cutoff: 3500, cutoff2: 600 });
  } },
  heal: { level: -22, dur: 1.6, delay: 0.15, build: (c, B) => {
    const h = chan(c, B, { verb: 0.5, delay: 0.12 });
    [76, 78, 80, 83, 85, 88].forEach((m, i) => pluck(c, h, { f: N(m), at: i * 0.04, d: 1, vol: 0.24, bright: 0.55 }));
    noise(c, chan(c, B, { verb: 0.4 }), { color: 'pink', f: 1800, f2: 6500, q: 1, a: 0.25, d: 0.35, vol: 0.14 });
    const o = chan(c, B, { verb: 0.55 });
    [88, 92, 95].forEach((m, i) => strike(c, o, { f: N(m), mode: 'celesta', at: 0.22 + i * 0.03, d: 1, vol: 0.18 }));
  } },
  shield: { level: -21, dur: 1.6, build: (c, B) => {
    saws(c, chan(c, B, { verb: 0.35 }), { notes: [52, 59].map(N), a: 0.12, d: 0.6, vol: 0.18, cutoff: 300, cutoff2: 1800 });
    strike(c, chan(c, B, { verb: 0.5 }), { f: 520, mode: 'bowl', at: 0.1, d: 1.3, vol: 0.32, shimmer: 2.2 });
    noise(c, chan(c, B, { verb: 0.45 }), { type: 'highpass', f: 5000, at: 0.08, a: 0.05, d: 0.4, vol: 0.05 });
  } },
  buff: { level: -21, dur: 1.1, build: (c, B) => {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, 0); lp.frequency.exponentialRampToValueAtTime(4500, 0.45);
    lp.connect(chan(c, B, { verb: 0.35, sat: 1.4 }));
    tone(c, lp, { type: 'sawtooth', f: N(64), f2: N(71), a: 0.05, d: 0.45, glide: 0.4, vol: 0.18, voices: 5, spread: 16 });
    riser(c, chan(c, B, { verb: 0.3 }), { dur: 0.42, vol: 0.12, f: 1500, f2: 8000 });
    strike(c, chan(c, B, { verb: 0.5 }), { f: N(95), at: 0.42, d: 0.6, vol: 0.25 });
  } },
  // Ultimate: a swell that lands on a deep boom, a bright chord stab and sparkles.
  ult: { level: -15, dur: 2.4, delay: 0.14, build: (c, B) => {
    riser(c, chan(c, B, { verb: 0.35 }), { dur: 0.66, vol: 0.3, f: 300, f2: 8000 });
    tone(c, chan(c, B, { verb: 0.3 }), { type: 'sawtooth', f: N(52), f2: N(64), a: 0.5, d: 0.16, glide: 0.66, vol: 0.06, voices: 3, spread: 12 });
    const t = 0.68;
    punch(c, B, { at: t, vol: 1.2, low: 1.6 });
    boom(c, chan(c, B, { sat: 2.5, verb: 0.15 }), { at: t, f: 100, f2: 28, d: 0.85, vol: 0.75 });
    strike(c, chan(c, B, { verb: 0.45 }), { f: 2000, mode: 'metal', at: t, d: 0.8, vol: 0.22 });
    saws(c, chan(c, B, { verb: 0.5, delay: 0.1, sat: 1.4 }), { notes: [64, 71, 76, 78, 80].map(N), at: t, a: 0.01, d: 0.9, vol: 0.16, cutoff: 6000, cutoff2: 900 });
    glitter(c, chan(c, B, { verb: 0.6 }), { at: t + 0.05, span: 0.9, count: 14, lo: 98, hi: 112, vol: 0.05 });
  } },
  ko: { level: -21, dur: 1.6, build: (c, B) => {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(chan(c, B, { verb: 0.5 }));
    [83, 80, 76].forEach((m, i) => strike(c, lp, { f: N(m), at: i * 0.16, d: 0.9, vol: 0.3 }));
    tone(c, chan(c, B, { sat: 1.5, verb: 0.1 }), { f: 110, f2: 55, d: 0.3, vol: 0.4 });
    noise(c, chan(c, B, { verb: 0.3 }), { color: 'pink', type: 'lowpass', f: 900, f2: 200, a: 0.05, d: 0.5, vol: 0.12 });
  } },
  // Enemy defeated: a light hit that dissolves upward into sparkles.
  kill: { level: -18, dur: 1, variants: 2, vary: 0.04, build: (c, B) => {
    punch(c, B, { vol: 0.85 });
    noise(c, chan(c, B, { verb: 0.4 }), { f: 900, f2: 8000, q: 1.2, a: 0.05, d: 0.32, vol: 0.18, pan: [-0.3, 0.3] });
    glitter(c, chan(c, B, { verb: 0.5 }), { at: 0.05, span: 0.35, count: 8, lo: 92, hi: 110, vol: 0.06, up: true });
  } },
  finish: { level: -14, dur: 2.6, delay: 0.16, build: (c, B) => {
    punch(c, B, { vol: 1.3, low: 2 });
    boom(c, chan(c, B, { sat: 3, verb: 0.2 }), { f: 85, f2: 24, d: 1.2, vol: 0.8 });
    strike(c, chan(c, B, { verb: 0.5 }), { f: 1800, mode: 'metal', d: 1.1, vol: 0.25 });
    noise(c, chan(c, B, { verb: 0.4 }), { color: 'pink', type: 'lowpass', f: 3000, f2: 150, d: 1, vol: 0.3 });
    saws(c, chan(c, B, { verb: 0.55, delay: 0.12 }), { notes: [52, 64, 68, 71, 75].map(N), at: 0.12, a: 0.08, d: 1.8, vol: 0.12, cutoff: 600, cutoff2: 4000 });
    glitter(c, chan(c, B, { verb: 0.6 }), { at: 0.15, span: 1.3, count: 18, lo: 96, hi: 112, vol: 0.045 });
  } },
  // Boss final phase: a dark low brass swell that lands on a hit.
  phase: { level: -15, dur: 2.6, build: (c, B) => {
    saws(c, chan(c, B, { verb: 0.45, sat: 3 }), { notes: [40, 47, 52].map(N), a: 0.5, hold: 0.5, d: 1.1, vol: 0.3, cutoff: 180, cutoff2: 1500, q: 1.2 });
    tone(c, chan(c, B, { sat: 2, verb: 0.1 }), { f: 41, f2: 38, a: 0.3, hold: 0.6, d: 0.9, vol: 0.5 });
    riser(c, chan(c, B, { verb: 0.3 }), { dur: 1.2, vol: 0.2, f: 200, f2: 4000 });
    punch(c, B, { at: 1.22, vol: 1.2, low: 1.8 });
    boom(c, chan(c, B, { sat: 2.5, verb: 0.2 }), { at: 1.22, f: 90, f2: 26, d: 0.9, vol: 0.7 });
  } },
  win: { level: -16, dur: 2.8, delay: 0.16, build: (c, B) => {
    const h = chan(c, B, { verb: 0.45, delay: 0.12 });
    [64, 68, 71, 76, 80, 83, 88].forEach((m, i) => pluck(c, h, { f: N(m), at: i * 0.035, d: 1.4, vol: 0.28, bright: 0.65 }));
    const t = 0.26;
    saws(c, chan(c, B, { verb: 0.55, sat: 1.3 }), { notes: [52, 64, 68, 71, 78].map(N), at: t, a: 0.03, d: 2, vol: 0.15, cutoff: 900, cutoff2: 5500 });
    [88, 92, 95, 100].forEach((m, i) => strike(c, chan(c, B, { verb: 0.55, delay: 0.15 }), { f: N(m), mode: 'celesta', at: t + i * 0.07, d: 1.2, vol: 0.26 }));
    boom(c, chan(c, B, { sat: 2, verb: 0.15 }), { at: t, f: 95, f2: 40, d: 0.6, vol: 0.45 });
    glitter(c, chan(c, B, { verb: 0.6 }), { at: t + 0.1, span: 1.2, count: 16, lo: 96, hi: 112, vol: 0.045 });
  } },
  lose: { level: -20, dur: 2.2, build: (c, B) => {
    saws(c, chan(c, B, { verb: 0.55 }), { notes: [61, 64, 68].map(N), a: 0.1, d: 1.8, vol: 0.12, cutoff: 1500, cutoff2: 380 });
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(chan(c, B, { verb: 0.5 }));
    [88, 85, 80].forEach((m, i) => strike(c, lp, { f: N(m), at: 0.1 + i * 0.22, d: 1, vol: 0.25 }));
    tone(c, chan(c, B, { sat: 1.5 }), { f: 95, f2: 50, d: 0.4, vol: 0.35 });
  } },

  // Members' signature sounds (see SIG_FX in battle.js)
  shot: { level: -18, dur: 0.8, variants: 3, vary: 0.04, room: 'room', build: (c, B) => {
    const s = chan(c, B, { verb: 0.3, sat: 2.2 });
    noise(c, s, { type: 'highpass', f: 2200, d: 0.008, vol: 0.7 });
    noise(c, s, { color: 'pink', f: rr(800, 1000), q: 0.7, a: 0.002, d: 0.09, vol: 0.8 });
    tone(c, s, { f: 115, f2: 45, d: 0.12, vol: 0.8 });
    noise(c, chan(c, B, { verb: 0.45 }), { color: 'pink', type: 'lowpass', f: 1600, f2: 300, at: 0.01, d: 0.4, vol: 0.18 });
    strike(c, chan(c, B, { verb: 0.2 }), { f: 4200, mode: 'metal', at: 0.07, d: 0.05, vol: 0.06 });
  } },
  splat: { level: -20, dur: 0.7, variants: 2, vary: 0.05, build: (c, B) => {
    noise(c, chan(c, B, { verb: 0.2, sat: 1.4 }), { color: 'pink', type: 'lowpass', f: 1800, f2: 280, q: 3, a: 0.003, d: 0.16, vol: 0.7 });
    const o = chan(c, B, { verb: 0.3 });
    for (let i = 0; i < 3; i++) tone(c, o, { f: rr(280, 380), f2: rr(800, 1100), at: rr(0.03, 0.14), d: 0.04, vol: 0.12, glide: 0.035 });
    glitter(c, chan(c, B, { verb: 0.4 }), { at: 0.04, span: 0.15, count: 3, lo: 98, hi: 108, vol: 0.04 });
  } },
  sparkle: { level: -21, dur: 1.1, delay: 0.12, build: (c, B) => {
    glitter(c, chan(c, B, { verb: 0.5, delay: 0.12 }), { span: 0.3, count: 14, lo: 92, hi: 112, vol: 0.06, mode: 'celesta' });
    noise(c, chan(c, B, { verb: 0.4 }), { type: 'highpass', f: 6500, a: 0.04, d: 0.35, vol: 0.06 });
    strike(c, chan(c, B, { verb: 0.5 }), { f: N(100), d: 0.6, vol: 0.18 });
  } },
  // Noah's star: a shooting-star sweep that pings at the top.
  dream: { level: -20, dur: 1.2, delay: 0.13, build: (c, B) => {
    tone(c, chan(c, B, { verb: 0.4 }), { f: 600, f2: 2400, a: 0.02, d: 0.2, glide: 0.18, vol: 0.12, voices: 3, spread: 10 });
    noise(c, chan(c, B, { verb: 0.35 }), { color: 'pink', f: 900, f2: 7000, q: 1.2, a: 0.03, d: 0.2, vol: 0.18, pan: [-0.5, 0.5] });
    strike(c, chan(c, B, { verb: 0.55, delay: 0.15 }), { f: N(100), at: 0.18, d: 0.8, vol: 0.28 });
    glitter(c, chan(c, B, { verb: 0.5 }), { at: 0.2, span: 0.3, count: 6, lo: 100, hi: 112, vol: 0.045 });
  } },
  munch: { level: -21, dur: 0.7, variants: 2, vary: 0.05, build: (c, B) => {
    const o = chan(c, B, { verb: 0.15 });
    crunch(c, o, { d: 0.06, vol: 0.5, f: rr(2200, 2800) });
    crunch(c, o, { at: 0.11, d: 0.06, vol: 0.45, f: rr(2300, 3000) });
    tone(c, chan(c, B, { verb: 0.25 }), { f: 520, f2: 940, at: 0.2, d: 0.05, vol: 0.18, glide: 0.04 });
    glitter(c, chan(c, B, { verb: 0.4 }), { at: 0.22, span: 0.1, count: 2, lo: 100, hi: 106, vol: 0.04 });
  } },
  bonk: { level: -19, dur: 0.8, variants: 2, vary: 0.04, build: (c, B) => {
    strike(c, chan(c, B, { verb: 0.2 }), { f: rr(850, 950), mode: 'wood', d: 0.22, vol: 0.7 });
    tone(c, chan(c, B, { sat: 1.8 }), { f: 190, f2: 80, d: 0.1, vol: 0.5 });
    tone(c, chan(c, B, { verb: 0.25 }), { f: 1900, f2: 1300, at: 0.03, d: 0.06, vol: 0.08, glide: 0.05 });
    glitter(c, chan(c, B, { verb: 0.45 }), { at: 0.05, span: 0.2, count: 4, lo: 100, hi: 110, vol: 0.045 });
  } },

  // Recruit
  flip: { level: -25, dur: 0.6, variants: 3, vary: 0.04, build: (c, B) => {
    noise(c, chan(c, B, { verb: 0.2 }), { color: 'pink', f: 2000, f2: 6000, q: 1.4, a: 0.01, d: 0.05, vol: 0.4 });
    noise(c, chan(c, B, { verb: 0.15 }), { type: 'highpass', f: 5000, at: 0.05, d: 0.006, vol: 0.3 });
    strike(c, chan(c, B, { verb: 0.3 }), { f: N(snapPenta(Math.round(rr(95, 103)))), at: 0.05, d: 0.3, vol: 0.12 });
  } },
  pull3: { level: -22, dur: 1.4, delay: 0.13, build: (c, B) => {
    const o = chan(c, B, { verb: 0.45, delay: 0.15 });
    [88, 92, 95].forEach((m, i) => strike(c, o, { f: N(m), mode: 'celesta', at: i * 0.06, d: 0.8, vol: 0.28 }));
    glitter(c, chan(c, B, { verb: 0.5 }), { at: 0.1, span: 0.4, count: 6, lo: 96, hi: 108, vol: 0.04 });
  } },
  pull4: { level: -19, dur: 1.8, delay: 0.14, build: (c, B) => {
    noise(c, chan(c, B, { verb: 0.35 }), { color: 'pink', f: 600, f2: 6000, q: 1.2, a: 0.15, d: 0.25, vol: 0.3, pan: [-0.5, 0.5] });
    const h = chan(c, B, { verb: 0.45, delay: 0.12 });
    [71, 75, 78, 83, 87, 90].forEach((m, i) => pluck(c, h, { f: N(m), at: 0.12 + i * 0.035, d: 1.2, vol: 0.28, bright: 0.65 }));
    [87, 94, 99].forEach((m, i) => strike(c, chan(c, B, { verb: 0.5 }), { f: N(m), at: 0.34 + i * 0.02, d: 1, vol: 0.24 }));
    glitter(c, chan(c, B, { verb: 0.55 }), { at: 0.35, span: 0.6, count: 10, lo: 96, hi: 110, vol: 0.045 });
  } },
  // ★5: a long riser, a deep boom, then a bright chord bloom with a harp cascade.
  pull5: { level: -15, dur: 3.6, delay: 0.16, build: (c, B) => {
    riser(c, chan(c, B, { verb: 0.35 }), { dur: 1, vol: 0.3, f: 250, f2: 9000 });
    tone(c, chan(c, B, { verb: 0.35 }), { type: 'sawtooth', f: N(52), f2: N(76), a: 0.8, d: 0.2, glide: 1, vol: 0.05, voices: 5, spread: 14 });
    const t = 1;
    punch(c, B, { at: t, vol: 1.1, low: 1.8 });
    boom(c, chan(c, B, { sat: 2.5, verb: 0.2 }), { at: t, f: 90, f2: 26, d: 1.1, vol: 0.75 });
    saws(c, chan(c, B, { verb: 0.55, delay: 0.1, sat: 1.3 }), { notes: [52, 64, 68, 71, 75, 78].map(N), at: t, a: 0.02, d: 2.4, vol: 0.17, cutoff: 700, cutoff2: 6500 });
    const h = chan(c, B, { verb: 0.5, delay: 0.14 });
    [100, 95, 92, 88, 83, 80, 76].forEach((m, i) => pluck(c, h, { f: N(m), at: t + 0.12 + i * 0.06, d: 1.4, vol: 0.24, bright: 0.7 }));
    [88, 95, 100, 104].forEach((m, i) => strike(c, chan(c, B, { verb: 0.6 }), { f: N(m), mode: 'celesta', at: t + 0.05 + i * 0.03, d: 1.6, vol: 0.2 }));
    glitter(c, chan(c, B, { verb: 0.6 }), { at: t + 0.1, span: 1.8, count: 22, lo: 96, hi: 112, vol: 0.045 });
  } },
  // Swipe the stream ticket up: a sweep that trails sparkles.
  ticket: { level: -21, dur: 1.2, delay: 0.12, build: (c, B) => {
    noise(c, chan(c, B, { verb: 0.35 }), { color: 'pink', f: 500, f2: 7000, q: 1.3, a: 0.1, d: 0.35, vol: 0.4, pan: [-0.2, 0.3] });
    tone(c, chan(c, B, { verb: 0.4 }), { f: 400, f2: 1600, a: 0.05, d: 0.3, glide: 0.35, vol: 0.06, voices: 3, spread: 12 });
    glitter(c, chan(c, B, { verb: 0.5, delay: 0.12 }), { at: 0.1, span: 0.5, count: 9, lo: 94, hi: 112, vol: 0.045, up: true });
  } },
  rise: { level: -26, dur: 0.9, build: (c, B) => {
    riser(c, chan(c, B, { verb: 0.4 }), { dur: 0.5, vol: 0.18, f: 900, f2: 6000 });
    strike(c, chan(c, B, { verb: 0.5 }), { f: N(95), at: 0.48, d: 0.4, vol: 0.18 });
  } },
};

// ---------- render, normalise, play ----------
function loudnessOf(buf) {
  const a = buf.getChannelData(0), b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a;
  const w = Math.max(1, Math.floor(buf.sampleRate * 0.04));
  let acc = 0, best = 0, peak = 0;
  for (let i = 0; i < a.length; i++) {
    acc += (a[i] * a[i] + b[i] * b[i]) * 0.5;
    if (i >= w) acc -= (a[i - w] * a[i - w] + b[i - w] * b[i - w]) * 0.5;
    if (i >= w - 1 && acc > best) best = acc;
    const m = Math.max(Math.abs(a[i]), Math.abs(b[i]));
    if (m > peak) peak = m;
  }
  return { rms: Math.sqrt(Math.max(best / w, 1e-12)), peak };
}

// Scales to the target level, softly limits peaks and trims the silent tail.
function finishBuffer(buf, level) {
  const { rms } = loudnessOf(buf), g = Math.pow(10, level / 20) / rms, chs = [];
  let last = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      let x = d[i] * g;
      const m = Math.abs(x);
      if (m > 0.7) x = Math.sign(x) * (0.7 + 0.3 * Math.tanh((m - 0.7) / 0.3));
      d[i] = x;
      if (m > 0.0008 && i > last) last = i;
    }
    chs.push(d);
  }
  const len = Math.min(buf.length, last + Math.floor(buf.sampleRate * 0.02));
  const out = audioCtx.createBuffer(buf.numberOfChannels, Math.max(1, len), buf.sampleRate);
  chs.forEach((d, ch) => {
    const o = out.getChannelData(ch);
    o.set(d.subarray(0, len));
    const fade = Math.min(len, Math.floor(buf.sampleRate * 0.02));
    for (let i = 0; i < fade; i++) o[len - 1 - i] *= i / fade;
  });
  return out;
}

async function renderOne(def, seed) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const len = Math.ceil((def.dur + (def.delay ? 0.6 : 0.3)) * SFX_RATE);
  const c = new OAC(2, len, SFX_RATE);
  rnd = seeded(seed * 9973 + 17);
  try { def.build(c, makeBus(c, def)); } finally { rnd = Math.random; }
  const buf = await c.startRendering();
  return finishBuffer(buf, def.level);
}

function renderSfx(name) {
  if (SFX_BUF[name]) return Promise.resolve(SFX_BUF[name]);
  if (SFX_WAIT[name]) return SFX_WAIT[name];
  const def = SOUNDS[name];
  SFX_WAIT[name] = (async () => {
    const list = [];
    for (let v = 0; v < (def.variants || 1); v++) list.push(await renderOne(def, v + 1));
    SFX_BUF[name] = list;
    return list;
  })().catch(e => { console.warn('sfx render failed', name, e); delete SFX_WAIT[name]; return null; });
  return SFX_WAIT[name];
}

// Renders everything in the background after the first tap, most-used first.
let sfxWarm = false;
async function warmSfx() {
  if (sfxWarm || !audioCtx) return;
  sfxWarm = true;
  const first = ['whoosh', 'select', 'tap', 'coin', 'reward', 'rewardItem', 'hit', 'crit', 'weak', 'break', 'kill'];
  const order = [...first, ...Object.keys(SOUNDS).filter(n => !first.includes(n))];
  for (const name of order) {
    await renderSfx(name);
    await new Promise(r => setTimeout(r, 0));
  }
}

// Optional recordings: list their names in assets/sfx/sfx.json, e.g. ["hit", "pull5"].
function loadSfxFiles(ctx) {
  if (sfxFiles) return;
  sfxFiles = {};
  fetch('assets/sfx/sfx.json').then(r => (r.ok ? r.json() : [])).then(list => (Array.isArray(list) ? list : []).forEach(name => {
    fetch(`assets/sfx/${name}.mp3`).then(r => (r.ok ? r.arrayBuffer() : null))
      .then(b => b && ctx.decodeAudioData(b)).then(buf => { if (buf) sfxFiles[name] = buf; }).catch(() => {});
  })).catch(() => {});
}

const lastSfx = {};   // name -> time it last played (stops the same sound stacking)
function sfx(name) {
  if (!SAVE.settings.sound || !SOUNDS[name]) return;
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (lastSfx[name] && now - lastSfx[name] < 0.035) return;
  lastSfx[name] = now;
  const file = sfxFiles && sfxFiles[name];
  if (file) return playSfxBuffer(ctx, file, 0);
  const list = SFX_BUF[name];
  if (list) return playSfxBuffer(ctx, list[Math.floor(Math.random() * list.length)], SOUNDS[name].vary || 0);
  // Not rendered yet: render now and play it if it's ready quickly enough to still fit the moment.
  const t0 = performance.now();
  renderSfx(name).then(l => { if (l && performance.now() - t0 < 250) playSfxBuffer(ctx, l[0], 0); });
}

function playSfxBuffer(ctx, buf, vary) {
  try {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf;
    if (vary) s.playbackRate.value = 1 + (Math.random() * 2 - 1) * vary;
    g.gain.value = SAVE.settings.volume;
    s.connect(g); g.connect(sfxOut); s.start();
  } catch (e) { /* audio is optional */ }
}

// Story text used to blip on every letter; modern story scenes stay quiet.
function blipSound() {}

// The first tap unlocks audio, renders the sounds and looks for recordings. No click sounds.
function unlockAudio() {
  const ctx = audio();
  if (!ctx) return;
  warmSfx();
  loadSfxFiles(ctx);
}
document.addEventListener('pointerdown', unlockAudio, { passive: true });
document.addEventListener('keydown', unlockAudio);
