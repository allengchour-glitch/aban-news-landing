# 🛒 Rund 60 % der aktiven Produkte sind aus Google Shopping ausgeschlossen (gemessen 04.10.2026)

> Gefunden beim Preisvergleich, nicht gesucht. **Betrifft den Kanal, für den der User eine Google-Rechnung hat.**

## Gemessen

Jedes Produkt trägt ein Metafeld der Feed-App (`mm-google-shopping`). Bei vielen steht darin
`excluded_destination = ["Shopping_ads"]` — diese Artikel gehen **nicht** in Google Shopping.

| Gruppe | geprüft | mit Ausschluss |
|---|---|---|
| Fortura (Schweizer Lager) | 2390 (alle) | **1381 = 57,8 %** |
| Übriger Katalog (Stichprobe) | 500 | **317 = 63,4 %** |

Der einzige vorkommende Wert ist `["Shopping_ads"]` — kein anderer Zielkanal ist betroffen.

## Die naheliegenden Erklärungen greifen NICHT

Gegenprobe an 1200 aktiven Produkten, ausgeschlossene gegen eingespeiste:

| | ausgeschlossen (723) | im Feed (477) |
|---|---|---|
| mit Barcode/GTIN | **0,0 %** | **0,0 %** |
| mit Titelbild | 100 % | 100 % |
| Preis 0 | 0 | 0 |

Beide Gruppen sind in allen sichtbaren Merkmalen gleich. Ein fehlender GTIN, ein fehlendes Bild oder ein
Preis von 0 erklären den Ausschluss also **nicht** — die Unterscheidung kommt aus etwas, das in den
Produktdaten nicht steht. Am ehesten eine frühere Sammelaktion in der Feed-App.

## Was das heisst

- **Fast zwei Drittel des Katalogs erscheinen nicht in Google Shopping** — auch nicht in den kostenlosen
  Shopping-Einträgen. Das ist genau der Kanal mit Kaufabsicht, der dem Shop laut Gedächtnis fehlt.
- **Kein GTIN im ganzen Katalog** (0 % in beiden Gruppen). Für viele Kategorien verlangt Google eine GTIN
  oder ein gesetztes `identifier_exists: false`. Das allein kann Artikel aus Shopping halten.
- **Nur der User kann klären**, ob der Ausschluss Absicht war (z. B. um Werbekosten zu begrenzen) oder ein
  Überbleibsel. Ich habe **nichts geändert** — ein Feed-Metafeld auf 1700 Produkten umzustellen, ohne den
  Grund zu kennen, kann Werbekosten auslösen.

## Nächster Schritt, wenn gewünscht

1. In der Feed-App (Merchant-Center-Verbindung) nachsehen, wann und wodurch die Ausschlüsse gesetzt wurden.
2. Entscheiden: alle freigeben, oder gezielt nur die Fortura-Artikel mit Schweizer Lager (schnelle Lieferung
   = bester Shopping-Vorteil).
3. Vorher `identifier_exists: false` setzen, solange keine GTINs vorliegen.

## Offen geblieben: die vollständige Preismessung

Der geplante Abgleich aller 761 Widmann-Artikel gegen Schweizer Händler **ist aus dieser Sitzung nicht
machbar**: `toppreise.ch` und `galaxus.ch` antworten auf einfache HTTP-Abrufe mit **403**, Firecrawl hat
**keine Credits** mehr, und intern gibt es keine UVP (**0 von 2390** Fortura-Artikeln haben einen
`compareAtPrice`). Wege: Firecrawl aufladen, oder den Abgleich an den PC-Claude mit Brave/Playwright geben
(`dropship/BROWSER-AGENT-SETUP.md`). Die Stichprobe steht in `dropship/PREIS-STICHPROBE-FORTURA.md`.
