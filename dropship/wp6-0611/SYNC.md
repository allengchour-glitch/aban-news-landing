# WP6 Paket A: Parser und Sync (06.11.2026) · Phase 1 «Bestellweg härten» (09.11.2026)

> **Stand 09.11.2026:** Paket A wurde mit `main` zusammengeführt (Dreiwege-Zusammenführung, PR #3031 von Codex bleibt erhalten) und um die Phase 1 des Plans «Editor-Parität» erweitert: **Abschnitt 7**. Die Abschnitte 1 bis 6 sind der Stand des Zweigs vom 06.11.2026; wo die Zusammenführung etwas ändert (die qd-Prüfung), steht es dort vermerkt.

**Stand:** gebaut und getestet, **nichts live, nichts an Shopify, Printful, CJ, Cloudinary, Metricool, Klaviyo oder Telegram geschrieben.** Printful wurde nur mit drei Lese-Aufrufen (GET) befragt, Shopify nur lesend (Token per Client-Credentials, Abfrage der letzten Bestellungen), dazu ein Bereichs-GET auf die öffentliche Cloudinary-Datei der Canary-Anfrage und eine Websuche. Der Zeitplan des Syncs läuft weiter nur lesend (die Freigabedatei `dropship/PRINTFUL-SYNC-FREI.txt` fehlt und wird nicht gelegt), `PRINTFUL_AUTO_CONFIRM` bleibt `0`, `PRINTFUL_KI_KONTROLLE` bleibt `aus`.

Dateien: `automation/lib/printful_bestellweg.mjs` (Parser und Planung), `automation/printful_sync.mjs` (nur Kopfkommentar), `automation/lib/printful_bestellweg_test.mjs`, `automation/printful_sync_test.mjs`, `dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs` (Mutationsprobe), dazu dieses Blatt und `OHNE-DESIGN.md`. `.github/workflows/printful-sync.yml` und `.github/workflows/luxestyle-automation-tests.yml` habe ich **nicht geändert** (Begründung unten; die Zeilen, die am 06.11.2026 um 15:36 UTC ein anderes Paket in `luxestyle-automation-tests.yml` für das Spiegelwerkzeug ergänzte, gehören nicht zu diesem Paket).

## 1. Messung VORHER (GEMESSEN 06.11.2026)

### Basislinie der bestehenden Prüfungen

| Prüfung | vorher |
|---|---|
| `automation/lib/printful_bestellweg_test.mjs` | 388 ok, 0 Fehler |
| `automation/printful_sync_test.mjs` | 181 ok, 0 Fehler (10,7 s) |
| `automation/lib/printful_platzierung_test.mjs` | 212 ok, 0 Fehler |
| Mutationsprobe `dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs` | 162 von 162 Mutanten erkannt, saubere Ausgangslage |

(Der Bauplan nennt «319, 212, 136»: das ist ein älterer Stand, gemessen sind die Zahlen oben.)

### Was der Parser mit der echten Position der Canary-Tasse tat

Eingabe: die abgefangene Kaufanfrage der Canary-Tasse (`fabrik/lauf-0611/README.md`: `🎨 Design (default)` als Text, `🖼️ Druckdatei (default)` mit der Cloudinary-Adresse, `_pod_karte = {"v":6,"m":403,"pv":17197,"sv":"68134397739399","pl":["default"],"ap":0}`), SKU `9100403_17197`; dazu die ECHTEN Printful-Antworten desselben Tages (`GET /products/variant/17197`, `/mockup-generator/printfiles/403`, `/templates/403`: Druckdatei 44 = 2700×1140 px bei 300 dpi, `min_dpi` 150, keine Konflikte) und die Kopfzeile der echten Cloudinary-Datei (PNG, **2700×1140 px**, also genau die Druckdatei). Mess-Skript im Scratch, Netz gefälscht.

| Eingabe | Parser alt (HEAD) | Planung alt (`planeBestellung`) |
|---|---|---|
| `🖼️ Druckdatei (default)` (Editor 6.2.0) | 1 Datei als v6, kein Problem | 1 Artikel Variante 17197, Datei `default`, **kein Befund** |
| `_Druckdatei (default)` (neuer Schlüssel) | **1 Datei als v5 (Vorderseite geraten)**, weicher Befund `karte-ohne-datei` | 1 Artikel, aber Befund `karte-ohne-datei`: der Auftrag wäre **nie automatisch bestätigt** worden |
| `…` plus `_vorschau` (Cloudinary-JPEG) | wie ohne `_vorschau` (die Vorschau stört nicht) | wie ohne |
| alter und neuer Schlüssel zugleich | 2 Dateien, harter Befund `schluessel-gemischt` (zufällig richtig: der neue Schlüssel galt als v5) | – |
| keine Druckdatei, nur Karte und Designtext | – | `karte-ohne-datei` (weich) **und** `keine-druckdatei` (hart) |

Schlimmer bei anderen Platzierungen (GEMESSEN, alte Fassung, nur der Schlüssel `_Druckdatei (<ID>)` mit passender Karte): `sleeve_left` und `embroidery_chest_left` wurden als **Vorderseite** gelesen (v5-Regel: alles ohne «Hinten/Back» ist vorne), nur `back` zufällig richtig; `_Druckdatei (Front)` (falsch geschrieben, ohne Karte) ging als Vorderseite **ohne jeden Befund** durch. Mit Karte hielt nur ihre Platzierungsliste (weicher Befund `karte-ohne-datei`, also Entwurf) den Auftrag auf; ohne Karte gab es keinen Befund.

### Was gar nicht geändert werden musste

- **`.github/workflows/printful-sync.yml` reicht `PRINTFUL_MIN_NETTO_CHF` schon durch** (Zeile 85: `${{ secrets.PRINTFUL_MIN_NETTO_CHF || vars.PRINTFUL_MIN_NETTO_CHF }}`, per grep gemessen; die Notiz im Bauplan «reicht heute nicht an» ist überholt, die Zeile steht seit dem Commit 8c123bc07c, #2907, per `git log -S` gemessen). Ohne Wert bleibt die Variable leer, und das Skript nimmt seinen Standard 4 CHF (Test `Kleber: Vorgabe des Mindestgewinns ist 0` der Mutationsprobe). **Es wurde kein Wert gesetzt.** Standardwerte im Workflow: `PRINTFUL_AUTO_CONFIRM` → `'0'`, `PRINTFUL_KI_KONTROLLE` → `'aus'`. Neu sind nur Prüfungen, die das festhalten (siehe 3.).
- Der Sync braucht für die neue Schreibweise **keine** Änderung: `hatDruckdatei` (`/Druckdatei|Print file|^_pod_karte$/i`) erkennt `_Druckdatei (…)` schon; er ruft nur `planeBestellung` auf. Im Sync änderte sich darum nur der Kopfkommentar (Vertrag und Befunde); sein Verhalten prüfen jetzt die neuen Attrappen-Szenarien.
- Keine neue Datei, die der Sync einliest: das `sparse-checkout` im Workflow und die Pfadlisten von `luxestyle-automation-tests.yml` bleiben unverändert (neu: ein Test, der prüft, dass jede eingelesene Datei im `sparse-checkout` steht).

## 2. Was gebaut wurde (je Auftragspunkt)

**(1) Alte und neue Schreibweise zu 100 % gelesen.** `lib/printful_bestellweg.mjs`: neuer Schlüssel `_Druckdatei (<ID>)` (ID `[a-z0-9_]+`) wird wie `🖼️ Druckdatei (<ID>)` als v6 gelesen (ID, Dateityp aus `dt`, Seite, Quelle `v6`); `dateien[].schluessel` sagt `alt`, `neu` oder `v5`. Test: 16 Platzierungs-IDs (front, back, default, Ärmel, Etiketten, Stickerei, DTF, …) in beiden Schreibweisen Zeile für Zeile gleich. **Gemischte Schreibweisen** (alt und neu, alt und Editor 5, neu und Editor 5, alle drei; dieselbe oder verschiedene Platzierungen) sind **ein harter Befund `schluessel-gemischt`**, ohne zusätzliches `datei-doppelt`. Entscheidung: auch bei verschiedenen Platzierungen hart, weil kein Editor zwei Schreibweisen in eine Position schreibt (nur Manipulation oder zusammengeführte Quellen); hart heisst nur «kein automatischer Auftrag», der Besitzer sieht es. **Neu:** ein Schlüssel, der mit `_Druckdatei` beginnt (auch `_druckdatei`) und nicht lesbar ist (Grossbuchstaben, ohne Klammern, Leerzeichen in der ID, Zusatz hinter der Klammer), ist ein harter Befund `datei-schluessel` und wird **nie als Editor 5 (Vorderseite) geraten**.

**(2) `_pod_karte.qd` nur weich.** Parser: `qd` gültig = ganze JSON-Zahl 1 bis 1000, sonst weicher Befund `aufloesung-angabe` («keine ganze Zahl von 1 bis 1000»); fehlt `qd` (oder ist `null`), ist das kein Befund. Planung: **seit der Zusammenführung (09.11.2026) gilt die Prüfung aus PR #3031 (Codex, auf `main`)**, der weiche Befund `qd-weicht-ab`: `qd` < `templates.min_dpi` des Katalogs, oder (nur bei vollständig messbaren Platzierungen) `qd` ≠ abgerundetes Minimum der an den Dateien gemessenen dpi. Der Baustein `qdPruefen` mit den Befunden `aufloesung-foto` und `aufloesung-angabe` (Toleranz 2 % + 1 dpi, Vergleich mit der BESTEN Messung, Normalfall `qd` unter der Messung ohne Befund) aus dem Zweig ist **entfallen**: beide prüften dieselbe Angabe, und die Tests von `main` erwarten jede Abweichung als genau einen Befund `qd-weicht-ab`. Die Tests des Zweigs zu `qdPruefen` wurden auf `qd-weicht-ab` umgestellt.

- **Nie hart, nie eine Freigabe:** `qd` fügt nur weiche Befunde hinzu; ein hohes `qd` löscht den Befund `aufloesung` einer zu kleinen Datei nicht (Test: Datei 900×380 px = 100 dpi, `qd` 300 → `aufloesung` und `qd-weicht-ab`, Entwurf). Massgebend bleibt die Messung an der Datei.
- **Bekannter Fehlalarm (GEMESSEN mit dem echten Editor 6.4.0, Abschnitt 7.5):** der Editor schreibt in `qd` die dpi des FOTOS (höchstens die Dichte der Druckdatei), die Druckdatei misst immer ihre eigene Dichte. Ein erlaubter Kauf mit einem 500-px-Foto auf dem T-Shirt (`qd` 83, Mindestwert 75, Datei 150 dpi) löst `qd-weicht-ab` aus. Die Paket-A-Regel (nur `qd` über der Messung melden) hätte das nicht getan. Nicht geändert, Entscheid offen.

**(3) Karte gegen SKU: Widerspruch ist HART `karte-widerspruch`** (vorher weich). Drei Prüfungen:
1. `_pod_karte.pv` ≠ Printful-Variante der SKU der Position → hart, ohne jede Netzabfrage (Variante, Datei, KI-Kontrolle werden gar nicht erst geholt).
2. `_pod_karte.m` ≠ Modell der SKU, **wenn** die SKU dem Fabrik-Schema `<9100000 + Modell>_<Variante>` folgt (`modellAusSku`: Vorsilbe 9100001 bis 9199999; ältere Produkte mit `8481330_…`, `9448929_…`, `9000001_…`, `5599797_…` ergeben `null`, GEMESSEN an `dropship/pod-auswahl/sku_index.json`) → hart, offline.
3. `_pod_karte.m` ≠ Produkt der Variante laut Printful (`GET /products/variant/<id>`, für alle SKU-Schemata) → hart, danach keine Datei- und KI-Abfragen mehr.
Eine **fehlende** Karte (v5, alte Bestellungen) ist kein Befund; ebenso `pv`/`m` = `null` oder nicht lesbar (wie bisher, Entscheid GL1 Fund 11). `sv` (Shopify-Variante) wird weiter **nicht** verglichen (Format im Editor ungemessen, im Abfragetext des Syncs fehlt die Varianten-ID).

**(4) `_vorschau` stört den Parser nie.** Der Schlüssel enthält weder «Druckdatei» noch «Print file», wird nie gelesen, nie auf den Host geprüft und nie abgerufen (Tests: allein, neben jeder Schreibweise, mit fremdem Host, neben Editor 5 ohne Mischung, in der Planung: nur die Druckdatei wird geholt und geprüft; ohne Druckdatei ist `_vorschau` **kein** Ersatz, Befund `keine-druckdatei`).

**(5) Bestellung ohne Design.** Der Befund `keine-druckdatei` bleibt **hart**; die Meldung ist klarer (sagt, ob ein Editor-Eintrag da war, dass es keinen Printful-Auftrag und keine Nachricht an die Kundin gibt, und nennt `dropship/wp6-0611/OHNE-DESIGN.md`; Titel auf 60 Zeichen gekürzt, höchstens 262 Zeichen, GEMESSEN). Das weiche `karte-ohne-datei` derselben Ursache fällt in der Meldung weg (Befunde anderer Positionen bleiben). **Kein Kundenkontakt und keine Erstattung durch Code:** Test an der Attrappe, die einzige Schreibaktion an Shopify sind die zwei Tags. Ablauf und Mail-Entwurf (nicht freigegeben): `OHNE-DESIGN.md`.

**(6) Workflow.** Gemessen: `PRINTFUL_MIN_NETTO_CHF` ist schon durchgereicht (siehe oben), **nichts geändert**. Neue Prüfungen halten fest: `PRINTFUL_AUTO_CONFIRM` Standard `'0'`, `PRINTFUL_KI_KONTROLLE` Standard `'aus'`, `PRINTFUL_MIN_NETTO_CHF` ohne eigenen Standardwert, Handstart mit «Nur testen» als Vorgabe, alle eingelesenen Dateien im `sparse-checkout`.

### Befundnamen (Tags `printful-review-<art>`)

| art | hart? | neu/geändert | Auslöser |
|---|---|---|---|
| `datei-schluessel` | hart | **neu** | Schlüssel beginnt mit `_Druckdatei`, Platzierung nicht lesbar |
| `schluessel-gemischt` | hart | erweitert | zwei oder drei Schreibweisen (alt, neu, Editor 5) in einer Position |
| `karte-widerspruch` | **hart** (war weich) | geändert | `pv` ≠ SKU-Variante; `m` ≠ SKU-Modell (91…-Schema); `m` ≠ Produkt der Variante laut Printful |
| `qd-weicht-ab` | weich | **neu auf `main` (PR #3031)**, ersetzt `aufloesung-foto` | `qd` unter `min_dpi` oder ≠ abgerundetes Minimum der Messung (siehe 2.) |
| `aufloesung-angabe` | weich | **neu** | `qd` ist keine ganze Zahl von 1 bis 1000 |
| `keine-druckdatei` | hart | Text klarer | bezahlt ohne Design |
| `karte-ohne-datei` | weich | entfällt bei `keine-druckdatei` | – |

Die Tabelle in `dropship/selbst-gestalten-fertig-0511/bestellweg/README.md` ist am 09.11.2026 nachgeführt (`karte-widerspruch` hart, neue Befundarten aus Phase 1). `pod/v6/README.md` wurde nicht angefasst (nicht Teil dieses Auftrags).

## 3. Messung NACHHER (Stand des Zweigs 06.11.2026, vor der Zusammenführung; die Zahlen vom 09.11.2026 stehen in Abschnitt 7.7)

| Prüfung | vorher | nachher |
|---|---|---|
| `printful_bestellweg_test.mjs` | 388 | **492** ok, 0 Fehler |
| `printful_sync_test.mjs` | 181 | **206** ok, 0 Fehler |
| `printful_platzierung_test.mjs` | 212 | 212 ok, 0 Fehler (unverändert) |
| Mutationsprobe (Mutanten, jede Fundstelle genau einmal anwendbar, Kontrolllauf ohne Mutation grün) | 162 von 162 (10 min 44 s) | **207 von 207 erkannt** (12 min 50 s): 162 bestehende, davon 4 an den neuen Code angepasst, dazu 45 neue «WP6 …» |

**Rotprobe** (die neuen Prüfungen gegen die ALTE Fassung von HEAD, mit Platzhaltern für die neuen Funktionen): im Lauf gegen die alte Fassung (isolierte Kopie, ohne die Preisformel-Datei, darum 491 statt 492 Prüfungen) sind **75 der Prüfungen von `printful_bestellweg_test.mjs` rot** (416 grün) und **16 der 206 von `printful_sync_test.mjs`** (190 grün). Alle übrigen neuen Prüfungen sind Schutzprüfungen für Verhalten, das vorher schon stimmte (alte Schreibweise, `_vorschau`, Workflow-Standardwerte); sie sind durch Mutanten abgesichert.

**Gegenproben von aussen (GEMESSEN 06.11.2026):** `pod/v6/test/parser_messen.mjs` (Paket B, «der Parser MUSS beide Schreibweisen lesen») ergibt mit diesem Parser **3 von 3 Fällen ok, Exit 0**; mit der alten Fassung von HEAD **nur 1 von 3** (6.2.1 mit drei Platzierungen: 2 Dateien als v5 und der harte Befund `datei-doppelt`). `pod/v6/test/unit_test.mjs` (liest die Eigenschaften der Editoren 6.2.0 und 6.2.1 mit diesem Parser): 359 Prüfungen je Fassung bestanden. Die CI-Probe `automation/pod_auswahl_mutation.mjs` (Teil «Bestellweg», 10 Mutanten, die diese Dateien berühren): 10 von 10 erkannt, Exit 0; `mutation.mjs --pruefen` (die Prüfung, die die CI ausführt): 207 Mutanten, jeder genau einmal anwendbar. Der Kommentar in `luxestyle-automation-tests.yml` Zeile 326 nennt «162 Mutanten, rund 9 Minuten»; jetzt sind es 207 und rund 13 Minuten. Das ist nur ein Kommentar und wurde nicht angefasst.

**Attrappen-Bestellungen aus den echten Eigenschaften** (Kindprozess mit gefälschtem Netz, `automation/printful_sync_test.mjs`, Abschnitt WP6): Die Canary-Tasse in alter UND neuer Schreibweise ergibt **byte-gleich denselben Printful-Auftrag** (Artikel 17197, Datei `default`, `external_id` der Position) **ohne Befund** und wird bestätigt (Test mit `PRINTFUL_AUTO_CONFIRM=1`); mit `PRINTFUL_AUTO_CONFIRM=0` (Besitzer-Entscheid) bleibt derselbe Entwurf mit dem **einzigen** Befund `manuell`. Mit `_vorschau` dasselbe, die Vorschau wird nie geholt. Trockenlauf: «würde als Entwurf angelegt und danach bestätigt», nichts geschrieben.

## 4. Rücknahme

- Nichts ist live. Der Zeitplan liest weiter nur (keine Freigabedatei). Rücknahme = die Änderungen an den fünf Dateien zurücknehmen (`git revert` des Commits). Die alte Fassung liest die alten Schlüssel unverändert; der Editor 6.2.0 (`🖼️ Druckdatei (…)`) funktioniert mit beiden Fassungen.
- Reihenfolge beim Einschalten (Bauplan L6): **erst den Parser** (dieses Paket) in `main`, dann den Editor 6.2.1 mit dem neuen Schlüssel. Umgekehrt würde ein Editor mit `_Druckdatei` auf dem alten Sync als Vorderseite gelesen (Messung oben).
- Rücknahme eines Befunds an einer Bestellung: Tags `printful-review` und `printful-review-<art>` entfernen, dann liest der Sync sie wieder (nur nach Behebung der Ursache, sonst kommt dieselbe Meldung erneut).

## 5. Was ungemessen bleibt, Annahmen, Risiken

1. **Ob die Admin-API Eigenschaften mit führendem Unterstrich liefert, ist ungemessen** und für beide Wege entscheidend (`_pod_karte` gibt es schon, `_Druckdatei (…)` und `_vorschau` kommen dazu). QUELLE: Drittanleitungen (Shopify Community «Underscore-prefixed properties are generally intended to be hidden from cart/checkout rendering, but not from admin records or API consumers», ShopPad: «still appears on the order in your admin»; Stand 06.11.2026 per Suche), nicht die Shopify-Dokumentation selbst gelesen. GEMESSEN 06.11.2026 lesend: in allen 34 Bestellungen des Shops gibt es keinen einzigen Schlüssel mit Unterstrich (4 Eigenschaften: 2× `🎨 Design`, 2× `🖼️ Druckdatei`, alle v5), also keinen Beleg in die eine oder andere Richtung. **Erste Messung: WP8 (Probebestellung).** Kommen `_`-Schlüssel nicht an, sieht der Sync keine Druckdatei: Folge ist ein sichtbarer harter Befund `keine-druckdatei` mit «Editor-Eintrag nicht da» (nie ein falscher Druck); der Probelauf im Trockenmodus zeigt es vor dem ersten echten Auftrag.
2. **`pv` in der Karte stimmt beim Kaufklick**, aber nicht in Zwischenständen: im Browserprotokoll des Canary-Laufs trugen vier Zwischenstände (Schwarz/325, Rot/325, Rot/444, Blau/444) noch `pv: 11051` und `sv` der ersten Variante, erst der Kaufklick schrieb 17197 und die richtige `sv` (`fabrik/lauf-0611/belege/editor-durchlauf.json`). Weil `karte-widerspruch` jetzt hart ist, würde ein Editor, der `pv` beim Klick veraltet schreibt, Aufträge anhalten (sichere Richtung, aber lästig). **Zu messen in WP8 mit einem Farb- oder Grössenwechsel NACH dem Gestalten.**
3. **Fabrik-SKU-Bereich 9100001 bis 9199999:** Annahme, dass kein bestehendes Shop-Produkt dort liegt (gemessen: bekannte Vorsilben 8481330, 9000001, 9448929, 5599797; Printful zählt Sync-Nummern aufwärts). Läge doch ein altes Produkt in diesem Bereich, würde seine Position mit v6-Karte hart angehalten, sobald `m` nicht zufällig der Vorsilbe minus 9100000 entspricht (sichere Richtung: kein falscher Druck, aber ein unnötiger Handgriff).
4. ~~Toleranz 2 % + 1 dpi und der Vergleich mit der besten Messung~~ **entfallen mit `qdPruefen`** (siehe 2.); der Fehlalarm der Ersatzregel `qd-weicht-ab` ist in 7.5 beschrieben und mit dem echten Editor 6.4.0 gemessen.
5. **Die Printful-Antworten der Tests sind Auszüge** (auf die benutzten Felder gekürzt) vom 06.11.2026; sie stehen als Text im Test, damit keine neue Datei nötig war.
6. **Ein hartes `schluessel-gemischt` bei verschiedenen Platzierungen** (alt für `front`, neu für `back`) ist meine Auslegung von «gemischte Schlüssel bleiben ein harter Befund»; der Auftrag nennt ausdrücklich nur dieselbe Platzierung.
7. **Nicht gebaut:** ein Vergleich des SKU-Modells mit dem Produkt der Variante ohne Karte (SKU `9100403_…`, aber Variante gehört zu einem anderen Printful-Produkt); `sv` gegen die Varianten-ID der Position; Prüfung von `_vorschau` auf Host und Grösse (sie ist für den Druck irrelevant).
8. In GitHub-Ausdrücken (`secrets.X || vars.X`) ist ein Secret mit dem Text «0» nach meinem Wissen wahr (nur der leere Text ist falsch); ungemessen. Wer `PRINTFUL_MIN_NETTO_CHF` auf `0` stellt, sollte im ersten Lauf in der Zusammenfassung nachsehen.

## 6. Befehle

```
/opt/node22/bin/node automation/lib/printful_bestellweg_test.mjs
/opt/node22/bin/node automation/printful_sync_test.mjs
/opt/node22/bin/node automation/lib/printful_platzierung_test.mjs
/opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs           # alle Mutanten (rund 13 Minuten), --pruefen: nur Anwendbarkeit, NUR=<Teil des Namens>
NUR="WP6" /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs # nur die Mutanten dieses Pakets
NUR="P1 " /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs # nur die Mutanten der Phase 1
/opt/node22/bin/node automation/printful_reprice_test.mjs                                      # Preisanpassung (Phase 1)
```
