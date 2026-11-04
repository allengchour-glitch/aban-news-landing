// Falsche Material-Zeile «Holz» korrigieren (Besitzer 04.11.: «matrial holz?» + «alles andere auch»).
// Ursache: CJs strukturiertes Feld materialNameEn ordnet viele Artikel fälschlich als «Wood» ein (Katzenhängematte: Beschreibung «Fabric»).
// Regel (konservativ, nur Zeile in der Produkt-Beschreibung): BLEIBT = Holz belegt/plausibel; ERSETZEN = der eigene Text nennt ausdrücklich ein anderes Material;
// sonst ENTFERNEN der Zeile (keine neue Behauptung). Trockenlauf Vorgabe, LIVE=1 schreibt, Sicherung vorher, Rücklesen nachher.
import { readFileSync, writeFileSync } from 'node:fs';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const D = (process.env.ARBEIT || '/tmp/katalog-korrektur-0411/') + '';
const LIVE = process.env.LIVE === '1';
const liste = JSON.parse(readFileSync(D + 'holz_verdacht.json', 'utf8'));
// Handles (Teilstring), bei denen Holz belegt oder plausibel ist: nichts ändern.
const BLEIBT = ['holzerne-quarzuhr', 'weihnachts-schlittenkalender-aus-schima', 'uhrenbeweger-mit-piano-lack', 'premium-wetzstein', 'nussknacker-figur', 'schneidebrett-wand', 'glasmalerei-set-fur-bilderrahmen', 'stickerei-set-pfau', 'ovaler-fotorahmen', 'kletterbaum-fur-katzen', 'kratzposten-fur-katzen', 'bemalte-uhrenbox'];
// Handles (Teilstring) → Material laut eigenem Text.
const ERSETZEN = {
  'katzen-kratzbrett-aus-papier-30b028': 'Papier', 'fressnapf-aus-keramik-fur-haustiere': 'Keramik', 'fressnapf-fur-katzen-00da6e': 'Keramik',
  'keramische-doppelschussel': 'Keramik', 'keramische-katzenmahlzeit-schussel': 'Keramik', 'countdown-glockchen-zum-finden-gottes': 'Papier',
  'weihnachtsornamente-aus-stroh': 'Stroh, Schaum', 'schildkroten-beissring': 'Silikon', 'kuchenregal-fur-arbeitsflache': 'Metall',
  'kleine-bausteine-fur-kinder-50-100': 'ABS-Kunststoff', 'baby-mobile-fur-wiege-und-kinderwagen': 'Kunststoff', 'tagesplaner-notizbuch-cherry-red': 'Papier',
  'clogs-schuhe-fur-comic-convention': 'PU-Leder', 'tischtennis-schlager-aus-carbon': 'Carbonfaser', 'grosse-schmuckschatulle-mit-mehreren': 'Leder',
  'kratzbrett-fuer-katzen-schont-moebel': 'Wellpappe', 'hanfseil-saule-abriebfest': 'Hanf',
};
// Bei Mischangaben («Kunststoff, Holz») fällt nur «Holz» heraus; ganz entfernt wird die Zeile, wenn nur Holz dasteht oder die Daten offenbar vermischt sind.
const GANZ_ENTFERNEN = ['mehrzweckpfanne-fur-braten-und-omelett'];
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token;
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const LI = /[ \t]*<li>\s*<strong>Material:<\/strong>\s*([^<]*)<\/li>\s*/;
const plan = []; const sicherung = [];
for (const p of liste) {
  const bleibt = BLEIBT.some((h) => p.handle.includes(h));
  const ers = Object.entries(ERSETZEN).find(([h]) => p.handle.includes(h));
  let aktion = bleibt ? 'BLEIBT' : ers ? 'ERSETZEN' : 'ENTFERNEN';
  let neu = ers ? ers[1] : null;
  if (aktion === 'ENTFERNEN' && !GANZ_ENTFERNEN.some((h) => p.handle.includes(h))) {
    const rest = p.mat.split(/,\s*/).filter((t) => t && !/holz/i.test(t));
    if (rest.length) { aktion = 'HOLZ_RAUS'; neu = rest.join(', '); }
  }
  plan.push({ ...p, aktion, neu });
}
const zaehl = plan.reduce((a, x) => ((a[x.aktion] = (a[x.aktion] || 0) + 1), a), {});
console.log('Verdachtsliste', liste.length, JSON.stringify(zaehl));
let geaendert = 0, fehler = 0;
for (const x of plan) {
  if (x.aktion === 'BLEIBT') continue;
  const d = await q(`query($id:ID!){product(id:$id){id handle descriptionHtml}}`, { id: x.id });
  const html = d.product?.descriptionHtml || '';
  const m = html.match(LI);
  if (!m || !/holz/i.test(m[1])) { console.log('  überspringe', x.handle.slice(0, 50), '(Zeile fehlt oder kein Holz mehr)'); continue; }
  const neuHtml = x.neu ? html.replace(LI, (all) => all.replace(m[1], x.neu)) : html.replace(LI, ' ');
  console.log(`  ${x.aktion.padEnd(9)} ${x.handle.slice(0, 46).padEnd(46)} | ${m[1].trim().padEnd(18)} → ${x.neu || '(Zeile entfernt)'}`);
  sicherung.push({ id: x.id, handle: x.handle, descriptionHtml: html });
  if (!LIVE) continue;
  const u = await q(`mutation($i:ProductInput!){productUpdate(input:$i){product{id descriptionHtml} userErrors{field message}}}`, { i: { id: x.id, descriptionHtml: neuHtml } });
  if (u.productUpdate.userErrors.length) { fehler++; console.log('   FEHLER', JSON.stringify(u.productUpdate.userErrors)); continue; }
  const nach = u.productUpdate.product.descriptionHtml;
  const ok = x.neu ? nach.includes(`<strong>Material:</strong> ${x.neu}`) : !LI.test(nach);
  if (!ok) { fehler++; console.log('   ABWEICHUNG nach dem Schreiben'); } else geaendert++;
}
writeFileSync(D + 'material_holz_sicherung.json', JSON.stringify(sicherung));
console.log(LIVE ? `GESCHRIEBEN ${geaendert}, Fehler ${fehler}` : 'Trockenlauf, nichts geschrieben', '| Sicherung:', sicherung.length, 'Beschreibungen');
