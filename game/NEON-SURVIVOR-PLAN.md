# 🛡️ Neon Survivor — DAS eine Spiel (Plan & Roadmap)

> **Entscheidung (User, 2026-06-30): EIN Spiel, nicht 10.000.** Neon Survivor wird das eine,
> vollständige, gute Spiel. Alle anderen Web-Spiele ruhen (bleiben live, kein Ausbau mehr).
> **Erst informieren, kein Zufalls-Gefrickel** → dieser Plan ist die Richtung. Schritt für Schritt,
> jeder Schritt selbst per Headless-Screenshot verifiziert.

## Was es schon hat (Basis)
3D-Survivor (Vampire-Survivors-Stil): Bewegung, Auto-Combat, 3 Gegner-Typen, **4 Waffen** (Bolt/Nova/
Ketten-Blitz/Orbit) mit je 6 Leveln, **7 Passive**, Level-up-Build-Wahl, Boss-Wellen, **4 Map-Themes**,
**Bloom-Glow**, Combat-Juice (Treffer-Flash, Schadens-Vignette), Tages-Challenge, Rekord, Pause, Mute, Touch.

## Was zu einem VOLLSTÄNDIGEN Spiel fehlt (Recherche-belegt)
Quellen: VS-Wiki (Evolution), GameRant/BulletHaven (Progression), Brotato (Content-Masse).

1. **Run-Struktur + Sieg-Bedingung** — aktuell endlos. Ein *Spiel* hat ein Ende.
2. **Meta-Progression** — permanente Unlocks/Upgrades zwischen Runs (Herz des Roguelite). Fehlt ganz.
3. **Waffen-Evolutionen** — Waffe max + passendes Passiv → Super-Waffe (Signatur-Tiefe).
4. **Content-Masse** — mehr Gegner + echte Boss-Muster, Charaktere, evtl. 2. Stage.
5. **Audio/Balance/Feinschliff**.

## Roadmap (Reihenfolge = Wirkung)

### P1 — Run-Struktur + Endboss (macht es zum *Spiel*) ⭐ ZUERST
- Fester Run (z. B. **15 Min**), Schwierigkeit in klaren **Phasen/Wellen** (alle ~3 Min härter + Ansage).
- **Mini-Boss** je Phase, **ENDBOSS** am Ende → **Sieg-Screen** („Durchgespielt!"). Verlieren = Game Over.
- HUD-Timer zeigt Fortschritt zum Ziel. Ergebnis: ein beatbares Spiel mit Ziel, nicht nur Highscore.

### P2 — Meta-Progression (Wiederspiel-Herz)
- **Kerne** (Währung) je Run aus Kills/Zeit → bleiben permanent (localStorage).
- **Start-Menü-Shop:** permanente Upgrades (Start-HP, Start-Schaden, Tempo, Magnet, Glück …) + **Unlock neuer
  Waffen/Charaktere** gegen Kerne. Jeder Run macht den nächsten stärker → „nur noch einer".

### P3 — Waffen-Evolutionen (Signatur-Tiefe)
- Waffe auf **Max-Level** + passendes **Passiv** + **Boss-Truhe** (Drop nach Mini-Boss) → **evolvierte Waffe**
  (z. B. Bolt+Multishot → „Sturm-Salve", Nova+Wirkung → „Supernova", Orbit+Tempo → „Klingen-Sturm",
  Ketten-Blitz+Schaden → „Gewitter"). Macht Builds zu *Zielen*.

### P4 — Content-Masse
- 6–8 Gegner-Typen mit Verhalten (Schwarm/Tank/Schütze/Splitter), echte **Boss-Muster** (Ringe/Sprünge).
- **3–4 Charaktere** mit anderer Start-Waffe + Stat-Profil (Brotato-Stil) = Build-Variety ab Sekunde 0.
- Optional 2. Stage/Map mit eigenem Gegner-Mix.

### P5 — Feinschliff
- Musik-Loop (WebAudio/Suno), UI-Politur, Balance-Pässe, Performance, evtl. echte Modelle (Meshy) statt Boxen.

## Definition-of-Done (wann ist es „fertig & gut")
- [ ] Beatbar (Endboss + Sieg-Screen) · [ ] Meta-Progression spürbar · [ ] ≥3 Waffen-Evolutionen ·
- [ ] ≥3 Charaktere · [ ] ≥6 Gegner + 2 echte Bosse · [ ] Audio komplett · [ ] 10-Min-Session bugfrei ·
- [ ] Optik konsistent (Bloom) · [ ] Balance fair (lernbar, schwer zu meistern).

## Arbeitsweise
- **Cloud-Claude (ich):** baue + verifiziere alles selbst im Headless-Chromium (`tools/game_smoke.cjs` + Screenshots).
- Ein Schritt = ein PR, gemergt erst nach grünem Screenshot/0-Fehler. Kein neues Spiel mehr — nur dieses besser.
