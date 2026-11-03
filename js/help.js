// "How to play" guide: openHelp('battle' | 'elements' | 'growth' | 'gacha' | 'live').
// Opened from the battle pause menu and the ? buttons on menu screens.

const STATUS_HELP = [
  ['ATK↑', 'Attack up.'], ['DMG↓', 'Takes less damage.'], ['SHIELD', 'Absorbs damage before HP for a few seconds.'],
  ['MARK', 'Takes more damage from everyone.'], ['PAINT', 'Takes damage every second.'],
  ['BURN', 'Sunburn: takes damage every second.'], ['ATK↓', 'Sugar Crash: deals less damage.'],
  ['EXPOSED', 'Your crits land on it more often.'], ['SPD↓', 'Food Coma: moves and attacks slower.'],
  ['GUARD', 'Takes less damage. Break it to remove the guard faster.'], ['SILENCED', 'Your leader can\'t use Skills, Supports or the Ultimate.'],
  ['BROKEN', 'Stagger emptied: stunned for a few seconds and takes 30% more damage.'],
];

const HELP = {
  battle: {
    title: 'Battle',
    html: () => `
      <h4>${ic('team')} Your squad</h4>
      <p>A squad is <b>3 members</b>. The <b>leader</b> (slot 1) fights on the field. The two <b>supports</b> jump in when you call them, and lend the leader 10% of their HP, ATK and DEF.</p>
      <h4>${ic('basic')} Moving and attacking</h4>
      <p>Move with <kbd>WASD</kbd> or the arrow keys, or drag on the left side of the screen. Your leader <b>attacks on her own</b> whenever an enemy is in reach: melee members need to be close, ranged members can keep their distance.</p>
      <h4>${ic('bolt')} Dodge</h4>
      <p><kbd>Space</kbd> dashes and makes you untouchable for a moment (2 charges). Every attack is warned by a <span class="r-danger">red zone</span> on the ground first. Dodge just as it lands for a <b>Perfect Dodge</b>: slow motion, Energy, and a shorter Skill cooldown.</p>
      <h4>${ic('skill')} Skill and Support Skills</h4>
      <p><kbd>E</kbd> uses the leader's <b>Skill</b>. <kbd>1</kbd> and <kbd>2</kbd> call a <b>support</b> in for her Support Skill: heals, shields, sniping, paint bombs and more. Each has a cooldown.</p>
      <h4>${ic('ult')} Ultimate</h4>
      <p>Hitting enemies, taking hits and Perfect Dodges fill Energy. When the ring is full, <kbd>Q</kbd> fires the leader's <b>Ultimate</b>, and you can't be hit while it plays.</p>
      <h4>${ic('raid')} Stagger, Weakness and Break</h4>
      <p>The white bar under an enemy's health is its <b>Stagger</b>. Hits from an element it is <b>weak</b> to (icons above it) deal +20% damage and much more Stagger. Empty the bar to <b>Break</b> it: it is stunned, takes 30% more damage, and anything it was winding up is cancelled, including a boss's charged attack.</p>
      <h4>${ic('spark')} Break effects</h4>
      <p>The element of whoever lands the Break adds an effect:</p>
      <div class="help-status">${Object.entries(BREAK_FX_A).map(([k, f]) => `<div>${elIc(k)} <b>${f.name}</b> — the enemy ${f.desc}.</div>`).join('')}</div>
      <h4>${ic('flame')} Bosses</h4>
      <p>Bosses change phase at half HP and again at a quarter, with new attacks. Watch the name under the boss bar: <b>!!</b> means a charged attack. Break the boss to cancel it, or get out of the zone.</p>
      <h4>${ic('star')} Stars</h4>
      <p>Clear the stage, finish with at least half your HP, and beat the time target shown under the clock.</p>
      <h4>${ic('auto')} Auto</h4>
      <p><kbd>F</kbd> or the AUTO button lets the leader fight on her own. Auto is decent, but it reacts late and misses some warnings.</p>
      <h4>${ic('info')} Statuses</h4>
      <div class="help-status">${STATUS_HELP.map(([k, v]) => `<div><span class="tag">${k}</span>${v}</div>`).join('')}</div>`,
  },
  elements: {
    title: 'Elements',
    html: () => `<p>Every member has an element. Every enemy is weak to two. Bring members whose element matches the stage's weaknesses: they Break enemies far faster.</p>
      <div class="help-el">${Object.entries(ELEMENTS).map(([k, el]) => {
        const members = Object.values(CHARACTERS).filter(c => c.element === k).map(c => c.short);
        const foes = Object.values(ENEMIES).filter(e => (e.weak || []).includes(k)).map(e => e.name);
        return `<div style="--ec:${el.color}">${elIc(k)}<b>${el.name}</b><span>Members: ${members.join(', ') || 'none yet'}</span><small>Weak to it: ${foes.join(', ')}</small></div>`;
      }).join('')}</div>`,
  },
  growth: {
    title: 'Growth',
    html: () => `
      <h4>${ic('token')} Levels</h4><p>Spend Superchat Tokens to level members up to Lv ${MAX_LEVEL}. Each stage shows a recommended level.</p>
      <h4>${ic('skill')} Skills</h4><p>Each skill has ranks 1-${MAX_SKILL_RANK}; every rank adds +${Math.round(SKILL_RANK_BONUS * 100)}% to its effect. Higher levels raise the rank cap.</p>
      <h4>${ic('spark')} Duplicates</h4><p>Pulling a member you own gives a duplicate token. Tokens unlock up to ${MAX_DUPES} bonus nodes per member.</p>
      <h4>${ic('recruit')} Memories</h4><p>Equip one Memory per member for stats and a passive. A Memory's signature member gets +50% from its passive. Duplicates raise its Rank (max ${MAX_MEM_RANK}).</p>
      <h4>${ic('heart')} Bonds</h4><p>Win battles together, hang out once a day, and give gifts. Every bond level adds +1% HP, ATK and DEF.</p>`,
  },
  gacha: {
    title: 'Recruit',
    html: () => `
      <h4>${ic('recruit')} Banners</h4><p>Member banners and Memory banners always give their featured ★5 when you hit a ★5.</p>
      <h4>${ic('star')} Pity</h4><p>A ★5 is guaranteed within 40 pulls and a ★4 or better every 10. Pity is shared between banners of the same kind.</p>
      <h4>${ic('spark')} Spark</h4><p>Every pull adds a Spark point. At ${SPARK_COST} points you can take the featured ★5 directly.</p>
      <h4>${ic('gift')} Free pull</h4><p>One free single pull every day.</p>`,
  },
  live: {
    title: 'Live',
    html: () => `
      <h4>${ic('ticket')} Events</h4><p>A limited event runs for ${EVENT_DAYS} days. Clear its stages for event currency and trade it for an exclusive Memory. The currency you earn also fills the milestone track, which pays extra rewards.</p>
      <h4>${ic('raid')} Ranked Raid</h4><p>A weekly boss, ${RAID_TIME} seconds on the clock, and two rule changes. Your score is the damage you deal (+20% if the boss goes down). Score tiers pay rewards once a week.</p>
      <h4>${ic('login')} Daily Stream</h4><p>A bonus stage that changes every day of the week, with ${DAILY_RUNS} runs per day.</p>`,
  },
};

function openHelp(topic = 'battle') {
  const tabs = Object.keys(HELP);
  const render = t => `<div class="picker-head"><h3>${ic('info')} How to play</h3><button class="btn small close">${ic('close')}</button></div>
    <div class="help-tabs">${tabs.map(k => `<button class="${k === t ? 'sel' : ''}" data-ht="${k}">${HELP[k].title}</button>`).join('')}</div>
    <div class="help-body">${HELP[t].html()}</div>`;
  openModal(render(topic));
  const box = document.querySelector('#pull .picker-box');
  box.classList.add('help-box');
  box.onclick = e => {
    const b = e.target.closest('[data-ht]');
    if (b) { e.stopPropagation(); box.innerHTML = render(b.dataset.ht); }
  };
}

// ---------- What's new (shown once per version to returning players) ----------
// Each note: [version, icon, title, text]. Players see the notes newer than the last version they saw.
const NOTES_VERSION = '4.0';
const UPDATE_NOTES = [
  ['4.0', 'battle', 'Real-time 3D battles', 'Battles are now live action in 3D. Steer your leader around the arena while she attacks on her own, dodge the red warning zones, and fire Skills and Ultimates when you choose.'],
  ['4.0', 'story', 'Story in the arena', 'Stages now open in 3D: your squad walks into the arena and plays out a short scene before the enemies arrive, and regroups to talk after the win. The illustrated story still plays before and after.'],
  ['4.0', 'flame', 'Elite enemies', 'From Chapter 2, one enemy per wave can be an Elite: bigger and tougher, with a gold ring. Bracket Run Elite rounds bring two per wave.'],
  ['4.0', 'team', 'Squads of three', 'Your leader fights on the field; two supports jump in with Support Skills (keys 1 and 2) and lend her 10% of their stats. Existing teams kept their first three members.'],
  ['4.0', 'bolt', 'Perfect Dodge', 'Dodge just as an attack lands for slow motion, bonus Energy and a shorter Skill cooldown.'],
  ['4.0', 'members', '3D chibi members', 'Every member has a 3D chibi with her own outfit, hair and weapon. These are stand-ins until real models are made.'],
  ['4.0', 'star', 'New star goals', 'Stars now ask you to finish with half your HP and beat a time target.'],
  ['4.0', 'raid', 'Ranked Raid', 'The Raid is now 90 seconds of all-out damage against the weekly boss.'],
  ['3.0', 'battle', 'Battles hit harder', 'Bigger, animated enemies, hit sparks on every attack, cinematic Skill and Ultimate shots, and faster turns. Regular enemies have less HP so fights move quicker.'],
  ['3.0', 'spark', 'Break effects', 'Weakness Breaks now explode across the screen, and each element adds its own effect: Sunburn, Sugar Crash, Nightfall, Splatter, Exposed or Food Coma.'],
  ['3.0', 'sound', 'Anime-style sound design', 'Every sound is new: glassy chimes, harp runs, sparkle showers and heavy impacts. Buttons no longer beep on every tap.'],
  ['3.0', 'recruit', 'Stream Ticket recruits', 'Swipe the Stream Ticket up (or tap it) to go live. Its glow hints at what you pulled. Recruit Again no longer skips the animation.'],
  ['3.0', 'chest', 'Rewards you can feel', 'Claiming anything now opens a Rewards screen with item cards, counters and sparkles.'],
  ['3.0', 'members', 'New Members screen', 'A cleaner character page with a stat list, skill cards, level-up bursts, and lines when you tap a member.'],
  ['3.0', 'user', 'Profile, News and Menu', 'A profile card with a showcase, a News board for events and banners, and a Menu with every feature. Tower is now on the home screen.'],
  ['3.0', 'story', 'More story', 'Every chapter stage now has more scenes, and every event stage has its own story.'],
  ['3.0', 'raid', 'Raid and events', 'The Ranked Raid now lasts 30 member turns. Events have a milestone track with extra rewards.'],
  ['2.1', 'flame', 'Longer boss fights with a final phase', 'Bosses are tougher and hit harder. At a quarter HP they enter a final phase with a big shield and tougher Stagger.'],
  ['2.1', 'sound', 'All-new sound effects', 'Every sound was remade: soft menu chimes, heavier hits, and a signature attack sound for each member.'],
  ['2.1', 'raid', 'Break fixed', 'Broken enemies used to be stunned almost forever. Now they are pushed back, take extra damage, and recover on their next turn.'],
  ['2.0', 'raid', 'Elements and weaknesses', 'Every member has an element and every enemy is weak to two. Weakness hits deal more damage and far more Stagger.'],
  ['2.0', 'eye', 'Enemy intents', 'Icons above enemies show their next move. Red ones hit your whole team.'],
  ['2.0', 'ult', 'Bigger boss fights', 'A boss health bar with its weaknesses and next move, plus a finishing blow.'],
  ['2.0', 'pause', 'Pause menu', 'Pause any battle (Esc) to change speed, Auto or Ultimate animations, or read How to play.'],
  ['2.0', 'skill', 'Damage preview', 'Picking an attack shows the damage it will deal on the enemy\'s health bar.'],
  ['2.0', 'map', 'Story map', 'Chapters are now a map with every stage\'s enemies, weaknesses, objectives and good member picks.'],
  ['2.0', 'chest', 'Weekly missions and activity chests', 'Daily missions fill an activity bar with five chests. New weekly missions pay big.'],
  ['2.0', 'shop', 'Deal of the Day', 'A discounted item in the Shop every day.'],
  ['2.0', 'spark', 'Recommend and Next', 'Team prep can pick the best members for a stage; after a win, Next takes you straight to the following stage.'],
  ['2.0', 'star', 'Fairer stars', 'Turn targets for the third star were reworked so every stage can be 3-starred.'],
];

function openUpdateNotes() {
  const seen = SAVE.seenNotes;
  const notes = UPDATE_NOTES.filter(([v]) => !seen || Number(v) > Number(seen));
  SAVE.seenNotes = NOTES_VERSION; persist();
  openModal(`<div class="picker-head"><h3>${ic('spark')} What's new in WATA SPO ${NOTES_VERSION}</h3><button class="btn small close">${ic('close')}</button></div>
    <div class="notes">${notes.map(([v, icon, t, d]) => `<div class="note">${ic(icon)}<div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>
    <button class="pill yellow close notes-ok">Let's go!</button>`);
  document.querySelector('#pull .picker-box').classList.add('notes-box');
}

// Small "?" button for screen top bars.
const helpBtn = topic => `<button class="help-btn" data-help="${topic}" title="How to play">?</button>`;
document.addEventListener('click', e => {
  const h = e.target.closest('[data-help]');
  if (h) openHelp(h.dataset.help);
});
