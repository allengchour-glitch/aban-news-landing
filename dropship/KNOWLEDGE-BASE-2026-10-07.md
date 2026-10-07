# Knowledge Base (Agentic Storefronts) — Fakten gesetzt · 07.10.2026 20:15 UTC

Betreiber: «verbessere mehr, knowledge installiert».

## GEMESSEN
- Die App legte 10 Metaobjekte `shopify--knowledge-base-fact` an (Admin lesen/schreiben), **alle unveröffentlicht**, nur mit
  KI-Vorschlägen (`suggested_*`). Als Quelle nennt sie `/pages/ueber-uns`.
- Falsche oder unbelegte Vorschläge: «verzichtet auf Zwischenhändler» (wir sind Direktversand ab Lieferant), «Preise 50–70 %
  unter Boutiquen», «Schweizer Qualität», «Nachhaltigkeit», «Geschwindigkeit», «Direktbeschaffung»; **Gutscheine,
  Geschenkbelege, Geschenkverpackung = ja** — gemessen: 0 Geschenkkarten-Produkte, 0 ausgegebene Gutscheine,
  0 Geschenkverpackungs-Produkte; die Seite «Über uns» erwähnt nichts davon.
- 51'475 von 51'476 aktiven Produkten haben den Hersteller «LuxeStyle». 0 aktive gebrauchte/generalüberholte Artikel.

## GETAN
1. `automation/knowledge_base_fakten.py`: 10 Fakten mit Beleg gesetzt und veröffentlicht (Übersicht, Zielgruppe, Marke
   «LuxeStyle», 6 Werte aus «Über uns», Ästhetik, Startjahr 2026, Gutscheine/Geschenkbelege/Geschenkverpackung/gebraucht =
   nein). Rückgelesen 10/10. Ledger `dropship/_knowledge_base_fakten.tsv`.
2. Wächter `--wache` täglich im Aufseher: meldet NEUE Fakten der App (ungeprüft) und Abweichungen der belegten Werte.
   Stand jetzt: «10/10 Fakten belegt + veröffentlicht».
3. «Über uns» (Quelle der App und der KI-Assistenten): «Angaben … laufend automatisch geprüft» → «ein Automat gleicht
   Lagerbestand und Lieferbarkeit regelmässig mit dem Lieferanten ab» (stimmt: `cj_lager_abgleich.py` stündlich);
   «Premium-Qualität» → «Echte Bewertungen». Genau diese Art Prüf- und Qualitätsversprechen hatte Microsoft am 01.10. als
   irreführend abgelehnt. Backup `dropship/_ueber_uns_backup_2026-10-07.html`.

## REGEL
Die KI-Vorschläge der App sind Annahmen, keine Fakten. Veröffentlicht wird nur, was am Shop gemessen oder in einer Richtlinie
steht. Wenn die App neue Fakten anlegt, meldet die Wache sie. Nicht blind übernehmen.
