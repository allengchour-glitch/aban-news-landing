#!/usr/bin/env node
/* LuxeStyle — self_learn.mjs  (SELBSTLERN-SCHLEIFE: misst Performance → verstärkt Gewinner)
 *
 * User 2026-06-17 „Tools für Automation Selbstlern". Schliesst den Lern-Kreis mit ECHTEN Daten:
 *   1) Holt IG/FB-Post-Performance (Graph-API: Likes+Kommentare je Post)
 *   2) Ordnet Performance den Produkten zu (Caption-Match gegen top_products.csv)
 *   3) Scort jedes Produkt → reiht top_products.csv NEU (Gewinner zuerst = werden öfter gepostet),
 *      flaggt 0-Engagement-Dauerverlierer (Ratsche: bewiesene Verlierer ans Ende)
 *   4) Schreibt die Lehre + Gewinner/Verlierer ins Gehirn (knowledge.json.performance)
 *   5) KI-Synthese der Lehre (ai_generate, gratis Router)
 *
 * No-op-safe: ohne META_ACCESS_TOKEN → Exit 0 (nichts kaputt). Idempotent.
 * ENV: META_ACCESS_TOKEN, IG_USER_ID (default 17841480560863361)
 * Lauf: node automation/brain/self_learn.mjs   (in engagement-cycle / auto.sh eingebaut)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../ai/ai_generate.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const TOP = path.join(ROOT, 'automation', 'top_products.csv');
const BRAIN = path.join(ROOT, 'automation', 'brain', 'knowledge.json');
const TOKEN = process.env.META_ACCESS_TOKEN || '';
const IG = process.env.IG_USER_ID || '17841480560863361';
const log = (...a) => console.log(...a);

// Caption → Produkt-Label matchen (vereinfachte Wortüberlappung)
function matchProduct(caption, labels) {
  const cap = (caption || '').toLowerCase();
  let best = null, bestScore = 0;
  for (const { name, label } of labels) {
    const words = label.toLowerCase().replace(/[«»·,]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    const hit = words.filter(w => cap.includes(w)).length;
    if (hit > bestScore) { bestScore = hit; best = name; }
  }
  return bestScore > 0 ? best : null;
}

(async () => {
  if (!TOKEN) { log('Kein META_ACCESS_TOKEN → Selbstlern No-op (läuft am PC mit Token).'); process.exit(0); }
  if (!fs.existsSync(TOP)) { log('top_products.csv fehlt → No-op.'); process.exit(0); }

  // top_products laden (Reihenfolge = Posting-Priorität)
  const lines = fs.readFileSync(TOP, 'utf8').trim().split('\n');
  const header = lines[0];
  const rows = lines.slice(1).map(l => { const c = l.split(','); return { name: c[0], img: c[1], label: c[2] || '', raw: l }; });

  // IG-Performance holen
  let media = [];
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${IG}/media?fields=caption,like_count,comments_count,timestamp&limit=80&access_token=${TOKEN}`);
    media = (await r.json()).data || [];
  } catch (e) { log('IG-Abruf fehlgeschlagen:', e.message); process.exit(0); }
  if (!media.length) { log('Keine IG-Daten → No-op.'); process.exit(0); }

  // Score je Produkt (Summe Engagement, Kommentar=2× Gewicht)
  const score = {}, count = {};
  for (const m of media) {
    const prod = matchProduct(m.caption, rows);
    if (!prod) continue;
    const e = (m.like_count || 0) + (m.comments_count || 0) * 2;
    score[prod] = (score[prod] || 0) + e; count[prod] = (count[prod] || 0) + 1;
  }

  // top_products neu sortieren: höchster Schnitt-Score zuerst (Gewinner werden öfter gepostet)
  const avg = n => count[n] ? score[n] / count[n] : -1; // ungemessene in der Mitte (-1), 0-Engagement ans Ende
  rows.sort((a, b) => avg(b.name) - avg(a.name));
  fs.writeFileSync(TOP, header + '\n' + rows.map(r => r.raw).join('\n') + '\n');

  const ranked = rows.map(r => `${r.label}: Ø${avg(r.name) >= 0 ? avg(r.name).toFixed(1) : '?'}`).slice(0, 8);
  log('🔁 Selbstlern: top_products neu gereiht (Gewinner zuerst):');
  ranked.forEach(x => log('  ', x));

  // Lehre ins Gehirn (performance-Sektion + Regel)
  const k = JSON.parse(fs.readFileSync(BRAIN, 'utf8'));
  const winners = rows.filter(r => avg(r.name) > 0).slice(0, 5).map(r => r.label);
  const losers = rows.filter(r => count[r.name] >= 2 && avg(r.name) === 0).map(r => r.label);
  k.performance = { updated: new Date().toISOString().slice(0, 10), winners, losers,
    note: 'Auto-gemessen aus IG-Engagement. top_products.csv ist nach Performance sortiert (Gewinner zuerst).' };
  fs.writeFileSync(BRAIN, JSON.stringify(k, null, 2) + '\n');
  log(`Gewinner: ${winners.join(', ') || '—'} | Dauerverlierer: ${losers.join(', ') || '—'}`);

  // KI-Synthese (optional, gratis Router)
  const g = await generate({ system: 'Du bist Social-Analyst. Kurz, Bärndütsch.', maxTokens: 200,
    prompt: `IG-Gewinner-Produkte: ${winners.join(', ')}. Verlierer: ${losers.join(', ')}. Gib EINE konkrete Lehre für künftigen Content (1 Satz).` });
  if (g.text) { log('🧠 KI-Lehre:', g.text); }
})().catch(e => { log('Fehler:', e.message); process.exit(0); });
