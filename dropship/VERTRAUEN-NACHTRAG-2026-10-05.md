# Vertrauen & Recht — Nachtrag 05.10.2026, 03:30–03:55 UTC (Prüferbefunde Index 8 + Plan Punkt 17)

Fortsetzung von `VERTRAUEN-RECHT-ZUSAGEN-2026-10-04.md`. Werkzeug: `automation/zusagen_abgleich.py` (exakte Zeichenketten,
Trockenlauf → scharf → Rücklesen, Ledger `dropship/_zusagen_abgleich_{seiten,policies,produkte}.tsv`, Voll-Backups im Scratchpad
`zusagen_backup/`). Keine KI-Aufrufe, keine CJ-Abfragen. Alle Zahlen gemessen (Befehl in Klammern).

## Vorher (05.10. 03:32 UTC, `productsCount` / `pages`)
| Was | Vorher |
|---|---|
| Produkte «7 Tagen die Woche» (Dativ, von der alten Suche nicht gesehen) | 16 (6 ACTIVE) |
| Produkte «sieben Tage(n) die Woche» | 3 + 1 (DRAFT) |
| Produkte «Endpreise» (Regel existierte, Suche traf nur «Endpreis») | 1 (DRAFT) |
| Produkte «aus Belp versendet» | 1 (DRAFT) |
| Produkte «Erstattung innert 14 Tagen» ohne «nach Eingang» | 106 (14 ACTIVE) |
| Seiten mit pauschal «in der Regel 7–14 Werktagen» (personalisierte-geschenke-fuer-sie) | 1 (2 Stellen) |
| warum-luxestyle «30-50% günstiger als … Boutiquen» (unbelegt) | 1 |
| hyaluron-vitamin-c-skincare: «Glow in 14 Tagen», «Weniger Falten in 4-6 Wochen», «Hellt Hyperpigmentierung auf», «Stimuliert Kollagen», 25 %/50 %/1000x/10 %-Zahlen, Link auf DRAFT-Serum (`cj-entfernt-2026-10-05`) | 1 Seite, 7 Stellen |
| Linktext «für du entdeckst» (kaputte Sie→du) | 2 Seiten (weihnachtsgeschenke-last-minute, geschenkideen-muttertag-2026) + Chip «👩 Für du» auf marken-kategorien |
| fan-trikot-selbst-gestalten «In der Schweiz gestaltet & versandt» (POD druckt in Europa) | 2 Stellen (+1 dritte, «Wir drucken & liefern in der Schweiz», erst vom Prüfer gefunden → Nachbesserung unten) |
| herren-mode-fuer-ihn Sie-Form | 6 Stellen |
| AGB §4 + Seite zahlungsmethoden ohne AMEX, obwohl Storefront AMEX akzeptiert | 2 Texte |
| AGB §7 «RÜCKGABE- UND WIDERRUFSRECHT» / Link «Widerrufsrecht & Rückgabe» (Rückgaberichtlinie: kein Widerrufsrecht in CH) | 1 |

**AMEX-Beleg:** `curl https://luxestyle.ch/` → Shopify-Payments-Wallet-Konfiguration `"supportedNetworks":["visa","masterCard","amex"]`
(1 Treffer). Die Admin-API hat kein Feld für Kartenmarken (`paymentSettings.supportedDigitalWallets` = SHOPIFY_PAY/APPLE_PAY/GOOGLE_PAY).

**Kein kaufbares Hyaluron-/Vitamin-C-Produkt:** `status:active AND title:Hyaluron` = 0, `title:"Vitamin C"` = 0 → die Ratgeber-Empfehlung
verlinkt die Kollektion `hautpflege` («Gesichts- & Hautpflege», 346 aktive) ohne Inhaltsstoff-Zusage.

## Getan
- `zusagen_abgleich.py`: 10 neue Produktregeln (alle 9 Dativ-/Wortstellungs-Varianten aus dem Rohtext + «Erstattung … nach Eingang»),
  `SUCHEN` +6 Phrasen (Shopify-Phrasensuche kennt keine Flexion), `RESTWORTE`/`messen()` auf `(7|sieben) Tagen? die Woche`,
  Ampel-VERBOT +5 Klassen (pauschale 7–14, «In der Schweiz gestaltet», «Glow in n Tagen», «Weniger Falten in», «nn-nn % günstiger»,
  «für du entdeckst»); `ersetze()` gibt die getroffenen Regeln zurück → Ledger trägt nur noch echte Ersetzungen (Prüferbefund Doppelzeile).
  `NEU_RUECK` → «Erstattung innert 14 Tagen nach Eingang».
- Seiten (9 geschrieben, je Rücklesen ✔): warum-luxestyle, zahlungsmethoden, personalisierte-geschenke-fuer-sie, herren-mode-fuer-ihn,
  weihnachtsgeschenke-last-minute, fan-trikot-selbst-gestalten, hyaluron-vitamin-c-skincare, geschenkideen-muttertag-2026, marken-kategorien.
- AGB (TERMS_OF_SERVICE): §4 «Kreditkarte (Visa, Mastercard, American Express)», §7 «RÜCKGABE» + «Es gilt unsere Rückgaberichtlinie».
- Produkte: 106 geschrieben (14 ACTIVE), 0 Rücklesefehler, unter `flock /tmp/lock_produkttext.lock`.
- `COWORK-BEFEHL.md`: Block oben «Entscheid XMAS25». ~~gemessen: der Code XMAS25 existiert nicht~~ — **FEHLMESSUNG, korrigiert 06:35 UTC
  (siehe Nachbesserung unten):** XMAS25 existiert, terminiert 25 % für Dezember; Zeile bewusst NICHT geändert (Preis-Entscheid).

## Nachher (05.10. 03:52 UTC)
| Messung | Nachher |
|---|---|
| `"7 Tagen die Woche"` / `"7 Tage die Woche"` / `"sieben Tage(n) die Woche"` (alle Status) | 0 / 0 / 0 / 0 |
| `"Endpreise"` / `"aus Belp versendet"` | 0 / 0 |
| `"Erstattung innert 14 Tagen nach Eingang"` / `"Antwort innert 24 h an Werktagen"` | 106 / 106 |
| Ampel `python3 automation/zusagen_abgleich.py` | `ZUSAGEN ✓: … 7 Tage/Woche 0 · Seiten 0/108` |
| MUSTER der `heilversprechen_wache` über die 7 bearbeiteten Seiten | 0 Treffer; Zahlen-Scan 0 (ausser «25 %» XMAS25 — Code gemessen vorhanden, SCHEDULED —, «100 % SSL») |
| Scan 108 veröffentlichte Seiten auf `\bfür du\b` / «Sie haben|sind|suchen…» / «nn-nn % günstiger» / «Tage(n) die Woche» | 0 echte Reste (5 Pronomen-Fehlalarme, «Atmosphäre 24/7» = Diffuser-Betrieb) |
| Besucher-Sicht (WebFetch): personalisierte-geschenke-fuer-sie, hyaluron-vitamin-c-skincare, Produkt off-shoulder-plisseekleid-aurelie | neue Texte ausgeliefert, alte Phrasen 0 |
| Ledger-Zeilen heute (`awk` auf Zeitstempel 2026-10-05T03…) | seiten 22 · policies 3 · produkte 106 |

## Offen
- USA-/EU-Lieferkopf («CH/EU 8–16 Tage · USA 12–20 Tage») in ~94 Entwürfen über dem neuen Block — gehört der USA-Lieferzusagen-Klasse
  im Keepalive; beim Reaktivieren eines Entwurfs prüfen.
- `tracking`-Seite: alte Regel steht auf ⛔ 0× (Phrase schon anders korrigiert) — Werkzeug überspringt sie korrekt («schon erledigt»);
  Regel kann bei der nächsten Pflege raus.
- `/collections/fur-sie` (Chip auf marken-kategorien) existiert (413 Produkte), aber Titel «Für Sie» (Sie-Form im Kollektionstitel) — nicht
  Teil dieses Auftrags, Kollektionstitel sind Anrede der Kollektion, nicht der Kundin.

## Nachbesserung 05.10. 06:10–06:40 UTC (zwei Prüferbefunde, beide bestätigt)

### 1) «Kein Rabattcode XMAS25» war eine Fehlmessung
| Messung (06:10 UTC, `codeDiscountNodes`) | Ergebnis |
|---|---|
| `query:"XMAS25"` | 1 Node 2339431317889, Titel XMAS25, Code XMAS25, **SCHEDULED**, 25 %, 01.12.–31.12.2026 23:59, kein Limit, angelegt 21.05.2026 |
| `query:"title:XMAS25"` | 1 Node (derselbe) |
| `query:"code:XMAS25"` (die Abfrage von 03:35) | **109 Nodes, ungefiltert** (TIKTOK10, WELCOME10, BUNDLE20 …) — der Filter «code:» greift nicht; daraus kann weder 0 noch ein Beleg folgen |
| `query:"status:scheduled"` | 12 Nodes; **11 > 15 %**: GIFT2026 20 %, BLACKFRIDAY2026 40 %, BLACKFRIDAY30 30 %, BLACKFRIDAY40 40 %, BLACK30 30 %, CYBER25 25 %, CYBER30 30 %, XMAS25 25 %, XMAS30 30 %, XMAS20 20 %, SILVESTER25 25 %; NEWYEAR15 15 % |
| `query:"status:active"` (paginiert) | 51 Nodes, höchster Satz 15 %, 0 > 15 % (die Deaktivierung vom 02.10. traf nur ACTIVE) |
| `query:"status:expired"` | 46 |

Folge: Seite weihnachtsgeschenke-last-minute («XMAS25 — 25 % Rabatt im Dezember») ist mit dem Shop konsistent. Der Betreiber-Block in
`COWORK-BEFEHL.md` ist neu geschrieben (Korrektur ausdrücklich benannt): Entscheid = elf terminierte Codes > 15 % auf 15 % setzen /
deaktivieren / bewusst behalten (dann Verlust-Trockenlauf mit RABATT=0.40). Nichts an den Codes geändert (Preis-Entscheid).
Kommentar in `zusagen_abgleich.py` (Regel weihnachtsgeschenke-last-minute) korrigiert. Neu: `rabatt_termine()` druckt in der Ampel
`RABATT-TERMINE ℹ️: 11 terminierte Codes > 15% …` (nur Information, keine Mutation; `status:scheduled` paginiert, Prozent aus
`customerGets.value`, Code aus `codes{nodes{code}}`).
**Mess-Regel:** `codeDiscountNodes` immer mit `query:"<CODE>"` oder `title:<CODE>`, nie mit `code:` — und das Ergebnis über
`codes{nodes{code}}` verifizieren. (`discount_guard.mjs` nutzt `codeDiscountNodeByCode(code:)` — das ist ein anderer, korrekter Weg.)

### 2) fan-trikot-selbst-gestalten: dritte Fundstelle «Wir drucken & liefern in der Schweiz.»
| Schritt | Ergebnis |
|---|---|
| Vorher (Admin-API 06:12) | `Wir drucken &amp; liefern in der Schweiz. ` 1× (Schritt 3 der Anleitung), daneben «in Europa gedruckt» 1×, «wir drucken in Europa» 1× |
| Scan 108 veröffentlichte Seiten auf `drucken (&|und) liefern in der Schweiz` / `in der Schweiz (gedruckt|gestaltet|produziert|hergestellt)` | 1 Seite (nur diese) |
| Regel ergänzt | `("Wir drucken &amp; liefern in der Schweiz. ", "Wir drucken in Europa und liefern mit Tracking in die Schweiz. ")` |
| Trockenlauf `NUR=seiten` | fan-trikot ✔ 1× (erwartet 1); alle 24 anderen Seiten «schon erledigt»; tracking-Regel weiterhin ⛔ 0× (bekannt, offen) |
| Scharf `SCHARF=1 NUR=seiten` (06:30:34) | `SEITEN: 1 geschrieben, 0 übersprungen/Fehler`, Ledger-Zeile 699126120833 |
| Nachher Admin-API | «drucken & liefern in der Schweiz» 0 · neuer Satz 1 · «In der Schweiz g…» 0 |
| Nachher WebFetch (Besucher) | NEIN zu «Wir drucken & liefern in der Schweiz»; zitiert «Wir drucken in Europa und liefern mit Tracking in die Schweiz.» + «in Europa gedruckt & verschickt» |
| Ampel `messen()` VERBOT erweitert um `drucken (?:&amp;|&|und) liefern in der Schweiz` | `ZUSAGEN ✓: … Seiten 0/108` |
