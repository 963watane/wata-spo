// Recruit (gacha) logic: rates, pity and applying results to the save.
// Pity lives in SAVE.pity[banner.pity]; banners with the same key share it.

function rollOne(b, st) {
  st.p5++; st.p4++;
  const r = Math.random();
  if (st.p5 >= b.pity5 || r < b.rate5) {
    st.p5 = 0; st.p4 = 0;
    // Win the rate-up chance, or lose it and get the rate-up guaranteed next time.
    let id;
    if (st.g || Math.random() < b.upChance) { id = b.rateUp; st.g = false; }
    else {
      const others = b.pool5.filter(c => c !== b.rateUp);
      id = others[Math.floor(Math.random() * others.length)];
      st.g = true;
    }
    return { type: b.type, id, rarity: 5 };
  }
  if (st.p4 >= b.pity4 || r < b.rate5 + b.rate4) {
    st.p4 = 0;
    return { type: b.type, id: b.pool4[Math.floor(Math.random() * b.pool4.length)], rarity: 4 };
  }
  return { type: 'item', rarity: 3, exp: ITEM_EXP };
}

function applyResult(res) {
  if (res.type === 'item') { SAVE.exp += res.exp; return; }
  if (res.type === 'char') {
    const own = SAVE.chars[res.id];
    if (!own) { SAVE.chars[res.id] = newChar(); res.isNew = true; }
    else if (own.bond + own.tokens < MAX_DUPES) { own.tokens++; res.dupe = true; }
    else { SAVE.gems += DUPE_GEMS; res.converted = DUPE_GEMS; }
    return;
  }
  const mem = SAVE.memories[res.id];
  if (!mem) { SAVE.memories[res.id] = { rank: 1 }; res.isNew = true; }
  else if (mem.rank < MAX_MEM_RANK) res.rankUp = ++mem.rank;
  else { SAVE.gems += DUPE_GEMS; res.converted = DUPE_GEMS; }
}

// Returns null if the player can't afford it. free = the once-a-day free pull.
function recruit(bannerId, count, free = false) {
  const b = BANNERS[bannerId], cost = free ? 0 : b.cost * count;
  if (free && daily().freePull) return null;
  if (SAVE.gems < cost) return null;
  SAVE.gems -= cost;
  if (free) daily().freePull = true;
  const results = [];
  SAVE.stats.pulls += count;
  SAVE.spark[b.pity] = (SAVE.spark[b.pity] || 0) + count;
  bumpDaily('pulls', count);
  for (let i = 0; i < count; i++) {
    const res = rollOne(b, SAVE.pity[b.pity]);
    applyResult(res);
    results.push(res);
    SAVE.history.unshift({ t: Date.now(), b: bannerId, type: res.type, id: res.id || null, r: res.rarity });
  }
  SAVE.history.length = Math.min(SAVE.history.length, HISTORY_MAX);
  persist();
  return results;
}

// Free welcome 10-pull: one result is always the banner's ★5. Uses its own
// pity counter so it doesn't change the player's pity.
function starterPull(bannerId) {
  const b = BANNERS[bannerId], st = { p5: 0, p4: 0, g: false };
  const results = Array.from({ length: 10 }, () => rollOne(b, st));
  if (!results.some(r => r.rarity === 5 && r.id === b.rateUp)) results[Math.floor(Math.random() * 10)] = { type: b.type, id: b.rateUp, rarity: 5 };
  results.forEach(res => {
    applyResult(res);
    SAVE.history.unshift({ t: Date.now(), b: bannerId, type: res.type, id: res.id || null, r: res.rarity });
  });
  SAVE.stats.pulls += 10;
  persist();
  return results;
}

// Trade SPARK_COST spark points for the banner's rate-up ★5.
function sparkExchange(bannerId) {
  const b = BANNERS[bannerId];
  if ((SAVE.spark[b.pity] || 0) < SPARK_COST) return null;
  SAVE.spark[b.pity] -= SPARK_COST;
  SAVE.sparked = true;
  const res = { type: b.type, id: b.rateUp, rarity: 5, spark: true };
  applyResult(res);
  SAVE.history.unshift({ t: Date.now(), b: bannerId, type: res.type, id: res.id, r: 5 });
  persist();
  return res;
}
