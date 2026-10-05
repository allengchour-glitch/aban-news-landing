# Groq-Vorrang-Reserve: Posts und Bestellungen zuerst (05.10.2026, Verbesserungsrunde 12:26 UTC)

## Gemessen
- `/tmp/social_autopilot.log` 12:22: «⛔ Kein Post — Gemini-Jury: Groq-Tageskontingent leer (qwen/qwen3.8-27b) — Schlüssel [1, 2, 3]».
- Gemini 402 (Marke 12:22), OpenAI leer (08:28) → einziges Bildmodell ist Groq `qwen/qwen3.8-27b`, 200'000 Tokens/Tag
  je Organisation (Schlüssel 1+2 = eine Organisation, Schlüssel 3 = eigene). Alle drei leer gemerkt seit 04:20 / 10:33 UTC.
- Verbraucher desselben Kontingents: `google_bild_tausch.py` (3 Klassen alle 2 h), `titel_kauderwelsch_wache.py`
  (qwen als TEXT-Erstprüfer!), `produkttext_duenn.py` (Bildmodell), dazu die Jury (`gemini_jury.py`, Posts) und
  `cj_variante_bild.py` (Bestellungen). Keine Rangordnung: wer zuerst kam, verbrauchte alles.
- Die Marke galt 6 h, das Groq-Kontingent ist aber ein **gleitendes** 24-h-Fenster («try again in 16m»).

## Getan
- `automation/zweitmodell.py`: `RESERVE_SCHLUESSEL` (3), `VORRANG_SKRIPTE` = gemini_jury.py, cj_variante_bild.py;
  `reserviert(n, modell)` — Bildmodell auf Schlüssel 3 ist für alle anderen Hauptskripte tabu (auch als Text-Ausweich).
  Vorrang-Aufrufer prüfen die Leer-Marke auf Schlüssel 3 nur 20 min statt 6 h.
- `produkttext_duenn.py` und `titel_kauderwelsch_wache.py` (eigene Groq-Schleifen) überspringen reservierte Kombinationen.
- Wächter: `fixer_keepalive.sh` stündlich `zweitmodell.py --reserve-test` (6 Kanarienvögel: Bildtausch/Kauderwelsch auf 3 =
  gesperrt; Produkttext auf 1, Textmodell auf 3, Jury, Bestell-Bildvergleich = frei), meldet «⚠️ GROQ-RESERVE» nur bei Fehler.

## Nachgemessen
- `--reserve-test` 6/6 ok; Probe als Vorrang (`GROQ_VORRANG=1 … --probe`): `groq:qwen/qwen3.8-27b` antwortet («Kreis, Rot»).
- `gemini_jury.py x --kontingent` → `{"kontingent_leer": false}` (vorher: alle leer → kein Post).

## Offen
- Gemini- und OpenAI-Guthaben aufladen (Betreiber) — dann ist Groq wieder nur Zweitprüfer.
