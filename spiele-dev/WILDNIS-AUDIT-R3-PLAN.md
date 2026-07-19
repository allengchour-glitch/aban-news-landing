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

## M3 — Perf & Save (🟡/🔴)
- **G9** Perf: Licht-Budget+Culling (mobil max4, nur Nacht/Radius); updSmoke-SpriteLeak dispose/Pool; findNear drosseln; frustumCulled=false auf InstancedMeshes (_tuftIM 504 + 656/1173/1195/1208/1240).
- **G10** 🔴 Save: gefällte Ressourcen kehren zurück (Race) → `_fellPend` sync parken, Markier-Schleife in loadNature-Callback nach placeResources (wie _gdPend).
- **G11** THREE/WebGL-Guard vor Renderer (Klartext statt schwarz).

## M4 — 🔴 HOCHRISIKO Koop-Determinismus (eigener PR, Testharness zuerst)
- **K1** Kosmetik aus geteiltem Strom (updLively/burst/Tier-KI → Math.random).
- **K2** Weltgen-Strom invariant (natureReady→immer 2 Draws; VF von Platzierung entkoppeln) — SAVE-MIGRATION.
- **K3** Spawns host-autoritativ ODER dedizierter mulberry32-Strom (Monster/Boss/Tier).
- **K4** Bond-Persistenz symmetrisch (bossReward bondGain beim Killer, bosskill-Handler entdoppeln).

## Fehlalarme/Design (nicht umsetzen)
- LOW combat „Boss Nacht 2 in Welle" = Design; erst nach G5 neu bewerten.
- Duplikate: craftMenu (in G3), gefällte Ressourcen (in G10), Station-Softlock 3× (in G1).

Reihenfolge: M1(G1-4) → M2(G5-8) → M3(G9-11) → M4(K1-4, eigener PR). Jeder Milestone = Commit + Smoke + Screenshot. Save-berührend (G10,K2) mit Migrationsnotiz.
