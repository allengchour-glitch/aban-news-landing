#!/usr/bin/env node
// =============================================================================
//  HeyGen-Klon — eigenes Werkzeug für Text → Avatar-Video (Talking-Head)
// -----------------------------------------------------------------------------
//  Macht die HeyGen-Kernfunktion als DEINE eigene App nutzbar: listet Avatare/
//  Stimmen, erzeugt Videos einzeln oder als Batch und lädt die fertigen MP4s
//  lokal herunter. So holst du in deinem bezahlten Monat alle Videos raus —
//  die Outputs gehören dir und bleiben nach einer Kündigung erhalten.
//
//  🔐 Liest HEYGEN_API_KEY AUSSCHLIESSLICH aus der Umgebung — nie hartcodiert.
//  📦 Keine npm-Deps (Node 18+ / node22, globales fetch).
//
//  Befehle:
//    node automation/heygen_clone.mjs avatars                 Avatare auflisten (id + Name)
//    node automation/heygen_clone.mjs voices [suchwort]       Stimmen auflisten (optional gefiltert)
//    node automation/heygen_clone.mjs gen "Text" \            Einzelvideo erzeugen
//         --avatar <avatar_id> --voice <voice_id> \
//         [--out heygen/out/clip.mp4] [--w 1080 --h 1920] [--bg "#ffffff"]
//    node automation/heygen_clone.mjs batch heygen/queue.json Alle Einträge der Queue erzeugen
//    node automation/heygen_clone.mjs status <video_id>       Status eines Jobs prüfen
//
//  Queue-Format (heygen/queue.json):
//    [ { "name":"reel1", "text":"...", "avatar":"<id>", "voice":"<id>",
//        "w":1080, "h":1920, "bg":"#ffffff" } ]
// =============================================================================

import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const KEY = process.env.HEYGEN_API_KEY || "";
const BASE = "https://api.heygen.com";
const OUT_DIR = "heygen/out";
const POLL_EVERY_MS = 10000;
const POLL_MAX_MS = 20 * 60 * 1000; // 20 Min pro Video

function die(msg, code = 1) { console.error(msg); process.exit(code); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireKey() {
  if (!KEY) {
    die(
      "❌ HEYGEN_API_KEY fehlt.\n" +
      "   Setz ihn als Umgebungsvariable (NICHT in eine Datei committen):\n" +
      "     export HEYGEN_API_KEY=\"dein_key\"\n" +
      "   oder als Repo-/Session-Secret. Dann erneut ausführen."
    );
  }
}

async function api(p, { method = "GET", body } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "X-Api-Key": KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const m = (data && (data.message || (data.error && data.error.message))) || res.status;
    throw new Error(`HeyGen ${method} ${p} → ${res.status}: ${m}`);
  }
  return data;
}

// ---- Befehle ---------------------------------------------------------------

async function listAvatars() {
  const d = await api("/v2/avatars");
  const avatars = (d.data && d.data.avatars) || [];
  const photos = (d.data && d.data.talking_photos) || [];
  console.log(`# ${avatars.length} Avatare:`);
  for (const a of avatars) console.log(`  ${a.avatar_id}\t${a.avatar_name || ""}\t${a.gender || ""}`);
  if (photos.length) {
    console.log(`\n# ${photos.length} Talking Photos:`);
    for (const p of photos) console.log(`  ${p.talking_photo_id}\t${p.talking_photo_name || ""}`);
  }
}

async function listVoices(filter) {
  const d = await api("/v2/voices");
  let voices = (d.data && d.data.voices) || [];
  if (filter) {
    const f = filter.toLowerCase();
    voices = voices.filter((v) =>
      [(v.name || ""), (v.language || ""), (v.gender || "")].join(" ").toLowerCase().includes(f));
  }
  console.log(`# ${voices.length} Stimmen${filter ? ` (Filter: ${filter})` : ""}:`);
  for (const v of voices) console.log(`  ${v.voice_id}\t${v.language || ""}\t${v.gender || ""}\t${v.name || ""}`);
}

// Startet einen Video-Job und gibt die video_id zurück.
async function startVideo({ text, avatar, voice, w = 1080, h = 1920, bg = "#ffffff" }) {
  if (!text) throw new Error("Kein Text angegeben.");
  if (!avatar) throw new Error("Kein --avatar (avatar_id) angegeben. Tipp: 'avatars' auflisten.");
  if (!voice) throw new Error("Kein --voice (voice_id) angegeben. Tipp: 'voices' auflisten.");
  const body = {
    video_inputs: [{
      character: { type: "avatar", avatar_id: avatar, avatar_style: "normal" },
      voice: { type: "text", input_text: text, voice_id: voice },
      background: { type: "color", value: bg },
    }],
    dimension: { width: Number(w), height: Number(h) },
  };
  const d = await api("/v2/video/generate", { method: "POST", body });
  const id = d.data && d.data.video_id;
  if (!id) throw new Error("Keine video_id in der Antwort: " + JSON.stringify(d));
  return id;
}

async function getStatus(id) {
  const d = await api(`/v1/video_status.get?video_id=${encodeURIComponent(id)}`);
  return d.data || {};
}

// Pollt bis fertig/fehlgeschlagen, lädt das MP4 herunter.
async function waitAndDownload(id, outFile) {
  const start = Date.now();
  while (Date.now() - start < POLL_MAX_MS) {
    const s = await getStatus(id);
    if (s.status === "completed" && s.video_url) {
      await mkdir(path.dirname(outFile), { recursive: true });
      const r = await fetch(s.video_url);
      if (!r.ok) throw new Error("Download fehlgeschlagen: " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      await writeFile(outFile, buf);
      console.log(`  ✅ ${outFile} (${(buf.length / 1e6).toFixed(1)} MB)`);
      return outFile;
    }
    if (s.status === "failed") {
      throw new Error("Job fehlgeschlagen: " + JSON.stringify(s.error || s));
    }
    process.stdout.write(`  … ${s.status || "processing"} (${Math.round((Date.now() - start) / 1000)}s)\r`);
    await sleep(POLL_EVERY_MS);
  }
  throw new Error("Timeout (20 Min) — Job nicht fertig. Status später mit 'status " + id + "' prüfen.");
}

function parseFlags(args) {
  const out = {}; const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) { out[a.slice(2)] = args[i + 1]; i++; }
    else pos.push(a);
  }
  return { out, pos };
}

async function genOne(args) {
  requireKey();
  const { out, pos } = parseFlags(args);
  const text = pos[0] || out.text;
  const name = (out.out || `heygen/out/clip-${Date.now()}.mp4`);
  console.log(`▶ Erzeuge Video …`);
  const id = await startVideo({ text, avatar: out.avatar, voice: out.voice, w: out.w, h: out.h, bg: out.bg });
  console.log(`  video_id: ${id}`);
  await waitAndDownload(id, name);
}

async function batch(file) {
  requireKey();
  if (!file || !existsSync(file)) die(`❌ Queue-Datei nicht gefunden: ${file}`);
  const items = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(items) || !items.length) die("❌ Queue ist leer oder kein JSON-Array.");
  console.log(`▶ Batch: ${items.length} Video(s)`);
  const results = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const nm = it.name || `clip-${i + 1}`;
    const outFile = path.join(OUT_DIR, `${nm}.mp4`);
    console.log(`\n[${i + 1}/${items.length}] ${nm}`);
    try {
      const id = await startVideo(it);
      console.log(`  video_id: ${id}`);
      await waitAndDownload(id, outFile);
      results.push({ name: nm, ok: true, file: outFile });
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
      results.push({ name: nm, ok: false, error: e.message });
    }
  }
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n✔ Fertig: ${ok}/${results.length} erfolgreich. Outputs in ${OUT_DIR}/`);
}

// ---- Dispatch --------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2);
(async () => {
  try {
    switch (cmd) {
      case "avatars": requireKey(); await listAvatars(); break;
      case "voices": requireKey(); await listVoices(rest[0]); break;
      case "gen": await genOne(rest); break;
      case "batch": await batch(rest[0]); break;
      case "status": {
        requireKey();
        const s = await getStatus(rest[0]);
        console.log(JSON.stringify(s, null, 2));
        break;
      }
      default:
        console.log(readFileSync(new URL(import.meta.url)).toString().split("\n").slice(2, 30).join("\n"));
    }
  } catch (e) {
    die("❌ " + e.message);
  }
})();
