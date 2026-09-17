/**
 * anmeldungen_pruefen.mjs — sagt, bei WELCHEN Diensten das Browserprofil des
 * Hetzner-Agenten angemeldet ist.
 *
 * Das ist der erste Auftrag, der nach dem einmaligen Einloggen Sinn ergibt: alle
 * uebrigen Browser-Aufgaben (Google Merchant, BigBuy-Ticket, Pinterest, TikTok)
 * haengen daran, und ohne diese Auskunft raet man. Rein LESEND — es wird nichts
 * angeklickt, nichts abgeschickt.
 *
 * Aufruf als Auftrag:
 *   { "id": "anmeldungen", "typ": "skript", "skript": "anmeldungen_pruefen.mjs" }
 */
import { ist_anmeldeseite, ist_zwischenseite, hat_ziel_erreicht } from '../../server/anmelde_erkennung.mjs';

const DIENSTE = [
  { name: 'Google Merchant', url: 'https://merchants.google.com/mc/overview',
    wofuer: 'Lieferland auf NUR Schweiz stellen — groesster Gratis-Verkehrs-Hebel' },
  { name: 'Shopify Admin',   url: 'https://au3j0y-hq.myshopify.com/admin/settings/billing',
    wofuer: 'Rechnung, Dateispeicher' },
  { name: 'BigBuy',          url: 'https://www.bigbuy.eu/en/contact',
    wofuer: 'Ticket fuer die EUR 1000 (von unserer IP HTTP 403)' },
  { name: 'Pinterest',       url: 'https://www.pinterest.ch/',
    wofuer: '117 geprüfte Pins warten auf einen OAuth-Klick' },
  { name: 'TikTok Studio',   url: 'https://www.tiktok.com/tiktokstudio/upload',
    wofuer: 'Videos hochladen, solange die API in Review ist' },
];

export default async function ({ ctx }) {
  const befunde = [];
  for (const d of DIENSTE) {
    const seite = await ctx.newPage();
    try {
      await seite.goto(d.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // Kurz warten: mehrere dieser Seiten leiten erst per JavaScript weiter,
      // und eine Weiterleitung, die man zu frueh misst, sieht aus wie Erfolg.
      await seite.waitForTimeout(3000);
      const ziel = seite.url();
      // ⚠️ 17.09.: `!ist_anmeldeseite(ziel)` allein hat Google Merchant als
      // «angemeldet» gemeldet, obwohl der Browser auf consent.google.com stand —
      // mit einer «Sign in»-Schaltflaeche oben rechts. Eine Einwilligungswand ist
      // keine Anmeldemaske und trotzdem kein Beweis fuer eine Anmeldung. Gefragt
      // wird deshalb, ob das ZIEL erreicht ist; alles andere ist «unklar», nicht
      // «ja». Ein ehrliches «weiss ich nicht» ist mehr wert als ein falsches Ja.
      befunde.push({
        dienst: d.name, wofuer: d.wofuer, ziel,
        angemeldet: ist_anmeldeseite(ziel) ? false
                  : hat_ziel_erreicht(d.url, ziel) ? true
                  : null,
        haenger: ist_zwischenseite(ziel) ? 'Zwischenseite (Einwilligung/Bot-Pruefung)' : undefined,
      });
    } catch (e) {
      // Ein Fehler ist KEINE Aussage ueber die Anmeldung — sonst faenden wir
      // eine tote Leitung und meldeten «nicht angemeldet».
      befunde.push({ dienst: d.name, wofuer: d.wofuer, angemeldet: null,
                     fehler: String(e.message || e).slice(0, 200) });
    } finally { await seite.close(); }
  }

  const ja  = befunde.filter(b => b.angemeldet === true).map(b => b.dienst);
  const nein = befunde.filter(b => b.angemeldet === false).map(b => b.dienst);
  const unklar = befunde.filter(b => b.angemeldet === null).map(b => b.dienst);
  return {
    zusammenfassung: `angemeldet: ${ja.join(', ') || '—'} · nicht angemeldet: ${nein.join(', ') || '—'}`
                   + (unklar.length ? ` · UNKLAR (Ziel nicht erreicht/Fehler): ${unklar.join(', ')}` : ''),
    befunde,
  };
}
