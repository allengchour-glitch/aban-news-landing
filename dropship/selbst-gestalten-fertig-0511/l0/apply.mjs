// L0 (Besitzer-Ja 05.11.2026 «1 ja»): «Selbst gestalten»-Produkte, deren feste v5-Druckdatei klar unter der Mindest-dpi von Printful liegt, auf ENTWURF setzen
// (bis die Umstellung auf den Editor v6 mit echter Druckfläche gelaufen ist). Trockenlauf ist Vorgabe.
//   Einspielen: LIVE=1 node apply.mjs     Rücknahme: ZURUECK=1 LIVE=1 node apply.mjs (setzt nur gesicherte Produkte zurück, die noch ENTWURF sind)
// Regel (Setzung): dpi_min der Varianten < 0.85 × Mindest-dpi (klar zu klein; Mauspad 133/150, Notizbuch 137/150, Stoffbeutel 70.6/75 bleiben aktiv, da nur 6 bis 11 % darunter).
// Die Jogginghose hat im Katalog keine Platzierung «front»: dpi von Hand gerechnet (Printfile 4950×7500, cover, 150 dpi, v5-Datei 1200×1200 → 24 dpi, Mindest 75).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { shopifyGql } from '../../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../../automation/lib/shopify_secret.mjs';

export const SCHWELLE = 0.85;
/** dpiMin, minDpi: kleinste echte dpi über alle Varianten, Mindest-dpi des Katalogs. */
export function zuKlein(dpiMin, minDpi) { return Number.isFinite(dpiMin) && Number.isFinite(minDpi) && minDpi > 0 && dpiMin < SCHWELLE * minDpi; }
export const MANUELL = { 'recycelte-allover-jogginghosen-selbst-gestalten': { dpiMin: 24, minDpi: 75 } };

if (process.argv[1] && process.argv[1].endsWith('apply.mjs')) {
  const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
  const HIER = new URL('.', import.meta.url).pathname, SICH = HIER + 'sicherung.json';
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const status = async (id) => (await q(`query($id:ID!){product(id:$id){status}}`, { id })).product?.status;
  const setze = async (id, s) => (await q(`mutation($i:ProductInput!){productUpdate(input:$i){product{status} userErrors{field message}}}`, { i: { id, status: s } })).productUpdate;

  if (ZURUECK) {
    if (!existsSync(SICH)) { console.error('Keine Sicherung'); process.exit(3); }
    const s = JSON.parse(readFileSync(SICH, 'utf8'));
    let ok = 0, fremd = 0;
    for (const p of s.geaendert) {
      const jetzt = await status(p.productId);
      if (jetzt !== 'DRAFT') { console.log('nicht zurückgesetzt (Status jetzt ' + jetzt + '):', p.handle); fremd++; continue; }
      if (!LIVE) { ok++; continue; }
      const u = await setze(p.productId, p.vorher); if (u.userErrors.length) { console.error(JSON.stringify(u.userErrors)); process.exit(5); } ok++;
    }
    console.log(LIVE ? 'Rücknahme geschrieben' : 'Trockenlauf Rücknahme', ok, '| nicht zurückgesetzt', fremd); process.exit(0);
  }

  const erg = JSON.parse(readFileSync(HIER + 'dpi_ergebnis.json', 'utf8')).ergebnis;
  const plan = [], bleibt = [];
  for (const e of erg) {
    if (e.fehler) continue;
    const m = MANUELL[e.handle];
    const dpiMin = m ? m.dpiMin : e.dpiMin, minDpi = m ? m.minDpi : (() => { const w = (e.minDpi || []).map(Number).filter(Number.isFinite); return w.length ? Math.max(...w) : NaN; })();
    const klein = zuKlein(dpiMin, minDpi);
    const jetzt = await status(e.productId);
    (klein && jetzt === 'ACTIVE' ? plan : bleibt).push({ handle: e.handle, productId: e.productId, vorher: jetzt, dpiMin, minDpi, anteilVonMin: Math.round(100 * dpiMin / minDpi) / 100 });
  }
  console.log('AUF ENTWURF (' + plan.length + '):'); for (const p of plan) console.log('  ', p.handle.padEnd(55), p.dpiMin + ' dpi von mind. ' + p.minDpi, `(${Math.round(p.anteilVonMin * 100)} %)`);
  console.log('BLEIBT (' + bleibt.length + '):', bleibt.filter((b) => b.vorher === 'ACTIVE').map((b) => b.handle + ' ' + Math.round(b.anteilVonMin * 100) + '%').join(' | '));
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); process.exit(0); }
  if (existsSync(SICH)) { console.error('sicherung.json liegt schon vor: erst ZURUECK=1 oder prüfen'); process.exit(3); }
  writeFileSync(SICH, JSON.stringify({ gesichert: 'vor L0, 05.11.2026', schwelle: SCHWELLE, geaendert: plan }, null, 1));
  for (const p of plan) { const u = await setze(p.productId, 'DRAFT'); if (u.userErrors.length) { console.error(p.handle, JSON.stringify(u.userErrors), '→ Sicherung', SICH); process.exit(5); } }
  await new Promise((s) => setTimeout(s, 4000));
  const abw = []; for (const p of plan) if ((await status(p.productId)) !== 'DRAFT') abw.push(p.handle);
  if (abw.length) { console.error('RÜCKLESEN WEICHT AB:', abw.join(', ')); process.exit(6); }
  console.log('Rückgelesen: alle', plan.length, 'Produkte ENTWURF. Sicherung:', SICH);
}
