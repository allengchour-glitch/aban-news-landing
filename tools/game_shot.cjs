const {chromium}=require(require('path').join(__dirname,'..','node_modules','playwright'));
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=require('path').join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));
  if(!fs.existsSync(p)){r.writeHead(404);r.end();return;}
  const ct=p.endsWith('.glb')?'model/gltf-binary':p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':p.endsWith('.mp3')?'audio/mpeg':'application/octet-stream';
  r.writeHead(200,{'Content-Type':ct});r.end(fs.readFileSync(p));});
(async()=>{
srv.listen(8932);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
for(const g of process.argv.slice(2)){
  const pg=await b.newPage({viewport:{width:1280,height:800}});
  const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto('http://127.0.0.1:8932/'+g+'.html');
  await pg.waitForTimeout(2000);
  await pg.evaluate(()=>{const bs=[...document.querySelectorAll('button')];const b=bs.find(x=>x.offsetParent&&/Start|Verlies|beginnen|Los|▶/.test(x.textContent));b&&b.click();});
  await pg.waitForTimeout(4000);
  // etwas Bewegung simulieren
  await pg.mouse.click(700,300);
  await pg.keyboard.down('d');await pg.waitForTimeout(1500);await pg.keyboard.up('d');
  await pg.waitForTimeout(1000);
  await pg.screenshot({path:'/tmp/aban-smoke/ig_'+g+'.png'});
  console.log(g,'errors:',errs.length,errs.slice(0,2).join('|'));
  await pg.close();
}
await b.close();srv.close();
})();
