/**
 * pinterest_profil_messen.mjs — liest das Pinterest-Profil-Bearbeitungsformular. ÄNDERT NICHTS.
 *
 * ANLASS: Die Profilbeschreibung von @luxestyleCH verspricht «Gratis-Versand ab CHF 65»
 * (Betreiber-Screenshot 17.09.). Diese Schwelle wurde am 10.08. aus dem Theme entfernt —
 * live gilt 50, bzw. 45 nachdem der automatische 2-Artikel-Rabatt gerechnet hat. Die falsche
 * Zusage hat fünf Wochen auf einem öffentlichen Profil überlebt, weil die Korrektur damals
 * nur den Shop durchsucht hat. **Eine Korrektur, die nur den Shop durchsucht, erreicht
 * keinen Kanal.**
 *
 * WARUM ZWEI AUFTRÄGE: Am selben Tag hat ein geratener Selektor die 117-Zeilen-CSV in das
 * Bildfeld eines einzelnen Pins gehängt (Quittung 27). Ein Selektor wird gegen das ECHTE
 * Formular geschrieben, nicht gegen eine Vermutung — dieser Lauf liefert das Formular,
 * ein zweiter ändert dann genau ein Feld.
 */
import path from 'node:path';
import { ist_anmeldeseite, ist_wandtext, hat_ziel_erreicht } from '../../server/anmelde_erkennung.mjs';

const ZIEL = 'https://ch.pinterest.com/settings/';

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const seite = await ctx.newPage();
  const bilder = [];
  try {
    await seite.setViewportSize({ width: 1500, height: 1100 });
    await seite.goto(ZIEL, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(6000);
    const gelandet = seite.url();
    const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 6000);
    if (ist_anmeldeseite(gelandet)) { const e = new Error(`nicht angemeldet — ${gelandet}`); e.nichtAngemeldet = true; throw e; }
    if (ist_wandtext(text))         { const e = new Error(`Bot-Wand: ${text.slice(0,120)}`); e.umgeleitet = true; throw e; }
    if (!hat_ziel_erreicht(ZIEL, gelandet)) { const e = new Error(`umgeleitet: ${ZIEL} → ${gelandet}`); e.umgeleitet = true; throw e; }

    const datei = path.join(ERGEBNIS, `${auftrag.id}.png`);
    await seite.screenshot({ path: datei, fullPage: true });
    bilder.push(path.relative(REPO, datei));

    // Jedes beschreibbare Feld mit allem, was einen Selektor tragen kann.
    const felder = await seite.$$eval('input,textarea', els => els.map(el => ({
      tag: el.tagName.toLowerCase(),
      typ: el.getAttribute('type') || '',
      name: el.getAttribute('name') || '',
      id: el.getAttribute('id') || '',
      testId: el.getAttribute('data-test-id') || '',
      beschriftung: (el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').slice(0, 60),
      wert: (el.value || '').slice(0, 300),
      maxlen: el.getAttribute('maxlength') || '',
      sichtbar: !!(el.offsetWidth || el.offsetHeight),
    })).filter(f => f.sichtbar));

    const knoepfe = await seite.$$eval('button,[role="button"]', els => els.map(el => ({
      text: (el.innerText || '').trim().slice(0, 40),
      testId: el.getAttribute('data-test-id') || '',
      deaktiviert: el.getAttribute('aria-disabled') === 'true' || el.disabled === true,
      sichtbar: !!(el.offsetWidth || el.offsetHeight),
    })).filter(k => k.sichtbar && k.text));

    // Wo steht die falsche Zahl? Nicht raten — im gelesenen Text suchen.
    const chf65 = felder.filter(f => /CHF\s*65|ab\s*65/i.test(f.wert)).map(f => f.name || f.testId || f.id);
    return {
      ziel: gelandet, felder, knoepfe,
      feld_mit_chf65: chf65,
      hinweis: chf65.length ? 'Die falsche Schwelle steht in diesem Feld — Aenderung im Folgeauftrag.'
                            : 'CHF 65 steht in KEINEM sichtbaren Formularfeld. Vielleicht steht die '
                              + 'Angabe woanders (Board-Beschreibung, Werbekonto) — dann erst dort messen.',
      bilder,
    };
  } finally { await seite.close().catch(() => {}); }
}
