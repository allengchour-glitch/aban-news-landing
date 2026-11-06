# Bestellweg härten (Strom 3, 05.11.2026): bezahlte Bestellung mit Editor-Design → Printful-Auftrag

**Stand: gebaut, getestet, von zwei Gegenlesern geprüft und deren Funde behoben (Runde 2). NICHTS live.** Es wurde nichts im Shop, im Theme, bei Printful oder bei CJ geschrieben (nur gelesen: Printful `GET`, Shopify `query`). Kein Auftrag, kein Entwurf, kein Zeitplan scharf geschaltet.
Ziel: der Weg «bezahlte Shopify-Bestellung → Printful-Auftrag» ist für ALLE Modelltypen (Einzelfläche, mehrere Platzierungen, Stickerei, Strick, Schnittteile) sicher genug, um ohne Handstart zu laufen. Kennzeichnung der Zahlen: **GEMESSEN** (05.11.2026, lesend), **QUELLE** (Doku/Dritte), **Annahme** (nicht belegt).

## Dateien

| Datei | Was |
|---|---|
| `automation/printful_sync.mjs` | Der Kleber (Version 2): Shopify lesen/markieren, Printful lesen/anlegen/bestätigen, KI-Kontrolle, Telegram. Komplett neu geschrieben. |
| `automation/lib/printful_bestellweg.mjs` | NEU. Reine Logik ohne Netz: Eigenschaften lesen (v5/v6), SKU, Optionen, Technik, Konflikte, Auflösung (PNG/JPEG-Kopfzeile), Kosten-Wächter (mit Versand), Status, Befund-Tags, `planeBestellung`. |
| `automation/lib/printful_platzierung.mjs` | Erweitert: ausdrückliche Platzierung (`entscheideExplizit`), Aliase (`default` = `front`), doppelte Platzierung, Rückseite auf Ein-Platzierungs-Produkt, Rohantwort im Cache. |
| `automation/lib/printful_bestellweg_test.mjs` | NEU, 388 Prüfungen (389 mit `KATALOG_ALLE`, siehe unten). |
| `automation/lib/printful_platzierung_test.mjs` | Angepasst + 37 neue Prüfungen, jetzt 212. |
| `automation/printful_sync_test.mjs` | Neu geschrieben, 181 Prüfungen: das ganze Skript im Kindprozess gegen ein gefälschtes `fetch` (Shopify, Printful, Telegram, KI, Dateien). |
| `automation/printful_tracking.mjs` + `_test.mjs` | Nur der Text des Wächters (Runde 2, Fund 12 und 11): je nach Tag `printful-review` anderer Wortlaut; Test jetzt 301. |
| `automation/pod_auswahl_mutation.mjs` | 11 Mutanten angepasst (ihre Fundstellen gibt es nach dem Umbau nicht mehr), Dateiliste um den neuen Baustein ergänzt; sonst unverändert. |
| `dropship/pod-auswahl/bestellweg_katalog_auszug.json` | NEU, 40 KB: echter Katalogauszug (Tasse 19, T-Shirt 71, Kappe 206, Poster 268, Jacke 388, Strick 769, Hülle 798) für die Tests. Liegt in `dropship/pod-auswahl/`, weil CI diesen Ordner schon auscheckt. |
| `dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs` | NEU. Mutationsprobe, 162 Mutanten (davon 49 aus Runde 2). |
| `.github/workflows/printful-sync.yml` | EIN Zeitplan (13:37 UTC), schreibt nur mit Freigabedatei `dropship/PRINTFUL-SYNC-FREI.txt` (liegt NICHT im Repo); Handstart standardmässig «Nur testen»; Einstellungen aus Secrets oder Variablen. |
| `.github/workflows/luxestyle-automation-tests.yml` | Runde 2: `node --check` und Test der Logik, Anker-Prüfung der Mutationsprobe, Pfade und Sparse-Checkout für die neuen Dateien. |

## Wie der Lauf jetzt abläuft

```
Shopify: offene Bestellungen, ALLE Seiten (bis MAX=20 POD-Bestellungen)   status:open, bezahlt, unversendet, ohne Tag printful-synced / printful-review
  je POD-Bestellung:
   0. GET /orders/@LX<Nr>      existiert schon? → nichts anlegen, Metafeld + Tag nachtragen          (404 = frei; alles andere = nicht sicher → später wieder)
   1. planen                   SKU → Variante, Dateien → Platzierungen, Optionen, Konflikte, Auflösung, KI, Adresse, Karte (pv/m), Menge (currentQuantity), Erlös + Versandanteil
        harter Befund → KEIN Auftrag, Tag printful-review(+Art), EINE Meldung
   2. POST /orders             als ENTWURF mit external_id (nie mit confirm, nie wiederholt; bei unklarer Antwort fragt der Lauf über external_id nach;
                               bei 4xx fragt er ebenfalls nach, bevor er «abgelehnt» bucht)
   3. Metafeld printful.order_id, dann ZULETZT das Tag printful-synced   (Ergebnis wird geprüft; scheitert es: NICHT bestätigen, Fehler, Exit 1; der nächste Lauf findet den Entwurf
                               über external_id und holt beides nach)
   4. GET /orders/<id>         Dateistatus (Printful prüft selbst), Kosten gegen Erlös samt bezahltem Versand; bis zu 7 Lesungen in 120 s (5, 10, 15, 20, 30, 40 s Pause)
        weicher Befund → Entwurf bleibt, Tag printful-review(+Art), EINE Meldung je neuer Art
   5. POST /orders/<id>/confirm (bei 429 einmal nach der Pause wiederholt), danach Status NACHLESEN: «BESTÄTIGT» nur bei pending/inprocess/partial/fulfilled/inreview; failed/onhold/canceled/draft → Befund
```

**Befund-Tags** (wie `printful-problem-<art>` in `printful_tracking.mjs`): `printful-review` + `printful-review-<art>`. Eine Art wird je Bestellung nur EINMAL gemeldet; kommt eine neue Art dazu, wird nur diese gemeldet.
Eine Bestellung mit `printful-review` liest der Sync nicht mehr (sonst würde sie bei jedem Lauf neu gesendet und gemeldet). **Zwei Fälle, nicht verwechseln:**

* **Harter Befund** (es gibt KEINEN Printful-Auftrag, Tag `printful-review`, kein `printful-synced`): Ursache beheben, dann das Tag `printful-review` entfernen (die `printful-review-*` dürfen bleiben); der nächste Lauf versucht es neu.
* **Weicher Befund** (es gibt einen ENTWURF bei Printful, die Bestellung trägt `printful-synced` UND `printful-review`): der Sync fasst sie nie wieder an, auch nicht nach dem Entfernen des Tags. Den Entwurf prüft und bestätigt man **im Printful-Dashboard von Hand**. (Früher stand hier fälschlich, ein Entfernen des Tags starte es neu.)

Vorübergehende Fehler (Netz, 429, 5xx) setzen nur `printful-versuch-<n>`; nach 3 Läufen wird ein Befund `wiederholt-gescheitert` daraus.
**Nie zwei Läufe gleichzeitig von Hand starten** (zwei Rechner oder zwei Fenster): in Actions schliesst die Concurrency-Gruppe das aus, auf zwei Rechnern nicht. Das Verhalten von Printful bei doppelter `external_id` ist ungemessen.
**Wer im Printful-Dashboard von Hand einen Auftrag für eine Shopify-Bestellung anlegt**, markiert die Bestellung vorher mit dem Tag `printful-synced` (und setzt am besten das Metafeld `printful.order_id`); sonst kann der Sync einen zweiten Auftrag anlegen, wenn dessen `external_id` nicht `LX<Nr>` heisst.

### Befundarten

| Art | hart (kein Auftrag) / weich (Entwurf, kein Bestätigen) | Bedeutung, was tun |
|---|---|---|
| `ohne-variante` | hart | SKU der Position und der Variante ohne `_<Printful-Variante>`: SKU im Shop korrigieren. |
| `keine-druckdatei` | hart | weder Eigenschaft noch Metafeld `custom.print_file`: Kundin fragen / Datei beschaffen. |
| `datei-adresse` | hart | Adresse nicht https, fremder Host (erlaubt: `res.cloudinary.com`, `cdn.shopify.com`, plus `PRINTFUL_DATEI_HOSTS`) oder Zugangsdaten in der Adresse. |
| `datei-doppelt`, `schluessel-gemischt` | hart | dieselbe Platzierung zweimal, oder Schlüssel von v5 und v6 gemischt: unklar, welche Datei gilt. |
| `datei-nicht-erreichbar` | hart | Druckdatei antwortet 404/410. |
| `druckdatei-ohne-pod` | hart | Druckdatei-Eigenschaft an einem Produkt ohne POD-Tag (für Kunden frei schreibbar): wird nie gedruckt. **Echter Fall heute:** die transparente iPhone-Hülle und der Bügeltransfer (siehe «Offen»). |
| `positionen-viele` | hart | mehr als 50 Positionen: weitere Editor-Positionen könnten fehlen. |
| `adresse` | hart | Lieferadresse unvollständig (früher wurde das Land still auf CH gesetzt). |
| `printful-abgelehnt` | hart | `POST /orders` mit 4xx (ausser 401/403), und die Nachfrage über `external_id` findet keinen Auftrag: Text von Printful steht in der Telegram-Meldung. |
| `wiederholt-gescheitert` | hart | dreimal vorübergehender Fehler in Folge. |
| `platzierung` | weich | Platzierung nicht gesichert (Variante nicht lesbar, Seite nicht in der Dateiliste, unbekannte ID, Rückseite auf Ein-Platzierungs-Produkt, zwei Dateien auf derselben Platzierung). |
| `konflikt` | weich | Platzierungen schliessen sich laut Katalog aus (`conflicting_placements`), oder die Konfliktliste ist nicht lesbar. |
| `technik-gemischt` | weich | Stickerei/DTF/Direktdruck in einem Artikel, nach dem TYP der Platzierung beurteilt (ob Printful das zulässt, ist nicht belegt). |
| `optionen` | weich | Pflichtoption fehlt (Garnfarben je Stickerei-Platzierung, `stitch_color`, bei Strick `yarn_colors`), unbekannte Option, ungültiger Wert, oder der Katalog führt für die Stickerei **keine** Garnfarben-Option (Kappen 99, 206, 252: nicht prüfbar, bleibt Entwurf). |
| `aufloesung` | weich | Datei unter Mindest-dpi des Katalogs, Pixelgrösse nicht lesbar, keine Druckdatei-Grösse im Katalog (Stickerei ausgenommen). |
| `druckdaten` | weich | `mockup-generator/printfiles|templates` nicht lesbar oder Produkt-Nummer fehlt. |
| `karte-widerspruch` | weich | NEU: `_pod_karte.pv` (Printful-Variante) weicht von der gekauften SKU ab, oder `_pod_karte.m` (Printful-Produkt) gehört nicht zur Variante: Farbe/Grösse nach dem Gestalten gewechselt oder manipuliert. |
| `sku-widerspruch`, `karte-unlesbar`, `datei-ohne-karte`, `karte-ohne-datei` | weich | Eigenschaften widersprechen sich. |
| `kontrolle-fail`, `kontrolle-technisch`, `kontrolle-fehlt` | weich | KI sagt FAIL / KI nicht erreichbar oder Antwort ohne PASS/FAIL / kein Schlüssel eingerichtet. |
| `kosten`, `kosten-unbekannt` | weich | `kosten`: Verlust oder Gewinn unter `PRINTFUL_MIN_NETTO_CHF` (Vorgabe 4). `kosten-unbekannt`: Kosten noch in Berechnung, null oder negativ, nicht plausibel (Steuer über Summe), andere Währung, Erlös unbekannt. |
| `datei-abgelehnt`, `datei-wartet` | weich | Printful lehnt die Datei ab (status/warning) bzw. prüft nach 120 s noch (Text nennt die gewartete Zeit). |
| `entwurf-nicht-lesbar`, `manuell`, `bestaetigen-abgelehnt` | weich | Entwurf nicht nachlesbar / `PRINTFUL_AUTO_CONFIRM=0` / Bestätigen mit 4xx abgelehnt. |
| `zahlung-fehlgeschlagen`, `angehalten`, `storniert`, `nicht-bestaetigt`, `status-unbekannt` | weich | Status nach dem Bestätigen. `failed` heisst bei Printful Zahlung der Karte, Adresse oder fehlende Dateien (QUELLE Printful-Doku; GEMESSEN am Fall #1033: «Invalid Card Number»); die Ursache steht im Printful-Dashboard. |
| `vorhanden-entwurf`, `vorhanden-<…>` | weich | Auftrag mit dieser external_id gibt es schon (Entwurf oder failed/onhold/canceled): nichts angelegt. |

## Vertrag mit dem Editor (Warenkorb-Eigenschaften einer Position)

| Schlüssel | Wert |
|---|---|
| `🖼️ Druckdatei (<Platzierungs-ID>)` (v6) | https-Adresse bei Cloudinary. `front`, `back`, `sleeve_left`, `label_outside`, `embroidery_chest_left` … Der Dateityp des Auftrags ist `_pod_karte.dt[ID]`, sonst die ID selbst (`front` → `default`). |
| `_pod_karte` (v6) | JSON `{v:6, m:<Printful-Produkt>, pv:<Printful-Variante>, sv:<Shopify-Variante>, pl:[…], dt:{…}, px:[…], o:{<Optionsid>:<Wert>}}`; `o` ist NEU und optional (Printful-Optionen). `m` und `pv` werden gegen die gekaufte SKU geprüft (Befund `karte-widerspruch`); `sv` NICHT (Format ungemessen, der Editor v6 ist nicht live). Datei ohne Eintrag in `pl` und Eintrag ohne Datei sind weiche Befunde. |
| `⚙️ Option (<Optionsid>)` (v6, NEU) | eine Printful-Option, z. B. `⚙️ Option (thread_colors_chest_left)` = `#FFFFFF,#CC3333` oder Name `1801 White, 1672 Old Gold` (Komma trennt, Namen mit Leerzeichen bleiben heil), `⚙️ Option (stitch_color)` = `black`. Gewinnt gegen `_pod_karte.o`. |
| `Vorne · 🖼️ Druckdatei`, `Hinten · 🖼️ Druckdatei`, `🖼️ Druckdatei (Vorne)` (v5) | wie bisher: Schlüssel mit «Hinten»/«Back» = Rückseite, sonst Vorderseite. Der Printful-Produkttyp bestimmt die Platzierung. |

**Offen für die Editor-Seite:** der Editor v6 schreibt die Optionen heute NICHT (GEMESSEN 05.11.: kein «thread» im Code). Bis er es tut, bleibt jeder Stickerei-Auftrag ein Entwurf mit Meldung `optionen`; das ist gewollt (Printful verlangt Garnfarben).
**Stickerei wird am Platzierungs-TYP erkannt, nicht an der Datei-ID** (Runde 2): bei Kappen, Taschen und Mützen heisst die Datei `default`, `back`, `left`, `right`, ihr Typ aber `embroidery_front`, `embroidery_back` …; `planeBestellung` übersetzt über die Dateiliste des Produkts (`aliase`). Katalog (GEMESSEN, 577 Produkte, nach Typ gezählt): **637** Stickerei-Platzierungen (504 mit Stickerei-ID, 133 mit ID `default`/`back`/`left`/`right` an 63 Produkten); für 634 findet die Regel eine Garnfarben-Option (`thread_colors_<Rest>`, `thread_colors_apparel`, allgemein `thread_colors`), für drei Kappen (99, 206, 252: `embroidery_front`) führt der Katalog keine passende Option: dort bleibt jeder Auftrag Entwurf. (Der frühere Satz «504 von 504» zählte nach ID und übersah 133.) Weitere Optionen im Katalog: `stitch_color` (113 Produkte), `embroidery_type` (52), `lifelike` (92), `yarn_colors` (15), `base_color`, `trim_color`, `inside_pocket`, `custom_border_color`, `notes` (356), `license_type` (576).
**Pflicht** im Code sind nur: Garnfarben je Stickerei-Platzierung (Printful), `stitch_color` (das Schätzwerkzeug musste sie wiederholt nachtragen: Annahme als Pflicht), `yarn_colors` bei Strick (Annahme). Alles andere ist optional; Printfuls eigene Ablehnung beim Anlegen (4xx) fängt Fehlendes als `printful-abgelehnt` auf.

**Nahtfarbe (`stitch_color`), Entscheid des Besitzers:** 113 Produkte führen die Option (101 mit `white`/`black`, 9 mit `black`/`clear`, 3 mit `white`/`black`/`clear`; der Katalogtitel lautet «Drawcord & Stitch color», bei Hoodies steckt also auch die Kordelfarbe darin). Von den 37 Live-Produkten betrifft das neun (Badeanzug, Leggings, Rucksack, Pullover, Stoffbeutel, Hoodie allover, Bomberjacke, Jogginghosen, Kissen; Gegenleser 2). Weder der Editor v5 noch v6 schreibt die Option, **diese neun bleiben darum immer Entwurf**, auch wenn der Editor v6 volle Druckgrösse liefert. Zwei Wege: (1) der Editor schreibt `⚙️ Option (stitch_color)`; (2) der Besitzer legt eine Vorgabe fest: Variable/Secret `PRINTFUL_STITCH_COLOR` = `white` oder `black`. Die Vorgabe gilt nur für Produkte, die die Option führen, wird gegen deren Werte geprüft (ein Wert, den das Produkt nicht kennt, bleibt Befund) und schlägt nie eine Wahl der Kundin. **Ohne Entscheid wird nichts gesendet.** Die dpi-Sperre (18 von 37 Produkten, siehe Messungen) gilt davon unabhängig.

## Messungen (alle lesend, 05.11.2026)

* `GET /products/variant/4025` liefert das VOLLE Produkt (`options` 7, `techniques` 3, `files` mit `additional_price` und `options`); die Mitschnitte in `pod-auswahl/platzierung_mitschnitte.json` sind gekürzt.
* `GET /orders/@LX-…` (unbekannt) → **404** `{"code":404,"result":"Not Found"}`; Rate-Limit-Kopf 120 je 60 s. **`GET /orders?external_id=…` filtert NICHT** (lieferte alle Aufträge): darum nur `/orders/@<external_id>`.
* Das Printful-Konto kennt bisher nur **2 Aufträge** (183834327 vom 31.10., 165452870 vom 03.07.), beide `external_id: null` (der alte Sync setzte keine), Kosten in USD, Dateien mit `status: "ok"`, `width/height/dpi`. Auftrag 183834327: `total 19.71` inkl. `tax 1.47` (8.1 % von Ware + Versand 18.24), `retail_costs` leer.
* Shopify-Abfragekosten der Abfrage (2026-01): 10 Bestellungen × 50 Positionen = 158 angefragte Punkte, 25 × 25 = 206; 2000 verfügbar (Runde 2 kam `currentShippingPriceSet` und `currentQuantity` dazu; die Abfrage lief danach als Trockenlauf gegen den echten Shop ohne Fehler). Zum Messzeitpunkt 3 offene Bestellungen (#1034 bis #1036), keine POD: genau der Fall «Nicht-POD verdrängt POD».
* **Erlösseite (Runde 2, GEMESSEN an #1033):** der Shop rechnet inkl. MWST (`taxesIncluded: true`); der Kunde zahlte 16.83 CHF für drei Sticker plus **7.00 CHF Versand** (`currentShippingPriceSet` und `totalShippingPriceSet` 7.0, eine Versandzeile «Standard»), Gesamt 23.83 CHF. Printfuls Kosten (19.71 USD) enthalten den Versand (18.24 ohne Steuer, davon Ware 2.34 × 3 plus Versand). Ohne den bezahlten Versand auf der Erlösseite ergibt die Rechnung **−1.72 CHF** (fälschlich «Verlust»), mit ihm **+4.51 CHF**. Der Versand wird nach Umsatz auf alle Positionen verteilt (Mischbestellung); in anderer Währung oder bei unvollständigem Umsatz entfällt der Anteil (vorsichtig).
* **Auflösung der v5-Dateien:** bei 1200×1200 px (Annahme: Verhältnis je Produkt ungemessen) fallen **18 von 37** gelesenen Live-Produkten unter die Mindest-dpi des Katalogs (alle Variante für Variante): Boardshorts 24 dpi, Badeanzug 34, Leggings 26, Pullover 27, Hoodie allover 30, Bomberjacke 33, Kleid 26, Jogginghose 24, Sport-BH 48, Rucksack 59, Stoffbeutel 71, Kissen 57, Tote 71, Poster 31 (Mindest 150), Mauspad 133 (Mindest 150), Notizbuch 137 (Mindest 150), Strandtuch 16, Decke 19. Die anderen 19 (T-Shirt, Hoodies, Tasse, Hülle, Kappe, Taschen, Sticker, Magnet, Flasche, Body, Laptop-Hülle, Samsung) bestehen. **Folge:** solange der v5-Editor 1200-px-Dateien liefert, werden diese 18 Produkte nie automatisch bestätigt, sondern bleiben Entwurf mit `aufloesung` (richtig so: ein Poster mit 31 dpi sollte niemand drucken). Der Editor v6 liefert die Dateien in der Pixelgrösse der Druckdatei. (Gegenleser 1 rechnete 16 der 18 nach; Poster und Jogginghose fanden sich in seinem Katalog-Abgleich nicht. T-Shirt und Hoodie bestehen mit 100 dpi.)
* Katalog: `fill_mode` ist `fit` oder `cover`; `min_dpi` 0.5 (Strick) bis 150; 165 Produkte führen Stickerei- UND andere Platzierungen.
* **Sticker (Gegenleser 2, hier aus den Phase-1-Daten nachgerechnet):** Kiss-Cut-Sticker 3″ kostet bei Printful 2.34 USD, die Schweizer Versandrate ist 10.39 USD (STANDARD, 3 bis 6 Tage): 12.73 USD × 0.90 = 11.46 CHF. Der Shop verkauft die **261 aktiven Fertig-Sticker** (Tag `fertig-sticker`, GEMESSEN 05.11.: 261 von 264; Tag `printful_personalized_product`, Motiv im Metafeld `custom.print_file`, Variante 1 Stück CHF 4.90, 2 Stück 5.90, 3 Stück 7.90) zum Einzelpreis CHF 4.90 plus 7.00 CHF Versand: netto **−1.15 CHF je Einzelsticker** (Rechnung mit den Phase-1-Daten, nicht neu gegen Printful gemessen). Der Auftrag #1033 mit drei Stickern liegt dagegen bei +4.51 CHF. Der Wächter hält solche Aufträge zu Recht als Entwurf «kosten». Ob die Sticker neu bepreist werden, ist ein Entscheid des Besitzers (die Preisformel `werkzeuge/preisformel.mjs` erfasste nur 38 Produkte).

## Gegenleser-Funde, Runde 2 (05.11.2026): Stand

Zwei unabhängige Gegenleser, jeder Fund einzeln nachgestellt. «GL1» und «GL2» = Gegenleser 1 und 2.

| Fund | Stand | Wie nachgestellt / Fix / Test |
|---|---|---|
| GL1 1 und GL2 4: Tag vor Metafeld, ein Metafeld-Fehler lässt einen unbestätigten Entwurf ohne Prüfer liegen | **behoben** (bestätigt) | Nachgestellt: Tags `[printful-synced]` blieben, Lauf 2 meldete «Keine offenen POD-Bestellungen». Jetzt Metafeld zuerst, Tag zuletzt (`tagsSetzen`); Lauf 2 findet den Entwurf über `external_id` und holt beides nach. Test: «Metafeld scheitert: Tags []», Reihenfolge der Schreibzugriffe, Nachlauf; Mutant «Tag vor Metafeld». |
| GL1 2 und GL2 11: zwei aktive Zeitpläne gegen die Repo-Regel (Cron-Nulldiät, max. 1×/Tag, einzeln) | **behoben** (bestätigt, SHARED-MEMORY Zeile 843 bis 846) | Eine Zeile (13:37 UTC). Eine zweite Tageszeit ist Entscheid des Besitzers. Test prüft ≤ 1 aktive Cron-Zeile; Mutant «zweiter Zeitplan». |
| GL1 3 und GL2 7: Workflow reicht `PRINTFUL_MIN_NETTO_CHF`, `PRINTFUL_KI_MODELL`, `PRINTFUL_DATEI_HOSTS`, `MAX` nicht durch; Vorgabe 0 | **behoben** | `secrets.X \|\| vars.X` für `PRINTFUL_AUTO_CONFIRM`, `_KI_KONTROLLE`, `_KI_MODELL`, `_MIN_NETTO_CHF`, `_STITCH_COLOR`, `_DATEI_HOSTS`, `_MAX`. **Vorgabe des Mindestgewinns jetzt 4 CHF** (Ziel der Preisformel; 0 stellt man ausdrücklich ein). Test mit echtem Auftrag: 21.90 CHF Erlös → Entwurf `kosten`. |
| GL1 4: Kosten von 0 oder negativ geben frei | **behoben** (bestätigt) | Nachgestellt: `total 0.00` und `total 12.70 / tax 20.00` wurden BESTÄTIGT. Jetzt `kosten-unbekannt` bei Summe ≤ 0 und bei Kosten ohne Steuer ≤ 0. Tests in der Sync- und der Logik-Testdatei, zwei Mutanten. |
| GL1 5: 4xx beim Anlegen ohne Nachfrage als harter Befund | **behoben** (bestätigt) | Nachgestellt: «abgelehnt»-Befund auf einen vorhandenen Auftrag. Jetzt Nachfrage über `external_id`: gefunden → `vorhandenBehandeln`; Nachfrage nicht beantwortbar → Versuchszähler statt Befund; nicht gefunden → harter Befund. README: nie parallel von Hand starten. |
| GL1 6 und GL2 2: 15 s Wartezeit, Text sagt «mehreren Minuten»; ein Entwurf ohne fertige Dateien/Kosten bleibt für immer ungeprüft | **behoben**, Rest **offen** | 7 Lesungen in 120 s (`WARTE_FOLGE`, ein Mehrfaches von `PF_PAUSE_MS`), das Zeitlimit des Laufs gilt beim Warten, der Text nennt die gewartete Sekundenzahl und den Weg (Dashboard), das Protokoll nennt «Dateien und Kosten fertig nach N s». **Wie lange Printful wirklich braucht, ist weiter UNGEMESSEN** (Schritt 3 des Live-Plans misst es). Eine automatische Nachprüfung später entstandener «datei-wartet»/«kosten-unbekannt»-Entwürfe ist NICHT gebaut (zweiter Prüfpfad mit eigenem Bestätigen, mehr Risiko als Nutzen vor der ersten Messung); sie meldet sich sofort per Telegram, bestätigen kann man im Dashboard. |
| GL1 7: Gesamtkatalog-Beleg «504 von 504» zählt nach ID, übersieht 133 Stickerei-Dateien an 63 Produkten | **behoben** (bestätigt) | Nachgestellt: 637 Stickerei-Platzierungen nach Typ, 134 Dateien nicht erfasst; `embroidery_front` an der Kappe 206 ohne Garnfarben wurde BESTÄTIGT. Jetzt Erkennung am Typ über die Dateiliste (`aliase`), fehlende Garnfarben-Option im Katalog = Befund `optionen`, Zusatzstickerei `addon_embroidery_*`. Katalogprobe zählt nach Typ (637/634/3). Tests in beiden Testdateien, Mutanten dazu. |
| GL1 8: Repo ist öffentlich, Log und Zusammenfassung tragen Befundtexte, Printful-Fehlertexte, KI-Beschreibungen von Kundenbildern | **behoben** (bestätigt: `private:false`) | Log und Step-Summary nur Nummer + Befundart; Texte, Printful-Antworten, KI-Beschreibungen nur an Telegram; `[DRY] Telegram` nennt nur die Zeichenzahl; `PRINTFUL_LOG_DETAIL=1` schaltet die Texte für Läufe auf dem eigenen Rechner ein. Restpunkt (bewusst): Bestellnummern (`#1034`) und Printful-Auftragsnummern stehen weiter im öffentlichen Protokoll; die Nummer allein enthält keine Kundendaten. Tests mit einem erfundenen «Geheimtext» in Printful-Antwort und KI-Antwort, dazu fünf Mutanten. |
| GL1 9: Handstart steht auf «scharf» | **behoben** | `default: true` («Nur testen»); scharf nur mit entferntem Haken. Test + Mutant. |
| GL1 10, GL2 5: Wortlaut (Tag entfernen gilt nur für harte Befunde; «failed» heisst nicht nur Karte; «existiert nicht» bei 5xx der Nachfrage) | **behoben** | README, Kopfkommentar, `statusBewerten`, Meldung beim Anlegen. |
| GL1 11: Karte `pv`/`m` gegen SKU/Produkt | **behoben** (für `pv`, `m`); `sv` **verworfen** | `karte-widerspruch` (weich). `sv` (Shopify-Variante) wird nicht verglichen: sein Format im Editor v6 ist ungemessen, ein falscher Alarm hielte jeden Auftrag an. |
| GL1 12: `printful_tracking`-Wächter meldet Review-Bestellungen mit «Sync starten» | **behoben** | Text je nach Tag; der Satz «sonst doppelter Auftrag» entfällt (die `external_id` schützt). Test V16/V16d. |
| GL2 1: Kosten-Wächter rechnet den bezahlten Versand nicht mit | **behoben** (bestätigt, #1033 nachgerechnet) | Erlös = Positionen + Versandanteil (`currentShippingPriceSet`, nach Umsatz verteilt). Fehler vor dem Fix: −1.72 CHF «Verlust», danach +4.51 CHF. Tests in beiden Testdateien (#1033 nachgebaut, Mischbestellung, Gratisversand, Fremdwährung), vier Mutanten. **Preisfrage der Sticker bleibt offen (Besitzer).** |
| GL2 3: neun aktive Editor-Produkte bleiben wegen `stitch_color` immer Entwurf | **teilweise behoben**, Entscheid **offen** | Neuer Schalter `PRINTFUL_STITCH_COLOR` (siehe oben), aber **ohne Wert gesendet wird nichts**. README und Live-Plan nennen die neun Produkte. |
| GL2 6: Trockenlauf nennt anstehende Bestellungen nicht | **behoben** | Zusammenfassung «N Bestellung(en) würden angelegt» und eine Zeile je Bestellung (Nummer, external_id, bestätigt oder Entwurf, Befundarten). |
| GL2 8: zwei aktive «Selbst gestalten»-Produkte ohne POD-Tag | **bestätigt, nicht geändert (Shop-Daten, Besitzer)** | Lesend gemessen: `transparente-iphone®-hulle-selbst-gestalten` (SKU `6267182_10996`, ACTIVE, Tags ohne `wunschdesign`) und `buegeltransfer-selbst-gestalten` (SKU `TRANSFER-A3`, ACTIVE). Eine Bestellung mit Druckdatei-Eigenschaft wird als `druckdatei-ohne-pod` angehalten und gemeldet; ohne Eigenschaft ginge sie unbemerkt an dem Sync vorbei. Besitzer: Hülle mit `wunschdesign` taggen, beim Transfer entscheiden, ob er in den Printful-Weg gehört. |
| GL2 9: `quantity` zählt entfernte und erstattete Einheiten | **behoben** (bestätigt: `currentQuantity` in 2026-01 lesbar) | `currentQuantity` bestimmt die Menge; 0 = Position übergangen, nicht gedruckt, kein Befund; teilweise entfernt → Umsatz anteilig. Tests in beiden Testdateien (teilweise entfernt, ganz entfernt, Unsinnswerte), vier Mutanten. |
| GL2 10: `external_id` kollidiert («#1034-1» und «#10341» → beide LX10341) | **behoben** (bestätigt) | Wird ein Zeichen weggelassen, hängt die Shopify-Bestell-ID an (`LX10341N<ID>`); der Normalfall `#1034` bleibt `LX1034`. |
| GL2 11: 429 beim Bestätigen als Ablehnung; Garnfarben mit Leerzeichen; Gedankenstriche | **behoben** | 429: einmal nach der Pause wiederholt, danach «unklar» (Statusprüfung), nicht «lehnt ab». Namen wie «1801 White» bleiben ein Wert. Halbgeviertstriche in Telegram-Texten durch Doppelpunkt ersetzt. |
| GL2 12: Tests nicht in CI; fünf überlebende Mutanten | **behoben** | CI: `node --check`, `printful_bestellweg_test.mjs`, Anker-Prüfung der Mutationsprobe (die volle Probe läuft von Hand), Pfade und Sparse-Checkout. Mutanten: Streaming-Pfad (zwei: Begrenzung, Abbruch), JPEG SOF2, Maskierung des Bestellnamens, `state_code`: je ein Test und ein Mutant. |

## Codex-Funde (pod-preise, 28.10.2026, `dropship/CODEX-FUNDE-2810.md`) → behoben?

| # | Fund (Schwere) | Stand | Wo | Test |
|---|---|---|---|---|
| 1 | Doppelter bestätigter Auftrag, wenn das Markieren in Shopify scheitert (wichtig) | **behoben** | `printful_sync.mjs` `bearbeite`: `external_id` `LX<Nr>`, Vorab-Nachfrage `GET /orders/@…`, Entwurf zuerst, Metafeld/Tag-Ergebnis geprüft (userErrors, HTTP, GraphQL-Fehler) und VOR dem Bestätigen, Nachfrage nach unklarem `POST` | sync: «Auftrag existiert…», «POST /orders → 503…», «Markieren scheitert (userErrors / HTTP 500 / GraphQL-Fehler)», «Metafeld scheitert», «…der zweite Lauf legt keinen zweiten an» |
| 2 | Nicht-POD-Bestellungen verdrängen POD aus den ersten MAX (wichtig) | **behoben** | `main()`: Cursor-Blättern bis MAX POD-Bestellungen, Seitenlimit 30 mit Fehler | sync: «Drei Nicht-POD-Bestellungen auf Seite 1…», «MAX=2…», «Mehr als 30 Seiten» |
| 3 | Bestellung nur mit unbekannter SKU: still übersprungen, bei jedem Lauf neu gelesen (wichtig) | **behoben** | `planeBestellung` (harter Befund `ohne-variante`), `befundMelden` (Tags + eine Meldung), Query `-tag:printful-review` | sync: «Bestellung nur mit unbekannter SKU…», «beim nächsten Lauf: KEINE zweite Meldung» |
| 4 | KI-Kontrolle gibt bei Fehler/Timeout die Produktion frei (wichtig) | **behoben** | `kontrolle()` + `kontrolleLesen`: nur ein Wort PASS/FAIL am Anfang gilt; HTTP-Fehler, Timeout, leere/unklare Antwort, fehlender Schlüssel → Entwurf. Vorgabe `PRINTFUL_KI_KONTROLLE=pflicht` | sync: KI-Block (HTTP 402, Netzfehler, unklar, leer, kein Schlüssel, FAIL, PASS); lib: `kontrolleLesen` (17 Fälle) |
| 5 | Eine Platzierung überschreibt die gewünschte Seite; zwei Dateien können dieselbe Platzierung belegen (wichtig) | **behoben** | `entscheide` (Rückseite auf Ein-Platzierungs-Produkt nicht gesichert), `platzierungenFuerDateien` (doppelte Platzierung, auch `default`/`front` als dieselbe) | platzierung: 30 angepasste Erwartungen + «Kleber mit ausdrücklichen Platzierungen»; sync: «Tasse mit Vorne UND Hinten», «Hülle mit Hinten-Datei» |
| 6 | `printful_reprice` ignoriert Versand und Gebühr, rundet unter den Richtwert (wichtig) | **nicht behoben** | andere Datei, nicht Teil von Strom 3. `printful_reprice` überspringt nur die fünf Handles aus `pod_auswahl_spec`, nicht alle «Selbst gestalten»-Produkte (Gegenleser 2); es läuft nur per Handstart. Der Ersatz ist die Preisformel `werkzeuge/preisformel.mjs` (Strom Preise). | – |
| 7 | Varianten-SKU hat Vorrang vor der SKU der Position (klein) | **behoben** | `skuWaehlen`: Position zuerst, Varianten-SKU als Rückfall, Widerspruch = weicher Befund `sku-widerspruch` | lib: SKU-Block (7 Fälle); sync: «SKU der Position ≠ SKU der Variante…», «SKU der Position kaputt…» |
| 8 | `lineItems(first:50)` ohne Weiterblättern, Position 51+ fehlt (klein) | **behoben (als harter Befund, nicht durch Blättern)** | Abfrage liest `lineItems.pageInfo.hasNextPage`; `positionen-viele` verhindert den Auftrag; auch Bestellungen ohne Editor-Ware in den ersten 50 werden dann geprüft | sync: «Mehr als 50 Positionen», «…in den ersten 50 keine Editor-Ware» |
| 9 | `printful_reprice`: `variants(first:100)` ohne Weiterblättern (klein) | **nicht behoben** | wie 6 | – |
| 10 | `printful_reprice` zählt fehlgeschlagene Preisänderungen als angepasst (klein) | **nicht behoben** | wie 6 | – |
| 11 | Eigener Fund: fehlgeschlagener Auftrag wird bei jedem Lauf erneut gesendet und gemeldet (klein) | **behoben** | Query `-tag:printful-review`; `printful-abgelehnt` setzt das Tag; vorübergehende Fehler zählen bis 3 | sync: «POST /orders → 400…», «Dritter Fehlversuch», «Abfrage schliesst … aus» |

## Weitere Härtungen (nicht aus dem Codex-Bericht, aber im Auftrag)

* **Mehrere Platzierungen (1):** `dateienAusEigenschaften` liest v6 und v5; Typen sind die echten Printful-IDs; unbekannte oder nicht in der Dateiliste stehende Platzierung → Entwurf; Konflikte aus `conflicting_placements` (in beide Richtungen, auf Ebene der Platzierungsnamen: Datei `default` = Platzierung `front`) → Entwurf.
* **Pflicht-Optionen (2):** `optionenPruefen` (Typen `multi_select`, `radio`, `bool`, `text`), Garnfarben in Katalogschreibweise, ungültige Werte werden nie gesendet; durchgereicht als `items[].options`.
* **Auftragsstatus nachlesen (3):** nach dem Bestätigen `GET /orders/<id>`; Zahlung gescheitert (`failed`) wird nie als «bestätigt» gemeldet. Dateien: Printfuls eigene Prüfung (`items[].files[].status/warning`) ist die zweite Schicht nach der eigenen Auflösungsprüfung.
* **Auflösung (5):** PNG-Kopfzeile (IHDR) und JPEG (SOF0 bis SOF15 ausser DHT, JPG, DAC) ohne Bildbibliothek, nur die ersten 64 KB (Range-Kopf; ein Server, der ihn ignoriert, wird nach 64 KB abgebrochen). Rechnung: `fit` → dpi = Druckdatei-dpi × max(B/Bp, H/Hp), `cover` → min. Gegen `min_dpi` aus `GET /mockup-generator/templates/<id>` (fehlt sie: 72). Für Stickerei führt der Katalog meist keine Druckdatei-Grösse (GEMESSEN am T-Shirt 71): dort entfällt die Auflösung, Garnfarben und Dateistatus gelten.
* **Kosten-Wächter (7):** `costs.total − tax − vat` (USD, ohne Printfuls Steuer wie in der Preisformel) × 0.90 gegen den Erlös (Positionen `discountedTotalSet` anteilig zur gedruckten Menge, CHF, inkl. MWST 8.1 %, plus Versandanteil, minus Zahlungsgebühr 3.4 % + 0.30). Unter `PRINTFUL_MIN_NETTO_CHF` (Vorgabe **4**) → Entwurf. Kosten noch «calculating»/leer/null/negativ, andere Währung, Erlös unbekannt → `kosten-unbekannt` (kein grünes Licht). Konstanten gleich `werkzeuge/preisformel.mjs` (Test vergleicht, wo die Datei da ist).
* **Sicherheit der Dateiadresse:** Warenkorb-Eigenschaften sind für Kunden frei schreibbar (`/cart/add.js`). Der Lauf ruft nur Adressen von `res.cloudinary.com` / `cdn.shopify.com` / `PRINTFUL_DATEI_HOSTS` ab; nur ein Produkt MIT POD-Tag zählt als Editor-Ware.
* **Stornierte Bestellungen:** Abfrage `status:open`, zusätzlich `cancelledAt` geprüft: eine stornierte, noch nicht erstattete Bestellung wird nie gedruckt. **Entfernte/erstattete Einheiten** (`currentQuantity`) ebenso nicht.
* **Telegram:** Text maskiert (Fremdtext aus KI/Printful/Titeln/Bestellname), je Zeile höchstens 300 Zeichen, höchstens 10 Zeilen (Limit 4096).
* **Zeitlimit:** Abfragen 20 bis 60 s, Lauf 10 Minuten (`RUN_LIMIT_MS`, gilt auch beim Warten), Workflow 15 Minuten. Früher hatte das Anlegen des Auftrags gar kein Zeitlimit.
* **Öffentliches Protokoll:** siehe Fund GL1 8.

### Geändertes Verhalten gegenüber der alten Fassung (bitte lesen)

1. Ohne `PRINTFUL_API_KEY` oder Shopify-Zugang: **Exit 1** (früher stiller No-op mit Exit 0). Technische Fehler enden mit Exit 1, Befunde nicht.
2. **Bestätigen in zwei Schritten** (`POST /orders` ohne `confirm`, dann `/orders/<id>/confirm`) statt `?confirm=1`; bestätigt wird nur ohne jeden Befund.
3. **KI-Kontrolle ist Pflicht** (`PRINTFUL_KI_KONTROLLE`, Vorgabe `pflicht`). Das Memory nennt `GEMINI_API_KEY` in Actions mit **leerem Guthaben (HTTP 402)**; das Modell `gemini-2.5-flash` steht in der Modellliste des Sitzungsschlüssels (Gegenleser, nur die Liste gelesen, kein `generateContent`). Ob der Actions-Schlüssel dasselbe darf und Guthaben hat, ist ungeprüft: **dann wird JEDE Bestellung ein Entwurf** (Meldung `kontrolle-technisch`). Entscheid des Besitzers: Guthaben aufladen oder das Secret/die Variable `PRINTFUL_KI_KONTROLLE` auf `aus` setzen (die mechanischen Prüfungen bleiben).
4. Bei nicht lesbarer Printful-Variante bestätigt der Lauf nie mehr (früher Rückfall «Poster/Magnet → default → bestätigt»); es fehlen dann Produkt-Nummer, Mindest-dpi, Konflikte und Optionen.
5. Rückseiten-Datei auf Produkt mit nur `default` (Tasse, Hülle): Entwurf (früher still `default`, bestätigt).
6. Fehlendes Lieferland: harter Befund (früher stilles `CH`).
7. `DRY_RUN`: alles ausser leer/`0`/`false`/`no`/`nein`/`off` ist Trockenlauf (früher nur `1`). Im Trockenlauf wird gelesen (Shopify, Printful `GET`, Dateien, KI), aber nichts geschrieben, kein Tag, keine Meldung.
8. API-Version 2026-01 (die alte lief auf dem abgelaufenen 2025-01).
9. **Runde 2:** der Handstart des Workflows steht jetzt standardmässig auf «Nur testen» (Haken entfernen = scharf, ohne Rücksicht auf die Freigabedatei). Der Zeitplan (ein Lauf, 13:37 UTC) schreibt nur mit der Freigabedatei.
10. **Runde 2:** Mindestgewinn-Vorgabe 4 CHF (vorher 0); Erlös schliesst den bezahlten Versand ein; Wartezeit auf Printful 120 s statt 15 s; Befundtexte nur noch in Telegram, nicht im öffentlichen Protokoll; `external_id` trägt bei Sonderzeichen im Bestellnamen die Shopify-ID; Karte (`pv`/`m`) wird gegen die SKU geprüft; Stickerei wird am Typ erkannt (Kappen ohne passende Garnfarben-Option bleiben Entwurf).

## Tests und Mutationsprobe

| Datei | Prüfungen | Wie |
|---|---|---|
| `automation/lib/printful_bestellweg_test.mjs` | **388** (389 mit `KATALOG_ALLE=<Ordner mit den 577 Katalogdateien von katalog_holen.mjs>`: 637 Stickerei-Platzierungen nach Typ, 634 mit Option, die drei Kappen ohne) | reine Logik, echter Katalogauszug, PNG/JPEG-Bytes im Test gebaut, Workflow-Datei (Zeitplan, Handstart, Durchreichen) |
| `automation/lib/printful_platzierung_test.mjs` | **212** | echte Mitschnitte (17 Produkte), Katalog, Orakel aus der Dateiliste |
| `automation/printful_sync_test.mjs` | **181** | ganzes Skript im Kindprozess, gefälschtes `fetch`, rund 190 Szenarien, ca. 9 s |
| `automation/printful_tracking_test.mjs` (bestehend, Text angepasst) | 301 | unverändert bis auf V16/V16d |
| `automation/pod_auswahl_test.mjs` (bestehend) | 112 | unverändert grün |
| `dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs` | ****162 von 162 Mutanten erkannt** (Exit 0, 8 min 20 s; der erste Lauf der Runde 2 meldete 160 von 162, die zwei Überlebenden wurden mit schärferen Testdaten geschlossen)** | Kopie im Temp-Ordner, `--pruefen` prüft nur die Fundstellen (in CI), `NUR=<Teil des Namens>` einzelne Mutanten, volle Probe rund 8,5 Minuten |
| `automation/pod_auswahl_mutation.mjs` (bestehende CI-Probe) | **221 von 221 Mutanten erkannt** (Lauf Runde 2 nach allen Änderungen, Exit 0, 3 min 11 s) | unverändert grün nach allen Änderungen |

Lauf: `/opt/node22/bin/node automation/printful_sync_test.mjs` (usw.), Mutation: `/opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs` (`NUR=<Name>` für einzelne).
Echter Trockenlauf (Runde 2, Shopify und Printful nur gelesen): `DRY_RUN=1 node automation/printful_sync.mjs` → «Keine offenen POD-Bestellungen (3 offene Bestellungen in 1 Seite gelesen)», Exit 0; die neue Abfrage (`currentShippingPriceSet`, `currentQuantity`) wird von Shopify angenommen.
Nicht abgedeckt (ehrlich): echter Lauf gegen Printful/Shopify mit Schreiben (nie ausgeführt), echte Telegram-Zustellung, echte KI-Antwort, Verhalten von Printful bei doppelter `external_id` und bei Entwurf-Kosten (siehe «Offen»).
**Lehre der Runde 2:** ein Test, der einen Befund nur mitbehauptet, kann ihn an einer anderen Stelle zufällig erfüllen; `kostenPruefen` mit `total '1'` und Steuer `1.47` wurde nach der neuen Regel «Kosten ohne Steuer ≤ 0» auch ohne die Berechnungs-Prüfung «unbekannt», der Mutant «calculating gilt als fertig» überlebte. Die Probe fand es; die Testdaten haben jetzt eine plausible Summe (30 USD).

### CI (`.github/workflows/luxestyle-automation-tests.yml`, in Runde 2 eingetragen)

* **`paths:`** `dropship/selbst-gestalten-fertig-0511/bestellweg/**`, `…/werkzeuge/preisformel.mjs`, `.github/workflows/printful-sync.yml`.
* **`sparse-checkout:`** dieselben drei Einträge (sonst «Cannot find module» / Test überspringt die Workflow-Prüfung). Nachgespielt in einer Kopie mit genau diesen Pfaden: Logik 388, Platzierung 212, Sync 181, `mutation.mjs --pruefen` grün.
* **Neue Zeilen:** `node --check automation/lib/printful_bestellweg.mjs`, `node automation/lib/printful_bestellweg_test.mjs`, `node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs --pruefen`. Mehrzeit des Jobs: rund 4 Sekunden. Die volle Probe gehört NICHT in die CI (rund 8,5 Minuten).

## Offen / nicht gemessen / Entscheide

1. **Doppelte `external_id` bei Printful:** ob Printful sie selbst ablehnt, ist NICHT gemessen (kein Auftrag angelegt). Der Schutz liegt in der eigenen Vorab-Nachfrage (und der Nachfrage nach einem 4xx); zwei gleichzeitige Läufe schliesst die Concurrency-Gruppe des Workflows aus, nicht aber zwei Handläufe auf zwei Rechnern.
2. **Kosten und Dateistatus eines frischen Entwurfs:** Form und Zeitpunkt von `costs` und `files[].status` direkt nach `POST /orders` sind nicht gemessen (der Lauf liest bis zu siebenmal in 120 s nach und protokolliert die gewartete Zeit). Liefert Printful für Entwürfe nie Kosten, wird JEDER Auftrag `kosten-unbekannt` (sichtbar nach der ersten echten Bestellung; dann Wächter anpassen).
3. **Technik-Mischung** (Stickerei + Direktdruck): ob Printful sie in einem Artikel zulässt, ist nicht belegt → Entwurf. `stitch_color` und `yarn_colors` als Pflicht sind Annahmen.
4. **Editor schreibt keine Optionen** (siehe Vertrag): Stickerei-Produkte und die neun `stitch_color`-Produkte bleiben bis dahin Entwurf, ausser der Besitzer legt `PRINTFUL_STITCH_COLOR` fest.
5. **Gemini-Guthaben/Modell** (siehe oben, Punkt 3 der Verhaltensänderungen). Eine eigene Weissbild-Erkennung gibt es nicht (der Editor verhindert leere Entwürfe, Hypothese).
6. **`fulfillment_status:partial`** wird nicht gelesen (wie bisher): eine Bestellung, bei der z. B. Fortura-Ware schon versendet ist, bevor der Sync lief, bleibt liegen. **Positionen am Service-Standort «Printful»** (Tag `printful_personalized_product`) zählen weiter als POD; legt die Printful-App für sie selbst Aufträge an, schützt `external_id` nicht (GEMESSEN: bisher keine App-Aufträge im Konto).
7. **Häufigkeit:** ein Lauf täglich (13:37 UTC), eine zweite Tageszeit ist Entscheid des Besitzers. Der Zeitplan ist aktiv, tut aber ohne Freigabedatei nur lesen.
8. **Neu anlegen nach Storno im Dashboard:** der Auftrag mit der alten `external_id` existiert weiter (Status `canceled`): der Sync meldet `vorhanden-storniert` und legt nichts neu an. Neu anlegen: im Printful-Dashboard den alten Auftrag LÖSCHEN (nicht nur stornieren) oder dort von Hand anlegen.
9. `printful-review-*`-Tags werden nach der Behebung nicht aufgeräumt (eine Bestellung mit `printful-synced` liest der Sync nicht mehr; `printful_tracking.mjs` räumt nur seine eigenen `printful-problem*`).
10. **Sticker-Preise** (261 aktive Produkte zu CHF 4.90, Einzelstück netto −1.15 CHF): Entscheid des Besitzers, bevor der Zeitplan scharf wird; der Wächter hält solche Aufträge bis dahin als Entwurf.
11. **Zwei aktive Produkte ohne POD-Tag** (iPhone-Hülle, Bügeltransfer): Besitzer, siehe Fund GL2 8.
12. **Später entstandene Dateien/Kosten:** keine automatische Nachprüfung (siehe Fund GL1 6); die Meldung kommt sofort, bestätigt wird im Dashboard.
13. **Eine nachträglich ganz entfernte Editor-Position** (`currentQuantity` 0) bleibt ohne Meldung liegen (kein Auftrag, kein Tag, die Bestellung wird bei jedem Lauf kurz mitgelesen, bis sie versendet oder erstattet ist). Das ist gewollt, aber ungetestet gegen eine echte Bestellbearbeitung.
14. Wirkung auf Verkäufe: keine erwartet (Hypothese); der Nutzen liegt in weniger Handstarts und in vermiedenen Doppel- und Fehlaufträgen.

## Live-Plan (Mensch, in dieser Reihenfolge, jeder Schritt mit Rücknahme)

**Vorab entscheiden (Besitzer), alles ohne Eile ausser (a) und (e) vor Schritt 5:**
(a) KI-Kontrolle: Gemini-Guthaben aufladen und `gemini-2.5-flash` mit dem Actions-Schlüssel prüfen, oder Secret/Variable `PRINTFUL_KI_KONTROLLE` = `aus`.
(b) Zeitplan: ein Lauf täglich (13:37 UTC, so ausgeliefert) oder zusätzlich eine zweite Tageszeit (eine Zeile im Workflow).
(c) `PRINTFUL_MIN_NETTO_CHF`: Vorgabe 4 (Ziel der Preisformel) belassen oder 0 setzen.
(d) Telegram-Secrets `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` im Repo vorhanden? Ohne sie gehen Befunde nirgends hin (die Tags werden trotzdem gesetzt) und die Befundtexte stehen NIRGENDS, weil das öffentliche Protokoll sie nicht mehr trägt.
(e) Sticker neu bepreisen? (261 Fertig-Sticker zu CHF 4.90; ein Einzelsticker bringt −1.15 CHF netto und bleibt bis dahin Entwurf `kosten`; ab drei Stück passt es, siehe #1033.)
(f) Nahtfarbe: `PRINTFUL_STITCH_COLOR` = `white`/`black` festlegen oder den Editor die Option schreiben lassen (betrifft neun Produkte).
(g) Shop-Daten: iPhone-Hülle mit `wunschdesign` taggen; Bügeltransfer klären.

1. **PR mergen** (Dateien oben). CI: die neuen Schritte laufen mit. *Rücknahme:* PR zurücknehmen (`git revert`); die alte Fassung liegt in der Git-Geschichte.
2. **Trockenlauf von Hand:** Actions → «Printful-Sync» → Run workflow (der Haken «Nur testen» ist jetzt vorgesetzt). Erwartung heute: «Keine offenen POD-Bestellungen» (offen sind #1034 bis #1036, keine POD). Zusammenfassung lesen; die Zeile «Modus: nur gelesen» muss dastehen. *Rücknahme:* nichts geschrieben.
3. **Telegram-Test (NEU):** im Trockenlauf wird Telegram nur als «[DRY] Telegram würde senden (N Zeichen)» gemeldet, nie gesendet. Einmal die Zustellung prüfen: die Bestellung aus Schritt 4 liefert die erste echte Meldung (Zusammenfassung «✅ LuxeStyle POD: Printful-Sync fertig …»); bleibt sie aus, Secrets prüfen, Fehlermeldung «Telegram-Meldung nicht zugestellt» im Protokoll lesen.
4. **Erste echte Bestellung mit Editor-Design** (der Besitzer kauft selbst eine Tasse, rund CHF 20): erst Trockenlauf (Zusammenfassung zeigt die anstehende Bestellung mit external_id und Befundarten), dann das Secret/die Variable `PRINTFUL_AUTO_CONFIRM` auf `0` stellen und den Haken «Nur testen» entfernen: es entsteht ein ENTWURF mit `external_id` `LX<Nr>`, Metafeld `printful.order_id`, Tags `printful-synced`, `printful-review-manuell`. Im Printful-Dashboard Dateien, Kosten, Adresse ansehen und von Hand bestätigen. **Dabei messen und hier nachtragen:** (1) Sekunden bis «Dateien und Kosten fertig» (Zeile im Protokoll «nach N s Wartezeit»), (2) Form der Kosten eines Entwurfs, (3) ob Printful eine doppelte `external_id` ablehnt (Probe: dieselbe Bestellung ein zweites Mal von Hand anlegen lassen ist NICHT nötig und nicht erwünscht; das Verhalten zeigt sich, wenn ein Lauf den Auftrag nach einem verlorenen Tag-Schreiben findet), (4) Telegram-Zustellung. *Rücknahme:* Entwurf im Printful-Dashboard löschen (kostet nichts), Tags an der Bestellung entfernen. *Testkauf ohne Geld:* mit einem 100-%-Rabattcode (legt der Besitzer an) wäre der Erlös 0, der Auftrag also `kosten-unbekannt` (Entwurf); den Entwurf danach im Dashboard löschen. Er prüft Platzierung, Dateien und Meldungen, aber nicht den Kosten-Wächter.
5. **Automatisch bestätigen:** `PRINTFUL_AUTO_CONFIRM` leeren/`1`. Zweite Bestellung von Hand scharf starten: der Lauf bestätigt, liest den Status nach und schreibt «BESTÄTIGT (Status pending)». *Rücknahme:* `PRINTFUL_AUTO_CONFIRM=0` (nur Entwürfe). Ein bereits bestätigter Auftrag lässt sich im Printful-Dashboard stornieren, solange er nicht in Produktion ist (QUELLE Printful-Hilfe, nicht geprüft).
6. **Zeitplan scharf:** Datei `dropship/PRINTFUL-SYNC-FREI.txt` mit einem Satz (Grundlage, Datum) ins Repo legen. Ab dem nächsten Lauf (13:37 UTC) schreibt der Zeitplan. Kontrolle des ersten Laufs: Zusammenfassung («Modus: scharf»), Exit, Telegram, Tags an den Bestellungen, `printful_tracking` (15:23 UTC) liest die neuen Aufträge. *Rücknahme:* Freigabedatei löschen = der Zeitplan liest nur noch; die `cron`-Zeile auskommentieren = nur Handstart.
7. **Aufräumen:** Bestellungen mit `printful-review` wöchentlich ansehen (Telegram nennt die Art). **Harter Befund:** Ursache beheben, Tag `printful-review` entfernen. **Weicher Befund:** Entwurf im Printful-Dashboard prüfen und von Hand bestätigen (das Entfernen des Tags bewirkt dort nichts).
