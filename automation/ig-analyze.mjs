#!/usr/bin/env node
/**
 * ig-analyze.mjs — Instagram-Content-Analyse über die Meta Graph API.
 * Zieht die letzten Posts (Reichweite, Likes, Kommentare, Saves, Engagement), rankt Top/Schwach,
 * wertet Hashtags + Posting-Zeiten aus und druckt einen Markdown-Report (Job-Log).
 * No-op ohne IG-Token. ENV: IG_USER_ID + IG_ACCESS_TOKEN (oder META_ACCESS_TOKEN), MAX (Default 40).
 */
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const IG_ID = process.env.IG_USER_ID || '';
const IG_TOK = process.env.IG_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const MAX = Math.max(1, parseInt(process.env.MAX || '40', 10) || 40);
if (!IG_ID || !IG_TOK) { console.log('Kein IG-Token → No-op.'); process.exit(0); }

const g = async u => { const r = await fetch(u); return r.json().catch(()=>({})); };
const num = x => Number(x||0);

(async () => {
  const fields = 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count';
  let url = `https://graph.facebook.com/${V}/${IG_ID}/media?fields=${fields}&limit=${MAX}&access_token=${encodeURIComponent(IG_TOK)}`;
  const res = await g(url);
  if (res.error) { console.log('API-Fehler:', JSON.stringify(res.error)); process.exit(0); }
  const media = res.data || [];
  console.log(`# Instagram-Analyse @luxestyle.ch — ${media.length} Posts\n`);

  const rows = [];
  for (const m of media) {
    // Insights: reach + saved + total_interactions (Reels: zusätzlich plays)
    const metric = m.media_product_type === 'REELS' ? 'reach,saved,total_interactions,plays' : 'reach,saved,total_interactions';
    const ins = await g(`https://graph.facebook.com/${V}/${m.id}/insights?metric=${metric}&access_token=${encodeURIComponent(IG_TOK)}`);
    const im = {}; (ins.data||[]).forEach(d => im[d.name] = num(d.values?.[0]?.value));
    const reach = im.reach||0, saved = im.saved||0, inter = im.total_interactions||0;
    const likes = num(m.like_count), comments = num(m.comments_count);
    const er = reach ? (inter/reach*100) : 0;
    rows.push({ id:m.id, type:m.media_product_type||m.media_type, cap:(m.caption||'').replace(/\n/g,' ').slice(0,70),
      ts:(m.timestamp||'').slice(0,10), hour:new Date(m.timestamp).getUTCHours(), reach, likes, comments, saved, plays:im.plays||0, er, link:m.permalink });
    await new Promise(s=>setTimeout(s,250));
  }

  const tot = (k)=> rows.reduce((a,r)=>a+r[k],0);
  console.log('## Übersicht');
  console.log(`- Reichweite gesamt: **${tot('reach').toLocaleString()}** · Ø/Post ${Math.round(tot('reach')/(rows.length||1))}`);
  console.log(`- Likes: **${tot('likes')}** · Kommentare: **${tot('comments')}** · Saves: **${tot('saved')}**`);
  const ers = rows.filter(r=>r.reach>0).map(r=>r.er);
  console.log(`- Ø Engagement-Rate: **${(ers.reduce((a,b)=>a+b,0)/(ers.length||1)).toFixed(2)}%**\n`);

  console.log('## Top 8 nach Reichweite');
  console.log('| Reach | Likes | Komm | Saves | ER% | Caption |');
  console.log('|--:|--:|--:|--:|--:|---|');
  rows.slice().sort((a,b)=>b.reach-a.reach).slice(0,8).forEach(r=>
    console.log(`| ${r.reach} | ${r.likes} | ${r.comments} | ${r.saved} | ${r.er.toFixed(1)} | ${r.cap} |`));

  console.log('\n## Schwächste 8 nach Reichweite');
  console.log('| Reach | Likes | Komm | Caption | Link |');
  console.log('|--:|--:|--:|---|---|');
  rows.slice().sort((a,b)=>a.reach-b.reach).slice(0,8).forEach(r=>
    console.log(`| ${r.reach} | ${r.likes} | ${r.comments} | ${r.cap} | ${r.link} |`));

  // Hashtag-Performance
  const tags = {};
  rows.forEach(r=> (r.cap.match(/#[\wäöüÄÖÜ]+/g)||[]).forEach(t=>{ t=t.toLowerCase(); (tags[t]=tags[t]||{n:0,reach:0}); tags[t].n++; tags[t].reach+=r.reach; }));
  console.log('\n## Hashtags (nach Ø-Reichweite, ≥2×)');
  console.log('| Tag | n | Ø Reach |'); console.log('|---|--:|--:|');
  Object.entries(tags).filter(([,v])=>v.n>=2).sort((a,b)=>b[1].reach/b[1].n - a[1].reach/a[1].n).slice(0,15)
    .forEach(([t,v])=>console.log(`| ${t} | ${v.n} | ${Math.round(v.reach/v.n)} |`));

  // Posting-Stunden
  const byHour={}; rows.forEach(r=>{ (byHour[r.hour]=byHour[r.hour]||{n:0,reach:0}); byHour[r.hour].n++; byHour[r.hour].reach+=r.reach; });
  console.log('\n## Beste Posting-Stunde (UTC, nach Ø-Reach)');
  Object.entries(byHour).sort((a,b)=>b[1].reach/b[1].n-a[1].reach/a[1].n).slice(0,5)
    .forEach(([h,v])=>console.log(`- ${h}h: Ø ${Math.round(v.reach/v.n)} Reach (${v.n} Posts)`));
})();
