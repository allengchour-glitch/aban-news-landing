#!/usr/bin/env node
/**
 * meta_post.mjs — postet Reels auf Instagram (Reels) + Facebook-Page.
 *
 * Sicherheit: Token kommt NUR aus der Umgebung, nie aus dem Code/Repo.
 *   export META_USER_TOKEN="EAAX..."   (User-Token mit den Rechten:
 *       instagram_basic, instagram_content_publish, pages_show_list,
 *       pages_manage_posts, business_management)
 *
 * Instagram zieht Videos nur von einer OEFFENTLICHEN HTTPS-URL (kein Datei-Upload).
 * Darum erwartet das Skript pro Reel eine oeffentliche URL.
 *
 * Aufruf:
 *   node social/meta_post.mjs --page "LuxeStyle CH" \
 *       --video "https://.../reel1.mp4" --caption "Sommer-Looks ✨ -10% WELCOME10" \
 *       [--video "https://.../reel2.mp4" --caption "..."] \
 *       [--ig] [--fb] [--dry]
 *
 *   --ig    nur Instagram   --fb  nur Facebook-Page   (ohne Flag: beide)
 *   --dry   nichts posten, nur Konto/Rechte/Links pruefen
 */
const G = "https://graph.facebook.com/v21.0";
const TOKEN = process.env.META_USER_TOKEN || process.env.META_PAGE_TOKEN;

function args() {
  const a = process.argv.slice(2);
  const o = { videos: [], captions: [], page: null, ig: false, fb: false, dry: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--video") o.videos.push(a[++i]);
    else if (a[i] === "--caption") o.captions.push(a[++i]);
    else if (a[i] === "--page") o.page = a[++i];
    else if (a[i] === "--ig") o.ig = true;
    else if (a[i] === "--fb") o.fb = true;
    else if (a[i] === "--dry") o.dry = true;
  }
  if (!o.ig && !o.fb) { o.ig = true; o.fb = true; }
  return o;
}

async function gj(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (j.error) throw new Error(`${j.error.code} ${j.error.message}`);
  return j;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolvePage(name) {
  const j = await gj(`${G}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${TOKEN}`);
  const pages = j.data || [];
  const p = name ? pages.find((x) => x.name.toLowerCase().includes(name.toLowerCase())) : pages[0];
  if (!p) throw new Error(`Keine Page gefunden (${name}). Verfuegbar: ${pages.map((x) => x.name).join(", ")}`);
  return p;
}

// --- Instagram Reel: Container anlegen -> Status pollen -> publishen ---
async function postIG(page, videoUrl, caption) {
  const ig = page.instagram_business_account;
  if (!ig) throw new Error(`Page "${page.name}" hat KEINEN verknuepften Instagram-Business-Account.`);
  const create = await gj(`${G}/${ig.id}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: "REELS", video_url: videoUrl, caption, access_token: page.access_token }),
  });
  const cid = create.id;
  // Auf FINISHED warten (Video-Verarbeitung, bis ~2 Min)
  for (let i = 0; i < 30; i++) {
    await sleep(4000);
    const st = await gj(`${G}/${cid}?fields=status_code,status&access_token=${page.access_token}`);
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error(`IG-Verarbeitung fehlgeschlagen: ${st.status}`);
    if (i === 29) throw new Error("IG-Verarbeitung Timeout");
  }
  const pub = await gj(`${G}/${ig.id}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: cid, access_token: page.access_token }),
  });
  return `IG @${ig.username} -> media ${pub.id}`;
}

// --- Facebook-Page Video posten (Datei-URL erlaubt) ---
async function postFB(page, videoUrl, caption) {
  const r = await gj(`${G}/${page.id}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_url: videoUrl, description: caption, access_token: page.access_token }),
  });
  return `FB ${page.name} -> video ${r.id}`;
}

(async () => {
  if (!TOKEN) { console.error("FEHLER: META_USER_TOKEN nicht gesetzt."); process.exit(1); }
  const o = args();
  const page = await resolvePage(o.page);
  const ig = page.instagram_business_account;
  console.log(`Page: ${page.name} (${page.id})  IG: ${ig ? "@" + ig.username + " (" + ig.id + ")" : "— NICHT verknuepft —"}`);
  if (o.dry) {
    console.log(`DRY-RUN. Wuerde posten: IG=${o.ig} FB=${o.fb}, ${o.videos.length} Video(s).`);
    o.videos.forEach((v, i) => console.log(`  [${i}] ${v} :: ${o.captions[i] || "(keine Caption)"}`));
    return;
  }
  for (let i = 0; i < o.videos.length; i++) {
    const v = o.videos[i], c = o.captions[i] || o.captions[0] || "";
    if (o.fb) { try { console.log("OK", await postFB(page, v, c)); } catch (e) { console.error("FB-Fehler:", e.message); } }
    if (o.ig) { try { console.log("OK", await postIG(page, v, c)); } catch (e) { console.error("IG-Fehler:", e.message); } }
  }
})();
