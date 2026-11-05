// Menu screens: lobby, recruit, members, team, stages. Battle lives in battle.js.

const $ = (sel, el = document) => el.querySelector(sel);
const stars = n => starsIc(n);
const RENDER = {};
// Test helpers (like free gems) only show with ?dev in the address.
const DEV = /[?&]dev\b/.test(location.search);
let currentBattle = null;
let membersSel = 'sendo';

const logoHtml = () => `<span class="lg-w">WATA</span><span class="lg-star">${ic('star')}</span><span class="lg-s">SPO</span><span class="lg-jp">ワタスポ!</span>`;

let shownScreen = 'loading';
function show(id) {
  // Navigation fades; entering battle keeps a separate cinematic transition.
  if (shownScreen !== id && shownScreen !== 'loading') wipe(id === 'battle');
  shownScreen = id;
  if (typeof playMusic === 'function') playMusic(SCREEN_MUSIC[id] || 'home');
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  if (RENDER[id]) RENDER[id]();
}

function wipe(big) {
  if (big) return; // Battle entry has its own illustrated loading screen.
  const w = document.createElement('div');
  const calm = SAVE.settings.flashes === false || matchMedia('(prefers-reduced-motion: reduce)').matches;
  w.className = 'studio-wipe' + (big && !calm ? ' studio-battle-wipe' : calm ? ' calm' : '');
  w.innerHTML = big && !calm ? '<div class="studio-transition"><small>NEXT ENCOUNTER</small><b>' + logoHtml() + '</b></div>' : '';
  $('#app').appendChild(w);
  sfx('whoosh');
  setTimeout(() => w.remove(), big && !calm ? 1100 : calm ? 80 : 240);
}

function toast(msg) {
  const t = $('#toast');
  t.innerHTML = msg;   // messages may include icons
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}

const curHtml = () => `<div class="cur"><span class="gem" title="Gems">${ic('gem')}<b>${SAVE.gems.toLocaleString()}</b></span><span class="tok" title="Superchat Tokens">${ic('token')}<b>${SAVE.exp.toLocaleString()}</b></span><span class="coin" title="Spo Coins">${ic('coin')}<b>${SAVE.coins.toLocaleString()}</b></span></div>`;

// help = a How to play topic shown as a "?" next to the title.
function topbar(title, back = 'lobby', help = null) {
  return `<div class="topbar">
    ${back ? `<button class="back" data-go="${back}">${ic('back')}<span>Back</span></button>` : '<span></span>'}
    <div class="title">${title}${help ? helpBtn(help) : ''}</div>
    ${curHtml()}
  </div>`;
}

document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) show(go.dataset.go);
});

// ---------- Lobby ----------
const claimableMissions = () => MISSIONS.filter(m => !SAVE.claimed[m.id] && m.check(SAVE)).length;
const talkUnlocked = t => t.members.every(id => SAVE.chars[id]);
const newTalks = () => TALKS.filter(t => talkUnlocked(t) && !SAVE.talks[t.id]).length;
const badge = n => n ? `<span class="badge">${n}</span>` : '';

// Backdrop CSS for a scene or environment background, cropped around its focus point.
const backdrop = id => SCENES[id] || BACKGROUNDS[id];
const sceneStyle = id => `background-image:url('${backdrop(id).art}');background-position:${backdrop(id).focus[0] * 100}% ${backdrop(id).focus[1] * 100}%`;
const sceneUnlocked = sid => !!SAVE.chars[SCENES[sid].char];
const creditHtml = id => backdrop(id) && backdrop(id).credit ? `<span class="art-credit">Art: ${backdrop(id).credit}</span>` : '';
// Where a stage's battle and story take place.
const stageBg = st => st.bg || (st.tower ? towerBg(st.floor) : STAGE_BG[st.id] || CHAPTERS.find(c => c.id === st.chapter).scene);

// Banner picture: a Memory banner shows its featured Memory's art, a member
// banner shows that member's scene.
const bannerArtStyle = bid => {
  const b = BANNERS[bid];
  return b.type === 'memory' ? memArtStyle(b.rateUp) : sceneStyle(b.scene) + ';background-size:cover';
};

// Video backdrops for the home screen (ids are used as 'video:<id>' in SAVE.lobbyScene).
const LOBBY_VIDEOS = { lobby: { title: 'WATA SPO', src: 'assets/video/lobby.mp4' } };
const videoId = sid => sid && sid.startsWith('video:') ? sid.slice(6) : null;

// Everything the home screen can show: videos, then each owned member's cut-out and scenes.
let videoBroken = false;   // set when the video file can't load
function lobbyViews() {
  const out = videoBroken ? [] : Object.keys(LOBBY_VIDEOS).map(v => ({ char: SAVE.lobby, scene: `video:${v}` }));
  Object.keys(SAVE.chars).forEach(id => {
    out.push({ char: id, scene: null });
    scenesOf(id).forEach(sid => out.push({ char: id, scene: sid }));
  });
  return out;
}

let homeTimer = null;
let homeSlide = 0;

RENDER.lobby = () => {
  if (!SAVE.chars[SAVE.lobby]) SAVE.lobby = Object.keys(SAVE.chars)[0];
  const vid = videoId(SAVE.lobbyScene);
  if (SAVE.lobbyScene && !vid && (!SCENES[SAVE.lobbyScene] || !sceneUnlocked(SAVE.lobbyScene))) SAVE.lobbyScene = null;
  if (vid && !LOBBY_VIDEOS[vid]) SAVE.lobbyScene = null;
  const id = SAVE.lobby, c = CHARACTERS[id], sid = videoId(SAVE.lobbyScene) ? null : SAVE.lobbyScene;
  const video = videoId(SAVE.lobbyScene) && LOBBY_VIDEOS[videoId(SAVE.lobbyScene)];
  const views = lobbyViews();
  const viewIdx = Math.max(0, views.findIndex(v => (video ? v.scene === SAVE.lobbyScene : v.char === id && v.scene === sid)));
  const p = SAVE.player, need = rankXpNeed(p.rank);
  const owned = Object.keys(SAVE.chars).length, total = Object.keys(CHARACTERS).length;
  const ch = currentChapter();
  // Next story stage to play: the first unlocked one not cleared yet (or the last stage).
  const nextIdx = STAGES.findIndex((s, i) => stageUnlocked(i) && !SAVE.cleared[s.id]);
  const nextStage = STAGES[nextIdx >= 0 ? nextIdx : STAGES.length - 1];
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Late-night stream' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const bannerIds = Object.keys(BANNERS);
  const unlockedScenes = Object.keys(SCENES).filter(sceneUnlocked).length;
  // Tower sits with Battle and Recruit as a main tile; Settings and the rest live in the Menu.
  const tiles = [
    { go: 'members', ico: 'members', label: 'Members', jp: 'メンバー', sub: `${owned}/${total}` },
    { go: 'talks', ico: 'talks', label: 'Talks', jp: 'トーク', sub: 'Off-stream', badge: newTalks() },
    { go: 'missions', ico: 'missions', label: 'Missions', jp: 'ミッション', sub: 'Daily, weekly, goals', badge: missionBadge() },
    { go: 'shop', ico: 'shop', label: 'Shop', jp: 'ショップ', sub: `${SAVE.coins.toLocaleString()} coins` },
    { go: 'records', ico: 'trophy', label: 'Records', jp: '記録', sub: `${unlockedScenes} backdrops`, badge: claimableAchievements() },
    { act: 'login', ico: 'login', label: 'Login', jp: 'ログイン', sub: loginReady() ? 'Claim now!' : `Day ${SAVE.login.day}`, badge: loginReady() ? '!' : 0 },
    { go: 'news', ico: 'news', label: 'News', jp: 'お知らせ', sub: 'Events and updates' },
    { act: 'menu', ico: 'menu', label: 'Menu', jp: 'メニュー', sub: 'Every feature' },
  ];
  const towerNext = Object.keys(TOWER_BOSSES).map(Number).find(f => f > SAVE.tower.best);
  // News ticker: what's going on right now, built from the save.
  const evNow = eventNow(), raid = raidInfo();
  const news = [
    `EVENT: ${evNow.ev.name} is live! ${timeLeft(evNow.ends)}`,
    `Ranked Raid this week: ${ENEMIES[raid.boss].name} (${raid.mods.map(m => RAID_MODS[m].name).join(' + ')})`,
    `Today's Daily Stream: ${scheduleToday().name}`,
    !daily().freePull && 'FREE RECRUIT ready today. One pull on the house',
    loginReady() && `Daily login: day ${SAVE.login.day + 1} reward is waiting`,
    claimableDailies() && `${claimableDailies()} daily mission${claimableDailies() > 1 ? 's' : ''} ready to claim`,
    `Rate-up: ${bannerIds.map(bid => bannerInfo(bid).upName).join(' / ')}. Rotates in ${timeLeft(bannerEnds()).replace(' left', '')}`,
    `Story: ${nextStage.id} "${nextStage.name}" is next`,
    `Stream Tower record: floor ${SAVE.tower.best}/${TOWER_FLOORS}`,
    newTalks() && `${newTalks()} new off-stream talk${newTalks() > 1 ? 's' : ''} unlocked`,
  ].filter(Boolean);
  $('#lobby').innerHTML = `
    <div class="home studio-home cinema-home ${sid || video ? 'scene-mode' : ''} ${video ? 'video-mode' : ''}" style="--c:${c.color}">
      <header class="studio-top">
        <div class="home-profile"><button class="face home-avatar" style="${faceStyle(profileData().avatar)}" title="Profile"></button><div class="home-prof-main"><input class="home-name" maxlength="14" value="${p.name.replace(/"/g, '&quot;')}" title="Tap to rename"><div class="home-rank"><b>RANK ${p.rank}</b><div class="home-xp"><i style="width:${p.xp / need * 100}%"></i></div><small>${p.xp}/${need}</small></div></div></div>
        <span class="studio-date">${greeting.toUpperCase()}, PRODUCER</span>${curHtml()}
      </header>
      <nav class="studio-rail" aria-label="Main navigation">
        <div class="home-logo">${logoHtml()}</div>
        <button data-go="stages">${ic('story')}<span>Journey</span></button>
        <button class="studio-squad">${ic('team')}<span>Squad</span></button>
        <button data-go="members">${ic('members')}<span>Members</span></button>
        <button data-go="recruit">${ic('recruit')}<span>Recruit</span>${daily().freePull ? '' : '<i class="rail-dot"></i>'}</button>
        <button data-live="event">${ic('live')}<span>Live</span></button>
        <button data-go="missions">${ic('missions')}<span>Missions</span>${badge(missionBadge())}</button>
        <button data-act="menu">${ic('menu')}<span>More</span></button>
      </nav>
      <main class="studio-canvas">
        <div class="studio-art-caption"><span>OFF-STREAM MOMENT</span><b>${c.name}</b></div>
        <div class="home-bg">
          ${video ? `<video class="home-video" src="${video.src}" autoplay muted loop playsinline></video>` : sid ? `<div class="home-scene" style="${sceneStyle(sid)}"></div>` : `<div class="lobby-art"><img src="${ART[id].url}" alt="${c.name}"></div>`}
        </div>
        <div class="lobby-hearts"></div>
        <div class="bubble home-bubble"><b>${c.short}</b>${voice(id, 'lobby')}</div>
        <div class="home-switch"><button class="sw prev" aria-label="Previous artwork" ${views.length < 2 ? 'disabled' : ''}>${ic('back')}</button><span><b>${video ? video.title : sid ? SCENES[sid].title : c.short}</b><small>${video ? 'Animated scene' : sid ? 'Illustrated scene' : 'Character portrait'}</small></span><button class="sw next" aria-label="Next artwork" ${views.length < 2 ? 'disabled' : ''}>${ic('next')}</button></div>
      </main>
      <aside class="studio-journey">
        <div class="studio-eyebrow">CHAPTER ${String(ch.id).padStart(2, '0')} <span>${STAGES.filter(s => s.chapter === ch.id && SAVE.cleared[s.id]).length} / ${STAGES.filter(s => s.chapter === ch.id).length} CLEARED</span></div>
        <h1>${ch.name}</h1>
        <div class="studio-next"><span>NEXT UP <b>${nextStage.id}</b></span><h2>${nextStage.name}</h2><small>${nextStage.boss ? 'Boss encounter' : 'Story encounter'} · Recommended Lv ${recLevel(nextStage.level)}</small></div>
        <button class="home-continue studio-primary"><span>${SAVE.cleared[nextStage.id] ? 'Play again' : 'Continue journey'}</span>${ic('next')}</button>
        <button class="studio-route" data-go="stages">View chapter route <span>→</span></button>
        <div class="studio-squad-summary"><div>${SAVE.team.filter(Boolean).map(mid => `<i class="face" style="${faceStyle(mid)}" title="${CHARACTERS[mid].short}"></i>`).join('')}</div><span>${SAVE.team.filter(Boolean).length}/3 members <small>Avg. Lv ${teamAvgLv()}</small></span><button class="studio-train" aria-label="Train squad">${ic('plus')}</button></div>
        <div class="studio-live"><button data-live="event"><i></i><span>LIMITED EVENT<b>${evNow.ev.name}</b></span>${ic('next')}</button><button data-live="daily">${ic('live')}<span>DAILY STREAM<b>${dailyRunsLeft()} runs available</b></span>${ic('next')}</button></div>
      </aside>
      <div class="studio-bottom">
        <button class="home-ticker"><span class="ht-tag">${ic('news')} NOTICE</span><span>${news[0]}</span>${ic('next')}</button>
        <div class="studio-tools"><button data-act="login">${ic('login')}<span>${loginReady() ? 'Claim login gift' : 'Login rewards'}</span>${badge(loginReady() ? '!' : 0)}</button><button data-go="talks">${ic('talks')}<span>Off-stream talks</span>${badge(newTalks())}</button></div>
      </div>
      <div class="home-carousel studio-featured"><div class="hc-track">${bannerIds.map((bid, i) => { const b = BANNERS[bid], info = bannerInfo(bid); return `<button class="hc-card ${i === homeSlide % bannerIds.length ? 'on' : ''}" data-b="${bid}" style="--c:${info.color}"><div class="hc-art" style="${bannerArtStyle(bid)}"></div><div class="hc-text"><em>ON AIR / ${info.label}</em><b>${b.name}</b><span>${info.upName}</span></div>${ic('next')}</button>`; }).join('')}</div><div class="hc-dots">${bannerIds.map((_, i) => `<i class="${i === homeSlide % bannerIds.length ? 'on' : ''}"></i>`).join('')}</div></div>
      <div class="lobby-foot">${sid ? creditHtml(sid) : ''}<span>Unofficial VSPO! fan game · Art belongs to its artists.</span><button class="link reset">Reset save</button></div>
    </div>
`;

  // If the video file isn't available (e.g. the online copy), fall back to the member cut-out.
  const vidEl = $('#lobby .home-video');
  if (vidEl) vidEl.onerror = () => { videoBroken = true; SAVE.lobbyScene = null; RENDER.lobby(); };
  const home = $('#lobby .home');
  home.onmousemove = e => {
    home.style.setProperty('--mx', (e.clientX / innerWidth - 0.5).toFixed(3));
    home.style.setProperty('--my', (e.clientY / innerHeight - 0.5).toFixed(3));
  };
  const say = text => {
    const b = $('#lobby .home-bubble');
    b.innerHTML = `<b style="color:${c.color}">${c.short}</b>${text}`;
    b.animate([{ transform: 'scale(.9)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 250 });
  };
  $('#lobby .home-bg').onclick = e => {
    say(voice(id, Math.random() < 0.5 ? 'tap' : 'lobby'));
    const h = document.createElement('i');
    h.innerHTML = ic('heart');
    const rect = $('#lobby .studio-canvas').getBoundingClientRect();
    h.style.left = (e.clientX - rect.left) + 'px'; h.style.top = (e.clientY - rect.top) + 'px'; h.style.color = c.color;
    $('#lobby .lobby-hearts').appendChild(h);
    setTimeout(() => h.remove(), 1000);
  };
  const cycle = dir => {
    const v = views[(viewIdx + dir + views.length) % views.length];
    SAVE.lobby = v.char; SAVE.lobbyScene = v.scene;
    persist(); RENDER.lobby();
  };
  $('#lobby .prev').onclick = () => cycle(-1);
  $('#lobby .next').onclick = () => cycle(1);
  const nameInput = $('#lobby .home-name');
  nameInput.onchange = () => { SAVE.player.name = nameInput.value.trim() || 'Producer'; persist(); };
  nameInput.onkeydown = e => { if (e.key === 'Enter') nameInput.blur(); };
  $('#lobby [data-act="login"]').onclick = () => openLogin();
  $('#lobby [data-act="menu"]').onclick = () => openMenu();
  $('#lobby .home-avatar').onclick = () => show('profile');
  $('#lobby .studio-squad').onclick = () => openTeam();
  $('#lobby .studio-train').onclick = () => SpoDesign.openTraining(SAVE.team, null, () => RENDER.lobby());
  $('#lobby .home-ticker').onclick = () => show('news');
  $('#lobby .home-continue').onclick = () => startStage(nextStage);
  document.querySelectorAll('#lobby [data-live]').forEach(b => b.onclick = () => { liveTab = b.dataset.live; show('live'); });
  document.querySelectorAll('#lobby .hc-card').forEach(b => b.onclick = () => { recruitTab = b.dataset.b; show('recruit'); });

  // Banner carousel: advance every few seconds while the home screen is open.
  clearInterval(homeTimer);
  let idleTick = 0;
  homeTimer = setInterval(() => {
    if (!document.querySelector('#lobby.active')) return clearInterval(homeTimer);
    // Every ~24s the home member says something on their own.
    if (++idleTick % 6 === 0 && !document.querySelector('#pull.show, #story.show')) say(voice(id, 'lobby'));
    homeSlide = (homeSlide + 1) % bannerIds.length;
    document.querySelectorAll('#lobby .hc-card').forEach((el, i) => el.classList.toggle('on', i === homeSlide));
    document.querySelectorAll('#lobby .hc-dots i').forEach((el, i) => el.classList.toggle('on', i === homeSlide));
    const ts = $('#lobby .tile-recruit .tile-scene');
    if (ts) ts.setAttribute('style', bannerArtStyle(bannerIds[homeSlide]));
  }, 4000);

  // Two taps to reset (pop-up confirms are blocked in some browsers).
  $('#lobby .reset').onclick = e => {
    const b = e.currentTarget;
    if (!b.classList.contains('armed')) {
      b.classList.add('armed');
      b.textContent = 'Tap again to erase ALL progress';
      setTimeout(() => { b.classList.remove('armed'); b.textContent = 'Reset save'; }, 3000);
      return;
    }
    resetSave(); RENDER.lobby(); toast('Save reset');
  };
};

// ---------- Daily login ----------
function openLogin() {
  const ready = loginReady();
  const nextDay = SAVE.login.day % LOGIN_REWARDS.length;   // index of the next reward
  const ov = $('#pull');
  ov.className = 'overlay show';
  ov.innerHTML = `<div class="picker"><div class="picker-box login-box">
    <div class="picker-head"><h3>Daily Login</h3><button class="btn small close">${ic('close')}</button></div>
    <p class="hint-inline">${ready ? 'Today\'s reward is ready!' : 'Come back tomorrow for the next reward.'} Total days: ${SAVE.login.day}</p>
    <div class="login-track">${LOGIN_REWARDS.map((r, i) => {
      // After claiming day 7 the track shows as complete until tomorrow.
      const done = i < nextDay || (!ready && nextDay === 0 && SAVE.login.day > 0);
      return `<div class="login-day ${done ? 'done' : ''} ${ready && i === nextDay ? 'today' : ''} ${i === 6 ? 'big' : ''}">
        <em>Day ${i + 1}</em><b class="${r.gems ? 'gem' : 'tok'}">${ic(r.gems ? 'gem' : 'token')}</b><span>${r.gems || r.exp}</span>${done ? `<i>${ic('check')}</i>` : ''}</div>`;
    }).join('')}</div>
    <button class="pill ${ready ? 'yellow' : 'dark'} claim-login" ${ready ? '' : 'disabled'}>${ready ? 'Claim' : 'Claimed today ' + ic('check')}</button>
  </div></div>`;
  const close = () => { ov.className = 'overlay'; ov.innerHTML = ''; if (document.querySelector('#lobby.active')) RENDER.lobby(); };
  ov.querySelector('.close').onclick = close;
  ov.querySelector('.picker').onclick = e => { if (e.target.classList.contains('picker')) close(); };
  const claim = ov.querySelector('.claim-login');
  if (ready) claim.onclick = () => {
    const r = LOGIN_REWARDS[nextDay];
    SAVE.gems += r.gems || 0; SAVE.exp += r.exp || 0;
    SAVE.login.day++; SAVE.login.last = todayStr();
    bumpDaily('login');
    persist();
    close();
    showRewards(rewardItems(r), { title: 'Daily Login', sub: `DAY ${nextDay + 1} · ${SAVE.login.day} DAYS TOTAL` });
  };
}

// ---------- Album ----------
RENDER.album = () => {
  $('#album').innerHTML = `
    ${topbar('Album')}
    <p class="screen-sub">Backdrops unlock when you recruit the member in them. Tap one to view it or use it on the home screen.</p>
    <div class="album-grid">${Object.entries(SCENES).map(([sid, s]) => {
      const open = sceneUnlocked(sid), c = CHARACTERS[s.char];
      return `<button class="album-card ${open ? '' : 'locked'}" data-s="${sid}" ${open ? '' : 'disabled'} style="--c:${c.color}">
        <div class="album-art" style="${sceneStyle(sid)}"></div>
        <div class="album-text"><b>${open ? s.title : '???'}</b><span>${c.short}${open ? '' : ' · recruit to unlock'}</span></div>
        ${SAVE.lobbyScene === sid ? '<span class="album-home">HOME</span>' : ''}
      </button>`;
    }).join('')}</div>`;
  document.querySelectorAll('#album .album-card:not(.locked)').forEach(b => b.onclick = () => viewScene(b.dataset.s));
};

function viewScene(sid) {
  const s = SCENES[sid], c = CHARACTERS[s.char];
  const ov = $('#pull');
  ov.className = 'overlay show';
  ov.innerHTML = `<div class="scene-view">
    <img src="${s.art}" alt="${s.title}">
    <div class="scene-bar"><div><b>${s.title}</b><span>${c.name}${s.credit ? ' · Art: ' + s.credit : ''}</span></div>
      <button class="pill yellow set-home" ${SAVE.lobbyScene === sid ? 'disabled' : ''}>${SAVE.lobbyScene === sid ? 'On home screen ' + ic('check') : 'Set as home'}</button>
      <button class="pill dark close">Close</button></div></div>`;
  const close = () => { ov.className = 'overlay'; ov.innerHTML = ''; RENDER.album(); };
  ov.querySelector('.close').onclick = close;
  ov.querySelector('.set-home').onclick = () => {
    SAVE.lobby = s.char; SAVE.lobbyScene = sid; persist();
    toast(`"${s.title}" is now your home screen`);
    close();
  };
}

// ---------- Off-stream talks ----------
RENDER.talks = () => {
  $('#talks').innerHTML = `
    ${topbar('Off-stream Talks')}
    <p class="screen-sub">What the members get up to when the stream is off. Recruit everyone in a talk to unlock it.</p>
    <div class="talk-grid">${TALKS.map(t => {
      const open = talkUnlocked(t), seen = SAVE.talks[t.id];
      return `<button class="talk ${open ? '' : 'locked'} ${seen ? 'seen' : ''}" data-id="${t.id}" ${open ? '' : 'disabled'}>
        ${t.scene && backdrop(t.scene) ? `<div class="talk-scene" style="${sceneStyle(t.scene)}"></div>` : ''}
        <div class="talk-faces">${t.members.map(m => `<div class="face" style="${faceStyle(m)}"></div>`).join('')}</div>
        <b>${t.title}</b>
        <small>${open ? (seen ? 'Watched · tap to rewatch' : `New! First watch: ${amt('gem', t.reward)}`)
                      : 'Needs ' + t.members.filter(m => !SAVE.chars[m]).map(m => CHARACTERS[m].short).join(', ')}</small>
        ${open && !seen ? '<span class="badge">NEW</span>' : ''}
      </button>`;
    }).join('')}</div>`;
  document.querySelectorAll('#talks .talk:not(.locked)').forEach(b => b.onclick = async () => {
    const t = TALKS.find(x => x.id === b.dataset.id);
    await playStory(t.lines, `Off-stream · ${t.title}`, t.scene);
    if (!SAVE.talks[t.id]) {
      SAVE.talks[t.id] = true; SAVE.gems += t.reward; persist();
      toast(`${amt('gem', t.reward)} for watching "${t.title}"`);
    }
    RENDER.talks();
  });
};

// ---------- Missions ----------
let missionTab = 'daily';

// Where each mission's "Go" button takes you.
const MISSION_GO = {
  login: () => openLogin(), wins: () => show('stages'), ults: () => show('stages'), breaks: () => show('stages'),
  pulls: () => show('recruit'), farm: () => show('tower'),
  raid: () => { liveTab = 'raid'; show('live'); }, dailystage: () => { liveTab = 'daily'; show('live'); },
  event: () => { liveTab = 'event'; show('live'); }, gift: () => { memberTab = 'bond'; show('members'); },
  fulldays: () => { missionTab = 'daily'; RENDER.missions(); },
};

const missionBadge = () => claimableMissions() + claimableDailies() + claimableChests() + claimableWeekly();

function missionRow(m, prog, claimed, cls, extra = '') {
  const done = prog >= m.goal;
  return `<div class="mission ${claimed ? 'claimed' : done ? 'ready' : ''}">
    <span class="mission-check">${claimed ? ic('check') : done ? '!' : ''}</span>
    <div class="mission-main"><b>${m.text}</b>${m.goal > 1 || !claimed ? `<div class="mission-bar"><i style="width:${Math.min(1, prog / m.goal) * 100}%"></i></div><small>${Math.min(prog, m.goal)}/${m.goal}</small>` : ''}</div>
    ${extra}<span class="mission-rew">${giveLabel(m.reward)}</span>
    ${claimed ? '<button class="btn small" disabled>Claimed</button>'
      : done ? `<button class="btn small primary ${cls}" data-id="${m.id}">Claim</button>`
      : MISSION_GO[m.stat] ? `<button class="btn small go" data-stat="${m.stat}">Go ${ic('next')}</button>` : '<button class="btn small" disabled>In progress</button>'}
  </div>`;
}

RENDER.missions = () => {
  const d = daily(), w = weekly();
  const list = MISSIONS.map(m => ({ m, done: m.check(SAVE), claimed: !!SAVE.claimed[m.id] }))
    .sort((a, b) => (a.claimed - b.claimed) || (b.done - a.done));
  // Time left until the dailies reset (local midnight) and the weeklies (Monday).
  const msLeft = new Date(new Date().setHours(24, 0, 0, 0)) - new Date();
  const hLeft = Math.floor(msLeft / 3600000), mLeft = Math.floor(msLeft / 60000) % 60;
  const pts = activityPoints();
  const dailyHtml = `
    <div class="activity">
      <div class="act-head"><b>Daily Activity</b><span><em>${pts}</em>/${ACTIVITY_MAX}</span><small>Each claimed daily mission gives ${DAILY_MISSIONS[0].pts} points</small></div>
      <div class="act-track"><i style="width:${pts / ACTIVITY_MAX * 100}%"></i>
        ${ACTIVITY_CHESTS.map((c, i) => {
          const got = (d.chests || []).includes(i), ready = !got && pts >= c.at;
          return `<button class="act-chest ${got ? 'got' : ready ? 'ready' : ''}" data-chest="${i}" style="left:${c.at / ACTIVITY_MAX * 100}%" ${ready ? '' : 'disabled'} title="${c.at} points">
            ${ic('chest')}<small>${c.at}</small><span class="act-tip">${giveLabel(c.reward)}${c.reward.gifts ? ` + ${c.reward.gifts} gift` : ''}</span></button>`;
        }).join('')}</div>
    </div>
    ${DAILY_MISSIONS.map(m => missionRow(m, d.progress[m.stat] || 0, !!d.claimed[m.id], 'claim-daily', `<span class="mission-pts">+${m.pts}</span>`)).join('')}`;
  const weeklyHtml = WEEKLY_MISSIONS.map(m => missionRow(m, w.progress[m.stat] || 0, !!w.claimed[m.id], 'claim-weekly')).join('');
  const goalsHtml = list.map(({ m, done, claimed }) => missionRow({ ...m, goal: 1, reward: { gems: m.reward } }, done ? 1 : 0, claimed, 'claim')).join('');
  $('#missions').innerHTML = `
    ${topbar('Missions')}
    <div class="ms-tabs">
      <button class="ch-tab ${missionTab === 'daily' ? 'sel' : ''}" data-mt="daily">Daily ${badge(claimableDailies() + claimableChests())}<small>Resets in ${hLeft}h ${mLeft}m</small></button>
      <button class="ch-tab ${missionTab === 'weekly' ? 'sel' : ''}" data-mt="weekly">Weekly ${badge(claimableWeekly())}<small>Resets in ${timeLeft(raidInfo().ends).replace(' left', '')}</small></button>
      <button class="ch-tab ${missionTab === 'goals' ? 'sel' : ''}" data-mt="goals">Goals ${badge(claimableMissions())}<small>${MISSIONS.filter(m => SAVE.claimed[m.id]).length}/${MISSIONS.length} complete</small></button>
      ${helpBtn('growth')}
    </div>
    <div class="mission-list">${missionTab === 'daily' ? dailyHtml : missionTab === 'weekly' ? weeklyHtml : goalsHtml}</div>`;
  document.querySelectorAll('#missions [data-mt]').forEach(b => b.onclick = () => { missionTab = b.dataset.mt; RENDER.missions(); });
  document.querySelectorAll('#missions .go').forEach(b => b.onclick = () => MISSION_GO[b.dataset.stat]());
  document.querySelectorAll('#missions .claim').forEach(b => b.onclick = () => {
    const m = MISSIONS.find(x => x.id === b.dataset.id);
    SAVE.claimed[m.id] = true; SAVE.gems += m.reward; persist();
    RENDER.missions();
    showRewards([{ kind: 'gem', n: m.reward }], { title: 'Goal Complete', sub: m.text.toUpperCase() });
  });
  document.querySelectorAll('#missions .claim-daily').forEach(b => b.onclick = () => {
    const m = DAILY_MISSIONS.find(x => x.id === b.dataset.id);
    const before = activityPoints();
    daily().claimed[m.id] = true;
    giveReward(m.reward);
    if (before < ACTIVITY_MAX && activityPoints() >= ACTIVITY_MAX) bumpWeekly('fulldays');
    persist();
    RENDER.missions();
    showRewards([...rewardItems(m.reward), { icon: 'bolt', name: 'Activity', n: m.pts, rarity: 3 }], { title: 'Daily Mission', sub: m.text.toUpperCase() });
  });
  document.querySelectorAll('#missions .claim-weekly').forEach(b => b.onclick = () => {
    const m = WEEKLY_MISSIONS.find(x => x.id === b.dataset.id);
    weekly().claimed[m.id] = true;
    giveReward(m.reward); persist();
    RENDER.missions();
    showRewards(rewardItems(m.reward), { title: 'Weekly Mission', sub: m.text.toUpperCase() });
  });
  document.querySelectorAll('#missions .act-chest.ready').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.chest), c = ACTIVITY_CHESTS[i];
    const dd = daily(); dd.chests = [...(dd.chests || []), i];
    giveReward(c.reward);
    const gifts = c.reward.gifts ? randomGifts(c.reward.gifts) : null;
    persist(); sfx('chest');
    RENDER.missions();
    showRewards([...rewardItems(c.reward), ...giftItems(gifts)], { title: 'Activity Chest', sub: `${c.at} ACTIVITY POINTS` });
  });
};

// Reward label without applying it.
const giveLabel = r => [r.gems && `<span class="gem">${amt('gem', r.gems)}</span>`, r.exp && `<span class="tok">${amt('token', r.exp)}</span>`, r.coins && `<span class="coin">${amt('coin', r.coins)}</span>`].filter(Boolean).join(' ');

// ---------- Recruit ----------
let recruitTab = 'member';

// Memory card art as a CSS background (scene illustrations keep their background).
function memArtStyle(mid) {
  const m = MEMORIES[mid];
  if (!m.art) return `--h:${m.hue}`;
  return `background-image:url('${m.art}');background-size:cover;background-position:${m.focus[0] * 100}% ${m.focus[1] * 100}%`;
}

function memCardInner(mid) {
  const m = MEMORIES[mid];
  // data-r lets the surrounding .mem-card frame pick its rarity colour.
  return m.art ? `<div class="mem-card-art" data-r="${m.rarity}" style="${memArtStyle(mid)}"></div>`
               : `<div class="mem-card-art plain" data-r="${m.rarity}" style="${memArtStyle(mid)}"><span>${m.icon}</span></div>`;
}

const ROLE_ICON = { DPS: ic('dps'), Tank: ic('tank'), Support: ic('support') };

// Info about what a banner features, used by the banner screen.
function bannerInfo(bid) {
  const b = BANNERS[bid], isMem = b.type === 'memory';
  const owner = isMem ? MEMORIES[b.rateUp].owner : b.rateUp;
  return {
    b, isMem, owner,
    color: CHARACTERS[owner].color,
    upName: isMem ? MEMORIES[b.rateUp].name : CHARACTERS[b.rateUp].name,
    label: isMem ? 'Featured Memory' : 'Featured Member',
    tag: isMem ? 'MEMORY' : CHARACTERS[b.rateUp].role.toUpperCase(),
    icon: isMem ? ic('recruit') : ROLE_ICON[CHARACTERS[b.rateUp].role],
  };
}

const bannerThumb = bid => bannerArtStyle(bid);

const chapterScene = st => CHAPTERS.find(c => c.id === st.chapter).scene;

RENDER.recruit = () => {
  const bid = recruitTab, info = bannerInfo(bid), b = info.b, st = SAVE.pity[b.pity];
  const spark = SAVE.spark[b.pity] || 0;
  const sideCards = info.isMem ? b.pool4.filter(m => MEMORIES[m].art).slice(0, 2) : [];
  $('#recruit').innerHTML = `
    ${topbar('Recruit', 'lobby', 'gacha')}
    <div class="rc" style="--c:${info.color}">
      <div class="rc-bg"><div class="rc-scene" style="${bannerArtStyle(bid)}"></div><i></i><i></i><i></i></div>
      ${!info.isMem && creditHtml(b.scene) ? `<div class="rc-credit">${creditHtml(b.scene)}</div>` : ''}
      <div class="rc-list">${Object.keys(BANNERS).map(id => {
        const bi = bannerInfo(id);
        return `<button class="rc-thumb ${id === bid ? 'sel' : ''} ${bi.isMem ? 'mem' : ''}" data-tab="${id}" style="--c:${bi.color}">
          <div class="rc-thumb-art" style="${bannerThumb(id)}"></div>
          <span>${CHARACTERS[bi.owner].short} · ${bi.label}</span></button>`;
      }).join('')}</div>
      <div class="rc-stage">
        ${info.isMem ? `<div class="rc-memfan">
            ${sideCards.map((m, i) => `<div class="mem-card side s${i}">${memCardInner(m)}</div>`).join('')}
            <div class="mem-card hero">${memCardInner(b.rateUp)}</div></div>`
          : `<img class="rc-art" src="${ART[b.rateUp].url}" alt="">`}
      </div>
      <div class="rc-bubble"></div>
      <div class="rc-head">
        <div class="rc-kicker">${info.label.toUpperCase()} · RATE-UP <span class="rc-timer">${ic('timer')}${timeLeft(bannerEnds())}</span></div>
        <h2>${b.name}</h2>
        <div class="rc-up">
          <span class="rc-icon">${info.icon}</span>
          <span class="rc-rar">${starsIc(5)}</span>
          <b>${info.upName}</b>
          <button class="rc-detail" title="Details">${ic('info')}</button>
        </div>
        ${info.isMem ? `<div class="rc-sig">Signature: ${CHARACTERS[info.owner].short} · ${memPassiveText(b.rateUp, info.owner)}</div>`
                     : `<div class="rc-sig">${CHARACTERS[b.rateUp].kit.ult.name}: ${CHARACTERS[b.rateUp].kit.ult.desc}</div>`}
      </div>
      <div class="rc-left">
        <div class="rc-pity"><div class="rc-pity-head"><span>★5 PITY</span><b>${st.p5}<small>/${b.pity5}</small></b></div>
          <div class="rc-pity-bar"><i style="width:${st.p5 / b.pity5 * 100}%"></i></div>
          <small>${b.pity5 - st.p5} more pull${b.pity5 - st.p5 === 1 ? '' : 's'} to a guaranteed ★5 · ★4 every ${b.pity4}</small>
          ${st.g && b.upChance < 1 ? '<span class="r5">Next ★5 is the rate-up</span>' : ''}
          ${b.upChance >= 1 ? '<span class="r5">Every ★5 here is the rate-up</span>' : ''}</div>
        <div class="rc-spark">
          <div class="rc-spark-head"><span>${ic('spark')} SPARK</span><b>${spark}/${SPARK_COST}</b></div>
          <div class="rc-spark-bar"><i style="width:${Math.min(100, spark / SPARK_COST * 100)}%"></i></div>
          <button class="pill ${spark >= SPARK_COST ? 'yellow' : 'dark'} exchange" ${spark >= SPARK_COST ? '' : 'disabled'}>Exchange for ${info.upName.split(' ')[0]}</button>
        </div>
        <div class="rc-left-btns">
          <button class="pill dark rates">Rates</button>
          <button class="pill dark history">History</button>
          ${DEV ? `<button class="pill dark dev">+1600 ${ic('gem')}</button>` : ''}
        </div>
      </div>
      <div class="rc-pulls">
        ${daily().freePull ? '' : '<button class="pill yellow free-pull"><b>Free ×1</b><span>Today</span></button>'}
        <button class="pill light pull" data-n="1"><b>Recruit ×1</b><span class="gem">${amt('gem', b.cost)}</span></button>
        <button class="pill blue pull" data-n="10"><b>Recruit ×10</b><span>${amt('gem', b.cost * 10)}</span></button>
      </div>
    </div>`;

  const rc = $('#recruit .rc');
  // Parallax: art and stripes drift with the mouse.
  rc.onmousemove = e => {
    const r = rc.getBoundingClientRect();
    rc.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    rc.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  rc.onmouseleave = () => { rc.style.setProperty('--mx', 0); rc.style.setProperty('--my', 0); };

  const bubble = text => {
    const bb = $('#recruit .rc-bubble');
    bb.innerHTML = `<b style="color:${info.color}">${info.isMem ? info.upName : CHARACTERS[b.rateUp].short}</b>${text}`;
    bb.classList.remove('show'); void bb.offsetWidth; bb.classList.add('show');
  };
  $('#recruit .rc-stage').onclick = () => {
    if (info.isMem) bubble(MEMORIES[b.rateUp].passive.replace('{v}', memValue(b.rateUp, info.owner)) + ` (${memStatText(b.rateUp)})`);
    else {
      bubble(voice(b.rateUp, Math.random() < 0.5 ? 'recruit' : 'tap'));
      $('#recruit .rc-art').animate([{ transform: 'none' }, { transform: 'scale(1.03,.97)' }, { transform: 'translateY(-12px)' }, { transform: 'none' }], { duration: 450 });
    }
  };
  document.querySelectorAll('#recruit [data-tab]').forEach(t => t.onclick = () => { recruitTab = t.dataset.tab; RENDER.recruit(); });
  document.querySelectorAll('#recruit .pull').forEach(btn => btn.onclick = () => doRecruit(bid, Number(btn.dataset.n)));
  const free = $('#recruit .free-pull');
  if (free) free.onclick = () => { const res = recruit(bid, 1, true); if (res) playPull(res, bid, 1); };
  $('#recruit .exchange').onclick = () => openSparkOffer(bid);
  if (DEV) $('#recruit .dev').onclick = () => { SAVE.gems += 1600; persist(); RENDER.recruit(); };
  $('#recruit .rates').onclick = () => openRates(bid);
  $('#recruit .history').onclick = () => openHistory();
  $('#recruit .rc-detail').onclick = () => openBannerDetail(bid);
};

// "3d 4h" style countdown.
function timeLeft(until) {
  const ms = Math.max(0, until - new Date()), d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60;
  return d ? `${d}d ${h}h left` : `${h}h ${m}m left`;
}

function doRecruit(bid, n) {
  const res = recruit(bid, n);
  if (!res) return toast(`Not enough gems ${ic('gem')}`);
  playPull(res, bid, n);
}

function openModal(html) {
  const ov = $('#pull'), previousFocus = document.activeElement;
  ov.className = 'overlay show';
  ov.innerHTML = `<div class="picker"><div class="picker-box" role="dialog" aria-modal="true" aria-label="Recruit information">${html}</div></div>`;
  const close = () => { ov.className = 'overlay'; ov.innerHTML = ''; ov.onkeydown = null; previousFocus?.focus(); };
  ov.querySelector('.picker').onclick = e => { if (e.target.classList.contains('picker') || e.target.closest('.close')) close(); };
  ov.onkeydown = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') {
      const items = [...ov.querySelectorAll('button:not(:disabled),a[href],select')];
      if (!items.length) return;
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
    }
  };
  ov.querySelector('button')?.focus();
}

function openSparkOffer(bid) {
  const info = bannerInfo(bid), b = info.b;
  openModal(`<div class="picker-head"><h3>Guaranteed recruit</h3><button class="btn small close" aria-label="Close exchange">${ic('close')}</button></div>
    <div class="spark-offer"><div class="spark-portrait" style="${info.isMem ? memArtStyle(b.rateUp) : `background-image:url('${ART[b.rateUp].url}');background-size:contain;background-position:center bottom`}"></div><div><small>★5 · ${info.isMem ? 'MEMORY' : 'MEMBER'}</small><h3>${info.upName}</h3>
      <p>Exchange spark points for this featured ${info.isMem ? 'Memory' : 'member'}. Your recruit pity stays unchanged.</p>
      <dl><dt>Owned spark</dt><dd>${SAVE.spark[b.pity] || 0}</dd><dt>Exchange cost</dt><dd>${SPARK_COST}</dd></dl>
      <button class="pill blue spark-confirm" ${(SAVE.spark[b.pity] || 0) < SPARK_COST ? 'disabled' : ''}>Exchange · ${SPARK_COST} spark</button></div></div>`);
  $('#pull .spark-confirm').onclick = async () => {
    const res = sparkExchange(bid);
    if (!res) return;
    const ov = $('#pull'); ov.onkeydown = null;
    ov.className = 'overlay show'; ov.innerHTML = '';
    sfx('pull5'); await showSplash(ov, res);
    ov.className = 'overlay'; ov.innerHTML = ''; RENDER.recruit();
  };
}

function openRates(bid) {
  const b = BANNERS[bid], isMem = b.type === 'memory';
  const nameOf = id => isMem ? MEMORIES[id].name : CHARACTERS[id].name;
  const row = (id, rarity, rate) => `<tr><td><i class="face" style="${faceStyle(isMem ? MEMORIES[id].owner : id)}"></i><span class="r${rarity}">★${rarity}</span> ${nameOf(id)}${id === b.rateUp ? ' <em>Featured</em>' : ''}</td><td>${(rate * 100).toFixed(4)}%</td></tr>`;
  const others = b.pool5.filter(id => id !== b.rateUp);
  openModal(`<div class="picker-head"><h3>Recruit rates</h3><button class="btn small close" aria-label="Close rates">${ic('close')}</button></div>
    <p class="rates-banner">${b.name}</p><div class="rates-summary"><span class="r5">★5 <b>${(b.rate5 * 100).toFixed(1)}%</b></span><span class="r4">★4 <b>${(b.rate4 * 100).toFixed(1)}%</b></span><span class="r3">★3 <b>${((1 - b.rate5 - b.rate4) * 100).toFixed(1)}%</b></span></div>
    <p class="rates-note">Base rates for a regular draw. Pity guarantees override these rates: ★5 within ${b.pity5} pulls; ★4 or higher within ${b.pity4} pulls.</p>
    <div class="rates-table"><table><thead><tr><th>Result</th><th>Base chance</th></tr></thead><tbody>
      ${row(b.rateUp, 5, b.rate5 * b.upChance)}${others.map(id => row(id, 5, b.rate5 * (1 - b.upChance) / others.length)).join('')}
      ${b.pool4.map(id => row(id, 4, b.rate4 / b.pool4.length)).join('')}
      <tr><td><span class="r3">★3</span> Superchat Tokens ×${ITEM_EXP}</td><td>${((1 - b.rate5 - b.rate4) * 100).toFixed(4)}%</td></tr>
    </tbody></table></div>
    <p class="rates-note">${b.upChance >= 1 ? 'Every ★5 is the featured result.' : 'After a non-featured ★5, your next ★5 is guaranteed to be featured.'} ${isMem ? 'Memory' : 'Member'} banners share pity. Duplicates ${isMem ? 'raise Memory Rank (max 5)' : 'give duplicate tokens for member nodes (max 5)'}. At the duplicate limit they convert to gems. Values are rounded for display.</p>`);
}

function openBannerDetail(bid) {
  const info = bannerInfo(bid), b = info.b;
  if (info.isMem) {
    const m = MEMORIES[b.rateUp];
    openModal(`<div class="picker-head"><h3>${m.name}</h3><button class="btn small close">${ic('close')}</button></div>
      <div class="detail-row"><div class="mem-card mini big">${memCardInner(b.rateUp)}</div>
      <div><p class="r5">${stars(5)} Memory · Signature: ${CHARACTERS[m.owner].short}</p><p>${memStatText(b.rateUp)}</p>
      <p>${memPassiveText(b.rateUp, m.owner)} <small>(signature value)</small></p></div></div>`);
    return;
  }
  const c = CHARACTERS[b.rateUp], id = b.rateUp;
  openModal(`<div class="picker-head"><h3>${c.name} <span class="role role-${c.role.toLowerCase()}">${c.role}</span> ${elChip(c.element)}</h3><button class="btn small close">${ic('close')}</button></div>
    <p class="hint-inline">Numbers shown for ${SAVE.chars[id] ? `your Lv ${SAVE.chars[id].lvl} ${c.short}` : `a new Lv 1 ${c.short}`}.</p>
    <div class="skills">${['basic', 'skill', 'ult'].map(k => `
      <div class="skill" style="--c:${c.color}"><em>${k === 'ult' ? 'Ultimate' : k === 'skill' ? 'Skill' : 'Basic'}</em><b>${c.kit[k].name}</b><p>${skillNums(c.kit[k].desc, id, k)}</p></div>`).join('')}
      <div class="skill talent" style="--c:${c.color}"><em>Talent</em><b>${c.talent.name}</b><p>${skillNums(c.talent.desc, id, null)}</p></div></div>`);
}

function waitClick(el, ms) {
  return new Promise(r => {
    const prior = document.activeElement, tabindex = el.getAttribute('tabindex');
    const key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(); } };
    const done = () => {
      clearTimeout(t); el.removeEventListener('click', done); el.removeEventListener('keydown', key);
      if (tabindex === null) el.removeAttribute('tabindex'); else el.setAttribute('tabindex', tabindex);
      if (prior?.isConnected) prior.focus({ preventScroll: true });
      r();
    };
    const t = ms ? setTimeout(done, ms) : null;
    el.tabIndex = 0; el.focus({ preventScroll: true });
    el.addEventListener('click', done);
    el.addEventListener('keydown', key);
  });
}

// Front face of a result card.
function resultFront(res) {
  const tag = res.isNew ? '<span class="tag-new">NEW</span>' : res.dupe ? '<span class="tag-bond">+1 DUPE</span>'
            : res.rankUp ? `<span class="tag-bond">Rank ${res.rankUp}</span>`
            : res.converted ? `<span class="tag-bond">${amt('gem', res.converted)}</span>` : '';
  let art, icon, name;
  if (res.type === 'item') {
    art = `<div class="rcard-art token">${ic('token')}</div>`; icon = ic('token'); name = `Superchat ×${res.exp}`;
  } else if (res.type === 'memory') {
    art = `<div class="rcard-art" style="${memArtStyle(res.id)}"></div>`; icon = ic('recruit'); name = MEMORIES[res.id].name;
  } else {
    const c = CHARACTERS[res.id];
    art = `<div class="rcard-art" style="background-image:url('${ART[res.id].url}');background-size:cover;background-position:${c.face[0] * 100}% 0%"></div>`;
    icon = ROLE_ICON[c.role]; name = c.short;
  }
  return `${art}${tag}<div class="rcard-name">${name}</div><div class="rcard-icon">${icon}</div><div class="rcard-rar">${stars(res.rarity)}</div>`;
}

// Full-screen splash for a ★5 or a brand-new member/memory. Resolves on tap.
function showSplash(ov, res) {
  const layer = document.createElement('div');
  layer.className = 'splash-layer' + (SAVE.settings.flashes === false || SAVE.settings.gfx === 'low' ? ' visual-calm' : '');
  if (res.type === 'memory') {
    const m = MEMORIES[res.id];
    const col = m.owner ? CHARACTERS[m.owner].color : '#b77cff';
    layer.innerHTML = `<div class="splash mem-splash r${res.rarity}" style="--c:${col}">
      <div class="splash-bg"></div><div class="mem-card big">${memCardInner(res.id)}</div>
      <div class="splash-info"><div class="splash-stars">${stars(res.rarity)}</div><div class="mem-kicker">MEMORY</div><h2>${m.name}</h2>
      ${m.owner ? `<div class="banner-sig">Signature: ${CHARACTERS[m.owner].short}</div>` : ''}
      ${res.isNew ? '<div class="tag-new big">NEW</div>' : res.rankUp ? `<div class="tag-new big">RANK ${res.rankUp}</div>` : ''}</div>
      <div class="skip">Tap to continue</div></div>`;
  } else {
    const c = CHARACTERS[res.id];
    layer.innerHTML = `<div class="splash r${res.rarity}" style="--c:${c.color}">
      <div class="splash-bg"></div><img class="splash-art" src="${ART[res.id].url}" alt="">
      <div class="splash-info"><div class="splash-stars">${stars(res.rarity)}</div><h2>${c.name}</h2>
      <div class="role role-${c.role.toLowerCase()}">${c.role}</div>${res.isNew ? '<div class="tag-new big">NEW</div>' : res.dupe ? '<div class="tag-new big">+1 DUPLICATE TOKEN</div>' : ''}
      <q class="splash-quote">${voice(res.id, 'recruit')}</q></div>
      <div class="skip">Tap to continue</div></div>`;
  }
  ov.appendChild(layer);
  return waitClick(layer).then(() => layer.remove());
}

// The Stream Ticket: drag it up (or tap it) to go live. Its glow hints at the best
// result once it's pulled far enough. Resolves 'go', or 'skip' to jump to the results.
function pullTicket(ov, results, bid, n) {
  return new Promise(resolve => {
    const best = Math.max(...results.map(r => r.rarity)), info = bannerInfo(bid), b = info.b;
    const art = info.isMem ? memArtStyle(b.rateUp) : `background-image:url('${ART[b.rateUp].url}')`;
    const tier = `t${best}`;
    ov.innerHTML = `<div class="pt-scene" style="--c:${info.color}">
      <div class="pt-bg"></div><div class="pt-beam"></div><div class="pt-ring"></div>
      <div class="pt-ticket" role="button" tabindex="0" aria-label="Launch stream ticket"><div class="pt-holo" style="${art}"></div>
        <div class="pt-face"><em>STREAM TICKET</em><b>×${Math.max(1, results.length)}</b><small>${b.name}</small></div><i class="pt-shine"></i></div>
      <div class="pt-hint"><b>Swipe up to go live</b><span>or tap the ticket</span></div>
      <button class="pt-skip">Skip ${ic('next')}</button></div>`;
    const scene = ov.querySelector('.pt-scene'), t = scene.querySelector('.pt-ticket');
    let y0 = null, dy = 0, done = false, hinted = false;
    const set = v => {
      t.style.setProperty('--dy', v + 'px');
      scene.style.setProperty('--p', Math.min(1, -v / (innerHeight * 0.32)).toFixed(3));
    };
    const launch = () => {
      if (done) return;
      done = true;
      scene.classList.add('launch', tier);
      sfx('ticket');
      setTimeout(() => resolve('go'), 650);
    };
    t.addEventListener('pointerdown', e => {
      if (done) return;
      y0 = e.clientY; dy = 0;
      try { t.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      scene.classList.add('drag');
    });
    t.addEventListener('pointermove', e => {
      if (y0 === null || done) return;
      dy = Math.min(0, e.clientY - y0);
      set(dy);
      if (!hinted && -dy > innerHeight * 0.16) { hinted = true; scene.classList.add(tier); sfx('rise'); }
    });
    const up = () => {
      if (y0 === null) return;
      y0 = null;
      scene.classList.remove('drag');
      if (-dy > innerHeight * 0.26 || Math.abs(dy) < 6) launch();
      else { dy = 0; set(0); }
    };
    t.addEventListener('pointerup', up);
    t.addEventListener('pointercancel', up);
    t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); } });
    scene.querySelector('.pt-skip').onclick = e => { e.stopPropagation(); if (!done) { done = true; resolve('skip'); } };
  });
}

// n = 0 for a free pull with no "again" button; onClose replaces returning to Recruit.
async function playPull(results, bid, n, onClose = null) {
  const ov = $('#pull');
  const best = Math.max(...results.map(r => r.rarity));
  ov.className = 'overlay show' + (SAVE.settings.flashes === false || SAVE.settings.gfx === 'low' ? ' visual-calm' : '');
  if (await pullTicket(ov, results, bid, n) === 'go') {
    // The star starts blue and "upgrades" to purple / gold to tease the best result.
    ov.innerHTML = `<div class="pull-scene tease"><div class="sky"></div><div class="portal"></div><div class="meteor"></div><div class="flash"></div>
      <div class="pull-orbit" aria-hidden="true">${results.map((_, i) => `<i style="--i:${i};--n:${results.length}">${ic('spark')}</i>`).join('')}</div>
      <div class="pull-signal"><span>STREAM LINK / RECRUITMENT</span><div>${'<i></i>'.repeat(7)}</div><b>A NEW CONNECTION</b></div>
      <div class="tease-stars"></div><div class="skip">Tap to skip</div></div>`;
    const scene = ov.querySelector('.pull-scene');
    const upgrade = (tier, at) => setTimeout(() => {
      if (!scene.isConnected) return;
      scene.classList.remove('t3', 't4', 't5', 'bump'); void scene.offsetWidth;
      scene.classList.add(`t${tier}`, 'bump');
      scene.querySelector('.tease-stars').textContent = '★'.repeat(tier);
      scene.querySelector('.pull-signal b').textContent = tier === 5 ? 'A STAR ANSWERS / ★5' : tier === 4 ? 'VIOLET RESONANCE / ★4' : 'BLUE RESONANCE / ★3';
      sfx(`pull${tier}`);
    }, at);
    upgrade(3, 350);
    if (best >= 4) upgrade(4, 1050);
    if (best === 5) upgrade(5, 1750);
    await waitClick(ov, best === 5 ? 3000 : best === 4 ? 2300 : 1700);
  }

  ov.innerHTML = `<div class="results">
    <div class="results-title">Recruit Results</div>
    <div class="results-sum hidden">${[
      results.filter(r => r.rarity === 5).length && `<span class="r5">★5 ×${results.filter(r => r.rarity === 5).length}</span>`,
      results.filter(r => r.rarity === 4).length && `<span class="r4">★4 ×${results.filter(r => r.rarity === 4).length}</span>`,
      results.filter(r => r.isNew).length && `<span class="new">NEW ×${results.filter(r => r.isNew).length}</span>`,
      results.filter(r => r.type === 'item').length && `<span>Superchat ×${results.filter(r => r.type === 'item').length}</span>`,
    ].filter(Boolean).join('')}</div>
    <div class="rcards n${results.length}">${results.map((res, i) => `
      <div class="rcard r${res.rarity}" role="button" tabindex="0" aria-label="Reveal recruit ${i + 1}" data-i="${i}" style="animation-delay:${i * 70}ms">
        <div class="rcard-inner">
          <div class="rcard-back"><span>${ic('spark')}</span><em>WATA☆SPO</em></div>
          <div class="rcard-front">${resultFront(res)}</div>
        </div>
      </div>`).join('')}</div>
    <div class="results-hint">Tap a card to reveal it</div>
    <div class="results-btns">
      <button class="pill dark reveal">Reveal all</button>
      ${results.length > 1 ? `<button class="pill dark skip-all">Skip ${ic('next')}</button>` : ''}
      <button class="pill light ok hidden">Confirm</button>
      <button class="pill blue again hidden"><b>Recruit ×${n}</b><span>${amt('gem', BANNERS[bid].cost * n)}</span></button>
    </div>
  </div>`;

  const cards = [...ov.querySelectorAll('.rcard')];
  let busy = false;
  const flip = async i => {
    const el = cards[i], res = results[i];
    if (el.classList.contains('open')) return;
    el.classList.add('open');
    el.setAttribute('aria-label', el.querySelector('.rcard-name').textContent);
    sfx(res.rarity === 5 ? 'pull5' : res.rarity === 4 ? 'pull4' : 'flip');
    if (res.type !== 'item' && (res.rarity === 5 || res.isNew)) {
      await new Promise(r => setTimeout(r, 350));
      await showSplash(ov, res);
    }
    if (cards.every(c => c.classList.contains('open'))) done();
  };
  const done = () => {
    ov.querySelector('.reveal').classList.add('hidden');
    const sk = ov.querySelector('.skip-all');
    if (sk) sk.classList.add('hidden');
    ov.querySelector('.results-sum').classList.remove('hidden');
    ov.querySelector('.results-hint').textContent = 'Tap a card to see who it is';
    ov.querySelector('.ok').classList.remove('hidden');
    if (n) ov.querySelector('.again').classList.remove('hidden');
  };
  cards.forEach((el, i) => el.onclick = async () => {
    if (busy) return;
    if (!el.classList.contains('open')) { busy = true; await flip(i); busy = false; return; }
    // Revealed card: a member says their line, anything else shows its name.
    const res = results[i];
    toast(res.type === 'char' ? `${CHARACTERS[res.id].short}: "${voice(res.id, 'tap')}"` : el.querySelector('.rcard-name').textContent);
  });
  cards.forEach(el => el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  ov.querySelector('.reveal').onclick = async () => {
    if (busy) return;
    busy = true;
    for (let i = 0; i < cards.length; i++) {
      if (!cards[i].classList.contains('open')) { await flip(i); await new Promise(r => setTimeout(r, 120)); }
    }
    busy = false;
  };
  // Skip: turn every card over at once; only ★5s and new members still get their splash.
  const skip = ov.querySelector('.skip-all');
  if (skip) skip.onclick = async () => {
    if (busy) return;
    busy = true;
    cards.forEach(el => { el.classList.add('open'); el.setAttribute('aria-label', el.querySelector('.rcard-name').textContent); });
    sfx(results.some(r => r.rarity === 5) ? 'pull5' : 'flip');
    for (const res of results) {
      if (res.type !== 'item' && (res.rarity === 5 || (res.isNew && res.type === 'char'))) await showSplash(ov, res);
    }
    done();
    busy = false;
  };
  const close = () => { ov.className = 'overlay'; ov.innerHTML = ''; if (onClose) onClose(); else RENDER.recruit(); };
  ov.querySelector('.ok').onclick = e => { e.stopPropagation(); close(); };
  // stopPropagation: this click must not reach #pull, or it would skip the next pull's animation.
  ov.querySelector('.again').onclick = e => { e.stopPropagation(); close(); doRecruit(bid, n); };
}

// ---------- Members ----------
let memberTab = 'overview';
let dupeSel = null;
const SKILL_KEYS = ['basic', 'skill', 'ult'];
const SKILL_LABEL = { basic: 'Basic', skill: 'Skill', ult: 'Ultimate' };
const SKILL_GLYPH = { basic: ic('basic'), skill: ic('skill'), ult: ic('ult') };

// Adds the real numbers to a skill text: "480% ATK" -> "480% ATK 1,284".
// Buffs written as "+40% ATK" are left alone. key = null for talents.
function skillNums(desc, id, key) {
  const s = charStats(id), pw = key ? skillPower(id, key) : 1;
  const n = v => `<b class="num">${Math.round(v).toLocaleString()}</b>`;
  return desc
    .replace(/(?<![+\d])(\d+)% ATK/g, (m, p) => `${m} ${n(s.atk * p / 100 * pw)}`)
    .replace(/(?<![+\d])(\d+)% DEF/g, (m, p) => `${m} ${n(s.def * p / 100 * pw)}`)
    .replace(/(\d+)% (of [\w']+ )?max HP/g, (m, p) => `${m} ${n(s.hp * p / 100 * pw)}`);
}

const elChip = key => `<span class="el-chip" style="--ec:${ELEMENTS[key].color}">${elIc(key)}${ELEMENTS[key].name}</span>`;

// Stat changes if a member swapped to this Memory.
function memDelta(charId, mid) {
  const before = charStats(charId), prev = SAVE.equip[charId];
  SAVE.equip[charId] = mid;
  const after = charStats(charId);
  if (prev) SAVE.equip[charId] = prev; else delete SAVE.equip[charId];
  const parts = [['hp', 'HP'], ['atk', 'ATK'], ['def', 'DEF'], ['spd', 'SPD']].map(([k, l]) => [l, after[k] - before[k]])
    .concat([['CRIT', Math.round((after.crit - before.crit) * 100)], ['CRIT DMG', Math.round((after.critDmg - before.critDmg) * 100)]])
    .filter(([, d]) => d)
    .map(([l, d], i) => `<span class="${d > 0 ? 'up' : 'down'}">${l} ${d > 0 ? '+' : ''}${d.toLocaleString()}${i >= 4 || l.startsWith('CRIT') ? '%' : ''}</span>`);
  return parts.join('') || '<span>No stat change</span>';
}
const MEMBER_TABS = { overview: 'Overview', skills: 'Skills', dupes: 'Duplicates', bond: 'Bond', profile: 'Profile' };

RENDER.members = () => {
  const ids = Object.keys(CHARACTERS);
  const id = membersSel, c = CHARACTERS[id], own = SAVE.chars[id];
  if (!own) memberTab = 'overview';
  const body = memberTab === 'skills' ? skillsView(id) : memberTab === 'dupes' ? dupesView(id)
             : memberTab === 'profile' ? profileView(id) : memberTab === 'bond' ? bondView(id) : overviewView(id);
  $('#members').innerHTML = `
    ${topbar('', 'lobby', 'growth')}
    <div class="ch ch-${memberTab}" style="--c:${c.color}">
      <div class="ch-bg">${scenesOf(id)[0] ? `<div class="ch-scene" style="${sceneStyle(scenesOf(id)[0])}"></div>` : ''}</div>
      <div class="ch-strip">${ids.map(k => `
        <button class="ch-face ${k === id ? 'sel' : ''} ${SAVE.chars[k] ? '' : 'locked'}" data-id="${k}" style="--c:${CHARACTERS[k].color}" title="${CHARACTERS[k].short}">
          <div class="face" style="${faceStyle(k)}"></div><span class="ch-face-el">${elIc(CHARACTERS[k].element)}</span></button>`).join('')}
      </div>
      <div class="ch-tabbar">${Object.entries(MEMBER_TABS).map(([t, label]) => `
        <button class="${memberTab === t ? 'sel' : ''}" data-mt="${t}" ${!own && t !== 'overview' ? 'disabled' : ''}>${label}</button>`).join('')}
      </div>
      ${body}
    </div>`;

  document.querySelectorAll('#members .ch-face').forEach(b => b.onclick = () => { membersSel = b.dataset.id; dupeSel = null; RENDER.members(); });
  document.querySelectorAll('#members [data-mt]').forEach(b => b.onclick = () => { memberTab = b.dataset.mt; RENDER.members(); });
  bindOverview(id); bindSkills(id); bindDupes(id); bindProfile(id);
  if (memberTab === 'bond') bindBond(id);
};

// ---------- Overview ----------
const STAT_IC = { hp: 'heart', atk: 'battle', def: 'tank', spd: 'bolt', crit: 'spark', critDmg: 'ult' };
const statRows = s => [['hp', 'HP', s.hp.toLocaleString()], ['atk', 'ATK', s.atk.toLocaleString()], ['def', 'DEF', s.def.toLocaleString()],
  ['spd', 'SPD', s.spd], ['crit', 'CRIT Rate', Math.round(s.crit * 100) + '%'], ['critDmg', 'CRIT DMG', Math.round(s.critDmg * 100) + '%']];

function overviewView(id) {
  const c = CHARACTERS[id], own = SAVE.chars[id], s = charStats(id), el = ELEMENTS[c.element];
  return `
    <div class="cv-bgname" aria-hidden="true"><span>${c.name.toUpperCase()}</span><span>${c.name.toUpperCase()}</span></div>
    <div class="cv-glow"></div>
    <div class="ch-art ${own ? '' : 'locked'}"><img src="${ART[id].url}" alt=""><div class="cv-bubble"></div></div>
    <div class="ch-left cv-left">
      <div class="cv-title">
        <div class="cv-meta"><span class="cv-el" style="--ec:${el.color}">${elIc(c.element)}${el.name}</span><span class="cv-role">${ROLE_ICON[c.role]}${c.role}</span></div>
        <h2>${c.name}</h2>
        <div class="cv-stars">${'★'.repeat(c.rarity)}</div>
      </div>
      ${own ? `<div class="cv-lv"><div class="cv-lv-top"><span>LV.</span><b>${own.lvl}</b><small>/ ${MAX_LEVEL}</small><em>Skill cap · Rank ${skillCap(own.lvl)}</em></div>
        <div class="cv-lv-bar"><i style="width:${own.lvl / MAX_LEVEL * 100}%"></i></div></div>` : '<div class="cv-locked">Not recruited yet</div>'}
      <div class="cv-stats">${statRows(s).map(([k, label, v]) => `<div class="cv-stat"><span class="cv-si">${ic(STAT_IC[k])}</span><span>${label}</span><b>${v}</b></div>`).join('')}</div>
      <div class="cv-skills">${SKILL_KEYS.map(k => `
        <button class="cv-skill" data-mt="skills" ${own ? '' : 'disabled'} title="${c.kit[k].desc.replace(/"/g, '&quot;')}">
          <span class="cv-skill-ico">${SKILL_GLYPH[k]}<em>${own ? own.skills[k] : 1}</em></span><small>${SKILL_LABEL[k]}</small><b>${c.kit[k].name}</b></button>`).join('')}
        <button class="cv-skill talent" data-mt="skills" ${own ? '' : 'disabled'} title="${c.talent.desc.replace(/"/g, '&quot;')}">
          <span class="cv-skill-ico">${ic('talent')}</span><small>Talent</small><b>${c.talent.name}</b></button>
      </div>
    </div>
    <div class="ch-right cv-right">
      ${own ? `
      <div class="cv-card cv-levelup">
        <div class="cv-card-head"><b>${ic('star')}Level Up</b><span class="tok">${amt('token', SAVE.exp.toLocaleString())}</span></div>
        <div class="ch-lvbtns">${own.lvl >= MAX_LEVEL ? '<button class="pill dark" disabled>Max level reached</button>' : [1, 5, MAX_LEVEL].map(n => {
          const lc = levelsCost(own.lvl, n);
          return `<button class="pill ${n === 1 ? 'light' : 'dark'} lvlup" data-n="${n}" ${lc.levels ? '' : 'disabled'}>
            <b>${n === MAX_LEVEL ? 'Max' : '+' + n}</b><span class="tok">${amt('token', (lc.levels ? lc.cost : levelCost(own.lvl)).toLocaleString())}</span></button>`;
        }).join('')}</div>
      </div>
      <button class="cv-card cv-dupes" data-mt="dupes">
        <div class="cv-card-head"><b>${ic('spark')}Duplicates</b><span>${own.bond}/${MAX_DUPES}</span></div>
        <div class="cv-dupe-row">${DUPLICATES[id].map((d, i) => `<i class="${i < own.bond ? 'on' : i === own.bond && own.tokens ? 'ready' : ''}" title="${d.name}">${i + 1}</i>`).join('')}</div>
        ${own.tokens ? `<em>${own.tokens} token${own.tokens > 1 ? 's' : ''} ready to unlock</em>` : `<small>Next: ${DUPLICATES[id][Math.min(own.bond, MAX_DUPES - 1)].name}</small>`}
      </button>
      ${memorySlot(id)}
      <div class="cv-btnrow"><button class="pill dark cv-3d">${ic('eye')} 3D model</button><button class="pill dark setlobby" ${SAVE.lobby === id ? 'disabled' : ''}>${SAVE.lobby === id ? ic('check') + 'In lobby' : 'Show in lobby'}</button></div>`
      : `<div class="ch-recruit"><b>Not recruited yet</b><span>Find ${c.short} on the Recruit screen.</span>
          <button class="pill blue" data-go="recruit">Go to Recruit</button><button class="pill dark cv-3d">${ic('eye')} 3D model</button></div>`}
    </div>`;
}

// Speech bubble over the art on the Members screen.
function memberSay(id, kind) {
  const bb = $('#members .cv-bubble');
  if (!bb) return;
  bb.textContent = voice(id, kind);
  bb.classList.remove('show'); void bb.offsetWidth; bb.classList.add('show');
}

// "LEVEL UP" burst over the art with the stat gains.
function levelUpBurst(id, from, to, before, after) {
  const host = $('#members .ch');
  if (!host) return;
  const gains = statRows(after).map(([k, label], i) => [label, after[k] - before[k], i]).filter(([, d]) => d > 0)
    .map(([label, d]) => `<span>${label} <b>+${d.toLocaleString()}</b></span>`).join('');
  const el = document.createElement('div');
  el.className = 'lvburst';
  el.innerHTML = `<i class="lvb-ring"></i><i class="lvb-ring r2"></i><b>LEVEL UP</b><em>Lv ${from} <i>→</i> ${to}</em><div class="lvb-gains">${gains}</div>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function bindOverview(id) {
  const c = CHARACTERS[id], art = $('#members .ch-art');
  if (art && SAVE.chars[id] && memberTab === 'overview') art.onclick = () => {
    memberSay(id, 'tap');
    art.querySelector('img').animate([{ transform: 'none' }, { transform: 'scale(1.02, .98)' }, { transform: 'translateY(-10px)' }, { transform: 'none' }], { duration: 450 });
  };
  document.querySelectorAll('#members .lvlup').forEach(b => b.onclick = () => {
    const own = SAVE.chars[id], { levels, cost } = levelsCost(own.lvl, Number(b.dataset.n));
    if (!levels) return toast(`Not enough Superchat Tokens ${ic('token')}`);
    const before = charStats(id), from = own.lvl;
    SAVE.exp -= cost; own.lvl += levels; persist(); RENDER.members();
    sfx('levelup');
    levelUpBurst(id, from, own.lvl, before, charStats(id));
    memberSay(id, 'levelUp');
    const img = $('#members .ch-art img');
    if (img) img.animate([{ filter: 'brightness(2) drop-shadow(0 0 30px #fff)', transform: 'scale(1.04)' }, { filter: 'none', transform: 'none' }], { duration: 800 });
  });
  const v3 = $('#members .cv-3d');
  if (v3) v3.onclick = () => openChibiViewer(id);
  const sl = $('#members .setlobby');
  if (sl) sl.onclick = () => { SAVE.lobby = id; persist(); RENDER.members(); toast(`${c.short} is now in the lobby`); };
  const ms = $('#members .mem-slot');
  if (ms) ms.onclick = () => openMemoryPicker(id);
}

// ---------- Skills ----------
function skillsView(id) {
  const c = CHARACTERS[id], own = SAVE.chars[id];
  if (!own) return '';
  const cap = skillCap(own.lvl);
  const nextLv = cap < MAX_SKILL_RANK ? Math.ceil(((cap / 3) * 7) + 1) : null;
  return `
    <div class="sk-art"><img src="${ART[id].url}" alt=""></div>
    <div class="sk-panel">
      <div class="sk-cap">Rank cap <b>${cap}</b>/${MAX_SKILL_RANK}${nextLv ? ` · reach <b>Lv ${nextLv}</b> to raise it` : ' · fully unlocked'}
        <span class="tok">${amt('token', SAVE.exp)}</span></div>
      ${SKILL_KEYS.map(k => {
        const r = own.skills[k], pw = skillPower(id, k);
        const atCap = r >= cap, maxed = r >= MAX_SKILL_RANK, cost = skillCost(r);
        return `<div class="sk-row">
          <div class="sk-ico big"><span>${SKILL_GLYPH[k]}</span></div>
          <div class="sk-main">
            <div class="sk-title"><em>${SKILL_LABEL[k]}</em><b>${c.kit[k].name}</b><span class="sk-rank">RANK ${r}<small>/${MAX_SKILL_RANK}</small></span></div>
            <div class="sk-bar">${Array.from({ length: MAX_SKILL_RANK }, (_, i) =>
              `<i class="${i < r ? 'on' : i < cap ? '' : 'capped'} ${(i + 1) % 3 === 0 ? 'mark' : ''}"></i>`).join('')}</div>
            <p>${skillNums(c.kit[k].desc, id, k)}</p>
            ${k === 'skill' && c.kit.support ? `<p class="sk-sup"><b>${ic('collab')} Support Skill · ${c.kit.support.name}</b> ${c.kit.support.desc} <i>Used when she is a support. Uses this rank.</i></p>` : ''}
            <small>Effect power <b>×${pw.toFixed(2)}</b>${maxed ? '' : ` → ×${(pw + SKILL_RANK_BONUS).toFixed(2)} at Rank ${r + 1}`}</small>
          </div>
          <button class="pill ${atCap ? 'dark' : 'light'} sk-up" data-k="${k}" ${atCap || SAVE.exp < cost ? 'disabled' : ''}>
            ${maxed ? '<b>MAX</b>' : atCap ? '<b>Capped</b>' : `<b>Upgrade</b><span class="tok">${amt('token', cost)}</span>`}</button>
        </div>`;
      }).join('')}
      ${c.talent ? `<div class="sk-row talent">
        <div class="sk-ico big"><span>${ic('talent')}</span></div>
        <div class="sk-main"><div class="sk-title"><em>Talent · always on</em><b>${c.talent.name}</b></div><p>${skillNums(c.talent.desc, id, null)}</p></div>
      </div>` : ''}
      <p class="sk-note">Each rank adds +${Math.round(SKILL_RANK_BONUS * 100)}% to the skill's damage, shields, heals and buffs. Duplicates can boost skills further.</p>
    </div>`;
}

function bindSkills(id) {
  document.querySelectorAll('#members .sk-up').forEach(b => b.onclick = () => {
    const own = SAVE.chars[id], k = b.dataset.k, cost = skillCost(own.skills[k]);
    if (SAVE.exp < cost || own.skills[k] >= skillCap(own.lvl)) return;
    SAVE.exp -= cost; own.skills[k]++; persist(); RENDER.members();
    const row = document.querySelectorAll('#members .sk-row')[SKILL_KEYS.indexOf(k)];
    if (row) row.animate([{ boxShadow: '0 0 0 2px var(--gold), 0 0 30px var(--gold)' }, { boxShadow: 'none' }], { duration: 700 });
    toast(`${CHARACTERS[id].kit[k].name} → Rank ${own.skills[k]}`);
  });
}

// ---------- Duplicates ----------
function dupesView(id) {
  const c = CHARACTERS[id], own = SAVE.chars[id];
  if (!own) return '';
  const nodes = DUPLICATES[id];
  if (dupeSel === null) dupeSel = Math.min(own.bond, MAX_DUPES - 1);
  const p = nodes[dupeSel];
  const unlocked = dupeSel < own.bond, isNext = dupeSel === own.bond;
  const canBuy = isNext && own.tokens > 0;
  return `
    <div class="dp">
      <div class="dp-rays"></div>
      <div class="dp-star">${nodes.map((_, i) => `<i style="--r:${i * 72}deg" class="${i < own.bond ? 'on' : ''}"></i>`).join('')}</div>
      <div class="dp-core"><div class="face" style="${faceStyle(id)}"></div><b>${own.bond}/${MAX_DUPES}</b></div>
      ${nodes.map((n, i) => {
        const a = (-90 + i * 72) * Math.PI / 180;
        return `<button class="dp-node ${i < own.bond ? 'on' : ''} ${i === own.bond ? 'next' : ''} ${i === dupeSel ? 'sel' : ''}" data-i="${i}"
          style="left:${50 + Math.cos(a) * 30}%;top:${50 + Math.sin(a) * 38}%">
          <span class="dp-num">0${i + 1}</span><span class="dp-name">${n.name}</span><span class="dp-lock">${ic(i < own.bond ? 'check' : 'lock')}</span></button>`;
      }).join('')}
    </div>
    <div class="dp-side">
      <div class="dp-head"><button class="dp-nav prev" ${dupeSel === 0 ? 'disabled' : ''}>${ic('back')}</button>
        <div><b>0${dupeSel + 1}</b><small>DUPLICATE</small></div>
        <button class="dp-nav next" ${dupeSel === MAX_DUPES - 1 ? 'disabled' : ''}>${ic('next')}</button></div>
      <h3>${p.name}</h3>
      <p class="dp-desc">${p.desc}</p>
      <div class="dp-status ${unlocked ? 'ok' : ''}">${unlocked ? ic('check') + 'Unlocked' : isNext ? 'Next to unlock' : `Unlock node 0${own.bond + 1} first`}</div>
      <div class="dp-costlabel">Activation cost</div>
      <div class="dp-cost">
        <div class="dp-token"><div class="face" style="${faceStyle(id)}"></div><b>1</b></div>
        <span class="${own.tokens ? '' : 'none'}">Owned: ${own.tokens}</span>
      </div>
      <button class="pill ${canBuy ? 'blue' : 'dark'} activate" ${canBuy ? '' : 'disabled'}>
        ${unlocked ? 'Unlocked' : canBuy ? 'Unlock' : isNext ? 'Not enough tokens' : 'Locked'}</button>
      <p class="dp-hint">Pull ${c.short} again on a member banner to get a duplicate token. Max ${MAX_DUPES} duplicates; any extra copies turn into ${amt('gem', DUPE_GEMS)}.</p>
    </div>`;
}

// ---------- Profile: voice lines and backdrops ----------
const VOICE_LABELS = { recruit: 'Recruit', lobby: 'Home', tap: 'Tap', battleStart: 'Battle start', ult: 'Ultimate', victory: 'Victory', ko: 'Knocked out', levelUp: 'Level up' };

function profileView(id) {
  const c = CHARACTERS[id], v = VOICE[id];
  const lines = Object.entries(VOICE_LABELS).flatMap(([k, label]) =>
    [].concat(v[k] || []).map((text, i) => ({ k, label: [].concat(v[k]).length > 1 ? `${label} ${i + 1}` : label, text })));
  const talks = TALKS.filter(t => t.members.includes(id));
  return `
    <div class="pf-art"><img src="${ART[id].url}" alt=""><div class="pf-bubble"></div></div>
    <div class="pf-panel">
      ${c.profile ? `<div class="pf-card"><div class="pf-facts"><span><small>Height</small>${c.profile.height}</span><span><small>Birthday</small>${c.profile.birthday}</span>
        <span><small>Element</small>${elChip(c.element)}</span></div><p>${c.profile.about}</p></div>` : ''}
      <div class="ch-sec">Voice lines <small>tap to hear them say it</small></div>
      <div class="pf-lines">${lines.map(l => `<button class="pf-line" data-text="${l.text.replace(/"/g, '&quot;')}"><em>${l.label}</em><span>${l.text}</span></button>`).join('')}</div>
      <div class="ch-sec">Backdrops</div>
      <div class="pf-scenes">${scenesOf(id).map(sid => `<button class="pf-scene" data-s="${sid}" style="${sceneStyle(sid)}"><span>${SCENES[sid].title}</span></button>`).join('') || '<p class="hint-inline">None yet.</p>'}</div>
      <div class="ch-sec">Off-stream Talks</div>
      <div class="pf-talks">${talks.map(t => `<span class="${SAVE.talks[t.id] ? 'seen' : ''}">${SAVE.talks[t.id] ? ic('check') : '•'} ${t.title}</span>`).join('')}</div>
    </div>`;
}

function bindProfile(id) {
  document.querySelectorAll('#members .pf-line').forEach(b => b.onclick = () => {
    const bb = $('#members .pf-bubble');
    bb.textContent = b.dataset.text;
    bb.classList.remove('show'); void bb.offsetWidth; bb.classList.add('show');
    $('#members .pf-art img').animate([{ transform: 'none' }, { transform: 'scale(1.02, .98)' }, { transform: 'translateY(-8px)' }, { transform: 'none' }], { duration: 420 });
  });
  document.querySelectorAll('#members .pf-scene').forEach(b => b.onclick = () => viewScene(b.dataset.s));
}

function bindDupes(id) {
  document.querySelectorAll('#members .dp-node').forEach(b => b.onclick = () => { dupeSel = Number(b.dataset.i); RENDER.members(); });
  const prev = $('#members .dp-nav.prev'), next = $('#members .dp-nav.next');
  if (prev) prev.onclick = () => { dupeSel--; RENDER.members(); };
  if (next) next.onclick = () => { dupeSel++; RENDER.members(); };
  const act = $('#members .activate');
  if (act) act.onclick = () => {
    const own = SAVE.chars[id];
    if (dupeSel !== own.bond || !own.tokens) return;
    own.tokens--; own.bond++; persist();
    const name = DUPLICATES[id][dupeSel].name;
    dupeSel = Math.min(own.bond, MAX_DUPES - 1);
    RENDER.members();
    const core = $('#members .dp-core');
    if (core) core.animate([{ transform: 'translate(-50%,-50%) scale(1.25)', filter: 'brightness(2)' }, { transform: 'translate(-50%,-50%)', filter: 'none' }], { duration: 700 });
    toast(`Unlocked "${name}"`);
  };
}

// How many of `want` levels the player can afford from `lvl`, and the total cost.
function levelsCost(lvl, want) {
  let levels = 0, cost = 0;
  while (levels < want && lvl + levels < MAX_LEVEL && cost + levelCost(lvl + levels) <= SAVE.exp) {
    cost += levelCost(lvl + levels);
    levels++;
  }
  return { levels, cost };
}

function memStatText(mid) {
  const m = MEMORIES[mid], k = memStatMult(mid), out = [];
  const pct = v => Math.round(v * k * 100);
  if (m.stats.hp) out.push(`HP +${pct(m.stats.hp)}%`);
  if (m.stats.atk) out.push(`ATK +${pct(m.stats.atk)}%`);
  if (m.stats.def) out.push(`DEF +${pct(m.stats.def)}%`);
  if (m.stats.crit) out.push(`CRIT +${pct(m.stats.crit)}%`);
  if (m.stats.critDmg) out.push(`CRIT DMG +${pct(m.stats.critDmg)}%`);
  if (m.spd) out.push(`SPD +${Math.round(m.spd * k)}`);
  return out.join(' · ');
}

function memorySlot(id) {
  const mid = SAVE.equip[id];
  if (!mid) return `<button class="mem-slot empty"><span>${ic('plus')}</span><div><b>No Memory</b><small>Tap to equip a Memory card</small></div></button>`;
  const m = MEMORIES[mid];
  return `<button class="mem-slot r${m.rarity}">
    <div class="mem-card mini">${memCardInner(mid)}</div>
    <div><em class="r${m.rarity}">${stars(m.rarity)} · Rank ${SAVE.memories[mid].rank}</em><b>${m.name}${m.owner === id ? ' <span class="sig">SIGNATURE</span>' : ''}</b>
      <small>${memStatText(mid)}</small><small>${memPassiveText(mid, id)}</small></div></button>`;
}

function openMemoryPicker(charId) {
  const ov = $('#pull');
  const owned = Object.keys(SAVE.memories).sort((a, b) => MEMORIES[b].rarity - MEMORIES[a].rarity);
  ov.className = 'overlay show';
  ov.innerHTML = `<div class="picker">
    <div class="picker-box">
      <div class="picker-head"><h3>Equip a Memory on ${CHARACTERS[charId].short}</h3><button class="btn small close">${ic('close')}</button></div>
      ${owned.length ? '' : '<p class="hint-inline">You don\'t have any Memories yet. Pull on the Memory Banner in Recruit.</p>'}
      <div class="picker-list">${owned.map(mid => {
        const m = MEMORIES[mid], wearer = memWearer(mid);
        return `<button class="picker-item r${m.rarity} ${SAVE.equip[charId] === mid ? 'sel' : ''}" data-mid="${mid}">
          <div class="mem-card mini">${memCardInner(mid)}</div>
          <div class="picker-text"><em class="r${m.rarity}">${stars(m.rarity)} · Rank ${SAVE.memories[mid].rank}</em>
            <b>${m.name}${m.owner === charId ? ' <span class="sig">SIGNATURE</span>' : ''}</b>
            <small>${memStatText(mid)}</small><small>${memPassiveText(mid, charId)}</small>
            ${SAVE.equip[charId] !== mid ? `<small class="mem-delta">${memDelta(charId, mid)}</small>` : '<small class="mem-delta"><span>Equipped</span></small>'}
            ${wearer && wearer !== charId ? `<small class="worn">Worn by ${CHARACTERS[wearer].short}. Equipping moves it.</small>` : ''}</div>
        </button>`;
      }).join('')}</div>
      ${SAVE.equip[charId] ? '<button class="btn unequip">Unequip</button>' : ''}
    </div></div>`;
  const close = () => { ov.className = 'overlay'; ov.innerHTML = ''; RENDER.members(); };
  ov.querySelector('.close').onclick = close;
  ov.querySelector('.picker').onclick = e => { if (e.target.classList.contains('picker')) close(); };
  ov.querySelectorAll('.picker-item').forEach(b => b.onclick = () => {
    const mid = b.dataset.mid, wearer = memWearer(mid);
    if (wearer) delete SAVE.equip[wearer];
    SAVE.equip[charId] = mid;
    persist(); close();
    toast(`${MEMORIES[mid].name} equipped`);
  });
  const un = ov.querySelector('.unequip');
  if (un) un.onclick = () => { delete SAVE.equip[charId]; persist(); close(); };
}

// ---------- Team ----------
// View mode: the selected preset's members as framed cards, with presets.
// Edit mode: slot cards on top (tap to select, drag to swap), a role check,
// and a filterable roster below (tap or drag members into slots).
// Opened from the stage list, or before a fight (teamStage set) with Start Battle.
let teamView = 0;          // preset being viewed
let teamMode = 'view';
let teamDraft = null;      // members being edited
let teamStage = null;      // stage waiting to start, when opened before a fight
let editSlot = null;       // slot selected in edit mode
let rosterFilter = 'all';
let rosterSort = 'lvl';

function openTeam(stage = null) {
  teamStage = stage;
  teamView = SAVE.teamIdx;
  teamMode = 'view';
  show('team');
}

// Rough team strength shown while editing.
const memberPower = id => { const s = charStats(id); return Math.round(s.hp / 4 + s.atk * 3 + s.def * 2 + s.spd); };
const teamPower = members => members.filter(Boolean).reduce((a, id) => a + memberPower(id), 0);

// Tall framed portrait card for each slot, plus a Collab card at the end (view mode).
function teamCards(members, editing) {
  const weakSet = teamStage ? stageWeak(teamStage) : [];
  const cards = members.map((id, i) => {
    const sel = editing && editSlot === i ? 'sel' : '';
    if (!id) return `<button class="tc empty ${sel}" data-slot="${i}" style="animation-delay:${i * 70}ms">
      <span class="tc-slot">0${i + 1}</span><span class="tc-pos ${i ? '' : 'lead'}">${i ? 'SUPPORT' : 'LEADER'}</span><div class="tc-plus">${ic('plus')}</div><div class="tc-empty-label">${editing ? (sel ? 'Pick a member below' : 'Tap to select') : 'Add member'}</div></button>`;
    const c = CHARACTERS[id], own = SAVE.chars[id], mid = SAVE.equip[id];
    const art = `background-image:url('${ART[id].url}');background-size:auto 128%;background-position:${c.face[0] * 100}% 0%`;
    return `<button class="tc r${c.rarity} ${sel}" data-slot="${i}" ${editing ? 'draggable="true"' : ''} style="--c:${c.color};animation-delay:${i * 70}ms">
      <div class="tc-art" style="${art}"></div>
      <span class="tc-slot">0${i + 1}</span><span class="tc-pos ${i ? '' : 'lead'}">${i ? 'SUPPORT' : 'LEADER'}</span>
      ${mid ? `<div class="tc-mem" title="${MEMORIES[mid].name}">${memCardInner(mid)}</div>` : ''}
      ${editing ? `<span class="tc-x" data-x="${i}" title="Remove">${ic('close')}</span>` : ''}
      <span class="tc-el">${elIc(c.element)}</span>
      ${weakSet.includes(c.element) ? '<span class="tc-weak">WEAK HIT</span>' : ''}
      <div class="tc-info">
        <div class="tc-emblem"><span>${ROLE_ICON[c.role]}</span></div>
        <div class="tc-stars">${stars(c.rarity)}${own.bond ? `<small>${own.bond >= MAX_DUPES ? 'MAX' : own.bond}</small>` : ''}</div>
        <div class="tc-lv">Lv.${own.lvl}</div>
        <div class="tc-name">${c.short}</div>
        <div class="tc-role">${c.role.toUpperCase()}</div>
      </div>
    </button>`;
  });
  if (!editing) {
    const n = members.filter(Boolean).length;
    cards.push(`<div class="tc collab" style="animation-delay:${TEAM_SIZE * 70}ms">
      <div class="tc-collab-faces">${members.filter(Boolean).map(id => `<div class="face" style="${faceStyle(id)}"></div>`).join('')}</div>
      <div class="tc-info"><div class="tc-emblem"><span>${ic('collab')}</span></div><div class="tc-lv">${n}/${TEAM_SIZE} members</div>
        <div class="tc-name">SQUAD</div><div class="tc-role">THE LEADER FIGHTS · SUPPORTS JUMP IN AND ADD 10% OF THEIR STATS</div></div></div>`);
  }
  return cards.join('');
}

// Role check chips: does the team have a Tank, a Support and DPS?
function roleCheck(members) {
  const roles = members.filter(Boolean).map(id => CHARACTERS[id].role);
  const n = r => roles.filter(x => x === r).length;
  return [['Tank', n('Tank') >= 1], ['Support', n('Support') >= 1], [`DPS ×${n('DPS')}`, n('DPS') >= 1]]
    .map(([label, ok]) => `<span class="role-chip ${ok ? 'ok' : 'miss'}">${ic(ok ? 'check' : 'close')} ${label}</span>`).join('');
}

// Balanced auto-fill: the strongest DPS leads, then the best Support and Tank.
// Before a fight, members who hit the stage's weaknesses count for more.
function autoFill() {
  const weak = teamStage ? stageWeak(teamStage) : [];
  const score = id => memberPower(id) * (weak.includes(CHARACTERS[id].element) ? 1.35 : 1);
  const byLvl = Object.keys(SAVE.chars).sort((a, b) => score(b) - score(a));
  const pickRole = r => byLvl.find(id => CHARACTERS[id].role === r && !out.includes(id));
  const out = [];
  [pickRole('DPS'), pickRole('Support'), pickRole('Tank')].forEach(id => id && out.length < TEAM_SIZE && out.push(id));
  byLvl.forEach(id => out.length < TEAM_SIZE && !out.includes(id) && out.push(id));
  while (out.length < TEAM_SIZE) out.push(null);
  return out;
}

// Put a member into a slot, swapping if they're already elsewhere in the team.
function placeMember(id, slot) {
  const from = teamDraft.indexOf(id);
  if (from === slot) return;
  if (from >= 0) teamDraft[from] = teamDraft[slot];
  teamDraft[slot] = id;
}

RENDER.team = () => {
  const preset = SAVE.teams[teamView];
  const editing = teamMode === 'edit';
  const members = editing ? teamDraft : preset.members;
  const st = teamStage;
  const filled = members.filter(Boolean);
  const teamLv = filled.length ? Math.round(filled.reduce((a, id) => a + SAVE.chars[id].lvl, 0) / filled.length) : 0;
  const roster = Object.keys(SAVE.chars)
    .filter(id => rosterFilter === 'all' || CHARACTERS[id].role === rosterFilter)
    .sort((a, b) => rosterSort === 'lvl'
      ? SAVE.chars[b].lvl - SAVE.chars[a].lvl || CHARACTERS[b].rarity - CHARACTERS[a].rarity
      : CHARACTERS[b].rarity - CHARACTERS[a].rarity || SAVE.chars[b].lvl - SAVE.chars[a].lvl);
  $('#team').innerHTML = `
    <div class="tm ${editing ? 'editing' : ''}">
      <div class="tm-bg"><div class="tm-num">0${teamView + 1}</div></div>
      <div class="topbar">
        <button class="back tm-back">${ic('back')}<span>${editing ? 'Cancel' : 'Back'}</span></button>
        <div class="title">${editing ? `Edit Team · ${preset.name}` : st ? 'Prepare for Battle' : 'Team'}</div>
        ${curHtml()}
      </div>
      ${st && !editing ? `<div class="tm-stage ${st.boss ? 'boss' : ''}">
        <em>${st.boss ? 'BOSS · ' : ''}${st.tower ? 'STREAM TOWER' : `STAGE ${st.id}`}</em><b>${st.name}</b>
        <span>Enemy Lv ${st.level} · Recommended Lv ${recLevel(st.level)} ·
          <span class="${teamLv < recLevel(st.level) ? 'warn' : 'ok'}">Your team Lv ${teamLv}</span></span>
        <div class="tm-weak"><small>WEAK TO</small>${stageWeak(st).map(w => elIc(w)).join('')}
          <small class="tm-hits">${filled.filter(id => stageWeak(st).includes(CHARACTERS[id].element)).length}/${filled.length} members hit a weakness</small></div>
      </div>` : ''}
      <div class="tm-cards">${teamCards(members, editing)}</div>
      ${!editing ? `<div class="studio-prep"><button class="studio-training-open">${ic('plus')} Train squad</button><button class="studio-plan-open">${ic('team')} ${SpoDesign.plan(st && !SpoDesign.allowedFor(st) ? 'balanced' : preset.plan).name} plan</button></div>` : ''}
      ${editing ? `
      <div class="tm-checkbar">
        <div class="tm-roles">${roleCheck(members)}</div>
        <div class="tm-power"><small>TEAM POWER</small><b>${teamPower(members).toLocaleString()}</b></div>
        <div class="tm-avg"><small>AVG LV</small><b>${teamLv}</b></div>
      </div>
      <div class="tm-roster">
        <div class="tm-roster-head">
          <div class="seg">${[['all', 'All'], ['DPS', ic('dps') + ' DPS'], ['Tank', ic('tank') + ' Tank'], ['Support', ic('support') + ' Support']].map(([v, l]) =>
            `<button class="${rosterFilter === v ? 'sel' : ''}" data-filter="${v}">${l}</button>`).join('')}</div>
          <button class="pill dark sort">Sort: ${rosterSort === 'lvl' ? 'Level' : 'Rarity'} ${ic('sort')}</button>
          <span class="tm-hint">${editSlot !== null ? `Slot 0${editSlot + 1} selected · tap a member` : 'Tap a member to add · drag onto a slot · drag a slot here to remove'}</span>
        </div>
        <div class="tm-strip">${roster.map(id => {
          const c = CHARACTERS[id], slot = teamDraft.indexOf(id);
          const hits = st && stageWeak(st).includes(c.element);
          return `<button class="tm-card r${c.rarity} ${slot >= 0 ? 'in' : ''} ${hits ? 'hits' : ''}" data-id="${id}" draggable="true" style="--c:${c.color}">
            <div class="tm-card-art" style="${bustStyle(id, 3 / 4)}"></div>
            <span class="tm-card-role">${ROLE_ICON[c.role]}</span>
            <span class="tm-card-el">${elIc(c.element)}</span>
            ${slot >= 0 ? `<span class="tm-card-slot">${slot + 1}</span>` : ''}
            <span class="tm-card-lv"><small>Lv.</small>${SAVE.chars[id].lvl}</span>
            <span class="tm-card-name">${c.short}</span>
          </button>`;
        }).join('') || '<p class="hint-inline">No members with this role yet.</p>'}</div>
      </div>
      <div class="tm-actions">
        <button class="pill dark autofill">Auto-fill</button>
        <button class="pill dark clear">Clear</button>
        <button class="pill yellow save">Save Team ${ic('check')}</button>
      </div>`
      : `<div class="tm-presets">
          <div class="tm-name"><span>${ic('edit')}</span><input class="tm-name-input" maxlength="16" value="${preset.name.replace(/"/g, '&quot;')}"></div>
          <div class="tm-tabs">${SAVE.teams.map((t, i) => `<button class="${i === teamView ? 'sel' : ''} ${i === SAVE.teamIdx ? 'active' : ''}" data-p="${i}">0${i + 1}</button>`).join('')}</div>
        </div>
        <div class="tm-actions">
          ${st ? `<button class="pill dark recommend" title="Edit this team with the best picks for this stage">${ic('spark')} Recommend</button>` : ''}
          <button class="pill light edit">${ic('edit')} Edit Team</button>
          ${st ? `<button class="pill yellow start" ${preset.members.some(Boolean) ? '' : 'disabled'}>Start Battle ${ic('play')}</button>`
               : `<button class="pill ${teamView === SAVE.teamIdx ? 'dark' : 'blue'} deploy" ${teamView === SAVE.teamIdx || !preset.members.some(Boolean) ? 'disabled' : ''}>
                    ${teamView === SAVE.teamIdx ? 'Deployed ' + ic('check') : 'Deploy'}</button>`}
        </div>`}
    </div>`;

  $('#team .tm-back').onclick = () => {
    if (editing) { teamMode = 'view'; editSlot = null; RENDER.team(); return; }
    teamStage = null;
    if (st && st.hub) { liveTab = st.hub; return show('live'); }
    show(st && st.tower ? 'tower' : 'stages');
  };
  if (editing) { bindTeamEdit(); return; }

  document.querySelectorAll('#team .tm-tabs button').forEach(b => b.onclick = () => { teamView = Number(b.dataset.p); RENDER.team(); });
  const nameInput = $('#team .tm-name-input');
  nameInput.onchange = () => {
    SAVE.teams[teamView].name = nameInput.value.trim() || `Team ${teamView + 1}`;
    persist();
  };
  nameInput.onkeydown = e => { if (e.key === 'Enter') nameInput.blur(); };
  const startEdit = slot => {
    teamDraft = SAVE.teams[teamView].members.slice();
    teamMode = 'edit';
    editSlot = typeof slot === 'number' ? slot : teamDraft.indexOf(null) >= 0 ? teamDraft.indexOf(null) : null;
    RENDER.team();
  };
  $('#team .edit').onclick = () => startEdit();
  $('#team .studio-training-open').onclick = () => SpoDesign.openTraining(members, st ? recLevel(st.level) : null, () => RENDER.team());
  $('#team .studio-plan-open').onclick = () => SpoDesign.openPlans(teamView, st, () => RENDER.team());
  const rec = $('#team .recommend');
  if (rec) rec.onclick = () => {
    startEdit();
    teamDraft = autoFill(); editSlot = null; RENDER.team();
    toast('Recommended team for this stage. Save to keep it');
  };
  document.querySelectorAll('#team .tc[data-slot]').forEach(b => b.onclick = () => startEdit(Number(b.dataset.slot)));
  const dep = $('#team .deploy');
  if (dep) dep.onclick = () => { SAVE.teamIdx = teamView; syncTeam(); persist(); RENDER.team(); toast(`${preset.name} deployed`); };
  const start = $('#team .start');
  if (start) start.onclick = () => {
    SAVE.teamIdx = teamView; syncTeam(); persist();
    const stage = teamStage;
    teamStage = null;
    startBattle(stage);
  };
};

function bindTeamEdit() {
  const rerender = () => RENDER.team();
  // Slots: tap to select (tap again to deselect), ✕ removes.
  document.querySelectorAll('#team .tc[data-slot]').forEach(b => {
    const slot = Number(b.dataset.slot);
    b.onclick = e => {
      if (e.target.closest('.tc-x')) { teamDraft[slot] = null; editSlot = slot; return rerender(); }
      editSlot = editSlot === slot ? null : slot;
      rerender();
    };
    // Drag a slot card onto another slot to swap them.
    b.ondragstart = e => e.dataTransfer.setData('text/plain', `slot:${slot}`);
    b.ondragover = e => { e.preventDefault(); b.classList.add('drop'); };
    b.ondragleave = () => b.classList.remove('drop');
    b.ondrop = e => {
      e.preventDefault();
      const [kind, val] = e.dataTransfer.getData('text/plain').split(':');
      if (kind === 'slot') { const from = Number(val); [teamDraft[from], teamDraft[slot]] = [teamDraft[slot], teamDraft[from]]; }
      if (kind === 'id') placeMember(val, slot);
      editSlot = null;
      rerender();
    };
  });
  // Roster: tap to place into the selected slot (or first empty), tap a member in the team to remove.
  document.querySelectorAll('#team .tm-card').forEach(b => {
    const id = b.dataset.id;
    b.onclick = () => {
      if (editSlot !== null) {
        placeMember(id, editSlot);
        const next = teamDraft.indexOf(null);
        editSlot = next >= 0 ? next : null;
      } else if (teamDraft.includes(id)) {
        teamDraft[teamDraft.indexOf(id)] = null;
      } else {
        const free = teamDraft.indexOf(null);
        if (free < 0) return toast('Team is full. Select a slot to replace someone');
        teamDraft[free] = id;
      }
      rerender();
    };
    b.ondragstart = e => e.dataTransfer.setData('text/plain', `id:${id}`);
  });
  // Dropping a slot card on the roster removes that member.
  const strip = $('#team .tm-roster');
  strip.ondragover = e => e.preventDefault();
  strip.ondrop = e => {
    const [kind, val] = e.dataTransfer.getData('text/plain').split(':');
    if (kind === 'slot') { teamDraft[Number(val)] = null; rerender(); }
  };
  document.querySelectorAll('#team [data-filter]').forEach(b => b.onclick = () => { rosterFilter = b.dataset.filter; rerender(); });
  $('#team .sort').onclick = () => { rosterSort = rosterSort === 'lvl' ? 'rarity' : 'lvl'; rerender(); };
  $('#team .autofill').onclick = () => { teamDraft = autoFill(); editSlot = null; rerender(); toast(teamStage ? 'Filled with a balanced team that hits this stage\'s weaknesses' : 'Filled with your strongest balanced team'); };
  $('#team .clear').onclick = () => { teamDraft = Array(TEAM_SIZE).fill(null); editSlot = 0; rerender(); };
  $('#team .save').onclick = () => {
    if (!teamDraft.some(Boolean)) return toast('A team needs at least one member');
    SAVE.teams[teamView].members = teamDraft.slice();
    if (teamView === SAVE.teamIdx) syncTeam();
    persist();
    teamMode = 'view'; editSlot = null;
    RENDER.team();
    toast(`${SAVE.teams[teamView].name} saved`);
  };
}

// ---------- Stages ----------
let stagesChapter = null;
const stageUnlocked = i => i === 0 || !!SAVE.cleared[STAGES[i - 1].id];
const chapterUnlocked = ch => stageUnlocked(STAGES.findIndex(s => s.chapter === ch.id));
// The chapter of the furthest stage the player can play.
const currentChapter = () => {
  const i = STAGES.reduce((acc, st, j) => stageUnlocked(j) ? j : acc, 0);
  return CHAPTERS.find(c => c.id === STAGES[i].chapter);
};
const starCount = id => (SAVE.stars[id] || []).filter(Boolean).length;

function enemyFace(id) {
  return ART[id] ? `<div class="stage-boss" style="${faceStyle(id)}"></div>`
                 : foeChip(id, ENEMIES[id].hue, 'stage-boss');
}

let stagesSel = null;   // stage id selected on the chapter map

// Node positions on the chapter map (percent of the map area): a winding path.
const MAP_NODES = [[8, 68], [23, 36], [38, 64], [53, 34], [68, 62], [86, 38]];

// Elements a stage's enemies are weak to, most common first.
function stageWeak(st) {
  const count = {};
  st.waves.flat().forEach(k => (ENEMIES[k].weak || []).forEach(w => { count[w] = (count[w] || 0) + 1; }));
  return Object.keys(count).sort((a, b) => count[b] - count[a]);
}

const teamAvgLv = () => {
  const team = SAVE.team.filter(Boolean);
  return Math.round(team.reduce((a, t) => a + SAVE.chars[t].lvl, 0) / Math.max(1, team.length));
};

function stagePanel(st, i) {
  const locked = !stageUnlocked(i), cleared = !!SAVE.cleared[st.id], stars = SAVE.stars[st.id] || [];
  const foes = [...new Set(st.waves.flat())], weak = stageWeak(st), story = STORY[st.id];
  const rec = recLevel(st.level), teamLv = teamAvgLv();
  const good = Object.keys(SAVE.chars).filter(id => weak.includes(CHARACTERS[id].element));
  return `<aside class="spanel ${st.boss ? 'boss' : ''}">
    <em>${st.boss ? 'BOSS STAGE' : 'STAGE'} ${st.id}${story ? ` · ${ic('story')} STORY` : ''}</em>
    <h3>${st.name}</h3>
    <div class="sp-meta"><span>Enemy Lv ${st.level}</span><span class="${teamLv < rec ? 'warn' : 'ok'}">Rec. Lv ${rec} · your team ${teamLv}</span>
      <span>${st.waves.length} wave${st.waves.length > 1 ? 's' : ''}</span></div>
    <div class="studio-readiness"><small>SQUAD READINESS</small>${SpoDesign.readiness(st, SAVE.team).map(r => `<div class="${r.ok ? 'ready' : ''}"><b>${r.ok ? '✓' : '○'}</b>${r.text}</div>`).join('')}<button class="sp-train">Review squad training →</button></div>
    <div class="sp-sec">Enemies</div>
    <div class="sp-foes">${foes.map(k => `<div class="sp-foe ${ENEMIES[k].boss ? 'boss' : ''}" title="${ENEMIES[k].desc}">${enemyFace(k)}<div><b>${ENEMIES[k].name}</b><span>${weakIcons(k)}</span></div></div>`).join('')}</div>
    <div class="sp-sec">Weak to</div>
    <div class="sp-weak">${weak.map(w => `<span>${elIc(w)}${ELEMENTS[w].name}</span>`).join('')}</div>
    ${good.length ? `<div class="sp-good"><small>Good picks</small>${good.map(id => `<span class="face" style="${faceStyle(id)}" title="${CHARACTERS[id].short}"></span>`).join('')}</div>` : ''}
    ${Object.values(SpoDesign.plans).filter(p => p.unlock === st.id).map(p => `<div class="studio-unlock"><small>${cleared ? 'TACTIC UNLOCKED' : 'STORY MILESTONE'}</small><b>${p.name}</b><span>${p.desc}</span></div>`).join('')}
    <div class="sp-sec">Objectives</div>
    <div class="sp-obj">${stageObjectives(st).map((t, k) => `<div class="${stars[k] ? 'on' : ''}">${ic('star')}<span>${t}</span></div>`).join('')}</div>
    <div class="sp-sec">${cleared ? 'Replay rewards' : 'First clear'}</div>
    <div class="sp-rew">${cleared ? `${amt('gem', Math.round(st.reward.gems * REPLAY_REWARD))} ${amt('token', Math.round(st.reward.exp * REPLAY_EXP))}`
      : `${amt('gem', st.reward.gems)} ${amt('token', st.reward.exp)}<small>+${STAR_GEMS} gems per new star</small>`}</div>
    <div class="sp-btns">
      ${story && SAVE.seen[st.id] ? `<button class="pill dark sp-story">${ic('story')} Story</button>` : ''}
      ${stars.length && stars.every(Boolean) ? `<button class="pill dark sp-sweep" title="Collect replay rewards instantly">${ic('bolt')} Sweep</button>` : ''}
      <button class="pill yellow sp-start" ${locked ? 'disabled' : ''}>${locked ? 'Locked' : `${cleared ? 'Replay' : 'Start'} ${ic('play')}`}</button>
    </div>
  </aside>`;
}

RENDER.stages = () => {
  if (stagesChapter === null) stagesChapter = currentChapter().id;
  const ch = CHAPTERS.find(c => c.id === stagesChapter);
  const list = STAGES.map((st, i) => ({ st, i })).filter(o => o.st.chapter === ch.id);
  const got = list.reduce((a, o) => a + starCount(o.st.id), 0);
  const team = SAVE.team.filter(Boolean);
  const next = list.find(o => stageUnlocked(o.i) && !SAVE.cleared[o.st.id]);
  // Default selection: the next stage to play in this chapter (or the last open one).
  if (!stagesSel || !list.some(o => o.st.id === stagesSel)) stagesSel = (next || list.filter(o => stageUnlocked(o.i)).pop() || list[0]).st.id;
  const sel = list.find(o => o.st.id === stagesSel);
  const pts = list.map((o, k) => MAP_NODES[k] || [10 + k * 15, 50]);
  const path = n => pts.slice(0, n).map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ');
  // The gold path runs up to the next stage to play (all of it once the chapter is cleared).
  const reach = next ? list.indexOf(next) : list.length - 1;
  $('#stages').innerHTML = `
    ${topbar('Story', 'lobby', 'elements')}
    <div class="smap">
      <div class="smap-bg" style="background-image:url('assets/environment/${ch.id === 1 ? 'seaside-promenade' : 'evening-lane'}.jpg')"></div>
      <div class="smap-head">
        <div class="ch-tabs">${CHAPTERS.map(c => `<button class="ch-tab ${c.id === ch.id ? 'sel' : ''}" data-ch="${c.id}" ${chapterUnlocked(c) ? '' : 'disabled'}>
          Chapter ${c.id}<small>${chapterUnlocked(c) ? c.name : 'Locked'}</small></button>`).join('')}</div>
        <div class="smap-title"><em>CHAPTER ${ch.id}</em><h2>${ch.name}</h2><p>${ch.desc}</p>
          <span class="smap-stars">${ic('star')} ${got}/${list.length * 3}<small>${list.filter(o => SAVE.cleared[o.st.id]).length} of ${list.length} encounters cleared</small></span></div>
      </div>
      <div class="smap-area">
        <svg class="smap-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path class="base" d="${path(pts.length)}"/><path class="done" d="${path(reach + 1)}"/></svg>
        ${list.map((o, k) => {
          const locked = !stageUnlocked(o.i), cleared = !!SAVE.cleared[o.st.id], stars = SAVE.stars[o.st.id] || [];
          const bossId = o.st.waves.flat().find(e => ENEMIES[e].boss);
          return `<button class="snode ${o.st.boss ? 'boss' : ''} ${locked ? 'locked' : ''} ${cleared ? 'cleared' : ''} ${o.st.id === stagesSel ? 'sel' : ''} ${next && o.st.id === next.st.id ? 'next' : ''}"
            data-id="${o.st.id}" style="--node-x:${pts[k][0]}%;--node-y:${pts[k][1]}%" ${locked ? 'disabled' : ''}>
            <span class="snode-core">${bossId ? enemyFace(bossId) : `<b>${o.st.id.split('-')[1]}</b>`}${locked ? `<i class="snode-lock">${ic('lock')}</i>` : ''}</span>
            ${next && o.st.id === next.st.id ? '<span class="snode-flag">NEXT</span>' : ''}
            <span class="snode-stars">${[0, 1, 2].map(s => `<i class="${stars[s] ? 'on' : ''}">${ic('star')}</i>`).join('')}</span>
            <span class="snode-name"><small>${o.st.boss ? 'BOSS' : 'ENCOUNTER'} ${o.st.id}</small><b>${o.st.name}</b><em>${locked ? 'Complete the previous encounter' : cleared ? 'Replay available' : 'Ready to begin'}</em></span>
          </button>`;
        }).join('')}
      </div>
      <div class="smap-team">${team.map(id => `<div class="face" style="${faceStyle(id)}" title="${CHARACTERS[id].short}"></div>`).join('')}
        <span>Avg Lv ${teamAvgLv()}</span><button class="btn small open-team">${ic('team')} Teams</button></div>
      ${stagePanel(sel.st, sel.i)}
    </div>`;
  const st = sel.st;
  $('#stages .open-team').onclick = () => openTeam();
  document.querySelectorAll('#stages .ch-tab').forEach(b => b.onclick = () => { stagesChapter = Number(b.dataset.ch); stagesSel = null; RENDER.stages(); });
  document.querySelectorAll('#stages .snode').forEach(b => b.onclick = () => { stagesSel = b.dataset.id; sfx('select'); RENDER.stages(); });
  $('#stages .sp-start').onclick = () => startStage(st);
  $('#stages .sp-train').onclick = () => SpoDesign.openTraining(SAVE.team, recLevel(st.level), () => RENDER.stages());
  // Sweep: 3-star stages can be cleared instantly for their replay rewards.
  const sweep = $('#stages .sp-sweep');
  if (sweep) sweep.onclick = () => {
    const gems = Math.round(st.reward.gems * REPLAY_REWARD), exp = Math.round(st.reward.exp * REPLAY_EXP);
    SAVE.gems += gems; SAVE.exp += exp;
    const xp = 20 + st.level * 15, ranks = addPlayerXp(xp);
    bumpDaily('farm'); bumpDaily('wins');
    SAVE.stats.battles++;
    persist();
    RENDER.stages();
    showRewards([{ kind: 'gem', n: gems }, { kind: 'token', n: exp }, { kind: 'xp', n: xp }, ranks && { kind: 'gem', n: ranks * RANK_UP_GEMS, name: `Rank ${SAVE.player.rank} bonus` }],
      { title: 'Sweep Complete', sub: `${st.id} · ${st.name.toUpperCase()}${ranks ? ` · RANK UP ${SAVE.player.rank}` : ''}` });
  };
  const replay = $('#stages .sp-story');
  if (replay) replay.onclick = async () => {
    const sc = STORY[st.id];
    const lines = [...(sc.before || []), ...(SAVE.seen[st.id + ':after'] ? sc.after || [] : [])];
    await playStory(lines, `${st.id} · ${st.name}`, stageBg(st));
  };
};

// Plays the stage's opening story the first time, then opens team prep.
async function startStage(stage) {
  const sc = STORY[stage.id];
  if (sc && sc.before && !SAVE.seen[stage.id]) {
    await playStory(sc.before, `${stage.id} · ${stage.name}`, stageBg(stage));
    SAVE.seen[stage.id] = true;
    persist();
  }
  openTeam(stage);
}

// The stage that follows a story stage or Tower floor (null at the end).
function nextStageOf(st) {
  if (st.tower) return st.floor < TOWER_FLOORS ? towerStage(st.floor + 1) : null;
  if (st.hub || st.tutorial) return null;
  const i = STAGES.findIndex(s => s.id === st.id);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

async function startBattle(stage) {
  const team = SAVE.team.filter(Boolean);
  show('battle');
  const enteredAt = performance.now();
  // Battles are real-time 3D: wait for three.js (and any member models) first.
  $('#battle').innerHTML = `<section class="ab-floor-loading" role="status" aria-live="polite"><div class="afl-art" style="${SpoEnvironment.storyStyle(stageBg(stage))}"></div><div class="afl-shade"></div><div class="afl-heading"><small>WATA SPO / EXPEDITION</small><h2>${stage.name}</h2><b>Floor ${stage.floor || 1} <span>/ ${stage.tower ? TOWER_FLOORS : stage.waves.length}</span></b></div><div class="afl-progress"><span>Preparing scenery and squad</span><i><em></em></i><small>Explore each passage, then enter the next floor.</small></div></section>`;
  if (!(await whenThree())) {
    toast('The 3D battle engine could not load. Check your internet connection and try again.');
    if (stage.hub) { liveTab = stage.hub; return show('live'); }
    return show(stage.tower ? 'tower' : 'stages');
  }
  await loadChibiModels();
  await SpoEnvironment.load();
  await new Promise(r => setTimeout(r, Math.max(0, 1000 - (performance.now() - enteredAt))));
  currentBattle = new ActionBattle($('#battle'), stage, team, async (reason, won) => {
    currentBattle = null;
    if (reason === 'retry') return startBattle(stage);
    if (stage.tower) {
      if (won) towerSel = null;
      if (reason === 'next' && nextStageOf(stage)) { towerSel = stage.floor + 1; return startBattle(nextStageOf(stage)); }
      return show('tower');
    }
    if (stage.hub) { liveTab = stage.hub; return show('live'); }
    const sc = STORY[stage.id];
    if (won && sc && sc.after && !SAVE.seen[stage.id + ':after']) {
      await playStory(sc.after, `${stage.id} · ${stage.name}`, stageBg(stage));
      SAVE.seen[stage.id + ':after'] = true;
      persist();
    }
    // First win of the tutorial battle: on to the free ★5 pick.
    if (won && stage.id === '1-1' && SAVE.tutorial < 3) {
      SAVE.tutorial = 2; persist();
      show('lobby');
      return openStarterPick();
    }
    // "Next" goes straight to the following stage (its story, then team prep).
    if (reason === 'next' && won && nextStageOf(stage)) return startStage(nextStageOf(stage));
    // Jump the stage list to the newly unlocked chapter.
    stagesChapter = currentChapter().id;
    stagesSel = null;
    show('stages');
  }, { plan: SAVE.teams[SAVE.teamIdx].plan || 'balanced' });
}

// ---------- Boot ----------
const LOAD_TIPS = [
  'Hit an enemy\'s weakness element to Break it much faster.',
  'A Break cancels a boss\'s charged attack. Watch for the !! warning under the boss bar.',
  'Dodge (Space) just as a red zone fills up for a Perfect Dodge and slow motion.',
  'Press 1 and 2 in battle to call your supports in for their Support Skills.',
  'Your leader attacks on her own. Stay close with melee members, keep your distance with ranged ones.',
  'Fill the Daily Activity bar in Missions to open all five chests.',
  'Bonds raise HP, ATK and DEF. Hang out with each member once a day.',
  'The Ranked Raid boss and its rules change every Monday.',
  'Every pull adds Spark. At 60 Spark, take the featured ★5 directly.',
  'Stuck? The Recommend button on team prep picks members for the stage.',
];
(async function boot() {
  $('#loading .logo').innerHTML = logoHtml();
  const tip = document.createElement('div');
  tip.className = 'load-tip';
  tip.textContent = 'TIP · ' + LOAD_TIPS[Math.floor(Math.random() * LOAD_TIPS.length)];
  $('#loading').appendChild(tip);
  await loadAllArt(p => { $('#load-bar i').style.width = (p * 100) + '%'; });
  show('lobby');
  if (SAVE_BROKEN) return toast('Your save could not be loaded, so nothing will be saved. A backup copy was kept. Reload the page, or reset in Settings to start over.');
  if (SAVE.tutorial < 3) runOnboarding();
  else if (SAVE.seenNotes !== NOTES_VERSION) openUpdateNotes();
  else if (loginReady()) openLogin();
  // Installable app (offline cache). Not available inside some embeds; that's fine.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
