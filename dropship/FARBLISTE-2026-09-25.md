# Farbliste ohne Farbwahl (25.09.2026)

## GEMESSEN
- Anlass: Ratgeber «Yogamatte reinigen» — drei Kandidaten-Matten versprechen «Verfügbare Farben: Violett, Grau, Ice Ink Blau»
  bzw. «Farben: Violett, Mintblau, …», haben aber EINE Variante. Der Wahlversprechen-Wächter kannte seit 24.09. die
  Doppelpunkt-Form für Grössen, nicht für Farben.
- Voll-Export (30'190 aktive Produkte mit einer Variante): **951** mit Farbliste im Doppelpunkt-Format.
- Nach Ausnahmen: **571** echte Wahlversprechen. Ausgenommen (46 + Kontext): Anzahl direkt vor «Farben» («Neun Farben:»
  an einer Lidschatten-Palette, «12 verschiedenen Farben:» Eyeliner-Set) und blosse «Farben:» an Set-/Paletten-Titeln.
  «Verfügbare Farben:» gilt auch an einem Set als Wahl (Stahlbox-Set, Badetuch-Set).
- Simulation an 25 Live-Texten: 24× genau eine reine Listenzeile weg («• Verfügbare Farben: Schwarz, Weiss»), 1× unverändert.

## GETAN
- `wahlversprechen.py`: Farbliste in WAHL + `farbinhalt()` (Anzahl davor / Set-Titel) in Kandidatensuche und Bereinigung.
- `klassen_kontrolle.py`: dieselbe Form in der Klasse «Auswahl-Versprechen bei EINER Variante» → täglich in der Arbeitsliste.
- Scharfer Lauf über die 571 (Text-Sperre, Bericht separat) — Ergebnis unten.
