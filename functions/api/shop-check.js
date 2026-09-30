// Cloudflare Pages Function — GET /api/shop-check?shop=<domain>
//
// Prueft den oeffentlichen Katalog eines Shopify-Shops und gibt die Befunde als JSON
// zurueck. Die Pruefer stehen in functions/_katalog_audit.mjs und sind dieselben, die
// `node tools/katalog_audit.mjs` benutzt — die Seite kann also nicht anders urteilen
// als die Kommandozeile.
//
// GELESEN WIRD NUR, WAS OHNEHIN OEFFENTLICH IST: `https://<shop>/products.json` ist
// Shopifys eigener oeffentlicher Endpunkt, ohne Schluessel, ohne Anmeldung. Es werden
// keine Zugangsdaten verlangt, nichts gespeichert und nichts veraendert.
//
// ⚠️ SICHERHEIT — hier gibt ein Fremder die Zieladresse vor:
//  * nur `a-z 0-9 . -`, mindestens ein Punkt, hoechstens 253 Zeichen
//  * IP-Adressen, `localhost` und interne Endungen werden abgewiesen (kein SSRF)
//  * immer https, Weiterleitungen werden NICHT verfolgt
//  * hoechstens MAX_SEITEN Seiten und ein hartes Zeitlimit, damit niemand den Rand
//    dieses Kontos als Lastgenerator gegen fremde Shops benutzt

import { holeSeite, pruefe } from '../_katalog_audit.mjs';
import { readProKey, validateLicense } from '../_pro.mjs';

const MAX_SEITEN = 2;          // 500 Produkte reichen fuer eine belastbare Aussage
const ZEITLIMIT_MS = 12000;
const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=900' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: H });

/** Adresse saeubern. Gibt `null` zurueck, wenn sie nicht geprueft werden darf. */
export function saubereDomain(roh) {
  if (typeof roh !== 'string') return null;
  let s = roh.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
  if (s.length === 0 || s.length > 253) return null;
  if (!/^[a-z0-9.-]+$/.test(s)) return null;
  if (!s.includes('.')) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return null;                 // IPv4
  if (/(^|\.)(localhost|local|internal|intranet|test|invalid|example)$/.test(s)) return null;
  if (/(^|\.)(0|127|10|192|172)\./.test(s)) return null;           // private Bereiche
  return s;
}

export async function onRequestGet({ request, env }) {
  const shop = saubereDomain(new URL(request.url).searchParams.get('shop') || '');
  if (!shop) return json({ ok: false, fehler: 'adresse_ungueltig', text: 'Bitte eine Shop-Adresse wie shop.ch eingeben.' }, 400);

  // aban Pro schaltet die VOLLSTAENDIGE Liste frei. Ohne Schluessel gibt es die Zahlen
  // und drei Belege je Art — genug, um zu pruefen, ob der Befund stimmt.
  // No-op-sicher: ohne Schluessel oder bei einem Fehler in der Pruefung bleibt es gratis.
  let pro = false;
  try {
    const schluessel = readProKey(request, null);
    if (schluessel) pro = !!(await validateLicense(schluessel, env)).ok;
  } catch { pro = false; }

  const schluss = Date.now() + ZEITLIMIT_MS;
  const alle = [];
  for (let seite = 1; seite <= MAX_SEITEN; seite++) {
    if (Date.now() > schluss) break;
    const r = await holeSeite(shop, seite);
    if (r.art === 'unerreichbar') return json({ ok: false, fehler: 'unerreichbar', shop, text: `${shop} ist nicht erreichbar.` }, 404);
    if (r.art === 'kein_shopify') return json({ ok: false, fehler: 'kein_shopify', shop, text: `${shop} antwortet, liefert aber keinen Shopify-Produktkatalog.` }, 422);
    if (r.art === 'gedrosselt') return json({ ok: false, fehler: 'gedrosselt', shop, text: 'Der Shop drosselt gerade. Bitte in ein paar Minuten nochmals.' }, 429);
    if (r.art === 'fehler') {
      if (seite === 1) return json({ ok: false, fehler: 'kein_shopify', shop, status: r.status, text: `${shop} liefert keinen oeffentlichen Shopify-Katalog (HTTP ${r.status}).` }, 422);
      break;
    }
    if (r.produkte.length === 0) break;
    alle.push(...r.produkte);
    if (r.produkte.length < 250) break;
  }

  if (alle.length === 0) return json({ ok: false, fehler: 'leer', shop, text: `${shop} liefert keine oeffentlichen Produkte.` }, 422);

  const e = pruefe(alle);
  // Nur eine Handvoll Belege je Art — der vollstaendige Bericht ist das Bezahlte.
  const beispiele = {};
  for (const b of e.befunde) {
    (beispiele[b.art] ||= []);
    if (beispiele[b.art].length < 3) beispiele[b.art].push({ titel: b.titel, beleg: b.beleg });
  }
  return json({
    ok: true,
    shop,
    pro,
    geprueft: e.produkte,
    katalogVollstaendig: e.produkte < MAX_SEITEN * 250,
    deutsch: e.deutsch,
    betroffeneProdukte: e.betroffeneProdukte,
    produkteMitDefekt: e.produkteMitDefekt,
    defekte: e.defekte,
    hinweise: e.hinweise,
    schwere: Object.fromEntries(Object.keys(e.nachArt).map((a) => [a, e.befunde.find((b) => b.art === a).schwere])),
    nachArt: e.nachArt,
    beispiele,
    // Die vollstaendige Liste — jedes betroffene Produkt mit Handle und woertlichem
    // Beleg — ist das Bezahlte. Ohne Pro bleibt sie weg, die Zahlen bleiben ehrlich.
    befunde: pro ? e.befunde : null,
    hinweis: 'Gelesen wurde ausschliesslich der oeffentliche Shopify-Endpunkt /products.json. Es wurden keine Zugangsdaten verwendet und nichts veraendert.',
  });
}
