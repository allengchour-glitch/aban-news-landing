# 🎯 Neon Drift — Game Design (vollwertig, süchtig machend)

> Ziel: kein billiges Spiel — flüssig, juicy, „nur noch eine Runde". Arcade-Roguelite,
> leicht zu lernen, schwer zu meistern. Ein Codebase (Godot) → Steam + Mobile + Web.

## Kern-Loop (das Süchtig-Mach-Prinzip)
Endloser 3D-Flug durch einen Neon-Canyon. Ausweichen + Orbs sammeln → Tempo steigt →
Tod → **sofortiger** Neustart (1 Tastendruck) → „diesmal weiter". Kurze Runden, klarer Fortschritt.

## Was es „krass" macht (Polish-Backlog, lokaler Claude mit GPU)
1. **Juice:** Screenshake, Hit-Stop, Partikel-Bursts, Trail, Bloom/Glow, Kamera-FOV-Kick bei Speed.
2. **Sound/Musik:** dynamischer Beat (schneller bei Tempo), Pickup-/Crash-SFX, Combo-Pings.
3. **Roguelite-Upgrades:** alle paar Orbs ein Wahl-Upgrade (Magnet, Schild, Slow-Mo, Doppel-Orb, Phase) → Build-Vielfalt = Wiederspielwert.
4. **Progression:** Highscore + Level/Distanz, freischaltbare Gleiter-Skins, tägliche Challenge (Seed des Tages → teilbar).
5. **Gefühl:** straffe Steuerung (lerp + Tilt), Near-Miss-Bonus (knapp vorbei = Punkte + „Whoosh").
6. **Modelle:** Low-Poly-Gleiter/Hindernisse in **Blender** (auf dem GPU-Laptop), Glow-Shader.
7. **Bosse/Events:** alle X Distanz ein Muster-Abschnitt (Tunnel, Tor-Wellen) für Rhythmuswechsel.

## Steuerung (alle Plattformen)
- Desktop: ← → / A D / Maus. Mobile: Finger ziehen + optional Gyro/Tilt. Gamepad: Stick.

## Monetarisierung (ehrlich)
- **Steam:** Premium (z. B. 2–5 €) ODER gratis + kosmetische Skins. Wishlist-Seite zuerst.
- **Mobile:** gratis + Reward-Ad für Continue/Skin + No-Ads-IAP (kein Pay-to-Win).
- **Web:** gratis auf abannews.com → Funnel (Newsletter) + itch.io.
- Cross-Promo: aban-Branding dezent (Logo im Menü), Link zur Website.

## Umfang in Phasen (damit es fertig + bug-frei wird)
- **P1 (Foundation, fertig):** Loop, Steuerung, Spawner, Score, Restart. ✅
- **P2:** Juice + Sound + Menü/HUD + Highscore-Persistenz + Pause.
- **P3:** Roguelite-Upgrades + Skins + tägliche Challenge.
- **P4:** Blender-Modelle + Shader + Settings + Lokalisierung (DE/EN).
- **P5:** Export-Polish + Store-Assets (Trailer/Screens) + Wishlist → Release.

## Tech-Notizen
- Foundation ist code-only (kein Asset-Import-Risiko). Ab P4 echte Modelle.
- Performance-Budget: 60 fps auf Mid-Range + Mobile (Godot leicht). Objekt-Pooling statt queue_free-Spam (P2).
- Determinismus für „tägliche Challenge": Seed aus Datum (wie der Web-Prototyp).
