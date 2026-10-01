// GET /api/pinterest-callback — Pinterest leitet nach der Freigabe hierher. Tauscht den Code gegen Tokens und zeigt den
// Refresh-Token EINMAL an (nicht gespeichert). Er gehört als GitHub-Secret ABAN_PINTEREST_REFRESH_TOKEN ins Repo;
// danach erneuert der Autopilot ihn selbst (verschlüsselt in data/pinterest-aban-token.enc).
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const seite = (titel, inhalt, status = 200) => new Response(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titel)}</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;margin:40px auto;padding:0 16px;color:#1f2937;line-height:1.55}
code{display:block;word-break:break-all;background:#fef3c7;padding:12px;border-radius:8px;font-size:14px}ol li{margin:6px 0}</style></head>
<body><h1>${esc(titel)}</h1>${inhalt}</body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const cookies = Object.fromEntries((request.headers.get("Cookie") || "").split(/;\s*/).filter(Boolean).map((c) => c.split("=")));
  if (url.searchParams.get("error")) return seite("Anmeldung abgebrochen", `<p>Pinterest meldet: ${esc(url.searchParams.get("error"))}</p><p><a href="/api/pinterest-auth">Nochmals versuchen</a></p>`, 400);
  if (!url.searchParams.get("code") || !cookies.pin_s || url.searchParams.get("state") !== cookies.pin_s)
    return seite("Anmeldung ungültig", `<p>Sitzung abgelaufen oder ungültig. <a href="/api/pinterest-auth">Neu starten</a> (innerhalb von 10 Minuten abschliessen).</p>`, 400);
  if (!env.ABAN_PINTEREST_APP_ID || !env.ABAN_PINTEREST_APP_SECRET) return seite("Nicht eingerichtet", "<p>ABAN_PINTEREST_APP_ID / _SECRET fehlen im Pages-Projekt.</p>", 503);
  const redirect = env.ABAN_PINTEREST_REDIRECT_URI || new URL("/api/pinterest-callback", request.url).toString();
  const r = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(`${env.ABAN_PINTEREST_APP_ID}:${env.ABAN_PINTEREST_APP_SECRET}`) },
    body: new URLSearchParams({ grant_type: "authorization_code", code: url.searchParams.get("code"), redirect_uri: redirect }),
  });
  if (!r.ok) return seite("Token-Tausch fehlgeschlagen", `<p>Pinterest antwortete ${r.status}. <a href="/api/pinterest-auth">Neu starten</a>.</p>`, 502);
  const t = await r.json();
  const res = seite("Pinterest verbunden", `<p>Fast fertig. Dieser Schlüssel wird nur jetzt angezeigt und nirgends gespeichert:</p>
<code>${esc(t.refresh_token)}</code>
<ol><li>GitHub öffnen: Repo → Settings → Secrets and variables → Actions</li>
<li>„New repository secret“ → Name <b>ABAN_PINTEREST_REFRESH_TOKEN</b>, Wert: den Schlüssel oben einfügen</li>
<li>Fertig. Der Autopilot postet ab dem nächsten Lauf und erneuert den Schlüssel danach selbst.</li></ol>`);
  res.headers.append("Set-Cookie", "pin_s=; Path=/api/pinterest-callback; Max-Age=0");
  return res;
}
