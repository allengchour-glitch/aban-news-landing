/* LuxeStyle — Cloudflare Worker: autonomes IG + FB Posting per Cron.
 *
 * WARUM: GitHub Actions ist für den User gesperrt. Dieser Worker postet die nächste
 * fällige Queue-Zeile (Produkt + CHF-Preis + CDN-Bild) über die Meta-Graph-API.
 * Medien sind bereits öffentliche Shopify-CDN-URLs → kein ffmpeg/Dateisystem nötig,
 * daher perfekt für Workers. Cron-Trigger in wrangler.toml (z. B. 2×/Tag).
 *
 * SECRETS (1× via `wrangler secret put` oder Dashboard → Settings → Variables):
 *   META_ACCESS_TOKEN   — langlebiger Page- ODER User-Token (Worker findet die Page selbst)
 *   TRIGGER_KEY         — frei wählbar; nur für manuellen Test-Aufruf (?key=…)
 * KV (1× anlegen, an Binding LUXE_KV): speichert Cursor + entdeckte IDs.
 *
 * Manuell testen:  https://luxe-poster.<subdomain>.workers.dev/?key=DEIN_TRIGGER_KEY
 * Status ansehen:  …/?key=…&status=1
 */
import queue from "./queue.json";

const GV = "v21.0";
const G = (p) => `https://graph.facebook.com/${GV}/${p}`;

async function gget(path, params) {
  const u = new URL(G(path));
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u, { method: "GET" });
  return r.json();
}
async function gpost(path, params) {
  const u = new URL(G(path));
  const body = new URLSearchParams(params);
  const r = await fetch(u, { method: "POST", body });
  return r.json();
}

// Page-Token + IG-Business-ID aus dem META_ACCESS_TOKEN ableiten (gecacht in KV).
async function discoverIds(env) {
  const cached = await env.LUXE_KV.get("ids", "json");
  if (cached) return cached;
  const acc = await gget("me/accounts", { access_token: env.META_ACCESS_TOKEN, fields: "id,name,access_token" });
  const pages = acc.data || [];
  // bevorzugt „LuxeStyle"; sonst erste Seite
  const page = pages.find((p) => /luxe/i.test(p.name || "")) || pages[0];
  if (!page) throw new Error("Keine FB-Seite gefunden: " + JSON.stringify(acc).slice(0, 200));
  const ig = await gget(page.id, { access_token: page.access_token, fields: "instagram_business_account" });
  const ids = {
    page_id: page.id,
    page_token: page.access_token,
    ig_id: ig.instagram_business_account ? ig.instagram_business_account.id : null,
  };
  await env.LUXE_KV.put("ids", JSON.stringify(ids), { expirationTtl: 60 * 60 * 24 * 30 });
  return ids;
}

async function postInstagram(ids, item) {
  if (!ids.ig_id) return { skipped: "kein IG-Account verknüpft" };
  const isVideo = item.type === "video" || item.type === "reel";
  const createParams = isVideo
    ? { media_type: "REELS", video_url: item.video, caption: item.caption, access_token: ids.page_token }
    : { image_url: item.image, caption: item.caption, access_token: ids.page_token };
  const created = await gpost(`${ids.ig_id}/media`, createParams);
  if (!created.id) return { error: "IG container", detail: created };
  // Reels brauchen Verarbeitungszeit → kurz warten/pollen
  if (isVideo) {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 6000));
      const st = await gget(created.id, { fields: "status_code", access_token: ids.page_token });
      if (st.status_code === "FINISHED") break;
      if (st.status_code === "ERROR") return { error: "IG video processing", detail: st };
    }
  }
  const pub = await gpost(`${ids.ig_id}/media_publish`, { creation_id: created.id, access_token: ids.page_token });
  return pub.id ? { ok: pub.id } : { error: "IG publish", detail: pub };
}

async function postFacebook(ids, item) {
  if (item.type === "video" || item.type === "reel") {
    // FB Reels-API ist aufwändiger → für Video vorerst nur Link-Post als Fallback
    const r = await gpost(`${ids.page_id}/feed`, { message: item.caption, link: "https://luxestyle.ch", access_token: ids.page_token });
    return r.id ? { ok: r.id } : { error: "FB feed", detail: r };
  }
  const r = await gpost(`${ids.page_id}/photos`, { url: item.image, caption: item.caption, access_token: ids.page_token });
  return r.id ? { ok: r.id } : { error: "FB photo", detail: r };
}

async function run(env) {
  if (!env.META_ACCESS_TOKEN) return { error: "META_ACCESS_TOKEN fehlt" };
  const ids = await discoverIds(env);
  let cursor = parseInt((await env.LUXE_KV.get("cursor")) || "0", 10);
  if (cursor >= queue.length) return { done: true, note: "Queue leer — neue Posts in queue.json + redeploy", cursor };
  const item = queue[cursor];
  const ig = await postInstagram(ids, item).catch((e) => ({ error: String(e) }));
  const fb = await postFacebook(ids, item).catch((e) => ({ error: String(e) }));
  // Cursor nur weiterzählen, wenn mindestens ein Kanal erfolgreich war
  if (ig.ok || fb.ok) await env.LUXE_KV.put("cursor", String(cursor + 1));
  return { index: cursor, item: item.caption.split("\n")[0], ig, fb };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.searchParams.get("key") !== env.TRIGGER_KEY) return new Response("forbidden", { status: 403 });
    if (u.searchParams.get("status")) {
      const cursor = (await env.LUXE_KV.get("cursor")) || "0";
      return Response.json({ cursor: Number(cursor), total: queue.length });
    }
    return Response.json(await run(env));
  },
};
