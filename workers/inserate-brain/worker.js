/**
 * 🧠 aban Inserate-Brain — autonomer Wächter für die Kleinanzeigen (Cloudflare Cron)
 * --------------------------------------------------------------------------------
 * Läuft serverless per Cron (gratis, OHNE GitHub Actions). Beobachtet die Inserate:
 *   1) Ist die Datenbank live? (/api/inserate-list -> demo:true = noch nicht verbunden)
 *   2) Wie viele freigegebene Inserate sind öffentlich sichtbar?
 *   3) Wie viele NEUE warten auf Freigabe? (braucht ADMIN_TOKEN)
 * Vergleicht mit dem letzten Stand (KV) und meldet Änderungen per Telegram:
 *   • „DB ist live" (erstes Mal demo:false)
 *   • „X neue Inserate warten auf Freigabe → /inserate-admin.html"
 *   • „erstes echtes Inserat ist da"
 *
 * Manueller Test:  GET https://<worker>/?run=1&key=<TRIGGER_KEY>
 * Status ansehen:  GET https://<worker>/
 */

const SITE = "https://abannews.com";

async function tg(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: text.slice(0, 3900), disable_web_page_preview: true }),
    });
  } catch (_) {}
}

async function run(env) {
  const out = { ts: new Date().toISOString() };

  // 1) öffentliche (freigegebene) Inserate + DB-Status
  let pub = {};
  try { pub = await fetch(SITE + "/api/inserate-list", { cf: { cacheTtl: 0 } }).then((r) => r.json()); } catch (e) { out.error = "list: " + (e && e.message); }
  out.dbLive = !pub.demo;
  out.approved = Array.isArray(pub.items) ? pub.items.length : 0;

  // 2) ausstehende Inserate (nur mit Admin-Token)
  out.pending = null;
  if (env.ADMIN_TOKEN) {
    try {
      const p = await fetch(SITE + "/api/inserate-list?status=pending&admin=" + encodeURIComponent(env.ADMIN_TOKEN), { cf: { cacheTtl: 0 } }).then((r) => r.json());
      if (Array.isArray(p.items)) out.pending = p.items.length;
    } catch (_) {}
  }

  // 3) mit letztem Stand vergleichen
  let prev = {};
  if (env.INS_KV) { try { prev = JSON.parse((await env.INS_KV.get("last")) || "{}"); } catch (_) {} }

  const alerts = [];
  if (out.dbLive && prev.dbLive === false) alerts.push("🎉 Inserate-Datenbank ist LIVE — echte Inserate können jetzt eingestellt werden.");
  if (out.approved > 0 && (prev.approved || 0) === 0) alerts.push("🥳 Das erste echte Inserat ist öffentlich sichtbar!");
  if (out.pending != null && out.pending > (prev.pending || 0)) {
    const neu = out.pending - (prev.pending || 0);
    alerts.push("📥 " + neu + " neue(s) Inserat(e) warten auf Freigabe (" + out.pending + " offen) → " + SITE + "/inserate-admin.html");
  }
  if (alerts.length) await tg(env, "aban Inserate-Brain:\n" + alerts.join("\n"));

  if (env.INS_KV) {
    await env.INS_KV.put("last", JSON.stringify({ dbLive: out.dbLive, approved: out.approved, pending: out.pending }));
    let hist = [];
    try { hist = JSON.parse((await env.INS_KV.get("history")) || "[]"); } catch (_) {}
    hist.push({ ts: out.ts, approved: out.approved, pending: out.pending, dbLive: out.dbLive });
    await env.INS_KV.put("history", JSON.stringify(hist.slice(-90)));
  }
  out.alerts = alerts;
  return out;
}

export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(run(env)); },
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.searchParams.get("run") === "1") {
      if (env.TRIGGER_KEY && url.searchParams.get("key") !== env.TRIGGER_KEY) return new Response("forbidden", { status: 403 });
      return Response.json(await run(env));
    }
    let last = null;
    if (env.INS_KV) { try { last = JSON.parse((await env.INS_KV.get("last")) || "null"); } catch (_) {} }
    return Response.json(last || { info: "Noch kein Lauf. Starte mit /?run=1&key=<TRIGGER_KEY>." });
  },
};
