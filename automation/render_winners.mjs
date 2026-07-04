#!/usr/bin/env node
/* render_winners.mjs — rendert die 6 Winner-Ad-Clips aus automation/winner_render_jobs.json via Seedance (fal.ai).
 * Jobs = {handle, image, prompt, out} (kuratierte Prompts aus dem 20-Agenten-Werbe-Schwarm 2026-07-04).
 * Laeuft auf dem PC (FAL_KEY noetig). seedance_video.mjs no-opt sauber ohne Key. Modell-Kette = v1/pro-first (Fix 2026-07-04).
 * ENV: FAL_KEY · [DUR=6] · [RES=720p]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('reports',{recursive:true}); mkdirSync('reels',{recursive:true});
const DUR=process.env.DUR||'6', RES=process.env.RES||'720p';
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/winner-render.txt', out.join('\n')+'\n'); }catch{} };
let jobs=[]; try{ jobs=JSON.parse(readFileSync('automation/winner_render_jobs.json','utf8')); }catch(e){ W('Keine Jobs: '+e.message); process.exit(0); }
const FK=(process.env.FAL_KEY||'').trim();
W(`FAL_KEY: ${FK?('vorhanden, len '+FK.length):'FEHLT'} · SHOPIFY_CLIENT_SECRET: ${(process.env.SHOPIFY_CLIENT_SECRET||'')?'vorhanden':'fehlt'}`);
if(!FK){ W('Kein FAL_KEY → No-op. (Auf dem PC: luxe-secrets.ps1 muss $env:FAL_KEY setzen; keycheck bestaetigte ihn — falls hier trotzdem FEHLT, wurde die cmd nicht mit gesourcten Secrets ausgefuehrt.)'); process.exit(0); }
W(`Render ${jobs.length} Winner-Clips (res ${RES}, dur ${DUR}s, v1/pro-first)…`);
let ok=0;
for(const j of jobs){
  W(`\n→ ${j.out}  (${j.handle})`);
  const r=spawnSync('node',['automation/seedance_video.mjs','--image',j.image,'--prompt',j.prompt,'--res',RES,'--dur',String(DUR),'--ar','9:16','--out',j.out],{encoding:'utf8',timeout:1000*60*8});
  const tail=(r.stdout||'').trim().split('\n').slice(-3).join(' | ');
  if(r.stderr) W('  stderr: '+r.stderr.trim().slice(0,200));
  W('  '+tail);
  if(existsSync(j.out) && statSync(j.out).size>10000){ ok++; W('  ✓ Clip da ('+Math.round(statSync(j.out).size/1024)+' KB)'); }
  else W('  ✗ kein Clip erzeugt');
}
W(`\nFertig: ${ok}/${jobs.length} Winner-Clips gerendert. Weiter: finish_reel.sh (Hook+Musik) → queue.`);
