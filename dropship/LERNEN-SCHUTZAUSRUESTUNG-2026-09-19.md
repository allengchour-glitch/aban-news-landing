# Es sind nicht zwei Helme, es sind zweiunddreissig — und was ich bewusst NICHT getan habe

**Datum:** 2026-09-19
**Auftrag:** Dauerauftrag, Fortsetzung des offenen Punkts vom 14.09.:
*„Weitere Schutzausrüstung suchen: wenn zwei Helme mit ‚3C' im Katalog stehen, stehen
vermutlich mehr. Noch nicht gemessen."*
**Am Shop geändert:** 12 Produkte / 89 Varianten neu bepreist. **Kein Produkt aus dem Verkauf
genommen** — die Begründung dafür ist der Kern dieser Runde.

Marken: **GEMESSEN** = hier nachgeprüft · **QUELLE** = fremde Angabe · **BEHAUPTUNG** = ungeprüft.

---

## Der Bestand

**GEMESSEN:** die Suche nach `title:*helm*` unter aktiven Produkten liefert **mindestens 40
Treffer**, davon **32 echte Helme** (der Rest sind Helmhalterung, Helmleuchte, Helmtasche,
Rucksack, Sportbrille). Dazu kommen eine Schwimmweste, ein Velo-Kindersitz und mehrere
Auto-Kindersitze. Das Gedächtnis führte bis heute **zwei** Helme.

⚠️ **32 ist eine Untergrenze, keine Gesamtzahl.** Die Abfrage war auf 40 Ergebnisse begrenzt und
die Wortsuche findet Zusammensetzungen wie „Velohelm" und „Fahrradhelm" nicht zuverlässig — drei
solche Produkte tauchten nur über eine zweite Abfrage auf. Wie viele es wirklich sind: **unbekannt.**

## Das Messgerät und seine wichtigste Regel

**GEBAUT: `tools/schutzausruestung.mjs` (19 Selbsttests.)** Es ruft die echten Produktseiten ab
und trennt **drei** Fälle — nicht zwei:

| Befund | Bedeutung | Was folgt daraus |
|---|---|---|
| **europäisch** | Seite nennt EN 1078 / EN 1077 / EN 1385 / EN ISO 12402 oder CE | in Ordnung |
| **chinesisch** | Seite nennt **nur** 3C / CCC / eine GB-Norm | **Befund** — positiver Hinweis, dass die EU-Zulassung fehlt |
| **unbekannt** | Seite sagt gar nichts | **kein Befund** — eine Lücke in der Beschreibung |

**Diese Trennung ist der ganze Punkt.** Fehlender CE-Text auf einer Seite beweist nicht, dass
das Produkt kein CE hat. Die Produktseiten hier sind aus Lieferantendaten erzeugt und nennen
praktisch nie eine Norm — bei Kleidern so wenig wie bei Helmen. Wer „unbekannt" als „nicht
zertifiziert" liest, nimmt gesunde Ware aus dem Verkauf.

**Zwei Gegenproben stecken fest im Werkzeug**, weil ich selbst in beide Fallen getreten bin:

1. **`CE` als blosses Zeichen fängt alles.** Mein erster Versuch meldete auf jeder Seite Treffer —
   aus `initial-scale=1`, `.compare-at-price` und dem Wort „Service". `CE` zählt jetzt nur als
   eigenständiges Wort.
2. **Skripte und Stile zählen nicht.** Das Gerät benutzt `sichtbarerText()` aus
   `tools/shop_conversion.mjs` — dieselbe Säuberung wie dort, nicht eine zweite eigene.

## 🔴 Das Ergebnis

```
Geprueft: 32 Produktseiten
  europaeische Norm genannt : 0
  NUR chinesische Kennzeichnung (BEFUND): 0
  keine Angabe (Dokumentationsluecke, KEIN Befund): 32
  unerreichbar: 0
```

**Keine einzige der 32 Helmseiten nennt eine Sicherheitsnorm — weder eine europäische noch eine
chinesische.** Ein Kunde, der einen Velohelm für sein Kind kauft, erfährt auf der Seite nicht,
nach welcher Norm er geprüft ist.

### Die Gegenprobe, ohne die das Ergebnis wertlos wäre

Ein Gerät, das nichts findet, kann auch einfach blind sein. **GEMESSEN:** der sichtbare Text
einer Helmseite enthält die Variantennamen — auf `sport-und-outdoor-helm-627400` steht
`Black Graffiti-M55 To 59cm` im gemessenen Text, Länge 10 184 Zeichen. Genau dort stand bei den
beiden Helmen vom 14.09. das `3C Helmet`. **Hätte einer dieser 32 eine chinesische Kennzeichnung
im Variantennamen getragen, wäre sie gefunden worden.** Die Null ist echt.

## ⛔ Was ich bewusst NICHT getan habe, und warum

Am 14.09. habe ich zwei Helme aus dem Verkauf genommen, weil ihre Variantennamen ausschliesslich
`3C Helmet` nannten — ein **positiver** Hinweis auf eine chinesische statt europäischen Zulassung.
Die naheliegende Fortsetzung wäre gewesen, jetzt alle 32 ebenso zu behandeln.

**Das wäre falsch gewesen.** Die beiden Fälle sind nicht dieselbe Sache:

- **14.09.:** die Seite sagte etwas, und was sie sagte, war ein Problem.
- **Heute:** die Seiten sagen nichts. Schweigen ist kein Beweis.

32 Produkte auf ein fehlendes Wort hin aus dem Verkauf zu nehmen, hiesse eine Vermutung wie eine
Messung zu behandeln — und der Shop verlöre eine ganze Kategorie, ohne dass jemand geprüft hätte,
ob die Ware in Ordnung ist. **Die Entscheidung gehört dem User, mit einer Auskunft des
Lieferanten**, nicht einer Textsuche.

**🟡 NUR DER USER:** bei CJ nachfragen, ob für die Velo- und Skate-Helme ein Prüfbericht nach
**EN 1078** (bzw. EN 1077 Ski, EN 1385 Wassersport) vorliegt. Liegt er vor: Norm in die
Beschreibungen, damit Kunden sie sehen. Liegt er nicht vor: dann ist es dieselbe Lage wie am
14.09., und die Produkte gehören aus dem Verkauf. Ohne diese Auskunft bleibt es offen — **und
solange steht auf 32 Produktseiten kein Wort zur Sicherheit.**

---

## ✅ Geändert (live, jederzeit zurückdrehbar)

Die Marge ist unabhängig von der Normfrage eindeutig. Regel wie am 14.09.:
`zielpreis()` aus `tools/varianten_preis.mjs` — kleinster Preis auf der `x4.90/x9.90`-Leiter, bei
dem nach WELCOME10 noch 38 % Rohmarge bleiben.

| Produkt | vorher | nachher | EK (max) | Var. |
|---|---|---|---|---|
| **Wassersport-Helm für Kajak und Rettung** | 20.90 | **44.90** | 23.67 | 4 |
| **Vielseitiger Helm für Sport & Freizeit** | 15.90 | **39.90** | 20.25 | 18 |
| **Kinder Kart Helm** | 43.90 | **84.90** | 45.35 | 1 |
| Short Track Helm für Eisschnelllauf | 49.90 | **69.90** | 36.31 | 8 |
| Sport- und Outdoor-Helm | 32.90 | **54.90** | 29.61 | 2 |
| Retro Motorradtasche mit Helmfach | 50.90 | **89.90** | 49.33 | 1 |
| Mountainbike-Helm mit LED-Warnlicht | 29.90 | **49.90** | 27.56 | 1 |
| Helm für Hip-Hop, Rollsport & Outdoor | 15.90 | **29.90** | 14.43 | 19 |
| Velo- und Skates-Helm Erwachsene/Kinder | 24.90 | **29.90** | 15.91 | 10 |
| Plum Scooter Helm | 15.90 | **24.90** | 12.82 | 21 |
| Velo- und Skateboard-Helm für Pendler | 18.90 | **24.90** | 12.76 | 3 |
| Kinder-Helm mit Schutz | 15.90 | **19.90** | 9.62 | 1 |

**Die ersten drei standen unter dem Einkaufspreis** — darunter ein Helm für **Kajak und Rettung**
und ein **Kinder**-Kart-Helm. Die übrigen neun lagen nach WELCOME10 unter 38 % Rohmarge.

**Alle zwölf an der echten Seite nachgemessen**, nicht an der API-Antwort: 39.90 / 44.90 / 84.90 /
69.90 / 54.90 / 89.90 / 49.90 / 29.90 / 29.90 / 24.90 / 24.90 / 19.90.

### ⚠️ Eigener Fehler, von der Gegenprobe gefangen

Ich hatte zwölf Produkte geplant und **nur zehn in die Mutation geschrieben** — der Hip-Hop-Helm
und der Plum-Scooter-Helm fielen beim Zusammenstellen heraus. Die API meldete brav
`userErrors: []` für alles, was ich geschickt hatte. **Aufgefallen ist es allein daran, dass die
Kundensicht bei einem Produkt noch 15.90 zeigte.**

**Lehre, ab jetzt Pflicht: die Gegenprobe an der echten Seite muss JEDES geänderte Produkt
abdecken, nicht eine Auswahl.** Eine leere Fehlerliste beweist nur, dass die gesendeten Befehle
gültig waren — nicht, dass alles Geplante gesendet wurde.

## Die Grenzen dieser Runde

1. **32 Helme sind eine Untergrenze.** Zusammensetzungen wie „Velohelm" fallen durch die Suche.
2. **Nicht geprüft:** Schwimmweste, Velo-Kindersitz, die Auto-Kindersitze, Schutzbrillen. Alles
   dieselbe Produktklasse, alles noch nicht gemessen.
3. **Die Normfrage ist offen**, nicht beantwortet. Diese Runde hat gemessen, dass die Seiten
   schweigen — mehr nicht.

## Nachprüfen

```
node tools/schutzausruestung.mjs --selbsttest                              # 19 Pruefungen
node tools/schutzausruestung.mjs --datei dropship/schutzausruestung-handles.txt
node tools/varianten_preis.mjs --selbsttest                                # 24 Pruefungen
```
