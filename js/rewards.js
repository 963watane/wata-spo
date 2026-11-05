// "Rewards Obtained" screen: light rays, item cards that pop in one by one with
// counting numbers, sparkles and sounds. showRewards(items, { title, sub }) returns
// a promise that resolves once the player taps to continue.
// An item is { kind, n } where kind is gem | token | coin | xp, or a custom
// { icon, name, n, rarity } (icon = icon name), or { art, name, rarity, tag } for a card picture
// (tag replaces the "NEW" label on items without a count).

const REWARD_STYLE = {
  gem:   { name: 'Gems', rarity: 5 },
  token: { name: 'Superchat Tokens', rarity: 4 },
  coin:  { name: 'Spo Coins', rarity: 4 },
  xp:    { name: 'Producer XP', rarity: 3, icon: 'star' },
};

// { gems, exp, coins } -> reward items.
const rewardItems = (r = {}) => [r.gems && { kind: 'gem', n: r.gems }, r.exp && { kind: 'token', n: r.exp }, r.coins && { kind: 'coin', n: r.coins }].filter(Boolean);
// Result of randomGifts() -> reward items.
const giftItems = got => Object.entries(got || {}).map(([g, c]) => ({ icon: GIFTS[g].icon, name: GIFTS[g].name, n: c, rarity: 4 }));

function rewardCard(it, i) {
  const st = REWARD_STYLE[it.kind] || {};
  const rarity = it.rarity || st.rarity || 3;
  const pic = it.art ? `<div class="rw-art" style="${it.art}"></div>` : `<div class="rw-icon">${ic(it.icon || st.icon || it.kind)}</div>`;
  return `<div class="rw-card r${rarity}" data-n="${it.n || 0}" style="--i:${i}">
    <div class="rw-tile"><i class="rw-burst"></i>${pic}<i class="rw-shine"></i><div class="rw-stars">${'★'.repeat(rarity)}</div></div>
    ${it.n ? '<div class="rw-n">×<b>0</b></div>' : `<div class="rw-n new">${it.tag || 'NEW'}</div>`}
    <div class="rw-name">${it.name || st.name || it.kind}</div></div>`;
}

function countUp(el, to, ms) {
  if (!el) return;
  const t0 = performance.now();
  const step = t => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString();
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Two claims in a row show one after the other.
let rewardQueue = Promise.resolve();
function showRewards(items, opts = {}) {
  items = (items || []).filter(Boolean);
  if (!items.length) return Promise.resolve();
  rewardQueue = rewardQueue.then(() => openRewards(items, opts));
  return rewardQueue;
}

function openRewards(items, { title = 'Rewards Obtained', sub = '' } = {}) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'rw' + (SAVE.settings.flashes === false || SAVE.settings.gfx === 'low' ? ' visual-calm' : '');
    el.innerHTML = `<div class="rw-bg"><i class="rw-rays"></i><i class="rw-glow"></i></div>
      <div class="rw-sparks">${Array.from({ length: 22 }, () => `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 4).toFixed(2)}s;--s:${(0.5 + Math.random()).toFixed(2)}"></i>`).join('')}</div>
      <div class="rw-head">${sub ? `<em>${sub}</em>` : ''}<h2>${title}</h2><i class="rw-line"></i></div>
      <div class="rw-items n${Math.min(items.length, 6)}">${items.map(rewardCard).join('')}</div>
      <button class="rw-tap" type="button">Reveal all</button>`;
    $('#app').appendChild(el);
    const priorFocus = document.activeElement;
    el.querySelector('.rw-tap').focus({ preventScroll: true });
    sfx('reward');
    const cards = [...el.querySelectorAll('.rw-card')];
    let shown = 0;
    const reveal = c => {
      if (c.classList.contains('in')) return;
      c.classList.add('in');
      shown++;
      const b = c.querySelector('.rw-n b');
      if (b) countUp(b, Number(c.dataset.n), 650);
      if (shown === cards.length) {
        el.querySelector('.rw-tap').textContent = 'Continue';
        setTimeout(() => el.classList.add('ready'), 250);
      }
    };
    cards.forEach((c, i) => setTimeout(() => { if (el.isConnected && !c.classList.contains('in')) { reveal(c); sfx('rewardItem'); } }, 480 + i * 120));
    el.addEventListener('click', e => {
      e.stopPropagation();
      // First tap shows everything at once; the next one closes.
      if (shown < cards.length) { cards.forEach(reveal); return; }
      if (el.classList.contains('out')) return;
      el.classList.add('out');
      setTimeout(() => { el.remove(); if (priorFocus?.isConnected) priorFocus.focus({ preventScroll: true }); resolve(); }, 280);
    });
  });
}
