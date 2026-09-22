/**
 * pinterest_pin_erstellen.mjs — veröffentlicht GENAU EINEN Pin je Lauf aus dropship/_pinterest_pins_queue.tsv.
 *
 * ANLASS (22.09.2026, Betreiber «push mehr» Besucher): Pinterest bringt 71 Sitzungen/30 T nur aus Katalog-Pins
 * und steht ausdrücklich NICHT unter dropship/_SOCIAL_STOPP (die Datei nennt Instagram, Facebook).
 *
 * GEMESSEN (Auftrag pinterest-pin-builder-messen, 22.09. 12:36): /pin-creation-tool/ hat
 *   #storyboard-upload-input (Datei, Bild/Video) · #storyboard-selector-title · #WebsiteField (url) ·
 *   Knopf «Beschreibung» · [data-test-id="board-dropdown-select-button"] «Pinnwand auswählen» ·
 *   keine Einführungstour. Die Knöpfe sind gesperrt, bis ein Bild geladen ist.
 *
 * REGELN (Lehren 17.09., IG-Doppelposts):
 *  1. EIN Pin je Lauf — der Agent hat einen 5-Minuten-Takt.
 *  2. Quittung VOR Nebenwirkung: Kandidat gilt als erledigt, wenn er in irgendeinem
 *     auftraege/erledigt/pinterest-pin-*.json unter ergebnis.gepinnt steht ODER sein Titel schon auf der
 *     Ziel-Pinnwand sichtbar ist (Plattform-Wahrheit schlägt jedes Ledger, wie igLiveHas()).
 *  3. Nichts anhängen, was nicht gemessen ist: das Bild wird selbst heruntergeladen und an das GEMESSENE
 *     Feld #storyboard-upload-input gehängt. Fehlt ein Element, bricht der Lauf ohne Veröffentlichung ab
 *     und liefert die sichtbaren Knöpfe zurück (damit die nächste Fassung auf Messung steht).
 *  4. Nach dem Veröffentlichen wird die Pinnwand NACHGELESEN; nur dann steht der Pin in `gepinnt`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ist_anmeldeseite } from '../../server/anmelde_erkennung.mjs';

const HOST = 'https://ch.pinterest.com';
const NUTZER = 'luxestyleCH';
const norm = s => (s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z0-9]/g, '');

function warteschlange(REPO) {
  const p = path.join(REPO, 'dropship/_pinterest_pins_queue.tsv');
  if (!fs.existsSync(p)) return [];
  const [kopf, ...zeilen] = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
  const k = kopf.split('\t');
  return zeilen.map(z => Object.fromEntries(z.split('\t').map((v, i) => [k[i], v])));
}
function schonGepinnt(REPO) {
  const dir = path.join(REPO, 'auftraege/erledigt');
  const out = new Set();
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!/^pinterest-pin-/.test(f) || !f.endsWith('.json')) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const h of (d.ergebnis?.gepinnt || d.teilergebnis?.gepinnt || [])) out.add(h);
      // «laufend» oder abgebrochen NACH dem Klick: sicherheitshalber ebenfalls sperren
      if (d.ergebnis?.unklar) for (const h of d.ergebnis.unklar) out.add(h);
      if (d.teilergebnis?.unklar) for (const h of d.teilergebnis.unklar) out.add(h);
    } catch {}
  }
  return out;
}

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const seite = await ctx.newPage();
  const bilder = [], schritte = [];
  const ergebnis = { gepinnt: [], unklar: [], uebersprungen: [], schritte, bilder };
  const schuss = async (name) => {
    const d = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await seite.screenshot({ path: d, fullPage: false }).catch(() => {});
    bilder.push(path.relative(REPO, d));
  };
  const knoepfe = async () => seite.$$eval('button,div[role="button"]', els => els
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map(e => ({ text: (e.innerText || '').trim().slice(0, 40), testid: e.getAttribute('data-test-id') || null,
                 disabled: !!e.disabled || e.getAttribute('aria-disabled') === 'true' }))
    .filter(k => k.text || k.testid).slice(0, 40));

  /** Steht ein Pin mit diesem Titel schon auf der Pinnwand? (Plattform-Wahrheit) */
  let boardAdressen = null;
  /** Echte Board-Adressen von der Profilseite (Lauf 1 am 22.09.: geratener Slug lieferte 183 Zeichen = nichts). */
  async function boardAdresse(boardName) {
    if (!boardAdressen) {
      await seite.goto(`${HOST}/${NUTZER}/_saved/`, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
      await seite.waitForTimeout(5000);
      boardAdressen = await seite.$$eval('a[href]', (as, n) => [...new Set(as
        .map(a => a.getAttribute('href') || '')
        .filter(h => h.toLowerCase().startsWith('/' + n + '/'))
        .map(h => h.split('?')[0])
        .filter(h => { const t = h.split('/').filter(Boolean); return t.length === 2 && !t[1].startsWith('_'); }))], NUTZER.toLowerCase());
      schritte.push(`Boards auf dem Profil: ${boardAdressen.join(', ') || '—'}`);
    }
    const ziel = norm(boardName.replace(/&/g, ''));
    const treffer = boardAdressen.find(h => norm(decodeURIComponent(h.split('/')[2])) === ziel)
      || boardAdressen.find(h => norm(decodeURIComponent(h.split('/')[2])).includes(ziel.slice(0, 8)));
    return treffer ? HOST + treffer : null;
  }
  async function aufPinnwand(boardName, titel) {
    const adr = await boardAdresse(boardName);
    if (!adr) return { da: false, url: null, zeichen: 0 };
    await seite.goto(adr, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
    await seite.waitForTimeout(6000);
    for (let i = 0; i < 3; i++) { await seite.mouse.wheel(0, 1500).catch(() => {}); await seite.waitForTimeout(1200); }
    const text = await seite.locator('body').innerText().catch(() => '');
    // Lauf 3 (22.09.): eine LEERE Pinnwand hat nur 183 Zeichen — lesbar heisst: der Pinnwand-Name steht auf der Seite.
    const lesbar = norm(text).includes(norm(boardName.replace(/&/g, '')).slice(0, 10)) || text.length >= 200;
    if (!lesbar) await schuss('pinnwand-unlesbar');
    return { da: norm(text).includes(norm(titel).slice(0, 40)), url: seite.url(), zeichen: text.length, lesbar };
  }

  try {
    const alle = warteschlange(REPO);
    const fertig = schonGepinnt(REPO);
    const offen = alle.filter(k => !fertig.has(k.handle));
    schritte.push(`Warteschlange ${alle.length}, quittiert ${fertig.size}, offen ${offen.length}`);
    if (!offen.length) { schritte.push('nichts offen'); return ergebnis; }
    const k = offen[0];

    // 1) Plattform-Wahrheit: schon auf der Pinnwand?
    const vorher = await aufPinnwand(k.board, k.title);
    schritte.push(`Pinnwand «${k.board}» (${vorher.url}, ${vorher.zeichen} Z.): Titel ${vorher.da ? 'SCHON DA' : 'nicht da'}`);
    if (vorher.da) { ergebnis.gepinnt.push(k.handle); ergebnis.uebersprungen.push(`${k.handle}: schon auf der Pinnwand`); return ergebnis; }
    if (!vorher.url) { schritte.push(`Pinnwand «${k.board}» nicht auf dem Profil gefunden — kein Pin`); return ergebnis; }
    if (!vorher.lesbar) { schritte.push('Pinnwand nicht lesbar (Name fehlt auf der Seite) — kein Pin ohne Gegenprobe'); return ergebnis; }

    // 2) Bild holen (eigener Download, kein Raten)
    const antwort = await fetch(k.bild);
    if (!antwort.ok) { schritte.push(`Bild nicht ladbar: HTTP ${antwort.status}`); ergebnis.uebersprungen.push(`${k.handle}: Bild ${antwort.status}`); return ergebnis; }
    const buf = Buffer.from(await antwort.arrayBuffer());
    const typ = (antwort.headers.get('content-type') || 'image/jpeg').split(';')[0];
    const endung = typ.includes('png') ? 'png' : typ.includes('webp') ? 'webp' : 'jpg';
    const tmp = path.join(os.tmpdir(), `pin-${k.handle.slice(0, 40)}.${endung}`);
    fs.writeFileSync(tmp, buf);
    schritte.push(`Bild ${buf.length} Bytes (${typ})`);

    // 3) Editor
    await seite.goto(`${HOST}/pin-creation-tool/`, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(5000);
    if (ist_anmeldeseite(seite.url())) { const e = new Error(`nicht angemeldet — ${seite.url()}`); e.nichtAngemeldet = true; throw e; }
    // Lauf 5 (22.09.): nach dem Veröffentlichen lag ein Werbe-Dialog («Ideen finden. Gefällt mir. Merken. — Jetzt
    // installieren») über der Seite. So ein Dialog kann auch beim nächsten Öffnen liegen → erst Escape, dann Schliessen-Knöpfe.
    await seite.keyboard.press('Escape').catch(() => {});
    for (const sel of ['[aria-label="Schliessen"]', '[aria-label="Schließen"]', '[aria-label="Close"]', 'button:has-text("Nicht jetzt")', 'button:has-text("Später")']) {
      const x = seite.locator(sel).first();
      if (await x.count()) { await x.click({ timeout: 3000 }).catch(() => {}); await seite.waitForTimeout(800); }
    }
    const neu = seite.getByRole('button', { name: /^Neu erstellen$/ }).first();
    if ((await neu.count()) && (await neu.isEnabled().catch(() => false))) { await neu.click({ timeout: 5000 }).catch(() => {}); await seite.waitForTimeout(2000); schritte.push('«Neu erstellen» geklickt (alte Entwürfe liegen in der Seitenleiste)'); }
    const datei = seite.locator('#storyboard-upload-input');
    if (!(await datei.count())) { schritte.push('Bildfeld #storyboard-upload-input fehlt'); ergebnis.knoepfe = await knoepfe(); await schuss('kein-bildfeld'); return ergebnis; }
    await datei.setInputFiles(tmp);
    await seite.waitForTimeout(8000);
    await schuss('1-bild');

    const titel = seite.locator('#storyboard-selector-title');
    await titel.waitFor({ state: 'visible', timeout: 20000 });
    await titel.fill(k.title.slice(0, 100));
    const link = seite.locator('#WebsiteField');
    await link.fill(k.url);

    // Beschreibung: Knopf «Beschreibung» öffnet ein Textfeld (contenteditable oder textarea)
    const beschrKnopf = seite.locator('button,div[role="button"]').filter({ hasText: /^Beschreibung/ }).first();
    if (await beschrKnopf.count()) await beschrKnopf.click({ timeout: 5000 }).catch(() => {});
    await seite.waitForTimeout(1200);
    const beschrFeld = seite.locator('[contenteditable="true"]:visible, textarea:visible').first();
    if (await beschrFeld.count()) {
      await beschrFeld.click({ timeout: 5000 }).catch(() => {});
      await seite.keyboard.type(k.text.slice(0, 480), { delay: 5 });
      schritte.push('Beschreibung eingetragen');
    } else schritte.push('kein Beschreibungsfeld gefunden — Pin ohne Beschreibung');

    // Pinnwand wählen
    const boardKnopf = seite.locator('[data-test-id="board-dropdown-select-button"]');
    await boardKnopf.click({ timeout: 10000 });
    await seite.waitForTimeout(1500);
    // Lauf 4 (22.09.): das «letzte sichtbare Textfeld» war das Themen-Feld («Markierte Themen»), nicht die Board-Suche —
    // der Name landete als Tag. Nichts tippen: der Eintrag steht in der aufgeklappten Liste.
    const liste = seite.locator('[role="listbox"],[role="menu"],[role="dialog"]').last();
    const eintrag = ((await liste.count()) ? liste : seite).locator('[role="option"],[role="menuitem"],div[role="button"],button')
      .filter({ hasText: new RegExp(k.board.replace(/[&]/g, '.').slice(0, 14), 'i') }).first();
    if (!(await eintrag.count())) { schritte.push(`Pinnwand «${k.board}» in der Auswahl nicht gefunden`); ergebnis.knoepfe = await knoepfe(); await schuss('keine-pinnwand'); return ergebnis; }
    await eintrag.click({ timeout: 8000 });
    await seite.waitForTimeout(1500);
    await schuss('2-ausgefuellt');

    // Veröffentlichen — Knopf muss gemessen sichtbar sein, sonst KEIN Klick
    // Lauf 4: der Knopf «Veröffentlichen» war da (gemessen, enabled), aber `:visible` + Anker-Regex fanden ihn nicht.
    let publ = seite.getByRole('button', { name: /^Veröffentlichen$/ }).first();
    if (!(await publ.count())) publ = seite.locator('button,div[role="button"]').filter({ hasText: /Veröffentlichen/ }).first();
    if (!(await publ.count()) || !(await publ.isEnabled().catch(() => false))) { schritte.push('kein aktiver Veröffentlichen-Knopf gemessen — nicht geklickt'); ergebnis.knoepfe = await knoepfe(); return ergebnis; }
    // Gegenprobe vor dem Klick: Titel, Link und Pinnwand stehen wirklich im Formular
    const titelJetzt = await seite.locator('#storyboard-selector-title').inputValue().catch(() => '');
    const linkJetzt = await seite.locator('#WebsiteField').inputValue().catch(() => '');
    const boardJetzt = await boardKnopf.innerText().catch(() => '');
    if (!titelJetzt.startsWith(k.title.slice(0, 30)) || !linkJetzt.includes(k.handle) || !norm(boardJetzt).includes(norm(k.board.replace(/&/g, '')).slice(0, 10))) {
      schritte.push(`Formular stimmt nicht: Titel «${titelJetzt.slice(0, 40)}», Link «${linkJetzt.slice(0, 50)}», Pinnwand «${boardJetzt.replace(/\n/g, ' ').slice(0, 40)}» — nicht geklickt`);
      return ergebnis;
    }
    ergebnis.unklar.push(k.handle);                      // ab hier gilt: Klick passiert, Quittung offen
    await publ.click({ timeout: 10000 });
    await seite.waitForTimeout(9000);
    await schuss('3-nachher');

    // 4) Nachlesen auf der Pinnwand
    const nachher = await aufPinnwand(k.board, k.title);
    schritte.push(`Nachlesen: Titel ${nachher.da ? 'auf der Pinnwand' : 'NICHT gefunden'} (${nachher.zeichen} Z.)`);
    if (nachher.da) { ergebnis.gepinnt.push(k.handle); ergebnis.unklar = ergebnis.unklar.filter(h => h !== k.handle); ergebnis.pin = { handle: k.handle, board: k.board, title: k.title }; }
    else ergebnis.hinweis = 'Pin nach dem Klick nicht auf der Pinnwand gesehen — bleibt als «unklar» gesperrt (kein zweiter Versuch ohne Mensch)';
    return ergebnis;
  } finally { await seite.close().catch(() => {}); }
}
