/**
 * Gegenprobe fuer den Anmelde-Melder. Aufruf:
 *   /opt/node22/bin/node server/anmelde_erkennung.test.mjs
 *
 * Ein Melder, der «0» meldet, muss zeigen, dass er auch «1» kann — deshalb
 * werden beide Richtungen geprueft, mit einem bewussten Koeder auf jeder Seite.
 */
import { ist_anmeldeseite, hat_ziel_erreicht, ist_wandtext } from './anmelde_erkennung.mjs';

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

// ── Zweite Frage: «bin ich angekommen?» ────────────────────────────────────
// Die beiden ersten Faelle sind die echten Fehlalarme vom 17.09. — sie standen
// als «ok» bzw. «angemeldet: true» in einer Quittung, obwohl nichts erreicht war.
const ZIEL_NEIN = [
  ['https://merchants.google.com/mc/products/diagnostics',
   'https://consent.google.com/m?continue=https://www.google.com/retail/merchant-center/'],
  ['https://admin.shopify.com/store/au3j0y-hq/marketing',
   'https://admin.shopify.com/challenge?verify=1'],
  ['https://www.bigbuy.eu/en/contact', 'https://www.bigbuy.eu/en/login'],
  ['https://merchants.google.com/mc/overview', 'https://www.google.com/sorry/index?continue=x'],
  ['https://luxestyle.ch/', 'https://beispiel-parkdomain.com/'],
];
const ZIEL_JA = [
  ['https://merchants.google.com/mc/overview', 'https://merchants.google.com/mc/overview'],
  ['https://www.pinterest.com/', 'https://ch.pinterest.com/'],                 // Landesausgabe
  ['https://au3j0y-hq.myshopify.com/admin/settings/billing',
   'https://admin.shopify.com/store/au3j0y-hq/settings/billing'],              // Shopifys Umzug
  ['https://luxestyle.ch/pages/faq', 'https://luxestyle.ch/pages/faq?x=1'],
  ['https://www.bigbuy.eu/en/contact', 'https://www.bigbuy.eu/en/contact#tabpanel3'],
];
for (const [a, b] of ZIEL_NEIN)
  if ( hat_ziel_erreicht(a, b)) { console.log('ZIEL-FEHLALARM:', b); fehler++; }
for (const [a, b] of ZIEL_JA)
  if (!hat_ziel_erreicht(a, b)) { console.log('ZIEL-VERPASST :', b); fehler++; }

// ── Dritte Frage: steht eine Wand vor der Seite, ohne dass die URL es sagt? ──
const WAND_JA = [
  // Der echte BigBuy-Fall vom 17.09., wortgleich aus der Quittung von Auftrag 18:
  'www.bigbuy.eu\nSicherheitsüberprüfung wird durchgeführt\n\nDiese Website nutzt einen '
    + 'Sicherheitsservice, um sich vor böswilligen Bots zu schützen.\nRay ID: a3ca2241ac1e86d9',
  'Deine Verbindung muss verifiziert werden, bevor du fortfahren kannst\nBestätigen Sie, dass Sie ein Mensch sind',
  'Just a moment...\nEnable JavaScript and cookies to continue',
];
const WAND_NEIN = [
  // Koeder: unser eigener Shop wirbt mit «sichere Zahlung» — darf nie als Wand gelten.
  '🔒 Sichere Zahlung mit Klarna und TWINT · 30 Tage Rückgabe · Gratis ab CHF 50',
  '🇨🇭 2\'400 Artikel ab Schweizer Lager — in 1–2 Tagen bei dir · 🚚 Gratis ab CHF 50',
  // Koeder: ein langer, ECHTER Text, der die Wortmarke zufaellig enthaelt.
  'Ratgeber: Warum Shops eine Bot-Pruefung einsetzen. '.repeat(30)
    + 'Dort steht dann «Bestätigen Sie, dass Sie ein Mensch sind».',
  '',
];
for (const t of WAND_JA)   if (!ist_wandtext(t)) { console.log('WAND-VERPASST :', t.slice(0,40)); fehler++; }
for (const t of WAND_NEIN) if ( ist_wandtext(t)) { console.log('WAND-FEHLALARM:', t.slice(0,40)); fehler++; }

console.log(fehler === 0
  ? `✅ ${SOLL_JA.length} Anmeldeseiten erkannt, ${SOLL_NEIN.length} echte Seiten durchgelassen · `
    + `${ZIEL_NEIN.length} verfehlte Ziele erkannt, ${ZIEL_JA.length} erreichte durchgelassen · `
    + `${WAND_JA.length} Bot-Wände erkannt, ${WAND_NEIN.length} echte Texte durchgelassen`
  : `❌ ${fehler} Fehler`);
process.exit(fehler === 0 ? 0 : 1);
