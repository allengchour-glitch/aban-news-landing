# Zwei Pläne aus dem Gedächtnis tragen nicht — und was stattdessen gebaut wurde

**Datum:** 2026-09-19 (zweite Runde)
**Auftrag:** „nutze sachen und hilf zu entwickeln für luxestyle"
**Am Shop geändert:** 7 Produkte / 21 Varianten, alle an der echten Seite nachgemessen.
**Gebaut:** `automation/preis_korrektur.mjs` (15 Selbsttests) — der Katalog in einem Lauf.

Marken: **GEMESSEN** = hier nachgeprüft · **QUELLE** = fremde Angabe · **BEHAUPTUNG** = ungeprüft.

---

## ❌ Plan 1 gefallen: „die 105 fertigen Reels auf die Produktseiten"

Das Gedächtnis führt seit dem 13.09. als Hebel Nummer 2: *„kein Video auf den PDP, laut Quelle
+10–25 % ATC, 105 fertige Reels liegen in `reels/` (494 MB)"* — und der Upload-Weg ist
ausdrücklich als „braucht KEINEN Theme-Zugriff" vorgeprüft. Es klang nach der einen offenen
Sache, die niemand blockiert.

**GEMESSEN: die Reels sind keine Produktvideos.** `dropship/ads/auto_render.sh` baut jedes
`auto-*.mp4` aus **mehreren** Produkten der Allow-Liste (`good_products.csv`, 16 Einträge) und
bricht unter zwei Bildern sogar ab (`[ "$k" -ge 2 ] || … exit 0`). Es sind Marketing-Montagen.

**Ein solches Video auf eine Produktseite zu hängen, zeigt dort fremde Produkte** — also
genau das Gegenteil dessen, wofür der Conversion-Wert der Quelle gilt. Der Plan ist damit
erledigt, nicht verschoben. Wer Produktvideos will, muss sie je Produkt rendern; die
Bausteine (`frame_for_reel.py`, ffmpeg, Musik) liegen dafür bereit.

## ❌ Plan 2 gefallen: „gezielt im Preis-Risikoband suchen"

Um die Verlustfälle zu finden, ohne den ganzen Katalog zu blättern, lag ein Filter auf den
Preis nahe. **GEMESSEN, mit Gegenprobe in derselben Abfrage:**

| Abfrage | Filter | Ergebnis |
|---|---|---|
| `productVariants` | `price:<=22.90` | liefert **199.90** |
| `productVariants` | `price:>=9000` | **dieselbe Liste** |
| `productVariants` | `price:zzzgibtesnicht` | Treffer statt leer |
| `products` | `variants.price:<=22.90` | dieselben vier Produkte wie … |
| `products` | `variants.price:>=150` | … dieser Filter |
| `products` | `variants.price:zzzgibtesnicht` | Treffer statt leer |

**Preisfilter werden von `productsCount`, `products(query:)` und `productVariants(query:)`
gleichermassen still ignoriert.** Das Gedächtnis kannte den Fall bisher nur für `productsCount`.
**Folge: es gibt keinen serverseitigen Weg zu den Verlustfällen.** Jede Suche muss den ganzen
Katalog blättern — über die MCP sind das rund 12 000 Zeichen Antwort je 60 Produkte.

⚠️ Ohne die Gegenprobe hätte ich „das Risikoband durchsucht" gemeldet und in Wirklichkeit
den Katalog von vorn gelesen, im Glauben, gefiltert zu haben.

---

## ✅ Geändert (live, jederzeit zurückdrehbar)

Erste Seite nach ID durchgerechnet, die schlimmsten sieben gesetzt:

| Produkt | vorher | nachher | EK | nach WELCOME10 |
|---|---|---|---|---|
| Smart-Anzuchtset mit LED-Pflanzenlampe | 21.90 | **39.90** | 20.29 | **−2,9 % → 43,5 %** |
| XXL Leselupe mit LED-Licht | 16.90 | **29.90** | 14.87 | 2,2 % → 44,7 % |
| Edelstahl-Trinkflasche «Hydro» (3 Var.) | 24.90 | **39.90** | 21.28 | 5,0 % → 40,7 % |
| 3D-Druck Nachttischlampe | 16.90 | **24.90** | 13.24 | 13,0 % → 40,9 % |
| Monitor-Lichtleiste mit Bewegungssensor | 29.90 | **44.90** | 23.41 | 13,0 % → 42,1 % |
| Flötenkessel 2 L Edelstahl | 44.90 | **64.90** | 34.71 | 14,1 % → 40,6 % |
| Sommerkleid A-Linie (15 Var.) | 44.90 | **64.90** | 34.04 | 15,8 % → 41,7 % |

**Das Anzuchtset machte nach dem Gutschein Verlust** (21.90 × 0,9 = 19.71 gegen EK 20.29).

**Alle sieben an der echten Seite gegengeprüft** — 3990 / 2990 / 3990 / 2490 / 4490 / 6490 /
6490. Die Regel von letzter Runde („jedes geänderte Produkt, nicht eine Auswahl") ist
eingehalten.

---

## 🛠️ Gebaut: `automation/preis_korrektur.mjs` (15 Selbsttests)

Das Blättern von Hand schafft ein Dutzend Produkte je Sitzung. Bei einem Katalog, dessen
Median bei 20–23 % Rohmarge liegt, ist das kein Weg. **Das Skript macht den ganzen Katalog in
einem Lauf** — es holt sich den Token per Client-Credentials, blättert alle aktiven Produkte,
rechnet mit `zielpreis()` aus `tools/varianten_preis.mjs` und schreibt einen CSV-Bericht.

**Sechs Sicherheitsregeln, jede einzeln im Selbsttest:**

1. **Preise werden nie gesenkt.** Wer über dem Ziel liegt, bleibt unberührt.
2. **Kein Einkaufspreis heisst überspringen** — nicht 0, nicht raten. Auch EK 0 gilt als unbekannt.
3. **Faktor-Deckel (Standard 3).** Ein Zielpreis über dem Dreifachen wird **gemeldet, nicht
   gesetzt**: so ein Produkt ist falsch importiert, nicht falsch bepreist. Genau der Fall
   Abtropfregal (20.90 bei EK 68.11, Faktor 6) — darüber entscheidet ein Mensch.
4. **Idempotent.** Der Selbsttest führt den Lauf zweimal aus: der zweite ändert nichts.
5. **Ohne Zugangsdaten passiert nichts** (Exit 0, keine Fehlermeldung) — nachgewiesen.
6. **`DRY_RUN` ist der Standard.** Scharf nur mit ausdrücklichem `DRY_RUN=0`.

Dazu die **Währungsprüfung** aus der Runde vom 13.09.: Produkte, deren `unitCost` nicht in CHF
steht, werden übersprungen und gezählt statt falsch gerechnet.

Zwei Selbsttests sichern die Regel gegen Abdriften: die **sieben Preise dieser Runde** und die
**Grenze** (genau auf dem Ziel → keine Änderung, einen Rappen darunter → Änderung).

### 🟡 Zum Scharfstellen fehlt genau eine Sache

```
SHOPIFY_SHOP=au3j0y-hq.myshopify.com
SHOPIFY_CLIENT_ID=…
SHOPIFY_CLIENT_SECRET=…          # aus der Custom-App im Dev-Dashboard
```

Dann:

```
DRY_RUN=1 node automation/preis_korrektur.mjs   # erst lesen: dropship/preis-korrektur-*.csv
DRY_RUN=0 node automation/preis_korrektur.mjs   # dann scharf
```

**Dieselben drei Werte lösen auch die schlanke Startseite** (`automation/homepage_slim.mjs`,
seit 12.09. fertig und wartend). Ein Satz Zugangsdaten, zwei offene Baustellen.

## Die Grenzen dieser Runde

1. **Das Skript ist gebaut und selbstgetestet, aber nie gegen den echten Shop gelaufen.** Die
   Selbsttests prüfen die Entscheidungslogik, nicht die Shopify-Antworten. Der erste Lauf
   gehört mit `DRY_RUN=1` gemacht und die CSV gelesen, bevor irgendetwas scharf geht.
2. **Sieben Produkte sind behoben, die Klasse nicht.** Das war nie das Ziel dieser Runde.
3. **Preise hochzusetzen kann Verkäufe kosten.** Bewusst in Kauf genommen; alle Vorher-Werte
   stehen oben.

## Nachprüfen

```
node automation/preis_korrektur.mjs --selbsttest   # 15 Pruefungen
node automation/preis_korrektur.mjs                # ohne Creds: No-op, Exit 0
node tools/varianten_preis.mjs --selbsttest        # 24 Pruefungen
grep -n 'k" -ge 2' dropship/ads/auto_render.sh     # Beleg: Reels sind Mehrprodukt-Montagen
```
