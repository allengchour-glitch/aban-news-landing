// GET /api/etsy-callback — Etsy leitet nach der Freigabe hierher. Tauscht den Code gegen Tokens und zeigt den
// Refresh-Token EINMAL an (nicht gespeichert). Er gehört als GitHub-Secret ETSY_REFRESH_TOKEN ins Repo.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const seite = (titel, inhalt, status = 200) => new Response(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titel)}</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;margin:40px auto;padding:0 16px;color:#1f2937;line-height:1.55}
code{display:block;word-break:break-all;background:#fef3c7;padding:12px;border-radius:8px;font-size:14px}ol li{margin:6px 0}</style></head>
<body><h1>${esc(titel)}</h1>${inhalt}</body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const cookies = Object.fromEntries((request.headers.get("Cookie") || "").split(/;\s*/).filter(Boolean).map((c) => c.split("=")));
  if (url.searchParams.get("error")) return seite("Anmeldung abgebrochen", `<p>Etsy meldet: ${esc(url.searchParams.get("error"))}</p><p><a href="/api/etsy-auth">Nochmals versuchen</a></p>`, 400);
  if (!cookies.etsy_v || !url.searchParams.get("code") || url.searchParams.get("state") !== cookies.etsy_s)
    return seite("Anmeldung ungültig", `<p>Sitzung abgelaufen oder ungültig. <a href="/api/etsy-auth">Neu starten</a> (innerhalb von 10 Minuten abschliessen).</p>`, 400);
  const key = (env.ETSY_API_KEY || "").split(":")[0];
  const redirect = env.ETSY_REDIRECT_URI || new URL("/api/etsy-callback", request.url).toString();
  const r = await fetch("https://api.etsy.com/v3/public/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: key, redirect_uri: redirect, code: url.searchParams.get("code"), code_verifier: cookies.etsy_v }),
  });
  if (!r.ok) return seite("Token-Tausch fehlgeschlagen", `<p>Etsy antwortete ${r.status}. <a href="/api/etsy-auth">Neu starten</a>.</p>`, 502);
  const t = await r.json();
  const h = { "Set-Cookie": "etsy_v=; Path=/api/etsy-callback; Max-Age=0" };
  const res = seite("Etsy verbunden", `<p>Fast fertig. Dieser Schlüssel wird nur jetzt angezeigt und nirgends gespeichert:</p>
<code>${esc(t.refresh_token)}</code>
<ol><li>GitHub öffnen: Repo → Settings → Secrets and variables → Actions</li>
<li>„New repository secret“ → Name <b>ETSY_REFRESH_TOKEN</b>, Wert: den Schlüssel oben einfügen</li>
<li>Dann in Actions den Workflow „Etsy-Upload“ starten.</li></ol>
<p>Der Schlüssel gilt 90 Tage. Danach diese Seite erneut aufrufen: <a href="/api/etsy-auth">/api/etsy-auth</a></p>`);
  res.headers.append("Set-Cookie", h["Set-Cookie"]);
  return res;
}
