/**
 * bigbuy_kontakt_ansehen.mjs — sieht sich BigBuys Kontaktbereich an. REIN LESEND.
 *
 * Warum ueberhaupt: EUR 1'000.00 liegen seit dem 15.07.2026 im BigBuy-Wallet. Sechs
 * Mails an customers@bigbuy.eu, zurueck kamen DREI wortgleiche Textbausteine (08.09.,
 * 15.09., 17.09. 12:50) — jeder verweist auf das Ticketformular, Abteilung
 * «Administration». Der Kanal, den BigBuy selbst dreimal nennt, war nie benutzt, weil
 * bigbuy.eu/en/contact von unseren beiden Ausgaengen HTTP 403 gibt (16.09. gemessen).
 * Seit dem 17.09. ist der Agenten-Browser dort angemeldet — der Bereich ist erreichbar.
 *
 * ⛔ DIESES SKRIPT FUELLT NICHTS AUS UND SCHICKT NICHTS AB. Es beschreibt nur, was da
 *    ist: welche Abteilungen es gibt, welche Felder das Formular hat, wie sie heissen.
 *    Ohne diese Auskunft waere jeder Ausfuellversuch geraten — und bei einem Formular,
 *    an dem Geld haengt, wird nicht geraten.
 */
import path from 'node:path';
import { ist_anmeldeseite, ist_wandtext } from '../../server/anmelde_erkennung.mjs';

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const bilder = [];
  const seite = await ctx.newPage();
  const schuss = async (name) => {
    const d = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`);
    await seite.screenshot({ path: d, fullPage: true });
    bilder.push(path.relative(REPO, d));
  };
  try {
    await seite.goto('https://www.bigbuy.eu/en/contact', { waitUntil: 'load', timeout: 60000 });
    await seite.waitForTimeout(5000);
    await schuss('1-kontakt');
    const ziel = seite.url();
    const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 6000);
    if (ist_anmeldeseite(ziel)) { const e = new Error(`nicht angemeldet — ${ziel}`); e.nichtAngemeldet = true; throw e; }
    if (ist_wandtext(text)) { const e = new Error(`Bot-Wand statt Inhalt: ${text.slice(0,120)}`); e.umgeleitet = true; throw e; }

    // Was gibt es? Reiter/Abteilungen, Formularfelder, Schaltflaechen — nur auflisten.
    const reiter = await seite.$$eval('a,button,[role="tab"]',
      els => els.map(e => (e.innerText || '').trim()).filter(t => t && t.length < 60).slice(0, 60));
    const felder = await seite.$$eval('input,textarea,select', els => els.map(e => ({
      art: e.tagName.toLowerCase() + (e.type ? `[${e.type}]` : ''),
      name: e.getAttribute('name') || e.getAttribute('id') || '',
      platzhalter: e.getAttribute('placeholder') || '',
      sichtbar: !!(e.offsetWidth || e.offsetHeight),
      optionen: e.tagName === 'SELECT'
        ? [...e.options].map(o => o.text.trim()).slice(0, 25) : undefined,
    })).filter(f => f.art !== 'input[hidden]').slice(0, 40));

    return {
      ziel,
      angemeldet_als_kunde: /966388|logout|mein konto|my account|abmelden/i.test(text),
      reiter_und_knoepfe: [...new Set(reiter)],
      formularfelder: felder,
      seitentext_anfang: text.slice(0, 1200),
      bilder,
    };
  } finally { await seite.close().catch(() => {}); }
}
