# 🛒 Google Merchant — gemessener Stand, 2026-10-17

Alle Zahlen live aus dem Shop (`au3j0y-hq`), nicht aus dem Gedächtnis. Wiederholbar:
`/opt/node22/bin/node automation/gmc_audit.mjs` (nur lesen, ändert nichts).

---

## 1. Was im Feed-Generator falsch war (behoben)

`automation/autopilot/merchant_feed.mjs` lief, aber lieferte einen schwachen Feed:

| Befund | gemessen | jetzt |
|---|---|---|
| `identifier_exists: no` bei **jedem** Artikel | **97 %** der Fortura-Ware hat einen Barcode (1569 von 1611) | echte `g:gtin`, sonst `g:mpn`, erst dann `no` |
| `google_product_category` fehlte ganz | **100 %** der zuletzt geänderten 600 haben das Metafeld | wird aus `mm-google-shopping` gelesen |
| keine Versandangabe | Merchant Center meldete „Missing shipping info in some countries" (56 Fälle) | `g:shipping` CH 7.00 CHF (Betrag per `VERSAND_PREIS`) |
| **450 von 3932 Artikeln teilten sich eine Feed-ID** | CJ vergibt dieselbe Varianten-SKU mehrfach; der Generator nahm `sku \|\| handle` | ID = `handle` (eindeutig), SKU wandert in `g:mpn`; Doppel werden gezählt und genannt |
| Filter nur über eine Titelliste (`nike\|adidas\|…`) | die Sperrtags des Katalogs las niemand | `kanal_sperren.mjs` + Marken-/Safety-Muster |
| bei Drosselung stiller Abbruch | — | `shopify_gql.mjs` (wachsende Pausen), jeder Grund wird gezählt und ausgegeben |

Gegenprobe nach dem Umbau: **3932 Artikel von 4000 geprüften, 0 doppelte IDs, keine fehlenden
Pflichtfelder, XML wohlgeformt** (36 wegen Sperrtag ausgelassen, 32 wegen Marken-/Safety-Risiko).

### Zwei Fehler, die erst der scharfe Lauf zeigte

**a) `rueckhol` im Sperrmuster hätte 78 % des Katalogs aus dem Feed geworfen.**
`automation/lib/kanal_sperren.mjs` (vom selben Tag) meinte `raucher-rueckhol-0809` — Tabakware,
64 aktive Artikel, **0 davon auf dem Google-Kanal**, also eine echte Sperre. Getroffen hat das
Muster aber auch `rueckhol-0907`: eine reine Chargen-Markierung, die **über 10 000 aktive Produkte**
tragen und die auf Google **und** TikTok publiziert sind. Der erste Feed-Lauf warf deshalb
**3142 von 4000** Artikeln weg. Das wäre stumm geblieben — „weniger Artikel im Feed" sieht harmlos
aus. Muster auf `raucher-rueckhol` verengt, Test mit Gegenprobe in beide Richtungen.

**b) Zwei echte Google-Sperrtags fehlten im Muster:** `nicht-google-bewerben` (34 Artikel) und
`google-policy-flag` (38). Das alte `nicht-bewerben` passt auf `nicht-google-bewerben` **nicht** —
es steht ein Wort dazwischen. Ein Wächter mit `INCLUDE_GOOGLE=1` hätte genau die Artikel in den
Merchant-Feed zurückgeschoben, die dort absichtlich fehlen. Gegenprobe am alten Muster: beide `false`.

---

## 2. Die Kanal-Lücke: 1890 Artikel, und was wirklich dahintersteckt

**Vollzählig ausgewertet** (nicht per Stichprobe — dazu unten):

| | Anzahl |
|---|---|
| aktive Produkte **nicht** auf „Google & YouTube" | **1890** |
| davon mit echtem Sperrtag | **201 (10,6 %)** |
| davon **ohne** jeden Sperrtag | **1689** |
| davon Fortura (Schweizer Lager, Kostüme) | **1604** |

Die 1689 ohne Sperrtag sind fast vollständig **ein einziger Import**: die Fortura-Ware vom 23.07.
Von 2376 aktiven Fortura-Artikeln liegen nur **765 auf dem Google-Kanal**, 1611 nicht.

**Und genau diese Gruppe ist das beste Shopping-Material, das der Shop hat:**
**1569 von 1611 haben einen Barcode (97 %)** — Google kann sie also einem echten Produkt zuordnen.
Dazu Schweizer Lager, 2–3 Werktage Lieferzeit. Der Rest des Katalogs hat **0 % GTIN**.

**Aber nicht blind freigeben, drei gemessene Haken:**
- **104 der 1611** fallen unter das Marken-/Safety-Muster, **21 tragen einen Lizenznamen im Titel**
  (Harry Potter, Batman, Paw Patrol, Pokémon Pikachu, Peppa). Lizenzkostüme sind der klassische Grund
  für eine Merchant-Kontosperre. Der neue Feed filtert sie automatisch heraus.
- **294 sind Kinderkostüme** — eigene Google-Regeln (`age_group`, Safety).
- Die Fortura-Preise liegen laut `dropship/PREIS-STICHPROBE-FORTURA.md` **1,4–2,3× über Schweizer
  Händlern**. Mit GTIN zeigt Google die Preisvergleichskarte — die Artikel erscheinen dann neben
  günstigeren Anbietern. Reichweite ja, Klicks eher nicht.
- `g:brand` ist überall `LuxeStyle`, obwohl die GTIN zu Widmann & Co. gehört. Google kann das als
  „Mismatched value (brand)" melden. Noch nicht angefasst — das wäre eine Katalogänderung.

**Entscheid liegt beim User** (Aussenwirkung + mögliche Werbekosten). Ich habe **nichts publiziert**.
Der neue Feed deckt die Gruppe ab, ohne den Verkaufskanal anzufassen: `FEED_QUERY` ist jetzt
`status:active` statt „nur was schon auf Google liegt" — denn der Feed ist genau der Weg für das,
was dort fehlt.

---

## 3. Der ~60–70-%-Ausschluss im Feed-Metafeld (unverändert offen)

Das Metafeld `mm-google-shopping.excluded_destination = ["Shopping_ads"]` steht weiterhin auf einem
grossen Teil des Katalogs: **422 von 600** geprüften (70,3 %), bei Fortura **244 von 400** (61 %).
Deckt sich mit der Messung vom 04.10. (`dropship/GOOGLE-SHOPPING-AUSSCHLUSS.md`, 57,8 % / 63,4 %).
Ursache weiter unbekannt, vermutlich eine frühere Sammelaktion in der Feed-App. **Nicht geändert** —
1700 Artikel umzustellen, ohne den Grund zu kennen, kann Werbekosten auslösen.

---

## 4. Zwei Mess-Lehren aus diesem Lauf

1. **Der Metafeld-Filter in der Produktsuche wird stillschweigend ignoriert.**
   `metafields.mm-google-shopping.excluded_destination:*Shopping_ads*` liefert dieselbe Zahl wie die
   Suche ohne Filter (Gegenprobe: `tag:gaming` mit Filter 369, ohne Filter 369). Wer das nicht
   gegenprüft, hält die Gesamtzahl für ein Messergebnis. Darum hier Stichprobe statt Zählung.
2. **Eine Stichprobe beantwortet die Kanalfrage nicht.** Die ersten 200 Produkte ergaben
   „67 % mit Sperrtag", die Vollzählung über alle 1890 ergab **10,6 %** — die Standardsortierung
   schiebt die zuletzt geänderten nach vorn, und das waren gerade die Adult-/Policy-Fälle.
   `gmc_audit.mjs` zählt die Lücke deshalb vollständig.

---

## 5. Nur der User kann das

1. **Merchant Center → Feed-URL als „geplanter Abruf" eintragen.** Der Generator schreibt
   `automation/autopilot/google-merchant-feed.xml`; der GitLab-Job `shop-autopilot` legt sie auf
   Branch `brain/intel` ab:
   `https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/brain/intel/automation/autopilot/google-merchant-feed.xml`
   (4000 Artikel ≈ 8,8 MB — bei deutlich mehr Artikeln muss der Feed geteilt oder gezippt werden.)
2. **Entscheid Fortura:** die ~1500 sauberen Schweizer-Lager-Artikel in Google Shopping bringen —
   oder bewusst draussen lassen (Preise liegen über dem Schweizer Markt). Sag Bescheid, dann mache ich es.
3. **Entscheid `excluded_destination`:** in der Feed-App nachsehen, woher der Ausschluss kommt, und
   ob er bleiben soll.
4. **Merchant-Center-Diagnose durchsehen** (Login): „Product page unavailable", „Missing shipping
   info", Disapprovals. Die Zahlen im Gedächtnis sind vom Juni/September und ungeprüft.
