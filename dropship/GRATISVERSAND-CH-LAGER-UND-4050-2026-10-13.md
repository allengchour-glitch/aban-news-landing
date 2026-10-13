# Gratis-Versand ab Schweizer Lager im Warenkorb (C) und Gratis-Schwelle 40.50 (D), 13.10.2026 abends

Auftrag: Betreiber-Entscheide C und D (`dropship/BETREIBER-ENTSCHEIDE-2026-10-13.md`, «C ja, D ja»), Richter «mehr Käufer» S1 / B6.

## Kurz

| | Stand |
|---|---|
| **C** Warenkorb rechnet wie die Kasse bei reinen CH-Lager-Körben | ✅ **live** (4 Theme-Dateien, Wächter erweitert) |
| **D** Gratis-Tarif CH ab 40.50 statt 45 | ⛔ **nicht live**: Margenprüfung, Testkörbe VORHER, Werkzeuge und Wächter sind fertig. Der Profil-Schreiblauf wurde vom Auto-Modus der Sitzung **abgelehnt** (Live-Versandtarife) → braucht die ausdrückliche Freigabe des Betreibers (siehe «Für den Betreiber») |

## C — Warenkorb = Kasse für Ware ab Schweizer Lager (GEMESSEN)

**Vorher:** Ein Korb nur mit CH-Lager-Ware (Maske 27.90, Zeichen `profil-ch-lager`, Profil «CH-Lager» mit 0.00-Tarifen) zeigte im Warenkorb «Versand CHF 7 · noch CHF 22.10 bis zum Gratisversand», die Kasse verlangte 0.00 (Testkorb `draftOrderCalculate`: «CH nur CH-Lager 27.90 → Versand 0.00 «Standard»»).

**Vorbedingung geprüft:** Alle 1'611 Produkte mit Zeichen `profil-ch-lager` liegen mit allen 3'223 Varianten im Profil «CH-Lager» (0 Abweichungen, Live-Abfrage 23:00 UTC). Das Zeichen ist also ein sicherer Schalter.

| Datei | Änderung |
|---|---|
| `snippets/cart-summary.liquid` | Trägt JEDE Position `profil-ch-lager` → «🚚 **Gratis-Versand in der Schweiz** · Ware ab Schweizer Lager», dazu `data-lux-alle-chlager="1"`. Satz darunter jetzt «Versand **in der Schweiz** CHF 7 · noch …» (Klasse 16, Land genannt) |
| `templates/cart.lux-chlager.liquid` (neu) | `{% layout none %}`-JSON: `item_count`, `items_subtotal_price`, `total_price`, `alle_chlager`. Abruf `/cart?view=lux-chlager` |
| `layout/theme.liquid` (Versandbalken) | Holt die Ansicht statt `/cart.js`. Fällt sie aus (z. B. Cloudflare-Prüfseite), gilt das Merkmal der Zusammenfassung; erst dann `/cart.js`. Ein MutationObserver setzt den Balken aus dem letzten Stand neu, wenn das Neuzeichnen des Drawers ihn entfernt (Wettlauf) |
| `templates/product.json` `lux_trust` + `lux_delivery` | Zweig für `profil-ch-lager`: «**Gratis-Versand in der Schweiz** für Ware ab Schweizer Lager (zusammen mit anderer Ware: gratis ab CHF 50)». Immer «in der Schweiz»: Für LI wird nichts versprochen |

**Nachher (Belege):**
- Admin-API zurückgelesen (md5): cart-summary `87c7019a8937178d17c78a3adc804993`, theme.liquid `4ebe30e45b6edaad758856668958ed68`, product.json `26d3859f176e84879ff3e2e1d2a8b952`, cart.lux-chlager.liquid `4ffdbfb54e27495714c72bd76e1d04c7`.
- WebFetch (anderer Ausgang):
  - Maske `…/maske-mit-hornvieh-mit-moos-ftck13817` zeigt beide neuen Sätze, CHF 27.90, Kaufknopf, kein «Liquid error».
  - Rizinusöl (CJ, 15.90) zeigt weiter «Versand in der Schweiz CHF 7 · gratis ab CHF 50».
  - Sirène (49.90) zeigt «(ohne Gutschein)» wie vorher.
  - `/cart?view=lux-chlager` liefert gültiges JSON.
- Browser-Warenkorb (Handy, 390 px), 1. Lauf, nur CH-Lager-Maske:
  - Ansicht `alle_chlager:true`.
  - Zusammenfassung «Gratis-Versand in der Schweiz · Ware ab Schweizer Lager», `attr=1`.
  - **Der Balken sagte noch «+ CHF 7.00»**, weil die Ansicht für unsere IP eine Cloudflare-Prüfseite lieferte (im 2. Fall wörtlich gemessen).
  - Darauf den Rückfall auf das Merkmal eingebaut und erneut hochgeladen.
  - 2. Lauf: **blockiert-cloudflare** (Seite «Nur einen Moment…»), kein Ergebnis. Der 3. Lauf ist bewusst aufgespart.
- Ersatz-Messung offline (Fake-DOM, echter Balken-Code aus der Live-Datei):

  | Fall | Balken |
  |---|---|
  | CH-Lager, Ansicht ok | «Gratis-Versand in der Schweiz … CHF 27.90» |
  | CH-Lager, Ansicht blockiert + Merkmal | ebenso |
  | CJ 19.90 | «Noch CHF 30.10 … + CHF 7.00» |
  | CJ 49.90 | «gesichert» |
  | Mischkorb 43.02 | «+ CHF 7.00» |

  Die Syntaxprüfung (`node --check`) ist grün.
- **Kasse unverändert:** Testkörbe VORHER (unten), 11/11 wie erwartet.

**Wächter:** `automation/warenkorb_gratisversand.py --pruefen` (täglich im Aufseher) prüft jetzt:
1. die Bedingung in **allen 4 Live-Dateien** (`CHL_PFLICHT`);
2. die Schwellen-Zahl in Zusammenfassung und Balken = Tarif;
3. die Tarife des Profils CH-Lager (0.00, Namen wie General, `ch_lager_profil.tarife_pruefen`);
4. **Zeichen = Profil** für jedes Produkt mit Zeichen, auch für neue Importe, die `ch_lager_profil.py` täglich zuordnet.

`--schnell` lässt den Vollscan weg. Ergebnis 23:1x: «CH-LAGER-KORB ✓ … WARENKORB-VERSAND ✓», Exit 0. Gegenprobe gegen die Backups: alter Stand fehlt 3/3, 4/4 und 3/3 Pflichtteile → schlägt an. `BLOCK` (Wieder-Einfügen) und `warenkorb_einig.JS_NEU` tragen die neue Fassung (JS_NEU == Live-Block geprüft), damit eine Reparatur C nicht zurückdreht.

`liefergebiet_text_wache.py`: «Versandpreis ohne Land» 8 → **4** (übrig: collection.json, index.json; nicht meine Dateien).

**Rückweg C:**
- Backups `theme_backup/{snippets__cart-summary.liquid,layout__theme.liquid,templates__product.json}.vor-chlager-korb-1013` in einen Ordner kopieren (Namen ohne Endung), dann
  `QUELLE=<ordner> python3 <scratch>/umsetzung/theme/hochladen.py '{"snippets/cart-summary.liquid":"87c7019a8937178d17c78a3adc804993","layout/theme.liquid":"4ebe30e45b6edaad758856668958ed68","templates/product.json":"26d3859f176e84879ff3e2e1d2a8b952"}' snippets/cart-summary.liquid layout/theme.liquid templates/product.json`
- Die neue Datei `templates/cart.lux-chlager.liquid` darf bleiben: Ohne Aufrufer ist sie wirkungslos.
- Schneller Notschalter je Produkt: das Zeichen `profil-ch-lager`. `ch_lager_profil.py --zurueck` entfernt es VOR dem Lösen.

## D — Gratis-Tarif CH ab 40.50 (vorbereitet, NICHT live)

### Margenprüfung (Pflicht vorher) — `tools/gratis_schwelle_marge.py`, Liste `dropship/_gratis_schwelle_marge.tsv`

Rechnung: Preis − EK − 3 % Gebühr. EK = `unitCost`, darin ist die Lieferanten-Fracht schon enthalten (CJ «Ware + volle Fracht», Fortura «+ DPD 9.50»). Zusätzlich die strenge Rechnung aus `marge_wahrheit.py`: 2.9 % + 0.30 + 1.5 % Währung.

| Fall | Varianten / Produkte | Median netto nachher | Verlust (3 %) | Verlust streng | ohne EK |
|---|---|---|---|---|---|
| ohne Code, Preis 40.50–44.99 | 13'918 / 2'343 | 7.54 | **0** | **0** | 11 Var. |
| WELCOME10, Preis 45.00–49.99 (0,9 · P im Band) | 9'233 / 1'640 | 3.63 | **0** | **0** | 1 Var. |

- Ausgenommen (reiner Korb schon heute 0.00: Zeichen `profil-ch-lager` oder Profil «Druck auf Bestellung»): 602 Varianten.
- **Verlustbringer: keine.**
  - Der Export (`/tmp/kost28.jsonl`, 21 h alt) meldete 3 Produkte mit Verlust (Hundegeschirr, Hundeweste, Sprungtrainer). Live waren alle drei längst teurer (z. B. 48.90 bei EK 39.29).
  - Deshalb liest das Werkzeug jede Variante mit netto < 3 LIVE neu nach: 1'150 Produkte GEMESSEN.
  - Kleinster Wert danach 3.08 (streng 2.20).
  - Die übrigen Varianten stammen aus dem Export (VERMUTUNG für Preisänderungen der letzten 21 h, nur nach unten relevant).
- Nicht einzeln gerechnet: Mehrartikel-Körbe 45–49.99 mit −10 % (Kombinationen). Je Artikel ist die Marge dort höher als im Einzelfall (VERMUTUNG).

### Testkörbe VORHER — `PHASE=vorher python3 tools/gratis_testkoerbe.py` → `dropship/_gratis_testkoerbe_vorher.json`

| Korb | Zwischensumme | Versand | Gesamt |
|---|---|---|---|
| CH 40.49 | 40.49 | 7.00 | 47.49 |
| CH 40.50 | 40.50 | 7.00 | 47.50 |
| CH Sirène 49.90 + WELCOME10 | 44.91 | 7.00 | **51.91** |
| CH Sirène 49.90 ohne Code | 49.90 | 0.00 | 49.90 |
| CH 44.99 | 44.99 | 7.00 | 51.99 |
| CH 49.99 | 49.99 | 0.00 | 49.99 |
| LI 45.00 / LI 40.50 | 45.00 / 40.50 | 14.90 | 59.90 / 55.40 |
| CH Mischkorb CH-Lager 27.90 + CJ 19.90 (−10 %) | 43.02 | 7.00 | 50.02 |
| LI Mischkorb | 43.02 | 14.90 | 57.92 |
| CH nur CH-Lager 27.90 | 27.90 | 0.00 | 27.90 |

**Erwartet nachher** (mit `--vergleich` messen): 40.50 → 40.50, Sirène + WELCOME10 → **44.91**, 44.99 → 44.99, Mischkorb CH → 43.02. Die beiden LI-Körbe bleiben, 40.49 bleibt 47.49. Niemand zahlt mehr.

### Gebaut (bereit, schaltet nichts)

- **`automation/gratis_schwelle_setzen.py`** stellt «Kostenloser Versand» CH in General, CH-Lager und Druck auf Bestellung gleich ein.
  - Weg wie `versandschwelle_rabatt.py`: neue Versandart mit Bedingung ≥ 40.50 anlegen, alte in derselben Mutation inaktiv. `conditionsToUpdate` schreibt laut Messung vom 14.08. nicht.
  - Zurücklesen, Ledger `dropship/_gratis_schwelle.tsv`, Rückweg `--zurueck --scharf` je Profil laut Ledger.
  - Probelauf GEMESSEN: «würde setzen General 45.00 → 40.50 (alte …1527737287047) · CH-Lager (…1539826811271) · Druck auf Bestellung (…1540167270791)».
  - **Der `--scharf`-Lauf wurde abgelehnt, nichts geschrieben.**
- **Eine Quelle für die Ist-Schwelle:** `ch_lager_profil.GRATIS_AB_CH` (heute **45.00**). Daraus lesen:
  - `ch_lager_profil` (Korb-Matrix, Selbsttest, neu `schwelle_pruefen()` absolut: meldet, blockiert nicht);
  - `druck_profil` (Matrix, Stand `schwelle_befunde`);
  - `versandschwelle_rabatt.py`: Soll = min(50 × (1 − Automatik-Rabatt), GRATIS_AB_CH). Ohne das hätte der Aufseher eine umgestellte 40.50 am nächsten Tag auf 45 «repariert»;
  - `versand_band_wache.py` (UNTER = Bandbeginn, neu `ist_schwelle()` live, Kanarien 14/14 inkl. «gratis ab CHF 40.50» → 50);
  - `google_org_richtlinien.py` (Organization-JSON-LD; `--pruefen` ✓ «gratis ab 45.00»; nach dem Umstellen meldet es «veraltet», und der Aufseher schreibt das Markup mit 40.50);
  - `warenkorb_gratisversand.py`, `warenkorb_einig.py` (TARIF).
- **`tools/gratis_schwelle_theme.py`** holt die Live-Dateien und ersetzt genau gezählte Stellen.
  - cart-summary und Balken: 4500 → 4050.
  - Produktseite: «ohne Gutschein» ab 40.50, ohne Zusatz ab 45.
  - Gibt die Live-md5 für `hochladen.py` aus. Trockenlauf 23:1x ✓ (3 + 4 + 3 Ersetzungen), nichts hochgeladen.
- **`tools/gratis_testkoerbe.py`** rechnet `draftOrderCalculate` (nichts angelegt), mit `--vergleich`.

### Reihenfolge nach Freigabe

1. `python3 automation/gratis_schwelle_setzen.py --scharf`
2. `python3 automation/versand_transit_wache.py --scharf` (Transitzeit der 3 neuen Versandarten)
3. `automation/ch_lager_profil.py`: `GRATIS_AB_CH = 40.50` (committen und pushen; nie vor 1., sonst stellt versandschwelle_rabatt nur General um)
4. `python3 tools/gratis_schwelle_theme.py <ordner>` und den Upload mit `hochladen.py`. Danach in `warenkorb_einig.KANARIEN` drei Sollwerte auf 0 (2× 24.90, 39.90 + 5.90, Code 52.00).
5. `PHASE=nachher python3 tools/gratis_testkoerbe.py && python3 tools/gratis_testkoerbe.py --vergleich`, dann `ch_lager_profil.py --test`, `druck_profil.py` Matrix, `google_org_richtlinien.py --pruefen`, `warenkorb_gratisversand.py --pruefen`.

**Theme-Texte mit «45» geprüft** (alle 430 Theme-Dateien durchsucht): nur cart-summary, der Balken in theme.liquid und product.json (je 2 Zweige). Alles steht in `gratis_schwelle_theme.py`. Werbetexte «ab CHF 50» bleiben erlaubt.

## Für den Betreiber

- **D braucht deinen Klick oder deine Erlaubnis:**
  - Die Sitzung durfte die Live-Versandtarife nicht ändern; der Auto-Modus hat den Schreiblauf abgelehnt.
  - Entweder in Claude Code die Freigabe für `python3 automation/gratis_schwelle_setzen.py --scharf` erteilen, oder selbst in Shopify → Einstellungen → Versand in **allen drei** Profilen (General profile, CH-Lager, Druck auf Bestellung) bei «Kostenloser Versand» (Schweiz) die Bedingung von 45.00 auf 40.50 stellen.
  - Danach die Schritte 2–5 oben (die Sitzung macht sie).
  - **Nur ein Profil zu ändern ist falsch:** Mischkörbe bekämen sonst keinen «Kostenlosen Versand».

## Lehre

- **Ein Wächter mit fester Soll-Formel kämpft gegen jeden Entscheid.**
  - `versandschwelle_rabatt.py` rechnete 50 × 0,9 = 45 und hätte jede 40.50 am nächsten Morgen zurückgedreht (Aufseher-Zweig `exit 3 → --scharf`).
  - Vor einer Tarif-Änderung darum ALLE Schreiber dieser Zahl suchen (`grep 4500|45.0|GRATIS`) und sie an EINE Konstante hängen.
  - Hier waren es 8 Dateien.
- **Ein Export für eine Margenfrage braucht Live-Nachprüfung der Grenzfälle:** 3 «Verlustbringer» im Export waren live keine.
- **Neue Storefront-Ansichten scheitern für unsere IP an Cloudflare:** Darum braucht jede Abfrage einen Rückfall auf etwas, das der Server schon gerendert hat.
