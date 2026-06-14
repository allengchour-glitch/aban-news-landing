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
  const isStory = item.type === "story";
  let createParams;
  if (isStory) {
    // IG-Story: Foto- oder Video-Story (ohne Caption — Stories zeigen keinen Text-Body)
    createParams = item.video
      ? { media_type: "STORIES", video_url: item.video, access_token: ids.page_token }
      : { media_type: "STORIES", image_url: item.image, access_token: ids.page_token };
  } else if (isVideo) {
    createParams = { media_type: "REELS", video_url: item.video, caption: item.caption, access_token: ids.page_token };
  } else {
    createParams = { image_url: item.image, caption: item.caption, access_token: ids.page_token };
  }
  const created = await gpost(`${ids.ig_id}/media`, createParams);
  if (!created.id) return { error: "IG container", detail: created };
  // Video (Reel ODER Video-Story) braucht Verarbeitungszeit → pollen
  if (isVideo || (isStory && item.video)) {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 6000));
      const st = await gget(created.id, { fields: "status_code", access_token: ids.page_token });
      if (st.status_code === "FINISHED") break;
      if (st.status_code === "ERROR") return { error: "IG processing", detail: st };
    }
  }
  const pub = await gpost(`${ids.ig_id}/media_publish`, { creation_id: created.id, access_token: ids.page_token });
  return pub.id ? { ok: pub.id } : { error: "IG publish", detail: pub };
}

// FB hosted-file Upload (resumable) für video_reels UND video_stories: FB zieht das Video selbst
// über den file_url-Header — kein Byte-Streaming im Worker nötig. start → upload(file_url) → finish.
async function fbVideoUpload(ids, edge, videoUrl, finishParams) {
  const start = await gpost(`${ids.page_id}/${edge}`, { upload_phase: "start", access_token: ids.page_token });
  if (!start.video_id || !start.upload_url) return { error: edge + " start", detail: start };
  const up = await fetch(start.upload_url, { method: "POST", headers: { Authorization: "OAuth " + ids.page_token, file_url: videoUrl } });
  const upj = await up.json().catch(() => ({}));
  // FB Zeit zum Ingesten geben, dann finishen (PUBLISHED)
  await new Promise((r) => setTimeout(r, 8000));
  const fin = await gpost(`${ids.page_id}/${edge}`, { upload_phase: "finish", video_id: start.video_id, access_token: ids.page_token, ...finishParams });
  return (fin.success || fin.post_id || fin.id) ? { ok: fin.post_id || start.video_id } : { error: edge + " finish", detail: fin, up: upj };
}

async function postFacebook(ids, item) {
  // FB-Story (automatisiert die „Deine Story ist abgelaufen / teile dein Reel"-Nudges)
  if (item.type === "story") {
    if (item.video) return await fbVideoUpload(ids, "video_stories", item.video, {});
    // Foto-Story: erst UNveröffentlicht hochladen (published=false) → dann als Story publizieren
    const ph = await gpost(`${ids.page_id}/photos`, { url: item.image, published: "false", access_token: ids.page_token });
    if (!ph.id) return { error: "FB story photo upload", detail: ph };
    const st = await gpost(`${ids.page_id}/photo_stories`, { photo_id: ph.id, access_token: ids.page_token });
    return (st.success || st.post_id) ? { ok: st.post_id || ph.id, story: true } : { error: "FB photo_stories", detail: st };
  }
  if (item.type === "video" || item.type === "reel") {
    if (item.video) return await fbVideoUpload(ids, "video_reels", item.video, { video_state: "PUBLISHED", description: item.caption || "" });
    // kein Video-URL → Link-Post-Fallback
    const r = await gpost(`${ids.page_id}/feed`, { message: item.caption, link: "https://luxestyle.ch", access_token: ids.page_token });
    return r.id ? { ok: r.id } : { error: "FB feed", detail: r };
  }
  const r = await gpost(`${ids.page_id}/photos`, { url: item.image, caption: item.caption, access_token: ids.page_token });
  return r.id ? { ok: r.id } : { error: "FB photo", detail: r };
}

// Queue laden: bevorzugt LIVE-URL aus KV (selbst-aktualisierend, KEIN Redeploy/PowerShell nötig),
// sonst die eingebackene queue.json als Fallback. So aktualisiert der Cloud-Claude den Inhalt jederzeit.
async function loadQueue(env) {
  try {
    const url = await env.LUXE_KV.get("queue_url");
    if (url) {
      const r = await fetch(url, { cf: { cacheTtl: 60 } });
      if (r.ok) { const j = JSON.parse(await r.text()); if (Array.isArray(j) && j.length) return j; }
    }
  } catch (e) { /* Fallback unten */ }
  return queue;
}

// Alte FB-Posts aufräumen (vor cutoff). Läuft IM Worker (dein Token) → keine Cloud-Sperre.
// IG kann per API NICHT gelöscht werden (nur in der App). Cap 40 pro Aufruf (Subrequest-Limit).
async function cleanupOldFb(env, cutoff) {
  const ids = await discoverIds(env);
  let u = new URL(G(`${ids.page_id}/posts`));
  u.searchParams.set("fields", "id,created_time"); u.searchParams.set("limit", "100"); u.searchParams.set("access_token", ids.page_token);
  let all = [], next = u.toString();
  for (let i = 0; i < 6 && next; i++) { const r = await (await fetch(next)).json(); if (r.error) break; all = all.concat(r.data || []); next = r.paging && r.paging.next; }
  const old = all.filter((x) => (x.created_time || "") < cutoff).slice(0, 40);
  let deleted = 0, failed = 0;
  for (const x of old) {
    const d = await (await fetch(`${G(x.id)}?access_token=${ids.page_token}`, { method: "DELETE" })).json();
    if (d.success) deleted++; else failed++;
  }
  return { cutoff, fb_total: all.length, deleted, failed, note: failed || old.length === 40 ? "Nochmal aufrufen für weitere." : "Fertig. (IG nur in der App löschbar.)" };
}

// META-ANALYSE (User „analysiere öfters meta tiktok"): läuft autonom bei JEDEM Cron — der Worker
// hat den Page-Token. Holt IG+FB-Engagement der letzten Posts, bildet eine Kurz-Zusammenfassung
// und schreibt sie in ein rollendes KV-Log (insights_log, letzte 14). Lesen via ?insights=1.
async function metaInsights(ids, env) {
  const out = { ts: new Date().toISOString().slice(0, 16) };
  try { // Instagram: like_count + comments_count je Media
    const m = await gget(`${ids.ig_id}/media`, { fields: "id,caption,like_count,comments_count,media_type,timestamp", limit: "12", access_token: ids.page_token });
    const md = (m.data || []).map((x) => ({ eng: (x.like_count || 0) + (x.comments_count || 0), cap: (x.caption || "").slice(0, 40), t: x.media_type }));
    const eng = md.reduce((s, x) => s + x.eng, 0); const top = md.sort((a, b) => b.eng - a.eng)[0];
    out.ig = { posts: md.length, eng, avg: md.length ? Math.round(eng / md.length) : 0, top: top ? { eng: top.eng, cap: top.cap } : null };
  } catch (e) { out.ig = { error: String(e).slice(0, 80) }; }
  try { // Facebook-Page: Reaktionen + Kommentare + Shares je Post
    const f = await gget(`${ids.page_id}/posts`, { fields: "id,message,shares,reactions.summary(true),comments.summary(true)", limit: "12", access_token: ids.page_token });
    const fd = (f.data || []).map((x) => ({ eng: ((x.reactions && x.reactions.summary && x.reactions.summary.total_count) || 0) + ((x.comments && x.comments.summary && x.comments.summary.total_count) || 0) + ((x.shares && x.shares.count) || 0), cap: (x.message || "").slice(0, 40) }));
    const eng = fd.reduce((s, x) => s + x.eng, 0); const top = fd.sort((a, b) => b.eng - a.eng)[0];
    out.fb = { posts: fd.length, eng, avg: fd.length ? Math.round(eng / fd.length) : 0, top: top ? { eng: top.eng, cap: top.cap } : null };
  } catch (e) { out.fb = { error: String(e).slice(0, 80) }; }
  try {
    const log = JSON.parse((await env.LUXE_KV.get("insights_log")) || "[]");
    log.unshift(out); await env.LUXE_KV.put("insights_log", JSON.stringify(log.slice(0, 14)));
  } catch (e) { /* KV best-effort */ }
  return out;
}

async function run(env) {
  if (!env.META_ACCESS_TOKEN) return { error: "META_ACCESS_TOKEN fehlt" };
  const ids = await discoverIds(env);
  const q = await loadQueue(env);
  let cursor = parseInt((await env.LUXE_KV.get("cursor")) || "0", 10);
  if (cursor >= q.length) return { done: true, note: "Queue durch — Cursor 0 setzen oder neue queue_url laden", cursor };
  const item = q[cursor];
  const ig = await postInstagram(ids, item).catch((e) => ({ error: String(e) }));
  const fb = await postFacebook(ids, item).catch((e) => ({ error: String(e) }));
  // Cursor nur weiterzählen, wenn mindestens ein Kanal erfolgreich war
  if (ig.ok || fb.ok) await env.LUXE_KV.put("cursor", String(cursor + 1));
  // Meta-Analyse mitlaufen lassen (autonom, jeder Cron) — Performance laufend beobachten
  const insights = await metaInsights(ids, env).catch((e) => ({ error: String(e) }));
  return { index: cursor, item: item.caption.split("\n")[0], ig, fb, insights };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.searchParams.get("key") !== env.TRIGGER_KEY) return new Response("forbidden", { status: 403 });
    // Neue Live-Queue laden (ohne Redeploy) + Cursor zurücksetzen — der Cloud-Claude ruft das auf.
    const setq = u.searchParams.get("queue");
    if (setq) { await env.LUXE_KV.put("queue_url", setq); await env.LUXE_KV.put("cursor", "0"); return Response.json({ queue_url_set: setq, cursor: 0 }); }
    const clean = u.searchParams.get("cleanup");
    if (clean) return Response.json(await cleanupOldFb(env, clean).catch((e) => ({ error: String(e) })));
    // Meta-Analyse-Verlauf ansehen (IG+FB-Engagement, autonom 2×/Tag gesammelt)
    if (u.searchParams.get("insights")) {
      const log = JSON.parse((await env.LUXE_KV.get("insights_log")) || "[]");
      return Response.json({ entries: log.length, log });
    }
    if (u.searchParams.get("cursor")) { await env.LUXE_KV.put("cursor", u.searchParams.get("cursor")); return Response.json({ cursor_set: u.searchParams.get("cursor") }); }
    if (u.searchParams.get("status")) {
      const q = await loadQueue(env);
      const cursor = (await env.LUXE_KV.get("cursor")) || "0";
      const url = await env.LUXE_KV.get("queue_url");
      return Response.json({ cursor: Number(cursor), total: q.length, queue_url: url || "(eingebacken)" });
    }
    return Response.json(await run(env));
  },
};
