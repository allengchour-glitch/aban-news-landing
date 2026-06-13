/**
 * LuxeStyle Pinterest-Cron-Worker
 * --------------------------------
 * Postet die fertigen Pins aus dropship/pinterest_pins.csv über die Pinterest-API v5.
 * Läuft GRATIS per Cloudflare-Cron-Trigger (kein GitHub Actions, keine GitLab-Minuten).
 *
 * - Holt die CSV von der öffentlichen Roh-URL (env.CSV_URL).
 * - Idempotent über KV (env.PIN_KV): pro geposteten Pin-Link ein Key "1".
 * - Drosselt (1 Pin / ~2 s), max. env.LIMIT neue Pins pro Lauf.
 * - Token: env.PINTEREST_ACCESS_TOKEN ODER Refresh-Trio (REFRESH/APP_ID/APP_SECRET).
 * - Manueller Test: GET https://<worker>/?key=<TRIGGER_KEY>  (wenn MANUAL_ENABLED=1).
 *
 * ⚠️ Pinterest-API braucht "Standard Access" — eine Trial-/Consumer-App liefert
 *    401 "consumer type not supported" (kein Token-Fehler). Siehe README.
 */

const API = "https://api.pinterest.com/v5";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env, { manual: false }));
  },

  async fetch(req, env) {
    if (env.MANUAL_ENABLED !== "1") return new Response("manual trigger disabled", { status: 403 });
    const url = new URL(req.url);
    if (env.TRIGGER_KEY && url.searchParams.get("key") !== env.TRIGGER_KEY) {
      return new Response("forbidden", { status: 403 });
    }
    const dry = url.searchParams.get("dry") === "1";
    const result = await run(env, { manual: true, dry });
    return new Response(JSON.stringify(result, null, 2), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  },
};

async function run(env, { manual, dry = false }) {
  const log = [];
  const say = (m) => { log.push(m); console.log(m); };
  try {
    const limit = parseInt(env.LIMIT || "5", 10);
    let token = env.PINTEREST_ACCESS_TOKEN || null;

    if (!token && !dry) {
      token = await refreshAccessToken(env);
      if (!token) { say("❌ Kein Pinterest-Zugang (Token/Refresh-Trio fehlt)."); return { ok: false, log }; }
    }

    const csvRes = await fetch(env.CSV_URL, { cf: { cacheTtl: 0 } });
    if (!csvRes.ok) { say(`❌ CSV nicht ladbar (${csvRes.status}).`); return { ok: false, log }; }
    const rows = parseCsv(await csvRes.text());
    const header = rows.shift().map((h) => h.trim());
    const col = (n) => header.indexOf(n);
    const ci = {
      title: col("Title"), media: col("Media URL"), board: col("Pinterest board"),
      desc: col("Description"), link: col("Link"),
    };

    // Offene Pins ermitteln (KV-Ledger pro Link).
    const pending = [];
    for (const r of rows) {
      const link = (r[ci.link] || "").trim();
      if (!link) continue;
      if (dry) { pending.push(r); continue; }
      const seen = await env.PIN_KV.get("pin:" + link);
      if (!seen) pending.push(r);
      if (pending.length >= limit) break;
    }
    const todo = pending.slice(0, limit);
    say(`📌 ${rows.length} Pins gesamt · diesmal ${todo.length} (limit ${limit}${dry ? ", dry" : ""}).`);
    if (!todo.length) return { ok: true, posted: 0, log };

    // Boards sicherstellen (Name → id).
    const boardNames = [...new Set(todo.map((r) => (r[ci.board] || "").trim()).filter(Boolean))];
    const boards = await getOrCreateBoards(boardNames, token, env, dry, say);

    let posted = 0;
    for (const r of todo) {
      const title = (r[ci.title] || "").trim().slice(0, 100);
      const desc = (r[ci.desc] || "").trim().slice(0, 500);
      const link = (r[ci.link] || "").trim();
      const media = (r[ci.media] || "").trim();
      const boardId = boards.get((r[ci.board] || "").trim());
      if (dry) { say(`  [dry] Pin: ${title}`); posted++; continue; }
      try {
        await api("/pins", "POST", token, {
          board_id: boardId, title, description: desc, link,
          media_source: { source_type: "image_url", url: media },
        });
        await env.PIN_KV.put("pin:" + link, "1");
        say(`  ✅ ${title}`);
        posted++;
        await sleep(2000);
      } catch (e) {
        say(`  ⚠️ Fehlgeschlagen (${title}): ${e.message}`);
        if (e.status === 401) { say("Token ungültig → Abbruch."); break; }
      }
    }
    say(`Fertig: ${posted}/${todo.length} Pins ${dry ? "(dry)" : "live"}.`);
    return { ok: true, posted, manual, log };
  } catch (e) {
    say("❌ " + e.message);
    return { ok: false, log };
  }
}

async function refreshAccessToken(env) {
  const { PINTEREST_REFRESH_TOKEN: rt, PINTEREST_APP_ID: id, PINTEREST_APP_SECRET: sec } = env;
  if (!rt || !id || !sec) return null;
  const basic = btoa(`${id}:${sec}`);
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: rt }),
  });
  if (!res.ok) throw new Error(`Token-Refresh → ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function api(path, method, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) { const err = new Error(`Pinterest ${method} ${path} → ${res.status}: ${text}`); err.status = res.status; throw err; }
  return text ? JSON.parse(text) : {};
}

async function getOrCreateBoards(names, token, env, dry, say) {
  const map = new Map();
  if (dry) { for (const n of names) map.set(n, "dry-" + n); return map; }
  let bookmark = "";
  do {
    const q = bookmark ? `?bookmark=${encodeURIComponent(bookmark)}` : "";
    const data = await api(`/boards${q}`, "GET", token);
    for (const b of data.items || []) map.set(b.name.trim(), b.id);
    bookmark = data.bookmark || "";
  } while (bookmark);
  for (const n of names) {
    if (map.has(n)) continue;
    const created = await api("/boards", "POST", token, {
      name: n,
      description: `LuxeStyle CH — ${n}. Schweizer Online-Shop, faire Preise, −10% mit WELCOME10.`,
      privacy: "PUBLIC",
    });
    map.set(n, created.id);
    say(`  ✅ Board angelegt: ${n}`);
    await sleep(1500);
  }
  return map;
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
