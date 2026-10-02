# Google-Blocker nach Land — Verbesserungsrunde 02.10.2026 (12:27 UTC)

## GEMESSEN
- Ampel: Free-Listings-Blocker **723 → 2'568** (Scan 10:48 UTC). **Nachmessung 13:40 UTC (neue Wache): 790 echte CH-Blocker, 1'964 nur [LI].** Neu: **1'771 «Missing shipping info in some countries»**.
- Rohmeldung (product.feedback der App «Google & YouTube»), z. B. Bambus-Diffuser, Gua-Sha-Set:
  `Missing shipping info in some countries in [Free_listings,Shopping_ads] [LI].` — betroffen ist nur **Liechtenstein**.
- Der Shop liefert seit 22.09. bewusst nur in die Schweiz (LI gestrichen, Weg B). Die Schweizer Gratis-Einträge dieser Produkte
  sind NICHT blockiert; Google probiert zusätzlich LI aus und findet dort keinen Versand.
- Die Wache zählte jede Meldung als Blocker, unabhängig vom Land → die Ampel meldete dreimal so viel, wie für die Schweiz zählt.

## GETAN
- `automation/google_feedback_wache.py`: liest die Länderkürzel am Meldungsende; Meldungen OHNE «CH» (nur LI usw.) kommen in die
  eigene Liste «Nur andere Länder» und zählen nicht als Blocker. Ohne Länderangabe zählt eine Meldung weiter (vorsichtig).
  Kanarienvögel 4/4 ([LI] → nein, [CH] → ja, [CH, LI] → ja, ohne Land → ja). Bericht `GOOGLE-FEEDBACK.md` mit eigenem Abschnitt.
- Nebenbefund: CJ-Zahl stand seit 11:09 still — CJ-Tagesbudget erschöpft (97'440 Punkte), Runner pausieren korrekt, neue Punkte
  ab 16:00 UTC (Vorrangfenster). Kein Fehler.

## OFFEN (Betreiber, optional)
- Im Google Merchant Center Liechtenstein als Zielland entfernen (Einstellungen → Versand/Zielländer). Ohne den Klick bleibt die
  LI-Meldung bestehen, schadet den Schweizer Einträgen aber nicht.
