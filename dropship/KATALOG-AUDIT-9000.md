# 🔬 Katalog-Audit über 9000 aktive CJ-Produkte (04.10.2026)

> **Ich habe meine eigene Vermutung geprüft und sie hat nicht gehalten.** Nach vier falsch beschrifteten
> Top-Seiten lag der Verdacht nahe, der CJ-Katalog sei voller maschinell verunglückter Texte. Gemessen an
> 9000 aktiven `cj-real`-Produkten: **das ist nicht so.** Dafür kam ein anderer Defekt heraus, der 72 %
> betrifft.

## Was gemessen wurde

| Signal | Treffer | Anteil |
|---|---|---|
| Platzhalter-Text («siehe Beschreibung», leere Werte) | 5 | 0,1 % |
| Chinesische Zeichen | 0 | 0,0 % |
| Englische Reste («Default Title», «Style-», «Base») | 8 | 0,1 % |
| Unsinns-Material («Catalpa-Legierung» u. ä.) | 0 | 0,0 % |
| Alters-Floskeln aus dem Feed | 1 | 0,0 % |
| Titel ohne Wortbezug zum Handle | 12 | 0,1 % |
| **Ohne jede Mass-, Mengen- oder Volumenangabe** | **6476** | **72,0 %** |

Jedes Signal hat eine Gegenprobe (muss bei einem bekannten Treffer anschlagen und bei einem harmlosen Text
schweigen) — alle fünf Gegenproben bestanden. Die 12 Handle-Abweichungen sind beim Nachsehen überwiegend
**korrekte Übersetzungen** (`suede-fringed-dress` → «Kleid in Wildleder-Optik mit Fransen»), also kein Defekt.

## Der eine echte Befund: 72 % ohne Masse

**6476 von 9000 aktiven Produkten nennen keine einzige Zahl mit cm, mm, ml, Liter oder Zoll.** Bei
physischen Waren ist das die erste Frage jedes Käufers — und genau die Lücke, die heute bei zwei Seiten
aufgefallen ist: die Möbelfolie für CHF 32.90 nennt kein Rollenmass, die Trinkflasche kein Fassungsvermögen.
Das ist kein Textproblem, sondern ein **Datenproblem**: die Masse stehen bei CJ, sind aber nie in die
Beschreibungen gewandert.

Das ist ein lohnender, vollautomatisierbarer Auftrag: `variantSku` → `product/query` → Varianten-Masse und
Material als «Daten»-Block anhängen, idempotent über einen Marker. Bremse ist allein das **CJ-Tagespunkte-
Limit** (10 Punkte je Abfrage) — also über mehrere Tage in Chargen, beginnend bei den Seiten mit
Google-Positionen.

## 🔧 Korrektur meiner eigenen Aussage von vorhin

Nach dem vierten Fund habe ich geschrieben, das sei «keine Pechsträhne, das ist die Regel» und der Rest des
Katalogs sei vermutlich genauso betroffen. **Diese Verallgemeinerung war nicht gedeckt.** Vier von vier
stimmt — aber es waren vier von Hand ausgesuchte Seiten mit Google-Position, keine Stichprobe. Die Messung
zeigt: Text-erkennbare Fehler sind selten.

Was sie **nicht** zeigt: ob ein Produkt das ist, was sein Titel behauptet. Genau diese vier Fälle
(Insulin-Kühlbox, Thermodrucker, Fingerboard-Achsen, Faltbrett) waren **textlich unauffällig** — die
Abweichung sah man nur auf dem Produktbild. Ein automatischer Test dafür gibt es hier nicht; er bräuchte
eine Bildprüfung je Produkt. Für die ~30 Seiten mit Google-Position ist das vertretbar, für 9000 nicht.

**Richtige Schlussfolgerung:** Die vier Fälle sind belegt und behoben. Ob es viele oder wenige weitere gibt,
ist **offen** — und sollte dort geprüft werden, wo Besucher ankommen, nicht im ganzen Katalog.

## Nächste sinnvolle Schritte
1. Masse-Nachtrag aus CJ in Chargen (grösster messbarer Hebel: 72 % → idealerweise unter 20 %).
2. Bildprüfung weiter nur für Seiten mit Position oder Besuchern.
3. `baumwoll-camisole-608000` prüfen: Handle sagt «Baumwoll-Camisole», Titel «Corsagen-Top mit eckigem
   Ausschnitt» — die Seite rankt auf Platz 47 für «camisole» (1000 Suchen/Mt).

## Messwerkzeug
`audit.mjs` und `handle.mjs` dieser Sitzung; beide mit eingebauter Gegenprobe. Wiederholbar gegen
`status:ACTIVE AND tag:cj-real`.
