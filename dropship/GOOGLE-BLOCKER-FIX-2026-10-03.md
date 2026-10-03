# Google-Gratis-Einträge: alle Blocker-Klassen angefasst (03.10.2026, Betreiber «fix alles»)

Ausgangslage: `_google_feedback_stand.json`, Stand 02.10. 13:26 UTC, 790 Free-Listings-Blocker bei 49'943 aktiven Produkten.
Google-Sitzungen pro Tag: ~4 (12.–22.09.) → ~2 (23.09.–03.10.).

| Klasse | Anzahl | GEMESSEN | GETAN |
|---|---:|---|---|
| Inappropriate image | 250 | Wirkung früherer Tausche: 35/46 getauschte nicht mehr blockiert (76 %), 4/19 unberührte «uneinig» (21 %) | `google_bild_tausch.py` für 107 offene + 64 früher uneinige Produkte; neu `EIN_MODELL=1`: bei leerem Zweitprüfer entscheidet Gemini allein (Ledger «tausch-g», umkehrbar) |
| Restricted adult content + Sexual interests | 92 (dieselben) | 73/92 ohne ein einziges Auslöserwort im Text → das Bild löst aus | dieselbe Bildtausch-Runde mit `KLASSE=«Restricted adult content»`; Latex-Augenmaske und 2 Beckenboden-Trainer aus den Werbekanälen (Tags `adult-nicht-bewerben` / `medizinprodukt-pruefen`) |
| Product page unavailable | 129 | 129/129 aktiv, mit Shop-Link, kaufbar; 115 seit 29.09. nur EINMAL angestossen | zweite Anstoss-Runde (115), `gfeed_anstupsen.py` jetzt alle 3 statt 7 Tage |
| Image too small | 14 | Hauptbilder alle ≥ 500 px; zu klein sind 45 VARIANTEN-Bilder (bis 188×245) | neu `google_variantenbild_gross.py`: auf 600 px vergrössert, Datei per `fileUpdate` ersetzt (Media-ID und Farbzuordnung bleiben), 45/45 zurückgelesen |
| Promotional overlay on image | 8 | — | eigener Prompt; 3 Hauptbilder getauscht, 5 tragen auf JEDEM Bild Text (keine Quelle) |
| Tobacco products | 2 | Bild/Titel: USB-Gesichtssprüher sieht aus wie eine E-Zigarette, Monitor-Halter wie ein Vape-Gerät | Titel neu: «USB-Gesichtssprüher (Nano-Mist) für unterwegs», «Magnetischer Seitenhalter für Monitor & Handy · Aluminium» |
| Inappropriate title | 2 | «Kinder Martin Boots» = Markenanklang | «Kinder-Boots mit Seitenreissverschluss & dicker Sohle»; Fallschirmschliesse war schon korrigiert |
| Adult-oriented | 5 | Latex-Augenmaske (Fetisch-Optik), 2 Beckenboden-Geräte mit Sonde, 2 Porenreiniger | 3 aus Werbekanälen (Tags oben), Porenreiniger bleiben (Fehlalarm) |
| Personal hardships | 67 | Schwangerschaft, Rückenstütze, Gelenksalbe — betrifft nur PERSONALISIERTE Werbung | nichts (kein Gratis-Eintrags-Blocker) |
| Image/Title under review | 79 / 47 | Google prüft noch | warten |
| Missing shipping info [LI] | 1'964 | nur Liechtenstein, Shop liefert nur CH | Betreiber optional: LI im Merchant Center entfernen |

Nebenbei repariert: `zweitmodell.py` Groq-Bildgrenze 5 → 3 (Groq meldet jetzt «supports up to 3 images»). `google_bild_tausch.py`
wertet eine Gemini-Sperre der Bilder (promptFeedback.blockReason, z. B. Horror-Maske mit Blut) als «Motiv ist das Problem»
statt als Netzfehler. Aufseher: Bildtausch alle 2 h für drei Klassen; Variantenbild-Wächter täglich.
`google_sperrtags_durchsetzen.py`: 95 Produkte mit Sperr-Tags (Raucher, 18+, Policy) aus den Werbekanälen genommen.

## OFFEN / Nachmessen
- Nächster Google-Vollscan (`google_feedback_wache.py`, täglich): Klassen neu zählen; Bildtausch «tausch-g» getrennt von «tausch» auswerten.
- «Motiv»-Fälle (Totenkopf, Horror-Masken, Waffen-Optik, knappe Mode) bleiben bei Google blockiert. Sie sind ohnehin nicht sichtbar, deshalb kein Eingriff.

## Endstand Bildtausch (03.10. ~01:45 UTC)
| Klasse | getauscht | behalten (kein besseres Bild) | Motiv ist das Problem | offen (≤ 1 Bild) |
|---|---:|---:|---:|---:|
| Inappropriate image (250) | 136 (27 mit zwei Modellen, 109 Gemini allein) | 24 | 88 | 2 |
| Restricted adult content (92) | 43 | 7 | 35 | 7 |
| Promotional overlay (8) | 3 | 5 | — | — |
Nachmessung: nächster `google_feedback_wache`-Vollscan; «tausch-g» getrennt von «tausch» auswerten (Erwartung aus 30.09.: ~76 % frei).

## NACHGEMESSEN 03.10. 10:09 UTC (erster Vollscan nach dem Fix, dank Fortsetzung jetzt fertig)
| Klasse | 02.10. 13:26 | 03.10. 10:09 |
|---|---:|---:|
| Inappropriate image | 250 | **199** |
| Product page unavailable | 129 | **120** |
| Image too small | 14 | **6** |
| Restricted adult content | 92 | **265** ⚠️ |
| Promotional overlay on image | 8 | 29 ⚠️ |
| Blocker gesamt | 790 | 1'072 |

- Bildtausch «tausch-g» (150, nur Gemini): nach weniger als einem Tag sind noch 16 «Inappropriate image» und 7 «adult» blockiert. Google hat erst einen Teil neu geprüft.
- **Neue Welle «Restricted adult content»:** 240 Produkte sind neu dabei, 67 sind herausgefallen. Fast alles ist Mode mit Modelfotos (Strumpfhosen, Bodys, Kleider, Bademode, Sandalen); dazu kommen Ausreisser wie ein Kuchenteiler und eine Herrenuhr. Die Handles enden auf 6xxxxx, das sind die neuen Grind-Importe.
  → Als Nächstes zu behandeln (eigene Runde): Kontaktbogen einer Stichprobe, dann Bildtausch mit `KLASSE='Restricted adult content'` für neue Ware, eventuell eine Import-Regel für das Hauptbild bei Wäsche/Bademode.
