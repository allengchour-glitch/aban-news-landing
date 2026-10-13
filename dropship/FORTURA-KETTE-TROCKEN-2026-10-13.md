# Fortura-Bestellkette trocken geprüft (S2 Schritt 0) — 13.10.2026, ~21:00 UTC

Auftrag: Richter «mehr Käufer», S2 Schritt 0. Die Stufe 2 (XML nach `/home/ORDERS`, Lieferschein aus `/home/DESADV`) ist seit
06.10. aktiv. Sie hat noch nie eine echte Bestellung gesehen: `dropship/_fortura_bestellungen.tsv` hat nur die Kopfzeile
(GEMESSEN), `/tmp/fortura_bestellungen/` ist leer.

Grenzen des Laufs: **kein Upload, kein Aufruf bei Fortura.** In allen Simulationen war `_curl` gesperrt. Shopify wurde nur gelesen.
Die Testbestellungen hiessen LX9901–LX9903, mit Testadresse und `test@example.ch`.

## Ergebnis je Glied

| # | Glied | Vorher | Nachher | Beleg |
|---|---|---|---|---|
| 1 | **Weiche** CH-Lager → Fortura statt CJ | 🟢 | 🟢 | 2'375 aktive `ch-lager`-Produkte, davon 0 mit einer SKU ohne `fortura-` (GEMESSEN, je die ersten 3 Varianten). 4'003 aktive `fortura-`-Varianten tragen alle `ch-lager`. Keine einzige `fortura-`-SKU steht in `_cj_varianten_zuordnung.tsv`. `cj_order_engine.ist_cj()` überspringt sie deshalb («anderer Lieferant»). |
| 2 | **XML bauen**: Draculagebiss / Testadresse | 🟢 | 🟢 | `bau_orders_xml('LX9901', …, [{'artnr':'59774','ean':'7640176759420','menge':2}])` → 0 Fehler. Das Gerüst ist pfadgleich mit `Opacc_Orders_Template.xml`. DOC_NO=LX9901, CUST_NO=544341, alle 6 Pflichtfelder der Adresse gesetzt, POS 10/59774/EAN/2. «Zürich» und «&» sind korrekt kodiert. Ohne first/last wird der Name aufgeteilt («Hans Peter \| Muster»). |
| 3 | **Artikelnummer = wie im Feed** | 🔴 | 🟢 | Siehe Fehler F1: **2'442 von 4'003 aktiven Fortura-Varianten (61 %) wären nie per XML gegangen.** |
| 4 | **Mengen / Verkaufseinheit** | 🔴 | 🟡 | Siehe F2: 22 Varianten haben VE > 1, darunter der **Draculagebiss (VE 10)**. Die Engine schickt QUANTITY = Shopify-Menge, also 1. |
| 5 | **Versandart** | 🟢 | 🟢 | `SHIPMENT` bleibt leer, also Standard (DPD). Laut Template ist nur «EXPRESS» zugelassen. Die E-Mail ist Pflicht, weil DPD-PRO die Kundin benachrichtigt. |
| 6 | **Lieferland** | 🟡 | 🟡 | Das Template hat **kein Länderfeld**. Eine LI-Bestellung ergibt `Lieferland LI ≠ CH`, es geht kein XML raus, und die Ampel meldet den Portal-Weg. Der Rückfall funktioniert, die Automatik nicht (LI ist seit 09.10. Markt). |
| 7 | **Engine Stufe 2 (Ablauf)** | 🟢 | 🟢 | Simulation mit gespiegelten Ordnern: `bereit` → `ORDERS_LX9902.xml` hochgeladen und zurückgelesen → `xml-hochgeladen`. Gemischter Korb (Fortura + CJ) über `main()`: das Paket enthält nur `93583×2`, das XML nur diese Position. |
| 8 | **DESADV/DELVRY-Leser** | 🟡 | 🟢 | Leeres `Opacc_Delvry_Template.xml` → leerer Eintrag ohne Absturz. Das Template mit Werten gefüllt (LS77002/LX9902/15.10.2026, DPD 01505012345678, 2 Pos.) wird korrekt gelesen: `order_no` → `9902`, Tracking und Mengen stimmen. Fortura hat keine *gefüllte* DELVRY-Musterdatei geschickt, nur das Template. Rest siehe F3 und F4. |
| 9 | **Shopify-Sendung + Teillieferung** | 🔴 | 🟢 | Siehe F4. |
| 10 | **Ampel** | 🔴 | 🟢 | Siehe F5 und F6. Live 21:00: `BESTELLUNGEN: 4 offen` (alle CJ bzw. Mister DTF), `FORTURA: 0 offen` (Engine live gelaufen, Exit 0, Ledger unverändert). |
| 11 | **Zugang** | 🟢 | 🟢 | `/tmp/fortura_env.sh` ist vorhanden (600, 60 Byte) und enthält die Variablen `FORTURA_FTP_USER` und `FORTURA_FTP_PW`. Werte nicht ausgegeben, Login nicht getestet. |

**Gesamturteil:** Für VE-1-Artikel in die Schweiz ist die Kette jetzt **trocken grün**. Vor den Fixes wäre jede Bestellung mit Grössen-Kostüm («90404-2») oder Präfix-Nummer («BO…», «CK…», «PC…») im Portal-Rückfall gelandet. Echt bewiesen ist damit nichts: Ob Fortura das XML annimmt und ob ein Lieferschein zurückkommt, zeigt erst die Probebestellung B.

## Gefundene Fehler

**F1 🔴 → behoben: Prüfung der Artikelnummer lehnte 61 % des Sortiments ab.** `automation/fortura_xml.py:46` (alt) prüfte `\d{3,8}`.
- Feed GEMESSEN: von 20'198 ArtNr sind 6'072 rein numerisch, 2'207 haben die Form «Zahl-Suffix», 11'919 eine andere Form (`BO01520`, `CK-404`, `86727M`, `OR47166.01`, `042156`).
- Im Shop (aktiv) häufig: `99999-9` 532, `BO99999` 395, `HB999999` 360, `PC99999` 167, `CK…` 344.
- Fix: `ARTNR = r'[0-9A-Z][0-9A-Z.\-]{2,19}'` (Zeile 24). Alle 20'198 Feed-ArtNr und alle 4'003 Shop-SKUs passen. Keine Feed-Nummer enthält Kleinbuchstaben, deshalb bleibt ein Leck wie «fortura-x» unplausibel.

**F2 🔴 → abgesichert, Frage offen: Verkaufseinheit.** Der Shop verkauft «Draculagebiss · 10 Stück» (Feed: `Internet_VE` 10, VP1 0.16 = **Stückpreis**). Die Engine schickt `QUANTITY 1`.
- Das Template sagt nicht, ob QUANTITY in Stück oder in VE zählt (VERMUTUNG: Stück, weil die VP1 je Stück gilt). Dann käme 1 Gebiss statt 10.
- Fix: `fortura_xml.ve_aus_feed()` (Zeile 154) liest die VE aus `/tmp/fortura_feed.csv`. `bau_orders_xml` meldet bei VE > 1 «QUANTITY Stück oder VE? bei Fortura klären». Es geht dann **kein XML** raus, die Ampel zeigt den Portal-Weg. Die Engine übergibt die VE in `fortura_bestell_engine.py:106`.
- Betroffen: 22 aktive Varianten. Fehlt der Feed, greift keine Sperre.
- **Folge für Probebestellung B:** den Draculagebiss NICHT als Probe nehmen, das prüft den Bündel-Fall statt der Kette. Besser einen VE-1-Artikel ab Lager, z. B. «Mantel Dracula» `fortura-93583` (Feed-Bestand 191). Alternativ Fortura fragen: «QUANTITY bei Artikel mit Internet_VE 10 — Stück oder VE?».

**F3 🟡 → behoben: Lieferschein in ISO-8859-1 hätte den ganzen Lauf abgebrochen.** `herunterladen()` lief über `curl` mit `text=True` (UTF-8).
- Der Fortura-Feed ist cp1252 (GEMESSEN). Die Templates sind zwar UTF-8, aber ein DELVRY mit «ä» in Latin-1 ergab im Test `UnicodeDecodeError`. Folge: die ganze Stufe 2 ⚠️, kein Tracking.
- Fix: `_curl(..., roh=True)` liefert Bytes, `ET.fromstring` liest die Kodierung aus der Deklaration. Im Test wird Latin-1 korrekt gelesen.

**F4 🔴 → behoben: Teillieferung verschwand nach einer Stunde.** `fortura_bestell_engine.py:131` (alt) setzte nach erfolgreicher Sendung immer `erfuellt`, auch wenn die Lieferung nur teilweise kam.
- `main()` überspringt `erfuellt`. Die Zeile «⚠️ Teillieferung 90404-2 0/1» stand also genau einmal da, danach blieb der Artikel still offen. Die Bestell-Ampel filtert `fulfillment_status:unfulfilled`, eine teilerfüllte Bestellung fällt also auch dort heraus (VERMUTUNG, nicht gemessen).
- Fix: neuer Endstatus `teilgeliefert` (Zeile 135, «fehlt …» im Ledger) mit Dauerzeile `⚠️ FORTURA: #nr Teillieferung — … Rest bei Fortura klären oder erstatten` (Zeile 188). In der Simulation erscheint die Zeile im Lauf 3 wieder.
- Bewusst nicht gebaut: einen zweiten Lieferschein für den Rest automatisch verbuchen. Der Fall wird von Hand geklärt.

**F5 🟡 → behoben: Die Ampel zeigte den Normalzustand von Stufe 2 als Warnung.** `bestell_ampel.py` (alt Zeile 149) zählte nur `bestellt` (Stufe-1-Quittung) als in Ordnung. `xml-hochgeladen` stand also immer mit ⚠️ da.
- Fix: `fortura_stand()` (Zeile 55). `xml-hochgeladen` ist bis 48 h in Ordnung, gleiche Frist wie die Engine. `bereit`, `versandt`, `teilgeliefert` und `unbekannt` bleiben ⚠️. Selbsttest 13/13.

**F6 🟡 → behoben: Ein Absturz der Engine sah aus wie «0 offen».** In `engine_keepalive.sh` (Zeile ~601) lief `( … 2>/dev/null ) | grep -v "^FORTURA: 0 offen" || true`, ein Absturz oder Timeout gab also keine Zeile.
- Fix: Die Ausgabe wird abgefangen. Bei Exit ≠ 0 oder Timeout erscheint `⚠️ FORTURA: unklar (Engine-Fehler oder Timeout)`.
- Gegenprobe mit 4 Fällen: «0 offen» bleibt still, eine Zeile kommt durch, `exit 1` und Timeout ergeben die Warnung. `bash -n` ok.

**Offen, nicht behoben (klein, aber nicht eindeutig):**
- **O1 Gemischte Bestellung (Fortura + CJ).** Der Docstring der Engine sagt «CJ-Teil bleibt beim CJ-Automaten». `cj_order_engine.py:561-571` überspringt gemischte Bestellungen aber **ganz** («manuell aufteilen», mit Meldung). Der Fortura-Teil geht automatisch, der CJ-Teil nur von Hand. Die Bestell-Ampel zeigt bei gemischten Bestellungen nur den CJ-Stand (`all(fortura-)`), die Fortura-Zeile kommt aber aus der Engine.
- **O2 Menge mit Komma.** `int(float(g))` (`fortura_bestell_engine.py:130`) bricht bei «2,000» ab und reisst den Lauf um. Unbekannt, ob Opacc so schreibt. Mit einer echten DELVRY-Datei prüfen.
- **O3 Neutraler Versand.** Der Satz «neutraler Versand an Endkundin» steht in `HEADER/TEXT`, und der wird laut Template «nicht auf Lieferschein angedruckt». Ob Fortura ohne eigenen Lieferschein mit Preisen an die Kundin versendet, ist nicht geklärt. Bei der Probebestellung auf das Paket achten.
- **O4 Liechtenstein** (Glied 6). Kein Länderfeld im Format, also Portal-Weg. Bei Fortura fragen, ob DPD nach LI über dasselbe XML geht.

## Selbsttests / Wiederholung

- `python3 automation/fortura_xml.py --selbsttest` → **10/10**: alte 7 Fälle plus Feed-Formen, VE-Sperre und Latin-1-Lieferschein.
- `python3 automation/bestell_ampel.py --selbsttest` → **13/13 OK**.
- Kein Netz: Simulationen der Engine (Stufe 2 und `main()`) mit gespiegelten Ordnern, gesperrtem `curl` und gesperrtem Shopify. Die Skripte liegen im Scratchpad der Sitzung, der Ablauf ist in dieser Datei beschrieben.

## Folge für S2 und B

- S2-Texte b/c dürfen ein Datum nennen, **sobald B (VE-1-Artikel) echt durchläuft**. Bis dahin gilt die Abbruch-Regel aus dem Richter: «das genaue Datum zeigt die Kasse».
- B: Probe mit `fortura-93583` statt Draculagebiss (F2), Lieferadresse in der Schweiz (O4). Danach in der Ampel beobachten: `bereit` → `xml-hochgeladen` → `versandt/erfuellt`, Tage notieren.

## Nachtrag 13.10.2026, ~22:45 UTC — Prüfer-Lücken N1–N4 behoben, Probeartikel B gewählt

Grenzen wie oben: kein Upload, kein Aufruf bei Fortura (`_curl` in allen Tests gesperrt), keine Bestellung, Shopify nur gelesen.
Ein Storefront-Warenkorb pro Kandidat wurde angelegt, um den Versand in der Kasse zu messen (kein Checkout, keine Bestellung).

| # | Lücke (Prüfer) | Fix | Beleg |
|---|---|---|---|
| N1 | Lieferschein ohne Kodierungsangabe (Forturas Vorlagen-Kopfzeile `<?xml version="1.0"?>`) in cp1252/Latin-1 → still `[]`, kein Tracking | `fortura_xml._xml_wurzel()`: zuerst die Bytes wie deklariert. Scheitert das, wird als UTF-8, sonst cp1252, sonst Latin-1 dekodiert und mit überschriebener Kodierung geparst. Die Deklaration im Text bleibt unverändert. Ist eine Datei wirklich kaputt, schreibt die Engine bei jedem Lauf `⚠️ FORTURA: Lieferschein <datei> unlesbar` | Selbsttest: Vorlagen-Kopfzeile + «Mantel Dracula – Grösse M, Zähne» in cp1252 und Latin-1 → Bestellnr. und Tracking gelesen. Abgeschnittene Datei → Warnzeile |
| N2 | Ersatzartikel / andere `ARTICLE_NO` → still `erfuellt`, das bestellte Teil blieb in Shopify offen | `norm_artnr()` (ohne Leerraum, gross, ohne führende Nullen) und `abgleich()`: der Lieferschein wird gegen **unsere** Bestellung (Ledger-Spalte) geprüft, nicht gegen sich selbst. Eine unbekannte Position, eine unlesbare Menge oder eine Mehrlieferung ergibt den neuen Status **`abweichend`**. Shopify bekommt nur die passenden Positionen, das bestellte Teil bleibt offen. Die Zeile `⚠️ FORTURA: #nr ABWEICHEND …` steht in **jedem** Lauf, auch wenn Shopify die Bestellung nicht mehr als offen führt, bis `--geklaert <nr>`. In der Ampel steht `Fortura: ABWEICHEND · fehlt … · fremd … ⚠️`, auch bei einem Mischkorb (CJ + Fortura) | Engine-Selbsttest: 93583 + Ersatz 99999 statt 90654-2 → `abweichend`, Sendung nur `li-fortura-93583 ×1`, Zeile in Lauf 1 und 2, mit `--geklaert` weg. «042156» bestellt, «42156» geliefert → `erfuellt` |
| N3/O2 | Mengen «2.000»/«2.0» → falscher Teillieferungs-Alarm, «2,000» → Absturz | `menge_zahl()`: Ein einzelnes Trennzeichen gilt als Dezimalzeichen («2», «2.0», «2.000», «2,000» → 2). Eindeutige Tausender («1'000», «1.000,00», «1,000.00») → 1000. «2,5», leer oder Text → `None`, das ergibt `abweichend` statt Absturz | Selbsttest: 12 Formate; «2.000» gegen «1.000» bleibt eine echte Teillieferung (`fehlt 93583 1/2`) |
| N4 | Fehlt `/tmp/fortura_feed.csv`, greift keine VE-Sperre (fail-open) | `ve_aus_feed()` gibt `None` zurück. Die Engine übergibt dann `'ve': None`, und `bau_orders_xml` lehnt ab: «VE unbekannt (Feed fehlt oder Artikel nicht im Feed)». Es geht kein XML raus, die Ampel zeigt den Portal-Weg. Gleiches gilt für einen Artikel, der im Feed fehlt | Engine-Selbsttest: Feed weg → kein Upload, Status bleibt `bereit`. Feed wieder da → `ORDERS_LX1034.xml` hochgeladen (gespielt) |
| (Prüfer, VERMUTUNG) | Fällt eine teilerfüllte Bestellung aus der Ampel? | Die Ampel fragt jetzt `(fulfillment_status:unfulfilled OR fulfillment_status:partial)` | GEMESSEN: Die OR-Syntax wirkt (unfulfilled 12 + shipped 11 = 23). Teilerfüllte Bestellungen gibt es heute 0, ob `unfulfilled` sie schon einschloss, bleibt also unmessbar. Deshalb steht `partial` ausdrücklich in der Abfrage |

**Gegenprobe:** Jeder Fix wurde in einer Kopie einzeln zurückgedreht (Mutation). Der Engine-Selbsttest wird dann rot: norm → 1 Fall, menge → 3, Kodierung → 3. Die Mutation «Feed fehlt → `{}`» fängt die Engine trotzdem ab, weil der Artikel dann fehlt und `None` ergibt. Den Fall `is None` prüft der `fortura_xml`-Selbsttest.

**Selbsttests:** `fortura_xml.py --selbsttest` 25/25 · `fortura_bestell_engine.py --selbsttest` (neu) 13/13 · `bestell_ampel.py --selbsttest` 16/16.
**Live nur lesend, 22:40:** `BESTELLUNGEN: 4 offen` (#1023–#1026, CJ bzw. Mister DTF, wie vorher), Engine `FORTURA: 0 offen` (Ledger nicht geschrieben).

**Glied 8 (Lieferschein-Leser) jetzt 🟢 trocken.** Echt bewiesen ist das erst, wenn Fortura den ersten echten Lieferschein schickt.

### Probeartikel B (Betreiber «B ja», Eigenkauf)

Filter (GEMESSEN, Shopify + Feed 13.10. 03:09): 1'611 aktive Produkte mit `profil-ch-lager`. Davon mit genau 1 Variante (also ohne Grössenwahl), VE 1, Feed-Bestand «Lagerbestand Fortura» ≥ 20 und Preis ≤ CHF 20 bleiben nur Hüte, Accessoires und Strümpfe übrig. Keine Kosmetik/Schminke, nichts Essbares. Der günstigste Treffer kostet 17.90.

| Handle | Titel | Preis | Bestand Fortura / Total | Versand in der Kasse (CH, 1 Stk) | Gleiche SKU sonst |
|---|---|---|---|---|---|
| `gangsterhut-fga98678` | Gangsterhut (schwarz, Hutgrösse 58 cm) | **17.90** (günstigster) | 251 / 269 | **Standard 0.00** | keine |
| `hexenbesen-fga99835` | Hexenbesen 89 cm | 18.90 | 220 / 261 | **Standard 0.00** | keine |
| `baseball-cap-fgapc41947` | Baseball Cap (mit Propeller) | 19.90 | 192 / 206 | **Standard 0.00** | keine |

Alle drei: ACTIVE, online, `DENY`, EAN Shop = Feed, VE 1. Korbtotal = Preis, also kein Versandaufschlag (GEMESSEN über die Storefront-API, Adresse Belp).

**Empfehlung: `hexenbesen-fga99835` (CHF 18.90).** Er kostet nur CHF 1.00 mehr als der günstigste und ist ein Saisonartikel. Halloween kommt in 18 Tagen, und genau diese Klasse (Halloween ab CH-Lager) sollen die S2-Texte mit Datum bewerben. Die Probe misst damit die Lieferzeit der Ware, um die es geht. Ist nur der Preis wichtig: `gangsterhut-fga98678` (17.90).
- `bau_orders_xml('LX9905', Testadresse Belp, …, [{'artnr':'99835','ean':'8003558983506','menge':1,'ve':1}])` ergibt **0 Fehler**, gleiches Gerüst wie die Vorlage, ohne Upload. Für 98678 und PC41947 ebenfalls 0 Fehler.
- Ablauf nach dem Kauf: Die Engine nimmt die Bestellung beim nächsten stündlichen Lauf von selbst und schreibt `bereit` → `xml-hochgeladen`. Danach den Lieferschein abwarten: `versandt` → `erfuellt`. Tage und Paket notieren (O3: Liegt ein Lieferschein mit Preisen bei?).
