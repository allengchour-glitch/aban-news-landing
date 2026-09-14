#!/usr/bin/env node
/**
 * shop_vergleich.mjs — misst dieselben Conversion-/Vertrauens-/Gewichts-Kennzahlen auf FREMDEN
 * Shops und auf luxestyle.ch, damit «vergleiche andere Seite mit unserer» eine Tabelle ist und
 * kein Eindruck. Plattform-neutral (Shopify-Klassen werden NICHT vorausgesetzt).
 *
 *   node tools/shop_vergleich.mjs --selbsttest
 *   node tools/shop_vergleich.mjs <domain|url> [...]     Startseite + erste Produktseite je Shop
 *   node tools/shop_vergleich.mjs --nur-hp <domain> ...  nur Startseiten
 *
 * Regeln (Skill messgeraet-zuerst): Textpruefungen laufen auf dem SICHTBAREN Text (ohne script/
 * style/Kommentare); Markup-Pruefungen auf dem rohen HTML. Eine Antwort unter 20 KB ist KEIN
 * Messwert, sondern eine Sperre/Drossel (Galaxus 403 = 178 B, Jumbo 403 = 768 B, gemessen 14.09.).
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const MIN_BYTES = 20_000;

export function sichtbarerText(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}
const uniq = (arr) => [...new Set(arr.map((s) => s.toLowerCase()))];
const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };

/** Alle Kennzahlen einer Seite. Jede Zeile: was gezaehlt wird und WORAN. */
export function messe(html) {
  const t = sichtbarerText(html);
  const kb = Math.round(Buffer.byteLength(html, 'utf8') / 1024);
  const scripts = (html.match(/<script\b[^>]*\bsrc=/gi) || []).length;
  const inlineJsKb = Math.round((html.match(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) || []).join('').length / 1024);
  const styleKb = Math.round((html.match(/<style\b[\s\S]*?<\/style>/gi) || []).join('').length / 1024);
  const imgs = (html.match(/<img\b/gi) || []).length;
  const schwelle = t.match(/(?:Gratis-?\s?Versand|Kostenlose[rn]? Versand|Versandkostenfrei|Gratis ?Lieferung|Free shipping)[^.]{0,40}?(?:ab|from|über|ueber)\s*(?:CHF|Fr\.?)\s?(\d+)/i)
    || t.match(/ab\s*(?:CHF|Fr\.?)\s?(\d+)[^.]{0,40}?(?:gratis|kostenlos|versandkostenfrei)/i);
  const rueck = t.match(/(\d+)\s*(?:Tage|Tagen|Day|Days)\s*(?:R(?:ü|ue)ckgabe|Retoure|Umtausch|Geld-zur(?:ü|ue)ck|return)/i)
    || t.match(/(?:R(?:ü|ue)ckgabe|Retoure|Umtausch)[^.]{0,30}?(\d+)\s*Tage/i);
  // Lieferzeit: erst Werktage (eindeutig), dann «Lieferung/Versand … N Tage» — «30 Tage Rückgabe» darf NICHT zaehlen (Selbsttest 14.09.)
  const liefer = t.match(/\b(\d+\s*[–-]\s*\d+|\d+)\s*(?:Werktage|Arbeitstage)n?\b/i)
    || t.match(/(?:Lieferung|Lieferzeit|Versand|geliefert)[^.]{0,40}?\b(\d+\s*[–-]\s*\d+|\d+)\s*Tage/i);
  const rating = html.match(/"(?:ratingCount|reviewCount)"\s*:\s*"?(\d+)/i);
  const jdgmCount = [...html.matchAll(/data-number-of-reviews="(\d+)"/g)].map((m) => +m[1]);
  const bewZahl = rating ? +rating[1] : (jdgmCount.length ? Math.max(...jdgmCount) : null);
  const zahl = uniq(t.match(/\b(visa|mastercard|twint|postfinance|paypal|klarna|american express|amex|apple pay|google pay)\b/gi) || []);
  const zahlMarkup = uniq(html.match(/\b(visa|mastercard|twint|postfinance|paypal|klarna|american_express|amex|apple_pay|google_pay)\b/gi) || []);
  const headerHtml = (html.match(/<header\b[\s\S]*?<\/header>/i) || [''])[0];
  const navLinks = (headerHtml.match(/<a\b/gi) || []).length;
  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].replace(/\s+/g, ' ').trim();
  const desc = attr(html, /<meta\s+name="description"\s+content="([^"]*)"/i) || attr(html, /<meta\s+content="([^"]*)"\s+name="description"/i) || '';
  return {
    kb, scripts, inline_js_kb: inlineJsKb, style_kb: styleKb, imgs,
    shopify: /cdn\/shop\/|Shopify\.theme|myshopify\.com/i.test(html),
    json_ld_product: /"@type"\s*:\s*"Product"/i.test(html),
    h1_len: h1.length, title_len: title.length, desc_len: desc.length,
    gratis_schwelle: schwelle ? +schwelle[1] : null,
    rueckgabe_tage: rueck ? +rueck[1] : null,
    lieferzeit: liefer ? liefer[0].replace(/\s+/g, ' ') : null,
    twint: /\btwint\b/i.test(t), rechnung: /\b(Rechnung|Klarna)\b/i.test(t),
    schweiz_signal: /Schweiz|Swiss|🇨🇭|\bCH\b/.test(t),
    bewertungen: /jdgm|judge\.me|loox|yotpo|stamped|trustpilot|okendo|AggregateRating|reviews\.io|trusted ?shops/i.test(html),
    bewertungen_zahl: bewZahl,
    zahlungslogos: Math.max(zahl.length, zahlMarkup.length),
    chat_widget: /tidio|gorgias|crisp\.chat|zendesk|intercom|tawk|shopify-inbox|livechat|smartsupp|userlike/i.test(html),
    whatsapp: /wa\.me\/|whatsapp/i.test(html),
    telefon_sichtbar: /(\+41|0041|\b0\d{2}\s?\d{3}\s?\d{2}\s?\d{2}\b)/.test(t),
    presse: /bekannt aus|known from|presse|as seen in|featured in/i.test(t),
    newsletter: /type="email"|name="contact\[email\]"|newsletter/i.test(html),
    popup_werkzeug: /shopify-forms|forms\.shopify|static\.klaviyo\.com|klaviyo\.js|privy|omnisend|justuno|optimonk|wisepops|mailchimp/i.test(html),
    code_klartext: [...t.matchAll(/\bCode\s+([A-Z][A-Z0-9]{4,15})\b/g)].map((m) => m[1]),
    sticky_atc: /sticky[-_ ]?(add[-_ ]?to[-_ ]?cart|atc|buy|bar)|add-to-cart[-_]sticky/i.test(html),
    breadcrumb: /breadcrumb/i.test(html),
    accordion: /accordion|<details\b/i.test(html),
    cross_sell: /recommend|complementary|k(ö|oe)nnte dir auch|passt dazu|auch gekauft|you may also|upsell/i.test(html),
    video: /<video\b|product-media--video|youtube\.com\/embed|vimeo\.com/i.test(html),
    instagram: /instagram\.com\//i.test(html),
    nav_links_header: navLinks,
    h1, title,
  };
}

export function ersteProduktUrl(html, base) {
  const re = [/href="([^"]*\/products\/[^"#?]+)[^"]*"/i, /href="([^"]*\/(?:produkt|product|p)\/[^"#?]+)[^"]*"/i];
  for (const r of re) { const m = html.match(r); if (m) return new URL(m[1], base).href; }
  return null;
}

function hole(url) {
  try {
    const out = execFileSync('curl', ['-sL', '--max-time', '40', '-A', UA, '-w', '\n@@HTTP@@%{http_code}@@%{url_effective}', url], { maxBuffer: 64 * 1024 * 1024 }).toString();
    const i = out.lastIndexOf('\n@@HTTP@@');
    const [code, eff] = out.slice(i + 9).split('@@');
    return { html: out.slice(0, i), code: +code, url: eff };
  } catch (e) { return { html: '', code: 0, url }; }
}

const FELDER = ['kb', 'scripts', 'inline_js_kb', 'style_kb', 'imgs', 'nav_links_header', 'title_len', 'desc_len', 'h1_len', 'json_ld_product',
  'gratis_schwelle', 'rueckgabe_tage', 'lieferzeit', 'twint', 'rechnung', 'schweiz_signal', 'bewertungen', 'bewertungen_zahl', 'zahlungslogos',
  'chat_widget', 'whatsapp', 'telefon_sichtbar', 'presse', 'newsletter', 'popup_werkzeug', 'code_klartext', 'sticky_atc', 'breadcrumb', 'accordion',
  'cross_sell', 'video', 'instagram'];
const fmt = (v) => v === null || v === undefined ? '—' : Array.isArray(v) ? (v.length ? v.join('/') : '—') : v === true ? '✔' : v === false ? '✗' : String(v);

export function tabelle(zeilen) {
  const kopf = ['Kennzahl', ...zeilen.map((z) => z.name)];
  const out = ['| ' + kopf.join(' | ') + ' |', '|' + kopf.map(() => '---').join('|') + '|'];
  for (const f of FELDER) out.push('| ' + [f, ...zeilen.map((z) => z.m ? fmt(z.m[f]) : 'n/a')].join(' | ') + ' |');
  return out.join('\n');
}

function selbsttest() {
  let fehler = 0; const pruefe = (ok, was) => { console.log((ok ? '  ✔ ' : '  ✘ ') + was); if (!ok) fehler++; };
  const gut = '<header><a>1</a><a>2</a><a>3</a></header><h1>Ring Aurora</h1><script src="a.js"></script><script src="b.js"></script>'
    + '<div class="sticky-add-to-cart"></div><div class="breadcrumb"></div><details></details><p>Gratis-Versand ab CHF 50 · 30 Tage Rückgabe · TWINT · Rechnung · Lieferung in 2–7 Werktagen · Schweizer Shop</p>'
    + '<script type="application/ld+json">{"@type":"Product","aggregateRating":{"@type":"AggregateRating","ratingCount":"312"}}</script>'
    + '<p>visa mastercard twint klarna</p><img src="x"><img src="y"><input type="email"><a href="https://instagram.com/x">ig</a><p>Code WELCOME10</p>';
  const m = messe(gut);
  pruefe(m.gratis_schwelle === 50, `Versandschwelle gelesen: ${m.gratis_schwelle}`);
  pruefe(m.rueckgabe_tage === 30, `Rueckgabetage gelesen: ${m.rueckgabe_tage}`);
  pruefe(m.lieferzeit === '2–7 Werktagen', `Lieferzeit gelesen: ${m.lieferzeit}`);
  pruefe(m.twint && m.rechnung && m.schweiz_signal, 'TWINT/Rechnung/Schweiz erkannt');
  pruefe(m.bewertungen && m.bewertungen_zahl === 312, `Bewertungszahl aus JSON-LD: ${m.bewertungen_zahl}`);
  pruefe(m.zahlungslogos === 4, `Zahlungslogos entdoppelt: ${m.zahlungslogos}`);
  pruefe(m.sticky_atc && m.breadcrumb && m.accordion, 'sticky-ATC/Breadcrumb/Accordion im Markup');
  pruefe(m.scripts === 2 && m.imgs === 2 && m.nav_links_header === 3, `scripts=${m.scripts} imgs=${m.imgs} nav=${m.nav_links_header}`);
  pruefe(m.code_klartext[0] === 'WELCOME10' && m.json_ld_product && m.instagram && m.newsletter, 'Code/JSON-LD/Instagram/Newsletter erkannt');
  // Gegenproben: eine leere Seite darf NICHTS melden
  const leer = messe('<p>Willkommen in unserem Laden.</p>');
  pruefe(leer.gratis_schwelle === null && leer.rueckgabe_tage === null && leer.lieferzeit === null && !leer.twint && !leer.bewertungen
    && leer.bewertungen_zahl === null && leer.zahlungslogos === 0 && !leer.sticky_atc && leer.code_klartext.length === 0, 'Gegenprobe: leere Seite meldet nichts');
  pruefe(!messe('<script>var x="Gratis-Versand ab CHF 49"; var Code = "GEHEIM123";</script>').gratis_schwelle, 'Gegenprobe: Text im Skript zaehlt nicht');
  pruefe(messe('<p>Versand ab CHF 5.90 · Rückgabe 14 Tage</p>').rueckgabe_tage === 14, 'Rueckgabe in umgekehrter Wortstellung');
  pruefe(messe('<p>Ab CHF 80 versandkostenfrei</p>').gratis_schwelle === 80, 'Schwelle in umgekehrter Wortstellung');
  pruefe(ersteProduktUrl('<a href="/collections/x"></a><a href="/products/ring-aurora?variant=1">r</a>', 'https://shop.ch/') === 'https://shop.ch/products/ring-aurora', 'erste Produkt-URL (Shopify) gefunden');
  pruefe(ersteProduktUrl('<a href="/p/12345-ring">r</a>', 'https://shop.ch/') === 'https://shop.ch/p/12345-ring', 'erste Produkt-URL (generisch) gefunden');
  pruefe(ersteProduktUrl('<a href="/ueber-uns">x</a>', 'https://shop.ch/') === null, 'Gegenprobe: ohne Produktlink null');
  pruefe(tabelle([{ name: 'A', m }, { name: 'B', m: null }]).includes('| kb | 1 | n/a |'), 'Tabelle: fehlende Messung heisst n/a, nicht 0');
  console.log(fehler === 0 ? 'SELBSTTEST BESTANDEN' : `SELBSTTEST FEHLGESCHLAGEN (${fehler})`);
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selbsttest')) process.exit(selbsttest());
  const nurHp = argv.includes('--nur-hp');
  const ziele = argv.filter((a) => !a.startsWith('--'));
  const hp = [], pdp = [];
  for (const z of ziele) {
    const url = /^https?:/.test(z) ? z : `https://${z}`;
    const name = z.replace(/^https?:\/\/(www\.)?/, '').replace(/^www\./, '').split('/')[0];
    const r = hole(url);
    const ok = r.code === 200 && r.html.length >= MIN_BYTES;
    hp.push({ name, m: ok ? messe(r.html) : null });
    console.error(`${name} HP ${r.code} ${Math.round(r.html.length / 1024)} KB ${ok ? '' : '→ KEIN MESSWERT'}`);
    if (!nurHp && ok) {
      const pu = ersteProduktUrl(r.html, r.url);
      if (pu) {
        execFileSync('sleep', ['1']);
        const p = hole(pu); const pok = p.code === 200 && p.html.length >= MIN_BYTES;
        pdp.push({ name, m: pok ? messe(p.html) : null, url: pu });
        console.error(`${name} PDP ${p.code} ${Math.round(p.html.length / 1024)} KB ${pu}`);
      } else pdp.push({ name, m: null, url: null });
    }
    execFileSync('sleep', ['1']);
  }
  console.log('## Startseiten\n'); console.log(tabelle(hp));
  if (!nurHp) { console.log('\n## Produktseiten\n'); console.log(tabelle(pdp)); console.log('\n' + pdp.map((p) => `- ${p.name}: ${p.url || '—'}`).join('\n')); }
}
