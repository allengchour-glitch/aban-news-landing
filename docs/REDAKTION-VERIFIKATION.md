# Redaktions-Verifikation — ehrlicher Faktencheck der KI-Entwürfe

Viele Radar-Daten tragen `[Redaktion: prüfen]` — ein bewusster Marker: nicht geprüft.
Dieses Doc hält fest, **wie** geprüft wird und **was** schon erledigt ist.

## Prinzip (was geprüft wird — und was nicht)
- **Geprüft & belegbar:** dauerhafte Fakten — existiert das Tool, stimmt die offizielle
  URL, **Firmensitz/Herkunft** (→ EU-/DACH-Flag). Quelle: offizielle Seite / Impressum /
  etablierte Profile. Nur dann wird der Marker gehoben.
- **Bleibt `null`/ungeprüft:** Preise (`preis_eur`) und Wertungen (`worth_it_score`).
  Die ändern sich laufend bzw. sind subjektiv — die füllt ein Mensch bewusst, nicht
  „per Websuche behauptet". Lieber ehrlich leer als geschönt.

## Erledigt
- **musik-radar (18 Tools):** Firmensitze verifiziert, EU-Flags korrigiert, `aban_note`
  bereinigt (Marker entfernt). Korrekturen u. a.:
  - Endel → Berlin (Endel Sound GmbH) → EU/DACH ✓
  - LALAL.AI → OmniSale GmbH, Zug/Schweiz → DACH, DSGVO-adäquat ✓
  - LANDR → Montreal/Kanada → nicht EU
  - AIVA (Luxemburg) bestätigt; Stable Audio → Stability AI (UK), nicht EU
  - Quellen: jeweilige Firmen-/Profilseiten (siehe Commit-Recherche).

## Offen (gleicher Ansatz, nächste Radars)
voice-, video-, chatbot-, buchhaltung-, newsletter-, automatisierung-, dropshipping-radar
+ `data/tools.json`. Pro Radar: Herkunft/URL prüfen, EU-Flag setzen, Marker heben;
Preise/Scores bewusst `null` lassen.

> Merksatz: Verifikation heißt **belegbare, dauerhafte Fakten** bestätigen — nicht
> volatile Zahlen erfinden. Genau das ist der aban-Unterschied.
