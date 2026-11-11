# Kategorie-Banner 11.11.2026: Messung, Plan, erste Bilder live

Auftrag des Besitzers (11.11.): «kannst du sonst kat.banner optimieren und so».
Workflow `wf_af9fcb0d-fde`, 9 Agenten: Bestand messen, Seiten mit Verkehr sichten, Plan, drei Gegenprüfer
(Wahrheit, Wirkung, Technik), Werkzeug. Danach Tests, Trockenlauf, Sichtung und Live-Lauf durch die Hauptsitzung.

## Wichtigster Befund (GEMESSEN 11.11. 19:23 bis 21:57 UTC)

- **Das sichtbare «Banner» einer Kategorieseite ist nicht das Collection-Bild.** Der Abschnitt `lux_hero` in
  `templates/collection.json` (MAIN 213013037447) zeigt Titel und die ganze Beschreibung über den Titelbildern der
  ersten 4 Produkte (Handy 2). Ausnahme: `schuhe`. Nachbau traf live 18 von 18 Fotos auf 8 Seiten.
- Das Collection-Bild erscheint nur als og:image, in Startseiten-Kacheln, «Entdecken», `/pages/alle-kategorien`
  und in der **Bild-Sitemap** (1 016 von 1 560 Collection-Adressen tragen ein `<image:image>`; Gegenprüfer «Wahrheit»).
  Nicht im Merchant-Feed.
- 453 Menü-Kategorien haben ein Collection-Bild von `hero_image_guard.mjs` (erstes Produkt, ungeprüft).
  43 Collection-Bilder sind BigBuy-Dateien von Entwürfen oder gelöschten Produkten (Puma, Michael Kors, LEGO, Casio …),
  9 sind KI-Szenen («_result»).
- Handy (390 × 844): die erste Produktkarte beginnt auf 7 von 7 Seiten bei 757 bis 1 086 px. Über dem Kopf liegen
  330 bis 493 px Leiste, Suche, Pfad, Unterfilter-Chips, Versandzeile.
- 69 % der Schweizer Kategorie-Landungen (30 Tage) kommen von ChatGPT (`utm_source=chatgpt.com`, in ShopifyQL als «direct»).

## LIVE 11.11. 22:14 und 22:20 UTC (`werkzeug/kategorie_banner_v2.mjs`)

Collection-Bild (1:1, echtes Produktfoto eines aktiven, lieferbaren Mitglieds, Gemini-Prüfung, Kontaktbogen gesichtet)
und Metafeld `luxe.kopf_produkte` (4 Produkte; das Theme liest es noch NICHT, wirkungslos bis Rang 1):

| Sammlung | vorher | neu |
|---|---|---|
| weihnachten-2026 | Flammen-Diffuser (Entwurf), Alt englisch | Weihnachtsgirlande Handschuh-Design |
| beauty-pflege | Jade-Roller (Entwurf), HMQ-Logo, Wirkpfeile, 4× doppelt | Press-on-Nägel Galaxy |
| geschenke-fuer-ihn | Akyga-Netzteil (Entwurf, kein Mitglied) | Rucksack Outdoor & Computer |
| herren-schuhe | Puma-Sneaker (Entwurf), Logo | Chelsea Boots mit Stickerei |
| spielzeug | KI-Szene | Elektrische Traumlampe Dalmatiner (Kopf nur 3 von 4, darum nur Bild) |

`kostueme-fasnacht` abgelehnt (Vorschlag schwächer als das heutige Bild). Frisch gelesen: neue Masse, Alt-Texte, Metafeld;
`PHASE=pruefen` 5 von 5 ok. Zwei Bilder am CDN angesehen.

Rücknahme: `ZURUECK=1 LIVE=1 DATEN=dropship/kategorie-banner-v2 [HANDLES=a,b] node dropship/kategorie-banner-v2/werkzeug/kategorie_banner_v2.mjs`
(Trockenlauf ohne `LIVE`). Alte Bilder und Werte in `sicherung/`, jede Änderung in `ledger.jsonl`.
Wöchentlich: `PHASE=pruefen DATEN=dropship/kategorie-banner-v2 node …/kategorie_banner_v2.mjs` (Exit 3, wenn ein Quellprodukt
nicht mehr aktiv, lieferbar oder Mitglied ist oder jemand das Bild geändert hat).

## Nachtrag 22:43 bis 22:48 UTC

- **Halloween-Seite** (Rang 7): Beschreibung ohne das falsche «kommt erst nach Halloween (31.10.)», ohne Rabattcode und Versand-/Rückgabezeile;
  Link zu den Fasnachtskostümen; Ratgeber-Links bleiben; Alt-Text «Halloween – Kürbis-Schale». Alte Beschreibung: `sicherung/halloween-vorher-20261111.json`.
- **Sechs Kategorien ohne Alt-Text** mit dem Werkzeug geprüft (Kontaktbogen gesichtet): `kinderschuhe` (Tanzschuhe von Erwachsenen → Baby-Plüschstiefel),
  `sneaker-sportschuhe` (Lederhalbschuh → Plateau-Sneaker), `muetzen-schals` (Frischhalte-Tablett! → rote Bommelmütze aus dem Alpaka-Set),
  `kostueme-ch-lager` (Perücke doppelt mit `kostueme-fasnacht` → Kobold-Kostüm) ersetzt; `jacken-outdoor` und `blitzversand-schweiz` nur Alt-Text.
  Rücklesen 6 von 6 gleich, `PHASE=pruefen` 11 von 11 ok.

## Fehler beim ersten Lauf, behoben

Shopify behält beim Tausch eines Collection-Bildes den **Dateinamen** und ändert nur `?v=` (weihnachten-2026: Datei
`flame-diffuser-7-farben-kamin-effekt.jpg` mit neuem Inhalt). Das Werkzeug verglich nur den Dateinamen und meldete
«bild-unveraendert», Stopp nach dem ersten Eintrag (geschrieben war richtig). Neu `bildGleich()`: gleiche volle Adresse,
oder gleicher Dateiname UND gleicher Alt-Text UND gleiche Masse. Gilt für Rücklesen, Basis, Rücknahme und Prüfung.
Test 146 → 155 Prüfungen, Live-Test 40, Mutationsprobe 51 von 51 (vorher 47; zwei Testlücken geschlossen), Live-Mutationsprobe 23 von 23.
Folge: die Collection-Bilder tragen weiter alte Dateinamen («jade-roller-…jpg» zeigt jetzt Nägel); harmlos für Kunden, in der Bild-Sitemap unschön.

## Plan (Rangliste, Kurzform) und Entscheide

1. **Kategorie-Kopf am Handy kompakt** (grösster Hebel, Besitzer-Entscheid): H1 22–24 px, 1 Zeile Anriss per CSS, keine
   Kopffotos am Handy (per `<picture>` nicht laden), Beschreibung bleibt im Kopf, aber eingeklappt («Mehr anzeigen»,
   `details`), weil unter dem endlosen Raster niemand sie erreicht. Dazu Stufe 1b: Chip-Zeile waagrecht scrollend,
   Versandzeile/Pfad zusammenlegen, und **die ersten 2 Kartenbilder eager + fetchpriority** (sonst LCP drei- bis viermal
   schlechter, Laborprobe). Ziel: Unterkante des ersten Kartenbilds ≤ 664 px bei 390 × 664. Konflikt: Kaufhilfen vom 11.11.
   (PR #3093) werden am Mi 25.11. gemessen.
2. Saison-Schaufenster Weihnachten/Geschenke (Fasnacht erst Anfang Januar), mit Pin-Liste für die Sortierläufe.
3. Bildprüfung der Kopf-Kandidaten, beschränkt auf Sammlungen mit Landungen (rund 800 Bilder), Ergebnis als
   `luxe.kopf_produkte` je Collection, nicht als Produkt-Metafeld.
4. Plätze 1 bis 4 in MANUAL-Sammlungen säubern (nach 1 und 1b).
5. Collection-Bilder mit mechanischem Tor ersetzen (Quellprodukt nicht aktiv, nicht lieferbar, kein Mitglied, Fremdmarke,
   KI-Szene) — **begonnen, 5 erledigt**; weitere Läufe mit `ALLE=1` (Bild-Sitemap) höchstens 25 je Lauf.
6. `hero_image_guard.mjs` härten (aktiv, veröffentlicht, lieferbar, kein Bild überschreiben, Fehler zählen) vor Mo 16.11. 07:00 UTC.
7. Halloween-Seite: Text kurz und wahr (Seite bleibt).
8. 18 Pinnwand-Banner mit veralteter Zahl ohne Zahl neu bauen.
9. Hauptbild tauschen, wo das Titelbild Fremdtext trägt (Variante muss passen).
10. Kleinkram: Startseiten-Kachel `hundewelt` zeigt auf eine Collection, die es nicht gibt; `weihnachten-2026` doppelt im Menü;
    7 Collection-Bilder ohne Alt-Text.

**Nicht tun:** alle 206 Pinnwand-Banner neu bauen; KI-Szenen als Banner; Massen-Freistellen (würde das ganze Higgsfield-Guthaben
kosten); Weiterleitung von `/collections/halloween`; Beschreibungen kürzen oder Markierungsblöcke `ls-verwandt`/`gd2` anfassen;
Zahlen, Preise, Lieferzeiten ins Bild brennen.

**Ungemessen:** Safari und echtes Handy, Wirkung auf Absprung und Käufe, ob ChatGPT oder Google die og:images/Bild-Sitemap nutzen.
