# Bildtausch «Restricted adult content» stand still — Leer-Erkennung am Wortlaut (06.10.2026)

## GEMESSEN
- Google-Blocker 1'070 (Scan 05.10. 18:12): Sexual interests 228 · **Restricted adult content 228 (153 offen im Bildtausch)** ·
  Image under review 200 · Inappropriate image 197.
- Aufseher-Lauf 10:15 UTC «Restricted adult content»: **fehler 5 · tausch 0**, jede Zeile «Groq-Tageskontingent leer …
  Schlüssel [1, 2, 3] als leer gemerkt». Nachgestellt im Trockenlauf: 5/5 fehler. Gemini selbst antwortete (Direktprobe ok).
- Ursache `google_bild_tausch.py`: der Rückfall «Gemini allein» (EIN_MODELL=1, Art `tausch-g`, gemessen 76 % frei)
  verlangte `"Kontingent" in str(e) or "429" in str(e) or "Guthaben" in str(e)`. Die Meldung heisst «Groq-**T**ages**k**ontingent»
  (kleines k), und seit der Leer-Marke vom 05.10. (`/tmp/groq_leer_<n>`) wird der Schlüssel gar nicht mehr gefragt —
  «HTTP 429» fehlt. Ergebnis: jeder Fall «fehler», die Adult-Schlange kam nicht voran.

## GETAN
- `zweitmodell.ist_kontingent_leer(e)`: Typ zuerst (`TagesKontingentLeer`, `OpenAILeer`), dann Wortlaut ohne Gross/Klein
  (kontingent · http 429 · http 402 · guthaben · insufficient_quota). Kanarienvögel 6/6 (Netzfehler/JSON-Fehler bleiben «nein»).
- `google_bild_tausch.py` (beide Stellen), `gemini_jury.py` (Rückfall-Text ohne Gross/Klein), `seo_autopilot.py` (Typ statt
  Text, Verhalten gleich) umgestellt.
- Trockenlauf danach: tausch-g 4 · motiv 1 · fehler 0. **SCHARF N=8: tausch-g 3 · motiv 2 · fehler 0** (Rücklesen ohne Befund).
  Der Aufseher arbeitet die übrigen ~150 alle 2 h (N=8 je Klasse, Wechselbetrieb) weiter ab.
- Wächter: Gehirn-Regel **`kontingent-wortlaut`** (`tools/zweites_gehirn.py`, Selbsttest 20/20) meldet jede Leer-Erkennung per
  `"Kontingent"/"Tageskontingent"/"Guthaben" in str(` in automation/*.py — sie fand beim ersten Lauf `seo_autopilot.py`
  (behoben, danach 0 NEU).

## OFFEN
- Nachmessen im nächsten Google-Vollscan: Restricted adult content < 228, Anteil `tausch-g` frei (`google_bildtausch_bilanz.py`).
- «motiv» (Thong-Body, Tanktop-Set): Bildtausch hilft nicht — bleibt der Hausregel/Entscheidung (`_google_adult_hausregel_*.tsv`).
