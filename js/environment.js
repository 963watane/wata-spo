// Original painted environments. Physics stays local to an encounter; the route rebases between them.
const SpoEnvironment = {
  ground: null,
  slate: null,
  loading: null,
  textures: {},
  pending: {},
  texture(file) {
    if (!this.textures[file]) {
      let complete;
      this.pending[file] = new Promise(resolve => { complete = resolve; });
      const map = new THREE.TextureLoader().load('assets/environment/' + file, complete, undefined, complete);
      map.colorSpace = THREE.SRGBColorSpace;
      this.textures[file] = map;
    }
    return this.textures[file];
  },
  load() {
    if (!this.loading) this.loading = Promise.all([
      loadImage('assets/environment/painted-limestone.jpg').then(img => { this.ground = img; }).catch(() => {}),
      loadImage('assets/environment/painted-slate.jpg').then(img => { this.slate = img; }).catch(() => {}),
      ...['painted-garden-tree.png', 'painted-cafe.png', 'seaside-promenade.jpg', 'evening-lane.jpg', 'rooftop-garden.jpg', 'underground-passage.jpg'].map(file => { this.texture(file); return this.pending[file]; }),
    ]);
    return this.loading;
  },
  storyStyle(id) {
    if (id === 'rooftop') return "background-image:url('assets/environment/rooftop-garden.jpg');background-position:center";
    if (id === 'tunnel') return "background-image:url('assets/environment/underground-passage.jpg');background-position:center";
    if (id === 'alley') return "background-image:url('assets/environment/evening-lane.jpg');background-position:center";
    return ['street-day', 'city-day', 'sunset-street'].includes(id)
      ? "background-image:url('assets/environment/seaside-promenade.jpg');background-position:center"
      : sceneStyle(id);
  },
  floor(th, size = 1024) {
    const id = Object.keys(ARENA_THEMES).find(k => ARENA_THEMES[k] === th) || 'street-day';
    const source = ['rooftop', 'tunnel', 'alley'].includes(id) ? this.slate || this.ground : this.ground;
    const colors = { 'street-day': '#e5dfc9', 'city-day': '#dce3d1', 'sunset-street': '#d7ad94', rooftop: '#acbac3', alley: '#7b8793', tunnel: '#91918a' };
    const map = canvasTex('studio-ground:' + id + ':' + size + ':' + !!source, size, size, g => {
      g.fillStyle = colors[id]; g.fillRect(0, 0, size, size);
      if (source) {
        const tile = size / 3;
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) g.drawImage(source, x * tile, y * tile, tile, tile);
        g.globalCompositeOperation = 'multiply'; g.fillStyle = colors[id]; g.globalAlpha = th.outdoor ? .3 : .22; g.fillRect(0, 0, size, size);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
      // Fine seams and garden edges give each theme a different surface rhythm.
      if (id === 'rooftop' || id === 'tunnel') {
        g.fillStyle = colors[id]; g.globalAlpha = .15; g.fillRect(0, 0, size, size); g.globalAlpha = 1;
        g.strokeStyle = '#52627050'; g.lineWidth = 2;
        for (let i = 0; i <= 8; i++) { const p = i * size / 8; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, size); g.moveTo(0, p); g.lineTo(size, p); g.stroke(); }
      }
      const edge = g.createLinearGradient(0, 0, size, 0);
      edge.addColorStop(0, th.outdoor ? '#78966b77' : '#34455477'); edge.addColorStop(.12, '#ffffff00'); edge.addColorStop(.88, '#ffffff00'); edge.addColorStop(1, th.outdoor ? '#78966b77' : '#34455477');
      g.fillStyle = edge; g.fillRect(0, 0, size, size);
      if (th.outdoor) {
        g.fillStyle = '#e9c9d39c';
        for (let i = 0; i < 90; i++) { const x = ((i * 211 + 17) % 997) / 997 * size, y = ((i * 337 + 61) % 991) / 991 * size; g.beginPath(); g.ellipse(x, y, 2, 4, i, 0, 6.29); g.fill(); }
      }
    });
    map.anisotropy = 4;
    return map;
  },
  inlay(variant) {
    return canvasTex('civic-inlay:' + variant % 3, 512, 512, g => {
      const size = 512;
      // Each floor has its own civic inlay, keeping the combat centre readable.
      g.save(); g.translate(size / 2, size / 2);
      g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, size / 400);
      const radius = size * .31;
      if (variant % 3 === 0) {
        for (const r of [radius, radius * .92, radius * .48]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
        for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); g.beginPath(); g.moveTo(0, -radius * .48); g.lineTo(0, -radius * .92); g.stroke(); g.restore(); }
      } else if (variant % 3 === 1) {
        for (const offset of [-.3, .3]) { g.strokeRect(size * offset - size * .025, -size / 2, size * .05, size); }
        g.rotate(Math.PI / 4); g.strokeRect(-radius * .55, -radius * .55, radius * 1.1, radius * 1.1);
      } else {
        for (const r of [radius, radius * .88]) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI * 2; g.lineTo(Math.sin(a) * r, Math.cos(a) * r); } g.stroke(); }
      }
      g.restore();
    });
  },
  foliage(th) {
    return canvasTex('studio-tree:' + th.outdoor + ':' + th.ground, 256, 384, g => {
      g.fillStyle = '#665d4b'; g.beginPath(); g.moveTo(116, 374); g.lineTo(124, 153); g.lineTo(136, 153); g.lineTo(145, 374); g.fill();
      const colors = th.outdoor ? ['#617f69', '#7e9d78', '#a2b78b', '#c5cea4', '#e8d8b5'] : ['#425b63', '#596d77', '#75838a', '#92968b'];
      for (let i = 0; i < 180; i++) {
        const a = i * 2.39996, r = Math.sqrt(i / 180) * 99;
        const x = 128 + Math.cos(a) * r, y = 132 + Math.sin(a) * r * .93;
        g.fillStyle = colors[(i * 13) % colors.length]; g.globalAlpha = .84;
        g.beginPath(); g.ellipse(x, y, 18 + (i % 8), 15 + (i % 7), a, 0, 6.29); g.fill();
      }
      g.globalAlpha = 1;
    });
  },
  build(b, th) {
    const T = THREE, low = SAVE.settings.gfx === 'low';
    b.props = [];
    b.routeWorld = new T.Group(); b.scene.add(b.routeWorld);
    b.scene.background = new T.Color(th.outdoor ? '#cbded9' : th.fog);
    const floor = this.floor(th, low ? 1024 : 1536);
    const floorMat = new T.MeshToonMaterial({ map: floor, gradientMap: c3().ramp, color: th.outdoor ? '#ffffff' : '#d5dce2' });
    const inlayMat = new T.MeshBasicMaterial({ map: this.inlay(b.waveIdx || 0), color: th.outdoor ? '#739493' : '#a4bec0', transparent: true, opacity: .34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const trim = toonMat(th.outdoor ? '#cbcbb6' : '#697986');
    const wall = toonMat(th.outdoor ? '#dce0ce' : '#536570');
    const treeMap = this.texture('painted-garden-tree.png');
    const leaf = new T.SpriteMaterial({ map: treeMap, transparent: true, depthWrite: false, color: th === ARENA_THEMES['sunset-street'] ? '#dfbcab' : '#ffffff' });
    const cafe = new T.SpriteMaterial({ map: this.texture('painted-cafe.png'), transparent: true, depthWrite: false, color: th.outdoor ? '#ffffff' : '#aeb9cb' });
    const rooms = 1;
    b.routeMarkers = [];
    const tile = geo('studio-field', () => new T.PlaneGeometry(30, 30).rotateX(-Math.PI / 2));
    const box = geo('studio-prop', () => new T.BoxGeometry(1, 1, 1));
    const put = (group, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
      const m = new T.Mesh(geometry, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.receiveShadow = true; m.castShadow = !low; group.add(m); return m;
    };
    const surround = canvasTex('studio-surround:' + th.ground, 512, 512, g => {
      g.fillStyle = th.outdoor ? '#91a58b' : '#53626b'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 360; i++) {
        g.fillStyle = th.outdoor ? ['#a9b89b', '#819b80', '#bdc4a2', '#758f79'][i % 4] : ['#69777c', '#4d6069', '#7d8788', '#45565e'][i % 4];
        g.globalAlpha = .2; g.beginPath(); g.ellipse((i * 173) % 512, (i * 281) % 512, 10 + i % 28, 6 + i % 19, i, 0, 6.29); g.fill();
      }
      g.globalAlpha = 1;
    });
    const landscape = new T.MeshBasicMaterial({ map: surround });
    put(b.routeWorld, geo('studio-surround-plane', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), landscape, 0, -.05, 14, 100, 1, 58);
    const bed = geo('studio-garden-bed', () => new T.CylinderGeometry(1, 1.04, .5, 24));
    const soil = toonMat(th.outdoor ? '#7d9370' : '#4c5e63');
    for (let i = 0; i < rooms; i++) {
      const room = new T.Group(); room.position.z = -i * 34; b.routeWorld.add(room);
      put(room, tile, floorMat, 0, .001, 0);
      put(room, tile, inlayMat, 0, .012, 0).castShadow = false;
      // Streets stay open along the route; planters and facades frame the playable space.
      for (const side of [-1, 1]) {
        put(room, box, trim, side * 14.8, .18, 0, .35, .35, 30);
        for (let k = 0; k < (low ? 2 : 3); k++) {
          const z = -10 + k * 9;
          put(room, bed, trim, side * 12.9, .25, z, 1.2, 1, 1.9);
          put(room, bed, soil, side * 12.9, .41, z, 1.08, .5, 1.75);
          if (th.outdoor) {
            const tree = new T.Sprite(leaf); tree.position.set(side * 12.9, 3.4, z); tree.scale.set(5.8, 8.7, 1); room.add(tree);
          } else {
            put(room, box, wall, side * 14.6, 3, z, 2, 6, 5.5);
            const accent = new T.MeshBasicMaterial({ color: th === ARENA_THEMES.tunnel ? '#cbb287' : th.accent });
            put(room, box, accent, side * 13.45, 2.8, z, .04, .12, 3.8);
          }
        }
        if (th === ARENA_THEMES.rooftop) {
          put(room, box, wall, side * 13.9, 1, 5, 2, 2, 3);
          put(room, box, trim, side * 13.9, 2.1, 5, 2.2, .2, 3.2);
        }
        if (th.outdoor || th === ARENA_THEMES.alley) {
          const building = new T.Sprite(cafe);
          building.position.set(side * 19.4, 5, -6 + (i % 2) * 5); building.scale.set(12, 11, 1); room.add(building);
        }
      }

    }
    // A painted panorama gives the 3D street the same art direction as the story.
    {
      const file = th === ARENA_THEMES.rooftop ? 'rooftop-garden' : th === ARENA_THEMES.tunnel ? 'underground-passage' : th.outdoor ? 'seaside-promenade' : 'evening-lane';
      const bg = this.texture(file + '.jpg');
      const panorama = new T.Mesh(geo('studio-panorama', () => new T.PlaneGeometry(140, 70)), new T.MeshBasicMaterial({ map: bg, color: th === ARENA_THEMES['sunset-street'] ? '#e7b4ad' : '#ffffff', fog: false }));
      panorama.position.set(0, 28, -45 - (rooms - 1) * 34); b.scene.add(panorama); b.paintedPanorama = panorama;
    }
    b.motes = new Sparks(b.scene, glowTex(), low ? 30 : 70);
    for (let i = 0; i < (low ? 12 : 36); i++) b.motes.emit(((i * 13) % 29) - 14, 1 + i % 5, ((i * 7) % 25) - 12, { n: 1, color: th.mote, speed: .08, grav: 0, drag: 0, life: 1e6, size: .04, bright: .55 });
    if (!th.outdoor) leaf.dispose();
    if (!th.outdoor && th !== ARENA_THEMES.alley) cafe.dispose();
    this.buildGallery(b, th, low);
    if (b.routeEnabled) SpoExpedition.build(b, th);
  },
  buildGallery(b, th, low) {
    const T = THREE, group = new T.Group(); b.routeWorld.add(group);
    const roof = th === ARENA_THEMES.rooftop, tunnel = th === ARENA_THEMES.tunnel;
    const variant = (b.waveIdx || 0) % 3;
    const stone = new T.MeshStandardMaterial({ map: SpoExpedition.wallTexture(), color: th.outdoor ? '#efecdb' : '#849cae', roughness: .95 });
    const trim = new T.MeshStandardMaterial({ color: th.outdoor ? ['#64908e', '#859798', '#9b8d79'][variant] : '#3c6579', roughness: .8 });
    const dark = new T.MeshStandardMaterial({ color: tunnel ? '#263745' : '#416e82', roughness: .45, metalness: .12 });
    const light = new T.MeshBasicMaterial({ color: tunnel ? '#d1b788' : '#b8dbde' });
    const box = geo('gallery-box', () => new T.BoxGeometry(1, 1, 1));
    const arch = geo('gallery-arch', () => new T.TorusGeometry(1, .12, 6, 20, Math.PI));
    const put = (g, m, x, y, z, sx, sy, sz) => {
      const obj = new T.Mesh(g, m); obj.position.set(x, y, z); obj.scale.set(sx, sy, sz); obj.castShadow = !low; obj.receiveShadow = true; group.add(obj); return obj;
    };
    // Open colonnades surround the playable court without putting walls through its camera.
    for (const side of [-1, 1]) {
      const x = side * 13.9;
      put(box, trim, x, .25, 0, .6, .5, 34);
      for (let i = 0; i < (low ? 4 : 6); i++) {
        const z = -14 + i * (low ? 9 : 5.6), height = roof ? 2.8 : 5.2;
        put(box, stone, x, height / 2, z, .75, height, .8);
        put(box, trim, x, .6, z, 1.15, .22, 1.2);
        put(box, trim, x, height - .15, z, 1.05, .24, 1.2);
        if (!roof && i < (low ? 3 : 5)) {
          const span = low ? 9 : 5.6;
          const a = put(arch, stone, x, 3.65, z + span / 2, span / 2, 1.7, 1.3); a.rotation.y = Math.PI / 2;
          put(box, trim, x, 5.65, z + span / 2, 1.1, .3, span + .4);
        }
        if (i % 2 === 0) {
          put(box, dark, x - side * .5, 2.45, z, .48, .85, .58);
          put(box, light, x - side * .77, 2.45, z, .05, .5, .34);
        }
      }
      if (roof) {
        put(box, dark, x - side * .7, 1.25, -8, 1.7, 2.5, 4);
        put(box, trim, x - side * .7, 2.6, -8, 2, .2, 4.3);
      }
    }
    // A raised gallery at the far edge establishes a destination beyond the fighting space.
    for (const side of [-1, 1]) {
      const x = side * 10;
      put(box, stone, x, 1, -14.2, 13, 2, 3.3);
      put(box, trim, x, 2.1, -14.2, 13.4, .18, 3.5);
      for (let k = 0; k < 3; k++) {
        const px = x + (k - 1) * 4;
        put(box, stone, px, 4.3, -14.8, .7, 4.3, .8);
        put(box, trim, px, 6.5, -14.8, 1.1, .22, 1.2);
        if (!low) { put(box, dark, px + 1.7, 3.5, -15.2, 2, 2.8, .24); put(box, light, px + 1.7, 4.2, -15.03, 1.3, .07, .04); }
      }
      put(box, trim, x, 6.7, -14.8, 13.5, .3, 2.4);
    }

  },
};
