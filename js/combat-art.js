// Layered world-space skill art. Damage, ranges and hit schedules remain in ACTION_KITS.
const SpoCombatArt = {
  begin(fx) {
    const low = SAVE.settings.gfx === 'low';
    if ((fx.artActive || 0) >= (low ? 3 : 8)) return false;
    fx.artActive = (fx.artActive || 0) + 1;
    return true;
  },
  material(color, opacity = 1) {
    const quiet = SAVE.settings.flashes === false;
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false,
      blending: quiet ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide });
  },
  burst(fx, x, z, r, color) {
    if (!this.begin(fx)) return;
    const T = THREE, low = SAVE.settings.gfx === 'low', quiet = SAVE.settings.flashes === false;
    const group = new T.Group(), mat = this.material(color), pale = this.material(quiet ? color : '#e6eaff');
    group.position.set(x, .06, z);
    const ring = new T.Mesh(geo('art-wave-ring', () => new T.RingGeometry(.93, 1, 64).rotateX(-Math.PI / 2)), mat);
    const inner = new T.Mesh(geo('art-wave-inner', () => new T.RingGeometry(.975, 1, 64).rotateX(-Math.PI / 2)), pale);
    group.add(ring, inner);
    const arc = geo('art-wave-crescent', () => new T.RingGeometry(.86, 1, 48, 1, 0, Math.PI * 1.18));
    const sweep = new T.Mesh(arc, mat); sweep.rotation.set(-.64, .35, -.35); group.add(sweep);
    const second = low ? null : new T.Mesh(arc, pale);
    if (second) { second.rotation.set(-1.05, -.6, 2.4); group.add(second); }
    const spire = geo('art-light-spire', () => new T.ConeGeometry(.12, 1, 5).translate(0, .5, 0));
    const count = low ? 3 : 7, spikes = [];
    for (let i = 0; i < count; i++) {
      const a = i * 2.39996, d = r * (.28 + (i % 3) * .18), m = new T.Mesh(spire, i % 2 ? mat : pale);
      m.position.set(Math.sin(a) * d, 0, Math.cos(a) * d); m.rotation.z = Math.sin(a) * .12;
      m.userData.height = 1.1 + (i % 3) * .55; group.add(m); spikes.push(m);
    }
    fx.add(group, .78, k => {
      const release = 1 - Math.pow(1 - k, 3), fade = Math.pow(1 - k, 1.6);
      ring.scale.setScalar(r * (.18 + release * .82)); inner.scale.setScalar(r * (.12 + release * .72));
      sweep.scale.setScalar(r * (.25 + release * .7)); sweep.rotation.y = .35 + k * 1.6;
      if (second) { second.scale.setScalar(r * (.3 + release * .65)); second.rotation.y = -.6 - k * 1.3; }
      for (let i = 0; i < spikes.length; i++) {
        const m = spikes[i], rise = Math.max(0, Math.min(1, (k - i * .018) * 8));
        m.scale.set(1 - k * .7, m.userData.height * rise * (1 - k * .4), 1 - k * .7);
      }
      mat.opacity = fade * (quiet ? .48 : .68); pale.opacity = fade * (quiet ? .26 : .6);
    }, () => { mat.dispose(); pale.dispose(); fx.artActive--; });
    fx.b.streaks.emit(x, .3, z, { n: low ? 5 : 15, color, speed: r * 2.7, up: .7, grav: 8, life: .45, width: .055, bright: quiet ? .7 : 1.3 });
    fx.b.punch = Math.max(fx.b.punch || 0, r > 4 ? .3 : .12);
  },
  lance(fx, from, ang, len, color, dur) {
    if (!this.begin(fx)) return;
    const group = new THREE.Group(), mat = this.material(color), core = this.material(SAVE.settings.flashes === false ? color : '#dbeaff');
    group.position.set(from.x, .45, from.z); group.rotation.y = ang;
    const geometry = geo('art-lance-ribbon', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, .5));
    const outer = new THREE.Mesh(geometry, mat), line = new THREE.Mesh(geometry, core);
    outer.scale.set(.55, 1, len); line.scale.set(.065, 1, len); line.position.y = .025;
    // A second ribbon makes the shot readable from both the battle and scene cameras.
    const side = new THREE.Mesh(geo('art-lance-side', () => new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2).translate(0, 0, .5)), mat);
    side.scale.set(1, .3, len); group.add(outer, line, side);
    fx.add(group, Math.max(.26, dur), k => {
      const fade = (1 - k) * (1 - k); mat.opacity = .6 * fade; core.opacity = .75 * fade;
      outer.scale.x = .12 + .43 * (1 - k); side.scale.y = .08 + .22 * (1 - k);
    }, () => { mat.dispose(); core.dispose(); fx.artActive--; });
  },
};

// Retain the original light contact effects; larger casts receive a layered wave/beam.
{
  const oldNova = ActionFx.prototype.nova, oldBeam = ActionFx.prototype.beam;
  ActionFx.prototype.nova = function(x, z, r, color) {
    if (r < 2) return oldNova.call(this, x, z, r, color);
    SpoCombatArt.burst(this, x, z, r, color);
  };
  ActionFx.prototype.beam = function(from, ang, len, color, dur = .22) {
    oldBeam.call(this, from, ang, len, color, dur);
    if (len > 3) SpoCombatArt.lance(this, from, ang, len, color, dur);
  };
}
