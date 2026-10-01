# Tages-Update: KI-News und Märkte auf der Startseite

Ein einziger täglicher Lauf (`.github/workflows/tages-update.yml`, 04:15 UTC) hält die zwei
Blöcke der Startseite aktuell, die sich täglich ändern sollen.

## KI-News heute

`automation/ki_news_heute.py` schreibt `data/ki-news.json`. Die Startseite zeigt daraus den
Block „KI-News aus N Quellen".

- Quellen und KI-Filter kommen aus `automation/news_aggregator.py` (OpenAI, Google AI,
  Hugging Face, TechCrunch, MIT Technology Review, heise, Golem, t3n, netzpolitik.org).
- Nur Meldungen der letzten 72 Stunden, neueste zuerst, höchstens 2 pro Quelle, 10 insgesamt.
- Titel und Anriss stehen so da, wie die Quelle sie veröffentlicht. Nichts wird von einer KI
  umgeschrieben oder zusammengefasst. Englische Artikel tragen ein „EN".
- Kommen weniger als 3 Meldungen zusammen, bleibt die alte Datei stehen.
- Ist der Stand älter als 36 Stunden, sagt der Block „Stand …" statt „Heute" und meldet,
  dass die Aktualisierung ausgefallen ist.

## Übungsdepot (Spielgeld)

`tools/trading/papier_depot.py` → `data/papierdepot.json`, Anzeige auf `trading-lernen.html`.
Der Lern-Bot entscheidet jeden Morgen pro Markt (investiert oder Cash) und wird mit dem nächsten
Schlusskurs abgerechnet. Nichts wird rückwirkend eingetragen. Vorher läuft `--pruefen`: im Rückblick
muss er rund 50 % treffen, eine Variante mit Blick in die Zukunft 100 %, sonst schreibt der Lauf nichts.
Kein echtes Geld, keine Broker-Anbindung. Märkte: S&P 500, SMI, Nestlé, Bitcoin, EUR/CHF, Gold,
Silber, Öl (WTI).

**Daytrading-Buch** (`daten["daytrading"]`, Gold/Silber/Öl/S&P-Future/Bitcoin, Stundenkerzen):
jeden Morgen wird pro Markt eine Tagesregel eingefroren (`einfrierungen`, `ab` = morgen). Jede
abgeschlossene Sitzung wird mit der jüngsten Einfrierung gehandelt, deren `ab` nicht nach ihr liegt.
Einfrierungen werden nur angehängt, nie überschrieben. (Erste Fassung überschrieb `gilt_ab` bei jedem
Lauf — damit rückte die Regel jedes Mal hinter die Sitzung, die sie handeln sollte, und es wurde nie
gebucht. Die Gegenprobe fand es: 0 Trades.) Stundenkerzen liegen nicht im Repo (`h_*.json`, ~3 MB),
das Skript holt fehlende Caches selbst. Rückblick-Test: `python3 tools/trading/daytrading.py`
→ `reports/DAYTRADING.md`.

**Stil-Vorwärtstest** (`daten["stil_vorwaerts"]`, ab 25.09.): die neun Stile aus `tools/trading/stil_labor.py`
auf allen acht Märkten, je CHF 10'000, Signal am Schluss, gehandelt am Folgetag, 0.1 % pro Wechsel. Der Skill
aus dem Rückblick steht unter `vorab` — festgehalten, bevor ein Vorwärtstag zählte. `daten["verlauf"]` hält
pro Tag Bot, Halten und Daytrading für die Kurve auf der Seite.

**Sperre gegen veraltete Kurse:** Liegt der letzte Kurs VOR der letzten Entscheidung (Cache/Quelle hinkt),
bucht der Lauf nichts und entscheidet nicht neu. Vorher hätte er für einen vergangenen Tag neu entschieden
und erneut Kosten abgezogen (lokal mit altem Cache nachgestellt: CHF 80'139 → 80'119).

## Märkte

Der Lauf ruft `markets-build.yml` auf (Kurse, Finanz-News, optional KI-Sentiment mit
Gemini-Schlüssel). Der Märkte-Block heisst nur dann „Live", wenn die Daten höchstens 2 Tage
alt sind, sonst „Stand <Datum>". Vorher standen Kurse vom 12.06. im September unter „Live".

## Behobene Fehler im gemeinsamen Feed-Leser

- Golem liefert ISO-8859-1. Der Leser dekodierte fest als UTF-8 und verschluckte jeden
  Umlaut („Probleme lsen"). Jetzt gilt der Zeichensatz aus HTTP-Kopf oder XML-Deklaration.
- Google AI liefert HTML-Tags zusätzlich escaped. Der Anriss begann mit `<img src="`.
  Tags werden jetzt auch nach dem Entschlüsseln entfernt.

Beides betraf auch das Newsletter-Rohmaterial (`news_aggregator.py`).

## Nicht erreichbar (Stand 2026-09-23)

VentureBeat (SSL-Fehler) und BSI (404). Der Lauf überspringt sie und nennt sie in
`nicht_erreichbar`.

## Prüfen

```bash
python3 automation/ki_news_heute.py --dry   # zeigt die Auswahl, schreibt nichts
node tools/test_ki_news.mjs                 # Browser: frisch, veraltet, leer (10 Prüfungen)
```

Live wird das erst mit dem nächsten Deploy von `main`.
