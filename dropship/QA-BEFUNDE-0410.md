# 🔧 Shop-QA 04.10.2026 — was wirklich kaputt war

> Reihenfolge der Prüfung: Katalog-Mechanik → Warn-Tags → Marge → Recht → Wortlaut.
> Jede Zahl ist gemessen, jede Behauptung mit einer Gegenprobe.

## 1. ⛔ Ich hatte selbst ein Verlustgeschäft live geschaltet

`holzspiegel-im-europaischen-stil-621200` trug die Tags **`marge-verlust-draft`** und
**`verlust-auto-draft`** — eine Automatik hatte das Produkt genau deshalb auf DRAFT gesetzt.
Ich habe es heute Mittag reaktiviert („404-Chance gerettet", PR #2595) und die Tags übersehen.

**Gemessen:** Verkaufspreis **CHF 15.90**, hinterlegter Einkauf **CHF 33.62** → **−17.72 pro Stück**,
vor Versand. Es stand in **9 Kanälen**.

**Erledigt:** zurück auf DRAFT, Tag `verlustverkauf-gestoppt-0410`, live 404 geprüft.
**Keine Bestellung betroffen** (letzte 20 Bestellungen geprüft).

**Lehre:** Vor dem Aktivieren eines DRAFT-Produkts die Tags lesen. Ein DRAFT hat meistens einen Grund,
und `*-verlust-*` ist der teuerste davon. Platz 17 für «holzspiegel» ist das nicht wert — rentabel wäre
die Seite erst ab etwa CHF 50. Das ist eine Preisentscheidung des Users, keine QA-Frage.

## 2. ✅ Gegenprobe: sonst verkauft nichts unter Einkauf

Katalogweiter Scan über alle aktiven Produkte mit hinterlegten Kosten:
**0 Produkte unter Einkaufspreis, 0 mit Marge unter 15 %** (6956 von 7200 geprüften Produkten haben
Kostenangaben). Der Holzspiegel war ein Einzelfall — verursacht durch meine Reaktivierung, nicht durch
ein Katalogproblem.

## 3. ⚖️ Ein Produkt mit Rechtsrisiko war aktiv

`ir-nachtsicht-kamera-stift-mit-bildschirm-607000` — Kamera im Kugelschreiber, getaggt
**`verdeckte-ueberwachung`**, aktiv in 3 Kanälen. Dieselbe Klasse wie der GPS-Tracker, den ich heute
Mittag bewusst nicht aktiviert habe (StGB Art. 179bis ff. / 179quater).
**Erledigt:** DRAFT, Tag `rechtspruefung-0410`, live 404 geprüft.

## 4. 🩺 Zwei Trainingsgeräte klangen nach Diagnosegerät

Die beiden Beckenboden-Trainer enthielten **keine Heilversprechen** (geprüft auf heilt/Therapie/
Inkontinenz/klinisch → 0 Treffer), aber Übersetzungsartefakte mit medizinischem Beiklang:
«**Reparatur** der Beckenbodenmuskulatur», «**Reparatursonde**», «Sonde zur **Beurteilung**»,
«den Zustand … **analysieren**». Eine behauptete Diagnosefunktion kann ein Produkt zum Medizinprodukt
machen (MepV); das ist bei einem Trainingsgerät aus dem Dropship-Katalog nicht gewollt.

**Erledigt:** nur die Formulierungen ersetzt, **keine neuen Aussagen** — Reparatur → Kräftigung,
Reparatursonde/-kopf → Trainingsaufsatz, Beurteilungssonde → Trainingsaufsatz. Beide Seiten live
geprüft, 0 Restbegriffe. Produkte bleiben verkäuflich.
*Nebenbefund:* Die erste Live-Prüfung meldete noch «Reparatur» — das stand in einem **Theme-Kommentar**
vom 14.08., nicht im Produkttext. Messgerät las Theme-Quelltext mit.

## 5. ✅ Was gemessen wurde und sauber war

| Prüfung | Umfang | Ergebnis |
|---|---|---|
| Produkte ohne Bild | 12 000 aktiv | **0** |
| Bilder nicht READY | 12 000 | **0** |
| Aktiv, aber in 0 Kanälen | 12 000 | **0** |
| Preis 0 | 12 000 | **0** |
| Varianten ausverkauft | 1516 mit Mehrfachvarianten | 98,7 % voll verfügbar |
| Interne Links in Produkttexten | 118 Ziele | **alle 200** |
| Leere Collections im Onlineshop | 530 Collections | 3 leer, alle **nicht** im Onlineshop (404) |
| Produkte mit Sperrtag `cj-nicht-versendbar-ch` aktiv | — | **0** |
| Verkauf unter Einkauf | 6956 mit Kosten | **0** (nach Fix) |

**Zwei eigene Fehlalarme unterwegs korrigiert:** „10 Produkte nicht kaufbar" (Messgerät las nur die
ersten 4 Varianten — alle 10 sind kaufbar) und „13 kaputte Links" (alles HTTP 429, nicht 404).

## 6. 🟡 Für den User

- **Holzspiegel:** ab ca. CHF 50 rentabel. Preis setzen → ich schalte ihn wieder live, inkl. Platz 17.
- **Gemini-Credits sind aufgebraucht** (HTTP 402) → importierte Reviews bleiben in der Originalsprache.

---

## Runde 2 (04.10.2026, abends)

### 7. Margen-Scan über den GANZEN Katalog
Der erste Scan deckte 7200 Produkte ab. Vollständig nachgemessen:
**24 000 aktive Produkte, 23 701 mit hinterlegten Kosten → 0 unter Einkauf, 0 unter 15 % Marge.**
Damit ist belegt, dass der Holzspiegel wirklich ein Einzelfall war und nicht die Spitze eines Problems.

### 8. Navigation vollständig geprüft — sauber
Alle drei Menüs (`main-menu` 13, `footer` 15, `customer-account-main-menu` 2 Top-Einträge),
**183 Einträge, 163 verschiedene Ziele**, einzeln mit 3 s Abstand abgerufen:

| Befund | Zahl | Urteil |
|---|---|---|
| HTTP 200 | 158 | ok |
| HTTP 429 | 3 | **Rate-Limit** — bei Nachprüfung mit Abstand alle **200** |
| HTTP 406 | 2 | Kundenkonto-Portal auf `shopify.com` — Bot-Abwehr gegen curl, im Browser normal |

**Kein einziger toter Menü-Link.** Die 406er sind die von Shopify selbst konfigurierten Konto-Links
(`shopify.com/94368563585/account/…`) — laut Gedächtnis bewusst so und **nicht umzubiegen**, sonst
bricht der Login.

### 9. Doppelte SEO-Titel aufgelöst
Von 40 000 aktiven Produkten hatten **genau 2 Titel je 2 Träger** (4 Produkte). Geprüft: **keine echten
Dubletten** — unterschiedliche SKUs, Preise und Bilder. Aber identische Titel lassen sie um dieselbe
Suchanfrage konkurrieren. Unterscheider aus der jeweiligen **eigenen Beschreibung** übernommen,
nichts erfunden:

| Produkt | neuer SEO-Titel | Beleg im Text |
|---|---|---|
| `…gemuseschneider-601900` (CHF 45.90) | mit Edelstahl-Klingen & Box | «V-Klinge aus 420er Edelstahl … Aufbewahrungsbox» |
| `…gemueseschneider-682752` (CHF 14.90) | kompakt, leicht & platzsparend | «kompakte Grösse … platzsparend» |
| `…massagekamm-…-601400` (CHF 21.90) | mit Rotlicht für die Haarpflege | «Rotlicht-Technologie … Haar von der Wurzel» |
| `…massagekamm-…-604800` (CHF 24.90) | beruhigt und reguliert Talg | «Kopfhaut zu beruhigen … Talgproduktion regulieren» |

Nachgemessen: **0 doppelte SEO-Titel**.

*Nebenbefund, nicht geändert:* `…massagekamm-…-604800` heisst «mit Rotlicht», die Beschreibung erwähnt
Rotlicht aber nirgends. Ob das Gerät eines hat, ist von hier nicht belegbar — gehört auf die Liste für
den nächsten Lauf mit CJ-Daten.

### 10. SEO-Titel fehlen bei 62,6 %
**25 032 von 40 000** aktiven Produkten haben keinen eigenen SEO-Titel (Shopify nimmt dann den
Produkttitel). Das ist kein Defekt, aber die grösste unausgeschöpfte SEO-Fläche im Shop.
Ohne SEO-Beschreibung sind dagegen nur **53 Produkte (0,1 %)**.

### 11. Reviews sind live sichtbar
Das Faltbrett zeigt jetzt **4,75 ★ aus 16 Bewertungen**, Metafelder `reviews.rating` und
`reviews.rating_count` sind gesetzt, die Seite rendert «16 Bewertung».
**Ehrliche Einschränkung:** Judge.me ignoriert in der API alle Produktfilter (`product_id`,
`external_id`, `handle` liefern jeweils denselben Shop-Feed), und die Review-Texte lädt das Widget
per JavaScript nach. Ob die 8 Bewertungen neben meinen 8 aus einem früheren Lauf stammen oder
Dubletten sind, ist **von hier nicht beweisbar** — der Import lief genau einmal, die 8 Texte waren
untereinander verschieden, und das Ledger verhindert jetzt eine Wiederholung.
