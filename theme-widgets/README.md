# Theme-Widgets (deploy-fertig)

Diese Dateien sind **fertig vorbereitet**, konnten aber nicht autonom live geschaltet werden:
Shopify blockiert API-Schreibzugriff auf das **MAIN/Live-Theme** (MCP-Guard), GitHub Actions
ist gesperrt, und es liegen keine Admin-Client-Creds im Env. Deshalb hier abgelegt, bis ein
Schreibweg frei ist (Theme-Editor-Upload, Admin-Token, oder Actions wieder aktiv).

## 🔎 Quick-Filter Pill-Bar (Kategorie-Schnellfilter auf Collection-Seiten)

- **`sections--luxe-quickfilter.liquid`** → im Theme als `sections/luxe-quickfilter.liquid` ablegen.
  Rendert eine horizontal scrollbare Pill-Leiste oben auf jeder Collection-/Such-Seite.
  Quelle = `linklists['main-menu']` → **selbst-synchron** mit dem Hauptmenü (kein Pflege-Aufwand).
  Markiert die aktive Kategorie. Styling im Brand-Look (scheme-1), eigene Klassen, kein CSS-Konflikt.
- **`templates--collection.json`** → ersetzt `templates/collection.json`. Identisch zum Live-Stand,
  nur ergänzt um die Sektion `quick_filter` (zwischen Überschrift und Produkt-Grid):
  `order: ["section", "quick_filter", "main"]`.

### Deploy von Hand (2 Min, Theme-Editor → Code bearbeiten)
1. `sections/luxe-quickfilter.liquid` neu anlegen, Inhalt aus `sections--luxe-quickfilter.liquid`.
2. In `templates/collection.json` die Sektion `quick_filter` + den `order`-Eintrag ergänzen
   (oder Datei-Inhalt aus `templates--collection.json` übernehmen — ist 1:1 + diese eine Sektion).
3. Speichern → erscheint sofort auf allen Collection-Seiten.

## ⭐ Bessere native Filter-Facetten (der eigentliche „Filter zum Suchen")
Die native Filter-Leiste ist im Theme bereits **aktiviert** (`enable_filtering: true`), zeigt aber nur
**Verfügbarkeit + Preis**. Mehr Facetten (Produkttyp, Farbe, Grösse, Preis, Tag-/Metafeld-Filter wie
„Vegan") gibt es **nur über die kostenlose App „Search & Discovery"** — dafür existiert KEINE Admin-API.
→ App öffnen → **Filters** → hinzufügen: Produkttyp, Preis, Verfügbarkeit, Optionen (Farbe/Grösse),
   + Tag-Filter „Eigenschaften" (Vegan/Bambus). Das ist die beste Lösung und braucht 1 User-Klick-Runde.
