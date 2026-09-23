# Such-Wächter: findet die Suche, was Leute tippen?

`tools/such_qualitaet.mjs` misst die Seitensuche (`suchmaschine.html`) an Alltags-Anfragen
statt an Seitentiteln: „zügeln", „natel", „was bleibt vom lohn", „kündigungsschreiben".
Das Skript führt das unveränderte Such-Skript der Seite in Node aus, ohne Browser. Getestet
wird also genau der Code, der live läuft.

## Die zwei Anfrage-Sets

- `tools/such_fragen.json` — 116 Anfragen. An diesem Set wurde die Suche verbessert.
- `tools/such_fragen_kontrolle.json` — 32 Anfragen zu 40 zufällig gezogenen Seiten,
  geschrieben, bevor die Treffer bekannt waren. Es zeigt, ob eine Verbesserung
  verallgemeinert oder nur die bekannten Fälle abdeckt.

Bestanden heisst: eine der erwarteten Seiten steht unter den ersten 3 Treffern.

## Aufruf

```bash
node tools/such_qualitaet.mjs                                              # Haupt-Set
node tools/such_qualitaet.mjs --datei tools/such_fragen_kontrolle.json     # Kontroll-Set
node tools/such_qualitaet.mjs --seite alte-version.html                    # Vorher/Nachher
node tools/test_suche.mjs                                                  # echter Browser
```

## Automatisch

`.github/workflows/suche-check.yml` läuft bei jeder Änderung an Suche, Index oder
Generator (kein Cron). Er prüft:

1. `tools/build_suche_sprachen.py` läuft durch. Dieser Generator brach am 04.09. ab, und
   `build-pages.sh` überging den Fehler; en/fr/it hatten drei Wochen keine Vertipper-Korrektur.
2. Die eingecheckten Suchseiten für en/fr/it entsprechen dem Generator.
3. Beide Sets erreichen mindestens 95 %, gemessen gegen einen frisch gebauten Index.

## Stand 2026-09-23

| | Haupt-Set | Kontroll-Set |
|---|---|---|
| alte Suche | 80 % | 69 % |
| neue Suche | 100 % | 84 % beim ersten, ungesehenen Lauf |

Nach drei Wortschatz-Ergänzungen steht das Kontroll-Set bei 97 %. Das ist aber kein
ungesehener Wert mehr.

Bekannte Lücke: „japan aktien" findet die Nikkei-Seite nicht, weil sie Japan nirgends
nennt. Das ist eine Inhalts-Lücke, keine Such-Lücke, und wird bewusst nicht per Synonym
überdeckt.

## Erweitern

Neue Zeile in einem der Sets: `["so tippt man", ["/erwartete-seite.html"]]`. Das Skript
bricht ab, wenn die erwartete Seite nicht im Index steht.

Reihenfolge: zuerst die Anfrage aufschreiben, danach nachsehen, was die Suche liefert.
Wer umgekehrt vorgeht, testet nur, was er schon weiss.

Neue Alltagswörter und Füllwörter stehen in `suchmaschine.html` in `ALLTAG` und `STOP`.
Beide Listen gelten nur für Deutsch; die Sprachseiten setzen `DE=false`.

## Angebote-Suche (Produkte)

`js/angebote-plus.js` macht aus der eBay-Trefferliste auf `angebote-suche.html` und den 14
`*-angebote.html` eine Produktsuche für die Schweiz:

- Schweizer Wörter, die ebay.de nicht kennt, werden übersetzt („velo" → „fahrrad"). Die Seite
  sagt das offen. Bei „velo" waren vorher 2 von 50 Treffern Velos, nach der Übersetzung 12 von 50.
- Das gesuchte Ding kommt zuerst, Zubehör in einen eigenen Block darunter. Regeln: „für X" im
  Titel, Kompositum mit Zubehör-Kopf („Sofa|kissen"), Zubehör-Wörter nur vor „mit/inkl./+",
  Preis-Ausreisser unter 20 % des typischen Preises.
- Preis in CHF zum Tageskurs der EZB (frankfurter.dev), Herkunft je Angebot und der Hinweis
  auf Einfuhr-MwSt. und Zollgebühr.
- Typischer Preis nur, wenn die Preise beieinander liegen (Quartile höchstens Faktor 4).
  Sonst zeigt die Seite keinen typischen Preis.
- Passender Kaufberater aus `data/kaufberater-index.json` (erzeugt von `build_search_index.py`).

Messung: `node tools/angebote_qualitaet.mjs` gegen 16 Suchen × 50 echte Treffer, von Hand
gelabelt (`tools/fixtures/`). Stand 2026-09-23, echte Produkte unter den ersten 6:

| Gruppe | eBay-Reihenfolge | neu |
|---|---|---|
| Entwicklung (7) | 90 % | 98 % |
| Zurückgehalten (4, in der Fehleranalyse gesehen) | 92 % | 100 % |
| Neu (4, nach dem Tuning geholt) | 88 % | 92 % |

Echte Produkte, die fälschlich nach hinten rutschen: 3 %. Erkanntes Zubehör: 56 %. Die
Schwäche liegt beim Fahrrad-Zubehör (Lampen, Ständer, Schläuche).

Browser-Test: `node tools/test_angebote.mjs` (25 Prüfungen, auch „läuft ohne das Modul weiter").
