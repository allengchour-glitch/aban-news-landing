---
name: shop-auswahl-varianten
description: Immer wenn bei einem LuxeStyle-Produkt die Auswahl fehlt (nur «Default Title», obwohl Galerie oder CJ mehrere Varianten zeigen), wenn Varianten kein eigenes Bild haben, Optionswerte englisch sind, Fremdstecker-Varianten (US/UK/AU) im Shop liegen oder ein Dauerlauf am Shopify-Tageslimit für neue Varianten endet - und vor jedem Lauf von cj_varianten_nachziehen.mjs, cj_variantenbilder.mjs, optionen_uebersetzen.mjs, stecker_cj_bereinigen.mjs oder auswahl_durchlauf.sh.
---

# Auswahl (Farbe, Grösse, Modell) aus dem CJ-Datenblatt nachziehen

**Werkzeuge** (alle in `automation/`, Node = `/opt/node22/bin/node`; **Trockenlauf ist Vorgabe, wo in Shopify geschrieben wird (`LIVE=1` schreibt)**, Ausnahme `auswahl_durchlauf.sh` (immer live);
`auswahl_kandidaten`, `auswahl_scan`, `farbwahl_scan`, `auswahl_kontaktbogen` lesen nur):
`auswahl_kandidaten.mjs` → `cj_varianten_nachziehen.mjs` → `cj_variantenbilder.mjs` → `auswahl_kontaktbogen.mjs`;
Dauerlauf `auswahl_durchlauf.sh`; Verdacht `farbwahl_scan.mjs`, `auswahl_scan.mjs`.
Englische Optionswerte **katalogweit:** `optionen_uebersetzen.mjs` (Wörterbuch + KI; auch der Trockenlauf ruft die KI, füllt `/tmp/optionen_uebersetzt.json`, schreibt nichts in Shopify; `PROBE=n` Beispiele; `LIVE=1 LIMIT=n` schreibt).
Schon geschriebene Mischwerte («Gold black») und Modell-Kürzel unter «Farbe»: `optionen_reparieren.mjs` (`LIVE=1`). Einzelne Produkte nach dem Kontaktbogen: `optionswerte_umbenennen.mjs`. Fremdstecker: `stecker_cj_bereinigen.mjs` (Schritt 7).
**Selbsttest nach jeder Code-Änderung** (Kern; am 26.10.2026 selbst gelaufen, grün): `node automation/lib/cj_varianten_test.mjs` (84) ·
`auswahl_kandidaten_test.mjs` (16) · `auswahl_scan_test.mjs` (16) · `cj_variantenbilder_test.mjs` (16) · `farbwahl_scan_test.mjs` (16) · `cj_varianten_nachziehen_stecker_test.mjs` (5) ·
`lib/stecker_cj_test.mjs` (58) · `lib/option_umbenennen_test.mjs` (12) · `optionen_reparieren_test.mjs` (12) · `optionen_uebersetzen_test.mjs` (30) · `lib/fakten_block_test.mjs` (52) · `lib/text_prosa_test.mjs` (38).
**Zugang:** `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` (Client-Credentials-Grant, kein `shpat_`); CJ: `CJ_EMAIL`, `CJ_API_KEY` (Token `/tmp/cj_token.json`; `getAccessToken` nur alle 5 Minuten).
Marken: **GEMESSEN** = nachgeprüft (Livezahlen aus dem CLAUDE.md-Stand 25./26.10.2026, **nicht neu am Shop gemessen**; Testzahlen selbst gelaufen) · **SETZUNG** = gewählte Schwelle.

## Wann einsetzen

- Ein Produkt zeigt in der Galerie mehrere Farben/Motive, die Kundin kann aber nichts wählen (Shopify: 1 Variante, Option «Title»).
- Der User meldet «bei fast allen Produkten fehlt die Auswahl» → **erst messen** (Schritt 1), dann nachziehen.
- Eine Auswahl existiert, aber Varianten ohne eigenes Bild, zwei Farben mit demselben Bild, englische Werte («Light Green»), «Grösse» mit Abmessungen.
- Fremdstecker-Varianten im Shop (Schritt 7) oder ein Dauerlauf, der still endet (Exit 4).

## Warum (GEMESSEN, Bulk-Abfrage 25./26.10.2026)

- 31 295 von 56 636 aktiven Produkten (55 %) haben **eine** Variante; 25 341 haben mehrere. Nur 12 Produkte hatten englische Optionsnamen.
- Von 186 geprüften Produkten führten **116 bei CJ nur eine** Variante: eine Galerie mit vielen Bildern beweist **keine** Auswahl.
  Beispiel `wandbild-aus-eisen…`: mehrere Motive, CJ führt eine Variante → nichts angelegt.
- Verpasst wurden Produkte, weil das Werkzeug nur 15-stellige pid-SKUs verstand: `CJYD…AZ` und `CJ-CJCS…` galten als «keine pid» (69 von 525); Abhilfe `strategien()`, siehe Falle 7.
- Trockenlauf auf 11 Produkten: 10 × PLAN (Laufschuhe: CJ-Schlüssel «Black-41/42/43/44», im Shop ohne Grösse).

## Befehle (aus dem Repo-Wurzelverzeichnis)

```bash
N=/opt/node22/bin/node
# 1. Kandidaten messen (Bulk ~1 Min., kein CJ-Punkt). Zwischenspeicher /tmp/auswahl_bulk.jsonl 3 h; NEU=1 umgeht ihn; OUT=pfad ändert die Ausgabe.
$N automation/auswahl_kandidaten.mjs
#    stdout: {aktiv, einzelVariante, ohneCjKennung, kandidaten, stufe1-3, datei}  → /tmp/auswahl_kandidaten.csv
#    CSV OHNE Kopfzeile: handle;stufe;sku;medien;google   (Stufe 1 = bewertet >= 4 Sterne, 2 = Kleidung/Schuhe/Schmuck/Taschen/Sport/Baby/Spielzeug, 3 = Rest; Tag fortura ist ausgeschlossen)
#    Stufenliste MIT Kopfzeile (so legt sie auch auswahl_durchlauf.sh an):
{ echo 'handle;stufe;sku;medien;google'; awk -F';' '$2==1' /tmp/auswahl_kandidaten.csv; } > /tmp/auswahl_stufe_1.csv

# 1b. Verdacht bei Produkten MIT Auswahl (nur lesen). IMMER AUS= setzen, sonst landet die CSV ungetrackt in dropship/auswahl-scan.csv bzw. farbwahl-scan.csv und ein zweiter Scan überschreibt sie.
AUS=/tmp/auswahl-scan.csv PQUERY='status:active AND tag:cj-real' SORT=UPDATED_AT REVERSE=0 SCAN=3000 $N automation/auswahl_scan.mjs   # OHNE_BILD BILD_DOPPELT ENGLISCH GROESSE_MASS EINZELWERT TITLE_MEHRERE PREIS_NULL
AUS=/tmp/farbwahl-scan.csv PQUERY='status:active AND tag:cj-real' SORT=UPDATED_AT REVERSE=0 SCAN=3000 $N automation/farbwahl_scan.mjs   # EINZEL_TEXT EINZEL_GALERIE (GALERIE=6) FARBE_EINZELN OPTION_ENGLISCH

# 2. Trockenlauf (kostet CJ-Punkte: >= 1 Produktabfrage + 1 Frachtabfrage je Gewichtsklasse, je 1,1 s Pause). Plan je Produkt: /tmp/cj_varianten_plan/<handle>.json
LIMIT=10 HANDLES_DATEI=/tmp/auswahl_kandidaten.csv $N automation/cj_varianten_nachziehen.mjs      # oder: ... cj_varianten_nachziehen.mjs <handle> <handle>
#    Plan LESEN: optionen, varianten (werte, preis, bild.art = vorhanden|neu|unlesbar|ohne), fracht, ausgeschlossen, unbekanntOhneBeweis, unsicherUebersetzt, kiUebersetzt

# 3. Stichprobe LIVE (5-10 Produkte): ein Plan < 3 h wird wiederverwendet (spart CJ-Punkte); nach Änderung an Produkt oder Code vorher rm /tmp/cj_varianten_plan/<handle>.json
LIVE=1 LIMIT=5 HANDLES_DATEI=/tmp/auswahl_kandidaten.csv $N automation/cj_varianten_nachziehen.mjs

# 4. Kontaktbogen: je Produkt ein PNG mit einem Bild je Farbe + _befunde.json. DANN DIE BILDER ANSEHEN (Read auf die PNG) - ob Bild zur Beschriftung passt, kann kein Skript.
LISTE=dropship/cj_varianten_ledger.txt AB=0 LIMIT=10 OUT=/tmp/auswahl_qa $N automation/auswahl_kontaktbogen.mjs      # oder HANDLES=a,b
#    Übersetzungsvorschläge als /tmp/auswahl_qa/_urteil_<n>.json ([{handle, uebersetzung:{Option:{alt:neu}}}]) -> $N automation/optionswerte_umbenennen.mjs (DIR=/tmp/auswahl_qa, Trockenlauf; LIVE=1)

# 5. Variantenbilder nachziehen - für Produkte, die SCHON eine Auswahl haben, deren Varianten aber kein eigenes Bild tragen
#    (nur Lücken füllen; MAX_NEU=6 neue Bilder je Produkt; LEDGER dropship/cj_variantenbilder_ledger.txt)
awk -F';' 'NR==1 || $2 ~ /OHNE_BILD/' /tmp/auswahl-scan.csv > /tmp/ohne_bild.csv      # Liste aus 1b, MIT Kopfzeile (wird übersprungen); nur Spalte «merkmale» zählt
LIMIT=10 $N automation/cj_variantenbilder.mjs <handle>                                        # oder HANDLES_DATEI=/tmp/ohne_bild.csv
LIVE=1 LIMIT=10 HANDLES_DATEI=/tmp/ohne_bild.csv $N automation/cj_variantenbilder.mjs         # schreibt (productVariantsBulkUpdate)

# 6. Dauerlauf - SCHREIBT LIVE. Erst nach Schritt 3+4 mit bestandener Stichprobe starten.
STUFEN="1 2 3" BATCH=150 nohup bash automation/auswahl_durchlauf.sh > /tmp/auswahl_durchlauf.out 2>&1 &
#    Schalter: LISTE=/tmp/auswahl_kandidaten.csv · LOG=/tmp/auswahl_durchlauf.log · WORKERS=3 (parallele Läufe; am 26.10. mit 6 gefahren, ~14-19 Produkte/Min. laut CLAUDE.md) ·
#    WARTE=1800 (Sekunden bei Exit 3) · WARTE_VAR=2400 (Sekunden bei Exit 4) · NODE · Sperre /tmp/auswahl_durchlauf.lock
#    Stopp: touch /tmp/auswahl_stop - vor jedem Neustart rm -f /tmp/auswahl_stop, sonst endet der Lauf sofort mit «FERTIG» ohne Arbeit (nach Neustart der Umgebung ist /tmp ohnehin leer).

# 7. Fremdstecker (Schweizer Steckdose Typ J nimmt Euro-Flachstecker Typ C, NICHT Schuko Typ F, UK, US, AU) - erkannt am CJ-Variantenschlüssel, nicht am Shop-Text
$N automation/stecker_cj_bereinigen.mjs                 # Trockenlauf; liest /tmp/cj_fakten_cache/<handle>.json (CACHE_DIR); Plan /tmp/stecker_cj_plan.json
QUELLE=shop $N automation/stecker_cj_bereinigen.mjs     # Produkte OHNE CJ-Datenblatt: Optionswerte aus /tmp/varianten_bulk.jsonl (BULK_DATEI)
#    LIVE=1 löscht Fremdstecker-Varianten (Tag stecker-bereinigt-2510); bleibt keine passende, Produkt DRAFT + Tag stecker-nicht-ch. Gegenprobe: Lauf wiederholen, Plan muss leer sein (bei QUELLE=shop erst die Bulk-Datei neu ziehen: `bulkOperationRunQuery` auf `productVariants { id title selectedOptions{name value} product{id handle title status} }`, kein Repo-Skript erzeugt sie).
```

Weitere Schalter von `cj_varianten_nachziehen.mjs`: `PLAN_DIR` · `LEDGER` (Vorgabe `dropship/cj_varianten_ledger.txt`) · `USD_CHF` (0.82435, Kurs 23.10.) ·
`FORCE=1` (endgültige Überspringer vor Ablauf der 14 Tage erneut fragen) · `KEIN_KI_UEBERSETZEN=1` · `ERLAUBE_UNSICHER=1` (nur für Eigennamen wie «Peach Tea Party») ·
`MAX_VARIANTEN=40` (grössere Produkte werden übersprungen, **nicht** ins Ledger geschrieben, kommen bei jedem Lauf wieder dran und kosten je eine CJ-Abfrage; 100 erlaubt alle, frisst aber das Tageslimit schneller).
Ergebnis je Produkt: `PLAN | GESCHRIEBEN | SKU_GESETZT | UEBERSPRUNGEN(grund) | FEHLER`. **Ein Überspringen ist kein Fehler** («CJ führt nur 1 Variante», «nur n lieferbare Variante(n)»).

**Exitcodes:** **3** = CJ-Tagespunkte erschöpft oder dauerhaft gedrosselt (`CJ_QUOTA`/`CJ_THROTTLED`) → warten, nicht wiederholen.
**4** = Shopify-Tageslimit für **neue Varianten** («Daily variant creation limit reached», `VARIANT_THROTTLE_EXCEEDED`; gemessen ca. 9 500 neue Varianten, CLAUDE.md-Stand 26.10.). Es gilt für den ganzen Shop, auch für CJ-Import und andere Sitzungen.
Der Dauerlauf wartet `WARTE_VAR` und macht weiter (nicht neu starten); ein Einzellauf endet mit 4: später wiederholen (das Ledger verhindert Doppelarbeit). Der Fehler wird geworfen, steht nicht als `FEHLER` im Ledger (`grep` = 0);
er zeigte sich zuerst als «alle Läufe rc=1, FERTIG»: **bei einem Dauerlauf immer den GRUND des Endes im Log lesen (`rc=`, «Tagesgrenze»), nicht nur «FERTIG».** 29 278 Kandidaten (CLAUDE.md-Stand) brauchen Tage, nicht Stunden (Hochrechnung).

## Was das Werkzeug absichtlich tut (nicht «verbessern»)

- Zerlegt den CJ-Schlüssel nur, wenn eindeutig; sonst `Auswahl nicht baubar` - **es wird nie geraten**.
- Fracht CN→CH je Gewichtsklasse (`lib/lieferbarkeit.mjs`): 0 Linien = Variante ausgeschlossen; **unbekannt wird nicht hinzugefügt**; mindestens 2 lieferbare Varianten nötig.
- Preis: Einkaufsbezug ist die **erste** CJ-Variante (`vs[0].ek`, Annahme «so wurde importiert», nicht belegt, Falle 7). Mehreinkauf über 0,05 CHF gegenüber dieser bekommt den Aufschlag
  (Mehreinkauf × `USD_CHF` × Preis/Kosten der bisherigen Variante, aufgerundet auf .90); nie unter dem bisherigen Preis; unbekannte Basiskosten oder unbekannter Einkaufspreis → Einheitspreis; fehlender Basispreis (Shop-Preis ≤ 0) → Überspringen «kein Basispreis». Im Plan `basis`, `varianten[].preis`/`einheitspreis` gegen den Shop-Preis lesen.
- Fremdstecker (US/UK/AU/JP) werden nie angelegt (`steckerUrteil`, `lib/stecker_cj.mjs`, am CJ-Schlüssel); EU/EUR bleibt, «US Size 10» (Ringgrösse) ist kein Stecker. Nur Fremdstecker bei CJ = Überspringen («nur Fremdstecker», ins Ledger).
- Buchstaben-Kürzel unter Color/Farbe (A, B, C; mind. die Hälfte der Werte) werden Option «Modell» mit Werten «Modell A»; Zahlen nie (Moissanit-Ring «5, 6, 7, 8» = Ringgrössen).
- `productSet` mit `files` **definiert die ganze Galerie**: alle READY-Medien werden per ID mitgeschickt (über 60 Medien → übersprungen). Nicht-READY-Medien fallen weg (`medienVerworfen`).
- Schreibt Tag `varianten-nachgezogen-1025`, Marker `<!-- ls-var-v1 -->` an den **Anfang** der Beschreibung und je Hinweis-Option einen Absatz «Ausführung: …»; `inventoryPolicy CONTINUE`, `tracked:false`.

## Fallen

1. **Kopflose CSV:** `auswahl_kandidaten.csv` hat **keine Kopfzeile**. `cj_varianten_nachziehen.mjs` erkennt das («handle»-Zeile nur dann Kopf); **`cj_variantenbilder.mjs`, `text_eingabe.mjs` und `cj_fakten_block.mjs` werfen die erste Zeile immer weg** → das erste Produkt geht verloren.
   Nimm `/tmp/auswahl_stufe_<n>.csv` (Schritt 1; der Dauerlauf legt sie ebenso an) oder setze `handle;stufe;sku;medien;google` davor.
2. **Marker und Texte:** der Lauf stellt `<!-- ls-var-v1 -->` (+ «Ausführung»-Absätze) VOR die Seite. Seit Commit 48b28b11f (26.10.2026) zählt `zerlege()` (`lib/text_prosa.mjs`, Tests «Var-Marker») das zum Kopf; Text- und Auswahl-Lauf blockieren sich nicht mehr.
   Titel → Text → Auswahl bleibt Konvention (Skill `titel-wahrheit`, Schritt 3), keine technische Pflicht. Der Marker wird nur am Seitenanfang erkannt.
3. **Unsicher Übersetztes nie live:** der Livelauf überspringt Pläne mit `unsicherUebersetzt` (englische Farbnamen wären der nächste Mangel). «Oil Painting Blue» unverändert zurück = nicht übersetzt.
4. **Hash allein verwechselt Farben** (Uhren mit gleichem Aufbau, andere Zifferblätter: nur 6-9 Bit Abstand). Darum zählt dHash 9×8 **plus** 16×16-Farbbild: nur bei fast identischem Hash UND Farbe wird ein vorhandenes Medium verknüpft, sonst hochgeladen. Nie `maxDh`/`maxFarbe` lockern.
5. **Option «Grösse» mit Abmessungen** («140 × 183 cm») löst den Kleider-Hinweis «eine Nummer grösser» aus (Merkmal `GROESSE_MASS`) - Option umbenennen.
6. **Ledger:** `GESCHRIEBEN` überspringt dauerhaft; endgültige Überspringer 14 Tage; `SKU_GESETZT` 14 Tage. `cj_variantenbilder.mjs` überspringt nur `GESCHRIEBEN`.
7. **SKU nachziehen (27.10.2026, Bestellung #1029):** Bleibt nach dem Stecker-Filter genau EINE von mehreren CJ-Varianten, ist die Shop-SKU `CJ-<pid>` mehrdeutig (passt auch auf die 110-V-Version) und die Bestell-Engine hält an. `lib/sku_nachziehen.mjs` entscheidet rein (`null` / `{unklar}` / `{neueSku}`): Euro-Stecker ausdrücklich im Schlüssel, verworfene Varianten unterscheiden sich NUR im Stecker (`steckerBasis`), Einkaufspreis höchstens +5 % über dem billigsten, Nummer in der Form der Engine (Zeichensatz `[A-Za-z0-9._ -]{6,80}`), Frachtlinie CN→CH für die bleibende Variante, Ziel-SKU nicht schon bei einem anderen Produkt (nackt oder mit `CJ-`, ohne Beachtung der Schreibweise). Geschrieben wird NUR die SKU (`productVariantsBulkUpdate`, Ledger `SKU_GESETZT`, `SKU alt → neu`); Deckel `MAX_SKU_SCHREIBEN` (Vorgabe 25, im Nacht-Workflow 5) je 20 Stunden, frisch aus dem Ledger gezählt. Unklare Fälle: `zurückgestellt: SKU mehrdeutig: …` (7 Tage, Zähler `SKU_MEHRDEUTIG` im Bericht) — Entscheid beim Besitzer, nie raten.
7. Die SKU im Shop ist meist `CJ-<pid>`, daneben reine pid/UUID, `CJ-CJ…` oder blanke `CJ…`-Varianten-SKUs (siehe `strategien()` in `lib/fakten_block.mjs`); welche CJ-Variante bisher verkauft wurde, ist **unbekannt** - nie raten, nie «die erste» als verkauft annehmen.
8. `cj_variantenbilder.mjs` braucht eine SKU der Form `CJ??<Ziffern>` (UUID-/pid-SKUs → «keine CJ-Varianten-SKU»), `cjSku()` entfernt das Shop-Präfix `CJ-` vor `CJ…`.

## Gegenproben (jede mit Zahl)

- **Vorher/nachher:** `NEU=1 $N automation/auswahl_kandidaten.mjs` → `einzelVariante` muss um genau die Zahl `GESCHRIEBEN` sinken. Sinkt es weniger: Ledger gegen Shop prüfen.
- **Frisch lesen, nicht dem Schreibergebnis glauben:** `query{ productByHandle(handle:"<handle>"){ options{name values} variantsCount{count} variants(first:100){nodes{sku price image{url}}} } }` (Admin-API 2025-01, wie in den Skripten) - Optionen, Anzahl, Bilder.
- **Verdacht auf das Ergebnis:** `AUS=/tmp/auswahl_scan_nachher.csv PQUERY='status:active AND tag:varianten-nachgezogen-1025' SCAN=2000 $N automation/auswahl_scan.mjs` → `OHNE_BILD`, `BILD_DOPPELT`, `ENGLISCH` müssen 0 sein (eigenes `AUS`).
- **Live-Seite mit Cache-Buster** (`?cb=$(date +%s)`) abrufen; Rand-Cache hält ~20 s. HTTP 429 ist keine 404 (Skill shop-messen-nicht-raten).
- **Stichprobe:** mindestens 10 Kontaktbögen vor dem Dauerlauf ansehen (Befunde: `dropship/auswahl-qa-2610.csv`).
- Wenn eine Zahl zu gut aussieht (z. B. 0 Überspringer): Messgerät prüfen - wie viele Produkte hat der Lauf **angefasst**?
