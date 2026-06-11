#!/usr/bin/env node
/**
 * fb-posts.mjs — Facebook-Page-Posts auflisten + gezielt löschen.
 * ---------------------------------------------------------------
 * Anders als Instagram erlaubt die FB-Graph-API das LÖSCHEN von Page-Posts.
 *
 * MODE=list   (Default): listet die letzten Posts mit Datum, Reaktionen, Kommentaren,
 *                        Permalink + Text-Anfang → zum Identifizieren schwacher/falscher Posts.
 * MODE=delete + FB_DELETE_IDS="id1,id2": löscht GENAU diese Post-IDs (DELETE /{id}).
 *                        Sicherheits-Halber passiert ohne explizite IDs NICHTS.
 *
 * ENV (GitHub-Secrets): FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN (oder META_ACCESS_TOKEN).
 * Scope: pages_read_engagement (list) · pages_manage_posts (delete).
 */
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const FB_ID = process.env.FB_PAGE_ID || '';
const TOKS = [...new Set([process.env.FB_PAGE_ACCESS_TOKEN, process.env.META_ACCESS_TOKEN].filter(Boolean))];
const MODE = (process.env.MODE || 'list').toLowerCase();
const DEL_IDS = (process.env.FB_DELETE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const LIMIT = Math.max(1, parseInt(process.env.LIMIT || '40', 10) || 40);

if (!FB_ID || TOKS.length === 0) { console.log('Kein FB_PAGE_ID/Token → No-op.'); process.exit(0); }

const g = async (url, opts) => { const r = await fetch(url, opts); const j = await r.json().catch(() => ({})); return { ok: r.ok, status: r.status, j }; };

// Gültiges Page-Token finden
let TOK = '';
for (const t of TOKS) {
  const chk = await g(`https://graph.facebook.com/${V}/${FB_ID}?fields=id,name&access_token=${encodeURIComponent(t)}`);
  if (chk.ok) { TOK = t; console.log(`✅ Page-Token OK · Seite: ${chk.j.name} (${chk.j.id})`); break; }
}
if (!TOK) { console.error('❌ Kein gültiges Page-Token (FB_PAGE_ACCESS_TOKEN prüfen).'); process.exit(1); }

if (MODE === 'delete') {
  if (DEL_IDS.length === 0) { console.log('MODE=delete, aber FB_DELETE_IDS leer → nichts gelöscht (Sicherheit).'); process.exit(0); }
  console.log(`\n🗑️  Lösche ${DEL_IDS.length} Post(s)…`);
  for (const id of DEL_IDS) {
    const r = await g(`https://graph.facebook.com/${V}/${id}?access_token=${encodeURIComponent(TOK)}`, { method: 'DELETE' });
    if (r.ok && r.j.success !== false) console.log(`   ✓ gelöscht: ${id}`);
    else console.error(`   ✗ ${id}:`, r.status, JSON.stringify(r.j.error || r.j).slice(0, 160));
    await new Promise(s => setTimeout(s, 800));
  }
  console.log('Fertig.');
  process.exit(0);
}

// MODE=list
const url = `https://graph.facebook.com/${V}/${FB_ID}/feed?fields=id,message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true)&limit=${LIMIT}&access_token=${encodeURIComponent(TOK)}`;
const res = await g(url);
if (!res.ok) { console.error('❌ Feed-Abruf:', res.status, JSON.stringify(res.j.error || res.j)); process.exit(1); }
const posts = res.j.data || [];
console.log(`\n# Facebook-Posts (${posts.length})\n`);
console.log('| Datum | 👍 | 💬 | 🔁 | Text | ID |');
console.log('|---|--:|--:|--:|---|---|');
const rows = posts.map(p => ({
  id: p.id,
  date: (p.created_time || '').slice(0, 10),
  re: p.reactions?.summary?.total_count || 0,
  co: p.comments?.summary?.total_count || 0,
  sh: p.shares?.count || 0,
  msg: (p.message || '(kein Text)').replace(/\n/g, ' ').slice(0, 60),
  link: p.permalink_url || '',
}));
for (const r of rows) console.log(`| ${r.date} | ${r.re} | ${r.co} | ${r.sh} | ${r.msg} | ${r.id} |`);

// Falsch-Claim-Heuristik (Swiss-Herkunft) markieren
const FALSE = /aus der schweiz|swiss fashion|swiss-made|mode aus der schweiz|schweizer versand|schweizweit/i;
const flagged = rows.filter(r => FALSE.test(posts.find(p => p.id === r.id)?.message || ''));
if (flagged.length) {
  console.log(`\n⚠️  Mögliche Falsch-Claims (Swiss-Herkunft) — Lösch-Kandidaten:`);
  for (const r of flagged) console.log(`   ${r.id}  ·  ${r.msg}`);
}
console.log(`\nZum Löschen: MODE=delete + FB_DELETE_IDS="<id>,<id>" erneut starten.`);
