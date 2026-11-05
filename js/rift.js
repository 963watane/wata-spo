// Bracket Run: a roguelite run made of action battles.
// Fight through the rounds of a bracket. After every win, pick one of three
// Boosts (each stacks to Lv 3) that change how your squad fights. Round 3 lets
// you choose an Elite fight or a rest, the pit stop sells Boosts, and the
// Final is a boss. HP carries over between rounds; a loss ends the run.

// fx: perk totals added per level (see this.perks in action.js). lead: the
// boost only appears when that member leads; any: when she is in the squad.
const BOOSTS = {
  power:    { name: 'Power Spike',      r: 1, icon: 'battle', fx: { atk: 0.12 }, desc: l => `+${12 * l}% ATK.` },
  clutch:   { name: 'Clutch Eyes',      r: 1, icon: 'eye', fx: { crit: 0.07 }, desc: l => `+${7 * l}% crit rate.` },
  headshot: { name: 'Headshot',         r: 2, icon: 'raid', fx: { critDmg: 0.25 }, desc: l => `+${25 * l}% crit damage.` },
  hydrate:  { name: 'Hydrated',         r: 1, icon: 'heart', fx: { hp: 0.15 }, desc: l => `+${15 * l}% max HP.` },
  sprint:   { name: 'Sprint',           r: 1, icon: 'bolt', fx: { speed: 0.1 }, desc: l => `+${10 * l}% move speed.` },
  rapid:    { name: 'Rapid Fire',       r: 2, icon: 'basic', fx: { aspd: 0.12 }, desc: l => `Auto-attacks are ${12 * l}% faster.` },
  hands:    { name: 'Quick Hands',      r: 2, icon: 'skill', fx: { cdr: 0.12 }, desc: l => `Skill cooldown −${12 * l}%.` },
  chat:     { name: 'Team Chat',        r: 1, icon: 'talks', fx: { supCdr: 0.15 }, desc: l => `Support Skill cooldowns −${15 * l}%.` },
  hype:     { name: 'Hype Train',       r: 1, icon: 'ult', fx: { energy: 0.25 }, desc: l => `Auto-attacks charge ${25 * l}% more Energy.` },
  bites:    { name: 'Snack Bites',      r: 2, icon: 'snack', fx: { lifesteal: 1 }, desc: l => `Auto-attacks heal you for ${2 * l}% of their damage.` },
  dash:     { name: 'Double Dash',      r: 2, icon: 'next', max: 1, fx: { dodge: 1 }, desc: () => '+1 dodge charge.' },
  after:    { name: 'Afterimage',       r: 2, icon: 'spark', fx: { dodgeNova: 1 }, desc: l => `Dodging leaves a burst that deals ${80 * l}% ATK.` },
  counter:  { name: 'Counter Play',     r: 3, icon: 'replay', fx: { perfectBlast: 1 }, desc: l => `Perfect Dodges blast nearby enemies for ${150 * l}% ATK.` },
  shatter:  { name: 'Shatter',          r: 2, icon: 'raid', fx: { breakNova: 1 }, desc: l => `Breaks explode for ${120 * l}% ATK around the target.` },
  breath:   { name: 'Second Breath',    r: 1, icon: 'heart', fx: { breakHeal: 1 }, desc: l => `Every Break heals you ${4 * l}% max HP.` },
  feed:     { name: 'Kill Feed',        r: 1, icon: 'heart', fx: { killHeal: 1 }, desc: l => `Every kill heals you ${2 * l}% max HP.` },
  chain:    { name: 'Chain Lightning',  r: 3, icon: 'bolt', fx: { critChain: 1 }, desc: l => `Crits arc to another enemy for ${50 * l}% ATK.` },
  hottake:  { name: 'Hot Take',         r: 2, icon: 'flame', fx: { burnHit: 1 }, desc: l => `Hits have a ${20 * l}% chance to Burn.` },
  barrier:  { name: 'Barrier Cast',     r: 1, icon: 'tank', fx: { skillShield: 1 }, desc: l => `Using your Skill grants a shield of ${6 * l}% max HP.` },
  encore:   { name: 'Encore',           r: 2, icon: 'music', fx: { ultHeal: 1 }, desc: l => `Your Ultimate heals ${10 * l}% max HP.` },
  double:   { name: 'Double Feature',   r: 3, icon: 'collab', max: 1, fx: { supEcho: 1 }, desc: () => 'Support Skills go off twice.' },
  wind:     { name: 'Second Wind',      r: 3, icon: 'heart', max: 1, fx: { revive: 1 }, desc: () => 'Once per run, get back up at 40% HP instead of losing.' },
  slayer:   { name: 'Giant Slayer',     r: 2, icon: 'trophy', fx: { bossDmg: 0.15 }, desc: l => `+${15 * l}% damage to bosses.` },
  pressure: { name: 'Pressure',         r: 1, icon: 'raid', fx: { stagger: 0.2 }, desc: l => `+${20 * l}% Stagger.` },
  exploit:  { name: 'Exploit',          r: 1, icon: 'aim', fx: { weakDmg: 0.1 }, desc: l => `+${10 * l}% weakness damage.` },
  skin:     { name: 'Thick Skin',       r: 1, icon: 'tank', fx: { dr: 0.07 }, desc: l => `Take ${7 * l}% less damage.` },
  pregame:  { name: 'Pregame',          r: 1, icon: 'timer', fx: { startEnergy: 25 }, desc: l => `Start each round with +${25 * l} Energy.` },
  combo:    { name: 'Combo Starter',    r: 1, icon: 'basic', fx: { basicDmg: 0.15 }, desc: l => `Auto-attacks deal +${15 * l}% damage.` },
  sig:      { name: 'Signature Move',   r: 2, icon: 'skill', fx: { skillDmg: 0.2 }, desc: l => `Your Skill deals +${20 * l}% damage.` },
  assist:   { name: 'Assist King',      r: 2, icon: 'collab', fx: { supDmg: 0.25 }, desc: l => `Support Skills deal +${25 * l}% damage.` },
  main:     { name: 'Main Character',   r: 2, icon: 'ult', fx: { ultDmg: 0.25 }, desc: l => `Your Ultimate deals +${25 * l}% damage.` },
  drops:    { name: 'Snack Drops',      r: 1, icon: 'cake', fx: { hearts: 0.08 }, desc: l => `Enemies drop healing snacks ${8 * l}% more often.` },
  comfort:  { name: 'Comfort Food',     r: 1, icon: 'heart', fx: { healBoost: 0.2 }, desc: l => `+${20 * l}% healing.` },
  reinf:    { name: 'Reinforced',       r: 1, icon: 'tank', fx: { shieldBoost: 0.25 }, desc: l => `+${25 * l}% shields.` },
  reach:    { name: 'Long Reach',       r: 1, icon: 'aim', fx: { range: 0.5 }, desc: l => `Auto-attacks reach further (+${l * 0.5} m melee, +${l * 0.75} m ranged).` },
  kick:     { name: 'Kick While Down',  r: 2, icon: 'battle', fx: { brokenDmg: 0.15 }, desc: l => `+${15 * l}% damage to Broken enemies.` },
  // Member Boosts
  sunburst: { name: 'Sunburst',         r: 2, icon: 'sun', lead: 'sendo', fx: { skillDmg: 0.35 }, desc: l => `Sendo's Cheer Up! deals +${35 * l}% damage.` },
  sunset:   { name: 'Sunset Encore',    r: 1, icon: 'sun', any: 'sendo', fx: { supCdr: 0.2 }, desc: l => `With Sendo in the squad: Support cooldowns −${20 * l}%.` },
  sugar:    { name: 'Sugar Coating',    r: 1, icon: 'candy', any: 'hinano', fx: { shieldBoost: 0.35 }, desc: l => `With Hinano in the squad: +${35 * l}% shields.` },
  crush:    { name: 'Candy Crush',      r: 2, icon: 'candy', lead: 'hinano', fx: { skillDmg: 0.35 }, desc: l => `Hinano's Sweet Barrier deals +${35 * l}% damage.` },
  swarm:    { name: 'Bat Swarm',        r: 2, icon: 'night', lead: 'noah', fx: { basicDmg: 0.25 }, desc: l => `Noah's sabre combo deals +${25 * l}% damage.` },
  finale:   { name: 'Midnight Encore',  r: 3, icon: 'night', lead: 'noah', fx: { ultDmg: 0.4 }, desc: l => `Midnight Finale deals +${40 * l}% damage.` },
  master:   { name: 'Masterpiece',      r: 2, icon: 'paint', lead: 'tsuna', fx: { skillDmg: 0.35 }, desc: l => `Tsuna's Paint Splash deals +${35 * l}% damage.` },
  splash:   { name: 'Splash Zone',      r: 1, icon: 'paint', any: 'tsuna', fx: { supDmg: 0.35 }, desc: l => `With Tsuna in the squad: Support Skills deal +${35 * l}% damage.` },
  steady:   { name: 'Steady Aim',       r: 2, icon: 'aim', lead: 'uruha', fx: { crit: 0.12 }, desc: l => `Uruha gains +${12 * l}% crit rate.` },
  callout:  { name: 'Callout',          r: 1, icon: 'aim', any: 'uruha', fx: { stagger: 0.3 }, desc: l => `With Uruha in the squad: +${30 * l}% Stagger.` },
  helping:  { name: 'Second Helping',   r: 1, icon: 'snack', any: 'lisa', fx: { healBoost: 0.35 }, desc: l => `With Lisa in the squad: +${35 * l}% healing.` },
  foodfight:{ name: 'Food Fight',       r: 2, icon: 'snack', lead: 'lisa', fx: { basicDmg: 0.25 }, desc: l => `Lisa's donut throws deal +${25 * l}% damage.` },
};
const BOOST_RARITY = { 1: { name: 'Common', color: '#5fb8ff' }, 2: { name: 'Rare', color: '#b07dff' }, 3: { name: 'Epic', color: '#ffc93a' } };
const RUN_NODES = ['fight', 'fight', 'choice', 'fight', 'shop', 'fight', 'final'];
const RUN_NODE_INFO = {
  fight: { icon: 'battle', name: 'Round' }, elite: { icon: 'flame', name: 'Elite' }, rest: { icon: 'heart', name: 'Rest' },
  choice: { icon: 'map', name: 'Crossroads' }, shop: { icon: 'shop', name: 'Pit Stop' }, final: { icon: 'trophy', name: 'Final' },
};
const RUN_REWARD_RUNS = 3;          // runs per day that pay gems
const RUN_THEMES = ['street-day', 'city-day', 'sunset-street', 'alley', 'rooftop'];
const RUN_POOL = ['grunt', 'sniper', 'spammer', 'firewall', 'desync', 'troll', 'clipper', 'echo'];

const closeModal = () => { const ov = $('#pull'); ov.className = 'overlay'; ov.innerHTML = ''; };

function runState() {
  if (!SAVE.runs) SAVE.runs = { best: 0, clears: 0, today: { date: null, n: 0 }, log: [] };
  return SAVE.runs;
}
// Enemy level that matches the squad (the inverse of recLevel).
const runLevelFor = team => {
  const avg = team.reduce((a, id) => a + SAVE.chars[id].lvl, 0) / Math.max(1, team.length);
  return Math.max(1, Math.round((avg - 1) / 2.4) + 1);
};
function runPerks(run) {
  const P = {};
  Object.entries(run.picks).forEach(([id, lvl]) => Object.entries(BOOSTS[id].fx).forEach(([k, v]) => { P[k] = (P[k] || 0) + v * lvl; }));
  return P;
}

// Three Boosts to choose from. minR raises the rarity floor (elite rounds, shop).
function rollBoosts(run, n = 3, minR = 1) {
  const team = run.team, lead = team[0];
  const ok = Object.keys(BOOSTS).filter(id => {
    const b = BOOSTS[id], lvl = run.picks[id] || 0;
    if (lvl >= (b.max || 3)) return false;
    if (b.lead && b.lead !== lead) return false;
    if (b.any && !team.includes(b.any)) return false;
    return b.r >= minR || lvl > 0;
  });
  const weight = id => { const b = BOOSTS[id]; return (b.r === 1 ? 6 : b.r === 2 ? 3 : 1.2) * (b.lead || b.any ? 1.8 : 1) * (run.picks[id] ? 1.6 : 1); };
  const out = [];
  while (out.length < n && ok.length) {
    const total = ok.reduce((a, id) => a + weight(id), 0);
    let x = Math.random() * total, i = 0;
    while (i < ok.length - 1 && (x -= weight(ok[i])) > 0) i++;
    out.push(ok.splice(i, 1)[0]);
  }
  return out;
}

function newRun() {
  const team = SAVE.team.filter(Boolean);
  const day = todayStr(), rs = runState();
  if (rs.today.date !== day) rs.today = { date: day, n: 0 };
  return { team, level: runLevelFor(team), node: 0, path: RUN_NODES.slice(), hp: 1, picks: {}, coins: 0, kills: 0, started: Date.now(), reviveUsed: false };
}

// The fight for a round: a few groups that get bigger as the run goes on.
function runStage(run, idx, kind) {
  let seed = (run.started % 100000) + idx * 7919;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pool = RUN_POOL.slice(0, Math.min(RUN_POOL.length, 3 + idx + Math.floor(run.level / 4)));
  const group = n => Array.from({ length: n }, () => pool[Math.floor(rnd() * pool.length)]);
  const L = run.level + Math.floor(idx / 2);
  const bosses = ['phantom', 'core', 'algorithm'];
  const waves = kind === 'final' ? [group(2), [bosses[Math.floor(rnd() * 3)]]]
              : kind === 'elite' ? [group(3), group(3)]
              : idx < 2 ? [group(2), group(2)] : [group(2), group(3)];
  return { id: 'RUN', run: true, name: kind === 'final' ? 'Grand Final' : kind === 'elite' ? `Elite Round` : `Round ${idx + 1}`,
    level: L + (kind === 'elite' ? 1 : 0), waves, bg: kind === 'final' ? 'tunnel' : RUN_THEMES[Math.floor(rnd() * RUN_THEMES.length)], turns: 99 };
}

// ---------- screen ----------
RENDER.rift = () => {
  const run = SAVE.run, rs = runState(), team = SAVE.team.filter(Boolean);
  const top = topbar('Bracket Run', 'lobby', 'battle');
  if (!run) {
    const L = runLevelFor(team), left = RUN_REWARD_RUNS - (rs.today.date === todayStr() ? rs.today.n : 0);
    $('#rift').innerHTML = `${top}
      <div class="rr">
        <div class="rr-intro">
          <em>ROGUELITE MODE</em><h2>Bracket Run</h2>
          <p>Fight up a tournament bracket with your squad. After every round, pick one of three <b>Boosts</b> that change how you fight. Boosts stack to Lv 3 and some only show up for certain members. HP carries over, and one loss ends the run.</p>
          <div class="rr-path">${RUN_NODES.map((n, i) => `<span class="rr-node ${n}" title="${RUN_NODE_INFO[n].name}">${ic(RUN_NODE_INFO[n].icon)}<small>${n === 'final' ? 'FINAL' : n === 'shop' ? 'SHOP' : n === 'choice' ? 'PICK' : 'R' + (i + 1)}</small></span>`).join('<i></i>')}</div>
          <div class="rr-squad"><span>Your squad</span>${team.map((id, i) => `<div class="face ${i ? '' : 'lead'}" style="${faceStyle(id)}" title="${CHARACTERS[id].short}"></div>`).join('')}
            <button class="pill dark rr-team">${ic('team')} Change</button></div>
          <div class="rr-meta"><span>Enemy level <b>${L}</b> (matches your squad)</span><span>Gem rewards today <b>${Math.max(0, left)}/${RUN_REWARD_RUNS}</b></span><span>Best <b>${rs.best ? `${rs.best}/${RUN_NODES.length}` : '—'}</b> · Clears <b>${rs.clears}</b></span></div>
          <button class="pill yellow rr-start" ${team.length ? '' : 'disabled'}>Start run ${ic('play')}</button>
        </div>
        ${rs.log.length ? `<div class="rr-log"><b>Recent runs</b>${rs.log.map(l => `<div><span class="face" style="${faceStyle(l.lead)}"></span><em>${l.cleared ? 'CLEARED' : `Round ${l.rounds}`}</em><small>${l.boosts.map(b => BOOSTS[b] ? BOOSTS[b].name : b).slice(0, 4).join(' · ')}${l.boosts.length > 4 ? ' …' : ''}</small></div>`).join('')}</div>` : ''}
      </div>`;
    $('#rift .rr-start').onclick = () => { SAVE.run = newRun(); persist(); RENDER.rift(); runContinue(); };
    $('#rift .rr-team').onclick = () => openTeam();
    return;
  }
  const P = run.path;
  $('#rift').innerHTML = `${top}
    <div class="rr">
      <div class="rr-run">
        <div class="rr-path big">${P.map((n, i) => `<span class="rr-node ${n} ${i < run.node ? 'done' : i === run.node ? 'now' : ''}">${ic(RUN_NODE_INFO[n].icon)}<small>${RUN_NODE_INFO[n].name}</small></span>`).join('<i></i>')}</div>
        <div class="rr-status">
          <div class="rr-hp"><small>HP</small><div><i style="width:${run.hp * 100}%"></i></div><b>${Math.round(run.hp * 100)}%</b></div>
          <span class="rr-coins">${ic('coin')} <b>${run.coins}</b> Clip Coins</span>
          <span>Enemy Lv <b>${run.level + Math.floor(run.node / 2)}</b></span>
        </div>
        <div class="rr-boosts">${Object.keys(run.picks).length ? Object.entries(run.picks).map(([id, l]) => boostChip(id, l)).join('') : '<p class="hint-inline">No Boosts yet. Win a round to pick one.</p>'}</div>
        <div class="rr-btns"><button class="pill yellow rr-go">${run.node === 0 ? 'Start' : 'Continue'} · ${RUN_NODE_INFO[P[run.node]].name} ${ic('play')}</button><button class="pill dark rr-quit">Give up</button></div>
      </div>
    </div>`;
  $('#rift .rr-go').onclick = () => runContinue();
  const quit = $('#rift .rr-quit');
  quit.onclick = () => {
    if (!quit.classList.contains('armed')) { quit.classList.add('armed'); quit.textContent = 'Tap again to end the run'; return; }
    runEnd(false);
  };
};

// Member Boosts show that member's element icon.
const boostIcon = b => (b.lead || b.any ? elIc(CHARACTERS[b.lead || b.any].element) : ic(b.icon));
const boostChip = (id, l) => { const b = BOOSTS[id]; return `<div class="rr-chip" style="--rc:${BOOST_RARITY[b.r].color}" title="${b.desc(l)}">${boostIcon(b)}<b>${b.name}</b><small>Lv ${l}</small></div>`; };

// Plays the node the run is on.
function runContinue() {
  const run = SAVE.run;
  if (!run) return;
  const kind = run.path[run.node];
  if (kind === 'choice') return runChoice();
  if (kind === 'shop') return runShop();
  if (kind === 'rest') { run.hp = Math.min(1, run.hp + 0.35); run.node++; persist(); toast('Rested: +35% HP'); return RENDER.rift(); }
  runBattle(kind);
}

async function runBattle(kind) {
  const run = SAVE.run;
  const stage = runStage(run, run.node, kind);
  show('battle');
  $('#battle').innerHTML = `<div class="ab-loading"><div class="logo">${logoHtml()}</div><b>${stage.name}</b><i></i></div>`;
  if (!(await whenThree())) { toast('The 3D battle engine could not load. Check your connection.'); return show('rift'); }
  await loadChibiModels();
  await SpoEnvironment.load();
  run.perks = runPerks(run);
  const opts = { run, elite: kind === 'elite', hpMult: kind === 'elite' ? 1.1 : 1, onFinish: (b, win) => runRoundOver(b, win, kind) };
  currentBattle = new ActionBattle($('#battle'), stage, run.team, reason => {
    currentBattle = null;
    // Giving up from the pause menu ends the run (with rewards for the rounds already won).
    if (reason === 'quit' || reason === 'back') return runEnd(false);
    show('rift');
  }, opts);
}

function runRoundOver(b, win, kind) {
  const run = SAVE.run, h = b.player;
  run.kills = (run.kills || 0) + b.stat.kills;
  if (b.revived) run.reviveUsed = true;
  if (!win) { setTimeout(() => { b.dispose(); runEnd(false); }, 1400); return; }
  run.hp = Math.max(0.05, h.hp / h.maxHp);
  run.node++;
  persist();
  h.model.setState('win');
  h.model.root.visible = false; if (h.shadow) h.shadow.visible = false;
  b.root.classList.add('scene', 'ended');
  const mvp = [h, ...b.supports].reduce((best, u) => (u.dmg || 0) > (best.dmg || 0) ? u : best, h);
  const art = document.createElement('img'); art.className = 'run-result-art'; art.src = ART[mvp.id].url; art.alt = mvp.def.name; b.root.appendChild(art);
  b.camZoomTo = 1;
  sfx('win');
  const last = run.node >= run.path.length;
  b.banner(last ? 'CHAMPION!' : 'ROUND CLEAR', 'finish');
  setTimeout(() => {
    if (last) { b.dispose(); return runEnd(true); }
    boostPick(b.root, kind === 'elite' ? 2 : 1, () => { b.dispose(); show('rift'); });
  }, 1300);
}

// The pick-one-of-three Boost overlay (shown over the battle scene).
function boostPick(host, minR, done, title = 'Choose a Boost') {
  const run = SAVE.run;
  let choices = rollBoosts(run, 3, minR);
  const el = document.createElement('div');
  el.className = 'bp';
  const render = () => {
    el.innerHTML = `<div class="bp-head"><em>ROUND ${run.node} CLEAR</em><h2>${title}</h2></div>
      <div class="bp-cards">${choices.map((id, i) => {
        const b = BOOSTS[id], l = (run.picks[id] || 0) + 1, rr = BOOST_RARITY[b.r];
        return `<button class="bp-card r${b.r}" data-id="${id}" style="--rc:${rr.color};--i:${i}">
          <span class="bp-rar">${rr.name}${b.lead || b.any ? ` · ${CHARACTERS[b.lead || b.any].short}` : ''}</span>
          <span class="bp-ico">${boostIcon(b)}</span><b>${b.name}</b><span class="bp-lv">${l > 1 ? `Lv ${l - 1} → <em>Lv ${l}</em>` : '<em>NEW</em>'}</span>
          <p>${b.desc(l)}</p></button>`;
      }).join('') || '<p>Every Boost is maxed out!</p>'}</div>
      <div class="bp-foot"><span>${ic('coin')} ${run.coins}</span><button class="pill dark bp-reroll" ${run.coins < 30 ? 'disabled' : ''}>${ic('replay')} Reroll · 30</button>${choices.length ? '' : '<button class="pill yellow bp-skip">Continue</button>'}</div>`;
    el.querySelectorAll('.bp-card').forEach(c => c.onclick = () => {
      const id = c.dataset.id;
      run.picks[id] = (run.picks[id] || 0) + 1;
      if (id === 'hydrate') run.hp = Math.min(1, run.hp + 0.15);
      persist();
      sfx('rewardItem');
      c.classList.add('chosen');
      el.classList.add('out');
      setTimeout(() => { el.remove(); done(); }, 450);
    });
    const rr = el.querySelector('.bp-reroll');
    if (rr) rr.onclick = () => { if (run.coins < 30) return; run.coins -= 30; choices = rollBoosts(run, 3, minR); sfx('flip'); render(); };
    const sk = el.querySelector('.bp-skip');
    if (sk) sk.onclick = () => { el.remove(); done(); };
  };
  render();
  host.appendChild(el);
  sfx('reward');
}

// Round 3: an Elite fight (rarer Boosts) or a rest.
function runChoice() {
  const run = SAVE.run;
  openModal(`<div class="picker-head"><h3>${ic('map')} Crossroads</h3><button class="btn small close">${ic('close')}</button></div>
    <div class="rr-choice">
      <button class="rr-opt elite"><span>${ic('flame')}</span><b>Elite Round</b><p>Two <b>Elite</b> enemies in every wave. Win to pick from <b>Rare or better</b> Boosts.</p></button>
      <button class="rr-opt rest"><span>${ic('heart')}</span><b>Rest</b><p>Heal <b>35%</b> HP (you have ${Math.round(run.hp * 100)}%). No fight, no Boost.</p></button>
    </div>`);
  const box = document.querySelector('#pull .picker-box');
  box.querySelector('.elite').onclick = () => { closeModal(); run.path[run.node] = 'elite'; persist(); runBattle('elite'); };
  box.querySelector('.rest').onclick = () => { closeModal(); run.path[run.node] = 'rest'; persist(); runContinue(); };
}

// Pit stop: buy Boosts or healing with Clip Coins from the run.
function runShop() {
  const run = SAVE.run;
  if (!run.shop) { run.shop = rollBoosts(run, 3, 2).map(id => ({ id, price: BOOSTS[id].r === 3 ? 140 : 90, sold: false })); persist(); }
  const render = () => `<div class="picker-head"><h3>${ic('shop')} Pit Stop</h3><button class="btn small close">${ic('close')}</button></div>
    <div class="rr-shop-top">${ic('coin')} <b>${run.coins}</b> Clip Coins · HP ${Math.round(run.hp * 100)}%</div>
    <div class="bp-cards shop">${run.shop.map(s => {
      const b = BOOSTS[s.id], l = (run.picks[s.id] || 0) + 1, rr = BOOST_RARITY[b.r];
      return `<button class="bp-card r${b.r} ${s.sold ? 'sold' : ''}" data-id="${s.id}" style="--rc:${rr.color}" ${s.sold || run.coins < s.price ? 'disabled' : ''}>
        <span class="bp-rar">${rr.name}</span><span class="bp-ico">${boostIcon(b)}</span><b>${b.name}</b><span class="bp-lv">${l > 1 ? `→ Lv ${l}` : 'NEW'}</span>
        <p>${b.desc(l)}</p><span class="bp-price">${s.sold ? 'SOLD' : `${ic('coin')} ${s.price}`}</span></button>`;
    }).join('')}
      <button class="bp-card heal" data-heal="1" ${run.coins < 40 || run.hp >= 1 ? 'disabled' : ''}><span class="bp-rar">Snack</span><span class="bp-ico">${ic('cake')}</span><b>Pit Stop Meal</b><p>Heal 30% HP.</p><span class="bp-price">${ic('coin')} 40</span></button>
    </div>
    <button class="pill yellow rr-leave">Back on the road ${ic('play')}</button>`;
  openModal(render());
  const bind = () => {
    const box = document.querySelector('#pull .picker-box');
    box.classList.add('rr-shopbox');
    box.querySelectorAll('.bp-card[data-id]').forEach(c => c.onclick = e => {
      e.stopPropagation();
      const s = run.shop.find(x => x.id === c.dataset.id);
      if (!s || s.sold || run.coins < s.price) return;
      run.coins -= s.price; s.sold = true;
      run.picks[s.id] = (run.picks[s.id] || 0) + 1;
      persist(); sfx('coin');
      box.innerHTML = render(); bind();
    });
    const heal = box.querySelector('[data-heal]');
    if (heal) heal.onclick = e => { e.stopPropagation(); if (run.coins < 40) return; run.coins -= 40; run.hp = Math.min(1, run.hp + 0.3); persist(); sfx('heal'); box.innerHTML = render(); bind(); };
    box.querySelector('.rr-leave').onclick = () => { closeModal(); run.node++; delete run.shop; persist(); RENDER.rift(); };
  };
  bind();
}

// End of the run: rewards by rounds cleared, a log entry, back to the run screen.
function runEnd(cleared) {
  const run = SAVE.run, rs = runState();
  if (!run) return show('rift');
  const rounds = cleared ? run.path.length : run.node;
  const day = todayStr();
  if (rs.today.date !== day) rs.today = { date: day, n: 0 };
  const paysGems = rs.today.n < RUN_REWARD_RUNS;
  rs.today.n++;
  const L = run.level;
  const tokens = Math.round(rounds * 700 * (1 + L / 8)), coins = rounds * 15 + Math.floor(run.coins / 4);
  const gems = paysGems ? rounds * 30 + (cleared ? 150 : 0) : 0;
  SAVE.exp += tokens; SAVE.coins += coins; SAVE.gems += gems;
  const xp = rounds * 25, ranks = addPlayerXp(xp);
  rs.best = Math.max(rs.best, rounds);
  if (cleared) rs.clears++;
  rs.log.unshift({ lead: run.team[0], rounds, cleared, boosts: Object.keys(run.picks), date: day });
  rs.log = rs.log.slice(0, 5);
  SAVE.run = null;
  SAVE.stats.battles++;
  persist();
  show('rift');
  showRewards([gems && { kind: 'gem', n: gems }, { kind: 'token', n: tokens }, { kind: 'coin', n: coins }, { kind: 'xp', n: xp },
    ranks && { kind: 'gem', n: ranks * RANK_UP_GEMS, name: `Rank ${SAVE.player.rank} bonus` }],
    { title: cleared ? 'Bracket Cleared!' : 'Run Over', sub: `${rounds}/${run.path.length} ROUNDS · ${Object.keys(run.picks).length} BOOSTS${paysGems ? '' : ' · NO GEMS (3 RUNS A DAY)'}` });
}
