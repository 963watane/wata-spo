// Optional cloud save + Ranked Raid leaderboard through Supabase (free tier).
// Off until CLOUD.url and CLOUD.anonKey are filled in; see CLOUD_SETUP.md.
// Each player gets a random transfer code (SAVE.cloudId). Anyone with the
// code can load that save, so it works like a password: keep it private.

const CLOUD = {
  url: '',        // e.g. 'https://abcdxyz.supabase.co'
  anonKey: '',    // the project's public "anon" key
};

const cloudReady = () => !!(CLOUD.url && CLOUD.anonKey);

function cloudCode() {
  if (!SAVE.cloudId) {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(12));
    SAVE.cloudId = [...r].map(n => abc[n % abc.length]).join('').replace(/(.{4})(?!$)/g, '$1-');
    persist();
  }
  return SAVE.cloudId;
}

async function cloudFetch(path, opts = {}) {
  const res = await fetch(`${CLOUD.url}/rest/v1/${path}`, Object.assign({}, opts, {
    headers: Object.assign({ apikey: CLOUD.anonKey, Authorization: `Bearer ${CLOUD.anonKey}`, 'Content-Type': 'application/json' }, opts.headers || {}),
  }));
  if (!res.ok) throw new Error(`Cloud error ${res.status}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

async function cloudSave() {
  const id = cloudCode();
  await cloudFetch('rpc/put_save', { method: 'POST', body: JSON.stringify({ code: id, player: SAVE.player.name, payload: SAVE }) });
  return id;
}

async function cloudLoad(code) {
  const data = await cloudFetch('rpc/get_save', { method: 'POST', body: JSON.stringify({ code: code.trim().toUpperCase() }) });
  if (!data) throw new Error('No save with that code');
  return data;
}

async function cloudSubmitScore(week, score) {
  if (!cloudReady()) return;
  try {
    await cloudFetch('raid_scores?on_conflict=week,player_id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ week, player_id: cloudCode(), name: SAVE.player.name.slice(0, 14), score }),
    });
    raidBoard = null;
  } catch (e) { console.warn('Score upload failed', e); }
}

async function cloudLeaderboard(week) {
  try { return await cloudFetch(`raid_scores?week=eq.${week}&select=player_id,name,score&order=score.desc&limit=20`); }
  catch (e) { console.warn('Leaderboard failed', e); return []; }
}
