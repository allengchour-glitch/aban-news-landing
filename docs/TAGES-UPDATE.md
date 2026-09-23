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
