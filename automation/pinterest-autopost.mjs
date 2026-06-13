#!/usr/bin/env node
/* LuxeStyle — pinterest-autopost.mjs
 * Postet Pins aus EINER Quelle (`social/pinterest_queue.csv`) über die Pinterest-API v5.
 * Idempotent (Ledger `social/pinned-done.txt`, Key = Produkt-Link) → postet NIE doppelt,
 * auch nicht über mehrere Läufe/Sessions. No-op, wenn kein Token gesetzt ist.
 *
 * ENV (GitHub-Secrets):
 *   PINTEREST_ACCESS_TOKEN   (Pflicht; Scopes: boards:read, pins:read, pins:write)
 *   PINTEREST_BOARD_ID       (optional; sonst wird das erste Board automatisch genommen)
 *   DRY_RUN=1                (nur zeigen), MAX_PINS=5 (pro Lauf)
 *
 * Anti-Doppelpost: NUR diese Session bespielt Pinterest autonom (siehe SHARED-MEMORY).
 */
import fs from 'node:fs';
import path from 'node:path';

const TOK = process.env.PINTEREST_ACCESS_TOKEN || '';
const DRY = process.env.DRY_RUN === '1';
const MAX = Math.max(1, parseInt(process.env.MAX_PINS || '5', 10) || 5);
let BOARD = process.env.PINTEREST_BOARD_ID || '';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const QUEUE = path.join(ROOT, 'social', 'pinterest_queue.csv');
const LEDGER = path.join(ROOT, 'social', 'pinned-done.txt');
const API = 'https://api.pinterest.com/v5';

if (!TOK) { console.log('Kein PINTEREST_ACCESS_TOKEN → No-op.'); process.exit(0); }
if (!fs.existsSync(QUEUE)) { console.log('Keine pinterest_queue.csv → No-op.'); process.exit(0); }

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Minimaler CSV-Parser (mit Quotes/Zeilenumbrüchen in Feldern)
function parseCSV(txt) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"' && txt[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') {} else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
function toCSV(head, rows) {
  const esc = v => /[",\n]/.test(v ?? '') ? '"' + String(v).replace(/"/g, '""') + '"' : (v ?? '');
  return head.join(',') + '\n' + rows.map(r => head.map(h => esc(r[h])).join(',')).join('\n') + '\n';
}

const api = async (p, opts = {}) => {
  const r = await fetch(API + p, { ...opts, headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
};

// Board ermitteln, falls nicht gesetzt
if (!BOARD) {
  const b = await api('/boards?page_size=25');
  if (!b.ok) { console.log('✗ Boards lesen fehlgeschlagen:', b.status, JSON.stringify(b.j).slice(0, 200)); process.exit(0); }
  const boards = b.j.items || [];
  const pick = boards.find(x => /luxe/i.test(x.name)) || boards[0];
  if (!pick) { console.log('Kein Pinterest-Board vorhanden → No-op. Lege erst ein Board an.'); process.exit(0); }
  BOARD = pick.id;
  console.log(`Board automatisch gewählt: "${pick.name}" (${BOARD})`);
}

const done = new Set(fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean) : []);
const remember = k => { done.add(k); fs.appendFileSync(LEDGER, k + '\n'); };

const head = ['id', 'scheduled_date', 'image_url', 'title', 'description', 'link', 'board', 'status', 'posted_at', 'pin_id'];
const rows = parseCSV(fs.readFileSync(QUEUE, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
let posted = 0;

for (const r of rows) {
  if (posted >= MAX) break;
  if ((r.status || '') === 'posted') continue;
  const key = (r.link || r.id || '').trim();
  if (!key || done.has(key)) { r.status = 'posted'; continue; }            // Anti-Doppelpost
  if (r.scheduled_date && r.scheduled_date > today) continue;              // noch nicht fällig
  if (!r.image_url || !r.title) { continue; }
  if (DRY) { console.log(`DRY ⇒ Pin: "${r.title}" → ${r.link}`); remember(key); r.status = 'posted'; r.posted_at = today; posted++; continue; }
  const body = {
    board_id: r.board || BOARD,
    title: (r.title || '').slice(0, 100),
    description: (r.description || '').slice(0, 500),
    link: r.link || undefined,
    media_source: { source_type: 'image_url', url: r.image_url },
  };
  const res = await api('/pins', { method: 'POST', body: JSON.stringify(body) });
  if (res.ok && res.j.id) {
    r.status = 'posted'; r.posted_at = new Date().toISOString(); r.pin_id = res.j.id;
    remember(key); posted++;
    console.log(`✓ Pin erstellt: "${r.title}" (${res.j.id})`);
  } else {
    console.error(`✗ Pin fehlgeschlagen (${res.status}):`, JSON.stringify(res.j.error || res.j).slice(0, 200));
    if (res.status === 429) { console.log('Rate-Limit → Stopp.'); break; }
  }
  await sleep(2000);
}

// Queue mit aktualisierten Status zurückschreiben
fs.writeFileSync(QUEUE, toCSV(head, rows));
console.log(`Fertig: ${posted} Pin(s)${DRY ? ' (DRY)' : ''}.`);
