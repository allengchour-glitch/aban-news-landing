#!/usr/bin/env node
/* LuxeStyle — delete-old-fb-posts.mjs  (alte FB-Posts aufräumen — läuft am PC mit deinem Token)
 * Löscht FB-Seiten-Posts, die ÄLTER als CUTOFF sind (Default 2026-06-10) = die alten/Spam-Posts.
 * Die guten neuen Posts (ab 10.06.) bleiben. NUR Facebook — Instagram kann man per API NICHT löschen
 * (nur in der App). Braucht META_ACCESS_TOKEN (aus luxe-secrets.ps1).
 *
 *   node automation/local/delete-old-fb-posts.mjs            # löscht <2026-06-10
 *   node automation/local/delete-old-fb-posts.mjs 2026-06-12 # eigenes Datum
 *   DRY_RUN=1 node automation/local/delete-old-fb-posts.mjs  # nur zeigen, nichts löschen
 */
const T = process.env.META_ACCESS_TOKEN || '';
const PAGE = process.env.FB_PAGE_ID || '1049840534888592';
const CUTOFF = process.argv[2] || '2026-06-10';
const DRY = process.env.DRY_RUN === '1';
const G = 'https://graph.facebook.com/v21.0';
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!T) { console.error('META_ACCESS_TOKEN fehlt (luxe-secrets.ps1 laden).'); process.exit(1); }

(async () => {
  const acc = await (await fetch(`${G}/me/accounts?fields=id,access_token&access_token=${T}`)).json();
  const p = (acc.data || []).find(x => x.id === PAGE) || (acc.data || [])[0];
  if (!p) { console.error('Keine Seite gefunden.'); process.exit(1); }
  const PT = p.access_token;
  let url = `${G}/${p.id}/posts?fields=id,created_time&limit=100&access_token=${PT}`, all = [];
  for (let i = 0; i < 8 && url; i++) { const r = await (await fetch(url)).json(); if (r.error) { console.error(r.error.message); break; } all = all.concat(r.data || []); url = r.paging?.next; }
  const old = all.filter(x => (x.created_time || '') < CUTOFF);
  console.log(`FB-Posts gesamt: ${all.length} · älter als ${CUTOFF}: ${old.length}${DRY ? ' (DRY — nichts wird gelöscht)' : ''}`);
  let del = 0, fail = 0;
  for (const x of old) {
    if (DRY) { console.log('  [dry]', x.created_time?.slice(0, 10), x.id); continue; }
    const d = await (await fetch(`${G}/${x.id}?access_token=${PT}`, { method: 'DELETE' })).json();
    if (d.success) del++; else { fail++; if (fail <= 3) console.log('  ✗', x.id, d.error?.message); }
    await sleep(700);
  }
  if (!DRY) console.log(`✅ gelöscht: ${del} · fehlgeschlagen: ${fail}`);
})();
