/**
 * pinterest_bulk_upload.mjs — laedt gepruefte Pins ueber Pinterests eigenen
 * MASSEN-Upload hoch (CSV, Konto @luxestyleCH, Haendlerstatus genehmigt).
 *
 * Warum ueber den Browser und nicht ueber die API: der OAuth-Klick fuer ein
 * Pinterest-Zugriffstoken steht seit dem 08.07. offen. Der Betreiber hat am
 * 17.09. stattdessen das Browserprofil des Agenten angemeldet — damit ist der
 * Weg frei, ohne dass irgendjemand noch etwas klicken muss.
 *
 * ⛔ Pinterest faellt NICHT unter dropship/_SOCIAL_STOPP — die Datei nennt
 *    ausdruecklich «Instagram, Facebook». Der Doppelpost-Fall, der den Stopp
 *    ausgeloest hat, betraf die Meta-Poster.
 *
 * ⚠️ REGEL 10 (teuer gelernt an den IG-Doppelposts): erst die Quittung, DANN die
 *    Nebenwirkung. Stirbt der Server NACH dem Klick und VOR der Quittung, laedt
 *    der naechste Lauf dieselben Pins ein zweites Mal hoch.
 *
 * ═══ WAS DER ERSTE ECHTE VERSUCH GELEHRT HAT (Auftrag 27, 17.09.2026) ═══
 *
 * Der Lauf endete mit «locator.click: Timeout — element is not enabled». Ich
 * hielt das zuerst fuer einen schlechten Selektor. Der Screenshot zeigt etwas
 * anderes, und zwar dreierlei:
 *
 * 1. ⛔ ES GAB HIER GAR KEINEN MASSEN-UPLOAD. Die Seite war «Pin fuer Anzeige
 *    erstellen» — das Formular fuer EINEN Pin. Das Skript hat trotzdem die CSV
 *    an das erste `input[type=file]` gehaengt, also die 117-Zeilen-Tabelle in
 *    das BILDFELD eines einzelnen Pins. Waere die Schaltflaeche anklickbar
 *    gewesen, haette es einen Pin veroeffentlicht, dessen Bild eine CSV-Datei
 *    ist. **Ein Dateifeld ist nicht «das Dateifeld».** Auftrag 25 hatte
 *    gemessen, dass /pin-builder/ EIN Dateifeld hat — daraus habe ich
 *    geschlossen, es sei das Massen-Feld. Gemessen war nur, DASS es eines gibt.
 *    → Jetzt wird NICHTS angehaengt, solange nicht belegt ist, dass die Seite
 *      wirklich eine Massen-/CSV-Oberflaeche ist.
 *
 * 2. 🧱 EINE EINFUEHRUNGSTOUR LAG UEBER ALLEM («Tolle Pins leicht gemacht ·
 *    1 von 4 · Weiter»). Das ist eine Wand wie eine Bot-Pruefung, nur
 *    hausgemacht — und sie war der Grund, dass nichts anklickbar war.
 *    → Erst Tour wegklicken (erkannt an ihrem Schrittzaehler «N von M»),
 *      dann messen.
 *
 * 3. ⚠️ «weiter» stand in meiner Absende-Regex. Der einzige anklickbare
 *    «Weiter»-Knopf auf dem Bild gehoerte der TOUR. Hätte `.first()` ihn
 *    getroffen, waere das Skript fröhlich durch ein Tutorial geklickt und
 *    haette «hochgeladen: true» gemeldet. **Ein Wort wie «weiter» beschreibt
 *    keine Absicht — es kommt in jedem Assistenten vor.** → raus aus der Regex;
 *      abgesendet wird nur, was «veroeffentlichen/publish/hochladen/upload» heisst.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ist_anmeldeseite } from '../../server/anmelde_erkennung.mjs';

const HOST = 'https://ch.pinterest.com';   // gemessen 17.09.: das Konto landet auf der CH-Ausgabe
const PROFIL = 'luxestyleCH';

// Absicht, nicht Assistenten-Sprache. «weiter/next/erstellen/create» sind bewusst
// NICHT dabei — sie stehen in Touren und Zwischenschritten (siehe Kopf, Punkt 3).
const ABSENDEN = /^(hochladen|upload|veröffentlichen|veroeffentlichen|publish)$/i;
// Der Schrittzaehler einer Einfuehrungstour: «1 von 4», «2 of 4».
const TOUR_ZAEHLER = /\b\d+\s*(von|of)\s*\d+\b/i;
// Belegt, dass wir wirklich in einer Massen-/CSV-Oberflaeche stehen.
const MASSEN_BELEG = /(massen|bulk|\.csv\b|csv[- ]?(datei|file|upload)|tabelle hochladen)/i;

// ⛔ HARTER STOPP, gemessen am 17.09.2026 (Quittungen 25, 27, 29).
// Sieben Adressen abgetastet — /pin-builder/, /pin-creation-tool/, /business/hub/,
// /business/create/, /bulk-create-pins/, /business/pins/ und ads.pinterest.com:
// NIRGENDS ein Massen-/CSV-Einstieg. /bulk-create-pins/ und /business/pins/ leiten
// beide auf `?show_error=true`, die Werbeseite landet im Kampagnen-Bericht (0 Dateifelder).
// Der CSV-Massen-Upload existiert auf diesem Konto nicht.
//
// UND ER WIRD AUCH NICHT GEBRAUCHT: der Shopify-Katalog pflegt 431,36 Tsd. Artikel ein
// (99.99 %), und der Distributions-Reiter sagt **438,94 Tsd. genehmigt = 100 % des
// Katalogs**, 7 nicht genehmigt (nicht vorrätig), 0 eingeschränkt. Die 117 handgemachten
// Pins wären Beiwerk zu einem Kanal, der vollständig ausgeliefert wird.
//
// Dieser Stopp steht hier, weil die 117 Zeilen in dropship/pinterest_pins_upload.csv
// verlockend herumliegen und die naechste Sitzung es sonst zum dritten Mal versucht —
// ein Urteil, das niemand vollstreckt, ist keine Sicherung (Lehre 16.09., 95 Klingen).
// Aufheben: dropship/_pinterest_massenweg_gefunden.txt anlegen und die Adresse
// hineinschreiben, an der ein CSV-Feld GEMESSEN wurde.
const STOPP = 'dropship/_pinterest_massenweg_gefunden.txt';

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  if (!fs.existsSync(path.join(REPO, STOPP)))
    return { uebersprungen: true, grund:
      'Kein Massen-/CSV-Upload auf diesem Pinterest-Konto (7 Adressen gemessen, Quittungen '
      + '25/27/29). Wird auch nicht gebraucht: Katalog-Distribution 438,94 Tsd. genehmigt '
      + '= 100 %, 7 nicht genehmigt, 0 eingeschraenkt. Aufheben nur mit einer GEMESSENEN '
      + 'Adresse in ' + STOPP + '.' };
  const csv    = path.join(REPO, 'dropship', 'pinterest_pins_upload.csv');
  const ledger = path.join(REPO, 'dropship', '_pinterest_bulk_done.txt');
  const schritte = [];
  const bilder = [];

  const schuss = async (seite, name) => {
    const datei = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await seite.screenshot({ path: datei, fullPage: false });
    bilder.push(path.relative(REPO, datei));
  };
  // Ein Fehler darf die Messungen nicht mitnehmen. Gefunden an Auftrag 27: die
  // Quittung trug nur «Timeout» — alles, was der Lauf vorher gesehen hatte, war
  // weg, und die Diagnose musste aus den Screenshots rekonstruiert werden.
  const werfen = (nachricht, extra = {}) => {
    const e = new Error(nachricht);
    e.teilergebnis = { schritte, bilder, ...extra };
    Object.assign(e, extra);
    return e;
  };

  // ── Ledger mit ZWEI Staenden ────────────────────────────────────────────────
  // VORLAEUFIG = Anspruch angemeldet, Klick noch nicht bestaetigt.
  // BESTAETIGT = abgesendet, nie wieder anfassen.
  // Ein VORLAEUFIG-Eintrag blockiert NICHT fuer immer: wo Playwright beweist,
  // dass gar kein Klick zugestellt wurde («element is not enabled/visible»),
  // wird er wieder freigegeben. Ein Anspruch, den niemand zuruecknehmen kann,
  // sperrt die Aufgabe fuer immer — genau das war heute passiert.
  const ledgerText = fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8') : '';
  if (/BESTAETIGT/.test(ledgerText))
    return { uebersprungen: true, grund: 'Ledger BESTAETIGT — diese Pins sind schon hochgeladen',
             ledger: ledgerText.trim().slice(0, 300) };
  if (/VORLAEUFIG/.test(ledgerText))
    return { uebersprungen: true, grund:
      'Ledger steht auf VORLAEUFIG: ein frueherer Lauf hat den Anspruch angemeldet, '
      + 'aber nicht bestaetigt. Ob abgesendet wurde, ist von hier NICHT entscheidbar. '
      + 'Erst auf Pinterest nachsehen (Profil → Erstellt), dann den Ledger von Hand '
      + 'auf BESTAETIGT setzen oder loeschen. NICHTS angeklickt.',
      ledger: ledgerText.trim().slice(0, 300) };
  // Alt-Eintrag ohne Marke: das Skript schrieb bis 17.09. eine reine Zeitstempel-Zeile.
  // Der EINE Fall, der davon existiert, ist beweisbar harmlos — Quittung 27 zeigt
  // «element is not enabled» in allen Wiederholungen, es wurde also nie ein Klick
  // zugestellt. Den geben wir frei; jeder ANDERE unmarkierte Eintrag ist unklar und
  // wird nicht angetastet. (Eine Ausnahme braucht einen Beleg, sonst ist sie ein Loch.)
  if (ledgerText.trim() && !/BESTAETIGT|VORLAEUFIG|NICHTS-ABGESENDET/.test(ledgerText)) {
    if (/27-pinterest-upload/.test(ledgerText)) {
      fs.writeFileSync(ledger,
        'NICHTS-ABGESENDET (Alt-Eintrag freigegeben, 17.09.2026) · Quittung '
        + '27-pinterest-upload belegt: «element is not enabled» in allen Wiederholungen, '
        + 'der Klick wurde nie zugestellt. Der alte Eintrag stand VOR dem Klick.\n'
        + 'Vorheriger Inhalt: ' + ledgerText.trim().replace(/\s+/g, ' ').slice(0, 200) + '\n', 'utf8');
      schritte.push('Alt-Ledger ohne Marke freigegeben (Beleg: Quittung 27)');
    } else {
      return { uebersprungen: true, grund:
        'Ledger ohne Marke und ohne Beleg, was daraus geworden ist. NICHTS angeklickt.',
        ledger: ledgerText.trim().slice(0, 300) };
    }
  }
  if (!fs.existsSync(csv)) throw werfen(`CSV fehlt: ${csv}`);
  const zeilen = fs.readFileSync(csv, 'utf8').trim().split('\n').length - 1;

  const seite = await ctx.newPage();
  try {
    // --- 1. Welche Boards hat das Konto wirklich? -----------------------------
    await seite.goto(`${HOST}/${PROFIL}/`, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(3000);
    if (ist_anmeldeseite(seite.url()))
      throw werfen(`nicht angemeldet — umgeleitet auf ${seite.url()}`, { nichtAngemeldet: true });
    await schuss(seite, '1-profil');
    const boards = await seite.$$eval(`a[href^="/${PROFIL}/"]`,
      as => [...new Set(as.map(a => (a.getAttribute('href') || '')
        .split('/').filter(Boolean).slice(1).join('/')).filter(Boolean))]);
    schritte.push(`Profil offen, ${boards.length} Board-Links gesehen`);

    // --- 2. Pin-Werkzeug oeffnen und die Tour wegraeumen ----------------------
    await seite.goto(`${HOST}/pin-builder/`, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(4000);
    if (ist_anmeldeseite(seite.url()))
      throw werfen(`nicht angemeldet — umgeleitet auf ${seite.url()}`, { nichtAngemeldet: true });
    await schuss(seite, '2-pin-werkzeug');
    schritte.push(`Pin-Werkzeug: ${seite.url()}`);

    for (let runde = 0; runde < 6; runde++) {
      const body = await seite.locator('body').innerText().catch(() => '');
      if (!TOUR_ZAEHLER.test(body)) break;
      const zaehler = (body.match(TOUR_ZAEHLER) || [''])[0];
      await seite.keyboard.press('Escape').catch(() => {});
      await seite.waitForTimeout(800);
      const nachEsc = await seite.locator('body').innerText().catch(() => '');
      if (!TOUR_ZAEHLER.test(nachEsc)) { schritte.push(`Tour «${zaehler}» mit Escape geschlossen`); break; }
      const weiter = seite.locator('button,[role="button"]')
        .filter({ hasText: /^(weiter|next|fertig|done|los geht.s|got it)$/i });
      if (await weiter.count() === 0) { schritte.push(`Tour «${zaehler}» sichtbar, kein Weiter-Knopf`); break; }
      await weiter.first().click({ timeout: 8000 }).catch(() => {});
      await seite.waitForTimeout(1200);
      schritte.push(`Tour-Schritt «${zaehler}» weitergeklickt`);
    }
    await schuss(seite, '3-nach-tour');

    // --- 3. Steht hier ueberhaupt ein MASSEN-Upload? --------------------------
    // ⛔ Der wichtigste Halt des Skripts. Ohne Beleg wird NICHTS angehaengt.
    const einstieg = seite.locator('a,button,[role="button"]').filter({ hasText: /massen|bulk|csv/i });
    const n = await einstieg.count();
    schritte.push(`Einstiege mit «Massen/Bulk/CSV»: ${n}`);
    if (n >= 1) {
      await einstieg.first().click({ timeout: 15000 })
        .catch(e => schritte.push(`Klick auf Einstieg fehlgeschlagen: ${e.message.slice(0, 120)}`));
      await seite.waitForTimeout(4000);
      await schuss(seite, '4-nach-einstieg');
    }

    const seitentext = (await seite.locator('body').innerText().catch(() => '')).slice(0, 4000);
    if (!MASSEN_BELEG.test(seitentext)) {
      return { hochgeladen: false, grund:
        'Diese Seite ist KEINE Massen-/CSV-Oberflaeche (kein Wort «Massen/Bulk/CSV» im '
        + 'Seitentext). Am 17.09. hat genau hier ein Lauf die 117-Zeilen-CSV in das '
        + 'BILDFELD eines einzelnen Pins gehaengt. Deshalb: NICHTS angehaengt, NICHTS '
        + 'angeklickt. Naechster Schritt = messen, wo Pinterest den Massen-Upload heute '
        + 'fuehrt (Ads-Manager? Katalog-Datenquelle?) — und ob er fuer uns noetig ist, '
        + 'denn der Shopify-Katalog pflegt bereits 431 Tsd. Artikel ein (Auftrag 26).',
        seitenkopf: seitentext.slice(0, 400), boards, schritte, bilder, pins: zeilen };
    }

    // --- 4. Datei anhaengen (nur mit Beleg aus Schritt 3) --------------------
    const felder = seite.locator('input[type="file"]');
    const anzahl = await felder.count();
    schritte.push(`Dateifelder auf der belegten Massen-Seite: ${anzahl}`);
    if (anzahl === 0)
      return { hochgeladen: false, grund: 'Massen-Oberflaeche belegt, aber kein Dateifeld. NICHTS angeklickt.',
               boards, schritte, bilder, pins: zeilen };
    await felder.first().setInputFiles(csv);
    await seite.waitForTimeout(5000);
    await schuss(seite, '5-datei-angehaengt');
    schritte.push(`CSV angehaengt (${zeilen} Pins)`);

    // --- 5. Absenden: nur EINE anklickbare Absicht -----------------------------
    const kandidaten = await seite.$$eval('button,[role="button"]', els => els.map(el => ({
      text: (el.innerText || '').trim().slice(0, 40),
      testId: el.getAttribute('data-test-id') || '',
      deaktiviert: el.getAttribute('aria-disabled') === 'true' || el.disabled === true,
      sichtbar: !!(el.offsetWidth || el.offsetHeight),
    })));
    schritte.push(`Schaltflaechen gesamt: ${kandidaten.length}`);
    const senden = seite.locator('button:not([aria-disabled="true"]),[role="button"]:not([aria-disabled="true"])')
      .filter({ hasText: ABSENDEN });
    const s = await senden.count();
    schritte.push(`Anklickbare Absende-Schaltflaechen: ${s}`);
    if (s !== 1)
      return { hochgeladen: false, grund:
        `Datei haengt, aber ${s} anklickbare Absende-Schaltflaechen — bei 0 gibt es nichts `
        + 'zu klicken, bei mehreren waere jede Wahl geraten. NICHT abgesendet.',
        schaltflaechen: kandidaten.filter(k => k.sichtbar && k.text).slice(0, 25),
        boards, schritte, bilder, pins: zeilen };

    // ⬇⬇ Anspruch VOR dem Klick (Regel 10) — vorlaeufig, siehe Kopf.
    const stempel = new Date().toISOString();
    fs.writeFileSync(ledger,
      `VORLAEUFIG ${stempel} · ${zeilen} Pins aus dropship/pinterest_pins_upload.csv `
      + `an Pinterest @${PROFIL} (Auftrag ${auftrag.id}). Klick noch nicht bestaetigt.\n`, 'utf8');

    try {
      await senden.first().click({ timeout: 20000 });
    } catch (e) {
      // Playwright protokolliert, ob die Aktion ueberhaupt zugestellt wurde. Steht dort
      // durchgehend «not enabled»/«not visible», ist bewiesen, dass NICHTS abgesendet
      // wurde — dann wird der Anspruch zurueckgenommen, sonst bleibt er stehen.
      const log = String(e.message || '');
      const nichtsPassiert = /not enabled|not visible|not stable/i.test(log)
                          && !/navigat|response/i.test(log);
      fs.writeFileSync(ledger, nichtsPassiert
        ? `NICHTS-ABGESENDET ${stempel} · Klick nie zugestellt (${log.slice(0, 120).replace(/\s+/g, ' ')}). `
          + `Anspruch zurueckgenommen, ein neuer Lauf darf es erneut versuchen.\n`
        : `VORLAEUFIG ${stempel} · Klick abgebrochen, Zustellung UNKLAR (${log.slice(0, 160).replace(/\s+/g, ' ')}). `
          + `Erst auf Pinterest nachsehen, bevor jemand erneut hochlaedt.\n`, 'utf8');
      throw werfen(`Absenden fehlgeschlagen — Ledger auf ${nichtsPassiert ? 'NICHTS-ABGESENDET' : 'VORLAEUFIG'} `
                 + `gesetzt. ${log.slice(0, 200)}`, { schaltflaechen: kandidaten.filter(k => k.sichtbar && k.text).slice(0, 25) });
    }
    await seite.waitForTimeout(12000);
    await schuss(seite, '6-nach-absenden');
    const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 1500);
    fs.writeFileSync(ledger,
      `BESTAETIGT ${stempel} · ${zeilen} Pins aus dropship/pinterest_pins_upload.csv `
      + `an Pinterest @${PROFIL} abgesendet (Auftrag ${auftrag.id}).\n`
      + `Loeschen dieser Datei laedt die Pins ERNEUT hoch — nur tun, wenn belegt ist, `
      + `dass der Upload nicht angekommen ist.\n`, 'utf8');
    return { hochgeladen: true, pins: zeilen, boards, schritte, bilder,
             seitentext_nach_absenden: text };
  } finally {
    await seite.close().catch(() => {});
  }
}
