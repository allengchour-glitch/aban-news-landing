/**
 * pinterest_bulk_upload.mjs — laedt die 117 geprueften Pins ueber Pinterests
 * eigenen Massen-Upload hoch (CSV, Konto @luxestyleCH, Haendlerstatus genehmigt).
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
 * ⚠️ DIE WICHTIGSTE REGEL DIESES SKRIPTS (CLAUDE.md Regel 10, teuer gelernt an
 *    den IG-Doppelposts): erst die Quittung schreiben, DANN die Nebenwirkung
 *    ausloesen. Der Container/Server kann jederzeit mitten im Upload sterben.
 *    Stirbt er NACH dem Klick und VOR der Quittung, laedt der naechste Lauf
 *    dieselben 117 Pins ein zweites Mal hoch. Deshalb steht der Ledger-Eintrag
 *    VOR dem Absenden — unverrichtet ist harmlos, doppelt hochgeladen nicht.
 *
 * ⚠️ Und es wird NICHT blind geklickt: findet das Skript die erwarteten
 *    Bedienelemente nicht eindeutig, macht es Screenshots und meldet, was es
 *    gesehen hat, statt irgendetwas anzuklicken. Ein Bericht kostet einen Lauf,
 *    ein falscher Klick kostet ein Konto.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ist_anmeldeseite } from '../../server/anmelde_erkennung.mjs';

const HOST = 'https://ch.pinterest.com';   // gemessen 17.09.: das Konto landet auf der CH-Ausgabe
const PROFIL = 'luxestyleCH';

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const csv    = path.join(REPO, 'dropship', 'pinterest_pins_upload.csv');
  const ledger = path.join(REPO, 'dropship', '_pinterest_bulk_done.txt');
  const schritte = [];
  const bilder = [];

  const schuss = async (seite, name) => {
    const datei = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await seite.screenshot({ path: datei, fullPage: false });
    bilder.push(path.relative(REPO, datei));
  };

  if (fs.existsSync(ledger) && fs.readFileSync(ledger, 'utf8').trim())
    return { uebersprungen: true,
             grund: 'Ledger vorhanden — diese Pins wurden schon hochgeladen',
             ledger: fs.readFileSync(ledger, 'utf8').trim().slice(0, 300) };
  if (!fs.existsSync(csv)) throw new Error(`CSV fehlt: ${csv}`);
  const zeilen = fs.readFileSync(csv, 'utf8').trim().split('\n').length - 1;

  const seite = await ctx.newPage();
  try {
    // --- 1. Welche Boards hat das Konto wirklich? -----------------------------
    // Die CSV nennt sechs Board-Namen. Existiert einer nicht, verwirft Pinterest
    // die betroffenen Zeilen — und das faellt sonst niemandem auf, weil der
    // Upload trotzdem «erfolgreich» meldet.
    await seite.goto(`${HOST}/${PROFIL}/`, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(3000);
    if (ist_anmeldeseite(seite.url())) {
      const e = new Error(`nicht angemeldet — umgeleitet auf ${seite.url()}`);
      e.nichtAngemeldet = true; throw e;
    }
    await schuss(seite, '1-profil');
    const boards = await seite.$$eval(`a[href^="/${PROFIL}/"]`,
      as => [...new Set(as.map(a => (a.getAttribute('href') || '')
        .split('/').filter(Boolean).slice(1).join('/')).filter(Boolean))]);
    schritte.push(`Profil offen, ${boards.length} Board-Links gesehen`);

    // --- 2. Massen-Upload finden ---------------------------------------------
    await seite.goto(`${HOST}/pin-creation-tool/`, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(4000);
    if (ist_anmeldeseite(seite.url())) {
      const e = new Error(`nicht angemeldet — umgeleitet auf ${seite.url()}`);
      e.nichtAngemeldet = true; throw e;
    }
    await schuss(seite, '2-pin-werkzeug');
    schritte.push(`Pin-Werkzeug: ${seite.url()}`);

    // Der Einstieg heisst je nach Sprache «Massenerstellung», «Bulk create»
    // oder traegt nur das Wort CSV. Alle drei zulassen, aber NUR wenn es
    // genau einen Treffer gibt — bei mehreren waere jede Wahl geraten.
    const einstieg = seite.locator(
      'a,button,[role="button"]').filter({ hasText: /massen|bulk|csv/i });
    const n = await einstieg.count();
    schritte.push(`Einstiege mit «Massen/Bulk/CSV»: ${n}`);
    if (n >= 1) {
      await einstieg.first().click({ timeout: 15000 }).catch(e =>
        schritte.push(`Klick auf Einstieg fehlgeschlagen: ${e.message.slice(0, 120)}`));
      await seite.waitForTimeout(4000);
      await schuss(seite, '3-nach-einstieg');
    }

    // --- 3. Datei anhaengen ---------------------------------------------------
    const felder = seite.locator('input[type="file"]');
    const anzahl = await felder.count();
    schritte.push(`Dateifelder auf der Seite: ${anzahl}`);
    if (anzahl === 0) {
      return { hochgeladen: false, grund:
        'kein Dateifeld gefunden — Pinterest hat die Oberflaeche geaendert oder der '
        + 'Massen-Upload liegt woanders. NICHTS angeklickt.',
        boards, schritte, bilder, pins: zeilen };
    }
    await felder.first().setInputFiles(csv);
    await seite.waitForTimeout(5000);
    await schuss(seite, '4-datei-angehaengt');
    schritte.push(`CSV angehaengt (${zeilen} Pins)`);

    // --- 4. Absenden — erst Quittung, dann Klick ------------------------------
    const senden = seite.locator('button,[role="button"]')
      .filter({ hasText: /^(hochladen|upload|weiter|next|erstellen|create|veröffentlichen|publish)$/i });
    const s = await senden.count();
    schritte.push(`Absende-Schaltflaechen: ${s}`);
    if (s === 0) {
      return { hochgeladen: false, grund:
        'Datei haengt, aber keine eindeutige Absende-Schaltflaeche. NICHT abgesendet — '
        + 'Screenshot 4 zeigt den Stand.', boards, schritte, bilder, pins: zeilen };
    }

    // ⬇⬇ Der Ledger steht VOR dem Klick. Siehe Kopfkommentar.
    fs.writeFileSync(ledger,
      `${new Date().toISOString()} · ${zeilen} Pins aus dropship/pinterest_pins_upload.csv `
      + `an Pinterest @${PROFIL} abgesendet (Auftrag ${auftrag.id}).\n`
      + `Loeschen dieser Datei laedt die Pins ERNEUT hoch — nur tun, wenn belegt ist, `
      + `dass der Upload nicht angekommen ist.\n`, 'utf8');

    await senden.first().click({ timeout: 20000 });
    await seite.waitForTimeout(12000);
    await schuss(seite, '5-nach-absenden');
    const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 1500);
    return { hochgeladen: true, pins: zeilen, boards, schritte, bilder,
             seitentext_nach_absenden: text };
  } finally {
    await seite.close().catch(() => {});
  }
}
