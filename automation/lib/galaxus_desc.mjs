/* galaxus_desc.mjs — baut Galaxus-Stil-Beschreibungen aus BigBuy-Rohdaten:
 * Marketing-Intro + strukturierte Eigenschaften-Liste (Specs) + Trust/Versand-Block.
 * export buildGalaxusDesc(rawDesc, {title, blurb}) -> descriptionHtml (string)
 */
function decode(s){return (s||'')
 .replace(/&nbsp;/g,' ').replace(/&uuml;/g,'ü').replace(/&auml;/g,'ä').replace(/&ouml;/g,'ö')
 .replace(/&Uuml;/g,'Ü').replace(/&Auml;/g,'Ä').replace(/&Ouml;/g,'Ö').replace(/&szlig;/g,'ß')
 .replace(/&amp;/g,'&').replace(/&eacute;/g,'é').replace(/&egrave;/g,'è').replace(/&agrave;/g,'à')
 .replace(/&quot;/g,'"').replace(/&#39;|&rsquo;|&lsquo;/g,'’').replace(/&hellip;/g,'…')
 .replace(/&ndash;|&mdash;/g,'–').replace(/&[a-z]+;/gi,' ');}

const LABELS=['Geschlecht','Art des Duftes','Art','Name des Parfüms','Marke','Inhalt','Kapazität','Volumen','Format',
 'Hauttyp','Hautart','Typ','Farbe','Material','Material der Linsen','Duftnote','Anwendung','Wirkung','Eigenschaften',
 'Funktion','Funktionen','Inhaltsstoffe','Schutz','Objektiv','Enthalten','Referenz','EAN','Gewicht','Massे','Masse','Grösse'];
const HIDE=/^(referenz|ean|name des parfüms)$/i;

function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

export function buildGalaxusDesc(rawDesc, {title, blurb}){
 let t=decode((rawDesc||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
 const labelRe=new RegExp('\\b('+LABELS.join('|')+')\\s*:\\s*','g');
 const hits=[...t.matchAll(labelRe)].map(m=>({label:m[1],idx:m.index,end:m.index+m[0].length}));
 const specs=[];
 if(hits.length){
  for(let i=0;i<hits.length;i++){
   const vs=hits[i].end, ve=i+1<hits.length?hits[i+1].idx:t.length;
   let val=t.slice(vs,ve).trim();
   // Wert beim nächsten "Grosswort:" (Sub-Label) abschneiden
   val=val.replace(/\s+[A-ZÄÖÜ][\wäöü ]{2,30}:\s.*$/,'').replace(/[·;,.\s]+$/,'').trim().slice(0,50);
   if(val && !/^original/i.test(val) && !HIDE.test(hits[i].label)) specs.push([hits[i].label,val]);
  }
 }
 let intro=(hits.length?t.slice(0,hits[0].idx):t).trim();
 intro=intro.replace(/\s*100\s*%\s*Original-[^.!?]*/g,'').replace(/Lassen Sie\s+Sie/,'Lassen Sie sich')
   .replace(/Testen Sie die Qualität unserer\.?/,'').replace(/Entdecken Sie die!?/,'')
   .replace(/^\s*Lassen Sie( sich)?[.!?]\s*/i,'').replace(/^\s*Testen Sie[^.!?]*[.!?]\s*/i,'')
   .replace(/\s+([.!?])/g,'$1').replace(/\.{2,}/g,'.').replace(/^[\s.!?–-]+/,'').replace(/\s+/g,' ').trim();
 // Fallback wenn Intro kaputt/zu kurz
 if(intro.replace(/[^a-zäöü]/gi,'').length<25) intro=`<strong>${esc(title)}</strong> — ${blurb}, 100 % Original-Markenware in geprüfter Qualität.`;
 else intro=`<strong>${esc(title)}</strong> — ${esc(intro).replace(/^<strong>.*?<\/strong>\s*[—-]?\s*/,'')}`;
 if(intro.length>420) intro=intro.slice(0,417).replace(/\s\S*$/,'')+'…';

 let specHtml='';
 if(specs.length){
  // Dedup + max 8
  const seen=new Set(); const rows=[];
  for(const [l,v] of specs){const k=l.toLowerCase();if(seen.has(k))continue;seen.add(k);rows.push([l,v]);if(rows.length>=8)break;}
  specHtml='<h3>Eigenschaften</h3>\n<ul>\n'+rows.map(([l,v])=>`<li><strong>${esc(l)}:</strong> ${esc(v)}</li>`).join('\n')+'\n</ul>\n';
 }
 return `<p>${intro}</p>\n${specHtml}`
  +`<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;">`
  +`<strong>🛡️ Sorglos shoppen:</strong> ✅ 100 % Original-Markenware · 🚚 EU-Lager – Lieferung ca. 3–7 Tage · 🔄 30 Tage Rückgabe · 🇨🇭 Schweizer Shop · 💳 TWINT, Karte &amp; Klarna.</div>`
  +`<p>Gratis-Versand ab CHF 65 · <strong>–10 % mit Code WELCOME10</strong></p>`;
}
