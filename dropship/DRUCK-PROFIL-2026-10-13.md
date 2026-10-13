# Druck auf Bestellung: Kasse zeigt dasselbe Lieferfenster wie die Seite, 13.10.2026

**Auftrag:** Betreiber, 13.10. abends: «cj kostüme ja, versandprofil ja mache es sauber und so». Gemeint ist Entscheid 2 aus `dropship/KAUFSTRECKE-SEITEN-2026-10-13.md`, Klasse 11. Entscheid 1 (Halloween aus Social) ist ein eigener Auftrag und steht nicht in diesem Bericht.

**Skript:** `automation/druck_profil.py` (Muster `ch_lager_profil.py`).

**Ergebnis:** Profil «Druck auf Bestellung» `gid://shopify/DeliveryProfile/152645108103` ist angelegt. Stufe 1 ist zugeordnet (10 Motiv-Shirts, 50 Varianten). Die Korb-Matrix ergibt 9/9, kein Korb zahlt mehr als vorher. Die Kasse zeigt für ein Shirt im Profil **«Fr., 23. Okt–Di., 3. Nov KOSTENLOS»** statt «Mi., 28. Okt–Mi., 11. Nov CHF 7.00».

## Befund vorher (GEMESSEN 13.10. ~20:40–21:00 UTC)

| Wo | Fenster für ein Druck-Shirt, Bestellung Di 13.10. nach 12 Uhr | Rechnung |
|---|---|---|
| Produktseite (`lux_delivery`) und Warenkorb (`lux_cart_trust`) | 22.10.–2.11. | jetzt + 9 bis + 19 **Kalender**tage, Wochenende auf Montag |
| Kasse (General profile) | 28.10.–11.11. | Bearbeitung P1D + Transit 9–19 Werktage |
| Beschreibung (Baustein `ls-liefer`) und Versandrichtlinie | «7–14 Werktage · Druck auf Bestellung» | Text |

- **Bestand:** 488 aktive Druck-Produkte (Tag `printful_personalized_product`, `prodigi_personalized_product` oder `selbst-gestalten`), alle im General profile.
- **Abweichung von der Plan-Zahl:** Der Plan nannte 493. Er hatte auch 5 Produkte ohne Druck-Tag mitgezählt, die über die SKU gefunden wurden.

## Plan, Kritik, Entscheidungen

Der Plan schlug ein 0.00-Profil für 68 Produkte vor. Die Kritik hat ihn mit Änderungen durchgelassen. Wo die Kritik recht hatte, gilt die Kritik. Entschieden habe ich am System:

| Punkt | Plan | Kritik | Entscheid (Begründung) |
|---|---|---|---|
| Marge | Preis − EK − Versand − 3 %, ≥ 5.00 | MWST 8,1 % auf EK + Versand (#1005 gemessen), 10 % Rabatt, Fixgebühr, Wechselkurs | **Kritik.** Schlechtester Fall: Preis × 0.9 − (EK + Printful-Versand max(CH, LI)) × 1.081 × 1.05 − (3 % + 0.30), ohne Versandertrag vom Kunden. Schwelle ≥ 0.00: nie ein Verlust. |
| Rückendruck +5.50 | nicht berücksichtigt | 199 von 349 Varianten im Minus, falls der Editor einen Rückendruck auslöst | **Am System geprüft:** Der Editor (`lspod-designer-v5`) bietet eine Rückseite nur an, wenn `data-img-back` gesetzt ist und sich von der Vorderseite unterscheidet. Das trifft bei T-Shirt, Hoodie und Jutebeutel nicht zu; nur Vorderseite = kein Aufpreis. Die Regel rechnet den teuersten `back*`-Platz trotzdem ein, wo der Editor eine Rückseite hat. |
| Allover, Mauspad, Notizbuch, Tassen, Kissen, Sticker | teils Mitglied | Allover: Produktionszeit ungemessen (#1005: 7 Werktage bis Versand). Mauspad und Notizbuch: EK «fehlt». | **Kritik:** nur Technik **DTG**. Ausserdem müssen Kosten und Printful-Versand nach CH **und** LI gemessen sein, mit CH-Versand ≤ 7 Tage. |
| Zeichen | Tag `profil-druck` an 68 Produkten | Shop-Metafeld: keine Produkt-Schreibvorgänge, kein erneuter Google-Abgleich, Editor unberührt | **Kritik:** Shop-Metafeld `luxe.druck_profil_ids` = «,id,id,». Alle Mitglieder sind im Google-Kanal und jede Produktänderung schickt das Produkt neu an Google (Lehre 12.10.). Der Rückweg ist ein einziges Feld. Abweichung vom Auftragstext «Tag»: begründet, das Theme liest das Feld genauso einfach. |
| Reihenfolge Zeichen/Profil | Zeichen nach Zuordnen, vor Lösen | Fehler in der Vorlage: `ch_lager_profil.lauf()` löst VOR dem Zeichen-Entfernen; Zeichen dort schon bei «mindestens einer Variante» | **Kritik:** Zeichen zuerst kürzen; nur lösen, wenn das Kürzen geklappt hat. Zeichen nur, wenn ALLE Varianten im Profil liegen. Die Vorlage selbst ist nicht angefasst (siehe «Offen»). |
| Matrix | einmalig | täglich im Scharf-Lauf | **Kritik:** täglich. Ist ein Korb teurer als ohne Profil, folgt der Rückweg automatisch. |
| Stufen | Stufe 1 heute, Stufe 2 ab 17.10. | Stufe 1 erst ab 17.10. (Überlappung mit CH-Lager Stufe 2) | **Auftrag:** Stufe 1 heute, aber klein (10 Motiv-Shirts ohne Editor). **Kritik:** Stufe 2 nicht vor dem 17.10. Meldungen je Produkt sind zuordenbar, und die Stufe-1-Shirts sind eine andere Produktgruppe als die CH-Lager-Stichprobe. |
| Altlast «Standard 0.00 ab 65» | genannt | gibt es nicht | **Kritik**, live bestätigt: General CH hat nur «Standard» 7.00 und «Kostenloser Versand» 0.00 ab 45. Das «Standard 0.00» bei Körben ab 50 kommt vom automatischen Rabatt «Gratis-Versand ab CHF 50». |
| Ausnahme in `versandprofil_poster.py` | nicht nötig | ok, ein 0.00-Profil gilt als neutral | **Kein Code**, nur ein Nachtrag im Kopf. Probelauf GEMESSEN: «ok Druck auf Bestellung Standard / Kostenloser Versand», «Würde zurückholen: 0». Stünde dort je ein Tarif > 0, wäre das Zurückholen genau der richtige Rückweg. |

## Mitgliedschaft (GEMESSEN 13.10. 21:00 UTC, `--liste`)

- **49 von 501** Druck-Produkten erfüllen die Regel:
  - 46 Motiv-T-Shirts (29.90)
  - `shirt-zum-selbstgestalten` (Editor, ab 24.90)
  - `unisex-hoodie-selbst-gestalten` (Editor, 38.90)
  - `bio-jutebeutel-selbst-gestalten` (Editor, 32.90)
- **Nicht dabei:**

| Grund | Produkte |
|---|---|
| Sticker (digital) | 271 |
| Sublimation (Tassen, Kissen, Hüllen, Magnete …) | 75 |
| Allover (cut-sew) | 67 |
| Entwurf | 13 |
| Kosten nicht gemessen (Partner-Sets, Tassen-Sets, Mauspad, Strandtuch, Notizbuch, Decke) | 12 |
| Prodigi / Bügeltransfer | 11 |
| Cap und Umhängetasche (Stick/DTF) | 2 |
| `unisex-t-shirt-selbst-gestalten` (Printful-Versand CH bis 9 T) | 1 |

- **Kosten-Cache:** `dropship/_druck_profil_kosten.json` mit 161 Printful-Katalogvarianten, 1 ohne Antwort. Quellen: Printful API v2 `/catalog-variants/{id}/prices?currency=CHF` und v1 `/shipping/rates` für Zürich und Vaduz. Der Scharf-Lauf holt ihn wöchentlich neu. Ist er älter als 21 Tage, kommen keine neuen Mitglieder dazu.

### Kosten je Bestellung (ein Artikel allein, CH, GEMESSEN Printful-Preise + Rechnung)

| Artikel | Marge vorher (Kunde zahlt 7.00) | Marge im Profil (versandfrei) | Schlechtester Fall (−10 %, MWST, Wechselkurs) |
|---|---|---|---|
| Motiv-Shirt 29.90 | 14.36 | 7.57 | 4.67 |
| Editor-Shirt 24.90 | 9.51 | 2.72 | **0.30** |
| Hoodie 38.90 | 14.71 | 7.92 | 4.15 |
| Jutebeutel 32.90 | 12.10 | 5.31 | 2.12 |

- **Was es kostet:** Je reinem Druck-Korb unter 45 fehlen in CH 7.00, in LI 14.90 Versandertrag. Gemischte Körbe zahlen wie bisher.
- **Häufigkeit:** In rund 100 Tagen gab es eine einzige Printful-Bestellung. Erwartet sind also höchstens ein paar Franken im Monat (VERMUTUNG).
- **Für den Betreiber:** Das Editor-Shirt liegt im schlechtesten Fall nur bei CHF 0.30. Mit einer Schwelle ≥ 3.00 fiele es heraus. Ohne Rabatt bleiben 2.72.

## Profil «Druck auf Bestellung» (GEMESSEN, Admin-API unstable)

- **Zone «Schweiz (Druck)»:**
  - «Standard» 0.00
  - «Kostenloser Versand» 0.00 ab 45
  - Transit beider Tarife 6–13 Werktage
- **Zone «Liechtenstein (Druck)»:** «Standard Liechtenstein» 0.00, Transit 14–44 (wie General, Rechtstexte 15–45).
- **Prüfungen:**
  - `tarife_pruefen` gegen General: leer (ok).
  - Transit nach dem Setzen: ok.
- **Gesamtzusage:** P1D + 6–13 = **7–14 Werktage**. Das ist die bestehende Zusage in Beschreibung und Versandrichtlinie. Sie steht als `profile_zonen` «Druck auf Bestellung» CH 7–14 / LI 15–45 in `automation/data/versand_transit_regel.json`, damit `versand_transit_wache --scharf` das Profil nicht auf 9–19 zurückdreht.
- **Gegenprobe:** `versand_transit_wache.py` danach: «11 Tarife mit ehrlicher Lieferzeit».
- **Zeichen:** Shop-Metafeld `luxe.druck_profil_ids` (multi_line_text_field) mit den 10 Stufe-1-IDs, zurückgelesen.

## Matrix vorher / nachher

### Versandbetrag (draftOrderCalculate mit automatischen Rabatten, keine Bestellung)

Testartikel:
- **D / D2:** `shirt-alphorn` / `shirt-1-august`, je 29.90 (Stufe 1)
- **C:** CJ-Artikel 16.90
- **CG:** CJ-Artikel 44.90
- **K:** CH-Lager-Artikel 19.90
- **S:** Sticker 4.90 (General)

| Korb | Zwischensumme | Vorher | Nachher | Urteil |
|---|---|---|---|---|
| Druck allein CH | 29.90 | 7.00 | **0.00** | günstiger |
| Druck + Druck CH (≥ 50) | 53.82 | 0.00 | 0.00 | gleich |
| Druck + CJ CH (< 45) | 42.12 | 7.00 | 7.00 | gleich (7 + 0, nicht 14) |
| Druck + CJ CH (≥ 50) | 67.32 | 0.00 | 0.00 | gleich |
| Druck + CH-Lager CH (< 45) | 44.82 | 7.00 | **0.00** | günstiger (beide Profile 0.00) |
| Druck allein LI | 29.90 | 14.90 | **0.00** | günstiger |
| Druck + CJ LI | 42.12 | 14.90 | 14.90 | gleich (nicht 29.80) |
| Sticker allein CH | 4.90 | 7.00 | 7.00 | gleich |
| Sticker + Druck CH | 31.32 | 7.00 | 7.00 | gleich |

Ergebnis: **9/9 wie erwartet, 0 teurer.**

### Datum in der echten Kasse (`tools/browser.mjs`, Warenkorb-Link → Kasse, Testadresse, kaufweg-test@example.com, nie bestellt; Zeilen in `dropship/_kaufweg_tests.txt`)

| Korb | Vorher | Nachher |
|---|---|---|
| Druck allein CH | Standard «Mi., 28. Okt–Mi., 11. Nov» CHF 7.00 | Standard **«Fr., 23. Okt–Di., 3. Nov» KOSTENLOS** |
| Druck + Druck CH | Kostenloser Versand / Standard je «28. Okt–11. Nov» | beide **«23. Okt–3. Nov»** KOSTENLOS |
| Druck allein LI | «Mi., 4. Nov–Mi., 16. Dez» CHF 14.90 | «4. Nov–16. Dez» **KOSTENLOS** |
| Sticker allein CH | «28. Okt–11. Nov» CHF 7.00 | unverändert |
| Druck + CH-Lager CH | **2 Lieferungen:** CH-Lager «Fr., 16. Okt–Mo., 19. Okt» KOSTENLOS · Shirt «28. Okt–11. Nov» CHF 7.00 | Betrag per API 0.00; Datum nicht gemessen (siehe unten) |
| Druck + CJ (CH, LI), Sticker + Druck | Datum 28.10.–11.11. bzw. 4.11.–16.12., Betrag wie Tabelle oben | Betrag per API gleich; Datum nicht gemessen |

**Was ein Mischkorb zeigt (GEMESSEN):** Die Kasse teilt einen Mischkorb in **eine Lieferung je Profil**, jede mit eigenem Datum. Ein Shirt im Profil zeigt darin also sein eigenes Fenster. Das Fenster der langsameren Ware bleibt bei dieser. Der Korb (`lux_cart_trust`) nennt den «langsamsten Artikel», das passt dazu.

**Nicht gemessen:** Nach rund 20 Kassenaufrufen in einer Stunde verlangte Cloudflare von unserer IP eine Prüfung «Bestätigen Sie, dass Sie ein Mensch sind». Die Mischkörbe nachher sind deshalb nur im Betrag (API) belegt, nicht im Datum im Browser. Nachmessen: `NUR="Druck + CJ klein CH|…" node <scratchpad>/dp/kasse_matrix.mjs` an einem anderen Tag. Zwei Wiederholungen um ~21:40 waren ebenfalls blockiert.

### Seitenfenster gegen Kassenfenster (neu in `versand_transit_wache.py`, Zeile «SEITE≠KASSE», GEMESSEN live 21:30)

| Tier | Seite / Korb heute | Kasse | gleich? |
|---|---|---|---|
| Asien | 28.10.–11.11. | 28.10.–11.11. | ja |
| CH-Lager mit Zeichen | 16.10.–19.10. | 16.10.–19.10. | ja |
| CH-Lager ohne Zeichen | 28.10.–11.11. | 28.10.–11.11. | ja |
| **Druck mit Zeichen** | 22.10.–2.11. (Kalendertage) | 23.10.–3.11. | **nein**, Seite 1 Tag zu früh, bis der Theme-Patch steht |
| **Druck ohne Zeichen** | 22.10.–2.11. | 28.10.–11.11. | **nein** (wie vor heute), bis der Theme-Patch steht |
| EU-Lager | 16.10.–23.10. (Kalendertage 3–10) | 28.10.–11.11. | **nein**, NEBENBEFUND, nicht dieser Auftrag |

Selbsttest mit den Live-Kopien vom 13.10. (`automation/data/seite_kasse_test/`): `--selbsttest-seite` 12/12. Nach dem Patch unten zeigen Druck mit und ohne Zeichen auf Seite **und** im Korb dasselbe wie die Kasse.

## Wächter

- **`automation/druck_profil.py --scharf` (täglich, Eintrag siehe unten), in dieser Reihenfolge:**
  1. Tarife prüfen. Preis ≠ 0 → **automatischer Rückweg**. Name oder Bedingung anders → kein Zuordnen.
  2. Transit prüfen und nur in diesem Profil nachsetzen.
  3. Kosten wöchentlich neu holen.
  4. Regel je Produkt rechnen (auch NEUE Druck-Produkte).
  5. Zeichen kürzen, dann lösen, dann zuordnen.
  6. Korb-Matrix: teurer → **automatischer Rückweg**.
  7. Zeichen setzen, nur wenn alle Varianten im Profil liegen.
  8. Meldet: Produkt im Profil ohne Zeichen, Zeichen ohne Profil, Mitgliedschaft gegen Regel, fehlende Soll-Produkte.
- **Stufe 2** (alle 49) schaltet der Scharf-Lauf ab **17.10.** selbst ein, wenn:
  - die Stufe-1-Shirts bei Google keine NEUE Versand- oder Preis-Meldung tragen,
  - Tarife und Transit ok sind.
  - Die Meldung «Missing shipping info … [LI]» bestand schon vorher: an 5 der 10 Shirts und an 28'541 Produkten im General profile. Sie steht als `google_basis` in der Stufen-Datei und hält nicht auf.
- **`versand_transit_wache.py`:**
  - hält den Transit (`profile_zonen`);
  - neue Zeile **«SEITE≠KASSE»** je Tier, mit/ohne Zeichen, Stand in `dropship/_seite_kasse_fenster.json`.
- **Selbsttest `druck_profil.py --selbsttest`:** 17/17.

## Rückweg

```
python3 automation/druck_profil.py --rueckweg --scharf
```

- Leert zuerst das Zeichen (die Seite zeigt dann das lange Datum) und löst erst danach alle Varianten. Sie fallen ins General profile zurück.
- Probelauf getestet: «Zeichen 10 Produkte · 50 Varianten im Profil».
- Profil löschen ist danach optional (leer = wirkungslos).
- `profile_zonen` «Druck auf Bestellung» kann stehen bleiben.

## Eintragen (nicht selbst gemacht, die Dateien gehören gerade anderen Workflows)

1. **Theme `templates/product.json`, Block `lux_delivery` (Live-Theme 187533001089):** Live-Datei holen, Backup `theme_backup/templates__product.json.vor-druckprofil-1013` anlegen.
   - **Anker:** Im Zweig `{%- elsif closest.product.tags contains 'printful_personalized_product' or … 'selbst-gestalten' -%}` diese zwei Zeilen
     ```liquid
       {%- assign d_from = now_s | plus: 777600 -%}
       {%- assign d_to = now_s | plus: 1641600 -%}
     ```
     ersetzen durch
     ```liquid
       {%- assign lx_druck_key = ',' | append: closest.product.id | append: ',' -%}{%- if shop.metafields.luxe.druck_profil_ids.value contains lx_druck_key -%}{%- assign lx_tmin = 6 -%}{%- assign lx_tmax = 13 -%}{%- else -%}{%- assign lx_tmin = 9 -%}{%- assign lx_tmax = 19 -%}{%- endif -%}
     ```
   - `lager = 'Druck auf Bestellung'` bleibt. Die bestehende Werktag-Rechnung (`if lx_tmin > 0`) übernimmt.
   - Ohne Metafeld (nil) gilt das lange Datum, also die sichere Richtung.
2. **Theme `templates/cart.json`, Block `lux_cart_trust`:** vier Ersetzungen.
   - (a) `{%- assign lux_ohne_marke = false -%}` → dahinter `{%- assign lux_druck_lang = false -%}{%- assign lux_druck_ids = shop.metafields.luxe.druck_profil_ids.value | default: ',' -%}`
   - (b) in der Druck-Zeile nach `{%- assign r = 2 -%}` → `{%- assign lx_druck_key = ',' | append: item.product_id | append: ',' -%}{%- unless lux_druck_ids contains lx_druck_key -%}{%- assign lux_druck_lang = true -%}{%- endunless -%}`
   - (c) `{%- when 2 -%}{%- assign d_from = now_s | plus: 777600 -%}{%- assign d_to = now_s | plus: 1641600 -%}` → `{%- when 2 -%}{%- if lux_druck_lang or lux_ohne_marke -%}{%- assign lx_tmin = 9 -%}{%- assign lx_tmax = 19 -%}{%- else -%}{%- assign lx_tmin = 6 -%}{%- assign lx_tmax = 13 -%}{%- endif -%}` (der Rest der Zeile `{%- assign lux_lager = 'Druck auf Bestellung' -%}` bleibt)
   - (d) `{%- if lux_rang == 0 or lux_rang == 3 -%}` → `{%- if lux_rang == 0 or lux_rang == 2 or lux_rang == 3 -%}`
   - Die exakten Texte (roh, wie in der JSON-Datei) stehen als `PRODUCT_PATCH` / `CART_PATCH` in `automation/versand_transit_wache.py`. Der Selbsttest wendet sie auf die Live-Kopien an (12/12).
   - **Nach dem Hochladen:** `python3 automation/versand_transit_wache.py` → Druck-Zeilen «gleich», dann WebFetch auf `/products/shirt-alphorn` (Stufe 1, «23. Okt. – 3. Nov.») und `/products/keramik-tasse-selbst-gestalten` (ohne Zeichen, «28. Okt. – 11. Nov.»).
3. **`automation/fixer_keepalive.sh`:** direkt nach dem Block `ch_lager_profil` (Zeile ~2072), gleiches Muster:
   ```bash
     # 13.10.2026 (Entscheid 2, Betreiber «versandprofil ja mache es sauber»): Druck auf Bestellung (DTG-Shirts/Hoodies von Printful,
     # Marge ≥ 0 im schlechtesten Fall) im Profil «Druck auf Bestellung» (0.00-Tarife unter den General-Namen, Transit 6–13) → Kasse
     # = Seite. Täglich: Tarife/Transit, Regel (auch neue Druck-Produkte), Zeichen luxe.druck_profil_ids, Korb-Matrix (teurer → Rückweg),
     # Stufe 2 ab 17.10. selbst. Bericht dropship/DRUCK-PROFIL-2026-10-13.md.
     DRP=/tmp/druck_profil.log
     if [ -f "$REPO/automation/druck_profil.py" ]; then
       ALTER=$(( $(date +%s) - $(stat -c %Y "$DRP" 2>/dev/null || echo 0) ))
       if [ "$ALTER" -gt 86400 ] || absturz_nachholen "$DRP"; then
         touch "$DRP"
         ( cd "$REPO" && setsid bash -c "exec 9>/tmp/lock_druck_profil.lock; flock -n 9 || exit 0; exec timeout 1800 python3 automation/druck_profil.py --scharf" >> "$DRP" 2>&1 9>&- & )
         echo "$(date -u +%H:%M) druck-profil abgeglichen"
       fi
     fi
   ```
4. **`automation/betreiber_ampel.py`:** Funktion `druck_profil_zeile()` nach dem Muster `ch_lager_profil_zeile()` (Zeile 505), aufgerufen direkt nach ihr (Zeile ~547). Sie liest `dropship/_druck_profil.json` und gibt `None`, solange alles ok ist. Sonst eine dieser Zeilen:
   - `fehler` → «⚠️ DRUCK-PROFIL: …»
   - `auto_rueckweg` → «⚠️ DRUCK-PROFIL: automatischer Rückweg (…) — Profil leer, Ursache prüfen»
   - nicht `tarife_ok` oder nicht `transit_ok` → «⚠️ DRUCK-PROFIL: Tarif-/Transit-Befund … → Zuordnen gestoppt»
   - `matrix.teurer` > 0 oder `matrix_abweichend` > 0 → «⚠️ DRUCK-PROFIL: Korb-Matrix ≠ Soll»
   - Stand älter als 30 h → «⚠️ DRUCK-PROFIL: Tageslauf fehlt (Log /tmp/druck_profil.log)»
   - `im_profil_ohne_zeichen`, `zeichen_ohne_profil`, `gegen_regel` oder `soll_fehlt` nicht leer → je Anzahl
   - `google_halt` nicht leer → «Stufe 2 angehalten: Google-Meldung an …»
   - `kosten_alter_tage` > 14 → «Kosten-Cache alt (PRINTFUL_API_KEY im Aufseher?)»
5. **Ampel-Zeile «SEITE≠KASSE»:** `versand_transit_wache.py` druckt sie selbst. Falls die Ampel nur bestimmte Präfixe übernimmt: `dropship/_seite_kasse_fenster.json` lesen und die `befunde` zeigen.
6. **Texte ausserhalb des Profils** (rund 440 Druck-Produkte zeigen nach dem Theme-Patch 10–20 Werktage wie die Kasse):
   - Der Beschreibungs-Baustein `ls-liefer` «7–14 Werktage · Druck auf Bestellung» in ~487 Beschreibungen soll «Lieferdatum oben beim Artikel» heissen. Dieser Text ist für Mitglieder UND Nicht-Mitglieder richtig.
   - Die Versandrichtlinie «Druck auf Bestellung 7–14 Werktage» braucht einen Zusatz für Sticker, Tassen, Kissen, Magnete, Allover und Mauspads (10–20). Das ist ein Rechtstext: **Betreiber melden, nicht still ändern.**

## Offen / Nebenbefunde

- **`ch_lager_profil.py` (nicht meine Datei):**
  - `lauf()` löst Varianten (Zeile 425), BEVOR das Zeichen entfernt wird (Zeile 434).
  - Das Zeichen gilt schon ab «mindestens einer Variante im Profil».
  - In `--zurueck` werden alle Varianten gelöst, auch wenn das Entfernen einzelner Zeichen gescheitert ist.
  - → eigene Aufgabe (Muster: `druck_profil.py`, Schritte 1–5).
- **EU-Lager:** Seite und Korb rechnen 3–10 Kalendertage, die Kasse 10–20 Werktage (General profile). Die neue Zeile «SEITE≠KASSE» meldet das ab heute. Eigene Klasse.
- **Allover-Kleid und Boardshorts:** Printful liefert nicht nach LI und braucht nach CH 20–25 Tage. Damit ist schon das General profile (10–20) zu kurz. Eigene Aufgabe.
- **Printful-Profile «Printful: …»:** CH-Tarife wieder 10.39/11.39. Darin liegen nur Entwürfe, `versandprofil_poster` holt aktive Ware täglich zurück. Die Printful-App könnte bei einer Synchronisation Varianten dorthin legen; dann fehlt im Profil «Druck» eine Variante, das Zeichen fällt weg (sicher), und der tägliche Lauf ordnet neu zu.
- **Druckzeit 7–14 Werktage für DTG:** Printful-Schätzung (2–5 Werktage Produktion + 3–6 Versand). Gemessen ist nur #1005 (Allover). VERMUTUNG, bis die erste Shirt-Bestellung im Profil zugestellt ist.
- **`pod_editor_qa.mjs`:** nicht nötig, es gab keinen Schreibvorgang an einem Produkt (nur Versandprofil und Shop-Metafeld). Stufe 1 enthält kein Editor-Produkt.
