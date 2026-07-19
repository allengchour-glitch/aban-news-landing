# 🌐 Rest-Flächen-Audit (127 Agenten · 55/56 bestätigt · Stand 2026-07-19)

Dimensionen: {"mp-lifecycle": 6, "mp-messaging": 4, "mp-callers": 4, "surv-coop": 4, "surv-buildphase": 2, "surv-balance": 4, "surv-meta": 3, "surv-perf": 5, "lp-regression": 3, "lp-coop": 6, "station-contract": 2, "fix-regression": 6, "hub-pages": 4, "wildnis-smoke2": 2}

# Umsetzungsplan — Rest-Flächen-Audit (Tech-Lead-Priorisierung)

Stand verifiziert gegen aktuellen Code: `js/mp.js` (285 Z., Zeilennummern der Befunde stimmen), `tools/game_smoke.cjs` vorhanden. Sandbox hat **keinen wss-Ausgang** → `peerEngine` (PeerJS) ist hier nicht end-to-end testbar, nur `localEngine` (`?mp=local`). Das diktiert die mp.js-Strategie: minimale Diffs + Mock-Peer-Harness statt "mal eben umbauen".

---

## 0. Duplikate & Konsolidierung (zuerst lesen)

Die drei mp.js-Audit-Läufe haben sich stark überlappt. **Keine Fehlalarme** — alle Befunde sind real, aber mehrfach gemeldet:

| Merge-ID | Identische Befunde | Kanonischer Fix |
|---|---|---|
| **D1** | [mp-lifecycle]#1 = [mp-messaging]#1 (Stale close-Handler) | Identitäts-Guard `if(c!==main)return;` |
| **D2** | [mp-lifecycle]#4 = [mp-messaging]#4 = [mp-callers]#1 (Quick re-matcht nach In-Game-Abriss) — **Triplikat** | `everConnected`-Flag |
| **D3** | [mp-lifecycle]#3 = [mp-callers]#2 (Retry-Timer ignoriert `outer.close()`) | `clearTimeout(retryT)` + `closedByUs`-Check |
| **D4** | [surv-balance]#2 = [fix-regression]#1 (P2 ohne Kontaktschaden-Cap) — **wörtlich derselbe Bug** | `P2.hurtIfr`-Biss |
| **D5** | [station-contract]#2 = [wildnis-smoke2]#2 (about:blank-onload killt 8s-Watchdog) | onload-Guard gegen about:blank |
| **D6-verwandt** | [mp-lifecycle]#2 (mp.js Give-up ohne `peer.destroy()`) und [surv-coop]#1 (survivor-eigener `hostFixed`-Mini-Host) sind **zwei verschiedene Codestellen mit demselben Muster** — getrennt fixen, nicht verwechseln |
| **Teil-Merge** | [mp-lifecycle]#5 (zweiter Gast bei pending main) + [mp-messaging]#2 (fast-Kanal-Hijack) betreffen beide den `peer.on("connection")`-Handler Z.133-137 → **ein** gemeinsamer Fix-Block |

---

## 1. Priorisierte Gruppen

### 🔴 P0 — mp.js Kern-Lifecycle (Impact: sehr hoch — jede Koop-Session stirbt daran; Risiko: hoch → EIN konservativer Batch, kleinste mögliche Diffs)

Alle vier Fixes liegen in `peerEngine` (Z.68-156), sind orthogonal und zusammen ~15 Zeilen Diff. **Ein Commit, ein gemeinsamer Test-Harness.**

**A1 — Stale-Handler-Guard (D1, high):** In `wireMain(c)` close- und error-Handler mit `if(c!==main)return;` beginnen; im data-Handler `if(c!==main&&c!==fast)return;` (verhindert, dass ein Zombie-Kanal `lastRecv` frisch hält). Analog in `wireFast`: `if(c!==fast)return;`.

**A2 — `giveUp()`-Helper (Zombie-Peer, high):** Gemeinsamer Helper `function giveUp(){ if(wd){clearInterval(wd);wd=null;} S._setStatus("closed"); try{peer.destroy();}catch(e){} }` — ersetzt die drei nackten `S._setStatus("closed")` in Z.107, Z.111 (Host-10s-Timer) und Z.115/116 (Gast-Pfade). Behebt den site-weit vergifteten Public-Raum (PUBA/OFEN/wildnis/tempel2).

**A3 — `connection`-Handler härten (merged lifecycle#5 + messaging#2, medium):**
```js
peer.on("connection", function (conn) {
  if (!isHost) return;
  if (conn.label === "fast") {
    if (!main || !main.open || conn.peer !== main.peer || (fast && fast.open)) { try{conn.close();}catch(e){} return; }
    fast = conn; wireFast(conn); return;
  }
  if (main) { try{conn.close();}catch(e){} return; } // auch pending zählt als belegt
  main = conn; wireMain(conn);
});
```
Plus im close/error von `wireMain` (hinter dem A1-Guard): beim Host `main=null` setzen, damit ein hängender Pending-Kanal den Raum nicht dauerhaft blockiert. **Achtung Wechselwirkung:** `if(main)` statt `if(main&&main.open)` funktioniert NUR zusammen mit diesem Nulling — sonst bricht der Reconnect-Pfad (lost() setzt main=null, Z.110, das bleibt korrekt).

**Verifikation P0 (Pflicht vor Push):**
1. **Mock-Peer-Harness** (neu, `tools/mp_unit.cjs`): `window.Peer` durch Stub ersetzen, der Event-Sequenzen skriptbar macht. Testfälle: (a) open → 6s Stille → lost → reconnect-open → **verspätetes close des alten Kanals** → Status muss `connected` bleiben; (b) alle drei Give-up-Pfade → Stub-`destroy()` muss gerufen sein; (c) zweite main-Connection bei pending erster → `close()` auf der zweiten; (d) fast-Connection von fremder peer-ID → abgelehnt. Das ist der einzige Weg, peerEngine ohne wss zu testen.
2. `node tools/game_smoke.cjs neon-wildnis.html neon-zusammen.html neon-survivor.html lebenspfad.html` — 0 Seitenfehler (mp.js wird überall geladen).
3. `?mp=local`-Koop-Durchspiel (localEngine unberührt, Regressions-Check der API-Oberfläche).
4. Screenshot Wildnis-Koop-Menü (UI unverändert).

### 🔴 P1 — MP.quick-Batch (Impact: hoch; Risiko: mittel — isoliert in der quick-Closure Z.254-283, fasst peerEngine nicht an)

Separater Commit NACH P0 (damit ein Revert granular bleibt).

**B1 — `everConnected` (D2, high):** In `wire()`-onStatus: `if(st==="connected")everConnected=true;` und Retry-Guard Z.267 → `if (st==="closed" && !closedByUs && !everConnected && phase < maxPhase)`. Beendet Fremder-joint-ins-laufende-Spiel, Rollen-Kipp, Seed-Resend.

**B2 — Retry-Timer stornierbar (D3, medium):** `var retryT=null;` … `retryT=setTimeout(function(){ if(!closedByUs) next(); }, 250+((Math.random()*500)|0));` und in `outer.close()`: `clearTimeout(retryT)`. Defensiv zusätzlich als erste Zeile in `wire()`: `if(closedByUs){try{sess.close();}catch(e){}return;}`.

**B3 — `outer.ready` settlen (low, gratis mitnehmbar):** Vor `outer._setStatus("closed")` im finalen Pfad und in `outer.close()`: `outer.ready.catch(function(){}); outer._rej(new Error("Kein Mitspieler gefunden"));` (idempotent, Promise-Reject nach Resolve ist no-op).

**B4 — Synchron-closed-Fix ([mp-callers]#3, medium) — quick-lokal, NICHT in mkSession:** In `wire()` direkt nach der onStatus-Registrierung: `if(sess.status==="closed"){ setTimeout(function(){ /* denselben Retry-/Weiterleitungs-Pfad anstoßen */ },0); }`. Den vorgeschlagenen **globalen** onStatus-Replay in `mkSession` bewusst NICHT (s. §2 — ändert Callback-Timing für alle Bestands-Caller).

**Verifikation P1:** Mock-Harness-Fälle: (a) connect → Abriss → outer meldet lost+closed, KEIN Re-Host; (b) close() im 250-750ms-Fenster → kein neuer Peer erzeugt; (c) `window.Peer` gelöscht → ready rejected + closed kommt an. Dann smoke auf neon-zusammen/neon-wildnis + Screenshot des Cancel-Flows.

### 🟠 P2 — neon-survivor Koop-Mini-Engine ([surv-coop], eigenständiger Code, Risiko mittel)

**C1 (high):** `coopNetStatus`: bei `closed` vor dem Nullen `try{netSess.close();}catch(e){}` — zerstört den Peer, gibt `OFEN` frei. Nach P0-A2 gilt dasselbe automatisch für mp.js-Code-Räume.
**C2 (medium):** `hostFixed` bekommt den 6s-Stille-Watchdog aus mp.js gespiegelt (`lastRecv` in `S2._emit`, 2s-Interval, Clear in close/closed).
**C3 (medium):** `sp:+S.speed.toFixed(2)` in `buildSnap`, `if(m.sp)S.speed=m.sp;` in `applySnap` — behebt das Client-Gummiband.
**C4 (low):** Early-Return in Z.2183 ergänzen: Lobby-closed → `netSess.close(); netSess=null; mpState("🔌 …")`.

**Verifikation:** smoke `neon-survivor.html`; `?mp=local`-Koop-Durchspiel (Host+Client-Tab), prüfen: Client-Figur nach Tempo-Upgrade ohne Gummiband, Host-KI-Fallback <8s nach Client-Kill; Screenshot Koop-HUD.

### 🟠 P3 — Survivor Balance-Burst-Tode ([surv-balance] + D4; Risiko niedrig, Impact hoch)

**D-a (high, D4):** P2-Biss-Cap: `P2.hurtIfr=0` beim Reset, Dekrement neben den anderen Timern, Z.1694 → `if(_p2on&&!(P2.hurtIfr>0)&&…<1.4){p2Damage(3.4);P2.hurtIfr=0.28;}`.
**D-b (high):** ebullet-Treffer Z.1702: zusätzlich `!(S.hurtIfr>0)` prüfen, nach Treffer `S.hurtIfr=0.28` — killt den 84-HP-Frame-Tod am Boss-Ring.
**D-c (medium):** Koloss: `cb_hitPlayer(dmg,heavy)` — kleine Projektile setzen `cbIfr=0.25`, Telegrafen (`heavy=true`) dürfen `cbIfr<=0.3` überschreiben.

**Verifikation:** smoke + `__hook`-Durchspiel bis Welle mit Boss (Head­less-Autoplay), HP-Verlauf loggen: kein Einzel-Frame-Drop >10 HP durch Projektile; P2 überlebt Rudel-Kontakt >5s.

### 🟠 P4 — Survivor Build-UI Touch ([surv-buildphase]; Android-Kernproblem, Risiko niedrig)

Touchstart-Handler Z.633: `if(demolishMode&&!structMenuOpen&&e.touches[0]&&e.target===renderer.domElement)` + Struktur-Menü-Buttons/smClose eigene touchstart-Handler mit `preventDefault/stopPropagation` (Muster von okBtn/cancelBtn Z.1252 kopieren). Dazu die Low-Gates: `openStructMenu` blendet cancelBtn aus; B-Key/cancelBtn prüfen `structMenuOpen`.

**Verifikation:** smoke mit Touch-Emulation (Playwright `hasTouch:true`): Struktur antippen → Menü → Upgrade-Tap → Struktur-Level steigt, KEIN "Keine Struktur getroffen"; Screenshot beider Menüs (kein Stapel).

### 🟡 P5 — Lebenspfad Bot-Regression ([lp-regression]; Risiko niedrig-mittel, klar umrissen)

**F-a (high):** `NET.bots.splice(wasIdx,1)` im Leave-Handler + robuster: in `netLaunch` `bots` aus `NET.names` ableiten (`n==="Robo 🤖"`).
**F-b (medium):** Bot-Ausnahme zentral in `netPresent`: `if(G&&G.players[i]&&G.players[i].bot)return true;` + Lobby-Variante in `netBroadcastPres`.
**F-c (low):** rollBtn-Label unconditional in `nextTurn` + Reset in `netPauseSolo`/`begin()`.

**Verifikation:** smoke `lebenspfad.html`; `?mp=local`-Runde: Robo hinzufügen → Gast leaved → Start → Robo würfelt, kein Pause-Overlay; danach Solo-Start → Label "🎡 Drehen!".

### 🟡 P6 — Lebenspfad Koop-Guards, Minimal-Variante ([lp-coop]; nur die risikoarmen Teilfixes)

Umsetzen: **roll-Kontext** (`{t:'roll',turn,round}` + Verwerfen bei Mismatch), **`beginNet`-Reset** von `_cardSeq/_pickDone/_cardOpts`, **chk-Idle-Gate** (Host sendet Checksum nur bei `phase==='idle'&&!_cardOpts&&q.length===0`), **Sync-Deferral** (rejoin/resync in `NET._pendingSync` puffern, in `updNet` an Aktionsgrenze ausführen). Diese vier sind additive Guards ohne Protokolländerung.

**Verifikation:** `?mp=local`-Runde mit 2 Tabs, Host-Tab kurz backgrounden → kein "Nicht mehr synchron"-Rollback; Rematch mit frisch geladenem Gast → erste Karte funktioniert.

### 🟢 P7 — Kleine Standalone-Fixes (Risiko minimal, je Datei ein Mini-Diff)

| Fix | Datei | Verifikation |
|---|---|---|
| stCrys-Anzeige = Wildnis-Formel (bzw. Variante ohne Zahl: „💎 Kristalle warten in der Wildnis!" — **empfohlen**, entkoppelt die Formel) | neon-flug/jump/racer | smoke + Screenshot Game-Over |
| about:blank-onload-Guard (D5) | neon-wildnis:2110 | `__hook`: Rematch mit blockierter Station-URL → 8s-Fallback feuert |
| Escape-Kette + craft/trade/perk ([wildnis-smoke2]#1) | neon-wildnis:3966 | smoke, Escape bei offenem Craft-Menü schließt Menü, kein #ov |
| `start()`-Target-Guard `closest('button,a')` | neon-racer:492 | smoke: Tap auf muteBtn startet NICHT |
| touchmove-Lenken erst ab `tchMoved` | neon-flug:395 | smoke Touch: 5px-Jitter-Tap → kein targetX-Sprung |
| Audio-Unlock: actx lazy-create + `musSync()` | neon-flug:401 | smoke Station-Modus, MUS.paused===false nach Touch |
| `nj_lvl`-Writes hinter `if(!STATION)` | neon-jump:583/563 | smoke: Station-Sieg ändert localStorage nicht |
| Wildnis-Karte `nw_best`/`level` statt `nr_save1`/`lvl` + rec-Spans für Wortbrücke/Traumhaus | spiele.html:174 | smoke + Screenshot Karten |
| WdT: Streak-Gültigkeit bei Anzeige + fluid tiles `@media(max-width:340px)` | wort-des-tages.html | smoke 320px-Viewport-Screenshot, kein h-Scroll |
| `win()` ruft setBest; Daily: recordRun skip + `dayNo` bei Start neu | neon-survivor | smoke + localStorage-Assertions im Hook |
| visibilitychange/pagehide: MUS.pause + actx.suspend + Pause; `musSync()` in beiden Pause-Toggles | neon-survivor | smoke: `page.evaluate(document.dispatchEvent visibilitychange)` → MUS.paused |
| `disposeGroup()`-Helper in removeStruct/resetBuild/removeGhost/cliClear/applySnap/cb_clearBoss | neon-survivor | smoke-Langlauf: `renderer.info.memory.geometries` stabil über 3 Runden |
| fx/rings/flashes-Caps (FX_MAX etc., Recycle statt make) + geteilte SphereGeometry/BasicMaterial | neon-survivor | smoke: Nova-Massenkill via Hook, Frame-Zeit-Log |
| ambN→amb2N-Rename (Variablenkollision) | neon-survivor:1607ff | smoke: alle Glühwürmchen bewegen sich (Pixel-Diff zweier Frames) |

---

## 2. Bewusst NICHT umsetzen (Risiko > Nutzen)

1. **send()-Outbox in mp.js ([mp-messaging]#3).** Gepufferte "zuverlässige" Events nach Reconnect nachzuspielen ist gefährlicher als der Drop: ein 8s alter `stationDone`/`wave`/`gameOver` kann in einen längst weitergelaufenen Spielzustand einschlagen (Doppel-Anwendung, Geister-GameOver). Die Spiele haben eigene Resync-Mechanismen (Survivor-Snapshots, Lebenspfad-Resync/Checksum), die den Zustand ohnehin reparieren. Nachrüsten nur, falls nach P0/P1 konkrete Desync-Reports bleiben — dann mit Message-TTL.
2. **Globaler onStatus-Replay in `mkSession` ([mp-callers]#3, Fix-Variante A).** Ändert das Timing-Verhalten für ALLE Bestands-Caller (Handler feuern plötzlich asynchron nach Registrierung) — nicht überschaubar ohne Voll-Audit aller onStatus-Nutzer. Stattdessen quick-lokaler Fix (P1-B4), der dasselbe Symptom behebt.
3. **`removeAllListeners()` auf Alt-Connections ([mp-messaging]#1, Zusatzvorschlag).** Nach dem Identitäts-Guard (A1) funktional überflüssig; PeerJS-API-Abhängigkeit (off/removeAllListeners-Verfügbarkeit je Version) wäre reines Zusatzrisiko.
4. **Host-autoritatives Echo-Protokoll für Lebenspfad ([lp-coop]#1, Voll-Fix).** Das ist ein Redesign der Lockstep-Schicht (Sender pusht nicht mehr lokal, Host stempelt Aktions-Nrn., Echo an alle) — bei einem 4400-Zeilen-Spiel mit AFK-/Bot-/Rejoin-Sonderpfaden nicht ohne mehrtägige Testkampagne vertretbar. Die P6-Guards entschärfen die praktischen Auslöser (AFK-Race, Duplikat-roll); das theoretische Pick-Race-Restfenster (~Sekundenbruchteil, zwei Menschen tippen exakt gleichzeitig für denselben Zug) fängt der vorhandene 12s-Checksum-Resync ab. Dito **meetact-Kontext-Bindung** (rein kosmetisch) — nur `window._lpMeet=null` in nextTurn als 1-Zeiler mitnehmen.
5. **Biss-Schaden nach Gegnertyp differenzieren ([surv-balance]#3).** Gameplay-Tuning, kein Bug — Zahlenänderungen ohne Playtesting erzeugen erfahrungsgemäß neue Beschwerden ("Boss zu hart"). Nach P3 (Burst-Tode weg) separat als Balance-Session mit User-Feedback.
6. **Client-Spiegel-Pooling/Diffing statt Full-Rebuild ([surv-perf]#2, „besser noch")**. Nur der dispose-Teil kommt rein (P7); das Diffing ist eine Optimierung mit eigenem Desync-Risiko (Signatur- vs. Ist-Zustand).
7. **Per-Frame-DOM-Write-Guards ([surv-perf]#4)** und **Racer steerId-Adoption ([fix-regression]#6).** Mikro-Optimierung bzw. seltener Edge-Case mit Multi-Touch-Regressionrisiko; hinter alles andere zurückgestellt.

---

## 3. Ablauf & Absicherung

- **Reihenfolge = P0 → P1 → P2 → … , je Gruppe ein Commit** auf frischem Branch von `origin/main`, damit jeder mp.js-Schritt einzeln revertbar ist.
- **Vor P0:** `tools/mp_unit.cjs` (Mock-Peer-Harness) bauen und die Fehlersequenzen ERST gegen den IST-Code laufen lassen (müssen rot sein = Befunde reproduziert), dann fixen (grün). Das ersetzt den fehlenden wss-Integrationstest.
- **Nach jeder Gruppe:** `node tools/game_smoke.cjs` über alle berührten Seiten (0 Pagerrors), `__hook`-Durchspiel für Wildnis/Stationen/Survivor, Screenshots der berührten UI-Zustände.
- **Abschluss:** Voll-Smoke über alle Spiele + ein `?mp=local`-Koop-Durchspiel Wildnis→Station→stationDone→Rematch (deckt postMessage-Vertrag und D5 ab).
- **Restrisiko ehrlich benannt:** peerEngine-Änderungen sind erst mit einem echten 2-Geräte-Test (User, Android/Brave, echter PeerJS-Broker) final bestätigt — im Übergabetext als einziger nötiger User-Check ausweisen.
