---
name: shop-auswahl-varianten
description: Immer wenn bei einem LuxeStyle-Produkt die Auswahl fehlt (eine Variante «Default Title», obwohl die Galerie mehrere Farben zeigt oder CJ mehrere Varianten führt), wenn Varianten kein eigenes Bild haben, Optionswerte englisch sind - und vor jedem Lauf von cj_varianten_nachziehen.mjs, cj_variantenbilder.mjs oder auswahl_durchlauf.sh. Enthält die Kette Kandidatenliste, Trockenlauf, Stichprobe live, Kontaktbogen, Dauerlauf mit den exakten Schaltern, die Ledger, die Falle der kopflosen CSV und die Gegenproben.
---

# Auswahl (Farbe, Grösse, Modell) aus dem CJ-Datenblatt nachziehen

**Werkzeuge** (alle in `automation/`, Node = `/opt/node22/bin/node`, **Trockenlauf ist überall Vorgabe, `LIVE=1` schreibt**):
`auswahl_kandidaten.mjs` → `cj_varianten_nachziehen.mjs` → `cj_variantenbilder.mjs` → `auswahl_kontaktbogen.mjs`;
Dauerlauf `auswahl_durchlauf.sh`; Verdacht `farbwahl_scan.mjs`, `auswahl_scan.mjs`; Übersetzung `optionswerte_umbenennen.mjs`.
**Selbsttest nach jeder Code-Änderung** (am 26.10.2026 alle grün): `node automation/lib/cj_varianten_test.mjs` (69) ·
`node automation/auswahl_kandidaten_test.mjs` (16) · `node automation/auswahl_scan_test.mjs` (16) · `node automation/cj_variantenbilder_test.mjs` (16).
**Zugang:** Umgebung `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` (Client-Credentials-Grant, kein `shpat_`), für CJ
`CJ_EMAIL`, `CJ_API_KEY` (Token-Zwischenspeicher `/tmp/cj_token.json`; `getAccessToken` darf nur alle 5 Minuten gerufen werden).
Marken: **GEMESSEN** = nachgeprüft (die Livezahlen unten stammen aus dem CLAUDE.md-Stand 25./26.10.2026, **heute nicht neu am Shop gemessen**; die Testzahlen am 26.10.2026 selbst gelaufen) · **SETZUNG** = gewählte Schwelle · alles andere steht im Code.

## Wann einsetzen

- Ein Produkt zeigt in der Galerie mehrere Farben/Motive, die Kundin kann aber nichts wählen (Shopify: 1 Variante, Option «Title»).
- Der User meldet «bei fast allen Produkten fehlt die Auswahl» → **erst messen** (Schritt 1), dann nachziehen.
- Eine Auswahl existiert, aber Varianten ohne eigenes Bild, zwei Farben mit demselben Bild, englische Werte («Light Green»), «Grösse» mit Abmessungen.

## Warum (GEMESSEN, Bulk-Abfrage 25./26.10.2026)

- 31 295 von 56 636 aktiven Produkten (55 %) haben **eine** Variante; 25 341 haben mehrere. Nur 12 Produkte hatten englische Optionsnamen.
- Von 186 geprüften Produkten führten **116 bei CJ nur eine** Variante: eine Galerie mit vielen Bildern beweist **keine** Auswahl.
  Beleg: `wandbild-aus-eisen…` zeigt mehrere Motive, CJ führt eine Variante → nichts angelegt.
- Verpasst wurden Produkte, weil das Werkzeug nur 15-stellige pid-SKUs verstand; `CJYD…AZ` und `CJ-CJCS…` galten als «keine pid» (69 von 525).
  Die SKU-Formen erkennt jetzt `strategien()` aus `lib/fakten_block.mjs` (pid · UUID · `CJ-…` · bare `CJ…`).
- Trockenlauf auf 11 Produkten: 10 × PLAN. Beispiel Laufschuhe: Variantenschlüssel «Black-41/42/43/44», im Shop ohne Grösse.

## Befehle (aus dem Repo-Wurzelverzeichnis)

```bash
N=/opt/node22/bin/node
# 1. Kandidaten messen (Bulk ~1 Min., kein CJ-Punkt). Zwischenspeicher /tmp/auswahl_bulk.jsonl 3 h; NEU=1 umgeht ihn; OUT=pfad ändert die Ausgabe.
$N automation/auswahl_kandidaten.mjs
#    stdout: {"aktiv","einzelVariante","ohneCjKennung","kandidaten","stufe1","stufe2","stufe3","datei"}  → /tmp/auswahl_kandidaten.csv
#    CSV OHNE Kopfzeile: handle;stufe;sku;medien;google   (Stufe 1 = bewertet >= 4 Sterne, 2 = Kleidung/Schuhe/Schmuck/Taschen/Sport/Baby/Spielzeug, 3 = Rest; Tag fortura ist ausgeschlossen)
#    Stufenliste MIT Kopfzeile (so legt sie auch auswahl_durchlauf.sh an):
{ echo 'handle;stufe;sku;medien;google'; awk -F';' '$2==1' /tmp/auswahl_kandidaten.csv; } > /tmp/auswahl_stufe_1.csv

# 1b. Verdacht bei Produkten MIT Auswahl (nur lesen; CSV nach dropship/auswahl-scan.csv bzw. dropship/farbwahl-scan.csv)
PQUERY='status:active AND tag:cj-real' SORT=UPDATED_AT REVERSE=0 SCAN=3000 $N automation/auswahl_scan.mjs   # OHNE_BILD BILD_DOPPELT ENGLISCH GROESSE_MASS EINZELWERT TITLE_MEHRERE PREIS_NULL
PQUERY='status:active AND tag:cj-real' SORT=UPDATED_AT REVERSE=0 SCAN=3000 $N automation/farbwahl_scan.mjs   # EINZEL_TEXT EINZEL_GALERIE (GALERIE=6) FARBE_EINZELN OPTION_ENGLISCH

# 2. Trockenlauf (kostet CJ-Punkte: >= 1 Produktabfrage + 1 Frachtabfrage je Gewichtsklasse, je 1,1 s Pause). Plan je Produkt: /tmp/cj_varianten_plan/<handle>.json
LIMIT=10 HANDLES_DATEI=/tmp/auswahl_kandidaten.csv $N automation/cj_varianten_nachziehen.mjs      # oder: ... cj_varianten_nachziehen.mjs <handle> <handle>
#    Plan LESEN: optionen, varianten (werte, preis, bild.art = vorhanden|neu|unlesbar|ohne), fracht, ausgeschlossen, unbekanntOhneBeweis, unsicherUebersetzt, kiUebersetzt

# 3. Stichprobe LIVE (5-10 Produkte): ein frischer Plan (< 3 h) wird wiederverwendet, spart CJ-Punkte und Bild-Downloads
LIVE=1 LIMIT=5 HANDLES_DATEI=/tmp/auswahl_kandidaten.csv $N automation/cj_varianten_nachziehen.mjs

# 4. Kontaktbogen: je Produkt ein PNG mit einem Bild je Farbe + _befunde.json. DANN DIE BILDER ANSEHEN (Read auf die PNG) - ob Bild zur Beschriftung passt, kann kein Skript.
LISTE=dropship/cj_varianten_ledger.txt AB=0 LIMIT=10 OUT=/tmp/auswahl_qa $N automation/auswahl_kontaktbogen.mjs      # oder HANDLES=a,b
#    Übersetzungsvorschläge als /tmp/auswahl_qa/_urteil_<n>.json ([{handle, uebersetzung:{Option:{alt:neu}}}]) -> $N automation/optionswerte_umbenennen.mjs (DIR=/tmp/auswahl_qa, Trockenlauf; LIVE=1)

# 5. Variantenbilder nachziehen - für Produkte, die SCHON eine Auswahl haben, deren Varianten aber kein eigenes Bild tragen
#    (nur Lücken füllen; MAX_NEU=6 neue Bilder je Produkt; LEDGER dropship/cj_variantenbilder_ledger.txt; PLAN_DIR /tmp/cj_variantenbilder_plan)
awk -F';' 'NR==1 || $2 ~ /OHNE_BILD/' dropship/auswahl-scan.csv > /tmp/ohne_bild.csv      # Liste aus 1b, MIT Kopfzeile (wird übersprungen); nur Spalte «merkmale» zählt
LIMIT=10 $N automation/cj_variantenbilder.mjs <handle>                                        # oder HANDLES_DATEI=/tmp/ohne_bild.csv
LIVE=1 LIMIT=10 HANDLES_DATEI=/tmp/ohne_bild.csv $N automation/cj_variantenbilder.mjs         # schreibt (productVariantsBulkUpdate)

# 6. Dauerlauf - SCHREIBT LIVE (LIVE=1 ist im Skript fest). Erst nach Schritt 3+4 mit bestandener Stichprobe starten.
STUFEN="1 2 3" BATCH=150 nohup bash automation/auswahl_durchlauf.sh > /tmp/auswahl_durchlauf.out 2>&1 &
#    Schalter: LISTE=/tmp/auswahl_kandidaten.csv · LOG=/tmp/auswahl_durchlauf.log · WARTE=1800 (Sekunden bei Exit 3) · Stopp: touch /tmp/auswahl_stop · Sperre /tmp/auswahl_durchlauf.lock
```

Weitere Schalter von `cj_varianten_nachziehen.mjs`: `PLAN_DIR` · `LEDGER` (Vorgabe `dropship/cj_varianten_ledger.txt`) · `USD_CHF` (0.82435, Kurs 23.10.) ·
`FORCE=1` (endgültige Überspringer vor Ablauf der 14 Tage erneut fragen) · `KEIN_KI_UEBERSETZEN=1` · `ERLAUBE_UNSICHER=1` (nur für Eigennamen wie «Peach Tea Party»).
Ergebnis je Produkt: `PLAN | GESCHRIEBEN | UEBERSPRUNGEN(grund) | FEHLER`. **Ein Überspringen ist kein Fehler** («CJ führt nur 1 Variante», «nur n lieferbare Variante(n)»).
Exit **3** = CJ-Tagespunkte erschöpft oder dauerhaft gedrosselt (`CJ_QUOTA`/`CJ_THROTTLED`) → warten, nicht wiederholen.

## Was das Werkzeug absichtlich tut (nicht «verbessern»)

- Zerlegt den CJ-Schlüssel nur, wenn eindeutig; sonst `Auswahl nicht baubar` - **es wird nie geraten**.
- Fracht CN→CH je Gewichtsklasse (`lib/lieferbarkeit.mjs`): 0 Linien = Variante ausgeschlossen; **unbekannt wird nicht hinzugefügt**; mindestens 2 lieferbare Varianten nötig.
- Preis: Basis = bisheriger Preis, Aufschlag nur bei höherem CJ-Einkauf (× Aufschlagsfaktor, aufgerundet auf .90); nie unter dem bisherigen Preis; unbekannte Basiskosten → Einheitspreis.
- Bilder: Hash (dHash 9×8) **plus** 16×16-Farbbild; nur bei fast identischem Hash UND Farbe wird ein vorhandenes Medium verknüpft, sonst hochgeladen.
- `productSet` mit `files` **definiert die ganze Galerie**: alle READY-Medien werden per ID mitgeschickt (über 60 Medien → übersprungen). Nicht-READY-Medien fallen weg (`medienVerworfen`).
- Schreibt Tag `varianten-nachgezogen-1025`, Marker `<!-- ls-var-v1 -->` an den **Anfang** der Beschreibung und je Hinweis-Option einen Absatz «Ausführung: …»; `inventoryPolicy CONTINUE`, `tracked:false`.

## Fallen

1. **Kopflose CSV:** `auswahl_kandidaten.csv` hat **keine Kopfzeile**. `cj_varianten_nachziehen.mjs` erkennt das («handle»-Zeile nur dann Kopf); **`cj_variantenbilder.mjs`, `text_eingabe.mjs` und `cj_fakten_block.mjs` werfen die erste Zeile immer weg** → das erste Produkt geht verloren.
   Nimm `/tmp/auswahl_stufe_<n>.csv` (der Dauerlauf legt sie mit Kopfzeile an) oder setze `handle;stufe;sku;medien;google` davor.
2. **Seitenreihenfolge mit den Texten:** nach diesem Lauf beginnt die Beschreibung mit `<!-- ls-var-v1 -->`. `lib/text_prosa.mjs → zerlege()` findet dann keinen Kopf und keine Prosa, `text_eingabe.mjs` meldet «Prosa nicht schlicht/leer»
   (GEMESSEN 26.10.2026 an einer nachgebauten Seite, nicht an einem Live-Produkt). **Produkttexte zuerst (Skill produkttexte-aus-datenblatt), Auswahl danach** - oder `zerlege()` mit Test anpassen.
3. **Unsicher Übersetztes nie live:** englische Farbnamen auf der Seite wären der nächste Mangel; der Livelauf überspringt Pläne mit `unsicherUebersetzt`. «Oil Painting Blue» unverändert zurück = nicht übersetzt.
4. **Hash allein verwechselt Farben:** Uhren mit gleichem Aufbau, verschiedene Zifferblätter liegen im Hash nur 6-9 Bit auseinander. Nie die Schwelle `maxDh`/`maxFarbe` lockern.
5. **Option «Grösse» mit Abmessungen** («140 × 183 cm») löst den Kleider-Hinweis «eine Nummer grösser» aus (Merkmal `GROESSE_MASS`) - Option umbenennen.
6. **Ledger:** `GESCHRIEBEN` überspringt dauerhaft; endgültige Überspringer 14 Tage. `cj_variantenbilder.mjs` überspringt nur `GESCHRIEBEN`.
7. Ein 3-h-Plan wird im Livelauf wiederverwendet: nach Änderung am Produkt oder Code `rm /tmp/cj_varianten_plan/<handle>.json`.
8. Die SKU im Shop ist `CJ-<pid>`; welche CJ-Variante bisher verkauft wurde, ist **unbekannt** - nie raten, nie «die erste» als verkauft annehmen.
9. `cj_variantenbilder.mjs` braucht eine SKU der Form `CJ??<Ziffern>` (UUID-/pid-SKUs → «keine CJ-Varianten-SKU»), `cjSku()` entfernt das Shop-Präfix `CJ-` vor `CJ…`.

## Gegenproben (jede mit Zahl)

- **Vorher/nachher:** `NEU=1 $N automation/auswahl_kandidaten.mjs` → `einzelVariante` muss um genau die Zahl `GESCHRIEBEN` sinken. Sinkt es weniger: Ledger gegen Shop prüfen.
- **Frisch lesen, nicht dem Schreibergebnis glauben:** `productByHandle{ options{name values} variantsCount{count} variants(first:100){nodes{sku price image{url}}} }` - Optionen, Anzahl, Bilder.
- **Verdacht auf das Ergebnis:** `PQUERY='status:active AND tag:varianten-nachgezogen-1025' SCAN=2000 $N automation/auswahl_scan.mjs` → `OHNE_BILD`, `BILD_DOPPELT`, `ENGLISCH` müssen 0 sein.
- **Live-Seite mit Cache-Buster** (`?cb=$(date +%s)`) abrufen; Rand-Cache hält ~20 s. HTTP 429 ist keine 404 (Skill shop-messen-nicht-raten).
- **Stichprobe ansehen:** mindestens 10 Kontaktbögen vor dem Dauerlauf; bekannte Befunde stehen in `dropship/auswahl-qa-2610.csv` (Fremdtext im Bild, Farbe passt nicht zum Namen).
- Wenn eine Zahl zu gut aussieht (z. B. 0 Überspringer): Messgerät prüfen - wie viele Produkte hat der Lauf **angefasst**?
