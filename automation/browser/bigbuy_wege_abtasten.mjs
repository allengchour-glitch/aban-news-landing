/**
 * bigbuy_wege_abtasten.mjs — sucht einen Weg zu BigBuy, der offen ist. REIN LESEND.
 *
 * STAND DER MESSUNGEN (17.09.2026):
 *  · Mail an customers@bigbuy.eu: SECHS Mails, DREI wortgleiche Auto-Antworten. Tot.
 *  · REST-API: `purse.json` gibt 401 «Invalid Token» — und zwar mit unserem echten
 *    Schluessel GENAUSO wie mit einem absichtlich falschen. Der Schluessel ist tot,
 *    das Abo endete am 15.09. Der 400er auf `customer.json` sah nach einem Hinweis aus
 *    und war keiner: der falsche Schluessel liefert dort dieselbe 400.
 *  · `/en/contact` im Agenten-Browser: Cloudflare-Wand, 0 Formularfelder.
 *
 * Also nicht «es geht nicht», sondern: WELCHER Weg ist offen? Nicht jede Seite eines
 * Shops ist gleich streng geschuetzt, und im Impressum steht die rechtlich zustaendige
 * Anschrift — bei einer offenen Forderung von EUR 1'000.00 ist das der belastbarste
 * Kanal, den es gibt. Dieses Skript tastet Adressen ab und sammelt Kontaktangaben.
 *
 * ⛔ Es klickt nichts, fuellt nichts, schickt nichts. Es liest und berichtet.
 */
import path from 'node:path';
import { ist_anmeldeseite, ist_wandtext } from '../../server/anmelde_erkennung.mjs';

const ZIELE = [
  'https://www.bigbuy.eu/en/',
  'https://www.bigbuy.eu/en/legal-notice',
  'https://www.bigbuy.eu/en/terms-and-conditions',
  'https://www.bigbuy.eu/en/privacy-policy',
  'https://www.bigbuy.eu/en/about-us',
  'https://help.bigbuy.eu/',
  'https://support.bigbuy.eu/',
];

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const befunde = [], mails = new Set(), telefone = new Set();
  for (const url of ZIELE) {
    const seite = await ctx.newPage();
    try {
      await seite.goto(url, { waitUntil: 'load', timeout: 45000 });
      await seite.waitForTimeout(3000);
      const ziel = seite.url();
      const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 20000);
      const wand = ist_wandtext(text);
      const stand = wand ? 'bot-wand'
                  : ist_anmeldeseite(ziel) ? 'anmeldeseite'
                  : text.length > 500 ? 'offen' : 'leer';
      if (stand === 'offen') {
        // Nur echte Adressen sammeln, keine Bilddateien mit @ im Namen.
        for (const m of text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []) mails.add(m.toLowerCase());
        for (const t of text.match(/\+\d[\d\s().-]{7,20}/g) || []) telefone.add(t.trim());
      }
      // Der erste offene Treffer bekommt ein Bild, mehr braucht es nicht.
      let bild;
      if (stand === 'offen' && befunde.every(b => b.stand !== 'offen')) {
        const d = path.join(ERGEBNIS, `${auftrag.id}-offen.png`);
        await seite.screenshot({ path: d, fullPage: false });
        bild = path.relative(REPO, d);
      }
      befunde.push({ url, ziel, stand, zeichen: text.length, bild });
    } catch (e) {
      befunde.push({ url, stand: 'fehler', fehler: String(e.message).slice(0, 140) });
    } finally { await seite.close().catch(() => {}); }
  }
  const offen = befunde.filter(b => b.stand === 'offen').map(b => b.url);
  return {
    zusammenfassung: offen.length
      ? `${offen.length} von ${ZIELE.length} Adressen offen — Cloudflare schuetzt also NICHT alles`
      : `alle ${ZIELE.length} Adressen dicht — BigBuy sperrt den Agenten vollstaendig aus`,
    offene_adressen: offen,
    gefundene_mailadressen: [...mails].sort(),
    gefundene_telefonnummern: [...telefone].sort(),
    befunde,
  };
}
