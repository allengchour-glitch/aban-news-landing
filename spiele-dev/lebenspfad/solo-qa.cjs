/* Echter kurzer Lebenslauf: nur Schaltflächen, keine Änderung von G/Position/Würfen. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.LP_BASE || 'http://localhost:8150';
const out = process.env.LP_OUT || '/tmp/lebenspfad-solo';
(async () => {
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
  const result = {checks:[], errors:[], turns:[], actions:[], ended:false};
  let page;
  try {
    const context = await browser.newContext({viewport:{width:960,height:640}, hasTouch:true});
    await context.addInitScript(() => {
      localStorage.setItem('lp_tut_seen','1');
      // Gültige Benutzereinstellungen; Spielstand und Zufall bleiben unangetastet.
      localStorage.setItem('lp_opt', JSON.stringify({tempo:1.7,motion:false,music:false,sfx:false,graphics:'light'}));
    });
    page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', e => result.errors.push(e.message));
    const response = await page.goto(base+'/lebenspfad.html', {waitUntil:'domcontentloaded'});
    assert(response.headers()['content-security-policy'], 'CSP fehlt');
    await page.waitForFunction(() => window.__lp);
    await page.locator('#pselect button').first().click();
    await page.locator('#botChk').uncheck();
    await page.locator('#kurzChk').check();
    await page.locator('#startBtn').click();
    assert.equal(await page.evaluate(() => __lp.state().players.length), 1);
    result.checks.push('Echter Einzelspieler ohne Robo, kurzer Modus');
    const deadline = Date.now()+600000;
    let lastRollRound=-1, lastWheelRound=-1, lastCard='', restored=false;
    while(Date.now()<deadline) {
      const snap = await page.evaluate(() => {
        const g=__lp.state(), p=g.players[0], roll=document.getElementById('rollBtn');
        const rad=document.getElementById('rad');
        return {phase:g.phase,round:g.round,tile:p.tile,done:p.done,dead:!!p.dead,bio:p.bio.length,
          end:!document.getElementById('endO').classList.contains('hide'),
          roll:!roll.disabled,rad:!!rad&&getComputedStyle(rad).display!=='none',
          card:document.getElementById('card').classList.contains('on'),
          title:document.getElementById('cTitle').textContent,
          seq:window._cardSeq,opts:[...document.querySelectorAll('#cOpts button')].map(b=>b.textContent)};
      });
      if(snap.end) {result.ended=true;result.final=snap;break;}
      if(snap.card) {
        const key=snap.seq+':'+snap.title;
        if(lastCard!==key) {
          lastCard=key;
          const safe=snap.opts.findIndex(t=>!t.includes('⚠️'));
          assert(snap.opts.length, 'Karte ohne sichtbare Wahl');
          result.actions.push({card:snap.title,choice:snap.opts[Math.max(0,safe)]});
          await page.locator('#cOpts button').nth(Math.max(0,safe)).click();
        }
      } else if(snap.phase==='idle' && snap.roll && snap.round!==lastRollRound) {
        lastRollRound=snap.round; result.turns.push(snap);
        if(!restored && snap.round>=5) {
          const before=await page.evaluate(() => JSON.stringify(__lp.state().players));
          await page.reload({waitUntil:'domcontentloaded'});
          await page.waitForFunction(() => window.__lp);
          await page.locator('#contBtn').click();
          const after=await page.evaluate(() => JSON.stringify(__lp.state().players));
          assert.equal(after,before,'Fortsetzen verändert Spieler');
          result.checks.push('Echter gespeicherter Zwischenstand nach Neuladen identisch fortgesetzt');
          restored=true;
        }
        console.log('Runde',snap.round,'Feld',snap.tile,'Erinnerungen',snap.bio);
        await page.locator('#rollBtn').click();
      } else if(snap.rad && snap.phase==='rolling' && snap.round!==lastWheelRound) {
        // Nur einmal antippen; ein zweiter Stabilitäts-Warteversuch kann das bereits
        // verschwindende Rad verpassen und auf die nächste Karte warten.
        const hit=await page.locator('#rad').evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return el.contains(document.elementFromPoint(x,y))?{x,y}:null;});
        if(hit){lastWheelRound=snap.round;await page.mouse.click(hit.x,hit.y);}
      }
      await page.waitForTimeout(180);
    }
    assert(result.ended,'Zeitlimit: kein tatsächliches Spielende');
    assert(!result.final.dead,'Lebenslauf endete vorzeitig durch Tod');
    assert(result.final.done && result.final.tile>=143, 'Lebensabend nicht erreicht');
    assert(result.actions.length>5,'Zu wenige echte Karten');
    const end=await page.evaluate(() => ({scores:document.getElementById('scores').textContent,
      bio:document.getElementById('bio').textContent, stats:JSON.parse(localStorage.getItem('lp_stats')||'{}'),
      save:localStorage.getItem('lp_save_v4')}));
    assert(end.scores.trim() && end.bio.includes('Lebensabend'),'Auswertung/Biografie fehlt');
    assert.equal(end.stats.games,1,'Spielabschluss nicht genau einmal gezählt');
    result.checks.push('Ohne Teleport vom Start zum Lebensabend: Karten, Gabelungen, Alterung, Auswertung und Biografie');
    result.checks.push('Abschluss genau einmal in lokaler Statistik gespeichert');
    await page.screenshot({path:path.join(out,'lebensabend.png'),timeout:60000});
    await page.locator('#newBtn').click();
    await page.locator('#startBtn').click();
    assert.equal(await page.evaluate(() => __lp.state().players[0].tile),0);
    assert.equal(await page.locator('#rollBtn').isEnabled(),true);
    result.checks.push('Neues Leben startet wieder auf Feld 0 mit bedienbarem Würfel');
    assert.deepEqual(result.errors,[]);
  } catch(e) {
    result.failure=e.stack; process.exitCode=1;
    if(page) await page.screenshot({path:path.join(out,'fehler.png'),timeout:60000}).catch(()=>{});
  } finally {
    fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({ended:result.ended,checks:result.checks,turns:result.turns.length,cards:result.actions.length,failure:result.failure}));
    await browser.close();
  }
})();
