# 🤝 Tempel-der-Zwei Audit — Plan (13 Batches, 63 bestätigt · Stand 2026-07-18)

Umgesetzt: B1 (Koop-Sync-Kern), B2 (deterministische Tore + Solo-Guard), B3 (Robustheit/Teardown), B7 (Signature-Juice: Feuer/Wasser-Auren + Effekt-Bursts), B8 (Rätsel-Sichtbarkeit + Raum-1-Tutorial), B10 (Onboarding-Text + Live-Timer), B4 (Warte-UX/Kamera-Glättung/Portrait-FOV), B9 (Audio: Master-Bus+Hall, Ambient, Feuer/Wasser-Noise, Tor-Fanfare, Platten-Thunk), B11 (Solo-Feel: Kamera-Punch, Floating-Joystick, Kristall-Pop+HUD-Puls, Figuren-Licht raus/Perf, Wildnis-Abzeichen krieger/partner), B12 (Score-Rebalance + Bestwert/Rekord-Feedback + partner→Wildnis-Band bondGain + getweentes Pflanzen-Wachstum). OFFEN: B5, B6, B13. Anker vor Anwendung grep-verifizieren (Zeilennummern driften).

---
B1 · Koop-Sync-Kern & Bewegungs-Bug
[risk:med]
touches: doAct+net.onMessage(act) (#0), tryMove (#2), keydown-Handler (#3), THREE-Guard nach Z.76 (#49)
rationale: Behebt zuerst die zwei Softlock-Ursachen: Empfänger wertet Act nicht mehr auf gelaggter Position aus (#0 Ergebnis-Replikation), und Diagonal-Kleben an Wänden (#2 Achsentrennung). #3 stoppt Auto-Repeat-Spam (net.send/Buzz). #49 verhindert Blackscreen bei fehlendem THREE. Alle voneinander unabhängige Regionen.

CHANGE 1:
#0 doAct→applyAct/applyById/Dispatcher, {t:act,what} senden+empfangen (Koop-Determinismus)

CHANGE 2:
#2 tryMove achsengetrenntes Gleiten via blocked()

CHANGE 3:
#3 e.repeat-Guard im keydown (kein doAct/doSwap/net.send-Spam)

CHANGE 4:
#49 THREE-Verfügbarkeits-Guard (kein schwarzer Bildschirm)
---
B2 · Deterministische Tore & Solo-Start-Guard
[risk:med]
touches: openGate+net.onMessage(gate)+gates-Array (#5), startCoop/start/keydown-Space/closed (#1), Raum-2-Geometrie (#8), CSS #hint (#40)
rationale: Weitere Koop-Divergenz-Killer: Tor-Öffnungen (v.a. Gleichklang-Tor 3) broadcasten (#5), und kein Solo-Start während laufender Koop-Suche (#1, Host-mid-game/Gast-zero). #8 macht Raum 2 zur echten verzahnten Ranken-Tür (Reihenfolge Ember→Aqua). #40 lässt Tutorial-Hints umbrechen statt clippen.

CHANGE 1:
#5 openGate(fromNet) broadcastet Tore, gates-Array, net.onMessage gate-Branch

CHANGE 2:
#1 coopWait-Flag verhindert Solo-Start während Matchmaking

CHANGE 3:
#8 vines nach -8 + Quermauer: echte Ranken-Tür, erzwungene Reihenfolge

CHANGE 4:
#40 #hint white-space:normal (kein Ellipsen-Clipping <420px)
---
B3 · Koop-Robustheit, Solo-Guards & Teardown
[risk:low]
touches: startCoop-Head/closed (#6), doSwap-Head+keydown-Swap (#20), frame gate1-Block+taughtR2 (#33), frame-rafId+pagehide (#50)
rationale: Härtet Verbindung/Zustand ohne die B2-startCoop-Region erneut anzufassen: Doppelklick-Guard + ehrliche 'kein Mitspieler'-Meldung (#6), doSwap nur bei laufendem Spiel + kein Tab-Dauer-Swap (#20), Raum-2-Kraft-Hint erst beim Betreten (#33), sauberes rAF/GL/Audio-Teardown bei pagehide (#50).

CHANGE 1:
#6 startCoop Doppel-Tap-Guard (coopBtn disabled) + everConnected-Meldung

CHANGE 2:
#20 doSwap-Guard (NETON||!running||won) + Tab-repeat-Guard

CHANGE 3:
#33 Kraft/✋-Hint beim Raum-2-Eintritt statt beim Toröffnen

CHANGE 4:
#50 pagehide-Teardown: cancelAnimationFrame + renderer/AC dispose
---
B4 · Warte-UX & Kamera-Glättung
[risk:low]
touches: startCoop-waiting/#ov-Cancel (#14), frame-Kamera lookAt+lx/lz (#16), Kamera-Setup Z.83/resize (#45), CSS+Button-touch-Listener (#43)
rationale: Nächstes startCoop-Item (#14 Abbrechen/Solo-Fallback + Late-Connect-Guard) plus solo-fühlbare Kamera: weicher Fokus-Lerp beim 🔁-Swap (#16) und Portrait-FOV-Kompensation für x=±6 (#45). #43 stellt Press-Feedback der Buttons auf iOS/Android wieder her.

CHANGE 1:
#14 Abbrechen-Button + Late-Connect-Guard (kein Solo-Hijack)

CHANGE 2:
#16 geglätteter Kamera-Fokuspunkt (kein harter lookAt-Sprung)

CHANGE 3:
#45 Portrait-FOV hält horizontale Sicht (Rätsel x=±6 sichtbar)

CHANGE 4:
#43 .pressed-Klasse spiegelt :active trotz preventDefault
---
B5 · Mobile-Kamera-Ausbau & Position-Sync
[risk:med]
touches: frame-Kamera-Block (#39), startCoop-connected+frame-Interp (#7), Kamera-Init Z.83 (#46), updHud+doSwap+start (#17)
rationale: Kamera-Block-Rewrite (#39, aspect-aware Auszoomen für getrennte Figuren — supersedet #19/#44) in eigener Batch, dazu Remote-Pos-Politur (#7 rt pro Slot, Snap, Blickrichtung), Kamera-Startposition (#46) und persistenter Solo-Aktiv-Indikator (#17).

CHANGE 1:
#39 aspect-/spread-abhängiges Auszoomen (Partner & x=±6 im Bild)

CHANGE 2:
#7 rt auf Remote-Spawn, Snap>3, Remote-Blickrichtung

CHANGE 3:
#46 Kamera-Startposition (kein Clip-Schwenk aus Rückwand)

CHANGE 4:
#17 coopTag/🔁-Button zeigen gesteuerte/Ziel-Figur
---
B6 · Ping, Partner-Pfeil & Partikel-Payoff
[risk:low]
touches: doPing/doSwap/startCoop/net.onMessage(ping) (#12), HUD-Pfeil+frame-nach-Kamera+winGame-hide (#48), Partikel-Pool+doAct(burn/grow)+frame-gem-Loop (#51)
rationale: Letztes startCoop-Item (#12 Ping-Button statt verstecktem 🔁), Offscreen-Partner-Pfeil (#48, kanonisch — supersedet #13/#18) und der pooled Partikel-Burst auf Burn/Grow (#51, die zentrale Spektakel-Lücke). Alle in disjunkten Regionen.

CHANGE 1:
#12 Koop-Ping-Button (kosmetisch, kein State) + Empfangs-Blink

CHANGE 2:
#48 Offscreen-Partner-Pfeil am Bildrand (behind-camera-korrekt)

CHANGE 3:
#51 EIN gepooltes THREE.Points-Burst-System, gefeuert auf Burn+Grow
---
B7 · Signature-Aktionen Juice
[risk:med]
touches: doAct(burn/grow)+openGate+frame-fx+fx-Array (#22), mkChar+frame-char-Aura (#21), additive Geometrie (#24)
rationale: Höchster Grafik-Impact bei niedrigem Risiko: animiertes Ranken-Verglühen & Pflanzen-Wachsen statt Instant-Toggle (#22, State bleibt instant), Feuer/Wasser-Partikel-Auren für Element-Identität (#21), Tempel-Deko (#24). Disjunkt zu B6 (anderer doAct-Zweig, andere mkChar-Region).

CHANGE 1:
#22 fx-Array: Ranken faden/schrumpfen, Pflanze tweenen, Tor-Flash (Logik instant)

CHANGE 2:
#21 Feuer/Wasser-Partikel-Auren (isFire-Flag) für Ember/Aqua

CHANGE 3:
#24 Torrahmen, Säulen, Boden-Farbzonen (rein additiv, nie in walls)
---
B8 · Rätsel-Sichtbarkeit & Kontakt-Schatten
[risk:low]
touches: doAct(syncA/B)+frame-Sync-Block (#11), frame-Platten-Block+taughtHalf/stuck1 (#32), mkChar+gem()+frame-gem-Loop (#25)
rationale: Gleichklang-Fenster sichtbar (Countdown-Puls + Aufforderung #11 in syncA/B-Zweig+Sync-Block), Raum-1-Fortschritts-/Stuck-Hints (#32 Platten-Block) und Kontakt-Schatten-Blobs (#25 mkChar+gem+frame-gem). Disjunkte Regionen.

CHANGE 1:
#11 Countdown-Puls, schrumpfender Marker, 'schlag den anderen!'-Prompt

CHANGE 2:
#32 1/2-Platten-Nudge + Stuck-Hilfe nach ~9s (NETON-aware)

CHANGE 3:
#25 Kontakt-Schatten unter Figuren & Kristallen (Pickup blendet aus)
---
B9 · Audio-Ausbau
[risk:low]
touches: sfx-connect+bus() (#27), startAmbient+start (#26), noiseSfx+doAct(burn/grow) (#28), frame-Platten-/Sync-Trigger+openGate (#29)
rationale: Alle Audio-Fundamente in eine Batch: Master-Bus mit Convolver-Hall+Compressor (#27, editiert sfx-connect), Tempel-Ambient (#26), Feuer/Wasser-noiseSfx für Signature-Momente (#28, eigener doAct-burn/grow-Zweig frei in dieser Batch) und fehlende Trigger Platten-Thunk/Sync-Fizzle/Tor-Fanfare (#29). Kein Sync-/Platten-Block-Rewrite hier.

CHANGE 1:
#27 Master-Bus + prozeduraler Convolver-Hall + Compressor

CHANGE 2:
#26 Ambient: Hall-Drone + zufällige Tropfen + Fackel-Knistern

CHANGE 3:
#28 noiseSfx: echte Feuer-/Wasser-Klangfarben (Ranken/Pflanze)

CHANGE 4:
#29 Platten-Thunk (Edge), Sync-Fizzle, Tor-Fanfare
---
B10 · Onboarding-Text & Live-Timer
[risk:low]
touches: doAct(!did) (#36), frame-Sync-Fizzle-Hint (#34), frame gate2-Hint Z.285 (#38), #ov-Chips-HTML (#35), #topBar+frame-Clock (#57)
rationale: Reine Text/Feedback-Politik: erklärender Wrong-Figure-Hint (#36, kanonisch — supersedet #9/#31/#42) im !did-Zweig, Sync-Fehlschlag lesbar (#34), modus-spezifischer Raum-3-Hint (#38), Steuerung im Intro (#35), Live-Speedrun-Timer (#57). Alle in getrennten Regionen.

CHANGE 1:
#36 Kontext-Hint bei falscher Figur statt stummem Buzz (!fromNet-Guard)

CHANGE 2:
#34 Gleichklang-Verpuffen hörbar+lesbar + Solo-Technik

CHANGE 3:
#38 Raum-3-Hint modus-spezifisch (Solo ✋🔁✋ vs. Koop absprechen)

CHANGE 4:
#35 Steuerungs-Chips + klarerer Koop-Button-Text

CHANGE 5:
#57 Live-Timer im HUD (display-only)
---
B11 · Solo-Feel, Kristall-Juice & Perf-Licht
[risk:low]
touches: openGate+doAct(burn)+frame-Kamera-Shake (#54), Joystick-IIFE (#41), gem-Pickup+gem()+updHud+CSS (#52), mkChar-Licht/torch (#56), Wildnis BADGES (#59)
rationale: Micro-Kamera-Punch (#54, letzter doAct-burn+openGate+Kamera-Shake-Append), Floating-Joystick (#41 Daumen-neben-Feld), Kristall-Pickup-Pop+HUD-Puls (#52 frame-gem/gemFn — getrennt von #25/B8), Licht-Perf (#56 mkChar-Licht raus) und Wildnis-Partner-Abzeichen (#59).

CHANGE 1:
#54 abklingender Kamera-Punch auf Tor-Fall & Ranken-Brand

CHANGE 2:
#41 Floating-Joystick (touchstart auf window, springt zum Daumen)

CHANGE 3:
#52 Kristall-Scale-Pop + Fade + HUD-Counter-Puls (self-contained)

CHANGE 4:
#56 2 Figuren-PointLights entfernt (8→6, kein Look-Verlust)

CHANGE 5:
#59 partner/krieger-Abzeichen in neon-wildnis BADGES
---
B12 · Score/Meta & Wildnis-Band-Integration
[risk:low]
touches: winGame Z.240 (#61), winGame Z.247+localStorage (#58), neon-wildnis onStationDone (+zusammen:244) (#60), doAct(grow)+frame-plant-lerp (#53)
rationale: Meta-Loop: rebalancierte Score-Formel (#61 Z.240), Bestzeit/Rekord-Feedback (#58 Z.247, nach #61), Koop-Sieg füttert nw_bond (#60, Wildnis onStationDone) und getweentes Pflanzen-Wachsen (#53, letzter doAct-grow-Zweig). #61 vor #58 gestaffelt, damit die Formel steht.

CHANGE 1:
#61 Score gewichtet Kristalle ~gleich zu Tempo

CHANGE 2:
#58 Best-Score in localStorage + Rekord-Feedback

CHANGE 3:
#60 partner-Station gibt bondGain (Wildnis-Band)

CHANGE 4:
#53 Pflanzen-Wachstum tweenen (Flags bleiben instant)
---
B13 · Perf-Refactor, neues Rätsel & Sieg-Feier
[risk:high]
touches: frame-Perf Z.279/291/293+GATES (#55), Geometrie+doAct(neuer Zweig)+frame-Block+hint (#10), openGate-celebrate+winGame-delay+frame-won (#15)
rationale: Zum Schluss die strukturell riskanten/größten Änderungen isoliert: Frame-Loop-GC-Churn beseitigen (#55), neues Halte-Platten-Rätsel (#10, höchste Desync/Softlock-Angriffsfläche), gemeinsame Feier-Momente (#15 celebrate+Sieg-Hüpfen). Nach jedem Schritt game_smoke + __zs-Durchspiel. GATES-Array von #55 mit gates-Array aus B2/#5 reconcilen.

CHANGE 1:
#55 Frame-Loop entallozieren (some/forEach/every → Index-Loops)

CHANGE 2:
#10 4. Verb 'Halte-Platte' (Latch + positionsbasierte Passage)

CHANGE 3:
#15 Funken-Pool + Sieg-Hüpfen bei Tor/Sieg (Kamera läuft weiter)
