// kommentar_klasse.mjs — EINE Quelle, wie ein Kommentar unter unseren Posts einzuordnen ist (18.10.2026).
//
// Warum: Alle 12 Kommentare unter den Instagram-Posts waren Bots («Amazing post 🔥 please send this to us», «Sende mir
// diesen Beitrag.😍»). Die Moderation liess sie stehen, weil ihr GENUINE-Schutz «love|😍» als echtes Lob wertet, und der
// Antworter (Cron 3×/Tag, seit 13.06. pausiert) hätte sie mit «Mit Code WELCOME10 gibt’s –10 %» beantwortet. Beide rufen
// jetzt diese Datei: ZUERST der Bot-Test, dann Spam, erst dann Frage/Lob.
//
// klasse(text) → 'leer' | 'bot' | 'spam' | 'frage' | 'lob' | 'allgemein'
// frageThema(text) → 'versand' | 'groesse' | 'preis' | 'verfuegbar' | 'rueckgabe' | 'zahlung' | 'echtheit' | 'material' | 'allgemein'

// Einladungs-Bots: bitten, den Beitrag zu «senden» (Engagement-Farm), loben nur allgemein.
export const BOT = [
  /\b(please\s+)?(send|share|forward|dm)\b[^.!?\n]{0,30}\b(this|that|it)\b[^.!?\n]{0,12}\b(post|reel|video|pic|photo|content|to us|to me)\b/i,
  /\b(send|share)\b\s+(me|us)\s+(this|the|that)\b/i,
  /\bplease\s+send\b/i,
  /\bsend\s+(this\s+)?post\b/i,
  /\b(sende|sendet|schick|schicke|schickt|teile|teil)\b[^.!?\n]{0,12}\b(mir|uns)\b[^.!?\n]{0,16}\b(beitrag|post|video|reel|bild|foto)\b/i,
  /\b(this|dieser)\s+(shot|post|content|photo|pic|beitrag)\s+(is|ist)\s+(really\s+|so\s+|sehr\s+)?(great|amazing|awesome|super|toll)\b[^.!?\n]{0,40}\b(send|share|senden|schick)/i,
  /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*(amazing|great|awesome|love)\s+(post|content|shot|photo)\b[^.!?\n]{0,30}\b(send|share|dm)\b/iu,
];

// Werbung/Betrug/Wachstumsangebote (aus der Moderation übernommen).
export const SPAM = [
  /\bdm\b|\bdms\b|message me|inbox me|\bpm me\b|hit me up|text me/i,
  /grow (your|ur) (page|account|business|brand|followers)|account grow|page grow/i,
  /followers?|engagement|likes? boost|boost (your|ur)|promote (your|ur)|promotion/i,
  /social ?media (manager|marketing|expert|management)|digital marketer|i('?m| am) a marketer|marketing agency|\bagency\b/i,
  /increase (your )?(sales|revenue|customers|reach)|more (customers|clients|sales)|drive sales|get clients/i,
  /make money|earn (money|cash|\$)|passive income|\bprofit\b|\binvest(ment|or)?\b|trading|forex|crypto|bitcoin|btc|usdt|binary option/i,
  /cheap|affordable price|best price for (followers|likes)|buy (followers|likes)/i,
  /whats ?app|wa\.me|t\.me|telegram|join my|click (the )?link|link in bio.*(dm|earn)/i,
  /check (out )?my (profile|page|bio)|follow me|follow back|f4f|l4l|sub4sub/i,
  /congratulations.*(won|winner|selected)|you('?ve| have) been selected|claim (your )?prize|free gift card/i,
  /\+\d[\d\s().-]{7,}/,
  /https?:\/\/(?!(?:[a-z0-9-]+\.)*luxestyle\.ch)/i,
  /\bwww\.(?!luxestyle)/i,
];

export const THEMEN = [
  ['rueckgabe', /zur(ü|ue)ck(senden|schicken|geben)|retour|umtausch|r(ü|ue)ckgabe|widerruf|erstattung|refund|return/i],
  ['versand', /versand|liefer|wann kommt|geliefert|sendung|paket|tracking|sendungsverfolgung|shipping|delivery|how long/i],
  ['groesse', /gr(ö|oe)sse|size|passt|f(ä|ae)llt (gross|klein|gr)|masse|ma(ß|ss)e|\bcm\b|welche gr/i],
  ['zahlung', /twint|klarna|rechnung|paypal|kreditkarte|bezahl|zahlung|vorkasse|apple pay/i],
  ['preis', /preis|kostet|\bchf\b|rabatt|code|gutschein|discount|price|wie viel|wieviel|g(ü|ue)nstiger/i],
  ['verfuegbar', /verf(ü|ue)gbar|auf lager|lieferbar|ausverkauft|wieder da|restock|available|in stock|gibt es (es|den|die|das)/i],
  ['echtheit', /echt|fake|seri(ö|oe)s|vertrauensw|scam|betrug|abzocke|legit/i],
  ['material', /material|stoff|qualit(ä|ae)t|baumwolle|leder|wasserfest|waschbar|pflege/i],
];
const LOB = /sch(ö|oe)n|wow|love|liebe|traumhaft|h(ü|ue)bsch|toll|nice|gef(ä|ae)llt|cute|beautiful|perfekt|mega|super|😍|🤍|❤️|😻|🔥|👏|💛|🥰/i;

export function istBot(t = '') { t = String(t).trim(); return !!t && BOT.some(re => re.test(t)); }
export function istSpam(t = '') { t = String(t).trim(); return !!t && SPAM.some(re => re.test(t)); }
export function frageThema(t = '') { for (const [n, re] of THEMEN) if (re.test(t)) return n; return 'allgemein'; }
export function klasse(t = '') {
  t = String(t).trim();
  if (!t) return 'leer';
  if (istBot(t)) return 'bot';
  // Echte Frage vor Spam: «Kostet das CHF 20? Schreib mir per WhatsApp» soll nicht still verschwinden.
  const thema = frageThema(t);
  if (thema !== 'allgemein' && /\?|^(wie|was|wann|wo|welche|gibt|kann|ist|sind|habt|hat|do you|does|can|how|is)\b/i.test(t) && !istSpam(t)) return 'frage';
  if (istSpam(t)) return 'spam';
  if (thema !== 'allgemein') return 'frage';
  if (LOB.test(t)) return 'lob';
  return 'allgemein';
}

// Selbsttest: node automation/lib/kommentar_klasse.mjs --selbsttest
const FAELLE = [
  // [Text, erwartet] — die ersten 12 sind die echten Bot-Kommentare vom 10.–18.10.2026
  ['Love this content 😍 send this post please', 'bot'],
  ['Amazing post 🔥 please send this to us', 'bot'],
  ['Sende mir diesen Beitrag.😍', 'bot'],
  ['💞This shot is really great, please send me this post', 'bot'],
  ['send me this post', 'bot'],
  ['Schick mir bitte diesen Beitrag', 'bot'],
  ['Wie lange dauert der Versand in die Schweiz?', 'frage'],
  ['Welche Grösse soll ich bei 170 cm nehmen?', 'frage'],
  ['Gibt es das Kleid auch in Schwarz?', 'frage'],
  ['Kann man mit TWINT bezahlen?', 'frage'],
  ['Ist der Shop seriös?', 'frage'],
  ['Wie kann ich etwas zurücksenden?', 'frage'],
  ['Wunderschön, das Kleid 😍', 'lob'],
  ['Mega schöne Farbe 🤍', 'lob'],
  ['Grow your page with us, DM me', 'spam'],
  ['Earn money from home https://example.com', 'spam'],
  ['Schick mir bitte den Link zum Kleid', 'allgemein'],
  ['', 'leer'],
];
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv.includes('--selbsttest')) {
  let f = 0;
  for (const [t, soll] of FAELLE) { const ist = klasse(t); if (ist !== soll) { f++; console.log(`✗ «${t}» → ${ist}, erwartet ${soll}`); } }
  console.log(f ? `${f} von ${FAELLE.length} Fällen falsch` : `OK ${FAELLE.length}/${FAELLE.length}`);
  process.exit(f ? 1 : 0);
}
