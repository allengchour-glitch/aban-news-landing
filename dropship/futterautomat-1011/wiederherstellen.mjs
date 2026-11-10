// Futterautomat «Automatischer Futterspender für Katzen» (Product 15523986473345):
// belegte Fassung (Stand 10.11. 07:28 UTC) nach der Kurzfassung von 08:46 UTC wieder einspielen.
//
// Auftrag: Besitzer «ja fix alles» (10.11. ca. 10:20 UTC) auf mein Angebot «Fassung von 07:28 wieder einspielen
// (Automatik, Edelstahl-Schale, 2,2 kg, Titel «Automatischer Futterspender für Katzen»), Kurzfassung vorher sichern».
// Beleg: CJ-Datenblatt (pid 1418384701726527488, selbst gelesen 10.11. 10:23 UTC): Titel «Pet Smart Feeder Timing Cat
// Automatic Feeding Machine», Beschreibung «Material: stainless steel · Features: automatic feeding · Colour: White»,
// Packliste «Pet smart feeder*1», Gewicht 2200 g; Bilder: weisses Gehäuse, sichtbare Edelstahlschale.
//
// Trockenlauf ist Vorgabe. LIVE=1 schreibt (Sicherung der Kurzfassung vorher, Rücklesen danach).
// ZURUECK=1 LIVE=1 stellt die Kurzfassung aus der Sicherung wieder her. FREMD_UEBERSCHREIBEN=1 schreibt auch dann,
// wenn der Text weder Kurzfassung noch Soll ist (nur nach Blick auf den Stand).
//
// Exit: 0 ok / schon im Soll / Trockenlauf · 3 falsches Produkt · 4 Text weder Kurzfassung noch Soll (jemand hat geändert)
//       5 Shopify meldet Fehler · 6 Rücklesen weicht ab
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hier = path.dirname(fileURLToPath(import.meta.url));

export const ID = 'gid://shopify/Product/15523986473345';
export const HANDLE = 'futterautomat-fur-katze-527488';

// Die Kurzfassung von 10.11. 08:46 UTC (Urheber unbekannt), so gelesen um 09:27 und 09:56 UTC.
export const KURZ_BODY = '<p>Dieser weisse Futterspender für Katzen ist in einer Ausführung erhältlich. Prüfe vor dem Kauf die aktuelle Produktseite.</p><p>Aktuelle Ausführung: Farbe Weiss; eine Ausführung. Der aktuelle Preis und die Verfügbarkeit werden auf der Produktseite angezeigt.</p>';

export const ERSETZUNGEN = [
  ['Er besteht aus Edelstahl und hat eine automatische Fütterungsfunktion.', 'Er hat eine automatische Fütterungsfunktion und eine Futterschale aus Edelstahl.'],
  ['<li>Aus Edelstahl gefertigt</li>', '<li>Futterschale aus Edelstahl</li>'],
];
export const SOLL_TITEL = 'Automatischer Futterspender für Katzen';
export const SOLL_SEO_BESCHREIBUNG = 'Automatischer Futterspender für Katzen in Weiss mit Fütterungsfunktion und Futterschale aus Edelstahl. Für die Futterausgabe, auch wenn du nicht zu Hause bist.';
export const SOLL_MATERIAL = 'Edelstahl (Futterschale)';

// Soll-Zustand aus der Sicherung vom 10.11. 07:27 UTC (Stand VOR meiner ersten Korrektur) und den zwei Ersetzungen.
export function baueSoll(orig) {
  let body = orig.descriptionHtml;
  for (const [a, b] of ERSETZUNGEN) {
    const n = body.split(a).length - 1;
    if (n !== 1) throw new Error(`Anker nicht genau einmal im Original: «${a}» (${n}x)`);
    body = body.split(a).join(b);
  }
  return {
    title: SOLL_TITEL,
    descriptionHtml: body,
    seo: { title: orig.seo.title, description: SOLL_SEO_BESCHREIBUNG },
    material: SOLL_MATERIAL,
  };
}

const LESEN = `query($id:ID!){product(id:$id){handle title status descriptionHtml seo{title description} material:metafield(namespace:"mm-google-shopping",key:"material"){id value}}}`;
const SCHREIBEN = `mutation($i:ProductInput!){productUpdate(input:$i){userErrors{field message}}}`;

const gleichSoll = (p, soll) =>
  p.title === soll.title &&
  p.descriptionHtml === soll.descriptionHtml &&
  p.seo.title === soll.seo.title &&
  p.seo.description === soll.seo.description &&
  (p.material ? p.material.value : null) === soll.material;

// Der ganze Ablauf ohne Netz und ohne process.exit: gql, Dateien und Wartezeit kommen von aussen (Test mit Attrappe).
export async function lauf({ gql, live = false, zurueck = false, fremd = false, dateien, log = console.log, warte = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const p = (await gql(LESEN, { id: ID })).product;
  if (!p || p.handle !== HANDLE) { log('ABBRUCH: Produkt oder Handle passt nicht:', p && p.handle); return 3; }
  log('Stand:', p.title, '|', p.status);

  if (zurueck) {
    const s = JSON.parse(fs.readFileSync(dateien.kurz, 'utf8'));
    log(live ? 'ZURÜCK auf die Kurzfassung aus der Sicherung' : 'Trockenlauf Rücknahme (kein Schreiben)');
    if (!live) return 0;
    const input = { id: ID, title: s.title, descriptionHtml: s.descriptionHtml, seo: s.seo };
    if (s.material && s.material.id) input.metafields = [{ id: s.material.id, value: s.material.value }];
    const m = await gql(SCHREIBEN, { i: input });
    const fehler = m.productUpdate.userErrors;
    log(JSON.stringify(fehler));
    return fehler.length ? 5 : 0;
  }

  const orig = JSON.parse(fs.readFileSync(dateien.orig, 'utf8'));
  const soll = baueSoll(orig);
  if (gleichSoll(p, soll)) { log('Schon im Soll: nichts zu tun.'); return 0; }

  if (p.descriptionHtml !== KURZ_BODY && !fremd) {
    log('ABBRUCH: Der Text ist weder die Kurzfassung von 08:46 UTC noch das Soll. Jemand hat zwischenzeitlich geändert.');
    log('Aktueller Text:', p.descriptionHtml);
    log('Mit FREMD_UEBERSCHREIBEN=1 trotzdem schreiben (erst den Stand ansehen).');
    return 4;
  }

  log('--- Titel ---\n  jetzt:', p.title, '\n  Soll :', soll.title);
  log('--- SEO-Titel ---\n  jetzt:', p.seo.title, '\n  Soll :', soll.seo.title);
  log('--- SEO-Beschreibung ---\n  jetzt:', p.seo.description, '\n  Soll :', soll.seo.description);
  log('--- Text (Soll) ---\n' + soll.descriptionHtml);
  log('--- Material-Metafeld ---', p.material ? p.material.value : '(fehlt)', '->', soll.material);
  if (!live) { log('Trockenlauf: nichts geschrieben.'); return 0; }

  fs.writeFileSync(dateien.kurz, JSON.stringify({ title: p.title, descriptionHtml: p.descriptionHtml, seo: p.seo, material: p.material }, null, 1));
  const input = { id: ID, title: soll.title, descriptionHtml: soll.descriptionHtml, seo: soll.seo };
  if (p.material && p.material.value !== soll.material) input.metafields = [{ id: p.material.id, value: soll.material }];
  const m = await gql(SCHREIBEN, { i: input });
  const fehler = m.productUpdate.userErrors;
  log(JSON.stringify(fehler));
  if (fehler.length) return 5;

  await warte(4000);
  const q = (await gql(LESEN, { id: ID })).product;
  const ok = gleichSoll(q, soll);
  log('Rücklesen', ok ? 'GLEICH' : 'WEICHT AB');
  return ok ? 0 : 6;
}

// Aufruf von der Befehlszeile (nicht beim Import durch den Test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const shop = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
  // Der Schlüssel in der Umgebung trägt Anhängsel hinter den 38 Zeichen «shpss_» + 32 Hexzeichen (gemessen: Länge 61):
  // wie dropship/fr-produkte-0911/shop.py auf den Schlüsselteil kürzen, sonst «Missing or invalid client secret».
  const roh = String(process.env.SHOPIFY_CLIENT_SECRET || '').trim();
  const sec = (/^shpss_[0-9a-f]{32}/.exec(roh) || [roh])[0];
  const tr = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: sec, grant_type: 'client_credentials' }),
  });
  const tj = await tr.json().catch(() => null);
  const tok = tj && tj.access_token;
  if (!tok) { console.log('ABBRUCH: kein Shopify-Token, Status', tr.status, tj ? `${tj.error || ''} ${String(tj.error_description || '').slice(0, 120)}` : '(keine JSON-Antwort)'); process.exit(2); }
  const gql = async (q, v) => {
    const j = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }),
    })).json();
    if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 400));
    return j.data;
  };
  const code = await lauf({
    gql,
    live: process.env.LIVE === '1',
    zurueck: process.env.ZURUECK === '1',
    fremd: process.env.FREMD_UEBERSCHREIBEN === '1',
    dateien: { orig: path.join(hier, 'sicherung.json'), kurz: path.join(hier, 'sicherung-kurzfassung-0846.json') },
  });
  process.exit(code);
}
