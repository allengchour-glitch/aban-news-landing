# SEO-Push 10.11.2026

Auftrag des Besitzers: «weiter und seo push». Ablauf: vier lesende Messer (Search Console, Saison, Technik, interne Links), Synthese mit zwölf exakten Vorschlägen, **zwei unabhängige Prüfer je Vorschlag**, dann je Vorschlag ein Bauer, der alle Auflagen beider Prüfer umsetzt und jede Aussage frisch an den Produkten zählt, und ein dritter, unabhängiger Prüfer gegen den fertigen Plan. Eingespielt ist nur, was alle drei Prüfungen bestanden hat; kleine Prüfer-Korrekturen (strengere Lesart von «Rollschuhe», «Glas», «Clown-Latzhosen», «Fleece») sind eingearbeitet (`plan.json`).

**Ehrliche Erwartung:** keine dieser Änderungen hat einen belegten Rangeffekt. Die Technik der Seiten ist sauber (ein H1, Canonical, hreflang, gültiges JSON-LD); der Engpass sind Crawl, Index und Vertrauen (Position 52,7 über 28 Tage, 108 Klicks, 17 110 Einblendungen, GEMESSEN bis 09.11.). Das hier ist Hygiene und Wahrheit der Texte (keine unbelegte Aussage, keine Preise/Fristen in Sammlungstexten, korrekte Einordnung der Maskensammlung) plus interne Links. Wirkung auf Rang, Index und Klicks: **unbekannt**.

## Was live ist (10.11.2026 ca. 13:00 bis 13:25 UTC, 30 Schreibvorgänge, jeder frisch zurückgelesen GLEICH)

| Schritt | Ziel | Änderung |
|---|---|---|
| S7 | `ft-maske` | Regel von «Tag maske» (221 aktive Produkte, mit Kosmetik und Schlafmasken) auf Tag UND Produktart «Kostüme & Verkleidung» UND Titel enthält «maske» (57 Produkte, 54 aktiv, 23 kaufbar); SEO-Titel, Meta, Text nur mit Maskenarten, die mindestens zwei kaufbare Artikel haben |
| S1 | `kostueme-fasnacht`, `kostueme-ch-lager` | zweiter Absatz «Nach Kategorie stöbern» mit Links auf die Fasnacht-Unterseiten inkl. Masken (die vorhandenen Absätze unverändert) |
| S3 | `ft-kinderkostuem`, `ft-damenkostuem`, `ft-herrenkostuem` | SEO-Titel mit «Fasnacht», Meta, Einleitung nur mit kaufbaren Sortimentsteilen, ohne «meist 2–3 Werktage» und ohne Halloween |
| S4 | `modellbau` | Titel «Modellbau & Sammelfiguren» → «Modellbau & Bausätze» (Sammelfiguren und Steckmodelle kommen in keinem der 34 Produkte vor), SEO-Titel, Meta, Text; **Hauptmenü: die zwei Einträge mit demselben Titel** (`menue_modellbau.mjs`, nur diese zwei Titel, Ids/Ziele/Reihenfolge unverändert, streng nachgelesen) |
| S5 | `schmuckaufbewahrung`, `velohelme-kinder` | Suchwörter «Schmuckbox» und «Velohelme für Kinder» in SEO-Titel/Meta/Text, belegte Kaufhilfe; Sammlungstitel «Kinderhelme» bleibt |
| S6 | `ft-unisexkostuem`, `ft-peruecke`, `ft-kostuem-hut`, `ft-kostuem-accessoire` | SEO-Titel, Meta, Einleitung, Linkzeile |
| S8 | sechs Ratgeber | je ein Satz mit Link auf die passende Sammlung (reine Einfügung ausserhalb der Markierungsblöcke) |
| S9 | `tier-maentel-jacken`, `tier-maentel-winter`, `kerzen-kerzenhalter` | Suchwörter «Hund»/«Kerzenhalter» in SEO-Titel, Meta, Einleitung |
| S11 | sechs Produkte | Meta aus der eigenen Produktbeschreibung statt Vorlage mit Rabattcode und Rückgabefrist |
| S12 | `premium-geschenke`, Ratgeber «Geschenkideen Schweiz 2026» | Meta ohne Preisspanne, Versandschwelle, Rabattcode und Frist |
| S2 | sechs Fasnacht-Sammlungen | «Verfügbares zuerst» einmal von Hand gefahren (`ft-maske` 21, Kinder 163, Damen 157, Herren 153, Unisex 66, Perücken 133 Züge, nachgelesen) und in `lager-waechter.yml` aufgenommen (der tägliche Lauf hält die Reihenfolge) |

**Bewusst nicht gemacht:** S10 (Theme `meta-tags.liquid`: reine Anzeige-Hygiene für 11 Ratgeber mit praktisch null Wirkung, Theme-Schreibzugriff nicht wert), Meta-Vorlage katalogweit (entscheidet sich nach der Messung 18.11.), alles was den Besitzer braucht (siehe unten).

## Dateien

- `plan.json`: der geprüfte Bauplan mit `felder_vorher` (zeichengenau, Vorbedingung) und `felder_nachher` je Ziel; `bau_plan.py` baut ihn aus den Prüfergebnissen.
- `ablauf.mjs` (reine Logik), `apply.mjs` (Verdrahtung), `test.mjs` (39 Prüfungen gegen eine Attrappe des Shops), `mutation.mjs` (19 Mutanten, alle erkannt).
- `menue_modellbau.mjs`: die zwei Menü-Titel.
- `sicherung.json`, `menu-sicherung-modellbau.json`: Rohstand VOR dem Schreiben (nie überschrieben).
- `lauf_live.log`: Protokoll des Laufs.

## Rücknahme

```
ZURUECK=1 LIVE=1 node dropship/seo-push-1011/apply.mjs        # alle Schritte, aus sicherung.json (NUR=S3,S5 für einzelne)
ZURUECK=1 LIVE=1 node dropship/seo-push-1011/menue_modellbau.mjs   # die zwei Menü-Titel
HANDLES=ft-maske,… ZURUECK=1 LIVE=1 node automation/verfuegbar_zuerst.mjs  # Reihenfolge, «vorher=» steht in dropship/kategorien_ledger.txt (CREATED_DESC)
```
Trockenlauf ist überall Vorgabe; ohne `LIVE=1` wird nichts geschrieben.

## Messung (Basiswerte 10.11.; Vergleich 13.11., 18.11., 25.11. und 02.12.)

Search Console 28 Tage bis 09.11.: 108 Klicks, 17 110 Einblendungen, Position gewichtet 52,7; 41 der 108 Klicks entfallen auf Startseite (22) und Rizinusöl-Wickel (19). Die Basiswerte von `weihnachtspyjama-familie` und `trinkbrunnen-katzen` sind Spitzenwerte (beide Seiten hatten ihre Einblendungen schon vor den Textänderungen verloren): immer Tageswerte vergleichen. Index-Status der `ft-*`-Seiten wechselt zwischen Abrufen («unbekannt» ↔ «Gefunden – zurzeit nicht indexiert», 4 Abfragen am 10.11.): nie nur einen Abruf werten. Erwartung für Rang und Klicks: keine messbare Änderung vor dem 18.11.

## Offen beim Besitzer (nichts davon autonom)

- **Indexierung beantragen** (Search Console, nur der Besitzer, 3 bis 10 je Tag), Reihenfolge nach Saisonnähe: `ft-herrenkostuem`, `ft-kostuem-hut`, `ft-kostuem-accessoire`, `ft-unisexkostuem`, `ft-peruecke`, `ft-maske`, `premium-geschenke`, `kerzen-kerzenhalter`, `tier-maentel-jacken`, `tier-maentel-winter`, `powerbanks`, `kabellos-laden`. Nicht beantragen: `uhren-herren`, `luftbefeuchter-raumbefeuchter` (Doppelsammlungen), `saison-adventskalender`. Gegenmessung am Folgetag früh.
- **Doppelsammlungen entscheiden** (Menü und 301): `uhren-herren`/`herren-uhren` (305 gegen 317 aktive, 304 gemeinsam) und `luftbefeuchter`/`luftbefeuchter-raumbefeuchter` (149 gegen 158, 137 gemeinsam).
- **Sprache `fr`:** abschalten, übersetzen oder Sitemap bereinigen (rund 1 560 französische Sammlungen in der Sitemap trotz `noindex`; `/fr/products/*` leitete bei 4 von 4 Abrufen per 302 auf Deutsch, nicht selbst nachgemessen).
- **Verweise von aussen** (toppreise.ch, Branchenverzeichnisse) und **echte Kundenbewertungen** (Anfrage-Mail `RnTvsY` pausiert): der grösste Hebel, nicht autonom.
- **Banner `pinnwand-modellbau.jpg`** trägt «Modellbau & Sammelfiguren» eingebrannt (erscheint nur als `og:image`); Neubau mit `kategorie_banner.mjs` und Alt-Text «Modellbau & Bausätze – LuxeStyle-Pinnwand». **Französischer Titel** der Sammlung (`Maquettes & figurines de collection`) und der Menü-Titel sind noch alt (`/fr/` ist `noindex`, kaum Verkehr).
- **Veröffentlichte Seite `pages/black-friday-2026-guide`** behauptet «Studien zeigen: 60 % aller Black-Friday-Angebote sind nicht günstiger», «Garantierter Mehrwert (Box-Wert 3x höher als Preis)», «kein Restposten», «Lieferung meist in 2–3 Werktagen» (nicht verlinkt, bei Google unbekannt): Empfehlung unveröffentlichen.
- **Produkt-Befunde aus S11 (nicht geändert):** Duftöl nennt in der Beschreibung «13 Düfte», im Shop sind 12 wählbar; der Mantel «im Kaschmir-Look» zeigt auf den Fotos Teddy-Plüsch (Titel-Wahrheit prüfen), «20 Farben» gegen 14 gewählte.
- **Sieben kaufbare Kostümmasken** liegen ausserhalb der neuen `ft-maske`-Regel (Plüschmasken Typ «Spielzeug & Spiele», zwei Latexmasken Typ «Hautpflege», eine Lederhalbmaske Typ «Damenmode»): Aufnahme nur über Typ- oder Tag-Korrektur dieser Produkte.
- `schmuckaufbewahrung` enthält ein Fremdprodukt («Audio-Adapter mit Ladefunktion und Ringhalterung», Tag `sort-schmuckaufbewahrung`).

## Lehren

1. Eine Zählung gilt nur für das, was gezählt wurde: «aktiv» ist nicht «kaufbar» (bei den Kostümseiten waren 30 von 48 vordersten Kinderkostümen ausverkauft); Texte nennen nur Sortimentsteile mit mindestens zwei kaufbaren Produkten.
2. Die Länge eines Textes zählt Python in Zeichen, JavaScript in UTF-16-Einheiten: der Vergleich vor dem Schreiben läuft über den Hash des Textes, nicht über die Länge (drei Artikel wichen sonst nur in der Länge ab).
3. Der Prüfer-Auflage «nur belegen, was mindestens zwei Produkte tragen» fielen mehr Sätze zum Opfer als dem Wortlaut der Vorschläge: die Bauer-Prüfer-Schleife lohnt sich, weil jede erste Fassung noch einen unbelegten Satz trug.
4. Ein Schreibweg, der Geld nicht bewegt, aber öffentlich sichtbare Texte, bekommt trotzdem Sicherung, Vorbedingung «zeichengleich», Rücklesen und Rücknahme, und seine Tests Mutationsprobe (die erste Fassung des Tests liess 10 von 20 Mutanten überleben).
