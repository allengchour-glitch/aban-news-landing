#!/usr/bin/env node
/* fal_product_scene.mjs — «geile Produktbilder»: verwandelt ein ECHTES Produktfoto per
 * FLUX-Kontext (fal.ai) in eine Premium-Lifestyle-Szene. Das Produkt bleibt identisch
 * (image-to-image mit Kontext-Erhalt) — nichts wird erfunden.
 * REGELN (teuer gelernt 2026-07-06):
 *   - Prompt IMMER mit «Make all cards/labels plain with NO text, NO logos» ergänzen,
 *     sonst wandern Marken-Leaks aus dem Lieferantenfoto mit (Bank-of-America-Falle).
 *   - Ergebnis IMMER per Vision gegen das Original prüfen (Produkttreue!).
 *   - Kosten ~$0.04/Bild (fal-Guthaben) — für Held-Produkte, nicht für Massenware.
 * Nutzung: FAL_KEY=/tmp/fal_key node automation/fal_product_scene.mjs <bild-url> "<szene-prompt>" [out.jpg]
 * stdout = fal-Bild-URL. Danach: upload_to_shopify_cdn.mjs + productCreateMedia.
 */
import fs from 'node:fs';
const KEY = (process.env.FAL_API_KEY || (fs.existsSync('/tmp/fal_key') ? fs.readFileSync('/tmp/fal_key', 'utf8') : '')).trim();
const [img, scene, out] = process.argv.slice(2);
if (!KEY || !img || !scene) { console.error('FAL-Key/Bild-URL/Prompt fehlt.'); process.exit(1); }
const prompt = `${scene}. Keep the product EXACTLY as in the input image. Make any cards, labels or screens plain with NO text, NO numbers, NO logos. Premium product photography, photorealistic.`;
const r = await fetch('https://fal.run/fal-ai/flux-pro/kontext', {
  method: 'POST', headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt, image_url: img, guidance_scale: 3.5, output_format: 'jpeg' })
});
const j = await r.json();
const url = j.images?.[0]?.url;
if (!url) { console.error('fal-Fehler:', JSON.stringify(j).slice(0, 200)); process.exit(1); }
if (out) {
  const b = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(out, b);
  console.error(`gespeichert: ${out} (${b.length} Bytes)`);
}
console.log(url);
