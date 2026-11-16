'use strict';
const assert=require('node:assert/strict');
module.exports=async function action(p,f,slug){
 const notes=[];
 if(slug==='drei-gewinnt'){
  await f.locator('#board .cell').nth(8).tap();assert.equal(await f.locator('#board .cell').nth(8).textContent(),'❌');
  await f.locator('#resetBtn').tap();assert.equal(await f.locator('#board .cell').nth(8).textContent(),'');notes.push('Letzte Zelle per Touch gesetzt; Brett leeren funktioniert.');
 }
 if(slug==='vier-gewinnt'){
  await f.locator('#board').tap({position:{x:27,y:27}});await f.waitForFunction(()=>document.querySelector('#turnLabel').textContent.includes('Gelb'));
  await f.locator('#board').tap({position:{x:351,y:27}});await f.waitForFunction(()=>document.querySelector('#turnLabel').textContent.includes('Rot'));
  const rgb=await f.evaluate(()=>{const c=document.querySelector('#board'),ctx=c.getContext('2d'),d=c.width/378;return [0,3,6].map(col=>[...ctx.getImageData((col*54+27)*d,297*d,1,1).data].slice(0,3));});
  assert(rgb[0][0]>rgb[0][2]+50);assert(rgb[1][2]>rgb[1][0]);assert(rgb[2][0]>rgb[2][2]+50&&rgb[2][1]>rgb[2][2]+50);notes.push({text:'Touch-Spalten links/rechts ergeben rot/gelb in Spalten 0/6; Mitte bleibt leer.',rgb});
 }
 if(slug==='memory'){
  await f.locator('#board .card').nth(15).tap();assert.match(await f.locator('#board .card').nth(15).getAttribute('class'),/flipped/);notes.push('Letzte Memory-Karte per Touch aufgedeckt.');
 }
 if(slug==='elfmeter'){
  await f.locator('#z2').tap();await f.waitForFunction(()=>document.querySelector('#hint').textContent.includes('Torwart:'));
  await f.locator('#z0').tap();assert(await f.locator('#z0').isDisabled());notes.push('Rechte Schützenwahl und linke Torwartwahl per Touch starten den Schuss.');
 }
 if(slug==='hoch-tief'){
  await f.locator('#btnLower').tap();assert(await f.locator('#btnLower').isDisabled());assert(!await f.locator('#nextCard').evaluate(e=>e.classList.contains('back')));assert((await f.locator('#feedback').textContent()).trim());notes.push('Tiefer deckt nächste Karte auf, zeigt Feedback und sperrt kurz die Tipps.');
 }
 if(slug==='simon'){
  await f.waitForFunction(()=>document.querySelector('#status').textContent.includes('jetzt du!'));
  await f.locator('#b').tap();const s=await f.locator('#status').textContent();assert(s.includes('Super')||s.includes('Ups'));notes.push('Unteres rechtes Simon-Pad reagiert in der Eingabephase.');
 }
 if(slug==='quiz-buzzer'){
  await f.locator('#buz1').tap();
  await f.locator('.ans').first().tap();assert.equal(await f.locator('#pt1').textContent(),'1');notes.push('Buzzer 1 und richtige Antwort Blau per Touch geben Spieler 1 einen Punkt.');
 }
 if(slug==='pong'){
  await f.evaluate(()=>{window.qaTouches=[];document.querySelector('#cv').addEventListener('touchstart',e=>window.qaTouches.push({y:e.touches[0].clientY,prevented:e.defaultPrevented}),{passive:true});});
  await f.locator('#cv').tap({position:{x:80,y:30}});await f.locator('#cv').tap({position:{x:330,y:300}});
  const touches=await f.evaluate(()=>window.qaTouches);assert.equal(touches.length,2);assert(touches.every(t=>t.prevented));notes.push({text:'Beide Canvas-Hälften erhalten echte Touch-Eingaben; vorhandener Handler verarbeitet sie.',touches});
 }
 if(slug==='stapel-turm'){
  await f.locator('#cv').tap({position:{x:200,y:290}});assert.equal(await f.locator('#v1').textContent(),'1');
  await f.waitForFunction(()=>document.querySelector('#sc2').classList.contains('active'));
  await f.locator('#cv').tap({position:{x:200,y:290}});assert.equal(await f.locator('#v2').textContent(),'1');notes.push('Canvas-Touch setzt je einen Block für beide Spieler.');
 }
 await f.locator('button.mix-back').tap();await p.locator('#match').waitFor({state:'visible'});assert.equal(await p.locator('iframe').count(),0);assert.equal(await p.locator('#stageTag').textContent(),'Nächste Disziplin');assert.equal(await p.locator('#score1').textContent(),'0');notes.push('Unterbrechen per Touch kehrt ohne Rundensieg zurück.');
 return notes;
};
