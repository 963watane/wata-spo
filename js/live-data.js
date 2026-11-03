// Content for the "live" systems: limited events, the weekly Ranked Raid,
// the daily stream schedule, gifts and bonds, achievements and the intro.
// Logic lives in live.js.

// ---------- Opening scene (first launch) ----------
const INTRO = [
  ['narrator', 'Every night, millions of people tune in to watch their favourite streamers play, talk, and laugh together.'],
  ['narrator', 'Tonight, something else is watching too.'],
  ['chat', 'is my internet dying / everything is purple / F5 F5 F5'],
  ['narrator', 'Streams freeze. Chat goes silent. Strange glitches crawl out of the lag, feeding on dropped frames.'],
  ['narrator', 'Only the streamers caught inside the broadcast can push them back. And they need someone to run the show.'],
  ['narrator', 'That someone is you, Producer.'],
];

// ---------- Limited events ----------
// One event runs at a time; they rotate every EVENT_DAYS days so returning
// players always find a new one. Each has its own currency, stages and shop.
const EVENT_DAYS = 14;
const EVENT_EPOCH = new Date(2026, 0, 5);   // a Monday

const EVENTS = {
  summer: {
    name: 'Summer Stream Festival', jp: '夏祭り配信', color: '#ff7a59', scene: 'tsuna-yukata',
    currency: 'Festival Tickets', cur: 'ticket',
    desc: 'The festival stream got glitched mid-fireworks. Clear the stalls, earn Festival Tickets, and trade them for an exclusive Memory.',
    stages: [
      { id: 'E1-1', name: 'Goldfish Scoop', level: 3, turns: 10, bg: 'sunset-street', waves: [['grunt', 'spammer', 'grunt']], reward: { tokens: 80 }, first: { gems: 150 } },
      { id: 'E1-2', name: 'Ring Toss Riot', level: 5, turns: 12, bg: 'sunset-street', waves: [['sniper', 'grunt', 'sniper'], ['spammer', 'desync']], reward: { tokens: 110 }, first: { gems: 150 } },
      { id: 'E1-3', name: 'Takoyaki Panic', level: 7, turns: 14, bg: 'city-day', waves: [['troll', 'spammer'], ['firewall', 'troll', 'grunt']], reward: { tokens: 140 }, first: { gems: 200 } },
      { id: 'E1-4', name: 'Lantern Lane', level: 9, turns: 16, bg: 'alley', waves: [['desync', 'clipper', 'desync'], ['echo', 'firewall', 'clipper']], reward: { tokens: 180 }, first: { gems: 200 } },
      { id: 'E1-5', name: 'Fireworks Crash', level: 11, turns: 20, bg: 'rooftop', boss: true, waves: [['troll', 'clipper', 'spammer'], ['phantom']], reward: { tokens: 260 }, first: { gems: 400 } },
      { id: 'E1-EX', name: 'EX · Grand Finale', level: 15, turns: 24, bg: 'rooftop', boss: true, ex: true, waves: [['echo', 'troll', 'echo'], ['firewall', 'clipper', 'desync'], ['core']], reward: { tokens: 400 }, first: { gems: 800 } },
    ],
    story: {
      'E1-1': [
        ['narrator', 'Paper lanterns, the smell of grilled corn, and a festival stream with a thousand viewers.'],
        ['tsuna', 'Okay chat, the fireworks start in ten minutes. I drew the festival poster myself, so nobody ruin it.'],
        ['chat', 'the goldfish are glitching / why is the takoyaki purple / poster is so cute'],
        ['sendo', 'Tsuna-senpai... the goldfish are floating. Out of the water. Is that normal?'],
        ['tsuna', 'That is NOT normal! Nobody touch anything!'],
      ],
      'E1-2': [
        ['narrator', 'The ring toss stall. Two streamers. One prize. Zero chill.'],
        ['noah', 'I don\'t lose at FPS and I don\'t lose at ring toss either!'],
        ['sendo', 'I\'m the newest member, so I should win to make a good impression!'],
        ['hinano', 'You\'re both yelling at a plush toy.'],
        ['noah', 'Wait, the rings are glitching! They\'re throwing themselves back at us!'],
      ],
      'E1-3': [
        ['lisa', 'Takoyaki! A festival classic! A lady must try every stall!'],
        ['uruha', 'Lisa. Takoyaki has octopus in it.'],
        ['lisa', '...Octopus? Then I shall simply eat the outside. Elegantly.'],
        ['uruha', 'That\'s just batter! You\'re eating balls of batter!'],
        ['narrator', 'Behind the stall, the grill bursts into purple flames.'],
      ],
      'E1-4': [
        ['narrator', 'A quiet lane lit by a hundred paper lanterns. Even the glitches seem to whisper here.'],
        ['tsuna', 'Wait, wait. Don\'t move. The lanterns look so pretty right now. I need to sketch this.'],
        ['hinano', 'Tsuna, there are enemies coming.'],
        ['tsuna', 'Thirty seconds! The light is perfect!'],
        ['hinano', '...Fine. I\'ll hold them off for thirty seconds. Only because the drawing will be good.'],
      ],
      'E1-5': [
        ['narrator', 'The sky lights up, but the fireworks burst in red static. BOOM. BOOM.'],
        ['noah', 'That\'s not thunder. That\'s fireworks. It\'s fine. It\'s totally fine. ...Why is it so loud?!'],
        ['hinano', 'Get behind me. Whatever that is, it came for the finale.'],
        ['sendo', 'It\'s the Phantom! He crashed the festival!'],
      ],
      'E1-EX': [
        ['narrator', 'The last firework of the night hangs frozen in the sky, cracked like glass.'],
        ['uruha', 'Seriously? It froze the FIREWORKS? Who does that?!'],
        ['hinano', 'If it took the finale, then I\'ll sing one myself after we win. Deal?'],
        ['chat', 'HINANO SINGING?? / we need to win this / clip everything'],
        ['tsuna', 'That\'s the best motivation I\'ve ever heard. Let\'s GO!'],
      ],
    },
    shop: [
      { id: 'mem', name: 'Fireworks Finale', desc: 'Exclusive event Memory.', price: 1200, stock: 1, memory: 'fireworks' },
      { id: 'memrank', name: 'Fireworks Finale Rank Up', desc: 'Needs the Memory first.', price: 600, stock: 4, memoryRank: 'fireworks' },
      { id: 'gems', name: 'Gems ×300', desc: 'Pull currency.', price: 400, stock: 5, give: { gems: 300 } },
      { id: 'dupe', name: 'Duplicate Token', desc: 'Pick a member.', price: 1000, stock: 2, pick: 'char' },
      { id: 'gift', name: 'Festival Gift Bag', desc: '3 random gifts for bonds.', price: 150, stock: 10, gifts: 3 },
      { id: 'tok', name: 'Superchat Tokens ×8000', desc: 'Upgrade currency.', price: 200, stock: 10, give: { exp: 8000 } },
      { id: 'coins', name: 'Spo Coins ×300', desc: 'Shop currency.', price: 250, stock: 5, give: { coins: 300 } },
    ],
  },
  midnight: {
    name: 'Midnight Marathon', jp: '深夜耐久配信', color: '#8b7bff', scene: 'noah-goose',
    currency: 'Night Owl Badges', cur: 'owl',
    desc: 'A 24-hour endurance stream is going strong at 3 AM, until the lag shows up to crash it. Keep the marathon alive.',
    stages: [
      { id: 'E2-1', name: 'Hour 18', level: 3, turns: 10, bg: 'rooftop', waves: [['grunt', 'desync', 'grunt']], reward: { tokens: 80 }, first: { gems: 150 } },
      { id: 'E2-2', name: 'Hour 19', level: 5, turns: 12, bg: 'rooftop', waves: [['sniper', 'spammer', 'sniper'], ['desync', 'grunt']], reward: { tokens: 110 }, first: { gems: 150 } },
      { id: 'E2-3', name: 'Hour 21', level: 7, turns: 14, bg: 'tunnel', waves: [['firewall', 'echo'], ['clipper', 'spammer', 'clipper']], reward: { tokens: 140 }, first: { gems: 200 } },
      { id: 'E2-4', name: 'Hour 23', level: 9, turns: 16, bg: 'tunnel', waves: [['troll', 'echo', 'troll'], ['desync', 'firewall', 'sniper']], reward: { tokens: 180 }, first: { gems: 200 } },
      { id: 'E2-5', name: 'Final Hour', level: 11, turns: 20, bg: 'alley', boss: true, waves: [['echo', 'clipper', 'spammer'], ['algorithm']], reward: { tokens: 260 }, first: { gems: 400 } },
      { id: 'E2-EX', name: 'EX · Hour 25', level: 15, turns: 24, bg: 'tunnel', boss: true, ex: true, waves: [['troll', 'echo', 'clipper'], ['firewall', 'desync', 'firewall'], ['phantom']], reward: { tokens: 400 }, first: { gems: 800 } },
    ],
    story: {
      'E2-1': [
        ['narrator', '3 AM. Hour eighteen of the marathon. The viewer count is somehow still climbing.'],
        ['noah', 'Hour eighteen and I\'m still winning! I refuse to end this marathon on a loss!'],
        ['lisa', 'Noah... a lady needs ten hours of sleep... I have had zero... I can see colors that don\'t exist...'],
        ['chat', 'LISA STAY AWAKE / noah is unstoppable / the screen is glitching'],
        ['noah', 'Wait, those colors are real! Something\'s crawling out of my overlay!'],
      ],
      'E2-2': [
        ['narrator', 'Hour nineteen. Uruha has been very quiet for a while.'],
        ['tsuna', 'Uruha-senpai? ...Senpai? Is she asleep? Sitting up?'],
        ['uruha', 'I\'m awake! I was... resting my aim. It\'s a technique.'],
        ['tsuna', 'You were snoring into the mic.'],
        ['uruha', 'That was the enemy! Enemies snore! Focus!'],
      ],
      'E2-3': [
        ['sendo', 'It\'s hour twenty-one. That is SO far past off-hours. This is off-off-hours.'],
        ['hinano', 'You said you were a night owl.'],
        ['sendo', 'A night owl, not a morning owl! The sun is coming up!'],
        ['hinano', 'Drink some water. ...Here, take mine. I\'m not worried about you or anything.'],
      ],
      'E2-4': [
        ['narrator', 'Hour twenty-three. The lag has never been worse.'],
        ['tsuna', 'I\'m drawing a "We Survived" poster for the end of the marathon. I\'m already on the colors.'],
        ['noah', 'We haven\'t survived yet!'],
        ['tsuna', 'Which is why I need you to make sure we do. The poster depends on it.'],
      ],
      'E2-5': [
        ['narrator', 'The final hour. Every glitch in the network seems to be pouring into one stream.'],
        ['tsuna', 'We are NOT ending this marathon on a crash.'],
        ['noah', 'Twenty-four hours! We\'re going to make it! I\'m going to cry!'],
        ['hinano', 'Cry after. Then we finish it properly. Everyone, together.'],
      ],
      'E2-EX': [
        ['narrator', 'The marathon is over. And yet the clock on screen reads: HOUR 25.'],
        ['uruha', 'There is no hour twenty-five! That\'s not how hours work!'],
        ['noah', 'Then we\'ll beat hour twenty-five too! My body says sleep, but my brain says ONE MORE!'],
        ['lisa', 'My brain also says sleep. My body says sleep. Everything says sleep. ...But fine. One more!'],
      ],
    },
    shop: [
      { id: 'mem', name: 'Midnight Snack', desc: 'Exclusive event Memory.', price: 1200, stock: 1, memory: 'midnight' },
      { id: 'memrank', name: 'Midnight Snack Rank Up', desc: 'Needs the Memory first.', price: 600, stock: 4, memoryRank: 'midnight' },
      { id: 'gems', name: 'Gems ×300', desc: 'Pull currency.', price: 400, stock: 5, give: { gems: 300 } },
      { id: 'dupe', name: 'Duplicate Token', desc: 'Pick a member.', price: 1000, stock: 2, pick: 'char' },
      { id: 'gift', name: 'Late-Night Gift Bag', desc: '3 random gifts for bonds.', price: 150, stock: 10, gifts: 3 },
      { id: 'tok', name: 'Superchat Tokens ×8000', desc: 'Upgrade currency.', price: 200, stock: 10, give: { exp: 8000 } },
      { id: 'coins', name: 'Spo Coins ×300', desc: 'Shop currency.', price: 250, stock: 5, give: { coins: 300 } },
    ],
  },
};

// Milestone rewards for event currency earned over the whole event (claimed on the event screen).
const EVENT_MILESTONES = [
  { at: 300, reward: { gems: 100 } },
  { at: 800, reward: { coins: 150 } },
  { at: 1500, reward: { gems: 200 } },
  { at: 2500, reward: { exp: 12000 } },
  { at: 4000, reward: { gems: 300, coins: 200 } },
  { at: 6000, reward: { gems: 500 } },
];

// Exclusive event Memories (only from event shops).
Object.assign(MEMORIES, {
  fireworks: { name: 'Fireworks Finale', rarity: 5, icon: '✺', hue: 18, event: 'summer', stats: { atk: 0.14, crit: 0.06 }, val: 10,
    passive: 'After using Ultimate, all allies gain +{v}% ATK for 2 turns.',
    afterAction: (b, u, key, ts, v) => { if (key === 'ult') b.living('ally').forEach(t => b.addStatus(t, 'atk', v / 100, 2, 'ATK↑')); } },
  midnight: { name: 'Midnight Snack', rarity: 5, icon: '☾', hue: 255, event: 'midnight', stats: { hp: 0.14, def: 0.1 }, spd: 4, val: 5,
    passive: 'After each action, the ally with the lowest HP heals {v}% of the wearer\'s max HP.',
    afterAction: (b, u, key, ts, v) => { const t = b.living('ally').sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0]; if (t) b.heal(t, u.maxHp * v / 100); } },
});

// ---------- Ranked Raid (weekly score attack) ----------
// One boss per week with two rule changes. Score = total damage within the turn limit.
const RAID_TURNS = 30;   // (turn-based battles only)
const RAID_TIME = 90;    // seconds per Ranked Raid run in the 3D action battle
const RAID_BOSSES = ['phantom', 'core', 'algorithm'];
const RAID_HP_MULT = 25;
const RAID_LEVEL = 8;
const RAID_MODS = {
  swift:     { name: 'Overclocked', desc: 'Enemies have +25% SPD.' },
  glass:     { name: 'Glass Cannon', desc: 'Everyone deals +30% damage.' },
  spcap:     { name: 'Low Bandwidth', desc: 'Skill Points cap at 3.' },
  overcharge:{ name: 'Overcharge', desc: 'Energy gain +40%.' },
  fragile:   { name: 'Thin Shields', desc: 'Shields are 50% weaker.' },
  breaker:   { name: 'Breaking News', desc: 'Stagger damage +50%; Breaks deal more damage.' },
  hype:      { name: 'Viral', desc: 'Hype builds twice as fast.' },
};
const RAID_TIERS = [
  // Scores from 90-second action runs: a Lv 10 squad lands about 50k, a strong Lv 30 one about 170k.
  { score: 15000, reward: { gems: 100, coins: 50 } },
  { score: 35000, reward: { gems: 150, coins: 80 } },
  { score: 60000, reward: { gems: 200, coins: 120 } },
  { score: 90000, reward: { gems: 300, coins: 160 } },
  { score: 125000, reward: { gems: 400, coins: 220 } },
  { score: 165000, reward: { gems: 600, coins: 300 } },
];

// ---------- Daily stream schedule ----------
// A bonus stage that changes with the weekday. DAILY_RUNS runs per day, shared by all tiers.
const DAILY_RUNS = 3;
const SCHEDULE = [
  { day: 'Sunday', name: 'Weekend Collab', jp: '週末コラボ', give: ['exp', 'coins', 'gems'], foes: ['echo', 'troll', 'clipper'] },
  { day: 'Monday', name: 'Superchat Rush', jp: 'スパチャ', give: ['exp'], foes: ['grunt', 'spammer', 'sniper'] },
  { day: 'Tuesday', name: 'Coin Stream', jp: 'コイン', give: ['coins'], foes: ['firewall', 'desync', 'grunt'] },
  { day: 'Wednesday', name: 'Gem Hunt', jp: 'ジェム', give: ['gems'], foes: ['sniper', 'clipper', 'desync'] },
  { day: 'Thursday', name: 'Superchat Rush', jp: 'スパチャ', give: ['exp'], foes: ['troll', 'spammer', 'echo'] },
  { day: 'Friday', name: 'Coin Stream', jp: 'コイン', give: ['coins'], foes: ['firewall', 'clipper', 'troll'] },
  { day: 'Saturday', name: 'Gift Drop', jp: 'プレゼント', give: ['gifts'], foes: ['spammer', 'echo', 'desync'] },
];
const SCHEDULE_TIERS = [
  { name: 'Casual', level: 3, mult: 1 },
  { name: 'Ranked', level: 8, mult: 2.2 },
  { name: 'Pro', level: 13, mult: 4 },
];
const SCHEDULE_BASE = { exp: 3000, coins: 60, gems: 60, gifts: 2 };

// ---------- Gifts and bonds ----------
// Gifts raise a member's bond. A favourite gift gives double.
const GIFTS = {
  cake:    { name: 'Strawberry Cake', icon: 'cake', xp: 40, fav: ['hinano', 'lisa'] },
  plush:   { name: 'Bear Plush', icon: 'plush', xp: 40, fav: ['noah'] },
  paint:   { name: 'Paint Set', icon: 'paint', xp: 40, fav: ['tsuna'] },
  photo:   { name: 'Sunset Photo', icon: 'photo', xp: 40, fav: ['sendo'] },
  snack:   { name: 'Konbini Snacks', icon: 'snack', xp: 25, fav: ['uruha'] },
};
const MAX_BOND = 10;
const bondXpNeed = lvl => 60 + lvl * 40;
const BOND_HANG_XP = 30;      // once a day per member
const BOND_WIN_XP = 8;        // per battle won, for each member in the team
const BOND_REWARDS = { 3: { gems: 200 }, 5: { gems: 400, coins: 200 }, 7: { gems: 600 }, 10: { gems: 1000, coins: 500 } };

// ---------- Weekly missions (reset every Monday) ----------
// stat = counter bumped through bumpDaily / bumpWeekly.
const WEEKLY_MISSIONS = [
  { id: 'w-wins', text: 'Win 20 battles', goal: 20, stat: 'wins', reward: { gems: 200 } },
  { id: 'w-ults', text: 'Use 30 Ultimates', goal: 30, stat: 'ults', reward: { exp: 8000 } },
  { id: 'w-breaks', text: 'Break 25 enemies', goal: 25, stat: 'breaks', reward: { exp: 6000, coins: 60 } },
  { id: 'w-pulls', text: 'Recruit 20 times', goal: 20, stat: 'pulls', reward: { gems: 200 } },
  { id: 'w-raid', text: 'Play the Ranked Raid', goal: 1, stat: 'raid', reward: { gems: 150, coins: 100 } },
  { id: 'w-daily', text: 'Clear 6 Daily Stream stages', goal: 6, stat: 'dailystage', reward: { coins: 150 } },
  { id: 'w-event', text: 'Clear 5 event stages', goal: 5, stat: 'event', reward: { gems: 200 } },
  { id: 'w-gift', text: 'Give 5 gifts', goal: 5, stat: 'gift', reward: { gems: 100 } },
  { id: 'w-full', text: 'Fill the Daily Activity bar on 4 days', goal: 4, stat: 'fulldays', reward: { gems: 300 } },
];

// ---------- Achievements ----------
// cat groups them on screen; check(save) -> true when done; reward in gems.
const allSkillRanks = s => Object.values(s.chars).flatMap(c => Object.values(c.skills));
const ACHIEVEMENTS = [
  { id: 'a-story1', cat: 'Story', name: 'Signal Found', text: 'Clear Chapter 1', reward: 300, check: s => !!s.cleared['1-6'] },
  { id: 'a-story2', cat: 'Story', name: 'Off the Air', text: 'Clear Chapter 2', reward: 500, check: s => !!s.cleared['2-6'] },
  { id: 'a-story3', cat: 'Story', name: 'Final Stream', text: 'Clear Chapter 3', reward: 800, check: s => !!s.cleared['3-6'] },
  { id: 'a-stars', cat: 'Story', name: 'Perfectionist', text: 'Earn all 54 stage stars', reward: 1000, check: s => totalStars(s) >= 54 },
  { id: 'a-win10', cat: 'Battle', name: 'Warming Up', text: 'Win 10 battles', reward: 150, check: s => s.stats.wins >= 10 },
  { id: 'a-win100', cat: 'Battle', name: 'Veteran Streamer', text: 'Win 100 battles', reward: 600, check: s => s.stats.wins >= 100 },
  { id: 'a-kill100', cat: 'Battle', name: 'Lag Cleaner', text: 'Defeat 100 enemies', reward: 200, check: s => s.stats.kills >= 100 },
  { id: 'a-kill1000', cat: 'Battle', name: 'Server Janitor', text: 'Defeat 1,000 enemies', reward: 800, check: s => s.stats.kills >= 1000 },
  { id: 'a-weak200', cat: 'Battle', name: 'Weak Spot', text: 'Land 200 weakness hits', reward: 300, check: s => (s.stats.weakHits || 0) >= 200 },
  { id: 'a-ch1stars', cat: 'Story', name: 'Chapter 1 Perfect', text: 'Earn all 18 stars in Chapter 1', reward: 400, check: s => STAGES.filter(st => st.chapter === 1).every(st => (s.stars[st.id] || []).filter(Boolean).length === 3) },
  { id: 'a-break50', cat: 'Battle', name: 'Breaking News', text: 'Break enemies 50 times', reward: 300, check: s => s.stats.breaks >= 50 },
  { id: 'a-ult100', cat: 'Battle', name: 'Ultimate Fan', text: 'Use 100 Ultimates', reward: 400, check: s => s.stats.ults >= 100 },
  { id: 'a-combo8', cat: 'Battle', name: 'Combo Clip', text: 'Land an 8-hit combo', reward: 300, check: s => s.stats.bestCombo >= 8 },
  { id: 'a-hit5k', cat: 'Battle', name: 'Big Number', text: 'Deal 5,000 damage in one hit', reward: 400, check: s => s.stats.bestHit >= 5000 },
  { id: 'a-tower30', cat: 'Battle', name: 'Top of the Tower', text: 'Clear Tower floor 30', reward: 1000, check: s => s.tower.best >= 30 },
  { id: 'a-raid1', cat: 'Live', name: 'Ranked Debut', text: 'Play a Ranked Raid', reward: 200, check: s => s.stats.raids >= 1 },
  { id: 'a-raid100k', cat: 'Live', name: 'Top Clip', text: 'Score 40,000 in a Ranked Raid', reward: 800, check: s => Object.values(s.raid).some(r => r.best >= 40000) },
  { id: 'a-event5', cat: 'Live', name: 'Festival Regular', text: 'Clear 5 event stages', reward: 300, check: s => s.stats.eventClears >= 5 },
  { id: 'a-eventex', cat: 'Live', name: 'Encore!', text: 'Clear an EX event stage', reward: 600, check: s => Object.values(s.events).some(e => Object.keys(e.cleared || {}).some(k => k.endsWith('EX'))) },
  { id: 'a-daily20', cat: 'Live', name: 'On Schedule', text: 'Clear 20 daily stream stages', reward: 400, check: s => s.stats.dailyRuns >= 20 },
  { id: 'a-all4', cat: 'Collection', name: 'Full Lineup', text: 'Recruit every member', reward: 500, check: s => Object.keys(CHARACTERS).every(id => s.chars[id]) },
  { id: 'a-mem4', cat: 'Collection', name: 'Memory Lane', text: 'Own 4 different Memories', reward: 300, check: s => Object.keys(s.memories).length >= 4 },
  { id: 'a-memall', cat: 'Collection', name: 'Scrapbook', text: 'Own every gacha Memory', reward: 800, check: s => Object.keys(MEMORIES).filter(m => !MEMORIES[m].event).every(m => s.memories[m]) },
  { id: 'a-dex', cat: 'Collection', name: 'Field Notes', text: 'Defeat every kind of enemy', reward: 500, check: s => Object.keys(ENEMIES).every(k => s.dex[k]) },
  { id: 'a-dupe5', cat: 'Collection', name: 'Fully Awakened', text: 'Max out a member\'s Duplicates', reward: 600, check: s => Object.values(s.chars).some(c => c.bond >= MAX_DUPES) },
  { id: 'a-skill9', cat: 'Collection', name: 'Mastery', text: 'Raise 3 skills to Rank 9', reward: 600, check: s => allSkillRanks(s).filter(r => r >= 9).length >= 3 },
  { id: 'a-pull100', cat: 'Gacha', name: 'Gacha Brained', text: 'Recruit 100 times', reward: 500, check: s => s.stats.pulls >= 100 },
  { id: 'a-spark', cat: 'Gacha', name: 'Spark Plug', text: 'Use a Spark exchange', reward: 300, check: s => !!s.sparked },
  { id: 'a-bond5', cat: 'Bonds', name: 'Close Friends', text: 'Reach bond Lv 5 with a member', reward: 300, check: s => Object.values(s.bonds).some(b => b.lvl >= 5) },
  { id: 'a-bond10', cat: 'Bonds', name: 'Best Friends', text: 'Reach bond Lv 10 with a member', reward: 800, check: s => Object.values(s.bonds).some(b => b.lvl >= 10) },
  { id: 'a-gift20', cat: 'Bonds', name: 'Gift Giver', text: 'Give 20 gifts', reward: 300, check: s => s.stats.gifts >= 20 },
  { id: 'a-rank20', cat: 'Bonds', name: 'Producer of the Year', text: 'Reach Producer Rank 20', reward: 800, check: s => s.player.rank >= 20 },
];
