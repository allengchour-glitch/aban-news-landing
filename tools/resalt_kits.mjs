#!/usr/bin/env node
// =============================================================================
//  resalt_kits — rotiert den DOWNLOAD_SALT der Shop-ZIPs sicher.
// -----------------------------------------------------------------------------
//  Benennt jede downloads/kits/<altHash>.zip → <neuHash>.zip um, sodass der
//  Dateiname zum NEUEN Salt passt. Nötig, wenn der alte Salt kompromittiert ist
//  (z. B. im Chat gepastet) — sonst lässt sich die Paywall per geratenem Hash umgehen.
//
//  🔐 Beide Salts AUSSCHLIESSLICH aus der Umgebung — nie als Argument/Datei/Commit:
//      OLD_SALT="alterSalt" NEW_SALT="neuerSalt" node tools/resalt_kits.mjs
//
//  Hash = SHA256(`${slug}:${salt}`).slice(0,24)  (identisch zu functions/api/kit-download.js)
//
//  ⚠️ Reihenfolge fürs Live-Schalten:
//   1) NEW_SALT als Cloudflare-Pages-Secret DOWNLOAD_SALT setzen
//   2) DANN diesen umbenannten Stand deployen (Merge)
//  Sonst zeigen die Download-Links kurzzeitig auf nicht mehr existierende Dateien.
// =============================================================================

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, renameSync, existsSync } from "node:fs";
import path from "node:path";

const OLD = process.env.OLD_SALT, NEW = process.env.NEW_SALT;
if (!OLD || !NEW) { console.error("❌ OLD_SALT und NEW_SALT müssen als Env gesetzt sein."); process.exit(1); }
if (OLD === NEW) { console.error("❌ OLD_SALT und NEW_SALT sind identisch — nichts zu tun."); process.exit(1); }

const KITS = "downloads/kits";
const hash = (slug, salt) => createHash("sha256").update(`${slug}:${salt}`).digest("hex").slice(0, 24);

function slugs() {
  const out = [];
  for (const f of ["data/shop-products.json", "data/shop-products-en.json"]) {
    if (existsSync(f)) for (const it of JSON.parse(readFileSync(f, "utf8"))) if (it.slug) out.push(it.slug);
  }
  return [...new Set(out)];
}

const present = new Set(readdirSync(KITS).filter((f) => f.endsWith(".zip")));
let renamed = 0, already = 0, missing = [];
const plan = [];

for (const slug of slugs()) {
  const oldName = hash(slug, OLD) + ".zip";
  const newName = hash(slug, NEW) + ".zip";
  if (oldName === newName) { already++; continue; }
  if (present.has(newName)) { already++; continue; }      // schon rotiert
  if (!present.has(oldName)) { missing.push(`${slug} (erwartet ${oldName})`); continue; }
  plan.push([slug, oldName, newName]);
}

for (const [slug, oldName, newName] of plan) {
  renameSync(path.join(KITS, oldName), path.join(KITS, newName));
  renamed++;
  console.log(`✅ ${slug.padEnd(24)} ${oldName} → ${newName}`);
}

console.log(`\nUmbenannt: ${renamed} · schon aktuell: ${already} · fehlend: ${missing.length}`);
if (missing.length) { console.log("FEHLEND (alter Hash nicht gefunden):"); for (const m of missing) console.log("  - " + m); }
console.log("\n👉 Jetzt: NEW_SALT als Cloudflare-Secret DOWNLOAD_SALT setzen, DANN deployen.");
