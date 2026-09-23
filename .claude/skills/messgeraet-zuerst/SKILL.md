---
name: messgeraet-zuerst
description: Vor jeder Aufgabe, die "besser", "schöner", "eleganter", "cooler", "nicht so KI-generiert", "aufräumen" oder "optimieren" verlangt - und vor jeder Änderung, deren Erfolg man nur nach Gefühl beurteilen könnte. Baut zuerst ein Messgerät mit Gegenprobe, misst vorher, ändert, misst nachher. Auch bei Behauptungen aus dem Gedächtnis ("X ist kaputt", "es gibt keine Y"), die man messen statt glauben kann.
---

# Messgerät zuerst — nie nach Gefühl ändern

Dieses Repo hat drei Mal teuer gelernt: **wer ohne Messgerät ändert, meldet Erfolg, den es
nicht gibt.** Die Reihenfolge ist nicht verhandelbar.

## Die fünf Schritte

1. **Messgerät bauen.** Ein kleines Skript in `tools/`, das die Sache in einer Zahl ausdrückt.
   Beispiele im Repo: `tools/ki_look.py` (Bestandszählung), `tools/kopfleiste.mjs`
   (Durchschlag), `tools/produktdichte.mjs` (Spalten/Bildgrösse/Seitenhöhe),
   `spiele-dev/tools/th-handschrift.py` (Verläufe, Emoji, HUD).
2. **Gegenprobe in das Messgerät einbauen.** Das Gerät muss an einem künstlich verschlechterten
   Fall **ausschlagen**. Ohne diesen Selbsttest ist eine 0 kein Befund, sondern ein Verdacht.
3. **Vorher messen** und die Zahl aufschreiben.
4. **Ändern** — so chirurgisch wie möglich.
5. **Nachher messen** und beide Zahlen nennen. Ohne Vorher/Nachher gibt es keine Meldung.

## Warum die Gegenprobe (Schritt 2) Pflicht ist

`tools/kopfleiste.mjs` meldete auf 54 Seiten überall **0,00** Durchschlag — Ergebnis sah fehlerfrei
aus. Die eingebaute Gegenprobe (eine künstlich halbtransparente Leiste MUSS ausschlagen) entlarvte
das Gerät: `page.screenshot({clip})` rechnet in **Dokument**-, nicht in Bildschirmkoordinaten, der
Ausschnitt lag also weit unterhalb der Leiste. Ohne Selbsttest wäre "alles sauber" gemeldet worden,
während der Fehler unverändert live stand.

## Ein Messgerät, das Bauteile als Fehler zählt, treibt in die falsche Richtung

Nach der Radien-Leiter stieg die Kennzahl "Kästen ≥ 14 px" von 4119 auf 9591 — weil 14 px die
**gewählte** Sprosse ist. "Auf einen Blick" (433 Treffer) ist das **Label** des Antwort-Kastens,
keine Floskel. Beide Kennzahlen waren falsch definiert und mussten korrigiert werden.

→ **Prüfe vor dem Messen: zählt das Gerät Fehler, oder zählt es Absicht?** Wenn eine Kennzahl
durch eine gewollte Entscheidung steigt, ist die Kennzahl kaputt, nicht die Entscheidung.

## Behauptungen messen statt glauben

Im Gedächtnis stand als Tatsache: "CJ hat keine Reviews, listLen=0 ist eine echte 0, kein Bug."
Eine Messung mit gültigen Zugangsdaten widerlegte das: 13 von 60 Produkten hatten Kommentare,
198 davon ≥ 4★. Ursache war ein Feldname im eigenen Importer (`apiKey` statt `password`). Eine
falsche "Decke" im Gedächtnis hat monatelang den billigsten Conversion-Hebel blockiert.

→ **Jede "das geht nicht"-Aussage im Gedächtnis ist eine Hypothese mit Datum, kein Naturgesetz.**
Bevor du darauf aufbaust: einmal messen.

## Die Gegenprobe läuft gegen eine Kopie an einem anderen Pfad

Beim Bau der vier Gedächtnis-Werkzeuge fanden die Selbsttests **zwei echte Fehler im eigenen
Code** — beide in Werkzeugen, die am Gutfall fehlerfrei liefen:

- `tools/skills_pruefen.py` hatte den Repo-Pfad fest verdrahtet und stürzte ab, sobald der
  Selbsttest es auf eine Kopie in `/tmp` anwandte. Dasselbe Muster wie bei
  `spiele-dev/tools/th-pruef.mjs` mit seiner festen `REPO`-Konstante.
- `tools/lehre.py` ersetzte Umlaute **nach** `unicodedata.normalize("NFKD", …)`. NFKD zerlegt „ä"
  in „a" plus kombinierendes Trema, die Ersetzung traf deshalb nie etwas. Aus „öäü" wurde „oau"
  statt „oeaeue" — still, ohne Fehlermeldung.

**Regel:** Das Messgerät bekommt seine Gegenprobe **im selben Arbeitsgang**, und die Gegenprobe
arbeitet auf einer **Kopie an einem anderen Pfad**. Fest verdrahtete Pfade und
Reihenfolge-Fallen (normalisieren vor ersetzen) sind die zwei Fehler, die sie zuverlässig fängt.

Vorbilder mit `--selbsttest`: `tools/vault.py`, `tools/gedaechtnis.py`,
`tools/skills_pruefen.py`, `tools/lehre.py`.

## Ein `…Count`-Feld mit Filter ist keine Messung, bis der Unsinn-Filter es beweist

Shopifys Zählfelder **ignorieren ihr `query`-Argument stillschweigend**. Gemessen an zwei
Stellen:

- `productsCount(query: "variants.price:>99999")` → **10000** (deckelt zusätzlich bei 10000).
- **Der Preisfilter wird auch von den LISTEN ignoriert** (gemessen 2026-09-19): `productVariants(query:"price:<=22.90")` liefert 199.90, `price:>=9000` dieselbe Liste, `price:zzzgibtesnicht` Treffer statt leer — dasselbe bei `products(query:"variants.price:…")`. Es gibt also **keinen serverseitigen Weg zu billigen oder teuren Produkten**; wer sie sucht, blättert den Katalog.
- `customersCount` mit `email_marketing_state:subscribed`, mit `orders_count:>0` und mit
  `email:zzzgibtesnicht@example.invalid` → **jedes Mal 1498**.

Aufgefallen ist es beide Male nur daran, dass **mehrere verschiedene Filter exakt dieselbe Zahl
lieferten**. Es filtern: `customerSegmentMembers { totalCount }` und die Listenabfragen
`customers(query:)` / `products(query:)` — die geben auf den Unsinn-Filter korrekt eine leere
Liste zurück.

**Schweigen ist kein Befund.** Ein Messgerät, das auf ein Merkmal prüft, braucht **drei**
Ausgänge, nicht zwei: vorhanden · gegenteilig vorhanden · **nichts gesagt**. Gemessen am
2026-09-19: keine von 32 Helmseiten nennt eine Sicherheitsnorm. Daraus „nicht zertifiziert" zu
lesen hätte 32 Produkte aus dem Verkauf genommen — belegt war nur, dass die Seite nichts sagt.
Die Gegenprobe gehört dazu: ist das Gerät überhaupt sehend? (Hier: steht der Variantenname
nachweislich im gemessenen Text? Ja, 10 184 Zeichen, `Black Graffiti-M55 To 59cm` gefunden.)

**Eine leere Fehlerliste ist keine Erfolgsmeldung.** Am 2026-09-19 waren zwölf Produkte zur
Preisänderung geplant, zehn landeten in der Mutation; Shopify meldete `userErrors: []` — korrekt,
denn das Gesendete war gültig. Aufgefallen ist die Lücke nur, weil die **Kundensicht** bei einem
Produkt noch den alten Preis zeigte. **Die Gegenprobe an der echten Seite muss jedes geänderte
Objekt abdecken, nicht eine Auswahl.**

⚠️ **Die Listenabfrage filtert richtig, ist aber trotzdem nicht die Wahrheit.** Gemessen am
2026-09-14: `products(query: "status:active")` lieferte ein Produkt zurück, dessen `status`
**DRAFT** war, das in null Kanälen stand und dessen Seite 404 lieferte — der Suchindex hinkt
hinterher. Die Gegenprobe unmittelbar danach war sauber (`id:… AND status:active` leer,
`… AND status:draft` gefunden). **Eine Stichprobe über `status:active` ist also nicht garantiert
aktiv.** Wer daraus einen Prozentsatz „der aktiven Produkte" bildet, misst etwas anderes, als er
schreibt: den Status der Produkte, über die man berichtet, einzeln nachfragen.

**Regel:** Jede gefilterte Zahl bekommt sofort einen zweiten Aufruf mit einem Filter, der **0**
ergeben muss. Ändert sich die Zahl nicht, filtert das Feld nicht — und die erste Zahl ist
wertlos.

## Erst nachsehen, wie die Sache auf der Seite heisst, dann das Muster schreiben

`tools/shop_conversion.mjs` suchte in der ersten Fassung nach „Grössentabelle" und meldete bei
allen Kleidern **NEIN**. Die Seiten nennen es **„Mass-Tabellen"** — Schweizer Schreibweise.
Eine vorhandene Sache als fehlend zu melden ist genauso schädlich wie ein übersehener Defekt:
es schickt die nächste Session auf Arbeit, die es nicht braucht.

Zweite Regel desselben Geräts: **vor jeder Textprüfung `<script>`, `<style>` und
HTML-Kommentare entfernen.** Auf der Produktseite steht in einem JS-Kommentar
„Gratis-Versand ab CHF 49", während der Kunde überall CHF 50 liest. Wer roh greppt, meldet zwei
widersprechende Versprechen, die es nie gab.

## Die Kundensicht abrufen, nicht der API-Antwort glauben

Die Admin-API liefert Produkte in der Sortierung der Collection — **einschliesslich DRAFT**.
Der Laden blendet sie aus. Wer die API-Liste für das Schaufenster hält, zählt Produkte mit, die
kein Kunde sieht. `tools/shop_conversion.mjs` misst darum die echte Seite.

⚠️ **Shopify drosselt Storefront-Abrufe** (HTTP 429) nach etlichen `curl`-Aufrufen am Stück.
Eine leere oder winzige Antwort ist **kein Messergebnis** — Grösse prüfen, sonst meldet man
„0 Treffer" aus einer Fehlerseite.

## Werkzeug-Hinweise für dieses Repo

- Node ist `/opt/node22/bin/node` (v22).
- Playwright ist **nicht** vorinstalliert: `npm i playwright --no-save`, und der Browser braucht
  `executablePath` auf `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. **Nie**
  `playwright install` aufrufen.
- Seiten in **Bildschirmhöhen** ansehen (`tools/seiten_blick.mjs`), nicht als 21 000-px-Bild.
- Messgeräte gehören nach `tools/`, Berichte nach `reports/`.

## ⭐ Der führende Stern wird weggeworfen (gemessen 2026-09-20)

`title:*wort*` in Shopify sucht **nur Wortanfänge**. Der führende `*` wird stillschweigend
verworfen — ohne Fehlermeldung, wie beim Preisfilter.

```
title:*helm*      ≡ title:helm*      = 77      # findet „Helm für …"
title:*velohelm*  ≡ title:velohelm*  = 29      # findet NICHT über *helm*
title:velohelmzzz*                   = 0       # Gegenprobe: der Filter WIRD gelesen
```

**Der Beweis in einer Abfrage** — wenn zwei Zahlen sich widersprechen, frage nach EINEM Produkt:

```graphql
{ id:  products(first:3, query:"id:15448951587201"){nodes{title}}            # gefunden
  eng: products(first:3, query:"title:*velohelm* AND id:15448951587201"){nodes{title}}  # gefunden
  weit:products(first:3, query:"title:*helm* AND id:15448951587201"){nodes{title}} }    # LEER
```

**Folgen für jede Messung:**
- Eine deutsche Zusammensetzung (`Velohelm`, `Fahrradhelm`, `Autositzkissen`) fällt durch eine
  Suche nach dem Grundwort. **Immer die Zusammensetzungen einzeln abfragen und vereinigen.**
- **Wenn Teilmengen zusammen mehr ergeben als die Obermenge, ist die Obermenge falsch** — nicht
  die Teile. Genau so fiel es auf (77 gegen 92).
- Auch die Vereinigung bleibt eine **Untergrenze**: sie findet nur, woran man gedacht hat.

## Drosselung ist kein Messergebnis (gemessen 2026-09-20)

123 Produktseiten mit 150 ms Pause ergaben **43 „unerreichbare" Seiten — alle 43 waren HTTP 429**.
Mit 400 ms und Wiederholung: 122 × 200. **`429`, `430` und `503` heissen „später nochmal", nicht
„gibt es nicht".** Wer beides in einen Topf wirft, meldet ein Drittel der Klasse als tot.

## Auch das Prüfgerät braucht eine Gegenprobe (gemessen 2026-09-20)

Die Kundensicht-Prüfung meldete **22 von 22 Produkten als abweichend** — der Shop war korrekt,
der Vergleich war es nicht (`44.9` gegen die Zeichenkette `44.90`). **Preise in Rappen
ganzzahlig vergleichen**, und einen absichtlich falschen Sollwert mitlaufen lassen, der
ausschlagen MUSS.

## Die Mutation aus Daten erzeugen, nicht von Hand schreiben

Am 19.09. waren zwölf Produkte geplant und zehn gesendet; `userErrors: []` war korrekt und sagte
nichts. **Die Liste als Daten hinschreiben, die Mutation daraus generieren, die Variantenzahl je
Produkt vorab gegen die Live-Abfrage prüfen** — dann kann nichts stillschweigend herausfallen.
