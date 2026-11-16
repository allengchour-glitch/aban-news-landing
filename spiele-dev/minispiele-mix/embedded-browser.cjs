'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const R=require('../../js/minispiele-mix/core.js');
const base=process.env.MIX_BASE||'http://127.0.0.1:8184',out=process.env.MIX_OUT||'/tmp/mix-arena-embedded';
const geometry={'drei-gewinnt':'#board','vier-gewinnt':'#board',memory:'#board',elfmeter:'#cv','hoch-tief':'.cardrow',simon:'#board','quiz-buzzer':'#game',pong:'#cv','stapel-turm':'#cv'};
const checks=[],errors=[];function check(name,ok,extra){checks.push({name,ok:!!ok,...extra});assert(ok,name);}
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:'/tmp/aban-browsers/chromium-1255/chrome-linux64/chrome',args:['--no-sandbox']});
try{
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 for(const size of [{width:390,height:844},{width:640,height:360}]){
 await p.setViewportSize(size);
 for(const slug of R.games){
  await p.goto(base+'/minispiele/');await p.evaluate(slug=>{let run=MixRules.create(3,['Ada','Lin']);run.deck=[slug,...MixRules.games.filter(s=>s!==slug).slice(0,2)];localStorage.setItem('aban_mix_arena_v2',JSON.stringify({v:2,run,profile:MixProgress.empty(),settings:{sound:false,avatars:[0,1],names:['Ada','Lin']}}));},slug);await p.reload();await p.locator('#resume').click();await p.locator('#action').click();await p.locator('iframe').waitFor();const child=p.frames().find(f=>f!==p.mainFrame());await child.waitForFunction(()=>window.MiniMix?.active&&document.documentElement.classList.contains('mix-embedded'));await child.locator('link[href*="minispiele-mix-embedded.css"]').waitFor({state:'attached'});await child.waitForFunction(()=>Array.from(document.styleSheets).some(s=>s.href&&s.href.includes('minispiele-mix-landscape.css')));
  const metrics=await child.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,labels:[...document.querySelectorAll('.mix-player-label')].map(e=>e.textContent),back:[...document.querySelectorAll('button.mix-back')].map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,y:r.y};}),unstarted:!!document.querySelector('#startBtn')&&getComputedStyle(document.querySelector('#startBtn')).display!=='none'&&document.querySelector('#startBtn').getBoundingClientRect().height>0}));
  check(slug+' '+size.width+' eingebettet ohne Breitenüberlauf',metrics.scrollWidth<=metrics.width+1,{metrics});
  check(slug+' '+size.width+' Rückkehrknopf erreichbar',size.height>450?await p.locator('#interrupt').isVisible():metrics.back.length===1&&metrics.back[0].x>=0&&metrics.back[0].y>=0&&metrics.back[0].x+metrics.back[0].w<=metrics.width+1&&metrics.back[0].y+metrics.back[0].h<=metrics.height+1);
  if(size.height===360&&geometry[slug]){
    await child.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const box=await child.locator(geometry[slug]).evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight};});
    check(slug+' Querformat-Spielfeld vollständig sichtbar',box.x>=0&&box.y>=0&&box.right<=box.width+1&&box.bottom<=box.height+1,{box});
  }
  await p.screenshot({path:path.join(out,slug+'-'+size.width+'.png')});
  if(size.height===360&&geometry[slug]){const actions=await require('./landscape-actions.cjs')(p,child,slug);check(slug+' echte Querformat-Eingaben funktionieren',actions.length>1,{actions});}
  else if(size.height>450)await p.locator('#interrupt').click();else await child.locator('button.mix-back').click();await p.locator('#match').waitFor({state:'visible'});check(slug+' '+size.width+' unterbricht wirklich ohne Wertung',await p.locator('iframe').count()===0&&await p.locator('#stageTag').textContent()==='Nächste Disziplin'&&await p.locator('#score1').textContent()==='0');
 }
 }
 check('Alle eingebetteten Disziplinen ohne JS-Fehler',errors.length===0);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,checks,errors,scope:'Alle20 aktiven Mix-Frames in zwei Touch-Formaten, echte Unterbrechen-Knöpfe. Nur Reihenfolge als Fixture; keine Sieg-/FPS-Messung.'},null,2));console.log(checks.length+' Einbettungsbedingungen grün');await c.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(e.stack)},null,2));process.exitCode=1;});
