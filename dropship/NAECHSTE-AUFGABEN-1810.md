# Was die nächste Sitzung anpacken kann — gemessen am 2026-10-18

Alle Zahlen hier sind **heute live gemessen**, nicht aus dem Gedächtnis übernommen. Wo eine alte
Gedächtnis-Notiz überholt ist, steht es ausdrücklich dabei. Reihenfolge = Nutzen pro Aufwand.

---

## 1. 🔤 SEO-Titel weiterfüllen — grösste Fläche, kostet keine CJ-Punkte

**Stand:** 6644 gesetzt (17.10.), 0 Fehler. Der letzte Lauf fand in den **ältesten 5244** aktiven
Produkten **5000 ohne SEO-Titel (95 %)** und hat nur deshalb aufgehört, weil `LIMIT` erreicht war.

```
LIMIT=5000 SORT=CREATED_AT REVERSE=0 node automation/seo-optimizer.mjs
```

- `REVERSE=0` ist wichtig: ohne das durchsucht der Lauf zuerst, was schon fertig ist (#2663).
- Rechnen mit ~1,3 Produkten/Sekunde, also ~65 Minuten pro 5000.
- Danach die Stichprobe aus `dropship/SEO-TITEL-BINDESTRICH-1710.md` wiederholen (gegen **beides**
  prüfen: neues Modul und nachgebauter alter Code).
- **Ehrlich bleiben:** ohne SEO-Titel nimmt Shopify den Produkttitel. Der Gewinn ist der Marken-Zusatz
  und die kontrollierte Meta-Beschreibung — ein CTR-Hebel, **keine Keyword-Strategie**.

## 2. ⭐ Bewertungen gezielt nach Warengruppe — sobald CJ-Punkte da sind

**Blockiert:** CJ meldet heute **39 Punkte übrig** (`usedToday` 116 400 bei `total` 68 875).
⚠️ **Die Annahme „das Limit setzt sich täglich zurück" ist damit NICHT bestätigt** — zwischen dem
17.10. abends (248 übrig) und dem 18.10. 16:52 UTC ist es nicht zurückgesprungen, `usedToday` ist
weiter gestiegen. **Erst Punkte prüfen, dann planen** (`scratchpad`-Skript oder eine `/product/query`
mit Blick auf `pointsInfo.remaining`).

Sobald Punkte da sind, in dieser Reihenfolge (heute gemessene Segmentgrössen):

| Segment | aktive `cj-real`-Produkte | erwartete Trefferquote |
|---|---|---|
| `tag:gadgets` | **1483** | ~12 % (wie `tag:gaming`) |
| `tag:elektronik` | **4494** | ~12 % |
| Mode / Kostüme / Haushalt | Rest | **nahe 0** |

```
DRY_RUN=0 QUERY='status:active AND tag:cj-real AND tag:gadgets' LIMIT=1500 node automation/cj_reviews_import.mjs   # live nur mit DRY_RUN=0 (Vorgabe Trockenlauf)
```

Belegt am 17.10.: gezielt `tag:gaming` = 11,7 % Treffer gegen blind 2,4 % — **mehr Bewertungen aus
einem Viertel der Punkte**. Das Leer-Ledger (`dropship/cj_reviews_leer.txt`, 1437 Einträge) spart die
schon geprüften automatisch.

## 3. 🖼️ `image-audit.mjs` ist nicht mehr blockiert — Gemini antwortet wieder

Im Gedächtnis stand „braucht Gemini (Credits aufgebraucht)". **Heute geprüft: Gemini antwortet**
(`nachDeutsch` → `Weg: gemini`). Damit ist das Werkzeug laufbereit, das die Hauptbilder prüft
(Auflösung, Person im Bild, Collage/Wasserzeichen) und bei Bedarf ein besseres Bild nach vorn holt.

**Vorsicht, und zwar begründet:** es greift mit `reorderMedia` in die Bildreihenfolge ein und hat
`APPLY` als Schalter. Also **erst ohne `APPLY` laufen lassen, Befunde einzeln ansehen** — die Lehre
„vor Textarbeit an einem CJ-Produkt immer das erste Bild ansehen" gilt hier doppelt, weil das
Werkzeug genau dieses Bild tauscht.

## 4. 📏 Masse in die Beschreibungen — grösste inhaltliche Lücke, aber CJ-abhängig

Altmessung (04.10.): **6476 von 9000** aktiven `cj-real`-Produkten nennen keine einzige Zahl mit
cm/mm/ml/Liter. Die Masse liegen bei CJ, sie sind nur nie in den Text gewandert. Das ist
vollautomatisierbar — **aber jeder Abruf kostet CJ-Punkte**, siehe Punkt 2. Reihenfolge: zuerst
Bewertungen (direkter Conversion-Hebel), dann Masse.

## 5. 🧹 Werkzeuge, die noch niemand geprüft hat

Nach dem Secret-Fix (#2658) laufen alle 60 Skripte überhaupt erst. Geprüft sind bisher 8 Wächter +
`seo-optimizer` + `conversion_radar` + `conversion_guard`. **Noch nie im DRY-Modus angesehen:**

- `automation/cross_sell.mjs` — schreibt in Produktbeschreibungen (also: erst DRY, Diff lesen).
- `automation/shop_brain.mjs`, `automation/autopilot/shop_pulse.mjs`, `autopilot/merchant_feed.mjs`.
- `automation/rating_guard.mjs` und `discount_guard.mjs` **live** (beide melden 0 Befunde, also
  ohnehin nichts zu tun).

Vorgehen wie am 17.10.: DRY laufen lassen, **jede Zahl gegenprüfen, bevor man sie glaubt** — von den
geprüften Wächtern waren drei defekt und einer gefährlich.

---

## Zwei alte To-dos, die erledigt bzw. gegenstandslos sind

- **Archiv-Backlog: fertig.** Das Gedächtnis sagt „~4700 archivierte Produkte löschen (Admin-Bulk)".
  **Heute gemessen: 161 archivierte Produkte.** Der Posten ist abgearbeitet.
- **Der DRAFT-Berg ist KEINE Chance — nicht abgraben.** Es gibt **über 10 000** DRAFTs, und das sieht
  nach einem riesigen ungenutzten Vorrat aus. Eine Tag-Zählung über die 3000 zuletzt geänderten zeigt
  das Gegenteil: **90 % tragen einen ausdrücklichen Grund.**

  | Grund-Tag | Anzahl (von 3000) |
  |---|---|
  | `alt-einzelgroesse-ersetzt` (durch Varianten-Produkt ersetzt) | 1018 |
  | `rueckhol-0907` | 811 |
  | `cj-nicht-versendbar-ch` | 632 |
  | `duplikat-auto-draft` | 340 |
  | `marge-verlust-draft` / `verlust-auto-draft` | 179 / 179 |
  | `ausverkauft-lieferant` | 115 |
  | `bilder-geloescht-speicher` | 113 |
  | weitere (`verlust-rabatt25`, `auto-entwurf-0926`, `bigbuy-paket-ausgelaufen`, `fehlklasse-*`, `vision-qa-draft-1014`, `medizinprodukt-pruefen`, `adult-nicht-bewerben` …) | je 4–41 |

  **Nur 298 von 3000 (10 %) haben kein erkennbares Grund-Tag** — das ist der einzige Teil, den
  anzusehen sich lohnt, und es sind Einzelfälle, keine Goldgrube.

  **Mess-Lehre dabei, und zwar am eigenen Leib:** mein erstes Muster kannte
  `alt-einzelgroesse-ersetzt` nicht und meldete darum **45 % „ohne Grund"** statt 10 %. Eine Liste
  bekannter Sperrgründe ist nie vollständig — **erst die Tags zählen, dann urteilen.**

## 🟡 Was nur der User entscheiden kann (unverändert offen)

1. **Env-Eintrag umdrehen:** `SHOPIFY_CLIENT_SECRET` kommt als `shpss_…=SHOPIFY_CLIENT_SECRET` an
   (60 statt 38 Zeichen). Der Fix in `automation/lib/shopify_secret.mjs` ist eine Schutzschicht,
   keine Heilung.
2. **Google-Kanal:** **1892 aktive Produkte** sind nicht auf „Google & YouTube" publiziert (heute
   gemessen; überwiegend der Fortura-Import, 2376 aktive `tag:fortura`). Rein oder nicht?
   Der Grund der ~60-%-Metafeld-Ausschlüsse ist weiter unbekannt.
3. **Widmann-Preise** 1,4–2,3× über Schweizer Händlern (761 Artikel).
4. **Holzspiegel-Preis** — rentabel erst ab ~CHF 50.
5. **CJ-Punkte:** falls das Limit wirklich nicht täglich zurückgeht, braucht es entweder einen
   grösseren CJ-Plan oder die Einsicht, dass Bewertungs-Importe nur in kleinen Portionen gehen.
