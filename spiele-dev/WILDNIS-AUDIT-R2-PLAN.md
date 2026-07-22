# 🌲 Wildnis Audit R2 — Plan (22 Batches, 98 bestätigt · Stand 2026-07-18)

Umgesetzt: Batches 1,2,3,4,5,7,15,17,20. OFFEN: 6 (Musik-Rework), 8 (killMonster), 9 (Boss/Slowmo), 10 (Balance), 11 (Krit), 12 (Perfekt-Dodge), 13 (Finisher), 14 (Waffen), 16 (KI), 18 (Atmosphäre), 19 (HUD/A11y), 21 (NPC-Beziehungen), 22 (Perf). Anker vor Anwendung grep-verifizieren!

---
Batch 1 — RNG-Hygiene: seeded rnd() raus aus allen Laufzeit-Pfaden
[risk:low]
touches: neon-wildnis.html: rewardKill, rollRarity, harvest-Melee, useBolt, updDodge, spawnMonster/spawnBoss (nur t:-Felder), updNPCs, openLoot, killAnimal, updAmbient, loadProps, Kommentar Z.396
rationale: Größter Dedupe-Cluster (#1,#7,#24,#43,#50,#58(5),#59,#64,#81,#90 → EINE Union). Regression-Fix, muss zuerst: jeder spätere Batch baut auf dem sauberen Seed-Strom auf. Konfliktlösung: #50(5) wollte auch pickMob Z.901/908/959/962 umstellen — VERWORFEN, Mehrheit + dokumentierte Invariante ‚GENAU 1 rnd' behalten diese seeded.

CHANGE 1:
rewardKill Z.3348: beide rnd()-Draws (rnd()<0.35, rnd()<0.4) → Math.random() [#1/#7/#50/#64]

CHANGE 2:
rollRarity Z.3336: `var r=rnd(),a=0` → `var r=Math.random(),a=0` (kein Welt-Gen-Caller, verifiziert) [#1/#7/#50/#64]

CHANGE 3:
harvest Melee-Stein-Drop Z.3555: `if(rnd()<0.4){inv.stone+=1` → Math.random() [#1/#7/#64]

CHANGE 4:
useBolt Zickzack Z.3310–3311: alle 3 `(rnd()-0.5)*1.2` in vx3/vy3/vz3 → Math.random() [#7/#64]

CHANGE 5:
updDodge Dash-Funken Z.3226: `if(rnd()<0.5)burst(...)` → Math.random() — NICHT mit spawnBoss-rnd Z.959/962 verwechseln [#7/#50/#64]

CHANGE 6:
Spawn-Anim-Phase: `t:rnd()*6` → `t:Math.random()*6` an GENAU 5 Stellen Z.921/934 (spawnMonster, davon 921 im async GLTF-Callback), Z.972 (Urdrache async), Z.982, Z.989. Z.901/908/959/962 seeded LASSEN [#24/#81/#90]

CHANGE 7:
updNPCs Emotes: Z.1755 (`n.emoT=n.fixedEmo?(3+rnd()*3):(5+rnd()*10)`) und Z.1763 (Emoji-Wahl + `rnd()<0.5` 🎁) → Math.random(); _w3rnd-Say-Zweig Z.1758–1761 unangetastet [#58/#59/#64]

CHANGE 8:
openLoot Z.2731–2741 inkl. Goldtruhen-Roll Z.2741 sowie killAnimal Z.2800 (Meat-Range) + Z.2805 (Tier-Drop rnd()<0.18) → Math.random() (Truhen-Inhalt ist client-lokal) [#50/#64]

CHANGE 9:
updAmbient: alle 20 rnd(-Vorkommen auf Z.1224/1230/1236/1238/1243/1248/1252/1264/1268 mechanisch → Math.random( (Anker Z.1224: `f.bx=player.position.x+(rnd()-0.5)*30`); buildAmbient selbst NICHT anfassen [#43(1)]

CHANGE 10:
loadProps Z.1383–1405: pro Spec eigener Strom `SPECS.forEach(function(S,si){var rndP=mulberry32(((SEED^0x51de5)+si*7919)>>>0||1);` und die 5 rnd()-Aufrufe im async Callback (Z.1394×2, 1396, 1397, 1401) → rndP() — akutester Desync-Vektor [#43(2)]

CHANGE 11:
Ergänzung gleiche Klasse: Perk-Pick Z.3188 und Feuerwerk/Funken Z.3728/3737/3743/4153 → Math.random() [#64]

CHANGE 12:
Guard-Kommentar Z.396 ehrlich umformulieren: ‚rnd = seeded, Strom-Position nach Spielstart nicht mehr peer-synchron — deterministische Welt-Gen NUR synchron vor Frame 1 ODER mit eigenem mulberry32-Strom (wie rnd2 Z.2065)' [#43(3)]. Danach node tools/game_smoke.cjs neon-wildnis.html
---
Batch 2 — State-, Save- & Cache-Regressionen
[risk:low]
touches: neon-wildnis.html: updMonsters ph2-Block, openLoot/nextBounty/saveGame/loadGame, updDayNight-Respawn/Kristall-Cache, startGame-Load-Zweig, togglePause, harvest-NPC-Zweig
rationale: Regression-Fixes vor Features. Dedupe: #0/#65/#79 = ein Fix; #2/#49/#54/#67 = ein Fix (Var-Name lootOpenedTotal); #56+#68 zusammengelegt, dabei #68(3) DAY-Purge VERWORFEN (kollidiert mit #56-Respawn → würde Doppel-Loot erzeugen).

CHANGE 1:
Enrage/Hit-Flash (#0+#65+#79): ph2-Traverse-Guard Z.1015 → `if(!n.material._enr&&!n.material._flC){n.material=n.material.clone();}n.material._enr=1;` (Emissive-Zeilen unverändert, verhindert Doppel-Klon); direkt NACH e.mesh.traverse(...) und VOR announce Z.1016: `e._fl=null;` — Flash-Cache wird beim nächsten Treffer mit Enrage-Rot als Restore-Basis neu aufgebaut

CHANGE 2:
Truhen-Bounty monoton (#2+#49+#54+#67): Z.1346 `,lootOpenedTotal=0`; Z.2727 nach lootOpened.push: `lootOpenedTotal++;`; Z.3046 Bounty-Pool `base:lootOpenedTotal,cur:function(){return lootOpenedTotal;}`; saveGame Z.3975 `lootT:lootOpenedTotal|0`; loadGame Z.4509 `lootOpenedTotal=(sv.lootT!=null?sv.lootT|0:lootOpened.length);` + else-Zweig Z.4515 `lootOpenedTotal=0;`. Respawn-Splice Z.3769 UNVERÄNDERT

CHANGE 3:
Kristall-Cache (#56+#68(1,2)): (a) Z.3776 Tages-Cleanup: mesh aus Szene + Eintrag aus loots[] UND id aus lootOpened spleißen; (b) Z.3768 Respawn-Guard `&&!lt2.bonus` (Day-/Boss-Truhen nie respawnen — wird von Batch 9 mitgenutzt); (c) Block Z.3775–3782 in `function spawnDayCache(quiet)` extrahieren (rC-Reihenfolge EXAKT beibehalten; im _co-Fall lid.rotation.x=-0.9 + marker.visible=false setzen); Tag-Flip ruft spawnDayCache(false); Load-Respawn NICHT bei Z.4509, sondern im loadNature-Callback nach placeLoot(): `if(day>1)spawnDayCache(true);`. #68(3)-Purge entfällt

CHANGE 4:
waveNum-Restore (#66): startGame-Load-Zweig nach Z.4504: `waveNum=nights|0; if(isNight){waveActive=true;waveToSpawn=6+waveNum*4;waveSpawned=0;updWaveHud&&updWaveHud();}`

CHANGE 5:
NPC-Geschenk-Persistenz (#58, Rest ohne die schon in Batch 1 erledigten Emote-rnds): saveGame `gd:npcs.map(n=>n.giftDay===day?1:0)`; startGame sv-Zweig `window._gdPend=sv.gd||null;` (npcs ist dort noch leer!); Restore in der loadCC0-Kette NACH decorateWorldLate();iblClamp(); per Index-Mapping; talkToNpc Gift-Zweig-Ende (Z.3521, vor return): saveGame();

CHANGE 6:
Pause-Regression (#19): togglePause Z.4295 charNav/charPrev/charPrevEmoji per classList.add('hide') (null-guarded, kein Re-Show nötig); Preview-rAF-Guard Z.4611 um `||paused` erweitern. NICHT style.display statt .hide

CHANGE 7:
NPC-Prompt-Priorität (#60): harvest Z.3535 Guard um `&&!nearBoard&&!nearStation` erweitern — Fall-through auf readBoard/openStation verifiziert, nearFire unverändert
---
Batch 3 — Touch- & Input-Robustheit
[risk:low]
touches: neon-wildnis.html: harvest()-Kopf, bAct-IIFE fire(), restAtFire, CSS Z.29/30/70/112–133, Joystick-Block Z.3839–3852
rationale: #4+#30 überlappen (bAct-fire/harvest-Guards + restAtFire) → EINE koordinierte Änderung. #8(3)-Interval-Umbau kommt erst in Batch 13 (hängt am Finisher-State), baut auf diesem fire()-Guard auf.

CHANGE 1:
Hold-to-Attack-Guards (#4+#30 merged): (a) harvest()-Kopf Z.3530, erste Zeile: `if(dead||!running||paused||perkChoosing||stationOpen)return;` — deckt alle 4 Call-Sites inkl. Tasten E/Space ab; buildMode NICHT aufnehmen; (b) fire() in der bAct-IIFE Z.3889 → `function fire(){if(dead||!running||paused)return;findNear();if(!nearMon&&!nearAni&&(nearMerchant||nearLoot||nearBoard||nearStation||nearWork||nearNpc||nearFire))return;harvest();}`; (c) restAtFire: nach `if(dead)return;` → `if(perfNow-(window._restT||0)<2500)return;window._restT=perfNow;`; Koop-Kristall-Grant Z.3487 zusätzlich `&&perfNow-(window._restCoopT||0)>30000` + Setzen im Then-Zweig (Heilung/Save bleiben je Rast)

CHANGE 2:
touch-action CSS (#31): Z.30 canvas + neue Regel `#stick,.btn,#zoomBtns{touch-action:none}` nach Z.70 + `overscroll-behavior:none` in html,body. KEIN preventDefault im globalen touchmove, KEIN touch-action auf html/body/#hud (Menü-Scroll)

CHANGE 3:
Unsichtbare Hitboxen (#33): nach .btn-Regel Z.70: `.btn::after{content:"";position:absolute;inset:-6px;border-radius:50%}` — -6px, NICHT -8px (bAct/bConfirm-Kollision im Build-Modus)

CHANGE 4:
StartBtn sticky (#16): nach .big-Regel Z.122 `#startBtn{position:sticky;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:6;box-shadow:0 8px 30px rgba(100,240,200,.5)}`; optional Media-Query max-height:700px mit width:122px UND height:150px (Canvas 300×368!)

CHANGE 5:
Floating-Joystick (#32): neuer touchstart-Listener direkt NACH Z.3852 (vor Kamera/Pinch-Registrierung), linke 40%-Zone, Ausschlussliste inkl. #ov/#emoteBar/#invBar/#sysRow, paused-Guard, stickId=t.identifier direkt + stickMove(e) (NICHT stickStart); stickEnd um Inline-Style-Reset erweitern
---
Batch 4 — Koop-Netcode-Robustheit
[risk:low]
touches: neon-wildnis.html Z.4327–4471 (netStart/netStartQuick/onStatus/netHideRemote/visibilitychange); js/mp.js wireMain
rationale: #69/#70/#72/#73 treffen alle dieselben onStatus-Handler → als EINE koordinierte Änderung zusammengeführt (Einzeln angewandt würden die Anker gegenseitig driften). #71 ist js/mp.js, konfliktfrei.

CHANGE 1:
EIN koordinierter Umbau beider onStatus-Handler (#69+#70+#72+#73): (1) Helfer vor netStart: `var _hbIv=null;function hbStart(){if(_hbIv)clearInterval(_hbIv);_hbIv=setInterval(function(){try{if(NET.s&&NET.s.status==="connected")NET.s.send({t:"hb"});}catch(e){}},2000);}function hbStop(){...}` (clear-before-set Pflicht); (2) `function netResetRemote(){NET.remoteDowned=false;NET.lastRemoteMelee=0;NET.rt.hp=null;NET.rt.tLast=0;NET.rt.vx=NET.rt.vz=0;NET.remoteHpPct=-1;if(NET.remoteHpCv)drawRemoteHp(100);}` nach netHideRemote; (3) BEIDE connected-Zweige (Z.4336/4458, bei quick NACH NET.role=NET.s.role||NET.role): `NET._rseq=0;NET.rt.tLast=0;NET.rt.vx=NET.rt.vz=0;NET.remoteDowned=false;` + Host-Seed-Resend `if(NET.role==="host"&&running&&NET_FORCE_SEED!=null)try{NET.s.send({t:"start",seed:NET_FORCE_SEED});}catch(e){}` + sendMyChar() + hbStart(); (4) BEIDE closed-Zweige: netHideRemote();netResetRemote();hbStop(); lost-Zweig NICHT anfassen (remoteDowned muss Reconnect überleben); (5) Funktionsköpfe netStart/netStartQuick: `if(NET.s&&NET.s.status==="connected"){coopStatusMsg("Schon verbunden.");return;} try{if(NET.s)NET.s.close();}catch(e){} NET.s=null;` (deckt ?coop=-Auto-Join ab); (6) netStart/netStartQuick-Init zusätzlich netResetRemote(); (7) visibilitychange Z.4107 um else-Zweig erweitern: bei sichtbar `NET.rt.tLast=0;NET.rt.vx=0;NET.rt.vz=0;NET.sendT=0;`

CHANGE 2:
js/mp.js (#71): wireMain c.on("open")-Handler: nach `ever = true; clearTimeout(tmo);` → `retried = false;` (stellt 1-Versuch-Reconnect-Budget je Abriss wieder her)
---
Batch 5 — Audio-Basis (Unlock + SFX-Varianz)
[risk:low]
touches: neon-wildnis.html: sfx() Z.3990, startGame Z.4534, neuer visibilitychange-Listener Z.3988, hitSfx/killSfx Z.3453–3454
rationale: Kritischster Audio-Fix (#44 Totalstille-Risiko Mobile) vor dem Musik-Rework; disjunkte Funktionen.

CHANGE 1:
AudioContext-Unlock (#44): (1) in sfx() nach _AC-Erzeugung `if(_AC.state!=="running"){try{_AC.resume();}catch(e){}}`; (2) in startGame vor `running=true` Context erzeugen+resumen (try/catch); (3) einmaliger visibilitychange-Listener unter Z.3988 (resumt bei Tab-Rückkehr; kollidiert nicht mit saveOnLeave Z.4107)

CHANGE 2:
Kill-/Hit-Varianz (#47): hitSfx mit p=0.95+Math.random()*0.1 auf Basis- UND Slide-Frequenz; killSfx mit `var p=boss?1:(0.93+Math.random()*0.14)` — Boss exakt unverändert, Ternary-Präzedenz beachten (190*p als else-Zweig)
---
Batch 6 — Musik-Engine-Rework (ein kohärenter updMusic-Umbau)
[risk:med]
touches: neon-wildnis.html Z.4022–4051 (updMusic, _musGains, _musV), Deklarationen Z.4024
rationale: #3, #29, #45, #46 treffen alle updMusic und widersprechen sich in Einzelanwendung (Mute-Zweig, Boss-Scan, Envelope-Zeiten) → EINE Änderung in definierter Reihenfolge. #3 geht in #29(5) auf.

CHANGE 1:
Schritt 1 (#29): persistente Voices _musV={p:square,k:triangle} lazy NACH dem Early-Return anlegen (nie bei Seitenladung); Puls und Pluck über cancelScheduledValues/setValueAtTime/Ramps auf den persistenten Gains — null Allokation pro Beat; neue Vars `_musBossT=0,_musBoss=false,_musV=null`

CHANGE 2:
Schritt 2 (#45): `danger`-Erkennung direkt nach Early-Return (waveActive||Boss-Scan mit 0.3s-Throttle aus #29(4) — Boss-Scan NICHT in den Puls-Zweig, Zirkularität); prog=(isNight||danger)?_MUS_NIGHT:_MUS_DAY; Pad-Ducking 0.018→0.010 bei danger; Pluck-Zweig: bei danger nur Timer=0.6 setzen (klemmt nicht)

CHANGE 3:
Schritt 3 (#46): Chord-Ramp-down 6.5→7.9, o.stop 6.8→8.1, Cleanup 7000→8300 (Crossfade mit 1.6s-Attack des Folgeakkords); dritte Stimme Sub-Root chd[0]/2 sine, Peak 0.012, gleicher Envelope, Gain in _musGains

CHANGE 4:
Schritt 4 (#29(5)+#3): Pads statt setTimeout via Zeitstempel `_musGains.push({g:ga,t:_AC.currentTime+8.3})` + Pruning am updMusic-Anfang; Mute-Zweig: pro Pad-Gain UND beiden _musV-Voices `cancelScheduledValues(now);setValueAtTime(current,now);linearRampToValueAtTime(0.0001,now+0.1)` — der cancel+anchor-Teil ist der #3-Fix. Kein rnd()/rnd2(). Danach Smoke-Test
---
Batch 7 — Boss-Spawn-Robustheit + Label-Vorleistung
[risk:low]
touches: neon-wildnis.html Z.938–991 (spawnBoss/spawnGlbBoss), Boss-Pushes Z.945/972/982/989
rationale: #80 (Seraph-Fallback) plus die lbl-Felder, die #82/#83 (Batch 9) voraussetzen. t:-rnd-Fixes sind bereits aus Batch 1 drin.

CHANGE 1:
spawnSeraph(x,z,bhp) vor spawnBoss extrahieren (#80): Inhalt = bisherige Z.986–991, aber t:Math.random()*6 (per Batch 1); spawnBoss Z.986–991 durch Aufruf ersetzen; beide leere Error-Callbacks ersetzen: Z.949 → spawnSeraph(x,z,bhp), Z.975 → spawnSeraph(xx,zz,hh2)

CHANGE 2:
Namens-Moment synchron (#80(4)): bossLbl+announce in spawnGlbBoss VOR den GLTF-Load ziehen; Drache2-Branch analog (🐲 URDRACHE bekommt damit erstmals ein announce), Z.974 löschen

CHANGE 3:
lbl-Felder an ALLEN Boss-Pushes (#82/#83-Voraussetzung): Z.945 `,lbl:label`; Z.972 `,lbl:"🐲 URDRACHE"`; Z.982 `,lbl:"🐉 DRACHE"`; Z.989 (in spawnSeraph) `,lbl:"⚠️ SERAPH"`
---
Batch 8 — killMonster-Refactor + Boss-Sterbe-Sequenz
[risk:med]
touches: neon-wildnis.html: 6 Kill-Sites Z.3240/3265/3318/3553/3741/3747 → killMonster(), neue updDying() + frame()-Registrierung Z.4264
rationale: #87 (Batch-12-Refactor) VOR den Boss-/Cleave-Features, damit #82/#9/#25 nur noch eine Kill-Site anfassen müssen.

CHANGE 1:
killMonster(e) nach bossReward einfügen (#87A): indexOf-Guard, splice, clearWarn, rewardKill, killSfx, Boss-Zweig (__bossKills, bossReward), updWaveHud; 6 Sites ersetzen, site-spezifische Extras (Melee-hitStop/Burst/Stein-Drop) am Call-Site belassen; Tag-Wechsel-Despawn Z.3773 NICHT umstellen. Gewollte Verhaltensänderung im Commit benennen: Falle/Turm geben neu Boss-Reward

CHANGE 2:
Boss-Zweig (#87B): vor dying-Push Hit-Flash-Restore aus e._fl (sonst 1.4s weiße Leiche); dying.push({mesh,t:0,bs:baseScale,x,z,bT:0})

CHANGE 3:
updDying(dt) (#87C): rotation.y+=dt*3, y-=dt*0.9, Skala ABSOLUT `bs*(1-0.5*min(1,t/1.4))`, Burst-Ticks alle 0.2s (Math.random=Kosmetik ok), nach 1.4s scene.remove+splice. KEIN geometry/material.dispose (geteilte Protos!)

CHANGE 4:
updDying in frame()-Updater-Kette Z.4264 registrieren (#87D); Smoke-Test — __nw.mobInfo mappt weiter nur monsters[]
---
Batch 9 — Boss-Erlebnis, Slowmo-Infrastruktur & Nacht-Schadens-Skalierung
[risk:med]
touches: neon-wildnis.html: Z.3907 (Var), frame() Z.4236–4264, bossReward + killMonster, rewardKill-Cap, updMonsters Z.1021/1054/1071, updBossBar
rationale: Konflikt-Hotspot bossReward: #52+#82+#84+#96(2,3)+#83-Send zu EINER ‚bossReward 2.0' verschmolzen (mh-Cap-Konflikt 120 vs 90 → 90 aus #96; XP-Formel maxhp-basiert aus #82, da maxhp bereits mit Nächten skaliert). Slowmo-Infra wird hier EINMAL gebaut (#84) und von Batch 11/12 wiederverwendet — verhindert den Dreifach-Konflikt #5/#6/#84 in frame(). #94+#96(1) als eine Schadens-Skalierungs-Änderung.

CHANGE 1:
Slowmo-Infra (#84, Basis für #5/#6): Z.3907 `,slowT=0`; frame() NACH hitStop-Block: `var rawDt=dt;if(slowT>0){slowT-=rawDt;dt*=0.35;}` (mit rawDt dekrementieren!); NUR den mittleren `netTick(dt)` Z.4264 → `netTick(rawDt)` (Early-Return-netTicks Z.4239–4241 unangetastet)

CHANGE 2:
bossReward 2.0 (merged #82+#52+#96(2,3)+#84+#83-Send): Signatur bossReward(e), Aufruf nur noch aus killMonster (Batch 8); announce mit e.lbl; gainXP(Math.min(220,40+Math.round((e.maxhp||30)*0.8))); dropLoot ×3 + bei nights>=6 vierter Legendär-Drop + inv.crystal+=2; Boss-Truhe mkChest mit id "BOSS"+nights+"-"+__bossKills, bonus:true (Respawn-Guard aus Batch 2 greift), rotation Math.random; goldFlash (EIGENE DOM-id, nicht bossFlash), Fanfare sfxSeq C5–G6, heroAct("victory",1.2) (synct automatisch), slowT=1.1, hitStop=max(hitStop,0.22); NET-Send `{t:"bosskill",lbl:e.lbl||"",from:NET.role}` in try/catch (Empfänger in Batch 15)

CHANGE 3:
rewardKill-Cap (#96(2), Konfliktlösung ggü. #52s 120): `var mh=Math.min(e&&e.boss?90:30,(e&&e.maxhp)||8);` — wirkt an allen killMonster-Aufrufen inkl. Falle/Turm

CHANGE 4:
Nacht-Schaden (#94+#96(1) merged): Z.1021 Slam → `damagePlayer((e.slamNova?14:18)+Math.min(10,nights),e)` (realer Code ist 14:18, nicht 18:22!); Z.1054 Caster → `damagePlayer(6+Math.min(9,Math.floor(nights*0.6)),e)`; Z.1071 → `damagePlayer(e.boss?(e.dmg||14):Math.round((e.dmg||6)*(1+Math.min(1.5,nights*0.09))),e)` — Boss-Ternary Pflicht (Boss hat kein e.dmg); Kommentar anpassen. dodgeT-Vorabguards hier NOCH NICHT anfassen (Batch 12)

CHANGE 5:
updBossBar-Rework (#83(3), ersetzt #28(3)): Boss mit min hp/maxhp wählen; width nur bei __lastW-Änderung schreiben; bossLbl.textContent aus boss.lbl bei Änderung (fixt Async-Label-Timing)
---
Batch 10 — Balance & Ökonomie
[risk:med]
touches: neon-wildnis.html: damagePlayer Z.3229 (Armor-Zeile), TRADES/renderTrade Z.3640–3660, spawnMonster Z.905–937, nextBounty Z.3043–3051, updQuest Z.4117, saveGame/loadGame
rationale: #51 und #97 editieren dieselben Spawn-hp-Zeilen Z.921/934 → zu EINER Formel verschmolzen: hp=round(M.hp*mobHpF()*(elite?2.2:1)). Anker-Warnung aus #97 übernommen: reale Formel ist (1+Math.min(1.0,nights*0.08)) — #51 zitiert eine nicht existierende 1.6/0.12-Variante.

CHANGE 1:
Armor-Floor (#95): Armor-Zeile in damagePlayer → `var _df=(ARMOR_DEF[equip.armor]||0)+PERK.def;d=Math.max(Math.ceil(d*0.25),d-_df);` — NICHT das Original-Snippet mit `def` (ReferenceError)

CHANGE 2:
Händler-Staffelpreise + mobHpF + Eliten (merged #51+#97): tradeBuys{atk,def}, tGive(), cost/desc als Funktionen (8+3*n 💎), canTrade/Kauf-Handler auf tGive, Save `tb:{a,d}` + Restore + Fresh-Reset; `function mobHpF(){return 1+Math.min(1.6,nights*0.12)+Math.max(0,(nights-14)*0.03);}`; in BEIDEN monsters.push Z.921/934: hp UND maxhp = `Math.round(M.hp*mobHpF()*(elite?2.2:1))` (den real vorhandenen (1+Math.min(1.0,nights*0.08))-Faktor ersetzen); elite deterministisch `(!forceId&&nights>=6&&((waveSpawned+nights)%5===0))` (0 rnd-Verbrauch), dmg-Guard für ghost (kein dmg-Feld → NaN), baseScale×1.25, Emissive-Tönung 0xff8a2a per Material-Klon MIT _flC=1 (Hit-Flash-kompatibel); Dmg-Cap Z.1071 bereits in Batch 9 gelöst

CHANGE 3:
Bounty-Leiter (#53): Monster-Bounty +min(30,bountyN*2), Holz +min(40,bountyN*3), Truhen/Welle/Arena unverändert; rw=5+min(30,bountyN*2); Meilenstein NACH bountyN++ (`bountyN%5===0` → dropLoot force=3 + announce); questText an beiden Sites mit `"🔁 #"+(bountyN+1)+" "` Prefix (Batch 19 führt den Prefix im Live-Text fort)
---
Batch 11 — Krit-System + Kill-Streak
[risk:med]
touches: neon-wildnis.html: neuer critRoll-Helper ~Z.3450, floatText (6. Param), dmgHit, harvest-Melee, useSkill/useBolt/updThrow, CSS Z.102, rewardKill-Kopf
rationale: #6 nutzt die Slowmo-Infra aus Batch 9 (KEINE zweite slowT/rawDt-Deklaration). #9(4)-Standalone-Krit entfällt dadurch. #86 (rewardKill-Kopf) ist disjunkt zu #6.

CHANGE 1:
Krit (#6, angepasst): critRoll() mit Math.random (Koop-Regel); floatText um optionalen `cls`-Param (`el.className="floatN"+(cls?" "+cls:"")`) + CSS `.floatN.crit{font-size:1.9rem}` (Farbe inline via style.color); dmgHit(e,dmg,crit) mit KRIT-Prefix/#ffa62e/hitPop 0.22/hitFlash 0.18; Melee: `var _cr=critRoll();if(_cr)_md=Math.round(_md*2);` nach Team-Combo-Block, dmgHit/knockback/hitStop/shake crit-abhängig; Kill-Zweig (jetzt killMonster-Aufruf, Batch 8): `if(_cr&&(nearMon.boss||nearMon.maxhp>=12)){slowT=0.4;hitStop=0;}else hitStop=Math.max(hitStop,0.08);` — slowT aus Batch 9 wiederverwenden, frame()/netTick NICHT erneut anfassen; useSkill/useBolt: _cr vor der Schleife, dmgHit(e,dmg,_cr); updThrow: crit bei Projektil-Erstellung rollen. KEIN Slowmo bei Skill/Bolt/Projektil-Kills

CHANGE 2:
Kill-Streak (#86): am rewardKill-Anfang; Schwellen 2/3/5/8, floatText mit Y-Staffelung +ks*0.14 (AoE-Frame-Kills!), sfx-Pitch steigend, ab 5 hitStop=Math.max(...)/shake=Math.min(...) als VARIABLEN-Zuweisung (keine Funktionen), gainXP(ks). Rein lokal, koop-sicher
---
Batch 12 — Perfekt-Dodge (Slowmo + Konter)
[risk:med]
touches: neon-wildnis.html: updMonsters Z.1021/1054 (Guard-Strip), doDodge Z.3204, damagePlayer Z.3229, harvest-Melee
rationale: Nach Batch 9, weil dieselben Zeilen 1021/1054 dort skaliert wurden (Anker neu suchen: Schadensterme sind jetzt nights-skaliert) und slowT existiert. Nach Batch 11, weil der Riposte-Block hinter dem Krit-Block im Melee-Zweig ankert.

CHANGE 1:
Guards strippen (#5(1)): an den (in Batch 9 umgebauten) Schadens-Calls Z.1021 (Slam) und Z.1054 (Caster) das Vorab-`&&dodgeT<=0` STREICHEN — sonst feuert Perfekt-Dodge bei Boss/Caster NIE; damagePlayer prüft selbst. Z.1071 unverändert

CHANGE 2:
doDodge (#5(2)): nach `dodgeT=0.26;dodgeCd=1.4;` → `window._pdOK=1;`

CHANGE 3:
damagePlayer (#5(3)): `if(dodgeT>0)return;` → Branch mit _pdOK-Konsum: dodgeCd=0, _riposteT=perfNow, slowT=0.35 (Batch-9-Infra), floatText "PERFEKT!", burst, sfx. Bekannter Nebeneffekt (i-Frames dehnen sich ~3x während Slowmo) im Code-Kommentar dokumentieren

CHANGE 4:
Riposte (#5(4)): im Melee-Zweig direkt VOR der Schadensanwendung (nach Krit-Block aus Batch 11): 1.5s-Fenster via perfNow (echtzeitkonstant), _md*=2, "KONTER! ×2", hitStop=max(...,0.06)
---
Batch 13 — Combo-Finisher (3. Schlag)
[risk:low]
touches: neon-wildnis.html: heroAct Z.726–739, harvest-Melee, bAct-IIFE (setInterval→setTimeout-Kette)
rationale: #8 baut auf Batch-3-fire()-Guard auf (Guard beibehalten!) und ankert hinter Krit/Riposte im Melee-Zweig.

CHANGE 1:
heroAct (#8(1)): Fallback-Zweig `if(!pick){pick="attack";stufe=_combo%chain.length;_combo=(stufe+1)%chain.length;}` (sonst feuert der Finisher bei den 7 Anime-Helden NIE); am Ende `return stufe;` (Rückgabewert an allen 11 Sites ungenutzt, verifiziert)

CHANGE 2:
harvest-Melee (#8(2)): `var _st=heroAct("melee",2.2)||0;window._lastMeleeStufe=_st;`; bei _st===2: _md×1.6, hitStop 0.08, tiefer Sawtooth-sfx, "FINISHER!"-floatText, knockback 13, burst 16

CHANGE 3:
bAct-IIFE (#8(3)): setInterval → setTimeout-Kette mit Pause 380ms nach Finisher / 240ms sonst; fire() setzt _lastMeleeStufe=0 als ERSTES (stale-Pause-Schutz) und behält den Batch-3-Guard (dead/running/paused + nearMon-Logik); _hstop: clearTimeout
---
Batch 14 — Waffen-Identität (Range/Knockback/Cleave)
[risk:med]
touches: neon-wildnis.html: WEAP_ATK-Block Z.3004–3007, findNear (Monster-Range bm), harvest-Melee-Knockback, Cleave-Block nach Kill
rationale: #9 mit den 4 Korrekturen des Findings; Cleave nutzt jetzt killMonster aus Batch 8 statt des Inline-Kill-Musters (Finding sieht das explizit vor); Krit-Teil (#9(4)) entfällt (Batch 11).

CHANGE 1:
WEAP_FEEL-Tabelle + weaponFeel() nach WEAP_ATK (#9(1)): r/cleave/kb je Waffe, critB GESTRICHEN; in findNear: `var _wr=3.0+weaponFeel().r;var bm=_wr*_wr;` — Anker ist `var bm=3.0*3.0`, NICHT best=3.6*3.6; r nie über 0.9

CHANGE 2:
Knockback (#9(2)): NUR die Spieler-Melee-Stelle auf weaponFeel().kb; Schockwelle (11) und Projektil (7) unangetastet

CHANGE 3:
Cleave (#9(3), adaptiert an Batch 8): nach dem nearMon-Kill-Block Ziele ERST sammeln (max cleave, Radius 3.2, nearMon ausschließen), DANN pro Ziel _md*0.6, dmgHit, knockback×0.7, burst (Waffe-3-Farbe 0xc98bff), bei hp<=0 `killMonster(_e2)` statt Inline-Muster; Haupttreffer-Burst-Farbe ternary equip.weapon===3

CHANGE 4:
Mobile-Budget: max 2 Extra-Ziele, keine neuen Meshes; mp.js synct keine Monster (verifiziert) — kein Koop-Risiko
---
Batch 15 — Koop-Wow-Events (bond/bosskill/combo/rest/milestones)
[risk:low]
touches: neon-wildnis.html: bondGain-Helper Z.~3347, 3 Bond-Call-Sites, restAtFire, gainXP, updLoot, onNetMsg (5 neue Handler)
rationale: Dedupe: #12 und #88 = EIN combo-Event (#88s Throttle+Guards, #12s Position); #10 und #83 = EIN bosskill-Empfänger (Send steckt seit Batch 9 in bossReward; #10s Partner-dropLoot verworfen — Gratis-Loot-Spam). #11 (bondGain) zuerst, damit #13/#85 ihn nutzen können (löst den Widerspruch in #13 auf). Alle Handler additiv nach Z.4360, unbekanntes t degradiert sanft.

CHANGE 1:
bondGain (#11): Helper nach _bondLv; 3 Call-Sites (revive/rest/combo) umstellen; onNetMsg bond-Handler mit PFLICHT-Clamp 0..5 (nw_bond ist persistent!) + revive-Toast

CHANGE 2:
bosskill-Empfänger (#10+#83 merged): `if(d.t==="bosskill"&&d.from!==NET.role&&running){announce("🏆 Partner hat "+(d.lbl||"den Boss")+" besiegt!","#7dffc8");bondGain-lokal +2 (OHNE Re-Send: direkt _bondPts+bondUpd, sonst Ping-Pong);heroActRemote("victory");showEmoteOver(NET.remote,"🏆");burst nur mit NET.remote&&NET.remote.visible-Guard;sfx-Fanfare;}`

CHANGE 3:
Team-Combo (#12+#88 merged): Send im harvest-Combo-Block VOR der schließenden Klammer `{t:"tcombo",x:+nearMon.x.toFixed(1),z:...}`; Empfänger mit Zahlen-Guard, Rx-Throttle 1.5s via performance.now() (NICHT perfNow), groundH einmal gecacht, floatText+burst+2-Ton-sfx, +1 Bond lokal

CHANGE 4:
Rast-Ritual (#13, adaptiert): nearP-Variable in restAtFire (Batch-3-Throttles bleiben!), rest-Event vor saveGame; Empfänger: 🧘-Emote, 25s-Cooldown NET._restGiftT, bei near beidseitig +1 💎 und +2 Bond (jetzt via lokalem Add, kein Re-Send), sonst Einladungs-Toast

CHANGE 5:
Meilenstein-Pings (#14): gainXP ups>0-Block sendet {t:"ms",k:"lvl",v:level}; updLoot bei ri>=3 {t:"ms",k:"leg"}; Empfänger mit toast/⭐-Emote bzw. burst NUR mit NET.remote.visible-Guard (TypeError-Falle)
---
Batch 16 — Monster-KI (Zielwahl → Kiting → Charge → Tokens/Separation)
[risk:med]
touches: neon-wildnis.html updMonsters: Z.1007 (Zielwahl), Z.1042–1048/1066/1090 (Charge), Z.1064 (Caster), Pre-Loop + Melee-Start-Zweig (Tokens/Separation), knockback()
rationale: Alle vier in updMonsters, aber disjunkte Zeilenbereiche; als geordnete Sequenz in EINEM Batch mit fester Apply-Reihenfolge, weil #23 die dx/dz-Basis umbaut, auf der #20/#21/#22 aufsetzen (Namen bleiben erhalten → Anker gelten). Zeilennummern nach Batch 9/12 verschoben — per Code-Snippet ankern.

CHANGE 1:
1. Koop-Zielwahl (#23): 0.5s-Retarget-Timer + 0.8-Hysterese, Doppel-Guard im _tp-Ausdruck (Disconnect-Fallback), tx/tz/dx/dz-Basis; slamX/cstX auf tx/tz; ALLE Schadens-Checks unverändert (rechnen weiter gegen player.position)

CHANGE 2:
2. Caster-Kiting (#22): Z.1064 → Hysterese 4.5/8.5 + Strafe über die PERPENDIKULARE (-dz/d,+dx/d), Richtung alle 2–4s per Math.random; e.strD/strT unbenutzt (verifiziert)

CHANGE 3:
3. Charge-Feinschliff (#21): lgx/lgz-Aim-Lock beim Windup, lungeHit-Trefferchance im kb-Flug (Flag IMMER am Flugende löschen — geteilte kb-Felder!), Duck-Tell im rotation.x-Ternary (NICHT im charge-Block — würde im selben Frame überschrieben), knockback()-Härtung e.lungeHit=false

CHANGE 4:
4. Separation + Attack-Tokens (#20): Pre-Pass mit sdt=Math.min(dt,0.05) (⚠️ __nw.simMon füttert dt bis 10 → sonst 22-Unit-Teleports), Boss/kbT>0 ausnehmen; tok-Zählung (windT/lungeT/cstT), tokMax=3+(nights/3|0), im Melee-Start-Zweig in-loop tok++ (sonst starten alle Wartenden im selben Frame), Orbit-Ausweichen für Token-lose Mobs. Nur Math.random. Danach Smoke-Test (simMon nutzt updMonsters direkt)
---
Batch 17 — Tag/Nacht-Momente (Dawn-Feier, Rekord, Uhr)
[risk:low]
touches: neon-wildnis.html updDayNight: Tag-Flip-Zweig Z.3760–3771, Clock-Labels Z.3787–3793, updWaveHud, startGame-Load
rationale: Dedupe: #48 und #85 bauen beide eine Dawn-Fanfare → EIN Dawn-Moment (#85-Gerüst + #48s ambChirps und 350ms-Offset, doppelte sfxSeq gestrichen). #35+#38(1) editieren dieselben Clock-Zeilen → EINE Änderung.

CHANGE 1:
Dawn-Feier (#85+#48 merged): nach dem ☀️-announce: heroAct("victory",1.0) (synct automatisch); EINE Fanfare sfxSeq C5–C6 mit 350ms-Offset (Level-Up-Jingle-Kollision); setTimeout(ambChirp,600/950); dawnFlash mit EIGENER DOM-id (bossFlash ist rot!); burst NUR 16 Partikel (pPool=40); Koop-Bond +2 mit visible/!downed/<10-Guards + "🤝 Gemeinsam überlebt!"

CHANGE 2:
Rekord einmalig (#57): _runRecDay-Snapshot in startGame (loadBest), Infinity-Flag, `rec`-Feld im Save (synchron VOR dem setTimeout setzen, damit saveGame im selben Tick persistiert), Feier nur bei day>_runRecDay>0, +3 💎

CHANGE 3:
Morgen-Geschenk-Ansage (#63(1)): 5200ms-Delay (NICHT 3200 — Kristall-Cache-Kompass-announce bei 2800ms sichtbar bis ~5000ms), npcs-Guard

CHANGE 4:
Uhr + Zähler (#35+#38 merged): Nacht-Label ohne "(N👾)"; Tag-Zweig: lbl2 mit "🌙 in Ns"-Countdown ab f>0.7, Rot ab f>0.9, UND im Nacht-Zweig style.color explizit zurücksetzen (sonst bleibt die Uhr die ganze Nacht rot); updWaveHud: hasBoss in der BESTEHENDEN Schleife, Suffix " +👑", __last-Guard deckt es ab
---
Batch 18 — Welt-Atmosphäre (Nebel, Sonne, Wolken, Biome)
[risk:med]
touches: neon-wildnis.html: updDayNight (nach Z.3803/3804, sun Z.3816), buildAmbient/updAmbient (cloudM), buildGround/biomeAt/buildAmbient-Callbacks, Schatten-normalBias Z.353
rationale: #40/#41/#42 disjunkte updDayNight-Subregionen, geordnet; #39 zuletzt (größter Eingriff, Seed-Strom-Garantie zwingend). #40-Wrap nutzt Math.random statt rnd (Anschluss an Batch-1-Umstellung von updAmbient — der ‚Seed-Verbrauch identisch'-Hinweis im Finding ist damit obsolet).

CHANGE 1:
Atmender Nebel (#41): direkt NACH `scene.fog.color.copy(scene.background)` (Anker Z.3804, nicht 3803): fogN/fogF-Lerp mit fk=min(1,dt*1.5); kein anderer Konsument (verifiziert)

CHANGE 2:
Goldene Stunde (#42): sun.position mit isNight?85-Guard (sonst Mondlicht-Regression auf 38.9!), sunO=32+warm*55, Z-Faktor 0.875 (mittags exakt wie heute), normalBias 0.03→0.04; Verifikation via __nw.time(0.92) — NICHT __nw.night(false) (doppelter night-Key Z.4713/4719, der spätere gewinnt!)

CHANGE 3:
Wolken (#40): cloudM + Dusk/Night-Farben modulweit hoisten (Z.1101); Drift mit Wind (wdx/wdz in Scope); Wrap-Reposition um den Spieler (rnd→Math.random per Batch 1); in updDayNight NACH dem SKY_DUSK-Lerp: cloudM-Guard (buildAmbient läuft async!) + setHex→lerp(DUSK,warm)→lerp(NIGHT,ambNight) + opacity

CHANGE 4:
Biome-Deko (#39): biomeAt/biome2At/biomeColor pure extrahieren (Boden bitidentisch); Scatter-Filter mit STROM-GARANTIE: alle rnd()-Draws unverändert ziehen, bei Biom-Reject Slot TROTZDEM konsumieren und bei (0,-999) parken, Index-Inkrement nie überspringen (sonst verschieben sich placeLoot/Dörfer in Alt-Saves); grassIM auf weißes DoubleSide-Lambert + setColorAt-Biomtint (kein rnd-Verbrauch); Koop-Determinismus-Check: gleicher SEED → identische Instanz-Matrizen
---
Batch 19 — HUD, Minimap & A11y
[risk:low]
touches: neon-wildnis.html: updQuest Bounty-Zweig, updMinimap, updNexusProgress, openStation/onStationDone/updPrompt, Warnring-Puls, CSS Z.44/102, lowVig/Shake
rationale: Dedupe: #34+#77 = EIN Bounty-Live-Text (#77s tick-Flag-Variante + Reward-Anzeige, führt den ‚#N'-Prefix aus Batch 10 fort). #37+#76+#63(2) als EINE Minimap-Änderung (drei Subregionen derselben Funktion).

CHANGE 1:
Bounty-Live-Text (#34+#77 merged): tick-Flag capturen (`var tick=_nxT<=0` VOR dem Reset); dritter else-if-Zweig NACH dem Erfüllt-Check (else-if-Kette nicht brechen!): "🔁 #N t · cur/goal → +rw 💎" mit qe._t-Guard; goal>1-Bedingung gegen "0/1" beim Welle-Bounty

CHANGE 2:
Minimap-Politur als EINE Änderung: (a) #37 Ressourcen-Loop: Kristall/Busch 4px mit weißem Stroke (Pflicht — Ruinen-Marker sind ebenfalls #7de3ff!), ctx.lineWidth=1 explizit, d2 einmal rechnen, Baum/Fels nur <45u; (b) #76 Loot = goldener KREIS mit dunkler Outline (NICHT nicht-rotiertes Quadrat — kollidiert mit Dorf-Markern), Raute bleibt exklusiv Gegnern; (c) #63(2) 🎁 am 🏠-questBoard-Marker (rand-geklammert, immer sichtbar — villages[0] wäre außerhalb des Clip-Kreises), Offset +5/-5

CHANGE 3:
Minimap-Reposition (#36): updNexusProgress-Early-Return in else-Block umbauen, Reposition IMMER am Ende (0.3s-Throttle via updQuest); Guard über r.bottom>0 (hide liegt auf #hud, nie auf #quest); mm._qTop-Cache; #zoomBtns ZWINGEND mitverschieben

CHANGE 4:
Stations-Best (#55): _stBests-Cache einmalig nach stationsDone (try/catch), openStation-URL +"&best=", onStationDone nutzt DENSELBEN Cache (keine Divergenz), updPrompt "· 🏆 Best N"

CHANGE 5:
Warnring farbenblind (#75): _WHITE-Singleton; Slam-Puls setHex(slamNova?0xc98bff:0xff2d3a).lerp(_WHITE,puls*0.75); Caster analog 0x9a7dff; Material-Erzeugung unverändert (je Ring eigenes Material, verifiziert)

CHANGE 6:
HP-Zahl (#74): font-Shorthand in Einzelproperties auflösen (font:...inherit ist INVALID und wird komplett verworfen — nur 11→12px ändern würde nichts bewirken) + text-stroke/paint-order + 4-Wege-Shadow

CHANGE 7:
prefers-reduced-motion (#78): REDUCED-Flag im IS_MOB-Stil; Shake ×0.25 an der EINEN tr-Stelle; lowVig mit separatem lv._st-Flag (NICHT _anim als Boolean missbrauchen — .cancel()-Pfad würde werfen); .floatN-Media-Query; Warnringe/hurtVig/Partner-Downed-Puls NICHT drosseln (Gameplay-Info)
---
Batch 20 — Onboarding
[risk:low]
touches: neon-wildnis.html: Intro-Block Z.4536–4545, Auto-Join-Block Z.4482–4486, bAct-Handler
rationale: #17(2) und #18 restrukturieren beide Z.4536–4545 → als EINE koordinierte Änderung. #15-Strings vorher im selben Block. Achtung: bAct-IIFE ist seit Batch 13 eine setTimeout-Kette — __acted-Flags dort einhängen.

CHANGE 1:
Tipp-Strings (#15): _tips[1] → "🪓 Rechts = Bäume fällen & Kämpfen · 🔨 = Bauen"; cb-Leiste analog "🕹️ laufen · 🪓 sammeln/kämpfen · 💨 rollen · 🔨 bauen"

CHANGE 2:
Auto-Join sichtbar (#17(1)): nach netStart("join",code) → coopBox.scrollIntoView({block:"center"}); den announce-Spiegel NICHT umsetzen (#announce liegt pre-game unsichtbar unter #ov; post-start deckt onlineBadge den Status ab)

CHANGE 3:
cb-Leiste + Tipp-Rotation als EINE Änderung (#17(2)+#18 merged): cb-Erzeugung aus dem Solo-Guard herausziehen mit Session-Guard window.__cbBar (Koop-Neustarts); lsSet("nw_intro") bleibt im Solo-Block; Tipp-Rotation per 4.2s-Interval über cb.textContent statt announce (Skip bei __moved/__acted, Tipp 3 "Sammle 10 Holz" NIE überspringen); Lebensdauer 12s→18s + clearInterval im removeChild-Timeout; __acted=1 in den Touch-/Click-Handlern der (Batch-13-)bAct-Kette setzen; announce() bleibt exklusiv für Gameplay-Events
---
Batch 21 — Dorf-NPCs: Beziehungen + Gefallen
[risk:med]
touches: neon-wildnis.html: talkToNpc Z.3507–3528, neuer Block bei Z.3493, Emote-Kette Z.1763, updPrompt nearNpc-Zweig
rationale: #61 und #62 bauen beide talkToNpc um → als EINE koordinierte Änderung mit fester Reihenfolge (#62 zuerst, #61 ankert danach hinter dem umgebauten Geschenk-Zweig-return).

CHANGE 1:
EINE koordinierte talkToNpc-Erweiterung: SCHRITT 1 (#62): NPC_NAMES (16) + npcName mit %-Modulo (npcs.length > 16!), npcFr/npcFrAdd über localStorage nw_npcfr, ❤️-Announce bei Stufe 8; im Geschenk-Zweig _fr/_nm lesen, bei _fr>=8 roll=0.5 (Kristall garantiert) + Menge 2; Namens-Prefix ab Stufe 3 in den 6 announce-Strings (im Dialog-Teil NICHT erneut inkrementieren). SCHRITT 2 (#61): Gefallen-Block NACH dem Geschenk-Zweig-return: want-Abgabe (2-3 💎 + 20 XP, Math.random-only) bzw. 30%-Chance auf neuen Auftrag; Emote-Kette: `if(!n.fixedEmo&&n.want&&n.giftDay===day)_em="🧺";` (🎁 hat Vortritt, kein zusätzlicher Draw); updPrompt-Ternary 🎁/🧺/🗨️. want ist unpersistierter Session-State (wie giftDay). Koop-Hinweis (#62) als Code-Kommentar: neuer Host-Seed ⇒ Index bezeichnet anderen NPC, bleibt aber kohärent
---
Batch 22 — Mobile-Perf & Asset-Loading
[risk:med]
touches: neon-wildnis.html: Robust-Loader-Shim Z.258–267, killMonster (dispose), placeResources/buildAmbient (Instancing), floatText, updSkill/hpUpd, loadCC0, Menü-Picker
rationale: Zuletzt, weil #27 die floatText-cls-Erweiterung aus Batch 11 einbauen muss und #25 den killMonster-Pfad aus Batch 8 nutzt (dispose EINMAL dort statt an 4 Sites). Dedupe: #25(1)-Buffer-Cache = #89 (die konkrete Umsetzung).

CHANGE 1:
GLB-Buffer-Cache im Shim (#89, ersetzt #25(1)): _bufC-Map mit Promise<ArrayBuffer>, Cleanup-.catch genau EINMAL am gecachten Promise, LRU-Deckel 16 (nicht 40 — würde nie evicten), individueller _origLoad-Fallback pro Warter; Metal-Fix-Wrapper bleibt außen unberührt; parse-Signatur r128 verifiziert

CHANGE 2:
disposeMonster (#25, adaptiert): e._own=1 an den 3 Fresh-Parse-Sites (Z.921/945/972); Aufruf EINMAL in killMonster nach scene.remove (Batch 8) + am Respawn-Despawn Z.3773; _own → volle geometry/material/map-Dispose (geteilte Toon-gradientMap NIE), sonst NUR _flC/_enr-Material-Klone (KEIN map.dispose — clone() teilt Texturen mit dem Prototyp!); try/catch (Kill-Pfad darf nie werfen)

CHANGE 3:
Instancing Pilze/Stümpfe/Stämme (#26): capG-Bake (scale+translate wie mcapG-Muster), exakt dieselben rnd()-Draws in derselben Reihenfolge, ungenutzte Slots bei (0,-999) parken; stumpIM/logIM castShadow=true NACH instMesh() setzen (instMesh erzwingt false), rotateZ-Bake für Stämme bitidentisch; Koop-Determinismus-Check

CHANGE 4:
floatText-Pool (#27, adaptiert an Batch 11): 16er-Lazy-Pool, Animation-Restart via animation:none+reflow; den cls-Param aus dem Krit-System beibehalten: `el.className="floatN"+(cls?" "+cls:"")` beim Recycle setzen; CSS unverändert

CHANGE 5:
DOM-Write-Guards (#28(1)(2)): updSkill op/tx-Cache am Element; hpUpd 0.5%-quantisierte width mit f._w-Cache; (3) entfiel — updBossBar wurde in Batch 9 umgebaut

CHANGE 6:
DEFER-Drossel (#91): loadCC0 slow-Param, one()-Helper mit done() in Success- UND Error-Callback (sonst hängt die Queue bei 404), Concurrency 3 + setTimeout(next,0)-Spreizung; Phase 1 bitgleich

CHANGE 7:
Ladebalken + Prefetch (#93): prog() einmal initial; __loadProg(0,1) NACH running=true (nicht vor loadNature — Guard schluckt es dort); _prefetch nur nature_pack + gewählter Held, mit requestIdleCallback-Fallback für iOS; CC0-Liste NICHT prefetchen
