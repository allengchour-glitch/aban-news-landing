#!/usr/bin/env node
/**
 * Englische Optionswerte ins Deutsche bringen («Silver Black-Ordinary», «Black-155to165cm», «Tianchi Blue» → «Silber-Schwarz, Standard», …).
 *
 * WARUM (26.10.2026): Gemessen an den 56 630 aktiven Produkten: 2 738 tragen mindestens einen klar englischen Optionswert (13 760 verschiedene Werte, fast alle unter
 * «Farbe»). Die alten Importer hatten die CJ-Schlüssel roh übernommen. Eine Kundin sieht «Farbe: White-CK 51x102cm» und versteht nichts.
 *
 * Vorgehen: (1) deterministisch über `farbeDeutsch` (Wörterbuch), (2) Rest per KI in Stapeln (Gemini → Groq, lib/uebersetzen.mjs), Ergebnisse im
 * Zwischenspeicher /tmp/optionen_uebersetzt.json (wiederaufnehmbar), (3) jede Übersetzung wird geprüft (nicht leer, ≤ 60 Zeichen, kein ß, kein englischer Rest,
 * keine neue Zahl), (4) `plane()` aus lib/option_umbenennen.mjs sichert pro Produkt: Kollisionen, Marken, erfundene Zahlen.
 * Nur NAMEN ändern sich — Varianten, Preise, Bilder, SKUs, Bestellungen bleiben. TROCKENLAUF IST VORGABE (LIVE=1 schreibt).
 * Schalter: LIMIT=n (Produkte schreiben), STAPEL=40, PARALLEL=3, NUR_UEBERSETZEN=1 (nur Zwischenspeicher füllen), PROBE=n (n Beispiele zeigen).
 */
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { farbeDeutsch } from './lib/cj_varianten.mjs';
import { nachDeutsch } from './lib/uebersetzen.mjs';
import { plane } from './lib/option_umbenennen.mjs';
import { bulk } from './optionen_reparieren.mjs';

const LIVE = process.env.LIVE === '1', LIMIT = Number(process.env.LIMIT || 1e9), STAPEL = Number(process.env.STAPEL || 40), PARALLEL = Number(process.env.PARALLEL || 3);
const CACHE = '/tmp/optionen_uebersetzt.json';

/** Klar englische Wörter (mehrdeutige wie «Set», «Mini», «Box», «Band», «Standard» sind im Schweizer Shop-Deutsch gebräuchlich und zählen NICHT). */
export const EN_RE = /(^|[^a-zäöüß])(black|white|red|blue|green|yellow|gray|grey|brown|purple|silver|golden|light|dark|style|color|colour|size|pcs|frame|shell|suit|with|and|apricot|coffee|army|wine|sky|navy|cream|plain|flower|leopard|stripe|striped|print|hair|sleeve|long|short|small|large|medium|only|single|double|strap|leather|steel|plastic|cotton|silk|wool|lace|ordinary|magnetic|charge|wire|belt|boxes|metallic|pure|matte|dull|parent|child|mother|father|boy|girl|kids|men|women|lady|ladies|gift|free|without|normal|regular|upgrade|version|model|type|pink-|rose-red|multi|mixed|random|transparent-)(?![a-zäöüß])/i;

/** Strenge Liste für das ERGEBNIS: nur Wörter, die im Deutschen sicher fremd sind. «Version», «Upgrade», «Leopard», «Matt» sind gebräuchlich und lehnen eine Übersetzung nicht ab (26.10.: «Standard-Version» fiel sonst durch). */
export const EN_AUSGABE_RE = /(^|[^a-zäöüß])(black|white|red|blue|green|yellow|gray|grey|brown|purple|silver|golden|light|dark|style|color|colour|size|pcs|frame|shell|suit|with|and|apricot|coffee|army|wine|sky|navy|cream|plain|flower|stripe|striped|print|hair|sleeve|long|short|small|large|medium|only|single|double|leather|steel|plastic|cotton|silk|wool|lace|ordinary|magnetic|charge|wire|belt|boxes|metallic|dull|parent|child|mother|father|boy|girl|kids|men|women|lady|ladies|gift|without|packaging|insole)(?![a-zäöüß])/i;

/** Braucht dieser Wert eine Übersetzung? Rein, getestet. */
export function brauchtUebersetzung(v) {
  const s = String(v ?? '').trim();
  if (!s || !EN_RE.test(s)) return false;
  const f = farbeDeutsch(s);
  return !(f.sicher && f.text === s);
}

/** Ist eine Übersetzung brauchbar? Rein, getestet. `alt` = Original. */
export function uebersetzungOk(alt, neu) {
  const n = String(neu ?? '').replace(/ß/g, 'ss').replace(/\s+/g, ' ').trim();
  if (!n || n.length > 60) return null;
  if (n.toLowerCase() === String(alt).trim().toLowerCase()) return null;
  if (EN_AUSGABE_RE.test(n)) return null;               // noch Englisch
  if (/[一-鿿]/.test(n)) return null;
  if (/^(null|undefined|n\/a|-)$/i.test(n)) return null;
  return n;
}

const AUFTRAG = `Übersetze diese Varianten-Bezeichnungen eines Schweizer Online-Shops ins Deutsche (Schweizer Schreibweise: ss statt ß). Es sind Farben, Muster, Modelle, Grössen- und Set-Angaben aus Lieferantendaten.
Regeln: kurz wie auf einem Etikett; Farben deutsch (Black→Schwarz, Navy→Marineblau, Apricot→Aprikose, Rose Red→Rosenrot); Mehrfachfarben mit « / » trennen; Zahlen, Masse und Einheiten UNVERÄNDERT übernehmen (nur «to» zwischen Zahlen → «–», «cm/mm» mit Leerzeichen);
Eigennamen und Codes (z. B. «CK», «A1», Modellnummern) unverändert lassen; nichts hinzufügen, nichts erklären, keine Marken erfinden; «Ordinary» → «Standard», «Gift Box» → «Geschenkbox», «Set1» → «Set 1».
Beispiele: «Silver Black-Ordinary» → «Silber / Schwarz, Standard»; «Black-155to165cm» → «Schwarz, 155–165 cm»; «White-CK 51x102cm» → «Weiss, CK 51 × 102 cm»; «Magnetic absorption-Black» → «Magnetisch, Schwarz».
Gib AUSSCHLIESSLICH ein JSON-Array von Strings in exakt gleicher Reihenfolge und gleicher Länge zurück.\n`;

function cacheLesen() { try { return JSON.parse(readFileSync(CACHE, 'utf8')); } catch { return {}; } }
function cacheSchreiben(c) { writeFileSync(CACHE, JSON.stringify(c)); }

async function uebersetzeWerte(werte, c) {
  // Früher abgelehnte Antworten der KI mit der aktuellen Prüfung neu bewerten (kein neuer KI-Aufruf)
  for (const [w, e] of Object.entries(c)) if (e && !e.neu && e.roh) { const ok = uebersetzungOk(w, e.roh); if (ok) c[w] = { neu: ok, weg: e.weg, neubewertet: true }; }
  const offen = werte.filter(w => !(w in c));
  // 1) deterministisch
  const rest = [];
  for (const w of offen) { const f = farbeDeutsch(w); const ok = f.sicher ? uebersetzungOk(w, f.text) : null; if (ok) c[w] = { neu: ok, weg: 'woerterbuch' }; else rest.push(w); }
  // 2) KI in Stapeln, PARALLEL gleichzeitig
  const stapel = []; for (let i = 0; i < rest.length; i += STAPEL) stapel.push(rest.slice(i, i + STAPEL));
  let nr = 0, fertig = 0, ki = 0, original = 0;
  const arbeiter = async () => {
    while (nr < stapel.length) {
      const teil = stapel[nr++];
      const t = await nachDeutsch(teil, { auftrag: AUFTRAG });
      if (t.weg === 'original') { original += teil.length; console.log('  KI nicht erreichbar:', t.grund); continue; }
      teil.forEach((w, i) => { const ok = uebersetzungOk(w, t.texte[i]); c[w] = ok ? { neu: ok, weg: t.weg } : { neu: null, weg: t.weg, roh: t.texte[i] }; });
      ki += teil.length; fertig++;
      if (fertig % 5 === 0) { cacheSchreiben(c); console.log(`  … ${fertig}/${stapel.length} Stapel`); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, stapel.length) }, arbeiter));
  cacheSchreiben(c);
  return { woerterbuch: offen.length - rest.length, ki, original };
}

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const roh = await bulk(q);
  const produkte = [];
  for (const z of roh.split('\n')) {
    if (!z) continue; const p = JSON.parse(z); if (!p.options) continue;
    const opt = p.options.map(o => ({ name: o.name, id: o.id, werte: (o.values || []).filter(brauchtUebersetzung) })).filter(o => o.werte.length);
    if (opt.length) produkte.push({ id: p.id, handle: p.handle, optionen: opt });
  }
  const verschieden = [...new Set(produkte.flatMap(p => p.optionen.flatMap(o => o.werte)))];
  console.log(`Produkte mit englischen Optionswerten: ${produkte.length} · verschiedene Werte: ${verschieden.length}`);
  const c = cacheLesen();
  const s = await uebersetzeWerte(verschieden, c);
  const gut = verschieden.filter(w => c[w]?.neu).length;
  console.log(`Übersetzt: Wörterbuch ${s.woerterbuch}, KI ${s.ki}, KI nicht erreichbar ${s.original} · brauchbar ${gut} von ${verschieden.length}`);
  if (process.env.NUR_UEBERSETZEN === '1') return;

  const aufgaben = [];
  for (const p of produkte) {
    const wunsch = {}; for (const o of p.optionen) for (const w of o.werte) if (c[w]?.neu) (wunsch[o.name] ||= {})[w] = c[w].neu;
    if (Object.keys(wunsch).length) aufgaben.push({ ...p, wunsch });
  }
  console.log(`Produkte mit mindestens einem brauchbaren Vorschlag: ${aufgaben.length}`);
  const proben = Number(process.env.PROBE || 12);
  for (const a of aufgaben.sort(() => 0.5 - Math.random()).slice(0, proben)) console.log(`  ${a.handle.slice(0, 38)} · ${Object.entries(a.wunsch).map(([o, m]) => o + ': ' + Object.entries(m).slice(0, 3).map(([k, v]) => `«${k}»→«${v}»`).join(', ')).join(' ; ')}`);
  if (!LIVE) { console.log('\nTrockenlauf — nichts geschrieben.'); return; }

  let ok = 0, werte = 0, abgelehnt = 0, fehler = 0;
  for (const a of aufgaben.slice(0, LIMIT)) {
    try {
      const p = (await q(`query($id:ID!){product(id:$id){options{id name optionValues{id name}}}}`, { id: a.id })).product;
      if (!p) continue;
      const pl = plane(p.options, a.wunsch);
      abgelehnt += pl.abgelehnt.length;
      if (!pl.aenderungen.length) continue;
      const nachOption = new Map(); for (const x of pl.aenderungen) nachOption.set(x.optionId, [...(nachOption.get(x.optionId) || []), { id: x.valueId, name: x.neu }]);
      let schlecht = false;
      for (const [optionId, v] of nachOption) {
        const d = (await q(`mutation($p:ID!,$o:OptionUpdateInput!,$v:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,option:$o,optionValuesToUpdate:$v){userErrors{message code}}}`, { p: a.id, o: { id: optionId }, v })).productOptionUpdate;
        if (d.userErrors.length) { schlecht = true; fehler++; console.log('  ✗', a.handle, JSON.stringify(d.userErrors).slice(0, 140)); }
      }
      if (schlecht) continue;
      ok++; werte += pl.aenderungen.length;
      appendFileSync('dropship/kategorien_ledger.txt', `${new Date().toISOString()} · optionen-uebersetzt ${a.handle} ${pl.aenderungen.length}\n`);
    } catch (e) { fehler++; console.log('  ✗', a.handle, e.message.slice(0, 120)); }
  }
  console.log(`\nÜBERSETZT: ${werte} Werte in ${ok} Produkten · abgelehnt (Kollision/Zahl/Marke) ${abgelehnt} · Fehler ${fehler}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
