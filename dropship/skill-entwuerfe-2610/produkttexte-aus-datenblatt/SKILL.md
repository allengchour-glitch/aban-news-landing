---
name: produkttexte-aus-datenblatt
description: Immer wenn Produktseiten von LuxeStyle längere, schönere oder vollständigere Beschreibungen bekommen sollen ("zu wenig Text", "CJ-Texte nutzen", Fliesstext, Technische Daten, Lieferumfang) - und vor jedem Lauf von cj_fakten_block.mjs, text_eingabe.mjs, text_pruefen_cli.mjs oder text_anwenden.mjs. Beschreibt die Kette CJ-Datenblatt -> Eingabedatei -> Agenten schreiben -> mechanische Prüfung -> setzen, die exakten Befehle und Schalter, jede Prüfregel von prosaPruefen, die Grenzen dünner CJ-Daten und die Gegenproben.
---

# Produkttexte aus dem CJ-Datenblatt: Agenten schreiben, Code prüft, Code setzt

**Grundsatz:** Mehr Text hilft nur, wenn er stimmt. Ein Agent darf **übersetzen, ordnen, ausformulieren - nicht ergänzen**.
Ob er sich daran gehalten hat, entscheidet **nicht das Modell**, sondern `lib/text_prosa.mjs → prosaPruefen()` und `lib/fakten_block.mjs`.
**Werkzeuge** (`automation/`, Node `/opt/node22/bin/node`, Trockenlauf ist Vorgabe): `cj_fakten_block.mjs` (Tabelle) · `text_eingabe.mjs` · `text_pruefen_cli.mjs` · `text_anwenden.mjs` (Fliesstext).
**Selbsttest** (26.10.2026 grün): `node automation/lib/fakten_block_test.mjs` (52) · `node automation/lib/text_prosa_test.mjs` (33).
**Zugang:** `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`; CJ: `CJ_EMAIL`, `CJ_API_KEY`; Modell für den Fakten-Block: `GEMINI_API_KEY`, sonst `GROQ_API_KEY`.
Marken: **GEMESSEN** · **SETZUNG** · alles andere steht im Code.

## Wann einsetzen

- User-Aussagen «Texte zu lasch / zu knapp», «CJ-Texte auch bei Produkten, ist doch nicht schwierig».
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

Das Setzen ersetzt nur den Block zwischen `<!-- ls-text-v2 -->` und `<!-- /ls-text-v2 -->` (`prosaEinsetzen`): Lieferzeit-/«Ohne Risiko»-Kasten davor und alle Kästen danach bleiben.
Überschriften `<h3>` werden zu `<h4>` (das Theme setzt `<h3>` deutlich grösser als die Tabelle darunter). Je Produkt ein Ledger-Eintrag `text-v2 <handle>` in `dropship/kategorien_ledger.txt`.
LIVE liest die Seite **frisch** und lehnt ab, wenn sie nicht ACTIVE ist oder die Prosa inzwischen nicht mehr schlicht ist (Tabelle, Bild, `<div>`, Link …).
Beleg aus dem Lauf vom 26.10.: 313 geschrieben, 0 abgelehnt, 2 Fehler «Prosa inzwischen nicht mehr schlicht» (Seite hatte sich zwischen Eingabe und Setzen geändert) - kein Grund zum Jagen.

## Was `prosaPruefen` verlangt (das ist der Auftrag an die Agenten - eins zu eins weitergeben)

| Regel | Wert |
|---|---|
| Tags | nur `p h3 ul li strong em br`, **keine Attribute** |
| Länge | 450-3600 Zeichen reiner Text · mindestens 2 `<p>` · mindestens 5 Sätze |
| Zahlen | **jede** Zahl im Text (auch `2` aus «2-in-1») muss in `cjQuelle`, `alterText`, `faktenBlock`, `titel` oder den Optionen stehen |
| Behauptungswörter | garantiert, beste/bestes, testsieger, nummer 1, 100 %, medizinisch, heilt/heilung/heilen, therap-, schmerzfrei, wissenschaftlich, klinisch, dermatologisch, zertifiziert, original, wasserdicht, wasserfest, spritzwassergeschützt, IPxx: **nur** mit gleichem Wort im **CJ**-Datenblatt (der alte Seitentext zählt nicht) |
| Verboten immer | Marken/Lizenzen (`VERBOTEN` in `lib/fakten_block.mjs`: Disney, Nike, iPhone, Samsung …), `bestseller`, `garantiert`, **`wasserdicht`** (auch mit Beleg; stattdessen «wasserfest» - belegt durch «Waterproof: Yes», `IPX7`, `3 ATM`; «Waterproof: no» belegt nichts) |
| Schreibweise | kein `ß`, keine chinesischen Zeichen, keine Preise (`CHF`, `Fr.`, `€`, `$`) |
| Keine Quellenverweise | «Datenblatt», «Lieferant», «laut Angaben/Quelle/Hersteller» |
| Keine Verwaltungssprache | «gehört zur Kategorie», «ausgewiesen» |
| Keine Dopplung mit den Kästen | die Wörter Lieferzeit, Versand, Rückgabe, Garantie kommen im Fliesstext nicht vor |
| Produktbezug | ein Titelwort (>= 5 Buchstaben, die ersten 5 zählen) muss im Text stehen |

Für den Fakten-Block (`saeubern`) gilt zusätzlich: Beschriftungen nur aus der Whitelist `LABELS` (Material, Verarbeitung, Zielgruppe, Farbe, Masse, Gewicht …),
Mass nur **mit Einheit**, «Verarbeitung» nur mit Verfahren (galvanisiert, poliert …), «Zielgruppe» nur Damen/Herren/Kinder/Unisex …; **kein Block, wenn nicht mindestens 3 Angaben belegt sind und davon 2 aus Daten/Lieferumfang** (`genug()`); ein Eintrag, dessen Sinn schon auf der Seite steht (>= 60 % der längeren Wörter), entfällt.

## Fallen

1. **Dünne Quelle:** CJ-Daten sind oft dünn (Diamond Painting: Beschreibung `<p>1</p>`). Mehr Text als Quellfakten gibt es nicht ohne Erfinden. Dann: kürzerer ehrlicher Text oder gar keiner - **nie** auffüllen, nie die Mindestlänge mit Füllsätzen erkaufen.
2. **Zahlen aus dem alten Text zählen als Quelle** (`alterText` steht in der Whitelist). Stammt eine Zahl nur von dort, Stichprobe gegen `cjQuelle` (der alte Text kann selbst Fehler tragen).
3. **Modelle erfinden Beschriftungen** («Verarbeitung: Ärmelstil: Ärmellos») → darum Whitelist statt Vertrauen. Kein Prompt ersetzt die Prüfung.
4. **Ein Mass ohne Einheit** («160x48») kann cm, mm oder Steine sein → verworfen. Ein Mass ohne Zahl («Volle Länge, Grössen S-XXL») ist keins: Grössen stehen in der Auswahl.
5. **Datenblatt widerspricht dem Titel** («Leinen-Set» aus Polyester, «Hundekuscheldecke» ist ein Pullover): Agent soll **melden, nicht schönschreiben** → Skill `titel-wahrheit`, danach Text neu. `text_eingabe.mjs` kennt **kein FORCE**: Produkte mit Marker werden nicht neu eingelesen («hat schon Text v2») - für eine Neufassung die Eingabedatei von Hand aus einer vorhandenen kopieren.
6. **Seiten, die `cj_varianten_nachziehen.mjs` angefasst hat**, beginnen mit `<!-- ls-var-v1 -->`: `zerlege()` liefert dann leere Prosa → `text_eingabe` überspringt sie (GEMESSEN 26.10.2026 an nachgebauter Seite). Reihenfolge: **Titel → Text → Auswahl**, oder `zerlege()` mit Test anpassen.
7. **LISTE=datei.csv** wirft die erste Zeile immer weg (Kopfzeile erwartet) - kopflose CSV (`/tmp/auswahl_kandidaten.csv`) verliert ein Produkt.
8. Nicht schlichte Prosa (Tabelle, Bild, Link, `<div>`) wird **nie** überschrieben - das schützt Handarbeit; nicht umgehen.
9. Marken- und Lizenznamen im Kundentext sind ein Kontosperr-Risiko (Merchant-Feed prüft Titel **und** Beschreibung) - `VERBOTEN` nicht lockern.
10. Modellwahl: Schreiben darf an Subagenten gehen, weil die Prüfung mechanisch ist (SETZUNG). Titel-Widersprüche, Rechtliches, Lieferbarkeit beurteilt das Hauptmodell.

## Gegenproben

- **Vor LIVE:** Trockenlauf von `text_anwenden.mjs` lesen - `/tmp/text_bericht/abgelehnt.txt` Zeile für Zeile, nicht nur die Zahl; dazu **5 abgenommene Texte ganz lesen** und gegen `cjQuelle` halten (Zahl, Material, Zielgruppe).
- **Gegenprobe in beide Richtungen** (am 26.10.2026 mit `prosaPruefen` nachgestellt): ein Text mit erfundener Zahl («24 Karat») fällt, derselbe Text mit belegter Zahl besteht; «wasserfest» ohne Beleg fällt, mit «Waterproof: Yes» besteht; «wasserdicht» fällt in jedem Fall.
- **Nach LIVE:** Seite frisch lesen (`descriptionHtml` enthält genau EINEN `<!-- ls-text-v2 -->`), live mit Cache-Buster abrufen, Kästen davor/danach vorhanden.
- **Zähler:** `GESCHRIEBEN` = Anzahl der Zeilen `text-v2 …` neu im Ledger (`grep -c "text-v2" dropship/kategorien_ledger.txt` vorher/nachher).
- Änderung am Prüfcode → beide Selbsttests; eine Prüfregel ohne Test ist keine Regel (Mutation einbauen: Wortgrenze weg, Vergleich drehen - ein Test muss rot werden).
