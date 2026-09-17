/**
 * storefront_wahrheit.mjs — prueft luxestyle.ch so, wie eine Kundin sie sieht.
 *
 * WARUM DAS NUR HIER GEHT (teuer gelernt 19.08.2026, zweimal an einem Tag):
 * Unsere eigene Rechenzentrums-IP bekommt vom Shopify-Edge eine EIGENE, stundenalte
 * Bot-Cache-Kopie. Belege damals: 125 Abrufe ueber 50 Minuten lieferten ausnahmslos die
 * alte Startseite, dieselbe Seite trug gleichzeitig alte UND neue Textbausteine, und
 * Stichproben schwankten dauerhaft — das sind mehrere parallele Kopien, keine
 * Konvergenz. `site_shot.mjs` teilt diese IP und beweist deshalb GAR NICHTS.
 * Der Hetzner-Server sitzt woanders im Netz. Er ist unser einziges ehrliches Fenster.
 *
 * Geprueft werden nur Dinge, die eine KUNDIN merkt, und jede Antwort ist ja/nein statt
 * Gefuehl. 77 % des Verkehrs ist Handy, also wird in Handy-Breite geladen.
 *
 * ⚠️ Rein lesend. Er meldet, er repariert nichts — Theme-Aenderungen gehoeren an die
 *    Admin-API, nicht in einen Browser.
 */
import path from 'node:path';
import { ist_anmeldeseite, ist_wandtext } from '../../server/anmelde_erkennung.mjs';

const SEITEN = [
  { name: 'startseite', url: 'https://luxestyle.ch/' },
  { name: 'kollektion', url: 'https://luxestyle.ch/collections/neu-eingetroffen' },
  { name: 'faq',        url: 'https://luxestyle.ch/pages/faq' },
];

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const befunde = [];
  for (const s of SEITEN) {
    const seite = await ctx.newPage();
    try {
      await seite.setViewportSize({ width: 390, height: 844 });   // 77 % Handy
      await seite.goto(s.url, { waitUntil: 'load', timeout: 60000 });
      await seite.waitForTimeout(3500);
      const datei = path.join(ERGEBNIS, `${auftrag.id}-${s.name}.png`);
      await seite.screenshot({ path: datei, fullPage: false });
      const text = await seite.locator('body').innerText().catch(() => '');
      const ziel = seite.url();

      // Handy-Breite: eine Seite, die breiter rendert als das Fenster, hat
      // Querscrollen — genau der Fehler vom 14.09. (1488 px auf 390 px Fenster).
      const breite = await seite.evaluate(() => ({
        dok: document.documentElement.scrollWidth, fenster: window.innerWidth,
      })).catch(() => null);

      befunde.push({
        seite: s.name, ziel,
        erreichbar: !ist_anmeldeseite(ziel) && !ist_wandtext(text) && text.length > 400,
        wand: ist_wandtext(text) || undefined,
        querscrollen: breite ? breite.dok > breite.fenster + 2 : null,
        breite,
        versandzusage: /Gratis(-Versand)?\s*ab\s*CHF\s*50/i.test(text) ? 'CHF 50 — richtig'
                     : /Gratis(-Versand)?\s*ab\s*CHF\s*\d+/i.exec(text)?.[0] || 'keine gefunden',
        preis_sichtbar: /CHF\s*\d/.test(text),
        // Fehlertexte, die eine Kundin wirklich zu sehen bekaeme:
        fehlertexte: ['Liquid error', 'translation missing', 'undefined', '404',
                      'Diese Seite existiert nicht'].filter(f => text.includes(f)),
        zeichen: text.length,
        bild: path.relative(REPO, datei),
      });
    } catch (e) {
      befunde.push({ seite: s.name, erreichbar: false, fehler: String(e.message).slice(0, 200) });
    } finally { await seite.close().catch(() => {}); }
  }
  const kaputt = befunde.filter(b => !b.erreichbar || b.querscrollen || (b.fehlertexte || []).length);
  return {
    zusammenfassung: kaputt.length
      ? `⚠️ ${kaputt.length} von ${befunde.length} Seiten mit Befund: ${kaputt.map(b => b.seite).join(', ')}`
      : `✅ ${befunde.length} Seiten sauber (von echter Besucher-IP gemessen)`,
    befunde,
  };
}
