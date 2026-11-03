// All characters, enemies, stages and banner settings live here.
// Tweak numbers in this file to rebalance the game.

// face:  [x, y] position of the face in the art (0..1), used for round portraits
// bust:  [x, y, width] crop of the art (0..1) used for battle / list cards
// element: damage type; enemies are weak to two (see ELEMENTS / ENEMIES.weak)
// Each skill: target = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self'
//             fx = visual effect played on the targets
//             run(battle, user, targetOrTargets) applies the effect
//             pv = damage preview: t = target ×ATK, d = target ×DEF,
//                  o = every other enemy ×ATK, a = all enemies ×ATK
//                  (pv numbers mirror what run() does; keep them in sync)

// Elements. Hitting an enemy's weakness deals more damage and much more Stagger.
const ELEMENTS = {
  sun:   { name: 'Sunset', color: '#ffb547' },
  candy: { name: 'Candy',  color: '#ff7eb6' },
  night: { name: 'Night',  color: '#a98bff' },
  paint: { name: 'Paint',  color: '#ff5a5a' },
  aim:   { name: 'Aim',    color: '#4d8bff' },
  snack: { name: 'Snack',  color: '#b5d44a' },
};
const WEAK_DMG = 1.15, WEAK_STAGGER = 1.75, RESIST_STAGGER = 0.6;
const CHARACTERS = {
  sendo: {
    name: 'Sendo Yuuhi', short: 'Sendo', role: 'Support', element: 'sun', rarity: 4, color: '#ffb547',
    art: 'assets/sendo.jpg', face: [0.53, 0.25], bust: [0.05, 0.02, 0.9],
    base: { hp: 900, atk: 70, def: 60, spd: 112, crit: 0.05, critDmg: 0.5 },
    profile: { height: '159 cm', birthday: 'December 3', about: 'The newest member and the first whose main game is a MOBA: a League of Legends jungler who climbed to Master. She calls herself laid-back; everyone else calls her loud. Maybe a high schooler. Maybe.' },
    talent: { name: 'Cheer Chain', desc: 'Whenever an enemy is Broken, all members heal 4% of Sendo\'s max HP.' },
    kit: {
      basic: { name: 'Peace Poke', desc: 'Deal 80% ATK damage to one enemy.', target: 'enemy', fx: 'poke', pv: { t: 0.8 },
        run: (b, u, t) => b.hit(u, t, 0.8) },
      skill: { name: 'Cheer Up!', desc: 'One ally gains +40% ATK for 2 turns and 20 Energy.', target: 'ally', fx: 'buff',
        run: (b, u, t) => { b.addStatus(t, 'atk', 0.4, 2, 'ATK↑'); b.addEnergy(t, 20); } },
      ult: { name: 'Sunny Encore', desc: 'All allies gain +30% ATK for 3 turns and heal 15% of Sendo\'s max HP.', target: 'allies', fx: 'heal',
        run: (b, u, ts) => ts.forEach(t => { b.addStatus(t, 'atk', 0.3, 3, 'ATK↑'); b.heal(t, u.maxHp * 0.15); }) },
    },
  },
  hinano: {
    name: 'Tachibana Hinano', short: 'Hinano', role: 'Tank', element: 'candy', rarity: 5, color: '#ff7eb6',
    art: 'assets/hinano.jpg', avatar: 'assets/hinano-face.jpg', face: [0.5, 0.2], bust: [0.06, 0.04, 0.84], bgTol: 10,
    base: { hp: 1300, atk: 55, def: 110, spd: 97, crit: 0.05, critDmg: 0.5 },
    profile: { height: '154 cm', birthday: 'November 11', about: 'A passionate, hard-working big-sister type who throws herself into everything. Apex Legends is her strongest game, and she is a powerful singer. She teases you, then admits she likes you.' },
    talent: { name: 'Sweet Revenge', desc: 'While Taunting, counter the first hit each enemy turn for 50% ATK + 60% DEF.' },
    kit: {
      basic: { name: 'Lollipop Bonk', desc: 'Deal 60% ATK + 40% DEF damage to one enemy.', target: 'enemy', fx: 'poke', pv: { t: 0.6, d: 0.4 },
        run: (b, u, t) => b.hit(u, t, 0.6, { defScale: 0.4 }) },
      skill: { name: 'Sweet Barrier', desc: 'Shield all allies (110% DEF + 5% max HP) for 2 turns. Hinano Taunts for 2 turns (enemies target her 65% of the time).', target: 'allies', fx: 'shield',
        run: (b, u, ts) => { ts.forEach(t => b.shield(t, b.stat(u, 'def') * 1.1 + u.maxHp * 0.05, 2)); b.addStatus(u, 'taunt', 1, 2, 'TAUNT'); } },
      ult: { name: 'Candy Fortress', desc: 'Shield all allies (180% DEF + 8% max HP) for 2 turns and reduce their damage taken by 20% for 2 turns. Hinano Taunts for 3 turns.', target: 'allies', fx: 'shield',
        run: (b, u, ts) => {
          ts.forEach(t => { b.shield(t, b.stat(u, 'def') * 1.8 + u.maxHp * 0.08, 2); b.addStatus(t, 'dr', 0.2, 2, 'DMG↓'); });
          b.addStatus(u, 'taunt', 1, 3, 'TAUNT');
        } },
    },
  },
  noah: {
    name: 'Kurumi Noah', short: 'Noah', role: 'DPS', element: 'night', rarity: 5, color: '#c58bff',
    art: 'assets/noah.jpg', avatar: 'assets/noah-face.jpg', chibi: 'assets/noah-chibi.png', face: [0.55, 0.22], bust: [0.12, 0.05, 0.76], bgTol: 'grey',
    base: { hp: 850, atk: 120, def: 50, spd: 104, crit: 0.25, critDmg: 0.6 },
    profile: { height: '155 cm', birthday: 'February 13', about: 'Cheerful, quick to laugh and quick to cry, and fiercely competitive. A top-level FPS player who acts first and thinks later. Loves white rice; hates thunder and horror.' },
    talent: { name: 'Snack Time', desc: 'Whenever an enemy is Broken, follow up on it for 120% ATK.' },
    kit: {
      basic: { name: 'Bat Wing Slash', desc: 'Deal 100% ATK damage to one enemy.', target: 'enemy', fx: 'slash', pv: { t: 1.0 },
        run: (b, u, t) => b.hit(u, t, 1.0) },
      skill: { name: 'Devil\'s Spotlight', desc: 'Deal 220% ATK damage to one enemy and Mark it: +20% damage taken for 2 turns.', target: 'enemy', fx: 'burst', pv: { t: 2.2 },
        run: (b, u, t) => { b.hit(u, t, 2.2); b.addStatus(t, 'mark', 0.2, 2, 'MARK'); } },
      ult: { name: 'Midnight Finale', desc: 'Deal 480% ATK damage to one enemy and 150% to all other enemies.', target: 'enemy', fx: 'big', pv: { t: 4.8, o: 1.5 },
        run: (b, u, t) => { b.hit(u, t, 4.8, { critBonus: 0.15 }); b.enemiesOf(u).filter(e => e !== t).forEach(e => b.hit(u, e, 1.5)); } },
    },
  },
  tsuna: {
    name: 'Nekota Tsuna', short: 'Tsuna', role: 'DPS', element: 'paint', rarity: 4, color: '#ff5a5a',
    art: 'assets/tsuna.jpg', face: [0.27, 0.15], bust: [0.03, 0.02, 0.75],
    base: { hp: 900, atk: 100, def: 55, spd: 102, crit: 0.1, critDmg: 0.5 },
    profile: { height: '157 cm', birthday: 'November 27', about: 'Pure-hearted and passionate, she gets completely absorbed in whatever she loves. Her skill comes from sheer practice. She is also an illustrator who draws art for the other members.' },
    talent: { name: 'Splash Back', desc: 'When another member\'s Skill or Ultimate hits a Painted enemy, follow up for 70% ATK. Once per Tsuna turn.' },
    kit: {
      basic: { name: 'Cat Scratch', desc: 'Deal 100% ATK damage to one enemy.', target: 'enemy', fx: 'slash', pv: { t: 1.0 },
        run: (b, u, t) => b.hit(u, t, 1.0) },
      skill: { name: 'Paint Splash', desc: 'Deal 90% ATK damage to all enemies and apply Paint: 35% ATK damage per turn for 2 turns.', target: 'enemies', fx: 'splash', pv: { a: 0.9 },
        run: (b, u, ts) => ts.forEach(t => { b.hit(u, t, 0.9); b.addStatus(t, 'paint', Math.round(b.stat(u, 'atk') * 0.35), 2, 'PAINT'); }) },
      ult: { name: 'Maid Café Rush', desc: 'Hit all enemies 3 times for 90% ATK each, then apply Paint.', target: 'enemies', fx: 'splash', pv: { a: 2.7 },
        run: async (b, u, ts) => {
          for (let i = 0; i < 3; i++) {
            ts.filter(t => t.alive).forEach(t => b.hit(u, t, 0.9));
            b.fx(ts.filter(t => t.alive), 'splash');
            await b.wait(260);
          }
          ts.filter(t => t.alive).forEach(t => b.addStatus(t, 'paint', Math.round(b.stat(u, 'atk') * 0.35), 2, 'PAINT'));
        } },
    },
  },
  // avatar: separate square picture used for round face portraits.
  uruha: {
    name: 'Ichinose Uruha', short: 'Uruha', role: 'DPS', element: 'aim', rarity: 5, color: '#4d6bff',
    art: 'assets/uruha.jpg', avatar: 'assets/uruha-face.jpg', face: [0.48, 0.17], bust: [0.12, 0.03, 0.76],
    base: { hp: 820, atk: 112, def: 52, spd: 110, crit: 0.2, critDmg: 0.7 },
    profile: { height: '158 cm', birthday: 'December 23', about: 'The straight man of the Lupinus Virtual Games sub-group. She keeps her teammates in line and is rather shy, but people find her outbursts endearing.' },
    talent: { name: 'Straight Man', desc: 'Whenever Uruha Breaks an enemy, she gains 25 Energy and the next ally to act deals +20% damage.' },
    kit: {
      basic: { name: 'Quick Draw', desc: 'Deal 100% ATK damage to one enemy. Deals double Stagger.', target: 'enemy', fx: 'shot', pv: { t: 1.0 },
        run: (b, u, t) => b.hit(u, t, 1.0, { stagger: STAGGER.basic * 2 }) },
      skill: { name: 'Callout Shot', desc: 'Deal 240% ATK damage to one enemy with heavy Stagger. Broken enemies take 40% more from it.', target: 'enemy', fx: 'shot', pv: { t: 2.4, tb: 1.4 },
        run: (b, u, t) => b.hit(u, t, t.broken ? 2.4 * 1.4 : 2.4, { stagger: STAGGER.skill * 2 }) },
      ult: { name: 'Lupinus Barrage', desc: 'Fire 4 shots of 160% ATK at random enemies (+20% crit chance), then every enemy loses 40% of its Stagger.', target: 'enemies', fx: 'shot',
        run: async (b, u) => {
          for (let i = 0; i < 4; i++) {
            const alive = b.living('enemy');
            if (!alive.length) break;
            const t = alive[Math.floor(Math.random() * alive.length)];
            b.fx([t], 'shot');
            b.hit(u, t, 1.6, { critBonus: 0.2, stagger: STAGGER.follow });
            await b.wait(180);
          }
          b.living('enemy').filter(e => !e.broken).forEach(e => b.stagger(e, e.maxPoise * 0.4, u));
        } },
    },
  },
  lisa: {
    name: 'Hanabusa Lisa', short: 'Lisa', role: 'Support', element: 'snack', rarity: 5, color: '#c3d45a',
    art: 'assets/lisa.jpg', avatar: 'assets/lisa-face.jpg', face: [0.36, 0.25], bust: [0.06, 0.06, 0.72], bgTol: 10,
    base: { hp: 1000, atk: 72, def: 66, spd: 106, crit: 0.05, critDmg: 0.5 },
    profile: { height: '160 cm', birthday: 'June 3', about: 'Drawing, gaming and good food are what keep her going. Her eyes light up whenever the talk turns to food. A little clumsy, despite all her energy and seriousness.' },
    talent: { name: 'Clumsy Luck', desc: 'Lisa\'s Basic has a 30% chance to trip into a second hit for 60% ATK, healing the lowest-HP ally for 5% of her max HP.' },
    kit: {
      basic: { name: 'Doodle Dash', desc: 'Deal 80% ATK damage to one enemy. (Talent: may trip into a second hit and a small heal.)', target: 'enemy', fx: 'poke', pv: { t: 0.8 },
        run: (b, u, t) => {
          b.hit(u, t, 0.8);
          if (Math.random() < 0.3 && t.alive) {
            b.floatText(u, 'OOPS!', 'heal');
            b.hit(u, t, 0.6);
            const low = b.living('ally').sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
            if (low) b.heal(low, u.maxHp * 0.05);
          }
        } },
      skill: { name: 'Snack Break', desc: 'Heal one ally for 24% of Lisa\'s max HP, remove Silence, and give them 15 Energy.', target: 'ally', fx: 'heal',
        run: (b, u, t) => {
          b.heal(t, u.maxHp * 0.24);
          t.statuses = t.statuses.filter(s => s.key !== 'silence');
          b.addEnergy(t, 15);
        } },
      ult: { name: 'All-You-Can-Eat', desc: 'Heal all allies for 20% of Lisa\'s max HP and give them +20% ATK and 15% less damage taken for 2 turns.', target: 'allies', fx: 'heal',
        run: (b, u, ts) => ts.forEach(t => {
          b.heal(t, u.maxHp * 0.2);
          b.addStatus(t, 'atk', 0.2, 2, 'ATK↑');
          b.addStatus(t, 'dr', 0.15, 2, 'DMG↓');
        }) },
    },
  },
};

// Enemies without art are drawn as glowing "shade" orbs in CSS.
// ai: basic | sniper (hits weakest) | healer | guard (team DMG down) | drain (steals SP)
//     troll (AoE every other turn) | clipper (steals Energy)
//     phantom / core / algorithm = boss patterns in battle.js
// desc is shown when you tap or hover an enemy in battle.
const ENEMIES = {
  grunt:    { name: 'Lag Shade',   hp: 520,  atk: 55, def: 30, spd: 92,  crit: 0.05, critDmg: 0.5, hue: 270, ai: 'basic', weak: ['sun', 'paint'],
              desc: 'Bites one member.' },
  sniper:   { name: 'Ping Wraith', hp: 400,  atk: 78, def: 20, spd: 108, crit: 0.1,  critDmg: 0.5, hue: 190, ai: 'sniper', weak: ['aim', 'night'],
              desc: 'Snipes the member with the lowest HP for 130% ATK.' },
  spammer:  { name: 'Spam Bot',    hp: 480,  atk: 45, def: 25, spd: 100, crit: 0.05, critDmg: 0.5, hue: 130, ai: 'healer', weak: ['paint', 'candy'],
              desc: 'Heals a hurt enemy for 18% of its max HP. Kill it first.' },
  firewall: { name: 'Firewall',    hp: 1100, atk: 50, def: 80, spd: 85,  crit: 0.05, critDmg: 0.5, hue: 25,  ai: 'guard', weak: ['paint', 'night'],
              desc: 'Every other turn, all enemies take 25% less damage for 2 turns.' },
  desync:   { name: 'Desync',      hp: 450,  atk: 65, def: 25, spd: 116, crit: 0.1,  critDmg: 0.5, hue: 320, ai: 'drain', weak: ['aim', 'sun'],
              desc: 'Very fast. Every hit steals 1 Skill Point.' },
  troll:    { name: 'Flame Troll', hp: 900,  atk: 70, def: 45, spd: 94,  crit: 0.05, critDmg: 0.5, hue: 12,  ai: 'troll', weak: ['candy', 'snack'],
              desc: 'Every other turn it posts flame bait that hits ALL members for 75% ATK.' },
  clipper:  { name: 'Clip Thief',  hp: 520,  atk: 70, def: 30, spd: 112, crit: 0.1,  critDmg: 0.5, hue: 52,  ai: 'clipper', weak: ['aim', 'snack'],
              desc: 'Steals 25 Energy from the member it hits. Protect your Ultimates.' },
  echo:     { name: 'Echo',        hp: 700,  atk: 75, def: 40, spd: 104, crit: 0.1,  critDmg: 0.5, hue: 200, ai: 'basic', weak: ['night', 'candy'],
              desc: 'A copy spun off by the Algorithm.' },
  phantom:  { name: 'Crimson Phantom', hp: 4200, atk: 105, def: 60, spd: 100, crit: 0.1, critDmg: 0.5,
              art: 'assets/boss.jpg', face: [0.45, 0.24], boss: true, ai: 'phantom', weak: ['sun', 'aim'],
              desc: 'Slash, Slash, then charges Crimson Storm (hits everyone). Enrages and calls backup at 50% HP.' },
  core:     { name: 'Glitch Core', hp: 5000, atk: 110, def: 65, spd: 95, crit: 0.1, critDmg: 0.5, hue: 350, boss: true, ai: 'core',
              art: 'assets/boss-core.jpg', face: [0.49, 0.16], weak: ['paint', 'snack'],
              desc: 'Beams, shields itself and summons minions, then charges Meltdown. Overclocks at 50% HP.' },
  algorithm: { name: 'The Algorithm', hp: 5600, atk: 120, def: 70, spd: 100, crit: 0.1, critDmg: 0.6, hue: 195, boss: true, ai: 'algorithm',
              art: 'assets/boss-algorithm.jpg', face: [0.49, 0.14], weak: ['night', 'candy'],
              desc: 'Shadowbans members (Silenced: no Skills), shifts trends to shrug off damage, and charges Viral Surge. Splits off Echoes at 50% HP.' },
};

const CHAPTERS = [
  { id: 1, scene: 'noah-cap', name: 'Signal Lost', desc: 'Four streams freeze at once. Something is crawling out of the lag.' },
  { id: 2, scene: 'tsuna-yukata', name: 'Crimson Broadcast', desc: 'The Phantom is gone, but the city\'s signal is still bleeding red.' },
  { id: 3, scene: 'hinano-captain', name: 'Final Stream', desc: 'The Core was only a server. Something bigger has been choosing what everyone watches.' },
];

// turns = member turns allowed for the third star
const STAGES = [
  { id: '1-1', chapter: 1, name: 'Lobby Lag',      level: 1, turns: 8,  waves: [['grunt', 'grunt'], ['grunt', 'sniper']], reward: { gems: 800, exp: 400 } },
  { id: '1-2', chapter: 1, name: 'Ping Spike',     level: 2, turns: 13, waves: [['grunt', 'sniper'], ['sniper', 'grunt', 'sniper']], reward: { gems: 800, exp: 600 } },
  { id: '1-3', chapter: 1, name: 'Chat Flood',     level: 3, turns: 17, waves: [['spammer', 'grunt', 'grunt'], ['spammer', 'sniper', 'spammer']], reward: { gems: 600, exp: 700 } },
  { id: '1-4', chapter: 1, name: 'The Firewall',   level: 3, turns: 34, waves: [['firewall', 'grunt'], ['firewall', 'sniper', 'spammer']], reward: { gems: 600, exp: 800 } },
  { id: '1-5', chapter: 1, name: 'Out of Sync',    level: 4, turns: 25, waves: [['desync', 'grunt', 'desync'], ['desync', 'firewall', 'sniper']], reward: { gems: 600, exp: 900 } },
  { id: '1-6', chapter: 1, name: 'Crimson Phantom', level: 4, turns: 52, boss: true, waves: [['grunt', 'sniper'], ['phantom']], reward: { gems: 1600, exp: 1200 } },
  { id: '2-1', chapter: 2, name: 'Static Streets', level: 5, turns: 17, waves: [['grunt', 'sniper', 'grunt'], ['desync', 'spammer', 'sniper']], reward: { gems: 700, exp: 1500 } },
  { id: '2-2', chapter: 2, name: 'Moderation Queue', level: 6, turns: 35, waves: [['spammer', 'firewall', 'spammer'], ['firewall', 'desync', 'spammer']], reward: { gems: 700, exp: 1700 } },
  { id: '2-3', chapter: 2, name: 'Buffer Overflow', level: 6, turns: 37, waves: [['desync', 'desync', 'sniper'], ['grunt', 'firewall', 'desync'], ['sniper', 'spammer', 'sniper']], reward: { gems: 700, exp: 1900 } },
  { id: '2-4', chapter: 2, name: 'Dead Air',       level: 7, turns: 37, waves: [['firewall', 'sniper', 'firewall'], ['desync', 'spammer', 'desync']], reward: { gems: 700, exp: 2100 } },
  { id: '2-5', chapter: 2, name: 'Phantom Encore', level: 7, turns: 70, boss: true, waves: [['firewall', 'spammer', 'desync'], ['phantom']], reward: { gems: 1600, exp: 2500 } },
  { id: '2-6', chapter: 2, name: 'Glitch Core',    level: 8, turns: 100, boss: true, waves: [['desync', 'firewall', 'spammer'], ['core']], reward: { gems: 2400, exp: 3000 } },
  { id: '3-1', chapter: 3, name: 'Comment Section', level: 9, turns: 27, waves: [['troll', 'grunt', 'sniper'], ['clipper', 'troll', 'spammer']], reward: { gems: 800, exp: 3200 } },
  { id: '3-2', chapter: 3, name: 'Clip Farm',       level: 10, turns: 30, waves: [['clipper', 'clipper', 'sniper'], ['firewall', 'clipper', 'desync']], reward: { gems: 800, exp: 3500 } },
  { id: '3-3', chapter: 3, name: 'Ratio',           level: 10, turns: 48, waves: [['troll', 'spammer', 'troll'], ['desync', 'troll', 'clipper'], ['sniper', 'firewall', 'sniper']], reward: { gems: 800, exp: 3800 } },
  { id: '3-4', chapter: 3, name: 'Trending',        level: 11, turns: 40, waves: [['firewall', 'troll', 'spammer'], ['clipper', 'desync', 'troll']], reward: { gems: 800, exp: 4100 } },
  { id: '3-5', chapter: 3, name: 'Echo Chamber',    level: 11, turns: 30, waves: [['echo', 'echo', 'echo'], ['echo', 'troll', 'echo']], reward: { gems: 800, exp: 4400 } },
  { id: '3-6', chapter: 3, name: 'The Algorithm',   level: 12, turns: 95, boss: true, waves: [['troll', 'clipper', 'spammer'], ['algorithm']], reward: { gems: 3000, exp: 5000 } },
];

// ---------- Stream Tower ----------
// 30 generated floors, harder every floor, a boss every 10. First clears pay Spo Coins.
const TOWER_FLOORS = 30;
const TOWER_BOSSES = { 10: 'phantom', 20: 'core', 30: 'algorithm' };
function towerStage(floor) {
  // Small seeded random so each floor is always the same fight.
  let seed = floor * 9973 + 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pool = ['grunt', 'sniper', 'spammer', 'firewall', 'desync', 'troll', 'clipper', 'echo'].slice(0, Math.min(8, 3 + Math.floor(floor / 3)));
  const group = n => Array.from({ length: n }, () => pool[Math.floor(rnd() * pool.length)]);
  const boss = TOWER_BOSSES[floor];
  const waves = boss ? [group(3), [boss]] : floor > 15 ? [group(3), group(3)] : [group(floor > 5 ? 3 : 2)];
  return {
    id: `T-${floor}`, tower: true, floor, name: boss ? `Floor ${floor} · ${ENEMIES[boss].name}` : `Floor ${floor}`,
    level: 1 + Math.round(floor * 0.37), turns: 99, waves, boss: !!boss,
    reward: { coins: 40 + floor * 10, gems: floor % 5 === 0 ? 300 : 0 },
  };
}

// ---------- Shop (Spo Coins) ----------
// pick: 'char' or 'memory' opens a chooser. daily = purchases allowed per day.
const SHOP = [
  { id: 'tokens', name: 'Superchat Tokens ×5000', desc: 'Level-up and skill currency.', price: 150, icon: 'token', give: { exp: 5000 } },
  { id: 'gems', name: 'Gems ×160', desc: 'Enough for one recruit. 5 per day.', price: 250, icon: 'gem', give: { gems: 160 }, daily: 5 },
  { id: 'dupe', name: 'Duplicate Token', desc: 'Pick a member. Unlocks one Duplicate node.', price: 800, icon: 'spark', pick: 'char' },
  { id: 'memrank', name: 'Memory Rank Up', desc: 'Pick a Memory below Rank 5.', price: 500, icon: 'recruit', pick: 'memory' },
  { id: 'giftbox', name: 'Gift Box', desc: '2 random gifts for member bonds. 5 per day.', price: 120, icon: 'gift', gifts: 2, daily: 5 },
];

// ---------- Daily missions (reset every day) ----------
// stat = counter in SAVE.daily.progress that the game bumps.
// pts = Daily Activity points for claiming it; points open the activity chests.
const DAILY_MISSIONS = [
  { id: 'login', text: 'Claim the Daily Login', goal: 1, stat: 'login', pts: 20, reward: { gems: 100 } },
  { id: 'win3', text: 'Win 3 battles', goal: 3, stat: 'wins', pts: 20, reward: { gems: 100, coins: 30 } },
  { id: 'ult5', text: 'Use 5 Ultimates', goal: 5, stat: 'ults', pts: 20, reward: { exp: 2000, coins: 30 } },
  { id: 'pull10', text: 'Recruit 10 times', goal: 10, stat: 'pulls', pts: 20, reward: { gems: 150, coins: 30 } },
  { id: 'farm', text: 'Clear a Tower floor, a Daily Stream or Sweep a stage', goal: 1, stat: 'farm', pts: 20, reward: { coins: 60 } },
];
const ACTIVITY_MAX = 100;
const ACTIVITY_CHESTS = [
  { at: 20, reward: { gems: 30 } }, { at: 40, reward: { exp: 2000 } }, { at: 60, reward: { coins: 40 } },
  { at: 80, reward: { gems: 50 } }, { at: 100, reward: { gems: 80, gifts: 1 } },
];
// Third star: clear-time target in seconds (stageTime in action-data.js).
const stageObjectives = st => { const t = stageTime(st); return ['Clear the stage', 'Finish with at least 50% HP', `Clear within ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`]; };
const STAR_GEMS = 60;          // gems for each star earned the first time
// Replaying a cleared stage gives this fraction of the reward.
const REPLAY_REWARD = 0.25;    // gems
const REPLAY_EXP = 0.6;        // Superchat Tokens, so farming for levels is worth it
// Suggested member level for an enemy level.
const recLevel = enemyLv => Math.round(1 + (enemyLv - 1) * 2.4);

// Memories: illustrated cards a member can equip (one each).
// stats are % bonuses (spd is flat). passive text uses {v} for its value.
// Memories with an owner have a signature member who gets +50% passive effect.
// Hooks: onStart(battle, wearer, v), afterAction(battle, wearer, key, targets, v),
//        ultDmg: true = Ultimate deals +v% damage.
const MEMORIES = {
  snow: { name: 'First Snow, Warm Hands', rarity: 4, owner: 'sendo', art: 'assets/mem-sendo.jpg', focus: [0.5, 0.3],
    stats: { hp: 0.09, atk: 0.06 }, val: 6,
    passive: 'After using Skill, the target also heals {v}% of the wearer\'s max HP.',
    afterAction: (b, u, key, ts, v) => { if (key === 'skill') ts.forEach(t => b.heal(t, u.maxHp * v / 100)); } },
  study: { name: 'Off-Stream Study', rarity: 5, owner: 'hinano', art: 'assets/mem-hinano.webp', focus: [0.45, 0.2],
    stats: { def: 0.18, hp: 0.08 }, val: 7,
    passive: 'At the start of battle, all allies gain a shield worth {v}% of the wearer\'s max HP for 2 turns.',
    onStart: (b, u, v) => b.living('ally').forEach(t => b.shield(t, u.maxHp * v / 100, 2)) },
  ranked: { name: 'Ranked at 3 AM', rarity: 4, owner: 'tsuna', art: 'assets/mem-tsuna.jpg', focus: [0.5, 0.25],
    stats: { atk: 0.12 }, spd: 4, val: 15,
    passive: 'After using Skill, the wearer gains +{v}% ATK for 2 turns.',
    afterAction: (b, u, key, ts, v) => { if (key === 'skill') b.addStatus(u, 'focus', v / 100, 2, 'FOCUS'); } },
  festival: { name: 'Curtain Call', rarity: 5, owner: 'noah', art: 'assets/mem-noah.jpg', focus: [0.5, 0.3],
    stats: { crit: 0.12, critDmg: 0.24 }, val: 30, ultDmg: true,
    passive: 'Ultimate deals +{v}% damage.' },
  lollipop: { name: 'Lollipop Break', rarity: 5, owner: 'uruha', art: 'assets/mem-uruha.jpg', focus: [0.5, 0.3],
    stats: { atk: 0.12, crit: 0.08 }, val: 25, skillDmg: true,
    passive: 'Skill deals +{v}% damage.' },
  feast: { name: 'Feast Mode', rarity: 5, owner: 'lisa', art: 'assets/mem-lisa.jpg', focus: [0.5, 0.3],
    stats: { hp: 0.14, atk: 0.06 }, val: 20, healBoost: true,
    passive: 'Heals from the wearer are {v}% stronger.' },
  setup: { name: 'Stream Setup', rarity: 4, icon: '🎙', hue: 200, stats: { atk: 0.1 }, val: 15,
    passive: 'Start battle with +{v} Energy.', onStart: (b, u, v) => b.addEnergy(u, v) },
  letter: { name: 'Fan Letter', rarity: 4, icon: '✉', hue: 330, stats: { hp: 0.12, def: 0.06 }, val: 4,
    passive: 'Heal {v}% max HP after each of the wearer\'s actions.', afterAction: (b, u, key, ts, v) => b.heal(u, u.maxHp * v / 100) },
  drink: { name: 'Energy Drink', rarity: 4, icon: '⚡', hue: 50, stats: {}, spd: 8, val: 25,
    passive: 'Start battle with +{v} Energy.', onStart: (b, u, v) => b.addEnergy(u, v) },
};
const MAX_MEM_RANK = 5;

// Backdrops: full scene illustrations (they keep their background).
// Used for the lobby, banners, character screens, story and the Album.
// focus = [x, y] point to keep in view when cropped. credit = artist shown on screen.
const SCENES = {
  'noah-cap':          { title: 'Tip of the Cap',      char: 'noah',   art: 'assets/scenes/noah-cap.jpg',          focus: [0.55, 0.3] },
  'noah-goose':        { title: 'Song Cover',          char: 'noah',   art: 'assets/scenes/noah-goose.jpg',        focus: [0.4, 0.35] },
  'hinano-captain':    { title: 'Captain on Stage',    char: 'hinano', art: 'assets/scenes/hinano-captain.jpg',    focus: [0.4, 0.35] },
  'hinano-room':       { title: 'Game Room',           char: 'hinano', art: 'assets/scenes/hinano-room.jpg',       focus: [0.35, 0.3] },
  'tsuna-yukata':      { title: 'Summer Festival',     char: 'tsuna',  art: 'assets/scenes/tsuna-yukata.jpg',      focus: [0.3, 0.3], credit: '@soou_art' },
  'tsuna-sleepy':      { title: 'Five More Minutes',   char: 'tsuna',  art: 'assets/scenes/tsuna-sleepy.jpg',      focus: [0.5, 0.4], credit: '@0707_una' },
  'sendo-class':       { title: 'After Class',         char: 'sendo',  art: 'assets/scenes/sendo-class.jpg',       focus: [0.6, 0.4] },
  'uruha-window':      { title: 'By the Window',       char: 'uruha',  art: 'assets/scenes/uruha-window.jpg',      focus: [0.5, 0.35] },
  'uruha-stage':       { title: 'Spotlight',           char: 'uruha',  art: 'assets/scenes/uruha-stage.jpg',       focus: [0.3, 0.4] },
  'lisa-tea':          { title: 'Tea Time',            char: 'lisa',   art: 'assets/scenes/lisa-tea.jpg',          focus: [0.3, 0.35] },
  'lisa-tower':        { title: 'Under the Tower',     char: 'lisa',   art: 'assets/scenes/lisa-tower.jpg',        focus: [0.35, 0.3] },
  'sendo-sunset':      { title: 'Walk Home at Sunset', char: 'sendo',  art: 'assets/scenes/sendo-sunset.jpg',      focus: [0.55, 0.3], credit: '© VSPO! (sample image)' },
};
const scenesOf = id => Object.keys(SCENES).filter(k => SCENES[k].char === id);

// Environment backgrounds (no characters) for battles and story scenes.
const BACKGROUNDS = {
  'street-day':    { title: 'Morning Street',     art: 'assets/bg/street-day.webp',    focus: [0.5, 0.5] },
  'city-day':      { title: 'Downtown',           art: 'assets/bg/city-day.jpg',       focus: [0.5, 0.5], credit: 'KEIRAWORKS' },
  'sunset-street': { title: 'Sunset Street',      art: 'assets/bg/sunset-street.jpg',  focus: [0.5, 0.5], credit: 'ArseniXC (Soviet Games)' },
  'alley':         { title: 'Neon Alley',         art: 'assets/bg/alley.jpg',          focus: [0.5, 0.5], credit: 'shinasty' },
  'rooftop':       { title: 'Night Rooftop',      art: 'assets/bg/rooftop.jpg',        focus: [0.5, 0.5] },
  'tunnel':        { title: 'Underground Tunnel', art: 'assets/bg/tunnel.jpg',         focus: [0.6, 0.5] },
};

// Which background each stage is fought (and its story told) in.
const STAGE_BG = {
  '1-1': 'street-day', '1-2': 'city-day', '1-3': 'sunset-street', '1-4': 'alley', '1-5': 'alley', '1-6': 'tunnel',
  '2-1': 'alley', '2-2': 'rooftop', '2-3': 'tunnel', '2-4': 'rooftop', '2-5': 'rooftop', '2-6': 'tunnel',
  '3-1': 'city-day', '3-2': 'sunset-street', '3-3': 'alley', '3-4': 'rooftop', '3-5': 'tunnel', '3-6': 'rooftop',
};
const towerBg = floor => TOWER_BOSSES[floor] ? 'tunnel' : ['street-day', 'city-day', 'sunset-street', 'alley', 'rooftop'][floor % 5];

// Daily login track (repeats after day 7).
const LOGIN_REWARDS = [
  { gems: 300 }, { exp: 2000 }, { gems: 300 }, { exp: 3000 }, { gems: 500 }, { exp: 5000 }, { gems: 1600 },
];

// Player Rank: XP from battles. Each rank needs a bit more XP; rank-ups give gems.
const rankXpNeed = rank => 120 + rank * 60;
const RANK_UP_GEMS = 200;

// upChance = chance a ★5 is the rate-up. type decides what the pool holds.
// scene = backdrop shown behind the banner.
// pity = which pity counter the banner uses (member banners share one).
const BANNERS = {
  member: {
    type: 'char', pity: 'member', scene: 'noah-cap', name: 'Little Devil', rateUp: 'noah', upChance: 1,
    pool5: ['noah'], pool4: ['sendo', 'tsuna'],
    rate5: 0.03, rate4: 0.15, pity5: 40, pity4: 10, cost: 160,
  },
  hinano: {
    type: 'char', pity: 'member', scene: 'hinano-room', name: 'Candy Fortress', rateUp: 'hinano', upChance: 1,
    pool5: ['hinano'], pool4: ['sendo', 'tsuna'],
    rate5: 0.03, rate4: 0.15, pity5: 40, pity4: 10, cost: 160,
  },
  uruha: {
    type: 'char', pity: 'member', scene: 'uruha-stage', name: 'Straight Shot', rateUp: 'uruha', upChance: 1,
    pool5: ['uruha'], pool4: ['sendo', 'tsuna'],
    rate5: 0.03, rate4: 0.15, pity5: 40, pity4: 10, cost: 160,
  },
  lisa: {
    type: 'char', pity: 'member', scene: 'lisa-tower', name: 'Second Helping', rateUp: 'lisa', upChance: 1,
    pool5: ['lisa'], pool4: ['sendo', 'tsuna'],
    rate5: 0.03, rate4: 0.15, pity5: 40, pity4: 10, cost: 160,
  },
  // Memory banners share one pity counter. Each one only drops its own ★5 (100% rate-up).
  memory: {
    type: 'memory', pity: 'memory', scene: 'noah-goose', name: 'Curtain Call', rateUp: 'festival', upChance: 1,
    pool5: ['festival'], pool4: ['snow', 'ranked', 'setup', 'letter', 'drink'],
    rate5: 0.03, rate4: 0.15, pity5: 40, pity4: 10, cost: 160,
  },
  memoryHinano: {
    type: 'memory', pity: 'memory', scene: 'sendo-class', name: 'After-Hours Study', rateUp: 'study', upChance: 1,
    pool5: ['study'], pool4: ['snow', 'ranked', 'setup', 'letter', 'drink'],
    rate5: 0.03, rate4: 0.15, pity5: 40, pity4: 10, cost: 160,
  },
  memoryUruha: {
    type: 'memory', pity: 'memory', scene: 'uruha-window', name: 'Sweet Tooth', rateUp: 'lollipop', upChance: 1,
    pool5: ['lollipop'], pool4: ['snow', 'ranked', 'setup', 'letter', 'drink'],
    rate5: 0.03, rate4: 0.15, pity5: 40, pity4: 10, cost: 160,
  },
  memoryLisa: {
    type: 'memory', pity: 'memory', scene: 'lisa-tea', name: 'Feast Mode', rateUp: 'feast', upChance: 1,
    pool5: ['feast'], pool4: ['snow', 'ranked', 'setup', 'letter', 'drink'],
    rate5: 0.03, rate4: 0.15, pity5: 40, pity4: 10, cost: 160,
  },
};
// Spark: every recruit adds 1 point to that pity group; at SPARK_COST points the
// banner's rate-up ★5 can be taken directly. Banners rotate weekly (cosmetic timer).
const SPARK_COST = 60;
const bannerEnds = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d; };
const ITEM_EXP = 300;     // 3★ pull = Superchat Tokens (level-up currency)
const DUPE_GEMS = 200;    // duplicate past max duplicates / Rank turns into gems

// Missions: one-time goals with gem rewards. check(save) -> true when done.
const totalStars = s => Object.values(s.stars).reduce((a, st) => a + st.filter(Boolean).length, 0);
const MISSIONS = [
  { id: 'first-clear', text: 'Clear stage 1-1', reward: 300, check: s => !!s.cleared['1-1'] },
  { id: 'team4', text: 'Field a full squad of 3', reward: 200, check: s => s.team.filter(Boolean).length >= 3 },
  { id: 'pull10', text: 'Recruit 10 times', reward: 300, check: s => s.stats.pulls >= 10 },
  { id: 'equip', text: 'Equip a Memory', reward: 200, check: s => Object.keys(s.equip).length > 0 },
  { id: 'collab', text: 'Use a Collab attack', reward: 200, check: s => s.stats.collabs >= 1 },
  { id: 'talk1', text: 'Watch an Off-stream Talk', reward: 200, check: s => Object.keys(s.talks).length >= 1 },
  { id: 'lv10', text: 'Raise a member to Lv 10', reward: 400, check: s => Object.values(s.chars).some(c => c.lvl >= 10) },
  { id: 'stars9', text: 'Earn 9 stage stars', reward: 400, check: s => totalStars(s) >= 9 },
  { id: 'ch1', text: 'Clear Chapter 1', reward: 1000, check: s => !!s.cleared['1-6'] },
  { id: 'pull50', text: 'Recruit 50 times', reward: 800, check: s => s.stats.pulls >= 50 },
  { id: 'lv20', text: 'Raise a member to Lv 20', reward: 800, check: s => Object.values(s.chars).some(c => c.lvl >= 20) },
  { id: 'stars24', text: 'Earn 24 stage stars', reward: 1000, check: s => totalStars(s) >= 24 },
  { id: 'ch2', text: 'Clear Chapter 2', reward: 2000, check: s => !!s.cleared['2-6'] },
  { id: 'tower10', text: 'Reach Tower floor 10', reward: 800, check: s => s.tower.best >= 10 },
  { id: 'lv30', text: 'Raise a member to Lv 30', reward: 1200, check: s => Object.values(s.chars).some(c => c.lvl >= 30) },
  { id: 'skill9', text: 'Raise any skill to Rank 9', reward: 800, check: s => Object.values(s.chars).some(c => Object.values(c.skills).some(r => r >= 9)) },
  { id: 'ch3', text: 'Clear Chapter 3', reward: 3000, check: s => !!s.cleared['3-6'] },
  { id: 'tower30', text: 'Clear Tower floor 30', reward: 3000, check: s => s.tower.best >= 30 },
];

const MAX_LEVEL = 30;
const levelCost = lvl => 60 + lvl * 60;

// Skills: rank 1-9, each rank adds +10% to that skill's effect.
// The rank cap rises with level: 3, then 6 at Lv 8, then 9 at Lv 15.
const MAX_SKILL_RANK = 9;
const skillCap = lvl => Math.min(MAX_SKILL_RANK, 3 + Math.floor((lvl - 1) / 7) * 3);
const skillCost = rank => 100 + rank * 100;
const SKILL_RANK_BONUS = 0.1;

// Duplicates: pulling an owned member gives a duplicate token. Tokens unlock
// these 5 nodes in order. mods: atk/hp/def/crit/critDmg (fractions), spd,
// energy (start of battle), boost: { basic|skill|ult: extra effect }.
const MAX_DUPES = 5;
const DUPLICATES = {
  sendo: [
    { name: 'Afterglow', desc: 'ATK +8%.', mods: { atk: 0.08 } },
    { name: 'Warm Welcome', desc: 'Start every battle with +20 Energy.', mods: { energy: 20 } },
    { name: 'Golden Hour', desc: 'Skill "Cheer Up!" effect +20%.', mods: { boost: { skill: 0.2 } } },
    { name: 'Peace Sign', desc: 'HP +12%.', mods: { hp: 0.12 } },
    { name: 'Sunset Encore', desc: 'Ultimate "Sunny Encore" effect +30%.', mods: { boost: { ult: 0.3 } } },
  ],
  hinano: [
    { name: 'Study Notes', desc: 'DEF +10%.', mods: { def: 0.1 } },
    { name: 'Shot Call', desc: 'Start every battle with +20 Energy.', mods: { energy: 20 } },
    { name: 'Extra Sweet', desc: 'Skill "Sweet Barrier" effect +20%.', mods: { boost: { skill: 0.2 } } },
    { name: 'Steady Hands', desc: 'HP +12%.', mods: { hp: 0.12 } },
    { name: 'Sugar Castle', desc: 'Ultimate "Candy Fortress" effect +30%.', mods: { boost: { ult: 0.3 } } },
  ],
  noah: [
    { name: 'Little Fang', desc: 'CRIT Rate +8%.', mods: { crit: 0.08 } },
    { name: 'Midnight Snack', desc: 'Start every battle with +20 Energy.', mods: { energy: 20 } },
    { name: 'Devil\'s Whisper', desc: 'Skill "Devil\'s Spotlight" effect +20%.', mods: { boost: { skill: 0.2 } } },
    { name: 'Nap Power', desc: 'CRIT DMG +20%.', mods: { critDmg: 0.2 } },
    { name: 'Encore at Midnight', desc: 'Ultimate "Midnight Finale" effect +30%.', mods: { boost: { ult: 0.3 } } },
  ],
  tsuna: [
    { name: 'Cat Reflexes', desc: 'SPD +6.', mods: { spd: 6 } },
    { name: 'Drink Stash', desc: 'Start every battle with +20 Energy.', mods: { energy: 20 } },
    { name: 'Wet Paint', desc: 'Skill "Paint Splash" effect +20%.', mods: { boost: { skill: 0.2 } } },
    { name: 'Ranked Grind', desc: 'ATK +12%.', mods: { atk: 0.12 } },
    { name: 'Rush Hour', desc: 'Ultimate "Maid Café Rush" effect +30%.', mods: { boost: { ult: 0.3 } } },
  ],
  uruha: [
    { name: 'Steady Aim', desc: 'CRIT Rate +8%.', mods: { crit: 0.08 } },
    { name: 'Ready Check', desc: 'Start every battle with +20 Energy.', mods: { energy: 20 } },
    { name: 'Loud Callout', desc: 'Skill "Callout Shot" effect +20%.', mods: { boost: { skill: 0.2 } } },
    { name: 'Composure', desc: 'ATK +10%.', mods: { atk: 0.1 } },
    { name: 'Full Magazine', desc: 'Ultimate "Lupinus Barrage" effect +30%.', mods: { boost: { ult: 0.3 } } },
  ],
  lisa: [
    { name: 'Sketchbook', desc: 'HP +10%.', mods: { hp: 0.1 } },
    { name: 'Pre-Stream Snack', desc: 'Start every battle with +20 Energy.', mods: { energy: 20 } },
    { name: 'Extra Portion', desc: 'Skill "Snack Break" effect +20%.', mods: { boost: { skill: 0.2 } } },
    { name: 'Second Wind', desc: 'SPD +6.', mods: { spd: 6 } },
    { name: 'Dessert Course', desc: 'Ultimate "All-You-Can-Eat" effect +30%.', mods: { boost: { ult: 0.3 } } },
  ],
};
