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
