/**
 * pinterest_stand.mjs — sagt, was auf dem Pinterest-Konto WIRKLICH steht. Rein lesend.
 *
 * Gebraucht am 17.09.2026, weil Auftrag 14 mit Stand «laufend» endete: das Anmelde-
 * Skript hat mit `systemctl stop luxe-agent.service` das Browserprofil freigeraeumt und
 * dabei den laufenden Auftrag abgeschossen. Was bis dahin geschah, weiss niemand.
 *
 * ⚠️ Genau dafuer gibt es den Stand «laufend»: NICHT blind wiederholen. Sind drei von
 *    sechs Boards schon angelegt, erzeugt ein zweiter Lauf Dubletten (CLAUDE.md Regel 2).
 *    Erst messen, dann entscheiden — diese Datei ist der Messschritt.
 */
import path from 'node:path';
import { ist_anmeldeseite } from '../../server/anmelde_erkennung.mjs';

const HOST = 'https://ch.pinterest.com';
const NUTZER = 'luxestylech';
const SOLL = ['Herrenmode Schweiz', 'Schmuck & Accessoires', 'Sommerkleider & Damenmode 2026',
              'Wellness & Beauty', 'Home & Geschenkideen', 'Schuhe & Sandalen'];

const grund = s => (s || '').toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const normen = s => [grund(s).replace(/&/g, 'und').replace(/[^a-z0-9]/g, ''),
                     grund(s).replace(/&/g, '').replace(/[^a-z0-9]/g, '')];

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const seite = await ctx.newPage();
  try {
    await seite.goto(`${HOST}/${NUTZER}/`, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(5000);
    const datei = path.join(ERGEBNIS, `${auftrag.id}.png`);
    await seite.screenshot({ path: datei, fullPage: true });
    const ziel = seite.url();
    if (ist_anmeldeseite(ziel)) {
      const e = new Error(`nicht angemeldet — ${ziel}`); e.nichtAngemeldet = true; throw e;
    }
    const adressen = await seite.$$eval(`a[href^="/${NUTZER}/"]`, as => [...new Set(
      as.map(a => (a.getAttribute('href') || '').split('/').filter(Boolean)[1] || '')
        .filter(h => h && !h.startsWith('_')))]);
    const da = new Set(adressen.flatMap(normen));
    const text = await seite.locator('body').innerText().catch(() => '');
    return {
      ziel,
      angemeldet: !/anmelden|registrieren|\bLog in\b|\bSign up\b/i.test(text.slice(0, 400)),
      board_adressen: adressen,
      soll_vorhanden: SOLL.filter(n => normen(n).some(k => da.has(k))),
      soll_fehlt:     SOLL.filter(n => !normen(n).some(k => da.has(k))),
      versandzusage_im_profil:
        /CHF\s*65/i.test(text) ? 'CHF 65 — FALSCH, muss 50 sein'
        : /CHF\s*50/i.test(text) ? 'CHF 50 — richtig'
        : 'keine CHF-Zusage im sichtbaren Text gefunden',
      bild: path.relative(REPO, datei),
    };
  } finally { await seite.close().catch(() => {}); }
}
