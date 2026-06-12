#!/usr/bin/env node
/**
 * pinterest_publish.mjs — veröffentlicht die Pins aus dropship/pinterest_pins.csv
 * automatisch über die Pinterest-API v5 (Boards anlegen + Pins erstellen).
 *
 * Voraussetzung: Umgebungsvariable PINTEREST_ACCESS_TOKEN (OAuth-Token mit Scopes
 *   boards:read, boards:write, pins:read, pins:write).
 *
 * Eigenschaften:
 *  - Legt fehlende Boards automatisch an (Name aus Spalte "Pinterest board").
 *  - Idempotent: bereits gepostete Pins werden über ein Ledger
 *    (dropship/pinterest_done.txt, Key = Link) übersprungen → mehrfaches Laufen ist safe.
 *  - Drosselt (1 Pin / ~2 s), damit Pinterest nicht ratelimitet.
 *  - --limit N  : nur N neue Pins pro Lauf (Standard 5 — wie der Wochenplan, kein Spam).
 *  - --dry-run  : nichts senden, nur zeigen, was passieren würde.
 *
 * Aufruf:  /opt/node22/bin/node automation/pinterest_publish.mjs --limit 5
 */
import { readFileSync, existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV = join(ROOT, "dropship", "pinterest_pins.csv");
const LEDGER = join(ROOT, "dropship", "pinterest_done.txt");
const API = "https://api.pinterest.com/v5";

// Token: entweder ein fixer PINTEREST_ACCESS_TOKEN (läuft nach ~30 T ab),
// ODER ein PINTEREST_REFRESH_TOKEN + App-Creds → dann holt sich das Skript bei
// jedem Lauf selbst einen frischen Access-Token (nie wieder manuell erneuern).
let TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
const REFRESH = process.env.PINTEREST_REFRESH_TOKEN;
const APP_ID = process.env.PINTEREST_APP_ID;
const APP_SECRET = process.env.PINTEREST_APP_SECRET;
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const limIdx = args.indexOf("--limit");
const LIMIT = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) : 5;

if (!TOKEN && !(REFRESH && APP_ID && APP_SECRET) && !DRY) {
  console.error("❌ Kein Zugang: setze PINTEREST_ACCESS_TOKEN ODER (PINTEREST_REFRESH_TOKEN + PINTEREST_APP_ID + PINTEREST_APP_SECRET), oder nutze --dry-run.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Holt per Refresh-Token einen frischen Access-Token (gültig ~30 Tage). */
async function refreshAccessToken() {
  const basic = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: REFRESH });
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Token-Refresh fehlgeschlagen → ${res.status}: ${text}`);
  TOKEN = JSON.parse(text).access_token;
  console.log("🔑 Frischer Access-Token via Refresh-Token geholt.");
}

async function api(path, method = "GET", body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Pinterest ${method} ${path} → ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

/** Minimaler CSV-Parser (Quotes, Kommas, "" als Escape). */
function parseCsv(raw) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inQ) {
      if (c === '"' && raw[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length && r.some((x) => x.trim() !== ""));
}

async function getOrCreateBoards(neededNames) {
  const existing = new Map();
  if (DRY) {
    for (const name of neededNames) { console.log(`  [dry] Board sicherstellen: ${name}`); existing.set(name, `dry-${name}`); }
    return existing;
  }
  let bookmark = "";
  do {
    const q = bookmark ? `?bookmark=${encodeURIComponent(bookmark)}` : "";
    const data = await api(`/boards${q}`);
    for (const b of data.items || []) existing.set(b.name.trim(), b.id);
    bookmark = data.bookmark || "";
  } while (bookmark);

  for (const name of neededNames) {
    if (existing.has(name)) continue;
    const created = await api("/boards", "POST", {
      name,
      description: `LuxeStyle CH — ${name}. Schweizer Online-Shop, faire Preise, −10% mit WELCOME10.`,
      privacy: "PUBLIC",
    });
    existing.set(name, created.id);
    console.log(`  ✅ Board angelegt: ${name}`);
    await sleep(1500);
  }
  return existing;
}

async function main() {
  if (!TOKEN && !DRY) await refreshAccessToken();
  const raw = readFileSync(CSV, "utf8");
  const rows = parseCsv(raw);
  const header = rows.shift().map((h) => h.trim());
  const col = (name) => header.indexOf(name);
  const ci = {
    title: col("Title"), media: col("Media URL"), board: col("Pinterest board"),
    desc: col("Description"), link: col("Link"), keywords: col("Keywords"),
  };

  const done = existsSync(LEDGER)
    ? new Set(readFileSync(LEDGER, "utf8").split("\n").map((l) => l.trim()).filter(Boolean))
    : new Set();

  const pending = rows.filter((r) => r[ci.link] && !done.has(r[ci.link].trim()));
  const todo = pending.slice(0, LIMIT);
  console.log(`📌 ${rows.length} Pins gesamt · ${done.size} schon gepostet · ${pending.length} offen · diesmal ${todo.length}`);

  const boardNames = [...new Set(rows.map((r) => r[ci.board].trim()))];
  const boards = await getOrCreateBoards(boardNames);

  let ok = 0;
  for (const r of todo) {
    const title = r[ci.title].trim().slice(0, 100);
    const desc = r[ci.desc].trim().slice(0, 500);
    const link = r[ci.link].trim();
    const boardId = boards.get(r[ci.board].trim());
    if (DRY) { console.log(`  [dry] Pin: ${title} → ${r[ci.board]}`); ok++; continue; }
    try {
      await api("/pins", "POST", {
        board_id: boardId,
        title,
        description: desc,
        link,
        media_source: { source_type: "image_url", url: r[ci.media].trim() },
      });
      appendFileSync(LEDGER, link + "\n");
      console.log(`  ✅ Pin: ${title}`);
      ok++;
      await sleep(2000);
    } catch (e) {
      console.error(`  ⚠️ Pin fehlgeschlagen (${title}): ${e.message}`);
      if (e.status === 401) { console.error("Token ungültig/abgelaufen → abbrechen."); break; }
    }
  }
  console.log(`\nFertig: ${ok}/${todo.length} Pins ${DRY ? "(dry-run)" : "live"}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
