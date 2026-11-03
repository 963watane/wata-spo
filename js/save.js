// Player save data. Kept in browser storage for now; the whole object is
// plain JSON so it can later be stored per account (e.g. Supabase).

const SAVE_KEY = 'spostars_save_v1';

// bond = duplicate nodes unlocked (0-5), tokens = duplicate tokens not yet spent.
const newChar = () => ({ lvl: 1, bond: 0, tokens: 0, skills: { basic: 1, skill: 1, ult: 1 } });

// Team presets. SAVE.team is always a copy of the active preset's members.
const TEAM_PRESETS = 5;
const TEAM_SIZE = 3;      // leader + 2 supports (action battles)
const defaultTeams = first => Array.from({ length: TEAM_PRESETS }, (_, i) =>
  ({ name: i === 0 ? 'Main Team' : `Team ${i + 1}`, members: i === 0 ? first.slice(0, TEAM_SIZE) : Array(TEAM_SIZE).fill(null) }));
function syncTeam() { SAVE.team = SAVE.teams[SAVE.teamIdx].members.slice(); }

function newSave() {
  return {
    version: 2,
    gems: 4800,
    exp: 600,
    chars: { sendo: newChar(), tsuna: newChar() },
    team: ['tsuna', 'sendo', null],
    teams: defaultTeams(['tsuna', 'sendo', null]),
    teamIdx: 0,
    pity: { member: { p5: 0, p4: 0, g: false }, memory: { p5: 0, p4: 0, g: false } },
    memories: {},  // memory id -> { rank }
    equip: {},     // character id -> memory id
    cleared: {},
    stars: {},     // stage id -> [clear, no KO, turn limit]
    seen: {},      // story scenes already watched
    talks: {},     // off-stream talks already watched
    claimed: {},   // missions already claimed
    stats: Object.assign({}, STAT_KEYS),
    lobby: 'sendo',
    lobbyScene: 'video:lobby',      // home backdrop: scene id, 'video:<id>', or null = member cut-out
    videoLobbyDefault: true,
    player: { name: 'Producer', rank: 1, xp: 0 },
    login: { last: null, day: 0 },  // last claim date (YYYY-MM-DD) and days claimed
    coins: 0,                       // Spo Coins, spent in the Shop
    tower: { best: 0 },             // highest Tower floor cleared
    daily: { date: null, progress: {}, claimed: {}, shop: {} },
    history: [],                    // recent recruits, newest first
    spark: {},                      // pity group -> spark points (exchange for the rate-up)
    // cutins: Ultimate animation 'full' | 'short' | 'off'; music volume is separate from sound effects.
    settings: { sound: true, volume: 0.6, music: true, musicVolume: 0.5, textSpeed: 2, battleSpeed: 1, cutins: 'full', shake: true, flashes: true },
    tutorial: 0,                    // onboarding step: 0 intro, 1 first battle, 2 starter pick, 3 done
    events: {},                     // event id -> { tokens, cleared: {}, shop: {} }
    raid: {},                       // week id -> { best, claimed: [] }
    bonds: {},                      // character id -> { lvl, xp, hang: 'YYYY-MM-DD' }
    gifts: {},                      // gift id -> count
    dex: {},                        // enemy id -> times defeated
    achieved: {},                   // achievement id -> claimed
    cloudId: null,                  // random id for the optional cloud save
  };
}

const STAT_KEYS = { weakHits: 0, pulls: 0, collabs: 0, battles: 0, wins: 0, kills: 0, crits: 0, breaks: 0, ults: 0, bestCombo: 0, bestHit: 0, raids: 0, eventClears: 0, dailyRuns: 0, gifts: 0 };

const HISTORY_MAX = 200;

// Daily state, reset when the date changes.
function daily() {
  if (SAVE.daily.date !== todayStr()) SAVE.daily = { date: todayStr(), progress: {}, claimed: {}, shop: {} };
  return SAVE.daily;
}
function bumpDaily(stat, n = 1) {
  const d = daily();
  d.progress[stat] = (d.progress[stat] || 0) + n;
  if (typeof bumpWeekly === 'function') bumpWeekly(stat, n);
}
const claimableDailies = () => DAILY_MISSIONS.filter(m => !daily().claimed[m.id] && (daily().progress[m.stat] || 0) >= m.goal).length;

// Applies a reward object { gems, exp, coins } and returns a short label.
function giveReward(r) {
  SAVE.gems += r.gems || 0; SAVE.exp += r.exp || 0; SAVE.coins += r.coins || 0;
  return [r.gems && amt('gem', r.gems), r.exp && amt('token', r.exp), r.coins && amt('coin', r.coins)].filter(Boolean).join(' ');
}

// Set when a stored save exists but couldn't be read: the game then never
// overwrites it (a copy is kept under SAVE_KEY + '_backup') until a reset.
let SAVE_BROKEN = false;
let SAVE = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = Object.assign(newSave(), JSON.parse(raw));
      // v1 saves kept member-banner pity in top-level fields.
      if ('pity5' in s) {
        s.pity.member = { p5: s.pity5, p4: s.pity4, g: s.guaranteed };
        delete s.pity5; delete s.pity4; delete s.guaranteed;
      }
      s.stats = Object.assign({}, STAT_KEYS, s.stats);
      // Saves from before onboarding existed skip the intro but still get the starter pick.
      if (!('tutorial' in JSON.parse(raw))) s.tutorial = s.cleared['1-1'] ? 2 : 0;
      s.settings = Object.assign(newSave().settings, s.settings);
      s.daily = Object.assign({ date: null, progress: {}, claimed: {}, shop: {} }, s.daily);
      s.tower = Object.assign({ best: 0 }, s.tower);
      // The lobby video became the default home screen once; after that it's the player's choice.
      if (!JSON.parse(raw).videoLobbyDefault) { s.lobbyScene = 'video:lobby'; s.videoLobbyDefault = true; }
      // Older saves: add skill ranks / tokens, and cap duplicates at the new max.
      Object.keys(s.chars).forEach(id => {
        const c = Object.assign(newChar(), s.chars[id]);
        c.skills = Object.assign({ basic: 1, skill: 1, ult: 1 }, c.skills);
        c.bond = Math.min(MAX_DUPES, c.bond);
        c.tokens = Math.min(MAX_DUPES - c.bond, c.tokens);
        s.chars[id] = c;
      });
      // Saves from before team presets: the old team becomes preset 1.
      if (!Array.isArray(s.teams) || s.teams.length !== TEAM_PRESETS || !('teamIdx' in JSON.parse(raw))) {
        s.teams = defaultTeams(s.team); s.teamIdx = 0;
      }
      // Squads became 3 members (leader + 2 supports): keep the first three, in order.
      s.teams.forEach(t => { if (t.members.length !== TEAM_SIZE) { const m = t.members.filter(Boolean).slice(0, TEAM_SIZE); while (m.length < TEAM_SIZE) m.push(null); t.members = m; } });
      s.team = s.teams[s.teamIdx].members.slice();
      SAVE_BROKEN = false;
      return s;
    }
  } catch (e) {
    console.warn('Save could not be read', e);
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) { SAVE_BROKEN = true; localStorage.setItem(SAVE_KEY + '_backup', raw); }
    } catch (e2) { /* storage unavailable */ }
  }
  return newSave();
}

function persist() {
  if (SAVE_BROKEN) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { console.warn('Save failed', e); }
}

function resetSave() {
  SAVE_BROKEN = false;
  SAVE = newSave();
  persist();
}

// Adds player XP; returns how many ranks were gained (each pays RANK_UP_GEMS).
function addPlayerXp(n) {
  const p = SAVE.player;
  let gained = 0;
  p.xp += n;
  while (p.xp >= rankXpNeed(p.rank)) {
    p.xp -= rankXpNeed(p.rank);
    p.rank++; gained++;
    SAVE.gems += RANK_UP_GEMS;
  }
  return gained;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const loginReady = () => SAVE.login.last !== todayStr();

// Memory stats grow 15% per rank; passives grow 25% per rank.
const memStatMult = mid => 1 + 0.15 * ((SAVE.memories[mid] || { rank: 1 }).rank - 1);

// Passive value for a memory worn by a character (signature member gets +50%).
function memValue(mid, charId) {
  const m = MEMORIES[mid], rank = (SAVE.memories[mid] || { rank: 1 }).rank;
  const v = m.val * (1 + 0.25 * (rank - 1)) * (m.owner && m.owner === charId ? 1.5 : 1);
  return Math.round(v);
}

const memPassiveText = (mid, charId) => MEMORIES[mid].passive.replace('{v}', memValue(mid, charId));

// Who currently wears a memory (or undefined).
const memWearer = mid => Object.keys(SAVE.equip).find(c => SAVE.equip[c] === mid);

const bondLevel = id => (SAVE.bonds[id] || { lvl: 1 }).lvl;

// Sum of the mods from a character's unlocked duplicate nodes.
function dupeMods(id) {
  const own = SAVE.chars[id], out = { boost: {} };
  if (!own) return out;
  DUPLICATES[id].slice(0, own.bond).forEach(({ mods }) => {
    Object.entries(mods).forEach(([k, v]) => {
      if (k === 'boost') Object.entries(v).forEach(([sk, b]) => { out.boost[sk] = (out.boost[sk] || 0) + b; });
      else out[k] = (out[k] || 0) + v;
    });
  });
  return out;
}

// Effect multiplier for one skill: rank bonus plus duplicate boosts.
function skillPower(id, key) {
  const own = SAVE.chars[id], rank = own ? own.skills[key] : 1;
  return 1 + SKILL_RANK_BONUS * (rank - 1) + (dupeMods(id).boost[key] || 0);
}

// Final stats of an owned character, including level, duplicates and Memory bonuses.
function charStats(id) {
  const c = CHARACTERS[id], own = SAVE.chars[id] || newChar();
  const lvlMult = 1 + 0.06 * (own.lvl - 1);
  const dm = dupeMods(id);
  const mid = SAVE.equip[id], mem = mid && MEMORIES[mid];
  const ms = mem ? mem.stats : {}, mk = mem ? memStatMult(mid) : 0;
  // Bond: +1% HP / ATK / DEF per bond level above 1.
  const bondB = k => ['hp', 'atk', 'def'].includes(k) ? 0.01 * (bondLevel(id) - 1) : 0;
  const bonus = k => 1 + (ms[k] || 0) * mk + (dm[k] || 0) + bondB(k);
  return {
    hp: Math.round(c.base.hp * lvlMult * bonus('hp')),
    atk: Math.round(c.base.atk * lvlMult * bonus('atk')),
    def: Math.round(c.base.def * lvlMult * bonus('def')),
    spd: c.base.spd + (mem && mem.spd ? Math.round(mem.spd * mk) : 0) + (dm.spd || 0),
    crit: c.base.crit + (ms.crit || 0) * mk + (dm.crit || 0),
    critDmg: c.base.critDmg + (ms.critDmg || 0) * mk + (dm.critDmg || 0),
    energy: dm.energy || 0,
    lvl: own.lvl, bond: own.bond, memory: mid || null,
  };
}
