/* LuxeStyle — responder.mjs  (GEMEINSAME Chat-Brain für ALLE Auto-Responder)
 * Zweisprachig (DE/Mundart + EN), themen-erkennend, Spam/Verkäufer-Filter.
 * Importierbar von allen PC-Bots (ig-dm, tiktok-dm, tutti/anibis-chat) — gleiche Qualität überall.
 * Der Cloudflare-Worker hat dieselbe Logik eingebacken (IG/FB-Kommentare).
 *   import { reply, isSpam, topicOf } from '../chat/responder.mjs'
 *   const answer = reply(eingehenderText);   // null wenn Spam (nicht antworten)
 */
export const SPAM_RE = /https?:\/\/|t\.me\/|wa\.me\/|whatsapp|telegram|seguidores|followers|promo(c|t)|\bdm\b|inbox me|check (my|out)|verkaufe|crypto|invest|follow.?back|collab|wholesale|supplier|manufactur|we (sell|offer|provide)|best price|interested in|boost (your|sales)|grow your|increase your (sales|follow)|link in bio|cheap|business inquir|sponsor/i;

const TOPIC = [
  ['versand', /versand|liefer|wann kommt|geliefert|sendung|paket|shipping|delivery|how long|when.*arrive/i],
  ['groesse', /grösse|groesse|\bsize\b|passt|fällt (gross|klein)|masse|grössi|fit/i],
  ['preis',   /preis|kostet|chf|rabatt|code|gutschein|zahlung|twint|rechnung|bezahl|price|cost|discount|wie tüür|wieviel|how much/i],
  ['verfueg', /verfügbar|lager|available|noch da|ausverkauft|stock|in stock|gits|hesch/i],
  ['wo',      /\bwo\b|\blink\b|wo chauf|wo gits|woher|where|how (do i|to) (buy|order)|bestelle/i],
  ['farbe',   /farb|colou?r|welche farbe|schwarz|wiis|weiss|rot|blau/i],
  ['retoure', /retour|rückgab|umtausch|zurück|reklamation|return|refund/i],
  ['lob',     /schön|geil|nice|wow|traumhaft|liebe|love|beautiful|gorgeous|amazing|wunderschön|hammer|mega|härzig|😍|❤️|🔥|💕|🥰/i],
];
const DE = {
  versand: ['Mir liefere schweizwiit – gratis ab CHF 65 🚚🇨🇭 Meh uf luxestyle.ch', 'Schweizwiite Versand, gratis ab CHF 65 📦 luxestyle.ch ✨'],
  groesse: ['D Grössetabälle findsch bim Produkt uf luxestyle.ch 📏', 'Alli Grösse S–XL stahn bim Artikel 📏 luxestyle.ch'],
  preis:   ['Pris staht im Shop 👉 luxestyle.ch · mit WELCOME10 –10% 🤍', 'Zahle mit TWINT/Charte 💳 WELCOME10 = –10% · luxestyle.ch'],
  verfueg: ['Jaa, a Lager & sofort bestellbar ✅ luxestyle.ch 🇨🇭', 'Isch verfügbar! 🛍️ luxestyle.ch ✅'],
  wo:      ['Alles uf 👉 luxestyle.ch 🛍️🇨🇭', 'Direkt im Shop: luxestyle.ch ✨ (–10% mit WELCOME10)'],
  farbe:   ['D verfügbare Farbe gsehsch bim Produkt 🎨 luxestyle.ch'],
  retoure: ['Kei Sorg – 30 Täg Rückgab 🤍 Mir helfe gern, eifach melde!'],
  lob:     ['Merci vilmal! 🤍 Das freut üs mega 🥹', 'Aaaw danke dir!! 😍 luxestyle.ch ✨', 'Mega lieb, merci! 💕'],
  allgemein: ['Merci vilmal! 🙏🇨🇭 Schau gern verbii uf luxestyle.ch ✨', 'Danke dir! 😍 Meh devo uf luxestyle.ch 🛍️'],
};
const EN = {
  versand: ['We ship across Switzerland – free over CHF 65 🚚 luxestyle.ch', 'Swiss-wide shipping, free over CHF 65 📦 luxestyle.ch ✨'],
  groesse: ['You\'ll find the size chart on each product 📏 luxestyle.ch', 'All sizes S–XL are on the product page 📏 luxestyle.ch'],
  preis:   ['Price is on the site 👉 luxestyle.ch · WELCOME10 = –10% 🤍', 'Check luxestyle.ch · use WELCOME10 for –10% ✨'],
  verfueg: ['Yes, in stock & ready to order ✅ luxestyle.ch', 'Available now! 🛍️ luxestyle.ch ✅'],
  wo:      ['Everything\'s at 👉 luxestyle.ch 🛍️', 'Find it at luxestyle.ch ✨ (–10% with WELCOME10)'],
  farbe:   ['Available colors are shown on the product page 🎨 luxestyle.ch'],
  retoure: ['No worries – 30-day returns 🤍 just reach out, we\'ll help!'],
  lob:     ['Thank you so much! 🤍 Means a lot 🥹', 'Aw, thank you! 😍 luxestyle.ch ✨', 'So kind, thanks! 💕'],
  allgemein: ['Thanks so much! 🙏 Have a look at luxestyle.ch ✨', 'Thank you! 😍 More at luxestyle.ch 🛍️'],
};
export const isSpam = (t = '') => SPAM_RE.test(t);
export const topicOf = (t = '') => { for (const [n, re] of TOPIC) if (re.test(t)) return n; return 'allgemein'; };
const isDE = (t = '') => /[äöüß]|\b(der|die|das|und|ist|wie|wo|ich|du|mit|für|nicht|sehr|schön|grösse|preis|wieviel|hesch|isch|gits|liefer|merci|hoi|gäll|chauf|tüür)\b/i.test(t);
export function reply(t = '') {
  if (isSpam(t)) return null;                 // Verkäufer/Spam -> nicht antworten
  const set = isDE(t) ? DE : EN;
  const a = set[topicOf(t)] || set.allgemein;
  return a[Math.floor(Math.random() * a.length)];
}
