# 🎮 Spiele-Politur — Fortschritt (aus 40-Agent-Audit wf_e5051690-380)

> Gedächtnis für den autonomen P1-Politur-Loop. Voll-Audit:
> `/tmp/claude-0/-home-user-aban-news-landing/69200068-b54e-580c-bd4c-93f8719c1ace/tasks/wqknyujvw.output`
> **Regel:** jeden Befund vor dem Anwenden gegen echten Code verifizieren; nur verifizierte Fixe committen (smoke = 0 Fehler).

## ✅ P0-Bugs erledigt (PR #1585 + #1545)
- neon-colossus: Solo-Soft-Lock (checkGameOver), Koop-Boss-HP ×1.8, Koop-Button auf Touch aus, P2-Leiste-im-Solo.
- neon-flug: localStorage-Guards (lsGet/lsSet), Speed-Cap 2.6.
- neon-survivor: Endboss-Pool-Flags, Esc/P-Level-up-Soft-Lock, Touch-Ability-Button ⚡.
- neon-jump: Ziel-Sockel-Abschluss, touchcancel-Tastenklemmer.
- neon-racer: Kollisions-Tunneling (z-Fenster ~speed*dt), touchstart schluckt Over-Taps.

## ✅ P1-Politur erledigt (Branch claude/games-qa-fixes)
- **neon-flug:** Partikel (trail+burst) auf AdditiveBlending+depthWrite:false; Bloom-Composite auf Exposure-Tonemap (`1-exp(-col*1.2)`) → Farbe statt Weiß-Clip.
- **neon-racer:** `burst()`-Stub → echter Screenshake; Kollisions-Screenshake (off-track .3 / boost .25 / crash .7 / gameOver 1.4); Kamera-Jitter+Decay; Ship-Glow (sGlow) flasht grün (Boost)/rot (Treffer), lerpt zurück zu Cyan.
- **neon-jump:** Landing-Squash bei hartem Fall (vy<-11 → P.sq); Kamera-Shake (respawn .55 / win .4 / lose .6) + Decay; keyL/keyR bei respawn geleert.
- **neon-survivor:** Hitstop-System (dt*0.12) bei Boss-Kill (.07) + Evolution (.1); Gegner-Speed gedeckelt auf 8.4 (fast/chaser skalierten über Spieler-Tempo 9 → Kiten brach spät).
- **wortbruecke:** Shake-Animation bei falschem Tipp (Input); Solve-Pop-Animation auf `.solved .big` (self-firing).
- **wort-des-tages:** Win-Dance — gestaffelter Bounce (translateY) auf der Gewinnzeile, im 900ms-Fenster gestartet (kollidiert nicht mit `.pop`-Scale).

- **neon-flug (Touch):** Tap lenkt jetzt (touchstart→setTarget), Dash nur bei kurzem Tipp (<200ms, <12px, touchend); Crash-Shake/Flash 340ms sichtbar vor Game-Over-Overlay (Guard !running).
- **neon-racer:** Maus-Steuerung verdrahtet (mousemove→touchX; war im Start-Hinweis versprochen).

- **neon-survivor:** relatives Touch-Joystick (Delta zum Aufsetzpunkt, 12px Totzone) statt Absolut-Position; ⏸-Pause-Button (pointer:coarse, respektiert Level-up-Guard).
- **neon-jump:** Touch-Zonen sichtbar (◀ ▶ ⤴ SPRUNG als ::after-Glyphen, aktiv heller).
- **neon-racer:** BREMSE-Touch-Button (links unten, pointer:coarse, stopPropagation gegen Lenk-Übernahme).

## ⏳ P1 offen (nächste Loop-Runden)
- **neon-colossus:** Start-Screen-Text auf Touch anpassen (`enableTouch()` eager); (hitstop optional — slowmo deckt Juice schon ab).
- **wort-des-tages:** Kachel-Flip-Reveal + Win-Dance (innerhalb der 900ms-Timeout, nicht mit `.pop` kollidieren); großes Gäste-Wörterbuch für Rate-Eingaben (aktuell nur 88-Antworten-Liste erlaubt) — größerer Aufwand.
- **wortbruecke:** Shake bei falschem Tipp; Solve-Pop-Animation.

## Zielbranches
- neon-colossus-Politur → `claude/neon-colossus`
- alle anderen Spiele → `claude/games-qa-fixes`
