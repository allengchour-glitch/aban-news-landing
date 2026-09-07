#!/usr/bin/env node
/**
 * social_karussell.mjs — EIN Beitrag, mehrere Produkte (Instagram-Karussell + FB-Album).
 *
 * Betreiber 03.09.2026: «mache nicht nur 1 produkt sondern mehrere in karusell oder
 * kategorien in karusell». Ein Karussell zeigt bis zu 10 Bilder in EINEM Beitrag —
 * damit steht die BREITE des Sortiments in einem Post statt in zehn.
 *
 * Quelle sind die Produkte der Kollektion `querbeet` («🌍 Aus allen Welten»): dort liegt
 * je Welt EIN Stueck, taeglich kuratiert nach harten Bedingungen (>=3 Bilder, ab CHF 19,
 * im Google-Kanal, kein Risiko-Tag). Ein Karussell daraus ist woertlich «Kategorien im
 * Karussell».
 *
 * WACHEN — dieselben sieben wie beim Einzelposter, plus zwei karussell-eigene:
 *   · post_guard.lock(): gemeinsamer Lock + Betreiber-Stopp (EINZELFREIGABE noetig)
 *   · produktGepostet(): jede WARE wird einzeln geprueft; schon gepostete fallen raus
 *   · nach dem Post wird JEDES Produkt einzeln gemerkt — sonst taucht eine Ware, die im
 *     Karussell lief, spaeter als Einzelpost wieder auf (genau die Doppelpost-Klasse).
 *   · Bilder werden quadratisch zugeschnitten (Shopify-CDN `crop=center`): Instagram
 *     zwingt alle Karussell-Elemente in das Format des ERSTEN — ohne Zuschnitt schneidet
 *     es die uebrigen willkuerlich an.
 *
 * DRY=1 zeigt Auswahl und Text, ohne zu posten.
 */
import fs from 'fs';
import { lock as postLock, seen as postSeen, mark as postMark,
         produktGepostet, produktMerken, fbSeitenIdentitaet } from './post_guard.mjs';

const V = 'v21.0';
const IG_ID  = process.env.IG_USER_ID || (fs.existsSync('/tmp/meta_ig_id') ? fs.readFileSync('/tmp/meta_ig_id','utf8').trim() : '');
const FB_ID  = process.env.FB_PAGE_ID || '1049840534888592';
const TOK    = process.env.META_ACCESS_TOKEN || (fs.existsSync('/tmp/meta_page_token') ? fs.readFileSync('/tmp/meta_page_token','utf8').trim() : '');
const DRY    = process.env.DRY === '1';
const DATEI  = process.env.KARUSSELL || 'dropship/_karussell.json';

const quadrat = u => u.split('?')[0] + '?width=1080&height=1080&crop=center';
const schlaf  = ms => new Promise(r => setTimeout(r, ms));

async function g(pfad, params) {
  const body = new URLSearchParams({ ...params, access_token: TOK });
  const r = await fetch(`https://graph.facebook.com/${V}/${pfad}`, { method: 'POST', body });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

const plan = JSON.parse(fs.readFileSync(DATEI, 'utf8'));

// ⚠️ Die Bildunterschrift wird AUS DER ENDGUELTIGEN Auswahl gebaut, nie von Hand daneben
// geschrieben. Faellt ein Produkt durch eine Wache, verschwindet auch seine Zeile — sonst
// nennt der Text Ware, die im Beitrag gar nicht steht (dieselbe Klasse wie ein Ratgeber,
// der ein Produkt bewirbt, das es nicht gibt).
const bau = (liste) => [plan.kopf, '',
  ...liste.map((p, i) => `${i + 1}. ${p.welt}: ${(p.kurz || p.titel.split(' · ')[0])} \u2013 CHF ${p.preis.toFixed(2)}`),
  '', plan.fuss].join('\n');
let posten = plan.produkte.filter(p => {
  if (postSeen(p.img)) { console.log(`   ⛔ Bild schon gepostet → raus: ${p.titel}`); return false; }
  if (produktGepostet(p.titel, p.gid)) { console.log(`   ⛔ Ware schon gepostet → raus: ${p.titel}`); return false; }
  return true;
});
if (posten.length > 10) posten = posten.slice(0, 10);     // Instagram-Deckel
console.log(`Karussell: ${posten.length} von ${plan.produkte.length} Produkten`);
posten.forEach((p, i) => console.log(`  ${i + 1}. CHF ${p.preis.toFixed(2)}  ${p.titel}`));
const caption = bau(posten);
console.log(`\n${caption}\n`);
if (posten.length < 2) { console.log('⛔ Weniger als 2 Produkte — ein Karussell braucht mindestens zwei.'); process.exit(0); }
if (DRY) { console.log('DRY — nichts gepostet.'); process.exit(0); }
if (!IG_ID || !TOK) { console.error('⛔ IG_USER_ID / META_ACCESS_TOKEN fehlen.'); process.exit(1); }

postLock();

const kinder = [];
for (const p of posten) {
  const j = await g(`${IG_ID}/media`, { image_url: quadrat(p.img), is_carousel_item: 'true' });
  kinder.push(j.id);
  console.log(`   IG-Element ${kinder.length}: ${j.id}`);
  await schlaf(1200);
}
const c = await g(`${IG_ID}/media`, { media_type: 'CAROUSEL', children: kinder.join(','), caption });
// ⚠️ Ein Karussell-Container braucht Zeit, bis alle Elemente verarbeitet sind — sofortiges
// Publish antwortet sonst mit «Media ID is not available».
let igId = null;
for (let i = 0; i < 12 && !igId; i++) {
  await schlaf(5000);
  try { igId = (await g(`${IG_ID}/media_publish`, { creation_id: c.id })).id; }
  catch (e) { console.log(`   … warte (${e.message.slice(0, 60)})`); }
}
if (!igId) { console.error('⛔ IG-Karussell nicht veroeffentlicht.'); process.exit(1); }
console.log(`IG: Karussell veroeffentlicht ${igId}`);

// jede Ware EINZELN merken — sonst kommt sie spaeter als Einzelpost wieder
for (const p of posten) { postMark(p.img); produktMerken(p.titel, p.gid); }

// Facebook: unveroeffentlichte Fotos + ein Beitrag mit attached_media (Album)
try {
  const ident = await fbSeitenIdentitaet(TOK, FB_ID);
  if (!ident.ok) throw new Error(`FB-Seitenwache: ${ident.grund}`);
  const fbIds = [];
  for (const p of posten) {
    const f = await g(`${FB_ID}/photos`, { url: quadrat(p.img), published: 'false' });
    fbIds.push(f.id); await schlaf(800);
  }
  const feld = {};
  fbIds.forEach((id, i) => { feld[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
  const fb = await g(`${FB_ID}/feed`, { message: caption, ...feld });
  console.log(`FB: Album veroeffentlicht ${fb.id}`);
} catch (e) { console.error(`⚠️ FB fehlgeschlagen (IG ist raus): ${e.message}`); }

fs.appendFileSync('dropship/_karussell_done.txt',
  `${new Date().toISOString()}\t${igId}\t${posten.map(p => p.gid.split('/').pop()).join(',')}\n`);
console.log('FERTIG.');
