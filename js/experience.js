// Shared preparation rules. Existing saves keep the unchanged Balanced plan.
const SpoDesign = {
  plans: {
    balanced: { name: 'Balanced', icon: 'team', unlock: null, atk: 1, hp: 1, support: 1, desc: 'Original squad stats. No tradeoff.' },
    rush: { name: 'Spotlight', icon: 'battle', unlock: '1-2', atk: 1.12, hp: 0.88, support: 1, desc: 'Leader ATK +12% · max HP −12%.' },
    shelter: { name: 'Safe Harbor', icon: 'tank', unlock: '1-4', atk: 0.92, hp: 1.2, support: 1, desc: 'Leader max HP +20% · ATK −8%.' },
    relay: { name: 'Relay', icon: 'collab', unlock: '2-1', atk: 0.9, hp: 1, support: 0.8, desc: 'Support cooldowns −20% · leader ATK −10%.' },
  },
  available(key) {
    if (!Object.prototype.hasOwnProperty.call(this.plans, key)) return false;
    const p = this.plans[key];
    return !!p && (!p.unlock || !!SAVE.cleared[p.unlock]);
  },
  plan(key) { return this.available(key) ? this.plans[key] : this.plans.balanced; },
  allowedFor(stage) { return !stage.raid && !stage.run && !stage.tutorial; },
  openPlans(index, stage = null, onDone = null) {
    const ov = $('#pull'), previousFocus = document.activeElement;
    const restricted = stage && !this.allowedFor(stage);
    const selected = SAVE.teams[index].plan || 'balanced';
    ov.className = 'overlay show';
    ov.innerHTML = `<section class="studio-training studio-plans" role="dialog" aria-modal="true" aria-labelledby="plans-title">
      <header><div><small>SQUAD TACTICS</small><h2 id="plans-title">Choose your approach.</h2></div><button class="training-close" aria-label="Close tactics">${ic('close')}</button></header>
      <p>${restricted ? 'Ranked, tutorial and Bracket Run battles use their own rules. Balanced applies here.' : 'Each plan changes the leader or support rhythm. Unlock more through the story; switch freely between battles.'}</p>
      <div class="studio-plan-list">${Object.entries(this.plans).map(([key, p]) => `<button data-plan="${key}" ${!this.available(key) || restricted ? 'disabled' : ''} aria-pressed="${(restricted ? 'balanced' : selected) === key}">${ic(p.icon)}<span><b>${p.name}</b><small>${p.desc}</small>${this.available(key) ? '' : `<em>Unlock: clear ${p.unlock}</em>`}</span><i>${(restricted ? 'balanced' : selected) === key ? 'Selected' : this.available(key) ? 'Choose' : 'Locked'}</i></button>`).join('')}</div>
    </section>`;
    const close = () => { ov.className = 'overlay'; ov.innerHTML = ''; ov.onkeydown = null; previousFocus?.focus(); };
    $('.training-close', ov).onclick = close;
    ov.onkeydown = e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        const list = [...ov.querySelectorAll('button:not(:disabled)')];
        if (e.shiftKey && document.activeElement === list[0]) { e.preventDefault(); list[list.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === list[list.length - 1]) { e.preventDefault(); list[0].focus(); }
      }
    };
    ov.querySelectorAll('[data-plan]:not(:disabled)').forEach(b => b.onclick = () => {
      SAVE.teams[index].plan = b.dataset.plan; persist(); close(); if (onDone) onDone();
    });
    $('.training-close', ov).focus();
  },
  // A complete quote, never a partial purchase. Recomputed when the player confirms.
  trainingQuote(members, target) {
    const to = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(target) || 1)));
    const rows = [...new Set(members.filter(id => !!SAVE.chars[id]))].map(id => {
      const from = SAVE.chars[id].lvl;
      let cost = 0;
      for (let lv = from; lv < to; lv++) cost += levelCost(lv);
      return { id, from, to: Math.max(from, to), cost };
    });
    return { rows, target: to, cost: rows.reduce((n, r) => n + r.cost, 0) };
  },
  train(members, target) {
    const q = this.trainingQuote(members, target);
    if (!q.cost || q.cost > SAVE.exp) return false;
    SAVE.exp -= q.cost;
    q.rows.forEach(r => { SAVE.chars[r.id].lvl = r.to; });
    persist();
    return q;
  },
  openTraining(members = SAVE.team, target = null, onDone = null) {
    const next = STAGES.find((s, i) => stageUnlocked(i) && !SAVE.cleared[s.id]) || STAGES[STAGES.length - 1];
    const initial = target || Math.min(MAX_LEVEL, recLevel(next.level));
    const ov = $('#pull'), previousFocus = document.activeElement;
    ov.className = 'overlay show';
    const close = () => { ov.className = 'overlay'; ov.innerHTML = ''; ov.onkeydown = null; previousFocus?.focus(); };
    const render = value => {
      const q = this.trainingQuote(members, value), short = Math.max(0, q.cost - SAVE.exp);
      ov.innerHTML = `<section class="studio-training" role="dialog" aria-modal="true" aria-labelledby="training-title">
        <header><div><small>SQUAD GROWTH</small><h2 id="training-title">A little stronger, together.</h2></div><button class="training-close" aria-label="Close training">${ic('close')}</button></header>
        <p>Choose a target level. Review every upgrade before spending Superchat Tokens.</p>
        <label class="training-target">Target level <select aria-label="Target level">${Array.from({ length: MAX_LEVEL }, (_, i) => `<option ${i + 1 === q.target ? 'selected' : ''}>${i + 1}</option>`).join('')}</select><span>Balance ${SAVE.exp.toLocaleString()}</span></label>
        <div class="training-members">${q.rows.map(r => { const before = charStats(r.id), after = charStats(r.id, r.to); return `<div><i class="face" style="${faceStyle(r.id)}"></i><span><b>${CHARACTERS[r.id].short}</b><small>Lv ${r.from} ${r.from === r.to ? '· Already there' : `→ ${r.to}`}</small>${r.cost ? `<small class="training-gain">HP ${before.hp.toLocaleString()} → ${after.hp.toLocaleString()} · ATK ${before.atk} → ${after.atk}</small>` : ''}</span><strong>${r.cost.toLocaleString()}</strong></div>`; }).join('') || '<p>Add a member to your squad first.</p>'}</div>
        <footer><div><small>TOTAL COST</small><b>${q.cost.toLocaleString()} tokens</b></div><button class="training-confirm" ${!q.cost || short ? 'disabled' : ''}>${short ? `Need ${short.toLocaleString()} more` : q.cost ? 'Train squad' : 'No upgrades needed'}</button></footer>
        ${short ? '<button class="training-farm">Find token rewards in Daily Streams →</button>' : ''}
      </section>`;
      $('.training-close', ov).onclick = close;
      $('select', ov).onchange = e => { render(e.target.value); $('select', ov).focus(); };
      $('.training-confirm', ov).onclick = () => {
        if (!this.train(members, q.target)) return render(q.target);
        close(); sfx('levelup'); if (onDone) onDone(); toast('Squad training complete');
      };
      const farm = $('.training-farm', ov);
      if (farm) farm.onclick = () => { close(); liveTab = 'daily'; show('live'); };
    };
    render(initial);
    ov.onkeydown = e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        const items = [...ov.querySelectorAll('button:not(:disabled), select')];
        if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
      }
    };
    $('.training-close', ov).focus();
  },
  readiness(stage, members) {
    const ids = members.filter(id => !!SAVE.chars[id]), weak = stageWeak(stage);
    return [
      { ok: ids.length === TEAM_SIZE, text: `${ids.length}/${TEAM_SIZE} squad slots filled` },
      { ok: ids.length > 0 && ids.every(id => SAVE.chars[id].lvl >= recLevel(stage.level)), text: `Recommended level ${recLevel(stage.level)}` },
      { ok: ids.some(id => weak.includes(CHARACTERS[id].element)), text: 'Elemental weakness covered' },
      { ok: ids.some(id => CHARACTERS[id].role === 'DPS'), text: 'Damage dealer included' },
    ];
  },
};
