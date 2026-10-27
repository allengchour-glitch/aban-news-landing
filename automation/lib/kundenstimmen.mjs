/**
 * Kundenstimmen für die Startseite: aus echten Judge.me-Bewertungen EINE je Produkt auswählen (rein, ohne Netz).
 *
 * Auslöser (Besitzer 27.10.2026, Screenshot): das Judge.me-Karussell zeigt die 15 NEUESTEN Bewertungen, und die stammen
 * blockweise vom selben Produkt (Ladegerät ×4, Blechschild ×5, Rucksack ×4) → dasselbe Produktbild mehrfach nebeneinander.
 * «keine doppelten Produkte, lieber unregelmässig abwechseln».
 *
 * Regeln (Auswahl, nie Umschreiben: der Text bleibt wörtlich, wie Judge.me ihn führt):
 *  - veröffentlicht, nicht versteckt, kuratiert «ok», 5 Sterne, Produktbewertung (nicht die Shop-Bewertung ohne Produkt)
 *  - Text 35–180 Zeichen, deutsch (kein Englisch/Chinesisch), ohne Einschränkung («aber», «leider», «nicht» …), ohne Links/Zahlenketten,
 *    ohne Hersteller-/CJ-Hinweise
 *  - Produkt aktiv und mit Bild; höchstens EINE Bewertung je Produkt; höchstens `proTyp` je Produktart (Vielfalt)
 *  - Name maskiert wie im Judge.me-Karussell («M***a»); E-Mail und Klarnamen verlassen diese Datei nie
 */

const NEGATIV = /(^|[^a-zäöüß])(aber|leider|jedoch|allerdings|nicht|kein|keine|keinen|zu (klein|gross|lang|kurz|eng|weit|dünn)|musste|schlecht|enttäuscht|enttäuschend|andere[rn]? (farbe|grösse|größe|modell)|falsch|defekt|kaputt|billig|riecht|stinkt|retour|zurückgeschickt|reklam|betrug|schrott|nie wieder|warte|wartet|verspätet|in ordnung|geht so|naja|durchschnitt|mittelm[äa]ssig|mässig|okay)([^a-zäöüß]|$)/i;
// ein Lob braucht ein Lobwort: «Ringbuch. Einfach zu nutzen.» wirbt für nichts
const LOB = /(super|perfekt|top|toll|schön|schon|liebe|empfehl|zufrieden|hervorragend|ausgezeichnet|qualität|hammer|wunderbar|gefällt|bequem|praktisch|stabil|einwandfrei|begeistert)/i;
const MARKTSCHREIER = /(aaa|\+\+|!!!|100 ?%ig)/i;
// Randsortimente (nicht das Kerngeschäft Mode, Schmuck, Taschen, Wohnen, Beauty): höchstens eine Karte je Art
const RAND = /(werkzeug|sport|elektronik|gadget|auto|fahrzeug|büro|haustier|garten|heimwerk)/i;
const ENGLISCH = /(^|[^a-z])(the|and|very|good|great|nice|quality|fast|love|perfect|product|thanks|recommend|item|works)([^a-z]|$)/gi;
const ASIATISCH = /[぀-ヿ㐀-鿿가-힯]/;
const HERSTELLER = /(hersteller|cj ?dropshipping|\bcj\b|aliexpress|amazon|temu|shein|dhgate|lieferant)/i;
const LINK_ZAHL = /(https?:|www\.|@|\d{5,})/i;
// konkrete Lieferdauer oder Herkunft im Text kollidiert mit den ehrlichen Lieferangaben des Shops («1 Monat», «aus Polen»)
const DAUER = /((^|[^a-zäöüß])(tage?n?|wochen?|monate?n?)([^a-zäöüß]|$)|(^|[^a-zäöüß])(polen|china|zoll))/i;

/** «Maria Muster» → «M***r»; leere oder Sammelnamen → null (dann ohne Namen). */
export function maskiereName(name) {
  const n = String(name || '').replace(/[\s.]+/g, ' ').trim();
  if (n.length < 2 || /^(cj|anonym|kunde|kundin|customer|guest|aliexpress|amazon)/i.test(n)) return null;
  const buchstaben = [...n.replace(/[^\p{L}]/gu, '')];
  if (buchstaben.length < 2) return null;
  return `${buchstaben[0].toUpperCase()}***${buchstaben[buchstaben.length - 1].toLowerCase()}`;
}

/** Text tauglich für die Startseite? Liefert null (ok) oder den Ablehngrund. */
export function textAblehnung(body) {
  const t = String(body || '').replace(/\s+/g, ' ').trim();
  if (ASIATISCH.test(t)) return 'asiatische Schrift';   // zuerst: chinesische Sätze sind in Zeichen kurz
  if (t.length < 35) return 'zu kurz';
  if (t.length > 180) return 'zu lang';
  if ((t.match(ENGLISCH) || []).length >= 2) return 'englisch';
  if (NEGATIV.test(t)) return 'Einschränkung';
  if (HERSTELLER.test(t)) return 'Hersteller-Hinweis';
  if (LINK_ZAHL.test(t)) return 'Link oder Zahlenkette';
  if (DAUER.test(t)) return 'Lieferdauer oder Herkunft';
  if (MARKTSCHREIER.test(t)) return 'Marktschreier';
  if (!LOB.test(t)) return 'ohne Lobwort';
  return null;
}

/** Eine Judge.me-Bewertung grundsätzlich zulässig (ohne Produktprüfung)? */
export function bewertungOk(r) {
  return !!r && r.rating === 5 && r.published === true && !r.hidden && r.curated === 'ok'
    && Number(r.product_external_id) > 0 && !!r.product_handle && textAblehnung(r.body) === null;
}

const kuerze = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };

/**
 * @param {object[]} reviews      Judge.me-Bewertungen (API `/api/v1/reviews`), neueste zuerst
 * @param {Map<string,{handle,title,type,bild,aktiv}>} produkte   nach product_external_id (Zahl als String)
 * @returns {{h,t,r,b,n,i}[]}     eine Karte je Produkt, in stabiler Reihenfolge (gemischt wird erst beim Anzeigen)
 */
export function waehle(reviews, produkte, { max = 24, proTyp = 3 } = {}) {
  const proProdukt = new Map();
  // Derselbe Text bei mehreren Produkten = vermutlich quer eingespielt (gemessen: «so weich an den Füssen» bei Teppich UND Kissenbezug) → ganz weglassen
  const textProdukte = new Map();
  const norm = r => String(r.body).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  for (const r of reviews) { if (!bewertungOk(r)) continue; const k = norm(r); if (!textProdukte.has(k)) textProdukte.set(k, new Set()); textProdukte.get(k).add(String(r.product_external_id)); }
  for (const r of reviews) {
    if (!bewertungOk(r)) continue;
    if (textProdukte.get(norm(r)).size > 1) continue;
    const p = produkte.get(String(r.product_external_id));
    if (!p || !p.aktiv || !p.bild || p.handle !== r.product_handle) continue;
    const alt = proProdukt.get(p.handle);
    // je Produkt die Bewertung mit dem ausführlichsten Text im erlaubten Bereich
    if (!alt || String(r.body).length > String(alt.r.body).length) proProdukt.set(p.handle, { r, p });
  }
  const arten = new Map(), aus = [];
  const kandidaten = [...proProdukt.values()].sort((a, b) => String(b.r.created_at).localeCompare(String(a.r.created_at)) || a.p.handle.localeCompare(b.p.handle));
  for (const { r, p } of kandidaten) {
    const art = String(p.type || '').toLowerCase();
    if ((arten.get(art) || 0) >= (RAND.test(art) ? 1 : proTyp)) continue;
    arten.set(art, (arten.get(art) || 0) + 1);
    aus.push({ h: p.handle, t: kuerze(p.title, 64), r: 5, b: String(r.body).replace(/\s+/g, ' ').trim(), n: maskiereName(r.reviewer && r.reviewer.name), i: p.bild });
    if (aus.length >= max) break;
  }
  // Derselbe maskierte Name auf mehreren Karten wirkt erfunden (CJ liefert fast überall «C***t»): dann ganz ohne Namen.
  const haeufig = new Map();
  for (const k of aus) if (k.n) haeufig.set(k.n, (haeufig.get(k.n) || 0) + 1);
  for (const k of aus) if (k.n && haeufig.get(k.n) > 1) k.n = null;
  return aus;
}
