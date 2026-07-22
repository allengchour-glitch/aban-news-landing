# 🌲 Wildnis-Audit R3 — 100-Agenten-Schwarm (Stand 2026-07-19)

95 Agenten · 39 Befunde · **38 adversarial bestätigt** (0 critical, 8 high, 17 medium, 13 low). 0 Fehlalarme (nur Duplikate + 1 Design-Tuning ausgeschlossen). Zeilennummern = Audit-Stand, VOR jedem Edit grep-verifizieren (driften).

## M1 — Quick Wins (🟢 hoher Impact, min. Risiko)
- **G1** Station-Softlock-Notausgang (3 Befunde): Escape→closeStation zuerst; ✕-Button auf #stOv; iframe onerror+Timeout; closeStation erzwingt paused=false.
- **G2** Station-Reward-Loop: `_stRewarded` Dauer-Latch → Zeit-Lock (1200ms). Folge-Runs geben wieder 💎.
- **G3** Touch-Ausschlusslisten (4 Befunde, craftMenu-Duplikat): Kamera-Dreh(3978)+Pinch(3970)-closest() an Joystick(3955) angleichen (+#craftMenu,.sysbtn,#sysRow,button,input,#invBar,#emoteBar,#minimap,#ov,#perkPick); Gate `if(!running||paused)return`.
- **G4** HUD-Overlaps ≤420px (3 CSS + Mute): @media-Block (Buttons/Stick, waveHud top, invBar left); bSound→toggleMute + Text persistiert.

## M2 — Gefühl & Sicht (🟢/🟡)
- **G5** Hurt-I-Frames (damagePlayer `if(now-_hurtT<420)return`) + Rollen-CD 1.4→0.9s.
- **G6** GLB-Gegner/Bosse versinken: yOff beim Spawn persistieren (spawnMonster/spawnGlbBoss/Drache), +（e.yOff||0) in Move-Loop (2 Stellen).
- **G7** Berge im Nebel (fog=false) + Uferring unter Gelände (groundH-Y).
- **G8** Quest/Badge: Koloss-Badge→qProg.koloss; Wave-Bounty an nights binden; Holzfäller→totalWood.

## M3 — Perf & Save (🟡/🔴) — UMGESETZT (Licht-Culling bewusst verschoben)
- **G9** (teilweise): frustumCulled=false auf allen InstancedMeshes (_tuftIM/instMesh-Helper/Kegel-Gras/petalIM → Gras-Verschwinden-Regression behoben); updSmoke SpriteMaterial-Leak (dispose, map geteilt); findNear-Drossel (~8×/s statt jeden Frame). **VERSCHOBEN: Licht-Culling** — Codebase hatte bereits 2 Licht-Perf-Pässe (Hub-Cap + _hubNight-Gating); aggressives globales Cullen riskiert Shader-Recompiles + Dorf-Atmosphäre-Regression → separat & vorsichtig.
- **G10** ✅ 🔴 Save gefällte Ressourcen: `_fellPend` VOR loadNature parken (Callback kann vor if(sv)-Block feuern) + applyFellPend() nach placeResources. **VERIFIZIERT end-to-end**: Baum gefällt→saveGame→Reload→bleibt tot (matched:1, 0 Fehler).
- **G11** ✅ THREE/WebGL-Guard vor Renderer (Klartext-Meldung statt schwarzer Screen).

## M4 — 🔴 HOCHRISIKO Koop-Determinismus (nur Koop-online relevant; User spielt solo)
- **K1** (teilweise ✅): reine Partikel-/Ambient-Kosmetik aus dem geteilten Strom → Math.random (burst() Partikel + updLively Funken/Fisch/Sternschnuppen). **Tier-KI-Wander bewusst mit K3 gebündelt** (Tiere sind Gameplay-Entities).
- **K4** ✅ Bond-Persistenz symmetrisch: bossReward ruft bondGain(2) beim Killer (sendet {t:bond,n:2} → Partner +2), bosskill-Handler addiert nicht mehr doppelt → kein nw_bond-Drift.
- **K2** ⏸ OFFEN (SAVE-MIGRATION): Weltgen-Strom invariant (natureReady→immer 2 Draws; VF von Platzierung entkoppeln). Braucht Save-Version-Bump + Zwei-Peer-/VF-Hash-Testharness. NICHT ohne Harness anfassen.
- **K3** ⏸ OFFEN (Netcode): Monster/Boss/Tier-Spawns host-autoritativ (bevorzugt) ODER dedizierter mulberry32-Strom je Welle/Nacht. Grösste Änderung, braucht Zwei-Peer-Durchspiel-Verifikation.

**Status:** K1-Kosmetik + K4 umgesetzt (safe, kein Save/Weltgen berührt). K2+K3 = eigener, sorgfältiger Koop-Härtungs-PR mit Determinismus-Harness — offen, blockiert Solo-Spieler nicht.

## Fehlalarme/Design (nicht umsetzen)
- LOW combat „Boss Nacht 2 in Welle" = Design; erst nach G5 neu bewerten.
- Duplikate: craftMenu (in G3), gefällte Ressourcen (in G10), Station-Softlock 3× (in G1).

Reihenfolge: M1(G1-4) → M2(G5-8) → M3(G9-11) → M4(K1-4, eigener PR). Jeder Milestone = Commit + Smoke + Screenshot. Save-berührend (G10,K2) mit Migrationsnotiz.
