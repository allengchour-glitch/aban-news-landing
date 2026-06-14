/**
 * 🧠 aban Site-Brain — Live-Gesundheits-Wächter für abannews.com (Cloudflare Cron)
 * ------------------------------------------------------------------------------
 * Läuft serverless per Cron (gratis, OHNE GitHub Actions / GitLab). Prüft die
 * wichtigsten Seiten LIVE: HTTP 200, <title>, canonical, og:title, meta-description.
 * Berechnet einen Health-Score, speichert den Verlauf in KV und alarmiert optional
 * per Telegram, sobald etwas kaputt ist.
 *
 * WICHTIG — was dieser Worker NICHT tut: Er fixt nichts und deployt nichts. Das braucht
 * den Quellcode + Review (Branch + PR + Deploy) und macht der GitLab-Brain-Job oder eine
 * Claude-Session. Dieser Worker ist das AUGE des Hirns: er merkt Probleme sofort.
 *
 * Manueller Test:  GET https://<worker>/?run=1&key=<TRIGGER_KEY>
 * Status ansehen:  GET https://<worker>/
 */

const SITE = "https://abannews.com";

// Die wichtigsten Seiten, die immer gesund sein müssen.
const CRITICAL = [
  "/", "/cockpit-app.html", "/online-tools.html", "/selbststaendig-ratgeber.html",
  "/rechnung-generator.html", "/finanz-rechner.html", "/business-cockpit.html",
  "/mwst-rechner.html", "/stundensatz-rechner.html",
  "/lexoffice-vs-sevdesk.html", "/qonto-vs-kontist.html",
  "/rechnungsprogramm-kostenlos.html", "/gewerbe-anmelden-kosten.html",
  "/sitemap.xml",
];

function checkPage(path, status, body) {
  const issues = [];
  if (status !== 200) issues.push("status " + status);
  if (path.endsWith(".xml")) return issues; // Sitemap: nur Erreichbarkeit
  if (status !== 200) return issues;
  const low = body.toLowerCase();
  if (!low.includes("<title")) issues.push("kein <title>");
  if (!/rel=["']?canonical/.test(low)) issues.push("kein canonical");
  if (!low.includes('property="og:title"')) issues.push("kein og:title");
  if (!low.includes('name="description"')) issues.push("keine description");
  return issues;
}

async function run(env) {
  const results = [];
  let ok = 0;
  for (const path of CRITICAL) {
    try {
      const r = await fetch(SITE + path, {
        redirect: "follow",
        headers: { "user-agent": "aban-site-brain/1.0" },
        cf: { cacheTtl: 0 },
      });
      const body = r.status === 200 ? await r.text() : "";
      const issues = checkPage(path, r.status, body);
      if (issues.length === 0) ok++;
      results.push({ path, status: r.status, issues });
    } catch (e) {
      results.push({ path, status: 0, issues: ["fetch-error: " + (e && e.message || e)] });
    }
  }
  const total = CRITICAL.length;
  const score = Math.round((ok / total) * 1000) / 10;
  const broken = results.filter((r) => r.issues.length);
  const snap = { ts: new Date().toISOString(), score, ok, total, broken };

  if (env.BRAIN_KV) {
    await env.BRAIN_KV.put("last", JSON.stringify(snap));
    let hist = [];
    try { hist = JSON.parse((await env.BRAIN_KV.get("history")) || "[]"); } catch (_) {}
    hist.push({ ts: snap.ts, score, broken: broken.length });
    hist = hist.slice(-90);
    await env.BRAIN_KV.put("history", JSON.stringify(hist));
  }

  if (broken.length && env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    const msg = "⚠️ aban Site-Brain: " + broken.length + "/" + total +
      " Seiten mit Problemen (Score " + score + ").\n" +
      broken.map((b) => "• " + b.path + ": " + b.issues.join(", ")).join("\n");
    try {
      await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: msg.slice(0, 3900) }),
      });
    } catch (_) {}
  }
  return snap;
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.searchParams.get("run") === "1") {
      if (env.TRIGGER_KEY && url.searchParams.get("key") !== env.TRIGGER_KEY) {
        return new Response("forbidden", { status: 403 });
      }
      return Response.json(await run(env));
    }
    let last = null;
    if (env.BRAIN_KV) {
      try { last = JSON.parse((await env.BRAIN_KV.get("last")) || "null"); } catch (_) {}
    }
    return Response.json(last || { info: "Noch kein Lauf. Starte mit /?run=1&key=<TRIGGER_KEY>." });
  },
};
