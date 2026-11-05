// Between-floor navigation and coastal civic architecture. No combat tuning lives here.
const SpoExpedition = {
  points: [[0, 0, -12], [0, 0, -17], [-3, 0, -22], [-7, 0, -25], [-9, 0, -30], [-9, 1.6, -36], [-5, 1.6, -39], [0, 1.6, -40], [1, 1.6, -44]],
  project(x, z, out) {
    let best = Infinity;
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i], b = this.points[i + 1], dx = b[0] - a[0], dz = b[2] - a[2];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz)));
      const px = a[0] + dx * t, pz = a[2] + dz * t, d = (x - px) ** 2 + (z - pz) ** 2;
      if (d < best) { best = d; out.x = px; out.z = pz; out.y = a[1] + (b[1] - a[1]) * t; out.index = i; out.t = t; }
    }
    out.distance = Math.sqrt(best); return out;
  },
  wallTexture() {
    return canvasTex('expedition-ivory-blocks', 512, 512, g => {
      g.fillStyle = '#cbd0c6'; g.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 4; y++) for (let x = -1; x < 3; x++) {
        const px = x * 256 + (y % 2) * 128, py = y * 128;
        const wash = g.createLinearGradient(px, py, px + 220, py + 123);
        wash.addColorStop(0, '#eeebd8'); wash.addColorStop(.6, '#dedfce'); wash.addColorStop(1, '#c5cbbd');
        g.fillStyle = wash; g.fillRect(px + 2, py + 2, 252, 124);
        g.strokeStyle = '#b2bcb044'; g.lineWidth = 1; g.strokeRect(px + 4, py + 4, 248, 120);
      }
    });
  },
  build(b, th) {
    const T = THREE, low = SAVE.settings.gfx === 'low', root = new T.Group();
    b.scene.add(root); b.expeditionWorld = root; b.routeProjection = {}; b.routeCursor = 0;
    const stone = new T.MeshStandardMaterial({ map: this.wallTexture(), color: '#ffffff', roughness: .96 });
    const pale = new T.MeshStandardMaterial({ color: '#e6e4cd', roughness: .9 });
    const teal = new T.MeshStandardMaterial({ color: '#638f8d', roughness: .8, metalness: .08 });
    const dark = new T.MeshStandardMaterial({ color: '#274c60', roughness: .8 });
    const glow = new T.MeshBasicMaterial({ color: '#a4dbdc', transparent: true, opacity: .8 });
    const paving = new T.MeshStandardMaterial({ map: SpoEnvironment.floor(th, low ? 1024 : 1536), color: '#edf0e9', roughness: .94 });
    const cube = geo('expedition-cube', () => new T.BoxGeometry(1, 1, 1));
    const cylinder = geo('expedition-cylinder', () => {
      const g = new T.CylinderGeometry(1, 1, 1, 20), uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 2);
      return g;
    });
    stone.map.wrapS = stone.map.wrapT = T.RepeatWrapping;
    const put = (g, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = root) => {
      const m = new T.Mesh(g, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = !low; m.receiveShadow = true; parent.add(m); return m;
    };
    const rail = (a, c, side) => {
      const dx = c[0] - a[0], dz = c[2] - a[2], len = Math.hypot(dx, dz), nx = dz / len, nz = -dx / len;
      const strip = new T.Group(); strip.position.set((a[0] + c[0]) / 2 + nx * 2.65 * side, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2 + nz * 2.65 * side); strip.rotation.y = Math.atan2(dx, dz); root.add(strip);
      put(cube, stone, 0, .28, 0, .34, .65, Math.max(.5, len - .7), strip);
      put(cube, teal, 0, .65, 0, .48, .12, Math.max(.5, len - .6), strip);
      put(cube, teal, 0, 1.2, 0, .14, .1, Math.max(.5, len - .8), strip);
      const posts = Math.max(1, Math.floor(len / 1.5));
      for (let j = 0; j <= posts; j++) {
        const pz = -len / 2 + j / posts * len;
        put(cube, teal, 0, .94, pz, .07, .55, .07, strip);
        if (!low) { const detail = put(cube, teal, 0, .95, pz + .35, .055, .42, .055, strip); detail.rotation.x = .42; }
      }
    };
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i], c = this.points[i + 1], dx = c[0] - a[0], dz = c[2] - a[2], len = Math.hypot(dx, dz);
      const deck = put(cube, paving, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - .24, (a[2] + c[2]) / 2, 5.8, .46, len + .65);
      deck.rotation.y = Math.atan2(dx, dz); deck.rotation.x = -Math.atan2(c[1] - a[1], len);
      if (c[1] !== a[1]) {
        for (let n = 0; n < 8; n++) {
          const t = (n + .5) / 8;
          const step = put(cube, pale, a[0] + dx * t, a[1] + (c[1] - a[1]) * t - .02, a[2] + dz * t, 5.6, .16, len / 8 + .06);
          step.rotation.y = Math.atan2(dx, dz);
        }
      }
      rail(a, c, -1); rail(a, c, 1);
      const joint = put(cylinder, paving, a[0], a[1] - .2, a[2], 2.88, .35, 2.88);
      if (i === 0) joint.visible = false;
    }
    // Water and stone supports create depth below the walkable deck.
    const waterMat = new T.ShaderMaterial({ uniforms: { time: { value: 0 } }, transparent: false,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec2 vUv; uniform float time; void main(){vec2 p=vUv*36.0;float a=sin(p.y*6.0+sin(p.x*.65+time*.3)*1.3-time*1.3);float foam=smoothstep(.975,1.0,a)*smoothstep(-.2,.75,sin(p.x*1.4+p.y*.2+time*.4));vec3 base=mix(vec3(.08,.25,.37),vec3(.17,.44,.58),.5+.5*sin(p.x*.7+p.y*.3));gl_FragColor=vec4(mix(base,vec3(.65,.87,.88),foam*.65),1.0);}' });
    const water = put(geo('expedition-water', () => new T.PlaneGeometry(90, 100).rotateX(-Math.PI / 2)), waterMat, 0, -.9, -35); water.castShadow = false;
    b.expeditionWater = waterMat;
    for (const x of [-16, 12]) for (const z of [-18, -31, -44]) {
      put(cube, stone, x, -.1, z, 2.6, 3.4, 3.2); put(cube, teal, x, 1.55, z, 3, .25, 3.5);
      put(cube, stone, x, 4.9, z, 1.25, 6.4, 1.6); put(cube, teal, x, 8.2, z, 2.1, .3, 2.3);
      put(cube, pale, x, 8.5, z, 2.5, .35, 2.7);
    }
    // An original waterworks rotunda frames the bend; its entrance faces the landing.
    put(cylinder, stone, 2.4, 3.4, -29, 5.1, 8.5, 5.1);
    put(cylinder, teal, 2.4, -.1, -29, 5.6, .7, 5.6);
    put(cylinder, teal, 2.4, 7.7, -29, 5.65, .5, 5.65);
    put(cylinder, pale, 2.4, 8.1, -29, 5.9, .35, 5.9);
    const cols = low ? 6 : 10;
    for (let i = 0; i < cols; i++) {
      const a = i / cols * Math.PI * 2, x = 2.4 + Math.sin(a) * 5.2, z = -29 + Math.cos(a) * 5.2;
      put(cube, teal, x, .3, z, .9, .35, .9); put(cube, pale, x, 3.5, z, .65, 6.2, .65); put(cube, teal, x, 6.7, z, .85, .22, .85);
    }
    for (let i = 1; i < this.points.length; i += low ? 3 : 2) {
      const p = this.points[i], q = this.points[Math.max(0, i - 1)], dx = p[0] - q[0], dz = p[2] - q[2], len = Math.hypot(dx, dz);
      for (const side of [-1, 1]) {
        const x = p[0] + dz / len * 2.7 * side, z = p[2] - dx / len * 2.7 * side;
        put(cube, pale, x, p[1] + .8, z, .75, 1.5, .75); put(cube, teal, x, p[1] + 1.6, z, .95, .16, .95);
        put(cube, dark, x, p[1] + 2, z, .65, .65, .65); put(cube, glow, x, p[1] + 2.02, z, .49, .44, .68);
        put(geo('expedition-lantern-cap', () => new T.ConeGeometry(.68, .3, 4)), teal, x, p[1] + 2.48, z);
      }
    }
    // The floor exit is an arch and a low, readable beacon, rather than a new enemy wave.
    for (const x of [-2.7, 4.7]) { put(cube, stone, x, 5, -45, .9, 7, 1.25); put(cube, teal, x, 1.8, -45, 1.25, .35, 1.5); }
    put(cube, pale, 1, 8.5, -45, 8.4, .65, 1.4);
    const beacon = put(cylinder, glow, 1, 1.74, -43, 1.25, .09, 1.25); beacon.castShadow = false; b.floorBeacon = beacon;
    put(cube, glow, 1, 2.6, -43, .08, 1.8, .08);
    root.visible = true;
    return root;
  },
  clearEnvironment(b) {
    const materials = new Set();
    for (const obj of [b.routeWorld, b.expeditionWorld, b.paintedPanorama]) if (obj) {
      b.scene.remove(obj); obj.traverse(m => { if (m.material) for (const mat of [].concat(m.material)) materials.add(mat); });
    }
    materials.forEach(m => m.dispose());
    if (b.motes) { b.scene.remove(b.motes.points); b.motes.geo.dispose(); b.motes.mat.dispose(); }
    b.expeditionWater = null; b.expeditionWorld = null;
  },
};
