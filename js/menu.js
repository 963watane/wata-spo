// Player profile card, the News board and the full-screen Menu (every feature in one grid).

// ---------- Profile ----------
function profileData() {
  if (!SAVE.profile) SAVE.profile = {};
  const p = SAVE.profile;
  if (!p.uid) p.uid = String(Math.floor(100000000 + Math.random() * 899999999));
  if (!p.joined) p.joined = todayStr();
  if (p.sig === undefined) p.sig = 'Producer of the best streams in town.';
  if (!p.avatar || !SAVE.chars[p.avatar]) p.avatar = SAVE.lobby in SAVE.chars ? SAVE.lobby : Object.keys(SAVE.chars)[0];
  // Showcase: up to 4 owned members, highest level first by default.
  p.showcase = (p.showcase || []).filter(id => SAVE.chars[id]);
  if (!p.showcase.length) p.showcase = Object.keys(SAVE.chars).sort((a, b) => SAVE.chars[b].lvl - SAVE.chars[a].lvl).slice(0, 4);
  return p;
}

let profileEdit = false;

RENDER.profile = () => {
  const pd = profileData(), pl = SAVE.player, need = rankXpNeed(pl.rank), s = SAVE.stats;
  const av = CHARACTERS[pd.avatar];
  const owned = Object.keys(SAVE.chars);
  const facts = [
    ['Battles won', s.wins.toLocaleString()], ['Recruits', s.pulls.toLocaleString()],
    ['Members', `${owned.length}/${Object.keys(CHARACTERS).length}`], ['Memories', Object.keys(SAVE.memories).length],
    ['Stage stars', `${totalStars(SAVE)}/${STAGES.length * 3}`], ['Tower', `Floor ${SAVE.tower.best}`],
    ['Achievements', `${Object.keys(SAVE.achieved).length}/${ACHIEVEMENTS.length}`], ['Best hit', s.bestHit.toLocaleString()],
  ];
  $('#profile').innerHTML = `
    ${topbar('Profile')}
    <div class="pfl" style="--c:${av.color}">
      <div class="pfl-bg"><img src="${ART[pd.avatar].url}" alt=""></div>
      <div class="pfl-card">
        <div class="pfl-head">
          <button class="pfl-avatar" title="Change avatar"><div class="face" style="${faceStyle(pd.avatar)}"></div><span>${ic('edit')}</span></button>
          <div class="pfl-id">
            <input class="pfl-name" maxlength="14" value="${escapeHtml(pl.name)}" title="Tap to rename">
            <small>UID ${pd.uid} · Since ${pd.joined}</small>
            <div class="pfl-rank"><b>RANK ${pl.rank}</b><div class="home-xp"><i style="width:${pl.xp / need * 100}%"></i></div><span>${pl.xp}/${need}</span></div>
          </div>
        </div>
        <label class="pfl-sig"><small>SIGNATURE</small><input maxlength="60" value="${escapeHtml(pd.sig)}" placeholder="Say something to your viewers"></label>
        <div class="pfl-avatars hidden">${owned.map(id => `<button class="${id === pd.avatar ? 'sel' : ''}" data-av="${id}"><div class="face" style="${faceStyle(id)}"></div></button>`).join('')}</div>
        <div class="pfl-facts">${facts.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
      </div>
      <div class="pfl-show">
        <div class="pfl-show-head"><h3>${ic('star')} Showcase</h3>
          <button class="pill ${profileEdit ? 'yellow' : 'dark'} pfl-edit">${profileEdit ? 'Done' : ic('edit') + ' Edit'}</button></div>
        <div class="pfl-cards">${(profileEdit ? owned : pd.showcase).map(id => {
          const c = CHARACTERS[id], own = SAVE.chars[id], on = pd.showcase.includes(id);
          return `<button class="pfl-mem ${profileEdit ? (on ? 'on' : 'off') : ''}" data-id="${id}" style="--c:${c.color}">
            <div class="pfl-mem-art" style="${bustStyle(id)}"></div>
            <div class="pfl-mem-info"><span>${elIc(c.element)}</span><b>${c.short}</b><em>Lv ${own.lvl}</em></div>
            <div class="pfl-mem-dupes">${'◆'.repeat(own.bond)}${'◇'.repeat(MAX_DUPES - own.bond)}</div>
            ${profileEdit ? `<i class="pfl-tick">${on ? ic('check') : ''}</i>` : ''}</button>`;
        }).join('')}</div>
        ${profileEdit ? '<p class="hint-inline">Pick up to 4 members to show on your card.</p>' : ''}
      </div>
    </div>`;
  const name = $('#profile .pfl-name');
  name.onchange = () => { SAVE.player.name = name.value.trim() || 'Producer'; persist(); };
  name.onkeydown = e => { if (e.key === 'Enter') name.blur(); };
  const sig = $('#profile .pfl-sig input');
  sig.onchange = () => { pd.sig = sig.value.trim(); persist(); };
  sig.onkeydown = e => { if (e.key === 'Enter') sig.blur(); };
  $('#profile .pfl-avatar').onclick = () => $('#profile .pfl-avatars').classList.toggle('hidden');
  document.querySelectorAll('#profile [data-av]').forEach(b => b.onclick = () => { pd.avatar = b.dataset.av; persist(); RENDER.profile(); });
  $('#profile .pfl-edit').onclick = () => { profileEdit = !profileEdit; RENDER.profile(); };
  document.querySelectorAll('#profile .pfl-mem').forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    if (!profileEdit) { membersSel = id; memberTab = 'overview'; show('members'); return; }
    if (pd.showcase.includes(id)) pd.showcase = pd.showcase.filter(x => x !== id);
    else if (pd.showcase.length < 4) pd.showcase.push(id);
    else return toast('The showcase holds 4 members');
    persist(); RENDER.profile();
  });
};

// ---------- News ----------
let newsSel = 0, newsTab = 'all';

function newsItems() {
  const { ev, ends } = eventNow(), raid = raidInfo(), sc = scheduleToday();
  const latest = typeof NOTES_VERSION !== 'undefined' ? UPDATE_NOTES.filter(n => n[0] === NOTES_VERSION) : [];
  const out = [];
  if (latest.length) out.push({ tag: 'update', title: `Version ${NOTES_VERSION} is here`, date: 'Now',
    art: sceneStyle(CHAPTERS[0].scene), body: latest.map(([, icon, t, d]) => `<p><b>${ic(icon)} ${t}</b><br>${d}</p>`).join(''), go: null });
  out.push({ tag: 'event', title: ev.name, date: timeLeft(ends), art: sceneStyle(ev.scene),
    body: `<p>${ev.desc}</p><p>Clear the event stages to earn <b>${ev.currency}</b> and trade them in the event shop, including the exclusive Memory <b>${ev.shop[0].name}</b>.</p>`,
    go: () => { liveTab = 'event'; show('live'); }, goLabel: 'Go to event' });
  Object.keys(BANNERS).forEach(bid => {
    const b = BANNERS[bid], info = bannerInfo(bid);
    out.push({ tag: 'banner', title: `${b.name} · ${info.upName}`, date: timeLeft(bannerEnds()), art: bannerArtStyle(bid),
      body: `<p>${info.label} rate-up: <b>${info.upName}</b>.</p><p>${info.isMem ? memPassiveText(b.rateUp, info.owner) : `${CHARACTERS[b.rateUp].kit.ult.name}: ${CHARACTERS[b.rateUp].kit.ult.desc}`}</p>
        <p>${b.upChance >= 1 ? 'Every ★5 on this banner is the rate-up.' : 'Lose the 50/50 and the next ★5 is guaranteed to be the rate-up.'}</p>`,
      go: () => { recruitTab = bid; show('recruit'); }, goLabel: 'Recruit' });
  });
  out.push({ tag: 'event', title: `Ranked Raid · ${ENEMIES[raid.boss].name}`, date: timeLeft(raid.ends), art: ENEMIES[raid.boss].art ? `background-image:url('${ENEMIES[raid.boss].art}')` : sceneStyle('rooftop'),
    body: `<p>This week's rules: ${raid.mods.map(m => `<b>${RAID_MODS[m].name}</b> (${RAID_MODS[m].desc})`).join(' and ')}.</p><p>Deal as much damage as you can in ${RAID_TURNS} member turns. Every score tier pays out once per week.</p>`,
    go: () => { liveTab = 'raid'; show('live'); }, goLabel: 'Go to raid' });
  out.push({ tag: 'notice', title: `Daily Stream: ${sc.name}`, date: 'Today', art: sceneStyle(CHAPTERS[1].scene),
    body: `<p>Today's Daily Stream pays ${sc.give.map(k => ({ exp: 'Superchat Tokens', coins: 'Spo Coins', gems: 'Gems', gifts: 'gifts' }[k])).join(', ')}. You have ${dailyRunsLeft()} of ${DAILY_RUNS} runs left.</p>`,
    go: () => { liveTab = 'daily'; show('live'); }, goLabel: 'Go live' });
  out.push({ tag: 'notice', title: 'Tip: every element breaks differently', date: 'Guide', art: sceneStyle(CHAPTERS[2].scene),
    body: `<p>Empty an enemy's Stagger bar to Break it. The element of the member who lands the Break adds an effect:</p>
      ${Object.entries(BREAK_FX).map(([k, f]) => `<p>${elIc(k)} <b>${ELEMENTS[k].name} · ${f.name}</b>: the enemy ${f.desc}.</p>`).join('')}`,
    go: () => openHelp('battle'), goLabel: 'How to play' });
  return out;
}

const NEWS_TABS = { all: 'All', event: 'Events', banner: 'Banners', update: 'Updates', notice: 'Notices' };

RENDER.news = () => {
  const all = newsItems(), list = newsTab === 'all' ? all : all.filter(n => n.tag === newsTab);
  if (newsSel >= list.length) newsSel = 0;
  const n = list[newsSel];
  $('#news').innerHTML = `
    ${topbar('News')}
    <div class="nw">
      <div class="nw-side">
        <div class="nw-tabs">${Object.entries(NEWS_TABS).map(([k, l]) => `<button class="${k === newsTab ? 'sel' : ''}" data-nt="${k}">${l}</button>`).join('')}</div>
        <div class="nw-list">${list.map((x, i) => `<button class="nw-item ${i === newsSel ? 'sel' : ''}" data-i="${i}">
          <span class="nw-tag t-${x.tag}">${NEWS_TABS[x.tag]}</span><b>${x.title}</b><small>${x.date}</small></button>`).join('')}</div>
      </div>
      ${n ? `<article class="nw-main">
        <div class="nw-banner" style="${n.art}"><span class="nw-tag t-${n.tag}">${NEWS_TABS[n.tag]}</span></div>
        <h2>${n.title}</h2><small class="nw-date">${n.date}</small>
        <div class="nw-body">${n.body}</div>
        ${n.go ? `<button class="pill yellow nw-go">${n.goLabel} ${ic('next')}</button>` : ''}
      </article>` : '<article class="nw-main"><p class="hint-inline">Nothing here right now.</p></article>'}
    </div>`;
  document.querySelectorAll('#news [data-nt]').forEach(b => b.onclick = () => { newsTab = b.dataset.nt; newsSel = 0; RENDER.news(); });
  document.querySelectorAll('#news .nw-item').forEach(b => b.onclick = () => { newsSel = Number(b.dataset.i); RENDER.news(); });
  const go = $('#news .nw-go');
  if (go && n && n.go) go.onclick = () => n.go();
};

// ---------- Menu ----------
function menuItems() {
  return [
    { go: 'stages', ico: 'story', label: 'Story', sub: `Chapter ${currentChapter().id}` },
    { go: 'recruit', ico: 'recruit', label: 'Recruit', sub: daily().freePull ? `${Object.keys(BANNERS).length} banners` : 'Free pull!', badge: daily().freePull ? 0 : '!' },
    { go: 'tower', ico: 'tower', label: 'Tower', sub: `Floor ${SAVE.tower.best}/${TOWER_FLOORS}` },
    { go: 'rift', ico: 'map', label: 'Bracket Run', sub: SAVE.run ? `Round ${SAVE.run.node + 1}` : 'Roguelite' },
    { go: 'members', ico: 'members', label: 'Members', sub: `${Object.keys(SAVE.chars).length}/${Object.keys(CHARACTERS).length}` },
    { act: () => openTeam(), ico: 'team', label: 'Team', sub: SAVE.teams[SAVE.teamIdx].name },
    { act: () => { liveTab = 'event'; show('live'); }, ico: 'ticket', label: 'Event', sub: eventNow().ev.name },
    { act: () => { liveTab = 'raid'; show('live'); }, ico: 'raid', label: 'Ranked Raid', sub: ENEMIES[raidInfo().boss].name },
    { act: () => { liveTab = 'daily'; show('live'); }, ico: 'live', label: 'Daily Stream', sub: `${dailyRunsLeft()}/${DAILY_RUNS} runs`, badge: dailyRunsLeft() === DAILY_RUNS ? '!' : 0 },
    { go: 'missions', ico: 'missions', label: 'Missions', sub: 'Daily · weekly', badge: missionBadge() },
    { go: 'talks', ico: 'talks', label: 'Talks', sub: 'Off-stream', badge: newTalks() },
    { go: 'shop', ico: 'shop', label: 'Shop', sub: `${SAVE.coins.toLocaleString()} coins` },
    { go: 'records', ico: 'trophy', label: 'Records', sub: 'Achievements', badge: claimableAchievements() },
    { go: 'album', ico: 'album', label: 'Backdrops', sub: 'Scenes' },
    { act: () => openLogin(), ico: 'login', label: 'Login', sub: loginReady() ? 'Claim now!' : `Day ${SAVE.login.day}`, badge: loginReady() ? '!' : 0 },
    { go: 'news', ico: 'news', label: 'News', sub: 'Events & updates' },
    { go: 'profile', ico: 'user', label: 'Profile', sub: SAVE.player.name },
    { go: 'settings', ico: 'settings', label: 'Settings', sub: 'Sound, backup' },
    { act: () => openHelp(), ico: 'info', label: 'How to play', sub: 'Guide' },
  ];
}
const menuBadge = () => menuItems().reduce((a, m) => a + (m.badge === '!' ? 1 : m.badge || 0), 0);

function openMenu() {
  const items = menuItems(), pl = SAVE.player, pd = profileData();
  const el = document.createElement('div');
  el.className = 'mn';
  el.innerHTML = `<div class="mn-bg"></div>
    <div class="mn-box">
      <div class="mn-head">
        <div class="face" style="${faceStyle(pd.avatar)}"></div>
        <div><b>${escapeHtml(pl.name)}</b><small>RANK ${pl.rank} · UID ${pd.uid}</small></div>
        <button class="mn-close" title="Close">${ic('close')}</button>
      </div>
      <div class="mn-grid">${items.map((m, i) => `<button class="mn-item" data-i="${i}" style="--i:${i}">
        <span class="mn-ico">${ic(m.ico)}</span><b>${m.label}</b><small>${m.sub}</small>${badge(m.badge)}</button>`).join('')}</div>
      <div class="mn-foot">WATA SPO 3.0 · fan-made and non-commercial</div>
    </div>`;
  $('#app').appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 220); };
  el.querySelector('.mn-bg').onclick = close;
  el.querySelector('.mn-close').onclick = close;
  el.querySelectorAll('.mn-item').forEach(b => b.onclick = () => {
    const m = items[Number(b.dataset.i)];
    el.remove();
    if (m.go) show(m.go); else m.act();
  });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
}
