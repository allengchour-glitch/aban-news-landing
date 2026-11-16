'use strict';
/* NICHT vor GPU-Übergabe starten. Der Guard kommt vor Playwright, HTTP und mkdir. */
if (process.env.DUNGEON_GPU_GRANTED !== '1') {
  console.error('Kein Browser gestartet. DUNGEON_GPU_GRANTED=1 erst nach ausdrücklicher GPU-Übergabe durch den Parent setzen.');
  process.exit(2);
}
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DUNGEON_QA_BASE || 'http://127.0.0.1:8182';
const out = process.env.DUNGEON_QA_OUT || '/tmp/aban-dungeon-browser';
const cases = new Set((process.env.DUNGEON_QA_CASES || 'vanilla,desktop,mobile,loss,native').split(','));
function selected(name, level) { return cases.has(name) || cases.has(name + '-' + level); }
const report = { checks: [], errors: [], screenshots: [], mechanicsTraces:[],browserClosed: false, visualInspection: 'pending',
  limitations: [
    'Erster Render und Start laden unverändertes HTML unter echten Server-Headern.',
    'Danach ergänzt ein HTTP-Response-Hook lokale Sonden; CSP und übrige Header bleiben erhalten.',
    'Kontrollierte Phasensprünge und Positionierung überspringen Parcours/Laufzeiten. Keine direkte HP-, Herz-, Sieg- oder Ergebnis-Zuweisung; kein Austausch von rAF, Performance-Uhr, Treffer- oder Gefahrenlogik.',
    'Nur die Netzwerk-Fixture unterdrückt laufende renderer.render-Aufrufe beider Tabs. Ihre Screenshots rufen den gespeicherten Originalrenderer ausdrücklich auf. Solo-/Mobile-Prüfungen rendern durchgehend unverändert; Netzwerk-Prüfung belegt keine Leistung bei zwei durchgehend zeichnenden Seiten.',
    'Native lokale WebRTC-Kanäle verwenden BroadcastChannel-Signaling im selben Browserkontext. Das prüft weder PeerJS-Cloud noch Mobilfunk/NAT/TURN oder zwei physische Geräte.',
    'Die Stationshülle erfasst echte iframe-postMessage-Ereignisse, prüft aber nicht die Wildnis-Belohnung selbst.',
    'Screenshots müssen nach dem Lauf tatsächlich geöffnet und visuell geprüft werden; automatisierte Layoutmessung ersetzt diese Sichtung nicht.'
  ] };
const hook = `
window.__dungeonQA={
  read:function(){return {running:running,dead:dead,won:won,paused:paused,inv:invT,hp:bossHp,hearts:hearts,time:trial.time,round:trialRound,slot:trialSlot(),phase:trialSample(),run:trial.run,hits:trial.hits.slice(),safe:TR.safe(trialSample(),px,py,pz-CHZ),x:px,y:py,z:pz-CHZ,remote:{x:remote.tx,z:remote.tz-CHZ},ticks:window.__dungeonQATicks||0};},
  seek:function(phase,cycle,offset){if(!trialAuthority())throw Error('Nur Host setzt Fixture-Zeit');var d=TR.definitions[_dlv];TR.enter(trial);trial.time=2+cycle*(d.warn+d.attack+d.open+d.rest)+(phase==='attack'?d.warn:phase==='open'?d.warn+d.attack:0)+offset;invT=0;trialGrace=0;publishTrial(false);},
  place:function(x,z){px=x;pz=CHZ+z;py=0;vy=0;gy=0;onG=true;jumps=0;coyote=0;jBuf=0;snapCam();},
  fist:function(){var p=TR.target(trialSample());this.place(p.x,p.z);},
  net:function(){return dnet?{role:dnet.role,status:dnet.status,code:dnet.code,diag:dnet._diag?dnet._diag():null}:null;},
  send:sendTrial,
  close:function(){if(dnet)dnet.close();},
  networkDraw:function(enabled){if(!this.originalRender)this.originalRender=renderer.render;renderer.render=enabled?this.originalRender:function(){};this.renderSuppressed=!enabled;},
  drawSnapshot:function(){(this.originalRender||renderer.render).call(renderer,scene,camera);},
  traceBegin:function(){window.__dungeonTrace=[];window.__dungeonTraceOn=true;},
  traceEnd:function(){window.__dungeonTraceOn=false;return window.__dungeonTrace||[];},
  render:function(){var gl=renderer.getContext();var ext=gl.getExtension('WEBGL_debug_renderer_info');return {webgl:!!gl,lost:gl.isContextLost(),width:renderer.domElement.width,height:renderer.domElement.height,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}
};
window.__dungeonQATicks=0;var originalTrialTick=TR.tick;TR.tick=function(s,dt){window.__dungeonQATicks++;return originalTrialTick(s,dt);};
var originalTrialBoss=updateTrialBoss;updateTrialBoss=function(dt){var s=trialSample(),trace=window.__dungeonTraceOn?{phase:s.phase,time:trial.time,y:py,x:px,z:pz-CHZ,ringDistance:Math.hypot(px,pz-CHZ+4),radii:s.radii.slice(),safe:TR.safe(s,px,py,pz-CHZ),inv:invT,heartsBefore:hearts}:null;originalTrialBoss(dt);if(trace){trace.heartsAfter=hearts;window.__dungeonTrace.push(trace);}};
`;
function checked(name, data) { report.checks.push({ name, data }); console.log('PASS · ' + name); }
async function bounded(ms, label, fn) { let timer; try { return await Promise.race([fn(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label + ': Zeitlimit ' + ms + ' ms')), ms); })]); } finally { clearTimeout(timer); } }
async function shot(g, name, inspect) {
  const file = path.join(out, name + '.png');
  const snapshot = await g.frame.evaluate(() => { const manual = !!window.__dungeonQA?.renderSuppressed;if(manual)__dungeonQA.drawSnapshot();return {state:window.__nd?.state(),renderMode:manual?'Originalrenderer explizit für Netzwerk-Snapshot':'Kontinuierliches Originalrendering'}; });
  await g.page.screenshot({ path: file, timeout: 12000 }); report.screenshots.push({ file, inspect, inspected: false, ...snapshot });
}
async function read(g) { return g.frame.evaluate(() => __dungeonQA.read()); }
async function seek(g, phase, cycle = 0, offset = 0.1) { await g.frame.evaluate(a => __dungeonQA.seek(...a), [phase, cycle, offset]); }
async function place(g, x, z) { await g.frame.evaluate(p => __dungeonQA.place(...p), [x, z]); }
async function wait(g, fn, arg, timeout = 15000) { return g.frame.waitForFunction(fn, arg, { timeout, polling: 'raf' }); }
async function key(g, name) { await g.frame.locator('canvas').first().click({ position: { x: 40, y: 240 } }); await g.page.keyboard.press(name); }
async function start(g, touch = false) { await g.frame.locator('#startBtn')[touch ? 'tap' : 'click'](); }
async function enter(g) { await g.frame.evaluate(() => __nd.boss()); await wait(g, () => __nd.state().bossOn); }
async function installFixture(context) {
  await context.route('**/neon-dungeon.html*', async route => {
    const response = await route.fetch({ timeout: 15000 }), body = await response.text();
    const query=new URL(route.request().url()).searchParams;
    if(query.get('qaHost')==='1'||query.get('qa-host')==='1'){
      await route.fulfill({response,body:fs.readFileSync(path.join(__dirname,'qa-host.html'),'utf8')});return;
    }
    const bootstrap = /<script src="\/js\/dungeon-trials\/view\.js(?:\?v=[a-f0-9]{12})?"><\/script>\s*<script>/.exec(body);
    assert.ok(bootstrap, 'Dungeon-Bootstrap mit optionalem Inhalts-Hash gefunden');
    const marker = '\n})();\n</script>', at = body.indexOf(marker, bootstrap.index + bootstrap[0].length);
    assert.ok(at >= 0, 'Dungeon-IIFE gefunden');
    await route.fulfill({ response, body: body.slice(0, at) + '\n' + hook + body.slice(at) });
  });
}
async function open(context, level, station = false, local = false) {
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push({ url: page.url(), error: e.message }));
  page.on('console', m => { if (m.type() === 'error') report.errors.push({ url: page.url(), error: m.text() }); });
  const url = station ? '/neon-dungeon.html?qaHost=1&lvl=' + level + (local ? '&mp=local' : '') : '/neon-dungeon.html?station=1&lvl=' + level + (local ? '&mp=local' : '');
  const response = await page.goto(base + url, { waitUntil: 'load', timeout: 30000 }); assert.equal(response.status(), 200);
  let frame = page.mainFrame();
  if (station) { await page.locator('iframe').waitFor(); frame = await (await page.locator('iframe').elementHandle()).contentFrame(); }
  assert.ok(frame); await frame.waitForFunction(() => !!window.__nd, null, { timeout: 25000 });
  return { page, frame };
}
async function layout(g, touch) {
  const result = await g.frame.evaluate(touch => {
    const ids = ['trialHud', 'bossBar', 'stageTag', 'topBar', 'pauseBtn', ...(touch ? ['bJump', 'bHit', 'bWpn', 'stick'] : [])], boxes = {};
    for (const id of ids) { const e = document.getElementById(id), r = e.getBoundingClientRect(); boxes[id] = { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height, visible: getComputedStyle(e).display !== 'none' }; }
    const inside = Object.values(boxes).every(r => !r.visible || r.x >= -1 && r.y >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1);
    const hit = boxes.trialHud, boss = boxes.bossBar;
    const separated = !hit.visible || !boss.visible || hit.y >= boss.bottom;
    const reachable = !touch || ['bJump', 'bHit', 'bWpn'].every(id => { const e = document.getElementById(id), r = e.getBoundingClientRect(), at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return r.width >= 44 && r.height >= 44 && !!at && (e === at || e.contains(at)); });
    return { width: innerWidth, height: innerHeight, boxes, inside, separated, reachable };
  }, touch);
  assert.ok(result.inside && result.separated && result.reachable, JSON.stringify(result)); return result;
}
async function touchHold(g, selector, until) {
  const box = await g.frame.locator(selector).boundingBox(); assert.ok(box);
  const cdp = await g.page.context().newCDPSession(g.page);
  try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }] }); await until(); }
  finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {}); await cdp.detach(); }
}
async function stick(g, dx, dy, until) {
  const cdp = await g.page.context().newCDPSession(g.page), box = await g.frame.locator('#stick').boundingBox(); assert.ok(box);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy, id: 1 }] }); await until(); }
  finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {}); await cdp.detach(); }
}
async function defend(g, level, touch = false) {
  const before = (await read(g)).hearts;
  if (level === 0) {
    await seek(g, 'warn'); await place(g, 6, -4);
    await g.frame.evaluate(()=>__dungeonQA.traceBegin());
    const until = async () => {
      await wait(g, () => __dungeonQA.read().y > 0.85);
      await seek(g, 'attack', 0, 0.9);
      const end = (await read(g)).time + 0.25;
      await wait(g, end => __dungeonQA.read().time >= end, end, 12000);
    };
    try{if (touch) await touchHold(g, '#bJump', until);
    else { await g.page.keyboard.down('Space'); try { await until(); } finally { await g.page.keyboard.up('Space'); } }}
    finally{report.mechanicsTraces.push({kind:touch?'stone-touch':'stone-keyboard',frames:await g.frame.evaluate(()=>__dungeonQA.traceEnd())});}
    assert.equal((await read(g)).hearts, before); checked('Stein: echte ' + (touch ? 'Touch-' : 'Tastatur-') + 'Sprungaktion schützt an der gerenderten Ringfront');
  } else if (level === 1) {
    await seek(g, 'warn'); await place(g, 0, 5.9);
    if (touch) await stick(g, 0, 44, () => wait(g, () => __dungeonQA.read().z > 8));
    else { await g.page.keyboard.down('s'); try { await wait(g, () => __dungeonQA.read().z > 8); } finally { await g.page.keyboard.up('s'); } }
    await wait(g, () => __dungeonQA.read().phase.phase === 'attack', null, 20000);
    assert.equal((await read(g)).safe, true); assert.equal((await read(g)).hearts, before); checked('Eis: tatsächliches ' + (touch ? 'Joystick-' : 'WASD-') + 'Laufen erreicht markierte Frostdeckung');
  } else {
    await seek(g, 'attack', 0, 4); await place(g, 0, 9);
    if (touch) await stick(g, -44, 0, () => wait(g, () => __dungeonQA.read().x < -6));
    else { await g.page.keyboard.down('a'); try { await wait(g, () => __dungeonQA.read().x < -6); } finally { await g.page.keyboard.up('a'); } }
    assert.equal((await read(g)).safe, true); assert.equal((await read(g)).hearts, before);
    checked('Lava: echte Seitwärtsbewegung folgt dem gerenderten sicheren Sektor');
  }
  await shot(g, (touch ? 'touch' : 'desktop') + '-mechanik-' + level, level === 0 ? 'Ringfront klar, Sprung sichtbar; Faust-Parcours-Identität bleibt erkennbar' : level === 1 ? 'FROST-Pfeil und SICHER-Deckung zeigen dieselbe Richtung; Rune verdeckt Figur nicht' : 'Heller Keil entspricht sicherem Boden; Mitte und übriger Boden unterscheidbar');
}
async function win(g, level, touch = false) {
  if (touch) { for (let i = 0; i < 2; i++) await g.frame.locator('#bWpn').tap(); } else await key(g, '3');
  for (let cycle = 0; cycle < 3; cycle++) {
    await seek(g, 'open', cycle); await g.frame.evaluate(() => __dungeonQA.fist());
    if (cycle === 0) await shot(g, (touch ? 'touch' : 'desktop') + '-offene-faust-' + level, 'Violette Faust auf erreichbarer Höhe; Aktionshinweis, Countdown und Reichweitenring lesbar');
    const before = (await read(g)).hp;
    if (touch) await g.frame.locator('#bHit').tap(); else await key(g, 'e');
    await wait(g, hp => __dungeonQA.read().hp === Math.max(0, hp - 2), before);
  }
  await wait(g, () => __dungeonQA.read().won); await g.frame.locator('#ov').waitFor({ state: 'visible', timeout: 6000 });
  await shot(g, (touch ? 'touch' : 'desktop') + '-sieg-' + level, 'Ergebnis nennt richtige Prüfung, Solo/Koop, Rekord und Retry');
  checked('Prüfung ' + level + ': voller kontrollierter Sieg mit drei echten UI-Hammertreffern');
}
async function posts(g) { return g.page.evaluate(() => __dungeonPosts); }
async function loss(g) {
  for (let cycle = 0; cycle < 4; cycle++) {
    const hearts = (await read(g)).hearts; await seek(g, 'attack', cycle); await place(g, 0, 0);
    await wait(g, h => __dungeonQA.read().hearts === h - 1, hearts);
  }
  await g.frame.locator('#ov').waitFor({ state: 'visible', timeout: 6000 });
  const messages = await posts(g); assert.equal(messages.filter(m => m?.t === 'stationDone' && m.win === 0).length, 1);
  await shot(g, 'station-niederlage', 'Niederlage und Retry sichtbar, kein Sieg-Rekord');
  await g.frame.locator('#startBtn').click();
  await g.page.waitForFunction(() => __dungeonPosts.some(m => m?.t === 'stationRematch'));
  await g.page.waitForTimeout(600); await g.frame.waitForFunction(() => window.__nd?.state().level === 2 && !__nd.state().won);
  await g.frame.locator('#stationBack').click(); await g.page.waitForFunction(() => __dungeonPosts.includes('mini-back'));
  checked('Echte iframe-Niederlage win:0, Retry mit stationRematch und mini-back', await posts(g));
}
async function nativePeers(browser) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  try {
    await installFixture(context);
    await context.addInitScript(() => { window.__dungeonNative = []; const Native = RTCPeerConnection; window.RTCPeerConnection = new Proxy(Native, { construct(Target, args) { const pc = Reflect.construct(Target, args); __dungeonNative.push(pc); return pc; } }); });
    const host = await open(context, 2, true, true); await host.frame.evaluate(() => __dungeonQA.networkDraw(false));
    const guest = await open(context, 0, true, true); await guest.frame.evaluate(() => __dungeonQA.networkDraw(false));
    report.networkFixture={continuousRendering:false,snapshots:'Originalrenderer ausdrücklich aufgerufen',originalGame:true,originalUI:true,originalRAF:true,nativeTransport:true};
    await host.frame.locator('details').evaluate(e => { e.open = true; }); await host.frame.locator('#dHostBtn').click();
    const code = await host.frame.evaluate(() => __dungeonQA.net().code);
    await guest.frame.locator('details').evaluate(e => { e.open = true; }); await guest.frame.locator('#dCode').fill(code); await guest.frame.locator('#dJoinBtn').click();
    for (const g of [host, guest]) await wait(g, () => __nd.state().online && __dungeonQA.net()?.diag?.main === 'open', null, 20000);
    const rtc = await guest.frame.evaluate(async () => ({ net: __dungeonQA.net(), native: __dungeonNative.length, stats: [...(await __dungeonNative[0].getStats()).values()].filter(e => e.type === 'data-channel').map(e => ({ label: e.label, state: e.state, sent: e.messagesSent, received: e.messagesReceived })) }));
    assert.equal(rtc.net.diag.conn, 'connected'); assert.equal(rtc.net.diag.fast, 'open'); assert.ok(rtc.native > 0); checked('Native lokale RTCPeerConnection und offene main/fast-Kanäle', rtc);
    assert.equal(await guest.frame.evaluate(() => __nd.state().level), 2);
    for (const g of [host, guest]) { await enter(g); await key(g, '3'); }
    await seek(host, 'warn', 1); await host.page.waitForTimeout(350);
    const hs = await read(host), gs = await read(guest); assert.ok(Math.abs(hs.time - gs.time) < 0.5); assert.equal(hs.phase.cycle, gs.phase.cycle); assert.equal(hs.phase.phase, gs.phase.phase); assert.ok(hs.ticks > 0); assert.equal(gs.ticks, 0);
    checked('Native Peers teilen Host-Phase und Prüfungszeit; Gast simuliert keine eigene Uhr', { host: hs, guest: gs });
    await shot(guest, 'native-koop-phase', 'Einzeln gerenderter Gast-Snapshot zeigt die gemeinsame Lava-Phase; Netzwerk-Fixture zeichnet sonst nicht kontinuierlich');
    await guest.frame.evaluate(() => { __dungeonQA.send({ t: 'bhit', d: 99 }); __dungeonQA.send({ t: 'bwin' }); });
    await host.page.waitForTimeout(200); assert.equal((await read(host)).won, false); assert.equal((await read(host)).hp, 6);
    for (let cycle = 1; cycle <= 3; cycle++) {
      await seek(host, 'open', cycle); await wait(guest, c => __dungeonQA.read().phase.phase === 'open' && __dungeonQA.read().phase.cycle === c, cycle);
      await guest.frame.evaluate(() => __dungeonQA.fist()); const position = await read(guest);
      await wait(host, p => { const r = __dungeonQA.read().remote; return Math.hypot(r.x - p.x, r.z - p.z) < 0.5; }, { x: position.x, z: position.z });
      const hp = (await read(host)).hp; await key(guest, 'e');
      await wait(host, hp => __dungeonQA.read().hp === Math.max(0, hp - 2), hp); await wait(guest, hp => __dungeonQA.read().hp === Math.max(0, hp - 2), hp);
      await key(guest, 'e'); assert.equal((await read(host)).hp, Math.max(0, hp - 2));
    }
    for (const g of [host, guest]) { await g.frame.locator('#ov').waitFor({ state: 'visible', timeout: 6000 }); assert.equal((await posts(g)).filter(m => m?.t === 'stationDone' && m.win === 1).length, 1); }
    await shot(guest, 'native-koop-sieg', 'Gast zeigt denselben Lava-Sieg, Koop-Rekord und gemeinsames Rückspiel');
    const run = (await read(host)).run; await host.frame.locator('#startBtn').click(); await host.page.waitForTimeout(200); assert.equal((await read(host)).run, run);
    await guest.frame.locator('#startBtn').click();
    for (const g of [host, guest]) { await wait(g, () => __dungeonQA.read().round === 1 && __dungeonQA.read().running && __dungeonQA.read().hp === 6); assert.equal((await posts(g)).filter(m => m?.t === 'stationRematch').length, 1); }
    assert.equal((await read(host)).run, (await read(guest)).run); checked('Native Gasttreffer, identischer Sieg, Stationsereignisse und Rückspiel nach zwei Zustimmungen');
    await host.frame.evaluate(() => __dungeonQA.close()); await wait(guest, () => !__nd.state().online, null, 10000); checked('Echter Kanalabschluss lässt Gast dieselbe Prüfung solo fortsetzen');
  } finally { await bounded(8000, 'WebRTC-Kontext schliessen', () => context.close()); }
}
(async () => {
  fs.mkdirSync(out, { recursive: true }); let browser;
  try {
    await bounded(240000, 'Gesamte Dungeon-GPU-Abnahme', async () => {
      const response = await fetch(base + '/neon-dungeon.html?station=1', { signal: AbortSignal.timeout(5000) }); assert.equal(response.status, 200);
      const csp = response.headers.get('content-security-policy'); assert.ok(csp && csp.includes("frame-ancestors 'self'"), 'Echte Dungeon-CSP vom Headers-Server erforderlich'); checked('Headers-Server 8182 liefert Dungeon-CSP', { csp, frame: response.headers.get('x-frame-options') });
      const installedChromium = '/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome';
      const executablePath = process.env.PW_CHROME || (fs.existsSync(installedChromium) ? installedChromium : chromium.executablePath());
      assert.ok(!executablePath.startsWith('/usr/bin/'), 'Playwright-installiertes Chromium erforderlich; kein System-Wrapper');
      assert.ok(fs.existsSync(executablePath), 'Playwright-Browser fehlt: ' + executablePath);
      report.browserExecutable = executablePath;
      browser = await chromium.launch({ executablePath, timeout: 25000, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
      // Zuerst unveränderte Datei und laufendes Rendering, ohne Zeit- oder Test-Hook.
      if(selected('vanilla')){const vanilla = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      try { const g = await open(vanilla, 0); await shot(g, 'unveraendertes-menue', 'Ebenenwahl, Regeln und Start passen ins Desktop-Menü'); await start(g); await enter(g);
        const render = await g.frame.evaluate(() => { const c = document.querySelector('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'); return { width: c.width, height: c.height, webgl: !!gl, lost: gl?.isContextLost() }; }); assert.ok(render.webgl && !render.lost); await shot(g, 'unveraenderter-dungeon', 'Echter Fackel-Dungeon und erwachender Koloss sichtbar, kein leerer Canvas'); checked('Unveränderte Seite startet und rendert WebGL', render);
      } finally { await vanilla.close(); }}
      for (let level = 0; level < 3; level++) {
        if(!selected('desktop',level))continue;
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        try { context.setDefaultTimeout(12000); await installFixture(context); const g = await open(context, level, true); await start(g); await enter(g);
          await seek(g, 'warn'); await shot(g, 'warnung-' + level, 'Angekündigte sichere Aktion vor Schaden lesbar; keine HUD-Überdeckung'); await defend(g, level);
          checked('Desktop-Layout Prüfung ' + level, await layout(g, false)); const render = await g.frame.evaluate(() => __dungeonQA.render()); assert.ok(render.calls > 0 && render.triangles > 0); await win(g, level);
          assert.equal((await posts(g)).filter(m => m?.t === 'stationDone' && m.win === 1).length, 1);
        } finally { await context.close(); }
      }
      for (let level = 0; level < 3; level++) {
        if(!selected('mobile',level))continue;
        const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
        try { mobile.setDefaultTimeout(12000); await installFixture(mobile); const g = await open(mobile, level, true); await start(g, true); await enter(g); await defend(g, level, true);
          checked('Echtes Touch-Hochformat ' + level, await layout(g, true)); await shot(g, 'touch-hochformat-' + level, 'Mechanik, HUD, Joystick und drei Aktionsknöpfe auf 390×844 prüfen');
          await g.page.setViewportSize({ width: 844, height: 390 }); checked('Echtes Touch-Querformat ' + level, await layout(g, true)); await shot(g, 'touch-querformat-' + level, 'Bei 844×390 bleiben sichere Bodenfläche und Touchaktionen erkennbar');
          await win(g, level, true);
        } finally { await mobile.close(); }
      }
      if(selected('loss')){const failed = await browser.newContext({ viewport: { width: 1100, height: 760 } });
      try { await installFixture(failed); const g = await open(failed, 2, true); await start(g); await enter(g); await loss(g); } finally { await failed.close(); }}
      if(selected('native'))await nativePeers(browser);
      assert.equal(report.errors.length, 0, JSON.stringify(report.errors)); checked('Keine Seiten- oder Konsolenfehler');
    });
  } catch (e) { report.failure = e.stack; console.error(e.stack); process.exitCode = 1; }
  finally {
    if (browser) try { await bounded(8000, 'Browser schliessen', () => browser.close()); report.browserClosed = true; } catch (e) { report.cleanupFailure = e.message; process.exitCode = 1; }
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(out, 'sichtpruefung.md'), '# Sichtprüfung nach GPU-Lauf\n\n' + report.screenshots.map(s => '- [ ] ' + s.file + '\n  ' + s.inspect).join('\n') + '\n\nBilder öffnen, Fehler konkret benennen und nach Korrekturen erneut prüfen. visualInspection in result.json bleibt bis zur tatsächlichen Sichtung pending.\n');
    console.log('Browser geschlossen: ' + report.browserClosed + ' · ' + path.join(out, 'result.json') + ' · Sichtprüfung ausstehend');
  }
})();
