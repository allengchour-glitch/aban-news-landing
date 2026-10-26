---
name: produkttexte-aus-datenblatt
description: Immer wenn Produktseiten von LuxeStyle längere, schönere oder vollständigere Beschreibungen bekommen sollen ("zu wenig Text", "CJ-Texte nutzen", Fliesstext, Technische Daten, Lieferumfang) - und vor jedem Lauf von cj_fakten_block.mjs, text_eingabe.mjs, text_pruefen_cli.mjs oder text_anwenden.mjs. Beschreibt die Kette CJ-Datenblatt -> Eingabedatei -> Agenten schreiben -> mechanische Prüfung -> setzen, die exakten Befehle und Schalter, jede Prüfregel von prosaPruefen, die Grenzen dünner CJ-Daten und die Gegenproben.
---

# Produkttexte aus dem CJ-Datenblatt: Agenten schreiben, Code prüft, Code setzt

**Grundsatz:** Mehr Text hilft nur, wenn er stimmt. Ein Agent darf **übersetzen, ordnen, ausformulieren - nicht ergänzen**.
Ob er sich daran gehalten hat, entscheidet **nicht das Modell**, sondern `lib/text_prosa.mjs → prosaPruefen()` und `lib/fakten_block.mjs`.
**Werkzeuge** (`automation/`, Node `/opt/node22/bin/node`, Trockenlauf ist Vorgabe): `cj_fakten_block.mjs` (Tabelle) · `text_eingabe.mjs` · `text_pruefen_cli.mjs` · `text_anwenden.mjs` (Fliesstext).
**Selbsttest** (alle Zeilen enden mit `… ok`, Exit-Code 0; neu gemessen 26.10.2026: 52 und 38): `node automation/lib/fakten_block_test.mjs` · `node automation/lib/text_prosa_test.mjs`.
**Zugang:** `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`; CJ: `CJ_EMAIL`, `CJ_API_KEY`; Modell für den Fakten-Block: `GEMINI_API_KEY`, sonst `GROQ_API_KEY`.
Marken: **GEMESSEN** · **SETZUNG** · alles andere steht im Code.

## Wann einsetzen

- User-Aussage «Texte zu lasch / zu knapp» (26.10.2026; steht so im Kopfkommentar von `lib/fakten_block.mjs` und `lib/text_prosa.mjs`).
- Neue Produkte nach einem Import, deren Seite nur den Kurztext hat.
- **Nicht**, wenn der Titel dem Datenblatt widerspricht (erst Skill `titel-wahrheit`) oder die Quelle dünn ist (siehe Grenzen).

## Befehle

```bash
N=/opt/node22/bin/node    # aus dem Repo-Wurzelverzeichnis

# 1. CJ-Datenblatt in den Zwischenspeicher holen: /tmp/cj_fakten_cache/<handle>.json (ohne Modell, schreibt nichts in den Shop)
KEIN_LLM=1 HANDLES=a,b $N automation/cj_fakten_block.mjs          # zeigt den Quelltext je Produkt; LISTE=datei.csv LIMIT=40 statt HANDLES
#    Produkte mit Marker <!-- ls-fakten-v1 --> werden ohne FORCE=1 nicht geholt ("hat schon einen Fakten-Block"). /tmp ist pro Container flüchtig:
#    in einer neuen Sitzung fehlt der Zwischenspeicher, dann FORCE=1 KEIN_LLM=1 (kostet CJ-Punkte, 1,1 s Pause je Abfrage). Meldung «CJ-Tagespunkte erschöpft — Lauf endet» = morgen weiter.

# 2. (optional, ein anderer Baustein) Tabelle «Technische Daten / Lieferumfang / Hinweise»: erst Vorschau lesen, dann schreiben
HANDLES=a,b $N automation/cj_fakten_block.mjs                      # Vorschau nach /tmp/fakten_vorschau/<handle>.html (OUT=pfad)
LIVE=1 HANDLES=a,b $N automation/cj_fakten_block.mjs              # FORCE=1 = Produkte mit Marker <!-- ls-fakten-v1 --> nochmals

# 3. Eingabedateien für die Text-Agenten: /tmp/text_eingabe/<handle>.json + _stapel.json (je 20 Handles)
HANDLES=a,b $N automation/text_eingabe.mjs                         # oder LISTE=datei.csv LIMIT=120 START=0 OUT=/tmp/text_eingabe
#    OUT=, IN=, AUS= nur mit den Standardpfaden sinnvoll: `text_pruefen_cli.mjs` (Selbsttest der Agenten) liest fest /tmp/text_eingabe und /tmp/text_ausgabe;
#    `text_anwenden.mjs` folgt IN/AUS, der Selbsttest nicht.
#    stdout: «Eingaben: n · Stapel: m · übersprungen: {kein CJ-Datenblatt, nicht aktiv, hat schon Text v2, Prosa nicht schlicht/leer}»
#    JSON-Felder: handle, titel, preisCHF, cjKategorie, optionen[{name,werte}], alterText, faktenBlock, cjQuelle

# 4. Agenten: je Stapel EIN Agent. Er liest NUR /tmp/text_eingabe/<handle>.json und schreibt /tmp/text_ausgabe/<handle>.json
#    = {"handle":"<handle>","html":"<p>…</p><p>…</p>"}   (handle muss stimmen, sonst «FEHLER: handle in der Ausgabe ist …»)
#    Selbsttest des Agenten, bis jede Zeile «OK» sagt (Exit 1, sobald eines durchfällt):
$N automation/text_pruefen_cli.mjs <handle> [<handle> …]

# 5. Prüfen + setzen. Trockenlauf prüft ALLE Ausgaben und schreibt nichts (liest nur den Shopify-Token); Bericht /tmp/text_bericht/abgelehnt.txt
$N automation/text_anwenden.mjs                                    # «BESTEHT PRÜFUNG: n · abgelehnt a · Fehler f (von N)»
LIVE=1 $N automation/text_anwenden.mjs                             # «GESCHRIEBEN: n …»; IN=/tmp/text_eingabe AUS=/tmp/text_ausgabe
```

Das Setzen (`prosaEinsetzen`) lässt Lieferzeit-/«Ohne Risiko»-Kasten davor und alle Kästen danach stehen. **Beim ersten Setzen** (Seite ohne `ls-text-v2`) wird die alte schlichte Prosa ersetzt und **nicht gesichert**: es bleibt nur `alterText` als Klartext in `/tmp/text_eingabe` (flüchtig, ohne HTML), im Repo liegt keine Sicherung. Wer einen Rückfall will, sichert vorher `descriptionHtml` (z. B. per Bulk-Abfrage in eine Datei im Repo). Erst Folgeläufe ersetzen allein den Block zwischen `<!-- ls-text-v2 -->` und `<!-- /ls-text-v2 -->`.
Überschriften `<h3>` werden zu `<h4>` (das Theme setzt `<h3>` deutlich grösser als die Tabelle darunter). Je Produkt ein Ledger-Eintrag `text-v2 <handle>` in `dropship/kategorien_ledger.txt`.
LIVE liest die Seite **frisch** und lehnt ab, wenn sie nicht ACTIVE ist oder - **nur bei Seiten ohne `ls-text-v2`** - die Prosa inzwischen nicht mehr schlicht ist (Tabelle, Bild, `<div>`, Link …). Seiten mit Block werden ohne Schlicht-Test neu gesetzt (Falle 8).
Beleg: Ledger `dropship/kategorien_ledger.txt`, Lauf 26.10. 01:50-01:54Z = 313 `text-v2`-Zeilen (313 Handles); `CLAUDE.md` «533 Texte live (313 + 220)». «Prosa inzwischen nicht mehr schlicht» heisst: die Seite hat sich zwischen Eingabe und Setzen geändert - kein Grund zum Jagen. Die Lauf-Ausgabe (abgelehnt/Fehler) liegt nicht im Repo; `/tmp/text_bericht/abgelehnt.txt` wird je Lauf überschrieben.

## Was `prosaPruefen` verlangt (das ist der Auftrag an die Agenten - eins zu eins weitergeben)

Regel 3 in `dropship/TEXT-AGENT-AUFTRAG.md` («… ausser das Datenblatt sagt es ausdrücklich so») vermischt «nie» und «nur mit Beleg» (heilt, therapeutisch, medizinisch, garantiert sind auch mit Beleg gesperrt): es gilt die Tabelle.

| Regel | Wert |
|---|---|
| Tags | nur `p h3 ul li strong em br`, **keine Attribute** |
| Länge | 450-3600 Zeichen reiner Text · mindestens 2 `<p>` · mindestens 5 Sätze |
| Zahlen | **jede** Zahl im Text (auch `2` aus «2-in-1») muss in `cjQuelle`, `alterText`, `faktenBlock`, `titel` oder den Optionen stehen |
| Behauptungswörter | beste/bestes, testsieger, nummer 1, 100 % (die Zahl 100 muss zusätzlich in den Quellen stehen), wissenschaftlich, klinisch, dermatologisch, zertifiziert, original, wasserfest, spritzwassergeschützt, IP + zwei Ziffern (IP67): **nur** mit gleichem Wort im **CJ**-Datenblatt (der alte Seitentext zählt nicht) |
| Verboten immer | Marken/Lizenzen (`VERBOTEN` in `lib/fakten_block.mjs`: Disney, Nike, iPhone, Samsung …) und, **auch mit Beleg im Datenblatt:** heilt/heilung/heilen, therap-, medizin(isch), diagnos-, krebs, schmerzfrei/-linder, 100 % sicher/wirksam/original, `garantiert`, `bestseller`, **`wasserdicht`** |
| `wasserdicht` / `wasserfest` | `wasserdicht` fällt durch (VERBOTEN); einzige Ausnahme direkt vor « Schutz…» bzw. «e Schutz…» («wasserdichte Schutzhülle»): dort entscheidet allein der Beleg. Sonst «wasserfest». Beleg = Datenblatt nennt «waterproof» (nur die Form «Waterproof: no/nein/not» gilt als Verneinung), «water resistant» oder «<n> ATM». `IPX7` allein belegt «wasserfest» **nicht**; «IP67» im Text braucht dasselbe Wort im Datenblatt (IPX7 wird als Behauptungswort gar nicht erfasst). **Bei Wasser-Wörtern den Quelltext selbst lesen:** «Not waterproof» und «Water resistant: no» gelten im Code fälschlich als Beleg (gemessen 26.10.2026). |
| Schreibweise | kein `ß`, keine chinesischen Zeichen, keine Preise (`CHF`, `Fr.`, `€`, `$`) |
| Keine Quellenverweise | «Datenblatt», «Lieferant» (auch «Lieferanten»), «laut Angaben», «laut Quelle», «laut Hersteller», «Herstellerangabe» (reine Teilstring-Prüfung ohne Wortgrenze) |
| Keine Verwaltungssprache | «gehört zur Kategorie» (immer) und als Satzmuster «Das/Dieses Produkt/Modell/Set/Stück/Ding … führt es als / ist als … ausgewiesen»; «ausgewiesen» allein ist nicht gesperrt (`text_prosa.mjs`, Zeile 68) |
| Keine Dopplung mit den Kästen | die Wörter Lieferzeit, Versand, Rückgabe, Garantie kommen im Fliesstext nicht vor |
| Produktbezug | ein Titelwort (>= 5 Buchstaben, die ersten 5 zählen) muss im Text stehen |

Für den Fakten-Block (`saeubern`) gilt zusätzlich: Beschriftungen nur aus der Whitelist `LABELS` (Material, Verarbeitung, Zielgruppe, Farbe, Masse, Gewicht …),
Mass nur **mit Einheit**, «Verarbeitung» nur mit Verfahren (galvanisiert, poliert …), «Zielgruppe» nur Damen/Herren/Kinder/Unisex …; **kein Block, wenn nicht mindestens 3 Angaben belegt sind und davon 2 aus Daten/Lieferumfang** (`genug()`); ein Eintrag, dessen Sinn schon auf der Seite steht (>= 60 % der längeren Wörter), entfällt.
**Ausnahme `WISSEN`:** passen Titel/Kategorie auf `WISSEN` (Diamond Painting), steht der Block auch bei dünner Quelle, dann mit den fünf allgemeinen Schritten (`wissenFuer`, «So funktioniert Diamond Painting (allgemein)»). Die Schritte sind Handwerkswissen, keine CJ-Angabe, die Fusszeile («Angaben aus dem Datenblatt des Lieferanten») bleibt trotzdem stehen: Vorschau vor LIVE lesen. Der Fliesstext kennt `WISSEN` nicht.

## Fallen

1. **Dünne Quelle:** CJ-Daten sind oft dünn (Diamond Painting: Beschreibung `<p>1</p>`). Mehr Text als Quellfakten gibt es nicht ohne Erfinden. Dann: kürzerer ehrlicher Text oder gar keiner - **nie** auffüllen, nie die Mindestlänge mit Füllsätzen erkaufen. Das gilt für den Fliesstext; für den Tabellen-Block gilt die `WISSEN`-Ausnahme (siehe oben).
2. **Zahlen aus dem alten Text zählen als Quelle** (`alterText` steht in der Whitelist). Stammt eine Zahl nur von dort, Stichprobe gegen `cjQuelle` (der alte Text kann selbst Fehler tragen).
3. **Modelle erfinden Beschriftungen** («Verarbeitung: Ärmelstil: Ärmellos») → darum Whitelist statt Vertrauen. Kein Prompt ersetzt die Prüfung.
4. **Ein Mass ohne Einheit** («160x48») kann cm, mm oder Steine sein → verworfen. Ein Mass ohne Zahl («Volle Länge, Grössen S-XXL») ist keins: Grössen stehen in der Auswahl.
5. **Datenblatt widerspricht dem Titel** («Leinen-Set» aus Polyester, «Hundekuscheldecke» ist ein Pullover): Agent soll **melden, nicht schönschreiben** → Skill `titel-wahrheit` (Titel-Korrekturen laufen über `automation/titel_korrigieren.mjs`), danach Text neu. **Texte nie ohne Titel-Prüfung freigeben:** sonst folgt der Text dem Datenblatt, der Titel verspricht anderes. `text_eingabe.mjs` kennt **kein FORCE**: Produkte mit Marker werden nicht neu eingelesen («hat schon Text v2») - für eine Neufassung die Eingabedatei von Hand aus einer vorhandenen kopieren (LIVE setzt sie dann ohne Schlicht-Test, siehe Falle 8).
6. **Seiten, die `cj_varianten_nachziehen.mjs` angefasst hat**, beginnen mit `<!-- ls-var-v1 -->` (+ `<p><strong>Ausführung:</strong> …</p>`). `zerlege()` zählt genau diese Form seit 26.10.2026 zum Kopf (Commit 48b28b11f, 5 Tests in `text_prosa_test.mjs`): die Prosa wird gefunden, Marker und Hinweise bleiben beim Setzen erhalten. Vor dem Fix lehnte die Textlogik 49 von 220 fertigen Texten ab (`CLAUDE.md`, Commit; der Code-Kommentar nennt 48). Eine feste Reihenfolge Titel → Text → Auswahl ist dafür nicht nötig. **Grenzen** (gemessen 26.10.2026): der Marker wird nur am Seitenanfang erkannt; steht er woanders (z. B. hinter dem Lieferzeit-Kasten), gilt er als erster Kasten, die Prosa ist leer und `text_eingabe` meldet «Prosa nicht schlicht/leer». Ein fremdes Element zwischen Marker und Prosa gehört zur Prosa: `<div>` → «nicht schlicht» (übersprungen), ein fremdes `<p>` würde mit überschrieben.
7. **LISTE=datei.csv:** Semikolon-getrennt, Handle in Spalte 1, die erste Zeile wird immer als Kopfzeile verworfen - eine kopflose CSV (`/tmp/auswahl_kandidaten.csv`) verliert ein Produkt. Ohne HANDLES und ohne LISTE liest `text_eingabe` alle Handles aus `/tmp/cj_fakten_cache`; `LIMIT` (Vorgabe 120) begrenzt die Zahl guter Eingaben, das Fenster reicht von `START` bis `START`+3×`LIMIT` (bereits fertige Produkte zählen im Fenster mit, dann `START` erhöhen). Bei `cj_fakten_block.mjs` gilt `LIMIT` (Vorgabe 1000) ohne `START`.
8. Nicht schlichte Prosa (Tabelle, Bild, Link, `<div>`) wird **nie** überschrieben - das schützt Handarbeit; nicht umgehen. **Ausnahme: Seiten mit vorhandenem `ls-text-v2`-Block.** Dort ersetzt LIVE den Inhalt zwischen den Markern ohne Schlicht-Test (`text_anwenden.mjs`: Test nur bei `!markiert`); auch von Hand in den Block gesetzte Tabellen oder Links gehen verloren. Ein zweiter LIVE-Lauf über dieselben Ausgabedateien schreibt alles nochmals und hängt weitere Ledger-Zeilen an.
9. Marken- und Lizenznamen im Kundentext sind ein Kontosperr-Risiko (Merchant-Feed prüft Titel **und** Beschreibung) - `VERBOTEN` nicht lockern.
10. Modellwahl: Schreiben darf an Subagenten gehen, weil die Prüfung mechanisch ist (SETZUNG). Titel-Widersprüche, Rechtliches, Lieferbarkeit beurteilt das Hauptmodell.

## Gegenproben

- **Vor LIVE:** Trockenlauf von `text_anwenden.mjs` lesen - `/tmp/text_bericht/abgelehnt.txt` Zeile für Zeile, nicht nur die Zahl; dazu **5 abgenommene Texte ganz lesen** und gegen `cjQuelle` halten (Zahl, Material, Zielgruppe).
- **Titel zuerst:** vor LIVE sind die Titel der Stapel gegen das Datenblatt geprüft (Skill `titel-wahrheit`, Falle 5); ein gemeldeter `titelverdacht` ist erledigt, nicht nur notiert.
- **Gegenprobe in beide Richtungen** (am 26.10.2026 mit `prosaPruefen` nachgestellt und neu gemessen): ein Text mit erfundener Zahl («24 Karat») fällt, derselbe Text mit belegter Zahl besteht; «wasserfest» ohne Beleg fällt, mit «Waterproof: Yes» besteht; «ist wasserdicht» fällt in jedem Fall; «wasserdichte Schutzhülle» besteht nur mit Beleg.
- **Nach LIVE:** Seite frisch lesen (`descriptionHtml` enthält genau EINEN `<!-- ls-text-v2 -->`), live mit Cache-Buster abrufen, Kästen davor/danach vorhanden.
- **Zähler:** `GESCHRIEBEN` = Anzahl der Zeilen `text-v2 …` neu im Ledger (`grep -c "text-v2" dropship/kategorien_ledger.txt` vorher/nachher). `grep -c` zählt Zeilen, Wiederholungen zählen doppelt (gemessen 26.10.2026: 1458 Zeilen für 920 Handles); eindeutig: `grep text-v2 dropship/kategorien_ledger.txt | awk '{print $NF}' | sort -u | wc -l`.
- Änderung am Prüfcode → beide Selbsttests; eine Prüfregel ohne Test ist keine Regel (Mutation einbauen: Wortgrenze weg, Vergleich drehen - ein Test muss rot werden).
