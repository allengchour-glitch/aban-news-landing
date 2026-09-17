/**
 * pinterest_boards_und_profil.mjs — legt die sechs fehlenden Boards an und korrigiert
 * die falsche Versandzusage in der Profilbeschreibung.
 *
 * ZWEI GEMESSENE BEFUNDE VOM 17.09.2026:
 * (1) Die 117 gepruefte Pins zeigen auf sechs Boards, die es auf dem Konto NICHT gibt
 *     (vorhanden sind: Soziales, Tech & Gadgets, Leder & Accessoires, Schlaf &
 *     Aromatherapie, Kueche & Genuss). Ohne die Boards verwirft Pinterests Massen-
 *     Upload die betroffenen Zeilen STILL — der Upload meldet trotzdem Erfolg.
 * (2) Die Profilbeschreibung wirbt mit «Gratis-Versand ab CHF 65». Richtig sind CHF 50.
 *     Die 65 wurde am 10.08. aus dem Theme entfernt (`seo_versandschwelle_fix.py`) und
 *     hat auf dem oeffentlichen Profil fuenf Wochen ueberlebt, weil die Korrektur den
 *     SHOP durchsuchte und Kanaele kein Shop sind.
 *
 * ⚠️ BAUWEISE (Lehre des Tages, dreimal bezahlt): Es wird NICHTS angeklickt, was nicht
 *    eindeutig gefunden wurde. Findet das Skript die erwarteten Bedienelemente nicht,
 *    macht es Screenshots, meldet was es gesehen hat, und ruehrt nichts an. Ein Bericht
 *    kostet einen Lauf; ein falscher Klick kostet ein Konto.
 *
 * ⚠️ IDEMPOTENT: Vorhandene Boards werden erkannt (normalisiert verglichen: Gross-/
 *    Kleinschreibung, Umlaute, «&» vs «und») und uebersprungen. Ein zweiter Lauf legt
 *    keine Dubletten an — dieselbe Regel wie bei den Importern (CLAUDE.md Regel 2).
 */
import path from 'node:path';
import { ist_anmeldeseite, hat_ziel_erreicht } from '../../server/anmelde_erkennung.mjs';

const HOST  = 'https://ch.pinterest.com';
const NUTZER = 'luxestylech';

const BOARDS = [
  'Herrenmode Schweiz',
  'Schmuck & Accessoires',
  'Sommerkleider & Damenmode 2026',
  'Wellness & Beauty',
  'Home & Geschenkideen',
  'Schuhe & Sandalen',
];

// ⚠️ Pinterest bildet die Adresse aus dem Namen — aber wie es mit «&» umgeht, ist NICHT
// vorhersagbar: «Schmuck & Accessoires» kann als `schmuck-und-accessoires` ODER als
// `schmuck-accessoires` landen. Die Gegenprobe hat das gefangen: mit nur EINER Lesart
// haette das Skript ein vorhandenes Board nicht erkannt und ein DUBLETT angelegt —
// CLAUDE.md Regel 2, hier zum x-ten Mal. Deshalb zwei Lesarten, und ein Board gilt als
// vorhanden, wenn EINE davon passt. Lieber einmal zu viel uebersprungen als doppelt.
const grund = s => (s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const normen = s => [
  grund(s).replace(/&/g, 'und').replace(/[^a-z0-9]/g, ''),   // «&» → «und»
  grund(s).replace(/&/g, '').replace(/[^a-z0-9]/g, ''),      // «&» faellt weg
];
const norm = s => normen(s)[0];

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const bilder = [], schritte = [];
  const schuss = async (s, name) => {
    const d = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await s.screenshot({ path: d, fullPage: false });
    bilder.push(path.relative(REPO, d));
  };
  const hin = async (s, url, name) => {
    await s.goto(url, { waitUntil: 'load', timeout: 60000 });
    await s.waitForTimeout(4000);
    await schuss(s, name);
    if (ist_anmeldeseite(s.url())) {
      const e = new Error(`nicht angemeldet — ${s.url()}`); e.nichtAngemeldet = true; throw e;
    }
    if (!hat_ziel_erreicht(url, s.url()))
      schritte.push(`⚠️ umgeleitet: ${url} → ${s.url()}`);
  };

  const seite = await ctx.newPage();
  const ergebnis = { boards_angelegt: [], boards_vorhanden: [], boards_offen: [],
                     profil: null, schritte, bilder };
  try {
    // ── 1. Welche Boards gibt es schon? ──────────────────────────────────────
    await hin(seite, `${HOST}/${NUTZER}/`, '1-profil');
    const vorhanden = await seite.$$eval(`a[href^="/${NUTZER}/"]`, as => [...new Set(
      as.map(a => (a.getAttribute('href') || '').split('/').filter(Boolean)[1] || '')
        .filter(h => h && !h.startsWith('_')))]);
    schritte.push(`vorhandene Board-Adressen: ${vorhanden.join(', ') || '—'}`);
    const da = new Set(vorhanden.flatMap(normen));

    // ── 2. Fehlende anlegen — ueber Pinterests eigene Anlege-Seite ───────────
    for (const name of BOARDS) {
      if (normen(name).some(k => da.has(k))) { ergebnis.boards_vorhanden.push(name); continue; }
      try {
        await hin(seite, `${HOST}/board-create/`, `2-anlegen-${norm(name).slice(0, 18)}`);
        const feld = seite.locator('input[type="text"]:visible, input[name="name"]:visible').first();
        if (!(await feld.count())) { ergebnis.boards_offen.push(`${name} (kein Namensfeld gefunden)`); continue; }
        await feld.fill(name);
        await seite.waitForTimeout(1200);
        const knopf = seite.locator('button,[role="button"]')
          .filter({ hasText: /^(erstellen|create|weiter|fertig|done)$/i });
        if (!(await knopf.count())) { ergebnis.boards_offen.push(`${name} (kein Erstellen-Knopf)`); continue; }
        await knopf.first().click({ timeout: 15000 });
        await seite.waitForTimeout(5000);
        ergebnis.boards_angelegt.push(name);
      } catch (e) {
        if (e.nichtAngemeldet) throw e;
        ergebnis.boards_offen.push(`${name} (${String(e.message).slice(0, 100)})`);
      }
    }

    // ── 3. Profilbeschreibung: 65 → 50, aber NUR wenn dort wirklich 65 steht ──
    // Blind ueberschreiben waere falsch: der Text kann laengst korrigiert sein, und
    // dann wuerde eine spaetere Fassung durch eine aeltere ersetzt.
    await hin(seite, `${HOST}/settings/`, '3-einstellungen');
    const felder = seite.locator('textarea:visible, input[type="text"]:visible');
    const n = await felder.count();
    let getroffen = null;
    for (let i = 0; i < n; i++) {
      const wert = await felder.nth(i).inputValue().catch(() => '');
      if (/CHF\s*65/i.test(wert)) { getroffen = { i, wert }; break; }
    }
    if (!getroffen) {
      ergebnis.profil = { geaendert: false,
        grund: `kein Feld mit «CHF 65» gefunden (${n} Felder geprueft) — entweder schon `
             + `korrigiert oder die Beschreibung steht woanders. NICHTS geaendert.` };
    } else {
      const neu = getroffen.wert.replace(/CHF\s*65/gi, 'CHF 50');
      await felder.nth(getroffen.i).fill(neu);
      await seite.waitForTimeout(1200);
      await schuss(seite, '4-profil-geaendert');
      const speichern = seite.locator('button,[role="button"]')
        .filter({ hasText: /^(speichern|save|fertig|done)$/i });
      if (!(await speichern.count())) {
        ergebnis.profil = { geaendert: false, vorher: getroffen.wert, wollte: neu,
          grund: 'kein eindeutiger Speichern-Knopf — Feld gefuellt, NICHT gespeichert' };
      } else {
        await speichern.first().click({ timeout: 15000 });
        await seite.waitForTimeout(6000);
        await schuss(seite, '5-nach-speichern');
        // Gegenprobe: neu laden und nachlesen. Ein Klick ist kein Beweis.
        await hin(seite, `${HOST}/${NUTZER}/`, '6-profil-nachher');
        const text = await seite.locator('body').innerText().catch(() => '');
        ergebnis.profil = { geaendert: true, vorher: getroffen.wert, nachher_gesetzt: neu,
          gegenprobe_65_noch_da: /CHF\s*65/i.test(text),
          gegenprobe_50_sichtbar: /CHF\s*50/i.test(text) };
      }
    }
    return ergebnis;
  } finally { await seite.close().catch(() => {}); }
}
