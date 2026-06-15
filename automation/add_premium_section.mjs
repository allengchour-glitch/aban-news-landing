#!/usr/bin/env node
/**
 * Fügt eine "✨ Premium-Marken"-Produktreihe direkt nach dem Hero in die
 * Startseite (templates/index.json) des LIVE-Themes ein — sauber & programmatisch.
 *
 * Warum dieses Skript: Die Shopify-MCP sperrt Schreibzugriffe auf das Live-/MAIN-Theme.
 * Mit echten Admin-Credentials (Client-Credentials-Grant) darf man die Asset-API direkt
 * nutzen — liest die index.json, modifiziert sie als JSON (kein Hand-Editieren), schreibt zurück.
 *
 * ENV (transient, NIE ins Repo committen):
 *   SHOPIFY_SHOP           z.B. au3j0y-hq.myshopify.com
 *   SHOPIFY_CLIENT_ID
 *   SHOPIFY_CLIENT_SECRET
 *   PREMIUM_COLLECTION_HANDLE (optional, default "luxestyle-premium")
 *
 * Lauf:  node automation/add_premium_section.mjs        (live schreiben)
 *        DRY=1 node automation/add_premium_section.mjs   (nur anzeigen, nicht schreiben)
 */
const SHOP = process.env.SHOPIFY_SHOP;
const CID  = process.env.SHOPIFY_CLIENT_ID;
const SEC  = process.env.SHOPIFY_CLIENT_SECRET;
const HANDLE = process.env.PREMIUM_COLLECTION_HANDLE || 'luxestyle-premium';
const DRY = process.env.DRY === '1';
const API = '2025-01';
if (!SHOP || !CID || !SEC) { console.error('❌ ENV fehlt: SHOPIFY_SHOP / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET'); process.exit(1); }

async function token() {
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: SEC, grant_type: 'client_credentials' })
  });
  if (!r.ok) throw new Error('token grant failed: ' + r.status + ' ' + await r.text());
  return (await r.json()).access_token;
}
async function api(tok, path, opts = {}) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/${path}`, {
    ...opts, headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  if (!r.ok) throw new Error(`${path} → ${r.status} ${await r.text()}`);
  return r.json();
}

function buildPremiumSection() {
  // Struktur 1:1 wie die bestehenden product-list-Sektionen des Horizon-Themes.
  const card = (g) => ({
    "static-header": { type: "_product-list-content", name: "t:names.header", static: true,
      settings: { content_direction:"row", vertical_on_mobile:false, horizontal_alignment:"space-between", vertical_alignment:"flex-end", align_baseline:true, horizontal_alignment_flex_direction_column:"flex-start", vertical_alignment_flex_direction_column:"center", gap:12, width:"fill", custom_width:100, width_mobile:"fill", custom_width_mobile:100, height:"fit", custom_height:100, inherit_color_scheme:true, color_scheme:"", background_media:"none", video_position:"cover", background_image_position:"cover", border:"none", border_width:1, border_opacity:100, border_radius:0, "padding-block-start":0, "padding-block-end":0, "padding-inline-start":0, "padding-inline-end":0 },
      blocks: {
        "pl_text_premium": { type:"_product-list-text", name:"t:names.collection_title", settings:{ text:"<h3>✨ Premium-Marken</h3>", width:"fit-content", max_width:"normal", alignment:"left", type_preset:"rte", font:"var(--font-body--family)", font_size:"1rem", line_height:"normal", letter_spacing:"normal", case:"none", wrap:"pretty", color:"var(--color-foreground)", background:false, background_color:"#00000026", corner_radius:0, "padding-block-start":0, "padding-block-end":0, "padding-inline-start":0, "padding-inline-end":0 }, blocks:{} },
        "pl_btn_premium": { type:"_product-list-button", name:"t:names.product_list_button", settings:{ label:"Alle Marken ansehen", open_in_new_tab:false, style_class:"link", width:"fit-content", custom_width:100, width_mobile:"fit-content", custom_width_mobile:100 }, blocks:{} }
      },
      block_order: ["pl_text_premium","pl_btn_premium"]
    },
    "static-product-card": { type:"_product-card", name:"t:names.product_card", static:true,
      settings:{ product_card_gap:4, inherit_color_scheme:true, color_scheme:"", border:"none", border_width:1, border_opacity:100, border_radius:0, "padding-block-start":0, "padding-block-end":0, "padding-inline-start":0, "padding-inline-end":0 },
      blocks:{
        ["pcg_"+g]: { type:"_product-card-gallery", name:"t:names.product_card_media", settings:{ image_ratio:"square", border:"none", border_width:1, border_opacity:100, border_radius:0, "padding-block-start":0, "padding-block-end":0, "padding-inline-start":0, "padding-inline-end":0 }, blocks:{} },
        ["pt_"+g]: { type:"product-title", name:"t:names.product_title", settings:{ width:"100%", max_width:"normal", alignment:"left", type_preset:"rte", font:"var(--font-body--family)", font_size:"1rem", line_height:"normal", letter_spacing:"normal", case:"none", wrap:"pretty", color:"var(--color-foreground)", background:false, background_color:"#00000026", corner_radius:0, "padding-block-start":4, "padding-block-end":0, "padding-inline-start":0, "padding-inline-end":0 }, blocks:{} },
        ["pp_"+g]: { type:"price", name:"t:names.product_price", settings:{ show_sale_price_first:true, show_installments:false, show_tax_info:false, type_preset:"h6", width:"100%", alignment:"left", font:"var(--font-body--family)", font_size:"1rem", line_height:"normal", letter_spacing:"normal", case:"none", color:"var(--color-foreground)", "padding-block-start":0, "padding-block-end":0, "padding-inline-start":0, "padding-inline-end":0 }, blocks:{} }
      },
      block_order: ["pcg_"+g, "pt_"+g, "pp_"+g]
    }
  });
  return { type:"product-list", blocks: card("prem"), name:"✨ Premium-Marken",
    settings:{ collection:HANDLE, layout_type:"grid", carousel_on_mobile:true, max_products:8, columns:4, mobile_columns:"2", mobile_card_size:"60cqw", columns_gap:8, rows_gap:24, icons_style:"arrow", icons_shape:"none", section_width:"page-width", horizontal_alignment:"flex-start", gap:28, color_scheme:"scheme-1", "padding-block-start":48, "padding-block-end":48 } };
}

(async () => {
  const tok = await token();
  const { themes } = await api(tok, 'themes.json');
  const main = themes.find(t => t.role === 'main');
  if (!main) throw new Error('kein MAIN-Theme gefunden');
  console.log('MAIN-Theme:', main.name, main.id);
  const asset = await api(tok, `themes/${main.id}/assets.json?asset[key]=templates/index.json`);
  let raw = asset.asset.value;
  const m = raw.match(/^(\s*\/\*[\s\S]*?\*\/\s*)/);
  const header = m ? m[1] : '';
  const json = JSON.parse(raw.slice(header.length));
  if (Object.values(json.sections).some(s => s.settings && s.settings.collection === HANDLE)) {
    console.log('ℹ️ Premium-Sektion (collection=' + HANDLE + ') existiert bereits → nichts zu tun.'); return;
  }
  const key = 'product_list_premium';
  json.sections[key] = buildPremiumSection();
  const heroIdx = json.order.findIndex(k => k.startsWith('hero'));
  json.order.splice(heroIdx >= 0 ? heroIdx + 1 : 0, 0, key);
  const out = header + JSON.stringify(json, null, 2) + '\n';
  if (DRY) { console.log('DRY — neue order:', json.order.join(', ')); return; }
  await api(tok, `themes/${main.id}/assets.json`, { method:'PUT', body: JSON.stringify({ asset:{ key:'templates/index.json', value: out } }) });
  console.log('✅ Premium-Sektion live nach dem Hero eingefügt. Neue order:', json.order.join(', '));
})().catch(e => { console.error('❌', e.message); process.exit(1); });
