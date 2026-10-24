#!/usr/bin/env node
/* LuxeStyle — fortura_galaxus_lauf.mjs
 *
 * Misst fuer die Fortura-Artikel den Schweizer Marktpreis auf Galaxus und vergleicht ihn
 * mit dem eigenen Verkaufspreis. NUR LESEN: aendert nichts im Shop.
 *
 * Weg: Galaxus-SUCHE nach dem Barcode (`/de/search?q=<EAN>`). Leitet Galaxus auf eine
 * Produktseite um, ist der Code genau getroffen; bleibt die Adresse auf /search, fuehrt
 * Galaxus den Artikel nicht. Ein direkter Produkt-Link antwortet mit Captcha (gemessen
 * 24.10.2026) — darum immer die Suchadresse.
 *
 * Kosten: 1 Firecrawl-Credit je Artikel (Markdown). Harte Obergrenze ueber MAX_CREDITS.
 * Ein Ledger haelt jeden geprueften Barcode fest, damit ein zweiter Lauf nicht noch einmal
 * zahlt; schon bezahlte Zeilen werden aus dem Ledger gelesen.
 *
 * Ein Abruf dauert gemessen 15-20 s, darum laufen POOL Abrufe gleichzeitig. Der Credit-Deckel
 * wird VOR dem Abruf gezogen, sonst koennten POOL Abrufe ihn gemeinsam ueberschreiten.
 *
 * TEMPOLIMIT (gemessen 24.10.2026): Firecrawl laesst auf diesem Plan 10 Anfragen je Minute zu
 * und antwortet darueber mit HTTP 429. Eine ABGEWIESENE Anfrage zaehlt dort mit — wer einfach
 * weiterschickt, haelt sich selbst dauerhaft ausgesperrt (gemessen: "Consumed 11, 12 ... 29").
 * Darum ein eigener Takt (TAKT Anfragen je Minute) plus Wiederholung mit wachsender Pause.
 *
 * Und: ein 429 oder Netzfehler ist KEINE Messung. Solche Zeilen kommen nicht ins Ledger,
 * sonst gilt der Fehlschlag beim naechsten Lauf als erledigt und der Artikel wird nie gemessen.
 *
 * ENV: FIRECRAWL_API_KEY · [MAX_CREDITS=100] [POOL=5] [AB=0] [NUR=0] [EIN=csv] [AUS=csv] [LEDGER=txt]
 */
import { readFileSync, existsSync, appendFileSync, writeFileSync } from 'node:fs';
import { galaxusTreffer } from './lib/galaxus_treffer.mjs';
import { vergleich } from './lib/chf_preis.mjs';

const KEY = (process.env.FIRECRAWL_API_KEY || '').trim();
const BASIS = (process.env.FIRECRAWL_BASIS || 'https://api.firecrawl.dev').replace(/\/$/, '');
const MAX_CREDITS = Number(process.env.MAX_CREDITS || 100);
const POOL = Math.max(1, Math.min(10, Number(process.env.POOL || 4)));
const TAKT = Math.max(1, Number(process.env.TAKT || 9));   // Anfragen je Minute, eine unter dem gemessenen Limit
const VERSUCHE = Math.max(1, Number(process.env.VERSUCHE || 5));
const AB = Number(process.env.AB || 0);
const NUR = Number(process.env.NUR || 0);
const EIN = process.env.EIN || 'dropship/fortura_preis_kandidaten.csv';
const AUS = process.env.AUS || 'dropship/fortura_galaxus_vergleich.csv';
const LEDGER = process.env.LEDGER || 'dropship/fortura_galaxus_ledger.jsonl';

if (!KEY) {
  console.log('No-op: FIRECRAWL_API_KEY fehlt. Grund genannt, nichts gemessen, 0 Credits.');
  process.exit(0);
}
if (!Number.isFinite(MAX_CREDITS) || MAX_CREDITS <= 0) {
  console.error('MAX_CREDITS muss eine Zahl > 0 sein.'); process.exit(1);
}

/** Zerlegt eine CSV-Zeile mit Anfuehrungszeichen. */
function zerlege(zeile) {
  const f = []; let akt = '', inAnf = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"') { if (inAnf && zeile[i + 1] === '"') { akt += '"'; i++; } else inAnf = !inAnf; }
    else if (c === ',' && !inAnf) { f.push(akt); akt = ''; }
    else akt += c;
  }
  f.push(akt); return f;
}
const csvFeld = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const zeilen = readFileSync(EIN, 'utf8').trim().split('\n');
const kopf = zerlege(zeilen[0]);
const alle = zeilen.slice(1).map((z) => {
  const f = zerlege(z); const o = {};
  kopf.forEach((k, i) => { o[k] = f[i]; });
  return o;
});

// Nur Artikel mit Barcode: eine Artikelnummer allein trifft auf Galaxus nicht.
const kandidaten = alle.filter((r) => r.schluesselArt === 'barcode' && /^\d{8,14}$/.test(r.schluessel || ''));

// Schon bezahlte Messungen wiederverwenden.
const bekannt = new Map();
if (existsSync(LEDGER)) {
  for (const z of readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!z.trim()) continue;
    try { const o = JSON.parse(z); if (o.barcode) bekannt.set(o.barcode, o); } catch { /* kaputte Zeile ueberspringen */ }
  }
}

// Takt: hoechstens TAKT Anfragen in 60 s, ueber alle Arbeiter zusammen.
const sendeZeiten = [];
async function warteAufTakt() {
  for (;;) {
    const jetzt = Date.now();
    while (sendeZeiten.length && jetzt - sendeZeiten[0] > 60000) sendeZeiten.shift();
    if (sendeZeiten.length < TAKT) { sendeZeiten.push(jetzt); return; }
    await new Promise((x) => setTimeout(x, 60000 - (jetzt - sendeZeiten[0]) + 250));
  }
}

/** true, wenn es sich lohnt, es gleich noch einmal zu versuchen (kein Dauerzustand). */
function vorlaeufig(status) {
  return status === 429 || status === 408 || (status >= 500 && status <= 599) || status === 0;
}

/**
 * Holt einen Artikel.
 * @returns {{treffer:object, credit:boolean}} — `treffer.art === 'offen'` heisst: nicht gemessen,
 *          nicht ins Ledger. Der Unterschied zu 'unbekannt' (gemessen, aber unlesbar) ist wichtig.
 */
async function hole(barcode) {
  const url = `https://www.galaxus.ch/de/search?q=${encodeURIComponent(barcode)}`;
  let zuletzt = 'unbekannt';
  for (let versuch = 1; versuch <= VERSUCHE; versuch++) {
    await warteAufTakt();
    let r = null, j = {};
    try {
      r = await fetch(`${BASIS}/v2/scrape`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, maxAge: 0 }),
      });
      j = await r.json().catch(() => ({}));
    } catch (e) {
      zuletzt = `netz:${String(e.message || e).slice(0, 60)}`;
      await new Promise((x) => setTimeout(x, Math.min(60000, 2000 * 2 ** versuch)));
      continue;
    }
    if (r.ok && j.success === true) {
      const d = j.data || {};
      // Diese Antwort kostet einen Credit, auch wenn die Seite selbst nichts hergibt.
      return { treffer: galaxusTreffer({ url: d.metadata?.url, markdown: d.markdown }), credit: true };
    }
    zuletzt = `api-${r.status}`;
    if (!vorlaeufig(r.status)) {
      // Dauerhafte Ablehnung (z. B. Credits aufgebraucht): nicht wiederholen, nicht merken.
      return { treffer: { art: 'offen', grund: `${zuletzt}:${String(j.error || '').slice(0, 60)}` }, credit: false, schluss: /credit|payment|quota/i.test(String(j.error || '')) };
    }
    const wartenKopf = Number(r.headers.get('retry-after'));
    const warten = Number.isFinite(wartenKopf) && wartenKopf > 0 ? wartenKopf * 1000 : Math.min(60000, 2000 * 2 ** versuch);
    await new Promise((x) => setTimeout(x, warten));
  }
  return { treffer: { art: 'offen', grund: zuletzt }, credit: false };
}

let credits = 0, gemessen = 0, ausLedger = 0, offen = 0, deckel = false, schluss = false;
const zaehler = { teurer: 0, im_rahmen: 0, guenstiger: 0, unbekannt: 0, kein_treffer: 0 };
const liste = NUR > 0 ? kandidaten.slice(AB, AB + NUR) : kandidaten.slice(AB);
const ergebnis = new Array(liste.length);

console.log(`${kandidaten.length} Artikel mit Barcode · ${liste.length} in diesem Lauf · Deckel ${MAX_CREDITS} Credits · ${POOL} gleichzeitig · ${TAKT}/Minute`);

let naechster = 0;
async function arbeiter() {
  while (true) {
    const i = naechster++;
    if (i >= liste.length) return;
    const r = liste[i];
    const bc = r.schluessel;
    let t = bekannt.get(bc)?.treffer;
    if (t) {
      ausLedger++;
    } else {
      // Deckel VOR dem Abruf ziehen: sonst starten mehrere Arbeiter am Rand gemeinsam.
      if (credits >= MAX_CREDITS) { deckel = true; return; }
      if (schluss) return;
      const antwort = await hole(bc);
      if (antwort.credit) credits++;
      if (antwort.schluss) { schluss = true; }
      t = antwort.treffer;
      if (t.art === 'offen') { offen++; continue; }   // nicht gemessen -> nicht merken, nicht bewerten
      appendFileSync(LEDGER, JSON.stringify({ barcode: bc, handle: r.handle, treffer: t, am: new Date().toISOString().slice(0, 10) }) + '\n');
      gemessen++;
      if (gemessen % 50 === 0) console.log(`… ${gemessen} gemessen, ${credits} Credits`);
    }

    const eigen = Number(r.preis);
    const markt = t.art === 'treffer' ? t.preis : null;
    const v = vergleich(eigen, markt);
    const urteil = t.art === 'kein_treffer' ? 'kein_treffer' : t.art === 'unbekannt' ? 'unbekannt' : v.urteil;
    zaehler[urteil] = (zaehler[urteil] || 0) + 1;
    ergebnis[i] = {
      handle: r.handle, titel: r.titel, barcode: bc, eigen,
      galaxus: markt ?? '', galaxusTitel: t.titel || '', galaxusMarke: t.marke || '',
      faktor: v.faktor ?? '', differenz: v.differenz ?? '', urteil,
      grund: t.grund || '',
    };
  }
}
await Promise.all(Array.from({ length: POOL }, arbeiter));
if (deckel) console.log(`\nDeckel erreicht: ${credits} Credits verbraucht, Rest nicht gemessen.`);
for (let i = ergebnis.length - 1; i >= 0; i--) if (!ergebnis[i]) ergebnis.splice(i, 1);

const k = ['handle', 'titel', 'barcode', 'eigen', 'galaxus', 'galaxusTitel', 'galaxusMarke', 'faktor', 'differenz', 'urteil', 'grund'];
writeFileSync(AUS, [k.join(','), ...ergebnis.map((e) => k.map((x) => csvFeld(e[x])).join(','))].join('\n') + '\n');

const teuer = ergebnis.filter((e) => e.urteil === 'teurer');
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 100) / 100; };
if (schluss) console.log('\nAbgebrochen: Firecrawl lehnt dauerhaft ab (Credits aufgebraucht?).');
if (offen) console.log(`${offen} Artikel blieben OFFEN (nicht gemessen, nicht gemerkt) — ein spaeterer Lauf holt sie nach.`);
console.log(`\nCredits verbraucht: ${credits} (${gemessen} neu gemessen, ${ausLedger} aus dem Ledger)`);
console.log(`Bewertet: ${ergebnis.length}`);
for (const [n, z] of Object.entries(zaehler)) if (z) console.log(`  ${n}: ${z}`);
if (teuer.length) {
  console.log(`  Faktor der teuren Artikel: Median ${med(teuer.map((e) => e.faktor))} · hoechster ${Math.max(...teuer.map((e) => e.faktor))}`);
}
const mitPreis = ergebnis.filter((e) => e.urteil !== 'unbekannt' && e.urteil !== 'kein_treffer');
if (mitPreis.length) console.log(`  Von ${mitPreis.length} vergleichbaren Artikeln sind ${teuer.length} teurer (${Math.round((teuer.length / mitPreis.length) * 100)} %).`);
console.log(`Bericht: ${AUS}`);
