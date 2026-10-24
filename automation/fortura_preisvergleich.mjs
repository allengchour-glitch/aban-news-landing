#!/usr/bin/env node
/* LuxeStyle — fortura_preisvergleich.mjs
 * Vergleicht die eigenen Widmann-Preise gegen Schweizer Haendler und beantwortet damit die
 * offene Frage aus dropship/PREIS-STICHPROBE-FORTURA.md ("sind die 755 Artikel zu teuer?").
 *
 * WARUM FIRECRAWL: galaxus.ch antwortet auf einen gewoehnlichen Abruf mit 503, toppreise.ch
 * mit 403, idealo blockiert (am 24.10.2026 gemessen, Gegenprobe auf die eigene Seite lief).
 * Ohne Stealth-Proxy ist diese Messung nicht moeglich.
 *
 * SCHREIBT NICHTS - weder im Shop noch an Preisen. Nur Messung und CSV.
 * Preise aendert ausschliesslich der Besitzer.
 *
 * ENV: FIRECRAWL_API_KEY  (ohne den: No-op mit Grund)
 *      [EIN=dropship/fortura_preis_kandidaten.csv] [AUS=dropship/fortura_preisvergleich.csv]
 *      [MAX_CREDITS=50]   Harte Obergrenze. Vorgabe absichtlich klein (Gratis-Test).
 *      [NUR=10]           Nur die ersten N Artikel (ueber die Preisbaender verteilt).
 *      [HAENDLER=toppreise,galaxus]
 */
import fs from 'node:fs';
import { tiefsterPreis, vergleich } from './lib/chf_preis.mjs';

const KEY=(process.env.FIRECRAWL_API_KEY||'').trim();
const EIN=process.env.EIN||'dropship/fortura_preis_kandidaten.csv';
const AUS=process.env.AUS||'dropship/fortura_preisvergleich.csv';
const MAX_CREDITS=parseInt(process.env.MAX_CREDITS||'50',10);
const NUR=parseInt(process.env.NUR||'10',10);
const HAENDLER=(process.env.HAENDLER||'toppreise,galaxus').split(',').map(s=>s.trim()).filter(Boolean);
// Nur zum Pruefen: erlaubt einen oertlichen Nachbau der Firecrawl-API, damit die Kette
// CSV -> Messung -> CSV ohne Netz und ohne Credits geprueft werden kann.
const BASIS=(process.env.FIRECRAWL_BASIS||'https://api.firecrawl.dev').replace(/\/$/,'');

if(!KEY){
  console.log('No-op: FIRECRAWL_API_KEY fehlt.');
  console.log('Grund: Firecrawl ist hier nur als Connector verbunden, nicht als Umgebungs-Schlüssel.');
  console.log('Ohne Schlüssel kann kein Skript messen — 755 Artikel von Hand sind nicht machbar.');
  process.exit(0);
}
if(!fs.existsSync(EIN)){ console.log(`No-op: ${EIN} fehlt. Zuerst: node automation/fortura_preis_kandidaten.mjs`); process.exit(0); }

const SUCHE={
  toppreise: w=>`https://www.toppreise.ch/produktsuche?q=${encodeURIComponent(w)}`,
  galaxus:   w=>`https://www.galaxus.ch/de/search?q=${encodeURIComponent(w)}`,
};

let credits=0;
async function hole(url){
  if(credits>=MAX_CREDITS) throw new Error(`Credit-Deckel ${MAX_CREDITS} erreicht`);
  const r=await fetch(`${BASIS}/v2/scrape`,{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},
    body:JSON.stringify({url,formats:['markdown'],onlyMainContent:true,proxy:'auto',timeout:45000})});
  credits++;  // Firecrawl verbraucht auch bei Fehlerseiten - darum HIER zaehlen, nicht erst bei Erfolg.
  const j=await r.json().catch(()=>({}));
  if(r.status===402) throw new Error('CREDITS_LEER');
  if(!r.ok||!j.success) return {fehler:`HTTP ${r.status}${j.error?' '+String(j.error).slice(0,80):''}`,text:''};
  return {fehler:null,text:j.data?.markdown||''};
}

const zeilen=fs.readFileSync(EIN,'utf8').trim().split('\n');
const kopf=zeilen[0].split(',');
const alle=zeilen.slice(1).map(z=>{
  const f=z.match(/("([^"]|"")*"|[^,]*)/g).filter((_,i)=>i%2===0).slice(0,kopf.length);
  const o={}; kopf.forEach((k,i)=>o[k]=(f[i]||'').replace(/^"|"$/g,'').replace(/""/g,'"')); return o;
});
// Ueber die Preisbaender verteilt, nicht die ersten N - sonst messe ich nur die billigsten.
const sort=[...alle].sort((a,b)=>parseFloat(a.preis)-parseFloat(b.preis));
const wahl=NUR>0&&NUR<sort.length ? Array.from({length:NUR},(_,i)=>sort[Math.floor(i*(sort.length-1)/(NUR-1))]) : sort;

console.log(`${alle.length} Kandidaten · gemessen werden ${wahl.length} · Credit-Deckel ${MAX_CREDITS}`);
const out=[]; let teurer=0, rahmen=0, unbekannt=0, leer=false;
for(const a of wahl){
  let markt=null, quelle='', fehler=[];
  for(const h of HAENDLER){
    if(credits>=MAX_CREDITS) break;
    try{
      const {fehler:f,text}=await hole(SUCHE[h](a.schluessel));
      if(f){ fehler.push(`${h}:${f}`); continue; }
      const p=tiefsterPreis(text);
      if(p!=null&&(markt==null||p<markt)){ markt=p; quelle=h; }
      else if(p==null) fehler.push(`${h}:kein Preis`);
    }catch(e){ if(e.message==='CREDITS_LEER'){ leer=true; break; } fehler.push(`${h}:${e.message}`); }
  }
  if(leer) break;
  const v=vergleich(a.preis,markt);
  if(v.urteil==='teurer') teurer++; else if(v.urteil==='unbekannt') unbekannt++; else rahmen++;
  out.push({...a,markt:markt??'',quelle,faktor:v.faktor??'',urteil:v.urteil,hinweis:fehler.join(' | ')});
  console.log(`  ${v.urteil.padEnd(10)} eigen ${String(a.preis).padStart(7)} · Markt ${String(markt??'—').padStart(7)} · ${v.faktor?v.faktor+'×':'—'}  ${a.titel.slice(0,40)}`);
}

const k='handle,titel,preis,schluesselArt,schluessel,markt,quelle,faktor,urteil,hinweis';
fs.writeFileSync(AUS,[k,...out.map(o=>[o.handle,`"${o.titel.replace(/"/g,'""')}"`,o.preis,o.schluesselArt,o.schluessel,o.markt,o.quelle,o.faktor,o.urteil,`"${o.hinweis}"`].join(','))].join('\n')+'\n');
console.log(`\nverbrauchte Credits: ${credits}${leer?' · ABGEBROCHEN: Konto leer':''}`);
console.log(`teurer: ${teurer} · im Rahmen: ${rahmen} · unbekannt: ${unbekannt}`);
if(unbekannt) console.log('„unbekannt" heisst NICHT „in Ordnung" — dort hat die Messung nicht gegriffen.');
console.log(`CSV: ${AUS}`);
