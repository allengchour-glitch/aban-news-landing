# Kaufhilfen für Sammlungen, auf die ChatGPT Besucher schickt (11.11.2026)

**Auftrag:** Besitzer 11.11.2026 «kannst du webseite verbessern? … mache mal etwas fertig» und, auf die gezielte Frage zu dieser Änderung, «Kaufhilfen einspielen» mit dem Zusatz «alle ohne zu fragen».

## Messung vorher (GEMESSEN 11.11.2026, ShopifyQL, 14 Tage, `utm_source = 'chatgpt.com'`, nach Einstiegsseite)

ChatGPT schickt Besucher breit gestreut auf Produkt- und Sammlungsseiten (Startseite 18 Sitzungen, sonst je 2 bis 6). Die Produktseiten sind gesund (ACTIVE, kaufbar, Text vorhanden). Elf der angesteuerten Sammlungen hatten aber nur 4 bis 15 Wörter Einleitung:

`punk-gothic-schmuck`, `damen-jacken-kunstfell`, `uhren-herren`, `zirkonia-moissanit-ketten`, `tier-pullover`, `personalisierte-ringe`, `personalisierte-ketten`, `kochutensilien-sets`, `haltungsgurte-ruecken`, `armreifen-bangles`, `creolen-ohrclips`.

## Was geändert wird

Nur die Einleitung (`descriptionHtml`) dieser Sammlungen: zwei Absätze, 80 bis 140 Wörter, der zweite beginnt mit «So wählst du:». SEO-Titel, SEO-Beschreibung, Produkte, Sortierung und ein Markierungsblock am Ende (`<!-- ls-verwandt -->`, `<!-- gd2 -->`) bleiben.

**Regel:** Der Text nennt nur Arten, Materialien, Formen und Merkmale, die die aktiven Produkte der Sammlung belegen. Jede Aussage hat ein Suchmuster und eine Mindestzahl; `apply.py` zählt jedes Muster beim Lauf frisch gegen alle aktiven Produkte und schreibt eine Sammlung nur, wenn alle Belege erreicht sind. Verboten sind Preise, Rabatte, Lieferzeiten, Weihnachts- und Bestellschluss-Aussagen, Superlative, Wirkungs-, Gesundheits- und Sicherheitsaussagen (bei Haltungsgurten nur Bauarten, Grössen, Materialien), Echtheitsaussagen über Edelmetalle und Steine, «wasserdicht», Echtleder, andere HTML-Elemente als `<p>` und `<strong>`.

## Wie die Texte entstanden

Je Sammlung drei unabhängige Schritte (Workflow, nur lesend): Schreiben mit Belegliste und eigener Zählung, Prüfen durch einen zweiten Leser (eigene Zählung, Treffer-Titel ansehen, Satz für Satz), Nachbessern. Danach `sammeln.py` (baut `texte.json` aus den Einträgen) und `apply.py`.

## Werkzeug

```
python3 dropship/chatgpt-seiten-1111/apply.py --selbsttest     # 20 Prüfungen ohne Netz
python3 dropship/chatgpt-seiten-1111/apply.py                  # Trockenlauf: Plan und Belegzählung
LIVE=1 python3 dropship/chatgpt-seiten-1111/apply.py           # schreibt, Sicherung sicherung.json, frisches Rücklesen
ZURUECK=1 LIVE=1 python3 dropship/chatgpt-seiten-1111/apply.py # schreibt die Sicherung zurück
NUR=handle1,handle2 …                                          # nur diese Sammlungen
```

`apply.py` nutzt `woerter`, `marker_teil`, `neues_html`, `zaehle_belege`, `lade` aus `dropship/ranking-0911/apply_einleitungen.py` und den Zugang aus `apply_fristen.py` (Client-Credentials). Es schreibt nur, wenn der heutige Text (ohne Markierungsblock) dem erwarteten alten Text entspricht; sonst «ABWEICHUNG» und die Sammlung bleibt unberührt. Exit 1 = mindestens eine Sammlung übersprungen, Exit 2 = Abweichung beim Rücklesen.

## Ergebnis (LIVE 11.11.2026 11:26 UTC)

Elf von elf Sammlungen geschrieben, je frisch zurückgelesen: GLEICH. Vorher hatten sie 4 bis 15 Wörter, jetzt 117 bis 139. Alle Belege beim Lauf erreicht (Selbsttest 20 von 20). Storefront geprüft (HTTP 200, neuer Text sichtbar, 0 Liquid-Fehler) an `punk-gothic-schmuck` und `haltungsgurte-ruecken`.

**Prüfung der Texte:** je Sammlung ein Schreiber, ein unabhängiger Prüfer und eine Nachbesserung. Die Prüfer meldeten einen Blocker (`personalisierte-ketten`: der Text schickte Kundinnen auf einen Bestellweg mit eigenem Namen oder Gravurtext, den kein Produkt anbietet), sieben wichtige Funde (u. a. Zirkon gegen Zirkonia, Grössenhilfe bei Armreifen nach Durchmesser statt Handgelenk, «Ohrclip» heisst hier nicht automatisch ohne Ohrloch) und 71 kleine; alle eingearbeitet. Danach von Claude gelesen und zwei Stellen selbst geändert: bei `personalisierte-ringe` entfiel «Frag vor der Bestellung nach, ob ein Ring deinen eigenen Text oder Namen bekommen kann» (kein Produkt hat ein Eingabefeld), bei `armreifen-bangles` steht Zirkonia jetzt «laut Artikelangabe».

**Rücknahme:** `ZURUECK=1 LIVE=1 python3 dropship/chatgpt-seiten-1111/apply.py` (schreibt die Texte aus `sicherung.json` zurück, nur wenn der heutige Text noch der eingespielte ist).

**Ungemessen:** Wirkung auf ChatGPT-Besuche, Verweildauer und Käufe. Nachmessen mit derselben ShopifyQL-Abfrage (`utm_source = 'chatgpt.com'`, nach Einstiegsseite) am Mo 25.11.

**Offen, nicht Teil dieser Änderung (Funde der Schreiber):** Fremdkörper und unpassende Titel in den Sammlungen, z. B. «Halskette im Hip-Hop-Stil» ist laut Optionen ein Armband, «Personalisiert» im Titel ohne Personalisierungsoption (mehrere Ring- und Kettenprodukte), englische Reste und Lieferantencodes in Optionswerten («Necklace 45cm», «Schwarztotenkopf KB125348 BDJX»), ein Uhren-Set und eine Taillenkette in `punk-gothic-schmuck`.
