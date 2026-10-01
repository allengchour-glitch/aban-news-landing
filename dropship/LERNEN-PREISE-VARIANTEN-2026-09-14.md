# Die Marge von gestern galt für ein Achtel des Katalogs

**Datum:** 2026-09-14
**Auftrag:** Dauerauftrag (autonom, Ziel: Kunden die kaufen) — Fortsetzung der Preisrunde vom 13.09.
**Am Shop geändert:** ja — 13 Produkte neu bepreist, 5 aus dem Verkauf genommen.

Marken: **GEMESSEN** = hier nachgeprüft · **QUELLE** = fremde Angabe · **BEHAUPTUNG** = ungeprüft.

---

## Worum es geht

Gestern stand hier: *„Median-Rohmarge 58,9 % · Verkaufspreis unter Einkaufspreis: 4 von 231
(1,7 %)"*. Diese Runde wollte den offenen Punkt aus demselben Bericht nachholen — „die
restlichen Varianten-Preise desselben Produkts gegeneinander prüfen". Dabei ist die gestrige
Kernzahl gefallen.

## 🔴 Zwei blinde Flecken in der gestrigen Messung, beide gemessen

**1. Eine Zeile je Produkt misst die BILLIGSTE Variante.**
`tools/preis_marge.mjs` liest `sku,preis,kosten` — einen Einkaufspreis je Produkt. Bei Kleidern
und Schuhen steigt `unitCost` aber mit der Grösse. Beispiel Ballettschuhe: erste Variante
EK 9.80 (45 % Marge), letzte Variante EK 16.98 bei gleichem Preis 17.90 (5 %). **GEMESSEN in
Stichprobe B: Median-Rohmarge 23,4 % über die schlechteste Variante gegen 31,4 % über die
beste** — dieselben Produkte, 8 Prozentpunkte Unterschied allein durch die Lesart. Zwei
Verlustprodukte waren so überhaupt nicht zu sehen.

**2. Die gestrige Stichprobe war eine Generation, nicht der Katalog.**
**GEMESSEN:** `grep -c '^CJ-[0-9]' dropship/preise-kosten-2026-09-13a-vorher.csv` → **0** von
250 Zeilen. Gestern gemessen wurde ausschliesslich die ältere Importgeneration mit
Lieferanten-SKUs (`CJYD…`, `CJLY…`, `CJLX…`). **Alle 18 heute gefundenen Verlustprodukte tragen
das andere SKU-Schema `CJ-<pid>`** — die Massenimport-Generation, die gestern in keiner Zeile
vorkam. Die 58,9 % beschreiben also einen kuratierten Ausschnitt, nicht den Shop.

## Die neue Messung

`tools/varianten_preis.mjs` (**24 Selbsttests**) rechnet `kosten_max` gegen `preis_min` — die
schlechteste Variante, die ein Kunde tatsächlich in den Warenkorb legen kann. Zwei Stichproben
mit **verschiedener Sortierung**, damit die Sortierung nicht das Ergebnis erklärt:

| | A · alphabetisch | B · zuletzt geändert |
|---|---|---|
| Produkte | 120 | 120 |
| davon mit Einkaufspreis | 82 | 49 |
| Median-Rohmarge (schlechteste Variante) | **20,6 %** | **23,4 %** |
| 🔴 mindestens eine Variante unter EK | 6 (7,3 %) | 14 (28,6 %) |
| davon je-Produkt-Messung übersehen | 0 | 2 |
| 🟡 nach WELCOME10 unter 38 % Rohmarge | **53 von 82 (65 %)** | 19 von 49 (39 %) |

**Beide Stichproben widersprechen den 58,9 % deutlich.** Der Median liegt bei rund 21–23 %
Rohmarge — und `unitCost` enthält den Versand nicht, die echte Zahl liegt darunter. Die
Dropship-Nettomarge von 15–20 % (QUELLE, 13.09.) ist damit für diesen Teil des Katalogs
**nicht erreichbar**, nicht übertroffen.

**Die Verlustfälle sind keine Ausreisser, sie sind eine Klasse:** die Preise stehen auf den
Stufen 14.90 / 15.90 / 17.90 / 21.90, unabhängig vom Einkaufspreis. Das sieht nach einem
Import aus, der nach Kategorie bepreist hat statt nach Kosten. **BEHAUPTUNG** — belegt ist nur
das Muster, nicht seine Ursache.

---

## ✅ Geändert (live, jederzeit zurückdrehbar)

**Regel:** kleinster Preis auf der hauseigenen `x4.90/x9.90`-Leiter, bei dem **nach WELCOME10**
noch 38 % Rohmarge bleiben. Die Regel ist im Werkzeug als Selbsttest hinterlegt und
**reproduziert alle sieben Preisentscheidungen vom 13.09. exakt** — sie ist also keine neue
Erfindung, sondern die gestrige Regel, aufgeschrieben.

### Preis erhöht (13 Produkte, 45 Varianten)

| Produkt | vorher | nachher | EK (max) |
|---|---|---|---|
| 12-Zoll Steel Tongue Drum (3 Produkte) | 69.90 | **164.90** | 91.13 |
| Outdoor Camping Gaskocher | 41.90 | **84.90** | 46.49 |
| Dokumenten-Organizer, feuerfest | 32.90 | **79.90** | 44.32 |
| 10-in-1-Reinigungbürste | 42.90 | **79.90** | 44.27 |
| Yoga- und Fitnessmatte (8 Var.) | 21.90–22.90 | **54.90–79.90** | 43.53 |
| 3L Trinkbrunnen für Katzen (6 Var.) | 14.90–23.90 | **24.90–64.90** | 34.13 |
| 12-teiliges Silikon Küchenhelfer-Set | 28.90 | **54.90** | 30.16 |
| 10er-Pack Auto-Ladeadapter | 20.90 | **54.90** | 28.18 |
| Kabelmanagement-Tray | 24.90 | **49.90** | 27.31 |
| Nordische Nachttischlampe | 18.90 | **39.90** | 20.52 |
| Vielseitige Casual Damenschuhe (18 Var.) | 16.90 | **34.90** | 17.64 |

**Yogamatte und Trinkbrunnen bekamen Preise je Variante**, weil dort die Einkaufspreise
tatsächlich auseinanderliegen (29.51 bis 43.53 bzw. 12.68 bis 34.13). Ein Einheitspreis wäre
entweder unter Kosten oder unnötig teuer gewesen.

**Nachgemessen an der echten Seite, nicht an der API-Antwort:** Tongue Drum CHF 164.90,
Nachttischlampe 39.90, Reinigungbürste 79.90, Kabel-Tray 49.90 — alle HTTP 200.

### Aus dem Verkauf genommen (5 Produkte, auf DRAFT)

| Produkt | Preis / EK | Grund |
|---|---|---|
| Halbhelm für Kinder – UV-Schutz | 15.90 / 20.85 | **Schutzausrüstung mit „3C"-Kennzeichnung, nicht CE/EN 1078** |
| Elektroroller-Halbhelm | 15.90 / 19.97 | dasselbe |
| Mehrstufiges Abtropf- und Aufbewahrungsregal | 20.90 / 68.11 | **−226 % Marge**, Zielpreis 124.90 = Faktor 6, sperrig |
| Panda-Plüschkissen | 17.90 / 35.58 | Zielpreis 64.90 = Faktor 3,6, voluminös |
| 12-teiliges Edelstahl Kochtopf-Set | 59.90 / 87.69 | schweres Sperrgut — dieselbe Klasse, die im Juli CHF 869.62 Rückerstattung verursacht hat |

**Die beiden Helme sind der wichtigste Einzelbefund dieser Runde** und kein reines Preisthema:
ein Velo-/Rollerhelm ist persönliche Schutzausrüstung. Die Variantennamen nennen ausschliesslich
die chinesische Kennzeichnung („3C Helmet"); ein CE-Nachweis nach EN 1078 liegt im Shop nicht
vor. Beide waren zusätzlich Verlustprodukte — es gibt also keinen Grund, sie im Verkauf zu
lassen, bis das geklärt ist. **Nachgemessen: beide Seiten liefern jetzt HTTP 404.**

---

## ⚠️ Neue Messfalle — dieselbe Klasse wie `productsCount`

**GEMESSEN:** `products(query: "status:active")` lieferte ein Produkt zurück, dessen `status`
**DRAFT** ist (10er-Pack Auto-Ladeadapter, `15447562486145`, in null Kanälen publiziert,
Seite 404). Die Gegenprobe direkt danach arbeitet korrekt: `id:… AND status:active` → leer,
`id:… AND status:draft` → gefunden, `status:zzzgibtesnicht` → leer.

Der Suchindex hinkt also der Wahrheit hinterher. **Folge: eine Stichprobe über
`query:"status:active"` ist nicht garantiert aktiv.** Wer aus so einer Stichprobe einen
Prozentsatz „der aktiven Produkte" bildet, misst etwas anderes, als er schreibt. Von den 13
neu bepreisten Produkten sind **12 tatsächlich aktiv und live**, eines war schon Entwurf.

## Die Grenzen dieser Runde, ausdrücklich

1. **240 Produkte sind kein Katalog.** Die wahre Zahl aktiver Produkte bleibt unbekannt
   (`productsCount` deckelt bei 10000 und liefert mit und ohne Filter dieselbe Zahl). Aus
   „65 % unter der Zielmarge" darf **keine** Katalogzahl hochgerechnet werden.
2. **Behoben sind 18 Produkte. Die Klasse ist nicht behoben.** Wenn das Muster hält, stehen
   im Katalog hunderte Produkte unter der Zielmarge. Das ist die Arbeit der nächsten Runde —
   und sie braucht einen Skriptweg, nicht 18 Einzelmutationen.
3. **`unitCost` enthält den Versand nicht.** Jede Marge hier ist eine Obergrenze.
4. **Preise hochzusetzen kann Verkäufe kosten.** Bewusst in Kauf genommen: ein Verkauf mit
   Verlust ist keiner, den man behalten will. Alle Vorher-Werte stehen in den CSV-Dateien.

## Was als Nächstes zu messen wäre

1. **Die Klasse abräumen statt Einzelfälle:** alle Produkte mit SKU-Schema `CJ-<pid>` durchgehen
   und nach derselben Regel neu bepreisen. Braucht `SHOPIFY_CLIENT_ID`/`_SECRET`/`SHOPIFY_SHOP`
   als Env-Werte, damit ein Skript das selbst tut.
2. **Die 71 bzw. 38 Produkte ohne Einkaufspreis** (POD, BigBuy) nachtragen — ihre Marge ist
   dauerhaft unbekannt.
3. **Weitere Schutzausrüstung suchen:** wenn zwei Helme mit „3C" im Katalog stehen, stehen
   vermutlich mehr. Noch nicht gemessen.

## Nachprüfen

```
node tools/varianten_preis.mjs --selbsttest                                      # 24 Pruefungen
node tools/varianten_preis.mjs dropship/preise-varianten-2026-09-14a-alphabetisch.csv
node tools/varianten_preis.mjs dropship/preise-varianten-2026-09-14b-neueste.csv
grep -c '^CJ-[0-9]' dropship/preise-kosten-2026-09-13a-vorher.csv                # → 0
```
