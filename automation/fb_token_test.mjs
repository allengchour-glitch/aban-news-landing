#!/usr/bin/env node
/* LuxeStyle — fb_token_test.mjs — validiert den FB-Page-Token OHNE zu posten. */
const V='v21.0';
const FB_TOK=(process.env.FB_PAGE_ACCESS_TOKEN||process.env.META_ACCESS_TOKEN||'').trim();
const FB_ID=(process.env.FB_PAGE_ID||'1049840534888592').trim();
console.log('FB_PAGE_ACCESS_TOKEN:', process.env.FB_PAGE_ACCESS_TOKEN?`gesetzt (len ${process.env.FB_PAGE_ACCESS_TOKEN.length})`:'LEER');
console.log('FB_PAGE_ID:', process.env.FB_PAGE_ID?process.env.FB_PAGE_ID:'(nicht gesetzt → Default 1049840534888592)');
console.log('META_ACCESS_TOKEN:', process.env.META_ACCESS_TOKEN?'gesetzt':'leer');
if(!FB_TOK){ console.error('\n❌ Kein FB_PAGE_ACCESS_TOKEN (und kein META_ACCESS_TOKEN) → nichts zu testen.'); process.exit(0); }
const g=async(p)=>{ const r=await fetch(`https://graph.facebook.com/${V}/${p}${p.includes('?')?'&':'?'}access_token=${encodeURIComponent(FB_TOK)}`); return {ok:r.ok,status:r.status,j:await r.json().catch(()=>({}))}; };
// 1) Wer ist der Token?
const me=await g('me?fields=id,name,category');
console.log('\n1) /me →', me.status, JSON.stringify(me.j).slice(0,200));
const isPage=!!me.j.category;
console.log('   Token-Typ:', isPage?`PAGE-Token (${me.j.name})`:'USER-Token (kein Page-Token!)');
if(isPage && me.j.id===FB_ID) console.log('   ✓ ist die Seite', FB_ID);
// 2) /me/accounts — ist die Zielseite mit Page-Token + Rechten dabei?
const acc=await g('me/accounts?fields=id,name,access_token,tasks');
if(acc.ok){ const pg=(acc.j.data||[]).find(p=>p.id===FB_ID);
  if(pg){ console.log('\n2) /me/accounts → Seite gefunden:', pg.name);
    console.log('   Page-Token vorhanden:', pg.access_token?'JA':'nein', '· Rechte:', (pg.tasks||[]).join(',')||'?'); }
  else console.log('\n2) /me/accounts → Seite', FB_ID, 'NICHT in der Liste (', (acc.j.data||[]).map(p=>p.id).join(',')||'leer',')'); }
else console.log('\n2) /me/accounts →', acc.status, JSON.stringify(acc.j.error||acc.j).slice(0,160));
// 3) Scopes via debug_token
const dbg=await fetch(`https://graph.facebook.com/${V}/debug_token?input_token=${encodeURIComponent(FB_TOK)}&access_token=${encodeURIComponent(FB_TOK)}`).then(r=>r.json()).catch(()=>({}));
const scopes=dbg?.data?.scopes||[];
console.log('\n3) Scopes:', scopes.join(', ')||'(nicht lesbar)');
console.log('   pages_manage_posts:', scopes.includes('pages_manage_posts')?'✓ vorhanden':'✗ FEHLT');
const ok = isPage || ((acc.j.data||[]).some(p=>p.id===FB_ID && p.access_token));
console.log('\nFAZIT:', ok?'✅ FB-Posting sollte funktionieren.':'⚠️ Token ist (noch) kein nutzbarer Page-Token für die Seite — siehe oben.');
