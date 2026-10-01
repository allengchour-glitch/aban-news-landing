// Etsy-Upload: legt die Etsy-Pakete aus content/etsy/ als ENTWÜRFE an (Bilder, Dateien, Tags, Preis).
// Offizielle Etsy Open API v3. Idempotent über data/etsy-listings.json (schon angelegte werden übersprungen).
//
//   DRY_RUN=1 node tools/etsy/etsy_upload.mjs          # prüft nur (Standard), schickt nichts
//   ETSY_API_KEY=keystring:secret ETSY_REFRESH_TOKEN=… DRY_RUN=0 node tools/etsy/etsy_upload.mjs
//   ACTIVATE=1 …                                        # zusätzlich veröffentlichen (kostet USD 0.20 je Eintrag)
//   KEY_CHECK=1 ETSY_API_KEY=… node tools/etsy/etsy_upload.mjs   # nur Schlüssel + App-Freigabe prüfen (kein Login nötig)
//
// Secrets: ETSY_API_KEY (Format keystring:shared_secret, Etsy → Your Apps), ETSY_REFRESH_TOKEN (einmalig über
// https://abannews.com/api/etsy-auth). Optional ETSY_TAXONOMY_ID, PAKETE (Komma-Liste), AUTO_RENEW=1.
import fs from 'fs';
import path from 'path';

const ROOT = process.env.ROOT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const API = process.env.ETSY_API_BASE || 'https://api.etsy.com/v3';
const TOKEN_URL = process.env.ETSY_TOKEN_URL || 'https://api.etsy.com/v3/public/oauth/token';
const LEDGER = path.join(ROOT, 'data/etsy-listings.json');
const DRY = process.env.DRY_RUN !== '0';
const ACTIVATE = process.env.ACTIVATE === '1';

// Preise je Shop-Währung (Etsy rechnet im Shop-Konto; siehe ETSY-LISTING.txt für die Begründung)
const PREISE = {
  'budget-plan': { CHF: 12, EUR: 12, USD: 13, GBP: 10 },
  'schulden-plan': { CHF: 14, EUR: 14, USD: 15, GBP: 12 },
  'en/budget-planner': { CHF: 8, EUR: 8, USD: 9, GBP: 7 },
  'en/debt-payoff-planner': { CHF: 10, EUR: 10, USD: 11, GBP: 9 },
  'hochzeits-budget': { CHF: 12, EUR: 12, USD: 13, GBP: 10 },
  'en/wedding-budget-planner': { CHF: 9, EUR: 9, USD: 10, GBP: 8 },
  'finanz-kompass': { CHF: 29, EUR: 29, USD: 32, GBP: 25 },
};
const TITEL_RE = /[^\p{L}\p{Nd}\p{P}\p{Sm}\p{Zs}™©®]/u; // Etsy: erlaubte Zeichen im Titel
const TAG_RE = /[^\p{L}\p{Nd}\p{Zs}\-'™©®]/u;           // Etsy: erlaubte Zeichen in Tags

export function paketLesen(slug) {
  const dir = path.join(ROOT, 'content/etsy', slug);
  const txt = fs.readFileSync(path.join(dir, 'ETSY-LISTING.txt'), 'utf8');
  const zeilen = txt.split('\n');
  const nach = (re) => { const i = zeilen.findIndex((z) => re.test(z)); return i < 0 ? null : i; };
  const t = nach(/^(TITEL|TITLE) \(/);
  const titel = zeilen[t + 1].trim();
  const ta = nach(/^TAGS \(/);
  const tags = [];
  for (let i = ta + 1; i < zeilen.length && /^\s{2}\S/.test(zeilen[i]); i++) tags.push(zeilen[i].trim());
  const b0 = nach(/^(BESCHREIBUNG|DESCRIPTION) \(/), b1 = nach(/^(DATEIEN|FILES) \(/);
  const beschreibung = zeilen.slice(b0 + 1, b1).join('\n').trim();
  const dateienDir = fs.existsSync(path.join(dir, 'dateien')) ? 'dateien' : 'files';
  const bilderDir = fs.existsSync(path.join(dir, 'bilder')) ? 'bilder' : 'images';
  const dateien = fs.readdirSync(path.join(dir, dateienDir)).filter((f) => !f.startsWith('_')).sort()
    .map((f) => path.join(dir, dateienDir, f));
  const bilder = fs.readdirSync(path.join(dir, bilderDir)).filter((f) => f.endsWith('.png')).sort()
    .map((f) => path.join(dir, bilderDir, f));
  return { slug, titel, tags, beschreibung, dateien, bilder };
}

export function pruefen(p) {
  const f = [];
  if (!p.titel || p.titel.length > 140) f.push(`Titel ${p.titel?.length} Zeichen (max 140)`);
  if (TITEL_RE.test(p.titel)) f.push(`Titel enthält unerlaubtes Zeichen: ${p.titel.match(TITEL_RE)}`);
  for (const c of ['%', ':', '&', '+']) if (p.titel.split(c).length - 1 > 1) f.push(`Titel: „${c}" mehr als einmal`);
  if (p.tags.length !== 13) f.push(`${p.tags.length} Tags statt 13`);
  for (const t of p.tags) {
    if (t.length > 20) f.push(`Tag zu lang: ${t}`);
    if (TAG_RE.test(t)) f.push(`Tag mit unerlaubtem Zeichen: ${t}`);
  }
  if (p.beschreibung.length < 200) f.push('Beschreibung fehlt/zu kurz');
  if (!p.dateien.length || p.dateien.length > 5) f.push(`${p.dateien.length} Dateien (1–5)`);
  for (const d of p.dateien) if (fs.statSync(d).size > 20 * 1024 * 1024) f.push(`${path.basename(d)} > 20 MB`);
  if (!p.bilder.length || p.bilder.length > 10) f.push(`${p.bilder.length} Bilder (1–10)`);
  if (!PREISE[p.slug]) f.push('kein Preis hinterlegt');
  return f;
}

async function token() {
  const [keystring] = process.env.ETSY_API_KEY.split(':');
  const r = await fetch(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: keystring, refresh_token: process.env.ETSY_REFRESH_TOKEN }),
  });
  if (!r.ok) throw new Error(`Token-Erneuerung ${r.status}: ${(await r.text()).slice(0, 200)} — neu anmelden über /api/etsy-auth`);
  return (await r.json()).access_token;
}

let ACCESS;
async function etsy(methode, pfad, body) {
  const headers = { 'x-api-key': process.env.ETSY_API_KEY, Authorization: `Bearer ${ACCESS}` };
  let data = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    data = new URLSearchParams(body);
  }
  const r = await fetch(API + pfad, { method: methode, headers, body: data });
  const t = await r.text();
  if (!r.ok) throw new Error(`${methode} ${pfad} → ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
}

async function kategorie() {
  if (process.env.ETSY_TAXONOMY_ID) return +process.env.ETSY_TAXONOMY_ID;
  const { results } = await etsy('GET', '/application/seller-taxonomy/nodes');
  const flach = [];
  const lauf = (n, pfad) => { const p = [...pfad, n.name]; flach.push({ id: n.id, pfad: p.join(' > ') }); (n.children || []).forEach((c) => lauf(c, p)); };
  results.forEach((n) => lauf(n, []));
  for (const wunsch of [/planner templates/i, /\btemplates\b/i, /planners?\b/i, /calendars? & planners?/i]) {
    const t = flach.find((x) => wunsch.test(x.pfad.split(' > ').pop()));
    if (t) { console.log(`Kategorie: ${t.pfad} (id ${t.id})`); return t.id; }
  }
  throw new Error('Keine passende Kategorie gefunden — ETSY_TAXONOMY_ID setzen');
}

// Echter Keystring ist ~24 Zeichen; Platzhalter aus der Anleitung („keystring:shared_secret") sofort erkennen.
export function schluesselFehler(k = '') {
  const [ks, sec] = k.split(':');
  if (!k) return 'ETSY_API_KEY fehlt';
  if (!sec) return 'ETSY_API_KEY ohne ":shared_secret" (Format keystring:shared_secret)';
  if (/^(keystring|key|dein|your|xxx)/i.test(ks) || /^(shared_?secret|secret)$/i.test(sec) || ks.length < 16)
    return `ETSY_API_KEY ist ein Platzhalter („${ks.slice(0, 12)}…") — echten Keystring + Shared Secret aus Etsy → Your Apps eintragen`;
  return '';
}

// Ping ohne OAuth: 200 = Schlüssel gültig und App freigegeben; 401/403 = falscher Schlüssel oder Freigabe ausstehend.
async function schluesselPruefen() {
  const f = schluesselFehler(process.env.ETSY_API_KEY);
  if (f) { console.log('❌', f); process.exit(1); }
  const r = await fetch(`${API}/application/openapi-ping`, { headers: { 'x-api-key': process.env.ETSY_API_KEY } });
  const text = await r.text();
  if (r.ok) { console.log(`✅ Etsy-Schlüssel gültig, App antwortet (${r.status}). Nächster Schritt: /api/etsy-auth → ETSY_REFRESH_TOKEN.`); return; }
  console.log(`❌ Etsy antwortet ${r.status}: ${text.slice(0, 300)}`);
  console.log(r.status === 403 ? '   → Schlüssel falsch ODER App noch nicht freigegeben („Pending Personal Approval").' : '   → Schlüssel prüfen (Etsy → Your Apps).');
  process.exit(1);
}

async function main() {
  if (process.env.KEY_CHECK === '1') return schluesselPruefen();
  const alle = (process.env.PAKETE || Object.keys(PREISE).join(',')).split(',').map((s) => s.trim());
  const ledger = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : {};
  const pakete = alle.map(paketLesen);
  let fehler = 0;
  for (const p of pakete) {
    const f = pruefen(p);
    console.log(`${f.length ? '❌' : '✅'} ${p.slug}: „${p.titel.slice(0, 60)}…" · ${p.tags.length} Tags · ${p.dateien.length} Dateien · ${p.bilder.length} Bilder${ledger[p.slug] ? ` · schon angelegt (${ledger[p.slug].listing_id})` : ''}`);
    f.forEach((x) => console.log('     ', x));
    fehler += f.length;
  }
  if (fehler) { console.log(`\n${fehler} Regelverstösse — nichts hochgeladen.`); process.exit(1); }
  if (DRY) { console.log('\nProbelauf (DRY_RUN): alle Pakete erfüllen die Etsy-Regeln. Nichts gesendet.'); return; }
  const kf = schluesselFehler(process.env.ETSY_API_KEY);
  if (kf || !process.env.ETSY_REFRESH_TOKEN) {
    console.log(`${kf || 'ETSY_REFRESH_TOKEN fehlt'} — Anleitung: docs/ETSY-PAKETE.md`); process.exit(1);
  }
  ACCESS = await token();
  const me = await etsy('GET', '/application/users/me');
  const shop = await etsy('GET', `/application/shops/${me.shop_id}`);
  const waehrung = shop.currency_code;
  console.log(`Shop ${shop.shop_name} (${me.shop_id}), Währung ${waehrung}`);
  const tax = await kategorie();
  for (const p of pakete) {
    if (ledger[p.slug]) { console.log(`• ${p.slug}: schon angelegt, übersprungen`); continue; }
    const preis = PREISE[p.slug][waehrung];
    if (!preis) throw new Error(`Kein Preis für Währung ${waehrung}`);
    const l = await etsy('POST', `/application/shops/${me.shop_id}/listings`, {
      quantity: '999', title: p.titel, description: p.beschreibung, price: String(preis), who_made: 'i_did',
      when_made: '2020_2026', taxonomy_id: String(tax), type: 'download', is_supply: 'false',
      should_auto_renew: process.env.AUTO_RENEW === '1' ? 'true' : 'false', tags: p.tags.join(','),
    });
    console.log(`✓ ${p.slug}: Entwurf ${l.listing_id} (${preis} ${waehrung})`);
    ledger[p.slug] = { listing_id: l.listing_id, preis, waehrung, angelegt: new Date().toISOString(), state: 'draft' };
    fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
    for (const [i, b] of p.bilder.entries()) {
      const fd = new FormData();
      fd.append('image', new Blob([fs.readFileSync(b)], { type: 'image/png' }), path.basename(b));
      fd.append('rank', String(i + 1));
      fd.append('alt_text', p.titel.slice(0, 250));
      await etsy('POST', `/application/shops/${me.shop_id}/listings/${l.listing_id}/images`, fd);
    }
    for (const [i, d] of p.dateien.entries()) {
      const fd = new FormData();
      fd.append('file', new Blob([fs.readFileSync(d)]), path.basename(d));
      fd.append('name', path.basename(d));
      fd.append('rank', String(i + 1));
      await etsy('POST', `/application/shops/${me.shop_id}/listings/${l.listing_id}/files`, fd);
    }
    console.log(`  ${p.bilder.length} Bilder, ${p.dateien.length} Dateien hochgeladen`);
    if (ACTIVATE) {
      await etsy('PATCH', `/application/shops/${me.shop_id}/listings/${l.listing_id}`, { state: 'active' });
      ledger[p.slug].state = 'active';
      fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
      console.log('  veröffentlicht');
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('✖', e.message); process.exit(1); });
