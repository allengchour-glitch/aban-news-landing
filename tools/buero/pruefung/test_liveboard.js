// Prüfung der Liveboards und der grösseren Räume (Design campus-einheitlich-16) gegen den Nachbau der Dashboard-Werte.
// Aufruf: node test_liveboard.js <Ordner>   (Ordner mit seite.html, buero.json, kb3d-*.js und harness.html; Chromium mit Software-WebGL genügt)
// Alle erwarteten Zahlen werden aus den Daten der Seite gerechnet (window.__ROWS und die Einträge der Szene), nichts steht fest im Test.
const { chromium } = require('playwright');
const dir = process.argv[2];
let fehler = 0;
function ok(name, bedingung, info) {
  if (!bedingung) fehler += 1;
  console.log((bedingung ? 'ok     ' : 'FEHLER ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : ''));
}
const FOLGE = ['Chefbüro', 'Krypto', 'Shop', 'Versand', 'Social Media', 'Entwicklerbüro', 'YouTube-Studio'];

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  // reducedMotion: die Seite zeichnet dann nur bei Änderungen (die Software-Grafik wäre sonst dauernd belegt und Klicks kämen nicht durch)
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__kbAnzeigeTimer = [];
    const set = window.setInterval;
    window.setInterval = function (fn, ms) { if (ms === 30000) window.__kbAnzeigeTimer.push(fn); return set.apply(this, arguments); };
  });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto('file://' + dir + '/harness.html');
  await p.evaluate(() => window.__runAll && window.__runAll());
  await p.locator('#kb-tab-3d').click();
  await p.evaluate(() => window.__runAll());
  await p.waitForTimeout(2500);

  const L = () => p.evaluate(() => !!(window.KB3D && window.KB3D.Buero && window.KB3D.Buero.last && window.KB3D.Buero.last.ok));
  ok('3D-Szene steht', await L());

  // ---------- 1) Aufbau: Version, Räume, Abstände ----------
  const w = await p.evaluate(() => {
    const K = window.KB3D, last = K.Buero.last;
    return { ver: K.DESIGN_VERSION, attr: document.querySelector('.kb').getAttribute('data-design'), rooms: K.ROOMS, size: K.ROOM_SIZE, live: Object.keys(last.debug.live()), seats: last.debug.seats.map((s) => ({ room: s.spec.room, i: s.spec.i, x: s.x, z: s.z, used: !!s.used, boss: !!s.spec.boss })) };
  });
  ok('Designversion von Seite und Code gleich und 16', w.ver === w.attr && w.ver === 'campus-einheitlich-16', [w.ver, w.attr]);
  ok('sieben Räume bekannt', Object.keys(w.rooms).length === 7 && FOLGE.every((n) => w.rooms[n]), Object.keys(w.rooms));
  ok('Räume sind gross (mindestens 80 m², mindestens 10 × 8 m)', w.size[0] >= 10 && w.size[1] >= 8 && w.size[0] * w.size[1] >= 80, w.size);
  // Abstand zwischen zwei Räumen (Gasse): in x oder in z mindestens 2,5 m Luft
  let luft = true, kleinsterAbstand = 99;
  const namen = Object.keys(w.rooms);
  for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) {
    const a = w.rooms[namen[i]], c = w.rooms[namen[j]];
    const gx = Math.max(a.x0, c.x0) - Math.min(a.x0, c.x0) - w.size[0], gz = Math.max(a.z0, c.z0) - Math.min(a.z0, c.z0) - w.size[1];
    const g = Math.max(gx, gz);
    kleinsterAbstand = Math.min(kleinsterAbstand, g);
    if (g < 2.5) luft = false;
  }
  ok('zwischen allen Räumen liegt eine Gasse von mindestens 2,5 m', luft, +kleinsterAbstand.toFixed(2));
  // Plätze liegen im Raum und stehen nicht eng beieinander
  let imRaum = true, eng = 99;
  w.seats.forEach((s) => { const r = w.rooms[s.room]; if (!(s.x > r.x0 + 0.8 && s.x < r.x0 + w.size[0] - 0.8 && s.z > r.z0 + 1.6 && s.z < r.z0 + w.size[1] - 0.6)) imRaum = false; });
  ok('alle Plätze liegen im eigenen Raum, nicht an der Wand', imRaum);
  for (const n of namen) {
    const sn = w.seats.filter((s) => s.room === n);
    for (let i = 0; i < sn.length; i++) for (let j = i + 1; j < sn.length; j++) eng = Math.min(eng, Math.hypot(sn[i].x - sn[j].x, sn[i].z - sn[j].z));
  }
  ok('Schreibtische stehen mindestens 2,1 m auseinander (vorher 1,7 m im Shop)', eng >= 2.1, +eng.toFixed(2));
  ok('ein Liveboard je Raum', w.live.length === 7 && FOLGE.every((n) => w.live.indexOf(n) >= 0), w.live);

  // ---------- 2) Liveboards: Lage an der Nordwand, nicht im Nachbarraum ----------
  const boards = await p.evaluate(() => { const live = window.KB3D.Buero.last.debug.live(); const o = {}; Object.keys(live).forEach((n) => { const b = live[n]; o[n] = { c: b.c, w: b.w, h: b.h, mn: b.mn, mx: b.mx }; }); return o; });
  let lageOk = true, groesseOk = true;
  FOLGE.forEach((n) => {
    const r = w.rooms[n], bd = boards[n];
    if (!(bd.c[2] > r.z0 && bd.c[2] < r.z0 + 0.6)) lageOk = false;                      // an der Nordwand
    if (!(bd.c[0] - bd.w / 2 > r.x0 + 0.3 && bd.c[0] + bd.w / 2 < r.x0 + w.size[0] - 0.1)) lageOk = false; // innerhalb der Wand
    if (!(bd.w >= 4.5 && bd.h >= 2.2 && Math.abs(bd.w / bd.h - 2) < 0.05)) groesseOk = false;
    if (!(bd.c[1] - bd.h / 2 > 0.4 && bd.c[1] + bd.h / 2 < 3.7)) groesseOk = false;     // zwischen Boden und Wandkante
  });
  ok('alle Liveboards hängen an der Nordwand ihres Raums', lageOk, boards);
  ok('Liveboards sind gross (mindestens 4,5 × 2,2 m, 2:1) und passen unter die Wandkante', groesseOk);

  // ---------- 3) Zeilen: jede Zeile erscheint genau im Liveboard ihres Raums ----------
  const m = await p.evaluate(() => {
    const last = window.KB3D.Buero.last, mo = last.liveModelle(), ents = last.ents;
    return { mo, ents: ents.map((e) => ({ id: e.id, bereich: e.bereich, state: e.state, figur: e.figur, menge: e.menge, kurz: e.kurz, ereignis: e.ereignis, frisch: e.frisch })), zeilen: window.__ROWS.filter((r) => r.id !== 'social_linkedin').length };
  });
  ok('die Szene kennt alle Zeilen der Seite', m.ents.length === m.zeilen, [m.ents.length, m.zeilen]);
  let zeilenOk = true, zaehlerOk = true, textOk = true, summeOk = true;
  const gesamt = { gruen: 0, gelb: 0, rot: 0, du: 0, alt: 0 };
  FOLGE.forEach((n) => {
    const liste = m.ents.filter((e) => e.bereich === n), mo = m.mo[n];
    if (mo.zeilen.length !== liste.length) zeilenOk = false;
    ['gruen', 'gelb', 'rot', 'du', 'alt'].forEach((st) => { const k = liste.filter((e) => e.state === st).length; gesamt[st] += k; if (mo.zaehler[st] !== k) zaehlerOk = false; });
    liste.forEach((e, i) => { const z = mo.zeilen[i]; if (!z || z.name !== (e.kurz || e.id) || z.state !== e.state || z.text !== (e.ereignis || '')) textOk = false; });
  });
  ok('jedes Liveboard zeigt genau die Zeilen seines Raums', zeilenOk);
  ok('die fünf Zähler stimmen mit den Zuständen der Zeilen', zaehlerOk);
  ok('Name, Lampe und Ereignistext je Zeile stammen aus der Zeile', textOk);
  const ue = m.mo.__uebersicht;
  ['gruen', 'gelb', 'rot', 'du', 'alt'].forEach((st) => { if (ue.summe[st] !== gesamt[st]) summeOk = false; });
  ok('Zentralmonitor: Summe aller Zustände stimmt', summeOk && ue.n === m.ents.length && ue.raeume.length === 7, { n: ue.n, summe: ue.summe });
  const kvers = m.mo['Versand'].kpi, kchef = m.mo['Chefbüro'].kpi;
  const offene = m.ents.find((e) => e.figur === 'paket'), tafel = m.ents.find((e) => e.figur === 'tafel');
  ok('Sonderzahlen: Pakete im Versand, Bestellungen im Chefbüro (wenn die Zeilen da sind)', (!offene || (kvers && String(kvers.wert) === String(offene.menge))) && (!tafel || (kchef && String(kchef.wert) === String(tafel.menge))), [kvers, kchef]);
  const zeit = await p.evaluate(() => new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()));
  ok('die Uhr zeigt die Schweizer Zeit', FOLGE.every((n) => /^\d\d:\d\d$/.test(m.mo[n].zeit)) && (m.mo['Shop'].zeit === zeit || Math.abs(Date.parse('1970-01-01T' + m.mo['Shop'].zeit + ':00Z') - Date.parse('1970-01-01T' + zeit + ':00Z')) <= 60000), [m.mo['Shop'].zeit, zeit]);
  // Plätze: niemand fällt aus dem Raum (Shop hatte sieben Zeilen für sechs Plätze)
  const plaetze = await p.evaluate(() => { const s = window.KB3D.Buero.last.debug.seats, o = {}; s.forEach((x) => { if (!x.spec.boss) { o[x.spec.room] = o[x.spec.room] || { frei: 0, belegt: 0 }; o[x.spec.room][x.used ? 'belegt' : 'frei']++; } }); return o; });
  let platzOk = true;
  FOLGE.forEach((n) => { const sollen = m.ents.filter((e) => e.bereich === n && e.figur === 'arbeiter').length; const pl = plaetze[n] || { belegt: 0, frei: 0 }; if (pl.belegt !== sollen) platzOk = false; });
  ok('jede Arbeiter-Zeile hat einen Platz in ihrem Raum', platzOk, plaetze);

  // ---------- 4) Was auf das Bild gezeichnet wird ----------
  const gezeichnet = await p.evaluate((n) => {
    const rec = [], orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t) { rec.push(String(t)); return orig.apply(this, arguments); };
    try { window.KB3D.tex.liveboard(window.KB3D.Buero.last.liveModelle()[n]); } finally { CanvasRenderingContext2D.prototype.fillText = orig; }
    return rec;
  }, 'Shop');
  const shop = m.mo['Shop'];
  const gezeigt = (t) => gezeichnet.indexOf(t) >= 0 || gezeichnet.some((g) => g.endsWith('…') && t.startsWith(g.slice(0, -1)));
  ok('das Shop-Bild nennt Titel, Uhr und den Messstand der Daten', gezeichnet.indexOf('Shop') >= 0 && gezeichnet.indexOf(shop.zeit) >= 0 && !!shop.stand && gezeichnet.some((t) => t.indexOf('Messstand ' + shop.stand) === 0), [shop.stand, gezeichnet.slice(0, 6)]);
  ok('das Shop-Bild nennt jede Zeile mit Namen und Ereignis', shop.zeilen.every((z) => gezeigt(z.name) && (!z.text || gezeigt(z.text))));
  ok('das Shop-Bild nennt die fünf Zähler', ['gruen', 'gelb', 'rot', 'du', 'alt'].every((st) => gezeichnet.indexOf(String(shop.zaehler[st])) >= 0));
  const leer = await p.evaluate(() => { const rec = [], orig = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { rec.push(String(t)); return orig.apply(this, arguments); }; try { window.KB3D.tex.liveboard(null); window.KB3D.tex.liveboardUebersicht(null); } finally { CanvasRenderingContext2D.prototype.fillText = orig; } return rec; });
  ok('ohne Daten steht «Wartet auf …» statt leerer Fläche', leer.some((t) => /Wartet/.test(t)), leer.slice(0, 4));

  // ---------- 4b) Geometrie der Bilder: nichts überlappt, nichts liegt im Randstreifen, den Nachbarwände verdecken ----------
  const geo = await p.evaluate(() => {
    const L = window.KB3D.Buero.last, T = window.KB3D.tex, mo = L.liveModelle();
    function zeichne(fn) {
      const rec = [], orig = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t, x, y) {
        const w = this.measureText(String(t)).width, a = this.textAlign;
        const l = a === 'right' ? x - w : a === 'center' ? x - w / 2 : x;
        rec.push({ t: String(t), l: Math.round(l), r: Math.round(l + w), y: Math.round(y) });
        return orig.apply(this, arguments);
      };
      try { fn(); } finally { CanvasRenderingContext2D.prototype.fillText = orig; }
      return rec;
    }
    // genau n Zeilen, unabhängig vom Stand der Daten (fehlende werden mit Platzhaltern aufgefüllt)
    function mitZeilen(n) {
      const k = JSON.parse(JSON.stringify(mo['Shop'])); k.zeilen = k.zeilen.slice(0, n);
      while (k.zeilen.length < n) k.zeilen.push({ name: 'Zusatz ' + k.zeilen.length, state: 'gruen', text: 'Test', frisch: 1 });
      return k;
    }
    const k7 = mitZeilen(7), k9 = mitZeilen(9);
    // Randstreifen als Pixel: Kacheln und Balken sind keine Texte, ihr Rand muss auch aus dem verdeckten Streifen bleiben
    const zd = T.liveboardUebersicht(mo.__uebersicht).getContext('2d').getImageData(0, 0, 1024, 512).data;
    const lum = (x, y) => { const i = (y * 1024 + x) * 4; return zd[i] + zd[i + 1] + zd[i + 2]; };
    const rand = [];
    for (let y = 130; y <= 470; y += 20) rand.push({ y, links: Math.abs(lum(58, y) - lum(30, y)), rechts: Math.abs(lum(966, y) - lum(990, y)) });
    return {
      sieben: zeichne(() => T.liveboard(k7)), neun: zeichne(() => T.liveboard(k9)), zentral: zeichne(() => T.liveboardUebersicht(mo.__uebersicht)),
      namen7: k7.zeilen.map((z) => z.name), rand, journalNamen: (mo.__uebersicht.abgeschlossen || []).slice(0, 2).concat(mo.__uebersicht.meldungen || []).slice(0, 3).map((r) => r.name),
    };
  });
  const trifft = (r, n) => r.t === n || (r.t.endsWith('…') && n.startsWith(r.t.slice(0, -1)));
  const fuss7 = geo.sieben.find((r) => r.t.indexOf('Messstand') === 0);
  const letzterName = geo.sieben.filter((r) => trifft(r, geo.namen7[6])).map((r) => r.y).sort((a, b) => b - a)[0];
  ok('mit sieben Zeilen steht die Fusszeile klar unter der letzten Zeile (mindestens 24 px unter deren Grundlinie)', !!fuss7 && letzterName != null && fuss7.y - letzterName >= 24, { fuss: fuss7 && fuss7.y, letzterName });
  ok('mit sieben Zeilen erscheint kein Überlauf-Hinweis', !geo.sieben.some((r) => /weitere Zeilen/.test(r.t)));
  const fuss9 = geo.neun.find((r) => r.t.indexOf('Messstand') === 0), hinweis = geo.neun.find((r) => /weitere Zeilen im Raum/.test(r.t));
  ok('mit neun Zeilen steht «+ 2 weitere Zeilen im Raum» rechts auf der Fusszeile, ohne sie zu berühren', !!hinweis && !!fuss9 && /^\+ 2 weitere/.test(hinweis.t) && Math.abs(hinweis.y - fuss9.y) <= 2 && hinweis.l >= fuss9.r + 24 && hinweis.r <= 976, { hinweis, fuss9 });
  const aussen = geo.zentral.filter((r) => r.l < 64 || r.r > 960);
  ok('Zentralmonitor: jeder Text liegt innerhalb von 64 bis 960 px (die Nachbarwände verdecken je nach Kamera bis zu 55 px Rand)', geo.zentral.length > 10 && aussen.length === 0, aussen.slice(0, 4));
  const abgekuerzt = geo.journalNamen.filter((n) => !geo.zentral.some((r) => trifft(r, n)));
  ok('Zentralmonitor zeigt die tatsächlichen letzten Arbeitsmeldungen', geo.journalNamen.length > 0 && abgekuerzt.length === 0 && geo.zentral.some((r) => r.t === 'Was im Büro passiert'), abgekuerzt);
  const unruhig = geo.rand.filter((s) => s.links > 15 || s.rechts > 15);
  ok('Zentralmonitor: auch Kacheln und Balken bleiben aus dem Randstreifen (Pixel bei x = 58 und x = 966 gleichen dem Hintergrund)', geo.rand.length >= 10 && unruhig.length === 0, unruhig.slice(0, 4));

  // ---------- 5) Aktualisieren: nur ändern, was sich ändert ----------
  const retex = await p.evaluate(() => {
    const last = window.KB3D.Buero.last, W = last.W, R = last.R, mo = last.liveModelle();
    let n = 0; const orig = R.retex; R.retex = function () { n++; return orig.apply(this, arguments); };
    const vorher = n; W.updateLive(mo); const gleich = n - vorher;                     // gleiche Daten: kein neues Bild
    const mo2 = JSON.parse(JSON.stringify(mo)); mo2['Shop'].zeit = '99:99';
    const v2 = n; W.updateLive(mo2); const eins = n - v2;                              // eine Uhr geändert: genau ein Bild
    W.updateLive(mo); R.retex = orig;
    return { gleich, eins };
  });
  ok('gleiche Daten zeichnen kein Bild neu', retex.gleich === 0, retex);
  ok('eine neue Uhrzeit zeichnet genau ein Liveboard neu', retex.eins === 1, retex);

  // ---------- 6) Klick auf ein Liveboard fährt hin; Zurück fährt zurück ----------
  async function klick(sel) { try { await p.locator(sel).first().click({ timeout: 12000 }); return true; } catch (e) { ok('Knopf bedienbar: ' + sel, false, String(e.message).split('\n')[0]); return false; } }
  async function kamera(cmd) {
    await p.evaluate((c) => { const L2 = window.KB3D.Buero.last; L2.cmd(c); const k = L2.debug.cam; Object.keys(k.g).forEach((a) => { k[a] = k.g[a]; }); }, cmd);
    await p.waitForTimeout(150);
  }
  /* Klickt auf einen Punkt des Bretts (Netz aus 5 × 4 Punkten), der nicht von einer Beschriftung oder einem Knopf verdeckt ist. */
  async function klickAufBrett(c, bw, bh) {
    await p.locator('.kb3-stage').scrollIntoViewIfNeeded();
    const box = await p.locator('.kb3-canvas').boundingBox();
    for (const fy of [0.5, 0.25, 0.75, 0.9]) for (const fx of [0.5, 0.15, 0.85, 0.3, 0.7]) {
      const pos = await p.evaluate((a) => window.KB3D.Buero.last.debug.project(a[0], a[1], a[2]), [c[0] + (fx - 0.5) * bw, c[1] + (0.5 - fy) * bh, c[2] + 0.2]);
      if (!pos) continue;
      const x = box.x + pos.x, y = box.y + pos.y;
      if (x < 2 || y < 2 || x > 1278 || y > 898) continue;
      const frei = await p.evaluate((q) => { const e = document.elementFromPoint(q[0], q[1]); return !!e && e.classList.contains('kb3-canvas'); }, [x, y]);
      if (!frei) continue;
      await p.mouse.click(x, y);
      await p.waitForTimeout(150);
      return true;
    }
    return false;
  }
  let klickOk = true, titelOk = true, kameraOk = true, zentralLinksOk = true, etikettenAus = true, textOk2 = true, textWeg = true;
  for (const n of FOLGE) {
    await kamera('view:' + n);
    const vorher = await p.evaluate(() => ({ ...window.KB3D.Buero.last.debug.cam.g }));
    const getroffen = await klickAufBrett(boards[n].c, boards[n].w, boards[n].h);
    const mon = await p.evaluate(() => window.KB3D.Buero.last.debug.monitor());
    if (!getroffen || mon !== n) klickOk = false;
    const st = await p.evaluate(() => ({ titel: document.querySelector('[data-monitor-titel]').textContent, leiste: !document.querySelector('.kb3-monitor-tools').hidden, zentral: !document.querySelector('.kb3-nur-zentral').hidden, klasse: document.querySelector('.kb3-viewer').classList.contains('is-monitor'), g: { ...window.KB3D.Buero.last.debug.cam.g }, labels: window.KB3D.Buero.last.debug.labels().map((l) => l.el.style.display) }));
    if (!(st.leiste && st.klasse && st.titel.indexOf('Liveboard · ') === 0 && st.titel.indexOf(n === 'Entwicklerbüro' ? 'Entwicklung' : n) > 0)) titelOk = false;
    if (st.zentral) zentralLinksOk = false;
    const bd = boards[n];
    if (!(Math.abs(st.g.tx - bd.c[0]) < 1e-6 && Math.abs(st.g.ty - bd.c[1]) < 1e-6 && Math.abs(st.g.tz - bd.c[2]) < 1e-6)) kameraOk = false;
    await p.evaluate(() => { const k = window.KB3D.Buero.last.debug.cam; Object.keys(k.g).forEach((a) => { k[a] = k.g[a]; }); window.KB3D.Buero.last.debug.render(1.7, true); });
    const lab = await p.evaluate(() => window.KB3D.Buero.last.debug.labels().filter((l) => l.el.style.display !== 'none').length);
    if (lab !== 0) etikettenAus = false;
    const txt = await p.evaluate(() => { const b = document.querySelector('[data-live-text]'); return { sichtbar: !b.hidden, text: b.textContent }; });
    const sollNamen = m.mo[n].zeilen.map((z) => z.name);
    if (!txt.sichtbar || sollNamen.some((x) => txt.text.indexOf(x) < 0) || txt.text.indexOf(m.mo[n].titel) < 0) textOk2 = false;
    await klick('[data-cmd="monitorBack"]');
    if (!(await p.evaluate(() => document.querySelector('[data-live-text]').hidden))) textWeg = false;
    const zurueck = await p.evaluate(() => ({ mon: window.KB3D.Buero.last.debug.monitor(), g: { ...window.KB3D.Buero.last.debug.cam.g }, klasse: document.querySelector('.kb3-viewer').classList.contains('is-monitor') }));
    if (zurueck.mon !== null || zurueck.klasse || Math.abs(zurueck.g.dist - vorher.dist) > 1e-6 || Math.abs(zurueck.g.tx - vorher.tx) > 1e-6) kameraOk = false;
  }
  ok('Klick auf das Liveboard öffnet die Monitoransicht dieses Raums (alle sieben)', klickOk);
  ok('Titel «Liveboard · Raum», Leiste und Monitorklasse stimmen', titelOk);
  ok('die Kamera zielt genau auf die Mitte des Liveboards, Zurück stellt sie wieder her', kameraOk);
  ok('die Links des Zentralmonitors erscheinen nicht bei Raum-Liveboards', zentralLinksOk);
  ok('in der Monitoransicht sind alle Beschriftungen ausgeblendet', etikettenAus);
  ok('unter dem Brett steht die Textfassung mit Titel und allen Zeilen des Raums', textOk2);
  ok('nach «Zurück zum Büro» ist die Textfassung wieder weg', textWeg);
  // Zentralmonitor
  await kamera('view:Campusplatz');
  const zc = await p.evaluate(() => { const o = window.KB3D.Buero.last.W.overview; return { c: o.c, w: o.w, h: o.h }; });
  const klickZ = await klickAufBrett(zc.c, zc.w, zc.h);
  const zst = await p.evaluate(() => ({ mon: window.KB3D.Buero.last.debug.monitor(), titel: document.querySelector('[data-monitor-titel]').textContent, zentral: !document.querySelector('.kb3-nur-zentral').hidden }));
  ok('Klick auf den Zentralmonitor öffnet ihn mit seinen Links', klickZ && zst.mon === 'Zentral' && zst.titel === 'Zentralmonitor' && zst.zentral, zst);

  // ---------- 7) Raumwechsel in der Monitoransicht ----------
  const reihe = [];
  await p.evaluate(() => window.KB3D.Buero.last.cmd('monitor:Chefbüro'));
  reihe.push(await p.evaluate(() => window.KB3D.Buero.last.debug.monitor()));
  for (let i = 0; i < 8; i++) { await p.evaluate(() => window.KB3D.Buero.last.cmd('monitorNext')); reihe.push(await p.evaluate(() => window.KB3D.Buero.last.debug.monitor())); }
  const soll = FOLGE.concat(['Zentral']);
  ok('«Raum ›» geht alle sieben Räume und den Zentralmonitor der Reihe nach durch und beginnt von vorn', JSON.stringify(reihe) === JSON.stringify(soll.concat([soll[0]])), reihe);
  await p.evaluate(() => window.KB3D.Buero.last.cmd('monitorPrev'));
  ok('«‹ Raum» geht rückwärts', (await p.evaluate(() => window.KB3D.Buero.last.debug.monitor())) === 'Zentral');
  await p.locator('.kb3-canvas').focus();
  await p.keyboard.press('Escape');
  ok('Escape verlässt die Monitoransicht', (await p.evaluate(() => window.KB3D.Buero.last.debug.monitor())) === null && !(await p.evaluate(() => document.querySelector('.kb3-viewer').classList.contains('is-monitor'))));
  // Knopf «Liveboard» in der Kamera-Leiste: öffnet das Brett des gewählten Raums, ohne Raum den Zentralmonitor
  await kamera('view:Krypto');
  await klick('.kb3-live');
  ok('Knopf «Liveboard» öffnet das Brett des gewählten Raums', (await p.evaluate(() => window.KB3D.Buero.last.debug.monitor())) === 'Krypto');
  await klick('[data-cmd="monitorBack"]');
  await kamera('view:alle');
  await klick('.kb3-live');
  ok('Knopf «Liveboard» ohne Raum öffnet den Zentralmonitor', (await p.evaluate(() => window.KB3D.Buero.last.debug.monitor())) === 'Zentral');
  await klick('[data-cmd="monitorBack"]');

  // Ein grüner, wartender oder laufender Vorgang ist kein erledigter Auftrag.
  const journal = await p.evaluate(() => {
    const original = window.__ROWS, jetzt = Date.now(), iso = (n) => new Date(n).toISOString();
    try {
      window.__ROWS = original.map((r) => Object.assign({}, r));
      const setzen = (id, werte) => Object.assign(window.__ROWS.find((r) => r.id === id), { gemessen: iso(jetzt), gemessen_text: 'Testmessung', frisch_h: 24, status: 'gruen', lauf_ende: iso(jetzt - 60000), lauf_status: 'completed', lauf_ergebnis: 'success' }, werte);
      setzen('auswahl', { lauf_id: 'probe-1', befund: 'GitHub: fünf Varianten im Test geprüft.' });
      setzen('schaufenster', { lauf_id: 'probe-1' });
      setzen('waechter', { lauf_id: 'probe-2', lauf_ergebnis: 'failure', status: 'rot' });
      setzen('autopilot', { lauf_id: 'probe-3', lauf_status: 'in_progress' });
      setzen('fortura', { lauf_id: 'probe-4', lauf_status: 'queued' });
      setzen('printful', { lauf_id: 'probe-5', lauf_ende: iso(jetzt + 86400000) });
      window.__runAll();
      const m = window.KB3D.Buero.last.liveModelle().__uebersicht;
      const text = document.querySelector('.kb-ergebnisse').textContent;
      return { abgeschlossen: m.abgeschlossen.map((r) => r.id), meldungen: m.meldungen.map((r) => r.id), blocker: m.blocker.map((r) => r.id), ergebnisErhalten: text.includes('GitHub: fünf Varianten im Test geprüft.'), keinHauptlink: document.querySelectorAll('.kb-arbeitslinks a[href],.kb3-monitor-tools a[href]').length === 0 };
    } finally { window.__ROWS = original; window.__runAll(); }
  });
  ok('nur bestätigter erfolgreicher Abschluss zählt, gleiche Lauf-ID wird einmal gezeigt', journal.abgeschlossen.length === 1 && journal.abgeschlossen[0] === 'auswahl', journal);
  ok('Fehler, wartende/aktive Vorgänge und zukünftiges Ende bleiben ohne Abschluss', journal.blocker.includes('waechter') && ['autopilot','fortura','printful'].every((id) => journal.meldungen.includes(id)), journal);
  ok('Befunde bleiben erhalten; die Hauptansicht ist kein Direktlink-Verzeichnis', journal.ergebnisErhalten && journal.keinHauptlink, journal);

  // Messfehler dürfen keine grünen Lampen und keine fremde Raum-Messzeit erzeugen.
  const frische = await p.evaluate(() => {
    const vorher = window.__ROWS, nowFn = Date.now, jetzt = Date.now();
    const iso = (t) => new Date(t).toISOString(), T = window.KB3D.tex;
    let aus;
    try {
      window.__ROWS = vorher.map((r) => {
        const n = Object.assign({}, r);
        if (n.bereich === 'Shop') Object.assign(n, { status: 'gruen', gemessen: iso(jetzt - 48 * 3600000), frisch_h: 24, aktiv_h: 0 });
        if (n.bereich === 'Krypto') Object.assign(n, { status: 'gruen', gemessen: iso(jetzt), frisch_h: 24, aktiv_h: 0 });
        return n;
      });
      window.__runAll();
      const L = window.KB3D.Buero.last, mo = L.liveModelle();
      const eigenerStand = new Date(jetzt - 48 * 3600000).toLocaleString('de-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const alt = mo.Shop.zeilen.every((z) => z.state === 'alt' && /vor 2 d/.test(z.alter));
      const raum = mo.Shop.stand === eigenerStand && mo.Shop.stand !== mo.Krypto.stand;
      ['auswahl', 'schaufenster', 'waechter'].forEach((id, i) => {
        Object.assign(window.__ROWS.find((r) => r.id === id), { status: 'gruen', gemessen: ['', 'kaputt', iso(jetzt + 86400000)][i], frisch_h: 24 });
      });
      window.__runAll();
      const unbekannt = ['auswahl', 'schaufenster', 'waechter'].map((id) => L.ents.find((e) => e.id === id).state);
      const missing = L.liveModelle().Shop.zeilen.filter((z) => /Nicht gemessen|Zeit unklar/.test(z.alter)).length;
      const texte = [], fill = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t) { texte.push(String(t)); return fill.apply(this, arguments); };
      try { T.liveboard(null); T.liveboardUebersicht(null); T.station({ name: 'Quellzeile', state: 'gelb', text: 'Echter Ereignistext', alter: 'Nicht gemessen' }); T.screen('chart'); T.screen('dash'); } finally { CanvasRenderingContext2D.prototype.fillText = fill; }
      window.__ROWS = vorher.map((r) => Object.assign({}, r, r.id === 'auswahl' ? { status: 'gruen', gemessen: iso(jetzt), frisch_h: 1, aktiv_h: 0 } : {}));
      window.__runAll();
      Date.now = () => jetzt + 2 * 3600000;
      window.__kbAnzeigeTimer.forEach((fn) => fn());
      const gealtert = L.ents.find((e) => e.id === 'auswahl').state;
      aus = { alt, raum, unbekannt, missing, gealtert, timer: window.__kbAnzeigeTimer.length,
        quellentext: texte.includes('Quellzeile') && texte.includes('Echter Ereignistext') && texte.includes('Nicht gemessen'),
        keinFalschesLive: !texte.includes('LIVE') && !texte.includes('BTC/USDT') && !texte.includes('12 · 3 · 0') };
    } finally { Date.now = nowFn; window.__ROWS = vorher; window.__runAll(); }
    return aus;
  });
  ok('alte Zeilen bleiben alt, jeder Raum trägt seine eigene Messzeit', frische.alt && frische.raum, frische);
  ok('fehlende, ungültige und zukünftige Messzeiten bleiben sichtbar ungeklärt', frische.unbekannt.every((s) => s === 'gelb') && frische.missing === 3, frische);
  ok('Arbeitsplatz zeigt die Quellzeile; Uhr und Platzhalter behaupten keine Live-Metriken', frische.quellentext && frische.keinFalschesLive, frische);
  ok('lokaler Anzeige-Timer lässt Messungen auch mit reduzierter Bewegung altern', frische.timer > 0 && frische.gealtert === 'alt', frische);

  // Gerenderte Bildpunkte prüfen: ein gültiges Modell allein erkennt verdeckte Bildschirmflächen nicht.
  const bildprobe = await p.evaluate(() => {
    const L = window.KB3D.Buero.last, result = {};
    function vergleichen(name, fokus) {
      if (fokus) L.cmd('monitor:' + name); else L.goView(name, true);
      Object.assign(L.debug.cam, L.debug.cam.g); L.debug.render(1.7, true);
      const bd = name === 'Zentral' ? L.W.overview : L.W.live[name], mo = L.liveModelle();
      const src = name === 'Zentral' ? window.KB3D.tex.liveboardUebersicht(mo.__uebersicht) : window.KB3D.tex.liveboard(mo[name]);
      const ctx = src.getContext('2d'), gl = L.R.gl, canvas = gl.canvas;
      const punkte = [[80,80],[512,80],[930,80],[90,180],[500,180],[930,180],[90,360],[500,360],[930,360],[80,480],[930,480]];
      let passend = 0;
      punkte.forEach(([u,v]) => {
        const q = L.debug.project(bd.c[0]+(u/1024-0.5)*bd.w,bd.c[1]+(0.5-v/512)*bd.h,bd.c[2]);
        if(!q)return;
        const px=Math.floor(q.x*canvas.width/L.R.w),py=Math.floor(canvas.height-q.y*canvas.height/L.R.h);
        if(px<0||py<0||px>=canvas.width||py>=canvas.height)return;
        const rgb=new Uint8Array(4);gl.readPixels(px,py,1,1,gl.RGBA,gl.UNSIGNED_BYTE,rgb);
        const soll=ctx.getImageData(u,v,1,1).data;
        if(Math.abs(rgb[0]-soll[0])+Math.abs(rgb[1]-soll[1])+Math.abs(rgb[2]-soll[2])<100)passend++;
      });
      return passend;
    }
    result.raum=vergleichen('Shop',false);result.zentral=vergleichen('Zentral',true);L.cmd('monitorBack');
    return result;
  });
  ok('Raummonitor bleibt vor seinem Gehäuse sichtbar (Bildpunkt-Gegenprobe)', bildprobe.raum >= 8, bildprobe);
  ok('Zentralmonitor ist in der Fokusansicht ohne verdeckende Nachbarwände lesbar', bildprobe.zentral >= 8, bildprobe);

  // ---------- 8) Aufwand und Fehler ----------
  const last = await p.evaluate(() => window.KB3D.Buero.last.debug.render(1.7, true));
  ok('Zeichenaufrufe und Dreiecke bleiben im Rahmen (unter 1400 und 900 000)', last.draws < 1400 && last.tris < 900000, last);
  ok('keine Seiten- oder Konsolenfehler', errs.length === 0, errs);
  // Arbeitsdaten müssen ohne 3D am Handy und im WebGL-Rückfall sichtbar bleiben.
  for (const [name, width] of [['Handy-Start', 390], ['Desktop ohne WebGL', 1280]]) {
    const fallbackCtx = await b.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const fallback = await fallbackCtx.newPage();
    await fallback.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind) { return /webgl/.test(kind) ? null : get.apply(this, arguments); };
    });
    await fallback.goto('file://' + dir + '/harness.html');
    await fallback.evaluate(() => {
      const jetzt = Date.now(), original = window.__ROWS[0];
      window.__ROWS = [Object.assign({}, original, { id: 'auswahl', status: 'gruen', gemessen: new Date(jetzt).toISOString(), frisch_h: 24, lauf_id: 'fallback-beleg', lauf_status: 'completed', lauf_ergebnis: 'success', lauf_ende: new Date(jetzt - 60000).toISOString(), befund: 'Der belegte Testlauf bleibt ohne 3D sichtbar.' })];
      window.__runAll();
    });
    const gesehen = await fallback.evaluate(() => {
      const box = document.querySelector('.kb-ergebnisse');
      return { text: box.textContent, sichtbar: !box.closest('[hidden]') && box.offsetHeight > 0, ausserhalb3D: !box.closest('#kb-pane-3d'), canvas: document.querySelectorAll('.kb3-canvas').length, tab: document.querySelector('#kb-tab-buero').getAttribute('aria-selected'), journal: window.KB3D.arbeitsJournal ? true : false };
    });
    ok(name + ': belegte Ergebnisse ohne WebGL sichtbar, gleiche gemeinsame Logik', gesehen.sichtbar && gesehen.ausserhalb3D && gesehen.canvas === 0 && gesehen.tab === 'true' && gesehen.journal && gesehen.text.includes('Der belegte Testlauf bleibt ohne 3D sichtbar.') && gesehen.text.includes('Lauf abgeschlossen'), gesehen);
    await fallbackCtx.close();
  }
  await b.close();
  console.log(fehler ? '\n' + fehler + ' FEHLER' : '\nalles ok');
  process.exit(fehler ? 1 : 0);
})();
