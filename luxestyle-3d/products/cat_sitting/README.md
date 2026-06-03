# Katze – sitting (Farbe als STL)

Mehrfarbdruck mit reinen STL-Dateien. Eine STL pro Farbzone, alle im selben
Koordinatensystem – sie passen deckungsgleich übereinander.

## Dateien
- `color_koerper.stl` – Körper (die Hauptfarbe)
- `color_weiss.stl` – Brust, Bauch und Pfoten
- `color_nase.stl` – Nase (winzig)
- `cat_sitting_einfarbig.stl` – komplettes Modell in einer Farbe (Fallback)

## So druckst du es (Bambu Studio / AMS)
1. Alle drei `color_*.stl` zusammen importieren.
2. Beim Import „Als ein Objekt zusammenfügen?" mit **Ja** bestätigen
   (sonst manuell: alle markieren → Rechtsklick → „Teile zu einem Objekt zusammenfügen").
3. Jedem Teil ein Filament zuweisen – fertig, kein Bemalen.

## Filament je nach Variante
| Teil | Grau-Tabby | Ingwer | Tuxedo |
|------|-----------|--------|--------|
| koerper | Grau | Orange | Schwarz |
| weiss | Weiß | Weiß | Weiß |
| nase | Rosa | Rosa | Rosa |

Die Geometrie ist für alle Varianten gleich – du wechselst nur das Körper-Filament.

> Hinweis: STL kann keine Farbe speichern. Die Aufteilung in mehrere STLs ist der
> Standardweg für Mehrfarbdruck. Wer es bequemer mag, nimmt die fertige
> `.3mf` (Zonen schon zugeordnet) oder das texturierte `.glb` (Vollfarbe).
