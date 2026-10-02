# Zweitprüfer ohne ChatGPT-Guthaben — 02.10.2026

## GEMESSEN
- OpenAI: `429 insufficient_quota / credit_balance_exhausted` (Antwortkörper — kein Drosseln). DeepSeek: `402 Insufficient Balance`.
- Betroffen war alles mit «Gemini UND ChatGPT einig»: Google-Feinkategorien (seit 08:34 nichts geschrieben), CJ-Varianten-
  Bildvergleich (`cj_variante_bild.py` → Bestellungen bleiben «manuell prüfen»), Kauderwelsch-Wache, Google-Bildtausch, Jury-Grenzfälle.
- Groq hat Guthaben/Gratiskontingent: `openai/gpt-oss-120b` (Text) und `qwen/qwen3.8-27b` (Vision, Probe «Kreis, rot» richtig).
  Grenzen gemessen: > 5 Bilder → HTTP 400 «Too many images»; ~400-Pfad-Listen → HTTP 413.

## GETAN
- `automation/zweitmodell.py` — `chat_json(text, bilder, nummer_ab)`: ChatGPT, solange Guthaben da ist; erkennt leeres Guthaben am
  Antwortkörper, setzt `/tmp/openai_leer` (6 h, danach wieder OpenAI) und fragt Groq. Mehr als 5 Bilder → EIN beschriftetes
  Raster («Bild 0 …» bzw. «Bild 1 …», gleiche Nummern wie im Prompt). `LETZTES_MODELL` für Belege.
- Umgestellt: `cj_variante_bild._gpt`, `gemini_jury.fragen_gpt` (Modell im Urteil protokolliert), `google_bild_tausch.chatgpt`,
  `titel_kauderwelsch_wache.gpt`, `google_fein_ki.zweiter`. Einigkeitsregeln unverändert.
- `google_fein_ki.py`: Teilbäume > 150 Pfade zweistufig (erst direkte Unterstufe, dann deren Teilbaum); der Stufe-1-Zweig gilt nur,
  wenn beide auch auf Stufe 2 «kein feinerer» sagen.
- Kanarienvögel: CJ-Bildvergleich #1021 → «Stainless steel blue» (Gemini 1.00 / Groq 0.95, = Handvergleich); Kauderwelsch 10/11
  (verpasst «Adjustierbarer» — Groq strenger: weniger Korrekturen, keine falschen); Google-Fein Probe 3/3; Zweites Gehirn 0 NEU.

## OFFEN
- Betreiber: OpenAI-Guthaben aufladen (platform.openai.com → Billing) oder bewusst bei Groq bleiben; DeepSeek ebenso leer.
