// Kamera-Tour durch alle Lebenspfad-Kapitel: Screenshot je Zone (visuelle QA).
// Nutzung: node tools/lp_tour.cjs [kapitel-indizes, default 1 2 4 5 7]
const {chromium}=require(require('path').join(__dirname,'..','node_modules','playwright'));
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
// Debug-Kopie mit Kamera-Hook erzeugen (nie committen)
const src=fs.readFileSync(path.join(ROOT,'lebenspfad.html'),'utf8');
const anchor='var G=null,running=false;';
if(!src.includes(anchor))throw new Error('Anker fehlt');
const dbg=src.replace(anchor,anchor+
  'window.__TOUR=function(x,z){running=false;window.__noCam=true;camera.position.set(x+11,13,z+18);camera.lookAt(x,1.5,z);};'+
  'window.__FLD=function(i){return {x:fields[i].x,z:fields[i].z};};')
  .replace('function updateCamera(dt){','function updateCamera(dt){if(window.__noCam)return;');
fs.writeFileSync(path.join(ROOT,'_lptour.html'),dbg);
const srv=http.createServer((q,r)=>{let p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));
  if(!fs.existsSync(p)){r.writeHead(404);r.end();return;}
  const ct=p.endsWith('.glb')?'model/gltf-binary':p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':p.endsWith('.hdr')?'application/octet-stream':p.endsWith('.mp3')?'audio/mpeg':'application/octet-stream';
  r.writeHead(200,{'Content-Type':ct});r.end(fs.readFileSync(p));});
(async()=>{
srv.listen(8935);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1280,height:800}});
const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
await pg.goto('http://127.0.0.1:8935/_lptour.html');
await pg.waitForTimeout(2500);
await pg.evaluate(()=>{const bt=[...document.querySelectorAll('button')].find(x=>/Leben beginnen/.test(x.textContent));bt&&bt.click();});
await pg.waitForTimeout(4500); // Modelle laden lassen
const chapters=process.argv.slice(2).map(Number);
for(const ci of (chapters.length?chapters:[1,2,4,5,7])){
  await pg.evaluate((ci)=>{const f=window.__FLD(ci*18+8);window.__TOUR(f.x,f.z);},ci);
  await pg.waitForTimeout(600);
  await pg.screenshot({path:'/tmp/aban-smoke/tour_ch'+ci+'.png'});
  console.log('ch'+ci,'ok');
}
console.log('ERRORS',errs.length,errs.slice(0,2).join('|'));
await b.close();srv.close();fs.unlinkSync(path.join(ROOT,'_lptour.html'));
})();
