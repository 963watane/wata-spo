// Hand-drawn SVG icons (24x24, stroked with currentColor) and enemy sprites.
// ic('gem') returns inline SVG markup; currency icons carry their own colours.

const ICON_PATHS = {
  // currencies (filled, own colours)
  gem: '<path d="M6 3h12l4 6-10 12L2 9z" fill="#5fe3ff" stroke="#c9f6ff" stroke-width="1.2"/><path d="M2 9h20M8.5 3 12 21l3.5-18M6 3l2.5 6L12 3l3.5 6L18 3" fill="none" stroke="#1a6f9a" stroke-width="1" opacity=".7"/>',
  token: '<circle cx="12" cy="12" r="9.5" fill="#ffc93d" stroke="#fff1b8" stroke-width="1.2"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#b9780a" stroke-width="1.2"/><path d="M9 9.5h6v4h-3l-2 2v-2H9z" fill="#8a5300"/>',
  coin: '<path d="m12 2 8.7 5v10L12 22l-8.7-5V7z" fill="#c69bff" stroke="#efe2ff" stroke-width="1.2"/><path d="M14.6 9.2c-.5-.9-1.5-1.3-2.6-1.3-1.5 0-2.6.8-2.6 1.9 0 2.6 5.3 1.4 5.3 4.2 0 1.2-1.2 2-2.7 2-1.2 0-2.2-.5-2.7-1.4" fill="none" stroke="#4b2390" stroke-width="1.8" stroke-linecap="round"/>',
  // menu
  members: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.6c2 .8 3.2 2.6 3.5 5.4"/>',
  talks: '<path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3.5V15H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M17 9h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-3.5-3H12"/>',
  missions: '<rect x="4.5" y="4" width="15" height="17.5" rx="2"/><path d="M9 4V2.5h6V4M8.5 12l2.4 2.4 4.6-4.8M8.5 18h7"/>',
  tower: '<path d="M12 9.5 7.5 22M12 9.5 16.5 22M8.8 18.5h6.4M10 14h4"/><circle cx="12" cy="7" r="2"/><path d="M7.8 2.8a6 6 0 0 0 0 8.4M16.2 2.8a6 6 0 0 1 0 8.4"/>',
  shop: '<path d="M4 8h16l-1.2 12.2a1.8 1.8 0 0 1-1.8 1.6H7a1.8 1.8 0 0 1-1.8-1.6z"/><path d="M8.5 10.5V6.5a3.5 3.5 0 0 1 7 0v4"/>',
  album: '<rect x="2.5" y="6" width="15" height="13" rx="2"/><path d="M6 3h13.5a2 2 0 0 1 2 2v11"/><path d="m2.5 16 4-4 3.5 3.5 2.5-2.5 5 5"/><circle cx="13" cy="10" r="1.4"/>',
  login: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m12 12.2 1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"/><circle cx="12" cy="12" r="6.6"/>',
  battle: '<path d="M14.5 3.5H20.5V9.5L9 21l-2-2 1.5-1.5L3 12l2-2 5.5 5.5z" /><path d="M9.5 3.5H3.5V9.5L6 12M18 12l2.5 2.5-2 2M15 15l3 3"/>',
  recruit: '<path d="M12 2.5c.6 4.8 2.7 6.9 7.5 7.5-4.8.6-6.9 2.7-7.5 7.5-.6-4.8-2.7-6.9-7.5-7.5 4.8-.6 6.9-2.7 7.5-7.5z"/><path d="M19 15.5c.3 2 1.1 2.8 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.2 2.7-1 3-3z"/>',
  story: '<path d="M3 5.5c3-1.6 6-1.6 9 0v14c-3-1.6-6-1.6-9 0zM21 5.5c-3-1.6-6-1.6-9 0v14c3-1.6 6-1.6 9 0z"/>',
  news: '<path d="M4 4.5h13v15a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 8.5h3v11a2 2 0 0 1-2 2M7.5 8.5h6M7.5 12h6M7.5 15.5h4"/>',
  menu: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 4-6.6 8-6.6s7.2 2.4 8 6.6"/>',
  team: '<path d="M12 2.5 20 6v6c0 4.6-3.4 8.2-8 9.5C7.4 20.2 4 16.6 4 12V6z"/><path d="M8.5 12.5 11 15l4.5-5"/>',
  // ui
  back: '<path d="m14.5 5-7 7 7 7"/>',
  next: '<path d="m9.5 5 7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
  star: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill="currentColor" stroke="none"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5"/>',
  check: '<path d="m4.5 12.5 4.8 4.8L19.5 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>',
  spark: '<path d="M12 2.5c.8 5.6 3.9 8.7 9.5 9.5-5.6.8-8.7 3.9-9.5 9.5-.8-5.6-3.9-8.7-9.5-9.5 5.6-.8 8.7-3.9 9.5-9.5z" fill="currentColor" stroke="none"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m14 6 4 4"/>',
  sort: '<path d="M7 4v16M3.5 7.5 7 4l3.5 3.5M17 20V4M13.5 16.5 17 20l3.5-3.5"/>',
  heart: '<path d="M12 20.5S3 15.2 3 8.8A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 9 1.8c0 6.4-9 11.7-9 11.7z" fill="currentColor" stroke="none"/>',
  auto: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 3.5v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20.5v-5h5"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.5"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5C10 4 6.5 4.5 7 7s5 1.5 5 1.5zM12 8.5c2-4.5 5.5-4 5-1.5s-5 1.5-5 1.5z"/>',
  bolt: '<path d="M13.5 2.5 4.5 13.5h7l-1 8 9-11h-7z" fill="currentColor" stroke-linejoin="round"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 3.5v5h5"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14"/>',
  music: '<path d="M9 18V5.5l11-2v12.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  chest: '<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M3.5 13h17M5 9a7 4 0 0 1 14 0M11 11.5h2v3h-2z"/>',
  map: '<path d="m3.5 6.5 5-2.5 7 3 5-2.5v13l-5 2.5-7-3-5 2.5z"/><path d="M8.5 4v13M15.5 7v13"/>',
  flame: '<path d="M12 21.5c-4 0-7-2.8-7-6.6 0-3.4 2.4-5.4 4-7.9.8 1.6 1.7 2.6 3 3 0-2.6.8-5.3 3-7.5.4 3.4 4 5.9 4 11.2 0 4.4-3 7.8-7 7.8z"/>',
  // live systems
  ticket: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4z" fill="#ff8a5c" stroke="#ffe0cf" stroke-width="1.3"/><path d="M15 6.5v11" stroke="#7a2a10" stroke-width="1.3" stroke-dasharray="1.6 1.6"/><path d="m9 9.2.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="#fff6c8" stroke="none"/>',
  owl: '<circle cx="12" cy="12" r="9.5" fill="#7d6cff" stroke="#e2ddff" stroke-width="1.3"/><circle cx="9" cy="11" r="2.6" fill="#fff" stroke="none"/><circle cx="15" cy="11" r="2.6" fill="#fff" stroke="none"/><circle cx="9" cy="11" r="1.2" fill="#24185e" stroke="none"/><circle cx="15" cy="11" r="1.2" fill="#24185e" stroke="none"/><path d="m11 14 1 1.4 1-1.4z" fill="#ffc93d" stroke="none"/><path d="M6.5 6.5 8 8.5M17.5 6.5 16 8.5" stroke="#e2ddff" stroke-width="1.3"/>',
  trophy: '<path d="M7 3.5h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H3.5v1.5A3.5 3.5 0 0 0 7 10.5M17 5.5h3.5v1.5a3.5 3.5 0 0 1-3.5 3.5M12 13.5v4M8 21h8M9.5 17.5h5"/>',
  live: '<circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
  raid: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/>',
  cake: '<path d="M4 20.5h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" fill="#ffd9e6"/><path d="M4 15.5c2 1.5 4-1 6 0s4 1.5 6 0 3-1 4 0"/><circle cx="12" cy="7" r="2" fill="#ff4f7b" stroke="#ff4f7b"/><path d="M12 9v2.5"/>',
  plush: '<circle cx="7" cy="6" r="2.5" fill="#c99a6e"/><circle cx="17" cy="6" r="2.5" fill="#c99a6e"/><circle cx="12" cy="12" r="7.5" fill="#d9ad80"/><circle cx="9.5" cy="11" r=".9" fill="currentColor"/><circle cx="14.5" cy="11" r=".9" fill="currentColor"/><path d="M10.5 14.5c1 .8 2 .8 3 0"/>',
  paint: '<path d="M12 3C7 3 3 6.6 3 11.2 3 15.6 6.5 19 10.6 19c1.3 0 1.6-1 1.1-2-.6-1.2.2-2.4 1.6-2.4H16c2.8 0 5-1.9 5-4.6C21 6.2 17 3 12 3z" fill="#fff3e0"/><circle cx="7.5" cy="10.5" r="1.4" fill="#ff4d6d" stroke="none"/><circle cx="10.5" cy="7" r="1.4" fill="#ffd23f" stroke="none"/><circle cx="15" cy="7.2" r="1.4" fill="#4d96ff" stroke="none"/><circle cx="17.5" cy="10.8" r="1.4" fill="#3bceac" stroke="none"/>',
  photo: '<rect x="3" y="5" width="18" height="15" rx="2" fill="#2a2140"/><circle cx="16" cy="10" r="2.3" fill="#ffb347" stroke="none"/><path d="m3 17 5-5 4 4 2.5-2.5L21 19" stroke="#ff8a5c"/>',
  snack: '<path d="M6 3h12l-1 4 1 14H6l1-14z" fill="#ffcf5c"/><path d="M7 7h10M9.5 12h5M9.5 15.5h5"/>',
  // roles
  dps: '<path d="M14.5 3h6.5v6.5L10 20.5 7.5 18 5 20.5 3.5 19 6 16.5 3.5 14z"/><path d="m12 12 3 3"/>',
  tank: '<path d="M12 2.5 20 6v6c0 4.6-3.4 8.2-8 9.5C7.4 20.2 4 16.6 4 12V6z"/><path d="M12 2.5v19M4.5 11h15"/>',
  support: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  // skills
  basic: '<path d="M5 19 19 5M9 19l10-10M5 15 15 5"/>',
  skill: '<path d="M13.5 2.5 4.5 13.5h7l-1 8 9-11h-7z"/>',
  ult: '<path d="m12 2 2.2 6.3L20.5 6l-2.3 6.2L22 14.8l-6.4.6.4 6.6-4-5.3-4 5.3.4-6.6-6.4-.6 3.8-2.6L3.5 6l6.3 2.3z"/>',
  talent: '<path d="m12 2.5 8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z"/><path d="m12 7.5 1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z"/>',
  collab: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 20c.5-3.5 2.5-5.5 5-5.5 1.6 0 3 .8 4 2.2 1-1.4 2.4-2.2 4-2.2 2.5 0 4.5 2 5 5.5"/>',
};

// The three currencies use the player-supplied pictures once art.js has loaded them.
const ic = (name, cls = '') => typeof ART !== 'undefined' && ART['cur:' + name]
  ? `<img class="ic ic-cur ic-${name} ${cls}" src="${ART['cur:' + name].url}" alt="" draggable="false">`
  : ICON_PATHS[name]
  ? `<svg class="ic ic-${name} ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`
  : '';

// Element badges (see ELEMENTS in data.js): elIc('night').
const EL_PATHS = {
  sun: '<path d="M3 17.5h18M7 17.5a5 5 0 0 1 10 0M12 6.5v2.2M5.7 9.7l1.5 1.5M18.3 9.7l-1.5 1.5M3.5 14h2M18.5 14h2"/>',
  candy: '<circle cx="12" cy="12" r="4.3"/><path d="M7.9 10 3.5 7.6l.8 4.4-.8 4.4 4.4-2.4M16.1 10l4.4-2.4-.8 4.4.8 4.4-4.4-2.4M10 10.5l3.6 3"/>',
  night: '<path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z"/><path d="m16.5 4 .6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
  paint: '<path d="M12 3.2s6 6.4 6 10.8a6 6 0 0 1-12 0c0-4.4 6-10.8 6-10.8z"/><path d="M9.4 14.6a2.8 2.8 0 0 0 2.6 2.6"/>',
  aim: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2.5v4.5M12 17v4.5M2.5 12H7M17 12h4.5"/>',
  snack: '<path d="M12 3.6c-2.2 0-8.8 10.4-8.4 13.6.3 2.4 3.7 3.4 8.4 3.4s8.1-1 8.4-3.4C20.8 14 14.2 3.6 12 3.6z"/><path d="M8.3 14.6h7.4v6H8.3z" fill="currentColor"/>',
};
const elIc = (key, cls = '') => EL_PATHS[key]
  ? `<span class="el el-${key} ${cls}" style="--ec:${ELEMENTS[key].color}" title="${ELEMENTS[key].name}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EL_PATHS[key]}</svg></span>`
  : '';
// Weakness icons for an enemy id.
const weakIcons = id => ((ENEMIES[id] && ENEMIES[id].weak) || []).map(k => elIc(k)).join('');

// Small amount label with a currency icon: amt('gem', 160).
const amt = (kind, n) => `<span class="amt amt-${kind}">${ic(kind)}${n}</span>`;

const ROLE_IC = { DPS: 'dps', Tank: 'tank', Support: 'support' };
const roleIc = role => ic(ROLE_IC[role]);

// Rarity stars as icons.
const starsIc = n => `<span class="stars-ic">${Array.from({ length: n }, () => ic('star')).join('')}</span>`;

// ---------- Enemy sprites ----------
// Each glitch enemy is a small SVG creature. Colours come from --h (its hue)
// through the classes .f1 (body), .f2 (shade), .f3 (glow) and .fe (eyes) in skin.css.
const FOE_SVG = {
  // Lag Shade: hooded ghost with a buffering ring for a face.
  grunt: `<path class="f2" d="M60 8C34 8 20 30 20 56v50l10-8 10 9 10-9 10 9 10-9 10 9 10-9 10 8V56C100 30 86 8 60 8z"/>
    <path class="f1" d="M60 14c-22 0-34 19-34 42v40l7-6 9 8 9-8 9 8 9-8 9 8 9-8 7 6V56c0-23-12-42-34-42z"/>
    <ellipse class="fd" cx="60" cy="54" rx="24" ry="22"/>
    <g class="spin" style="transform-origin:60px 54px">${[0, 1, 2, 3, 4, 5, 6, 7].map(i =>
      `<circle class="fe" cx="${60 + Math.cos(i * Math.PI / 4) * 14}" cy="${54 + Math.sin(i * Math.PI / 4) * 14}" r="${1.4 + i * 0.35}" opacity="${0.25 + i * 0.1}"/>`).join('')}</g>
    <circle class="fe blink" cx="52" cy="54" r="3"/><circle class="fe blink" cx="68" cy="54" r="3"/>`,
  // Ping Wraith: thin wraith, one crosshair eye, signal-bar horns.
  sniper: `<path class="f2" d="M60 18c-16 0-24 14-24 30 0 20 8 30 4 62 8-6 12-4 20 2 8-6 12-8 20-2-4-32 4-42 4-62 0-16-8-30-24-30z"/>
    <path class="f1" d="M60 24c-12 0-18 11-18 25 0 18 6 28 4 52 6-4 9-3 14 1 5-4 8-5 14-1-2-24 4-34 4-52 0-14-6-25-18-25z"/>
    <rect class="f3" x="34" y="10" width="5" height="10" rx="1"/><rect class="f3" x="27" y="4" width="5" height="16" rx="1"/>
    <rect class="f3" x="81" y="10" width="5" height="10" rx="1"/><rect class="f3" x="88" y="4" width="5" height="16" rx="1"/>
    <circle class="fd" cx="60" cy="46" r="13"/><circle class="fe-ring" cx="60" cy="46" r="9"/>
    <path class="fe-ring" d="M60 31v8M60 53v8M45 46h8M67 46h8"/><circle class="fe blink" cx="60" cy="46" r="3.5"/>`,
  // Spam Bot: boxy bot with an envelope mouth and a "+" antenna (it heals).
  spammer: `<path class="f3 bob" d="M57 2h6v8h8v6h-8v8h-6v-8h-8v-6h8z"/><path class="f2" d="M60 24v8"/>
    <rect class="f2" x="18" y="30" width="84" height="66" rx="16"/><rect class="f1" x="23" y="35" width="74" height="56" rx="12"/>
    <rect class="fd" x="31" y="43" width="58" height="22" rx="8"/>
    <rect class="fe blink" x="40" y="49" width="12" height="10" rx="3"/><rect class="fe blink" x="68" y="49" width="12" height="10" rx="3"/>
    <rect class="fd" x="42" y="70" width="36" height="16" rx="2"/><path class="fe-ring" d="m42 70 18 10 18-10"/>
    <rect class="f2" x="8" y="52" width="10" height="20" rx="4"/><rect class="f2" x="102" y="52" width="10" height="20" rx="4"/>
    <path class="f2" d="M38 96v14h12V96M70 96v14h12V96"/>`,
  // Firewall: a walking brick wall crowned with flames.
  firewall: `<path class="flame f3" d="M24 34c4-12 10-10 10-22 8 8 10 14 10 20 4-8 8-10 8-20 10 10 14 16 12 24 4-6 8-8 10-16 8 10 10 16 8 22 4-4 6-6 8-12 6 10 6 16 4 22z"/>
    <rect class="f2" x="16" y="32" width="88" height="76" rx="8"/>
    ${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => {
      // Odd rows are offset by half a brick; bricks are trimmed to the wall.
      const x0 = 20 + c * 28 - (r % 2 ? 14 : 0), x = Math.max(20, x0), x1 = Math.min(100, x0 + 24);
      return x1 - x > 4 ? `<rect class="f1" x="${x}" y="${36 + r * 18}" width="${x1 - x}" height="14" rx="2"/>` : '';
    }).join('')).join('')}
    <path class="fd" d="M34 58l16 6v8H34zM86 58l-16 6v8h16z"/>
    <circle class="fe blink" cx="44" cy="67" r="3"/><circle class="fe blink" cx="76" cy="67" r="3"/>
    <path class="fd" d="M46 88h28l-4 6H50z"/>`,
  // Desync: a creature split in two, the halves drifting out of sync.
  desync: `<g class="half-a"><path class="f2" d="M60 12C36 12 22 32 22 58c0 22 10 38 20 50l18-10z"/>
      <path class="f1" d="M60 18C40 18 28 35 28 58c0 19 8 33 16 43l16-9z"/><circle class="fe blink" cx="47" cy="54" r="5"/></g>
    <g class="half-b"><path class="f2" d="M60 12c24 0 38 20 38 46 0 22-10 38-20 50l-18-10z"/>
      <path class="f1" d="M60 18c20 0 32 17 32 40 0 19-8 33-16 43l-16-9z"/><circle class="fe blink" cx="73" cy="54" r="5"/></g>
    <path class="fd" d="M46 74h28v6H46z"/><path class="fe-ring" d="M60 8v104" stroke-dasharray="4 6"/>`,
  // Flame Troll: horned grin with a burning mane.
  troll: `<path class="flame f3" d="M18 60C8 40 22 30 18 10c12 10 18 16 18 26 4-12 12-18 12-30 8 12 12 20 12 28 2-10 8-16 14-24 4 12 4 20 2 28 6-8 12-10 18-14 0 14-4 24-8 32z"/>
    <path class="f2" d="M60 34c-26 0-40 18-40 42 0 22 18 36 40 36s40-14 40-36c0-24-14-42-40-42z"/>
    <path class="f1" d="M60 40c-22 0-34 15-34 36 0 19 15 31 34 31s34-12 34-31c0-21-12-36-34-36z"/>
    <path class="f2" d="M28 46 14 22l22 16zM92 46l14-24-22 16z"/>
    <path class="fd" d="M38 62l14 6-2 6-12-4zM82 62l-14 6 2 6 12-4z"/>
    <circle class="fe blink" cx="46" cy="68" r="3"/><circle class="fe blink" cx="74" cy="68" r="3"/>
    <path class="fd" d="M38 84c8 12 36 12 44 0-6 14-38 14-44 0z"/><path class="fe" d="M44 88l4 6 4-5 4 6 4-6 4 6 4-6 4 5 4-6z"/>`,
  // Clip Thief: masked bandit holding giant scissors.
  clipper: `<path class="f2" d="M60 20c-22 0-34 16-34 38v44c10 8 58 8 68 0V58c0-22-12-38-34-38z"/>
    <path class="f1" d="M60 26c-18 0-28 13-28 32v40c9 6 47 6 56 0V58c0-19-10-32-28-32z"/>
    <path class="fd" d="M28 46c10-4 54-4 64 0v16c-10 4-54 4-64 0z"/>
    <circle class="fe blink" cx="47" cy="54" r="4"/><circle class="fe blink" cx="73" cy="54" r="4"/>
    <path class="fd" d="M92 50c8 0 14 4 18 10-6-2-12-2-18 0z"/>
    <g class="snip" style="transform-origin:96px 86px"><path class="f3" d="M96 86 118 62l-3-3-21 25z"/><path class="f3" d="m96 86 24 14 2-4-24-13z"/>
      <circle class="fe-ring" cx="91" cy="90" r="5"/><circle class="fe-ring" cx="86" cy="80" r="5"/></g>`,
  // Echo: rings of sound around a hollow singing mouth.
  echo: `<circle class="f3 ring r1" cx="60" cy="60" r="54" fill="none"/><circle class="f3 ring r2" cx="60" cy="60" r="46" fill="none"/>
    <circle class="f2" cx="60" cy="60" r="38"/><circle class="f1" cx="60" cy="60" r="32"/>
    <path class="fd" d="M38 46c6-6 16-6 20 0M62 46c4-6 14-6 20 0"/>
    <ellipse class="fd" cx="60" cy="72" rx="12" ry="14"/><ellipse class="fe pulse-o" cx="60" cy="74" rx="6" ry="8" opacity=".7"/>
    <circle class="fe blink" cx="48" cy="52" r="3"/><circle class="fe blink" cx="72" cy="52" r="3"/>`,
};

// Each sprite gets its own gradients (ids must be unique on the page), lit from the top
// in the enemy's hue, plus a ground shadow and a few drifting motes.
let foeUid = 0;
const foeDefs = id => `<defs>
  <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:hsl(var(--h) 72% 48%)"/><stop offset="1" style="stop-color:hsl(var(--h) 80% 14%)"/></linearGradient>
  <radialGradient id="${id}i" cx=".42" cy=".28" r=".85"><stop offset="0" style="stop-color:hsl(var(--h) 100% 82%)"/><stop offset=".55" style="stop-color:hsl(var(--h) 80% 55%)"/><stop offset="1" style="stop-color:hsl(var(--h) 72% 34%)"/></radialGradient>
  <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:hsl(var(--h) 100% 90%)"/><stop offset="1" style="stop-color:hsl(var(--h) 100% 60%)"/></linearGradient>
</defs>`;
const foeSprite = (key, hue, cls = '') => {
  const id = 'fg' + (++foeUid);
  return `<div class="sprite foe foe-${key} ${cls}" style="--h:${hue};--gb:url(#${id}b);--gi:url(#${id}i);--ga:url(#${id}a)">
    <i class="foe-aura"></i><svg viewBox="0 0 120 120" aria-hidden="true">${foeDefs(id)}${FOE_SVG[key] || FOE_SVG.grunt}</svg>
    <i class="foe-shadow"></i><i class="foe-mote m1"></i><i class="foe-mote m2"></i><i class="foe-mote m3"></i></div>`;
};

// Round portrait of an enemy without art (turn order, stage list).
const foeChip = (key, hue, cls = 'face') =>
  `<div class="${cls} foe-chip" style="--h:${hue}"><svg viewBox="10 4 100 100" aria-hidden="true">${FOE_SVG[key] || FOE_SVG.grunt}</svg></div>`;
