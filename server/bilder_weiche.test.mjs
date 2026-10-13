/**
 * Gegenprobe zur BILDER-WEICHE im Auftrags-Runner (13.10.2026, Plan «Hetzner auf Maximum»,
 * Schritt 11).
 *
 * Die Frage ist nicht «verschiebt sie Bilder?», sondern die, an der es hängt:
 * **landet nach einem Auftrag aus einem angemeldeten Dienst ein Bild im Repo?** Gemessen
 * wird das so, wie der Starter es sieht: `git status --porcelain auftraege` in einem
 * ECHTEN Wegwerf-Repo. Getestet wird der ECHTE Quelltext aus luxe_auftrag_runner.mjs
 * (zwischen den Marken herausgeschnitten, nicht nachgebaut).
 *
 * Ein Melder, der «0 Bilder im Repo» meldet, muss zeigen, dass er auch «1» kann: Probe 0
 * lässt ein Bild absichtlich an der Weiche vorbei und erwartet einen Treffer.
 *
 * Proben 13–15 (Nachbesserung 13.10. abends, Prüfer-Befund): Unterordner, überschriebene
 * Dateien, fail-closed bei kaputtem Server-Ordner (Notfall → verwerfen → Abbruch Code 3).
 * Gegenprobe je Leck: Korrektur einzeln zurückgenommen (8 Mutanten) → jeweils rot.
 *
 * Lauf: /opt/node22/bin/node server/bilder_weiche.test.mjs
 * Probe 12 (echtes JPEG aus Chromium) läuft nur, wenn Playwright und ein Chromium da sind,
 * sonst meldet sie «übersprungen» (kein Fehler).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const QUELLE = new URL('./luxe_auftrag_runner.mjs', import.meta.url).pathname;
const src = fs.readFileSync(QUELLE, 'utf8');
const von = src.indexOf('// ── BILDER-WEICHE (Anfang)');
const bis = src.indexOf('// ── BILDER-WEICHE (Ende)');
if (von < 0 || bis < 0 || bis <= von) {
  console.error('✗ Weichen-Block nicht gefunden — der Test würde grün melden, ohne etwas zu prüfen.');
  process.exit(1);
}
const block = src.slice(von, bis);

let fehler = 0, proben = 0;
const pruefe = (name, ist, soll) => {
  proben++;
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `  ist=${JSON.stringify(ist)} soll=${JSON.stringify(soll)}`}`);
};

const PNG_KOPF = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const png = (bytes) => Buffer.concat([PNG_KOPF, Buffer.alloc(bytes - PNG_KOPF.length, 7)]);
const jpg = (bytes) => Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(bytes - 4, 3)]);

/** Frisches Wegwerf-Repo mit zwei BESTEHENDEN, committeten Bildern + Weiche daraus. */
function werkstatt(opt = {}) {
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'bildweiche-'));
  const REPO = path.join(T, 'repo');
  const ERGEBNIS = path.join(REPO, 'auftraege/ergebnis');
  const SERVER = path.join(T, 'server-bilder');            // ausserhalb des Repos
  fs.mkdirSync(ERGEBNIS, { recursive: true });
  const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { stdio: 'pipe' }).toString();
  git('init', '-q');
  fs.writeFileSync(path.join(ERGEBNIS, 'alt-bestehend.png'), png(350 * 1024));
  fs.writeFileSync(path.join(ERGEBNIS, 'alt-gross.jpg'), jpg(400 * 1024));
  fs.writeFileSync(path.join(ERGEBNIS, 'storefront-alt.jpg'), jpg(10 * 1024));
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'bestand');
  const NOTFALL = path.join(T, 'notfall');                 // statt os.tmpdir(), damit der Test zählen kann
  const fabrik = new Function('fs', 'path', 'os', 'execFileSync', 'REPO', 'ERGEBNIS', 'process',
    `${block}\n return { ist_oeffentlich, bilder_jetzt, bilder_weichen, reste_sichern, verkleinere_jpeg, FREIGEGEBEN, BILDER_SERVER, BILD_MAX_BYTES };`);
  // process.exit wird zur Ausnahme mit Code, damit Probe 15 den Abbruch sehen kann.
  const prozess = { env: { LUXE_BILDER_SERVER: opt.server || SERVER, LUXE_BILDER_NOTFALL: opt.notfall || NOTFALL },
                    exit: (c) => { throw Object.assign(new Error(`exit ${c}`), { exitCode: c }); } };
  const w = fabrik(opt.fs || fs, path, os, execFileSync, REPO, ERGEBNIS, prozess);
  const bestand = () => Object.fromEntries(['alt-bestehend.png', 'alt-gross.jpg', 'storefront-alt.jpg']
    .map(n => { try { return [n, fs.statSync(path.join(ERGEBNIS, n)).size]; } catch { return [n, null]; } }));
  // Was der Starter mit `git add auftraege` committen würde, nur Bilder:
  const bilder_im_commit = () => git('status', '--porcelain', '-uall', '--', 'auftraege')
    .split('\n').filter(Boolean).map(z => z.slice(3)).filter(p => /\.(png|jpe?g|webp|gif|bmp)$/i.test(p));
  const server = () => (fs.existsSync(SERVER) ? fs.readdirSync(SERVER).sort() : []);
  const notfall = () => (fs.existsSync(NOTFALL) ? fs.readdirSync(NOTFALL).sort() : []);
  return { ...w, T, REPO, ERGEBNIS, SERVER, NOTFALL, git, bestand, bilder_im_commit, server, notfall };
}

const schreib = (w, name, buf) => { const d = path.join(w.ERGEBNIS, name); fs.writeFileSync(d, buf); return d; };
const kleinJpeg = async () => jpg(5000);                   // Attrappe für den Browser-Verkleinerer
const BESTAND = { 'alt-bestehend.png': 350 * 1024, 'alt-gross.jpg': 400 * 1024, 'storefront-alt.jpg': 10 * 1024 };

// 0) Gegenprobe: ohne Weiche MUSS der Melder ein Bild sehen.
{
  const w = werkstatt();
  schreib(w, 'pin-1-bild.png', png(1000));
  pruefe('0) Gegenprobe: ein Bild ohne Weiche wird erkannt', w.bilder_im_commit(), ['auftraege/ergebnis/pin-1-bild.png']);
}

// 1) Pinterest-Skript (angemeldet): 3 PNG + 1 JSON → 0 Bilder im Repo, 3 auf dem Server.
{
  const w = werkstatt();
  const auftrag = { id: 'pinterest-pin-2026-10-13', typ: 'skript', skript: 'pinterest_pin_erstellen.mjs' };
  const vorher = w.bilder_jetzt();
  const bilder = ['1-bild', '2-ausgefuellt', '3-nachher'].map(n => {
    schreib(w, `${auftrag.id}-${n}.png`, png(180 * 1024));
    return `auftraege/ergebnis/${auftrag.id}-${n}.png`;
  });
  schreib(w, `${auftrag.id}.json`, Buffer.from('{"ok":1}'));
  let q = { ...auftrag, stand: 'ok', ergebnis: { bilder, gepinnt: ['x'] } };
  q = await w.bilder_weichen(auftrag, vorher, q, kleinJpeg);
  w.reste_sichern();
  pruefe('1) angemeldet: kein Bild im Repo', w.bilder_im_commit(), []);
  pruefe('1) angemeldet: 3 Bilder auf dem Server', w.server().length, 3);
  pruefe('1) JSON-Ergebnis bleibt im Repo', fs.existsSync(path.join(w.ERGEBNIS, `${auftrag.id}.json`)), true);
  const t = JSON.stringify(q);
  pruefe('1) Quittung nennt keinen Repo-Pfad eines Bildes mehr', /auftraege\/ergebnis\/[^"]+\.png/.test(t), false);
  pruefe('1) Quittung zeigt auf den Server', q.ergebnis.bilder.every(b => b.startsWith(`server:${w.SERVER}/`)), true);
  pruefe('1) Bericht: 3 auf dem Server, 0 im Repo', [q.bilder_weiche.auf_server.length, q.bilder_weiche.im_repo.length], [3, 0]);
  pruefe('1) Hinweis für die Hauptsitzung steht da', /seite_text/.test(q.bilder_weiche.hinweis || ''), true);
  pruefe('1) bestehende Bilder unverändert', w.bestand(), BESTAND);
}

// 2) Screenshot-Aufträge auf angemeldete Dienste (Merchant, Shopify-Admin, Pinterest-Analytics).
for (const url of ['https://merchants.google.com/mc/overview',
                   'https://admin.shopify.com/store/au3j0y-hq/products',
                   'https://analytics.pinterest.com/']) {
  const w = werkstatt();
  const auftrag = { id: 'blick', typ: 'screenshot', url };
  const vorher = w.bilder_jetzt();
  schreib(w, 'blick.png', png(90 * 1024));                 // so legt fuehre_aus() ihn ab
  let q = { ...auftrag, stand: 'ok', ergebnis: { ziel: url, datei: 'auftraege/ergebnis/blick.png' } };
  q = await w.bilder_weichen(auftrag, vorher, q, kleinJpeg);
  w.reste_sichern();
  const host = new URL(url).hostname;
  pruefe(`2) ${host}: kein Bild im Repo`, w.bilder_im_commit(), []);
  pruefe(`2) ${host}: Quittung zeigt auf den Server`, q.ergebnis.datei, `server:${path.join(w.SERVER, 'blick.png')}`);
}

// 3) Unbekanntes neues Skript = fail-closed.
{
  const w = werkstatt();
  const auftrag = { id: 'neu', typ: 'skript', skript: 'neuer_dienst_abtasten.mjs' };
  const vorher = w.bilder_jetzt();
  schreib(w, 'neu-1.png', png(5000));
  await w.bilder_weichen(auftrag, vorher, { ...auftrag }, kleinJpeg);
  w.reste_sichern();
  pruefe('3) unbekanntes Skript: kein Bild im Repo', w.bilder_im_commit(), []);
}

// 4) Öffentlicher Screenshot (luxestyle.ch): JPEG ≤ 200 KB im Repo, PNG weg, Verweis umgeschrieben.
{
  const w = werkstatt();
  const auftrag = { id: 'laden', typ: 'screenshot', url: 'https://luxestyle.ch/collections/kleider' };
  const vorher = w.bilder_jetzt();
  const abs = schreib(w, 'laden.png', png(900 * 1024));
  let q = { ...auftrag, stand: 'ok', ergebnis: { datei: 'auftraege/ergebnis/laden.png', absolut: abs } };
  q = await w.bilder_weichen(auftrag, vorher, q, kleinJpeg);
  w.reste_sichern();
  pruefe('4) öffentlich: genau das JPEG im Commit', w.bilder_im_commit(), ['auftraege/ergebnis/laden.jpg']);
  const j = fs.readFileSync(path.join(w.ERGEBNIS, 'laden.jpg'));
  pruefe('4) JPEG ≤ 200 KB und echte JPEG-Kennung', j.length <= 200 * 1024 && j[0] === 0xFF && j[1] === 0xD8, true);
  pruefe('4) neues PNG ist weg', fs.existsSync(path.join(w.ERGEBNIS, 'laden.png')), false);
  pruefe('4) Verweis relativ umgeschrieben', q.ergebnis.datei, 'auftraege/ergebnis/laden.jpg');
  pruefe('4) Verweis absolut umgeschrieben', q.ergebnis.absolut, 'auftraege/ergebnis/laden.jpg');
  pruefe('4) nichts auf dem Server', w.server(), []);
}

// 5) storefront_wahrheit (öffentlich) mit FEHLSCHLAG: Teilergebnis wird ebenfalls umgeschrieben.
{
  const w = werkstatt();
  const auftrag = { id: 'storefront-2026-10-13', typ: 'skript', skript: 'storefront_wahrheit.mjs' };
  const vorher = w.bilder_jetzt();
  schreib(w, 'storefront-2026-10-13-startseite.png', png(300 * 1024));
  let q = { ...auftrag, stand: 'fehler', fehler: 'x',
            teilergebnis: { bild: 'auftraege/ergebnis/storefront-2026-10-13-startseite.png' } };
  q = await w.bilder_weichen(auftrag, vorher, q, kleinJpeg);
  w.reste_sichern();
  pruefe('5) Fehlschlag: Teilergebnis zeigt aufs JPEG', q.teilergebnis.bild, 'auftraege/ergebnis/storefront-2026-10-13-startseite.jpg');
  pruefe('5) Fehlschlag: nur das JPEG im Commit', w.bilder_im_commit(), ['auftraege/ergebnis/storefront-2026-10-13-startseite.jpg']);
}

// 6) Öffentlich, aber nicht klein zu kriegen (null / zu gross / Absturz / kein JPEG) → Server.
for (const [name, verkleinere] of [
  ['null', async () => null],
  ['zu gross', async () => jpg(250 * 1024)],
  ['Absturz', async () => { throw new Error('Browser weg'); }],
  ['kein JPEG', async () => png(1000)],
]) {
  const w = werkstatt();
  const auftrag = { id: 's', typ: 'screenshot', url: 'https://www.luxestyle.ch/' };
  const vorher = w.bilder_jetzt();
  schreib(w, 's.png', png(800 * 1024));
  const q = await w.bilder_weichen(auftrag, vorher, { ...auftrag }, verkleinere);
  w.reste_sichern();
  pruefe(`6) Verkleinern «${name}»: kein Bild im Repo`, w.bilder_im_commit(), []);
  pruefe(`6) Verkleinern «${name}»: Bild auf dem Server`, w.server(), ['s.png']);
  pruefe(`6) Verkleinern «${name}»: Grund steht in der Quittung`, !!q.bilder_weiche.auf_server[0].grund, true);
}

// 7) Öffentliches kleines JPEG bleibt wie es ist; mp4 aus cj_quellvideo_holen bleibt unberührt.
{
  const w = werkstatt();
  const a1 = { id: 'k', typ: 'skript', skript: 'storefront_wahrheit.mjs' };
  let vorher = w.bilder_jetzt();
  schreib(w, 'k-1.jpg', jpg(50 * 1024));
  let gerufen = 0;
  await w.bilder_weichen(a1, vorher, { ...a1 }, async () => { gerufen++; return jpg(10); });
  pruefe('7) kleines JPEG: Verkleinerer nicht gerufen', gerufen, 0);
  const a2 = { id: 'rq', typ: 'skript', skript: 'cj_quellvideo_holen.mjs' };
  vorher = w.bilder_jetzt();
  schreib(w, 'rq-rq-abc.mp4', Buffer.alloc(3000, 1));
  await w.bilder_weichen(a2, vorher, { ...a2 }, kleinJpeg);
  w.reste_sichern();
  pruefe('7) mp4 bleibt in ergebnis/', fs.existsSync(path.join(w.ERGEBNIS, 'rq-rq-abc.mp4')), true);
  pruefe('7) kleines JPEG bleibt (freigegeben)', w.bilder_im_commit(), ['auftraege/ergebnis/k-1.jpg']);
}

// 8) Gastgeber-Tricks und Konto-Pfade.
{
  const w = werkstatt();
  const fall = (url, soll) => pruefe(`8) ${url} → ${soll ? 'öffentlich' : 'angemeldet'}`,
                                     w.ist_oeffentlich({ typ: 'screenshot', url }), soll);
  fall('https://luxestyle.ch/', true);
  fall('https://LUXESTYLE.CH/collections/kleider', true);
  fall('https://www.luxestyle.ch/pages/faq', true);
  fall('https://luxestyle.ch.boese.example/', false);
  fall('https://boese.example/?u=luxestyle.ch', false);
  fall('https://luxestyle.ch@boese.example/', false);
  fall('https://luxestyle.ch/admin', false);
  fall('https://www.luxestyle.ch/account/login', false);
  fall('https://luxestyle.ch/checkouts/cn/abc', false);
  fall('http://luxestyle.ch/', false);
  fall('https://au3j0y-hq.myshopify.com/', false);
  fall('kein-url', false);
  pruefe('8) wartung → angemeldet', w.ist_oeffentlich({ typ: 'wartung', aktion: 'platte' }), false);
  pruefe('8) kein Auftrag → angemeldet', w.ist_oeffentlich(null), false);
}

// 10) Reste eines abgebrochenen Laufs: unversioniert → Server; committete Bilder bleiben.
{
  const w = werkstatt();
  schreib(w, 'abgebrochen-1.png', png(4000));
  schreib(w, 'abgebrochen-2.jpg', jpg(4000));
  const n = w.reste_sichern();
  pruefe('10) zwei Reste verschoben', n, 2);
  pruefe('10) danach kein Bild im Repo', w.bilder_im_commit(), []);
  pruefe('10) bestehende Bilder unverändert', w.bestand(), BESTAND);
}

// 11) Namenskonflikte: vorhandenes x.jpg wird nie überschrieben; Server-Bild auch nicht.
{
  const w = werkstatt();
  const a = { id: 'storefront-alt', typ: 'screenshot', url: 'https://luxestyle.ch/' };
  const vorher = w.bilder_jetzt();
  schreib(w, 'storefront-alt.png', png(500 * 1024));
  const q = await w.bilder_weichen(a, vorher, { ...a, d: 'auftraege/ergebnis/storefront-alt.png' }, kleinJpeg);
  pruefe('11) Ausweichname statt Überschreiben', q.d, 'auftraege/ergebnis/storefront-alt-klein.jpg');
  pruefe('11) vorhandenes JPEG unverändert', w.bestand(), BESTAND);
  const b = { id: 'p', typ: 'skript', skript: 'pinterest_stand.mjs' };
  for (let i = 0; i < 2; i++) {
    const v = w.bilder_jetzt();
    schreib(w, 'p.png', png(1000 + i));
    await w.bilder_weichen(b, v, { ...b }, kleinJpeg);
  }
  const s = w.server();
  pruefe('11) zweites Server-Bild gleichen Namens überschreibt nicht', s.length === 2 && s.includes('p.png'), true);
}

// 13) Leck 1 (Prüfer 13.10.): Bilder in UNTERORDNERN von ergebnis/ und anderswo unter auftraege/.
{
  const w = werkstatt();
  const auftrag = { id: 'a1-pinterest', typ: 'skript', skript: 'pinterest_pin_erstellen.mjs' };
  const vorher = w.bilder_jetzt();
  fs.mkdirSync(path.join(w.ERGEBNIS, 'a1-pinterest/tief'), { recursive: true });
  schreib(w, 'a1-pinterest/unter.png', png(3000));
  schreib(w, 'a1-pinterest/tief/noch.jpg', jpg(3000));
  let q = { ...auftrag, stand: 'ok', ergebnis: { bild: 'auftraege/ergebnis/a1-pinterest/unter.png' } };
  q = await w.bilder_weichen(auftrag, vorher, q, kleinJpeg);
  pruefe('13) Unterordner: Weiche sieht beide Bilder', q.bilder_weiche?.auf_server.length ?? 0, 2);
  pruefe('13) Unterordner: Quittung zeigt auf den Server', q.ergebnis.bild.startsWith(`server:${w.SERVER}/`), true);
  w.reste_sichern();
  pruefe('13) ergebnis/<id>/x.png → 0 Bilder im Commit', w.bilder_im_commit(), []);
  // Reste ohne Weiche (abgebrochener Lauf), auch ausserhalb von ergebnis/:
  fs.mkdirSync(path.join(w.REPO, 'auftraege/erledigt'), { recursive: true });
  fs.mkdirSync(path.join(w.ERGEBNIS, 'b2/c3'), { recursive: true });
  fs.writeFileSync(path.join(w.REPO, 'auftraege/erledigt/quer.png'), png(2000));
  schreib(w, 'b2/c3/rest.webp', png(2000));
  pruefe('13) Gegenprobe: Reste wären im Commit', w.bilder_im_commit().length, 2);
  const n = w.reste_sichern();
  pruefe('13) Reste in Unterordnern + erledigt/ weggeräumt', [n, w.bilder_im_commit()], [2, []]);
  pruefe('13) bestehende Bilder unverändert', w.bestand(), BESTAND);
  // Öffentlich im Unterordner: JPEG daneben, freigegeben, nur das im Commit.
  const o = { id: 'sf', typ: 'skript', skript: 'storefront_wahrheit.mjs' };
  const v2 = w.bilder_jetzt();
  fs.mkdirSync(path.join(w.ERGEBNIS, 'sf'), { recursive: true });
  schreib(w, 'sf/seite.png', png(600 * 1024));
  await w.bilder_weichen(o, v2, { ...o }, kleinJpeg);
  w.reste_sichern();
  pruefe('13) öffentlich im Unterordner: nur das JPEG im Commit', w.bilder_im_commit(), ['auftraege/ergebnis/sf/seite.jpg']);
}

// 14) Leck 2: ÜBERSCHRIEBENE Dateien (gleiche Auftrags-ID, committetes Bild).
{
  const w = werkstatt();
  // a) angemeldetes Skript überschreibt ein committetes PNG
  const a = { id: 'alt', typ: 'skript', skript: 'pinterest_pin_erstellen.mjs' };
  let vorher = w.bilder_jetzt();
  schreib(w, 'alt-bestehend.png', png(123 * 1024));
  pruefe('14) Gegenprobe: überschriebenes Bild stünde im Commit', w.bilder_im_commit(), ['auftraege/ergebnis/alt-bestehend.png']);
  let q = await w.bilder_weichen(a, vorher, { ...a, d: 'auftraege/ergebnis/alt-bestehend.png' }, kleinJpeg);
  pruefe('14) a) Weiche erkennt das überschriebene Bild', q.bilder_weiche?.auf_server.length ?? 0, 1);
  pruefe('14) a) git status ohne Bild', w.bilder_im_commit(), []);
  pruefe('14) a) committeter Stand zurück', w.bestand(), BESTAND);
  pruefe('14) a) neuer Inhalt auf dem Server', fs.statSync(path.join(w.SERVER, 'alt-bestehend.png')).size, 123 * 1024);
  pruefe('14) a) Quittung zeigt auf den Server', q.d, `server:${path.join(w.SERVER, 'alt-bestehend.png')}`);
  // b) ohne Weiche überschrieben (abgebrochener Lauf) → reste_sichern holt es
  schreib(w, 'alt-gross.jpg', jpg(77 * 1024));
  const n = w.reste_sichern();
  pruefe('14) b) Rest: überschriebenes committetes Bild weg', [n, w.bilder_im_commit()], [1, []]);
  pruefe('14) b) committeter Stand zurück', w.bestand(), BESTAND);
  // c) öffentlich (storefront-JJJJ-MM-TT, 3×/Tag): überschriebenes PNG → JPEG, PNG auf HEAD
  const o = { id: 'alt-bestehend', typ: 'skript', skript: 'storefront_wahrheit.mjs' };
  vorher = w.bilder_jetzt();
  schreib(w, 'alt-bestehend.png', png(700 * 1024));
  q = await w.bilder_weichen(o, vorher, { ...o }, kleinJpeg);
  w.reste_sichern();
  pruefe('14) c) öffentlich überschrieben: nur das neue JPEG im Commit', w.bilder_im_commit(), ['auftraege/ergebnis/alt-bestehend.jpg']);
  pruefe('14) c) committetes PNG unverändert', w.bestand(), BESTAND);
  // d) im selben Lauf freigegebenes JPEG, danach von einem angemeldeten Auftrag überschrieben
  vorher = w.bilder_jetzt();
  fs.writeFileSync(path.join(w.ERGEBNIS, 'alt-bestehend.jpg'), jpg(9000));
  const z = new Date(Date.now() + 5000); fs.utimesSync(path.join(w.ERGEBNIS, 'alt-bestehend.jpg'), z, z);
  pruefe('14) d) Gegenprobe: ohne Weiche bliebe es (Freigabe-Stempel passt nicht mehr)', w.bilder_im_commit(), ['auftraege/ergebnis/alt-bestehend.jpg']);
  w.reste_sichern();
  pruefe('14) d) überschriebenes freigegebenes JPEG weg', w.bilder_im_commit(), []);
}

// 15) Leck 3: fail-closed, wenn der Server-Ordner nicht geht.
{
  // a) LUXE_BILDER_SERVER zeigt unter eine Datei (ENOTDIR) → Notfall-Ordner, 0 im Commit
  const T0 = fs.mkdtempSync(path.join(os.tmpdir(), 'bildweiche-datei-'));
  fs.writeFileSync(path.join(T0, 'datei'), 'x');
  const w = werkstatt({ server: path.join(T0, 'datei/unter') });
  const a = { id: 'p', typ: 'skript', skript: 'pinterest_pin_erstellen.mjs' };
  const vorher = w.bilder_jetzt();
  schreib(w, 'p-1.png', png(2000));
  const q = await w.bilder_weichen(a, vorher, { ...a }, kleinJpeg);
  pruefe('15) a) Server kaputt: 0 Bilder im Commit', w.bilder_im_commit(), []);
  pruefe('15) a) Bild im Notfall-Ordner', [w.notfall(), q.bilder_weiche?.auf_server[0]?.notfall], [['p-1.png'], true]);
  schreib(w, 'rest-1.png', png(2000));                    // Rest am Laufanfang, gleicher Defekt
  w.reste_sichern();
  pruefe('15) a) Rest mit kaputtem Server: 0 Bilder im Commit (vorher 1)', w.bilder_im_commit(), []);
  // b) Server UND Notfall kaputt → frisches Bild gelöscht, überschriebenes auf HEAD
  const w2 = werkstatt({ server: path.join(T0, 'datei/a'), notfall: path.join(T0, 'datei/b') });
  const v2 = w2.bilder_jetzt();
  schreib(w2, 'q-1.png', png(2000));
  schreib(w2, 'alt-bestehend.png', png(2222));
  const q2 = await w2.bilder_weichen(a, v2, { ...a, x: 'auftraege/ergebnis/q-1.png' }, kleinJpeg);
  pruefe('15) b) alles kaputt: 0 Bilder im Commit', w2.bilder_im_commit(), []);
  pruefe('15) b) frisches Bild verworfen', fs.existsSync(path.join(w2.ERGEBNIS, 'q-1.png')), false);
  pruefe('15) b) committetes Bild auf HEAD', w2.bestand(), BESTAND);
  pruefe('15) b) Quittung sagt «verworfen»', q2.x, 'verworfen (nicht zu sichern)');
  // c) nicht einmal löschen geht → Abbruch mit Code 3, Weiche läuft nicht weiter
  const kaputt = Object.assign({}, fs, {
    copyFileSync: () => { throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' }); },
    rmSync: (p, o) => { if (/zaeh\.png$/.test(p)) throw new Error('EPERM'); return fs.rmSync(p, o); },
  });
  const w3 = werkstatt({ fs: kaputt });
  schreib(w3, 'zaeh.png', png(2000));
  let code = null;
  try { w3.reste_sichern(); } catch (e) { code = e.exitCode ?? String(e.message); }
  pruefe('15) c) nichts geht: Abbruch mit Code 3 (Starter committet dann nicht)', code, 3);
}

// 12) Echter Verkleinerer in Chromium: Rauschbild (schwer zu packen) → JPEG ≤ 200 KB.
{
  let pw = null;
  for (const q of ['playwright', '/opt/node22/lib/node_modules/playwright/index.mjs']) {
    try { pw = await import(q); break; } catch {}
  }
  // '' = Playwrights eigener Chromium (Server); danach der lokale Build der Cloud-Umgebung.
  const kandidaten = [...(process.env.LUXE_CHROME ? [process.env.LUXE_CHROME] : []), '',
                      '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'];
  let browser = null;
  if (pw) for (const exe of kandidaten) {
    try { browser = await pw.chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox'] }); break; }
    catch {}
  }
  if (!browser) console.log('· 12) echter Verkleinerer: übersprungen (kein Playwright/Chromium hier)');
  else {
    const w = werkstatt();
    const ctx = await browser.newContext();
    const seite = await ctx.newPage();
    await seite.setViewportSize({ width: 1440, height: 900 });
    await seite.setContent('<canvas id=c width=1440 height=900></canvas>');
    await seite.evaluate(() => {
      const c = document.getElementById('c'), g = c.getContext('2d'), d = g.createImageData(1440, 900);
      for (let i = 0; i < d.data.length; i++) d.data[i] = (Math.random() * 256) | 0;
      g.putImageData(d, 0, 0);
    });
    const roh = path.join(w.ERGEBNIS, 'rauschen.png');
    await seite.screenshot({ path: roh });
    await seite.close();
    const vorBytes = fs.statSync(roh).size;
    const j = await w.verkleinere_jpeg(ctx, roh, w.BILD_MAX_BYTES);
    pruefe(`12) Rauschbild ${Math.round(vorBytes / 1024)} KB ist gross genug für die Probe`, vorBytes > 1024 * 1024, true);
    pruefe(`12) echtes JPEG ≤ 200 KB (${j ? Math.round(j.length / 1024) : '-'} KB)`,
           !!j && j.length <= 200 * 1024 && j[0] === 0xFF && j[1] === 0xD8, true);
    await browser.close();
  }
}

console.log(fehler ? `\n✗ ${fehler} von ${proben} Proben rot` : `\n✅ alle ${proben} Proben grün`);
process.exit(fehler ? 1 : 0);
