# Top-Produkte auf der Startseite — gemessen am 24.10.2026

Auftrag des Besitzers: „mehr top produkte auf webseiten pushen?"

Antwort in einem Satz: **ja, aber nicht „mehr Produkte" — die Startseite zeigte 112 Produkte
und darunter genau EINES von vierzehn, die in neunzig Tagen wirklich bezahlt gekauft wurden.**

Alles hier ist live gemessen (Shopify-Analytics, Admin-API, HTTP-Abruf der Startseite).

## 1. Warum die Startseite der richtige Ort ist

Sitzungen und Warenkorb-Zulagen, 30 Tage:

| Seite | Sitzungen | Warenkörbe | Quote |
|---|---|---|---|
| **Startseite `/`** | **290** | **17** | **5,9 %** |
| `2-teiliges-leinen-set-provence…` | 181 | 4 | 2,2 % |
| `abendkleid-sirene…` | 227 | 4 | 1,8 % |
| `abendkleid-aurora…` | 158 | 0 | 0,0 % |

Die Startseite legt pro Sitzung **drei bis unendlich mal häufiger** etwas in den Korb als die
drei Produktseiten, auf die mehr als die Hälfte des Traffics fällt. Welche Produkte einen
Startseiten-Platz haben, ist damit der stärkste Hebel, den der Shop ohne Werbebudget hat.

## 2. Was die Startseite zeigte (vorher)

Abgerufen und gezählt, nicht geschätzt: **15 sichtbare Produktreihen × 8 Kacheln,
112 verschiedene Produkte.** Drei weitere Reihen (Hundewelt, Uhren, Aufbewahrung) sind im
Theme bewusst `disabled`.

**Zwei Verdachtsmomente haben sich beim Messen in Luft aufgelöst — beide wären Arbeit an einem
Nicht-Problem gewesen:**

- *„Fünf tote Kacheln":* in drei Reihen sind unter den ersten acht Katalog-Einträgen DRAFT-Produkte.
  Der Shop filtert sie aber heraus und füllt nach — **jede der 15 Reihen zeigt live volle 8 Kacheln.**
- *„Neun Reihen mit falscher Überschrift":* im `templates/index.json` heissen vier Reihen
  „⭐ Top 10 Bestseller", obwohl sie Halloween-Kostüme, Blumentöpfe und Sneaker zeigen. Der
  Shop druckt aber **nicht** dieses Feld, sondern den **Titel der Collection** („Halloween",
  „🍂 Herbst-Favoriten", „Make-up & Kosmetik"). Die `name`-Felder sind reine Admin-Etiketten,
  kein Kunde sieht sie. **Nicht „korrigieren".**

## 3. Der echte Befund

14 Produkte wurden in 90 Tagen bezahlt gekauft (17 Bestellungen, davon 4 erstattet).
**Auf der Startseite stand davon genau 1** (`2-teiliges-leinen-set-provence…`, Reihe 1).
Die anderen 13 waren in keiner der 15 Reihen.

Dazu: die Reihe, die „🔥 Gerade im Trend" heisst, enthielt **49 Produkte, von denen keines je
bestellt wurde.**

## 4. Was geändert wurde

Reihe 2 der Startseite (`hype-jetzt` · „🔥 Gerade im Trend") sortiert jetzt nach
**`BEST_SELLING`** statt nach einer internen Reihenfolge, und die gemessenen Verkäufer sind in
ihren Produktpool aufgenommen (Tag `hype-jetzt`, von keinem Skript im Repo sonst benutzt).

Damit zeigen die 8 Kacheln der Reihe 2 **live nachgeprüft** genau die Ware, die Kundinnen
gekauft haben — und die Reihe hält sich von selbst aktuell, wenn sich die Verkäufe ändern:

| Kachel | Stück (90 T) | VK | EK | Rohmarge |
|---|---|---|---|---|
| Herren Cargo-Hose «Trail» | 2 | 44.90 | 19.88 | +25.02 |
| Kristallspitzen-Set 8-teilig | 1 | 29.90 | 13.05 | +16.85 |
| Midikleid Zopfmuster | 1 | 39.90 | 13.99 | +25.91 |
| Magnetische 3-in-1-Ladestation | 1 | 75.90 | 48.73 | +27.17 |
| Multifunktionaler Gemüseschneider | 1 | 39.90 | 20.84 | +19.06 |
| Reise-Hängematte | 1 | 34.90 | 16.92 | +17.98 |
| Bügeltransfer selbst gestalten | 2 | 35.90 | 22.80 | +13.10 |
| Blumenkleid mit Schnürung | 1 | 24.90 | 12.85 | +12.05 |

(Der E-Scooter-Lader, +16.89, steht auf Platz 9 und damit knapp hinter der Reihe.)

**Lieferbarkeit vorher geprüft, nicht angenommen** — das ist die Lehre aus elf von elf
Erstattungen. `ERNEUT=1 HANDLES=… node automation/lieferbarkeit_guard.mjs` über alle
14 Kandidaten: `gelesen 14 · geprueft 12 · lieferbar 10 · unbekannt 2 · befunde []`.
Die 2 Übersprungenen sind Eigen-/POD-Ware ohne CJ-Nummer (`LX-23-KRISTALL-SET-3-TEILIG`,
`TRANSFER-A3`) — sie brauchen keine CJ-Fracht.

## 5. Vier Verkäufer bleiben bewusst draussen, jeder mit Grund

- **`led-wasserwellen-projektionsleuchte-677504`** — das meistverkaufte Produkt des Monats
  (Bestellung #1026, bezahlt) hat **VK 14.90 bei EK 11.70 = +3.20 vor Fracht**. Mit CJ-Fracht
  ist dieser Verkauf ein Verlust. **Das ist ein Preis-Entscheid des Besitzers, kein Klick.**
- **`k68-signal-detektor-46ae1c`** (2 Stück verkauft) — SKU ist eine interne UUID
  (`CJ-2E1F8D37-…`), die Fracht ist damit **unbekannt**, nicht unlieferbar. Ohne Messung kein
  Startseiten-Platz.
- **`nibosi-quarzuhr-mit-edelstahlband-e89d0a`** — bezahlt verkauft (#1021, eine der zwei
  ChatGPT-Bestellungen) und steht heute auf **DRAFT**, Grund-Tag `auto-entwurf-0926` (die
  einzige Tag-Familie ohne harten Sperrgrund). Marge +7.63, Lieferbarkeit unbekannt.
- **`interaktives-katzenspielzeug…-627400`** — Marge +7.87 vor Fracht, zu dünn.

Ausserdem **nicht** angefasst: die Collection „⭐ Bestbewertet" (Reihe 6). Die Verkäufer dort
hineinzustellen wäre eine falsche Aussage — sie haben keine Bewertungen. Probeweise
hinzugefügt und wieder entfernt (50 → 59 → 50).

## 6. Mess-Lehren dieses Laufs

1. **Ein Admin-Etikett ist keine Kundenansicht.** Vier Reihen heissen im Theme-JSON
   „Top 10 Bestseller" — gedruckt wird der Collection-Titel. Wer das JSON als Messgerät nimmt,
   baut einen Fix für ein Problem, das es nicht gibt.
2. **Ein DRAFT in der Collection ist keine tote Kachel.** Erst das Zählen der Produktlinks im
   ausgelieferten HTML zeigt, dass der Shop nachfüllt.
3. **200 nach Umleitung ist nicht 200.** `/products/kristall-set-3-teilig` antwortet mit `200`,
   wenn man Umleitungen folgt — ohne `-L` ist es ein **301** auf den heutigen Handle. Jede
   Statusmessung braucht den ersten Code, nicht den letzten. Gegenprobe mit einer erfundenen
   Adresse (404) lief vorher.
4. **`BEST_SELLING` wirkt verzögert.** Direkt nach dem Umstellen stand die alte Reihenfolge noch
   da und sah nach „wirkt nicht" aus; erst nach dem Neuaufbau des Index standen die Verkäufer
   auf 1–9. Eine Sortierung einmal später nachprüfen, nicht sofort verwerfen.
