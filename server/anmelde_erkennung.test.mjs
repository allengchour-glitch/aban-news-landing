/**
 * Gegenprobe fuer den Anmelde-Melder. Aufruf:
 *   /opt/node22/bin/node server/anmelde_erkennung.test.mjs
 *
 * Ein Melder, der «0» meldet, muss zeigen, dass er auch «1» kann — deshalb
 * werden beide Richtungen geprueft, mit einem bewussten Koeder auf jeder Seite.
 */
import { ist_anmeldeseite } from './anmelde_erkennung.mjs';

const SOLL_JA = [
  'https://accounts.google.com/v3/signin/identifier?service=merchants',
  'https://accounts.shopify.com/lookup?rid=abc',
  'https://au3j0y-hq.myshopify.com/admin/auth/login',
  'https://www.tiktok.com/login?redirect_url=%2Fupload',
  'https://www.pinterest.ch/login/',
  'https://www.facebook.com/login.php?next=x',
  'https://www.bigbuy.eu/en/login',
  'https://example.com/users/sign_in',
];

const SOLL_NEIN = [
  'https://luxestyle.ch/',
  'https://luxestyle.ch/pages/faq',
  'https://merchants.google.com/mc/products/diagnostics',
  'https://au3j0y-hq.myshopify.com/admin/settings/billing',
  'https://www.tiktok.com/tiktokstudio/upload',
  'https://www.bigbuy.eu/en/contact',
  'https://luxestyle.ch/collections/login-armband',  // Koeder: «login» im Pfad, kein Anmeldeweg
  'https://www.pinterest.ch/luxestylech/',
];

let fehler = 0;
for (const u of SOLL_JA)   if (!ist_anmeldeseite(u)) { console.log('VERPASST :', u); fehler++; }
for (const u of SOLL_NEIN) if ( ist_anmeldeseite(u)) { console.log('FEHLALARM:', u); fehler++; }

console.log(fehler === 0
  ? `✅ ${SOLL_JA.length} Anmeldeseiten erkannt, ${SOLL_NEIN.length} echte Seiten durchgelassen`
  : `❌ ${fehler} Fehler`);
process.exit(fehler === 0 ? 0 : 1);
