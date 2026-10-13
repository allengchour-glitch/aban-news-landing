# Lieferdatum für Ware ab Schweizer Lager in der Kasse, 13.10.2026

**Auftrag:** Betreiber, 13.10.: «1 entscheide du». Gemeint war Entscheid 1 aus `dropship/KASSEN-PRUEFUNG-2026-10-13.md`.

**Prüfung:** Workflow `wf_3a8f194a-f37` mit vier Agenten, alle nur lesend:
- Körbe
- Google-Import
- Theme-Hinweis
- Gegenprüfer der ersten Empfehlung

## Befund vorher (GEMESSEN)

- **Kasse:** Ein Kostüm ab Schweizer Lager hatte auf der Produktseite «14.–16. Okt», in der Kasse aber «28. Okt–11. Nov». Das ist nach Halloween.
- **Ursache:** Alle 2'375 aktiven Fortura-Produkte (Tag `ch-lager`) lagen im «General profile», zusammen mit 51'168 CJ-Produkten.
  - Die Kasse rechnet Bearbeitungszeit plus Transitzeit des Tarifs: P3D (gilt für den ganzen Shop) + CJ 7–17 T.
- **Kosten einer Änderung:** In 82 Tagen gab es 0 gemischte Körbe (Fortura + CJ) und 0 Fortura-Käufe.
  - Grundlage: 18 fremde Bestellungen und 15 abgebrochene Kassen.
  - 32 von 33 Körben hatten genau ein Produkt.
- **Google:** Der Import übernimmt nur das General profile (QUELLE support.google.com/merchants/answer/14232591).

## Entscheid: Profil «CH-Lager» mit 0.00-Tarifen unter den gleichen Namen

| Variante | Ergebnis | Urteil |
|---|---|---|
| (a) Eigenes Profil mit 7.00 / gratis ab 45 | Gemischter Korb unter 45 zahlt 14 statt 7, in LI 29.80. Der tägliche Wächter `versandprofil_poster.py` würde die Ware am nächsten Tag ins General profile zurückholen (Regel vom 14.08.: «nur EINE Tarifquelle»). | verworfen |
| (b) Nur ein Hinweissatz auf der Produktseite | Die Kasse zeigt weiter das Datum nach Halloween, also genau dort, wo bezahlt wird. | nur Rückfall |
| **(c) Profil mit 0.00-Tarifen unter den Namen des General profile** | Shopify zählt gleichnamige Tarife verschiedener Profile zusammen. Preisbedingungen prüft es an der Korbsumme (QUELLE help.shopify.com …/combined-shipping-rates; GEMESSEN 14.08. am Zendrop-Profil). **Niemand zahlt mehr als heute.** | **umgesetzt** |

### Kosten von (c)

- Bei einem reinen CH-Lager-Korb unter 45 fallen bis zu CHF 7 Versandertrag weg.
- Bisher wären das CHF 0 gewesen.
- Die Marge bleibt positiv (Gegenprüfer, gemessen am Fortura-EK inkl. DPD 9.50, 3'999 Varianten):
  - ohne Versandertrag: Median 6.36, Minimum 3.36
  - nach Zahlungsgebühren im Minimum etwa CHF 2 (VERMUTUNG)

### Google bei (c)

- Das General profile bleibt unberührt. Google zeigt für CH-Lager-Ware deshalb weiter 7.00 / gratis ab 45 / 10–20 T.
- Das ist nie weniger, als die Kasse verlangt.
- «Inaccurate shipping costs» greift nur, wenn Google TIEFER liegt als die Kasse (QUELLE support.google.com/merchants/answer/10248678).
- Offen bleiben die nicht benannten «errors» bei Zusatzprofilen. Deshalb gibt es Stufen (siehe unten).

## Umgesetzt (GEMESSEN)

### Profil angelegt

- **Profil:** `gid://shopify/DeliveryProfile/152621121927` «CH-Lager», Standort «Shop location».
- **CH:** «Standard» 0.00 und «Kostenloser Versand» 0.00 ab 45, Transit 1–2 T.
- **LI:** «Standard Liechtenstein» 0.00, Transit 12–42 T wie im General profile, weil Fortura LI nicht automatisch beliefert.
- **Hürde beim Anlegen:** `rateGroupsToCreate` lehnt Shopify ab («cannot use both rate groups and legacy rate provider»).
  - Deshalb wird der Preis über `rateDefinition` gesetzt.
  - Die Transitzeit setzt danach `versand_transit_wache.py --scharf` über die neue Regel `profile_zonen` («CH-Lager»: CH 4–5, LI 15–45 Gesamtzusage).

### Korb-Matrix (`ch_lager_profil.py --test`, draftOrderCalculate, keine Bestellung)

Ergebnis: **8/8 wie heute oder günstiger.**

| Korb | Zwischensumme | Günstigster Versand |
|---|---|---|
| Maske allein (CH) | 27.90 | 0.00 «Standard» |
| Kostüm 58.00 allein (CH) | 58.00 | 0.00 |
| CJ allein (CH) | 16.90 | 7.00 (wie heute) |
| Maske + CJ (CH), nach −10 % | 40.32 | **7.00** (nicht 14) |
| Maske + CJ gross (CH) | 65.52 | 0.00 |
| Maske allein (LI) | 27.90 | 0.00 |
| CJ allein (LI) | 16.90 | 14.90 (wie heute) |
| Maske + CJ (LI) | 40.32 | **14.90** (nicht 29.80) |

### Kasse (`tools/kaufweg_handy.mjs --produkt maske-mit-hornvieh-mit-moos-ftck13817`, Testadresse)

- **Vorher:** «28. Okt–11. Nov»
- **Nachher:** **«Standard Di., 20. Okt–Mi., 21. Okt KOSTENLOS»**

### Stufe 1 zugeordnet

- 1'607 Produkte mit 3'219 Varianten, alle CH-Lager-Ware AUSSERHALB des Google-Kanals (vor allem Kostüme).
- Rückgelesen: fehlt 0, falsch 0.

### Nebenbefund: `versand_transit_wache.py` sah nur die ersten 50 Profile

- Der Shop hat 55 Profile. Das neue Profil und 16 Printful-Profile standen auf Seite 2 und wurden nie geprüft.
- Jetzt blättert die Wache.
- «Printful:» steht neu in `ausnahme_profile_praefix`: App-verwaltet wie Gelato, CH-Tarife seit 14.08. auf 0.00.
- Ergebnis: 8 Tarife ok.
- Dazu: Bei Drosselung wartet die Wache und fragt neu, statt «unklar» zu melden.

## Stufen (`dropship/_ch_lager_profil_stufe.json`)

| Stufe | Inhalt | ab |
|---|---|---|
| 1 | CH-Lager-Ware ausserhalb des Google-Kanals, Google-Risiko null | 13.10. ✅ |
| 2 | dazu 25 Google-Produkte (kleinste IDs); 3 Tage `google_feedback_wache` auf «shipping»/«Inaccurate» prüfen | 14.10. |
| 3 | alle 2'375 | frühestens 17.10. |

**Rückweg:** `python3 automation/ch_lager_profil.py --zurueck --scharf`. Damit fällt alles ins General profile zurück.

## Wächter

- **`automation/ch_lager_profil.py --scharf`, täglich im Aufseher:**
  - prüft vorher die Tarife: alle 0.00, gleiche Namen und Bedingungen wie General;
  - bei einem Befund ordnet er nichts zu;
  - ordnet NEUE CH-Lager-Importe zu und löst Varianten, die nicht hingehören;
  - Selbsttest 8/8.
- **`versand_transit_wache.py --scharf`, täglich:** hält die Transitzeit des Profils (Regel `profile_zonen`).
- **`versandprofil_poster.py`:** wertet das Profil als «neutral» (0.00) und lässt es in Ruhe (gemessen: «Würde zurückholen: 0»).
- **Ampel-Zeile «CH-LAGER-PROFIL»** erscheint nur bei Tarif-Befund, altem Stand, nicht zugeordneten Resten oder fälliger nächster Stufe.
  - Die alte Zeile «KASSEN-DATUM CH-LAGER … Entscheid» ist weg.

## Offen

- **Produktseite und Kasse:** Für reine CH-Lager-Körbe zeigt die Produktseite «14.–16. Okt», die Kasse «20.–21. Okt».
  - Die Bearbeitungszeit P3D gilt für den ganzen Shop, je Profil gibt es keine.
  - Die Kasse liegt damit später als die Seite. Das ist die vorsichtige Richtung, aber nicht deckungsgleich.
  - Mögliche nächste Klasse: `lux_delivery` für CH-Lager auf «Bearbeitung + 1–2 T» rechnen (Theme-Änderung mit Live-Datei + Backup).
- **Gratisversand:** «Gratis ab CHF 50» auf CH-Lager-Seiten stimmt, verschenkt aber ein Verkaufsargument, denn ein reiner CH-Lager-Korb ist jetzt immer gratis.
  - Erst nach Stufe 3 und einer Messung umformulieren.
- **Mischkorb:** Bei einem gemischten Korb nimmt die Kasse das spätere Datum (CJ). Das ist ehrlich und bleibt so.
- **Bestellschluss bis Halloween:** Für reine CH-Lager-Körbe Di 27.10. vor 12 Uhr. Gerechnet ab 13.10. 17:00 mit P1D + 1–2 Werktagen, die Kasse zeigt dann spätestens Fr 30.10. Vorher, mit P3D, war es Do 22.10.

## Nachtrag 13.10. 17:00 UTC: Bearbeitungszeit 3 → 1 Werktag (Betreiber «entscheide du sauber», Klick im Admin)

| Bereich | Neu | Prüfung |
|---|---|---|
| Shop-Einstellung | `processingTime` = P1D | an der API bestätigt |
| `versand_transit_regel.json` | CH-Lager-Zusage 2–3 Werktage | — |
| `versand_transit_wache --scharf` | CJ-Transit 9–19, LI 14–44, CH-Lager 1–2 | gesetzt 6, danach 8/8 Tarife ok |
| Kasse CJ | bleibt 10–20 Werktage | — |
| Kasse Maske ab Schweizer Lager | «Fr., 16. Okt–Mo., 19. Okt KOSTENLOS» (vorher 20.–21. Okt., heute Mittag noch 28. Okt.–11. Nov.) | — |
| Theme (product.json, cart.json) | Rechnung `3 | plus` → `1 | plus`, Asien 7/17 → 9/19 | Backup, md5-Schutz, zurückgelesen |
| Produktseite der Maske | «16. Okt. – 19. Okt.», wie die Kasse | WebFetch |
| `kassen_lieferdatum_wache.py` | Theme-Prüfung grün (Bearbeitung 1 T) | Selbsttest 7/7 |

Die alte Regel «Bearbeitung < CJ-Versand-Median = Kasse zu früh» hätte nach der Umstellung Fehlalarm gegeben («empfohlen 3 Werktage»). Seit die Transitzeit die Bearbeitung abzieht, prüft sie jetzt das Zusage-Minimum (10) gegen den gemessenen Versand (80 % = 2,4 Werktage) plus 1 Werktag.

## Nachtrag 13.10. ~18:30 UTC: Profil-Zeichen `profil-ch-lager` (Befund der Gegenprüfung «Restlücke General profile»)

**Befund (GEMESSEN):** Von 2'375 aktiven CH-Lager-Produkten lagen 1'611 im Profil «CH-Lager», ~764 noch im General profile (Stufe 1 = nur Ware ausserhalb des Google-Kanals). Für diese ~764 zeigten Produktseite und Warenkorb das kurze Datum «16.–19. Okt.», die Kasse aber 28. Okt.–11. Nov. Betroffen waren auch alle 22 Artikel der Startseiten-Reihe «🇨🇭 Ab Schweizer Lager» (`blitzversand-highlights`).

**Lösung:**
- `ch_lager_profil.py` setzt den Tag `profil-ch-lager` genau auf die Produkte, die mindestens eine Variante im Profil haben, und entfernt ihn, wenn sie es verlassen. Beim Rückweg werden die Zeichen zuerst entfernt (lieber kurz das lange Datum als ein zu frühes).
  - Die Tags werden gebündelt gesetzt, je 20 in einer Anfrage. Einzeln hätte es für 1'611 Produkte ~55 Min. gebraucht.
- Theme:
  - `lux_delivery` rechnet das kurze Datum nur noch mit dem Zeichen. Ohne Zeichen rechnet es 9–19 Werktage (wie die Kasse) und zeigt «🇨🇭 Ab Schweizer Lager» statt «Blitzversand».
  - `lux_cart_trust` zeigt das lange Datum, sobald ein CH-Lager-Artikel im Korb kein Zeichen hat.
- **Wächter:** `kassen_lieferdatum_wache.py` meldet, wenn das Zeichen im Theme fehlt (Selbsttest 8/8). Der tägliche Lauf von `ch_lager_profil.py --scharf` gleicht die Zeichen für neue Importe ab.

**Mitgezogen (alle Aussagen «1–2 Werktage» für CH-Lager-Ware; die Kasse rechnet seit P1D 2–3 Werktage):**
- **Versand-Akkordeon auf jeder Produktseite:** «ab Schweizer Lager meist 2–3 Werktage», Lieferdatum «oben beim Artikel und in der Kasse».
- **Kollektionen:**
  - `kostueme-ch-lager`, `blitzversand-schweiz` (Titel neu «🇨🇭 Alles ab Schweizer Lager»), `blitzversand-highlights`
  - Backup unter `scratchpad/kollektion_lieferdatum/backup_20261013.json`
- **Startseite:**
  - `trust_advantages`: «meist in 2–3 Werktagen»
  - `lux_spotlight_video`: «Lieferdatum auf jeder Produktseite»
- **Social-Nachschub:** nur noch Ware mit Zeichen, Zeile «meist in 2–3 Werktagen bei dir».
- **`zusagen_abgleich.py`:** «Lieferdatum oben auf dieser Seite».
- **`anlass_lieferzeit_wache`:** schnell 6 → 4 Werktage (P1D). Die Wache hält Halloween bis Mo 26.10. für rechtzeitig.
- **`warenkorb_einig.py` LI_NEU:** jetzt der aktuelle Live-Block. Vorher hätte ein Reparaturlauf die Kalendertage-Fassung vom 09.10. zurückgeschrieben.

**Offen:** Stufe 3 (frühestens 17.10.) bringt die übrigen ~764 ins Profil. Dann zeigt auch deren Seite das kurze Datum.
