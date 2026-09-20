# Der führende Stern wird stillschweigend weggeworfen — und deshalb waren es nie 32 Helme

**Datum:** 2026-09-20
**Auftrag:** Dauerauftrag („weiter").
**Am Shop geändert:** 22 Produkte / 175 Varianten neu bepreist, **alle 22 an der echten Seite
nachgemessen**. 3 Produkte bewusst nur gemeldet, nicht gesetzt.
**Am Werkzeug geändert:** `tools/schutzausruestung.mjs` 19 → **29 Selbsttests** (Kindersitz-Normen
+ Drosselung ist kein Messergebnis).

Marken: **GEMESSEN** = hier nachgeprüft · **QUELLE** = fremde Angabe · **BEHAUPTUNG** = ungeprüft.

---

## 🔴 Der Hauptfund: `title:*wort*` sucht nicht, was es zu suchen scheint

Die Zahlen passten nicht zusammen. `productsCount` meldete für `title:*helm*` **77** aktive
Produkte — aber die Einzelabfragen ergaben zusammen **92**:

| Abfrage | Treffer |
|---|---|
| `title:*helm*` | 77 |
| `title:*velohelm*` | 29 |
| `title:*fahrradhelm*` | 38 |
| `title:*reithelm*` / `*skihelm*` / `*motorradhelm*` / `*radhelm*` | 10 / 5 / 9 / 1 |

Eine Teilmenge kann nicht grösser sein als die Menge. **Die entscheidende Einzelmessung:**

```
products(query:"id:15448951587201")                      -> „Velohelm für Kinder und Erwachsene"
products(query:"title:*velohelm* AND id:15448951587201") -> gefunden
products(query:"title:*helm*     AND id:15448951587201") -> LEER
```

Das Produkt existiert, heisst „Velohelm" — und `title:*helm*` findet es nicht.

**Der Mechanismus, gemessen:**

```
title:*velohelm*  = 29      title:velohelm*  = 29
title:*helm*      = 77      title:helm*      = 77
title:velohelmzzz* = 0   (Gegenprobe: der Filter wird gelesen)
```

**Der führende `*` ist wirkungslos — er wird stillschweigend verworfen.** Shopify zerlegt den
Titel in Wörter und vergleicht nur **Wortanfänge**. `helm*` findet „Helm für …", niemals
„Velohelm". Dass `*velohelm*` funktioniert, liegt allein daran, dass dort ein ganzes Wort mit
„velohelm" beginnt.

**Das ist dieselbe Klasse wie der ignorierte Preisfilter vom 19.09.:** eine Abfrage, die
aussieht, als filtere sie, tut etwas anderes — ohne Fehlermeldung.

### Was das rückwirkend bedeutet

Der Bericht vom 19.09. nennt **„mindestens 40 Treffer auf `title:*helm*`, davon 32 echte
Helme"** und vermerkt als Grenze, die Suche finde „Velohelm"/„Fahrradhelm" nicht zuverlässig.
Das war richtig geahnt und ist jetzt belegt — mit einer anderen Grössenordnung als vermutet.

**GEMESSEN: es sind 123 echte Schutzhelme, nicht 32.** Aus der Vereinigung von `helm*`,
`velohelm*`, `fahrradhelm*`, `radhelm*`, `reithelm*`, `skihelm*`, `motorradhelm*`,
`kinderhelm*`, `schutzhelm*` und weiteren: 173 Treffer, davon **16 Kostümhelme** des
Party-Lieferanten (Wikinger, Astronaut, Discokugel — keine Schutzausrüstung) und **34 Zubehör**
(Halterung, Leuchte, Tasche, Rucksack, Headset, Polsterung, Visier). **91 der 123 waren nie
geprüft.**

⚠️ **Auch 123 ist eine Untergrenze.** Wer eine Wortanfang-Suche benutzt, findet nur, woran er
vorher gedacht hat. Ein „Bollenhelm" oder „Crosshelm" fiele weiter durch.

---

## 🟢 Zum ersten Mal ein positiver Befund: drei Seiten nennen EN 1078

Am 19.09. waren es **0 von 32**. Jetzt, über die volle Klasse:

```
Geprueft: 123 Produktseiten
  europaeische Norm genannt : 3
  NUR chinesische Kennzeichnung (BEFUND): 0
  keine Angabe (KEIN Befund, Dokumentationsluecke): 119
  Seite fehlt: 0 · gedrosselt: 1
```

Die drei Belegstellen, wörtlich aus dem sichtbaren Text:

- `falt-helm-fur-scooter-fahrrad` — „…mit **Zertifizierung nach CE EN 1078 und CPSC**."
- `faltbarer-fahrradhelm` — „**CE EN 1078 zertifiziert** fuer eine hohe Sicherheit"
- `smarter-velohelm-mit-led-beleuchtung` — „Er erfüllt die **CPSC- und CE-Sicherheitsstandards**"

**Warum das zählt:** es beweist, dass die Produktbeschreibungen eine Norm **tragen können**. Das
Schweigen der anderen 119 ist also keine technische Eigenschaft des Shops, sondern eine Lücke in
den Lieferantendaten. Gleichzeitig ändert es nichts an der Regel vom 19.09.:
**Schweigen ist kein Beweis** — die 119 bleiben „unbekannt", nicht „unzertifiziert", und
**kein Produkt wurde deswegen aus dem Verkauf genommen.**

---

## ⚠️ Ein Defekt im eigenen Messgerät, der ein Drittel der Klasse verschluckt hat

Der erste Lauf über 123 Seiten meldete **43 „unerreichbare" Seiten**. Das sah nach toten
Produktseiten aus. **GEMESSEN: alle 43 waren HTTP 429 — Drosselung.** Mit 400 ms Pause und
Wiederholung: **122 × HTTP 200, 1 × 429.**

`tools/schutzausruestung.mjs` warf beides in einen Topf. Ein Gerät, das die eigene
Abruffrequenz als „Seite existiert nicht" meldet, erzählt eine falsche Geschichte über den Shop.
**Behoben:** `GEDROSSELT = {429, 430, 503}` wird wiederholt und getrennt ausgewiesen
(`gedrosselt` statt `fehlt`), Pause 150 → 400 ms. Drei Selbsttests sichern die Trennung.

## ✅ Werkzeug erweitert: Kinderrückhaltesysteme

Die Normfrage betrifft nicht nur Helme. Neu erkannt werden **UN ECE R44**, **UN ECE R129** und
**i-Size**. Vier Gegenproben verhindern Fehlalarme, die hier teuer wären:
„Grösse 44", „Länge 129 cm" und „Modell R129 schwarz" bleiben **unbekannt** — eine blosse Zahl
ist keine Norm.

---

## 💰 Die Preise: 11 von 32 gingen nach dem Gutschein mit Verlust raus

Gemessen über die **schlechteste kaufbare Variante** (`kosten_max` gegen `preis_min`), Regel
unverändert `zielpreis()` aus `tools/varianten_preis.mjs`.

**Das ist die schlechteste Quote, die hier je gemessen wurde** — 13.09. waren es 4 von 231 im
Katalog, 14.09. 6 von 82 bzw. 14 von 49. Hier: **11 von 32 unter null, 25 von 32 unter 38 %.**

### ⛔ Bewusst NICHT gesetzt — Faktor über 3, das gehört einem Menschen

| Produkt | Preis | EK (max) | Marge nach WELCOME10 | Zielpreis wäre |
|---|---|---|---|---|
| Sommer-EisSilk Autositze-Polster | 14.90 | 33.23 | **−147,8 %** | 59.90 (Faktor 4,0) |
| Autositzkissen mit Lendenwirbelstütze | 17.90 | 38.51 | **−139,0 %** | 69.90 (Faktor 3,9) |
| **Kinder-Autositz Portabel 3-12 J.** | 14.90 | 25.07 | **−87,0 %** | 49.90 (Faktor 3,3) |

Diese drei sind nicht falsch bepreist, sie sind falsch importiert. **Der Kinder-Autositz ist
der Fall, der eine eigene Entscheidung braucht:** ein Kinderrückhaltesystem für CHF 14.90, dessen
Seite **keine Zulassung nach ECE R44 oder R129 nennt**. Nach der Regel vom 19.09. nehme ich ihn
nicht auf Verdacht aus dem Verkauf — aber er gehört zuoberst auf die Lieferantenfrage.

### ✅ Geändert (live, jederzeit zurückdrehbar) — 22 Produkte / 175 Varianten

| Produkt | vorher | nachher | EK max | Var. |
|---|---|---|---|---|
| Heizkissen für Autositz | 15.90 | **44.90** | 23.90 | 1 |
| Velohelm mit integriertem Licht | 19.90 / 33.90 | **29.90 / 54.90** | 16.87 / 29.17 | 30 |
| Memory Foam Sitzkissen | 14.90 | **39.90** | 21.49 | 1 |
| Winter-Velohelm Anti-Beschlag | 15.90 | **44.90** | 22.81 | 16 |
| Velohelm mit integriertem Warnlicht | 23.90 | **44.90** | 23.91 | 16 |
| Velohelm Warnlicht + Bluetooth | 43.90 | **74.90** | 40.81 | 4 |
| Velohelm für Kinder und Erwachsene | 15.90 | **29.90** | 14.68 | 25 |
| Velohelm für E-Bikes | 15.90 | **29.90** | 14.51 | 6 |
| Schwimmweste Herren | 33.90 | **54.90** | 29.08 | 1 |
| Hunde-Schwimmweste | 23.90 | **39.90** | 20.16 | 1 |
| Fahrradhelm mit Schutzbrille und Licht | 17.90 | **29.90** | 14.87 | 1 |
| Autositzkissen | 15.90 | **24.90** | 13.09 | 5 |
| Tragbarer Kindersitz | 15.90 | **24.90** | 13.02 | 10 |
| Velohelm City/Freizeit/Sport | 18.90 | **24.90** | 13.89 | 4 |
| Radhelm mit integrierten Schutzbrillen | 29.90 | **39.90** | 21.46 | 1 |
| Autositzschutz | 23.90 | **34.90** | 16.93 | 1 |
| Kinder Velohelm Cartoon-Motive | 23.90 | **29.90** | 16.18 | 28 |
| Velohelm UV-Schutz + Sonnenblende | 35.90 | **44.90** | 23.92 | 2 |
| Smarter Velohelm Dual Control | 82.90 | **99.90** | 55.23 | 4 |
| Velohelm für Kinder, Cartoon-Design | 32.90 | **39.90** | 20.32 | 6 |
| Kinder-Velohelm Skate & Roller | 15.90 | **19.90** | 9.45 | 5 |
| Kinder Velohelm mit Magnetbrille | 20.90 | **24.90** | 11.90 | 7 |

**Der Velohelm mit integriertem Licht bekam zwei Preise**, weil die Einkaufspreise dort wirklich
in zwei Stufen liegen (16.87 und ~29) — wie bei Yogamatte und Trinkbrunnen am 14.09.

**Sieben lagen unter dem Einkaufspreis**, vier davon nach dem Gutschein knapp darunter. Darunter
**drei Kinderartikel** und eine **Schwimmweste**.

---

## Wie die Regel vom 19.09. sich bezahlt gemacht hat

Am 19.09. hatte ich zwölf Produkte geplant und nur zehn gesendet — Shopify meldete korrekt
`userErrors: []`, weil das Gesendete gültig war. Daraus wurde die Pflicht, **jedes** geänderte
Produkt an der echten Seite nachzumessen.

Diesmal: die Mutation wurde **aus Daten erzeugt statt von Hand geschrieben** (22 Produkte,
175 Varianten, Variantenzahl je Produkt vorab gegen die Live-Abfrage geprüft), und danach alle
22 Kundenseiten abgefragt: **22 von 22 bestätigt, 0 abweichend.**

⚠️ **Und das Prüfgerät hat zuerst selbst falschen Alarm geschlagen: 22 von 22 „abweichend".**
Grund: Python schreibt `44.9`, verglichen wurde gegen die Zeichenkette `44.90`. Der Shop war
nie falsch, der Vergleich war es. **Die Gegenprobe gehört auch ins Prüfgerät** — jetzt wird in
Rappen (ganzzahlig) verglichen und ein absichtlich falscher Sollwert muss ausschlagen.

---

## Zweiter Block: die 38 Fahrradhelme — und eine Unschärfe in meiner eigenen Regel

Nach den Velohelmen der nächstgrösste ungemessene Block. **GEMESSEN (33 mit bekanntem
Einkaufspreis, 4 ohne):**

| | |
|---|---|
| Verlust nach WELCOME10 | **1 von 33** |
| unter 38 % nach WELCOME10 | 10 von 33 |
| bereits in Ordnung | **19 von 33** |
| Faktor über 3 | 0 |

**Dieser Block ist deutlich gesünder als die Velohelme** (dort 11 Verluste bei 32). Dass die
beiden Gruppen so weit auseinanderliegen, stützt die Vermutung vom 14.09.: bepreist wurde nach
Importcharge, nicht nach Einkauf.

### ⚠️ Unschärfe in der eigenen Regel, hier zum ersten Mal aufgefallen

`zielpreis()` liefert die kleinste Sprosse der Leiter (`x4.90/x9.90`), bei der nach WELCOME10
38 % bleiben. Daraus folgt aber **nicht**, dass jeder Preis unterhalb dieser Sprosse zu tief ist:

| Produkt | Preis | EK | Marge nach WELCOME10 | `zielpreis()` |
|---|---|---|---|---|
| Fahrradhelm aus PC+EPS | 45.90 | 25.50 | **38,3 %** | 49.90 |
| Fahrradhelm LED-Rücklicht | 66.90 | 36.57 | **39,3 %** | 69.90 |
| Ultralight Fahrradhelm | 38.90 | 20.66 | **41,0 %** | 39.90 |
| Fahrradhelm Stadt | 23.90 | 12.23 | **43,1 %** | 24.90 |

Diese vier **erfüllen das Ziel bereits** — ihr Preis steht nur zwischen zwei Sprossen. Ein
naives „`zielpreis` > Preis → anheben" hätte sie angefasst: vier Preiserhöhungen für 0,3 bis
5 Prozentpunkte, also Unruhe im Laden ohne Gegenwert.

**Regel geschärft: entscheidend ist die gemessene Marge, nicht die Sprossenlage.** Angehoben
wird, was **unter** dem Ziel liegt.

**`automation/preis_korrektur.mjs` ist nachgezogen (15 → 30 Selbsttests).** Das war der
billigste mögliche Zeitpunkt: das Skript wartet auf Zugangsdaten und ist noch nie gelaufen —
mit dem alten Kriterium hätte sein erster Lauf über den **ganzen Katalog** hunderte gesunde
Produkte angefasst.

⚠️ **Dabei fiel ein Selbsttest um, und er hatte unrecht, nicht der neue Code.** Der Test vom
19.09. lautete „genau auf dem Ziel → nichts, ein Rappen darunter → Änderung" und prüfte gegen
die **Sprosse**: bei EK 10.00 ist `zielpreis()` = 19.90, verlangt war also eine Anhebung bei
19.89. **Gemessen ergibt 19.89 bei EK 10.00 aber 44,1 % nach dem Gutschein** — sechs Punkte
über dem Ziel. Der Test schrieb fest, dass gesunde Produkte angefasst werden. Ersetzt durch
eine Grenze an der **Marge**: genau auf 38 % → nichts, zwei Rappen darunter → Änderung, und
beide Seiten belegen zusätzlich die tatsächliche Marge. Ein eigener Test hält fest, dass die
alte Sprossen-Grenze **nicht mehr** anfasst.

### ✅ Geändert (live) — 10 Produkte / 25 Varianten

| Produkt | vorher | nachher | EK max | Marge vorher |
|---|---|---|---|---|
| Fahrradhelm für Herren | 15.90 | **29.90** | 15.40 | **−7,6 %** |
| Integrierte Fahrradhelm-Brille | 19.90 | **34.90** | 17.84 | 0,4 % |
| Einheitliches Fahrradhelm (4 Var.) | 14.90 | **24.90** | 13.35 | 0,4 % |
| Fahrradhelm für Mountainbiken | 14.90 | **24.90** | 12.92 | 3,7 % |
| Fahrradhelm mit integriertem Licht | 15.90 | **24.90** | 13.34 | 6,8 % |
| Integrierte Fahrradhelme | 17.90 | **29.90** | 14.67 | 8,9 % |
| Vielseitiger Outdoor-Fahrradhelm (7 Var.) | 14.90 | **24.90** | 12.03 | 10,3 % |
| Gradient-Fahrradhelm | 18.90 | **29.90** | 14.14 | 16,9 % |
| Fahrradhelm Polsterung für Pendler | 46.90 | **59.90** | 31.35 | 25,7 % |
| Vielseitiger Outdoor-Fahrradhelm verst. (7 Var.) | 15.90 | **19.90** | 10.57 | 26,1 % |

**Alle zehn an der echten Seite nachgemessen: 10 von 10 bestätigt, 0 abweichend**, plus
Gegenprobe mit absichtlich falschem Sollwert.

### ⚠️ Der Suchindex servierte einen veralteten Titel

`products(query:"title:fahrradhelm*")` lieferte **„Unisex-Fahrradhelm für Erwussse"**,
`nodes(ids:)` für dasselbe Produkt **„Unisex-Fahrradhelm für Erwachsene"**. Der Titel ist also
längst korrigiert, nur der Index hinkt nach — dieselbe Verzögerung wie am 14.09., nur in der
anderen Richtung. **Wer über Titel berichtet, fragt das Produkt direkt.** Die Adresse trägt den
Tippfehler weiterhin (`…-fur-erwussse-…`); **bewusst nicht geändert**, ein Handle-Wechsel bricht
bestehende Verweise für einen kosmetischen Gewinn.

---

## Dritter Block: Reit-, Ski- und Motorradhelme — der schlechteste von allen

22 Produkte mit bekanntem Einkaufspreis. **GEMESSEN:**

| | Velohelme | Fahrradhelme | Reit/Ski/Motorrad |
|---|---|---|---|
| Verlust nach WELCOME10 | 11 von 32 | **1 von 33** | **8 von 22** |
| unter 38 % | 25 von 32 | 10 von 33 | **19 von 22** |
| bereits in Ordnung | 7 | **19** | **3** |

**Drei Gruppen derselben Produktklasse, drei völlig verschiedene Bilder.** Das ist der bisher
stärkste Beleg für die Vermutung vom 14.09.: bepreist wurde nach **Importcharge**, nicht nach
Einkauf. Wer eine Gruppe misst und daraus auf den Katalog schliesst, liegt in beide Richtungen
falsch — genau der Fehler, den die 58,9 % vom 13.09. gemacht haben.

### ✅ Geändert (live) — 19 Produkte / 43 Varianten

| Produkt | vorher | nachher | EK max | Marge vorher |
|---|---|---|---|---|
| Ganzjahres E-Motorradhelm (4 Var.) | 15.90 | **34.90** | 18.74 | **−31,0 %** |
| Motorradhelm-Tasche | 26.90 | **59.90** | 31.50 | **−30,1 %** |
| **Kinder-Schutzhelm** | 18.90 | **39.90** | 21.11 | **−24,1 %** |
| Leichter Reithelm | 18.90 | **39.90** | 21.00 | **−23,5 %** |
| Motorradhelm mit Doppelscheibe | 46.90 | **89.90** | 47.84 | **−13,3 %** |
| Skihelm Indoor/Outdoor (8 Var.) | 32.90 | **59.90** | 32.31 | **−9,1 %** |
| Motorradhelm-Rucksack Carbon | 50.90 | **89.90** | 47.80 | **−4,3 %** |
| Reithelm Outdoor-Reitsport (3 Var.) | 25.90 | **44.90** | 23.44 | **−0,6 %** |
| Reithelm F-659 M/L | 30.90 | **49.90** | 27.46 | 1,3 % |
| Aluminium-Schutzhelm Ingenieure | 42.90 | **69.90** | 37.37 | 3,2 % |
| Kühlwind-Reithelm | 41.90 | **64.90** | 35.86 | 4,9 % |
| Skihelm-Überzug mit Visier | 46.90 | **69.90** | 37.40 | 11,4 % |
| Motorradhelm-Wandhalter | 15.90 | **24.90** | 12.30 | 14,0 % |
| Reithelm Sommer | 48.90 | **69.90** | 36.50 | 17,1 % |
| Skihelm mit Visier (2 Var.) | 63.90 | **84.90** | 47.24 | 17,9 % |
| Reithelm Erwachsene/Kinder (9 Var.) | 40.90 | **54.90** | 30.21 | 17,9 % |
| Reithelm verstellbar (3 Var.) | 58.90 | **74.90** | 40.08 | 24,4 % |
| Reithelm-Visier (2 Var.) | 25.90 | **34.90** | 16.91 | 27,5 % |
| Kühl-Luft Reithelmpolsterung | 25.90 | **34.90** | 16.74 | 28,2 % |

**Acht standen unter dem Einkaufspreis**, darunter erneut ein **Kinder-Schutzhelm** (18.90 bei
EK 21.11). **Alle 19 an der echten Seite nachgemessen: 19 von 19 bestätigt, 0 abweichend**, plus
Gegenprobe mit absichtlich falschem Sollwert.

---

## 📦 Nebenbefund, der einen alten Posten schliesst: die BigBuy-Klasse ist aus dem Verkauf

Das Gedächtnis führt seit dem 12.09. als grössten offenen Punkt: *„279 aktive BigBuy-Produkte,
KEINES mit Gewicht, darunter Markenware"* — die Quelle der drei unerfüllbaren Bestellungen über
**CHF 869.62**.

**GEMESSEN, drei unabhängige Wege, jeder mit Gegenprobe:**

| Weg | aktiv | Gegenprobe |
|---|---|---|
| `products(query:"sku:bb-* AND status:active")` | **0** | `sku:CJ-* AND status:active` → Treffer · `sku:zzzgibtesnicht-*` → leer |
| `products(query:"tag:bigbuy AND status:active")` | **0** | `tag:bigbuy` ohne Status → Treffer · `tag:zzzgibtesnichttag` → leer |
| `productsCount(query:"tag:bigbuy AND status:active")` | **0** | `tag:zzzgibtesnichttag` → 0 |

Dazu die **Kundensicht**: zwei BigBuy-Adressen liefern **404**, eine liefert **301 auf eine
Collection** — kein kaufbares Produkt. Und direkt über `nodes(ids:)`, also **ohne Suchindex**:
`status: DRAFT`, `publishedAt: null`. Über 500 geblätterte BigBuy-Produkte, **alle DRAFT**.

**Die Klasse ist erledigt, der Gedächtnis-Eintrag war veraltet.** Kein Handlungsbedarf.

⚠️ Dabei eine Präzisierung der Zähl-Regel vom 13.09.: **`productsCount` ignoriert NUR den
Preisfilter.** `tag:`, `sku:`, `status:` und `title:` werden sehr wohl gelesen und liefern
echte Zahlen (77, 29, 38, 0 …). Die Regel heisst also nicht „traue keinem `…Count`", sondern
**„traue keinem Preisfilter"** — und prüfe jeden Filter mit einem Unsinn-Wert gegen.

---

## 🟡 Nur der User

1. **Bei CJ nachfragen** — Prüfbericht nach **EN 1078** (Velo/Skate), **EN 1077** (Ski),
   **EN 1385** (Wassersport), **EN ISO 12402** (Schwimmweste) und vor allem
   **ECE R44 / R129** für die Kindersitze. Liegt er vor → Norm in die Beschreibungen.
   Liegt er nicht vor → dann gehören die betroffenen Produkte aus dem Verkauf.
   **Zuoberst: der Kinder-Autositz Portabel 3-12 J.**
2. **Die drei Faktor-über-3-Produkte entscheiden** (oben) — Preis vervierfachen oder auslisten.
3. **`SHOPIFY_SHOP` / `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET`** — unverändert der grösste
   Hebel: damit läuft `automation/preis_korrektur.mjs` über den **ganzen** Katalog statt zwei
   Dutzend Produkte je Sitzung, **und** `automation/homepage_slim.mjs`.

## Die Grenzen dieser Runde

1. **123 Helme sind eine Untergrenze** — eine Wortanfang-Suche findet nur, woran man denkt.
2. **Von den 123 haben erst 32 + die hier bepreisten eine Margenmessung.** Der Rest ist
   ungemessen; bei 11 Verlustfällen unter 32 ist dort mit weiteren zu rechnen.
3. **Die Normfrage bleibt offen**, nicht beantwortet.
4. **Preise hochzusetzen kann Verkäufe kosten.** Bewusst in Kauf genommen; alle Vorher-Werte
   stehen oben, jede Änderung ist zurückdrehbar.

## Nachprüfen

```
node tools/schutzausruestung.mjs --selbsttest                                  # 29 Pruefungen
node tools/schutzausruestung.mjs --datei dropship/schutzausruestung-handles.txt # 123 Seiten
node tools/varianten_preis.mjs --selbsttest                                    # 24 Pruefungen
node automation/preis_korrektur.mjs --selbsttest                               # 15 Pruefungen
```

Die Sternchen-Falle selbst, in einer einzigen Abfrage:

```graphql
{ a: products(first:3, query:"title:*helm* AND id:15448951587201"){nodes{title}}
  b: products(first:3, query:"title:*velohelm* AND id:15448951587201"){nodes{title}} }
```
`a` ist leer, `b` findet „Velohelm für Kinder und Erwachsene".
