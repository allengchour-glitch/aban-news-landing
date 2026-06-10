#!/usr/bin/env node
/* LuxeStyle — add_hero_schweiz.mjs
 * Fügt der Startseite (templates/index.json, LIVE-Theme) eine zweite Hero-Sektion „🇨🇭 Schweiz Edition"
 * hinzu (Position 2, direkt nach dem Haupt-Hero), die auf die vorgefilterte Designs-Galerie verlinkt.
 *
 * Sicher & reversibel:
 *  - Klont die BESTEHENDE Hero-Sektion (garantiert gültiges Schema) und ändert nur Text/Button/Bild/Link.
 *  - Schreibt das Original vorher nach dropship/theme-backups/index.json.bak (Rollback).
 *  - Idempotent: existiert „hero_schweiz" schon, passt es nur Inhalte an.
 *  - JSON.parse-Check vor dem Upsert. No-op ohne Shopify-Creds.
 *
 * Auth: Client-Credentials (SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET) — wie site-health/fix_policies_footer.
 * ENV: HERO_IMAGE_URL (Default abannews-Wallpaper), GALLERY_URL, DRY_RUN=1, REMOVE=1 (Sektion wieder entfernen).
 */
import fs from 'node:fs';

const SHOP=(process.env.SHOPIFY_SHOP||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const API='2025-01';
const IMG=(process.env.HERO_IMAGE_URL||'https://abannews.com/social/hero/schweiz-wall.png').trim();
const GAL=(process.env.GALLERY_URL||'/pages/designs-galerie?cat=Schweiz').trim();
const DRY=process.env.DRY_RUN==='1';
const REMOVE=process.env.REMOVE==='1';
const BACKUP='dropship/theme-backups/index.json.bak';

if(!SHOP||!CID||!CSEC){ console.log('Kein Shopify-Cred → No-op.'); process.exit(0); }

async function token(){
  const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});
  const j=await r.json().catch(()=>({})); if(!j.access_token) throw new Error('kein Token'); return j.access_token;
}
async function gql(tok,query,variables){
  const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})});
  const j=await r.json(); if(j.errors) throw new Error(JSON.stringify(j.errors)); return j.data;
}

const Q_THEME=`query{themes(first:1,roles:[MAIN]){edges{node{id}}}}`;
const Q_FILE=`query($id:ID!){theme(id:$id){files(filenames:["templates/index.json"],first:1){edges{node{body{... on OnlineStoreThemeFileBodyText{content}}}}}}}`;
const M_UPSERT=`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){
  themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`;

function splitHeader(raw){ const i=raw.indexOf('{'); return {header:raw.slice(0,i), json:raw.slice(i)}; }

const tok=await token();
const themeId=(await gql(tok,Q_THEME)).themes.edges[0].node.id;
const raw=(await gql(tok,Q_FILE,{id:themeId})).theme.files.edges[0].node.body.content;
const {header,json}=splitHeader(raw);
const data=JSON.parse(json);

const KEY='hero_schweiz';
if(REMOVE){
  delete data.sections[KEY];
  data.order=data.order.filter(k=>k!==KEY);
  console.log('hero_schweiz entfernt.');
}else{
  // bestehenden Haupt-Hero finden (erste Sektion vom Typ "hero")
  const heroKey=data.order.find(k=>data.sections[k]?.type==='hero');
  if(!heroKey) throw new Error('kein Hero-Template zum Klonen gefunden');
  const clone=JSON.parse(JSON.stringify(data.sections[heroKey]));

  // Text-Block + Button-Block finden
  const blocks=clone.blocks||{};
  const textBk=Object.values(blocks).find(b=>b.type==='text');
  const btnBk=Object.values(blocks).find(b=>b.type==='button');
  if(textBk){ textBk.settings.text='<p>🇨🇭 Schwiizer Designs — Mundart & CH-Motiv uf Shirt, Täsche & Sticker</p>';
              textBk.settings.color='#2c2c2c'; textBk.settings.font_size='2.2rem'; }
  if(btnBk){ btnBk.settings.label='Schwiizer Designs entdecke'; btnBk.settings.link=GAL; }

  // Sektion-Settings: eigenes Bild, kein dunkles Overlay, helles Schema, ganze Fläche verlinkt
  const s=clone.settings;
  s.image_1=IMG; s.media_type_1='image';
  s.link=GAL; s.toggle_overlay=false; s.color_scheme='scheme-1';
  s.section_height='small';
  clone.name='🇨🇭 Schweiz Edition';

  data.sections[KEY]=clone;
  // an Position 2 (nach Haupt-Hero) einsortieren
  data.order=data.order.filter(k=>k!==KEY);
  const at=data.order.indexOf(heroKey)+1;
  data.order.splice(at,0,KEY);
  console.log(`hero_schweiz eingefügt nach ${heroKey} (Bild=${IMG})`);
}

const outJson=JSON.stringify(data,null,2);
JSON.parse(outJson); // validate
const out=header+outJson;

if(DRY){ console.log('DRY_RUN — würde schreiben. order:',data.order.join(', ')); process.exit(0); }

// Backup des Originals (nur wenn noch keins / beim Hinzufügen)
try{ fs.mkdirSync('dropship/theme-backups',{recursive:true}); if(!REMOVE) fs.writeFileSync(BACKUP, raw); }catch{}

const res=await gql(tok,M_UPSERT,{id:themeId,files:[{filename:'templates/index.json',body:{type:'TEXT',value:out}}]});
const errs=res.themeFilesUpsert.userErrors||[];
if(errs.length){ console.error('userErrors:',JSON.stringify(errs)); process.exit(1); }
console.log('✅ templates/index.json aktualisiert. order:',data.order.join(', '));
