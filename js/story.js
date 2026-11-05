// Visual-novel player for story scenes and off-stream talks.
// The story text itself lives in story-data.js.
//
// Presentation: a title card, letterbox bars, a camera that leans toward
// whoever is talking, reactions read from the line itself ("!" hops, "?"
// tilts, "..." sinks, shouting shakes), typing blips, a stream chat feed
// that fills up as chat talks, plus Auto and Log.

function speakerInfo(id, nameOverride) {
  if (id === 'narrator') return { name: '' };
  if (id === 'chat') return { name: 'LIVE CHAT', color: '#7fd3ff', chat: true };
  const c = CHARACTERS[id];
  if (c) return { name: nameOverride || c.short, art: ART[id] && ART[id].url, color: c.color };
  const e = ENEMIES[id];
  return { name: nameOverride || e.name, art: ART[id] && ART[id].url, color: '#ff4d6d', enemy: true, hue: e.hue };
}

// How a line should be acted out, guessed from its text.
function lineMood(text) {
  if (/[A-Z]{4,}/.test(text.replace(/LIVE|GG|HP|ATK|DEF|SPD|DPS|MVP/g, ''))) return 'shout';
  if (/^\s*(\.\.\.|…)/.test(text) || /\.\.\.\s*$/.test(text)) return 'sink';
  if (/!\s*$|!~|~!/.test(text) || /!\s/.test(text)) return 'hop';
  if (/\?\s*$/.test(text)) return 'tilt';
  return 'talk';
}

const STORY_PREFS = { auto: false };

// Plays a list of story lines over an optional backdrop scene.
// Resolves when finished or skipped.
function playStory(lines, title = '', sceneId = null) {
  const prevMusic = typeof musicWanted !== 'undefined' ? musicWanted : null;
  if (typeof playMusic === 'function') playMusic('story');
  return new Promise(resolve => {
    const ov = $('#story');
    ov.className = 'overlay show';
    // "1-3 · Name" → kicker "1-3", heading "Name"; talks are "Off-stream · Name".
    const [kicker, heading] = title.includes(' · ') ? title.split(' · ') : ['', title];
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    ov.innerHTML = `<div class="story intro${calm || SAVE.settings.flashes === false ? ' visual-calm' : ''}">
      <div class="story-bg ${sceneId ? 'has-scene' : ''}">${sceneId ? `<div class="story-scene ${BACKGROUNDS[sceneId] ? 'env' : ''}" style="${sceneStyle(sceneId)}"></div>` : ''}</div>
      <div class="story-cam"><div class="story-slot left"></div><div class="story-slot right"></div></div>
      <div class="story-vignette"></div>
      <div class="story-bars"><i></i><i></i></div>
      ${creditHtml(sceneId) ? `<span class="story-credit">${creditHtml(sceneId)}</span>` : ''}
      <div class="story-title"><em>${kicker}</em>${heading}</div>
      <div class="story-progress"><span></span><i></i></div>
      <div class="story-ctrl">
        <button class="sc-auto ${STORY_PREFS.auto ? 'on' : ''}">${ic('auto')}<span>Auto</span></button>
        <button class="sc-log">${ic('story')}<span>Log</span></button>
        <button class="story-skip">Skip ${ic('next')}</button>
      </div>
      <div class="story-chat"><div class="story-chat-head"><i></i>LIVE CHAT</div><div class="story-chat-log"></div></div>
      <div class="story-narr"><p></p></div>
      <div class="story-box"><div class="story-name"></div><div class="story-text"></div><div class="story-next"></div></div>
      <div class="story-card"><div class="sc-stripe"></div><em>${kicker || 'STORY'}</em><h2>${heading}</h2><span>${kicker.startsWith('Off') ? 'オフトーク' : 'ストーリー'}</span></div>
      <div class="story-logview hidden"><div class="slv-box"><div class="slv-head"><b>Log</b><button class="btn small close">${ic('close')}</button></div><div class="slv-list"></div></div></div>
    </div>`;
    const root = $('.story', ov);
    const slots = { left: null, right: null };
    const textEl = $('.story-text', ov), nameEl = $('.story-name', ov), box = $('.story-box', ov);
    const narr = $('.story-narr', ov), narrP = $('.story-narr p', ov), cam = $('.story-cam', ov);
    const chatLog = $('.story-chat-log', ov);
    const log = [];
    let i = -1, typing = null, full = '', lastSide = 'right', autoT = null, ready = false;

    // New speakers enter on the side opposite whoever spoke last.
    function place(id) {
      if (slots.left === id) return 'left';
      if (slots.right === id) return 'right';
      const side = lastSide === 'left' ? 'right' : 'left';
      slots[side] = id;
      const info = speakerInfo(id), el = $('.story-slot.' + side, ov);
      el.innerHTML = info.art ? `<img src="${info.art}" alt="">` : foeSprite(id, info.hue, 'story-foe');
      el.classList.toggle('enemy', !!info.enemy);
      el.animate([{ opacity: 0, transform: calm ? 'none' : `translateX(${side === 'left' ? -40 : 40}px)` }, { opacity: 1, transform: 'none' }],
                 { duration: 220, easing: 'ease-out' });
      // Enemies arrive with a red flash and a jolt.
      if (info.enemy && SAVE.settings.flashes !== false && !calm) {
        root.classList.remove('threat'); void root.offsetWidth; root.classList.add('threat');
        sfx('kill');
      }
      return side;
    }

    function react(side, mood) {
      if (calm || (mood === 'shout' && SAVE.settings.shake === false)) return;
      const img = $('.story-slot.' + side, ov).firstElementChild;
      if (!img) return;
      const k = {
        hop: [{ transform: 'none' }, { transform: 'translateY(-26px)' }, { transform: 'translateY(0) scaleY(.97)' }, { transform: 'none' }],
        tilt: [{ transform: 'none' }, { transform: `rotate(${side === 'left' ? 3 : -3}deg)` }, { transform: 'none' }],
        sink: [{ transform: 'none' }, { transform: 'translateY(14px) scale(.98)' }, { transform: 'translateY(8px)' }],
        shout: [0, 1, 2, 3, 4, 5].map(n => ({ transform: `translateX(${n % 2 ? 7 : -7}px)` })).concat({ transform: 'none' }),
        talk: [{ transform: 'none' }, { transform: 'scale(1.015, .99)' }, { transform: 'none' }],
      }[mood];
      img.animate(k, { duration: mood === 'sink' ? 700 : mood === 'shout' ? 360 : 420, easing: 'ease-out', fill: mood === 'sink' ? 'forwards' : 'none' });
      if (mood === 'shout') { root.classList.remove('jolt'); void root.offsetWidth; root.classList.add('jolt'); }
    }

    function chatFeed(text) {
      text.split(' / ').forEach((m, k) => {
        const name = CHAT.names[(i * 3 + k) % CHAT.names.length];
        const line = document.createElement('div');
        line.innerHTML = `<b style="color:hsl(${(i * 70 + k * 110) % 360} 80% 70%)">${name}</b> ${m}`;
        line.style.animationDelay = (k * 140) + 'ms';
        chatLog.appendChild(line);
      });
      while (chatLog.children.length > 7) chatLog.firstChild.remove();
    }

    // Typing sound: a soft blip every few letters, pitched per speaker.
    const blipFor = who => 520 + ([...who].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 7) * 70;

    function typeInto(el, text, who) {
      full = text;
      let n = 0;
      el.textContent = '';
      ready = false;
      box.classList.remove('done');
      typing = setInterval(() => {
        n += SAVE.settings.textSpeed;
        el.textContent = full.slice(0, n);
        if (who && n % 4 < SAVE.settings.textSpeed) blip(blipFor(who));
        if (n >= full.length) finishLine();
      }, 22);
    }

    function finishLine() {
      clearInterval(typing); typing = null; ready = true;
      box.classList.add('done');
      if (STORY_PREFS.auto) {
        clearTimeout(autoT);
        autoT = setTimeout(next, 1100 + full.length * 28);
      }
    }

    function next() {
      clearTimeout(autoT);
      if (typing) {
        clearInterval(typing); typing = null;
        (root.classList.contains('narrating') ? narrP : textEl).textContent = full;
        finishLine();
        return;
      }
      if (++i >= lines.length) return end();
      $('.story-progress span', ov).textContent = `${i + 1} / ${lines.length}`;
      $('.story-progress i', ov).style.width = ((i + 1) / lines.length * 100) + '%';
      const [who, text, nameOverride] = lines[i];
      const info = speakerInfo(who, nameOverride);
      log.push({ name: info.name, color: info.color, text: who === 'chat' ? text.split(' / ').join('  ·  ') : text });
      ov.querySelectorAll('.story-slot').forEach(s => s.classList.remove('speaking'));
      root.classList.toggle('narrating', who === 'narrator');
      root.classList.remove('lean-left', 'lean-right');

      if (who === 'narrator') {
        narr.classList.remove('in'); void narr.offsetWidth; narr.classList.add('in');
        return typeInto(narrP, text, null);
      }
      if (who !== 'chat') {
        lastSide = place(who);
        $('.story-slot.' + lastSide, ov).classList.add('speaking');
        root.classList.add('lean-' + lastSide);
        react(lastSide, lineMood(text));
      }
      nameEl.textContent = info.name;
      nameEl.style.background = info.color || '';
      box.style.setProperty('--sc', info.color || 'var(--hi)');
      box.classList.toggle('chat-line', who === 'chat');
      box.classList.toggle('enemy-line', !!info.enemy);
      box.animate([{ translate: '0 6px', opacity: .6 }, { translate: '0 0', opacity: 1 }], { duration: 180 });
      // Live chat: several viewer messages, separated by " / ", shown at once.
      if (who === 'chat') {
        chatFeed(text);
        textEl.innerHTML = text.split(' / ').map((m, k) => {
          const name = CHAT.names[(i * 3 + k) % CHAT.names.length];
          return `<span style="animation-delay:${k * 120}ms"><b style="color:hsl(${(i * 70 + k * 110) % 360} 80% 70%)">${name}</b> ${m}</span>`;
        }).join('');
        full = textEl.textContent;
        root.classList.add('chat-pop');
        setTimeout(() => root.classList.remove('chat-pop'), 400);
        return finishLine();
      }
      typeInto(textEl, text, who);
    }

    function openLog() {
      clearTimeout(autoT);
      const lv = $('.story-logview', ov);
      $('.slv-list', ov).innerHTML = log.map(l => `<div class="slv-line">${l.name ? `<b style="color:${l.color || '#fff'}">${l.name}</b>` : '<b class="narr">—</b>'}<p>${l.text}</p></div>`).join('');
      lv.classList.remove('hidden');
      const list = $('.slv-list', ov);
      list.scrollTop = list.scrollHeight;
    }

    function end() {
      clearInterval(typing); clearTimeout(autoT);
      document.removeEventListener('keydown', onKey);
      root.classList.add('outro');
      setTimeout(() => { ov.className = 'overlay'; ov.innerHTML = ''; resolve(); }, 320);
      if (typeof playMusic === 'function') playMusic(prevMusic);
    }

    const onKey = e => {
      if (!$('.story-logview', ov) || !$('.story-logview', ov).classList.contains('hidden')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!root.classList.contains('intro')) next(); }
      if (e.key.toLowerCase() === 'a') $('.sc-auto', ov).click();
      if (e.key.toLowerCase() === 'l') openLog();
    };
    document.addEventListener('keydown', onKey);
    root.onclick = e => {
      if (e.target.closest('.story-skip')) return end();
      if (e.target.closest('.sc-auto')) {
        STORY_PREFS.auto = !STORY_PREFS.auto;
        e.target.closest('.sc-auto').classList.toggle('on', STORY_PREFS.auto);
        if (STORY_PREFS.auto && ready) next();
        else clearTimeout(autoT);
        return;
      }
      if (e.target.closest('.sc-log')) return openLog();
      if (e.target.closest('.story-logview')) {
        if (e.target.closest('.close') || e.target.classList.contains('story-logview')) {
          $('.story-logview', ov).classList.add('hidden');
          if (STORY_PREFS.auto && ready) autoT = setTimeout(next, 600);
        }
        return;
      }
      if (root.classList.contains('intro')) return startScene();
      next();
    };

    // Title card first, then the scene.
    let started = false;
    function startScene() {
      if (started || !root.isConnected) return;
      started = true;
      root.classList.remove('intro');
      next();
    }
    sfx('whoosh');
    setTimeout(startScene, 1900);
  });
}

// Story text types out silently (no retro letter blips).
function blip() {}
