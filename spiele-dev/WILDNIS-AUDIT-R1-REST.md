# 🌲 Wildnis Audit R1 — VERTAGTE Batches (Stand 2026-07-18)

Umgesetzt: Batches 1–8 + 10 + Signature-Koop (Team-Combo/gemeinsam Rasten/Freundschafts-Band).
Vertagt (bewusst, Kernpfad-Risiko am Session-Ende): Batch 9, 11, 12, 13 + #15 Floating-Joystick + #74 GLB-Buffer-Cache.
Exakte Anker beziehen sich auf den Stand VOR der Umsetzung — vor Anwendung neu grep-verifizieren!

---
Batch 9 — Wolken, Sprint-Clip, Vogel-Schwärme, Lade-Concurrency, Ladebalken, Boss-Reuse
[risk:low]
touches: daySky-Init (cloudGrp) + updDayNight daySky-Block, frame Z.4082, buildAmbient/updAmbient Vögel, loadCC0 + Phase-2-Aufruf Z.4305, startGame Z.4343, spawnGlbBoss

CHANGE 1:
#25 Wolken-Drift: `var cloudGrp=new THREE.Group();daySky.add(cloudGrp);` nach Z.316 (ADAPTION: dort stehen seit Batch 5/#23 die daySun-Vars — dahinter); im Wolken-Loop `daySky.add(cl)`→`cloudGrp.add(cl)` (Sonne sd NICHT umhängen); im daySky-Block als letzte Zeile `if(daySky.visible&&typeof cloudGrp!=="undefined"&&cloudGrp)cloudGrp.rotation.y+=dt*0.005;` — Wert 0.005.

CHANGE 2:
#32 Echter Sprint-Run: frame Z.4082 setAnim-Zeile durch die run-Clip-Verzweigung ersetzen (`if(ml>0.9&&heroRig.actions.run)setAnim(heroRig,"run",0.2,1.0);else` + Original-Else 1:1) — exakt wie Vorschlag #32; ONESHOT-Guard beibehalten; die Rotations-Zeile aus Batch 8 (#33) direkt darüber nicht anfassen.

CHANGE 3:
#51 Vogel-Schwärme: Build-push auf heading/spd-Felder umstellen (flockH-Array, a/sp als Höhen-Wipp-Timer BEHALTEN), Update Z.1209-1210 durch die heading-Bewegung mit `rotation.y=-bi5.heading+Math.PI` und 140-Wrap ersetzen; Z.1208/1211 unverändert — exakt wie Vorschlag #51. ADAPTION: visible/opacity-Logik aus Batch 8 (#50) im Bird-Loop stehen lassen.

CHANGE 4:
#76 Concurrency-Limit: loadCC0 auf Queue mit maxConc umbauen (`act--;next();` in BEIDEN Callbacks vor `--left`); NUR den Phase-2-Aufruf mit drittem Argument 4 versehen — ADAPTION: der Phase-2-Callback enthält seit Batch 8 (#74) den Pre-Warm-Block; Callback-Inhalt unverändert übernehmen. Phase-1-Aufruf NICHT anfassen.

CHANGE 5:
#77 Ladebalken sofort: exakt eine Zeile `if(window.__loadProg)window.__loadProg(0,1);` nach Z.4343 (nach `running=true;...dailyReward();`) — NUR Variante-Minimal, kein __loadTick-Umbau.

CHANGE 6:
#78 Boss aus mobProtos: Fast-Path am Anfang von spawnGlbBoss (MOBS-Lookup !skinned, clone(true) ohne Re-toonify, Box3-Messung, identische push-Felder inkl. kind-String, kein rnd()); GLTFLoader-Pfad als Fallback belassen — exakt wie Vorschlag #78.
---
Batch 11 — Krit-Wuchtschlag + Kamera-Juice/Slowmo
[risk:med]
touches: CSS .floatN(.big), floatText-Signatur, dmgHit, heroAct (return), harvest-Kampfzweig; updCamera (FOV) + doDodge + bossReward + frame Z.4062/4086 (rawDt)

CHANGE 1:
#70 (reduziert) Krit auf Combo-3: CSS `.floatN.big{font-size:2rem;letter-spacing:.5px}` nach der .floatN-Regel (die seit Batch 1/#66 das Kontur-Set trägt); floatText um big-Param + `el.className=big?"floatN big":"floatN";`; dmgHit-Signatur `(e,dmg,crit)` mit 💥-Gold-Zahl und `e.hitPop=crit?0.24:0.16;` — ADAPTION: die Zeile `e.hitFlash=0.12;` aus Batch 3 (#7) im Body BEHALTEN; heroAct: `return pick;` als letzte Zeile (nach sendAct); harvest: `heroAct("melee",2.2);` → `var _crit=heroAct("melee",2.2)==="attack3";`, dann `if(_crit)_md*=2;`, `dmgHit(nearMon,_md,_crit)`, knockback-Stärke `_crit?14:9` — ADAPTION Shake mit Batch 3 (#6) mergen: `shake=Math.min(shake+(_crit?0.32:0.22),0.5);`. Die hitStop-Aufrufe aus Batch 2 (#4) unverändert lassen; #70s eigener hitStopT/frame-Umbau ENTFÄLLT (s. dropped). heroAct-Aufrufe in Tier-/Ressourcen-Zweigen unverändert.

CHANGE 2:
#73 FOV-Kick + Boss-Slowmo: `var fovKick=0,slowmoT=0;` bei Z.3131; `fovKick=6;` am Ende von doDodge; FOV-Block am updCamera-Ende nach der (seit Batch 2/#35 auf dt*1.8 geänderten) Decay-Zeile; `slowmoT=0.7;goldFlash();` + goldFlash-Funktion in/bei bossReward; frame Z.4062 auf `var rawDt=...;var dt=rawDt;` umbauen, `if(slowmoT>0){slowmoT-=rawDt;dt*=0.35;}` vor dem Bewegungsblock, und in Z.4086 exakt EINEN Token `netTick(dt)`→`netTick(rawDt)` — exakt wie Vorschlag #73. Hinweis: der hitStop-Block aus Batch 2 (#4) und der Shadow-Tick aus Batch 3 (#13) direkt daneben bleiben unverändert.
---
Batch 12 — Zentraler Monster-Tod (killMonster + Squash-Dissolve)
[risk:med]
touches: Alle 4 Kill-Blöcke (useSkill/updThrow/useBolt/harvest), neue killMonster/updDying, frame Z.4086, updDayNight Tageswechsel-Cleanup

CHANGE 1:
#69 killMonster/updDying nach Z.3368 einfügen — ADAPTION des Bodys an den aktuellen Stand: statt `gainXP(8);kills++;if(typeof dropLoot==="function")dropLoot(e.x,e.z);` → `rewardKill(e);killSfx(e.boss);` (aus B6/#42 + B4/#39); `clearWarn(e)` UNCONDITIONAL aufrufen (B10/#10); Boss-Zweig (bossKills/bossReward) wie im Vorschlag; dyingMobs-Push mit baseScale-relativem Squash, KEIN geometry/material.dispose().

CHANGE 2:
#69 Kill-Blöcke ersetzen: die 4 `if(...hp<=0){...}`-Blöcke → `killMonster(e)`-Aufruf — ADAPTION harvest: `if(nearMon.hp<=0){hitStop=Math.max(hitStop,0.08);` (B2/#4) `+ 40%-Stein-Drop` (Original) `+ killMonster(nearMon);}` — Krit-Code aus B11 (#70) davor unverändert; an den anderen 3 Sites die rewardKill/killSfx/clearWarn-Zeilen durch den killMonster-Aufruf ersetzen (Funktionalität wandert hinein).

CHANGE 3:
#69 Integration: `updDying(dt);` in frame direkt nach `updShock(dt);` (Z.4086 — Anker enthält inzwischen updMusic/netTick(rawDt), egal); im Tageswechsel-Cleanup nach `monsters.length=0;` → `dyingMobs.forEach(function(d){scene.remove(d.m);});dyingMobs.length=0;` (der Zweig enthält seit B6/B7 Respawn- und Cache-Blöcke — Cleanup direkt beim Monster-Cleanup platzieren). Verifikation zusätzlich: gleichen Mob-Typ nach einem Kill erneut spawnen (Dispose-Falle).
---
Batch 13 — decorateWorldLate time-slicen
[risk:high]
touches: decorateWorldLate Z.2008-2118 (Task-Queue), Phase-2-Callback Z.4305 (iblClamp ans Queue-Ende)

CHANGE 1:
#75 Task-Queue: decorateWorldLate in _lateTasks in EXAKT heutiger Reihenfolge zerlegen ([a] STUFF bis [m] buildSpawnHub als letzte Task); die 3 farScatter-Tasks chunked mit `_lateTasks.unshift(self)` (Folge-Tasks dürfen rnd2 nicht vorher konsumieren!); Pump mit 6ms-Budget + setTimeout(0), am Ende iblClamp() — exakt wie Vorschlag #75.

CHANGE 2:
#75 Aufrufstelle: Phase-2-Callback Z.4305 auf `function(){decorateWorldLate();}` reduzieren (iblClamp raus, wandert in die Pump) — ADAPTION: den Pre-Warm-Block aus Batch 8 (#74) im Callback BEHALTEN. Verifikation: Smoke PASS + manuell __nw.villages()/__nw.props() bei festem SEED vorher/nachher vergleichen.
