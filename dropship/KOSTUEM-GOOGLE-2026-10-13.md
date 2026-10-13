# Kostüme und Kostüm-Masken im Google-Kanal: Hausregel durchgesetzt (13.10.2026, Verbesserungsrunde 08:25)

Hausregel: **Kostüme, Erotik, Tabak und Klingen gehören nie in den Google-Kanal.** Quelle der Klasse: Messrunde 13.10., Richter Platz 2, `dropship/MESSRUNDE-2026-10-13.md`.

## GEMESSEN
- **18 Kostüme oder Kostüm-Masken standen ACTIVE im Google-Kanal**, keines davon mit Sperr-Tag:
  - 8 Horror-, Latex- und Cosplay-Masken mit Produkttyp **«Hautpflege»** (Horror Maske Blutung Totenkopf, Latex-Horrormaske «Verrottete Fratze», Viking Ugly Latex Maske, Skull Maske, Steampunk Cosplay Maske …)
  - 8 Plüsch-Tiermasken / Halbmasken
  - «Kinderkostüm Falbala»: Tag `kinderkostuem`. Eine Reaktivierung am 04.10. stellte es in alle 11 Kanäle (Prüfer).
  - «Lustiges Teddy Cape Geist Kostüm» (Haustierbedarf)
- **Ursache:** `google_sperrtags_durchsetzen.py` fragte nur **exakte** Sperr-Tags ab, und `kinderkostuem` ≠ `kostuem`. `google_sperrliste.HEIKEL` taugt zum Entfernen nicht. Es ist zu laut: 62 Treffer, die meisten davon LED- und Kollagen-Masken, Echthaar-Perücken oder «Pulloverkleid».
- **Nebenbefund, eigene Klasse für später:** Der Produkttyp **«Kostüme & Verkleidung»** ist bei Fortura-Ware massenhaft falsch. Im Google-Kanal stehen 113 aktive Produkte mit diesem Typ, darunter Toilettenpapier, Spielzeug-Traktoren (Claas, Jeep), Luftmatratzen, HARIBO und Leinwände. Der Typ taugt nicht als Regel.

## GETAN
- **Regel `ist_kostuem(titel, typ)` in `automation/google_sperrliste.py`**: eine einzige Regel für Tagger, Durchsetzer und Rückholer.
  - Eine Maske zählt nur mit Kostüm-Kontext im Titel (Horror, Latex, Cosplay, Plüsch, Fasnacht …).
  - «…kostüm» zählt nur am Wortende und nie als Damenanzug.
  - «Verkleidung» zählt nur als eigenes Wort. Zusammensetzungen wie «Heizkörperverkleidung» zählen nur mit Kostüm-Kontext.
  - Ausnahmen gewinnen immer: LED, Kollagen, Schlaf, Sport, Thermo, Wandverkleidung, Dekoration und Druckware mit Motivnamen («Tasse «Fasnacht Mask»»).
  - Bewusst **ohne** Typ-Regel (siehe Nebenbefund).
- **35 Kanarienvögel**, 0 Fehler Pflicht: `python3 automation/google_sperrtags_durchsetzen.py --kanarien`.
  - Raus: alle 18 Fälle, «Faschingsverkleidung Pirat», «Verkleidung Polizist».
  - Bleibt: LED-/Photon-/Kollagen-Masken, Thermo- und Sport-Maske, Schlafmaske, Echthaar-Perücke, «Damen Kostüm Blazer», «Kostümjacke», «Animatronic Hexe» (Deko), Heizkörper- und Kotflügelverkleidung, Fasnacht-Druckware, Toilettenpapier/Traktor mit falschem Typ.
- **`automation/google_sperrtags_durchsetzen.py`**:
  - Erst Kanarien, dann Kandidaten aus der Titelsuche plus dem täglichen Voll-Export. Die Shopify-Titelsuche findet «maske» nur am **Wortanfang**: Im Test fehlten «Halbmaske», «Horrormaske» und «Kinderkostüm», live 11 statt 18.
  - Jeder Export-Treffer wird **live gegengeprüft** (ACTIVE, im Google-Kanal, Regel, kein Sperr-Tag).
  - Dann setzt der Durchsetzer den exakten Tag `kostuem`. Keine Smart-Kollektion filtert darauf, das ist **GEMESSEN** über 536 Smart-Kollektionen. Danach greift der bestehende Ablauf: aus Google nehmen, zurücklesen, Ledger.
- **Scharf:** 18 getaggt, **18 aus dem Google-Kanal genommen, 0 Fehler** (`publishedOnPublication` zurückgelesen). Im Onlineshop bleiben sie kaufbar.
- **Gegenprobe:** Probelauf danach: «0 ohne Sperr-Tag · 0 mit Ausschluss-Tag im Google-Kanal».
- **Wächter:** Der Durchsetzer läuft schon täglich in der Boot-Schleife des Aufsehers (`fixer_keepalive.sh`, Liste Z. ~495). Er fängt damit neue Importe und Reaktivierungen.

## OFFEN
- Fortura-Produkttyp «Kostüme & Verkleidung» bereinigen: rund 100 falsche Typen, Kandidat für `produkttyp_vereinheitlichen.py`.
- Kostüm-Zubehör ohne Kostümwort im Titel bleibt für die Titelregel unsichtbar: «Hemd Waggis rot», «Zimmermädchenset», «Kunstblut», «Horrorhand». Dafür braucht es zuerst saubere Produkttypen.

## NACHTRAG 13.10. abends — Rollen-Kostüme (A4d), Gegenprüfung, sichere Rückwege
- **A4d (Commit dba645a13):** `kostuem_rolle()` in `automation/google_sperrliste.py` erkennt Kostüme ohne das Wort «Kostüm» (Rolle + Kleidungsstück: «Hemd Waggis rot», «Nikolaus Baby-Strampler», «Zimmermädchenset», «Araber Schuhüberzug», «Göttinnen-Kleid … Halloween», «Tier-Halloween-Mantel»). 6 aus dem Google-Kanal genommen. Damit ist der OFFEN-Punkt «Kostüm-Zubehör ohne Kostümwort» für diese Fälle erledigt; Kunstblut/Horrorhand bleiben bewusst draussen (kein Kleidungsstück).
- **Gegenprüfung, geschärft:** Die Araber/Scheich/Sultan-Zeile zählte jedes «Tunika/Kopftuch/Turban» ohne Kontext. Jetzt gilt ohne Kontext nur «…Schuhüberzug» (der Fortura-Fasnachtsartikel); Tunika/Gewand/Kopftuch/Turban/Umhang brauchen Kostüm-Kontext (Fasnacht, Halloween, Party …). Neue Kanarien: «Sultan Tunika Herren Leinen» → kein Kostüm, «Scheich Kopftuch» → kein Kostüm, «Araber Gewand für Fasnacht» → Kostüm. **GEMESSEN:** 81 Kostüm-Kanarien / 16 Feuerzeug-Kanarien, 0 Fehler; alter gegen neuen Stand über den Voll-Export (54'068 Titel): **0 Unterschiede**.
- **Grenzfall «Halloween-Umhang «Kleiner Teufel» aus Flanell» (15447893901697):** Bild = schwarzer Kapuzenumhang mit roten Teufelshörnern → Kostümteil. Tag `kostuem` gesetzt, Durchsetzer erst trocken (genau 1 Treffer), dann scharf: aus «Google & YouTube» genommen (Ledger 18:11:18Z), Onlineshop bleibt.

### Rückwege — NUR dateiweise, NIE Dateien aus einem Backup-Ordner zurückkopieren, NIE ganze Commits reverten
Die Scratchpad-Backups der Agenten (`backup_repo/`, `backup/`) stammen von VOR der Feuerzeug-Regel (Commit 428400779, Betreiber-Entscheid). Zurückkopiert wäre die Feuerzeug-Regel still weg — oder, bei nur einer Datei, bräche der tägliche Durchsetzer mit AttributeError (`gs.feuerzeug_kanarien`) ab. Commit 5e315c409 bündelt ausserdem den Betreiber-Entscheid P1D; `git revert 5e315c409` drehte ihn mit zurück.
- **Schärfung Araber-Zeile (Gegenprüfung):** zuerst `git diff SCHAERFUNG~1 SCHAERFUNG -- automation/google_sperrliste.py | git apply -R --check` und ohne `--check` anwenden (sonst passt der A4d-Patch darunter nicht mehr).
- **A4d-Regel:** `git diff dba645a13~1 dba645a13 -- automation/google_sperrliste.py automation/google_sperrtags_durchsetzen.py automation/ch_lager_profil.py | git apply -R --check`, dann ohne `--check`; danach `python3 automation/google_sperrtags_durchsetzen.py --kanarien` (0 Fehler Pflicht). Im Shop zusätzlich je Produkt `tagsRemove kostuem` + `publishablePublish` Google (gid://shopify/Publication/302872297857) — sonst nimmt der tägliche Durchsetzer sie über den Tag wieder raus.
- **B1 Google-Wächter «wartet bei Google» (Commit 5e315c409):** `git diff 5e315c409~1 5e315c409 -- automation/google_feedback_wache.py automation/google_bildtausch_bilanz.py automation/betreiber_ampel.py automation/textbild_fix.py | git apply -R --check`, dann ohne `--check`; danach `rm dropship/_google_pruefung_seit.json`. Gegenprobe 13.10. 18:05: alle Teil-Patches (A4d und B1) lassen sich auf dem damaligen Stand sauber rückwärts anwenden.
