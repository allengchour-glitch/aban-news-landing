# Händlerbedingungen im Produkttext (10.10.2026, Betreiber «weiter»)

## Gemessen

**Frischer Export mit Beschreibungen** (06:40 UTC, 52'348 aktive). Gesucht wurden Lieferantenpreise, Mindestmengen und Grosshandels-Sätze, gefunden 13 Produkte.

| Fall | Beispiel | Bewertung |
|---|---|---|
| Einkaufspreis in Yuan | Armband: «Für 10 Paare beträgt der Preis 40 yuan, für 50 Paare 35 yuan» | Lieferanten-Leak (Eiserne Regel 3) |
| Aufpreis in Yuan + Rückgabe-Ausschluss | Plateau-Sandalen: «für Sondergrössen wird ein Aufpreis von 10 Yuan erhoben, eine Rückgabe ist ausgeschlossen» | Leak, zudem gegen unsere 30 Tage Rückgabe |
| Mindestbestellmenge = Verkaufseinheit | 2 Stoffe «Mindestbestellmenge 10 Meter pro Muster», Dino-Stoff «halbes Yard» | **CJ-Variante ist «… 10M»** (USD 16.32 → CHF 58.90). Im Titel fehlte die Menge, eine Kundin erwartet 1 m |
| Echte MOQ | «MOQ100 Custom USB Rucksack», Text «Mindestbestellmenge von 100 Stück» | Schon der CJ-Name lautet «MOQ100». Einzeln womöglich nicht lieferbar |
| «Preis pro Stück» bei Packungstitel | Fortura «Schnauz schwarz · 6 Stück», «Rote Clownnase · 12 Stück», «Hawaiikette · 6 Stück» | Widerspricht dem Titel. Der Preis gilt für die Packung, der Text selbst sagt «Verkauf in Bündeln zu 12 Stück» |
| Bleibt | POD-T-Shirt «ohne Mindestbestellmenge» (eigener Text), «Yuan Coin Chips», «POPFEEL Yuan» (Namen), Stahlarmband «ohne Mindestbestellmenge» | korrekt |

**«Rückgabe ausgeschlossen» bewusst NICHT in der Regel.** Das kommt 18× vor und mischt zwei Fälle: unsere eigenen Hygiene-Hinweise (Bademode nach Entfernen der Versiegelung) und Lieferanten-Sätze («Grössen 41–48 sind Sonderanfertigungen und vom Umtausch ausgeschlossen»). Das ist eine Grundsatzfrage zur Rückgabe-Politik, siehe Offen.

## Getan

**Regel:** `automation/data/haendlerwort_regel.json` hat jetzt `bedingung_satz` und `bedingung_ausnahme`.
- Die Muster sind Mindestbestellmenge, MOQ, Zahl + Yuan/RMB (nicht «Yuan Coin»), Yuan/RMB + Zahl, ¥/￥ + Zahl und «Preis pro Stück/Stk./Paar».
- Die Ausnahme ist «ohne Mindestbestellmenge».
- Ein Treffer lässt **den ganzen Satz fallen**. Ein gefallener erster oder letzter Satz hinterlässt kein Leerzeichen.
- Beide Zwillinge lesen die Regel: `haendlerwort.py` (Bestand, täglich im Aufseher) und `haendlerwort.mjs` → `fallenSicher` (alle drei CJ-Importer).
- Kanarien: 110/110 in Python, 36/36 Text-Kanarien in JS. Neu sind 8: 4 müssen fallen, 4 müssen bleiben (ohne Mindestbestellmenge, Yuan Coin, POPFEEL Yuan, CHF-Preis).
- Gleichlauf py=js über 52'364 Proben: 0 Abweichungen.

**Quelle:** In `cj_copy_prompt.mjs` stehen unter «Bekannte Übersetzungsfallen» jetzt zwei Regeln:
- Händlerbedingungen (MOQ, Staffel- und Einkaufspreise, Aufpreise, Rückgabe-Ausschlüsse) weglassen.
- Eine Verkaufseinheit des Lieferanten («10M», «half yard», «6 pcs») kommt in den Titel.

**Bestand:**
- Stoffe von Hand: «Baumwoll-Twill-Stoff für Kinderbettwäsche **· 10 m**», «Baumwoll-Stoff für Kleider & Heimtextilien **· 10 m**», «Dinosaurier Baumwoll-Leinwandstoff **· 110 × 45 cm**». Der Text sagt jetzt, was geliefert wird, die Mindestmengen-Sätze sind weg. SEO-Titel wurden mitgezogen.
- **«MOQ100 Custom USB Rucksack» → Entwurf** mit Tag `cj-moq-100`. Er ist zurückholbar, sobald CJ eine Einzelbestellung bestätigt.
- Vorher-Sicherung: `dropship/_bedingung_vorher_2026-10-10.json`.
- `haendlerwort.py` SCHARF: **5 Texte, 5 ok** (Sandalen, Armband, 3 Fortura-Packungen). Rücklesen 3/3 ohne Treffer.

## Offen

- **Rückgabe-Ausschluss für Sonderanfertigungen** (CJ-Schuhe «Grössen 41–48 auf Bestellung gefertigt … vom Umtausch ausgeschlossen», mehrere Produkte) widerspricht der pauschalen 30-Tage-Zusage im Vertrauensblock. Dazu braucht es einen Entscheid: Ausnahme in der Rückgabe-Policy aufnehmen, oder diese Grössen nicht anbieten.
- «Kinder-Martin-Stiefel» → «Kinder-Worker-Stiefel» wäre eine Titel-Dublette. Ein Handtitel aus der Beschreibung steht noch aus (alter Fall vom 09.10.).
- «Mini Matt Dragon … Herrenarmband 25 mm» ist laut Beschreibung (Schrauben, Canvas, 25 mm) ein Uhrenband, steht aber im Schmuck-Zweig. Die Breitenregel greift dort absichtlich nur mit Uhrbezug.

## Lehre

**Eine «Mindestbestellmenge» im Lieferantentext ist oft die Verkaufseinheit.** CJ verkauft den Stoff in 10-m-Stücken. Wer den Satz nur streicht, verliert die Angabe, und die Kundin erwartet einen Meter. Deshalb gilt: erst bei CJ nachsehen, was eine Einheit ist. Diese Menge gehört in den Titel; der Bedingungssatz fällt.
