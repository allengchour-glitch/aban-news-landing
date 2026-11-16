/* Echte Browser-Fixtures, kein vollständiger Lebenslauf und keine Handy-FPS-Messung.
   PLAYWRIGHT_MODULE=/pfad/playwright LP_BASE=http://localhost:8151 LP_OUT=/tmp/charakter node spiele-dev/lebenspfad/charakter-qa.cjs
   LP_EXPECT_BASELINE=1 verlangt gezielt die bekannten roten Gegenproben auf dem alten Port 8150. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LP_BASE || 'http://localhost:8151';
const out = process.env.LP_OUT || '/tmp/lebenspfad-charakter';
const negative = process.env.LP_EXPECT_BASELINE === '1';
const shots = process.env.LP_SHOTS !== '0';
// GEMESSEN im vorausgehenden Audit: gleiche native Defaults, ohne Schatten/Brett.
const baseline = { desktop: { f: 78, m: 81 }, mobile: { f: 74, m: 75 } };
// GEMESSEN: lokale Sohlenunterkante aus dem alten Audit, bei Y-Skalierung 1,1.
const originalFootDepth = { desktop: .13048200041502717 / 1.1, mobile: .1254000003933907 / 1.1 };
const originalAge = [
  { scaleY: 1.0989, headScale: 1.0988, stoop: 0 },
  { scaleY: 1.3365, headScale: .9348, stoop: 0 },
  { scaleY: 1.485, headScale: .82, stoop: 0 },
  { scaleY: 1.4256, headScale: .8364, stoop: .22 }
];

function browserFixture() {
  const eps = 1e-6;
  function vertices(root, fn) {
    root.updateMatrixWorld(true);
    root.traverseVisible(o => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      const a = o.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) fn(new THREE.Vector3().fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld));
    });
  }
  function size(root) { return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray(); }
  function frame(camera, root) {
    const box = new THREE.Box3().setFromObject(root), center = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3()), half = THREE.MathUtils.degToRad(camera.fov / 2);
    // Nur Auditkamera: Abstand aus den Grenzen, 10% Freiraum. Produktkamera separat prüfen.
    const distance = Math.max(sz.y / 2 / Math.tan(half), sz.x / 2 / (Math.tan(half) * camera.aspect)) * 1.1 + sz.z / 2;
    camera.position.set(center.x, center.y, center.z + distance); camera.lookAt(center); camera.updateMatrixWorld(true);
  }
  function make(cfg, stage) {
    const pw = mkPawnMesh(PCOLORS[cfg.g === 'm' ? 1 : 0], cfg);
    if (stage !== undefined) {
      const old = pawns[0], tile = G.players[0].tile;
      try { pawns[0] = pw; G.players[0].tile = [0, 1, 3, 6][stage] * FIELDS_PER; agePawn(0, false); animLife(pw, 0, false); }
      finally { pawns[0] = old; G.players[0].tile = tile; }
    }
    return pw;
  }
  const api = window.__charQA = {
    defaults: () => [loadChar(0), loadChar(1)],
    preview(cfg) {
      const cv = document.createElement('canvas'); cv.width = PV_W; cv.height = PV_H;
      const original = renderer.render; let result = null;
      renderer.render = function(s, c) {
        if (_pv && s === _pv.s) {
          c.updateMatrixWorld(true); const meshes = s.children.filter(o => o.isGroup || o.isMesh);
          let count = 0, finite = true, minMargin = Infinity, zMin = Infinity, zMax = -Infinity;
          meshes.forEach(root => vertices(root, v => {
            v.project(c); count++; finite = finite && [v.x, v.y, v.z].every(Number.isFinite);
            minMargin = Math.min(minMargin, 1 - Math.abs(v.x), 1 - Math.abs(v.y));
            zMin = Math.min(zMin, v.z); zMax = Math.max(zMax, v.z);
          }));
          result = { count, finite, minMargin, zMin, zMax, encoding: _pv.rt.texture.encoding, rendererEncoding: renderer.outputEncoding };
        }
        return original.call(this, s, c);
      };
      try { charPreview(cv, cfg, PCOLORS[cfg.g === 'm' ? 1 : 0]); } finally { renderer.render = original; }
      if (!result) throw new Error('Produktvorschau hat keine Figur gerendert');
      return result;
    },
    draw(cfg, options = {}) {
      if (!this.r) {
        this.r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.r.setSize(600, 800); this.r.outputEncoding = renderer.outputEncoding;
        this.r.toneMapping = renderer.toneMapping; this.r.toneMappingExposure = renderer.toneMappingExposure;
        const cv = this.r.domElement; cv.id = 'charQAImage';
        cv.style.cssText = 'position:fixed;left:0;top:0;width:600px;height:800px;z-index:999999'; document.body.appendChild(cv);
      }
      this.r.domElement.style.display = '';
      const s = new THREE.Scene(); s.background = new THREE.Color(0xf6efe0);
      s.add(new THREE.HemisphereLight(0xffffff, 0x8a7a5a, 1.05));
      const dl = new THREE.DirectionalLight(0xfff2d8, .9); dl.position.set(2, 4, 3); s.add(dl);
      const pw = make(cfg, options.stage); pw.rotation.y = options.angle || 0;
      if (options.walk) animWalk(pw, true, .13);
      s.add(pw); const c = new THREE.PerspectiveCamera(36, .75, .1, 30); frame(c, pw);
      this.r.render(s, c); let meshes = 0, outlines = 0;
      pw.traverse(o => { if (o.isMesh) { meshes++; if (o.userData.__outline) outlines++; } });
      return { cfg, options, coarse: IS_COARSE, calls: this.r.info.render.calls, triangles: this.r.info.render.triangles, meshes, outlines, size: size(pw) };
    },
    hide() { if (this.r) this.r.domElement.style.display = 'none'; },
    motion(cfg) {
      const pw = make(cfg), u = pw.userData, hg = u.headGroup;
      const parts = [u.head, u.mouth, ...u.eyes];
      hg.traverse(o => { if (o.isMesh && o.material === u.hairMat && !o.userData.__outline) parts.push(o); });
      function capture() {
        pw.updateMatrixWorld(true); const inverse = hg.matrixWorld.clone().invert();
        return parts.map(o => ({ local: inverse.clone().multiply(o.matrixWorld).elements.slice(), world: o.matrixWorld.elements.slice() }));
      }
      const before = capture(); const groupBefore = hg.rotation.toArray().slice(0, 3);
      u.lookT = .5; u.lookDir = .5; u.blinkT = 10; animLife(pw, .25, false);
      const after = capture(), groupAfter = hg.rotation.toArray().slice(0, 3);
      const relativeDrift = Math.max(...before.flatMap((p, j) => p.local.map((v, i) => Math.abs(v - after[j].local[i]))));
      const movedParts = before.map((p, j) => Math.hypot(...p.world.map((v, i) => v - after[j].world[i])) > eps);
      u.blinkD = .1; animLife(pw, .01, false); const closed = u.eyes.map(e => e.scale.y);
      u.blinkD = 0; u.blinkT = 10; animLife(pw, .01, false); const opened = u.eyes.map(e => e.scale.y);
      animWalk(pw, true, .13); const L = u.limbs;
      const walking = [L.ll.rotation.x, L.rl.rotation.x, L.la.rotation.x, L.ra.rotation.x];
      for (let i = 0; i < 30; i++) animWalk(pw, false, .05);
      const stopped = [L.ll.rotation.x, L.rl.rotation.x, L.la.rotation.x, L.ra.rotation.x];
      return { groupBefore, groupAfter, relativeDrift, movedParts, parts: parts.length, closed, opened, walking, stopped };
    },
    age() {
      const pw = pawns[0], u = pw.userData; scene.updateMatrixWorld(true);
      const shoes = [u.limbs.ll, u.limbs.rl].map(l => new THREE.Box3().setFromObject(l).min.y);
      return { stage: u.ageStage, scaleY: pw.scale.y, headScale: u.headGroup.scale.x, headStoop: u.headStoop,
        bodyFactor: AGE_BODY[u.ageStage], headFactor: AGE_HEAD[u.ageStage], baseHead: u.headBase,
        tallY: u.tallY, surface: fieldSurface(G.players[0].tile), clearance: pawnClearance(pw), shoes, worldY: pw.position.y };
    },
    gameFrame() {
      this.hide(); const pw = pawns[0]; camT.x = pw.position.x; camT.z = pw.position.z;
      camera.position.set(pw.position.x, pw.position.y + 3.6, pw.position.z + 4.8); camera.lookAt(pw.position.x, pw.position.y + .9, pw.position.z);
      renderer.render(scene, camera);
    }
  };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const report = { kind: 'Browser-Regressionsfixtures; Messwerte ohne Schatten/Brett; keine FPS-Messung', base, negative, checks: [], profiles: [], errors: [] };
  function check(name, condition, data) { report.checks.push({ name, passed: !!condition, data }); }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const mobile of [false, true]) {
      const profile = mobile ? 'mobile' : 'desktop';
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
      await context.addInitScript(() => {
        localStorage.clear(); localStorage.setItem('lp_tut_seen', '1');
        localStorage.setItem('lp_opt', JSON.stringify({ motion: false, music: false, sfx: false }));
      });
      const p = await context.newPage(); p.on('pageerror', e => report.errors.push(profile + ': ' + e.message));
      await p.route('**/lebenspfad.html', async route => {
        const response = await route.fetch(); const html = await response.text(), i = html.lastIndexOf('})();');
        assert(i > 0, 'Spiel-IIFE nicht gefunden');
        await route.fulfill({ response, body: html.slice(0, i) + '(' + browserFixture.toString() + ')();\n' + html.slice(i) });
      });
      await p.goto(base + '/lebenspfad.html', { waitUntil: 'domcontentloaded' });
      await p.waitForFunction(() => window.__charQA);
      const defaults = await p.evaluate(() => __charQA.defaults());
      const pd = { profile, previews: [], figures: [], motions: [], ages: [] }; report.profiles.push(pd);
      const variants = [ ['frau', defaults[0]], ['mann', defaults[1]], ['krone', { ...defaults[0], style: 4 }], ['hut', { ...defaults[1], style: 3 }],
        ...Array.from({ length: 5 }, (_, hstyle) => ['frisur-' + hstyle, { ...defaults[0], style: 9, hstyle }]) ];
      for (const [name, cfg] of variants) {
        const v = await p.evaluate(cfg => __charQA.preview(cfg), cfg); pd.previews.push({ name, ...v });
        check(profile + ': Vorschau Rand ' + name, v.count > 0 && v.finite && v.minMargin > 1e-6 && v.zMin > -1 && v.zMax < 1, v);
        check(profile + ': Vorschau sRGB ' + name, v.encoding === v.rendererEncoding, { target: v.encoding, renderer: v.rendererEncoding });
      }
      await p.screenshot({ path: path.join(out, profile + '-editor.png') });
      await p.locator('#charRow').screenshot({ path: path.join(out, profile + '-editor-karte.png') });
      if (mobile) {
        // Tatsächliche Bedienelemente und Karten müssen im kompakten Editor horizontal erreichbar sein.
        const layout = await p.locator('#charRow').evaluate(e => ({ left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right, viewport: innerWidth }));
        check('mobile: Editor innerhalb Viewport', layout.left >= 0 && layout.right <= layout.viewport + 1, layout);
      }
      await p.locator('#botChk').uncheck(); await p.locator('#startBtn').click();
      await p.waitForFunction(() => __lp.state() && __lp.state().players.length > 0);
      for (const cfg of defaults) {
        const m = await p.evaluate(cfg => __charQA.draw(cfg), cfg); pd.figures.push(m);
        check(profile + ': Zeichenaufrufe sinken ' + cfg.g, m.calls < baseline[profile][cfg.g], { actual: m.calls, baseline: baseline[profile][cfg.g] });
        check(profile + ': richtiges Mobilprofil ' + cfg.g, m.coarse === mobile, m.coarse);
        const motion = await p.evaluate(cfg => __charQA.motion(cfg), cfg); pd.motions.push({ g: cfg.g, ...motion });
        check(profile + ': Kopfgruppe dreht ' + cfg.g, Math.abs(motion.groupAfter[1] - motion.groupBefore[1]) > 1e-6, motion);
        check(profile + ': kein Schädel-/Gesichtsdrift ' + cfg.g, motion.relativeDrift < 1e-6 && motion.movedParts.slice(1).every(Boolean), motion);
        check(profile + ': Blinzeln ' + cfg.g, motion.closed.every((v, i) => v < motion.opened[i]) && motion.opened.every(v => Math.abs(v - 1) < 1e-6), motion);
        check(profile + ': Laufen und Anhalten ' + cfg.g, motion.walking[0] * motion.walking[1] < 0 && motion.walking[2] * motion.walking[3] < 0 && motion.stopped.every((v, i) => Math.abs(v) < Math.abs(motion.walking[i]) * .01), motion);
      }
      const basicCfg = { ...defaults[0], style: 9, top: 0 }, stripeCfg = { ...basicCfg, top: 3 };
      const basic = await p.evaluate(cfg => __charQA.draw(cfg), basicCfg), stripe = await p.evaluate(cfg => __charQA.draw(cfg), stripeCfg);
      pd.stripes = { basic, stripe };
      // SETZUNG: höchstens 1% geometrische Ausdehnung für ein aufgemaltes Muster, +1 Aufruf numerische/Material-Toleranz.
      check(profile + ': Streifen ohne Aufpolsterung', stripe.size.every((v, i) => v <= basic.size[i] * 1.01 + 1e-6) && stripe.calls <= basic.calls + 1, pd.stripes);
      if (!mobile && shots) {
        for (const [name, cfg] of [['frau', defaults[0]], ['mann', defaults[1]]]) {
          for (const [view, angle] of [['frontal', 0], ['dreiviertel', Math.PI / 4], ['seitlich', Math.PI / 2]]) {
            await p.evaluate(({ cfg, angle }) => __charQA.draw(cfg, { angle }), { cfg, angle });
            await p.locator('#charQAImage').screenshot({ path: path.join(out, name + '-' + view + '.png') });
          }
        }
        for (const [name, cfg] of variants.slice(2)) {
          await p.evaluate(cfg => __charQA.draw(cfg), cfg);
          await p.locator('#charQAImage').screenshot({ path: path.join(out, name + '.png') });
        }
        await p.evaluate(cfg => __charQA.draw(cfg), stripeCfg);
        await p.locator('#charQAImage').screenshot({ path: path.join(out, 'streifen.png') });
      }
      await p.evaluate(() => __charQA.hide());
      for (const ch of [0, 1, 3, 6]) {
        await p.evaluate(ch => __lp.chapter(ch), ch);
        await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const a = await p.evaluate(() => __charQA.age()); pd.ages.push(a);
        const stage = [0, 1, 3, 6].indexOf(ch), expectedAge = originalAge[stage];
        check(profile + ': Alter ' + stage, a.stage === stage && Math.abs(a.scaleY - expectedAge.scaleY) < 1e-5 && Math.abs(a.headScale - expectedAge.headScale) < 1e-5 && Math.abs(a.headStoop - expectedAge.stoop) < 1e-5, a);
        // Gemessenen Sohlenabstand des alten Modells erhalten; keine erfundene Pixel-/Bodenschwelle.
        const allowedGap = (.12 - originalFootDepth[profile]) * a.scaleY;
        check(profile + ': Standhöhe ' + a.stage, a.shoes.every(y => y >= a.surface - 1e-5 && y - a.surface <= allowedGap + 1e-5), { ...a, allowedGap });
        if (!mobile && shots) {
          await p.evaluate(stage => __charQA.draw(__charQA.defaults()[0], { stage }), a.stage);
          await p.locator('#charQAImage').screenshot({ path: path.join(out, 'alter-' + a.stage + '.png') });
          await p.evaluate(() => __charQA.hide());
        }
      }
      const gaps = pd.ages.flatMap(a => a.shoes.map(y => (y - a.surface) / a.scaleY));
      check(profile + ': altersunabhängiger Sohlenabstand', Math.max(...gaps) - Math.min(...gaps) < 1e-5, gaps);
      await p.evaluate(() => __lp.chapter(0)); await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await p.evaluate(() => __charQA.gameFrame()); await p.screenshot({ path: path.join(out, profile + '-spielfigur.png') });
      await context.close();
    }
    check('keine Browser-JavaScript-Fehler', report.errors.length === 0, report.errors);
    const failed = report.checks.filter(c => !c.passed);
    if (negative) {
      const expected = ['Vorschau Rand', 'Vorschau sRGB', 'Kopfgruppe dreht', 'kein Schädel-/Gesichtsdrift', 'Zeichenaufrufe sinken', 'Streifen ohne Aufpolsterung'];
      report.negativeControls = expected.map(name => ({ name, detected: failed.some(c => c.name.includes(name)) }));
      assert(report.negativeControls.every(c => c.detected), 'Alte Fehler wurden nicht alle erkannt: ' + JSON.stringify(report.negativeControls));
      report.unexpectedFailures = failed.filter(c => !expected.some(name => c.name.includes(name)));
      assert.equal(report.unexpectedFailures.length, 0, 'Unerwartete Baselinefehler: ' + report.unexpectedFailures.map(c => c.name).join(', '));
      report.status = 'baseline-negative-confirmed';
    } else { assert.equal(failed.length, 0, failed.map(c => c.name).join('\n')); report.status = 'passed'; }
  } catch (e) { report.status = 'failed'; report.failure = e.stack; process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(out, 'ergebnis.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, passed: report.checks.filter(c => c.passed).length, failed: report.checks.filter(c => !c.passed).map(c => c.name), failure: report.failure }, null, 2));
    await browser.close();
  }
})();
