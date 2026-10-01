# Erfundene Wörter in Neuimport-Titeln — Verbesserungsrunde 01.10.2026 16:25 (12-Tage-Plan, Tag 1)

**GEMESSEN:** erster Neuimport nach der Grind-Pause: «Inflierbares Halloween Kostüm für zwei Personen» (von «inflatable»; richtig
«Aufblasbares»). `titel_sprache.mjs` prüft nur, ob der Titel aus dem englischen CJ-Namen ABGESCHRIEBEN ist — ein erfundenes
deutsches Wort steht in keinem englischen Text und fällt durch. Kein Wörterbuch im Container (kein hunspell/aspell).
**GETAN:** `automation/titel_kauderwelsch_wache.py` — Gemini prüft neue aktive Titel im Block, ChatGPT jeden gemeldeten einzeln
(ohne Geminis Antwort); geändert wird nur bei Einigkeit über dasselbe Wort UND dasselbe Ersatzwort (Länge ±30 %), sonst nur
gemeldet. Kanarienvögel 7/7 (Inflierbares/Adjustierbarer erkannt; Aufblasbares, Solarer Weihnachtsbaum, Centechia RJ45,
Oversized Hoodie bleiben; Grenzfall «Wasserdichtige»: Modelle uneinig → nur Meldung). Erster Lauf: 7 neue Titel, 0 Befunde
(der Fund war schon von Hand korrigiert). Im Aufseher alle 6 h (flock, START-Marke). Zweites Gehirn 0 NEU.
**OFFEN:** nichts für den Betreiber.
