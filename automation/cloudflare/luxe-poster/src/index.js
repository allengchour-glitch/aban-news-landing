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

// FB-DOPPEL-POSTS entfernen: gruppiert nach identischer Caption (erste 80 Zeichen), behält den ÄLTESTEN,
// löscht die Doppelten. ?dedupe=1 (löschen) oder ?dedupe=1&dry=1 (nur zeigen). Cap 40/Aufruf.
async function dedupeFb(env, doDelete) {
  const ids = await discoverIds(env);
  let u = new URL(G(`${ids.page_id}/posts`));
  u.searchParams.set("fields", "id,message,created_time"); u.searchParams.set("limit", "100"); u.searchParams.set("access_token", ids.page_token);
  let all = [], next = u.toString();
  for (let i = 0; i < 6 && next; i++) { const r = await (await fetch(next)).json(); if (r.error) break; all = all.concat(r.data || []); next = r.paging && r.paging.next; }
  const groups = {};
  for (const p of all) { const k = (p.message || "").slice(0, 80).trim(); if (!k) continue; (groups[k] = groups[k] || []).push(p); }
  const dups = [];
  for (const k in groups) { const g = groups[k].sort((a, b) => (a.created_time < b.created_time ? -1 : 1)); for (let i = 1; i < g.length; i++) dups.push(g[i]); }
  let deleted = 0;
  if (doDelete) { for (const p of dups.slice(0, 40)) { const d = await (await fetch(`${G(p.id)}?access_token=${ids.page_token}`, { method: "DELETE" })).json(); if (d.success) deleted++; } }
  return { scanned: all.length, duplicate_groups: Object.values(groups).filter(g => g.length > 1).length, duplicates_found: dups.length, deleted, dry: !doDelete, sample: dups.slice(0, 10).map(p => ({ id: p.id, msg: (p.message || "").slice(0, 50) })) };
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

// TikTok: gültigen Access-Token via Refresh holen (TT-Token leben ~24h). Secrets:
// TT_CLIENT_KEY, TT_CLIENT_SECRET + TT_REFRESH_TOKEN (1× per OAuth, tiktok-oauth.mjs). Rotierter Refresh -> KV.
async function ttToken(env) {
  const ck = env.TT_CLIENT_KEY, cs = env.TT_CLIENT_SECRET;
  const rt = (await env.LUXE_KV.get("tt_refresh")) || env.TT_REFRESH_TOKEN;
  if (!ck || !cs || !rt) return null;
  const body = new URLSearchParams({ client_key: ck, client_secret: cs, grant_type: "refresh_token", refresh_token: rt });
  const r = await (await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body })).json();
  if (!r.access_token) return null;
  if (r.refresh_token) await env.LUXE_KV.put("tt_refresh", r.refresh_token);
  return r.access_token;
}

// TikTok-ENTWURF posten (Inbox/FILE_UPLOAD): Reel landet in den TikTok-Entwürfen -> du legst Trend-Sound
// drauf + postest (1 Tipp). Funktioniert auch ohne App-Audit (eigenes Konto). Trend-Sound geht eh nur in-app.
async function postTikTok(item, env) {
  if (!item.video) return { skipped: "kein Video" };
  if (!env.TT_CLIENT_KEY) return { skipped: "keine TikTok-Creds" };
  const tok = await ttToken(env);
  if (!tok) return { error: "TikTok-Token/Refresh fehlt (OAuth + Secrets nötig)" };
  const vr = await fetch(item.video);
  if (!vr.ok) return { error: "Video-URL " + vr.status };
  const buf = new Uint8Array(await vr.arrayBuffer());
  const size = buf.byteLength;
  const init = await (await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
    body: JSON.stringify({ source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: size, total_chunk_count: 1 } }),
  })).json();
  const up = init.data && init.data.upload_url, pid = init.data && init.data.publish_id;
  if (!up) return { error: "TikTok init", detail: init.error || init };
  const put = await fetch(up, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(size), "Content-Range": `bytes 0-${size - 1}/${size}` }, body: buf });
  if (put.status < 200 || put.status >= 300) return { error: "TikTok upload " + put.status };
  return { ok: pid, draft: true };
}

// ===== KOMMENTAR-AUTO-ANTWORT (autonom bei jedem Cron, idempotent über KV) =====
const SPAM_RE = /https?:\/\/|t\.me\/|wa\.me\/|whatsapp|telegram|seguidores|followers|promo(c|t)|\bdm\b|inbox me|check my|verkaufe|crypto|invest/i;
const C_TOPIC = [
  ['versand', /versand|liefer|wann kommt|geliefert|sendung|paket|shipping|delivery/i],
  ['groesse', /grösse|groesse|size|passt|fällt (gross|klein)|masse|welche grösse/i],
  ['preis',   /preis|kostet|chf|rabatt|code|gutschein|zahlung|twint|bezahl|price|discount/i],
  ['verfueg', /verfügbar|lager|available|noch da|ausverkauft|stock/i],
];
const C_REPLY = {
  versand: ['Mir liefere schweizwiit – gratis ab CHF 65 🚚🇨🇭 Meh uf luxestyle.ch', 'Hoi! 📦 Schweizwiite Versand, gratis ab CHF 65. Infos uf luxestyle.ch ✨'],
  groesse: ['D Grössetabälle findsch direkt bim Produkt uf luxestyle.ch 📏 Frag sönsch gern!'],
  preis:   ['Merci! 🛍️ Dr Pris staht im Shop 👉 luxestyle.ch – mit Code WELCOME10 gits –10% 🤍'],
  verfueg: ['Jaa, a Lager & sofort bestellbar ✅ luxestyle.ch 🇨🇭'],
  allgemein: ['Merci vilmal! 🙏🇨🇭 Schau gern verbii uf luxestyle.ch ✨', 'Danke dir! 😍 Meh devo uf luxestyle.ch 🛍️', 'Freut üs mega! 🙌 luxestyle.ch (–10% mit WELCOME10)'],
};
const cTopic = (t = '') => { for (const [n, re] of C_TOPIC) if (re.test(t)) return n; return 'allgemein'; };
const cReply = (t) => { const a = C_REPLY[cTopic(t)] || C_REPLY.allgemein; return a[Math.floor(Math.random() * a.length)]; };

async function replyComments(ids, env, max = 6) {
  const out = { ig: 0, fb: 0, skipped: 0 };
  let replied = [];
  try { replied = JSON.parse((await env.LUXE_KV.get('replied_comments')) || '[]'); } catch {}
  const seen = new Set(replied);
  let done = 0;
  let myIg = '';
  if (ids.ig_id) { try { myIg = (await gget(ids.ig_id, { access_token: ids.page_token, fields: 'username' })).username || ''; } catch {} }

  if (ids.ig_id) {
    try {
      const media = await gget(`${ids.ig_id}/media`, { access_token: ids.page_token, fields: 'id', limit: '8' });
      for (const m of (media.data || [])) {
        if (done >= max) break;
        const cs = await gget(`${m.id}/comments`, { access_token: ids.page_token, fields: 'id,text,username', limit: '25' });
        for (const c of (cs.data || [])) {
          if (done >= max) break;
          const text = c.text || '';
          if (seen.has(c.id) || (myIg && c.username === myIg) || SPAM_RE.test(text)) { out.skipped++; continue; }
          const r = await gpost(`${c.id}/replies`, { message: cReply(text), access_token: ids.page_token });
          if (r.id) { seen.add(c.id); out.ig++; done++; } else { out.skipped++; }
        }
      }
    } catch (e) { out.ig_err = String(e).slice(0, 120); }
  }
  try {
    const posts = await gget(`${ids.page_id}/posts`, { access_token: ids.page_token, fields: 'id', limit: '8' });
    for (const p of (posts.data || [])) {
      if (done >= max) break;
      const cs = await gget(`${p.id}/comments`, { access_token: ids.page_token, fields: 'id,message,from,is_hidden', limit: '25' });
      for (const c of (cs.data || [])) {
        if (done >= max) break;
        const text = c.message || '';
        if (seen.has(c.id) || c.is_hidden || (c.from && c.from.id === ids.page_id) || SPAM_RE.test(text)) { out.skipped++; continue; }
        const r = await gpost(`${c.id}/comments`, { message: cReply(text), access_token: ids.page_token });
        if (r.id) { seen.add(c.id); out.fb++; done++; } else { out.skipped++; }
      }
    }
  } catch (e) { out.fb_err = String(e).slice(0, 120); }

  await env.LUXE_KV.put('replied_comments', JSON.stringify([...seen].slice(-1000)));
  return out;
}

// doPost=true -> posten (3×/Tag-Slots); immer -> Meta-Analyse (6×/Tag). So 3× posten + 6× analysieren.
async function run(env, doPost = true) {
  if (!env.META_ACCESS_TOKEN) return { error: "META_ACCESS_TOKEN fehlt" };
  const ids = await discoverIds(env);
  const out = {};
  if (doPost) {
    const q = await loadQueue(env);
    let cursor = parseInt((await env.LUXE_KV.get("cursor")) || "0", 10);
    if (cursor >= q.length) cursor = cursor % q.length;   // Queue ENDLOS loopen
    const item = q[cursor];
    const ig = await postInstagram(ids, item).catch((e) => ({ error: String(e) }));
    const fb = await postFacebook(ids, item).catch((e) => ({ error: String(e) }));
    const tt = await postTikTok(item, env).catch((e) => ({ error: String(e) }));
    if (ig.ok || fb.ok || tt.ok) await env.LUXE_KV.put("cursor", String(cursor + 1));
    out.index = cursor; out.item = item.caption.split("\n")[0]; out.ig = ig; out.fb = fb; out.tt = tt;
    // Post-Log (Observability): letzte 40 Posts mit Erfolg pro Kanal -> abrufbar via ?health=1
    try {
      const pl = JSON.parse((await env.LUXE_KV.get("post_log")) || "[]");
      pl.unshift({ t: new Date().toISOString(), i: cursor, type: item.type || "image",
        cap: (item.caption || "").split("\n")[0].slice(0, 70), ig: ig.ok ? 1 : 0, fb: fb.ok ? 1 : 0, tt: tt.ok ? 1 : 0 });
      await env.LUXE_KV.put("post_log", JSON.stringify(pl.slice(0, 40)));
    } catch (e) { /* best-effort */ }
  } else { out.posted = false; out.note = "Analyse-Slot (kein Post)"; }
  // Meta-Analyse läuft bei JEDEM Cron (6×/Tag)
  out.insights = await metaInsights(ids, env).catch((e) => ({ error: String(e) }));
  // Kommentar-Auto-Antwort läuft bei JEDEM Cron (autonom, idempotent über KV)
  out.replies = await replyComments(ids, env).catch((e) => ({ error: String(e) }));
  return out;
}

const POST_HOURS = [10, 15, 19];  // UTC -> CH 12(Lunch)/17/21(Primetime) = 3 Posts/Tag

export default {
  async scheduled(event, env, ctx) {
    const h = new Date().getUTCHours();
    ctx.waitUntil(run(env, POST_HOURS.includes(h)));   // posten nur in 3 Slots; analysieren immer
  },
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.searchParams.get("key") !== env.TRIGGER_KEY) return new Response("forbidden", { status: 403 });
    // Neue Live-Queue laden (ohne Redeploy) + Cursor zurücksetzen — der Cloud-Claude ruft das auf.
    const setq = u.searchParams.get("queue");
    if (setq) { await env.LUXE_KV.put("queue_url", setq); await env.LUXE_KV.put("cursor", "0"); return Response.json({ queue_url_set: setq, cursor: 0 }); }
    const clean = u.searchParams.get("cleanup");
    if (clean) return Response.json(await cleanupOldFb(env, clean).catch((e) => ({ error: String(e) })));
    // FB-Doppel-Posts entfernen (?dedupe=1 löschen · ?dedupe=1&dry=1 nur anzeigen)
    if (u.searchParams.get("dedupe")) return Response.json(await dedupeFb(env, !u.searchParams.get("dry")).catch((e) => ({ error: String(e) })));
    // EINEN bestimmten FB-Post löschen (Handy-Tap): …/?key=…&del=<POST_ID>  (sicher: nur diese eine ID)
    const del = u.searchParams.get("del");
    if (del) { const ids = await discoverIds(env); const d = await (await fetch(`${G(del)}?access_token=${ids.page_token}`, { method: "DELETE" })).json(); return Response.json({ deleted: del, result: d }); }
    // HANDY→PC-BEFEHLE: Handy pusht (&cmd=tutti|tiktok|follower|all|deploy), PC-Listener holt sie (&drain=1).
    // So steuerst du die PC-Browser-Aufgaben (tutti/TikTok = kein API) komplett vom Handy.
    const cmd = u.searchParams.get("cmd");
    if (cmd) {
      const q = JSON.parse((await env.LUXE_KV.get("pc_queue")) || "[]");
      q.push({ cmd, t: Date.now() });
      await env.LUXE_KV.put("pc_queue", JSON.stringify(q.slice(-20)));
      return Response.json({ queued: cmd, pending: q.length, note: "PC-Listener führt es beim nächsten Poll aus." });
    }
    if (u.searchParams.get("drain")) {
      const q = JSON.parse((await env.LUXE_KV.get("pc_queue")) || "[]");
      await env.LUXE_KV.put("pc_queue", "[]");
      return Response.json({ commands: q });
    }
    // Kommentar-Auto-Antwort manuell auslösen (Handy-Tap): …/?key=…&replies=1
    if (u.searchParams.get("replies")) {
      const ids = await discoverIds(env);
      return Response.json(await replyComments(ids, env).catch((e) => ({ error: String(e) })));
    }
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
    // queue_url aus KV entfernen → Worker nutzt die eingebackene queue.json (kein 404-Fetch je Cron)
    if (u.searchParams.get("clearqueue")) { await env.LUXE_KV.delete("queue_url"); await env.LUXE_KV.put("cursor", "0"); return Response.json({ queue_url: "cleared", note: "nutzt eingebackene queue.json, cursor=0" }); }
    // GESUNDHEITS-CHECK (Handy/Chat): laufen die Posts? letzte Posts + Erfolg pro Kanal.  …/?key=…&health=1
    if (u.searchParams.get("health")) {
      const [pl, cur] = await Promise.all([env.LUXE_KV.get("post_log"), env.LUXE_KV.get("cursor")]);
      const posts = JSON.parse(pl || "[]");
      return Response.json({
        cursor: Number(cur || 0),
        posts_logged: posts.length,
        posts_ok: posts.filter((p) => p.ig || p.fb || p.tt).length,
        last_post: posts[0] || null,
        recent: posts.slice(0, 8),
      });
    }
    return Response.json(await run(env));
  },
};
