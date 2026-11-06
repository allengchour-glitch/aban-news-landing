// NUR LESEN (L0, 05.11.2026): Reicht die Druckdatei des live wirksamen Editors v5 (data-ref × data-ref·data-ratio px) für die Mindest-dpi von Printful?
// Rechnet je Shopprodukt und Variante mit automation/lib/printful_bestellweg.mjs (druckdateiFuer, aufloesungPruefen) und den Printful-Katalogdaten (Scratch, GEMESSEN 05.11.).
//   node dpi_pruefen.mjs [KATALOG_ORDNER] [AUS.json]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { shopifyGql } from '../../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../../automation/lib/shopify_secret.mjs';
import { druckdateiFuer, aufloesungPruefen } from '../../../automation/lib/printful_bestellweg.mjs';
const KAT = process.argv[2] || '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/sg/katalog';
const AUS = process.argv[3] || new URL('./dpi_ergebnis.json', import.meta.url).pathname;
const HIER = new URL('.', import.meta.url).pathname;
const gp = JSON.parse(readFileSync(HIER + '../werkzeuge/preise_gegenprobe.json', 'utf8'));
const handles = [...new Set(gp.zeilen.map((z) => z[0]))];
const varZuModell = new Map(); const kat = {};
for (const f of readdirSync(KAT).filter((x) => /^\d+\.json$/.test(x))) {
  const d = JSON.parse(readFileSync(`${KAT}/${f}`, 'utf8')); kat[d.id] = d;
  for (const v of d.varianten) varZuModell.set(Number(v.id), d.id);
}
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const erg = [];
for (const h of handles) {
  const p = (await q(`query($h:String!){productByHandle(handle:$h){id title status descriptionHtml}}`, { h })).productByHandle;
  if (!p) { erg.push({ handle: h, fehler: 'nicht im Shop' }); continue; }
  const m = /<[^>]*lspod-designer[^>]*>/i.exec(p.descriptionHtml || '');
  const tag = m ? m[0] : '';
  const att = (n) => { const x = new RegExp(n + '\\s*=\\s*["\']([^"\']*)["\']', 'i').exec(tag); return x ? x[1] : null; };
  let U = parseInt(att('data-ref'), 10); if (!(U >= 600)) U = 1200;
  let at = parseFloat(att('data-ratio')); if (!(at > 0)) at = 1;
  const masse = { breite: U, hoehe: Math.round(U * at) };
  const zeilen = gp.zeilen.filter((z) => z[0] === h);
  const proVar = []; let ohneDaten = 0;
  for (const z of zeilen) {
    const vid = z[3], mid = varZuModell.get(Number(vid));
    const d = mid ? kat[mid] : null;
    if (!d) { ohneDaten++; continue; }
    let df = null;
    for (const typ of ['front', 'default']) { df = druckdateiFuer({ printfiles: d.printfiles, vid, typ, produkt: d.produkt }); if (df) break; }
    if (!df) { ohneDaten++; continue; }
    const minDpi = d.templates && d.templates.min_dpi;
    const a = aufloesungPruefen({ masse, druckdatei: df, minDpi });
    proVar.push({ sku: z[2], modell: mid, dpi: Math.round(a.dpi * 10) / 10, minDpi: minDpi ?? null, ok: a.ok });
  }
  const n = proVar.length, schlecht = proVar.filter((x) => !x.ok).length;
  erg.push({ handle: h, status: p.status, productId: p.id, hatEditor: !!m, datei: `${masse.breite}×${masse.hoehe}`, ratio: at, ref: U, varianten: zeilen.length, geprueft: n, ohneDaten, zuKlein: schlecht, minDpiMin: Math.min(...proVar.map((x) => x.dpi)), dpiMin: proVar.length ? Math.min(...proVar.map((x) => x.dpi)) : null, minDpi: [...new Set(proVar.map((x) => x.minDpi))] });
}
writeFileSync(AUS, JSON.stringify({ stand: 'Shop und Katalog 05.11.2026, v5-Datei = data-ref × data-ref·data-ratio', ergebnis: erg }, null, 1));
for (const e of erg) console.log((e.fehler ? 'FEHLT ' : (e.zuKlein === e.geprueft && e.geprueft ? 'ALLE zu klein  ' : e.zuKlein ? `TEIL ${e.zuKlein}/${e.geprueft}   ` : 'ok             ')) + e.status.padEnd(7), e.handle, e.datei ? `${e.datei} dpi≥${e.dpiMin} (min ${e.minDpi})` : '', e.ohneDaten ? `[ohne Daten ${e.ohneDaten}]` : '');
