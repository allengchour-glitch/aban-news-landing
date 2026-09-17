/**
 * pinterest_katalog_diagnose.mjs — liest Pinterests Katalog-Diagnose. REIN LESEND.
 *
 * Gefunden am 17.09.2026 in Auftrag 25, im Business Hub: der Shopify-Katalog ist
 * «Abgeschlossen», letzte Einpflege 17.9.2026, und es gibt eine Diagnoseseite unter
 * /business/catalogs/4844353693835/diagnosticsv2/.
 *
 * Das ist das Pinterest-Gegenstueck zu Google Merchant — mit einem entscheidenden
 * Unterschied: **diese Seite ist erreichbar.** Google sperrt den Agenten aus (Anmeldung
 * blockiert), Pinterest nicht. Wenn Produkte abgelehnt werden, steht hier warum, und
 * das ist von hier aus reparierbar.
 *
 * ═══ NACHTRAG 17.09., nach dem ersten Lauf (Auftrag 26) ═══
 *
 * Der Lauf hat geliefert: 431,36 Tsd. eingepflegt (99.99 %), 24 fehlgeschlagen
 * (Bilder unter 75 px), und **202,41 Tsd. Warnmeldungen = 46.92 %**. Zwei Dinge
 * daran waren falsch gemacht:
 *
 * 1. Die Seite hat ZWEI Reiter — «Probleme beim Einpflegen» und «Probleme bei der
 *    DISTRIBUTION». Gelesen wurde nur der erste. Einpflegen heisst «angekommen»,
 *    Distribution heisst «wird auch gezeigt» — und das zweite ist die Frage, die
 *    bei Google Merchant seit Monaten offen ist. **Wer nur den ersten Reiter liest,
 *    berichtet ueber die Tuer und nicht ueber den Raum.**
 * 2. Die Zahlen-Regex erlaubte fuehrende Satzzeichen und meldete darum `",\nProdukt"`
 *    als «Zahl». Eine Zahl braucht eine Ziffer — sonst ist sie keine.
 */
import path from 'node:path';
import { ist_anmeldeseite, ist_wandtext } from '../../server/anmelde_erkennung.mjs';

const ZIEL = 'https://ch.pinterest.com/business/catalogs/4844353693835/diagnosticsv2/';
// ⚠️ Der erste Versuch suchte «Zahl direkt vor dem Wort Produkte». Diese Seite
// schreibt aber Beschriftung und Zahl in EIGENE Zeilen:
//     Erfolgreich / 431,36 Tsd. / 99.99% des gesamten Datenquelle
// Eine Regex, die «431,36 Tsd. Produkte» erwartet, findet hier NICHTS — und eine
// leere Liste sah dann aus wie «keine Zahlen auf der Seite», obwohl drei dastehen.
// Also gegen den ECHTEN Text gebaut: Beschriftung suchen, die naechsten Zeilen lesen.
const KENNZAHLEN = ['Erfolgreich', 'Fehlgeschlagen', 'Warnmeldungen'];
function kennzahlen(text) {
  const zeilen = text.split('\n').map(z => z.trim());
  const raus = {};
  for (const name of KENNZAHLEN) {
    const i = zeilen.indexOf(name);
    // Nur uebernehmen, was wirklich wie eine Zahl aussieht — sonst null. Ein
    // falscher Wert ist schlimmer als ein fehlender.
    const wert = i >= 0 && /^\d[\d'’.,]*\s*(Tsd\.|Mio\.)?$/.test(zeilen[i + 1] || '') ? zeilen[i + 1] : null;
    const anteil = i >= 0 && /^[\d.,]+\s*%/.test(zeilen[i + 2] || '')
      ? (zeilen[i + 2].match(/^[\d.,]+\s*%/) || [null])[0] : null;
    raus[name] = wert === null ? null : { wert, anteil };
  }
  return raus;
}

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const seite = await ctx.newPage();
  const bilder = [];
  const schuss = async (name) => {
    const datei = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await seite.screenshot({ path: datei, fullPage: true });
    bilder.push(path.relative(REPO, datei));
  };
  const lies = async () => (await seite.locator('body').innerText().catch(() => '')).slice(0, 12000);

  try {
    await seite.setViewportSize({ width: 1500, height: 1000 });
    await seite.goto(ZIEL, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(7000);          // die Seite laedt Zahlen nach
    const ziel = seite.url();
    const einpflegen = await lies();
    if (ist_anmeldeseite(ziel)) { const e = new Error(`nicht angemeldet — ${ziel}`); e.nichtAngemeldet = true; throw e; }
    if (ist_wandtext(einpflegen)) { const e = new Error(`Bot-Wand: ${einpflegen.slice(0,120)}`); e.umgeleitet = true; throw e; }
    await schuss('1-einpflegen');

    // ── Zweiter Reiter: Distribution ────────────────────────────────────────────
    // Nur ein Reiterwechsel auf derselben Seite, kein Absenden — bleibt rein lesend.
    let distribution = null, reiter_notiz = 'nicht gefunden';
    const reiter = seite.locator('button,[role="tab"],a').filter({ hasText: /distribution/i });
    const n = await reiter.count();
    if (n >= 1) {
      await reiter.first().click({ timeout: 15000 }).catch(e => { reiter_notiz = `Klick fehlgeschlagen: ${e.message.slice(0,100)}`; });
      await seite.waitForTimeout(7000);
      const t = await lies();
      if (t && t !== einpflegen) { distribution = t.slice(0, 5000); reiter_notiz = 'gelesen'; }
      else reiter_notiz = 'geklickt, aber der Text blieb gleich — Reiter hat nicht gewechselt';
      await schuss('2-distribution');
    }

    return {
      ziel,
      kennzahlen: kennzahlen(einpflegen),
      begriffe: ['abgelehnt', 'rejected', 'Fehler', 'Warnung', 'in Bearbeitung', 'aktiv',
                 'nicht genehmigt', 'Problem'].filter(w => new RegExp(w, 'i').test(einpflegen)),
      reiter_distribution: reiter_notiz,
      reiter_gefunden: n,
      seitentext_einpflegen: einpflegen.slice(0, 4000),
      seitentext_distribution: distribution,
      bilder,
    };
  } finally { await seite.close().catch(() => {}); }
}
