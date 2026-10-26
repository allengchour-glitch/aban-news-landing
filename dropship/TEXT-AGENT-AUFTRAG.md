# Auftrag an die Text-Agenten (Produkt-Fliesstext) — Stand 26.10.2026

Dieses Dokument ist der Prompt, mit dem Agenten die Beschreibungen schreiben. Er stand bis 26.10. nur in einem Workflow-Skript und ging mit der Sitzung verloren.
Prüfung und Einsetzen laufen NICHT über den Agenten, sondern über `automation/text_pruefen_cli.mjs` und `automation/text_anwenden.mjs` (Regeln: `automation/lib/text_prosa.mjs`).

## Ablauf (Besitzer der Schritte)
1. `LIMIT=400 node automation/text_eingabe.mjs` → `/tmp/text_eingabe/<handle>.json` + `_stapel.json` (Haupt-Sitzung; nur Produkte mit CJ-Datenblatt im Zwischenspeicher, ohne Textblock v2).
2. Agenten schreiben `/tmp/text_ausgabe/<handle>.json` = `{"handle": "...", "html": "..."}` und prüfen sich selbst (`node automation/text_pruefen_cli.mjs <handle> …`).
3. Haupt-Sitzung: `node automation/text_anwenden.mjs` (Trockenlauf), dann `LIVE=1`. Abgelehnte Texte ändern nichts.

## Was der Agent bekommt
Je Produkt `/tmp/text_eingabe/<handle>.json`: `titel`, `preisCHF` (nur zum Verständnis, NIE im Text), `cjKategorie`, `optionen`, `alterText`, `faktenBlock`, `cjQuelle` (das englische Datenblatt des Lieferanten).
Der Agent darf NUR diese Datei und `automation/lib/text_prosa.mjs` lesen. Kein Shopify, kein Netz, nichts schreiben ausser `/tmp/text_ausgabe/`.

## Was geschrieben wird
Deutscher (Schweizer Schreibweise: **ss, nie ß**) Fliesstext, Ansprache **«du»**, warm und konkret wie eine gute Verkäuferin im Laden — keine Werbefloskeln, kein «Hochwertig», kein «Must-have».
- 2–3 Absätze `<p>`, dazwischen 1–2 Zwischenüberschriften `<h3>` (die Seite macht daraus `<h4>`); optional eine Liste `<ul><li>`.
- 450–3600 Zeichen, mindestens 5 Sätze, mindestens 2 `<p>`.
- Erlaubt sind nur `p, h3, ul, li, strong, em, br` — keine Attribute.
- Der Text nennt das Produkt (Wörter aus dem Titel), sagt wofür es gedacht ist, wie es aufgebaut ist (Material, Masse, Lieferumfang — nur, was im Datenblatt steht), was zur Auswahl steht (`optionen`) und worauf man beim Kauf achten sollte (Passform, Kompatibilität, Pflege) — ehrlich, auch Grenzen («Lithium-Batterien lädt es nicht»).
- Kauflust entsteht durch **Nutzen im Alltag und Genauigkeit**, nicht durch Superlative: eine konkrete Situation, ein konkretes Mass, ein konkreter Vorteil.

## Harte Regeln (die Prüfung lässt sonst nichts durch)
1. **Jede Zahl** (Masse, Gewicht, Leistung, Stückzahl, Spannung) muss in `cjQuelle`, `alterText`, `faktenBlock`, `titel` oder `optionen` stehen. Nichts runden, nichts umrechnen, nichts schätzen.
2. **Keine Marken** (auch nicht «Apple-kompatibel», «Samsung»), keine Preise (`CHF`, `€`, `$`), kein Versand/Lieferzeit/Rückgabe/Garantie (steht schon in den Kästen).
3. **Keine Wirkversprechen:** nichts Medizinisches, nichts mit «heilt», «therapeutisch», «klinisch», «garantiert», «bestes», «Testsieger», «100 %», «zertifiziert», «wasserdicht»/«wasserfest»/«IP..» — ausser das Datenblatt sagt es ausdrücklich so (`Waterproof: Yes`). Bei Zweifel weglassen.
4. **Kein Quellenverweis im Kundentext:** nie «laut Datenblatt», «Lieferant», «laut Angaben», «Herstellerangabe», «gehört zur Kategorie».
5. Wenn das Datenblatt dünn ist (z. B. nur ein Satz), schreibe **weniger, aber wahr** — lieber ein kürzerer Text, der besteht, als ein erfundener. Reicht die Substanz nicht für 450 Zeichen und 5 Sätze, schreibe keine Datei und melde das Produkt als «zu dünn».
6. Widerspricht der Titel dem Datenblatt (Titel sagt «Leder», Datenblatt «PU»; «Leinen» vs «Polyester»), schreibe nach dem **Datenblatt** und melde den Titel mit Handle und Widerspruch in `titelverdacht`.
7. Chinesische Zeichen, englische Rest-Wörter und Platzhalter («Lorem», «TBD», «N/A») gehören nicht in den Text.

## Rückgabe des Agenten (JSON)
`{"geschrieben": [handles], "zu_duenn": [handles], "titelverdacht": [{"handle","widerspruch"}], "durchgefallen": [{"handle","grund"}]}`
«durchgefallen» = nach höchstens zwei Überarbeitungen besteht der Text `text_pruefen_cli.mjs` immer noch nicht.
