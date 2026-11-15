# Übrige Google-Probleme (Merchant Center), Stand 11.11.2026 21:54 UTC

Gemessen mit `automation/merchant_bildprobleme.py` (Workflow `merchant-bildprobleme.yml`, nur lesen, Dienstkonto `GCP_SA_KEY`).
Lauf 43105240668: 323 Seiten, 322 111 Artikelzeilen. Zählung nach verschiedenen Zeilen (Code, Attribut, Angebot), weil die
Reports ein Angebot teils doppelt liefern. Die zwei Massenprobleme (fehlender Versand für Liechtenstein, CSS-Grenze) stehen
im Gedächtnis und sind hier nicht gezählt.

## Bildprobleme

**313 → 198 Angebote** (Lauf 43082038253 von 18:53 UTC gegen Lauf 43105240668 von 21:41 UTC). Zwischen den zwei Läufen lag
die Bildrunde mit 93 Produkten (`dropship/bildfix-1111/README.md`). Dass Google die neuen Bilder schon gelesen hat, ist
naheliegend, aber nicht je Angebot belegt.

## Zweite Datenquelle: Googles «Autofeed» für luxestyle.ch

Modus `quellen` (Lauf 43107908509, Push auf `claude/merchant-fehler-1111`) listet die Datenquellen des Kontos:

| Quelle | Eingang | Art | Sprache / Länder |
|---|---|---|---|
| Shopify App API | API | primär | de, CH und LI |
| Shopify App API | API | primär | fr, CH |
| luxestyle.ch | AUTOFEED | primär | CH und LI |
| Third Party Promotions | (Aktionen) | andere | |

Alle zehn Proben (Angebots-IDs als reine Nummer oder als `<Produkt-ID>_<sku>`) stammen aus **luxestyle.ch (AUTOFEED)**:
Google liest die Shop-Seiten selbst und legt daraus eigene Einträge an, neben denen der Shopify-App. Aus dieser Quelle
kommen fast alle «Pflichtangabe fehlt»:

| Problem | Zeilen | davon Autofeed |
|---|---|---|
| Preis fehlt (`n:price`) | 1 141 | alle (1 004 mit `<Produkt-ID>_<sku>`, 137 mit Nummer) |
| Verfügbarkeit fehlt (`n:availability`) | 49 | alle |
| Werbetext im Titel (`non_product_data`, «Hot Sale») | 18 | alle |
| Verarbeitung abgebrochen | 3 | alle |
| Bildprobleme mit Nummer statt Shop-ID | 4 | alle |

**Die Seiten haben einen Preis:** die Probe «Outdoor-Wanderschuhe Low-Top, Rosarot, 40» (Autofeed-Preis 0) trägt in den
strukturierten Daten der Seite 30.90 CHF für genau diese SKU. Der Autofeed hält also einen alten oder unvollständigen
Abruf (Hypothese, Ursache nicht belegt). Die vier Bildangebote mit Nummer: Retro Punk Gothic Ring (zu klein),
Mandel-Kunstnägel, Magnetisches Induktions-Rücklicht (Einblendung) und SACE LADY (inzwischen Augenbrauen-Gel, Bild 1
schon bereinigt).

**Entscheid des Besitzers:** (A) lassen, Google liest die Seiten neu (Vorgabe); (B) den Autofeed im Merchant Center
ausschalten (Einstellungen, Datenquellen, «luxestyle.ch»). Bei B verschwinden die doppelten Einträge samt Fehlern; offen
ist, ob der Autofeed Produkte zeigt, die das Schaufenster (`gmc-schaufenster`) vom Google-Kanal genommen hat (dann fielen
sie aus den kostenlosen Einträgen). Nicht gemessen.

**«Hot Sale»:** bei `herren-fleece-sport-freizeitschuhe-483776` stehen in der Auswahl «Farbe» Stilnamen von CJ
(«Fashion», «Casual», «Hot Sale», «All-Match»). Nur der Autofeed meldet es; nicht geändert.

## Richtlinien (Einträge der Shopify-App)

| Fall | Zeilen | Produkte | Befund |
|---|---|---|---|
| Persönliche Notlagen | 163 | 86 | Schwangerschaft, Stillkissen; nur Remarketing betroffen, nichts zu tun |
| Sexuelle Interessen / eingeschränkte Ware | je 26 | 9 | durchsichtige Strumpfhosen, Shaper, Nachtrobe |
| Tabak | 18 | 8 | nur das Zigarren-Etui ist ein Tabakzubehör; Handyhalter, Lockenstäbe, Seifenspender, Tasse ohne Tabakwort im Text (Bild?) |
| Rechtliche Einschränkungen | 17 | 7 | u. a. Faltrucksack, Rührspaten für Maische |
| Waffenteile | 10 | 9 | «Taktische» Hundewesten und -leine (Wort «taktisch», «militärtauglich»), zwei Nachtsichtgeräte, Gunstock für Switch |
| Alkohol | 8 | 4 | Alkoholmeter, Hopfenfilter, Weinentkorker |
| Lebende Tiere | 8 | 8 | Schnüffelteppich, Hundeleine, Halskrause (Fehlurteil, vermutlich wegen der Tierbilder) |
| Weltanschauung | 5 | 4 | Buddha-Statue, Kreuzkette, Variante «Dunkle Haut» |
| Landeseite fehlerhaft | 2 | 2 | zwei Kinder-Smartwatches, beide Entwurf (404), fallen von selbst heraus |

Nichts davon geändert. Ein Umbenennen der «taktischen» Hundeartikel kostet das Suchwort «taktische Hundeweste»:
Entscheid des Besitzers.

## Werkzeug

- `MODUS=quellen` (Vorgabe bei Push) listet die Datenquellen und die Herkunft der Proben in `PROBEN`; `modus=bilder` (Handstart)
  liest alle Artikel (rund 15 Minuten). Konto-Nummern werden nie ausgegeben.
- Seit 21:41 UTC wiederholt der Leser Netz-Zeitüberschreitungen (vorher brach der Lauf 43104452470 an einer ab).
- `modus=autofeed` (Handstart, rund 5 Minuten): Autofeed-Schalter, Autofeed-Zeilen gegen das Schaufenster-Manifest,
  Klicks je Herkunft (28 Tage), Bildproben (`BILDPROBEN`). Offline-Test: `python3 -I automation/merchant_bildprobleme_test.py`.
- Schalter: `merchant-autofeed.yml` (`automation/merchant_autofeed.py`), Modi `pruefen` (Vorgabe), `aus`, `ein`; liest nach dem
  Schreiben frisch zurück.
- Auswertung: `python3 -I dropship/merchant-fehler-1111/fehler_auswerten.py <lauf.log> <aus.json>` (gruppiert die FEHLER-Zeilen nach Code und Attribut, nennt die Quelle je Angebot). Das Log am Ende zeigt die «Zeilen je Angebotsformat» (Shopify-App gegen Autofeed).

## Nachmessung 15.11. (Lauf 43748361054, Handstart vom Konto des Besitzers 18:43 UTC, `modus=bilder`)

GEMESSEN (Log ausgewertet mit `fehler_auswerten.py` und `dropship/bildfix-1111/google_liste.mjs`):

| Wert | 11.11. | 15.11. |
|---|---|---|
| Zeilen gesamt | 321 841 bis 322 111 | 326 608 |
| fehlender Versand (Liechtenstein-Dienst seit 11.11. 18:57 UTC) | 256 124 | **979** |
| Bildangebote (verschieden) | 313 (18:53), 198 (21:54) | 192 |
| Preis fehlt / Verfügbarkeit fehlt / «Hot Sale» | 1 141 / 49 / 18 | 574 / 50 / 18 |
| Zeilen Autofeed / Shopify-App | (nicht gezählt) | 189 835 / 136 771 |

**Herkunft der übrigen Fehler:** 147 der 192 Bildangebote (alle 75 «zu klein», 72 von 116 Einblendungen), alle
624 fehlenden Pflichtangaben und alle 18 «Hot Sale» stammen aus dem **Autofeed**. Aus der Shopify-App kommen 45
Bildangebote in 29 Produkten; 27 davon wurden am 11.11. bereinigt. Ein Teil davon ist wohl ein alter Stand bei Google
(das Ladepad zeigt heute ein sauberes Bild, Google meldet weiter eine Einblendung; der Autofeed meldet «zu klein» für
Bilder mit 1024 und 1254 Pixeln). Ein Teil sind Zusammenstellungen, die Google als Einblendung werten kann (Handy mit
App-Bildschirm, Zubehör als Einzelteile mit Symbolen, Lippen-Nahaufnahme als Einschub). Zwei App-Produkte sind neu
(Plüsch-Zwergspitz wartet auf den Abruf, Mini-Drohne «drone.png» noch nicht bereinigt).

### Autofeed gegen das Schaufenster (Modus `autofeed`, Läufe 43769734396 und 43770221277, 15.11. 22:31 bis 22:41 UTC)

GEMESSEN, nur gelesen:

- **Schalter:** `enableProducts=true`, `eligible=true`.
- **Schaufenster:** 31 280 Produkte vom Google-Kanal genommen (letzte Aktion im Manifest nicht «auf»).
- **Zeilen:** Shopify-App 136 766 (25 511 Produkte), Autofeed 187 444 mit Produkt-ID (8 681 Produkte) und 2 347 mit reiner Nummer.
- **8 398 der 8 681 Autofeed-Produkte (96,7 %) hat das Schaufenster absichtlich vom Google-Kanal genommen.**
  8 676 Produkte gibt es nur im Autofeed; davon sind 8 396 gesperrt.
- **Besucher in 28 Tagen** (18.10. bis 14.11., `product_performance_view`): Autofeed mit Produkt-ID 0 Klicks und
  0 Einblendungen; Autofeed mit reiner Nummer 2 Klicks (1 Angebot); Shopify-App 4 Klicks bei 52 Einblendungen.
- **Bildproben:**
  - Garagentor: Google hat das neue Bild, die Einblendungsmeldung ist weg.
  - Ladepad und Focallure: Google hat noch die alten Bilder (`1081987260836.jpg`, `1614838998292.jpg`), obwohl der Shop seit dem 11.11. die neuen zeigt.
  - Die zwei Autofeed-Proben tragen ebenfalls alte Bilder.
- In der App stehen noch 3 349 Zeilen (2 104 Produkte), die laut Manifest gesperrt sein sollten (Abwahl nur versucht
  oder bei Google noch nicht angekommen). Nicht weiter untersucht.

**Folgerung:** Der Autofeed holt fast nur Produkte zurück, die das Schaufenster bewusst weggelassen hat. Er bringt
damit die meisten Fehler (alte Preise und Bilder), aber in 28 Tagen nur 2 Klicks. Abgeschaltet mit
`merchant-autofeed.yml` (Modus `aus`). Rücknahme: derselbe Workflow mit Modus `ein`.

## Plan 14. und 16.11. (vom Besitzer am 11.11. freigegeben, Sparmodus)

**Sa 14.11. 08:13 UTC** (bestehender Wecker `trig_01WT4HUV8a5yCVezBtxmv6ey`, sein Text nennt nur die Bilder; die Punkte 3 und 4 gehören dazu, eine Änderung des Weckers wartet auf die Bestätigung des Besitzers):
1. `merchant-bildprobleme.yml` auf `main` von Hand starten (`modus=bilder`), Log mit `fehler_auswerten.py` auswerten.
2. Bildprobleme gegen 198 (11.11. 21:54 UTC) und 313 (18:53 UTC); `dropship/bildfix-1111/google_liste.mjs`: noch Produkte der 93 bereinigten dabei?
3. Autofeed: «Preis fehlt» gegen 1 141, «Verfügbarkeit fehlt» gegen 49, «Zeilen je Angebotsformat». Nicht gesunken: dem Besitzer das Ausschalten empfehlen (Vorbehalt Schaufenster), selbst nichts ausschalten.
4. Liechtenstein: «missing_shipping» gegen 256 124; `merchant-versand.yml` im Modus `pruefen`: steht der Dienst noch?
5. Fünf Zeilen an den Besitzer, Zahlen hier nachtragen.

**Mo 16.11.** (nach der Rücksetzung des Wochenlimits; ein Wecker dafür wartet auf die Bestätigung des Besitzers):
1. Index-Wecker `trig_019nMZrhD1AcCgEKYuUYGRGE` der Shop-Sitzung: aus? Sonst ausschalten, nicht löschen.
2. KI-Büro Design 16: Besitzer «evt macht der andere session». Zuerst nur lesen (`files/kb3d-code.js` mit `campus-einheitlich-16`?); erledigt: nur vergleichen und melden. Sonst und ohne andere schreibende Sitzung: Tabelle «Kanäle laut Metricool» zuerst ins Repo, dann ein einziger Bau nach `docs/KI-BUERO-DESIGN-16.md`.
3. Wenn Zeit bleibt: «Hot Sale» in den Optionswerten von `herren-fleece-sport-freizeitschuhe-483776` neutral benennen.
