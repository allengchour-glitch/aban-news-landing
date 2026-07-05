#!/usr/bin/env node
/* seedance_test.mjs — MINIMAL-Diagnose fuer den fehlschlagenden Winner-Render. Testet EINEN Clip mit vollem Log,
 * damit wir sehen WO es klemmt (FAL_KEY? fal-SDK installiert? Modell-ID? Netz?). Schreibt reports/seedance-test.txt
 * UND stdout. Laeuft auf dem PC. Kein Commit noetig fuer die Erkenntnis (Output geht auch in den cmd-Log).
 * ENV: FAL_KEY
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
mkdirSync('reports',{recursive:true}); mkdirSync('reels',{recursive:true});
const out=[]; const W=m=>{ out.push(String(m)); console.log(m); try{ writeFileSync('reports/seedance-test.txt', out.join('\n')+'\n'); }catch{} };
const FK=(process.env.FAL_KEY||'').trim();
W('=== Seedance-Diagnose '+new Date().toISOString()+' ===');
W('FAL_KEY: '+(FK?('vorhanden, len '+FK.length):'FEHLT'));
if(!FK){ W('→ Ohne FAL_KEY kein Render. Pruefe luxe-secrets.ps1 ($env:FAL_KEY) + dass die cmd die Secrets sourct.'); process.exit(0); }
let fal;
try{ const mod=await import('@fal-ai/client'); fal=mod.fal; W('fal-SDK @fal-ai/client geladen: OK'); }
catch(e){ W('❌ @fal-ai/client NICHT installiert/ladbar: '+(e?.message||e)); W('→ Fix: npm i @fal-ai/client  (im repo-root).'); process.exit(0); }
try{ fal.config({ credentials: FK }); W('fal.config OK'); }catch(e){ W('❌ fal.config: '+(e?.message||e)); process.exit(0); }
const IMG='https://cdn.shopify.com/s/files/1/0943/6856/3585/files/bc5926c2-ee69-4dff-842b-271f3e176766.jpg?v=1780945950';
const input={ prompt:'geometric black onyx statement earrings, gentle 360 rotation on matte charcoal, glossy facets catch moving light, macro, no text, environmental sound only, vertical 9:16', image_url:IMG, resolution:'720p', duration:5, aspect_ratio:'9:16', generate_audio:false };
const MODELS=['bytedance/seedance/v1/pro/image-to-video','bytedance/seedance/v1/lite/image-to-video','bytedance/seedance-2.0/fast/image-to-video'];
let url='';
for(const M of MODELS){
  try{
    W('→ versuche '+M+' …');
    const r=await fal.subscribe(M,{ input });
    url=r?.data?.video?.url||r?.video?.url||'';
    if(url){ W('✅ '+M+' akzeptiert. video: '+url); break; }
    W('⚠️ '+M+' kein video in Antwort: '+JSON.stringify(r).slice(0,200));
  }catch(e){ W('❌ '+M+' Fehler: '+(e?.message||String(e)).slice(0,240)); }
}
if(!url){ W('\n→ ALLE Modelle fehlgeschlagen. Siehe Fehlermeldungen oben (Modell-ID? Credits? Region?).'); process.exit(0); }
try{
  const resp=await fetch(url); const buf=Buffer.from(await resp.arrayBuffer()); writeFileSync('reels/seedance-test.mp4', buf);
  W('✅ Clip gespeichert: reels/seedance-test.mp4 ('+Math.round(statSync('reels/seedance-test.mp4').size/1024)+' KB)');
  W('→ FAZIT: Seedance funktioniert. render_winners.mjs kann jetzt alle 6 Winner rendern.');
}catch(e){ W('❌ Download: '+(e?.message||e)); }
