// Background music. Put tracks in assets/music/ with these names (.mp3 or
// .ogg); see assets/music/README.txt. Missing tracks are simply silent.
const MUSIC_FILES = {
  home: 'home', gacha: 'gacha', battle: 'battle', boss: 'boss', story: 'story', event: 'event', victory: 'victory',
  // Optional theme per boss (boss_<enemy id>); The Algorithm is the final boss.
  // A boss without its own file plays the shared boss track.
  boss_phantom: 'boss-phantom', boss_core: 'boss-core', boss_algorithm: 'boss-final',
};
const bossTrack = id => (MUSIC_FILES['boss_' + id] ? 'boss_' + id : 'boss');
// Which track each screen plays (screens not listed keep the home theme).
const SCREEN_MUSIC = { lobby: 'home', recruit: 'gacha', battle: 'battle', live: 'event' };

let musicNow = null;        // { name, el }
let musicWanted = null;     // last requested track (played once audio is unlocked)
const musicMissing = {};    // track name -> true once both formats failed

const musicVolume = () => (SAVE.settings.music ? SAVE.settings.musicVolume : 0);

function fadeAudio(el, to, ms, done) {
  const from = el.volume, start = performance.now();
  const step = t => {
    const k = Math.min(1, (t - start) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step); else if (done) done();
  };
  requestAnimationFrame(step);
}

// Crossfades to a track by name. Unknown or missing tracks fade out the current one.
function playMusic(name) {
  musicWanted = name;
  if (musicNow && musicNow.name === name) return;
  const old = musicNow;
  musicNow = null;
  if (old) fadeAudio(old.el, 0, 500, () => old.el.pause());
  if (!name || !MUSIC_FILES[name] || musicMissing[name]) return;
  const el = new Audio();
  el.loop = name !== 'victory';
  el.volume = 0;
  const exts = ['mp3', 'ogg'];
  const tryNext = () => {
    const ext = exts.shift();
    if (!ext) {
      musicMissing[name] = true;
      if (name.startsWith('boss_') && musicWanted === name) { musicNow = null; playMusic('boss'); }
      return;
    }
    el.src = `assets/music/${MUSIC_FILES[name]}.${ext}`;
  };
  el.onerror = tryNext;
  el.oncanplay = () => {
    if (musicWanted !== name) return;
    el.play().then(() => fadeAudio(el, musicVolume(), 900)).catch(() => { /* waits for a click (autoplay rules) */ });
  };
  tryNext();
  musicNow = { name, el };
}

// Settings changed: apply the new volume right away.
function updateMusicVolume() {
  if (!musicNow) return;
  musicNow.el.volume = musicVolume();
  if (musicVolume() > 0 && musicNow.el.paused) musicNow.el.play().catch(() => {});
}

// Browsers only allow sound after the first click; start the wanted track then.
document.addEventListener('pointerdown', () => {
  if (musicNow && musicNow.el.paused && musicNow.el.readyState >= 2) {
    musicNow.el.play().then(() => fadeAudio(musicNow.el, musicVolume(), 900)).catch(() => {});
  }
});
