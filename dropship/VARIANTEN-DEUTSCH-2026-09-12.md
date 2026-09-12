# Variantentexte auf Deutsch — Befund und Umbau, 2026-09-12

Auftrag: „die bestehenden Produkte optimieren und Webseite".
Vorgehen nach der Hausregel: erst messen, dann ändern, dann gegenprüfen.

## Was gemessen wurde

Messgerät `tools/produkt_qualitaet.mjs` (13 Selbsttests) über 250 aktive Produkte:

| Befund | Zahl | Anteil |
|---|---|---|
| rohe Lieferanten-Variantentexte | 11 | 4,4 % |
| erfundene Grössen-Codes (`0XL`, `1XL`) | 2 | 0,8 % |

**Fünf vermutete Defekte haben die Messung nicht überlebt** und wurden bewusst *nicht*
„behoben": fehlende Gewichte (der Versand rechnet nach Preis, nicht nach Gewicht),
„Gratis ab CHF 50" (so gewollt), „ab CHF 80" (ein Collection-Name), die Kanäle der
Rauch-Collection (richtig begrenzt) und angeblich nicht erreichbare Produktseiten
(alle 200, kein Produkt unpubliziert).

Zwei Fehler steckten im Messgerät selbst und sind behoben:
1. Es meldete 100 % „ohne SEO" für einen Auszug, der das Feld gar nicht abgefragt hatte.
   Ein nicht abgefragtes Feld ist **unbekannt**, nicht leer.
2. Es zählte `2XL`–`5XL` als erfundene Grössen — das sind normale Konfektionsgrössen.
   Die Zahl fiel damit von 48 auf 2.

## Der eigentliche Defekt

Bei den Familien-Pyjamas steckt die **ganze Variantenmatrix in einer einzigen Option
namens „Farbe"**, mit Lieferantentexten wie `Red-FatherS`, `Black-Mom 4XL`,
`Picture Color-Tong 2`, `New Flower Deer-Xl For Father`. „Tong" ist chinesisch für Kind,
„Picture Color" heisst „wie abgebildet". Ein Schweizer Kunde soll daraus auswählen.

## Was geändert wurde

`tools/varianten_deutsch.mjs` (56 Selbsttests) übersetzt Farbe, Träger und
Kleidungsstück, stellt „S For Mother" auf „Mama S" um und vereinheitlicht die
Schreibweise der Buchstabengrössen (`Xl` → `XL`).

**291 Variantenwerte auf 13 aktiven Produkten** sind live übersetzt, die Option heisst
jetzt „Ausführung & Grösse" statt „Farbe".

## Die harte Sicherheitsregel

**Grössen werden nie inhaltlich verändert.** Wer aus `0XL` ein `XL` macht, lässt Leute
die falsche Grösse bestellen. Der Wächter `groessenUnveraendert` prüft nach jeder
Übersetzung buchstabengenau in beide Richtungen und hat **zwei echte Fehler im eigenen
Werkzeug gefangen**, bevor sie in den Shop gingen:

* aus dem Altersbereich `3to4` wurde `3to 4` (Wortgrenze fehlte beim Trennen),
* `2XLMom` wurde als Grössenverfälschung gemeldet, obwohl `2XL` vollständig war
  (Fehlalarm der Wächter-Regel).

Fünf Gegenproben stellen sicher, dass der Wächter selbst ausschlägt: verkürzt,
aufgeblasen, verschwunden, getauscht, angeschnitten.

## Bewusst nicht angefasst

* **Lieferanten-Kennungen** wie `JJF106230color-`: sie unterscheiden zwei Muster
  voneinander. Wegwerfen würde zwei verschiedene Varianten zum selben Namen machen —
  Shopify lehnt das ab, und der Kunde könnte sie nicht auseinanderhalten.
  Betroffen: Produkt 15447966515585 („Weihnachts-Pyjama-Set für die ganze Familie"),
  dessen Werte zusätzlich unvollständig sind (`Dad`, `Kid`, `Mother` ohne Grösse).
  **Das ist eine eigene Runde wert.**
* **Designnamen** wie `Vineyard`, `Muwa Manor`, `Snowflake Map Pink`: raten wäre
  schlimmer als Englisch stehen zu lassen.
* **Entwürfe (DRAFT)**: nicht kundensichtbar, darum nicht in dieser Runde.
* **Altersbereiche** `3to4`, `10to12`: die Einheit ist nicht eindeutig belegt.

## Nur der User kann das

Zwei Produkte der Rauch-Collection liegen in Marketing-Kanälen (Google & YouTube,
Facebook & Instagram, TikTok, Pinterest), wo sie wegen der Werberichtlinien nicht
hingehören: **15525490950529** und **15523863101825**. `publishableUnpublish` ist durch
die Sicherheitsregel des Shopify-Zugangs gesperrt — das muss im Admin geklickt werden
(Produkt → Vertriebskanäle → die vier Marketing-Kanäle abwählen).
Prüfen lässt sich das jederzeit mit `tools/kanal_waechter.mjs` (5 Selbsttests).
