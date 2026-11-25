# Englische Lieferanten-Variantenwerte — Bericht

> Werkzeug: `automation/variant_value_clean.py` (täglich im Aufseher). Durchgang seit 2026-11-25 15:45 UTC, Stand 2026-11-25 15:47 UTC — **läuft noch (Zahlen sind Zwischenstand)**.

> Übersetzt wird nur, wenn JEDES Wort eines Werts bekannt ist (farben_de.json, Farbkomposition, Begriffstabellen im Skript). Alles andere bleibt stehen und erscheint unten. Jede Umbenennung steht Wert für Wert in `dropship/_variant_value_clean_en.txt` (alt → neu, rückgängig machbar).

## Zahlen

- Produkte gesehen: **623**
- Optionen mit englischen Werten (Kandidaten): 11
- Optionen übersetzt: **1** · Werte übersetzt: **1**
- Optionen nur codebereinigt: 0
- Werte mit unbekanntem Wort (unverändert): 62
- Fehler Shopify: 0 · Rückgelesen abweichend: 0

## A · NUR MELDEN — Kleidungsstück als «Farbe» (Wahl bestellt evtl. eine andere Ware)

> Zwei verschiedene Kleidungsstücke in EINER Option, oder ein Kleidungsstück, das nicht zum Titel passt. Beispiel Jeansjacke: «Blue Coat» / «Blue Pants» — die zweite «Farbe» ist eine Hose. Entscheid am Bild und Preis: Option umbenennen (z. B. «Artikel»: Jacke/Hose) oder Variante entfernen.

_keine_


## B · Kollision nach Übersetzung (nicht geschrieben)

> Die Übersetzung ergäbe zwei gleichlautende Werte (meist «Blue» neben «Blau»). Zusammenlegen ist Sache von `farbwert_dubletten.py` bzw. eines Menschen.

_keine_


## C · Besuchte Seiten: Werte, die stehen blieben (unbekanntes Wort)

- 10 Sitzungen · `15449407783297` selbstreinigende-haarburste-894400 [Farbe]: Elegant Weiss | Elegant Weiss 2 Stk
- 3 Sitzungen · `15450839122305` kristall-tischlampe-mit-touch-funktion-775808 [Ausführung]: Transparent-Plugin models three colors-USB | Transparent-Charging touch 3colors-USB | Transparent-Plugin models 16colors-USB | Amber-Plugin models three colors-USB | Amber-Charging touch 3colors-USB | Amber-Plugin models 16colors-USB
- 2 Sitzungen · `15414490399105` oversized-sonnenbrille-street-getont-square-style-3-farben [Farbe]: Transparent-Tea
- 1 Sitzungen · `16615704756615` stickbild-set-fur-fotorahmen-blumenmuster-629900 [Grösse]: 25x25cm Without Stamp Pin | 25x25cm Including Stamp Pin
- 1 Sitzungen · `15523179004289` manueller-dosen-und-flaschenoffner-615500 [Menge]: 1er-Pack | 2er-Pack
- 1 Sitzungen · `15509183562113` leinenhemd-fur-herren-im-chinesischen-stil-624000 [Farbe]: Optic Linen
- 1 Sitzungen · `15472047456641` herzring-aus-titanstahl-mit-zirkonia-617300 [Farbe]: Gold Powder Drill-6 | Gold Powder Drill-7 | Gold Powder Drill-8 | Gold Powder Drill-9 | Golden White Diamond-6 | Golden White Diamond-7
- 1 Sitzungen · `15483934900609` beruhigendes-kuscheltier-608200 [Ausführung]: New Breathing Rabbit | 4speed breathing elephant
- 1 Sitzungen · `15495106363777` mesh-haartrockenhaube-fur-locken-627900 [Modell]: Rosa Pure White Hut | Schwarz Pure White Hut | Silber Pure White Hut
- 1 Sitzungen · `15509389246849` dekorativer-wandfacher-aus-bambus-626500 [Grösse]: 75x150cm Gradient powder

## D · Besuchte Seiten mit «Set 1 / Set 2 …» ohne Inhaltsangabe (nur melden)

> Die Nummer unterscheidet die Pakete, sagt aber nicht, was drin ist. Das steht nur beim Lieferanten (Variantenbild/Preis) — umbenennen z. B. in «Set 1: Rasierer + 2 Köpfe».

- 10 Sitzungen · `15449407783297` selbstreinigende-haarburste-894400 [Farbe]: Weiss, gepresste Haarentfernung | Schwarzgold | Elegant Weiss | Schwarzlila | Schwarz-Gold Set | Set · Weiss | Schwarz-Lila Set | Rosenrot, gepresste Haarentfernung

## E · Häufigste unbekannte Wörter (daraus wächst die Tabelle — nur mit EINER Lesart aufnehmen)

`diamond` 36, `powder` 5, `plugin` 4, `models` 4, `drill` 4, `hut` 3, `elegant` 2, `three` 2, `touch` 2, `modelle` 2, `pin` 2, `breathing` 2, `stk` 1, `drei` 1, `tea` 1, `including` 1, `1er` 1, `2er` 1, `optic` 1, `rabbit` 1, `elephant` 1

