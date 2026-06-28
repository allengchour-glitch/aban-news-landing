# 🎛️ UX- & Layout-Guide (Genre-Konventionen → eigenes UI)

> Basiert auf **etablierten Genre-Konventionen** (frei nutzbar), nicht auf dem Kopieren eines
> konkreten Spiels. Ziel: vertraut + sofort lesbar + professionell — im **eigenen Neon-Stil**.
> Quelle: HUD/UX-Best-Practices (gameuidatabase, gamedesignskills, polydin u. a.).

## Grundprinzipien
- **Minimalistisch:** HUD nur das Nötigste, stört die Action nie.
- **Lesbarkeit zuerst:** klare Schrift, vertraute Icons, hoher Kontrast.
- **Vitales an die Ränder/Ecken** — nicht in die Mitte (dort ist die Action).
- **Visuelle Hierarchie:** HP/Wichtiges grösser & heller; Nebensächliches dezent.

## HUD-Platzierung (unser Spiel)
- **Oben links:** Level + XP-Leiste (Fortschritt).
- **Oben Mitte/oben:** Timer + Kills (Run-Status).
- **Unten/über Spieler:** HP-Leiste, **rot** (Konvention) mit klarer Zahl/Gradient — sofort lesbar.
- **Aktive Upgrades:** kleine Icon-Reihe (Schild/Magnet/x2) oben — Status auf einen Blick.
- **Mitte:** frei für Gameplay; nur kurze Alerts („Level Up!", „Game Over") zentriert, dezent.

## Farb-Konventionen (vertraut)
- **HP = rot**, **XP/Energie = cyan/blau**, **Erfolg/Pickup = gold/grün**. Innerhalb der Neon-Palette.

## Menü-Struktur (Standard)
- **Startscreen:** Titel → [Start] [Tages-Challenge] [Einstellungen]. Sauber, ein klarer Call-to-Action.
- **Pause:** [Weiter] [Neustart] [Einstellungen] [Beenden].
- **Einstellungen:** Lautstärke (Musik/SFX getrennt), Grafik (Qualität), Sprache (DE/EN), Steuerung.
- **Game-Over:** Score + Rekord + [Nochmal] + [Teilen] + Newsletter-Hinweis.

## Upgrade-Screen (Roguelite-Konvention)
- **3 Karten** nebeneinander/untereinander, je: Icon + Name + 1 Zeile Wirkung. Klick **oder** Taste 1/2/3.
- Spielfluss pausiert; klare Hervorhebung der Auswahl. Kurz & entscheidbar in 2 Sek.

## Mobile/Accessibility
- Touch-Steuerung (Finger ziehen), grosse Tap-Ziele. Skalierbares UI, hoher Kontrast, optional Farbenblind-Modus.

## Was NICHT gemacht wird
- **Kein** 1:1-Kopieren von Layout/Art/Assets eines konkreten Spiels (Urheberrecht). Wir nutzen nur die
  allgemeinen Konventionen oben und gestalten sie im **eigenen** Neon-Stil (Farben, Schrift, Shapes).

## Inspiration sammeln (legal)
- Genre-Konventionen anschauen (z. B. gameuidatabase.com) → **Muster** übernehmen (Platzierung, Hierarchie),
  **nicht** Pixel/Design. Eigene Variante bauen.
