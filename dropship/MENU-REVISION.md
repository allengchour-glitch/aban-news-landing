# Menü-Revision — Mode-Unterkategorien ergänzt (2026-05-31)

## Problem (User)
„Wenn ich Mode drücke, wo sind da Unterkategorien Kleider?" — Stimmte: das Hauptmenü unter
„👕 Mode + Accessoires" zeigte nur Wallets · Gürtel · Caps & Hüte. Kleider/Damen-/Herren-Mode
fehlten komplett (Menü stammte aus der Zeit vor dem grossen Mode-Push).

## Gemacht (Menu `main-menu`, ID 310224093569 — via menuUpdate)
- **👕 Mode + Accessoires** → jetzt: Kleider · Damen-Mode · Herren-Mode · Taschen · Wallets · Gürtel · Caps & Hüte
- **🏃 Sport + Fitness** → jetzt: Fitness · Yoga (vorher nur Yoga)
- **✈️ Reise** → jetzt: Reise-Gadgets · Reisen & Sommer (vorher leer)
- Alle übrigen Kategorien unverändert (hatten schon saubere Unterpunkte).

## Neue Unterkollektionen (Smart, tag-basiert; saubere Handles)
- `kleider` (688013803905) — tag:kleid — 13 aktiv
- `herren-mode-sub` (688013836673) — tag:herren-mode — nur 1 aktiv (Rest archiviert!) ⚠️
- `taschen-sub` (688013869441) — tag:taschen OR damen-taschen — 3 aktiv
- `fitness-sub` (688013902209) — tag:fitness — 7 aktiv

## Wichtiger Befund (offen, separat zu klären)
Shop hat **439 aktive** vs **4.915 archivierte** Produkte. Die archivierten sind grossteils
bildlose KI-/Phantom-Produkte (bewusst versteckt). Daher sind einige neue Unterkategorien dünn
(v.a. Herren-Mode = 1, Taschen = 3). User-Entscheidung 2026-05-31: NICHT die alten Junk
reaktivieren; dünne Kategorien später mit NEUEN echten CJ-Produkten füllen (separat).

## Menü-Verhalten (galaxus-kompakt)
Separat: `drawer_accordion` im Live-Theme auf true setzen (1 Klick im Customizer) — siehe
`dropship/MENU-KOMPAKT-GALAXUS.md`. Dann erscheinen diese Unterpunkte erst beim Antippen.
