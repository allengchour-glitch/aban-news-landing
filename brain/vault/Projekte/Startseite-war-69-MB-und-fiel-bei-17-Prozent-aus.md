---
tags: [projekt]
quelle: Messung 2026-09-12, tools/shop_startseite.mjs
gelernt: 2026-09-12
---
# Startseite war 6,9 MB und fiel bei 17 Prozent aus

Gemessen mit `tools/shop_startseite.mjs` (12 Abrufe je Adresse, Gegenprobe eingebaut):

| Adresse | Erfolg | Fehlerquote | Groesse |
|---|---|---|---|
| **Startseite** | 10/12 | **17 % HTTP 500** | **6,91 MB** |
| Produktseite | 12/12 | 0 % | 0,55 MB |
| Collection sommer | 12/12 | 0 % | 1,13 MB |

Gleiche Infrastruktur, also ist es DIESE Seite. Die Fehlerseite ist Shopifys eigene
„Something went wrong" — sie erscheint, wenn das Rendern die Grenzen sprengt.

**Ursache gezaehlt:** 17 Produktreihen, und jede rendert **72 Produktlinks bei 12
verschiedenen Produkten** — jedes Produkt **sechsmal** (Haeufigkeit je Link nachgezaehlt,
Ergebnis `[6]`). Gesamt: 1108 Produktlinks, 1130 Bilder, 1896 eingebettete SVGs.

**Der Treffer, der das mit Verkaeufen verbindet:** alle drei nachprueflich verkauften Produkte
liegen in `geschenke-unter-50-franken` bzw. `bestseller-unter-50`. **Keine** der 17 Reihen nutzt
diese Collections. Die Startseite bewirbt 17 Kategorien, aber nicht die Preisklasse, aus der
jeder echte Verkauf kam.

**Gebaut:** `automation/homepage_slim.mjs` — 17 Reihen auf 4, erste Reihe die bewiesene
Verkaufsklasse, Vorlage 139 497 → 51 475 B, idempotent, fuenf Selbsttests. Schreibt nie in das
aktive Theme, sondern in eine Kopie. **Veroeffentlichen muss ein Mensch** (ein Klick).

Bericht mit allen Zahlen: `dropship/VERKAEUFE-BEFUND-2026-09-12.md`

Verwandt: [[Hypothese-mit-Datum]]
