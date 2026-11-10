# WP6 Paket A: Parser und Sync (06.11.2026) · Phase 1 «Bestellweg härten» (09.11.2026)

> **Stand 09.11.2026:** Paket A wurde mit `main` zusammengeführt (Dreiwege-Zusammenführung, PR #3031 von Codex bleibt erhalten) und um die Phase 1 des Plans «Editor-Parität» erweitert: **Abschnitt 7**. Die Abschnitte 1 bis 6 sind der Stand des Zweigs vom 06.11.2026; wo die Zusammenführung etwas ändert (die qd-Prüfung), steht es dort vermerkt.

> **Stand 10.11.2026 (Härtung nach der Gegenprüfung P1, 27 bestätigte Funde): Abschnitt 7.10.** Seitdem gilt: ein Weg, der Geld bewegt, ist standardmässig zu. Das Skript schreibt nur bei ausdrücklichem `DRY_RUN=0`; bestätigt wird nur mit Kostenobergrenze UND eingeschalteter KI-Kontrolle; vor dem Anlegen und vor dem Bestätigen wird die Bestellung frisch aus Shopify gelesen (bezahlt, nicht storniert, kein Test); die Dienst-Standort-Sperre hält auch, wenn die Fulfillment-Order unsichtbar oder unlesbar ist. Wo in 7.2 bis 7.8 noch der Stand vom 09.11.2026 steht, ist er dort vermerkt und in 7.10 ersetzt.

**Stand:** gebaut und getestet, **nichts live, nichts an Shopify, Printful, CJ, Cloudinary, Metricool, Klaviyo oder Telegram geschrieben.** Printful wurde nur mit drei Lese-Aufrufen (GET) befragt, Shopify nur lesend (Token per Client-Credentials, Abfrage der letzten Bestellungen), dazu ein Bereichs-GET auf die öffentliche Cloudinary-Datei der Canary-Anfrage und eine Websuche. Der Zeitplan des Syncs läuft weiter nur lesend (die Freigabedatei `dropship/PRINTFUL-SYNC-FREI.txt` fehlt und wird nicht gelegt), `PRINTFUL_AUTO_CONFIRM` bleibt `0`, `PRINTFUL_KI_KONTROLLE` bleibt `aus`.

Dateien: `automation/lib/printful_bestellweg.mjs` (Parser und Planung), `automation/printful_sync.mjs` (am 06.11.2026 nur der Kopfkommentar; **seit 09./10.11.2026 auch Abfrage, Vorgaben, Frischlesen, Markierung und Paketlogik**, siehe 7.2 bis 7.10), `automation/lib/printful_bestellweg_test.mjs`, `automation/printful_sync_test.mjs`, `dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs` (Mutationsprobe), dazu dieses Blatt und `OHNE-DESIGN.md`. `.github/workflows/printful-sync.yml` und `.github/workflows/luxestyle-automation-tests.yml` hatte ich am 06.11.2026 **nicht geändert** (Begründung unten; beide wurden am 10.11.2026 geändert, siehe 7.10; die Zeilen, die am 06.11.2026 um 15:36 UTC ein anderes Paket in `luxestyle-automation-tests.yml` für das Spiegelwerkzeug ergänzte, gehören nicht zu diesem Paket).

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
- Reihenfolge beim Einschalten (Bauplan L6): **erst den Parser** (dieses Paket) in `main`, dann den Editor 6.2.1 mit dem neuen Schlüssel. Umgekehrt würde ein Editor mit `_Druckdatei` auf dem alten Sync als Vorderseite gelesen (Messung oben). **Stand 10.11.2026:** einen Editor 6.2.1 gibt es im Repo nicht (`pod/v6/` führt 6.2.0, 6.3.0, 6.3.1, 6.4.0, 6.4.1) und keiner schreibt den neuen Schlüssel; der Parser liest ihn vorsorglich, die Reihenfolge gilt, falls je ein Editor ihn schreibt.
- Rücknahme eines Befunds an einer Bestellung: Tags `printful-review` und `printful-review-<art>` entfernen, dann liest der Sync sie wieder (nur nach Behebung der Ursache, sonst kommt dieselbe Meldung erneut).

## 5. Was ungemessen bleibt, Annahmen, Risiken

1. **Ob die Admin-API Eigenschaften mit führendem Unterstrich liefert, ist ungemessen** und für beide Wege entscheidend (`_pod_karte` und `_vorschau` schreibt der Editor seit 6.2.0 schon; `_Druckdatei (…)` schreibt heute KEIN Editor: GEMESSEN 10.11.2026 an allen fünf Dateien `pod/v6/*.js` (6.2.0, 6.3.0, 6.3.1, 6.4.0, 6.4.1), 0 Treffer für `_Druckdatei`, alle schreiben die alte Schreibweise `🖼️ Druckdatei (<ID>)`). QUELLE: Drittanleitungen (Shopify Community «Underscore-prefixed properties are generally intended to be hidden from cart/checkout rendering, but not from admin records or API consumers», ShopPad: «still appears on the order in your admin»; Stand 06.11.2026 per Suche), nicht die Shopify-Dokumentation selbst gelesen. GEMESSEN 06.11.2026 lesend: in allen 34 Bestellungen des Shops gibt es keinen einzigen Schlüssel mit Unterstrich (4 Eigenschaften: 2× `🎨 Design`, 2× `🖼️ Druckdatei`, alle v5), also keinen Beleg in die eine oder andere Richtung. **Erste Messung: WP8 (Probebestellung).** Kommen `_`-Schlüssel nicht an, sieht der Sync keine Druckdatei: Folge ist ein sichtbarer harter Befund `keine-druckdatei` mit «Editor-Eintrag nicht da» (nie ein falscher Druck); der Probelauf im Trockenmodus zeigt es vor dem ersten echten Auftrag.
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
/opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs           # alle Mutanten (Dauer und Ergebnis Stand 10.11.2026: 7.7), --pruefen: Anwendbarkeit UND Syntax, NUR=<Teil des Namens>, SHARD=<i>/<n>: jeder n-te Mutant
NUR="WP6" /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs # nur die Mutanten dieses Pakets
NUR="P1 " /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs # nur die Mutanten der Phase 1
NUR="H10 " /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs # nur die Mutanten der Härtung vom 10.11.2026 (7.10)
SHARD=1/3 /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs # …2/3 und 3/3 in zwei weiteren Fenstern: die volle Probe auf drei Prozesse verteilt
/opt/node22/bin/node automation/printful_reprice_test.mjs                                      # Preisanpassung (Phase 1)
```

## 7. Phase 1 «Editor-Parität» (09.11.2026): Bestellweg härten, Sperre «kein Druck ohne Zahlung»

**Nichts live.** Geändert wurden nur Dateien im Repo. Der Zeitplan liest weiter nur: die Freigabedatei `dropship/PRINTFUL-SYNC-FREI.txt` fehlt und wurde nicht gelegt. Auftrag: Plan `PLAN-PRINTFUL-PARITAET-0911.md`, Phase 1.

### 7.1 Herkunft: Paket A als Dreiwege-Zusammenführung

Paket A (Parser und Sync-Härtung) kam vom Zweig `claude/luxestyle-wp6-bestellweg-0611` (Spitze `1976706c1f`, Basis mit `main` `e6fc42e409`). Die Dateien wurden mit `git merge-file` gegen `main` zusammengeführt (Basis, `main`, Zweig je als Kopie im Scratch; am Arbeitsbaum wurde nichts mit git geändert). Fünf Dateien: Parser, Parser-Test, Sync, Sync-Test, Mutationsskript. **Konflikte: nur im Parser (`printful_bestellweg.mjs`), 3 Stellen**, die übrigen vier Dateien liessen sich ohne Konflikt verbinden. Die erste Konfliktstelle ist die Prüfung von `_pod_karte.qd`: `main` führt seit PR #3031 (Codex, 09.11.) die Regel `qd-weicht-ab`, der Zweig hatte eine eigene, ältere Fassung (`qdPruefen` mit Toleranz 2 % + 1 dpi). **Die Regel von `main` blieb, die doppelte Fassung des Zweigs entfiel** (Tests und Mutanten dazu wurden entfernt oder auf `qd-weicht-ab` umgestellt, `OHNE-DESIGN.md` verweist jetzt auf `qd-weicht-ab`).

**Vorher gemessen (diese Sitzung, am Zweig-Stand, 3 Testdateien):** Parser-Test 492 ok, Platzierungs-Test 212 ok, Sync-Test 206 ok (so wie das Blatt des Zweigs sie nannte). `main` vor Phase 1: 393 / 212 / 181.

### 7.2 (a) Hart: `dienst-standort`

Eine Position, die in einer offenen Fulfillment-Order an einem **Fulfillment-Service-Standort** liegt (`Location.isFulfillmentService === true`, z. B. die Printful-App), bekommt **keinen** Printful-Auftrag: die App des Dienstes legt ihn selbst an, ein zweiter Auftrag wäre ein Doppeldruck (und die App druckt eventuell mit dem Muster-Design, ungemessen). Funktion `standortVon(o, positionId)` → `dienst` / `frei` / `unklar`:

* geschlossene und stornierte Fulfillment-Orders zählen nicht (veraltete Angaben);
* `frei` nur, wenn die Position in mindestens einer offenen Fulfillment-Order steht und **alle** ihre Standorte ausdrücklich `isFulfillmentService === false` melden; fehlt ein Wert, fehlt die Fulfillment-Order oder steht die Position in keiner, ist es `unklar`, nie `frei`;
* `dienst` → harter Befund, `continue` (weder Datei- noch KI-Abfrage); `unklar` → **seit 10.11.2026 ebenfalls HART** (`dienst-standort-unklar`, kein Auftrag; am 09.11.2026 war es weich = Entwurf, siehe 7.10, Fund 4 und 21).

Der Kleber (`printful_sync.mjs`) liest dafür neu `variant{ sku title selectedOptions }` und `fulfillmentOrders(first:20){ id status assignedLocation{ location{ id name isFulfillmentService } } lineItems(first:50){ lineItem{ id } } }` (Vorbild `cj_tracking.mjs`, `printful_tracking.mjs`).

**GEMESSEN 09.11.2026 (Admin-Abfrage über den Connector, nur lesend):** 7 Standorte, davon 6 Dienst-Standorte (`cjdropshipping`, `DropCommerceV2`, `gelato`, `Printful`, `Spocket`, `Zendrop`) und ein Händler-Standort («Shop location»). Die Fulfillment-Orders der letzten drei Bestellungen (#1037 bis #1039, CJ-Ware) liegen am Händler-Standort «Shop location». Wie viele Produkte am Standort «Printful» liegen, steht in 7.2a (am 10.11.2026 nachgemessen, auf Variantenebene). Die Fabrik-Produkte (Canary-Tasse, Entwurf) haben keinen Bestandsstand am Standort «Printful» (7.2a) und wären damit nicht gesperrt: **ungemessen für ein veröffentlichtes Fabrik-Produkt**.

### 7.2a Ausmass der Sperre (GEMESSEN 10.11.2026, Funde der Gegenleser p1-bestellweg)

Die Sperre trifft einen grossen Teil der Editor-Produkte, und sie trifft **Varianten, nicht ganze Produkte**. Die erste Messung (Produkt-Ebene, nach der ersten Variante) nannte «11 von 17»; die Nachmessung aller Varianten ergibt dieselbe Produktzahl, aber vier geteilte Produkte. **GEMESSEN 10.11.2026 (Admin-Abfrage über den Connector, nur lesend, keine Storefront-Anfrage, kurz vor 00:10 UTC nach `date -u`; Rohdaten: `dropship/selbst-gestalten-fertig-0511/bestellweg/standort_messung_1011.json`):** Der Bestand des Standorts «Printful» wurde vollständig gelesen (2 Seiten, `hasNextPage` false): 29 Produkte haben dort Bestandsstände, davon 12 ACTIVE, 16 Entwurf und 1 archiviert.

* **11 von 17 aktiven Editor-Produkten** (Tag `wunschdesign`, Status ACTIVE) haben Varianten am Dienst-Standort: **53 von 213 Varianten** (25 %). Das 12. aktive Produkt am Dienst-Standort, die transparente iPhone-Hülle (31 Varianten), trägt das POD-Tag nicht; der Sync liest sie nicht (Befund `druckdatei-ohne-pod`, siehe README).
* **7 liegen ganz am Dienst-Standort:** klassisches Unisex-T-Shirt (8 Varianten), Keramik-Tasse (3), Kiss-Cut-Aufkleber (4), Dad-Cap, Alltags-Umhängetasche, Edelstahl-Trinkflasche und Allover-Stoffbeutel (je 1).
* **4 davon geteilt:**

| Produkt | Varianten | am Dienst «Printful» (getrackt) | am Händler «Shop location» (nicht getrackt) |
|---|---|---|---|
| Unisex-T-Shirt | 25 | 9 | 16 |
| Unisex-Hoodie | 13 | 8 | 5 |
| Bio-Jutebeutel | 2 | 1 | 1 |
| Hardcase-iPhone-Hülle mit MagSafe | 48 | 16 | 32 |

  Bei allen vier steht die **erste** Variante der Abfrage (Position) am Dienst-Standort. Welche Variante die Produktseite vorwählt, ist **ungemessen** (keine Storefront-Anfrage). Warum die Produkte geteilt sind, ist nicht gemessen; Hypothese: die erste Gruppe legte die Printful-App an, die später im Shop ergänzten Varianten (Materialauswahl vom 28.10.) liegen am Händler-Standort.
* Die 6 übrigen aktiven Editor-Produkte (Magnet, Tasse zum Selbstgestalten, Shirt zum Selbstgestalten, Mauspad, Spiral-Notizbuch, Samsung-Hülle; zusammen 106 Varianten) haben keinen Bestandsstand am Dienst-Standort: die Sperre greift dort nie.
* **Bestellungen:** #1003 bis #1039 gelesen (37): 36 mit Fulfillment-Order, alle am «Shop location», #1017 ohne (der Sync läse sie als `dienst-standort-unklar`, weich). **Nie lag eine Fulfillment-Order am Dienst-Standort.** Wie sie sich verhält (Status, was die Printful-App druckt), ist nie beobachtet worden.

**Folge im Betrieb (aus dem Code und seinen Tests, nicht an einer echten Bestellung beobachtet):**

* Eine Variante am Dienst-Standort allein: kein Sync-Auftrag, Tags `printful-review` und `printful-review-dienst-standort`, eine 🔴-Meldung. Ob die Printful-App das Design der Kundin oder das Muster-Design druckt, ist **ungemessen**.
* Ein Warenkorb mit einer Dienst-Variante UND einer Händler-Variante (bei den vier geteilten Produkten leicht möglich, z. B. zwei T-Shirt-Grössen aus verschiedenen Gruppen) hält die **ganze Bestellung** an: ein harter Befund verhindert den Auftrag für alle Positionen (Test «zwei Editor-Positionen, die erste am Dienst-Standort»). Auch die Händler-Variante wird dann nicht gedruckt, bis der Besitzer eingreift.
* Die automatische Strecke deckt damit höchstens die übrigen 160 von 213 Varianten der 17 Produkte. Die Sperre ist die sichere Richtung (kein Doppeldruck, kein Geld), kein Codefehler; ihr Ausmass ist aber ein Entscheid des Besitzers (7.8, Punkt 2).

**Messrezept (nur lesend; Seiten höchstens 100 je Verbindung; API 2026-10 lehnt das abgekündigte `InventoryItem.variant` ab, darum `variants`):**

```graphql
# 1 Standorte
{ locations(first: 20, includeLegacy: true) { nodes { id name isFulfillmentService } } }
# 2 Bestand des Dienst-Standorts «Printful», mit `after` bis hasNextPage false
query($after: String) { location(id: "gid://shopify/Location/109743276417") { inventoryLevels(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { item { sku variants(first: 1) { nodes { product { handle status tags } } } } } } } }
# 3 Varianten je aktivem Editor-Produkt
{ products(first: 60, query: "status:active tag:wunschdesign") { nodes { handle variantsCount { count } } } }
# 4 geteilte Produkte: je Variante der Standort (Beispiel T-Shirt)
{ products(first: 1, query: "sku:5599797_9526") { nodes { handle variants(first: 60) { nodes { sku inventoryItem { tracked inventoryLevels(first: 3) { nodes { location { name } } } } } } } } }
# 5 Bestellungen und ihre Fulfillment-Orders
{ orders(first: 40, reverse: true) { pageInfo { hasNextPage } nodes { name fulfillmentOrders(first: 3) { nodes { status assignedLocation { name } } } } } }
```

Der Test `printful_bestellweg_test.mjs` rechnet die Summen aus der Rohdatei neu und prüft, dass dieser Abschnitt und die README dieselben Zahlen nennen. Wer neu misst, ersetzt die Rohdatei und führt beide Texte nach.

### 7.3 (b) Hart: `aufpreis-unbezahlt`, austauschbares Paket

Printful berechnet für manche Platzierungen einen Aufpreis (T-Shirt 71: Rückseite, Ärmel). Der Shop-Preis deckt heute keinen (Phase 1 ohne Aufpreis-Platzierungen, Karten mit `--ohne-aufpreis`). Der Sync prüft darum jede gedruckte Platzierung gegen das **bezahlte Paket**:

* **Aufpreis nur aus dem Printful-Katalog** (`product.files[].additional_price`, USD; `id` und `type` als Aliase, z. B. `default` = `front`; die Mockup-Dateien zählen nicht; bei mehreren Treffern gilt der höchste), **nie aus `costs`** (die gibt es erst nach dem Entwurf) und **nie aus `_pod_karte.ap`** (reiner Browserwert, kundenseitig änderbar; ein Test setzt `ap` auf 0, die Sperre bleibt).
* Aufpreis grösser 0 und Platzierung nicht im bezahlten Paket (oder das Paket ist nicht bestimmbar) → hart `aufpreis-unbezahlt`, kein Auftrag, Tags `printful-review` und `printful-review-aufpreis-unbezahlt`, Telegram mit Platzierung, Aufpreis und Paket-Quelle. Der Befund kommt **vor** der Datei- und KI-Abfrage.
* Aufpreis nicht lesbar (Katalogeintrag fehlt oder Preis unlesbar) und die Platzierung ist nicht die Vorderseite → weich `aufpreis-unbekannt`.
* **Austauschbar:** `planeBestellung(o, io, { paket })` nimmt eine Funktion `(position, { vid, produktId }) → { bezahlt: string[] | null, quelle }`. Standard `paketStandard()`: **nur die Vorderseite ist bezahlt**. Baustein `paketAusOption({ option: 'Druck', pakete: { 'Nur Vorderseite': [], 'Vorder- und Rückseite': ['back'] }, vorgabe: [] })` liest eine Option der Shopify-Variante; ein unbekannter Wert ergibt `bezahlt: null` (kein Aufpreis gedeckt). Welches Modell (Option, SKU-Präfix, Metafeld) gilt, entscheidet Phase 5.
* **Übergang:** `PRINTFUL_PAKET_BEZAHLT=back,sleeve_left` (kommagetrennte Platzierungs-IDs, nur `a-z 0-9 _`, sonst Exit 1) gilt für **alle** Positionen. **Der Workflow reicht die Variable bewusst nicht durch** (ein Test hält das fest): für einen Handstart mit bezahlter Rückseite wäre eine Änderung am Workflow nötig, damit sie nicht versehentlich dauerhaft gilt.

### 7.4 (c) Standardwerte und (d) Kosten-Obergrenze

| Schalter | Skript vorher | Skript jetzt | Workflow |
|---|---|---|---|
| `PRINTFUL_AUTO_CONFIRM` | ohne Angabe: bestätigt | ohne Angabe: **aus**; bestätigt nur bei `1`, `true`, `ja`, `yes`, `on`, `an` | Standard `'0'` (unverändert) |
| `PRINTFUL_KI_KONTROLLE` | ohne Angabe: verlangt die KI | ohne Angabe oder `aus`: **aus**; jede andere Angabe: Pflicht | Standard `'aus'` (unverändert) |
| `PRINTFUL_MAX_KOSTEN_USD` | gab es nicht | leer, `0`, `aus`: aus; Zahl über 0: Obergrenze; alles andere: **Exit 1** | wird durchgereicht, **kein Standard** |
| `PRINTFUL_PAKET_BEZAHLT` | gab es nicht | leer: nur Vorderseite bezahlt | **nicht** durchgereicht |
| `DRY_RUN` (Stand 10.11.2026, 7.10) | nicht gesetzt oder leer: **schreibt** | nicht gesetzt, leer und jeder andere Wert ausser `0`, `false`, `no`, `nein`, `off`: **Trockenlauf** | `0` nur bei Zeitplan UND Freigabedatei oder Handstart mit entferntem Haken, sonst `1` |

Das Skript hat damit dieselben Standardwerte wie der Workflow (sichere Seite; **der Satz galt am 09.11.2026 nur für drei der vier Schalter, `DRY_RUN` fehlte, behoben 10.11.2026**). Ein Test vergleicht beide (in der CI jetzt ohne Überspringen). **Kosten-Obergrenze:** `kostenPruefen(… maxUsd)` meldet weich `kosten-obergrenze`, wenn die Printful-Summe über `maxUsd` liegt (genau gleich ist erlaubt); sie steht nach der Prüfung «Kosten ≤ 0» und vor der Erlös-Prüfung. Der Auftrag bleibt Entwurf, der Text nennt beide Zahlen. Der Test hat dafür 12.69 gegen 12.70 USD (Entwurf, eine Befundmeldung) und 12.70 (bestätigt).

### 7.5 Bekannter Fehlalarm: `qd-weicht-ab` (nicht geändert, Entscheid beim Besitzer)

`_pod_karte.qd` ist die dpi des **Fotos** (kleinste Auflösung aller Fotos, höchstens die Dichte der Druckdatei); die Druckdatei misst immer ihre eigene Dichte. **GEMESSEN mit dem echten Editor 6.4.0 (Mitschnitt, T-Shirt 71, Druckdatei 1800 × 2400 px bei 150 dpi):**

* Foto 1200 × 1200 px: `qd` 150 = Messung der Datei → kein Befund.
* **Foto 500 × 500 px: `qd` 83** (der Editor erlaubt den Kauf, Sperre bei 75), die Datei misst 150 dpi → `qd-weicht-ab` (weich: Entwurf, Telegram-Meldung, kein Bestätigen).

Ein erlaubter Kauf mit einem kleinen Foto landet damit immer im Handgriff. Das ist die sichere Richtung, aber ein Fehlalarm. Die Prüfung von PR #3031 ist **nicht angefasst**; der Test hält den Fall fest (Kommentar im Test sagt: ändert jemand die Regel, den Test bewusst mit anpassen). **Vorschlag zur Entscheidung:** nur melden, wenn `qd` unter dem Katalog-Minimum liegt oder über der Messung (so verhielt sich die Fassung des Zweigs). Ob eine Karte mit `qd` über der Messung je vorkommt, ist ungemessen.

### 7.6 (e) Ende zu Ende mit dem echten Editor, (f) `printful_reprice.mjs`

**Mitschnitt:** `editor_640_mitschnitt.json` enthält die Kaufanfragen (`POST /cart/add.js`) des Editors 6.4.0 (sha256 `e7e30bc2…`, Abgleich mit der Datei im Repo im Test) in Chromium für sechs Fälle: T-Shirt 71 nur Text, mit Foto 1200 px, mit Foto 500 px, Foto vorne plus Text hinten, Text vorne plus linker Ärmel; Keramik-Tasse 19. Erzeugt mit `mitschnitt_erzeugen.mjs` (setzt `V6_DATEI` auf die 6.4.0-Datei, weil die gemeinsame Bibliothek inzwischen auf 6.4.1 steht); zweiter Lauf byte-gleich. Daraus folgt (alles mit Attrappen für Printful und Shopify, nichts echt):

* Schlüssel wie 6.3.x: `🎨 Design (<ID>)`, `🖼️ Druckdatei (<ID>)` (alte Schreibweise), `_pod_karte` (`v, m, pv, sv, pl, dt, px, ap, qd`), `_vorschau`; Rückseite und Ärmel als `back` und `sleeve_left`. `_vorschau` wird nie als Druckdatei gelesen, nie abgerufen und nie an Printful gesendet.
* T-Shirt vorne (Text oder Foto 1200 px): kein Befund, Typ `default`, Variante 4025. Tasse (SKU `9100019_1320`): kein Befund.
* Mit Rückseite oder Ärmel und Standard-Paket: hart `aufpreis-unbezahlt` (Ärmel 2.49 USD), kein Artikel, keine Datei- und KI-Abfrage; mit bezahltem Paket kein Befund und beide Dateien. `ap` im Browser auf 0 gesetzt ändert nichts.
* Falsche SKU gegen `pv` oder `m` der Karte: hart `karte-widerspruch`. Dasselbe T-Shirt am Dienst-Standort: hart `dienst-standort`, keine Netzabfrage.
* Im Sync-Test (Kindprozess mit gefälschtem Netz) zusätzlich: Anfrage-Inhalt, Standardwerte, `MAX_KOSTEN`-Varianten, Fehler bei unbrauchbarem `PRINTFUL_PAKET_BEZAHLT`.

**`automation/printful_reprice.mjs`** (Preise der Editor-Produkte): Varianten über 100 je Produkt wurden **still nicht angepasst** (die Abfrage las nur `variants(first:100)`); jetzt blättert eine eigene Knoten-Abfrage weiter. Fehler blieben folgenlos: `userErrors` wurden nur ausgegeben, eine fehlgeschlagene Anmeldung und jede Ausnahme endeten mit Exit 0 (Fassung auf `main`, Zeilen 41, 81, 86). Jetzt: Wiederholen bei 429, 5xx und `Throttled`; Schreiben in Stücken zu höchstens 100; `userErrors`, fehlende Antwort und Ausnahmen zählen als Fehler und das Produkt nicht als angepasst; Exit 1 bei Fehlern, bei fehlgeschlagener Anmeldung und bei einer unerwarteten Ausnahme; «kein Schlüssel» bleibt ein Nichtstun mit Exit 0. Die Preisformel, der Standard (`DRY_RUN=1` im Workflow, `apply` schreibt) und die API-Version 2025-01 sind unverändert. Eigener Test `automation/printful_reprice_test.mjs` (Kindprozess mit gefälschtem Netz): gegen die Fassung von `main` 7 ok / 19 Fehler, gegen die neue 27 ok.

### 7.7 Zahlen (diese Sitzung selbst gemessen)

**Stand 10.11.2026, ERSTE Runde (Härtung 7.10; die Zahlen der zweiten Runde stehen in 7.12; alle Tests selbst gefahren am 10.11.2026 gegen den Arbeitsbaum des Zweigs `claude/luxestyle-bestellweg-haertung-1011`, mit `env -i`, jeweils Exit-Code gelesen):**

| Testdatei | 10.11.2026 (Endstand) | 09.11.2026 (vor der Härtung) | `main` vor Phase 1 | Zweig vor der Zusammenführung |
|---|---|---|---|---|
| `automation/lib/printful_bestellweg_test.mjs` | **828 ok, 0 Fehler, Exit 0** | 625 | 393 | 492 |
| `automation/lib/printful_platzierung_test.mjs` | **212 ok, 0 Fehler, Exit 0** | 212 | 212 | 212 |
| `automation/printful_sync_test.mjs` | **401 ok, 0 Fehler, Exit 0** | 260 | 181 | 206 |
| `automation/printful_reprice_test.mjs` | **48 ok, 0 Fehler, Exit 0** | 27 | (Test fehlte) | (Test fehlte) |
| `automation/pod_auswahl_test.mjs` | **112 ok, 0 Fehler, Exit 0** | 112 | | |

(Der Test der Logik meldete beim ersten Lauf nach dem Umbau genau einen Fehler: den Test «CI Fund 17», der das Zeitlimit des Jobs von mindestens 10 Minuten verlangt, bevor es angehoben war.) Dazu `node --check` auf alle geänderten Skripte und `yaml.safe_load` auf die drei Workflow-Dateien: ohne Fehler. Das Nachspielen der CI in einem Auszug mit genau den Pfaden und Dateien des Jobs wurde nicht gefahren; die Verdrahtung prüft stattdessen der Test `CI Fund 16/26` gegen die YAML-Datei.

**Mutationsprobe** (`dropship/selbst-gestalten-fertig-0511/bestellweg/mutation.mjs`, voller Lauf, drei Prozesse mit `SHARD=1/3`, `2/3`, `3/3`; Bauer und Prüfer waren dieselbe Sitzung, die Probe ist das Werkzeug, das beide trennt):

* **Zusammensetzung:** 427 Mutanten: 33 `WP6 …`, 83 `P1 …`, 139 `H10 …` (Härtung 10.11.; davon 2 zu Fund 22, am Ende der Liste angefügt, damit die Nummern der übrigen unverändert bleiben), 172 sonstige (Strom 3 vom 05.11. und die Mutanten zu `qd-weicht-ab`). Jeder an genau einer Stelle anwendbar, kein Mutant mit Syntaxfehler (`--pruefen`, in der CI), Kontrolllauf ohne Mutation in jedem Prozess grün.
* **Ergebnis des Endlaufs (10.11.2026, 13:32 bis 13:57 UTC):** **427 von 427 Mutanten erkannt, 0 überlebt, 0 ungültig** (drei Teile mit SHARD: 143 + 142 + 142, jeweils Exit 0; 412 durch eine benannte Prüfung, 15 durch eine Ausnahme im Test). Dauer: rund 26 Minuten Wanduhr auf drei Prozessen (26 min 24 s, 26 min 13 s, 25 min 13 s), zusammen rund 78 Minuten Rechenzeit.
* **Verlauf, ehrlich:** ein **erster voller Lauf** (425 Mutanten, 12:35 bis 13:07 UTC) fand **6 überlebende Mutanten und 1 ungültigen** (Syntaxfehler): «Kosten: Summe 0 gilt als gerechnet» (der Test prüfte nur die Art, nicht den Text der beiden Untergrenzen), «frischLesen: fehlendes Feld tags» und das fehlende Feld «test» (der Test sah nur «nichts angelegt, Exit 1», das auch eine Ausnahme liefert), «nach `dienst-standort-unklar` laufen die Prüfungen weiter» (kein Test mit einer Position, die zusätzlich ohne Variante oder ohne Design ist), «Empfänger: Stadt/Name keine Pflicht» (nur Strasse, PLZ, Land waren einzeln geprüft), «aufpreisUsd: fehlendes Preisfeld» (der Mutant war gleichwertig, weil `Number(undefined)` ohnehin `NaN` und damit «unbekannt» ergibt: die Prüfung steht jetzt als `=== undefined` im Code und der Mutant ändert sie auf «gratis») und der Syntaxfehler-Mutant «unbekannter Erlös einer Position wird übergangen» (ein `else` ohne `if`; er zählte in der Fassung vom 09.11.2026 als «erkannt»). Alle sieben wurden behoben (Tests verschärft, Code und Mutant angepasst) und einzeln wieder als erkannt bestätigt; danach lief die ganze Probe von vorn.
* **Kills durch eine Ausnahme im Test** (keine benannte Prüfung wurde rot, der Test brach mit einem `TypeError` o. ä. ab) werden getrennt gezählt: im ersten vollen Lauf 14 von 425 (3 %; die Namen stehen in der Ausgabe der Probe mit dem Zusatz «durch eine Ausnahme im Test»); sie gelten als erkannt, weil der Test rot wird, sind aber die schwächere Art des Erkennens.
* **Gleichwertige Mutanten:** keine mehr in der Liste (der eine, `hasOwnProperty`-Zeile in `aufpreisUsd`, war gleichwertig und wurde durch eine Änderung am Code ersetzt, siehe oben; der Mutant `Kosten: Summe 0 gilt als gerechnet` galt kurz als gleichwertig, weil `total < 0.50` dasselbe Ergebnis liefert, und wird jetzt am Text unterschieden).

**Laufzeit** (lokal, ein Kern je Prozess, 4 Kerne; mit der Uhr gemessen, `bash` Schritt für Schritt):

| Schritt des Jobs `tests` | `main`-Stand (HEAD des Ausgangszweigs) | Härtung |
|---|---|---|
| `printful_bestellweg_test.mjs` | 0.1 s | 0.2 s |
| `printful_sync_test.mjs` | 14.9 s | 23.5 s (bis 401 Prüfungen: viele Kindprozesse mit gefälschtem Netz) |
| `printful_reprice_test.mjs` | – (lief nicht) | 3.0 s |
| `mutation.mjs --pruefen` | 0.1 s | 10.6 s (neu: `node --check` je JavaScript-Mutant) |
| `pod_auswahl_mutation.mjs` (Datei unverändert; sie führt den Sync-Test für jeden Mutanten aus, den die schnelleren Tests nicht rot machen) | 281.6 s | 386.7 s (**+105 s**) |
| Summe der Änderung | | rund **+22 s** (die vier Zeilen darüber) **+105 s** = **rund +127 s** |

Der Job `tests` lief auf Actions laut Fund 17 schon vor der Härtung mit 389 s von 480 s (81 %). Die Aussage der ersten Fassung dieses Abschnitts, mit +127 s ergäben sich als «obere Schranke» 516 s, **ist zurückgenommen**: das Hochrechnen von 389 s plus eine lokale Differenz ist keine Schranke (Fund 2/7: ein Gegenleser brauchte beim vollständigen Nachbau aller `run:`-Schritte 588.4 s, ohne `checkout` und Einrichtung der Laufzeiten; das sind 65 % von 900 s, über der eigenen Regel «über 60 % → anheben»). Das Zeitlimit steht darum seit der zweiten Runde auf **20 Minuten (1200 s)**; die eigenen Messungen der zweiten Runde stehen in 7.12. **Ungemessen** bleibt die wirkliche Laufzeit auf dem Actions-Läufer nach dem Merge (der erste Lauf des Jobs mit diesen Dateien zeigt es; liegt er über 900 s, den Schritt `pod_auswahl_mutation.mjs` in einen eigenen Job auslagern).

**Reproduzierbarkeit des Mitschnitts:** `mitschnitt_erzeugen.mjs` wurde in dieser Härtung **nicht** neu gefahren (Chromium nicht eingesetzt); der Stand vom 09.11.2026 (byte-gleich bei zweitem Lauf) gilt, die Tests lesen die Datei unverändert.

**Abfragekosten (Shopify, Connector API 2026-10, nur Kosten gemessen mit einer Suche ohne Treffer, `tag:zz-kein-treffer-messung`, 09.11.2026; Stand vor der Härtung):** die Bestellabfrage mit `fulfillmentOrders` kostet statisch bei 20 Bestellungen je Seite weniger als 1000 (Abfrage lief durch), bei 50 je Seite 1003 (abgelehnt, Grenze 1000), bei einer schlanken Probe-Abfrage mit je 100 Bestellungen, Positionen, Fulfillment-Orders und deren Positionen 2072. `SEITE` im Sync bleibt 20 (Kommentar «nicht über 49»). Die Härtung fügt `pageInfo { hasNextPage }` an zwei Stellen und die Felder `test displayFinancialStatus` hinzu; die Kosten dieser Abfrage wurden **nicht neu gemessen** (ein Handstart des Trockenlaufs in Actions zeigt es: schlägt er mit `MAX_COST_EXCEEDED` fehl, `SEITE` senken). Gemessen ist die **angeforderte** Kostenzahl, nicht `extensions.cost` eines echten Laufs mit der API-Version des Skripts (2026-01).

**Stand 09.11.2026 (zum Vergleich, vor der Härtung):** 625 / 212 / 260 / 27 Prüfungen und 288 von 288 Mutanten erkannt (voller Lauf 22:38 bis 22:59 UTC, rund 21 Minuten); ein erster Lauf des Tages (283 von 288) liess fünf Mutanten überleben, die Tests wurden verschärft. Eine Lehre daraus gilt weiter: ein «gleichwertiger» Mutant entsteht, wenn eine neue Sperre ein älteres `continue` überflüssig macht; dann braucht es einen Test, der den Unterschied sichtbar macht, nicht die Streichung des Mutanten. Zweite, kleinere Probe: `NUR="Bestellweg" node automation/pod_auswahl_mutation.mjs` (Kontrolllauf mit allen 9 Testdateien grün) 10 von 10 erkannt; die Dateiliste dieser Probe enthält auch den Mitschnitt und `printful-sync.yml`.

### 7.8 Offen und Entscheide des Besitzers

1. **Unbezahlte Platzierung:** Nachzahlung verlangen oder nur die bezahlte Fläche drucken? Heute gilt: kein Auftrag, Handgriff des Besitzers.
2. **Fulfillment-Service-Produkte (Standort «Printful»):** betrifft 11 von 17 aktiven Editor-Produkten, 53 von 213 Varianten, 4 Produkte geteilt (7.2a, GEMESSEN 10.11.2026). Der Sync druckt dort nie (kein Doppeldruck). Ob die Printful-App mit dem Muster-Design druckt, ist ungemessen. **Frage an den Besitzer** (Standard ohne Antwort: A, die Datei `PRINTFUL-SYNC-FREI.txt` bleibt ohnehin aus): (A) **gesperrt lassen** und die Bestellungen mit Dienst-Varianten von Hand klären; (B) die Varianten am Dienst-Standort **auf den Händler-Standort verlegen**, damit der Sync sie druckt (Folgen für die Printful-App, den Bestand und bestehende Käufe ungemessen; nicht Teil von Phase 1); (C) diese Varianten **vom Verkauf nehmen**. Bei den vier geteilten Produkten hält schon ein gemischter Warenkorb die ganze Bestellung an (7.2a).
   **Vor der Freigabedatei** (Empfehlung: ohne diese drei Schritte `PRINTFUL-SYNC-FREI.txt` nicht legen): (1) das Messrezept aus 7.2a frisch fahren und die Rohdatei samt Zahlen nachführen (Fabrik-Produkte und Varianten ändern sich); (2) an EINEM Produkt, das ganz am Dienst-Standort liegt (z. B. Keramik-Tasse, 3 Varianten), eine Bestellung beobachten (abgefangener Kauf oder Wegwerf-Bestellung mit dem Besitzer): legt die Printful-App einen Auftrag an, mit welchem Design (Muster oder das der Kundin), welchen Status hat die Fulfillment-Order; (3) bei den geteilten Produkten beide Gruppen prüfen, auch einen Warenkorb mit je einer Variante aus beiden. Bis dahin bleibt «Verhalten am Dienst-Standort» **ungemessen**.
3. **`qd-weicht-ab`:** Regel lassen (Fehlalarm bei kleinen Fotos) oder nur unter dem Minimum und über der Messung melden (7.5).
4. **`PRINTFUL_MAX_KOSTEN_USD`:** setzen, und auf welchen Betrag? Heute aus (kein Standard im Workflow).
5. **Preis der Rückseite und des Ärmels, Paketmodell:** Phase 5.
6. **`PRINTFUL_AUTO_CONFIRM` und KI-Kontrolle nach den ersten drei Aufträgen:** weiter Besitzer-Entscheid vom 05.11.
7. ~~Nicht von mir verdrahtet: `printful_reprice_test.mjs` steht in keinem Workflow; der Kommentar «162 Mutanten» ist veraltet.~~ **Erledigt am 10.11.2026** (Fund 11, 15, 16, 17, 26; Einzelheiten in 7.10): der Test läuft in der CI, `printful_reprice.mjs` steht in `node --check`, die fehlenden Dateien (SYNC.md, Editor-Fassungen) stehen im Auszug und fehlen nicht mehr still, der Kommentar nennt die richtige Zahl.
8. **Ungemessen:** Antwort der echten Admin-Schnittstelle mit der neuen Abfrage in Actions; ob `isFulfillmentService` an echten Bestellungen mit POD-Produkten am Standort «Printful» die Fulfillment-Orders erreicht; Verhalten von `karte-widerspruch` im Browser bei Zwischenständen (Abschnitt 5.2, Phase 6 misst).

### 7.9 Befehle (Phase 1)

Siehe Abschnitt 6 (alle fünf Tests, `mutation.mjs` mit `NUR="P1 "`) und `mitschnitt_erzeugen.mjs` (`NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node dropship/selbst-gestalten-fertig-0511/bestellweg/mitschnitt_erzeugen.mjs`, braucht Chromium).

### 7.10 Härtung 10.11.2026 (Gegenprüfung P1: 27 bestätigte Funde, Nr. 0 bis 26)

**Nichts live.** Zweig `claude/luxestyle-bestellweg-haertung-1011`, Basis `claude/luxestyle-editor-paritaet-0911` (`24fd3e5184`). Geändert wurden nur Dateien im Repo; alles lief gegen Attrappen (gefälschtes Netz im Kindprozess), nichts an Shopify, Printful, Metricool oder Telegram geschrieben. Die Freigabedatei `dropship/PRINTFUL-SYNC-FREI.txt` fehlt weiter, `PRINTFUL_AUTO_CONFIRM` bleibt `0`, `PRINTFUL_KI_KONTROLLE` bleibt `aus`. Leitlinien der Härtung: (a) Wege, die Geld bewegen, schliessen im Zweifel (fehlendes Feld = nicht bezahlt, nicht lesbar = kein Auftrag); (b) vor dem Anlegen und vor dem Bestätigen wird die Bestellung frisch aus Shopify gelesen; (c) die Dienst-Standort-Sperre hält auch, wenn die Fulfillment-Order unsichtbar ist; (d) das Skript schreibt nur bei ausdrücklichem `DRY_RUN=0`; (e) jede neue Regel hat einen Verhaltens-Test und Mutanten (`H10 F<Nr>` in `mutation.mjs`).

**Zuordnung Fund → Änderung → Test → Mutanten** (Testdateien: `L` = `automation/lib/printful_bestellweg_test.mjs`, `S` = `automation/printful_sync_test.mjs`, `R` = `automation/printful_reprice_test.mjs`):

| Fund | Schwere | Änderung | Test | Mutanten |
|---|---|---|---|---|
| 0 | wichtig | Die Abfrage liest `test displayFinancialStatus cancelledAt`; Suchstring mit `-test:true`; `zahlungPruefen(n)` urteilt am Knoten: `test === false`, `cancelledAt` lesbar und leer, `displayFinancialStatus` genau `PAID`; ein fehlendes Feld ist «unlesbar» (nie bezahlt). In der Liste: Test, Storno, nicht bezahlt/erstattet → übersprungen, unlesbar → Fehler (Exit 1) | L (alle Arten, Gross-/Kleinschreibung), S (Knoten mit `test:true`, `PENDING`, storniert, erstattet, Feld fehlt) | 15 |
| 1 | wichtig | Frisches Lesen (`node(id:)`) der Bestellung kurz vor dem Anlegen UND kurz vor dem Bestätigen mit derselben Prüfung; **geändert** → vor dem Anlegen harter Befund `zahlung-geaendert` (kein Auftrag), vor dem Bestätigen WEICHER Befund (der Entwurf bleibt, im Printful-Dashboard löschen); **nicht lesbar** → vor dem Anlegen kein Befund, sondern ein vorübergehender Fehler (`printful-versuch-<n>`, Exit 1, nach drei Läufen der harte Befund `wiederholt-gescheitert`), vor dem Bestätigen der weiche Befund `zahlung-unlesbar`; nie ein `confirm`. (Korrektur der zweiten Runde, Linse 3 Fund 2: die erste Fassung dieser Zeile nannte beide Befunde hart.) | S (Storno nach dem Anlegen, Lesefehler, Reihenfolge der Lesungen) | 11 |
| 2 | wichtig | Strenge Liste der Schlüssel des Editors 5 (`Druckdatei`, `Print file`, mit/ohne Symbol, mit/ohne Seite); jeder andere Schlüssel, der nach Druckdatei klingt (`🖼️ Druckdatei (FRONT)` ganz in Grossbuchstaben, `_Druckdatei (Front)`, `Rückseite Druckdatei` …), ist hart `datei-schluessel`, nie Vorderseite; `🖼️ Druckdatei (Front)` selbst ist dagegen eine GÜLTIGE v5-Schreibweise (Korrektur der zweiten Runde, Linse 3 Fund 1: die erste Fassung nannte sie fälschlich als hartes Beispiel); `schluessel-gemischt` gilt für jede Mischung | L (Schreibweisen-Tabelle), S | 5 |
| 3 | wichtig | Herkunft der Druckdatei: nur die eigene Cloudinary-Cloud (`dwyi6kkrl`) unter `/image/upload/` oder `cdn.shopify.com`; kein Port, kein Rückstrich, genauer Host, normalisierte Adresse; Weiterleitungen werden nicht blind gefolgt (höchstens 3, jedes Ziel wird wieder geprüft) | L (Adressen), S (Redirect auf fremden Host) | 11 |
| 4 | wichtig | `unklar` ist HART (`dienst-standort-unklar`, siehe 7.2): kein Auftrag und keine Datei- oder KI-Abfrage; `fulfillmentOrders` und `lineItems` werden mit `pageInfo` gelesen, eine abgeschnittene Liste ist `unklar`, nie `frei`; geschlossene und stornierte Fulfillment-Orders zählen nicht; ein Dienst-Standort gewinnt auch dann, wenn ein anderer Standort der Position unlesbar ist | L (`standortVon`), S (Dienst-Order unsichtbar, abgeschnittene Liste) | 8 (davon 1 gezählt bei Fund 18) |
| 5 | klein | Modus-Schritt des Workflows: scharf (`dry=0`) nur bei Zeitplan UND Freigabedatei oder bei Handstart mit ausdrücklichem `false`; jedes andere Ereignis bleibt Trockenlauf | L (der Bash-Schritt wird in den Tests ausgeführt) | 3 |
| 6 | klein | Markierung `printful-anlegen-<JJJJMMTT>t<HHMM>` (UTC) wird VOR dem POST gesetzt; scheitert das Setzen, wird nichts angelegt; ein Lauf innerhalb von 60 Minuten legt bei einer markierten Bestellung nichts neu an, auch wenn Printful den Auftrag noch nicht zeigt (in der zweiten Runde zum Anspruch mit Zufallsteil und Nachlesen erweitert, 7.12) | L (`anlegenTag`, `anlegenAlterMin`), S | 8 |
| 7 | klein | `bestaetigenPlan`: siehe «Regel für das automatische Bestätigen» unten | L, S | 6 |
| 8 | klein | Fail-open-Lesarten geschlossen: eine Währung ausser USD oder eine fehlende Währung ist `kosten-unbekannt` (nie still USD); Zahlen werden streng gelesen (kein Hexadezimal, kein Exponent, keine Wahrheitswerte oder Listen); eine Printful-Summe unter 0.50 USD gilt als unbekannt; ein Aufpreis ohne Preisfeld ist nicht «gratis»; ein Entwurf ohne eine einzige Datei ist `datei-wartet`, nie «ok»; der Entwurf wird gegen das Gesendete gehalten (Artikelzahl, Variante, Menge, Dateitypen, Vorschau und Mockup zählen nicht als Datei), eine Abweichung ist `entwurf-abweichend` | L, S | 15 |
| 9 | klein | Ein vorhandener Printful-Auftrag mit unserer `external_id` gilt nur als erledigt, wenn Empfänger (Name als Wortmenge, PLZ, Land) und Stückzahl zur Bestellung passen (`vorhandenVergleichen`); sonst harter Befund `vorhanden-fremd`, nichts als erledigt markiert | L, S | 12 |
| 10 | klein | `printful_reprice.mjs` senkt Preise nur mit ausdrücklichem Haken `senken` (Vorgabe: nur Erhöhungen; die Formel kennt Versand und Gebühr nicht), schreibt nur bei ausdrücklichem `DRY_RUN=0`/`false`/`no`/`nein`/`off`. Der Standard-Tag der Handstart-Eingabe (`wunschdesign`) bleibt; mit der Vorgabe «nur Erhöhungen» kann die alte Formel Preise der Editor-Produkte, die nach der Preisformel vom 05.11. gesetzt wurden, nicht mehr senken (ob sie sie unnötig anhebt, ist ungemessen: vor `apply` die Vorschau ansehen) | R | 5 |
| 11 | klein | Der Test der Preisanpassung läuft in der CI; die Zahlenabgleiche (SYNC.md, Editor-Fassungen) laufen nicht mehr still ins Leere | L (CI-Verdrahtung) | – |
| 12 | klein | Der Workflow-Schalter wird nicht nur per Regex geprüft: Der Bash-Schritt `modus` und der Ausdruck für `DRY_RUN` werden in den Tests ausgeführt (alle Ereignisse × Eingaben × Freigabedatei) | L | 9 |
| 13 | klein | Die Attrappe von Shopify liefert nur noch die Felder, die die Abfrage verlangt (Auswahl-Parser, Projektion der Antwort): wird ein gelesenes Feld aus der Abfrage entfernt, schlägt ein Test fehl (vorher überlebten 12 von 14 solcher Änderungen, darunter die Storno-Sperre). `empfaengerAus` verlangt Name, Strasse, PLZ und Stadt | S («Feldtreue»), L | 19 |
| 14 | klein | Der Deckel `MAX` Bestellungen je Lauf ist getestet | S | 1 |
| 15 | klein | `printful_reprice_test.mjs` und die Mutationsprobe (`--pruefen`) laufen in der CI | CI | – |
| 16 | klein | Pfadfilter UND `sparse-checkout` des Jobs `tests` führen alle Dateien des Bestellwegs (siehe 7.11) | L (liest die YAML-Datei) | – |
| 17 | klein | Zeitlimit des Jobs `tests` von 8 auf 15 Minuten angehoben, Messung und Rechnung in 7.7 und im Kommentar an der Stelle (in der zweiten Runde auf 20 Minuten, die Rechnung «obere Schranke 516 s» zurückgenommen: 7.7 und 7.12) | L (verlangt mindestens 10) | – |
| 18 | klein | Neue Mutanten für Dienst plus unlesbarer Standort, Host-Endung, nachgefragte Bestellung, Preis-Untergrenze der Preisanpassung u. a. | alle | 2 + Teil der übrigen |
| 19 | klein | Güte der Mutationsprobe: Mutanten mit Syntaxfehler zählen nicht als erkannt (`node --check`, Exit 2 «UNGÜLTIG»); die Ausgabe trennt Kills durch eine benannte Prüfung von Kills durch eine Ausnahme im Test; die Probe lässt sich mit `SHARD=<i>/<n>` auf mehrere Prozesse verteilen | L (`SHARD`) | – |
| 20 | klein | Das Skript schreibt nur bei ausdrücklichem `DRY_RUN=0` (`false`, `no`, `nein`, `off` gelten ebenso); leer und nicht gesetzt = Trockenlauf | S | 3 (mit Fund 5) |
| 21 | klein | Unsichtbare oder unlesbare Dienst-Fulfillment-Order: HART (siehe Fund 4). Vor der Bearbeitung prüft der Sync per `currentAppInstallation.accessScopes`, ob das Token Händler- UND Dienst-Fulfillment-Orders lesen darf; fehlt ein Recht, endet der scharfe Lauf mit Exit 1 und bearbeitet nichts; im Trockenlauf wird weiter gelesen, der Fehler steht in der Zusammenfassung UND der Lauf endet ebenfalls mit Exit 1 (Korrektur der zweiten Runde, Linse 3 Fund 3), und der Befundtext von `dienst-standort-unklar` nennt das fehlende Recht | L (`scopesBewerten`), S (Recht fehlt, Abfrage nicht möglich) | 7 (+ 2 bei Fund 4 für die Härte) |
| 22 | klein | Ein Editor-Produkt (Tag `wunschdesign`) druckt nie das feste Motiv aus dem Metafeld `custom.print_file`; ohne Design der Kundin bleibt `keine-druckdatei` hart (nur Fertigware darf aus dem Metafeld drucken). `OHNE-DESIGN.md` nennt es | L, S | 2 (am Ende der Liste angefügt) |
| 23 | klein | Ein unlesbarer alter Schlüssel `🖼️ Druckdatei (<ID>)` wird nicht still als Editor-5-Datei gedeutet (gleiche Regel wie Fund 2) | L | mit Fund 2 |
| 24 | klein | Die Aussage «gleiche Standardwerte wie der Workflow» gilt jetzt für alle vier Schalter (7.4) | S | – |
| 25 | klein | Dokumentation: Vertragstabelle, Befundtabelle und Zahlen (README des Bestellwegs, dieses Blatt, `PLAN-PRINTFUL-PARITAET-0911.md`, `OHNE-DESIGN.md`) | L liest die Zahlen | – |
| 26 | klein | Der Editor-Vertrag (Schreibweg der Warenkorb-Eigenschaften) gilt für alle Fassungen 6.2.0 bis 6.4.1; der Mitschnitt stammt nur von 6.4.0 | L | – |

(Die Mutantenzahl je Fund zählt die Namen mit der Vorsilbe `H10 F<Nr>`; ein Teil der Mutanten gehört mehreren Funden an oder trägt keine Nummer. Die Summe steht in 7.7.)

**Regel für das automatische Bestätigen (Fund 7, genau so im Code `bestaetigenPlan`).** Der Sync bestätigt einen Printful-Auftrag nur, wenn **alle drei** Bedingungen gelten:

1. `PRINTFUL_AUTO_CONFIRM` ist ausdrücklich an (`1`, `true`, `ja`, `yes`, `on`, `an`).
2. `PRINTFUL_MAX_KOSTEN_USD` ist eine Zahl über 0. **Fehlt sie bei `AUTO_CONFIRM=1`, ist das ein Konfigurationsfehler: der Lauf endet vor allem anderen mit Exit 1 und legt nichts an.**
3. Die KI-Kontrolle der Druckdatei ist an (`PRINTFUL_KI_KONTROLLE=pflicht`, dazu `GEMINI_API_KEY`). Ist sie aus, bleibt jede Bestätigung aus: der Auftrag bleibt ein Entwurf mit dem Befund `manuell`, der Grund steht im Text.

Dazu gelten wie bisher: kein Befund, Kosten ≤ Obergrenze, Mindestgewinn, und das frische Lesen der Bestellung (Fund 1) unmittelbar vor `confirm`.

*Begründung.* Ohne Obergrenze wäre `AUTO_CONFIRM=1` die einzige Sperre zwischen einer fremden Datei und einer Belastung der Karte beim Printful-Konto: die Marge-Prüfung begrenzt nur den Verlust je Auftrag, nicht die absolute Summe (eine Bestellung mit 50 Positionen oder ein Fehler in der Mengenlesung könnte beliebig teuer werden). Die Obergrenze macht den Schaden je Auftrag zu einer gewählten Zahl. Die KI-Kontrolle ist die **einzige inhaltliche Prüfung** der Kundendatei (die mechanischen Prüfungen messen Grösse, Format, Herkunft, nicht, was das Bild zeigt: Rechte, Gewalt, Fremdmarken). Der Besitzer-Entscheid vom 05.11.2026 lautet «KI aus, die ersten Aufträge von Hand prüfen»: solange die KI aus ist, wird darum nichts automatisch bestätigt. Wer später sowohl automatisch bestätigen als auch ohne KI arbeiten will, ist eine neue Entscheidung des Besitzers, die er im Workflow sichtbar treffen muss (heute nicht möglich, ohne den Code zu ändern).

**Zusätzliche Eigenschaften der Härtung (alle mit Tests):**

* **Trockenlauf ist die Vorgabe des Skripts** (Fund 5, 20, 24): geschrieben wird nur bei `DRY_RUN` = `0`, `false`, `no`, `nein` oder `off`. Der Workflow reicht `DRY_RUN` immer durch: `0` nur bei (Zeitplan UND Freigabedatei) oder Handstart mit entferntem Haken «Nur testen» (Eingabe ausdrücklich `false`), sonst `1`. Ein später ergänztes `push`- oder `repository_dispatch`-Ereignis bleibt Trockenlauf.
* **Markierung vor dem Anlegen** (Fund 6): die Reihenfolge ist frisch lesen → Markierung setzen → Auftrag anlegen → Metafeld → Tag `printful-synced`. Scheitert das Markieren, wird nichts angelegt (Fehler, Exit 1). Die Markierung ist ein Tag mit Zeitstempel (UTC; seit der zweiten Runde mit Sekunden, Millisekunden und Zufallsteil, siehe 7.12); sie sperrt 60 Minuten, dann darf ein Lauf die Bestellung wieder prüfen (Printful zeigt einen angelegten Auftrag dann über die `external_id`). Ungemessen: ob Printful doppelte `external_id` ablehnt (im Code als ungemessen vermerkt, die Markierung und der Vergleich sind darum die Sperren, die wir selbst halten).
* **Dienst-Standort** (Fund 4, 21): `unklar` heisst jetzt «kein Auftrag» (`dienst-standort-unklar`, hart). Grund: sieht das Token die Fulfillment-Order des Dienst-Standorts nicht (Recht fehlt, Antwort abgeschnitten), wäre «weich + Entwurf» ein zweiter Entwurf neben dem Auftrag der Printful-App. Die Folge im Betrieb: Bestellungen ohne lesbare Fulfillment-Order (z. B. #1017 in der Messung 7.2a) bleiben liegen, bis der Besitzer sie klärt. Das ist die sichere Richtung.
* **Rechte-Prüfung** (Fund 21): `currentAppInstallation.accessScopes` muss `read_/write_merchant_managed_fulfillment_orders` und `read_/write_third_party_fulfillment_orders` enthalten (`write_` schliesst `read_` ein). Fehlt eines: im scharfen Lauf Exit 1 und keine Bearbeitung; im Trockenlauf wird weiter gelesen, der Lauf endet aber ebenfalls mit Exit 1 (Test «Fund 21 Im Trockenlauf wird trotz fehlendem Recht weiter gelesen …»). Ist die Abfrage selbst nicht möglich, steht «nicht abfragbar» im Log; die Sperre pro Position gilt trotzdem. **Ungemessen:** welche Rechte das Token des Zeitplans in Wirklichkeit hat (Messung: ein Trockenlauf in Actions, die Zeile «Zugriffsrechte des Tokens für Fulfillment-Orders» im Log).
* **Preisanpassung** (Fund 10): `printful_reprice.mjs` verlangt zum Senken `SENKEN=1` (Workflow-Eingabe `senken`, Vorgabe aus). Hintergrund: die Formel `ceil(max(Kosten × Aufschlag, Kosten + Mindestmarge)) − 0.10` kennt weder Versand noch Zahlungsgebühr; alte Preise, die darüber liegen, sollen nicht still sinken.

**Was bewusst nicht geändert wurde:** `qd-weicht-ab` (7.5, Entscheid des Besitzers); `karte-widerspruch` bleibt hart (Messung in Phase 6 steht aus); die Zeilen der Dienst-Variante in 7.2a bleiben der Stand der Messung vom 10.11.2026.

**Ungemessen (Härtung):** (1) die Antwort der echten Admin-Schnittstelle auf die Abfragen `FRISCH_Q` und `SCOPES_Q` mit der API-Version des Skripts (2026-01): erster Beleg ist ein Trockenlauf in Actions; (2) ob `displayFinancialStatus` bei teilweise erstatteten Bestellungen `PARTIALLY_REFUNDED` meldet und der Sync sie damit zu Recht nicht druckt (das Wort steht in der Shopify-Dokumentation, am Shop nicht gemessen); (3) die Laufzeit des Jobs `tests` in Actions (7.11 nennt nur die lokale Messung); (4) Safari/Firefox spielen hier keine Rolle (nur Server-Skripte), die Editor-Fassung 6.4.1 hat keinen Mitschnitt.

### 7.11 CI-Verdrahtung und Laufzeit (Fund 11, 15, 16, 17, 26)

* **Zwei Eintragungen je Datei** in `.github/workflows/luxestyle-automation-tests.yml`: `paths:` (löst den Job aus) UND `sparse-checkout` des Jobs `tests` (holt die Datei in den Auszug). Neu in beiden: `.github/workflows/printful-reprice.yml`, `dropship/wp6-0611/SYNC.md`; nur im Auszug (der Job liest sie, löst sich aber an den Editor-Dateien nicht aus): `pod/v6/lspod-designer-v6-6.2.0.js`, `6.3.0`, `6.3.1`, `6.4.0`, `6.4.1`. `node --check automation/printful_reprice.mjs` und der Schritt `node automation/printful_reprice_test.mjs` stehen jetzt im Job. Der Test `CI Fund 16/26` liest die YAML-Datei und verlangt, dass jede vom Bestellweg-Test gelesene Datei in beiden Listen steht.
* **Fehlende Dateien sind in der CI ein Fehler** (`GITHUB_ACTIONS` oder `CI` gleich `true`), lokal und in den Kopien der Mutationsprobe werden die Abgleiche übersprungen (vorher liefen sie in der CI still nicht).
* **Laufzeit und Zeitlimit** (Fund 17): lokal gemessen rund +127 s gegenüber dem Stand vor der Härtung, davon +105 s im unveränderten Schritt `pod_auswahl_mutation.mjs` (er führt den längeren Sync-Test aus); der Job hatte schon vorher 81 % seines 8-Minuten-Limits gebraucht. `timeout-minutes` stand nach der ersten Runde auf **15** und steht seit der zweiten Runde auf **20** (Fund 2/7: die Messung 588 s eines Gegenlesers lag über der damals genannten «oberen Schranke» 516 s und über 60 % von 15 Minuten); Zahlen, Rechnung und Ungemessenes: 7.7 und 7.12.

### 7.12 Zweite Runde 10.11.2026 (drei unabhängige Gegenleser des Commits `7ce8e09b5c`: 22 Funde, davon 4 wichtig)

**Nichts live.** Gleicher Zweig `claude/luxestyle-bestellweg-haertung-1011`, gleiche Regeln: alles gegen Attrappen (gefälschtes Netz im Kindprozess), nichts an Shopify, Printful, Metricool oder Telegram geschrieben, die Freigabedatei `dropship/PRINTFUL-SYNC-FREI.txt` fehlt weiter. Die Gegenleser waren **Linse 1** (Geld und Sicherheit, Sync als Angreifer: 2 wichtig, 6 klein), **Linse 2** (Tests und Mutationsprobe: 2 wichtig, 7 klein) und **Linse 3** (Vertrag Editor ↔ Parser und Dokumentation: 5 klein). Kein Blocker; alle wichtigen und alle kleinen Funde sind behoben. Die Nummer eines Fundes ist `<Linse>/<laufende Nummer>`; die Mutanten dazu heissen `R2 L<Linse>/<Nr> …` in `mutation.mjs` (Testdateien: `L` = `automation/lib/printful_bestellweg_test.mjs`, `S` = `automation/printful_sync_test.mjs`, `R` = `automation/printful_reprice_test.mjs`).

| Fund | Schwere | Änderung | Test | Mutanten |
|---|---|---|---|---|
| 1/1 | wichtig | **Status der Fulfillment-Order als Positivliste.** Druckbar sind nur `OPEN` und `IN_PROGRESS` (`FO_DRUCKBAR`); `ON_HOLD` (Betrugsverdacht, falsche Adresse, Rückfrage), `SCHEDULED`, `INCOMPLETE` und jeder unbekannte Status ergeben in `standortVon` die Art `gehalten` und in der Planung den harten Befund `fulfillment-gehalten`. Eine GESCHLOSSENE Order eines Dienst-Standorts neben einer offenen derselben Position bleibt `unklar` | L (`standortVon` für jeden Status, Dienst-Standort, geschlossen neben offen), S (Bestellung mit gehaltener Order: kein Auftrag, Tag, Meldung) | 9 |
| 1/2 | wichtig | **Das frische Lesen vergleicht mehr als die Zahlung.** `bestellStand` hält beim Planen Empfänger (samt E-Mail und Telefon), alle Positionen mit Stückzahl und die Positionen des Auftrags fest; `bestellAbweichung` vergleicht sie beim Anlegen und vor dem Bestätigen mit dem frischen Lesen, dazu den Status der betroffenen Fulfillment-Orders und den Stopp-Tag `printful-review`. Abweichung vor dem Anlegen = nichts angelegt (nächster Lauf liest neu); vor dem Bestätigen = weicher Befund `bestellung-geaendert`, Entwurf nicht bestätigt. Die frische Abfrage trägt dafür `shippingAddress`, `lineItems` und `fulfillmentOrders` | L (`bestellStand`, `bestellAbweichung` für jede Art der Abweichung), S (Adresse, Menge, Position, Status der Order, Stopp-Tag geändert, vor dem Anlegen und vor dem Bestätigen) | 18 |
| 1/3 | klein | **Anspruch statt blosser Markierung.** Der Tag `printful-anlegen-<JJJJMMTT>t<HHMM>-<SS><mmm>-<Zufall>` trägt Sekunden, Millisekunden und 8 Hex-Zeichen Zufall (zwei Läufe setzen nie denselben Tag); nach dem Setzen wird NACHGELESEN, und nur der Lauf mit dem kleinsten Anspruch der letzten 60 Minuten legt an (`anspruchGewonnen`), jeder andere tritt zurück. Kein Schloss (ein Fenster von wenigen Sekunden bleibt), darum bleibt die Regel «keinen scharfen Lauf lokal neben dem Zeitplan» | L (`anlegenTag`, `anlegenAlterMin`, `anspruchGewonnen`), S (zwei Läufe mit verschachtelten Tags, Nachlesen schlägt fehl, fremder Anspruch gewinnt) | 12 |
| 1/4 | klein | `PRINTFUL_MIN_NETTO_CHF` unter 0 ist ein Konfigurationsfehler (Exit 1 vor allem anderen, nichts angelegt): ein negativer Wert hob die Verlustsperre auf. 0 bleibt erlaubt | S | 3 |
| 1/5 | klein | Die Menge einer Editor-Position wird nie geraten: ohne lesbare `currentQuantity` und `quantity` (auch bei -1) ist das der harte Befund `menge-unlesbar`, nicht «1 Stück» | L, S | 3 |
| 1/6 | klein | Engere Dateiquellen: `cdn.shopify.com` nur unter dem eigenen Pfad `/s/files/1/0943/6856/3585/`; bei Cloudinary sind nur Grösse, Qualität und Format als Transformation erlaubt (`c_limit/fit/scale/fill/pad`, `w_`, `h_`, `q_auto\|N`, `f_*`, `dpr_*`), Überlagerungen und fremde Quellen (`l_fetch:…`, `u_`, `e_`, `t_`) sind `datei-adresse`; ein Ordnername wie `pod_uploads` wird nicht als Transformation gelesen | L (Adressen: eigener und fremder CDN-Pfad, jede Transformation, Überlagerung mit Base64-Adresse), S | 11 |
| 1/7 | klein | `printful_reprice.mjs`: ein Printful-Preis, der nicht endlich oder nicht über 0 ist, zählt als unbekannt (vorher `NaN`, das als Text `NaN` in den Shopify-Preis gelangen konnte) | R | 2 |
| 1/8 | klein | Im Trockenlauf wird die KI-Kontrolle nicht mehr aufgerufen (Art `trocken`, kein Befund, kein Verbrauch, kein Versand des Kundenbildes an Gemini); die Aussage «der Trockenlauf macht 0 Schreibzugriffe und 0 Fremdaufrufe» stimmt damit auch für die KI | S (Trockenlauf mit KI `pflicht` und Schlüssel: 0 Anfragen an Gemini) | 2 |
| 2/1 | wichtig | Concurrency und Zeitlimit des Sync-Workflows sind festgehalten: feste Gruppe `printful-sync` (kein `${{ }}`), `cancel-in-progress: false`, `timeout-minutes` zwischen 5 und 20 (ein hängender Lauf hielte sonst die Gruppe) | L (liest die YAML-Datei) | 4 |
| 2/2 | wichtig | Zwei gültige Editor-Positionen in EINER Bestellung (zwei Platzierungen, zwei Artikel) werden Ende zu Ende geprüft; `dateienStatus` und `entwurfVergleichen` geben einen Entwurf nicht mehr frei, wenn bei einem von mehreren Artikeln noch keine Datei da ist (`teilweise`, `ohneDatei`) | S (zwei Positionen: Anlegen, Dateien, Kosten, Bestätigen; ein Artikel ohne Datei), L | 5 |
| 2/3 | klein | Verdrahtung des Sync-Workflows: genau ein täglicher Zeitplan (feste Minute und Stunde) und nur die Auslöser `schedule` und `workflow_dispatch`; die Freigabedatei steht im `sparse-checkout`; `DRY_EINGABE` zeigt auf eine Eingabe, die der Handstart hat; `MAX`, alle Schlüssel und Secrets werden durchgereicht; Rechte genau `contents: read`; Vorgabe der Handstart-Eingabe ist Trockenlauf | L | 8 |
| 2/4 | klein | Der Test der Preis-Eingaben war wirkungslos (`/apply:[\s\S]*?default: false/` lief in den nächsten Block): jetzt wird der Eingabeblock geschnitten; `apply` und `senken` mit Vorgabe false, Auslöser nur Handstart, Tag-Vorgabe `wunschdesign` (auch bei leerer Eingabe), Rechte, feste Concurrency ohne Abbruch | L | 6 |
| 2/5 | klein | Vier Lücken im Sync-Verhalten: Status nach dem Bestätigen nicht lesbar (`status-unbekannt`), `MAX` hat den Standard 20, `PRINTFUL_MAX_KOSTEN_USD` ungültig bricht auch im Trockenlauf ab, die Grenze von 60 Minuten beim Anspruch | S | 4 |
| 2/6 | klein | CI-Verdrahtung auf Wirksamkeit geprüft: jede Testdatei des Bestellwegs steht als eigene Zeile `node <Datei>` genau einmal im Job `tests`, dazu die Mutationsprobe `--pruefen`; im Job kein `\|\| true`, kein `continue-on-error`, kein `set +e` | L | 4 |
| 2/7 | klein | Die Zeitrechnung «obere Schranke 516 s» ist zurückgenommen, das Zeitlimit des Jobs steht auf 20 Minuten; die Messung steht unten | L (Limit zwischen 15 und 30 Minuten) | – |
| 2/8 | klein | `mutation.mjs` zählt eine Zeitüberschreitung, ein Signal oder einen Startfehler des Kindprozesses nicht mehr als «erkannt», sondern als **ungeklärt** (Ausgabe `? UNGEKLÄRT`, Exit 1 wie bei einem Überlebenden); die Zusammenfassung nennt die Zahl | `mutation.mjs` selbst (Probe an einem absichtlich hängenden Test, siehe unten) | – |
| 2/9 | klein | `printful_reprice.mjs` läuft auf API 2026-01 wie der Sync (vorher 2025-01) | R | 1 |
| 3/1 | klein | Das Beispiel `🖼️ Druckdatei (Front)` für `datei-schluessel` war falsch (es ist eine gültige v5-Schreibweise): Kopfkommentar der Bibliothek, README und Zeile Fund 2 in 7.10 nennen jetzt `🖼️ Druckdatei (FRONT)` (Grossbuchstaben) und `_Druckdatei (Front)` | L liest die Schreibweisen aus dem Code | – |
| 3/2 | klein | `zahlung-geaendert` ist vor dem Anlegen hart und vor dem Bestätigen weich; `zahlung-unlesbar` entsteht nur vor dem Bestätigen (und weich); vor dem Anlegen ist ein unlesbares Lesen ein vorübergehender Fehler. README und 7.10 Fund 1 nachgeführt | S (vorhanden: «harter Befund» / «weicher Befund» im Testtitel) | – |
| 3/3 | klein | Fehlt dem Token ein Fulfillment-Recht, endet auch der Trockenlauf mit Exit 1 (er liest weiter): Text in 7.10 (Fund 21 und Rechte-Prüfung) berichtigt | S (vorhanden) | – |
| 3/4 | klein | Schritt 4 des Live-Plans nennt das Produkt `tasse-zum-selbstgestalten` (0 von 2 Varianten am Dienst-Standort); die Keramik-Tasse `keramik-tasse-selbst-gestalten` liegt mit 3 von 3 Varianten am Dienst-Standort und wäre `dienst-standort` (gesperrt) | – (GEMESSEN in `standort_messung_1011.json`) | – |
| 3/5 | klein | Doku nachgeführt: «ab 6.2.1» durch «vorgesehen, kein Editor schreibt es» ersetzt (README, Kopf der Bibliothek, Kopf des Syncs); `sv` und `ap` im Kopf der Karte; «Offen» Punkt 6 (durch `dienst-standort` überholt); `keine-druckdatei` (Metafeld nur bei Fertigware); `ohne-artikel` in der Befundtabelle; «Version 3»; Ablaufschema mit 1b und 4b; 5.1 (`_vorschau` schreibt der Editor seit 6.2.0) | – (Zahlenabgleich der Texte läuft weiter) | – |

**Neue Befundarten:** `fulfillment-gehalten` (hart), `menge-unlesbar` (hart), `bestellung-geaendert` (weich, nur vor dem Bestätigen); `zahlung-geaendert` und `zahlung-unlesbar` sind jetzt in README und 7.10 nach hart und weich getrennt.

**Nicht geändert, bewusst:** `qd-weicht-ab` (7.5); der Anspruch bleibt ein Anspruch mit Nachlesen, kein Schloss (Shopify bietet kein bedingtes Setzen von Tags; das Fenster von wenigen Sekunden schliesst nur die Concurrency-Gruppe in Actions); die Zahlen der Messung 7.2a.
