/* Bodenzeichen gehören zur Mechanik: helle Flächen sind immer die sicheren Aktionen. */
(function () {
  'use strict';
  window.DungeonTrialView = function (THREE, scene, centerZ, hud) {
    var group = new THREE.Group(); group.position.z = centerZ; scene.add(group);
    function material(color, opacity) { return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, side: THREE.DoubleSide, depthWrite: false }); }
    function floor(geometry, color, opacity) { var m = new THREE.Mesh(geometry, material(color, opacity)); m.rotation.x = -Math.PI / 2; m.position.y = 0.07; group.add(m); return m; }
    var rings = [floor(new THREE.RingGeometry(0.93, 1.07, 80), 0xffb05c, 0.9), floor(new THREE.RingGeometry(0.93, 1.07, 80), 0xffb05c, 0.9)];
    var warning = floor(new THREE.RingGeometry(1.5, 2, 48), 0xffb05c, 0.7); warning.position.z = -4;
    var sector = floor(new THREE.RingGeometry(3, 12, 80, 1, -Math.PI / 3, Math.PI * 2 / 3), 0xa9ffe4, 0.45);
    var danger = floor(new THREE.CircleGeometry(12, 80), 0xff481f, 0.12); danger.position.y = 0.025;
    var cover = floor(new THREE.PlaneGeometry(5, 5.7), 0xbaffef, 0.55);
    var line = floor(new THREE.PlaneGeometry(0.15, 22), 0xb5eaff, 0.7);
    var rune = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.5, 0.8), new THREE.MeshLambertMaterial({ color: 0x90bfe8, emissive: 0x366b9e, emissiveIntensity: 0.55 })); group.add(rune);
    var arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 3), material(0xc4f5ff, 0.9)); group.add(arrow);
    function label(text) {
      var canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
      var ctx = canvas.getContext('2d'); ctx.fillStyle = '#101020'; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = '#caffec'; ctx.font = 'bold 32px system-ui'; ctx.textAlign = 'center'; ctx.fillText(text, 128, 44);
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false })); sprite.scale.set(3.4, 0.85, 1); group.add(sprite); return sprite;
    }
    var safeLabel = label('SICHER'), frostLabel = label('FROST'), lastTitle = '';
    var directionNames = ['rechts →', 'vorne ↑', 'links ←', 'hinten ↓'];
    this.update = function (s, visible, stale, used) {
      group.visible = visible; hud.style.display = visible ? 'block' : 'none'; if (!visible) return;
      rings.forEach(function (m, i) { m.visible = s.level === 0 && s.phase === 'attack' && s.radii[i] > 0 && s.radii[i] < 24; if (m.visible) { m.scale.setScalar(s.radii[i]); m.position.z = -4; } });
      var live = s.phase === 'warn' || s.phase === 'attack', ice = s.level === 1 && live, lava = s.level === 2 && live;
      warning.visible = s.level === 0 && s.phase === 'warn';
      if (warning.visible) warning.material.opacity = 0.45 + Math.abs(Math.sin(s.remaining * 5)) * 0.4;
      sector.visible = lava; danger.visible = lava || ice; cover.visible = ice; rune.visible = ice; arrow.visible = ice; line.visible = ice;
      var dx = Math.cos(s.direction), dz = Math.sin(s.direction);
      sector.rotation.z = -s.direction;
      cover.position.set(dx * 8.95, 0.08, dz * 8.95); cover.rotation.z = Math.PI / 2 - s.direction;
      rune.position.set(dx * 5.6, 1.25, dz * 5.6); rune.rotation.y = Math.PI / 2 - s.direction;
      arrow.position.set(-dx * 9, 2, -dz * 9); arrow.rotation.set(0, 0, 0); arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, 0, dz));
      line.rotation.z = Math.PI / 2 - s.direction;
      safeLabel.visible = ice || lava; safeLabel.position.set(dx * 8.5, 0.9, dz * 8.5);
      frostLabel.visible = ice; frostLabel.position.set(-dx * 9, 3.5, -dz * 9);
      hud.dataset.phase = s.phase;
      var direction = directionNames[((Math.round(-s.direction / (Math.PI / 2)) % 4) + 4) % 4];
      var title = s.phase === 'waiting' ? 'Warte auf die gemeinsame Prüfungsuhr …' : s.phase === 'rise' ? 'Der Koloss erwacht …' : s.phase === 'open' ? (used ? 'Treffer bestätigt · nächste Prüfung folgt' : 'VERWUNDBAR · zur violetten Faust und zuschlagen!') : s.phase === 'rest' ? 'Atempause · nächste Prüfung folgt' : s.level === 0 ? (s.phase === 'warn' ? 'ZWEI RINGE kommen · Abstand halten, dann springen' : 'SPRINGEN · beide Ringe überspringen!') : s.level === 1 ? 'DECKUNG ' + direction + ' · hinter den hellen Runenstein!' : 'SICHER-SEKTOR · im hellen Keil bleiben' + (s.phase === 'attack' ? ' und mitdrehen!' : ' · gleich dreht er sich!');
      var nextTitle = stale ? '📡 Warte auf Host · Gefahren pausiert' : title + ' · ' + Math.ceil(s.remaining) + ' s';
      var key = s.level + '/' + s.phase + '/' + nextTitle;
      if (key === lastTitle) return;
      lastTitle = key; hud.textContent = nextTitle;
      var small = document.createElement('small'); small.textContent = DungeonTrials.definitions[s.level].name + ' · ' + (s.phase === 'open' ? 'E / ⚔️ · Q wechselt die Waffe · ein Treffer pro Person' : s.level === 0 ? 'LEER / ⤴ · Höhe schützt · violett = angreifen' : 'WASD / Stick · Springen schützt hier nicht · violett = angreifen'); hud.appendChild(small);
    };
    this.hide = function () { group.visible = false; hud.style.display = 'none'; };
    this.hide();
  };
})();
