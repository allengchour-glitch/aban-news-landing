# 🎯 Welcher Kanal bringt Käufer? — gemessen 16.10.2026, 90 Tage

> **Suchverkehr ist der einzige Kanal mit echter Kaufabsicht. Social bringt fast ein Drittel aller
> Sitzungen und in 90 Tagen null Käufe.**

## Die Zahlen (Shopify-Analytics, 90 Tage)

| Quelle | Sitzungen | Warenkorb-Zugaben | Käufe | Zugabe-Quote | 1 Kauf je … Sitzungen |
|---|---|---|---|---|---|
| direct | 2609 | 46 | **7** | 1,8 % | 373 |
| **social** | **1424** | **7** | **0** | **0,5 %** | — |
| **search** | **439** | **14** | **4** | **3,2 %** | **110** |
| unknown | 76 | 0 | 0 | — | — |

Nach Umsatz (`order_referrer_source`, 90 Tage): **search 5 Bestellungen / CHF 93.21**, ohne Zuordnung
11 Bestellungen / CHF 445.79, **social 0 / CHF 0**.

## Was das heisst

- **Suche konvertiert 3,4× besser als direct** (1 Kauf je 110 statt 373 Sitzungen) und holt das bei
  **sechsmal weniger Verkehr**.
- **Social ist der grösste Kanal und der einzige ohne einen einzigen Kauf.** Auch die Vorstufe fehlt:
  0,5 % Warenkorb-Zugaben gegen 3,2 % bei der Suche — die Leute schauen und gehen.
- Damit ist die Juni-Einschätzung („social 38 %, low-intent") jetzt **mit Kaufdaten über 90 Tage belegt**,
  nicht mehr nur vermutet.

## Ehrliche Einschränkungen

- **Kleine absolute Zahlen.** 11 Käufe insgesamt. 4 gegen 0 ist ein deutliches, aber kein statistisch
  unangreifbares Signal. Was es stützt: die Warenkorb-Quote zeigt dasselbe Muster bei 20× mehr Fällen
  (14 Zugaben aus 439 Suchsitzungen gegen 7 aus 1424 Social-Sitzungen).
- **`direct` ist trüb.** Darin stecken Lesezeichen, App-Browser ohne Referrer, Bots — und die Testkäufe
  eines `example.com`-Kontos (siehe `dropship/CONVERSION-STAND-1610.md`). Ein Teil der 11 nicht
  zugeordneten Bestellungen kann aus Social stammen, das die Zuordnung verloren hat.
  **Social ist also nicht bewiesen wertlos — es ist nur nie als Quelle eines Kaufs aufgetaucht.**

## Folgerung für die Arbeitsteilung

**Was autonom Wirkung hat:** SEO an den Seiten, die bereits ranken. Jede Position, die auf Seite 1 rückt,
speist den einzigen Kanal, der nachweislich Käufer bringt. Die Produktseiten-Korrekturen vom 04.10. und
16.10. zahlen genau darauf ein.

**Was nicht:** mehr Social-Posts. Der Kanal hat in 90 Tagen 1424 Sitzungen geliefert und nichts verkauft.
Mehr davon ändert daran nichts — das ist dieselbe Lehre wie im Juni, jetzt mit Zahlen.

**Was nur der User kann:** bezahlten Verkehr mit Kaufabsicht (Kampagne auf Conversion statt Reichweite)
oder Pinterest als intent-starken Gratiskanal aufsetzen.

---

## Wo der Suchverkehr tatsächlich ankommt (90 Tage, 214 Sitzungen)

Erstmals gemessen — das stand bisher nirgends:

| Landeseite | Sitzungen | Zustand |
|---|---|---|
| `/` (Markensuchen) | 76 | — |
| **`/products/rizinusol-wickel-set-mit-bio-ol-323457`** | **53** | DRAFT/0 Kanäle, **aber korrekt weitergeleitet** ✓ |
| `/blogs/ratgeber/himalaya-salzlampe-wirkung-mythen` | 19 | Ratgeber, verlinkt eine **kaufbare** Lampe ✓ |
| `/collections/erste-august` | 11 | saisonal (1. August), Verkehr veraltet |
| `/products/tunmate-rizinusol-382081` | 11 | ACTIVE, 7 Kanäle ✓ |
| `/collections/camping-kueche` | 6 | |
| 14 weitere Seiten | je 2–5 | |

### Zwei Erkenntnisse

**1. Rizinusöl ist das stärkste Suchthema des Shops.** 64 der 214 Suchsitzungen landen auf zwei
Rizinusöl-Seiten, dazu ein französischer Ratgeber zum Rizinusöl-Wickel. Der Katalog hat dazu **vier
aktive Produkte** (Wimpernserum, Haaröl, Roll-on, Wickel) — ein eigener kleiner Themenbereich, der
ohne Zutun Suchverkehr zieht. Das ist der naheliegendste Ort, um den funktionierenden Kanal auszubauen.

**2. Ratgeber-Artikel ziehen Suchverkehr.** Der Salzlampen-Artikel bringt 19 Sitzungen, dazu zwei
weitere Ratgeber mit je 2. Sie führen zu kaufbaren Produkten — die Kette stimmt.

### Geprüft und intakt (nicht angefasst)
Der Verdacht, die stärkste Suchseite sei tot, hat sich **nicht** bestätigt: `rizinusol-wickel-set-…`
ist zwar DRAFT in 0 Kanälen, liefert aber **HTTP 200 über eine bestehende Weiterleitung** auf
`rizinusol-wickel-wiederverwendbar-bauch-nacken` (ACTIVE, CHF 16.90) — eine frühere Sitzung hat das
sauber gelöst. Auch die vom Ratgeber verlinkte `ufo-kristall-salzlampe-900a8e` ist ACTIVE, 7 Kanäle,
CHF 26.90, kaufbar.
**Lehre:** DRAFT + 0 Kanäle heisst nicht automatisch 404 — erst die URL abrufen, dann urteilen.

---

## Nachtrag 2026-10-17 — Rizinusöl-Themenbereich gebaut (live)

### Was fehlte (gemessen, `rizcluster.mjs`)
Die vier aktiven Rizinusöl-Produkte hatten **null Querverweise** aufeinander und es gab **keine
Rizinusöl-Collection**. Sie lagen nur in breiten Sammlungen (`beauty-pflege`, `hautpflege`,
`bestseller-unter-50`). Wer aus Google auf einem landete, sah **eins statt vier**.

### Was jetzt live ist
- **Collection `/collections/rizinusoel`** (Smart Collection, Regel TITLE enthält „Rizinus"),
  eigener Text + SEO-Titel, **in alle 9 Kanäle publiziert** (Publish-Falle beachtet) → HTTP 200.
  Sie enthält 6 Produkte, davon 4 aktive.
- **Querverweis-Block in allen 4 aktiven Produkten** (Marker `<!-- ls-riz-link-v1 -->`, idempotent,
  eingefügt vor der Trust-Box): je 3 Links auf die Geschwisterprodukte mit einem Wort zum Unterschied
  (Wimpern/Haaröl/Roll-on/Wickel) + Link auf die Collection. **Live geprüft mit Cache-Buster:
  4 × HTTP 200, Block vorhanden.** Zweiter Lauf des Skripts ändert nichts (Gegenprobe gelaufen).

### Die zwei DRAFTs bleiben DRAFT — begründet
Die Lehre „ein Draft hat meistens einen Grund — Tags lesen, bevor man aktiviert" angewandt:
| Produkt | VK | EK | Grund |
|---|---|---|---|
| `rizinusol-atherisches-ol-622500` | 23.90 | **46.21** | `marge-verlust-draft` — jedes Stück −22.31 |
| `rizinusol-wickel-set-mit-bio-ol-323457` | 39.90 | 26.93 | `cj-nicht-versendbar-ch` — CJ liefert es nicht in die Schweiz |

Das Set wäre rentabel und trägt zusätzlich den Tag `besucht-aber-nicht-lieferbar-0918` —
es wurde also von Kund:innen angeklickt. **Nur ein anderer Lieferant würde das lösen**, nicht ein
Klick auf ACTIVE.

### Sackgasse, ehrlich: für diese vier gibt es bei CJ keine Bewertungen
Alle vier haben **0 Judge.me-Bewertungen**. Der Review-Importer wurde gezielt darauf angesetzt —
Ergebnis **0**. Gegengeprüft mit direkten CJ-Abfragen (nicht dem Importer vertraut):
alle vier pids lösen auf, `productComments` gibt **`total: 0`** zurück. Das ist eine echte Null,
kein stiller Skip. **Erfundene Bewertungen sind ausgeschlossen** — die vier bleiben ohne Sterne,
bis echte Käufer:innen welche schreiben (Judge.me-Mail nach Kauf läuft).
