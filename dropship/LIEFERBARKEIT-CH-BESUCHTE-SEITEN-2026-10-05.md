# Lieferbarkeit CH — besuchte Produktseiten ohne Versandprüfung (05.10.2026)

Betreiber-Auftrag 04.10. 22:17 UTC «fix 12 h lang alles», Bereich **lieferbarkeit-ch**; Folgerunde 05.10. ~04:35–04:50 UTC
nach Prüfer-Befund 9 (Plan Punkt 12). Klasse: aktive CJ-Produkte, auf denen Menschen landen oder die verkauft wurden, die aber nie gegen
CJs CH-Versand (`freightCalculate CN→CH`) geprüft wurden — die #1016/#1017-Klasse (bezahlt, nicht lieferbar, erstattet).

> ⚠️ **Korrektur 05.10. 04:50 UTC (Prüfer-Befund 9, unabhängig nachgezählt):** Die erste Fassung dieses Berichts (02:04 UTC) nannte
> «86 der 209 ungeprüften Landeseiten geprüft, 295 offen» und «Cargo-Hose, Gemüseschneider, Blumen-/Midikleid alle ‹ja›». Beides war
> falsch. Richtig (Join `scratchpad/kandidaten_ch.json[kand]` × `dropship/_besuchte_seiten_geprueft.tsv`, jüngstes Urteil je Handle):
> **38 der 209 im Ledger (37 ja, 1 NEIN), 171 offen.** Von den 10 verkauften ACTIVE-Produkten (90 T) war nur das Leinen-Set geprüft;
> **Cargo-Hose «Trail» (höchster Umsatz 90 T), Gemüseschneider, Blumenkleid, Midikleid standen in keinem Ledger** und nicht einmal in der
> Liste, die der Wächter je abarbeitete. Ursache: die 60-T-Abfrage traf `LIMIT 1000` (880 Produkt-Handles, abgeschnitten), `[:400]` nahm
> ab Platz ~300 nur noch 1-Sitzungs-Seiten in zufälliger Reihenfolge; 178 der 388 30-T-Landeseiten lagen ausserhalb. Die Zeile
> «alle Produkt-Landeseiten 60 T» unten war damit unwahr. Die Zahlen in diesem Bericht sind jetzt die nachgezählten.

## Vorher (gemessen 05.10. 00:40–00:50 UTC, Zahlen 04:40 bestätigt)

| Zahl | Was | Befehl / Quelle |
|---|---|---|
| 388 | Produkt-Landeseiten mit menschlichen Sitzungen, 30 T (682 Sitzungen) | ShopifyQL `FROM sessions SHOW sessions GROUP BY landing_page_path WHERE human_or_bot_session='human' AND landing_page_type='Product' SINCE -30d LIMIT 1000` (388 Zeilen, unter dem LIMIT) |
| 329 | davon ACTIVE mit CJ-SKU | `products(query:"handle:…")` in 25er-Bündeln, SKU-Formen CJ-/CJxx |
| 41 / 66 | Handles / Sitzungen mit `referrer_name = google` (274 ohne Referrer, 54 Facebook, 39 Pinterest) | gleiche Abfrage `GROUP BY landing_page_path, referrer_name` |
| **209** | aktive CJ-Landeseiten **ohne jede CH-Versandprüfung** (303 Sitzungen, 15 Google) — in keinem der vier Ledger `_cj_versand_ch_pruef.txt` (handle), `_cj_versand_ch.txt` (gid, nur ≥ CHF 100), `_besuchte_seiten_nicht_lieferbar.txt`, Log des Tageswächters | Join in `scratchpad/mess3.py` → `scratchpad/kandidaten_ch.json` |
| 119 | mit CH-Prüfung (85 im Oktober, 34 im September, `git blame`) | `_cj_versand_ch_pruef.txt` |
| 10 / 9 / **6** | verkaufte Produkte 90 T: 18 Zeilen (1 ohne product_id), **10 ACTIVE, 9 davon CJ, 6 ohne gültiges CH-Urteil** (Cargo-Hose «Trail» CHF 80.82, Gemüseschneider, Blumenkleid, Midikleid: in keinem Ledger; **Nibosi-Uhr + Reise-Hängematte: in `_cj_versand_ch_pruef.txt` nur 31× «unklar keine CJ-SKU», nie ok** — ~~«5 ohne jede CH-Prüfung … Nibosi, Hängematte stehen in `_cj_versand_ch_pruef.txt`» stellte beide als geprüft dar~~, Prüfer 05.10. 07:xx). Geprüft sind nur Leinen-Set (neues Ledger, 16 Opt.), Katzenspielzeug (7 Opt.) und E-Scooter-Ladegerät (16 Opt., 04.09.) | ShopifyQL `FROM sales SHOW net_sales GROUP BY product_id SINCE -90d` → `nodes(ids)` → `scratchpad/verkauft_90t_handles.json` |
| 880 | Produkt-Handles der alten 60-T-Abfrage (1000 Zeilen = LIMIT erreicht, Liste abgeschnitten); der Wächter nahm `[:400]` | Prüfer-Nachbau |
| 2 von 8 | Läufe des Tageswächters seit 27.09., die bis «LIEFERBAR:» kamen (6 starben am stündlichen Container-Neustart) | `grep -c "besuchte Produktseiten" /tmp/besuchte_seiten_lieferbar.log` = 8, `grep -c "^LIEFERBAR:"` = 2 |
| 44'061 → 5'219 → 0 | CJ-Punkte Rest 00:45 → 02:00 → 03:xx (`usedToday` 71'520 > `total` 63'387) — Lauf 1 (~305 Aufrufe) lief in genau dieser Stunde; der Anteil der 4 Grind-Runner + 3 Wächter ist nicht trennbar. Seit ~02:30 antworten ALLE CJ-Aufrufe bis 16:00 UTC mit `16900500 Insufficient API points` | `pointsInfo` / Prüfer `cj('/logistic/freightCalculate', …)` |
| 16 | CH-Optionen für den Kanarienvogel vid 2608150717551606700 (#1018, geliefert) — 00:49 und 01:58 gemessen | `freightCalculate` |

Rückstand der anderen Wächter (nur gemessen, nicht angefasst): `cj_verfuegbarkeit.py` 1'359 aktive cj-real offen (pausiert bei Rest < 400);
`cj_ausgelistet_sichtbar.py` Stufe B ~630/Tag → ~73 Tage je Umlauf; `cj_versand_ch_sichtbar.py` 1'607 von 46'514 geprüft (563 DRAFT, 1'163 ok,
1'967 unklar; Revive 315 wiederbelebt / 278 keine-linie / 10 Verlust); `cj_versand_ch_guard.py` (≥ CHF 100) täglich fertig.

## Getan — `automation/besuchte_seiten_lieferbar.py` (kein neues Skript; drei Runden am 05.10.)

**Runde 1 (00:50, Lauf 1+2):**
1. **Ledger je Handle** `dropship/_besuchte_seiten_geprueft.tsv` (handle · Epoche · ja/NEIN/unklar · Grund · SKU), SOFORT nach jedem Urteil.
2. ~~Abdeckung: LIMIT 250 → 1000, MAX_SEITEN 45 → 400 (alle Produkt-Landeseiten 60 T)~~ **FALSCH — siehe Korrektur oben; ersetzt durch die Pflichtliste (Runde 3).**
3. Zweite Messung bei NEIN (15 s später); widersprüchlich → «unklar».
4. `NUR_NEIN=1` = Bestätigungslauf über Ledger-NEIN.
5. Entwürfe werden nicht bei CJ gefragt; POD/CH-Lager (SKU ohne «CJ»-Anfang) gelten als lieferbar ohne CJ-Aufruf.
6. `START …`/`FERTIG: …` als erste/letzte Zeile für den Aufseher; `DRY=1` schreibt weder Register noch Bericht noch Politur.

**Runde 3 (04:35–04:50 UTC, nach Prüfer-Befund 9) — Code, ohne einen einzigen CJ-Aufruf (Punkte sind bis 16:00 UTC weg):**
7. **Pflichtliste statt Top-400** (`pflichtliste()`): verkaufte Produkte 90 T (ShopifyQL `FROM sales`, `nodes(ids)` → Handles) ZUERST,
   dann ALLE Landeseiten 30 T, dann 30–60 T komplett, dann 60–150 T **nur mit ≥ 2 Sitzungen**. Zeitfenster werden rekursiv halbiert,
   bis keines mehr `LIMIT 1000` erreicht (`landeseiten(von, bis)`, `SINCE -Nd UNTIL -Md` — gemessen: parseErrors leer).
   Gemessen 04:44: **17 verkaufte · 388 (30 T) · 641 (30–60 T) · 1'043 (60–150 T, ≥ 2 Sitz.) → 1'777 Handles, 400 heiss.**
   Alle 209 Kandidaten und alle 10 verkauften ACTIVE-Produkte sind drin (Positionen 0–9).
   ⚠️ Warum nicht alle 150 T: 30–150 T ohne Filter = 5'984 Handles; Anfang Juli (-105…-91 d) an EINZELNEN TAGEN > 1'000 Produkt-
   Landeseiten à 1 Sitzung = Bot-/Anzeigen-Rauschen, kein Mensch. Die wären bei 60-T-Frist ~300 CJ-Aufrufe/Tag auf der einen CJ-Uhr.
8. **Gestaffelte Frist**: «ja» gilt 14 T für heisse Seiten (verkauft ∪ 30 T), 60 T für ältere → Dauerkosten ≈ 400/14 + 1'377/60 ≈
   52 Produkte ≈ 160 CJ-Aufrufe/Tag (statt ~600).
9. **Punkte-Reserve vor dem Lauf** (`punkte_sonde()`, Gratis-Endpunkt `productComments`, 0 Punkte): Rest < `PUNKTE_RESERVE` (2'000)
   → Zeile `PAUSE: …` und Ende ohne Urteil; der Aufseher wertet PAUSE als sauberes Ende und darf später neu starten.
10. **12-h-Abstand** (`MIN_ABSTAND_H`): `NUR_NEIN=1` bestätigt nur NEIN, die ≥ 12 h alt sind; `vollstrecken()` setzt DRAFT nur, wenn das
    vorige NEIN im Ledger ≥ 12 h zurückliegt (sonst «⏳ zweites NEIN nur n h nach dem ersten»). Die zwei DRAFTs von 01:58 (60 s nach dem
    ersten NEIN) hätte diese Regel NICHT gesetzt.
11. **`ATTRAPPE=1`** (verlangt `DRY=1`): CJ-Antworten werden gestellt («16 Optionen»), Shopify wird echt gelesen, Ledger und Register
    bleiben unberührt (`cmp` vorher/nachher gleich) → die Logik ist ohne Punkte prüfbar.

**Trockenläufe 04:42–04:46 UTC (alle `DRY=1 ATTRAPPE=1`, 0 CJ-Aufrufe, Ledger/Register per `cmp` unverändert):**
- Lauf A (`MAX_PRODUKTE=3`): Pflichtliste 1'777 · 84 frische «ja» · 1'693 offen (1'686 nie gefragt, **329 heiss**) · FERTIG-Zeile korrekt.
- Lauf B (`NUR_NEIN=1`): «3 NEIN jünger als 12 h — noch nicht bestätigbar (3.9 h / 2.7 h / 2.7 h)» → `FERTIG: nichts zu fragen · 3 NEIN warten auf den 12-h-Abstand`.
- Lauf C (`PUNKTE_RESERVE=100000`): `PAUSE: CJ-Punkte-Rest 99999 < Reserve 100000 — 2 Fragen vertagt, es wird ueber NICHTS geurteilt`.
- Lauf 12 Produkte: verkaufte zuerst (Cargo-Hose, Nibosi, Katzenspielzeug, E-Scooter, Gemüseschneider, Hängematte, Blumenkleid, Midikleid als Positionen 1–8).

## Nachher (gemessen 05.10. 04:46 UTC — nichts Neues bei CJ gemessen, Punkte 0 bis 16:00)

| Zahl | Was |
|---|---|
| 93 / 91 | Zeilen / Handles im Ledger `_besuchte_seiten_geprueft.tsv`; jüngstes Urteil je Handle: **84 ja · 3 NEIN · 4 unklar** (die 4 unklar = POD-SKUs `pod-sticker-*`, `prodigi-poster-chalet`, `kiss-cut-aufkleber` — seit Fix 5 gelten sie als lieferbar ohne CJ-Aufruf) |
| **38 / 171** | der 209 ungeprüften 30-T-Landeseiten im Ledger (37 ja, 1 NEIN = Rizinusöl-Wickel-Set, schon DRAFT) / **noch offen** |
| 3 / **6** | verkaufte ACTIVE-CJ-Produkte (9) mit gültigem CH-Urteil in irgendeinem Ledger (Leinen-Set 16 Opt. · Katzenspielzeug 7 Opt. · E-Scooter-Ladegerät 16 Opt.) / **ohne gültiges Urteil** (Cargo-Hose «Trail», Gemüseschneider, Blumenkleid, Midikleid = nie gefragt; Nibosi-Uhr + Reise-Hängematte = nur «unklar keine CJ-SKU») — alle 6 stehen an Position 1–8 der Pflichtliste |
| 1'777 / 1'693 / 329 | Pflichtliste / offen / davon heiss → die 329 heissen brauchen ~4 Tagesläufe à 100 (Entwürfe und POD kosten keinen CJ-Aufruf, zählen aber zu den 100) |
| 2 | ACTIVE → DRAFT mit Tag `cj-keine-ch-versandoption` um 01:58 (Übersetzer-Kopfhörer CHF 69.90 Tags bestseller/hero; Solar-Bluetooth-Speaker) — **beide NEIN-Paare lagen 60 s auseinander = keine unabhängige Messung** (Prüfer). Nicht zurückgeholt: Rückholen ohne Messung wäre dieselbe Klasse Fehler in die andere Richtung → Nachmessung nach 16:00 UTC (unten) |
| 10 | Zeilen im NEIN-Register `_besuchte_seiten_nicht_lieferbar.txt` (8 DRAFT, 2 ACTIVE-Zeilen = die beiden oben, Statusspalte stammt vom Lauf) |
| 0 | CJ-Aufrufe dieser Runde |

## Nachbesserung 05.10. 07:15–07:3x UTC (Prüfer-Befund «mittel», 0 CJ-Aufrufe)

**Befund bestätigt:** `grep -i 'nibosi\|reise-hangematte' dropship/_cj_versand_ch_pruef.txt | cut -f5 | sort | uniq -c` → **31 unklar keine CJ-SKU**, 0 ok;
`grep -c` der Varianten-Stämme CJYDQTLY00023 / CJJJCFCF00364 / 65D5329E in `_cj_versand_ch_pruef.txt`, `_cj_versand_ch.txt`,
`_besuchte_seiten_geprueft.tsv` → je **0**. Live (Shopify, 07:14): Hängematte `CJ-CJYDQTLY00023-Green + gray` (Leerzeichen + Plus),
Gemüseschneider (verkauft: `multifunktionaler-runder-gemuseschneider-be2e21`) `CJ-CJJJCFCF00364-Red`, Nibosi `CJ-65D5329E-…` (UUID-pid).
Richtig ist also **6 von 9** verkauften CJ-ACTIVE ohne gültiges Urteil — oben korrigiert (Zeilen «10 / 9 / 6» und «3 / 6»).

**Strukturell behoben (zwei Skripte, offline mit Attrappen geprüft, da CJ bis 16:00 UTC ohne Punkte):**
1. `automation/cj_versand_ch_guard.py` — `cj(pfad, body, params)`: `params` werden mit `urllib.parse.urlencode(quote_via=quote, safe="")`
   kodiert (vorher `basis + pfad` roh → URL mit Leerzeichen). Fertige Pfade bleiben unverändert (cj_ersatz_suche kodiert `keyWord` schon selbst,
   kein Doppel-Kodieren — gemessen: `keyWord=H%C3%A4ngematte`). `versandfaehig()`: vierte SKU-Form **«Stamm-Variantenname»**
   (`^(CJ[A-Z]{2,8}\d{5,})-.+$`) → Versuche `variantSku=<ganze SKU>` (kodiert), dann `productSku=<Stamm>`. Die drei alten Formen unverändert.
   **Kanarienvögel 8/8** (Hängematte, Gemüseschneider, Beanie «Dark Blue», Cargo-Hose, Blumenkleid, Produkt-SKU CJPB…, UUID-pid, numerische pid);
   gebaute URL gemessen: `…/product/query?variantSku=CJYDQTLY00023-Green%20%2B%20gray`.
   Gilt sofort für `besuchte_seiten_lieferbar.py` (importiert `versandfaehig`), `ek_luecke_cj.py`, `produkttext_duenn.py`, `cj_ersatz_suche.py`.
2. `automation/cj_versand_ch_sichtbar.py` — `vid_fuer()` (Schreiber der 31 «unklar keine CJ-SKU»): kennt jetzt die UUID-pid (Nibosi) und den
   Stamm `CJ[A-Z]{2,8}\d{5,}-…` (Hängematte, Gemüseschneider), `productSku` URL-kodiert. **Kanarienvögel 7/7** (inkl. Prodigi `GLOBAL-FAP-A4`
   bleibt «keine CJ-SKU»). ⚠️ Der laufende Prozess (PID 5840, seit ~23:14) arbeitet noch mit der alten Fassung — der nächste Start liest die neue.
   «unklar» gilt in dessen Ledger nicht als Quittung → Nibosi und Hängematte werden beim nächsten Lauf erneut gefragt.

**Noch nicht gemessen (CJ-Punkte 0 bis 16:00 UTC):** ob CJ die Stämme `CJYDQTLY00023` / `CJJJCFCF00364` als `productSku` und die UUID als `pid`
wirklich kennt — Pflicht nach 16:00: `python3 automation/besuchte_seiten_lieferbar.py` (Hängematte Pos. 6, Gemüseschneider Pos. 5 der Pflichtliste)
und das Ergebnis HIER nachtragen; bleibt es «unklar», ist das ein Befund über die SKU-Form, kein Urteil über die Ware.

## Offen — erst nach 16:00 UTC (CJ-Tageswechsel), in dieser Reihenfolge
1. `NUR_NEIN=1` ist erst ab ~14:00 UTC sinnvoll (12-h-Abstand zu 01:58) — ohnehin Punkte erst 16:00: **Nachmessung der 3 NEIN**
   (Rizinusöl-Set, Übersetzer-Kopfhörer, Solar-Speaker). Ergibt sie «ja» → Tag `cj-keine-ch-versandoption` entfernen + ACTIVE (Rückholweg
   im Register-Bericht), Zeile hier nachtragen.
2. Erster scharfer Lauf der Pflichtliste (`MAX_PRODUKTE=100`): zuerst die 6 verkauften ohne gültiges Urteil (Cargo-Hose, Nibosi, Gemüseschneider, Hängematte, Blumenkleid, Midikleid), dann 30-T-Seiten nach Sitzungen. **Hängematte + Gemüseschneider gezielt ansehen** (neue SKU-Form) und oben nachtragen.
   Erwartung: Sonde zeigt Rest ≥ 2'000 (sonst PAUSE — dann ist die Reserve-Schwelle zu messen: `remaining` war im August ein
   nachfliessender Eimer um 300–570, am 05.10. ein Tagesvorrat 44'061 → 0; bei PAUSE trotz frischem Tag `PUNKTE_RESERVE` senken).
3. Stichprobe 8 «ja» aus Lauf 1 unabhängig nachmessen (Prüfer: heute nicht möglich).
4. Aufseher-Block (`fixer_keepalive.sh`, macht der Hauptlauf): PAUSE-Läufe nach ≥ 2 h neu starten; NUR_NEIN-Lauf ≥ 12 h nach dem Tageslauf.

## Bewusst NICHT
- Kein CJ-Aufruf vor 16:00 UTC (Punkte 0; jeder Aufruf antwortet 16900500 und würde den Bestell-Motor um nichts, aber den Takt um Zeit bringen).
- Die 2 DRAFTs nicht blind zurückgeholt (ohne Messung kein Urteil — in keine Richtung).
- `cj_versand_ch_sichtbar.py` nicht angefasst; `fixer_keepalive.sh`, CLAUDE.md, Journal nicht editiert (Auftrag); kein Commit/Push (Auftrag).
- Keine Mail, keine Erstattung, keine CJ-Bestellung.
