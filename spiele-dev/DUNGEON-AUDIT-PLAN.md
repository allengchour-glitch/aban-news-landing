# 🏰 Dungeon Audit — Plan (18 Batches, 72 bestätigt · Stand 2026-07-18)

Umgesetzt: B1-B10 + B12 + B13 + B15 + B16 (Wildnis-Integration: 🏰-Badge krieger + partner + Koloss-Quest mit win-Flag; verifiziert __nw.simStation → koloss nur bei win=1). B17 (Endgame: rebalancierte Score-Formel #63 Sieg-Min 212/Tod-Max 56, Lauf-Timer #68 mm:ss, Bestzeit in nd-best + 🏆-Feedback + Sieg-Arpeggio). B9/#30 (Floating-Joystick: springt zum Daumen in der linken Bildhälfte, Aktionsknöpfe rechts unberührt), B11 (Höhlen-Ambiente-Drone + Tropfen ab Start #21, Boss-Bass-Ostinato ab dem Aufstehen + Enrage-Tempo + Wut-Riff #23; verifiziert bossOn=true, 0 Fehler), B18 (Rematch-Knopf #67 → stationRematch lädt die Station frisch neu (Reward zählt regulär) + „← Wildnis", NG+/Meister-Modus #71 ?ng=1: Boss startet in Enrage, Score ×1.5, MEISTER-Label, „⚔️ Meister-Abstieg"-Knopf, NG-Läufe schreiben keine Bestzeit; verifiziert Smoke station=1 & ng=1 + Boss-Trigger). OFFEN: B14 (Perf med — Licht-Pool/Regen-Loop/Instancing). Anker vor Anwendung grep-verifizieren (Zeilennummern = Audit-Stand, driften durch Umsetzung).

---
B1 · Bug-Fixes Kern (Boss-Schaden, Arm-Hänger, groundAt)
[risk:low]
touches: neon-dungeon.html: damage() Z.242-245, Ring-Hit Z.356, doHit Z.220, groundAt Z.236-239, Z.297, Z.360, Z.373, Var-Zeile Z.183
rationale: Echte Bugs zuerst: Ketten-Schaden nach Respawn, einfrierender Boss-Arm, latenter Fall-Durch-Bug. Alle Anker sind in der 377-Zeilen-Datei verifiziert.

CHANGE 1:
#13 I-Frames + Ring-Clear bei Schaden: (1) Z.183 Var-Zeile um `,invT=0` erweitern; (2) damage() Z.242-245: `hearts--;invT=1.6;` + Ring-Clear-Loop (scene.remove+dispose, rings.length=0), im Todes-Zweig `dead=true;player.visible=true;`; (3) Ring-Hit Z.356: `if(!rr.hit&&invT<=0&&…){rr.hit=true;damage();break;}` — das break ist PFLICHT (damage() leert rings mitten in der Schleife, sonst TypeError); (4) vor Z.360 `player.position.set(...)`: `if(invT>0){invT-=dt;player.visible=invT<=0||Math.sin(t*30)>0;}` (#0 ist Duplikat, gedroppt — #13 ist die vollständigere Variante).

CHANGE 2:
#1 slamArm-Reset im doHit-Erfolgspfad: Z.220 (einziges Vorkommen `emissiveIntensity=0.2`) ersetzen durch `slamArm.userData.cry.material.emissiveIntensity=0.2;slamArm.userData.cry.scale.setScalar(1);slamArm.userData.slamTgt=0;slamArm=null;` — kein Umsortieren, Z.345-348 unverändert lassen.

CHANGE 3:
#3 groundAt mit maxY: (1) Z.236-239 `function groundAt(x,z,maxY){…if(p.y<=maxY&&…)}`; (2) Z.297 Aufruf `var g=groundAt(px,pz,py+1.2);` — WICHTIG 1.2, nicht 0.5 (Lande-Toleranzband erhalten); (3) Z.373 `tp:` mit `groundAt(x,z,1e9)`. Carry-Logik Z.287 und Abgrund-Guard nicht anfassen.

CHANGE 4:
Verifikation: node tools/game_smoke.cjs "neon-dungeon.html?station=1"
---
B2 · Robustheit & Guards
[risk:low]
touches: neon-dungeon.html: Init Z.73-78, doHit/winGame/finish-Köpfe, Joystick-IIFE Z.205-215, sfx Z.186, nach Z.233
rationale: Stabilitäts-Fixes ohne Gameplay-Änderung: Ladefehler, Context-Loss, Stuck-Inputs, iOS-Audio, Doppel-finish. Keine Region-Überlappung untereinander (#51 doHit-Kopf Z.217 kollidiert nicht mit B1s Z.220-Edit, da B1 zuerst appliziert wird).

CHANGE 1:
#49 THREE-Lade-Guard nach Z.73 (`if(!window.THREE){…Neu laden ↻…return;}`) + Context-Loss-Listener nach Z.78 (webglcontextlost preventDefault / webglcontextrestored location.reload).

CHANGE 2:
#51 Idempotenz-Guards: doHit Z.217 `if(!bossOn||dead||won)return;`, winGame Z.247 `if(won||dead)return;`, finish Z.260 `if(finish._done)return;finish._done=true;`.

CHANGE 3:
#50 Eingabe-Reset: in der Joystick-IIFE Z.215 (NICHT bei Z.229 — dort ist `id` ausser Scope) `clearInput()` (keys={},id=null,kx=kz=0,knob-Reset) + blur- und visibilitychange-Listener. vy/jBuf/coyote/Boss-State bewusst NICHT resetten.

CHANGE 4:
#52 AudioContext-Resume: in sfx() Z.186 nach `AC=AC||…` ein `if(AC.state&&AC.state!=="running"&&AC.resume)AC.resume();` (Guards auf .state UND .resume Pflicht) + eigener visibilitychange-Hook nach Z.233; darf mit #50s Listener koexistieren, optional in dessen clearInput-Hook konsolidieren.

CHANGE 5:
Verifikation: node tools/game_smoke.cjs "neon-dungeon.html?station=1"
---
B3 · Sprung-Feel (Physik)
[risk:low]
touches: neon-dungeon.html: doJump Z.216, Listener Z.225-233, jBuf-Block Z.301-302, Gravitation Z.303
rationale: Höchster Spielgefühl-Impact (5/5/4) bei niedrigstem Risiko; drei disjunkte Anker im Sprungcode. #28 gedroppt (identisch zu #32).

CHANGE 1:
#4 Variable Sprunghöhe: Z.216 `doJump` → `var jHeld=false;function doJump(){jBuf=0.12;jHeld=true;}function endJump(){jHeld=false;if(vy>3.5)vy=3.5;}`; touchend/touchcancel/mouseup-Listener auf #bJump (KEIN preventDefault auf touchend); keyup Z.233 um `if(e.key===" ")endJump();` erweitern. Bewusst KEIN jHeld-Check im jBuf-Konsum; Cut-Wert 3.5 nicht senken.

CHANGE 2:
#32 Kanten-Fall frisst 1. Sprung nicht: Z.301-302 else-Zweig ersetzen — `var first=(jumps===0);vy=first?9.2:8.8;jumps=first?1:2;jBuf=0;sfx(first?340:430,0.12,"square",0.04,first?520:640);` — die tote `for(var bp…)`-Schleife entfällt hier (Juice-Ersatz kommt in B12/#35, Einfüge-Anker dort = nach der sfx-Zeile).

CHANGE 3:
#5 Asymmetrische Gravitation: Z.303 exakt `    vy-=22*dt;py+=vy*dt;` ersetzen durch `    var G=vy<-0.5?32:(Math.abs(vy)<2&&!onG?14:22);vy=Math.max(-16,vy-G*dt);py+=vy*dt;` — sonst nichts (9.2/8.8, Coyote, g-1.2 bleiben). Falls weiter Sprung zu _p52 knapp wird: Fall-G 32→28.

CHANGE 4:
Verifikation: Smoke + via window.__nd.tp(-2,-45) Doppelsprung Richtung (3.5,-52) prüfen.
---
B4 · Boss-Lesbarkeit & Touch-Fairness
[risk:low]
touches: neon-dungeon.html: Z.183, Boss-FSM stomp-Zweige Z.326-339, vuln-Anzeige nach Z.348, doHit-Distanzzeile Z.219, CSS Z.28/34
rationale: Stomp-Telegraph + Vuln-Fenster-Anzeige + grösserer ⚔️-Button machen den Boss fair lesbar (Impact 5/4/3). Disjunkte Zweige der Boss-FSM (#12 stomp, #19 vuln, #34 CSS/doHit-Radius). #27 gedroppt (zweiter Telegraph, gleiche Region wie #12).

CHANGE 1:
#12 Stomp-Telegraph: Z.183 `,warnD=null`; im idle→stomp-Zweig Z.326-327 Warn-Ring (RingGeometry 1.6/2.2, orange, y=0.10 — NICHT 0.12, Z-Fighting mit Schockwellen) an boss.position; im stomp-Resolve Z.330 warnD entfernen+disposen (einziger Exit); im Boss-Block vor Z.345: `if(bState==="stomp"){if(warnD)warnD.material.opacity=0.3+Math.sin(t*14)*0.25;boss.position.y+=(-0.4-boss.position.y)*Math.min(1,dt*8);}`.

CHANGE 2:
#19 Vuln-Fenster-UI: nach Z.183 gepoolt `vRing` (RingGeometry 2.55/3.2 violett 0xc98bff, y=0.14) + `vLight` (intensity 0, ab Init in Szene — kein Shader-Recompile) + gehoistete `_fw`; im Boss-Block NACH Z.348 UNCONDITIONAL (nicht in `if(vulnT>0)`): `if(vulnT>0&&slamArm){…fist.getWorldPosition(_fw);vRing an _fw, Puls, vLight-Fade-In}else{vRing.visible=false;vLight-Fade-Out}`. Aussenradius 3.2 = doHit-Radius (wird von #34 auf 4.0 angehoben → RingGeometry-Aussenradius dann 4.0 setzen).

CHANGE 3:
#34 Touch-Fairness: Z.34 #bHit 64→76px, right 112→116px; Z.28 #hint bottom 178→196px (Überlappung); doHit Z.219 Distanz `<3.2` → `<4.0`; optional hitPulse-Keyframes + 1.2s-Puls beim Boss-Erwachen Z.320.

CHANGE 4:
Verifikation: Smoke + window.__nd.boss(), einen Slam abwarten (Ring sichtbar, Ducken vor Stomp).
---
B5 · Render-Basis & Kamera-Anker
[risk:low]
touches: neon-dungeon.html: Z.5, Z.76-77, Z.80, Z.159, Lande-Zweig Z.304, respawn/respawnBoss, Kamera-Block Z.363-367, __nd Z.373
rationale: Drei Einzeiler-Perf/Plattform-Fixes + das Kamera-Grundgerüst (gy). #47 schlägt #7 (deckt bewegliche Plattform, respawn, tp ab). #47 MUSS vor B6 (snapCam) landen.

CHANGE 1:
#33 Z.5 Viewport-Meta um `, viewport-fit=cover` ergänzen (sonst sind alle env(safe-area-inset-*) auf iOS 0).

CHANGE 2:
#56 Z.76-77: `var DPR=Math.min(devicePixelRatio||1,1.5); var renderer=new THREE.WebGLRenderer({antialias:DPR<1.5}); renderer.setPixelRatio(DPR);renderer.setSize(W,H);` (#31s DPR-Teil hiermit abgedeckt).

CHANGE 3:
#55 Z.80 camera.far 220→90 (Fog endet bei 84; nicht unter 90).

CHANGE 4:
#47 Boden-verankerte Kamera: Z.159 `,gy=0`; Z.304 Lande-Zweig `…jumps=0;gy=py;`; respawn() `gy=py;`, respawnBoss() `gy=0;`; Kamera-Block Z.363-367: `if(py<gy-2.5)gy+=(py-gy)*Math.min(1,dt*4);` dann `cy2=gy+…` und `camera.lookAt(px,gy+1.2,pz-2);`; zusätzlich __nd.tp `gy=py;` und __nd.boss `gy=0;`. Der Z.287-Extra-Edit aus dem Vorschlag ist redundant (Lande-Zweig läuft jeden Boden-Frame).

CHANGE 5:
Verifikation: Smoke + manuell: Doppelsprung (Plattform bleibt ruhig, Figur steigt im Bild), Ritt auf _p52, Abgrundsturz, Boss-Ring-Sprung ohne Kamera-Pump.
---
B6 · Impact-Momente & Respawn-Kamera
[risk:low]
touches: neon-dungeon.html: Z.183 + Pool-Setup, Stomp Z.338, doHit-Trefferzweig, damage()/winGame(), Kammer-Trigger Z.319-321, Kamera Z.366-367, respawn/respawnBoss/__nd.tp
rationale: Kamera-Shake + Debris (Impact 5) und Respawn-Snap (Impact 4). #46 gedroppt, dessen Zusatz-Trigger (damage/winGame) hier in #17 integriert; #45 gedroppt (Duplikat von #10). Nach B5, damit snapCam die gy-Zielformeln nutzt.

CHANGE 1:
#17 Shake + gepoolter Debris-Burst: Z.183 `,shakeT=0`; Debris-Pool (12 Boxen 0.22, emissives Fels-Material `M(0x4a4258,0x2a2038,0.4)` — NICHT STONE2, sonst unsichtbar) + burstDebris(x,z); Stomp Z.338 `shakeT=0.35;burstDebris(…)`; doHit nach `hitFx=0.5;` → `shakeT=0.25;`; Boss-Erwachen Z.319-321 `shakeT=0.5;`; ZUSÄTZLICH (aus #46 übernommen): in damage() `shakeT=Math.max(shakeT,0.35);` und in winGame() `shakeT=0.6;`. Debris-Update im IMMER laufenden Teil von frame() nach der Motes-Schleife (nicht im bossOn-Block). Kamera: zwischen Z.366 und lookAt Z.367 den Jitter-Block (Shake VOR lookAt → Welt-Jitter, kein Motion-Sickness).

CHANGE 2:
#10 snapCam: vor respawn() `function snapCam(){camera.position.set(px,gy+(bossOn?7.5:6.2),pz+(bossOn?11:8.6));}` (Zielformeln nach B5 auf gy angepasst!); Aufrufe: respawn() nach announce, respawnBoss() am Ende, __nd.tp nach py-Setzung. Lerp-Block unverändert (wird nach Snap No-op).

CHANGE 3:
Verifikation: Smoke; manuell Stomp/Treffer/Tod prüfen (Shake klingt ab, Kamera fängt sich).
---
B7 · Boss-Erwachen (Rise) & Schlag-Feedback
[risk:low]
touches: neon-dungeon.html: Boss-IIFE Z.165-182, Kammer-Trigger Z.319-321, FSM-Kopf Z.325, doHit Z.221/224, Hint Z.344
rationale: #60 (Impact 5) ersetzt das visible=true-Pop-in durch eine Aufsteh-Inszenierung via bState="rise" — sauberer als das gedroppte med-risk-Superset #14. #42 (Impact 4) macht doHit-Feedback erklärend; keine Region-Überlappung mit #60.

CHANGE 1:
#60 Rise-Inszenierung: (1) Boss-IIFE nach Z.169 `boss.userData.eyeMat=eye1.material;` (clone teilt Material); (2) Z.182 Start-Position y=0→-8 (Kopf unter Bodenplatte); (3) Kammer-Trigger: nach boss.visible=true → `bState="rise";boss.userData.eyeMat.emissiveIntensity=0;hitFx=1.2;`; (4) Z.325 FSM-Kopf: `if(bState==="rise"){y+=dt*6 bis 0, eyeMat-Fade dt*0.8, dann bState="idle";bT=2.0;…}else if(bState==="idle"&&bT<=0){` — bestehendes if wird else-if, y am Ende hart auf 0 snappen. NICHT die Typo-Formel `Math.min(1,+dt)` übernehmen.

CHANGE 2:
#42 Schlag-Feedback: (1) Z.344 Hint-Dauer 2200→4200 (deckungsgleich mit vulnT=4.2); (2) doHit-Fallthrough Z.224: bei `vulnT>0&&slamArm` → hint("Näher an die glühende Faust ran!",2000), sonst Once-Guard-Hint "⏳ Warte, bis ein Faust-Kristall violett aufglüht!"; (3) im Erfolgszweig nach announce: `var hh=document.getElementById("hint");clearTimeout(hh._t);hh.style.opacity=0;` (sonst steht "JETZT treffen!" 4s stale).

CHANGE 3:
Verifikation: Smoke (Rise-Delay kann nicht rot werden) + manuell __nd.boss(): Boss steigt ~1.3s auf, Augen faden ein, erst dann Angriffe.
---
B8 · Level-Design, Boss-Pacing & Arena-Clamp
[risk:low]
touches: neon-dungeon.html: Level-Def Z.131/139-148, Movement-Block nach Z.295, Boss-idle/slam-Zweige Z.326-341, doHit bT-Clamp, Stage-Trigger Z.312-313, start(), Deko-IIFE
rationale: Parcours-Fairness (#9 härtester Sprung, #8 Arena-Sturz, #26 Boss-Tempo) + Orientierung (#11 Stage-Announces, #43 Start-Richtung) + Lore-Deko (#61). #26 hier statt bei den Boss-Batches, weil dessen doHit-/FSM-Anker mit B4/B7 kollidieren würden — hier ist er konfliktfrei. #41 gedroppt (von #11 abgedeckt).

CHANGE 1:
#9 Einstiegs-Mover entschärfen: Z.131 `plat(3,3.4,-38,2.4,2.4).mv={ax:2.2,ay:0,sp:0.7,ph:0}` → `plat(3,3.4,-38,3.0,3.0).mv={ax:1.5,ay:0,sp:0.55,ph:0}` + neue Zeile `gem(0,3.4,-35);` als Flugbahn-Guide. Abschnitt-3-Mover Z.137 unverändert (Steigerung).

CHANGE 2:
#8 Boss-Arena-Clamp: im Frame-Loop nach Z.295 (`if(il>0.05)player.rotation.y=…`) einfügen: `if(bossOn){var bdx=px,bdz=pz-CHZ,bdl=Math.hypot(bdx,bdz);if(bdl>12){px=bdx/bdl*12;pz=CHZ+bdz/bdl*12;}}` — py<-9-Fallback Z.306-307 belassen.

CHANGE 3:
#26 Boss-Pacing: Z.183 `,stomps=0`; Stomp-Zweig `stomps<2 && (Ph0 0.6 / Ph1 0.45)`, `stomps++`; Slam-Zweig `stomps=0`; Z.341 bT 5.0→4.4 — NICHT 3.5 (bT muss ≥ vulnT=4.2, sonst TypeError-Freeze durch zweiten Slam); in doHit nach `bossHp--;vulnT=0;` → `bT=Math.min(bT,1.4);` (Haupt-Tempogewinn). Hinweis: nach B7 liegt der idle-Zweig im else-if — Anker-Text identisch.

CHANGE 4:
#11 Abschnittswechsel: Z.312 `…stage=2;updHud();announce("⚙️ Abschnitt 2 — Bewegte Plattformen","#9fd0ff");hint("⤴⤴ Doppelsprung für weite Lücken!",3200);` und Z.313 analog Abschnitt 3 ("🌉 Schmale Stege" + "Langsam laufen…"). Akzeptierte Kosmetik: Stage-Announce überschreibt Checkpoint-Announce.

CHANGE 5:
#43 Start-Richtung: in start() nach hint() → `announce("🔥 Folge den Fackeln in die Tiefe!","#ffce8a");` + optional 3 statische Chevron-Mesh-Paare auf der Startplattform (reine Meshes, NICHT via plat(), y=0.06).

CHANGE 6:
#61 Umgebungs-Erzählung: Deko-IIFE nach Z.148 (gekippter Säulenstumpf + liegende Trommel auf Plattform z=-59, Basis y=5); gefallener Ritter SEITLICH versetzt auf plat(0,1,-88) (Checkpoint-Respawn frei halten) + `gem(0.6,1,-86.8);`; Kammer-Säulen: y=h/2 statt hart 4.5, Kippwinkel ±0.14 rad, nur wi%4===2. Nichts in plats[].

CHANGE 7:
Verifikation: Smoke; __nd.boss() liegt auf r=10 (innerhalb Clamp r=12).
---
B9 · Onboarding & Mobile-Input
[risk:low]
touches: neon-dungeon.html: Init nach Z.71, <style>, Overlay-Chips Z.63, start()-Hint, Boss-Hints Z.320/344, Joystick-IIFE Z.205-215, updHud Z.198, Pickup Z.316, nach Z.140
rationale: Desktop erfährt endlich WASD/Space/E (#40, Impact 5), dynamischer Joystick (#30, Impact 5), Kristall-Zähler x/7 (#36 reduziert). #29/#44 gedroppt (von #40+#42 abgedeckt). #36s Score-Formel-Teil bewusst NICHT hier (kollidiert mit #63 in B17).

CHANGE 1:
#40 Geräte-adaptive Hinweise: nach Z.71 `var TOUCH=(navigator.maxTouchPoints>0)||matchMedia('(pointer:coarse)').matches;` + Klasse `nd-notouch` auf <html>; CSS `.nd-notouch #stick,.nd-notouch #bJump,.nd-notouch #bHit{display:none!important}` (per Klasse, NICHT Inline — updHud überschreibt bHit.style.display); Hybrid-Fallback via once-touchstart; Overlay-Chips bei !TOUCH per statischem innerHTML (WASD/Space×2/E); start()-Hint und Boss-Hints Z.320/344 TOUCH-verzweigen (Z.344-Text nach B7/#42 mit Dauer 4200 beibehalten).

CHANGE 2:
#30 Dynamischer Joystick: #stick-touchstart-Listener durch document-weiten touchstart ersetzen, Guards in Reihenfolge: `if(!running)return;` → closest("#ov,#stationBack,.btn") → `if(id!=null)break;` → `clientX>=innerWidth*0.45 continue;`; bei Treffer id/cx0/cy0 setzen + #stick per transform an den Touch-Punkt (restX/restY einmalig cachen); touchmove unverändert; in end() `st.style.transform=""`. Hinweis: B2/#50 hat clearInput in derselben IIFE ergänzt — dort zusätzlich transform-Reset aufnehmen.

CHANGE 3:
#36 (reduziert) Kristall-Transparenz: nach Z.140 `var GEM_TOTAL=gems.length;`; updHud Z.198 `"💎 "+gemN+"/"+GEM_TOTAL`; im Pickup-Handler nach gemN++ `if(gemN===GEM_TOTAL)announce("✨ ALLE KRISTALLE!","#c98bff");`. Formel-/Endscreen-Teile (3)-(5) entfallen — Score-Hoheit liegt bei #63 (B17); dort GEM_TOTAL für die Anzeige nutzen.

CHANGE 4:
Verifikation: Smoke (headless=pointer:fine testet den Desktop-Pfad mit); manuell: Start-Button per Touch weiter klickbar.
---
B10 · Audio-Fundament (Bus, Fairness-Cues, Jingle)
[risk:low]
touches: neon-dungeon.html: sfx()-Interna Z.186-191, vulnT-Block Z.345/348, nach Z.288, damage()-Todes-Zweig, nach Z.294, Var-Zeilen Z.159/194
rationale: Echo-Bus zuerst (alle späteren Sounds profitieren), dazu hörbare Fairness-Signale und die Sieg/Tod-Symmetrie. #24 hier statt B4, weil dessen Z.345/348-Anker mit #19 kollidieren (B4 zuerst — Anker-Text bleibt eindeutig).

CHANGE 1:
#22 Master-Bus: Z.186 `var AC=null,ndMaster=null,ndEcho=null;` + Lazy-`bus()` (Compressor -14/8 → destination; Echo-Send 0.35 → Delay 0.27 → Lowpass 1600 → Feedback 0.34, Ausgangs-Tap HINTER dem Lowpass `damp.connect(ndMaster)`); Z.191 `o.connect(ga);bus();ga.connect(ndMaster);ga.connect(ndEcho);o.start();`. start() nicht anfassen.

CHANGE 2:
#24 Fairness-Cues: Z.194 `,hbT=0`; Z.345 Warn-Tick als Einmal-Crossing `if(vulnT>1&&vulnT-dt<=1)sfx(700,0.05,"square",0.03);` VOR dem Dekrement; Z.348 Fenster-zu-Fizzle `sfx(500,0.25,"triangle",0.04,180);` im Reset-Zweig; Herzschlag nach Z.288: `hearts===1`-Lub-Dub mit 85/70 Hz (NICHT 48/44 — auf Handys unhörbar).

CHANGE 3:
#25 Niederlage-Jingle + Schritte: Z.159 `,stepT=0` (Pflicht-Deklaration); in damage()-Todes-Zweig 3 setTimeout-Töne ab 250 ms (endet vor finish bei 1800 ms); nach Z.294 Schritt-Ticks `stepT-=dt*il; onG&&il>0.3&&stepT<=0 → stepT=0.34, sfx 95-120 Hz gain 0.02`.

CHANGE 4:
Verifikation: Smoke + manuell Sprung/Treffer/Tod anhören (Echo ~270 ms, kein Aufschaukeln, Jingle ohne Console-Error).
---
B11 · Audio-Atmosphäre & Boss-Theme
[risk:low]
touches: neon-dungeon.html: Audio-Block nach Z.191, start() Z.268-270, finish()-Kopf, Z.183, Frame-Loop nach Z.324, doHit Z.222
rationale: Ambiente-Drone (#21, Impact 5) und Bass-Ostinato (#23) — getrennt von B10, weil #21 den Audio-Block-Bereich Z.185-191 (Einfügung nach sfx) und #23 doHit Z.222 berührt (B8/#26 und B13/#18 berühren doHit ebenfalls, aber in anderen Batches).

CHANGE 1:
#21 Höhlen-Ambiente: nach der sfx()-Definition `startAmbience()` (2 verstimmte Sawtooth 55/55.7 Hz → Lowpass 140 mit LFO → ambGain 0.012 → direkt AC.destination — die Drone bewusst NICHT über den Echo-Bus aus B10) + Tropfen-Loop via sfx/setTimeout mit ambOn-Flag; in start() nach dem AC-try/catch `startAmbience();`; in finish() als erste Zeilen `ambOn=false;clearTimeout(dripT);` + Gain-Fade (ambOn-Flag ist Pflicht, running bleibt nach finish true).

CHANGE 2:
#23 Boss-Ostinato: Z.183 `,btBeat=1.2,btIdx=0` (Init 1.2 Pflicht, sonst NaN); im Frame-Loop nach Z.324 (nach B7 innerhalb des else-Zweigs hinter dem rise-Block platzieren, damit der Beat erst nach dem Aufstehen startet): A1/A1/C2/G1-Sequenz, Ph1 0.30s sonst 0.42s Takt; in doHit-Enrage-Zweig Z.222 einmaliges Wut-Riff `sfx(110,0.6,"sawtooth",0.07,55);`. Kein Stop-Code nötig (running/bossOn-Gates).

CHANGE 3:
Verifikation: Smoke + __nd.boss(): Beat setzt nach Rise ein, Tempo wechselt in Enrage, verstummt bei Sieg/Tod; Tropfen enden mit dem End-Overlay.
---
B12 · Grafik-Juice (Squash, Gem-Pop, Treffer-Reward)
[risk:low]
touches: neon-dungeon.html: Z.159/183 + Pools, Pickup Z.316, Lande-Zweig Z.304, Doppelsprung-sfx-Zeile, frame()-Einfügungen Z.280-287, doHit-Erfolgszweig, CSS #gems/#bossBar
rationale: Spieler- und Belohnungs-Juice gebündelt: #6 (Squash&Stretch + Lande-Staub), #35 (Burst-System + Gem-Pop + HUD-Puls + Doppelsprung-Burst), #39 (Boss-Treffer-Reward). Z.302-Kollision aufgelöst: die tote Schleife ist seit B3/#32 weg — Doppelsprung-Effekt gehört #35, #6 liefert nur Squash+Lande-Staub. #20/#62 gedroppt (Duplikate).

CHANGE 1:
#35 Burst-System: bei Z.183 `var fx=[],fxGeo=new THREE.OctahedronGeometry(0.12,0);` (fxGeo shared, nie disposen) + burst(x,y,z,n,col); Pickup Z.316: `gg.m.visible=false` ersetzen durch Gem-Pop (transparent, fx-push kind:"gem") + burst(3, 0xc98bff) + #gems-HUD-Puls (CSS transition + .pulse, clearTimeout-Guard); Doppelsprung: nach der sfx-Zeile im else-Zweig (B3-Fassung) `burst(px,py+0.15,pz,4,0x7de3ff);`; fx-Update in frame() zwischen Gems-Idle-Loop und mv-Schleife, AUSSERHALB des running-Guards (Gem-Geo pro Gem → dispose ok, Splitter-Geo shared → nur Material disposen).

CHANGE 2:
#6 (reduziert) Squash&Stretch + Lande-Staub: Z.159 `var sq=0,dust=[],dustI=0;` + WEISSE Staub-Textur (NICHT __glowT — orange) + 6er-Sprite-Pool + puff(); Lande-Zweig Z.304 `if(!onG){sfx…;sq=1;puff(px,g,pz,3);}`; vor player.position.set: Scale-Block (stY/sXZ, Origin an den Füssen); Staub-Update ausserhalb des running-Guards nach dem Motes-Block; in respawn() und damage()-Todes-Pfad `sq=0;player.scale.set(1,1,1);`. Der Doppelsprung-Teil (2) von #6 entfällt (macht #35).

CHANGE 3:
#39 Boss-Treffer-Reward: im doHit-Erfolgszweig nach announce: (a) #bossFill-Blitz via Klasse `flash` + CSS `#bossBar i.flash{background:#fff}` (auf das <i>, nicht .bar); (b) Kristall-Burst an wp — statt der setInterval-Variante des Vorschlags das frische fx/burst-System aus #35 nutzen: `burst(wp.x,wp.y,wp.z,5,0xc98bff);` (Cleanup inklusive, kein Interval-Müll); (c) das zusätzliche '6/6'-announce STREICHEN (winGame überschreibt sofort).

CHANGE 4:
Verifikation: Smoke; manuell: Landung staubt, Gems poppen, HUD pulst, Boss-Bar blitzt.
---
B13 · Boss-Stimmung & Intro-Kamera
[risk:low]
touches: neon-dungeon.html: Z.83/142, Boss-IIFE userData, Enrage-Zweig Z.222, Frame-Loop Mood-Block, Kammer-Trigger, lookAt Z.367, Z.183
rationale: Licht-Dramaturgie (#18) + Kamera-Blick beim Erwachen (#48). Getrennt von B7, weil beide den Kammer-Trigger bzw. die Boss-IIFE berühren — hier nacheinander auf den B7-Stand appliziert. #15 gedroppt (Augen/Risse von #18 abgedeckt; Bar-Label-Kosmetik verzichtbar). #14 gedroppt (Superset, med risk).

CHANGE 1:
#18 Mood-Shift + Enrage-Puls: Color-Konstanten bei Z.83, upLight (rot, intensity 0) NACH Z.142 anlegen (CHZ erst dort definiert!); Boss-IIFE: `boss.userData.eyes=[eye1,eye2]` + crackMats-Array sammeln (Anker nach B7s eyeMat-Zeile — direkt daneben einfügen); Enrage Z.222: Augen 1.6× skalieren; Frame-Loop: Mood-Block AUSSERHALB des running-Gates nach der Fackel-Schleife (amb.color.lerp zu _ambBoss, upLight-Fade 1.2; bei Ph1 Risse-Puls 0.7+0.5*sin(t*8) + upLight-Puls). Hinweis: nach B14/#54 existiert die Fackel-Schleife in neuer Form — Anker ist 'nach dem Fackel-Flacker-Block'.

CHANGE 2:
#48 Intro-Blick: Z.183 `,introT=0,introW=0`; im Kammer-Trigger `introT=1.4;` (nach B7: neben bState="rise" einfügen); lookAt Z.367 durch Blend-Gewicht ersetzen (introW lerpt mit dt*3.5, bei introW=0 bitidentisch zum Ist-Verhalten; Ziel Boss-Kopf boss.position.x/6.5/CHZ-4). ACHTUNG Reihenfolge mit B6/#17: Shake-Jitter bleibt VOR dem neuen lookAt. shk-Kopplung des Vorschlags entfällt (Variable heisst hier shakeT — optional `shakeT=Math.max(shakeT,0.3)` im Trigger, ist durch B6 bereits gesetzt).

CHANGE 3:
Verifikation: Smoke + __nd.boss(): Kammer färbt sich rot, Blick schwenkt 1.4s zum aufsteigenden Koloss und weich zurück; Enrage: Augen gross, Risse pulsieren.
---
B14 · Performance (Licht-Pool, Rain-Loop, Instancing)
[risk:med]
touches: neon-dungeon.html: torch() Z.112-121, Flicker-Loop Z.278-279, nach Z.158, winGame Z.252-258, Ring-Spawn Z.331/335 + Cleanup Z.357, Abgrund-IIFE Z.85-96, Motes Z.280-281, Pfeiler-IIFE Z.145-148, doHit _wp
rationale: Mobile-Perf: 16 PointLights → 3er-Pool (#54 schlägt #2/#16/#31), Kristallregen ohne 10 setIntervals + Ring-Pooling (#57), Deko als InstancedMesh (#58). Nach den Feel-Batches, weil #54 die Fackel-Datenstruktur umbaut, auf der B15/#38 aufsetzt.

CHANGE 1:
#54 Licht-Pool: in torch() das per-Fackel-PointLight ersatzlos streichen, push → `{fl:fl,ph:…,lx:x,ly:y+1.4,lz:z}` (KEIN lt-Feld); nach Z.158 3 Pool-Lights (immer in der Szene, nie visible-toggeln → kein Shader-Recompile); Flicker-Schleife: fl-Scale behalten, tc.lt-Zugriff entfernen, pro Frame die 3 spielernächsten Fackeln per Distanz² (lineare 3-Minima-Suche, kein sort/Alloc) den Pool-Lights zuweisen. ACHTUNG: B8/#61-Fackeln und Boss-Ring erben das neue torch() automatisch; B13/#18-Anker ('nach Fackel-Schleife') bleibt gültig.

CHANGE 2:
#57 Kristallregen + Ring-Pool: (a) `var fallGems=[];` bei Z.183; in winGame() setInterval-Zeilen → `fallGems.push({m:vg,vy:0});` (setTimeout-Staffelung bleibt); Update-Block ZWINGEND top-level VOR dem running-Guard (78 u/s², dt-basiert); BONUS: den `boss.userData.falling`-Block aus dem !won-Guard vor Z.288 hochziehen (heute toter Code nach Sieg — deckt auch #69(1) ab, dort dann überspringen); (b) ringGeo/ringMat einmalig, Spawns via clone (per-Ring-Opacity), im Cleanup Z.357 geometry.dispose() ENTFERNEN (shared), material.dispose() behalten; Shader-Prewarm via warm-Mesh + renderer.compile(scene,camera) vor dem ersten Frame; (c) gehoistete `_wp` in doHit.

CHANGE 3:
#58 InstancedMesh: Abgrund-Kristalle (14), Motes (26, DynamicDrawUsage), Kammer-Pfeiler (14) auf je 1 InstancedMesh; auf ALLEN dreien `frustumCulled=false` (r128 cullt über Geometrie-BoundingSphere — sonst poppt Deko weg); Motes-Param-Array behalten, Matrix-Objekte gehoistet (kein Per-Frame-Alloc). ACHTUNG: B8/#61 kippt einzelne Kammer-Pfeiler (wi%4===2) — beim Instancing die Kipp-Rotation in die Instanz-Matrix übernehmen.

CHANGE 4:
Verifikation: Smoke (fängt übersehene tc.lt-Referenzen als TypeError) + Sichtprüfung: nahe Fackeln leuchten, Motes ab Start sichtbar, Regen fällt nach Sieg, kein Hitch beim ersten Stomp.
---
B15 · Secrets & Checkpoint-Feier
[risk:low]
touches: neon-dungeon.html: gem() Z.110, Level-Def nach Z.131, Z.160, Pickup Z.316, torch-push, Checkpoint-Block Z.310-311, Pool-Zuweisung der Flicker-Schleife
rationale: Entdecker-Belohnung (#59, Impact 5) und Checkpoint-Fackeln (#38). Getrennt von B8, weil #59 dieselbe Level-Region Z.131 wie #9 berührt; #38 MUSS nach B14/#54 laufen und wird an den Licht-Pool adaptiert.

CHANGE 1:
#59 Geheim-Nische: gem() um secret-Flag erweitern (`got:false,secret:!!secret`); nach der (in B8 geänderten) Z.131-Zeile: `plat(7.5,3.0,-41,2.2,2.2);gem(7.5,3.0,-41,true);gem(8.1,3.0,-41.8,true);gem(6.9,3.0,-40.4,true);torch(7.5,3.0,-41.9);` (Fackel -41.9, nicht -42.2 — sonst ausserhalb der Kante); `,secFound=false` bei Z.160; im Pickup nach gemN++ Once-Announce "🤫 Geheim-Nische entdeckt!" + sfx. Hinweis: GEM_TOTAL (B9) zählt die 3 neuen Gems automatisch mit (gems.length nach Levelbau).

CHANGE 2:
#38 (adaptiert an #54-Pool) Checkpoint-Feier: torch-push um `gl:gl,x:x,z:z,lit:false,pulse:0` erweitern (lx/lz aus #54 mitnutzen); im Checkpoint-Block Z.310-311 nach ckpt=ci: Fackeln im Radius 3 (NICHT 5 — Boss-Ring-Fackel liegt exakt 5.0 entfernt) violett färben (fl.material color/emissive + gl.material.color — M() liefert eh eigene Materialien) + pulse=1; ADAPTION: die tc.lt.color/intensity-Teile des Originals entfallen — stattdessen bei der Pool-Zuweisung in der Flicker-Schleife (#54) `poolLight.color.setHex(tc.lit?0xb080ff:0xff9a50)` setzen und den pulse-Abklinger auf die Pool-intensity addieren.

CHANGE 3:
Verifikation: Smoke + __nd.tp(7.5,-41): groundAt liefert 3.0, 3 Gems einsammelbar, Secret-Announce einmalig; Checkpoint färbt Fackeln violett.
---
B16 · Wildnis-Integration (Badge + Koloss-Quest)
[risk:low]
touches: neon-wildnis.html: BADGES Z.4113, qProg Z.3033, onStationDone Z.2035-2056, QUESTS-Ende, Save/Load Z.4019/4573/4587; neon-dungeon.html: finish-Payload Z.261
rationale: Cross-File-Anbindung: fehlendes 🏰-Abzeichen (#64) und Folge-Quest mit win-Flag (#65 — win-Flag statt Score-Schwelle, damit unabhängig von B17s Formel kein Soft-Lock entsteht). Eigener Batch, da neon-wildnis.html-Handler auch von B18/#67 berührt wird.

CHANGE 1:
#64 Badge: in neon-wildnis.html BADGES-Array nach dem gladiator-Eintrag (Z.4113): `{id:"krieger", n:"Koloss-Bezwinger", ic:"🏰", t:function(){return !!stationsDone().krieger;}},` — Trailing-Komma, vor dem W3-Quest-Kommentar. updBadges/Zähler skalieren von selbst.

CHANGE 2:
#65 Koloss-Quest: (1) neon-dungeon.html Z.261 Payload `stationPost({t:"stationDone",score:score,win:win?1:0})`; (2) wildnis qProg um koloss:0 (Z.3033); (3) onStationDone(score,win)-Signatur + `if(st.badge==="krieger"&&(win|0)===1)qProg.koloss=1;` + Listener Z.2056 win durchreichen; (4) Quest NUR ANS ENDE des QUESTS-Arrays (Save speichert Quest-Index — mittendrin einfügen verschiebt Indizes!): `{t:"Steig hinab und besiege den KOLOSS 🏰",done:…,rw:12}`; (5) Save/Load/Reset um qp.k erweitern (Z.4019/4573/4587); (6) optional qkoloss-Abzeichen + __nw.simStation(i,score,win).

CHANGE 3:
Verifikation: beide Smokes (dungeon + wildnis); im Hub __nw.simStation(dungeonIdx,90,1) → qprog().koloss===1, mit win=0 → 0.
---
B17 · Endgame-Umbau von finish(): Score, Timer, Sieges-Screen, Wildnis-Anzeige
[risk:med]
touches: neon-dungeon.html: finish() Z.260-266 (ein Owner, 4 geordnete Schritte), Z.160, Z.288, CSS #ov, Intro Z.62; liest GEM_TOTAL (B9) und fallGems-Loop (B14)
rationale: Alle finish()-Änderungen konsolidiert in EINEM Owner-Batch (Konfliktauflösung durch Koordination statt Streuung), in fester Reihenfolge. #70 gedroppt (Zeitbonus-Cap-Mathematik bricht unter #63; Timer-Motivation liefert #68). #37 gedroppt (Buttons kommen in B18/#67, Persistenz via #68). #36-Formelteil entfiel zugunsten #63.

CHANGE 1:
SCHRITT 1 — #63 Score-Formel: Z.260 `var score=gemN*8+Math.max(0,hearts)*12+(win?120:0);` inkl. des Kommentars zur /40-Cap-12-Rechnung (Sieg-Min 212, Tod-Max 56, Schwelle sauber getrennt — Quest nutzt ohnehin win-Flag aus B16).

CHANGE 2:
SCHRITT 2 — #68 Timer + Bestzeit: `,runT=0` in Z.160; `runT+=dt;` als erste Zeile im running-Guard Z.288; in finish(): fmt()-Helper, localStorage nd-best (nur bei win), Zeile an innerHTML anhängen + '🏆 NEUE BESTZEIT!'-Markup im Overlay (KEIN announce() — liegt unter #ov z-index 20) + sfx-Arpeggio. ACHTUNG B11/#21: Arpeggio VOR dem ambOn=false-Fade unkritisch, aber running muss beim sfx true sein — Reihenfolge im finish()-Kopf beachten.

CHANGE 3:
SCHRITT 3 — #69 Sieges-Screen: CSS `#ov.end{background:rgba(10,8,18,.62);backdrop-filter:blur(2px)}` (+ -webkit-Prefix); in finish() `ov.classList.add("end")`; Chips durch Stats ersetzen — 💎 via got-Zählung `gems.filter(got).length+"/"+GEM_TOTAL` (NICHT gemN/7 — Regen erhöht gemN um 10), ❤️, Score; optional hud ausblenden. Teil (1) des Vorschlags (falling-Hoist) ist durch B14/#57 erledigt — überspringen. Der Kristallregen bleibt dank #57-Loop + halbtransparentem Overlay sichtbar.

CHANGE 4:
SCHRITT 4 — #66 Wildnis-Belohnung + Lore: nach der innerHTML-Zeile `if(STATION){var cr=Math.max(1,Math.min(12,1+Math.floor(score/40)));…" → +cr 💎 fürs Wildnis-Inventar"}` (Formel synchron zu onStationDone /40 Cap 12 — Kommentar-Warnung übernehmen); Intro-<p> Z.62 mit Katakomben/KOLOSS/Doppelsprung-Lore ersetzen. Highscore-Bonus nicht anzeigen.

CHANGE 5:
Verifikation: Smoke; manuell Sieg + Tod durchspielen: Score-Aufschlüsselung, Bestzeit persistiert, Regen sichtbar hinter dem Schleier, 💎-Vorschau stimmt mit Hub-Gutschrift überein.
---
B18 · Replay-Loop & Meister-Modus (NG+)
[risk:med]
touches: neon-dungeon.html: finish()-Buttons, Init nach Z.71, Z.164, Z.222, updHud, Score-Zeile; neon-wildnis.html: Message-Handler Z.2052-2056
rationale: Letzter Batch, baut auf B16 (wildnis-Handler) und B17 (finish-Stand) auf. #67 (Impact 5) nutzt stationRematch statt blindem reload (Reward bleibt korrekt); #71 als Opt-in-NG+ mit Formel-Adaption an #63.

CHANGE 1:
#67 Rematch: in finish() startBtn immer 'Nochmal ▶' — bei STATION `stationPost({t:"stationRematch"})` + 250ms-reload-Fallback, sonst location.reload(); zweiter Button '← Wildnis' (id againBtn, Klasse big sec) nur bei STATION; CSS `#ov .sec{…}`; in neon-wildnis.html Message-Handler NACH JSON.parse und VOR dem stationDone-Check (Achtung: B16/#65 hat dort die Listener-Zeile angepasst — Einfügepunkt bleibt eindeutig): `if(d&&d.t==="stationRematch"){var ri=_stCur;closeStation();if(ri>=0)openStation(ri);return;}` — openStation setzt _stRewarded=false, Rematch-Score zählt regulär.

CHANGE 2:
#71 NG+: nach Z.71 `var NG=/[&?]ng=1/.test(location.search);`; Z.164 bossPh=(NG?1:0); Z.222 Enrage-Guard `bossHp===3&&bossPh===0` (verhindert Announce-Dublette); updHud stageTag + ' · MEISTER'; Score-Formel ADAPTIERT an B17/#63: `var score=Math.round((gemN*8+Math.max(0,hearts)*12+(win?120:0))*(NG?1.5:1));`; in finish() nur bei win&&!NG dritten Button '⚔️ Meister-Abstieg' (location.search-append &ng=1 — Stations-Redirect verifiziert unschädlich); Punkt (7) des Vorschlags (nd-best-ng) NICHT umsetzen — stattdessen prüfen, dass #68s nd-best im NG-Lauf fair bleibt (optional Bestzeit nur bei !NG schreiben). _stRewarded-Guard macht Doppel-stationDone unschädlich.

CHANGE 3:
Verifikation: Smoke mit "?station=1" UND "?station=1&ng=1"; im NG-Smoke via __nd.boss() Doppelring ab erstem Stomp prüfen; im Wildnis-Kontext: stationRematch lädt stFrame neu, zweites stationDone schreibt 💎 gut.
