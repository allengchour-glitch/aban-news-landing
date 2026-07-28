/* ig-delete-dupes.mjs — löscht doppelte Instagram-Posts (behält je Gruppe den besten).
 * LÄUFT LOKAL AUF DEM PC (nicht in der Cloud-Session). Schützt Posts mit >=50 Interaktionen.
 * Token holen: developers.facebook.com/tools/explorer → App "LuxeStyle Social" → User Token mit
 *   instagram_basic, instagram_content_publish, pages_show_list  → kopieren.
 * Vorschau:  node ig-delete-dupes.mjs <TOKEN>
 * Löschen:   node ig-delete-dupes.mjs <TOKEN> --go
 */
const T=process.argv[2], GO=process.argv.includes('--go');
if(!T){console.error('Nutzung: node ig-delete-dupes.mjs <TOKEN> [--go]');process.exit(1);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>(s||'').toLowerCase().replace(/#\w+/g,'').replace(/[^a-z0-9äöü ]/g,'').replace(/\s+/g,' ').trim().slice(0,55);
(async()=>{
  const acc=await(await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,access_token,instagram_business_account{id}&access_token=${T}`)).json();
  const page=(acc.data||[]).find(p=>p.instagram_business_account)||acc.data?.[0];
  if(!page?.instagram_business_account){console.error('Keine verknüpfte IG-Business-Seite. Scopes prüfen.');process.exit(1);}
  const PT=page.access_token, IG=page.instagram_business_account.id;
  let url=`https://graph.facebook.com/v21.0/${IG}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=100&access_token=${PT}`, all=[];
  while(url){const j=await(await fetch(url)).json();if(j.error){console.error(j.error.message);break;}all.push(...(j.data||[]));url=j.paging?.next;}
  const g=new Map();for(const m of all){const k=norm(m.caption);if(!k)continue;if(!g.has(k))g.set(k,[]);g.get(k).push(m);}
  const eng=m=>(m.like_count||0)+(m.comments_count||0);let del=0,skip=0;
  for(const [k,v] of g){if(v.length<2)continue;v.sort((a,b)=>eng(b)-eng(a)||new Date(a.timestamp)-new Date(b.timestamp));
    for(const m of v.slice(1)){if(eng(m)>=50){skip++;continue;}
      if(!GO){console.log('WÜRDE löschen:',m.permalink,`(${eng(m)} Likes)`);del++;continue;}
      const r=await fetch(`https://graph.facebook.com/v21.0/${m.id}?access_token=${PT}`,{method:'DELETE'});const j=await r.json();
      if(j.success||r.ok){del++;console.log('gelöscht:',m.permalink);}else console.log('Fehler:',JSON.stringify(j).slice(0,80));await sleep(700);}}
  console.log(`\n${GO?'GELÖSCHT':'WÜRDE löschen'}: ${del} | geschützt (>=50 Interakt.): ${skip}`);
})();
