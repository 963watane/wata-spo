// Extra screens: Stream Tower, Shop, Settings and recruit history.

// ---------- Stream Tower ----------
let towerSel = null;

RENDER.tower = () => {
  const best = SAVE.tower.best, next = Math.min(best + 1, TOWER_FLOORS);
  if (towerSel === null || towerSel > next) towerSel = next;
  const st = towerStage(towerSel);
  const foes = [...new Set(st.waves.flat())];
  const cleared = towerSel <= best;
  $('#tower').innerHTML = `
    ${topbar('Stream Tower')}
    <div class="tw">
      <div class="tw-info" style="${sceneStyle(towerBg(towerSel))}">
        <div class="tw-info-inner">
          <em>${st.boss ? 'BOSS FLOOR' : 'FLOOR'}</em>
          <h2>${towerSel}<small>/${TOWER_FLOORS}</small></h2>
          <p>${st.name}</p>
          <div class="tw-meta">Enemy Lv ${st.level} · Recommended Lv ${recLevel(st.level)} · ${st.waves.length} wave${st.waves.length > 1 ? 's' : ''}</div>
          <div class="tw-foes">${foes.map(k => `<div class="tw-foe" title="${ENEMIES[k].name}">${enemyFace(k)}<span>${ENEMIES[k].name}</span><i class="tw-weak">${weakIcons(k)}</i></div>`).join('')}</div>
          <div class="tw-rew">${cleared ? `<span class="ok">${ic('check')} Cleared · replay for XP</span>`
            : `First clear: <span class="coin">${amt('coin', st.reward.coins)}</span>${st.reward.gems ? ` <span class="gem">${amt('gem', st.reward.gems)}</span>` : ''}`}</div>
          <button class="pill yellow tw-go" ${towerSel > next ? 'disabled' : ''}>${cleared ? 'Replay ' + ic('play') : 'Challenge ' + ic('play')}</button>
        </div>
      </div>
      <div class="tw-list">${Array.from({ length: TOWER_FLOORS }, (_, i) => TOWER_FLOORS - i).map(f => {
        const s = towerStage(f), state = f <= best ? 'done' : f === next ? 'next' : 'locked';
        return `<button class="tw-floor ${state} ${s.boss ? 'boss' : ''} ${f === towerSel ? 'sel' : ''}" data-f="${f}" ${state === 'locked' ? 'disabled' : ''}>
          <b>${f}</b><span>${s.boss ? s.name.split('· ')[1] : `Lv ${s.level}`}</span>
          <i>${ic(state === 'done' ? 'check' : state === 'next' ? 'play' : 'lock')}</i></button>`;
      }).join('')}</div>
    </div>`;
  document.querySelectorAll('#tower .tw-floor').forEach(b => b.onclick = () => { towerSel = Number(b.dataset.f); RENDER.tower(); });
  $('#tower .tw-go').onclick = () => openTeam(towerStage(towerSel));
  const selEl = $('#tower .tw-floor.sel');
  if (selEl) selEl.scrollIntoView({ block: 'center' });
};

// ---------- Shop ----------
// One discounted deal a day (the same for everyone on that date). was = normal price.
const DEALS = [
  { id: 'deal-gems', name: 'Gem Pack ×300', desc: 'Pull currency.', price: 300, was: 500, icon: 'gem', give: { gems: 300 } },
  { id: 'deal-gifts', name: 'Gift Bundle ×4', desc: '4 random gifts for bonds.', price: 200, was: 320, icon: 'gift', gifts: 4 },
  { id: 'deal-tokens', name: 'Superchat ×12000', desc: 'Level and skill currency.', price: 220, was: 360, icon: 'token', give: { exp: 12000 } },
  { id: 'deal-dupe', name: 'Duplicate Token', desc: 'Pick a member.', price: 550, was: 800, icon: 'spark', pick: 'char' },
  { id: 'deal-rank', name: 'Memory Rank Up', desc: 'Pick a Memory below Rank 5.', price: 330, was: 500, icon: 'recruit', pick: 'memory' },
];
const dealToday = () => Object.assign({}, DEALS[((dayIndex(new Date()) % DEALS.length) + DEALS.length) % DEALS.length], { daily: 1 });

RENDER.shop = () => {
  const d = daily(), deal = dealToday(), dealSold = (d.shop[deal.id] || 0) >= 1;
  const msLeft = new Date(new Date().setHours(24, 0, 0, 0)) - new Date();
  $('#shop').innerHTML = `
    ${topbar('Shop')}
    <p class="screen-sub">Earn <span class="coin">${ic('coin')} Spo Coins</span> from the Stream Tower, the Daily Stream and missions.</p>
    <div class="shop-deal ${dealSold ? 'sold' : ''}">
      <div class="deal-tag"><b>DEAL OF THE DAY</b><span>-${Math.round((1 - deal.price / deal.was) * 100)}%</span></div>
      <div class="shop-ico">${ic(deal.icon)}</div>
      <div class="deal-t"><b>${deal.name}</b><p>${deal.desc}</p><small>${ic('timer')} New deal in ${Math.floor(msLeft / 3600000)}h ${Math.floor(msLeft / 60000) % 60}m</small></div>
      <div class="deal-buy"><s>${amt('coin', deal.was)}</s>
        <button class="pill ${SAVE.coins >= deal.price && !dealSold ? 'yellow' : 'dark'} buy-deal" ${SAVE.coins >= deal.price && !dealSold ? '' : 'disabled'}>${dealSold ? 'Bought' : amt('coin', deal.price)}</button></div>
    </div>
    <div class="shop-grid">${SHOP.map(item => {
      const bought = d.shop[item.id] || 0;
      const soldOut = item.daily && bought >= item.daily;
      return `<div class="shop-item ${soldOut ? 'sold' : ''}">
        <div class="shop-ico">${ic(item.icon)}</div>
        <b>${item.name}</b><p>${item.desc}</p>
        ${item.daily ? `<small>Today: ${bought}/${item.daily}</small>` : ''}
        <button class="pill ${SAVE.coins >= item.price && !soldOut ? 'yellow' : 'dark'} buy" data-id="${item.id}" ${SAVE.coins >= item.price && !soldOut ? '' : 'disabled'}>
          ${soldOut ? 'Sold out' : `${amt('coin', item.price)}`}</button>
      </div>`;
    }).join('')}</div>`;
  document.querySelectorAll('#shop .buy').forEach(b => b.onclick = () => buyItem(SHOP.find(s => s.id === b.dataset.id)));
  const bd = $('#shop .buy-deal');
  if (bd) bd.onclick = () => buyItem(deal);
};

function buyItem(item) {
  if (SAVE.coins < item.price) return toast('Not enough Spo Coins');
  const pay = () => { SAVE.coins -= item.price; daily().shop[item.id] = (daily().shop[item.id] || 0) + 1; };
  if (item.pick === 'char') {
    const ids = Object.keys(SAVE.chars).filter(id => SAVE.chars[id].bond + SAVE.chars[id].tokens < MAX_DUPES);
    if (!ids.length) return toast('Every member already has max duplicates');
    return openChooser('Duplicate token for…', ids.map(id => ({ id, label: CHARACTERS[id].short, sub: `${SAVE.chars[id].bond}/${MAX_DUPES} · ${SAVE.chars[id].tokens} tokens`, face: faceStyle(id) })), id => {
      pay(); SAVE.chars[id].tokens++; persist(); RENDER.shop();
      showRewards([{ art: faceStyle(id), name: `${CHARACTERS[id].short} Duplicate Token`, n: 1, rarity: 5 }], { title: 'Purchased', sub: 'UNLOCK IT ON THE MEMBERS SCREEN' });
    });
  }
  if (item.pick === 'memory') {
    const ids = Object.keys(SAVE.memories).filter(m => SAVE.memories[m].rank < MAX_MEM_RANK);
    if (!ids.length) return toast('No Memories below Rank 5');
    return openChooser('Rank up which Memory?', ids.map(m => ({ id: m, label: MEMORIES[m].name, sub: `Rank ${SAVE.memories[m].rank} → ${SAVE.memories[m].rank + 1}`, mem: m })), m => {
      pay(); SAVE.memories[m].rank++; persist(); RENDER.shop();
      showRewards([{ art: memArtStyle(m), name: MEMORIES[m].name, rarity: MEMORIES[m].rarity, tag: `RANK ${SAVE.memories[m].rank}` }], { title: 'Memory Ranked Up' });
    });
  }
  if (item.gifts) {
    pay(); const got = randomGifts(item.gifts); persist(); RENDER.shop();
    return showRewards(giftItems(got), { title: 'Purchased', sub: item.name.toUpperCase() });
  }
  pay();
  giveReward(item.give);
  persist(); RENDER.shop();
  showRewards(rewardItems(item.give), { title: 'Purchased', sub: item.name.toUpperCase() });
}

function openChooser(title, options, onPick) {
  openModal(`<div class="picker-head"><h3>${title}</h3><button class="btn small close">${ic('close')}</button></div>
    <div class="picker-list">${options.map(o => `
      <button class="picker-item" data-id="${o.id}">
        ${o.face ? `<div class="face" style="${o.face}"></div>` : `<div class="mem-card mini">${memCardInner(o.mem)}</div>`}
        <div class="picker-text"><b>${o.label}</b><small>${o.sub}</small></div></button>`).join('')}</div>`);
  document.querySelectorAll('#pull .picker-item').forEach(b => b.onclick = () => {
    const ov = $('#pull'); ov.className = 'overlay'; ov.innerHTML = '';
    onPick(b.dataset.id);
  });
}

// ---------- Settings ----------
RENDER.settings = () => {
  const s = SAVE.settings;
  const credits = [...Object.values(SCENES), ...Object.values(BACKGROUNDS)].filter(x => x.credit).map(x => `<li>${x.title} — ${x.credit}</li>`).join('');
  $('#settings').innerHTML = `
    ${topbar('Settings')}
    <div class="set-wrap">
      <section class="set-card">
        <h3>${ic('sound')} Sound</h3>
        <label class="set-row"><span>${ic('music')} Music</span><button class="toggle ${s.music ? 'on' : ''}" data-set="music"><i></i></button></label>
        <label class="set-row"><span>Music volume</span><input type="range" min="0" max="1" step="0.05" value="${s.musicVolume}" class="mvol"></label>
        <label class="set-row"><span>${ic('sound')} Sound effects</span><button class="toggle ${s.sound ? 'on' : ''}" data-set="sound"><i></i></button></label>
        <label class="set-row"><span>Effects volume</span><input type="range" min="0" max="1" step="0.05" value="${s.volume}" class="vol"></label>
        <p class="set-note">Music plays from files in assets/music (see the README there). Until you add tracks, it stays silent.</p>
      </section>
      <section class="set-card">
        <h3>Gameplay</h3>
        <div class="set-row"><span>Story text speed</span><div class="seg">${[['Slow', 1], ['Normal', 2], ['Fast', 4], ['Instant', 99]].map(([l, v]) =>
          `<button class="${s.textSpeed === v ? 'sel' : ''}" data-text="${v}">${l}</button>`).join('')}</div></div>
        <div class="set-row"><span>Battle speed</span><div class="seg">${[1, 2, 3].map(v =>
          `<button class="${BATTLE_PREFS.speed === v ? 'sel' : ''}" data-speed="${v}">x${v}</button>`).join('')}</div></div>
        <label class="set-row"><span>Start battles on Auto</span><button class="toggle ${BATTLE_PREFS.auto ? 'on' : ''}" data-set="auto"><i></i></button></label>
        <div class="set-row"><span>Ultimate animation</span><div class="seg">${[['full', 'Full'], ['short', 'Short'], ['off', 'Off']].map(([v, l]) =>
          `<button class="${s.cutins === v ? 'sel' : ''}" data-cut="${v}">${l}</button>`).join('')}</div></div>
        <label class="set-row"><span>Screen shake</span><button class="toggle ${s.shake ? 'on' : ''}" data-set="shake"><i></i></button></label>
        <label class="set-row"><span>Bright flashes</span><button class="toggle ${s.flashes ? 'on' : ''}" data-set="flashes"><i></i></button></label>
        <p class="set-note">Battle keys: WASD / arrows Move · Space Dodge · E Skill · Q Ultimate · 1 / 2 Supports · F Auto · Esc Pause. Between story areas, walk forward or press Enter for assisted walking.</p>
      </section>
      <section class="set-card">
        <h3>Save data</h3>
        <p class="set-note">Your progress lives in this browser. Export a backup code before clearing browser data or moving to another device.</p>
        <div class="set-btns"><button class="pill light export">Export backup</button><button class="pill dark import">Import backup</button></div>
        <textarea class="save-code hidden" spellcheck="false"></textarea>
        <div class="set-btns hidden import-row"><button class="pill yellow do-import">Load this backup</button></div>
        <button class="link reset">Reset save</button>
      </section>
      <section class="set-card">
        <h3>Cloud save</h3>
        ${cloudReady() ? `<p class="set-note">Upload your progress, then enter the transfer code on another device. Keep the code private: it works like a password.</p>
          <div class="set-row"><span>Your transfer code</span><b class="cloud-code">${SAVE.cloudId || 'Upload once to get one'}</b></div>
          <div class="set-btns"><button class="pill light cloud-up">Upload save</button><button class="pill dark cloud-down">Load from code</button></div>
          <div class="set-btns hidden cloud-row"><input class="cloud-input" placeholder="XXXX-XXXX-XXXX" maxlength="14"><button class="pill yellow cloud-load">Load</button></div>`
          : '<p class="set-note">Not connected yet. The game owner can turn on cloud saves and the online Ranked Raid leaderboard by following CLOUD_SETUP.md. Until then, use the backup code above.</p>'}
      </section>
      <section class="set-card">
        <h3>About</h3>
        <p class="set-note">WATA☆SPO is an unofficial, non-commercial fan game. Characters belong to VSPO! / Brave group. Art belongs to its artists.</p>
        ${credits ? `<p class="set-note">Art credits:</p><ul class="set-credits">${credits}</ul>` : ''}
        <p class="set-note">Original environment illustrations: WATA SPO, generated with OpenAI image generation. Source prompts and asset details are in assets/environment/README.md.</p>
        <p class="set-note">3D model credits:</p><ul class="set-credits">${Object.values(MODEL_CREDITS).map(m =>
          `<li>${m.title} — <a href="${m.url}" target="_blank" rel="noopener">${m.by}</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">${m.license}</a>; ${m.changes}</li>`).join('')}</ul>
      </section>
    </div>`;
  const rerender = () => { persist(); saveBattlePrefs(); RENDER.settings(); };
  $('#settings [data-set="sound"]').onclick = () => { s.sound = !s.sound; rerender(); if (s.sound) sfx('coin'); };
  $('#settings [data-set="auto"]').onclick = () => { BATTLE_PREFS.auto = !BATTLE_PREFS.auto; rerender(); };
  $('#settings [data-set="music"]').onclick = () => { s.music = !s.music; rerender(); updateMusicVolume(); };
  $('#settings .mvol').oninput = e => { s.musicVolume = Number(e.target.value); persist(); updateMusicVolume(); };
  $('#settings [data-set="shake"]').onclick = () => { s.shake = !s.shake; rerender(); };
  $('#settings [data-set="flashes"]').onclick = () => { s.flashes = !s.flashes; rerender(); };
  document.querySelectorAll('#settings [data-cut]').forEach(b => b.onclick = () => { s.cutins = b.dataset.cut; rerender(); });
  $('#settings .vol').oninput = e => { s.volume = Number(e.target.value); persist(); };
  $('#settings .vol').onchange = () => sfx('coin');
  document.querySelectorAll('#settings [data-text]').forEach(b => b.onclick = () => { s.textSpeed = Number(b.dataset.text); rerender(); });
  document.querySelectorAll('#settings [data-speed]').forEach(b => b.onclick = () => { BATTLE_PREFS.speed = Number(b.dataset.speed); rerender(); });
  const code = $('#settings .save-code');
  $('#settings .export').onclick = async () => {
    code.value = btoa(unescape(encodeURIComponent(JSON.stringify(SAVE))));
    code.classList.remove('hidden');
    $('#settings .import-row').classList.add('hidden');
    code.select();
    try { await navigator.clipboard.writeText(code.value); toast('Backup code copied'); } catch (e) { toast('Copy the code from the box'); }
  };
  $('#settings .import').onclick = () => {
    code.value = ''; code.placeholder = 'Paste a backup code here';
    code.classList.remove('hidden');
    $('#settings .import-row').classList.remove('hidden');
    code.focus();
  };
  $('#settings .do-import').onclick = () => {
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(code.value.trim()))));
      if (!data || !data.chars) throw new Error('not a save');
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      SAVE = loadSave();
      persist();
      toast('Backup loaded');
      show('lobby');
    } catch (e) { toast('That code isn\'t a valid backup'); }
  };
  if (cloudReady()) {
    $('#settings .cloud-up').onclick = async () => {
      try { await cloudSave(); toast('Uploaded to the cloud'); RENDER.settings(); } catch (e) { toast('Upload failed. Check your connection'); }
    };
    $('#settings .cloud-down').onclick = () => $('#settings .cloud-row').classList.remove('hidden');
    $('#settings .cloud-load').onclick = async () => {
      try {
        const data = await cloudLoad($('#settings .cloud-input').value);
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        SAVE = loadSave(); persist();
        toast('Cloud save loaded'); show('lobby');
      } catch (e) { toast('No save found for that code'); }
    };
  }
  $('#settings .reset').onclick = e => {
    const b = e.currentTarget;
    if (!b.classList.contains('armed')) {
      b.classList.add('armed');
      b.textContent = 'Tap again to erase ALL progress';
      setTimeout(() => { b.classList.remove('armed'); b.textContent = 'Reset save'; }, 3000);
      return;
    }
    resetSave(); toast('Save reset'); show('lobby');
  };
};

// ---------- Recruit history ----------
function openHistory() {
  const rows = SAVE.history.slice(0, 100);
  const nameOf = h => h.type === 'item' ? 'Superchat Tokens' : h.type === 'memory' ? MEMORIES[h.id].name : CHARACTERS[h.id].name;
  const fives = SAVE.history.filter(h => h.r === 5).length;
  openModal(`<div class="picker-head"><h3>Recruit History</h3><button class="btn small close">${ic('close')}</button></div>
    <p class="hint-inline">Last ${rows.length} of ${SAVE.history.length} recruits · ★5 total: ${fives}</p>
    <div class="hist-list">${rows.length ? rows.map(h => `
      <div class="hist-row r${h.r}"><span class="hist-r">${'★'.repeat(h.r)}</span><b>${nameOf(h)}</b>
        <span class="hist-b">${BANNERS[h.b] ? BANNERS[h.b].name : ''}</span>
        <span class="hist-t">${new Date(h.t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>`).join('')
      : '<p class="hint-inline">No recruits yet.</p>'}</div>`);
}
