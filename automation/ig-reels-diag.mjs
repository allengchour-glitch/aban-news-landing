#!/usr/bin/env node
/** ig-reels-diag.mjs — Diagnose der IG-Reels-Reichweite.
 * Holt die letzten Reels + probiert mehrere Insight-Metriken (reach vs. plays/views), zeigt Alter,
 * externen Link in Caption (IG demoted das oft) und Hashtag-Zahl. No-op ohne IG-Token. */
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const IG_ID = process.env.IG_USER_ID || '';
const IG_TOK = process.env.IG_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
if (!IG_ID || !IG_TOK) { console.log('Kein IG-Token → No-op.'); process.exit(0); }
const g = async u => { const r = await fetch(u); return r.json().catch(()=>({})); };

(async () => {
  const media = await g(`https://graph.facebook.com/${V}/${IG_ID}/media?fields=id,caption,media_product_type,timestamp,permalink,like_count,comments_count&limit=50&access_token=${encodeURIComponent(IG_TOK)}`);
  const reels = (media.data||[]).filter(m => m.media_product_type === 'REELS').slice(0, 12);
  console.log(`# IG-Reels-Diagnose — ${reels.length} Reels\n`);
  const now = Date.now();
  // Welche Metriken sind für Reels gültig? Einzeln testen (Graph wirft bei falscher Metrik).
  for (const m of reels) {
    const ageH = Math.round((now - new Date(m.timestamp).getTime())/3.6e6);
    const cap = (m.caption||'');
    const hasLink = /https?:\/\/|luxestyle\.ch|link in bio/i.test(cap);
    const nTags = (cap.match(/#[\wäöü]+/gi)||[]).length;
    const vals = {};
    for (const metric of ['reach','plays','views','total_interactions','saved','ig_reels_video_view_total_count','ig_reels_aggregated_all_plays_count']) {
      const ins = await g(`https://graph.facebook.com/${V}/${m.id}/insights?metric=${metric}&access_token=${encodeURIComponent(IG_TOK)}`);
      if (ins.error) vals[metric] = ins.error.message.includes('does not support') || ins.error.code===100 ? '—' : `ERR`;
      else vals[metric] = ins.data?.[0]?.values?.[0]?.value ?? '—';
    }
    console.log(`• ${ageH}h alt | reach=${vals.reach} plays=${vals.plays} views=${vals.views} viewsTot=${vals.ig_reels_video_view_total_count} allPlays=${vals.ig_reels_aggregated_all_plays_count} | inter=${vals.total_interactions} saves=${vals.saved} | Link:${hasLink?'JA':'nein'} #${nTags}`);
    console.log(`  ${(cap.split('\n')[0]||'').slice(0,80)}  → ${m.permalink}`);
  }
  console.log('\nLeitfrage: stehen bei plays/views echte Zahlen, aber reach=0? → Metrik-Effekt.');
  console.log('Sind plays/views AUCH ~0 bei Reels >24h alt? → echte Unterdrückung (Link-Demotion / kalter Account).');
})();
