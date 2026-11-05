# Bestellweg härten (Strom 3, 05.11.2026): bezahlte Bestellung mit Editor-Design → Printful-Auftrag

**Stand: gebaut und getestet, NICHTS live.** Es wurde nichts im Shop, im Theme, bei Printful oder bei CJ geschrieben (nur gelesen: Printful `GET`, Shopify `query`). Kein Auftrag, kein Entwurf, kein Zeitplan eingeschaltet.
Ziel: der Weg «bezahlte Shopify-Bestellung → Printful-Auftrag» ist für ALLE Modelltypen (Einzelfläche, mehrere Platzierungen, Stickerei, Strick, Schnittteile) sicher genug, um ohne Handstart zu laufen. Kennzeichnung der Zahlen: **GEMESSEN** (05.11.2026, lesend), **QUELLE** (Doku/Dritte), **Annahme** (nicht belegt).

## Dateien

| Datei | Was |
|---|---|
| `automation/printful_sync.mjs` | Der Kleber (Version 2): Shopify lesen/markieren, Printful lesen/anlegen/bestätigen, KI-Kontrolle, Telegram. Komplett neu geschrieben. |
| `automation/lib/printful_bestellweg.mjs` | NEU. Reine Logik ohne Netz: Eigenschaften lesen (v5/v6), SKU, Optionen, Technik, Konflikte, Auflösung (PNG/JPEG-Kopfzeile), Kosten-Wächter, Status, Befund-Tags, `planeBestellung`. |
| `automation/lib/printful_platzierung.mjs` | Erweitert: ausdrückliche Platzierung (`entscheideExplizit`), Aliase (`default` = `front`), doppelte Platzierung, Rückseite auf Ein-Platzierungs-Produkt, Rohantwort im Cache. |
| `automation/lib/printful_bestellweg_test.mjs` | NEU, 319 Prüfungen (320 mit `KATALOG_ALLE`, siehe unten). |
| `automation/lib/printful_platzierung_test.mjs` | Angepasst + 37 neue Prüfungen, jetzt 212. |
| `automation/printful_sync_test.mjs` | Neu geschrieben, 136 Prüfungen: das ganze Skript im Kindprozess gegen ein gefälschtes `fetch` (Shopify, Printful, Telegram, KI, Dateien). |
| `automation/pod_auswahl_mutation.mjs` | 11 Mutanten angepasst (ihre Fundstellen gibt es nach dem Umbau nicht mehr), Dateiliste um den neuen Baustein ergänzt; sonst unverändert. |
| `dropship/pod-auswahl/bestellweg_katalog_auszug.json` | NEU, 40 KB: echter Katalogauszug (Tasse 19, T-Shirt 71, Kappe 206, Poster 268, Jacke 388, Strick 769, Hülle 798) für die Tests. Liegt in `dropship/pod-auswahl/`, weil CI diesen Ordner schon auscheckt. |
| `dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs` | NEU. Mutationsprobe, 113 Mutanten. |
| `.github/workflows/printful-sync.yml` | Zeitplan 2× täglich vorbereitet, schreibt nur mit Freigabedatei `dropship/PRINTFUL-SYNC-FREI.txt` (liegt NICHT im Repo). |

## Wie der Lauf jetzt abläuft

```
Shopify: offene Bestellungen, ALLE Seiten (bis MAX=20 POD-Bestellungen)   status:open, bezahlt, unversendet, ohne Tag printful-synced / printful-review
  je POD-Bestellung:
   0. GET /orders/@LX<Nr>      existiert schon? → nichts anlegen, Tag + Metafeld nachtragen          (404 = frei; alles andere = nicht sicher → später wieder)
   1. planen                   SKU → Variante, Dateien → Platzierungen, Optionen, Konflikte, Auflösung, KI, Adresse
        harter Befund → KEIN Auftrag, Tag printful-review(+Art), EINE Meldung
   2. POST /orders             als ENTWURF mit external_id (nie mit confirm, nie wiederholt; bei unklarer Antwort fragt der Lauf über external_id nach)
   3. Tag printful-synced + Metafeld printful.order_id sofort (Ergebnis wird geprüft; scheitert es: NICHT bestätigen, Fehler, Exit 1)
   4. GET /orders/<id>         Dateistatus (Printful prüft selbst), Kosten gegen Shop-Erlös; wartet bis zu 4 Lesungen
        weicher Befund → Entwurf bleibt, Tag printful-review(+Art), EINE Meldung je neuer Art
   5. POST /orders/<id>/confirm, danach Status NACHLESEN: «BESTÄTIGT» nur bei pending/inprocess/partial/fulfilled/inreview; failed/onhold/canceled/draft → Befund
```

**Befund-Tags** (wie `printful-problem-<art>` in `printful_tracking.mjs`): `printful-review` + `printful-review-<art>`. Eine Art wird je Bestellung nur EINMAL gemeldet; kommt eine neue Art dazu, wird nur diese gemeldet.
Eine Bestellung mit `printful-review` liest der Sync nicht mehr (sonst würde sie bei jedem Lauf neu gesendet und gemeldet). **Wer die Ursache behoben hat, entfernt das Tag `printful-review` (die `printful-review-*` dürfen bleiben); der nächste Lauf versucht es neu.**
Vorübergehende Fehler (Netz, 429, 5xx) setzen nur `printful-versuch-<n>`; nach 3 Läufen wird ein Befund `wiederholt-gescheitert` daraus.

### Befundarten

| Art | hart (kein Auftrag) / weich (Entwurf, kein Bestätigen) | Bedeutung, was tun |
|---|---|---|
| `ohne-variante` | hart | SKU der Position und der Variante ohne `_<Printful-Variante>`: SKU im Shop korrigieren. |
| `keine-druckdatei` | hart | weder Eigenschaft noch Metafeld `custom.print_file`: Kundin fragen / Datei beschaffen. |
| `datei-adresse` | hart | Adresse nicht https, fremder Host (erlaubt: `res.cloudinary.com`, `cdn.shopify.com`, plus `PRINTFUL_DATEI_HOSTS`) oder Zugangsdaten in der Adresse. |
| `datei-doppelt`, `schluessel-gemischt` | hart | dieselbe Platzierung zweimal, oder Schlüssel von v5 und v6 gemischt: unklar, welche Datei gilt. |
| `datei-nicht-erreichbar` | hart | Druckdatei antwortet 404/410. |
| `druckdatei-ohne-pod` | hart | Druckdatei-Eigenschaft an einem Produkt ohne POD-Tag (für Kunden frei schreibbar): wird nie gedruckt. |
| `positionen-viele` | hart | mehr als 50 Positionen: weitere Editor-Positionen könnten fehlen. |
| `adresse` | hart | Lieferadresse unvollständig (früher wurde das Land still auf CH gesetzt). |
| `printful-abgelehnt` | hart | `POST /orders` mit 4xx (ausser 401/403): Text von Printful steht in der Meldung. |
| `wiederholt-gescheitert` | hart | dreimal vorübergehender Fehler in Folge. |
| `platzierung` | weich | Platzierung nicht gesichert (Variante nicht lesbar, Seite nicht in der Dateiliste, unbekannte ID, Rückseite auf Ein-Platzierungs-Produkt, zwei Dateien auf derselben Platzierung). |
| `konflikt` | weich | Platzierungen schliessen sich laut Katalog aus (`conflicting_placements`), oder die Konfliktliste ist nicht lesbar. |
| `technik-gemischt` | weich | Stickerei/DTF/Direktdruck in einem Artikel (ob Printful das zulässt, ist nicht belegt). |
| `optionen` | weich | Pflichtoption fehlt (Garnfarben je Stickerei-Platzierung, `stitch_color`, bei Strick `yarn_colors`), unbekannte Option, ungültiger Wert. |
| `aufloesung` | weich | Datei unter Mindest-dpi des Katalogs, Pixelgrösse nicht lesbar, keine Druckdatei-Grösse im Katalog (Stickerei ausgenommen). |
| `druckdaten` | weich | `mockup-generator/printfiles|templates` nicht lesbar oder Produkt-Nummer fehlt. |
| `sku-widerspruch`, `karte-unlesbar`, `datei-ohne-karte`, `karte-ohne-datei` | weich | Eigenschaften widersprechen sich. |
| `kontrolle-fail`, `kontrolle-technisch`, `kontrolle-fehlt` | weich | KI sagt FAIL / KI nicht erreichbar oder Antwort ohne PASS/FAIL / kein Schlüssel eingerichtet. |
| `kosten`, `kosten-unbekannt` | weich | Verlust laut Printful-Kosten / Kosten oder Erlös unbekannt. |
| `datei-abgelehnt`, `datei-wartet` | weich | Printful lehnt die Datei ab (status/warning) bzw. prüft nach 4 Lesungen noch. |
| `entwurf-nicht-lesbar`, `manuell`, `bestaetigen-abgelehnt` | weich | Entwurf nicht nachlesbar / `PRINTFUL_AUTO_CONFIRM=0` / Bestätigen mit 4xx abgelehnt. |
| `zahlung-fehlgeschlagen`, `angehalten`, `storniert`, `nicht-bestaetigt`, `status-unbekannt` | weich | Status nach dem Bestätigen (failed = meist Karte; GEMESSEN am Fall #1033: «Invalid Card Number»). |
| `vorhanden-entwurf`, `vorhanden-<…>` | weich | Auftrag mit dieser external_id gibt es schon (Entwurf oder failed/onhold/canceled): nichts angelegt. |

## Vertrag mit dem Editor (Warenkorb-Eigenschaften einer Position)

| Schlüssel | Wert |
|---|---|
| `🖼️ Druckdatei (<Platzierungs-ID>)` (v6) | https-Adresse bei Cloudinary. `front`, `back`, `sleeve_left`, `label_outside`, `embroidery_chest_left` … Der Dateityp des Auftrags ist `_pod_karte.dt[ID]`, sonst die ID selbst (`front` → `default`). |
| `_pod_karte` (v6) | JSON `{v:6, pl:[…], dt:{…}, px:[…], o:{<Optionsid>:<Wert>}}`; `o` ist NEU und optional (Printful-Optionen). Gegenprobe: Datei ohne Eintrag in `pl` und Eintrag ohne Datei sind weiche Befunde. |
| `⚙️ Option (<Optionsid>)` (v6, NEU) | eine Printful-Option, z. B. `⚙️ Option (thread_colors_chest_left)` = `#FFFFFF,#CC3333`, `⚙️ Option (stitch_color)` = `black`. Gewinnt gegen `_pod_karte.o`. |
| `Vorne · 🖼️ Druckdatei`, `Hinten · 🖼️ Druckdatei`, `🖼️ Druckdatei (Vorne)` (v5) | wie bisher: Schlüssel mit «Hinten»/«Back» = Rückseite, sonst Vorderseite. Der Printful-Produkttyp bestimmt die Platzierung. |

**Offen für die Editor-Seite:** der Editor v6 schreibt die Optionen heute NICHT (GEMESSEN 05.11.: kein «thread» im Code). Bis er es tut, bleibt jeder Stickerei-Auftrag ein Entwurf mit Meldung `optionen`; das ist gewollt (Printful verlangt Garnfarben).
Katalog (GEMESSEN, 577 Produkte): 504 Stickerei-Platzierungen, 499 mit `thread_colors_<Rest>`, 5 (`embroidery_apparel_front`) mit `thread_colors_apparel`, 46 Produkte allgemein `thread_colors`; die Regel findet für alle 504 eine Option. Weitere Optionen im Katalog: `stitch_color` (113 Produkte), `embroidery_type` (52), `lifelike` (92), `yarn_colors` (15), `base_color`, `trim_color`, `inside_pocket`, `custom_border_color`, `notes` (356), `license_type` (576).
**Pflicht** im Code sind nur: Garnfarben je Stickerei-Platzierung (Printful), `stitch_color` (das Schätzwerkzeug musste sie wiederholt nachtragen: Annahme als Pflicht), `yarn_colors` bei Strick (Annahme). Alles andere ist optional; Printfuls eigene Ablehnung beim Anlegen (4xx) fängt Fehlendes als `printful-abgelehnt` auf.

## Messungen (alle lesend, 05.11.2026)

* `GET /products/variant/4025` liefert das VOLLE Produkt (`options` 7, `techniques` 3, `files` mit `additional_price` und `options`); die Mitschnitte in `pod-auswahl/platzierung_mitschnitte.json` sind gekürzt.
* `GET /orders/@LX-…` (unbekannt) → **404** `{"code":404,"result":"Not Found"}`; Rate-Limit-Kopf 120 je 60 s. **`GET /orders?external_id=…` filtert NICHT** (lieferte alle Aufträge): darum nur `/orders/@<external_id>`.
* Das Printful-Konto kennt bisher nur **2 Aufträge** (183834327 vom 31.10., 165452870 vom 03.07.), beide `external_id: null` (der alte Sync setzte keine), Kosten in USD, Dateien mit `status: "ok"`, `width/height/dpi`. Auftrag 183834327: `total 19.71` inkl. `tax 1.47` (8.1 % von Ware + Versand 18.24), `retail_costs` leer.
* Shopify-Abfragekosten der neuen Abfrage (2026-01): 10 Bestellungen × 50 Positionen = 158 angefragte Punkte, 25 × 25 = 206; 2000 verfügbar. Zum Messzeitpunkt 3 offene Bestellungen (#1034 bis #1036), keine POD: genau der Fall «Nicht-POD verdrängt POD».
* **Auflösung der v5-Dateien:** bei 1200×1200 px (Annahme: Verhältnis je Produkt ungemessen) fallen **18 von 37** gelesenen Live-Produkten unter die Mindest-dpi des Katalogs (alle Variante für Variante): Boardshorts 24 dpi, Badeanzug 34, Leggings 26, Pullover 27, Hoodie allover 30, Bomberjacke 33, Kleid 26, Jogginghose 24, Sport-BH 48, Rucksack 59, Stoffbeutel 71, Kissen 57, Tote 71, Poster 31 (Mindest 150), Mauspad 133 (Mindest 150), Notizbuch 137 (Mindest 150), Strandtuch 16, Decke 19. Die anderen 19 (T-Shirt, Hoodies, Tasse, Hülle, Kappe, Taschen, Sticker, Magnet, Flasche, Body, Laptop-Hülle, Samsung) bestehen. **Folge:** solange der v5-Editor 1200-px-Dateien liefert, werden diese 18 Produkte nie automatisch bestätigt, sondern bleiben Entwurf mit `aufloesung` (richtig so: ein Poster mit 31 dpi sollte niemand drucken). Der Editor v6 liefert die Dateien in der Pixelgrösse der Druckdatei.
* Katalog: `fill_mode` ist `fit` oder `cover`; `min_dpi` 0.5 (Strick) bis 150; 165 Produkte führen Stickerei- UND andere Platzierungen.

## Codex-Funde (pod-preise, 28.10.2026, `dropship/CODEX-FUNDE-2810.md`) → behoben?

| # | Fund (Schwere) | Stand | Wo | Test |
|---|---|---|---|---|
| 1 | Doppelter bestätigter Auftrag, wenn das Markieren in Shopify scheitert (wichtig) | **behoben** | `printful_sync.mjs` `bearbeite`: `external_id` `LX<Nr>`, Vorab-Nachfrage `GET /orders/@…`, Entwurf zuerst, Tag/Metafeld-Ergebnis geprüft (userErrors, HTTP, GraphQL-Fehler) und VOR dem Bestätigen, Nachfrage nach unklarem `POST` | sync: «Auftrag existiert…», «POST /orders → 503…», «Markieren scheitert (userErrors / HTTP 500 / GraphQL-Fehler)», «Metafeld scheitert», «…der zweite Lauf legt keinen zweiten an»; Mutanten «Bestätigen trotz gescheitertem Markieren», «Fehler von tagsAdd werden übersehen», «external_id wird nicht mitgesendet» |
| 2 | Nicht-POD-Bestellungen verdrängen POD aus den ersten MAX (wichtig) | **behoben** | `main()`: Cursor-Blättern bis MAX POD-Bestellungen, Seitenlimit 30 mit Fehler | sync: «Drei Nicht-POD-Bestellungen auf Seite 1…», «MAX=2…», «Mehr als 30 Seiten» |
| 3 | Bestellung nur mit unbekannter SKU: still übersprungen, bei jedem Lauf neu gelesen (wichtig) | **behoben** | `planeBestellung` (harter Befund `ohne-variante`), `befundMelden` (Tags + eine Meldung), Query `-tag:printful-review` | sync: «Bestellung nur mit unbekannter SKU…», «beim nächsten Lauf: KEINE zweite Meldung» |
| 4 | KI-Kontrolle gibt bei Fehler/Timeout die Produktion frei (wichtig) | **behoben** | `kontrolle()` + `kontrolleLesen`: nur ein Wort PASS/FAIL am Anfang gilt; HTTP-Fehler, Timeout, leere/unklare Antwort, fehlender Schlüssel → Entwurf. Vorgabe `PRINTFUL_KI_KONTROLLE=pflicht` | sync: KI-Block (HTTP 402, Netzfehler, unklar, leer, kein Schlüssel, FAIL, PASS); lib: `kontrolleLesen` (17 Fälle) |
| 5 | Eine Platzierung überschreibt die gewünschte Seite; zwei Dateien können dieselbe Platzierung belegen (wichtig) | **behoben** | `entscheide` (Rückseite auf Ein-Platzierungs-Produkt nicht gesichert), `platzierungenFuerDateien` (doppelte Platzierung, auch `default`/`front` als dieselbe) | platzierung: 30 angepasste Erwartungen + «Kleber mit ausdrücklichen Platzierungen»; sync: «Tasse mit Vorne UND Hinten», «Hülle mit Hinten-Datei» |
| 6 | `printful_reprice` ignoriert Versand und Gebühr, rundet unter den Richtwert (wichtig) | **nicht behoben** | andere Datei, nicht Teil von Strom 3. Die «Selbst gestalten»-Produkte überspringt `printful_reprice` seit 27.10.; der Ersatz ist die Preisformel `werkzeuge/preisformel.mjs` (Strom Preise). | – |
| 7 | Varianten-SKU hat Vorrang vor der SKU der Position (klein) | **behoben** | `skuWaehlen`: Position zuerst, Varianten-SKU als Rückfall, Widerspruch = weicher Befund `sku-widerspruch` | lib: SKU-Block (7 Fälle); sync: «SKU der Position ≠ SKU der Variante…», «SKU der Position kaputt…» |
| 8 | `lineItems(first:50)` ohne Weiterblättern, Position 51+ fehlt (klein) | **behoben (als harter Befund, nicht durch Blättern)** | Abfrage liest `lineItems.pageInfo.hasNextPage`; `positionen-viele` verhindert den Auftrag; auch Bestellungen ohne Editor-Ware in den ersten 50 werden dann geprüft | sync: «Mehr als 50 Positionen», «…in den ersten 50 keine Editor-Ware» |
| 9 | `printful_reprice`: `variants(first:100)` ohne Weiterblättern (klein) | **nicht behoben** | wie 6 | – |
| 10 | `printful_reprice` zählt fehlgeschlagene Preisänderungen als angepasst (klein) | **nicht behoben** | wie 6 | – |
| 11 | Eigener Fund: fehlgeschlagener Auftrag wird bei jedem Lauf erneut gesendet und gemeldet (klein) | **behoben** | Query `-tag:printful-review`; `printful-abgelehnt` setzt das Tag; vorübergehende Fehler zählen bis 3 | sync: «POST /orders → 400…», «Dritter Fehlversuch», «Abfrage schliesst … aus» |

## Weitere Härtungen (nicht aus dem Codex-Bericht, aber im Auftrag)

* **Mehrere Platzierungen (1):** `dateienAusEigenschaften` liest v6 und v5; Typen sind die echten Printful-IDs; unbekannte oder nicht in der Dateiliste stehende Platzierung → Entwurf; Konflikte aus `conflicting_placements` (in beide Richtungen, auf Ebene der Platzierungsnamen: Datei `default` = Platzierung `front`) → Entwurf.
* **Pflicht-Optionen (2):** `optionenPruefen` (Typen `multi_select`, `radio`, `bool`, `text`), Garnfarben in Katalogschreibweise, ungültige Werte werden nie gesendet; durchgereicht als `items[].options`.
* **Auftragsstatus nachlesen (3):** nach dem Bestätigen `GET /orders/<id>`; Zahlung gescheitert (`failed`) wird nie als «bestätigt» gemeldet. Dateien: Printfuls eigene Prüfung (`items[].files[].status/warning`) ist die zweite Schicht nach der eigenen Auflösungsprüfung.
* **Auflösung (5):** PNG-Kopfzeile (IHDR) und JPEG (SOF) ohne Bildbibliothek, nur die ersten 64 KB (Range-Kopf; ein Server, der ihn ignoriert, wird nach 64 KB abgebrochen). Rechnung: `fit` → dpi = Druckdatei-dpi × max(B/Bp, H/Hp), `cover` → min. Gegen `min_dpi` aus `GET /mockup-generator/templates/<id>` (fehlt sie: 72). Für Stickerei führt der Katalog meist keine Druckdatei-Grösse (GEMESSEN am T-Shirt 71): dort entfällt die Auflösung, Garnfarben und Dateistatus gelten.
* **Kosten-Wächter (7):** `costs.total − tax − vat` (USD, ohne Printfuls Steuer wie in der Preisformel) × 0.90 gegen den Erlös der Positionen (`discountedTotalSet`, CHF, inkl. MWST 8.1 %, minus Zahlungsgebühr 3.4 % + 0.30). Unter `PRINTFUL_MIN_NETTO_CHF` (Vorgabe 0 = Verlust) → Entwurf. Kosten noch «calculating»/leer, andere Währung, Erlös unbekannt → `kosten-unbekannt` (kein grünes Licht). Konstanten gleich `werkzeuge/preisformel.mjs` (Test vergleicht, wo die Datei da ist).
* **Sicherheit der Dateiadresse:** Warenkorb-Eigenschaften sind für Kunden frei schreibbar (`/cart/add.js`). Der Lauf ruft nur Adressen von `res.cloudinary.com` / `cdn.shopify.com` / `PRINTFUL_DATEI_HOSTS` ab; nur ein Produkt MIT POD-Tag zählt als Editor-Ware.
* **Stornierte Bestellungen:** Abfrage `status:open`, zusätzlich `cancelledAt` geprüft: eine stornierte, noch nicht erstattete Bestellung wird nie gedruckt.
* **Telegram:** Text maskiert (Fremdtext aus KI/Printful/Titeln), je Zeile höchstens 300 Zeichen, höchstens 10 Zeilen (Limit 4096).
* **Zeitlimit:** Abfragen 20 bis 60 s, Lauf 10 Minuten (`RUN_LIMIT_MS`), Workflow 15 Minuten. Früher hatte das Anlegen des Auftrags gar kein Zeitlimit.

### Geändertes Verhalten gegenüber der alten Fassung (bitte lesen)

1. Ohne `PRINTFUL_API_KEY` oder Shopify-Zugang: **Exit 1** (früher stiller No-op mit Exit 0). Technische Fehler enden mit Exit 1, Befunde nicht.
2. **Bestätigen in zwei Schritten** (`POST /orders` ohne `confirm`, dann `/orders/<id>/confirm`) statt `?confirm=1`; bestätigt wird nur ohne jeden Befund.
3. **KI-Kontrolle ist Pflicht** (`PRINTFUL_KI_KONTROLLE`, Vorgabe `pflicht`). Das Memory nennt `GEMINI_API_KEY` in Actions mit **leerem Guthaben (HTTP 402)** und das Modell `gemini-2.5-flash` ist nicht auf Verfügbarkeit geprüft: **dann wird JEDE Bestellung ein Entwurf** (Meldung `kontrolle-technisch`). Entscheid des Besitzers: Guthaben aufladen oder das Repo-Secret `PRINTFUL_KI_KONTROLLE` auf `aus` setzen (die mechanischen Prüfungen bleiben).
4. Bei nicht lesbarer Printful-Variante bestätigt der Lauf nie mehr (früher Rückfall «Poster/Magnet → default → bestätigt»); es fehlen dann Produkt-Nummer, Mindest-dpi, Konflikte und Optionen.
5. Rückseiten-Datei auf Produkt mit nur `default` (Tasse, Hülle): Entwurf (früher still `default`, bestätigt).
6. Fehlendes Lieferland: harter Befund (früher stilles `CH`).
7. `DRY_RUN`: alles ausser leer/`0`/`false`/`no`/`nein`/`off` ist Trockenlauf (früher nur `1`). Im Trockenlauf wird gelesen (Shopify, Printful `GET`, Dateien, KI), aber nichts geschrieben, kein Tag, keine Meldung.
8. API-Version 2026-01 (die alte lief auf dem abgelaufenen 2025-01).
9. Der Handstart des Workflows bleibt wie bisher: «Nur testen» aus = scharf (die Freigabedatei gilt nur für den Zeitplan).

## Tests und Mutationsprobe

| Datei | Prüfungen | Wie |
|---|---|---|
| `automation/lib/printful_bestellweg_test.mjs` | **319** (320 mit `KATALOG_ALLE=<Ordner mit den 577 Katalogdateien von katalog_holen.mjs>`: alle 504 Stickerei-Platzierungen finden ihre Garnfarben-Option) | reine Logik, echter Katalogauszug, PNG/JPEG-Bytes im Test gebaut |
| `automation/lib/printful_platzierung_test.mjs` | **212** | echte Mitschnitte (17 Produkte), Katalog, Orakel aus der Dateiliste |
| `automation/printful_sync_test.mjs` | **136** | ganzes Skript im Kindprozess, gefälschtes `fetch`, ~100 Szenarien, ca. 5 s |
| `automation/pod_auswahl_test.mjs` (bestehend) | 112 | unverändert grün |
| `dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs` | **113 von 113 Mutanten erkannt** (Lauf 1: 110, drei Überlebende durch neue Prüfungen geschlossen; Lauf 2 komplett: 113 von 113, Exit 0) | Kopie im Temp-Ordner, `--pruefen` prüft nur die Fundstellen |
| `automation/pod_auswahl_mutation.mjs` (bestehende CI-Probe) | **221 von 221 Mutanten erkannt** (Lauf 05.11.2026, Exit 0, Kontrolllauf mit 9 grünen Testdateien) | 11 Mutanten an den Umbau angepasst (Fundstellen im Kleber und in der Platzierung), der neue Baustein und sein Test sind in der Kopie |

Lauf: `/opt/node22/bin/node automation/printful_sync_test.mjs` (usw.), Mutation: `/opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs` (`NUR=<Name>` für einzelne).
Nicht abgedeckt (ehrlich): echter Lauf gegen Printful/Shopify mit Schreiben (nie ausgeführt), echte Telegram-Zustellung, echte KI-Antwort, Verhalten von Printful bei doppelter `external_id` und bei Entwurf-Kosten (siehe «Offen»).

### CI: die zwei Stellen für neue Testdateien (`.github/workflows/luxestyle-automation-tests.yml`, NICHT eingetragen, wie verlangt)

* **`paths:`** deckt alles schon ab (`automation/lib/**`, `automation/*.mjs`, `dropship/pod-auswahl/**`). Nur wenn `bestellweg/mutation.mjs` in CI laufen soll, braucht es `'dropship/selbst-gestalten-fertig-0511/bestellweg/**'`.
* **`sparse-checkout:`** hat `automation/lib` und `dropship/pod-auswahl` schon; deshalb liegt der Katalogauszug in `dropship/pod-auswahl/` und die bestehenden CI-Schritte `printful_sync_test.mjs`, `printful_platzierung_test.mjs` und `pod_auswahl_mutation.mjs` laufen ohne Änderung weiter. Für `mutation.mjs` kämen `dropship/selbst-gestalten-fertig-0511/bestellweg` und (optional, die Probe überspringt fehlende Dateien nicht, der Test schon) `dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs` dazu.
* Fehlende `run:`-Zeilen: `node --check automation/lib/printful_bestellweg.mjs` und `node automation/lib/printful_bestellweg_test.mjs`.

## Offen / nicht gemessen / Entscheide

1. **Doppelte `external_id` bei Printful:** ob Printful sie selbst ablehnt, ist NICHT gemessen (kein Auftrag angelegt). Der Schutz liegt in der eigenen Vorab-Nachfrage; zwei gleichzeitige Läufe schliesst die Concurrency-Gruppe des Workflows aus, nicht aber zwei Handläufe auf zwei Rechnern.
2. **Kosten eines frischen Entwurfs:** Form und Zeitpunkt von `costs` direkt nach `POST /orders` sind nicht gemessen (der Lauf liest bis zu viermal nach). Liefert Printful für Entwürfe nie Kosten, wird JEDER Auftrag `kosten-unbekannt` (sichtbar nach der ersten echten Bestellung; dann Wächter anpassen).
3. **Technik-Mischung** (Stickerei + Direktdruck): ob Printful sie in einem Artikel zulässt, ist nicht belegt → Entwurf. `stitch_color` und `yarn_colors` als Pflicht sind Annahmen.
4. **Editor schreibt keine Optionen** (siehe Vertrag): Stickerei-Produkte bleiben bis dahin Entwurf.
5. **Gemini-Guthaben/Modell** (siehe oben, Punkt 3 der Verhaltensänderungen). Eine eigene Weissbild-Erkennung gibt es nicht (der Editor verhindert leere Entwürfe, Hypothese).
6. **`fulfillment_status:partial`** wird nicht gelesen (wie bisher): eine Bestellung, bei der z. B. Fortura-Ware schon versendet ist, bevor der Sync lief, bleibt liegen. **Positionen am Service-Standort «Printful»** (Tag `printful_personalized_product`) zählen weiter als POD; legt die Printful-App für sie selbst Aufträge an, schützt `external_id` nicht (GEMESSEN: bisher keine App-Aufträge im Konto).
7. **Häufigkeit:** 2× täglich vorgeschlagen, der Besitzer hat die Frage offen; die Notiz «Crons sparsam, max. 1×/Tag» spricht für eine Zeile. Der Zeitplan ist aktiv, tut aber ohne Freigabedatei nur lesen.
8. **Neu anlegen nach Storno im Dashboard:** der Auftrag mit der alten `external_id` existiert weiter (Status `canceled`): der Sync meldet `vorhanden-storniert` und legt nichts neu an. Neu anlegen: im Printful-Dashboard den alten Auftrag LÖSCHEN (nicht nur stornieren) oder dort von Hand anlegen.
9. `printful-review-*`-Tags werden nach der Behebung nicht aufgeräumt (eine Bestellung mit `printful-synced` liest der Sync nicht mehr; `printful_tracking.mjs` räumt nur seine eigenen `printful-problem*`).
10. Wirkung auf Verkäufe: keine erwartet (Hypothese); der Nutzen liegt in weniger Handstarts und in vermiedenen Doppel- und Fehlaufträgen.

## Live-Plan (Mensch, in dieser Reihenfolge, jeder Schritt mit Rücknahme)

**Vorab entscheiden (Besitzer):** (a) KI-Kontrolle: Gemini-Guthaben aufladen, oder Secret `PRINTFUL_KI_KONTROLLE` = `aus`; (b) Häufigkeit 1× oder 2× täglich (Zeilen im Workflow); (c) `PRINTFUL_MIN_NETTO_CHF` bei 0 lassen oder 4 (Ziel der Preisformel); (d) Telegram-Secrets `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` im Repo vorhanden (sonst gehen Meldungen nirgends hin; Tags werden trotzdem gesetzt).

1. **PR mergen** (Dateien oben). CI: die bestehenden Schritte `printful_sync_test.mjs`, `printful_platzierung_test.mjs`, `pod_auswahl_test.mjs`, `pod_auswahl_mutation.mjs` laufen mit; optional die zwei fehlenden `run:`-Zeilen. *Rücknahme:* PR zurücknehmen (`git revert`); die alte Fassung liegt in der Git-Geschichte.
2. **Trockenlauf von Hand:** Actions → «Printful-Sync» → Run workflow → «Nur testen» an. Erwartung heute: «Keine offenen POD-Bestellungen» (offen sind #1034 bis #1036, keine POD). Zusammenfassung lesen; die Zeile «Modus: nur gelesen» muss dastehen. *Rücknahme:* nichts geschrieben.
3. **Erste echte Bestellung mit Editor-Design** (der Besitzer kauft selbst eine Tasse, rund CHF 20; ein Testkauf ohne Geld gibt es nicht): erst Trockenlauf (Plan lesen: Platzierung, Befunde), dann das Secret `PRINTFUL_AUTO_CONFIRM` auf `0` stellen und von Hand scharf starten: es entsteht ein ENTWURF mit `external_id` `LX<Nr>`, Tags `printful-synced`, `printful-review-manuell`, Metafeld `printful.order_id`. Im Printful-Dashboard Dateien, Kosten, Adresse ansehen und von Hand bestätigen. Dabei messen: Kosten des Entwurfs (Offen 2), Dateistatus, Telegram-Meldung. *Rücknahme:* Entwurf im Printful-Dashboard löschen (kostet nichts), Tags an der Bestellung entfernen.
4. **Automatisch bestätigen:** `PRINTFUL_AUTO_CONFIRM` leeren/`1`. Zweite Bestellung von Hand scharf starten: der Lauf bestätigt, liest den Status nach und schreibt «BESTÄTIGT (Status pending)». *Rücknahme:* `PRINTFUL_AUTO_CONFIRM=0` (nur Entwürfe). Ein bereits bestätigter Auftrag lässt sich im Printful-Dashboard stornieren, solange er nicht in Produktion ist (QUELLE Printful-Hilfe, nicht geprüft).
5. **Zeitplan scharf:** Datei `dropship/PRINTFUL-SYNC-FREI.txt` mit einem Satz (Grundlage, Datum) ins Repo legen. Ab dem nächsten Lauf (06:41 oder 13:37 UTC) schreibt der Zeitplan. Kontrolle des ersten Laufs: Zusammenfassung («Modus: scharf»), Exit, Telegram, Tags an den Bestellungen, `printful_tracking` (15:23 UTC) liest die neuen Aufträge. *Rücknahme:* Freigabedatei löschen = der Zeitplan liest nur noch; die beiden `cron`-Zeilen auskommentieren = nur Handstart.
6. **Aufräumen:** Bestellungen mit `printful-review` wöchentlich ansehen (Telegram nennt die Art); Ursache beheben, Tag `printful-review` entfernen.
