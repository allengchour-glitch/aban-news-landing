/* fortura_import_grouped.mjs — wie fortura_import.mjs, aber GRUPPIERT nach Set-Nummer:
 * gleiche Set-Nr = 1 Produkt mit Grössen-Variante (Dropdown) statt N Einzel-Listings.
 * Grösse wandert in die Variante (nicht mehr in den Titel). Ledger: dropship/_fortura_grp_done.txt (Set-Nr).
 *
 * ⚠️ DIESES SKRIPT LEGT NUR AN. inventoryQuantities wird ausschliesslich im productSet unten geschrieben,
 * und das Ledger überspringt jedes bestehende Produkt — der Bestand eines EINMAL angelegten Artikels
 * wird hier nie wieder angefasst (2026-08-14: dadurch 21 Tage eingefroren). Das Nachführen macht
 * automation/fortura_bestand_sync.mjs, eingehängt in fortura_runner.sh. Wer hier etwas ändert, muss
 * dort mitdenken — und umgekehrt.
 * ENV: SHOPIFY_CLIENT_ID/SECRET, FORTURA_CSV, [LIMIT], [DRY=1], [MIN_VK], [FT_FILTER], [FT_TAGS], [FT_SHARD].
 */
import fs from 'node:fs';
import { catTags } from './cat_tags.mjs';
import { fortCatTags } from './fortura_cat.mjs';
function forturaType(t){
  const tl=(t||'').toLowerCase();
  if(/luftballon|ballon(?!.*[aä]rmel)|girlande|konfetti|wimpel|partydeko|party-?set|tischdeko|servietten|pi[nñ]ata|folienballon|deko\b|banner\b|tischdecke|strohhalm/.test(tl))return 'Partydeko & Ballone';
  if(/spielzeug|puzzle|pl[üu]sch|kuscheltier|puppe\b|schwimmbrille|taucherbrille|wasserpistole|seifenblasen|kreisel|bausteine|knete|springseil|kartenspiel/.test(tl))return 'Spielzeug & Spiele';
  if(/badeset|schaumbad|badesalz|badebombe|seife\b|duschgel|bodylotion|pflegeset|kosmetikset/.test(tl))return 'Beauty & Pflege';
  if(/schweiz|edelweiss|1\.\s*august|matterhorn|alphorn/.test(tl))return 'Schweizer Editionen';
  if(/sonnenbrille|schmuck|kette\b|armband|ohrring|tasche\b|rucksack|schal\b|f[äa]cher|geldb[öo]rse|krawatte|fliege\b|hosentr[äa]ger|g[üu]rtel/.test(tl))return 'Accessoires';
  if(/tasse\b|becher\b|glas\b|gl[äa]ser|kissen|decke\b|organizer|aufbewahrung|lampe|leuchte|kerze/.test(tl))return 'Haushalt & Wohnen';
  // 03.09.2026: Forturas Gruppe «Kostüme» ist ein Sammeltopf (226 BRUDER-Traktoren, Lotto, HARIBO, Deko standen als Kostüm)
  if(/bruder|claas|john deere|fendt|lemken|fliegl|joskin|manitou|\bjlg\b|volvo|\bcat\b|ram 2500|land rover|range rover|mb sprinter|mb arocs|mack granite|man tg|scania|massey|new holland|steyr|case ih|jcb|deutz|horsch|kipp-?lkw|anh[äa]nger|dumper|radlader|bagger|\blkw\b|traktor|bworld|rundballen|teleskoplader|feldh[äa]cksler|bulldozer|gator|roadmax|tankwagen|unimog|hoflader|lotto|bingo|tombola|gl[üu]cksrad|w[üu]rfel|spielkarte/.test(tl))return 'Spielzeug & Spiele';
  if(/haribo|trolli|bonbon|kaugummi|lolli|schoko|gummib[äa]r|chupa|lakritz|zuckerwatte|zuckerst|fruchtgummi|skittles|candy/.test(tl))return 'Süsswaren & Esswaren';
  if(/jeton|wertmarke|wachsfackel|skelett\b|spinne\b|spinnennetz|totenkopf|dekostoff|knicklicht|papagei|kan[üu]le|luftschlange|einwegteller|pappbecher|laternenstab|lampionstab|geschenkband|leinwand|wurfdose|animatronic|grabstein|fledermaus|k[üu]rbis\b/.test(tl))return 'Partydeko & Ballone';
  return 'Kostüme & Verkleidung';
}
// Kern-Kostümwörter (EINE Quelle: automation/kostuem_core.regex) → Tag kostuem-ch-front, an dem die Kollektion «Kostüme ab CH-Lager» hängt
const KOSTUEM_CORE = new RegExp(fs.readFileSync(new URL('./kostuem_core.regex', import.meta.url), 'utf8').trim(), 'i');
export function kostuemFrontTag(typ, title){ return (typ==='Kostüme & Verkleidung' && KOSTUEM_CORE.test(title||'')) ? ['kostuem-ch-front'] : []; }
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const SHOP='au3j0y-hq.myshopify.com', LOC='gid://shopify/Location/109350125953';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const LIMIT=parseInt(process.env.LIMIT||'20000',10);
const DRY=process.env.DRY==='1';
const CSVPATH=process.env.FORTURA_CSV||'/tmp/fortura_feed.csv';
const LEDGER='dropship/_fortura_grp_done.txt';
const IMG_SEEN='dropship/_fortura_img_seen.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SHIP_CH=9.50, MARKUP=2.2, MIN_MARGIN=6.0;
const MIN_VK=parseFloat(process.env.MIN_VK||'14.90');
const FT_FILTER=process.env.FT_FILTER?new RegExp(process.env.FT_FILTER,'i'):null;
const FT_TAGS=(process.env.FT_TAGS||'').split(',').map(s=>s.trim()).filter(Boolean);
const SHARD=(()=>{const m=(process.env.FT_SHARD||'').match(/^(\d+)\/(\d+)$/);return m?{i:+m[1],n:+m[2]}:null;})();
const shardHash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h;};
const EXCLUDE=/pistole|gewehr|revolver|\bwaffe|schwert|dolch|machete|\baxt\b|munition|patrone|halfter|kontaktlinse|\blinsen\b|erotik|dessous|bondage|fifty shades|eintritt|ersatzteil|nachschub|karton à|display à|\bdisplay\b/i;
const COL={art:['ArtNr'],ean:['EAN'],titleDE:['ArtikelTitelDE','Bez1DE'],groesse:['GrösseDE'],farbe:['FarbeDE'],dimension:['DimensionDE'],marke:['Marke'],anlass:['Anlass1DE','Thema1DE'],descDE:['InternetTextDE','ArtikelLieferumfangDE'],zusatzDE:['ArtikelTitelZusatzDE'],lieferumfangDE:['ArtikelLieferumfangDE'],ve:['Internet_VE'],stock:['Lagerbestand Total'],ekNetto:['VP1'],vkEmpf:['VP2','Nettopreis inkl'],imgs:['Bild_1','Bild_2','Bild_3','Bild_4','Bild_5'],setNr:['Set-Nummer']};
const pick=(o,ks)=>{for(const k of ks)if(o[k]!=null&&String(o[k]).trim()!=='')return String(o[k]).trim();return '';};
const num=s=>{const n=parseFloat(String(s).replace(/[^0-9.,-]/g,'').replace(',','.'));return isFinite(n)?n:0;};
const normT=x=>x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
const SIZEORD=['xs','s','s/m','m','m/l','l','l/xl','xl','xxl','xxxl','3xl','4xl'];
const sizeRank=g=>{const i=SIZEORD.indexOf(String(g).toLowerCase());return i<0?99:i;};
function parseCSV(text){const rows=[];let row=[],f='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}else{if(c==='"')q=true;else if(c==='|'){row.push(f);f='';}else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';}else if(c!=='\r')f+=c;}}if(f.length||row.length){row.push(f);rows.push(row);}return rows.filter(r=>r.length>1);}
function cleanTitle(t){let x=t.replace(/[,;]\s*$/,'').replace(/\s{2,}/g,' ').trim();if(x.length>66){x=x.slice(0,66);const sp=x.lastIndexOf(' ');if(sp>30)x=x.slice(0,sp);}for(let k=0;k<3;k++)x=x.replace(/[\s,]+(und|mit|inkl\.?|&|für|aus|im|in|zum|zur|von)\.?$/i,'').replace(/[\s,&-]+$/,'').trim();return x.slice(0,70).trim();}
function priceOf(rec){const ek=num(pick(rec,COL.ekNetto)),vk=num(pick(rec,COL.vkEmpf));const floor=ek+SHIP_CH+MIN_MARGIN;let p=vk>0?Math.max(vk,floor):Math.max(ek*MARKUP,floor);return Math.round(p*20)/20;}
async function scc(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=JSON.parse(await r.text()).access_token;if(t)return t;}catch{}await sleep(2000*(a+1));}throw new Error('scc');}
let TOK;
async function sgql(q,v){for(let a=0;a<4;a++){const r=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':TOK},body:JSON.stringify({query:q,variables:v})});const j=await r.json();if(j.data)return j;if(JSON.stringify(j.errors||'').includes('Throttled')){await sleep(3000);continue;}TOK=await scc();await sleep(1000);}return{};}
async function img200(u){try{const r=await fetch(u,{method:'HEAD'});return r.ok;}catch{return false;}}
const SET=`mutation($input:ProductSetInput!){productSet(synchronous:true,input:$input){product{id}userErrors{message}}}`;

if(!fs.existsSync(CSVPATH)){console.error('Kein Feed');process.exit(0);}
const LOCK=SHARD?`/tmp/fortura_grp_${SHARD.i}of${SHARD.n}.lock`:'/tmp/fortura_grp.lock';
if(!DRY){try{const fd=fs.openSync(LOCK,'wx');fs.writeFileSync(fd,String(process.pid));fs.closeSync(fd);}catch{const age=(Date.now()-(fs.statSync(LOCK).mtimeMs||0))/60000;if(age<30){console.log('läuft bereits, skip');process.exit(0);}fs.writeFileSync(LOCK,String(process.pid));}process.on('exit',()=>{try{fs.unlinkSync(LOCK);}catch{}});}
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean):[]);
const imgSeen=new Set(fs.existsSync(IMG_SEEN)?fs.readFileSync(IMG_SEEN,'utf8').split('\n').filter(Boolean):[]);

const rows=parseCSV(fs.readFileSync(CSVPATH,'latin1'));
const header=rows[0].map(h=>h.trim());
const recs=rows.slice(1).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]])));
// Gruppieren nach Set-Nr (leer → eigene Gruppe je ArtNr)
const groups=new Map();
for(const rec of recs){const art=pick(rec,COL.art);if(!art)continue;const sn=pick(rec,COL.setNr);const key=sn?('S:'+sn):('A:'+art);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(rec);}
console.log(`Feed: ${recs.length} Zeilen → ${groups.size} Produktgruppen`);

if(!DRY)TOK=await scc();
let created=0,skip=0,gcount=0;
for(const [key,grp] of groups){
  if(++gcount>LIMIT)break;
  if(SHARD&&(shardHash(key)%SHARD.n)!==SHARD.i)continue;
  if(done.has('ftg:'+key)){skip++;continue;}
  const base=grp[0];
  const catBlob=[base['Grp-Bez'],base['ArtikelTitelDE'],base['Bez1DE'],base['Thema1DE'],base['Anlass1DE'],base['Bez2DE']].filter(Boolean).join(' ');
  if(FT_FILTER&&!FT_FILTER.test(catBlob)){skip++;continue;}
  if(EXCLUDE.test(catBlob)){skip++;fs.appendFileSync(LEDGER,'ftg:'+key+'\n');continue;}
  // Nur lagernde Zeilen behalten
  const inStock=grp.filter(r=>Math.round(num(pick(r,COL.stock)))>0);
  if(!inStock.length){fs.appendFileSync(LEDGER,'ftg:'+key+'\n');continue;}
  const title=cleanTitle(pick(base,COL.titleDE));
  if(!title||title.length<4){skip++;fs.appendFileSync(LEDGER,'ftg:'+key+'\n');continue;}
  // Kleinticket-Filter (nur wenn ALLE Varianten drunter + kein Bündel)
  const ve=Math.max(1,Math.round(num(pick(base,COL.ve))||1));
  const anyOk=inStock.some(r=>{const vk=num(pick(r,COL.vkEmpf));return vk>=MIN_VK||ve>1;});
  if(!anyOk){skip++;fs.appendFileSync(LEDGER,'ftg:'+key+'\n');continue;}
  // Bild
  let img='';for(const u of COL.imgs.map(k=>pick(base,[k])).filter(Boolean)){if(/^https?:\/\//.test(u)){img=u;break;}}
  // Varianten (nach Grösse sortiert). Wenn nur 1 & keine Grösse → "Standard"
  const withSize=inStock.filter(r=>pick(r,COL.groesse));
  const useSize=withSize.length>0 && inStock.length>1;
  let variants,optName,optValues;
  if(useSize){
    const sorted=[...inStock].filter(r=>pick(r,COL.groesse)).sort((a,b)=>sizeRank(pick(a,COL.groesse))-sizeRank(pick(b,COL.groesse)));
    const seen=new Set(); const uniq=sorted.filter(r=>{const g=pick(r,COL.groesse);if(seen.has(g))return false;seen.add(g);return true;});
    optName='Grösse'; optValues=uniq.map(r=>pick(r,COL.groesse));
    variants=uniq.map(r=>({optionValues:[{optionName:'Grösse',name:pick(r,COL.groesse)}],price:priceOf(r).toFixed(2),barcode:(/^\d{8,14}$/.test(pick(r,COL.ean))?pick(r,COL.ean):undefined),inventoryItem:{sku:('fortura-'+pick(r,COL.art)).slice(0,70),tracked:true},inventoryPolicy:'DENY',inventoryQuantities:[{locationId:LOC,name:'available',quantity:Math.round(num(pick(r,COL.stock)))}]}));
  } else {
    const r=inStock[0];
    optName='Titel'; optValues=['Standard'];
    variants=[{optionValues:[{optionName:'Titel',name:'Standard'}],price:priceOf(r).toFixed(2),barcode:(/^\d{8,14}$/.test(pick(r,COL.ean))?pick(r,COL.ean):undefined),inventoryItem:{sku:('fortura-'+pick(r,COL.art)).slice(0,70),tracked:true},inventoryPolicy:'DENY',inventoryQuantities:[{locationId:LOC,name:'available',quantity:Math.round(num(pick(r,COL.stock)))}]}];
  }
  if(DRY){console.log(`[DRY] ${title} — ${variants.length} Variante(n) [${optName}: ${optValues.join('/')}] ab CHF ${variants[0].price}`);created++;continue;}
  if(img&&imgSeen.has(img)){/* Bild schon genutzt, trotzdem anlegen (Set kann Bild teilen) */}
  if(img&&!(await img200(img))){img='';}
  const marketing=pick(base,COL.descDE)||pick(base,COL.zusatzDE)||`${title} – hochwertige Qualität ab Schweizer Lager.`;
  const specs=[['Marke',pick(base,COL.marke)],['Farbe',pick(base,COL.farbe)],['Masse',pick(base,COL.dimension)],['Anlass',pick(base,COL.anlass)],['Lieferumfang',pick(base,COL.lieferumfangDE)]].filter(([,v])=>v);
  const specTable=specs.length?`<h4>Details</h4><ul>${specs.map(([k,v])=>`<li><strong>${k}:</strong> ${v}</li>`).join('')}</ul>`:'';
  const veNote=ve>1?`<p>📦 Verkauf in Bündeln zu ${ve} Stück.</p>`:'';
  const desc=`<p>${marketing}</p>${specTable}${veNote}<h4>Warum bei LuxeStyle kaufen?</h4><ul><li>🇨🇭 <strong>Versand aus der Schweiz</strong> – Lieferung in nur 1–2 Werktagen (DPD)</li><li>📦 Gratis-Versand ab CHF 50</li><li>↩️ 30 Tage Rückgaberecht</li><li>🔒 Kauf auf Rechnung mit Klarna · TWINT · Karten · PayPal · Apple Pay</li><li>💬 Schweizer Support: info@luxestyle.ch</li></ul>`;
  const slug=(normT(title).replace(/\s+/g,'-').slice(0,42))+'-fg'+key.replace(/[^a-z0-9]/gi,'').toLowerCase().slice(0,12);
  const tags=[...new Set(['fortura','dropship','ch-lager','schweiz-versand','neu',...kostuemFrontTag(forturaType(title),title),...FT_TAGS,...fortCatTags(base['Grp-Bez'],base['Kategorie'],title),...catTags(title)])];
  const input={title,handle:slug,productType:forturaType(title),vendor:'LuxeStyle',status:'ACTIVE',tags,descriptionHtml:desc,
    seo:{title:`${title} | LuxeStyle`.slice(0,70),description:`${title} – schnelle CH-Lieferung, Gratis-Versand ab CHF 50.`.slice(0,320)},
    productOptions:[{name:optName,values:optValues.map(v=>({name:v}))}],variants,
    files:img?[{originalSource:img,contentType:'IMAGE'}]:[]};
  const r=await sgql(SET,{input});
  const spid=r.data?.productSet?.product?.id;
  if(!spid){console.log('✗',title.slice(0,36),JSON.stringify(r.data?.productSet?.userErrors||'').slice(0,90));fs.appendFileSync(LEDGER,'ftg:'+key+'\n');continue;}
  if(img&&!imgSeen.has(img)){imgSeen.add(img);fs.appendFileSync(IMG_SEEN,img+'\n');}
  await sgql(`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`,{id:spid,p:PUBS});
  fs.appendFileSync(LEDGER,'ftg:'+key+'\n');created++;
  console.log(`✅ ${title.slice(0,40)} [${variants.length} ${optName}] → CHF ${variants[0].price}`);
  await sleep(400);
}
console.log(`\nFERTIG. Produkte=${created} skip=${skip}`);
