# Optik-Politur 10.11.2026 (MAIN-Theme, `layout/theme.liquid`)

**Stand: LIVE seit 10.11.2026 (Lauf Exit 0, Rücklesen GLEICH, Produkt- und Startseite HTTP 200 ohne Liquid-Fehler; danach fünf weitere Seiten per `curl` geprüft: Start, Sammlung, Über uns, Warenkorb je 200, 0 Liquid-Fehler, Marker vorhanden).**

Auftrag des Besitzers: «suche nach optische verbesserungen auf webseite», «nutze gemini und codex», «mach alles fix fertig und live». Ablauf: Sucher sahen den Live-Shop als Mensch an (Desktop 1440, Handy 390), **jeder Fund wurde von einem unabhängigen Prüfer einzeln nachgestellt** (Regel per `addStyleTag` am Live-Stand, Zellen, Seitenbreite, Überlappungen vorher/nachher). Aufgenommen ist nur, was als «bestätigt» zurückkam; zwei unabhängige Prüfrunden vor dem Einspielen haben das Paket noch einmal verändert (C25 und C39, siehe `patch.mjs`).

## Was der Block tut (ein `<style>`-Block je Gruppe, jeder auf seine Vorlage begrenzt)

| Gruppe | Funde | Wirkung |
|---|---|---|
| alle Seiten | C29 | Titel der Produktkarten brechen gleichmässiger um (`text-wrap:balance`), Kartenhöhe unverändert |
| Startseite | C22 | feiner Rand an den Platten der Kategorie-Kacheln (weisse Platten werden sichtbar) |
| Sammlung | C25, C32 | Tippflächen auf dem Handy mindestens 44 px (Filtern, Reiter, Chips, Unterfilter-Pillen, Schalter «Alle N Kategorien»); Spaltenwahl am Desktop 36 px |
| Produkt | C37, C39, C42 | Zwischenüberschriften der Beschreibung kleiner als der Titel; ein einzelnes letztes Galeriebild mittig; Hintergrund hinter `object-fit:contain`-Fotos wie die Seite |
| Warenkorb | C49, C50 | Vertrauenszeilen mittig; leerer Warenkorb am Handy weniger Leerraum |
| Über uns | C57 | dunkle Box am Handy mit weniger Innenabstand (nur Abstände) |
| Rückgabe | C58 | Tabelle am Handy mit breiterer erster Spalte |
| 404 | C60 | Suchfeld ganze Breite, Platzhalter mit Auslassungspunkten |

**Bewusst nicht dabei:** C21 (Kartentitel kleiner, Geschmack), C41 (weisse Kachelhintergründe: widerspräche der Besitzervorgabe vom 25.10. «am liebsten keine weisse Hintergrund»), C46/C47/C48 (Editor «Selbst gestalten»: gehört in die Editor-Datei), C59 (Schrift «Über uns», Gestaltungsentscheid), C61 (404-Suchfeld am Handy ausblenden), C45 (Produktbilder löschen = Datenfix) und alle als «widerlegt» oder «nicht messbar» eingestuften Funde.

## Dateien

- `patch.mjs`: reine Funktionen (`anwenden`, `zuruecknehmen`, `GRUPPEN`, `BLOCK`); Anker ist das einzige `</head>`, der Block steht genau einmal davor.
- `ablauf.mjs`: Ablauf mit eingespeisten Abhängigkeiten (kein `process.exit`): Theme-Datei lesen → Sicherung → `themeFilesUpsert` → Rücklesen (bis ca. 150 s, Verzug bekannt) → Storefront-Prüfung (Produkt- und Startseite) → bei Fehler Rückweg. Laufzeit bis ca. 10 Minuten.
- `apply.mjs`: die echte Verdrahtung (Shopify Admin API 2025-01, Client-Credentials). **Trockenlauf ist Vorgabe**, `LIVE=1` schreibt, `ZURUECK=1 LIVE=1` nimmt zurück.
- `sicherung/layout__theme.liquid.vor`: Stand der Theme-Datei VOR dem Einspielen (62 394 Byte).
- `test.mjs` (35 Prüfungen, mit LiquidJS: `node dropship/optik-1011/test.mjs <pfad/zu/liquidjs>`), `apply_test.mjs` (37, Attrappe des Shops), `mutationsprobe.mjs` (73 von 73 Mutanten erkannt).

## Exit-Codes von `apply.mjs`

0 ok · 3 schon eingespielt · 4 unerwarteter Stand / Sicherung / Theme-ID / Lesefehler · 5 userErrors · 6 Rücklesen weicht ab · 7 Seitenprüfung fehlgeschlagen (Rückweg gelaufen) · 8 Rückweg fehlgeschlagen · 9 Storefront nicht messbar (403/429/5xx: Datei unverändert bzw. zurückgenommen) · 10 unerwartete Ausnahme.

## Rücknahme

```
ZURUECK=1 LIVE=1 node dropship/optik-1011/apply.mjs
```
Entfernt genau den eigenen Block (liest immer frisch, fasst nichts anderes an). Notfall von Hand: in `layout/theme.liquid` des MAIN-Themes alles von `{%- comment -%} 10.11.2026 lx-optik-1011` bis vor `</head>` löschen.

## Grenzen (ehrlich)

- **Die Tests prüfen den Regeltext** (Struktur, Bedingungen, Snapshot-Hash), nicht die Wirkung. Die Wirkung wurde in einer Browser-Replik der Live-Seiten gemessen (Prüfer, vorher/nachher); LiquidJS ist nicht Shopify-Liquid, darum wurde danach der Live-Shop abgerufen.
- **C32** kann bei ca. 750 bis 990 px Breite einen Filter in «Mehr» schieben (die Spaltenwahl ist breiter geworden). Nicht weiter behandelt.
- Die aufgeklappte Liste «Alle N Kategorien» bleibt wie sie war (C25 betrifft nur den Schalter).
- **C57** gilt nur für `ueber-uns`; die Seite `garantie` hat dieselbe Box und bleibt unverändert.
- **Ungemessen:** Safari und echtes Handy (Messung nur in Chromium), Wirkung auf Käufe oder Rankings. Wird ein anderes Theme veröffentlicht, fehlt dort der Block.
- Beim Schreiben gibt es keine Vorbedingung (`themeFilesUpsert`): ändert jemand zwischen Lesen und Schreiben dieselbe Datei, gewinnt der Schreiber; das Fenster ist klein. Das Rücklesen vergleicht mit dem erwarteten Gesamtstand und schlägt dann an.
