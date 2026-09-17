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
 */
import path from 'node:path';
import { ist_anmeldeseite, ist_wandtext } from '../../server/anmelde_erkennung.mjs';

const ZIEL = 'https://ch.pinterest.com/business/catalogs/4844353693835/diagnosticsv2/';

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const seite = await ctx.newPage();
  try {
    await seite.setViewportSize({ width: 1500, height: 1000 });
    await seite.goto(ZIEL, { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(7000);          // die Seite laedt Zahlen nach
    const datei = path.join(ERGEBNIS, `${auftrag.id}.png`);
    await seite.screenshot({ path: datei, fullPage: true });
    const ziel = seite.url();
    const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 12000);
    if (ist_anmeldeseite(ziel)) { const e = new Error(`nicht angemeldet — ${ziel}`); e.nichtAngemeldet = true; throw e; }
    if (ist_wandtext(text)) { const e = new Error(`Bot-Wand: ${text.slice(0,120)}`); e.umgeleitet = true; throw e; }
    return {
      ziel,
      // Zahlen mit ihrer Beschriftung, damit «2497» nicht ohne Bedeutung dasteht.
      zahlen: (text.match(/[\d'’.,]{1,9}\s*(?:Produkte?|Artikel|items?|products?)/gi) || []).slice(0, 20),
      begriffe: ['abgelehnt', 'rejected', 'Fehler', 'Warnung', 'in Bearbeitung', 'aktiv',
                 'nicht genehmigt', 'Problem'].filter(w => new RegExp(w, 'i').test(text)),
      seitentext: text.slice(0, 4000),
      bild: path.relative(REPO, datei),
    };
  } finally { await seite.close().catch(() => {}); }
}
