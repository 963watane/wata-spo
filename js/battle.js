// Turn-based battle: speed-based turn order, shared Skill Points,
// per-character Energy for Ultimates, and a team Hype meter that unlocks
// a Collab attack with the whole team. The fight is framed as a live
// stream: viewers rise with hype and chat reacts to what happens.

const SP_MAX = 5, SP_START = 3, AV_BASE = 10000, HYPE_MAX = 100;
const ENERGY_GAIN = { basic: 20, skill: 30, ult: 5 };

const BATTLE_PREFS = (() => {
  try { return Object.assign({ auto: false, speed: 1 }, JSON.parse(localStorage.getItem('spostars_battle') || '{}')); }
  catch (e) { return { auto: false, speed: 1 }; }
})();
function saveBattlePrefs() {
  try { localStorage.setItem('spostars_battle', JSON.stringify(BATTLE_PREFS)); } catch (e) { /* ignore */ }
}

// Boss move patterns, also used to show what the boss does next.
const BOSS_PATTERNS = {
  phantom: ['Crimson Slash', 'Crimson Slash', 'Charge', 'Crimson Storm'],
  core: ['Beam', 'Core Firewall', 'Beam', 'Charge', 'Meltdown'],
  algorithm: ['Recommend', 'Shadowban', 'Trend Shift', 'Charge', 'Viral Surge'],
};

// Stagger: how much poise each enemy has before it breaks.
const POISE = { grunt: 40, sniper: 30, spammer: 30, firewall: 70, desync: 30, troll: 60, clipper: 35, echo: 45 };
const BOSS_POISE = 140;
// Stagger dealt per hit by action type (AoE hits deal 60%, Tanks deal 150%).
const STAGGER = { basic: 10, skill: 20, ult: 30, collab: 15, follow: 8 };
const BREAK_DMG = 1.25;
// A Break pushes the enemy back by this share of ONE of its turns. It recovers
// at the start of its next turn and still acts (no permanent stun-lock).
const BREAK_DELAY = 0.4;
// Weakness Break effects, by the element of the member who breaks the enemy.
const BREAK_FX = {
  sun:   { name: 'Sunburn',     desc: 'burns for 50% of the breaker\'s ATK each turn for 2 turns', apply: (b, e, s) => b.addStatus(e, 'burn', Math.round(b.stat(s, 'atk') * 0.5), 2, 'BURN') },
  candy: { name: 'Sugar Crash', desc: 'deals 25% less damage for 2 turns', apply: (b, e) => b.addStatus(e, 'weaken', 0.25, 2, 'ATK↓') },
  night: { name: 'Nightfall',   desc: 'is pushed even further back in the turn order', apply: (b, e) => { e.av += AV_BASE / b.stat(e, 'spd') * 0.35; } },
  paint: { name: 'Splatter',    desc: 'takes 50% of the breaker\'s ATK as Paint damage each turn for 2 turns', apply: (b, e, s) => b.addStatus(e, 'paint', Math.round(b.stat(s, 'atk') * 0.5), 2, 'PAINT') },
  aim:   { name: 'Exposed',     desc: 'gives members +25% crit chance against it for 2 turns', apply: (b, e) => b.addStatus(e, 'exposed', 0.25, 2, 'EXPOSED') },
  snack: { name: 'Food Coma',   desc: 'loses 20% SPD for 2 turns', apply: (b, e) => b.addStatus(e, 'slow', 0.2, 2, 'SPD↓') },
};
// Balance: enemies hit harder and scale faster than before, and member DEF
// blocks less (enemy hits use DEF_K_ALLY in the defense formula).
// BOSS_HP scales boss health on top of the formula (long, multi-phase boss fights).
// 3.0: regular enemies have less HP so normal fights move faster; BOSS_HP keeps boss health where it was.
const ENEMY_ATK = 1.95, ENEMY_ATK_PER_LV = 0.2, ENEMY_HP = 1.12, ENEMY_HP_PER_LV = 0.18, BOSS_HP = 1.16, BOSS_ATK = 1.1;
const DEF_K_ALLY = 160, DEF_K_ENEMY = 100;

// Signature look of each member's attacks: a projectile for Basics and a
// particle effect that plays on whatever their skills touch.
const SIG_FX = {
  sendo:  { proj: 'heart', fx: 'cheer', snd: 'sparkle' },
  tsuna:  { proj: 'paintball', fx: 'paint', snd: 'splat' },
  noah:   { proj: 'star', fx: 'dream', snd: 'dream' },
  hinano: { proj: null, fx: 'fortress', snd: 'bonk' },
  uruha:  { proj: 'bullet', fx: null, snd: 'shot' },
  lisa:   { proj: 'donut', fx: 'cheer', snd: 'munch' },
};

// Icon for each kind of enemy intent (what it does on its next turn).
const INTENT_IC = { atk: 'battle', snipe: 'raid', heal: 'support', buff: 'tank', drain: 'bolt', aoe: 'ult', charge: 'timer', debuff: 'lock', stun: 'replay' };

// First-battle tips (tutorial). Each shows once.
const COACH = {
  basic: 'Your turn! Tap <b>BASIC</b> (or press Q) to attack. Basic attacks give <b>+1 Skill Point</b>.',
  skill: '<b>SKILL</b> is stronger but costs 1 Skill Point (the diamonds above the buttons). Mix Basics and Skills.',
  ult: 'A member\'s energy is full! Tap their glowing <b>Ultimate</b> button, on their card or below, at any time, even on an enemy\'s turn.',
  weak: '<b>WEAK!</b> This enemy is weak to that member\'s element (the icons under its HP bar). Weakness hits deal more damage and far more Stagger.',
  break: 'The white bar under an enemy is <b>Stagger</b>. Empty it to <b>BREAK</b> them: they are pushed back, take extra damage, and suffer an effect from the breaker\'s element (Sunburn, Splatter, Exposed...).',
  collab: 'Hype is at 100%! <b>COLLAB</b> makes the whole team attack together.',
};

class Battle {
  constructor(container, stage, team, onExit) {
    // Each battle gets its own root so a battle that is still finishing an
    // animation after Retry/Back can't touch the next battle's DOM.
    this.root = document.createElement('div');
    this.root.className = 'bf';
    container.replaceChildren(this.root);
    this.stage = stage; this.onExit = onExit;
    this.mods = new Set(stage.mods || []);      // Ranked Raid rule changes
    this.spMax = this.mods.has('spcap') ? 3 : SP_MAX;
    this.sp = Math.min(SP_START, this.spMax); this.hype = 0;
    this.auto = stage.tutorial ? false : BATTLE_PREFS.auto; this.speed = BATTLE_PREFS.speed;
    this.coached = {};
    this.over = false; this.waveIdx = 0; this.uid = 0;
    this.allyActions = 0; this.anyKo = false;   // for stage stars
    this.viewers = 300 + Math.floor(Math.random() * 400);
    this.pending = null; this.selected = null; this.focus = null; this.current = null;
    this.ultQueue = [];      // Ultimates requested outside the member's own turn
    this.followQueue = [];   // Talent follow-up attacks waiting to play
    this.allies = team.map(id => this.makeAlly(id));
    this.enemies = [];
    this.buildDom();
    this.allies.forEach((u, i) => {
      this.q('.ally-row').appendChild(this.unitEl(u));
      u.el.style.animationDelay = (i * 90) + 'ms';
      u.el.classList.add('enter');
    });
    this.spawnWave();
    // Boss stages play the boss's theme from the first wave.
    const bossId = stage.waves.flat().find(k => ENEMIES[k].boss);
    if (bossId && typeof playMusic === 'function') playMusic(bossTrack(bossId));
    this.allies.forEach(u => { if (u.mem && u.mem.def.onStart) u.mem.def.onStart(this, u, u.mem.v); });
    this.updateAll();
    this.loop();
  }

  // ---------- setup ----------
  makeAlly(id) {
    const s = charStats(id), def = CHARACTERS[id];
    const mem = s.memory ? { id: s.memory, def: MEMORIES[s.memory], v: memValue(s.memory, id) } : null;
    const power = { basic: skillPower(id, 'basic'), skill: skillPower(id, 'skill'), ult: skillPower(id, 'ult') };
    return { uid: this.uid++, id, side: 'ally', def, name: def.short, kit: def.kit, lvl: s.lvl, mem, power,
      maxHp: s.hp, hp: s.hp, atk: s.atk, def_: s.def, spd: s.spd, crit: s.crit, critDmg: s.critDmg,
      energy: Math.min(100, 50 + s.energy), maxEnergy: 100, av: AV_BASE / s.spd, statuses: [], shield: 0, shieldTurns: 0, alive: true, dmgDealt: 0 };
  }

  makeEnemy(key) {
    // DEF scales slower than HP/ATK so late stages don't become damage sponges.
    const e = ENEMIES[key], lv = this.stage.level - 1;
    const hp = Math.round(e.hp * ENEMY_HP * (1 + ENEMY_HP_PER_LV * lv) * (e.boss ? BOSS_HP : 1) * (this.stage.raid && e.boss ? RAID_HP_MULT : 1));
    const poise = e.boss ? BOSS_POISE : POISE[key] || 40;
    return { uid: this.uid++, id: key, key, side: 'enemy', def: e, name: e.name, boss: !!e.boss, lvl: this.stage.level,
      maxHp: hp, hp, atk: Math.round(e.atk * ENEMY_ATK * (1 + ENEMY_ATK_PER_LV * lv) * (e.boss ? BOSS_ATK : 1)), def_: Math.round(e.def * (1 + 0.05 * lv)),
      spd: Math.round((e.spd + Math.floor(lv * 1.5)) * (this.mods.has('swift') ? 1.25 : 1)), crit: e.crit + 0.05, critDmg: e.critDmg,
      av: AV_BASE / e.spd, statuses: [], shield: 0, shieldTurns: 0, alive: true, turns: 0, phase: 1, dmgDealt: 0,
      poise, maxPoise: poise, broken: false };
  }

  q(sel) { return this.root.querySelector(sel); }

  buildDom() {
    this.root.innerHTML = `
      <div class="bf-bg"><div class="bf-scene ${BACKGROUNDS[this.backdrop()] ? 'env' : ''}" style="${sceneStyle(this.backdrop())}"></div></div>
      ${creditHtml(this.backdrop()) ? `<div class="bf-credit">${creditHtml(this.backdrop())}</div>` : ''}
      <div class="enemy-tip hidden"></div>
      <div class="bf-top">
        <div class="bf-stage"><span class="live"><i></i>LIVE</span> ${this.stage.id} · ${this.stage.name} <span class="bf-wave"></span>
          <span class="viewers">${ic('eye')}<b>${this.viewers}</b></span></div>
        <div class="hype"><span class="hype-label">HYPE</span><div class="hype-bar"><i></i></div><span class="hype-num">0%</span></div>
        <div class="bf-ctrl">
          <button class="ctl auto ${this.auto ? 'on' : ''}">AUTO</button>
          <button class="ctl spd">x${this.speed}</button>
          <button class="ctl pause" title="Pause (Esc)">${ic('pause')}</button>
        </div>
      </div>
      ${this.stage.raid ? `<div class="raid-hud"></div><div class="raid-mods">${[...this.mods].map(m => `<span title="${RAID_MODS[m].desc}">${RAID_MODS[m].name}</span>`).join('')}</div>` : ''}
      <div class="coach hidden"><p></p><button>Got it</button></div>
      <div class="boss-bar hidden"><div class="bb-head"><b class="bb-name"></b><span class="bb-weak"></span><span class="bb-num"></span></div>
        <div class="bb-intent"></div>
        <div class="bb-hp"><i class="bb-trail"></i><i class="bb-fill"></i><s class="bb-shield"></s><em class="bb-pv"></em><u class="bb-mark"></u><u class="bb-mark m2"></u></div>
        <div class="bb-poise"><i></i></div></div>
      <div class="order"></div>
      <div class="chat"><div class="chat-head">LIVE CHAT</div><div class="chat-log"></div></div>
      <div class="enemy-row"></div>
      <div class="banner-msg"></div>
      <div class="ally-row"></div>
      <div class="actions hidden">
        <div class="skill-info"></div>
        <div class="act-row">
          <div class="sp"><span>SKILL PTS</span><div class="pips"></div></div>
          <button class="act collab hidden" data-act="collab">${ic('collab')}<b>COLLAB!</b><small>Team attack</small></button>
          <button class="act" data-act="basic"><kbd>Q</kbd>${ic('basic')}<b>Basic</b><small></small></button>
          <button class="act" data-act="skill"><kbd>E</kbd>${ic('skill')}<b>Skill</b><small></small></button>
          <button class="act ult" data-act="ult"><kbd>R</kbd>${ic('ult')}<b>Ultimate</b><small></small></button>
        </div>
      </div>
      <div class="fx-layer"></div>
      <div class="ult-tint"></div>
      <div class="combo hidden"><b></b><span></span></div>
      <div class="flash"></div>
      <div class="cutin"></div>
      <div class="pause-menu hidden"></div>
      <div class="end hidden"></div>`;
    this.q('.auto').onclick = () => {
      this.auto = BATTLE_PREFS.auto = !this.auto; saveBattlePrefs();
      this.q('.auto').classList.toggle('on', this.auto);
      if (this.auto && this.pending) this.resolveChoice(this.autoPick(this.pending.u));
    };
    this.q('.spd').onclick = () => {
      this.speed = BATTLE_PREFS.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; saveBattlePrefs();
      this.q('.spd').textContent = 'x' + this.speed;
    };
    this.q('.pause').onclick = () => this.pause();
    this.root.querySelectorAll('.act').forEach(b => b.onclick = () => this.onAct(b.dataset.act));
    this.keyHandler = e => {
      if (this.over) return;
      if (e.key === 'Escape') { if (this.paused) this.resume(); else this.pause(); return; }
      if (this.paused) return;
      // 1-4: fire that member's Ultimate (any time, like the card button).
      if (/^[1-4]$/.test(e.key)) { const a = this.allies[Number(e.key) - 1]; if (a) this.requestUlt(a); return; }
      if (!this.pending) return;
      const map = { q: 'basic', e: 'skill', r: 'ult', c: 'collab' };
      if (map[e.key.toLowerCase()]) this.onAct(map[e.key.toLowerCase()]);
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.onAct(this.selected); }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  unitEl(u) {
    const el = document.createElement('div');
    el.className = `unit ${u.side}${u.boss ? ' boss' : ''}`;
    let sprite;
    if (u.side === 'ally') sprite = `<div class="sprite bust" style="${bustStyle(u.id)}"></div>`;
    else if (u.def.art) sprite = `<img class="sprite" src="${ART[u.id].url}" alt="">`;
    else sprite = foeSprite(u.id, u.def.hue);
    el.innerHTML = `
      <div class="idle">${sprite}</div>
      <div class="reticle"></div>
      <div class="say"></div>
      <div class="st"></div>
      ${u.side === 'enemy' ? '<div class="intent"></div>' : ''}
      <div class="ubar">
        <div class="hp"><b class="trail"></b><i></i><s></s><em class="pv"></em></div>
        ${u.side === 'ally' ? '<div class="en"><i></i></div>' : '<div class="poise" title="Stagger: empty it to Break"><i></i></div>'}
        ${u.side === 'enemy' ? `<div class="weak" title="Weak to">${weakIcons(u.id)}</div>` : `<div class="elem">${elIc(u.def.element)}</div>`}
      </div>
      ${u.side === 'ally' ? `<button class="ult-btn" title="Use Ultimate now">${ic('ult')}</button>` : ''}
      <div class="uname">${u.name} <em>Lv ${u.lvl}</em><span class="hpnum"></span>
        ${u.side === 'enemy' ? '<button class="info-btn" title="Enemy info">i</button>' : ''}</div>`;
    el.onclick = () => this.onUnitClick(u);
    if (u.side === 'ally') el.querySelector('.ult-btn').onclick = ev => { ev.stopPropagation(); this.requestUlt(u); };
    if (u.side === 'enemy') {
      el.onmouseenter = () => { this.showTip(u); this.hoverTarget(u); };
      el.onmouseleave = () => this.hideTip();
      el.querySelector('.info-btn').onclick = ev => { ev.stopPropagation(); this.showTip(u, true); };
    }
    el.style.setProperty('--c', u.def.color || '#a0a0ff');
    u.el = el;
    return el;
  }

  spawnWave() {
    const row = this.q('.enemy-row');
    this.enemies.filter(e => !e.alive).forEach(e => e.el.remove());
    this.enemies = this.stage.waves[this.waveIdx].map(k => this.makeEnemy(k));
    this.enemies.forEach((e, i) => {
      row.appendChild(this.unitEl(e));
      e.el.style.animationDelay = (i * 120) + 'ms';
      e.el.classList.add('enter');
    });
    const n = this.stage.waves.length;
    this.q('.bf-wave').textContent = n > 1 ? `· Wave ${this.waveIdx + 1}/${n}` : '';
    const boss = this.enemies.find(e => e.boss);
    this.bossUnit = boss || null;
    this.q('.boss-bar').classList.toggle('hidden', !boss);
    this.root.classList.toggle('has-boss', !!boss);
    if (boss) {
      this.chat('boss', 1); this.chat('boss', 1);
      this.q('.bb-name').textContent = boss.name;
      this.q('.bb-weak').innerHTML = `<small>WEAK</small>${weakIcons(boss.id)}`;
      // All three bosses change phase at half HP.
      // All three bosses change phase at half HP and enter a final phase at a quarter.
      this.q('.bb-mark').style.left = '50%';
      this.q('.bb-mark.m2').style.left = '25%';
      setTimeout(() => this.showBanner(`BOSS · ${boss.name}`, 'boss'), 400 / this.speed);
      if (typeof playMusic === 'function') playMusic(bossTrack(boss.id));
    }
    this.updateAll();
  }

  summon(key) {
    const e = this.makeEnemy(key);
    this.enemies.push(e);
    this.q('.enemy-row').appendChild(this.unitEl(e));
    e.el.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 500 });
    this.updateUnit(e);
  }

  // ---------- helpers ----------
  // Waits for ms (scaled by battle speed), then holds while the game is paused.
  async wait(ms) {
    await new Promise(r => setTimeout(r, ms / this.speed));
    while (this.paused && !this.over) await new Promise(r => setTimeout(r, 120));
  }
  all() { return [...this.allies, ...this.enemies]; }
  living(side) { return this.all().filter(u => u.alive && (!side || u.side === side)); }
  enemiesOf(u) { return this.living(u.side === 'ally' ? 'enemy' : 'ally'); }
  sumStatus(u, key) { return u.statuses.filter(s => s.key === key).reduce((a, s) => a + s.val, 0); }
  hasStatus(u, key) { return u.statuses.some(s => s.key === key); }

  stat(u, k) {
    if (k === 'atk') return u.atk * Math.max(0.2, 1 + this.sumStatus(u, 'atk') + this.sumStatus(u, 'focus') - this.sumStatus(u, 'weaken')) * (u.enrage || 1);
    if (k === 'def') return u.def_;
    if (k === 'spd') return u.spd * (1 - this.sumStatus(u, 'slow'));
    return u[k];
  }

  // Where the fight takes place (see STAGE_BG / towerBg).
  backdrop() { return stageBg(this.stage); }

  // Enemy info panel (hover, or tap the "i").
  showTip(u, sticky = false) {
    const tip = this.q('.enemy-tip');
    const pat = BOSS_PATTERNS[u.def.ai];
    tip.innerHTML = `<b>${u.name}</b> <em>Lv ${u.lvl}${u.boss ? ' · BOSS' : ''}</em>
      <div class="tip-stats"><span>HP ${u.hp}/${u.maxHp}</span><span>ATK ${Math.round(this.stat(u, 'atk'))}</span><span>DEF ${u.def_}</span><span>SPD ${u.spd}</span><span class="tip-poise">${u.broken ? 'BROKEN' : `STAGGER ${Math.ceil(u.poise)}/${u.maxPoise}`}</span></div>
      <div class="tip-weak">Weak to ${weakIcons(u.id)} <span>${(u.def.weak || []).map(k => `${ELEMENTS[k].name} <i>(${BREAK_FX[k].name})</i>`).join(' · ')}</span></div>
      <p>${u.def.desc || ''}</p><div class="tip-next">Next: <b>${this.intentFor(u).label}</b></div>${pat ? `<small>Pattern: ${pat.join(' → ')}</small>` : ''}
      ${sticky ? '<small class="tip-close">Tap anywhere to close</small>' : ''}`;
    tip.classList.remove('hidden');
    clearTimeout(this.tipT);
    if (sticky) {
      this.tipSticky = true;
      setTimeout(() => document.addEventListener('click', () => { this.tipSticky = false; this.hideTip(); }, { once: true }), 0);
    }
  }
  hideTip() { if (!this.tipSticky) this.q('.enemy-tip').classList.add('hidden'); }

  // ---------- stream flavour ----------
  // Adds a chat message; chance < 1 keeps chat from flooding.
  chat(kind, chance = 0.6) {
    if (Math.random() > chance) return;
    const log = this.q('.chat-log');
    if (!log) return;
    const line = document.createElement('div');
    const name = pick(CHAT.names);
    line.innerHTML = `<b style="color:hsl(${[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 80% 70%)">${name}</b> ${pick(CHAT[kind])}`;
    log.appendChild(line);
    while (log.children.length > 7) log.firstChild.remove();
  }

  addViewers(n) {
    this.viewers += Math.round(n * (0.6 + Math.random() * 0.8));
    const v = this.q('.viewers b');
    if (v) v.textContent = this.viewers.toLocaleString();
  }

  // Speech bubble above a unit.
  say(u, text, ms = 1800) {
    if (!text || !u.el) return;
    const s = u.el.querySelector('.say');
    s.textContent = text;
    s.classList.remove('show'); void s.offsetWidth; s.classList.add('show');
    clearTimeout(u.sayT);
    u.sayT = setTimeout(() => s.classList.remove('show'), ms / this.speed);
  }

  // ---------- effects used by skills ----------
  hit(src, tgt, mult, o = {}) {
    if (!tgt.alive) return 0;
    let base = this.stat(src, 'atk') * mult + (o.defScale ? this.stat(src, 'def') * o.defScale : 0);
    if (src.mem && src.mem.def.ultDmg && this.actingKey === 'ult') base *= 1 + src.mem.v / 100;
    if (src.mem && src.mem.def.skillDmg && this.actingKey === 'skill') base *= 1 + src.mem.v / 100;
    if (src === this.actingUnit) base *= this.actingMult;
    const crit = Math.random() < src.crit + (o.critBonus || 0) + (src.side === 'ally' ? this.sumStatus(tgt, 'exposed') : 0);
    const k = tgt.side === 'ally' ? DEF_K_ALLY : DEF_K_ENEMY;
    let dmg = base * (crit ? 1 + src.critDmg : 1) * (k / (k + this.stat(tgt, 'def')));
    dmg *= Math.max(0.1, 1 + this.sumStatus(tgt, 'mark') - this.sumStatus(tgt, 'dr'));
    if (tgt.broken) dmg *= this.mods.has('breaker') ? BREAK_DMG + 0.25 : BREAK_DMG;
    if (this.mods.has('glass')) dmg *= 1.3;
    const weak = this.isWeak(src, tgt);
    if (weak) { dmg *= WEAK_DMG; SAVE.stats.weakHits = (SAVE.stats.weakHits || 0) + 1; this.coach('weak'); }
    dmg = Math.max(1, Math.round(dmg * (0.95 + Math.random() * 0.1)));
    src.dmgDealt += dmg;
    if (src.side === 'ally') {
      if (crit) SAVE.stats.crits++;
      SAVE.stats.bestHit = Math.max(SAVE.stats.bestHit, dmg);
    }
    if (this.combo && src.side === 'ally') { this.combo.hits++; this.combo.dmg += dmg; }
    this.applyDamage(tgt, dmg, { crit, weak, src });
    if (src.side === 'ally' && crit) { this.addHype(3); this.chat('crit', 0.5); this.addViewers(8); this.hitStop(); }
    // Members wear down enemy Stagger; Tanks hit harder for stagger.
    if (src.side === 'ally' && tgt.side === 'enemy' && tgt.alive && !tgt.broken) {
      const amt = (o.stagger ?? this.actingStagger ?? STAGGER.follow) * (src.def.role === 'Tank' ? 1.5 : 1) * (this.mods.has('breaker') ? 1.5 : 1)
        * (weak ? WEAK_STAGGER : RESIST_STAGGER);
      this.stagger(tgt, amt, src);
    }
    // Hinano's talent: counter-attack while Taunting.
    if (src.side === 'enemy' && tgt.alive && tgt.id === 'hinano' && this.hasStatus(tgt, 'taunt') && !tgt.counterUsed) {
      tgt.counterUsed = true;
      this.followQueue.push({ u: tgt, target: src, mult: 0.5, defScale: 0.6, label: 'Sweet Revenge' });
    }
    return dmg;
  }

  // Member attacking an enemy weak to their element.
  isWeak(src, tgt) { return src.side === 'ally' && tgt.side === 'enemy' && (tgt.def.weak || []).includes(src.def.element); }

  stagger(e, amt, src) {
    e.poise = Math.max(0, e.poise - amt);
    if (e.poise < e.maxPoise * 0.6) this.coach('break');
    if (e.poise <= 0) this.breakEnemy(e, src);
    this.updateUnit(e);
  }

  // BREAK: loses its next turn, pushed back in the turn order, takes extra damage.
  breakEnemy(e, src) {
    e.broken = true;
    SAVE.stats.breaks++;
    bumpDaily('breaks');
    this.coach('break');
    e.av += AV_BASE / this.stat(e, 'spd') * BREAK_DELAY;
    this.fx([e], 'shatter');
    e.el.classList.add('broken');
    sfx('break');
    this.screenShake(12);
    this.hitStop(160);
    this.addHype(12);
    this.addViewers(30);
    this.chat('crit', 1);
    // The breaker's element adds its own effect (see BREAK_FX).
    const bfx = src && src.side === 'ally' ? BREAK_FX[src.def.element] : null;
    if (bfx) bfx.apply(this, e, src);
    this.breakSplash(e, bfx, src);
    if (e.charging) {
      e.charging = false; e.el.classList.remove('charging');
      e.turns++;   // skip the charged attack in its pattern
      this.showBanner('Charged attack cancelled!');
      this.setIntent(e);
    }
    // Talents that trigger on Break.
    const noah = this.allies.find(a => a.id === 'noah' && a.alive);
    if (noah) this.followQueue.push({ u: noah, target: e, mult: 1.2, label: 'Snack Time' });
    const sendo = this.allies.find(a => a.id === 'sendo' && a.alive);
    if (sendo) this.living('ally').forEach(a => this.heal(a, sendo.maxHp * 0.04));
    // Uruha's talent: Breaking an enemy herself charges her and boosts the next ally action.
    if (src && src.id === 'uruha' && src.alive) {
      this.addEnergy(src, 25);
      this.nextBoost = 1.2;
      this.floatText(src, 'NICE CALL', 'heal');
    }
    this.renderOrder();
  }

  // Plays queued talent follow-ups after the current action.
  async processFollowUps() {
    while (this.followQueue.length && !this.over) {
      const f = this.followQueue.shift();
      if (!f.u.alive || !f.target.alive) continue;
      this.skillPop(f.u, f.label);
      await this.attackAnim(f.u, [f.target], true);
      this.fx([f.target], f.u.id === 'tsuna' ? 'splash' : 'slash');
      this.hit(f.u, f.target, f.mult, { defScale: f.defScale, stagger: STAGGER.follow });
      this.updateAll();
      await this.wait(420);
    }
  }

  // Ultimate button on a member's card.
  async requestUlt(u) {
    if (this.over || !u.alive || u.energy < u.maxEnergy || !this.living('enemy').length) return;
    if (this.pending && this.pending.u === u) return this.resolveChoice({ key: 'ult', target: this.ultTarget(u) });
    if (this.pending && !this.interrupting) {
      // Fire right now, then hand control back to the member whose turn it is.
      this.interrupting = true;
      this.q('.actions').classList.add('hidden');
      this.markActive(u);
      await this.doAction(u, 'ult', this.ultTarget(u));
      this.interrupting = false;
      if (this.pending && !this.over) {
        this.markActive(this.pending.u);
        this.q('.actions').classList.remove('hidden');
        this.updateActions();
        this.select(this.canUse(this.selected, this.pending.u) ? this.selected || 'basic' : 'basic');
      }
      return;
    }
    if (!this.ultQueue.includes(u)) { this.ultQueue.push(u); u.el.classList.add('queued'); }
  }

  ultTarget(u) {
    if (u.kit.ult.target !== 'enemy') return null;
    const en = this.living('enemy');
    return this.focus && this.focus.alive && this.focus.side === 'enemy' ? this.focus : en.find(e => e.boss) || en.slice().sort((a, b) => a.hp - b.hp)[0];
  }

  async processUltQueue() {
    while (this.ultQueue.length && !this.over && this.living('enemy').length) {
      const u = this.ultQueue.shift();
      u.el.classList.remove('queued');
      if (!u.alive || u.energy < u.maxEnergy) continue;
      this.markActive(u);
      await this.doAction(u, 'ult', this.ultTarget(u));
      this.markActive(null);
    }
  }

  applyDamage(tgt, dmg, { crit = false, dot = false, weak = false, src = null } = {}) {
    if (!tgt.alive) return;
    if (src && !dot) this.impact(tgt, src, crit, weak);
    if (tgt.shield > 0) {
      const absorbed = Math.min(tgt.shield, dmg);
      tgt.shield -= absorbed; dmg -= absorbed;
      this.floatText(tgt, `-${absorbed}`, 'shield');
    }
    if (dmg > 0) {
      tgt.hp = Math.max(0, tgt.hp - dmg);
      this.floatText(tgt, crit ? `${dmg}!` : `${dmg}`, (dot ? 'dot' : crit ? 'crit' : 'dmg') + (weak ? ' weak' : ''));
    }
    sfx(crit ? 'crit' : weak ? 'weak' : 'hit');
    this.hitReact(tgt, crit);
    if (tgt.side === 'ally') {
      this.addEnergy(tgt, 8);
      if (dmg > tgt.maxHp * 0.2) this.chat('hurt', 0.5);
    }
    if (tgt.hp <= 0) this.kill(tgt);
    this.updateUnit(tgt);
  }

  // Skill rank / duplicate multiplier while a member's skill is resolving.
  allyMult() { return this.actingUnit && this.actingUnit.side === 'ally' ? this.actingMult : 1; }

  heal(u, amount) {
    if (!u.alive) return;
    amount *= this.allyMult();
    const healer = this.actingUnit;
    if (healer && healer.mem && healer.mem.def.healBoost) amount *= 1 + healer.mem.v / 100;
    const amt = Math.round(Math.min(amount, u.maxHp - u.hp));
    u.hp += amt;
    this.floatText(u, `+${Math.round(amount)}`, 'heal');
    sfx('heal');
    this.updateUnit(u);
  }

  shield(u, amount, turns) {
    if (!u.alive) return;
    amount *= this.allyMult() * (this.mods.has('fragile') ? 0.5 : 1);
    u.shield = Math.max(u.shield, Math.round(amount));
    u.shieldTurns = Math.max(u.shieldTurns, turns);
    u.shieldSkip = u === this.current;
    sfx('shield');
    this.updateUnit(u);
  }

  addStatus(u, key, val, turns, label) {
    if (!u.alive) return;
    if (['atk', 'focus', 'dr', 'mark', 'paint'].includes(key)) val *= this.allyMult();
    if (key === 'paint') val = Math.round(val);
    const ex = u.statuses.find(s => s.key === key);
    const skip = u === this.current;   // applied during own turn: don't count this turn
    if (ex) { ex.val = Math.max(ex.val, val); ex.turns = Math.max(ex.turns, turns); ex.skip = ex.skip || skip; }
    else u.statuses.push({ key, val, turns, label, skip });
    if (key === 'atk' || key === 'focus') sfx('buff');
    this.updateUnit(u);
  }

  addEnergy(u, n) {
    if (u.side !== 'ally' || !u.alive) return;
    u.energy = Math.min(u.maxEnergy, u.energy + n * (this.mods.has('overcharge') ? 1.4 : 1));
    if (u.energy >= u.maxEnergy) this.coach('ult');
    this.updateUnit(u);
  }

  addHype(n) {
    const was = this.hype;
    this.hype = Math.min(HYPE_MAX, this.hype + n * (this.mods.has('hype') ? 2 : 1));
    if (this.hype >= HYPE_MAX) this.coach('collab');
    this.addViewers(n * 4);
    if (was < HYPE_MAX && this.hype >= HYPE_MAX) this.chat('collab', 1);
    this.updateHud();
  }

  kill(u) {
    u.alive = false; u.statuses = []; u.shield = 0;
    this.fx([u], 'poof');
    u.el.classList.add('dead');
    sfx(u.side === 'ally' ? 'ko' : 'kill');
    if (u.side === 'ally') {
      this.anyKo = true;
      this.say(u, voice(u.id, 'ko'), 2200);
      this.chat('ko', 1);
    } else {
      SAVE.stats.kills++;
      SAVE.dex[u.id] = (SAVE.dex[u.id] || 0) + 1;
      this.chat('kill', 0.5);
      this.addViewers(15);
    }
    if (this.focus === u) this.focus = null;
    this.renderOrder();
  }

  tickStatuses(u) {
    u.statuses = u.statuses.filter(s => {
      if (s.skip) { s.skip = false; return true; }
      return --s.turns > 0;
    });
    if (u.shieldTurns > 0) {
      if (u.shieldSkip) u.shieldSkip = false;
      else if (--u.shieldTurns <= 0) u.shield = 0;
    }
    this.updateUnit(u);
  }

  // ---------- turn flow ----------
  nextActor() {
    const alive = this.living().sort((a, b) => a.av - b.av || (a.side === 'ally' ? -1 : 1));
    const first = alive[0], m = first.av;
    alive.forEach(u => u.av -= m);
    first.av = AV_BASE / this.stat(first, 'spd');
    return first;
  }

  predictOrder(n) {
    const sim = this.living().map(u => ({ u, av: u.av }));
    const out = [];
    for (let i = 0; i < n && sim.length; i++) {
      sim.sort((a, b) => a.av - b.av || (a.u.side === 'ally' ? -1 : 1));
      const f = sim[0], m = f.av;
      out.push(f.u);
      sim.forEach(s => s.av -= m);
      f.av = AV_BASE / this.stat(f.u, 'spd');
    }
    return out;
  }

  async loop() {
    this.chat('start', 1);
    await this.wait(500);
    const opener = pick(this.allies);
    this.say(opener, voice(opener.id, 'battleStart'));
    this.chat('start', 1);
    await this.wait(700);
    while (!this.over) {
      const u = this.nextActor();
      this.current = u;
      this.renderOrder();
      await this.takeTurn(u);
      this.current = null;
      if (!this.over) await this.processUltQueue();
      // Ranked Raid: the run ends when the member turns run out.
      if (!this.over && this.stage.raid && this.allyActions >= RAID_TURNS) { await this.finisher('TIME UP'); this.finish(true); break; }
      if (this.over || await this.checkEnd()) break;
      if (Math.random() < 0.25) this.chat('idle', 1);
    }
  }

  async takeTurn(u) {
    this.markActive(u);
    for (const p of u.statuses.filter(s => s.key === 'paint' || s.key === 'burn')) {
      this.fx([u], p.key === 'burn' ? 'burn' : 'splash');
      this.applyDamage(u, p.val, { dot: true });
      await this.wait(380);
      if (!u.alive) break;
    }
    if (!u.alive) { this.markActive(null); return; }

    if (u.side === 'enemy' && u.broken) {
      // A broken enemy recovers its Stagger at the start of its turn, then acts.
      u.broken = false; u.poise = u.maxPoise;
      u.el.classList.remove('broken');
      this.floatText(u, 'RECOVERED', 'shield');
      this.updateUnit(u);
      await this.wait(450);
    }

    if (u.side === 'ally') {
      u.fuUsed = false;   // Tsuna's follow-up refreshes on her own turn
      const choice = this.auto ? (await this.wait(350), this.autoPick(u)) : await this.playerChoice(u);
      if (this.over) return;
      this.allyActions++;
      await this.doAction(u, choice.key, choice.target);
    } else {
      this.allies.forEach(a => { a.counterUsed = false; });
      await this.enemyTurn(u);
      await this.processFollowUps();
    }
    this.tickStatuses(u);
    this.markActive(null);
    this.updateAll();
    await this.wait(160);
  }

  async checkEnd() {
    if (!this.living('ally').length) { this.finish(false); return true; }
    if (!this.living('enemy').length) {
      if (this.waveIdx < this.stage.waves.length - 1) {
        this.waveIdx++;
        await this.wait(700);
        this.showBanner(`Wave ${this.waveIdx + 1}`);
        this.spawnWave();
        return false;
      }
      await this.finisher();
      this.finish(true);
      return true;
    }
    return false;
  }

  // ---------- player input ----------
  playerChoice(u) {
    return new Promise(res => {
      this.pending = { u, res };
      this.q('.actions').classList.remove('hidden');
      this.updateActions();
      this.select('basic');
      this.playerTurns = (this.playerTurns || 0) + 1;
      if (this.playerTurns === 1) this.coach('basic');
      if (this.playerTurns === 2) this.coach('skill');
    });
  }

  targetsFor(type, u) {
    switch (type) {
      case 'enemy': case 'enemies': return this.living('enemy');
      case 'ally': case 'allies': return this.living('ally');
      default: return [u];
    }
  }

  canUse(key, u) {
    if (key === 'skill') return this.sp >= 1 && !this.hasStatus(u, 'silence');
    if (key === 'ult') return u.energy >= u.maxEnergy;
    if (key === 'collab') return this.hype >= HYPE_MAX;
    return true;
  }

  select(key) {
    const u = this.pending.u;
    if (!this.canUse(key, u)) return;
    this.selected = key;
    this.root.querySelectorAll('.act').forEach(b => b.classList.toggle('sel', b.dataset.act === key));
    if (key === 'collab') {
      this.q('.skill-info').innerHTML = `<b>Collab Stream</b><span>Every member attacks all enemies for 120% ATK. Press again to start!</span><em class="pv-total"></em>`;
      this.markTargets(this.living('enemy'), null);
      this.showPreview(this.previewDamage(u, 'collab'));
      return;
    }
    const sk = u.kit[key];
    this.q('.skill-info').innerHTML = `<b>${sk.name}</b><span>${sk.desc}</span><em class="pv-total"></em>`;
    const valid = this.targetsFor(sk.target, u);
    if (sk.target === 'enemy') {
      if (!this.focus || !this.focus.alive || this.focus.side !== 'enemy') this.focus = valid.find(e => e.boss) || valid[0];
    } else if (sk.target === 'ally') {
      // Healers aim at whoever is hurt most; buffers at the strongest teammate.
      this.focus = sk.fx === 'heal' ? valid.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
        : valid.filter(a => a !== u).sort((a, b) => this.stat(b, 'atk') - this.stat(a, 'atk'))[0] || u;
    }
    const single = sk.target === 'enemy' || sk.target === 'ally';
    this.markTargets(valid, single ? this.focus : null);
    this.showPreview(this.previewDamage(u, key, this.focus));
  }

  markTargets(valid, focus) {
    this.all().forEach(x => {
      x.el.classList.toggle('targetable', valid.includes(x));
      x.el.classList.toggle('targeted', focus ? x === focus : valid.includes(x));
    });
  }

  onAct(key) {
    if (!this.pending) return;
    const u = this.pending.u;
    if (!this.canUse(key, u)) return;
    if (key !== this.selected) return this.select(key);
    if (key === 'collab') return this.resolveChoice({ key });
    const type = u.kit[key].target;
    this.resolveChoice({ key, target: type === 'enemy' || type === 'ally' ? this.focus : null });
  }

  onUnitClick(t) {
    if (!this.pending || !this.selected) return;
    const u = this.pending.u;
    if (this.selected === 'collab') { if (t.side === 'enemy') this.resolveChoice({ key: 'collab' }); return; }
    const type = u.kit[this.selected].target;
    if (!this.targetsFor(type, u).includes(t)) return;
    this.focus = t;
    this.resolveChoice({ key: this.selected, target: type === 'enemy' || type === 'ally' ? t : null });
  }

  resolveChoice(choice) {
    const p = this.pending;
    if (!p) return;
    this.pending = null; this.selected = null;
    this.clearPreview();
    this.all().forEach(x => x.el.classList.remove('targetable', 'targeted'));
    this.q('.actions').classList.add('hidden');
    p.res(choice);
  }

  autoPick(u) {
    const enemies = this.living('enemy'), allies = this.living('ally');
    // Prefer an enemy this member hits on its weakness and is close to Breaking
    // (a charging boss first), then the one with the least HP.
    const score = e => (this.isWeak(u, e) ? 0 : 1000) + (e.charging && !e.broken ? -1500 : 0) + (e.broken ? 300 : e.poise) + e.hp / e.maxHp * 100;
    const lowest = enemies.slice().sort((a, b) => score(a) - score(b))[0];
    const boss = enemies.find(e => e.boss);
    if (this.hype >= HYPE_MAX) return { key: 'collab' };
    if (u.energy >= u.maxEnergy) return { key: 'ult', target: u.kit.ult.target === 'enemy' ? (boss || lowest) : null };
    let useSkill = this.sp >= 1, target = lowest;
    if (u.id === 'hinano') useSkill = this.sp >= 1 && (allies.some(a => a.shield <= 0) || enemies.some(e => e.charging));
    if (u.id === 'sendo') {
      target = allies.filter(a => a !== u).sort((a, b) => this.stat(b, 'atk') - this.stat(a, 'atk'))[0] || u;
      useSkill = this.sp >= 2 && !this.hasStatus(target, 'atk');
    }
    if (u.id === 'lisa') {
      target = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      useSkill = this.sp >= 1 && (target.hp < target.maxHp * 0.6 || this.hasStatus(target, 'silence'));
      if (!useSkill) return { key: 'basic', target: lowest };
    }
    if (u.id === 'tsuna') useSkill = this.sp >= 1 && (enemies.length >= 2 || !enemies.some(e => this.hasStatus(e, 'paint')));
    if (this.hasStatus(u, 'silence')) useSkill = false;
    if (useSkill) return { key: 'skill', target };
    return { key: 'basic', target: lowest };
  }

  // ---------- actions ----------
  resolveTargets(type, u, target) {
    if (type === 'enemy') return [target && target.alive ? target : this.living('enemy')[0]];
    if (type === 'ally') return [target && target.alive ? target : u];
    if (type === 'self') return [u];
    return this.targetsFor(type, u);
  }

  async doAction(u, key, target) {
    if (key === 'collab') return this.collab();
    if (!this.living('enemy').length) return;
    const sk = u.kit[key];
    const offensive = sk.target.startsWith('enem');
    if (key === 'basic') this.sp = Math.min(this.spMax, this.sp + 1);
    if (key === 'skill') { this.sp--; this.skillPop(u, sk.name); }
    this.updateHud();
    if (key === 'ult') {
      u.energy = 0; this.updateUnit(u);
      this.chat('ult', 1); this.addViewers(40);
      bumpDaily('ults');
      SAVE.stats.ults++;
      sfx('ult');
      if (SAVE.settings.cutins !== 'off') await this.cutIn(u, sk);
      this.root.style.setProperty('--uc', u.def.color);
      this.root.classList.add('ult-on');
    }
    const targets = this.resolveTargets(sk.target, u, target);
    const cut = SAVE.settings.cutins;
    if ((key === 'skill' && cut === 'full') || (key === 'ult' && cut !== 'off')) await this.actionShot(u, key);
    if (offensive) this.camera(targets);
    await this.attackAnim(u, targets, offensive);
    const sig = SIG_FX[u.id];
    if (sig && sig.snd) sfx(sig.snd);
    if (sig && sig.proj && key === 'basic' && offensive) await this.projectile(u, targets[0], sig.proj);
    if (sig && sig.fx) this.fx(targets, sig.fx);
    if (key === 'ult') this.flash();
    this.fx(targets, key === 'ult' && sk.fx !== 'splash' ? 'big' : sk.fx);
    this.actingKey = key; this.actingUnit = u; this.actingMult = u.power[key];
    if (this.nextBoost && offensive) { this.actingMult *= this.nextBoost; this.nextBoost = null; }
    this.actingStagger = STAGGER[key] * (targets.length > 1 ? 0.6 : 1);
    this.combo = { hits: 0, dmg: 0 };
    await sk.run(this, u, sk.target === 'enemy' || sk.target === 'ally' || sk.target === 'self' ? targets[0] : targets);
    this.showCombo();
    this.actingKey = null; this.actingUnit = null; this.actingStagger = null;
    this.root.classList.remove('ult-on');
    if (u.mem && u.mem.def.afterAction) u.mem.def.afterAction(this, u, key, targets, u.mem.v);
    if (key === 'ult') u.energy = ENERGY_GAIN.ult; else this.addEnergy(u, ENERGY_GAIN[key]);
    this.addHype(key === 'ult' ? 12 : key === 'skill' ? 8 : 5);
    // Tsuna's talent: when another member's Skill/Ultimate hits a Painted enemy, she splashes it.
    const tsuna = this.allies.find(a => a.id === 'tsuna' && a.alive);
    if (tsuna && u !== tsuna && !tsuna.fuUsed && (key === 'skill' || key === 'ult') && offensive) {
      const painted = targets.find(t => t && t.alive && this.hasStatus(t, 'paint'));
      if (painted) { tsuna.fuUsed = true; this.followQueue.push({ u: tsuna, target: painted, mult: 0.7, label: 'Splash Back' }); }
    }
    this.updateAll();
    await this.processFollowUps();
    await this.wait(340);
  }

  async collab() {
    this.hype = 0; this.updateHud();
    SAVE.stats.collabs++; persist();
    this.chat('collab', 1); this.chat('collab', 1);
    this.addViewers(120);
    const team = this.living('ally');
    const c = this.q('.cutin');
    c.style.setProperty('--dur', 1500 / this.speed + 'ms');
    c.innerHTML = `<div class="ci-dim"></div><div class="ci-band" style="--c:#ffd36b"></div>
      <div class="ci-team">${team.map((u, i) => `<div class="ci-bust" style="${bustStyle(u.id)};animation-delay:${i * 90 / this.speed}ms"></div>`).join('')}</div>
      <div class="ci-text center"><small>ALL MEMBERS</small><b>COLLAB STREAM!</b></div>`;
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    await this.wait(1500);
    c.classList.remove('show');
    for (const u of team) {
      if (!this.living('enemy').length) break;
      await this.attackAnim(u, this.living('enemy'), true);
      this.fx(this.living('enemy'), 'burst');
      this.actingStagger = STAGGER.collab * 0.6;
      this.living('enemy').forEach(e => this.hit(u, e, 1.2));
      this.actingStagger = null;
      await this.wait(200);
    }
    await this.processFollowUps();
    this.flash();
    this.screenShake();
    await this.wait(500);
  }

  async enemyTurn(e) {
    if (!this.living('ally').length) return;
    const ai = e.def.ai || 'basic';
    if (ai === 'phantom') return this.bossTurn(e);
    if (ai === 'core') return this.coreTurn(e);
    if (ai === 'algorithm') return this.algorithmTurn(e);
    if (ai === 'troll' && e.turns++ % 2 === 1) {
      const targets = this.living('ally');
      this.showBanner('Flame bait!', 'danger');
      await this.attackAnim(e, targets, true);
      this.fx(targets, 'splash');
      targets.forEach(t => this.hit(e, t, 0.75));
      await this.wait(500);
      return;
    }
    if (ai === 'clipper') {
      const t = this.living('ally').slice().sort((a, b) => b.energy - a.energy)[0];
      await this.attackAnim(e, [t], true);
      this.fx([t], 'slash');
      this.hit(e, t, 1.0);
      if (t.alive && t.energy > 0) {
        const stolen = Math.min(25, t.energy);
        t.energy -= stolen;
        this.floatText(t, `-${stolen} EN`, 'drain');
        this.updateUnit(t);
      }
      await this.wait(450);
      return;
    }
    if (ai === 'healer') {
      const hurt = this.living('enemy').filter(x => x.hp < x.maxHp * 0.7).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) {
        await this.attackAnim(e, [hurt], false);
        this.fx([hurt], 'heal');
        this.heal(hurt, hurt.maxHp * 0.18);
        await this.wait(450);
        return;
      }
    }
    if (ai === 'guard' && e.turns++ % 2 === 0) {
      const team = this.living('enemy');
      await this.attackAnim(e, team, false);
      this.fx(team, 'shield');
      team.forEach(x => this.addStatus(x, 'dr', 0.25, 2, 'DMG↓'));
      this.showBanner('Firewall up! Enemy DMG taken down');
      await this.wait(500);
      return;
    }
    const mult = { sniper: 1.5, drain: 1.0, guard: 1.0, healer: 0.9, clipper: 1.1 }[ai] || 1.2;
    const t = this.pickTarget(ai === 'sniper');
    await this.attackAnim(e, [t], true);
    this.fx([t], ai === 'sniper' ? 'shot' : 'slash');
    this.hit(e, t, mult);
    if (ai === 'drain' && this.sp > 0) {
      this.sp--;
      this.floatText(t, '-1 SP', 'drain');
      this.updateHud();
    }
    await this.wait(450);
  }

  pickTarget(preferLow) {
    const al = this.living('ally');
    // Taunt draws most single-target attacks, but not all of them.
    const taunt = al.find(a => this.hasStatus(a, 'taunt'));
    if (taunt && Math.random() < 0.65) return taunt;
    if (preferLow) return al.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const weights = al.map(a => a.def.role === 'Tank' ? 2 : 1);
    let r = Math.random() * weights.reduce((x, y) => x + y, 0);
    for (let i = 0; i < al.length; i++) { r -= weights[i]; if (r <= 0) return al[i]; }
    return al[0];
  }

  // What an enemy will do on its next turn (shown above it).
  intentFor(e) {
    const pat = BOSS_PATTERNS[e.def.ai];
    if (pat) {
      const name = pat[e.turns % pat.length];
      const kind = /Storm|Meltdown|Surge/.test(name) ? 'aoe' : name === 'Charge' ? 'charge' : /Firewall|Trend/.test(name) ? 'buff' : /Shadowban/.test(name) ? 'debuff' : 'atk';
      return { kind, label: name === 'Charge' ? 'Charging a big attack' : name };
    }
    switch (e.def.ai) {
      case 'sniper': return { kind: 'snipe', label: 'Snipe the weakest member' };
      case 'healer': return this.living('enemy').some(x => x.hp < x.maxHp * 0.7) ? { kind: 'heal', label: 'Heal an ally' } : { kind: 'atk', label: 'Attack' };
      case 'guard': return e.turns % 2 === 0 ? { kind: 'buff', label: 'Firewall: team DMG↓' } : { kind: 'atk', label: 'Attack' };
      case 'drain': return { kind: 'drain', label: 'Attack and steal 1 SP' };
      case 'troll': return e.turns % 2 === 1 ? { kind: 'aoe', label: 'Flame bait: hits ALL' } : { kind: 'atk', label: 'Attack' };
      case 'clipper': return { kind: 'drain', label: 'Attack and steal 25 Energy' };
      default: return { kind: 'atk', label: 'Attack' };
    }
  }

  setIntent(e) {
    const pat = BOSS_PATTERNS[e.def.ai];
    if (pat) e.intent = pat[e.turns % pat.length];
    this.updateUnit(e);
  }

  // Phantom pattern: Slash, Slash, Charge, Crimson Storm (AoE). Enrages at 50% HP.
  // Final phase at 25% HP: a big shield, tougher Stagger and harder hits. Uses the boss's turn.
  async bossFinalPhase(e, title) {
    e.phase = 3;
    e.enrage = (e.enrage || 1) * 1.15;
    e.maxPoise = Math.round(e.maxPoise * 1.4); e.poise = e.maxPoise; e.broken = false;
    e.el.classList.remove('broken');
    e.el.classList.add('final-phase');
    this.q('.boss-bar').classList.add('final');
    this.showBanner(`FINAL PHASE · ${title}`, 'danger');
    this.flash('red');
    this.screenShake(16);
    sfx('phase');
    this.chat('boss', 1); this.chat('boss', 1);
    await this.wait(700);
    this.fx([e], 'shield');
    this.shield(e, e.maxHp * 0.15, 3);
    this.updateUnit(e);
    await this.wait(900);
  }

  async bossTurn(e) {
    if (e.phase === 2 && e.hp < e.maxHp * 0.25) return this.bossFinalPhase(e, 'Crimson Eclipse');
    if (e.phase === 1 && e.hp < e.maxHp * 0.5) {
      e.phase = 2; e.enrage = 1.3;
      e.el.classList.add('enraged');
      this.showBanner('The Phantom is ENRAGED! ATK up', 'danger');
      this.screenShake();
      this.chat('boss', 1);
      await this.wait(900);
      if (this.living('enemy').length < 3) { this.summon('grunt'); this.summon('sniper'); }
      await this.wait(600);
      return;
    }
    const step = e.turns++ % 4;
    if (step === 2) {
      e.charging = true; e.el.classList.add('charging');
      this.showBanner('Crimson Storm is charging! Shield up!', 'danger');
      this.chat('boss', 1);
      this.setIntent(e);
      await this.wait(1100);
      return;
    }
    if (step === 3) {
      e.charging = false; e.el.classList.remove('charging');
      this.showBanner('CRIMSON STORM', 'danger');
      const targets = this.living('ally');
      await this.attackAnim(e, targets, true);
      this.flash('red');
      this.screenShake();
      this.fx(targets, 'slash');
      targets.forEach(t => this.hit(e, t, 1.3));
      this.setIntent(e);
      await this.wait(600);
      return;
    }
    const t = this.pickTarget(false);
    await this.attackAnim(e, [t], true);
    this.fx([t], 'slash');
    this.hit(e, t, 1.8);
    this.setIntent(e);
    await this.wait(450);
  }

  // Glitch Core pattern: Beam, Firewall (shield + summon), Beam, Charge, Meltdown (AoE).
  // Overclocks at 50% HP: faster and stronger.
  async coreTurn(e) {
    if (e.phase === 2 && e.hp < e.maxHp * 0.25) {
      await this.bossFinalPhase(e, 'Critical Overload');
      if (this.living('enemy').length < 3) this.summon('firewall');
      return;
    }
    if (e.phase === 1 && e.hp < e.maxHp * 0.5) {
      e.phase = 2; e.enrage = 1.25; e.spd += 20;
      e.el.classList.add('enraged');
      this.showBanner('Glitch Core OVERCLOCKED! SPD and ATK up', 'danger');
      this.screenShake();
      this.chat('boss', 1);
      await this.wait(1000);
      return;
    }
    const step = e.turns++ % 5;
    if (step === 1) {
      await this.attackAnim(e, [e], false);
      this.shield(e, e.maxHp * 0.12, 3);
      this.fx([e], 'shield');
      this.showBanner('Core Firewall! Break the shield!', 'danger');
      if (this.living('enemy').length < 3) this.summon(['spammer', 'desync', 'grunt'][Math.floor(Math.random() * 3)]);
      this.setIntent(e);
      await this.wait(900);
      return;
    }
    if (step === 3) {
      e.charging = true; e.el.classList.add('charging');
      this.showBanner('Meltdown is charging! Shield up!', 'danger');
      this.chat('boss', 1);
      this.setIntent(e);
      await this.wait(1100);
      return;
    }
    if (step === 4) {
      e.charging = false; e.el.classList.remove('charging');
      this.showBanner('MELTDOWN', 'danger');
      const targets = this.living('ally');
      await this.attackAnim(e, targets, true);
      this.flash('red');
      this.screenShake(14);
      this.fx(targets, 'burst');
      targets.forEach(t => this.hit(e, t, 1.4));
      this.setIntent(e);
      await this.wait(650);
      return;
    }
    const t = this.pickTarget(false);
    await this.attackAnim(e, [t], true);
    this.fx([t], 'shot');
    this.hit(e, t, 1.5);
    this.setIntent(e);
    await this.wait(450);
  }

  // The Algorithm: Recommend, Shadowban (silences 2 members), Trend Shift
  // (takes 40% less damage), Charge, Viral Surge (AoE). Splits off Echoes at 50% HP.
  async algorithmTurn(e) {
    if (e.phase === 2 && e.hp < e.maxHp * 0.25) {
      await this.bossFinalPhase(e, 'Trending #1');
      if (this.living('enemy').length < 3) this.summon('echo');
      return;
    }
    if (e.phase === 1 && e.hp < e.maxHp * 0.5) {
      e.phase = 2; e.enrage = 1.2;
      e.el.classList.add('enraged');
      this.showBanner('The Algorithm is going viral! Echoes split off', 'danger');
      this.screenShake();
      this.chat('boss', 1);
      await this.wait(900);
      if (this.living('enemy').length < 3) { this.summon('echo'); this.summon('echo'); }
      await this.wait(600);
      return;
    }
    const step = e.turns++ % 5;
    const allies = this.living('ally');
    if (step === 1) {
      const picks = allies.slice().sort(() => Math.random() - 0.5).slice(0, 2);
      this.showBanner('Shadowban! Silenced members can\'t use Skills', 'danger');
      await this.attackAnim(e, picks, true);
      this.fx(picks, 'burst');
      picks.forEach(t => { this.hit(e, t, 0.8); this.addStatus(t, 'silence', 1, 2, 'SILENCE'); });
    } else if (step === 2) {
      await this.attackAnim(e, [e], false);
      this.fx([e], 'shield');
      e.statuses = e.statuses.filter(s => s.key !== 'mark' && s.key !== 'paint');
      this.addStatus(e, 'dr', 0.4, 2, 'DMG↓');
      this.showBanner('Trend Shift! It shrugs off damage for 2 turns', 'danger');
    } else if (step === 3) {
      e.charging = true; e.el.classList.add('charging');
      this.showBanner('Viral Surge is charging! Shield up!', 'danger');
      this.chat('boss', 1);
    } else if (step === 4) {
      e.charging = false; e.el.classList.remove('charging');
      this.showBanner('VIRAL SURGE', 'danger');
      await this.attackAnim(e, allies, true);
      this.flash('red');
      this.screenShake(14);
      this.fx(allies, 'burst');
      allies.forEach(t => this.hit(e, t, 1.5));
    } else {
      const t = this.pickTarget(false);
      await this.attackAnim(e, [t], true);
      this.fx([t], 'shot');
      this.hit(e, t, 1.5);
    }
    this.setIntent(e);
    await this.wait(step === 3 ? 1100 : 550);
  }

  finish(win) {
    this.over = true; this.won = win;
    SAVE.stats.battles++;
    this.chat(win ? 'win' : 'lose', 1);
    this.chat(win ? 'win' : 'lose', 1);
    sfx(win ? 'win' : 'lose');
    if (win && typeof playMusic === 'function') playMusic('victory');
    if (win) bumpDaily('wins');
    if (win) SAVE.stats.wins++;
    // Bond XP for everyone who fought and won.
    const bondUps = win ? this.allies.map(a => addBondXp(a.id, BOND_WIN_XP)).filter(Boolean) : [];
    let rewardHtml = '';
    if (this.stage.raid) {
      // Ranked Raid: always scores, win or lose. Killing the boss adds 20%.
      const bossDown = !this.living('enemy').some(e => e.boss) && this.waveIdx === this.stage.waves.length - 1;
      const dmg = this.allies.reduce((a, u) => a + u.dmgDealt, 0);
      const score = Math.round(dmg * (bossDown ? 1.2 : 1));
      const r = raidResult(score);
      this.won = win = true;
      rewardHtml = `<div class="raid-score"><small>RAID SCORE</small><b>${score.toLocaleString()}</b>
          ${r.newBest ? '<em>NEW WEEKLY BEST</em>' : `<span>Weekly best ${r.best.toLocaleString()}</span>`}</div>
        ${r.label ? `<div class="rewards"><div class="first">TIER REWARDS</div>${r.label}</div>` : ''}`;
    } else if (win && this.stage.event) {
      rewardHtml = eventStageResult(this.stage);
    } else if (win && this.stage.daily) {
      rewardHtml = dailyStageResult(this.stage);
    } else if (win && this.stage.tower) {
      // Tower: first clear of a floor pays its reward; replays only give XP.
      const first = this.stage.floor > SAVE.tower.best;
      if (first) SAVE.tower.best = this.stage.floor;
      bumpDaily('farm');
      const label = first ? giveReward(this.stage.reward) : '';
      const xp = 15 + this.stage.level * 10;
      const ranks = addPlayerXp(xp);
      rewardHtml = `<div class="rewards">${first ? `<div class="first">FLOOR ${this.stage.floor} CLEARED</div>` : '<div class="first">ALREADY CLEARED</div>'}
        ${label ? `<span class="coin">${label}</span>` : ''}<span class="xp">+${xp} XP</span></div>
        ${ranks ? `<div class="rank-up">RANK UP! Rank ${SAVE.player.rank} · ${amt('gem', ranks * RANK_UP_GEMS)}</div>` : ''}`;
    } else if (win) {
      const id = this.stage.id, first = !SAVE.cleared[id];
      const got = [true, !this.anyKo, this.allyActions <= this.stage.turns];
      const prev = SAVE.stars[id] || [false, false, false];
      const newStars = got.filter((g, i) => g && !prev[i]).length;
      SAVE.stars[id] = prev.map((p, i) => p || got[i]);
      const gems = Math.round(this.stage.reward.gems * (first ? 1 : REPLAY_REWARD)) + newStars * STAR_GEMS;
      const exp = Math.round(this.stage.reward.exp * (first ? 1 : REPLAY_EXP));
      SAVE.gems += gems; SAVE.exp += exp; SAVE.cleared[id] = true;
      const xp = 20 + this.stage.level * 15;
      const ranks = addPlayerXp(xp);
      rewardHtml = `<div class="objectives">${stageObjectives(this.stage).map((t, i) =>
          `<div class="obj ${got[i] ? 'ok' : ''}"><span>★</span>${t}${got[i] && !prev[i] ? ' <em>NEW</em>' : ''}</div>`).join('')}</div>
        <div class="rewards">${first ? '<div class="first">FIRST CLEAR</div>' : ''}
        <span class="gem">${amt('gem', gems)}</span><span class="tok">${amt('token', exp)}</span><span class="xp">+${xp} XP</span></div>
        ${ranks ? `<div class="rank-up">RANK UP! Rank ${SAVE.player.rank} · ${amt('gem', ranks * RANK_UP_GEMS)}</div>` : ''}`;
    }
    if (!win && !this.stage.raid) rewardHtml = `<div class="tips"><b>How to win next time</b>${this.defeatTips().map(t => `<p>${t}</p>`).join('')}</div>`;
    if (bondUps.length) rewardHtml += `<div class="bond-up">${bondUps.map(b => `${ic('heart')} ${CHARACTERS[b.id].short} bond Lv ${b.lvl}!`).join(' · ')}</div>`;
    persist();
    // MVP: the member who dealt the most damage (or the last one standing on a loss).
    const mvp = this.allies.slice().sort((a, b) => b.dmgDealt - a.dmgDealt)[0];
    const end = this.q('.end');
    end.innerHTML = `
      <div class="end-mvp" style="--c:${mvp.def.color}">
        <img src="${ART[mvp.id].url}" alt="">
        <div class="end-quote"><em>${win ? 'MVP' : ''} ${mvp.def.short}</em>${voice(mvp.id, win ? 'victory' : 'ko')}</div>
      </div>
      <div class="end-box ${win ? 'win' : 'lose'}">
        <h1>${this.stage.raid ? 'RAID OVER' : win ? 'VICTORY' : 'DEFEAT'}</h1>
        <p>${win ? `Peak viewers: ${this.viewers.toLocaleString()}` : 'Level up your members, equip Memories, then try again.'}</p>
        ${rewardHtml}
        <div class="dmg-chart">${this.allies.map(a => `<div><span>${a.def.short}</span><i style="width:${Math.max(2, a.dmgDealt / Math.max(1, mvp.dmgDealt) * 100)}%;background:${a.def.color}"></i><b>${a.dmgDealt}</b></div>`).join('')}</div>
        <div class="end-btns"><button class="btn retry">Retry</button><button class="btn ${win && nextStageOf(this.stage) ? '' : 'primary'} back">Continue</button>
          ${win && nextStageOf(this.stage) ? `<button class="btn primary next">Next ${ic('play')}</button>` : ''}</div>
      </div>`;
    end.classList.remove('hidden');
    end.querySelector('.retry').onclick = () => this.exit('retry');
    end.querySelector('.back').onclick = () => this.exit('back');
    const nx = end.querySelector('.next');
    if (nx) nx.onclick = () => this.exit('next');
  }

  // Suggestions shown after a loss.
  defeatTips() {
    const out = [], team = this.allies;
    const avg = Math.round(team.reduce((a, u) => a + u.lvl, 0) / team.length), rec = recLevel(this.stage.level);
    if (avg < rec) out.push(`Your team averages <b>Lv ${avg}</b>; <b>Lv ${rec}</b> is recommended. Level up on the Members screen.`);
    const weak = [...new Set(this.stage.waves.flat().flatMap(k => ENEMIES[k].weak || []))];
    if (weak.filter(w => team.some(u => u.def.element === w)).length < Math.min(2, weak.length)) {
      out.push(`Enemies here are weak to ${weak.map(w => `${elIc(w)} ${ELEMENTS[w].name}`).join(', ')}. Bring those elements to Break them faster.`);
    }
    if (!team.some(u => u.def.role === 'Tank' || u.def.role === 'Support')) out.push('Bring a Tank or a Support: shields and heals keep your damage dealers alive.');
    if (team.some(u => !u.mem)) out.push('Equip a Memory on every member for extra stats and passives.');
    if (team.length < 4) out.push('Fill all 4 team slots.');
    out.push('Break enemies before big attacks: a Break cancels a boss\'s charged attack.');
    return out.slice(0, 3);
  }

  // ---------- pause ----------
  pause() {
    if (this.over || this.paused) return;
    this.paused = true;
    this.renderPause();
  }

  renderPause() {
    const m = this.q('.pause-menu'), cut = SAVE.settings.cutins;
    m.innerHTML = `<div class="pm-box">
      <h2>PAUSED</h2><small>${this.stage.id} · ${this.stage.name}</small>
      <div class="pm-row"><span>Battle speed</span><div class="seg">${[1, 2, 3].map(s => `<button data-spd="${s}" class="${this.speed === s ? 'sel' : ''}">x${s}</button>`).join('')}</div></div>
      <div class="pm-row"><span>Auto battle</span><button class="toggle ${this.auto ? 'on' : ''}" data-pm="auto"><i></i></button></div>
      <div class="pm-row"><span>Ultimate animation</span><div class="seg">${[['full', 'Full'], ['short', 'Short'], ['off', 'Off']].map(([v, l]) => `<button data-cut="${v}" class="${cut === v ? 'sel' : ''}">${l}</button>`).join('')}</div></div>
      <div class="pm-keys"><kbd>Q</kbd> Basic <kbd>E</kbd> Skill <kbd>R</kbd> Ultimate <kbd>1-4</kbd> Member Ultimate <kbd>C</kbd> Collab <kbd>Esc</kbd> Pause</div>
      <div class="pm-btns"><button class="pill yellow pm-resume">${ic('play')} Resume</button><button class="pill dark pm-help">${ic('info')} How to play</button>
        <button class="pill dark pm-retry">${ic('replay')} Retry</button><button class="pill dark pm-quit">${ic('close')} Retreat</button></div>
    </div>`;
    m.classList.remove('hidden');
    m.querySelectorAll('[data-spd]').forEach(b => b.onclick = () => {
      this.speed = BATTLE_PREFS.speed = Number(b.dataset.spd); saveBattlePrefs();
      this.q('.spd').textContent = 'x' + this.speed; this.renderPause();
    });
    m.querySelector('[data-pm="auto"]').onclick = () => { this.q('.auto').click(); this.renderPause(); };
    m.querySelectorAll('[data-cut]').forEach(b => b.onclick = () => { SAVE.settings.cutins = b.dataset.cut; persist(); this.renderPause(); });
    m.querySelector('.pm-resume').onclick = () => this.resume();
    m.querySelector('.pm-help').onclick = () => openHelp('battle');
    m.querySelector('.pm-retry').onclick = () => { this.paused = false; this.exit('retry'); };
    const quit = m.querySelector('.pm-quit');
    quit.onclick = () => {
      if (!quit.classList.contains('armed')) { quit.classList.add('armed'); quit.innerHTML = `${ic('close')} Tap again to retreat`; return; }
      this.paused = false; this.exit('back');
    };
  }

  resume() {
    this.paused = false;
    this.q('.pause-menu').classList.add('hidden');
  }

  // Slow-motion beat on the last hit before the results.
  async finisher(label = 'FINISH!') {
    this.root.classList.add('finisher');
    this.showBanner(label, 'finish');
    sfx('finish');
    await this.wait(950);
    this.root.classList.remove('finisher');
  }

  // ---------- damage preview ----------
  // Expected (non-crit) damage of one hit, mirroring hit().
  estimate(src, key, tgt, mult, defScale = 0) {
    let base = this.stat(src, 'atk') * mult + this.stat(src, 'def') * defScale;
    if (src.mem && src.mem.def.ultDmg && key === 'ult') base *= 1 + src.mem.v / 100;
    if (src.mem && src.mem.def.skillDmg && key === 'skill') base *= 1 + src.mem.v / 100;
    if (key && key !== 'collab') base *= src.power[key] * (this.nextBoost || 1);
    let dmg = base * (DEF_K_ENEMY / (DEF_K_ENEMY + this.stat(tgt, 'def')));
    dmg *= Math.max(0.1, 1 + this.sumStatus(tgt, 'mark') - this.sumStatus(tgt, 'dr'));
    if (tgt.broken) dmg *= this.mods.has('breaker') ? BREAK_DMG + 0.25 : BREAK_DMG;
    if (this.mods.has('glass')) dmg *= 1.3;
    if (this.isWeak(src, tgt)) dmg *= WEAK_DMG;
    return Math.round(dmg);
  }

  // Map of enemy -> expected damage for an action aimed at focus.
  previewDamage(u, key, focus) {
    const out = new Map(), en = this.living('enemy');
    if (key === 'collab') {
      en.forEach(e => out.set(e, this.living('ally').reduce((a, m) => a + this.estimate(m, 'collab', e, 1.2), 0)));
      return out;
    }
    const pv = u.kit[key] && u.kit[key].pv;
    if (!pv) return out;
    if (pv.a) en.forEach(e => out.set(e, this.estimate(u, key, e, pv.a)));
    if (pv.t && focus && focus.alive && focus.side === 'enemy') out.set(focus, this.estimate(u, key, focus, pv.t * (focus.broken && pv.tb ? pv.tb : 1), pv.d || 0));
    if (pv.o) en.filter(e => e !== focus).forEach(e => out.set(e, this.estimate(u, key, e, pv.o)));
    return out;
  }

  showPreview(map) {
    this.living('enemy').forEach(e => { e.pvDmg = map.get(e) || 0; this.updateUnit(e); });
    const vals = [...map.values()];
    const info = this.q('.skill-info .pv-total');
    if (info) info.innerHTML = vals.length ? `≈ <b>${Math.max(...vals).toLocaleString()}</b> DMG${vals.length > 1 ? ' (max per enemy)' : ''}` : '';
  }

  clearPreview() { this.enemies.forEach(e => { if (e.pvDmg) { e.pvDmg = 0; this.updateUnit(e); } }); }

  // Hovering an enemy while picking a single-target attack previews it there.
  hoverTarget(t) {
    if (!this.pending || !this.selected || this.selected === 'collab') return;
    const u = this.pending.u, sk = u.kit[this.selected];
    if (sk.target !== 'enemy' || !t.alive) return;
    this.focus = t;
    this.markTargets(this.targetsFor('enemy', u), t);
    this.showPreview(this.previewDamage(u, this.selected, t));
  }

  exit(reason) {
    this.over = true;
    document.removeEventListener('keydown', this.keyHandler);
    if (this.pending) { const p = this.pending; this.pending = null; p.res({ key: 'basic' }); }
    this.onExit(reason, !!this.won);
  }

  // ---------- animation ----------
  // The member's full art sweeps across the screen before a Skill or Ultimate lands.
  async actionShot(u, key) {
    const el = document.createElement('div');
    el.className = `action-shot ${key}`;
    el.style.setProperty('--c', u.def.color);
    el.style.setProperty('--dur', (key === 'ult' ? 900 : 700) / this.speed + 'ms');
    el.innerHTML = `<i class="as-dim"></i><i class="as-streaks"></i><i class="as-band"></i><img src="${ART[u.id].url}" alt="">
      <div class="as-name"><em>${key === 'ult' ? 'ULTIMATE' : 'SKILL'} · ${u.def.short.toUpperCase()}</em><b>${u.kit[key].name}</b></div>`;
    this.q('.fx-layer').appendChild(el);
    setTimeout(() => el.remove(), (key === 'ult' ? 950 : 750) / this.speed);
    await this.wait(key === 'ult' ? 420 : 340);
  }

  // Camera punch toward the target(s).
  camera(targets) {
    const row = this.q('.enemy-row'), t = targets[0];
    if (!row || !t || !t.el) return;
    const r = row.getBoundingClientRect(), tr = t.el.getBoundingClientRect();
    const dx = targets.length > 1 ? 0 : (r.left + r.width / 2 - (tr.left + tr.width / 2)) * 0.12;
    row.animate([{ transform: 'none' }, { transform: `translateX(${dx}px) scale(1.07)`, offset: 0.35 }, { transform: 'none' }],
      { duration: 900 / this.speed, easing: 'cubic-bezier(.2,.8,.3,1)' });
  }

  // Brief freeze on big hits.
  hitStop(ms = 90) {
    if (this.stopping) return;
    this.stopping = true;
    this.root.classList.add('hitstop');
    setTimeout(() => { this.root.classList.remove('hitstop'); this.stopping = false; }, ms / Math.max(1, this.speed * 0.7));
  }

  showCombo() {
    const c = this.combo;
    this.combo = null;
    if (!c || c.hits < 2) return;
    SAVE.stats.bestCombo = Math.max(SAVE.stats.bestCombo, c.hits);
    const el = this.q('.combo');
    el.querySelector('b').textContent = `${c.hits} HITS`;
    el.querySelector('span').textContent = `${c.dmg.toLocaleString()} DMG`;
    el.classList.remove('hidden');
    el.animate([{ opacity: 0, transform: 'translateX(-30px) skewX(-8deg)' }, { opacity: 1, transform: 'none', offset: 0.15 },
      { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1400 / this.speed });
    clearTimeout(this.comboT);
    this.comboT = setTimeout(() => el.classList.add('hidden'), 1400 / this.speed);
  }

  // Ring that sweeps across a row on area attacks.
  shockwave(side) {
    const row = this.q(side === 'ally' ? '.ally-row' : '.enemy-row');
    if (!row) return;
    const r = row.getBoundingClientRect(), root = this.root.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `shockwave ${side}`;
    el.style.left = (r.left - root.left + r.width / 2) + 'px';
    el.style.top = (r.top - root.top + r.height * 0.55) + 'px';
    el.style.setProperty('--dur', 700 / this.speed + 'ms');
    this.q('.fx-layer').appendChild(el);
    setTimeout(() => el.remove(), 750 / this.speed);
  }

  async attackAnim(u, targets, offensive) {
    const el = u.el.querySelector('.sprite');
    // Enemies wind up (glow and swell) before they strike.
    if (u.side === 'enemy' && offensive) {
      const windup = el.animate([{ filter: 'none', transform: 'none' }, { filter: 'brightness(1.6) drop-shadow(0 0 24px #ff2a4a)', transform: 'scale(1.08)' }],
        { duration: 260 / this.speed, fill: 'forwards' });
      await this.wait(260);
      windup.cancel();
      if (targets.length > 1) this.shockwave(targets[0].side);
    } else if (u.side === 'ally' && offensive && targets.length > 1) this.shockwave('enemy');
    if (offensive && targets[0]) {
      const a = u.el.getBoundingClientRect();
      const tr = targets.length > 1 ? this.q(targets[0].side === 'enemy' ? '.enemy-row' : '.ally-row').getBoundingClientRect()
                                    : targets[0].el.getBoundingClientRect();
      const k = u.boss ? 0.25 : 0.4;
      const dx = (tr.left + tr.width / 2 - (a.left + a.width / 2)) * k;
      const dy = (tr.top + tr.height / 2 - (a.top + a.height / 2)) * k;
      if (u.side === 'ally') setTimeout(() => this.afterimage(u, dx, dy), 120 / this.speed);
      el.animate([
        { transform: 'none' },
        { transform: `translate(${dx * -0.1}px, ${dy * -0.1}px) scale(.96)`, offset: 0.2 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.1)`, offset: 0.5 },
        { transform: 'none' },
      ], { duration: 650 / this.speed, easing: 'cubic-bezier(.3,.7,.3,1)' });
      await this.wait(320);
    } else {
      el.animate([
        { transform: 'none', filter: 'none' },
        { transform: 'translateY(-16px) scale(1.06)', filter: `brightness(1.35) drop-shadow(0 0 16px ${u.def.color || '#ff4d6d'})`, offset: 0.5 },
        { transform: 'none', filter: 'none' },
      ], { duration: 650 / this.speed, easing: 'ease-out' });
      await this.wait(320);
    }
  }

  hitReact(u, crit) {
    const el = u.el.querySelector('.sprite');
    const s = crit ? 12 : 7;
    el.animate([
      { transform: 'none', filter: 'none' },
      { transform: `translateX(${s}px)`, filter: 'brightness(2) saturate(.3)' },
      { transform: `translateX(${-s}px)`, filter: 'brightness(1.4) sepia(1) hue-rotate(-40deg) saturate(4)' },
      { transform: `translateX(${s / 2}px)` },
      { transform: 'none', filter: 'none' },
    ], { duration: 360 / this.speed });
    if (crit) this.screenShake(6);
  }

  screenShake(px = 10) {
    if (!SAVE.settings.shake) return;
    this.root.animate([
      { transform: 'none' }, { transform: `translate(${px}px, ${-px / 2}px)` }, { transform: `translate(${-px}px, ${px / 2}px)` },
      { transform: `translate(${px / 2}px, 0)` }, { transform: 'none' },
    ], { duration: 320 / this.speed });
  }

  flash(color = 'white') {
    const f = this.q('.flash');
    f.style.background = color === 'red' ? 'radial-gradient(circle, rgba(255,40,80,.55), rgba(120,0,20,.3))' : 'radial-gradient(circle, rgba(255,255,255,.75), rgba(255,220,150,.25))';
    // "Reduce flashes" setting keeps it to a soft tint.
    f.animate([{ opacity: 0 }, { opacity: SAVE.settings.flashes ? 1 : 0.25, offset: 0.15 }, { opacity: 0 }], { duration: 420 / this.speed });
  }

  // Tutorial tip bubble (first battle only). Each tip shows once.
  coach(key) {
    if (!this.stage.tutorial || this.coached[key] || this.over) return;
    this.coached[key] = true;
    const el = this.q('.coach');
    el.querySelector('p').innerHTML = COACH[key];
    el.className = `coach coach-${key}`;
    el.querySelector('button').onclick = ev => { ev.stopPropagation(); el.classList.add('hidden'); };
    clearTimeout(this.coachT);
    this.coachT = setTimeout(() => el.classList.add('hidden'), 9000);
  }

  // A member's Basic flies from them to the target (heart, paintball, star).
  async projectile(u, t, kind) {
    if (!t || !t.el) return;
    const a = this.center(u), b = this.center(t);
    const el = document.createElement('div');
    el.className = `proj proj-${kind}`;
    el.style.setProperty('--c', u.def.color);
    el.style.left = a.x + 'px'; el.style.top = a.y + 'px';
    this.q('.fx-layer').appendChild(el);
    const dx = b.x - a.x, dy = b.y - a.y;
    // Bullets fly straight and point at the target; everything else arcs and spins.
    const straight = kind === 'bullet', arc = straight ? 0 : Math.min(120, Math.abs(dx) * 0.3 + 40);
    const rot = k => straight ? `rotate(${Math.atan2(dy, dx)}rad)` : `rotate(${k * 200}deg)`;
    el.animate([
      { transform: `translate(-50%,-50%) scale(.6) ${rot(0)}` },
      { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - arc}px)) scale(1.2) ${rot(1)}`, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) ${rot(2)}` },
    ], { duration: (straight ? 160 : 300) / this.speed, easing: 'cubic-bezier(.4,0,.8,.6)' });
    await this.wait(290);
    el.remove();
  }

  // Fading copy of a sprite left behind when it dashes.
  afterimage(u, dx, dy) {
    const sp = u.el.querySelector('.sprite');
    if (!sp) return;
    for (let i = 1; i <= 2; i++) {
      const g = sp.cloneNode(true);
      g.classList.add('ghost');
      sp.parentElement.appendChild(g);
      g.animate([
        { transform: `translate(${dx * 0.3 * i}px, ${dy * 0.3 * i}px)`, opacity: 0.45 / i },
        { transform: `translate(${dx * 0.5 * i}px, ${dy * 0.5 * i}px)`, opacity: 0 },
      ], { duration: 380 / this.speed, easing: 'ease-out' });
      setTimeout(() => g.remove(), 400 / this.speed);
    }
  }

  // Small floating label with the skill's name over the user.
  skillPop(u, name) {
    const { x, y } = this.center(u);
    const el = document.createElement('div');
    el.className = 'skill-pop';
    el.textContent = name;
    el.style.left = x + 'px'; el.style.top = (y - 70) + 'px';
    el.style.setProperty('--dur', 1200 / this.speed + 'ms');
    el.style.setProperty('--c', u.def.color);
    this.q('.fx-layer').appendChild(el);
    setTimeout(() => el.remove(), 1300 / this.speed);
  }

  center(u) {
    const r = u.el.querySelector('.sprite').getBoundingClientRect(), root = this.root.getBoundingClientRect();
    return { x: r.left - root.left + r.width / 2, y: r.top - root.top + r.height * (u.side === 'ally' ? 0.45 : 0.5) };
  }

  fx(targets, kind) {
    const layer = this.q('.fx-layer');
    const colors = ['#ff4d6d', '#ffd23f', '#3bceac', '#4d96ff', '#ff8fd8'];
    targets.forEach(t => {
      const { x, y } = this.center(t);
      const el = document.createElement('div');
      el.className = `fx fx-${kind}`;
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.setProperty('--dur', 800 / this.speed + 'ms');
      let parts = 0;
      if (kind === 'splash') parts = 7;
      if (kind === 'buff' || kind === 'heal') parts = 6;
      if (kind === 'big' || kind === 'burst') parts = 10;
      if (kind === 'poof') parts = 14;
      if (kind === 'burn') parts = 8;
      if (kind === 'shatter') parts = 18;
      // Member signatures (see SIG_FX).
      const sigParts = { cheer: 9, paint: 8, dream: 7, fortress: 6 }[kind];
      if (sigParts) parts = sigParts;
      for (let i = 0; i < parts; i++) {
        const p = document.createElement('i');
        const ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * (kind === 'poof' ? 90 : 60);
        p.style.setProperty('--x', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--y', Math.sin(ang) * dist + 'px');
        p.style.setProperty('--px', (Math.random() * 80 - 40) + 'px');
        p.style.setProperty('--d', Math.random() * 200 + 'ms');
        if (kind === 'splash' || kind === 'paint') p.style.background = colors[i % colors.length];
        if (kind === 'cheer') p.style.color = i % 2 ? '#ffd23f' : '#ff8fc8';
        if (kind === 'fortress') p.style.setProperty('--r', (i * 60) + 'deg');
        if (kind === 'poof') p.style.background = t.side === 'enemy' ? `hsl(${t.def.hue || 340} 90% 70%)` : t.def.color;
        if (kind === 'burn') p.style.background = i % 2 ? '#ffb347' : '#ff5a36';
        el.appendChild(p);
      }
      layer.appendChild(el);
      setTimeout(() => el.remove(), 1200 / this.speed + 300);
    });
  }

  // Hit spark on every direct hit: a slash in the attacker's colour, a ring and sparks.
  impact(t, src, crit, weak) {
    if (!t.el) return;
    const { x, y } = this.center(t);
    const el = document.createElement('div');
    el.className = `impact${crit ? ' crit' : ''}${weak ? ' weak' : ''}${t.side === 'ally' ? ' on-ally' : ''}`;
    el.style.left = x + (Math.random() * 30 - 15) + 'px';
    el.style.top = y + (Math.random() * 30 - 15) + 'px';
    el.style.setProperty('--c', src.side === 'ally' ? src.def.color : '#ff3b5c');
    el.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg');
    el.style.setProperty('--dur', 420 / this.speed + 'ms');
    el.innerHTML = '<i class="im-flash"></i><i class="im-slash"></i><i class="im-ring"></i>' + '<i class="im-spark"></i>'.repeat(crit ? 10 : 6);
    el.querySelectorAll('.im-spark').forEach((s, i, all) => s.style.setProperty('--a', (i / all.length * 360 + Math.random() * 25) + 'deg'));
    this.q('.fx-layer').appendChild(el);
    setTimeout(() => el.remove(), 520 / this.speed);
  }

  // "WEAKNESS BREAK" slashed across the screen in the breaker's colour.
  breakSplash(e, bfx, src) {
    const el = document.createElement('div');
    const { x, y } = this.center(e);
    el.className = 'break-splash';
    el.style.setProperty('--c', src && src.def.color ? src.def.color : '#ffd23f');
    el.style.setProperty('--x', x + 'px');
    el.style.setProperty('--y', y + 'px');
    el.style.setProperty('--dur', 1150 / this.speed + 'ms');
    el.innerHTML = `<i class="bs-band"></i><i class="bs-ring"></i><i class="bs-ring r2"></i>
      <div class="bs-text"><b>WEAKNESS BREAK</b><small>${e.name}${bfx ? ` · <em>${bfx.name}</em>` : ''}</small></div>`;
    this.q('.fx-layer').appendChild(el);
    setTimeout(() => el.remove(), 1250 / this.speed);
  }

  floatText(u, text, cls) {
    const { x, y } = this.center(u);
    const el = document.createElement('div');
    el.className = `float ${cls}`;
    el.textContent = text;
    el.style.left = x + (Math.random() * 50 - 25) + 'px';
    el.style.top = y - 30 + (Math.random() * 20 - 10) + 'px';
    el.style.setProperty('--dur', 1100 / this.speed + 'ms');
    this.q('.fx-layer').appendChild(el);
    setTimeout(() => el.remove(), 1100 / this.speed + 100);
  }

  async cutIn(u, sk) {
    const c = this.q('.cutin'), dur = SAVE.settings.cutins === 'short' ? 900 : 1600;
    c.style.setProperty('--dur', dur / this.speed + 'ms');
    c.innerHTML = `<div class="ci-dim"></div><div class="ci-band" style="--c:${u.def.color}"></div><div class="ci-lines"></div>
      <img class="ci-art" src="${ART[u.id].url}" alt="" style="--c:${u.def.color}">
      <div class="ci-text"><small>${u.def.name}</small><b>${sk.name}</b><q>${voice(u.id, 'ult')}</q></div>`;
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    // Tap to skip.
    await new Promise(r => { const t = setTimeout(r, dur / this.speed); c.onclick = () => { clearTimeout(t); r(); }; });
    c.onclick = null;
    c.classList.remove('show');
  }

  showBanner(text, cls = '') {
    const b = this.q('.banner-msg');
    b.textContent = text;
    b.className = 'banner-msg show ' + cls;
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => b.classList.remove('show'), 1600 / this.speed);
  }

  // ---------- UI updates ----------
  markActive(u) {
    this.all().forEach(x => x.el.classList.toggle('active', x === u));
    this.root.classList.toggle('enemy-turn', !!u && u.side === 'enemy');
  }

  renderOrder() {
    const list = [this.current, ...this.predictOrder(7)].filter(u => u && u.alive);
    this.q('.order').innerHTML = list.map((u, i) => {
      const inner = u.side === 'ally' || ART[u.id] ? `<div class="face" style="${faceStyle(u.id)}"></div>`
                                               : foeChip(u.id, u.def.hue);
      return `<div class="chip ${u.side}${i === 0 ? ' now' : ''}">${inner}<span>${u.name.split(' ')[0]}</span></div>`;
    }).join('');
  }

  updateUnit(u) {
    if (!u.el) return;
    const pct = (u.hp / u.maxHp * 100) + '%';
    u.el.querySelector('.hp i').style.width = pct;
    u.el.querySelector('.hp .trail').style.width = pct;
    u.el.querySelector('.hp s').style.width = Math.min(100, u.shield / u.maxHp * 100) + '%';
    u.el.querySelector('.hpnum').textContent = `${u.hp}${u.shield ? ' +' + u.shield : ''}`;
    const pvEl = u.el.querySelector('.hp .pv');
    if (pvEl) {
      const lost = Math.min(u.hp, Math.max(0, (u.pvDmg || 0) - u.shield));
      pvEl.style.left = ((u.hp - lost) / u.maxHp * 100) + '%';
      pvEl.style.width = (lost / u.maxHp * 100) + '%';
      pvEl.classList.toggle('kill', lost > 0 && lost >= u.hp);
    }
    if (u === this.bossUnit) this.updateBossBar(u);
    if (u.side === 'ally') {
      u.el.querySelector('.en i').style.width = (u.energy / u.maxEnergy * 100) + '%';
      u.el.classList.toggle('ult-ready', u.alive && u.energy >= u.maxEnergy);
    } else {
      u.el.querySelector('.poise i').style.width = (u.poise / u.maxPoise * 100) + '%';
      u.el.classList.toggle('broken', u.alive && u.broken);
    }
    const intent = u.el.querySelector('.intent');
    if (intent) {
      const it = u.alive ? this.intentFor(u) : null;
      intent.className = `intent i-${it ? it.kind : 'none'}`;
      intent.innerHTML = it ? `${ic(INTENT_IC[it.kind])}<span>${it.label}</span>` : '';
    }
    u.el.querySelector('.st').innerHTML =
      (u.shield > 0 ? `<span class="tag shield">SHIELD ${u.shieldTurns}</span>` : '') +
      u.statuses.map(s => `<span class="tag ${s.key}">${s.label} ${s.turns}</span>`).join('');
  }

  updateBossBar(u) {
    const pct = u.hp / u.maxHp * 100;
    this.q('.bb-fill').style.width = pct + '%';
    this.q('.bb-trail').style.width = pct + '%';
    this.q('.bb-shield').style.width = Math.min(100, u.shield / u.maxHp * 100) + '%';
    const lost = Math.min(u.hp, Math.max(0, (u.pvDmg || 0) - u.shield));
    const pv = this.q('.bb-pv');
    pv.style.left = ((u.hp - lost) / u.maxHp * 100) + '%'; pv.style.width = (lost / u.maxHp * 100) + '%';
    this.q('.bb-poise i').style.width = (u.broken ? 0 : u.poise / u.maxPoise * 100) + '%';
    this.q('.bb-num').textContent = `${u.hp.toLocaleString()} / ${u.maxHp.toLocaleString()}${u.shield ? ` +${u.shield.toLocaleString()}` : ''}`;
    const it = u.alive ? this.intentFor(u) : null;
    const bi = this.q('.bb-intent');
    bi.className = `bb-intent intent i-${it ? it.kind : 'none'}`;
    bi.innerHTML = it ? `${ic(INTENT_IC[it.kind])}<span>NEXT · ${it.label}</span>` : '';
    const bar = this.q('.boss-bar');
    bar.classList.toggle('broken', u.broken);
    bar.classList.toggle('enraged', u.phase > 1);
    bar.classList.toggle('dead', !u.alive);
  }

  updateHud() {
    this.q('.pips').innerHTML = Array.from({ length: this.spMax }, (_, i) => `<i class="${i < this.sp ? 'on' : ''}"></i>`).join('');
    this.q('.hype-bar i').style.width = this.hype + '%';
    this.q('.hype-num').textContent = Math.round(this.hype) + '%';
    this.q('.hype').classList.toggle('full', this.hype >= HYPE_MAX);
    if (this.stage.raid) {
      const score = this.allies.reduce((a, u) => a + u.dmgDealt, 0);
      this.q('.raid-hud').innerHTML = `<span>TURNS <b>${Math.max(0, RAID_TURNS - this.allyActions)}</b></span><span>SCORE <b>${score.toLocaleString()}</b></span>`;
    }
    if (this.pending) this.updateActions();
  }

  updateActions() {
    const u = this.pending.u;
    ['basic', 'skill', 'ult'].forEach(k => {
      const b = this.q(`.act[data-act="${k}"]`);
      b.querySelector('small').textContent = k === 'ult' ? `${u.kit[k].name} · ${Math.floor(u.energy)}/${u.maxEnergy}`
                                           : k === 'skill' ? `${u.kit[k].name} · 1 SP` : `${u.kit[k].name} · +1 SP`;
      b.disabled = !this.canUse(k, u);
      b.classList.toggle('ready', k === 'ult' && this.canUse(k, u));
    });
    this.q('.act.collab').classList.toggle('hidden', this.hype < HYPE_MAX);
  }

  updateAll() {
    this.all().forEach(u => {
      if (u.boss && !u.intent) this.setIntent(u);
      this.updateUnit(u);
    });
    this.updateHud();
  }
}
