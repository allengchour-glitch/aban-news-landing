#!/usr/bin/env node
/* bot_diag.mjs — stempelt die ECHTE Bot-Umgebung nach luxe.bot_diag, damit die Cloud-Session ohne Raten weiss,
 * was auf dem VPS installiert ist (Stagehand-Version, AI-SDK-Provider, welche Keys da sind). Stop blind-fixing.
 * ENV: SHOPIFY_CLIENT_ID/SECRET/SHOP + (liest node_modules + welche AI-ENV gesetzt sind). No-op-sicher.
 */
import fs from 'node:fs';
const ID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET, SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const ver = p => { try { return JSON.parse(fs.readFileSync(`node_modules/${p}/package.json`, 'utf8')).version; } catch { return '-'; } };
const has = p => fs.existsSync(`node_modules/${p}`);
const keys = ['GROQ_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'XAI_API_KEY', 'TT_EVENTS_API_TOKEN']
  .map(k => k.replace('_API_KEY', '').replace('_API_TOKEN', '') + '=' + (process.env[k] ? '1' : '0')).join(' ');
const diag = `stagehand=${ver('@browserbasehq/stagehand')} groq=${has('@ai-sdk/groq')?1:0} google=${has('@ai-sdk/google')?1:0} openai=${has('@ai-sdk/openai')?1:0} ai=${ver('ai')} | ${keys} @ ${new Date().toISOString().slice(0, 16)}`;
console.log('bot_diag:', diag);
if (!ID || !SEC) { console.log('keine Shopify-Creds -> kein Stamp'); process.exit(0); }
try {
  const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: ID, client_secret: SEC, grant_type: 'client_credentials' }) })).json()).access_token;
  const api = `https://${SHOP}/admin/api/2024-10/graphql.json`, H = { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' };
  const sid = (await (await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: '{shop{id}}' }) })).json()).data.shop.id;
  await fetch(api, { method: 'POST', headers: H, body: JSON.stringify({ query: 'mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}', variables: { m: [{ ownerId: sid, namespace: 'luxe', key: 'bot_diag', type: 'single_line_text_field', value: diag.slice(0, 250) }] } }) });
  console.log('bot_diag: luxe.bot_diag gestempelt');
} catch (e) { console.log('bot_diag Fehler:', String(e).slice(0, 80)); }
