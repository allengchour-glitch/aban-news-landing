/**
 * 🧠 LuxeStyle Shop-Brain
 * ------------------------
 * Vollautonome Produkt-Veredelung per Cloudflare-Cron (gratis, ohne GitHub Actions).
 * Holt die neuesten cj-real-Produkte, setzt fehlende SEO + Kategorie automatisch,
 * loggt Status nach KV und optional per Telegram.
 *
 * Auth: Shopify Client-Credentials-Grant (SHOPIFY_CLIENT_ID/SECRET, ~24h Token).
 * Manueller Test: GET https://<worker>/?key=<TRIGGER_KEY>  (wenn MANUAL_ENABLED=1).
 */

const TC = "gid://shopify/TaxonomyCategory/";

// Produkttyp -> deutsche Shopify-Taxonomie-ID (gleiche Map wie automation/catalog_enrich.py)
const CAT = {
  "Schmuck":"aa-6","Damen-Schmuck":"aa-6","Halskette":"aa-6","Ohrringe":"aa-6","Armband":"aa-6","Ring":"aa-6",
  "Uhren":"aa-6-11","Sonnenbrille":"aa-2-27","Hut":"aa-2-17","Sonnenhut":"aa-2-17","Mütze":"aa-2-17","Cap":"aa-2-17",
  "Tasche":"aa-5-4","Taschen":"aa-5-4","Rucksack":"aa-5-4","Taschen & Reise":"aa-5-4","Taschen & Accessoires":"aa-5-4",
  "Schuhe":"aa-8","Sneaker":"aa-8","Sandalen":"aa-8","Sandalette":"aa-8","Pumps":"aa-8","Ballerina":"aa-8",
  "Slip-on":"aa-8","Slides":"aa-8","Herren-Schuhe":"aa-8","Damen-Schuhe":"aa-8","Damen-Sandalen":"aa-8",
  "Kleid":"aa-1-4","Damen-Kleid":"aa-1-4","Accessoires":"aa-2","Accessoire":"aa-2",
  "Damenmode":"aa-1","Damen-Mode":"aa-1","Herrenmode":"aa-1","Herren-Mode":"aa-1","Mode":"aa-1","Shirt":"aa-1",
  "Damen-Top":"aa-1","Damen-Set":"aa-1","Blazer":"aa-1","Damen-Blazer":"aa-1","Cardigan":"aa-1","Damen-Cardigan":"aa-1",
  "Jacke":"aa-1","Bluse":"aa-1","Damen-Bluse":"aa-1","Rock":"aa-1","Damen-Rock":"aa-1","Shorts":"aa-1",
  "Damen-Shorts":"aa-1","Damen-Hose":"aa-1","Weste":"aa-1","Jumpsuit":"aa-1","Damen-Jumpsuit":"aa-1",
  "Jeans":"aa-1","Set":"aa-1","Sport-Set":"aa-1","Herren-Set":"aa-1","Hose":"aa-1","Top":"aa-1","Pullover":"aa-1",
  "Beauty":"hb-3-2-6","Beauty & Pflege":"hb-3-2-6","Beauty-Tool":"hb-3-2-9","Hautpflege":"hb-3-2-9",
  "Wellness & Spa":"hb-3-11-9","Wellness":"hb-3-11-9","Aroma-Diffuser":"hb-3-11-9","Massage":"hb-3-11-9","Luftbefeuchter":"hb-3-11-9",
  "Beleuchtung":"hg-13-5","Garten & Beleuchtung":"hg-13-5",
  "Küche":"hg-11-8","Küche & Haushalt":"hg-11-8","Küchenhelfer":"hg-11-8","Trinkflasche":"hg-11-8","Trinkflaschen":"hg-11-8",
  "Wohnen":"hg-3","Deko":"hg-3","Wohnaccessoire":"hg-3","Schlafen & Wohnen":"hg-3","Deko & Wohnaccessoires":"hg-3","Vase":"hg-3-67",
  "Elektronik":"el","Tech":"el","Tech-Gadget":"el","Gadget":"el","Sommer-Gadget":"el","Outdoor & Gadget":"el","Handy-Zubehör":"el","Kopfhörer":"el",
  "Audio":"el-2","Sommer & Kühlung":"hg-9-1-6","Ventilator":"hg-9-1-6",
  "Haustier":"ap-2","Haustier & Sommer":"ap-2","Auto-Zubehör":"vp-1","Spielzeug":"tg-5",
  "Bad":"hg-1","Bad & Wellness":"hg-1",
  "Outdoor":"hg-12","Outdoor & Sommer":"hg-12","Sport & Outdoor":"hg-12","Reise & Outdoor":"hg-12",
  "Reise-Zubehör":"hg-12","Garten & Pflanzen":"hg-12","Grill-Zubehör":"hg-12","Garten":"hg-12","Camping":"hg-12",
  "Grill & BBQ":"hg-12","Pool & Strand":"hg-12",
  "Haushalt":"hg","Haushalt & Hobby":"hg","Wellness & Haushalt":"hg","Aufbewahrung":"hg","Büro & Home Office":"hg","Büro":"hg",
};

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/gu;
const clean = (s) => (s || "").replace(EMOJI, "").replace(/\s{2,}/g, " ").trim().replace(/[ ,;:·–-]+$/, "");

function mkTitle(name) {
  let n = clean(name);
  if (n.length > 50) { let c = n.slice(0, 50); if (c.includes(" ")) c = c.slice(0, c.lastIndexOf(" ")); n = c.replace(/[ ,;:·–-]+$/, ""); }
  return (n + " | LuxeStyle").slice(0, 70);
}
const mkDesc = (name) => `${clean(name)}: jetzt im Schweizer Online-Shop LuxeStyle. Faire Preise, schnelle Lieferung (7–14 Tage), 30 Tage Rückgabe. −10% mit Code WELCOME10.`.slice(0, 320);

export default {
  async scheduled(_e, env, ctx) { ctx.waitUntil(run(env, false)); },
  async fetch(req, env) {
    if (env.MANUAL_ENABLED !== "1") return new Response("disabled", { status: 403 });
    const url = new URL(req.url);
    if (env.TRIGGER_KEY && url.searchParams.get("key") !== env.TRIGGER_KEY) return new Response("forbidden", { status: 403 });
    const r = await run(env, true);
    return new Response(JSON.stringify(r, null, 2), { headers: { "content-type": "application/json; charset=utf-8" } });
  },
};

async function getToken(env) {
  const r = await fetch(`https://${env.SHOPIFY_SHOP}/admin/oauth/access_token`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET, grant_type: "client_credentials" }),
  });
  const j = await r.json().catch(() => ({}));
  return j.access_token || "";
}

async function gql(env, token, query) {
  const r = await fetch(`https://${env.SHOPIFY_SHOP}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query }),
  });
  return r.json();
}
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

async function run(env, manual) {
  const log = [];
  try {
    const token = await getToken(env);
    if (!token) { return { ok: false, error: "kein Shopify-Token (Client-Credentials prüfen)" }; }
    const limit = parseInt(env.SCAN_LIMIT || "50", 10);
    const q = `{ products(first: ${limit}, query: "status:active tag:cj-real", sortKey: CREATED_AT, reverse: true) {
      nodes { id title productType category { id } seo { title } } } }`;
    const data = await gql(env, token, q);
    const nodes = data?.data?.products?.nodes || [];
    const fixes = [];
    for (const n of nodes) {
      const needSeo = !(n.seo && n.seo.title);
      const needCat = !n.category && CAT[(n.productType || "").trim()];
      if (!needSeo && !needCat) continue;
      let input = `id: "${n.id}"`;
      if (needCat) input += `, category: "${TC}${CAT[n.productType.trim()]}"`;
      if (needSeo) input += `, seo: { title: "${esc(mkTitle(n.title))}", description: "${esc(mkDesc(n.title))}" }`;
      fixes.push(input);
    }
    let done = 0;
    for (let i = 0; i < fixes.length; i += 20) {
      const chunk = fixes.slice(i, i + 20);
      const m = "mutation {\n" + chunk.map((inp, j) => `  f${j}: productUpdate(input: { ${inp} }) { product { id } userErrors { field message } }`).join("\n") + "\n}";
      const res = await gql(env, token, m);
      if (res?.data) done += chunk.length;
      else log.push("mutation-fehler: " + JSON.stringify(res?.errors || res).slice(0, 200));
    }
    const status = `🧠 Shop-Brain: ${nodes.length} geprüft · ${fixes.length} veredelt (SEO/Kategorie)${manual ? " [manuell]" : ""} · ${new Date().toISOString()}`;
    log.push(status);
    await env.BRAIN_KV.put("last_run", status);
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID && fixes.length > 0) {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: status }),
      }).catch(() => {});
    }
    return { ok: true, checked: nodes.length, fixed: fixes.length, done, log };
  } catch (e) {
    return { ok: false, error: e.message, log };
  }
}
