// Live systems: limited events, Ranked Raid, daily stream schedule, bonds
// and gifts, achievements / enemy log, and first-launch onboarding.
// Content lives in live-data.js.

const DAY_MS = 86400000;
const dayIndex = d => Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - EVENT_EPOCH) / DAY_MS);

// ---------- Events ----------
function eventNow() {
  const ids = Object.keys(EVENTS), idx = Math.floor(dayIndex(new Date()) / EVENT_DAYS);
  const id = ids[((idx % ids.length) + ids.length) % ids.length];
  const ends = new Date(EVENT_EPOCH.getTime() + (idx + 1) * EVENT_DAYS * DAY_MS);
  return { id, ev: EVENTS[id], ends };
}
function eventState(id) {
  if (!SAVE.events[id]) SAVE.events[id] = { tokens: 0, cleared: {}, shop: {} };
  return SAVE.events[id];
}
// Battle stage object for an event stage.
const eventStage = (eid, st) => Object.assign({}, st, { event: eid, hub: 'event' });
const eventStageUnlocked = (eid, i) => i === 0 || !!eventState(eid).cleared[EVENTS[eid].stages[i - 1].id];

// Event stories play like story stages (see startStage).
Object.values(EVENTS).forEach(ev => Object.entries(ev.story).forEach(([sid, lines]) => { STORY[sid] = { before: lines }; }));

function eventStageResult(stage) {
  const ev = EVENTS[stage.event], es = eventState(stage.event), first = !es.cleared[stage.id];
  es.tokens += stage.reward.tokens;
  es.earned = (es.earned || 0) + stage.reward.tokens;   // lifetime total, for milestones
  es.cleared[stage.id] = true;
  SAVE.stats.eventClears++;
  bumpWeekly('event');
  const label = first ? giveReward(stage.first) : '';
  const xp = 20 + stage.level * 12, ranks = addPlayerXp(xp);
  return `<div class="rewards">${first ? '<div class="first">FIRST CLEAR</div>' : ''}
    <span>${amt(ev.cur, '+' + stage.reward.tokens)}</span>${label ? `<span>${label}</span>` : ''}<span class="xp">+${xp} XP</span></div>
    ${ranks ? `<div class="rank-up">RANK UP! Rank ${SAVE.player.rank}</div>` : ''}`;
}

function buyEventItem(eid, item) {
  const es = eventState(eid), ev = EVENTS[eid], bought = es.shop[item.id] || 0;
  if (bought >= item.stock) return toast('Sold out');
  if (es.tokens < item.price) return toast(`Not enough ${ev.currency}`);
  if (item.memoryRank && !SAVE.memories[item.memoryRank]) return toast(`Get ${MEMORIES[item.memoryRank].name} first`);
  const pay = () => { es.tokens -= item.price; es.shop[item.id] = bought + 1; };
  if (item.pick === 'char') {
    const ids = Object.keys(SAVE.chars).filter(id => SAVE.chars[id].bond + SAVE.chars[id].tokens < MAX_DUPES);
    if (!ids.length) return toast('Every member already has max duplicates');
    return openChooser('Duplicate token for…', ids.map(id => ({ id, label: CHARACTERS[id].short, sub: `${SAVE.chars[id].bond}/${MAX_DUPES}`, face: faceStyle(id) })), id => {
      pay(); SAVE.chars[id].tokens++; persist(); RENDER.live();
      showRewards([{ art: faceStyle(id), name: `${CHARACTERS[id].short} Duplicate Token`, n: 1, rarity: 5 }], { title: 'Purchased', sub: ev.name.toUpperCase() });
    });
  }
  pay();
  let items;
  if (item.memory) {
    SAVE.memories[item.memory] = { rank: 1 };
    items = [{ art: memArtStyle(item.memory), name: MEMORIES[item.memory].name, rarity: MEMORIES[item.memory].rarity }];
  } else if (item.memoryRank) {
    const m = SAVE.memories[item.memoryRank];
    m.rank = Math.min(MAX_MEM_RANK, m.rank + 1);
    items = [{ art: memArtStyle(item.memoryRank), name: MEMORIES[item.memoryRank].name, rarity: MEMORIES[item.memoryRank].rarity, tag: `RANK ${m.rank}` }];
  } else if (item.gifts) items = giftItems(randomGifts(item.gifts));
  else { giveReward(item.give); items = rewardItems(item.give); }
  persist(); RENDER.live();
  showRewards(items, { title: item.memory ? 'New Memory' : 'Purchased', sub: ev.name.toUpperCase() });
}

// ---------- Ranked Raid ----------
// Weeks start on Monday; the id is that Monday's date.
function raidWeek(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
function raidInfo() {
  const mon = raidWeek(), n = Math.floor(dayIndex(mon) / 7);
  const modIds = Object.keys(RAID_MODS);
  const a = ((n * 3) % modIds.length + modIds.length) % modIds.length, b = ((n * 5 + 2) % modIds.length + modIds.length) % modIds.length;
  const mods = a === b ? [modIds[a], modIds[(b + 1) % modIds.length]] : [modIds[a], modIds[b]];
  const boss = RAID_BOSSES[((n % RAID_BOSSES.length) + RAID_BOSSES.length) % RAID_BOSSES.length];
  const week = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
  return { week, boss, mods, ends: new Date(mon.getTime() + 7 * DAY_MS) };
}
function raidState() {
  const { week } = raidInfo();
  if (!SAVE.raid[week]) SAVE.raid[week] = { best: 0, claimed: [], runs: 0 };
  return SAVE.raid[week];
}
function raidStage() {
  const r = raidInfo();
  const adds = { phantom: ['grunt', 'sniper'], core: ['spammer', 'desync'], algorithm: ['troll', 'clipper'] }[r.boss];
  return { id: 'RAID', name: `Ranked Raid · ${ENEMIES[r.boss].name}`, raid: true, hub: 'raid', level: RAID_LEVEL, turns: RAID_TURNS,
    waves: [[adds[0], r.boss, adds[1]]], boss: true, mods: r.mods, bg: 'rooftop', reward: {} };
}
// Saves a raid score; pays every tier reached for the first time this week.
function raidResult(score) {
  const rs = raidState(), newBest = score > rs.best;
  rs.best = Math.max(rs.best, score); rs.runs++;
  SAVE.stats.raids++;
  bumpWeekly('raid');
  const got = {};
  RAID_TIERS.forEach((t, i) => {
    if (rs.best >= t.score && !rs.claimed.includes(i)) {
      rs.claimed.push(i);
      Object.entries(t.reward).forEach(([k, v]) => { got[k] = (got[k] || 0) + v; });
    }
  });
  const label = Object.keys(got).length ? giveReward(got) : '';
  if (newBest && typeof cloudSubmitScore === 'function') cloudSubmitScore(raidInfo().week, rs.best);
  return { best: rs.best, newBest, label };
}

// ---------- Daily stream schedule ----------
const scheduleToday = () => SCHEDULE[new Date().getDay()];
const dailyRunsLeft = () => DAILY_RUNS - (daily().runs || 0);
function dailyStage(tier) {
  const sc = scheduleToday(), t = SCHEDULE_TIERS[tier];
  const f = sc.foes, waves = tier === 0 ? [[f[0], f[1]]] : tier === 1 ? [[f[0], f[1], f[2]], [f[2], f[0]]] : [[f[1], f[2], f[0]], [f[0], f[1], f[2]], [f[2], 'firewall', f[1]]];
  return { id: `D-${tier + 1}`, name: `${sc.name} · ${t.name}`, daily: true, hub: 'daily', tier, level: t.level, turns: 99, waves,
    bg: ['street-day', 'city-day', 'sunset-street', 'alley', 'rooftop', 'tunnel', 'city-day'][new Date().getDay()], reward: {} };
}
function dailyReward(tier) {
  const sc = scheduleToday(), m = SCHEDULE_TIERS[tier].mult, out = {};
  sc.give.forEach(k => { out[k] = Math.round(SCHEDULE_BASE[k] * m / (sc.give.length > 1 ? 1.6 : 1)); });
  return out;
}
function dailyStageResult(stage) {
  if (dailyRunsLeft() <= 0) return '<div class="rewards"><div class="first">NO RUNS LEFT TODAY</div></div>';
  daily().runs = (daily().runs || 0) + 1;
  SAVE.stats.dailyRuns++;
  bumpDaily('farm');
  bumpWeekly('dailystage');
  const r = dailyReward(stage.tier);
  const gifts = r.gifts ? randomGifts(r.gifts) : null;
  delete r.gifts;
  const label = [giveReward(r), gifts && giftLabel(gifts)].filter(Boolean).join(' ');
  const xp = 15 + stage.level * 10, ranks = addPlayerXp(xp);
  return `<div class="rewards"><div class="first">DAILY STREAM · ${dailyRunsLeft()} RUN${dailyRunsLeft() === 1 ? '' : 'S'} LEFT</div>
    <span>${label}</span><span class="xp">+${xp} XP</span></div>${ranks ? `<div class="rank-up">RANK UP! Rank ${SAVE.player.rank}</div>` : ''}`;
}

// ---------- Bonds & gifts ----------
function bondOf(id) {
  if (!SAVE.bonds[id]) SAVE.bonds[id] = { lvl: 1, xp: 0, hang: null };
  return SAVE.bonds[id];
}
// Adds bond XP; returns { id, lvl } if it levelled up (and pays milestone rewards).
function addBondXp(id, n) {
  if (!SAVE.chars[id]) return null;
  const b = bondOf(id), start = b.lvl;
  if (b.lvl >= MAX_BOND) return null;
  b.xp += n;
  while (b.lvl < MAX_BOND && b.xp >= bondXpNeed(b.lvl)) {
    b.xp -= bondXpNeed(b.lvl); b.lvl++;
    if (BOND_REWARDS[b.lvl]) giveReward(BOND_REWARDS[b.lvl]);
  }
  if (b.lvl >= MAX_BOND) b.xp = 0;
  return b.lvl > start ? { id, lvl: b.lvl } : null;
}
function randomGifts(n) {
  const ids = Object.keys(GIFTS), got = {};
  for (let i = 0; i < n; i++) { const g = ids[Math.floor(Math.random() * ids.length)]; got[g] = (got[g] || 0) + 1; SAVE.gifts[g] = (SAVE.gifts[g] || 0) + 1; }
  return got;
}
const giftLabel = got => Object.entries(got).map(([g, c]) => `<span class="amt">${ic(GIFTS[g].icon)}${GIFTS[g].name}${c > 1 ? ' ×' + c : ''}</span>`).join(' ');
function giveGift(id, g) {
  if (!SAVE.gifts[g]) return;
  if (bondOf(id).lvl >= MAX_BOND) return toast(`${CHARACTERS[id].short} is already at max bond`);
  SAVE.gifts[g]--;
  SAVE.stats.gifts++;
  bumpWeekly('gift');
  const fav = GIFTS[g].fav.includes(id), xp = GIFTS[g].xp * (fav ? 2 : 1);
  const up = addBondXp(id, xp);
  persist();
  return { xp, fav, up };
}

// ---------- Weekly missions & daily activity ----------
function weekly() {
  const { week } = raidInfo();
  if (!SAVE.weekly || SAVE.weekly.week !== week) SAVE.weekly = { week, progress: {}, claimed: {} };
  return SAVE.weekly;
}
function bumpWeekly(stat, n = 1) {
  const w = weekly();
  w.progress[stat] = (w.progress[stat] || 0) + n;
}
const claimableWeekly = () => WEEKLY_MISSIONS.filter(m => !weekly().claimed[m.id] && (weekly().progress[m.stat] || 0) >= m.goal).length;
const activityPoints = () => DAILY_MISSIONS.filter(m => daily().claimed[m.id]).reduce((a, m) => a + m.pts, 0);
const claimableChests = () => ACTIVITY_CHESTS.filter((c, i) => activityPoints() >= c.at && !(daily().chests || []).includes(i)).length;

// ---------- Achievements ----------
const achDone = a => { try { return !!a.check(SAVE); } catch (e) { return false; } };
const claimableAchievements = () => ACHIEVEMENTS.filter(a => !SAVE.achieved[a.id] && achDone(a)).length;

// ---------- Live hub screen (Event / Ranked Raid / Daily) ----------
let liveTab = 'event';

RENDER.live = () => {
  const tabs = { event: ['Event', 'ticket'], raid: ['Ranked Raid', 'raid'], daily: ['Daily Stream', 'login'] };
  const body = liveTab === 'raid' ? raidView() : liveTab === 'daily' ? dailyView() : eventView();
  $('#live').innerHTML = `
    ${topbar('Live', 'lobby', 'live')}
    <div class="lv">
      <div class="lv-tabs">${Object.entries(tabs).map(([k, [label, icon]]) =>
        `<button class="${liveTab === k ? 'sel' : ''}" data-lt="${k}">${ic(icon)}<span>${label}</span></button>`).join('')}</div>
      ${body}
    </div>`;
  document.querySelectorAll('#live [data-lt]').forEach(b => b.onclick = () => { liveTab = b.dataset.lt; RENDER.live(); });
  if (liveTab === 'event') bindEvent();
  if (liveTab === 'raid') bindRaid();
  if (liveTab === 'daily') bindDaily();
};

// Event milestones the player can claim right now.
function eventMilesReady() {
  const { id } = eventNow(), es = eventState(id), got = es.miles || [];
  return EVENT_MILESTONES.filter((m, i) => !got.includes(i) && (es.earned || 0) >= m.at).length;
}

function eventView() {
  const { id, ev, ends } = eventNow(), es = eventState(id);
  const earned = es.earned || 0, got = es.miles || [], last = EVENT_MILESTONES[EVENT_MILESTONES.length - 1].at;
  return `<div class="ev" style="--c:${ev.color}">
    <div class="ev-hero" style="${sceneStyle(ev.scene)}">
      <div class="ev-hero-in"><em>LIMITED EVENT · ${ev.jp}</em><h2>${ev.name}</h2><p>${ev.desc}</p>
        <div class="ev-meta"><span class="rc-timer">${ic('timer')}${timeLeft(ends)}</span><span class="ev-tok">${amt(ev.cur, es.tokens.toLocaleString())} ${ev.currency}</span></div></div>
    </div>
    <div class="ev-miles">
      <div class="ev-miles-head"><b>${ic('trophy')} Event Milestones</b><span>${earned.toLocaleString()} ${ev.currency} earned</span></div>
      <div class="ev-miles-track"><i style="width:${Math.min(100, earned / last * 100)}%"></i>
        ${EVENT_MILESTONES.map((m, i) => {
          const done = got.includes(i), ready = !done && earned >= m.at;
          return `<button class="ev-mile ${done ? 'got' : ready ? 'ready' : ''}" data-mile="${i}" style="left:${m.at / last * 100}%" ${ready ? '' : 'disabled'}
            title="${giveLabel(m.reward).replace(/<[^>]+>/g, '')}">${ic(done ? 'check' : 'chest')}<small>${m.at.toLocaleString()}</small></button>`;
        }).join('')}
      </div>
    </div>
    <div class="ev-cols">
      <div class="ev-stages">${ev.stages.map((st, i) => {
        const open = eventStageUnlocked(id, i), done = es.cleared[st.id];
        return `<button class="ev-stage ${st.boss ? 'boss' : ''} ${st.ex ? 'ex' : ''} ${done ? 'done' : ''}" data-i="${i}" ${open ? '' : 'disabled'}>
          <b>${st.id.split('-')[1]}</b><div><span>${st.name}</span><small>Enemy Lv ${st.level} · Rec. Lv ${recLevel(st.level)}</small>
            <span class="ev-weak">${stageWeak(st).slice(0, 4).map(w => elIc(w)).join('')}</span></div>
          <i>${amt(ev.cur, st.reward.tokens)}${done ? '' : ` + ${amt('gem', st.first.gems)}`}</i>
          <span class="ev-state">${ic(done ? 'check' : open ? 'play' : 'lock')}</span></button>`;
      }).join('')}</div>
      <div class="ev-shop"><h3>${ic('shop')} Event Shop</h3>${ev.shop.map(item => {
        const left = item.stock - (es.shop[item.id] || 0), mid = item.memory || item.memoryRank;
        const can = left > 0 && es.tokens >= item.price && (!item.memoryRank || SAVE.memories[item.memoryRank]);
        return `<div class="ev-item ${left <= 0 ? 'sold' : ''} ${item.memory ? 'feature' : ''}">
          ${mid ? `<div class="mem-card mini">${memCardInner(mid)}</div>` : `<div class="ev-ico">${ic(item.give ? Object.keys(item.give)[0] === 'exp' ? 'token' : Object.keys(item.give)[0].replace(/s$/, '') : item.gifts ? 'gift' : 'spark')}</div>`}
          <div class="ev-item-t"><b>${item.name}</b><small>${item.memory ? memPassiveText(item.memory, null) : item.desc} · ${left}/${item.stock} left</small></div>
          <button class="pill ${can ? 'yellow' : 'dark'} ev-buy" data-id="${item.id}" ${can ? '' : 'disabled'}>${left <= 0 ? 'Sold out' : amt(ev.cur, item.price)}</button></div>`;
      }).join('')}</div>
    </div></div>`;
}
function bindEvent() {
  const { id, ev } = eventNow();
  document.querySelectorAll('#live .ev-stage').forEach(b => b.onclick = () => startStage(eventStage(id, ev.stages[b.dataset.i])));
  document.querySelectorAll('#live .ev-buy').forEach(b => b.onclick = () => buyEventItem(id, ev.shop.find(s => s.id === b.dataset.id)));
  document.querySelectorAll('#live .ev-mile.ready').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.mile), m = EVENT_MILESTONES[i], es = eventState(id);
    es.miles = [...(es.miles || []), i];
    giveReward(m.reward); persist(); RENDER.live();
    sfx('chest');
    showRewards(rewardItems(m.reward), { title: 'Event Milestone', sub: `${ev.name.toUpperCase()} · ${m.at.toLocaleString()} ${ev.currency.toUpperCase()}` });
  });
}

let raidBoard = null;   // last fetched online leaderboard
function raidView() {
  const r = raidInfo(), rs = raidState(), boss = ENEMIES[r.boss];
  const nextTier = RAID_TIERS.find(t => rs.best < t.score);
  return `<div class="rd">
    <div class="rd-boss"><div class="rd-art">${ART[r.boss] ? `<img src="${ART[r.boss].url}" alt="">` : foeSprite(r.boss, boss.hue)}</div>
      <div class="rd-info"><em>WEEKLY BOSS · <span class="rc-timer">${ic('timer')}${timeLeft(r.ends)}</span></em><h2>${boss.name}</h2>
        <div class="rd-weak"><small>WEAK TO</small>${weakIcons(r.boss)}<span>${boss.weak.map(k => ELEMENTS[k].name).join(' · ')}</span></div>
        <p>Deal as much damage as you can in <b>${RAID_TURNS} member turns</b>. The boss has ×${RAID_HP_MULT} HP. Defeating it adds a 20% bonus. Rewards are paid once per tier, every week.</p>
        <div class="rd-mods">${r.mods.map(m => `<div><b>${RAID_MODS[m].name}</b><span>${RAID_MODS[m].desc}</span></div>`).join('')}</div>
        <div class="rd-best"><small>YOUR WEEKLY BEST</small><b>${rs.best.toLocaleString()}</b>${nextTier ? `<span>Next tier at ${nextTier.score.toLocaleString()}</span>` : '<span>All tiers cleared!</span>'}</div>
        <button class="pill yellow rd-go">${ic('raid')} Start Raid</button></div></div>
    <div class="rd-side">
      <h3>${ic('trophy')} Tier rewards</h3>
      <div class="rd-tiers">${RAID_TIERS.map((t, i) => `<div class="${rs.claimed.includes(i) ? 'got' : ''}"><b>${t.score.toLocaleString()}</b><span>${giveLabel(t.reward)}</span><i>${rs.claimed.includes(i) ? ic('check') : ''}</i></div>`).join('')}</div>
      <h3>${ic('members')} Leaderboard</h3>
      <div class="rd-board">${cloudReady() ? (raidBoard ? raidBoard.map((row, i) => `<div class="${row.player_id === SAVE.cloudId ? 'me' : ''}"><b>${i + 1}</b><span>${escapeHtml(row.name)}</span><i>${row.score.toLocaleString()}</i></div>`).join('') || '<p class="hint-inline">No scores yet this week. Be the first!</p>' : '<p class="hint-inline">Loading…</p>')
        : '<p class="hint-inline">The online leaderboard turns on once cloud saving is set up (see CLOUD_SETUP.md). Your best is still saved here.</p>'}</div>
    </div></div>`;
}
function bindRaid() {
  $('#live .rd-go').onclick = () => openTeam(raidStage());
  if (cloudReady() && !raidBoard) cloudLeaderboard(raidInfo().week).then(rows => { raidBoard = rows || []; if (liveTab === 'raid' && document.querySelector('#live.active')) RENDER.live(); });
}

function dailyView() {
  const sc = scheduleToday(), left = dailyRunsLeft();
  return `<div class="dl">
    <div class="dl-week">${SCHEDULE.map((d, i) => `<div class="${i === new Date().getDay() ? 'today' : ''}"><b>${d.day.slice(0, 3)}</b><span>${d.name}</span>
      <i>${d.give.map(k => ic(k === 'exp' ? 'token' : k === 'coins' ? 'coin' : k === 'gems' ? 'gem' : 'gift')).join('')}</i></div>`).join('')}</div>
    <div class="dl-head"><h2>${sc.name} <small>${sc.jp}</small></h2><span class="dl-runs">${ic('replay')} ${left}/${DAILY_RUNS} runs left today</span></div>
    <div class="dl-tiers">${SCHEDULE_TIERS.map((t, i) => {
      const r = dailyReward(i), foes = [...new Set(dailyStage(i).waves.flat())];
      return `<div class="dl-tier t${i}"><em>${t.name.toUpperCase()}</em><b>Enemy Lv ${t.level}</b><small>Rec. Lv ${recLevel(t.level)}</small>
        <div class="dl-foes">${foes.map(k => enemyFace(k)).join('')}</div>
        <div class="dl-weak"><small>WEAK TO</small>${stageWeak(dailyStage(i)).slice(0, 4).map(w => elIc(w)).join('')}</div>
        <div class="dl-rew">${Object.entries(r).map(([k, v]) => k === 'gifts' ? `<span class="amt">${ic('gift')}${v} gifts</span>` : amt(k === 'exp' ? 'token' : k.replace(/s$/, ''), v.toLocaleString())).join(' ')}</div>
        <button class="pill ${left > 0 ? 'yellow' : 'dark'} dl-go" data-t="${i}" ${left > 0 ? '' : 'disabled'}>${left > 0 ? 'Go live ' + ic('play') : 'Come back tomorrow'}</button></div>`;
    }).join('')}</div>
    <p class="screen-sub">The daily stream changes every day: Superchat Tokens on Monday and Thursday, Spo Coins on Tuesday and Friday, Gems on Wednesday, gifts on Saturday, a mix on Sunday.</p>
  </div>`;
}
function bindDaily() {
  document.querySelectorAll('#live .dl-go').forEach(b => b.onclick = () => openTeam(dailyStage(Number(b.dataset.t))));
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Records screen (achievements + enemy log) ----------
let recordsTab = 'ach';

RENDER.records = () => {
  const cats = [...new Set(ACHIEVEMENTS.map(a => a.cat))];
  const doneN = ACHIEVEMENTS.filter(a => SAVE.achieved[a.id]).length;
  const achHtml = cats.map(cat => `<h3 class="rec-cat">${cat}</h3><div class="rec-list">${ACHIEVEMENTS.filter(a => a.cat === cat).map(a => {
    const claimed = SAVE.achieved[a.id], done = achDone(a);
    return `<div class="rec-ach ${claimed ? 'claimed' : done ? 'ready' : ''}"><span class="rec-medal">${ic(claimed ? 'check' : 'trophy')}</span>
      <div><b>${a.name}</b><small>${a.text}</small></div><span class="rec-rew">${amt('gem', a.reward)}</span>
      <button class="btn small ${done && !claimed ? 'primary' : ''} rec-claim" data-id="${a.id}" ${done && !claimed ? '' : 'disabled'}>${claimed ? 'Done' : done ? 'Claim' : 'Locked'}</button></div>`;
  }).join('')}</div>`).join('');
  const seen = Object.keys(ENEMIES).filter(k => SAVE.dex[k]).length;
  const dexHtml = `<div class="dex">${Object.entries(ENEMIES).map(([k, e]) => {
    const n = SAVE.dex[k] || 0;
    return `<div class="dex-card ${n ? '' : 'unknown'} ${e.boss ? 'boss' : ''}">
      <div class="dex-art">${ART[k] ? `<div class="face" style="${faceStyle(k)}"></div>` : foeChip(k, e.hue, 'face')}</div>
      <b>${n ? e.name : '???'}</b><small>${n ? `Defeated ×${n.toLocaleString()}` : 'Not met yet'}</small>
      <p>${n ? e.desc || '' : ''}</p></div>`;
  }).join('')}</div>`;
  $('#records').innerHTML = `
    ${topbar('Records')}
    <div class="rec">
      <div class="lv-tabs">
        <button class="${recordsTab === 'ach' ? 'sel' : ''}" data-rt="ach">${ic('trophy')}<span>Achievements ${doneN}/${ACHIEVEMENTS.length}</span>${badge(claimableAchievements())}</button>
        <button class="${recordsTab === 'dex' ? 'sel' : ''}" data-rt="dex">${ic('eye')}<span>Enemy Log ${seen}/${Object.keys(ENEMIES).length}</span></button>
        <button class="${recordsTab === 'mem' ? 'sel' : ''}" data-rt="mem">${ic('recruit')}<span>Memories ${Object.keys(SAVE.memories).length}/${Object.keys(MEMORIES).length}</span></button>
        <button class="${recordsTab === 'stats' ? 'sel' : ''}" data-rt="stats">${ic('trophy')}<span>Stats</span></button>
        <button data-go="album">${ic('album')}<span>Backdrops</span></button>
      </div>
      <div class="rec-body">${recordsTab === 'ach' ? achHtml : recordsTab === 'mem' ? memoryCollection() : recordsTab === 'stats' ? statsHtml() : dexHtml}</div>
    </div>`;
  document.querySelectorAll('#records [data-rt]').forEach(b => b.onclick = () => { recordsTab = b.dataset.rt; RENDER.records(); });
  document.querySelectorAll('#records .rec-claim').forEach(b => b.onclick = () => {
    const a = ACHIEVEMENTS.find(x => x.id === b.dataset.id);
    SAVE.achieved[a.id] = true; SAVE.gems += a.reward; persist();
    RENDER.records();
    showRewards([{ kind: 'gem', n: a.reward }], { title: 'Achievement Unlocked', sub: `${a.name.toUpperCase()} · ${a.text.toUpperCase()}` });
  });
};

// Lifetime numbers for the Records > Stats tab.
function statsHtml() {
  const s = SAVE.stats, stars = totalStars(SAVE), fav = Object.entries(SAVE.bonds).sort((a, b) => b[1].lvl - a[1].lvl || b[1].xp - a[1].xp)[0];
  const rows = [
    ['Producer Rank', SAVE.player.rank], ['Battles fought', s.battles], ['Battles won', s.wins], ['Stage stars', `${stars}/${STAGES.length * 3}`],
    ['Enemies defeated', s.kills], ['Breaks', s.breaks], ['Weakness hits', s.weakHits || 0], ['Critical hits', s.crits],
    ['Ultimates used', s.ults], ['Collab attacks', s.collabs], ['Best combo', `${s.bestCombo} hits`], ['Biggest hit', s.bestHit.toLocaleString()],
    ['Recruits', s.pulls], ['Members', `${Object.keys(SAVE.chars).length}/${Object.keys(CHARACTERS).length}`], ['Tower best', `Floor ${SAVE.tower.best}`],
    ['Event stages cleared', s.eventClears], ['Ranked Raids played', s.raids], ['Daily Streams cleared', s.dailyRuns], ['Gifts given', s.gifts],
  ];
  return `<div class="stats-wrap">
    ${fav ? `<div class="stats-fav" style="--c:${CHARACTERS[fav[0]].color}"><div class="face" style="${faceStyle(fav[0])}"></div><div><small>CLOSEST BOND</small><b>${CHARACTERS[fav[0]].short}</b><span>${ic('heart')} Bond Lv ${fav[1].lvl}</span></div></div>` : ''}
    <div class="stats-grid">${rows.map(([k, v]) => `<div><small>${k}</small><b>${typeof v === 'number' ? v.toLocaleString() : v}</b></div>`).join('')}</div></div>`;
}

// Every Memory: owned ones with rank and wearer, missing ones with where to get them.
function memoryCollection() {
  const source = mid => {
    const m = MEMORIES[mid];
    if (m.event) return `${EVENTS[m.event].name} event shop`;
    const bs = Object.values(BANNERS).filter(b => b.type === 'memory' && (b.pool5.includes(mid) || b.pool4.includes(mid)));
    return bs.length ? (bs.length > 2 ? 'Any Memory banner' : bs.map(b => b.name).join(' / ')) : 'Unknown';
  };
  const ids = Object.keys(MEMORIES).sort((a, b) => MEMORIES[b].rarity - MEMORIES[a].rarity);
  return `<div class="memcol">${ids.map(mid => {
    const m = MEMORIES[mid], own = SAVE.memories[mid], wearer = memWearer(mid);
    return `<div class="memcol-card ${own ? '' : 'missing'} r${m.rarity}">
      <div class="mem-card mini">${memCardInner(mid)}</div>
      <div class="memcol-t"><em class="r${m.rarity}">${stars(m.rarity)}${own ? ` · Rank ${own.rank}/${MAX_MEM_RANK}` : ''}</em><b>${m.name}</b>
        <small>${memStatText(mid)}</small><small>${memPassiveText(mid, m.owner || null)}</small>
        <small class="memcol-src">${own ? (wearer ? `Worn by ${CHARACTERS[wearer].short}` : 'Not equipped') : `Get it: ${source(mid)}`}${m.owner ? ` · Signature: ${CHARACTERS[m.owner].short}` : ''}</small></div>
    </div>`;
  }).join('')}</div>`;
}

// ---------- Bond tab (Members screen) ----------
function bondView(id) {
  const c = CHARACTERS[id], b = bondOf(id), need = bondXpNeed(b.lvl), today = todayStr();
  // Members with a chibi picture show it here instead of their full art.
  return `
    <div class="pf-art ${c.chibi ? 'chibi' : ''}"><img src="${c.chibi || ART[id].url}" alt=""><div class="pf-bubble"></div></div>
    <div class="bd">
      <div class="bd-head"><div class="bd-heart">${ic('heart')}<b>${b.lvl}</b></div>
        <div class="bd-main"><em>BOND LEVEL</em><div class="bd-bar"><i style="width:${b.lvl >= MAX_BOND ? 100 : b.xp / need * 100}%"></i></div>
          <small>${b.lvl >= MAX_BOND ? 'MAX BOND' : `${b.xp}/${need} XP to Lv ${b.lvl + 1}`}</small></div></div>
      <p class="bd-note">Bond bonus: <b>+${b.lvl - 1}% HP, ATK and DEF</b>. Members gain bond by winning battles together, hanging out once a day and receiving gifts. Favourite gifts count double.</p>
      <button class="pill ${b.hang === today ? 'dark' : 'yellow'} bd-hang" ${b.hang === today ? 'disabled' : ''}>${ic('talks')} ${b.hang === today ? 'Hung out today' : `Hang out · +${BOND_HANG_XP} XP`}</button>
      <div class="ch-sec">Gifts</div>
      <div class="bd-gifts">${Object.entries(GIFTS).map(([g, gi]) => {
        const n = SAVE.gifts[g] || 0, fav = gi.fav.includes(id);
        return `<button class="bd-gift ${fav ? 'fav' : ''}" data-g="${g}" ${n ? '' : 'disabled'} title="${gi.name}">
          ${ic(gi.icon)}<b>${gi.name}</b><small>${fav ? 'Favourite! ' : ''}+${gi.xp * (fav ? 2 : 1)} XP</small><span>×${n}</span></button>`;
      }).join('')}</div>
      <p class="hint-inline">Get gifts from the Shop, event shops and Saturday's daily stream.</p>
      <div class="ch-sec">Milestones</div>
      <div class="bd-miles">${Object.entries(BOND_REWARDS).map(([lv, r]) => `<div class="${b.lvl >= lv ? 'got' : ''}"><b>Lv ${lv}</b>${giveLabel(r)}${b.lvl >= lv ? ic('check') : ''}</div>`).join('')}</div>
    </div>`;
}
function bindBond(id) {
  const bubble = text => {
    const bb = $('#members .pf-bubble');
    if (!bb) return;
    bb.innerHTML = text;
    bb.classList.remove('show'); void bb.offsetWidth; bb.classList.add('show');
    $('#members .pf-art img').animate([{ transform: 'none' }, { transform: 'translateY(-14px)' }, { transform: 'none' }], { duration: 420 });
  };
  const hang = $('#members .bd-hang');
  if (hang) hang.onclick = () => {
    bondOf(id).hang = todayStr();
    const up = addBondXp(id, BOND_HANG_XP);
    persist(); RENDER.members();
    bubble(voice(id, 'tap'));
    sfx('heal');
    toast(up ? `${ic('heart')} Bond Lv ${up.lvl} with ${CHARACTERS[id].short}!` : `+${BOND_HANG_XP} bond XP`);
  };
  document.querySelectorAll('#members .bd-gift').forEach(b => b.onclick = () => {
    const res = giveGift(id, b.dataset.g);
    if (!res) return;
    RENDER.members();
    bubble(voice(id, res.fav ? 'levelUp' : 'tap'));
    sfx(res.fav ? 'buff' : 'heal');
    toast(res.up ? `${ic('heart')} Bond Lv ${res.up.lvl} with ${CHARACTERS[id].short}!` : `+${res.xp} bond XP${res.fav ? ' (favourite!)' : ''}`);
  });
}

// ---------- Onboarding ----------
// 0: opening scene, then the first battle (with tips). 2: pick a free ★5. 3: done.
async function runOnboarding() {
  if (SAVE.tutorial === 0) {
    await playStory(INTRO, 'Prologue · Signal Lost', 'street-day');
    SAVE.tutorial = 1; persist();
  }
  if (SAVE.tutorial === 1 && !SAVE.cleared['1-1']) {
    toast('Your first stream is about to start!');
    return startStage(Object.assign({}, STAGES[0], { tutorial: true }));
  }
  if (SAVE.tutorial <= 2) return openStarterPick();
}

function openStarterPick() {
  const picks = [['noah', 'member'], ['hinano', 'hinano'], ['uruha', 'uruha'], ['lisa', 'lisa']];
  const ov = $('#pull');
  ov.className = 'overlay show';
  ov.innerHTML = `<div class="starter">
    <div class="starter-head"><em>WELCOME GIFT · ようこそ</em><h2>Choose your first ★5</h2>
      <p>A free 10-pull on their banner, with them guaranteed.</p></div>
    <div class="starter-cards">${picks.map(([id, bid]) => {
      const c = CHARACTERS[id];
      return `<button class="starter-card" data-id="${id}" data-b="${bid}" style="--c:${c.color}">
        <img src="${ART[id].url}" alt="">
        <div class="starter-info"><span class="role role-${c.role.toLowerCase()}">${roleIc(c.role)} ${c.role}</span><b>${c.name}</b>
          <small>${c.kit.ult.name}: ${c.kit.ult.desc}</small><i>${SAVE.chars[id] ? 'Already recruited: the guaranteed copy becomes a duplicate token' : 'Tap to choose'}</i></div></button>`;
    }).join('')}</div></div>`;
  ov.querySelectorAll('.starter-card').forEach(b => b.onclick = () => {
    ov.querySelectorAll('.starter-card').forEach(x => x.classList.toggle('chosen', x === b));
    setTimeout(() => {
      const results = starterPull(b.dataset.b);
      SAVE.tutorial = 3; SAVE.seenNotes = NOTES_VERSION; persist();
      playPull(results, b.dataset.b, 0, () => { show('lobby'); toast('Tip: check LIVE on the home screen for the event, Ranked Raid and Daily Stream.'); });
    }, 450);
  });
}
