// Action battle data: what each member does in a real-time fight, how each
// enemy behaves, and the numbers that balance it all.
// mult = × the user's ATK. cd = cooldown in seconds. Ranges are in metres
// (a chibi is about 1.25 m tall; the arena is 23 m across).

// ---------- tuning ----------
const ACT = {
  arena: 11,                  // arena radius
  speed: 6.0,                 // leader run speed
  dodgeDist: 3.9, dodgeTime: 0.22, iframes: 0.4, perfect: 0.26, dodgeCharges: 2, dodgeRecharge: 1.5,
  energyPerSec: 1.3, energyHit: 1.25, energyHurt: 4, energyPerfect: 18, energyKill: 2,
  comboReset: 2.6,
  supportShare: 0.1,          // the leader gains 10% of each support's HP, ATK and DEF
  heartChance: 0.12, heartHeal: 0.07,
  // Enemy scaling on top of the base stats in ENEMIES (see makeFoe in action.js).
  foeHp: 3.0, foeHpPerLv: 0.18, foeAtk: 2.0, foeAtkPerLv: 0.2, bossHp: 1.45, bossAtk: 1.1,
  eliteHp: 2.4, eliteAtk: 1.3,   // Elites: one per wave from chapter 2, two in Elite rounds
  defAlly: 160, defEnemy: 100,
  breakDmg: 1.3, breakTime: 3.2, bossBreakTime: 4.2,
  weakDmg: 1.2, weakStagger: 1.8,
  stagger: { basic: 6, skill: 16, ult: 30, support: 14, follow: 6, dot: 0 },
};

// ---------- member kits ----------
// basic.combo: each step is { act: chibi animation, t: step length, hit: when it lands, mult, ... }
//   melee steps hit everything in an arc (range, arc in radians); shot steps fire a projectile.
// skill / support / ult: run(b, u) where b is the ActionBattle and u the member using it.
// Support skills are used by the two members who are not leading: they jump in, act, and leave.
const ACTION_KITS = {
  sendo: {
    style: 'ranged', range: 6.5,
    basic: { name: 'Peace Poke', desc: 'Auto-attack: throws two sun sparks, then a big one that bursts on impact.',
      combo: [{ act: 'throw', t: 0.36, hit: 0.12, mult: 0.62, shot: 'sun' }, { act: 'throw', t: 0.36, hit: 0.12, mult: 0.62, shot: 'sun' },
              { act: 'peace', t: 0.55, hit: 0.2, mult: 1.25, shot: 'sunBig', splash: 1.4 }] },
    skill: { name: 'Cheer Up!', cd: 9, desc: 'A sunburst around Sendo deals 170% ATK and knocks enemies back. She heals 8% max HP and gains +25% ATK for 6s.',
      run: (b, u) => {
        u.model.play('cheer', 1.4);
        b.after(0.18, () => {
          b.fx.nova(u.pos.x, u.pos.z, 3.4, '#ffb547');
          b.hitCircle(u, u.pos.x, u.pos.z, 3.4, 1.7, { kind: 'skill', knock: 2.2 });
          b.healHero(b.player.maxHp * 0.08, u);
          b.buff(b.player, 'atk', 0.25, 6, 'ATK↑');
        });
      } },
    support: { name: 'Sunset Cheer', cd: 16, desc: 'Sendo jumps in and bursts the nearest group for 180% ATK, then gives the leader +20% ATK for 8s.',
      run: (b, u) => {
        const c = b.cluster(u.pos, 9) || u.pos;
        b.faceTo(u, c);
        u.model.play('peace');
        b.after(0.22, () => {
          b.fx.nova(c.x, c.z, 2.8, '#ffb547');
          b.hitCircle(u, c.x, c.z, 2.8, 1.8, { kind: 'support' });
          b.buff(b.player, 'atk', 0.2, 8, 'ATK↑');
        });
      } },
    ult: { name: 'Sunny Encore', desc: 'Three waves of sunlight around Sendo deal 230% ATK each. Heals 25% max HP and gives +30% ATK for 10s.',
      run: (b, u) => {
        for (let i = 0; i < 3; i++) b.after(0.1 + i * 0.32, () => {
          b.fx.nova(u.pos.x, u.pos.z, 5 + i * 0.5, '#ffcf5a');
          b.hitCircle(u, u.pos.x, u.pos.z, 5 + i * 0.5, 2.3, { kind: 'ult' });
          b.fx.shake(0.25);
        });
        b.healHero(b.player.maxHp * 0.25, u);
        b.buff(b.player, 'atk', 0.3, 10, 'ATK↑');
      } },
    talent: { name: 'Cheer Chain', desc: 'While Sendo is in the squad, every Break heals the leader 4% of Sendo\'s max HP.' },
  },
  hinano: {
    style: 'melee', range: 1.9,
    basic: { name: 'Lollipop Bonk', desc: 'Auto-attack: two lollipop swings, then a slam that hits everything nearby. Bonus damage from DEF.',
      combo: [{ act: 'slashA', t: 0.4, hit: 0.12, mult: 1.05, def: 0.6, range: 2.0, arc: 2.2 }, { act: 'slashB', t: 0.4, hit: 0.12, mult: 1.05, def: 0.6, range: 2.0, arc: 2.2 },
              { act: 'slam', t: 0.6, hit: 0.2, mult: 1.9, def: 0.9, range: 2.3, arc: 6.3, knock: 1.4 }] },
    skill: { name: 'Sweet Barrier', cd: 10, desc: 'Hinano gains a shield of 22% max HP (+DEF) for 8s and slams the ground for 170% ATK + 100% DEF, pulling enemies toward her.',
      run: (b, u) => {
        u.model.play('slam');
        b.after(0.2, () => {
          b.shieldHero(b.player.maxHp * 0.22 + b.statDef(u) * 1.5, 8);
          b.fx.nova(u.pos.x, u.pos.z, 3.6, '#ff7eb6');
          b.hitCircle(u, u.pos.x, u.pos.z, 3.6, 1.7, { kind: 'skill', def: 1.0, pull: 1.6 });
        });
      } },
    support: { name: 'Candy Shield', cd: 16, desc: 'Hinano jumps in, slams for 160% ATK, and shields the leader for 16% of the leader\'s max HP.',
      run: (b, u) => {
        u.model.play('slam');
        b.after(0.2, () => {
          b.fx.nova(u.pos.x, u.pos.z, 2.8, '#ff7eb6');
          b.hitCircle(u, u.pos.x, u.pos.z, 2.8, 1.6, { kind: 'support', def: 0.6 });
          b.shieldHero(b.player.maxHp * 0.16, 8);
        });
      } },
    ult: { name: 'Candy Fortress', desc: 'A giant candy dome: 320% ATK + 150% DEF to everything nearby, a shield of 35% max HP, and 30% less damage taken for 8s.',
      run: (b, u) => {
        u.model.play('slam');
        b.after(0.25, () => {
          b.fx.dome(u.pos.x, u.pos.z, 4.6, '#ff8fc4');
          b.hitCircle(u, u.pos.x, u.pos.z, 4.6, 3.2, { kind: 'ult', def: 1.5 });
          b.shieldHero(b.player.maxHp * 0.35, 10);
          b.buff(b.player, 'dr', 0.3, 8, 'DMG↓');
          b.fx.shake(0.5);
        });
      } },
    talent: { name: 'Sweet Revenge', desc: 'While her shield holds, enemies that hit Hinano take 50% ATK + 60% DEF back.' },
  },
  noah: {
    style: 'melee', range: 2.0,
    basic: { name: 'Bat Wing Slash', desc: 'Auto-attack: a fast four-hit sabre combo; the last slash hits harder.',
      combo: [{ act: 'slashA', t: 0.3, hit: 0.09, mult: 0.75, range: 2.1, arc: 2.0 }, { act: 'slashB', t: 0.3, hit: 0.09, mult: 0.75, range: 2.1, arc: 2.0 },
              { act: 'slashA', t: 0.32, hit: 0.1, mult: 0.9, range: 2.1, arc: 2.0 }, { act: 'spin', t: 0.5, hit: 0.2, mult: 1.45, range: 2.4, arc: 6.3 }] },
    skill: { name: 'Devil\'s Spotlight', cd: 7, desc: 'Noah dashes 5 m through enemies, dealing 260% ATK to each and Marking them: +20% damage taken for 6s. Can\'t be hit during the dash.',
      run: (b, u) => {
        u.model.play('dash');
        b.dashHero(5, 0.2, () => {
          u.model.play('slashA');
          b.fx.slash(u, '#c58bff', 1.6);
        }, { kind: 'skill', mult: 2.6, mark: 0.2, w: 1.8 });
      } },
    support: { name: 'Night Raid', cd: 14, desc: 'Noah drops in on the nearest enemy and slashes everything around it for 230% ATK, Marking them.',
      run: (b, u) => {
        const t = b.nearestFoe(u.pos, 30);
        if (t) { u.pos.x = t.pos.x - Math.sin(t.facing) * 1.4; u.pos.z = t.pos.z - Math.cos(t.facing) * 1.4; b.faceTo(u, t.pos); }
        u.model.play('spin');
        b.after(0.15, () => {
          b.fx.slash(u, '#c58bff', 2.4, true);
          b.hitCircle(u, u.pos.x, u.pos.z, 2.6, 2.3, { kind: 'support', mark: 0.2 });
        });
      } },
    ult: { name: 'Midnight Finale', desc: 'Night falls: seven slashes hit every enemy within 7 m for 90% ATK each, then a finale deals 380% ATK to the nearest (+15% crit).',
      run: (b, u) => {
        b.fx.tint('#2a0a4a', 1.6);
        for (let i = 0; i < 7; i++) b.after(0.08 + i * 0.11, () => {
          b.foesNear(u.pos.x, u.pos.z, 7).forEach(e => { b.fx.slashAt(e.pos, '#c58bff'); b.damage(u, e, 0.9, { kind: 'ult' }); });
        });
        b.after(0.95, () => {
          const t = b.nearestFoe(u.pos, 9);
          u.model.play('slam');
          if (t) { b.fx.slashAt(t.pos, '#d9b8ff', 2.2); b.damage(u, t, 3.8, { kind: 'ult', critBonus: 0.15 }); }
          b.fx.shake(0.6);
        });
      } },
    talent: { name: 'Snack Time', desc: 'Whenever an enemy is Broken, Noah follows up on it for 120% ATK (even from the bench).' },
  },
  tsuna: {
    style: 'melee', range: 2.6,
    basic: { name: 'Cat Scratch', desc: 'Auto-attack: two wide brush swipes, then a paint flick that Paints what it hits.',
      combo: [{ act: 'slashA', t: 0.36, hit: 0.11, mult: 0.8, range: 2.7, arc: 2.4 }, { act: 'slashB', t: 0.36, hit: 0.11, mult: 0.8, range: 2.7, arc: 2.4 },
              { act: 'throw', t: 0.46, hit: 0.15, mult: 1.2, shot: 'paint', splash: 1.5, paint: true }] },
    skill: { name: 'Paint Splash', cd: 8, desc: 'Lobs a paint bomb at the biggest group: 180% ATK in a wide splash, then a puddle that Paints and slows enemies for 4s.',
      run: (b, u) => {
        const c = b.cluster(u.pos, 9) || b.ahead(u, 4);
        u.model.play('throw');
        b.lob(u, c, 0.45, '#ff5a5a', () => {
          b.fx.splat(c.x, c.z, 3, '#ff5a5a');
          b.hitCircle(u, c.x, c.z, 3, 1.8, { kind: 'skill', paint: true });
          b.puddle(u, c.x, c.z, 3, 4, '#ff5a5a');
        });
      } },
    support: { name: 'Splash Art', cd: 15, desc: 'Tsuna jumps in and throws three paint bombs at enemies: 130% ATK each, Painting everything they hit.',
      run: (b, u) => {
        u.model.play('throw');
        const ts = b.livingFoes().slice().sort(() => Math.random() - 0.5).slice(0, 3);
        (ts.length ? ts : [null]).forEach((t, i) => {
          const c = t ? t.pos.clone() : b.ahead(u, 3 + i);
          b.after(i * 0.12, () => b.lob(u, c, 0.4, ['#ff5a5a', '#ffcf3a', '#4d8bff'][i], () => {
            b.fx.splat(c.x, c.z, 2.2, ['#ff5a5a', '#ffcf3a', '#4d8bff'][i]);
            b.hitCircle(u, c.x, c.z, 2.2, 1.3, { kind: 'support', paint: true });
          }));
        });
      } },
    ult: { name: 'Maid Café Rush', desc: 'Paint rains on the arena: 12 splashes over 2 seconds land on enemies for 130% ATK each and Paint them.',
      run: (b, u) => {
        for (let i = 0; i < 12; i++) b.after(0.1 + i * 0.16, () => {
          const fs = b.livingFoes(), t = fs[i % Math.max(1, fs.length)];
          const c = t ? t.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5)) : b.ahead(u, 2 + Math.random() * 4);
          const col = ['#ff5a5a', '#ffcf3a', '#4d8bff', '#ff7eb6'][i % 4];
          b.fx.splat(c.x, c.z, 2, col);
          b.hitCircle(u, c.x, c.z, 2, 1.3, { kind: 'ult', paint: true });
        });
      } },
    talent: { name: 'Splash Back', desc: 'Skills, Support Skills and Ultimates deal +25% damage to Painted enemies.' },
  },
  uruha: {
    style: 'ranged', range: 8,
    basic: { name: 'Quick Draw', desc: 'Auto-attack: three fast shots. Each shot deals double Stagger.',
      combo: [{ act: 'shoot', t: 0.2, hit: 0.05, mult: 0.62, shot: 'bullet', stagger: 2 }, { act: 'shoot', t: 0.2, hit: 0.05, mult: 0.62, shot: 'bullet', stagger: 2 },
              { act: 'shoot', t: 0.42, hit: 0.06, mult: 0.85, shot: 'bullet', stagger: 2 }] },
    skill: { name: 'Callout Shot', cd: 8, desc: 'A charged shot that pierces in a line: 320% ATK and huge Stagger. Broken enemies take 40% more from it.',
      run: (b, u) => {
        const t = b.nearestFoe(u.pos, 14);
        if (t) b.faceTo(u, t.pos);
        u.model.play('shoot', 0.6);
        b.after(0.18, () => {
          const a = u.facing;
          b.fx.beam(u.pos, a, 13, '#5f86ff');
          b.hitLine(u, u.pos.x, u.pos.z, a, 13, 1.4, 3.2, { kind: 'skill', stagger: 2.5, brokenBonus: 0.4 });
          b.fx.shake(0.2);
        });
      } },
    support: { name: 'Cover Fire', cd: 14, desc: 'Uruha appears and snipes the toughest enemy for 300% ATK with massive Stagger.',
      run: (b, u) => {
        const t = b.toughestFoe();
        if (!t) return;
        b.faceTo(u, t.pos);
        u.model.play('shoot', 0.6);
        b.after(0.2, () => {
          b.fx.beam(u.pos, u.facing, u.pos.distanceTo(t.pos) + 0.5, '#5f86ff');
          b.damage(u, t, 3.0, { kind: 'support', stagger: 3 });
        });
      } },
    ult: { name: 'Lupinus Barrage', desc: '14 shots at random enemies for 100% ATK each (+20% crit), then every enemy loses 40% of its Stagger.',
      run: (b, u) => {
        for (let i = 0; i < 14; i++) b.after(0.05 + i * 0.09, () => {
          const fs = b.livingFoes();
          if (!fs.length) return;
          const t = fs[Math.floor(Math.random() * fs.length)];
          b.faceTo(u, t.pos);
          u.model.play('shoot', 2);
          b.fx.beam(u.pos, u.facing, u.pos.distanceTo(t.pos), '#7f9cff', 0.08);
          b.damage(u, t, 1.0, { kind: 'ult', critBonus: 0.2 });
        });
        b.after(1.4, () => b.livingFoes().forEach(e => b.stagger(e, e.maxPoise * 0.4, u)));
      } },
    talent: { name: 'Straight Man', desc: 'Whenever Uruha Breaks an enemy, she gains 25 Energy and her next Skill deals +20% damage.' },
  },
  lisa: {
    style: 'ranged', range: 5.5,
    basic: { name: 'Doodle Dash', desc: 'Auto-attack: lobs donuts that burst in a small splash. 25% chance to trip into a bonus hit that heals her a little.',
      combo: [{ act: 'throw', t: 0.4, hit: 0.14, mult: 0.72, shot: 'donut', splash: 1.2 }, { act: 'throw', t: 0.4, hit: 0.14, mult: 0.72, shot: 'donut', splash: 1.2 },
              { act: 'throw', t: 0.5, hit: 0.16, mult: 1.2, shot: 'cake', splash: 1.6 }] },
    skill: { name: 'Snack Break', cd: 10, desc: 'Heals 18% max HP, gives 15 Energy, and drops two snacks nearby (each heals 7% when picked up).',
      run: (b, u) => {
        u.model.play('cheer', 1.4);
        b.healHero(b.player.maxHp * 0.18, u);
        b.addEnergy(15);
        for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2; b.dropSnack(u.pos.x + Math.sin(a) * 2.2, u.pos.z + Math.cos(a) * 2.2, 0.07); }
      } },
    support: { name: 'Picnic Time', cd: 15, desc: 'Lisa pops in, heals the leader 15% max HP and gives 15 Energy, then throws a cake bomb for 150% ATK.',
      run: (b, u) => {
        u.model.play('cheer', 1.4);
        b.healHero(b.player.maxHp * 0.15, u);
        b.addEnergy(15);
        const c = b.cluster(u.pos, 8);
        if (c) b.lob(u, c, 0.4, '#c3d45a', () => { b.fx.splat(c.x, c.z, 2.4, '#e8b26a'); b.hitCircle(u, c.x, c.z, 2.4, 1.5, { kind: 'support' }); });
      } },
    ult: { name: 'All-You-Can-Eat', desc: 'A feast falls from the sky: 8 food bombs for 140% ATK each. Heals 30% max HP and gives +20% ATK and 15% less damage taken for 10s.',
      run: (b, u) => {
        b.healHero(b.player.maxHp * 0.3, u);
        b.buff(b.player, 'atk', 0.2, 10, 'ATK↑');
        b.buff(b.player, 'dr', 0.15, 10, 'DMG↓');
        for (let i = 0; i < 8; i++) b.after(0.15 + i * 0.18, () => {
          const fs = b.livingFoes(), t = fs[i % Math.max(1, fs.length)];
          const c = t ? t.pos.clone() : b.ahead(u, 2 + Math.random() * 4);
          b.fx.splat(c.x, c.z, 2.1, ['#e8b26a', '#ff8fb8', '#c3d45a'][i % 3]);
          b.hitCircle(u, c.x, c.z, 2.1, 1.4, { kind: 'ult' });
        });
      } },
    talent: { name: 'Clumsy Luck', desc: 'Lisa\'s auto-attacks have a 25% chance to trip into a bonus hit for 60% ATK that heals her 3% max HP.' },
  },
};

// Action wording for the skill texts shown on the Members, Recruit and Team screens.
Object.keys(ACTION_KITS).forEach(id => {
  const c = CHARACTERS[id], k = ACTION_KITS[id];
  if (!c) return;
  c.kit.basic.desc = k.basic.desc;
  c.kit.skill.desc = k.skill.desc;
  c.kit.ult.desc = k.ult.desc;
  c.kit.support = { name: k.support.name, desc: k.support.desc };
  c.talent = { name: k.talent.name, desc: k.talent.desc };
});

// Memory passives in action battles (the stat bonuses work as before).
const ACTION_MEM = {
  snow:      { type: 'skillHeal',   passive: 'After using a Skill, the leader heals {v}% of the wearer\'s max HP.' },
  study:     { type: 'startShield', passive: 'Start every battle with a shield worth {v}% of the wearer\'s max HP.' },
  ranked:    { type: 'skillAtk',    passive: 'After using a Skill, gain +{v}% ATK for 6 seconds.' },
  festival:  { type: 'ultDmg',      passive: 'Ultimate deals +{v}% damage.' },
  lollipop:  { type: 'skillDmg',    passive: 'Skill and Support Skill deal +{v}% damage.' },
  feast:     { type: 'healBoost',   passive: 'Heals from the wearer are {v}% stronger.' },
  setup:     { type: 'startEnergy', passive: 'Start battle with +{v} Energy.' },
  drink:     { type: 'startEnergy', passive: 'Start battle with +{v} Energy.' },
  letter:    { type: 'actionHeal',  passive: 'Heal {v}% of the wearer\'s max HP after each Skill or Support Skill.' },
  fireworks: { type: 'ultAtk',      passive: 'After using the Ultimate, gain +{v}% ATK for 10 seconds.' },
  midnight:  { type: 'regen',       passive: 'Heal {v}% of the wearer\'s max HP every 6 seconds.' },
};
Object.entries(ACTION_MEM).forEach(([id, m]) => { if (MEMORIES[id]) MEMORIES[id].passive = m.passive; });

// Raid rule changes in action terms.
Object.assign(RAID_MODS.spcap, { name: 'Low Bandwidth', desc: 'Skill cooldowns are 40% longer.' });
Object.assign(RAID_MODS.hype, { name: 'Viral', desc: 'Support Skills recharge twice as fast.' });
Object.assign(RAID_MODS.swift, { desc: 'Enemies move and attack 25% faster.' });

// ---------- enemies ----------
// pack: how many spawn for each entry in a stage's wave list. hp: health share per unit.
// moves: attacks the enemy picks from when in range.
//   shape circle (at: 'self' | 'target'), cone (r, arc), line (len, w) = red zone that hits on fire;
//   volley = slow orbs; heal / guard = support moves. windup = warning time before it lands.
const FOE_AI = {
  grunt:    { pack: 4, hp: 0.45, speed: 2.7, size: 0.5, keep: 0, moves: [{ name: 'Bite', shape: 'cone', r: 1.9, arc: 1.3, windup: 0.6, mult: 1.0, cd: 2.2, range: 1.6 },
              { name: 'Pounce', shape: 'circle', at: 'target', r: 1.5, windup: 0.85, mult: 1.2, cd: 5.5, range: 6, leap: true }] },
  sniper:   { pack: 2, hp: 0.6, speed: 2.4, size: 0.45, keep: 7, moves: [{ name: 'Triple Ping', shape: 'line', len: 12, w: 0.6, windup: 1.1, mult: 1.0, cd: 6.5, range: 11, fan: 3 },
              { name: 'Ping Shot', shape: 'line', len: 13, w: 0.8, windup: 1.0, mult: 1.35, cd: 3.4, range: 12 }] },
  spammer:  { pack: 2, hp: 0.6, speed: 2.1, size: 0.5, keep: 5.5, moves: [{ name: 'Spam', volley: 5, spread: 0.9, speed: 5.5, windup: 0.6, mult: 0.6, cd: 3.4, range: 9 },
              { name: 'Patch Notes', heal: 0.12, cd: 7, range: 99 }] },
  firewall: { pack: 1, hp: 1.1, speed: 1.6, size: 0.75, keep: 0, moves: [{ name: 'Slam', shape: 'circle', at: 'self', r: 3, windup: 1.1, mult: 1.6, cd: 3.6, range: 2.6 },
              { name: 'Firewall', guard: 0.25, dur: 5, cd: 10, range: 99 }] },
  desync:   { pack: 2, hp: 0.55, speed: 4.2, size: 0.45, keep: 0, moves: [{ name: 'Blink', blink: true, shape: 'cone', r: 2.0, arc: 1.6, windup: 0.55, mult: 1.0, cd: 6, range: 10, drain: 8 },
              { name: 'Glitch Dash', shape: 'line', len: 7, w: 1.1, windup: 0.65, mult: 1.0, cd: 2.8, range: 6, dash: true, drain: 8 }] },
  troll:    { pack: 1, hp: 1.0, speed: 2.0, size: 0.65, keep: 4, moves: [{ name: 'Flame Bait', shape: 'circle', at: 'target', r: 2.2, windup: 1.2, mult: 1.5, cd: 3.2, range: 9, count: 2 },
              { name: 'Bite', shape: 'cone', r: 2.2, arc: 1.4, windup: 0.7, mult: 1.1, cd: 2.4, range: 2 }] },
  clipper:  { pack: 2, hp: 0.6, speed: 3.9, size: 0.45, keep: 0, moves: [{ name: 'Snip', shape: 'cone', r: 2.0, arc: 1.5, windup: 0.45, mult: 0.9, cd: 2.1, range: 1.7, steal: 15 }] },
  echo:     { pack: 2, hp: 0.7, speed: 3.1, size: 0.45, keep: 0, moves: [{ name: 'Copy Slash', shape: 'cone', r: 2.1, arc: 1.6, windup: 0.55, mult: 1.1, cd: 2.4, range: 1.8 },
              { name: 'Echo Orb', volley: 3, spread: 0.5, speed: 6.5, windup: 0.55, mult: 0.6, cd: 6, range: 8 }] },
  phantom:  { pack: 1, hp: 1, speed: 2.9, size: 1.1, boss: true },
  core:     { pack: 1, hp: 1, speed: 1.2, size: 1.3, boss: true },
  algorithm:{ pack: 1, hp: 1, speed: 1.4, size: 1.3, boss: true },
};
const FOE_POISE = { grunt: 30, sniper: 26, spammer: 26, firewall: 70, desync: 26, troll: 60, clipper: 28, echo: 40 };
const BOSS_POISE_A = 220;

// Boss move lists. The boss works through its pattern in order; phase 2 starts
// at 50% HP and the final phase at 25%. charge = a Break cancels it.
const BOSS_MOVES = {
  phantom: {
    slash: { name: 'Crimson Slash', shape: 'cone', r: 3.6, arc: 2.0, windup: 0.75, mult: 1.5, range: 3.2 },
    dash: { name: 'Phantom Dash', shape: 'line', len: 10, w: 1.8, windup: 0.85, mult: 1.7, dash: true, range: 10 },
    storm: { name: 'Crimson Storm', shape: 'circle', at: 'self', r: 6.2, windup: 1.8, mult: 2.6, charge: true, range: 99 },
    rain: { name: 'Blade Rain', shape: 'circle', at: 'scatter', r: 1.7, count: 6, windup: 1.1, mult: 1.3, range: 99 },
  },
  core: {
    beam: { name: 'Beam', shape: 'line', len: 16, w: 1.4, windup: 1.0, mult: 1.6, range: 99 },
    pulse: { name: 'Core Pulse', ring: true, r: 10, speed: 5, windup: 0.6, mult: 1.4, range: 99 },
    summon: { name: 'Spawn Minions', summon: ['desync', 'spammer'], range: 99 },
    melt: { name: 'Meltdown', shape: 'circle', at: 'self', r: 7, windup: 2.4, mult: 3.0, charge: true, range: 99 },
    sweep: { name: 'Sweeping Beam', sweep: true, len: 14, w: 1.3, windup: 0.9, mult: 0.5, range: 99 },
  },
  algorithm: {
    ban: { name: 'Shadowban', shape: 'circle', at: 'target', r: 2.2, count: 3, windup: 1.0, mult: 1.0, silence: 4, range: 99 },
    recommend: { name: 'Recommend', volley: 8, spread: 6.28, speed: 5, windup: 0.7, mult: 0.8, range: 99 },
    trend: { name: 'Trend Shift', guard: 0.4, dur: 6, range: 99 },
    viral: { name: 'Viral Surge', grid: true, r: 2.3, windup: 1.6, mult: 2.2, charge: true, range: 99 },
    echoes: { name: 'Echo Split', summon: ['echo', 'echo'], range: 99 },
  },
};
const BOSS_PATTERN = {
  phantom: [['slash', 'slash', 'dash', 'storm'], ['slash', 'dash', 'rain', 'slash', 'storm'], ['dash', 'rain', 'storm', 'slash', 'rain', 'storm']],
  core: [['beam', 'pulse', 'beam', 'melt'], ['sweep', 'pulse', 'summon', 'beam', 'melt'], ['sweep', 'pulse', 'beam', 'pulse', 'melt']],
  algorithm: [['ban', 'recommend', 'trend', 'viral'], ['echoes', 'ban', 'recommend', 'viral', 'trend'], ['recommend', 'ban', 'viral', 'recommend', 'viral']],
};

// Stage clear-time targets for the third star (seconds), from auto-battle
// runs at the recommended level plus slack. Tower and event stages use a formula.
const STAGE_TIME = { '1-1': 40, '1-2': 35, '1-3': 30, '1-4': 50, '1-5': 40, '1-6': 110, '2-1': 35, '2-2': 70, '2-3': 80, '2-4': 60,
  '2-5': 135, '2-6': 170, '3-1': 55, '3-2': 70, '3-3': 95, '3-4': 65, '3-5': 60, '3-6': 185 };
function stageTime(st) {
  if (STAGE_TIME[st.id]) return STAGE_TIME[st.id];
  const n = st.waves.flat().reduce((a, k) => a + (FOE_AI[k] && FOE_AI[k].boss ? 70 : 9 * ((FOE_AI[k] || {}).pack || 1)), 0);
  return Math.round((20 + n + st.waves.length * 6) / 5) * 5;
}
