# Lieferbarkeit CH — besuchte Produktseiten ohne Versandprüfung (05.10.2026)

Betreiber-Auftrag 04.10. 22:17 UTC «fix 12 h lang alles», Bereich **lieferbarkeit-ch**.
Klasse: aktive CJ-Produkte, auf denen Menschen landen, die aber nie gegen CJs CH-Versand (`freightCalculate CN→CH`)
geprüft wurden — die #1016/#1017-Klasse (bezahlt, nicht lieferbar, erstattet).

## Vorher (gemessen 05.10. 00:40–00:50 UTC)

| Zahl | Was | Befehl / Quelle |
|---|---|---|
| 388 | Produkt-Landeseiten mit menschlichen Sitzungen, 30 T (681 Sitzungen) | ShopifyQL `FROM sessions SHOW sessions GROUP BY landing_page_path WHERE human_or_bot_session='human' SINCE -30d LIMIT 1000` |
| 329 | davon ACTIVE mit CJ-SKU | `products(query:"handle:…")` in 25er-Bündeln, SKU-Formen CJ-/CJxx |
| 41 / 66 | Handles / Sitzungen mit `referrer_name = google` (274 ohne Referrer, 54 Facebook, 39 Pinterest) | gleiche Abfrage `GROUP BY landing_page_path, referrer_name` |
| **209** | aktive CJ-Landeseiten **ohne jede CH-Versandprüfung** (303 Sitzungen, 15 Google) — in keinem der vier Ledger `_cj_versand_ch_pruef.txt` (handle), `_cj_versand_ch.txt` (gid, nur ≥ CHF 100), `_besuchte_seiten_nicht_lieferbar.txt`, Log des Tageswächters | Join in `scratchpad/mess3.py` |
| 119 | mit CH-Prüfung (85 im Oktober, 34 im September, `git blame`) | `_cj_versand_ch_pruef.txt` |
| 313 / 16 | Existenz bei CJ geprüft (`_cj_verfuegbarkeit.txt` ok) / nie | — |
| 18 | verkaufte Produkte 90 T; **5 davon ACTIVE ohne CH-Prüfung**: Cargo-Hose «Trail» (höchster Umsatz), Leinen-Set Provence (42 Sitzungen), Gemüseschneider, Blumenkleid, Midikleid | ShopifyQL `FROM sales SHOW net_sales GROUP BY product_id, product_title SINCE -90d` |
| 2 von 8 | Läufe des Tageswächters `besuchte_seiten_lieferbar.py` seit 27.09., die bis «LIEFERBAR:» kamen (6 starben am stündlichen Container-Neustart; nichts geschrieben, Prüfung verloren) | `grep -c "besuchte Produktseiten" /tmp/besuchte_seiten_lieferbar.log` = 8, `grep -c "^LIEFERBAR:"` = 2 |
| 45 | Seiten je Lauf (MAX_SEITEN), 60 T | Skript-Default |
| 44'061 / 63'387 | CJ-Punkte Rest / Total heute (Gratis-Sonde productComments) — Budget ist NICHT der Engpass, die geteilte 1-Anfrage/s-Uhr mit 14 Verbrauchern ist es (~10 s je Aufruf, ~32 s je Produkt) | `pointsInfo` |
| 16 | CH-Optionen für den Kanarienvogel vid 2608150717551606700 (#1018, geliefert) | `freightCalculate` |

Rückstand der anderen Wächter (nur gemessen, nicht angefasst — laufen gerade):
- `cj_verfuegbarkeit.py` (Existenz, einmalig): 49'729 Ledger-Zeilen (49'304 ok, 425 weg), **1'359 aktive cj-real offen**; pausierte heute bei Punkte-Rest 207 < 400, läuft seit 00:25 wieder.
- `cj_ausgelistet_sichtbar.py` (Existenz, rollierend): Stufe A 953 sichtbar täglich; Stufe B 1'500/Lauf, 4'421 Zeilen seit 28.09. (62 weg) → ~630/Tag, 46'500 aktive CJ brauchen so ~73 Tage, nicht 30 wie geplant.
- `cj_versand_ch_sichtbar.py` (CH-Versand, FIX=1, Einzelmessung): 1'607 geprüft von 46'514 Handles in `_cj_specs_prio.txt` (44'884 davon «bestand» = der ganze Katalog, keine Prio mehr); 563 DRAFT, 1'163 ok, 1'967 unklar. Revive-Ledger: 315 wiederbelebt / 278 keine-linie / 10 Verlust — die Einzel-NEIN vom 03./04.09. wurden also zur Hälfte durch CJs neue Linie «EQ Sensitive» überholt, nicht durch Fehlmessung.
- `cj_versand_ch_guard.py` (≥ CHF 100): 592 Kandidaten, Ledger 1'496, täglich fertig («FERTIG: 3 versendbar, 1 nicht, 4 unklar»).

## Getan — `automation/besuchte_seiten_lieferbar.py` erweitert (kein neues Skript)

1. **Ledger je Handle** `dropship/_besuchte_seiten_geprueft.tsv` (handle · Epoche · ja/NEIN/unklar · Grund · SKU), geschrieben
   SOFORT nach jedem Urteil → ein sterbender Lauf verliert höchstens ein Produkt. Ein «ja» gilt 14 Tage (`FRIST_JA_TAGE`),
   NEIN/unklar werden im nächsten Lauf neu gefragt.
2. **Abdeckung**: ShopifyQL LIMIT 250 → 1000, `MAX_SEITEN` 45 → 400 (alle Produkt-Landeseiten 60 T), aber
   **`MAX_PRODUKTE` 100 je Lauf** (≈ 300 CJ-Aufrufe); der Rest «bleibt für den nächsten Lauf» (steht im Log).
3. **Zweite Messung bei NEIN** (15 s später, +1 Aufruf): widersprüchlich → «unklar», bestätigt → «· 2. Messung bestaetigt».
   Die Zwei-Läufe-Regel der Vollstreckung (DRAFT erst beim zweiten NEIN aus einem späteren Lauf) bleibt unverändert.
4. `NUR_NEIN=1` = Bestätigungslauf nur über Ledger-NEIN (das zweite NEIN ohne neue Fragen an den Eimer).
5. Entwürfe werden nicht mehr bei CJ gefragt (kein Aufruf für Ware, die niemand kaufen kann).
6. `START …` als erste und `FERTIG: …` als letzte Zeile → `still_gestorben()` des Aufsehers kann den Lauf nachholen,
   sobald der Aufseher-Block das auch abfragt (siehe Wächter-Block im Ergebnis); `DRY=1` schreibt weder Register noch Bericht noch Politur.

Trockenlauf 00:49 UTC (`DRY=1 MAX_PRODUKTE=6`): Kanarienvogel 16 Optionen; 5 ja (Leinen-Set Provence 16 Optionen ab USD 10.49,
Plateau-Sneaker 16 ab USD 14.72, Tunmate-Rizinusöl 3 ab USD 6.67), 1 NEIN = das bekannte Rizinusöl-Wickel-Set (schon DRAFT), 2. Messung bestätigt.

## Nachher (gemessen 05.10. 02:00 UTC)

**Lauf 1, scharf, 00:54–01:57 UTC** (63 min für 100 Produkte — die geteilte CJ-Uhr gibt ~10 s je Aufruf): Kanarienvogel 16 Optionen;
`FERTIG: 100 gefragt · lieferbar 79 · NEIN 2 · unklar 5 · 295 offen` — 14 Entwürfe ohne CJ-Aufruf übersprungen, 4 der 5 «unklar» waren
POD-SKUs (`9000001_10163`, `GLOBAL-FAP-A4`), die der alte Filter nicht kannte → Regel jetzt «alles ohne CJ-Anfang ist kein CJ-Artikel».

**Lauf 2, Bestätigung `NUR_NEIN=1`, 01:58 UTC** (zweiter, unabhängiger Lauf, Kanarienvogel 16): beide NEIN erneut 0 Optionen (je 2 Messungen)
→ **2 auf DRAFT mit Tag `cj-keine-ch-versandoption`**, zurückgelesen (Status DRAFT, Tag vorhanden):
- `/products/ubersetzer-kopfhorer-144-sprachen-echtzeit-bluetooth-5-3` — CHF 69.90, SKU CJFU29004820001, Tags **bestseller, hero**, in 8 Kanälen inkl. Google; 1 Sitzung 30 T. Kein CH-Versandweg (101 g, Akku).
- `/products/outdoor-bluetooth-speaker-solar-rgb-licht-wasserdicht-tragbar` — SKU CJ-CJYS260671001AZ, 545 g, Solar/Akku; Landeseite der letzten 60 T.

| Zahl | Was |
|---|---|
| 93 | Zeilen im neuen Ledger `dropship/_besuchte_seiten_geprueft.tsv` (84 ja · 5 NEIN · 4 unklar) |
| 86 | der 209 ungeprüften Landeseiten jetzt geprüft (die mit den meisten Sitzungen zuerst; Leinen-Set Provence 16 Optionen ab USD 10.49, Cargo-Hose, Gemüseschneider, Blumen-/Midikleid alle «ja») |
| 295 | offen → der tägliche Lauf (MAX_PRODUKTE 100) braucht 3 Tage; danach Dauerkosten ≈ 400/14 ≈ 30 Produkte ≈ 90 CJ-Aufrufe je Tag |
| ~330 | CJ-Aufrufe dieser Runde (Trockenlauf 18, Lauf 1 ≈ 305, Lauf 2 ≈ 8) — Vorgabe war ~300 |
| 5'219 | CJ-Punkte Rest um 02:00 (44'061 um 00:45; `usedToday` 63'580 > `total` 63'387) — der Tagesvorrat ist praktisch weg, Hauptverbraucher sind die 4 Grind-Runner + 3 Dauerwächter + ein Nachbar-Agent; ab jetzt antworten alle CJ-Wächter bis Mitternacht CJ-Zeit «unklar» |
| 10 | Zeilen im NEIN-Register `_besuchte_seiten_nicht_lieferbar.txt` — Lauf 1 hatte 3 Alt-Einträge (DRAFT-Ware, nicht mehr gefragt) stillschweigend entfernt; aus dem Git-Verlauf (30f02f796, 295a83ec8) vereinigt, Ursache behoben (`gefragt` = nur wirklich beurteilte Handles) |

Verbleibender Rückstand der anderen Wächter (nicht angefasst): `cj_verfuegbarkeit` 1'359 offen, `cj_ausgelistet_sichtbar` Stufe B ~73 Tage je Umlauf,
`cj_versand_ch_sichtbar` 44'900 offen bei ~100/h — alle drei hängen an derselben CJ-Uhr; mehr Wächter machen jeden einzelnen langsamer.

## Bewusst NICHT
- Kein Einzel-NEIN wird in dieser Runde gedraftet: DRAFT nur nach zweitem NEIN aus einem späteren Lauf (Tag `cj-keine-ch-versandoption`).
- `cj_versand_ch_sichtbar.py` nicht angefasst (läuft FIX=1 mit Einzelmessung über den ganzen Katalog; Revive misst täglich nach).
- `fixer_keepalive.sh` nicht editiert (Auftrag); kein Commit/Push (Auftrag).
- Keine Mail, keine Erstattung, keine CJ-Bestellung.
