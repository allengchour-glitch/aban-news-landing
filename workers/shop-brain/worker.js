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
  "Hemd":"aa-1","Kurzarm-Hemd":"aa-1","Tank-Top":"aa-1","Tanktop":"aa-1","Polo":"aa-1","Poloshirt":"aa-1","T-Shirt":"aa-1",
  "Bikini":"aa-1","Badeanzug":"aa-1","Bademode":"aa-1","Badeshorts":"aa-1","Strandkleid":"aa-1","Mantel":"aa-1","Trainingsanzug":"aa-1",
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

// 🤖 Claude schreibt individuelle, verkaufsstarke SEO (raw HTTP; structured JSON, effort low).
// Ohne env.ANTHROPIC_API_KEY wird das nie aufgerufen → Template-Fallback.
async function aiSeo(env, name) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: env.BRAIN_AI_MODEL || "claude-opus-4-8",
        max_tokens: 400,
        output_config: { effort: "low", format: { type: "json_schema", schema: {
          type: "object", additionalProperties: false,
          properties: { title: { type: "string" }, description: { type: "string" } },
          required: ["title", "description"] } } },
        messages: [{ role: "user", content:
`Schreibe SEO-Meta für ein Produkt im Schweizer Online-Shop LuxeStyle.
Produkt: "${clean(name)}"
- title: verkaufsstark, Schweizer Hochdeutsch (ss statt ß), max 60 Zeichen, endet mit " | LuxeStyle", kein Emoji.
- description: ein konkreter Nutzen + Vertrauen (Gratis-Versand ab CHF 65, 30 Tage Rückgabe), max 150 Zeichen, kein Emoji.` }],
      }),
    });
    const j = await r.json();
    const t = (j.content || []).find((b) => b.type === "text");
    if (!t) return null;
    const o = JSON.parse(t.text);
    if (o && o.title && o.description) return { title: String(o.title).slice(0, 70), description: String(o.description).slice(0, 320) };
  } catch (e) { /* still & sicher → Template-Fallback */ }
  return null;
}

async function runMutations(env, token, items, build, log) {
  let done = 0;
  for (let i = 0; i < items.length; i += 20) {
    const chunk = items.slice(i, i + 20);
    const m = "mutation {\n" + chunk.map((f, j) => build(f, j)).join("\n") + "\n}";
    const res = await gql(env, token, m);
    if (res?.data) done += chunk.length;
    else log.push("mutation-fehler: " + JSON.stringify(res?.errors || res).slice(0, 200));
  }
  return done;
}

async function run(env, manual) {
  const log = [];
  try {
    const token = await getToken(env);
    if (!token) { return { ok: false, error: "kein Shopify-Token (Client-Credentials prüfen)" }; }
    const limit = parseInt(env.SCAN_LIMIT || "50", 10);
    const colMax = parseInt(env.COLLECTION_COVER_MAX || "30", 10);
    const aiKey = env.ANTHROPIC_API_KEY || "";
    const aiLimit = parseInt(env.AI_LIMIT || "12", 10); // im Worker bewusst niedrig (Subrequest-Limit)

    // 1) Produkt-Veredelung (SEO Titel + Description + Kategorie) + Bild-QA
    const pq = `{ products(first: ${limit}, query: "status:active tag:cj-real", sortKey: CREATED_AT, reverse: true) {
      nodes { id title productType category { id } seo { title description } featuredImage { url } } } }`;
    const pdata = await gql(env, token, pq);
    const nodes = pdata?.data?.products?.nodes || [];
    const prodFixes = []; const noImage = []; let aiUsed = 0;
    for (const n of nodes) {
      if (!n.featuredImage) noImage.push(clean(n.title).slice(0, 60));
      const needSeo = !(n.seo && n.seo.title && n.seo.description);
      const needCat = !n.category && CAT[(n.productType || "").trim()];
      if (!needSeo && !needCat) continue;
      let input = `id: "${n.id}"`;
      if (needCat) input += `, category: "${TC}${CAT[n.productType.trim()]}"`;
      if (needSeo) {
        let seo = null;
        if (aiKey && aiUsed < aiLimit) { seo = await aiSeo(env, n.title); if (seo) aiUsed++; }
        const title = seo ? seo.title : mkTitle(n.title);
        const desc = seo ? seo.description : mkDesc(n.title);
        input += `, seo: { title: "${esc(title)}", description: "${esc(desc)}" }`;
      }
      prodFixes.push(input);
    }

    // 2) Collection-Cover (leere Kategorien aus eigenem Produktbild bebildern)
    const cq = `{ collections(first: 250) { nodes { id handle title image { url } products(first: 5) { nodes { featuredImage { url } } } } } }`;
    const cdata = await gql(env, token, cq);
    const colls = cdata?.data?.collections?.nodes || [];
    const colFixes = [];
    for (const c of colls) {
      if (c.image) continue;
      const img = (c.products?.nodes || []).map((p) => p.featuredImage && p.featuredImage.url).find(Boolean);
      if (img) colFixes.push({ id: c.id, src: img, alt: clean(c.title) || "LuxeStyle" });
      if (colFixes.length >= colMax) break;
    }

    const pDone = await runMutations(env, token, prodFixes,
      (inp, j) => `  f${j}: productUpdate(input: { ${inp} }) { product { id } userErrors { field message } }`, log);
    const cDone = await runMutations(env, token, colFixes,
      (f, j) => `  c${j}: collectionUpdate(input: { id: "${f.id}", image: { src: "${esc(f.src)}", altText: "${esc(f.alt)} bei LuxeStyle" } }) { collection { id } userErrors { field message } }`, log);

    const status = `🧠 Shop-Brain v2: ${prodFixes.length} veredelt (${aiUsed} per KI) · ${cDone} Cover · ${noImage.length} ohne Bild${manual ? " [manuell]" : ""} · ${new Date().toISOString()}`;
    log.push(status);
    if (noImage.length) log.push("⚠️ ohne Bild: " + noImage.join(" · "));
    await env.BRAIN_KV.put("last_run", status);
    await env.BRAIN_KV.put("last_no_image", JSON.stringify(noImage));
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID && (prodFixes.length || cDone || noImage.length)) {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: status }),
      }).catch(() => {});
    }
    return { ok: true, checked: nodes.length, fixed: prodFixes.length, pDone, covers: cDone, noImage: noImage.length, log };
  } catch (e) {
    return { ok: false, error: e.message, log };
  }
}
