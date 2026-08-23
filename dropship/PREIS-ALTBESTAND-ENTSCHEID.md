# 3'622 Produkte auf CHF 14.90 — unter der gemessenen Frachtuntergrenze

> ## ⚠️ DIESER BERICHT WAR IN SEINER KERNAUSSAGE FALSCH — korrigiert am 23.08.2026
>
> Die zentrale Behauptung unten lautet: «Die Fracht hat eine gemessene Untergrenze von rund
> CHF 15, ein Produkt für CHF 14.90 liegt also unter den Kosten, selbst wenn die Ware gratis
> wäre.» **Das stimmt nicht.**
>
> Der Katalog-Audit vom 22.08. hat es widerlegt, und ich habe die Widerlegung selbst
> nachgeprüft, indem ich CJ direkt nach Frachtquoten gefragt habe (CN→CH, je 1 Stück):
>
> | Gewicht | gemessene Fracht | was ich behauptet hatte |
> |---:|---:|---:|
> | 20 g | **CHF 4.34** | «mindestens 15» |
> | 270 g | **CHF 8.17** | «mindestens 15» |
> | 840 g | CHF 16.38 | 17.09 |
> | 1250 g | CHF 25.22 | 23.77 |
>
> Für leichte Ware überschätzt die «Untergrenze» die Fracht um bis zum **3,5-fachen**. Zwei
> der vier Bestellmessungen, auf die ich mich berufen hatte, liegen selbst darunter: LX1013
> bestand aus zwei Sendungen zu **$6.34** und **$9.49**.
>
> **Der Denkfehler war ein Zirkelschluss.** Ich las die «Untergrenze» aus den Kostendaten des
> Katalogs ab — aber `cj_kosten_backfill.mjs` berechnet jede `unitCost` selbst mit
> `u·0.9 + max(15, …)`. Jede Kostenzahl war also per Konstruktion ≥ 15, und ich habe sie dann
> als Beleg für genau diese 15 verwendet. Eine Zahl, die aus der eigenen Annahme stammt,
> beweist die Annahme nicht.
>
> **Was daraus folgt:**
> * Die 3'622 Produkte auf CHF 14.90 sind **nicht pauschal Verlustware**. Bei leichter Ware
>   (Schmuck, Sticker, Kleinteile) trägt der Preis, und zwar auch im Gratis-Versand-Korb.
> * Das echte Problem ist **schwere Ware**. Die Kippgrenze liegt bei rund **600–750 g**.
>   Belegt: Fahrradsattel 1250 g, Ware $4.19, CJ-Frachtquote **$28.02** — der verliert
>   bei jeder Einzelbestellung Geld, egal welcher Warenkorb.
> * Eine pauschale Preiserhöhung auf CHF 16.90 hätte rund **2'200 Artikel verteuert, die in
>   jedem Warenkorb Gewinn bringen** (Schmuck +8 bis +10 CHF). Gut, dass sie nicht gelaufen ist.
> * Der Boden in `automation/cj_preis.mjs` steht seit dem 23.08. auf **CHF 5** statt 15.
>
> **Ohne Gewichtsdaten bleibt die Frage offen.** 45'700 von 45'741 aktiven Produkten tragen
> gar kein Gewicht — welche der 3'622 wirklich zu schwer sind, ist erst nach einem
> Gewichts-Backfill beantwortbar. Der Rest dieses Berichts steht unverändert da, damit die
> Fehlüberlegung nachvollziehbar bleibt; seine Zahlen sind mit dieser Korrektur zu lesen.

---

Stand 2026-08-22 · live gezählt, nicht aus einem Export

## Die Zahl

| Preisband (Tag `cj-real`, aktiv) | Produkte |
|---|---:|
| **genau CHF 14.90** | **3'622** |
| CHF 15.00 – 15.99 | über 10'000 (Shopify zählt nicht weiter) |
| CHF 16.90 – 17.99 | 5'858 |
| CHF 18.00 – 19.99 | 4'293 |

CHF 14.90 war der Preisboden der alten Formel. Er stammt aus einer Zeit, in der die Fracht
gar nicht im Preis steckte.

## Warum CHF 14.90 nicht tragen KANN

Die Fracht China→Schweiz hat eine **gemessene Untergrenze von rund CHF 15** — belegt an
Bestellung #1011 ($15.77) und bestätigt an LX1013 ($6.34 · $9.49 für die zwei Teilsendungen)
und LX1015 ($19.35). Damit gilt, unabhängig davon wie billig die Ware selbst ist:

    Stückkosten = Warenkosten + Fracht ≥ 0 + 15.00 = mindestens CHF 15.00

Ein Produkt für CHF 14.90 liegt also **unter den Kosten, selbst wenn die Ware gratis wäre**.
Das ist keine Schätzung über einzelne Artikel, sondern eine Untergrenze, die für alle gilt.

Es trägt sich heute nur über den Versanderlös:

| Warenkorb | Ergebnis je Artikel |
|---|---:|
| Einzelbestellung, Kunde zahlt CHF 7 Versand | **+ CHF 6.90** |
| Warenwert ab CHF 50 → Gratis-Versand | **− CHF 0.10** |
| dazu «2+ Artikel −10 %» | **− CHF 1.59** |

Genau die Warenkörbe, die der Shop mit Gratis-Versand und Mengenrabatt belohnt, sind bei
dieser Ware die verlustbringenden — und je mehr billige Artikel darin liegen, desto tiefer,
weil die Fracht **je Artikel** anfällt (CJ hat LX1013 in zwei Sendungen zerlegt und beide
einzeln berechnet).

## Was schon getan ist

* Die **Quelle** ist repariert: alle vier Importer rechnen seit heute mit derselben Formel
  aus `automation/cj_preis.mjs` (Boden CHF 16.90, Fracht nach Gewicht). Neue Ware kommt
  nicht mehr unter die Kosten.
* `preisboden.py` hält den Boden von CHF 14.90 — nachgezählt: **0 CJ-Produkte darunter**.
  Der Wächter arbeitet also, sein Boden ist nur zu tief angesetzt.

## Was NUR der Betreiber entscheiden kann

Den Altbestand neu zu bepreisen ist eine Geschäftsentscheidung, keine technische Korrektur:
es trifft beworbene Ware, Startseiten-Reihen und den Google-Feed, aus dem die Verkäufe kommen.
Drei Möglichkeiten:

1. **Boden auf CHF 16.90 anheben** (`preisboden.py`, dieselbe Mechanik wie am 12.08. bei
   2'355 Produkten). Wirkt sofort auf alle 3'622, macht die Ware aber ~13 % teurer.
2. **Nichts ändern und die Rabatte anpassen** — die Verluste entstehen erst durch
   «Gratis ab CHF 50» und «2+ −10 %». Wer schwere oder billige Ware davon ausnimmt,
   behält die Preise.
3. **Nur die schwere Ware anheben.** Braucht Gewichtsdaten; die kommen jetzt herein
   (Importer und Kosten-Backfill schreiben sie mit), sind aber erst bei einem Bruchteil
   des Bestands vorhanden.

⚠️ Was NICHT hilft: die Gratis-Versand-Schwelle anheben. Die Fracht fällt je Artikel an,
ein grösserer Korb aus billiger Ware häuft also mehr Fracht an, nicht weniger.
