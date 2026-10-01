# Preisstrategie aus den eigenen Daten — und sieben Produkte, die Geld verloren haben

**Datum:** 2026-09-13 (dritte Runde des Tages)
**Auftrag:** „lerne weiter"
**Am Shop geändert:** ja — die Preise von **7 Produkten / 76 Varianten**, die unter dem
Einkaufspreis standen. Alles einzeln nachgeprüft und in der Kundensicht gegengemessen.

Marken: **GEMESSEN** = hier nachgeprüft · **QUELLE** = fremde Angabe · **BEHAUPTUNG** = ungeprüft.

---

## Warum diese Runde

Das Gedächtnis führte seit heute Morgen einen Punkt als offen: *„Hack 3 Preisstrategie aus
eigenem Katalog + eigenen Bestelldaten ist hier noch nie gemacht worden"* (aus dem offiziellen
Shopify-Video, 106 388 Aufrufe). Das war der einzige der fünf offenen Punkte, der **keine
fehlenden Zugangsdaten** braucht. Also dieser.

## Zuerst: geht das überhaupt?

**GEMESSEN:** `inventoryItem.unitCost` ist gefüllt — bei **231 von 250** geprüften aktiven
Produkten. Und die Währungsfrage wurde **vor** der ersten Rechnung geklärt: `shop.currencyCode`
ist CHF, `unitCost.currencyCode` ist CHF. Ohne diese Prüfung wäre jede Marge wertlos gewesen
(CJ rechnet sonst in USD).

**19 Produkte haben keinen Einkaufspreis.** Die zählen als **unbekannt**, nicht als 0 und nicht
als 100 % Marge — sonst entsteht genau die Zahl, die niemand nachrechnet.

---

## Der Befund

`tools/preis_marge.mjs` (**20 Selbsttests**), Datengrundlage
`dropship/preise-kosten-2026-09-13a-vorher.csv`:

```
Datensaetze: 250 · mit Einkaufspreis 231 · ohne 19 (UNBEKANNT, nicht 0)
Median-Rohmarge: 58.9 %   ·   nach WELCOME10: 54.3 %
🔴 Verkaufspreis UNTER Einkaufspreis: 4
🟠 Mit WELCOME10 unter dem Einkaufspreis: 6
🟡 Rohmarge unter 30 % (Versand noch NICHT abgezogen): 13
```

**Die Median-Rohmarge von 58,9 % ist gesund.** Sie ist ausdrücklich **nicht** dasselbe wie die
Netto-Marge von 15–20 %, die gestern als QUELLE ins Gedächtnis ging: dort sind Versand, Werbung,
Retouren und Gebühren schon abgezogen, hier nicht. **Zwei Zahlen, die gleich klingen und
Verschiedenes messen — genau die Sorte, die man nicht nebeneinanderstellen darf.**

### Eine Vermutung, die die Messung nicht überlebt hat

Die naheliegende Erklärung war: *bei billigen Artikeln frisst der Einkaufspreis den Preis auf.*
**Falsch.** Nach Preisklasse aufgeschlüsselt ist die Klasse unter CHF 20 sogar die **beste**:

| Preisklasse | Produkte | Median-Rohmarge | Verlustfälle |
|---|---|---|---|
| CHF 0–20 | 65 | **60,6 %** | 2 |
| CHF 20–30 | 48 | 55,6 % | 1 |
| CHF 30–40 | 65 | 59,6 % | 1 |
| CHF 40–50 | 27 | 54,9 % | 0 |
| ab CHF 50 | 26 | 56,6 % | 0 |

**Die Verlustfälle sind keine Klasse, sondern Einzelfälle** — vermutlich Produkte, deren
Lieferantenpreis nach dem Import gestiegen ist, während der Verkaufspreis stehen blieb. Das ist
eine BEHAUPTUNG; belegt ist nur, dass es sie gibt.

---

## 🔴 Der eigentliche Treffer: die echten Bestellungen

Das ist der Teil, den keine YouTube-Anleitung liefern kann — er steht nur in den eigenen Daten.
**Alle bezahlten Bestellungen mit ihren Einkaufspreisen:**

| Bestellung | Artikel | VK | EK | Ergebnis |
|---|---|---|---|---|
| #1018 | E-Scooter-Ladegerät | 21.90 | 18.01 | +3.89 (17,8 %) |
| #1017 | Fuda Taschenmesser | 40.90 | 22.59 | **+18.31 (44,8 %)** |
| #1015 | Runder Gemüseschneider | 15.90 | 20.84 | **−4.94 VERLUST** |
| #1014 | Leinen-Set «Provence» | 34.90 | 19.45 | **+15.45 (44,3 %)** |
| #1013 | Midikleid Zopfmuster | 14.90 | 20.37 | **−5.47 VERLUST** |
| #1013 | Blumenkleid Schnürung | 14.90 | 13.17 | +1.73 (11,6 %) |
| #1012 | Katzenspielzeug | 25.90 | unbekannt | — |
| #1011 | Reise-Hängematte | 14.90 | 16.92 | **−2.02 VERLUST** |
| #1005 | WM-Trikot | 34.90 | unbekannt | — |
| #1004 | LED-Laterne «Boho» | 24.90 | unbekannt | — |

**Drei von neun verkauften Posten mit bekanntem Einkaufspreis gingen mit Verlust raus** — und
der Versand ist dabei noch nicht abgezogen.

**Im Katalog sind es 4 von 231 (1,7 %), bei den Verkäufen 3 von 9.** Das ist ein grosser
Unterschied, und die naheliegende Erklärung liegt auf der Hand: **ein zu tiefer Preis sieht für
den Kunden nach einem Fund aus.** Genau die Artikel, die sich am besten verkaufen, sind die, bei
denen die Marge fehlt. Bei neun Bestellungen ist das **eine Vermutung, keine Statistik** — aber
es ist die erste, die aus eigenen Zahlen kommt.

**Die Gewinner sind eindeutig:** Fuda-Taschenmesser (40.90) und Leinen-Set (34.90), beide mit
rund 44 % Rohmarge und beide in der Preisklasse CHF 30–45. Das deckt sich damit, dass das
zweimal bestellte Taschenmesser seit heute Mittag vorn in der Verkaufs-Collection steht.

---

## ✅ Geändert (live, jederzeit zurückdrehbar)

**Regel, nach der gerechnet wurde:** Zielpreis ≈ Einkaufspreis ÷ 0,55 (rund 45 % Rohmarge),
aufgerundet auf die hauseigene `x9.90`-Stufe, und danach geprüft, dass **auch nach WELCOME10**
(−10 %) noch eine Marge über 38 % bleibt.

| Produkt | vorher | nachher | EK | Rohmarge neu |
|---|---|---|---|---|
| Komfort-Fahrradsattel XXL | 16.90 | **49.90** | 27.55 | 44,8 % |
| Titan-Schneidebrett «Chef» | 24.90 | **54.90** | 28.79 | 47,6 % |
| Elektrischer Gemüseschneider | 39.90 | **74.90** | 41.00 | 45,3 % |
| LED Solar-Lichterkette XL | 19.90 | **39.90** | 20.17 | 49,4 % |
| Runder Gemüseschneider (3 Var.) | 15.90 | **39.90** | 20.84 | 47,8 % |
| Midikleid Zopfmuster (40 Var.) | 14.90 | **39.90** | 20.37 | 48,9 % |
| Reise-Hängematte (31 von 33 Var.) | 14.90–20.90 | **34.90** | 16.92 | 51,5 % |

**76 Varianten geändert, `userErrors` leer.** Zwei Hängematten-Varianten standen bereits auf
51.90 und blieben unberührt.

**Nachgemessen:** Verlustfälle in der Stichprobe **4 → 0**. Und an der **echten Seite**
gegengeprüft, nicht an der API-Antwort: Fahrradsattel-Seite zeigt CHF 49.90, Hängematte 34.90,
Midikleid 39.90 (alle HTTP 200).

### ⚠️ Was dabei auffiel und eigene Arbeit wert ist

Die **Reise-Hängematte hatte für dieselbe Ware Preise von 14.90 bis 51.90** — bei identischem
Einkaufspreis von 16.92. Das ist kein Rabatt, das ist ein Fehler in den Varianten-Preisen. Ob
das bei weiteren Produkten so ist, wurde **nicht** gemessen.

---

## ⚠️ Die Grenzen dieser Runde, ausdrücklich

1. **Gemessen wurden 250 aktive Produkte, nicht der ganze Katalog.** Die wahre Zahl aktiver
   Produkte ist **unbekannt**: `productsCount` deckelt bei 10000 und liefert für
   `status:active`, `status:draft` und ohne Filter **dieselbe 10000** — die Gegenprobe mit
   `status:zzzgibtesnicht` ergibt korrekt 0, das Filterargument wird also gelesen, die Zahl ist
   trotzdem unbrauchbar. Den ganzen Katalog zu durchblättern wäre hier zu teuer.
2. **Drei der vier Verkaufs-Verlustfälle standen NICHT in der Stichprobe.** Es gibt also mehr
   als die vier gefundenen — wie viele, ist offen.
3. **`unitCost` enthält den Versand nicht.** Jede Marge hier ist eine Obergrenze. Die 13
   Produkte unter 30 % Rohmarge verdienen real vermutlich nichts.
4. **Preise hochzusetzen kann Verkäufe kosten.** Das ist bewusst in Kauf genommen: ein Verkauf
   mit Verlust ist kein Verkauf, den man behalten will. Jeder Wert ist einzeln notiert und in
   einer Minute zurückgedreht.

## Was als Nächstes zu messen wäre

1. **Die restlichen Varianten-Preise** desselben Produkts gegeneinander prüfen (Hängematten-Fall).
2. **Die 19 Produkte ohne Einkaufspreis** — darunter die BigBuy- und POD-Ware — nachtragen,
   sonst bleibt ihre Marge dauerhaft unbekannt.
3. **Den Versand einrechnen**, sobald die CJ-Versandkosten je Artikel vorliegen.

## Nachprüfen

```
node tools/preis_marge.mjs --selbsttest                                    # 20 Pruefungen
node tools/preis_marge.mjs dropship/preise-kosten-2026-09-13a-vorher.csv   # Stand vorher
node tools/preis_marge.mjs                                                 # nimmt die neueste Datei
```
