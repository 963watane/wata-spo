// Loads character art and strips the plain white background so characters
// can stand on the battlefield. Works only when served over http
// (py -m http.server); opened as a file it falls back to the original image.

const ART = {};   // id -> { url, w, h }

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });
}

// Flood-fills near-white pixels connected to the image border and makes them
// transparent, then softens the edge so there is no white halo.
// bgTol: if set, only pixels within this distance of the top-left corner
// color count as background (for art with white parts near the edge).
function removeWhiteBackground(img, bgTol = null, maxSize = 1600) {
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);   // throws on file:// (tainted canvas)
  const d = imgData.data;
  const T = 226;
  const [cr, cg, cb] = [d[(2 * w + 2) * 4], d[(2 * w + 2) * 4 + 1], d[(2 * w + 2) * 4 + 2]];
  // bgTol 'grey': a flat grey backdrop with darker grey shapes in it (low
  // colour saturation, mid brightness). White and coloured parts are kept.
  const isBg = bgTol === 'grey'
    ? i => {
      const r = d[i], g = d[i + 1], b = d[i + 2], lum = (r + g + b) / 3;
      return Math.max(r, g, b) - Math.min(r, g, b) <= 30 && lum >= 85 && lum <= 228;
    }
    : bgTol !== null
    ? i => Math.abs(d[i] - cr) <= bgTol && Math.abs(d[i + 1] - cg) <= bgTol && Math.abs(d[i + 2] - cb) <= bgTol
    : i => {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      return r >= T && g >= T && b >= T && Math.max(r, g, b) - Math.min(r, g, b) <= 20;
    };
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const p = y * w + x;
    if (!bg[p] && isBg(p * 4)) { bg[p] = 1; stack.push(p); }
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop(), x = p % w, y = (p / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  // Edge cleanup: pixels within EDGE px of the background are partly
  // background colour (anti-aliasing, JPEG noise). Give them alpha by how
  // far their colour is from the background, and remove the background tint
  // from their colour, so there is no jagged light halo.
  const EDGE = 3, SOFT = 45;
  const depth = new Uint8Array(w * h);
  let frontier = [];
  for (let p = 0; p < w * h; p++) if (bg[p]) { d[p * 4 + 3] = 0; frontier.push(p); }
  // Only background pixels touching the subject start the edge search.
  frontier = frontier.filter(p => {
    const x = p % w;
    return (x > 0 && !bg[p - 1]) || (x < w - 1 && !bg[p + 1]) || (p >= w && !bg[p - w]) || (p < w * (h - 1) && !bg[p + w]);
  });
  const visit = (q, k, out) => {
    if (bg[q] || depth[q]) return;
    depth[q] = k;
    out.push(q);
  };
  for (let k = 1; k <= EDGE; k++) {
    const nextF = [];
    for (const p of frontier) {
      const x = p % w;
      if (x > 0) visit(p - 1, k, nextF);
      if (x < w - 1) visit(p + 1, k, nextF);
      if (p >= w) visit(p - w, k, nextF);
      if (p < w * (h - 1)) visit(p + w, k, nextF);
    }
    frontier = nextF;
  }
  for (let p = 0; p < w * h; p++) {
    if (!depth[p]) continue;
    const i = p * 4;
    const dist = Math.max(Math.abs(d[i] - cr), Math.abs(d[i + 1] - cg), Math.abs(d[i + 2] - cb));
    // Deeper pixels are trusted more, so the cut stays tight to the line art.
    const a = Math.min(1, dist / (SOFT * depth[p] / EDGE * 0.6 + SOFT * 0.4));
    if (a < 1) {
      const inv = a > 0.02 ? 1 / a : 0;
      d[i]     = Math.max(0, Math.min(255, cr + (d[i] - cr) * inv));
      d[i + 1] = Math.max(0, Math.min(255, cg + (d[i + 1] - cg) * inv));
      d[i + 2] = Math.max(0, Math.min(255, cb + (d[i + 2] - cb) * inv));
      d[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return new Promise(resolve => canvas.toBlob(blob => resolve({ url: URL.createObjectURL(blob), w, h }), 'image/png'));
}

// Currency pictures: white background removed, then cropped to a small square.
const CURRENCY_ART = { gem: 'assets/ui/cur-gem.jpg', token: 'assets/ui/cur-token.jpg', coin: 'assets/ui/cur-coin.webp' };

async function loadIcon(src, size = 96) {
  const img = await loadImage(src);
  let cut;
  try { cut = await loadImage((await removeWhiteBackground(img, null, 400)).url); } catch (e) { cut = img; }
  const c = document.createElement('canvas');
  c.width = cut.naturalWidth; c.height = cut.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(cut, 0, 0);
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  try {
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
  } catch (e) { x0 = 0; y0 = 0; x1 = c.width - 1; y1 = c.height - 1; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, bh);
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const k = size / side;
  out.getContext('2d').drawImage(c, x0, y0, bw, bh, (size - bw * k) / 2, (size - bh * k) / 2, bw * k, bh * k);
  // A short blob: URL keeps the many inline <img> tags small.
  return new Promise(resolve => out.toBlob(b => resolve(URL.createObjectURL(b)), 'image/png'));
}

async function loadAllArt(onProgress) {
  await Promise.all(Object.entries(CURRENCY_ART).map(async ([k, src]) => {
    try { ART['cur:' + k] = { url: await loadIcon(src) }; } catch (e) { console.warn('Currency icon failed', k, e); }
  }));
  // Members with a separate avatar picture use it for round portraits (kept as is).
  await Promise.all(Object.entries(CHARACTERS).filter(([, c]) => c.avatar).map(async ([id, c]) => {
    try { await loadImage(c.avatar); ART[id + ':face'] = { url: c.avatar }; } catch (e) { console.warn('Avatar failed', id); }
  }));
  const entries = [
    ...Object.entries(CHARACTERS).map(([id, c]) => [id, c.art, c.bgTol]),
    ...Object.entries(ENEMIES).filter(([, e]) => e.art).map(([id, e]) => [id, e.art, e.bgTol]),
  ];
  let done = 0;
  for (const [id, src, bgTol] of entries) {
    try {
      const img = await loadImage(src);
      try {
        ART[id] = await removeWhiteBackground(img, bgTol ?? null);
      } catch (e) {
        console.warn('Background removal skipped for', id, '-', e.message);
        ART[id] = { url: src, w: img.naturalWidth, h: img.naturalHeight };
      }
    } catch (e) {
      console.error(e);
      ART[id] = { url: '', w: 3, h: 4 };
    }
    onProgress(++done / entries.length);
  }
}

// CSS for a round face portrait.
function faceStyle(id) {
  if (ART[id + ':face']) return `background-image:url('${ART[id + ':face'].url}');background-size:cover;background-position:50% 35%`;
  const def = CHARACTERS[id] || ENEMIES[id];
  const [fx, fy] = def.face;
  return `background-image:url('${ART[id].url}');background-size:${ART[id].w > ART[id].h ? 260 : 340}%;background-position:${fx * 100}% ${fy * 100}%`;
}

// CSS for a bust crop into a box with the given aspect (width / height).
function bustStyle(id, boxAspect = 3 / 4) {
  const [bx, by, bw] = CHARACTERS[id].bust;
  const a = ART[id];
  const hFrac = Math.min(1, (bw * a.w / boxAspect) / a.h);
  const px = bw >= 1 ? 0 : (bx / (1 - bw)) * 100;
  const py = hFrac >= 1 ? 0 : (by / (1 - hFrac)) * 100;
  return `background-image:url('${a.url}');background-size:${100 / bw}% auto;background-position:${px}% ${py}%`;
}
