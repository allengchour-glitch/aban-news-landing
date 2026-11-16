/* Roll-Pause mit echten Eingaben; gezielt ausgelöste Quiz-Karte als Timer-Fixture. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LP_OUT||'/tmp/lebenspfad-pause',base=process.env.LP_BASE||'http://localhost:8150';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const result={checks:[],errors:[],limits:'Quiz-Fall gezielt per Test-Hook geöffnet; Würfel und Pause über echte Schaltflächen.'};
 try{
  const p=await b.newPage({viewport:{width:960,height:640}});
  p.on('pageerror',e=>result.errors.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('lp_tut_seen','1');localStorage.setItem('lp_opt',JSON.stringify({tempo:1.7,motion:true,music:false,sfx:false,graphics:'light'}));});
  await p.route('**/lebenspfad.html',async route=>{const r=await route.fetch();let s=await r.text();const i=s.lastIndexOf('})();');assert(i>0);s=s.slice(0,i)+`window.__pauseQA={read:()=>({t:G.t,phase:G.phase,tile:G.players[G.turn].tile,round:G.round,seq:window._cardSeq,opts:!!window._cardOpts,clock:lpClock(),musicPaused:MUS.paused}),quiz:()=>{clearTimeout(window._turnTO);G.phase="card";quizCard(G.players[G.turn]);}};`+s.slice(i);await route.fulfill({response:r,body:s});});
  await p.goto(base+'/lebenspfad.html');await p.waitForFunction(()=>window.__lp);
  await p.locator('#pselect button').first().click();await p.locator('#botChk').uncheck();await p.locator('#startBtn').click();
  await p.locator('#rollBtn').click();await p.locator('#menuBtn').click();
  const a=await p.evaluate(()=>__pauseQA.read());await p.waitForTimeout(3600);const z=await p.evaluate(()=>__pauseQA.read());
  assert.deepEqual([z.t,z.tile,z.phase],[a.t,a.tile,a.phase]);assert(Math.abs(z.clock-a.clock)<2);
  result.checks.push('Würfeln + Menü: nach 3,6 Sekunden weder Spielzeit noch Bewegung oder Würfel fortgeschritten');
  // Musik einschalten darf die lokale Pause nicht hörbar beenden.
  await p.locator('#optRows button').filter({hasText:'Musik'}).click();
  assert.equal(await p.evaluate(()=>__pauseQA.read().musicPaused),true);
  result.checks.push('Musik im Pausenmenü einschalten startet keine Wiedergabe');
  assert.equal(await p.evaluate(()=>__lp.graphics().profile),'light');
  for(const profile of ['details','auto','light']){
   await p.locator('.lp-graphics').click();
   const graphics=await p.evaluate(()=>__lp.graphics());
   assert.equal(graphics.profile,profile);
   assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('lp_opt')).graphics),profile);
   assert.equal(graphics.shadows,profile==='details');
   if(profile==='details')assert.equal(graphics.pixelRatio,1);
  }
  result.checks.push('Alle drei Grafikprofile umschaltbar und gespeichert; Detailprofil aktiviert volle Auflösung und Schatten');
  await p.locator('#resumeBtn').click();
  await p.waitForFunction(()=>__pauseQA.read().tile>0||__pauseQA.read().phase==='card',null,{timeout:45000});
  result.checks.push('Würfeln läuft nach Schließen des Menüs weiter');
  // Zuerst den echten Zug fertig bedienen, dann genau den Timer isolieren.
  const until=Date.now()+45000;
  while(Date.now()<until){const s=await p.evaluate(()=>__pauseQA.read());if(s.phase==='idle')break;if(s.opts)await p.locator('#cOpts button').first().click();await p.waitForTimeout(200);}
  assert.equal(await p.evaluate(()=>__pauseQA.read().phase),'idle');
  await p.evaluate(()=>__pauseQA.quiz());await p.waitForTimeout(900);
  await p.locator('#menuBtn').click();
  const q=await p.evaluate(()=>({...__pauseQA.read(),bar:document.getElementById('qBar').getBoundingClientRect().width}));
  await p.waitForTimeout(23200);
  const q2=await p.evaluate(()=>({...__pauseQA.read(),bar:document.getElementById('qBar').getBoundingClientRect().width}));
  assert.equal(q2.opts,true);assert.equal(q2.seq,q.seq);assert.equal(q2.round,q.round);assert.equal(q2.t,q.t);assert(Math.abs(q2.bar-q.bar)<2);
  result.checks.push('Quiz-Fixture bleibt länger als die volle 22-Sekunden-Frist pausiert, inklusive Balken und Kartenfolge');
  await p.locator('#resumeBtn').click();
  await p.waitForFunction(()=>!__pauseQA.read().opts,null,{timeout:26000});
  result.checks.push('Quiz läuft erst nach Fortsetzen ab und löst seine Antwort einmal aus');
  await p.waitForFunction(()=>__pauseQA.read().phase==='idle');
  const before=await p.evaluate(()=>__pauseQA.read());await p.locator('#journeyOpen').click();
  const opened=await p.evaluate(()=>__pauseQA.read());await p.waitForTimeout(1400);
  const during=await p.evaluate(()=>__pauseQA.read());assert.equal(during.t,opened.t);assert.equal(during.seq,before.seq);
  await p.locator('#liClose').click();await p.waitForTimeout(500);assert((await p.evaluate(()=>__pauseQA.read())).t>during.t);
  result.checks.push('Lebensbuch pausiert lokal und verändert keine Kartenfolge; Schließen setzt fort');
  assert.deepEqual(result.errors,[]);
 }catch(e){result.failure=e.stack;process.exitCode=1;}finally{fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(result,null,2));console.log(result);await b.close();}
})();
