# Stimme in Reels (A/B) — Stand 23.09.2026

Betreiber 23.09.: «Bilder/Video/Stimme auf höchstem Niveau». Die Hausregel seit 12.06. war «Reels OHNE Voiceover».
Die Stimme läuft deshalb als **A/B**, nicht als neue Pflicht: `STIMME_ANTEIL` (Standard 0.5) im Reel-Motor,
Merkmal `stimme:ja|nein` im Verlauf `social/_musik_verlauf.txt`. Nach genug Reels entscheidet die Lernschleife.

## Welche Stimme — gemessen, nicht geraten

Gleiche Probe für alle: «Kennst du das schon? Der Sternenhimmel-Projektor für neunundzwanzig Franken neunzig —
jetzt bei LuxeStyle.» Gemessen: Dauer nach Stille-Trimm, Rückhören mit Whisper small (5 Schlüsselstellen: Hook,
«Himmelprojektor», Preis, «Franken», Marke), DNSMOS P.808 (Sprachqualität, 1–5), Tonhöhen-Spanne (5.–95. Perzentil
in Halbtönen, niedrig = monoton).

| Motor | Stimme | Dauer | Schlüssel | P.808 | Spanne | Bemerkung |
|---|---|---|---|---|---|---|
| edge-tts | **de-CH-JanNeural** | 6.0 s | 5/5 | 4.16 | 13.3 | Schweizer Hochdeutsch, lebendig → **Standard** |
| edge-tts | de-CH-LeniNeural | 7.1 s | 5/5 | 4.08 | 7.7 | Schweizerin, ruhiger/flacher → Beauty/Schmuck (Hypothese) |
| edge-tts | de-DE-FlorianMultilingual | 6.2 s | 5/5 | 4.06 | 14.8 | gut, aber deutsch-deutsch |
| edge-tts | de-DE-SeraphinaMultilingual | 6.9 s | 5/5 | 4.21 | 9.6 | gut, deutsch-deutsch |
| edge-tts | de-DE-ConradNeural | 6.4 s | 5/5 | 3.96 | 13.0 | |
| edge-tts | de-DE-KatjaNeural | 6.8 s | 3/5 | 3.93 | 13.6 | «Luxesteil» |
| edge-tts | de-AT-JonasNeural | 6.1 s | 4/5 | 4.18 | 19.4 | «Luxistyle» |
| Gemini 2.5 flash TTS | Puck | 7.3 s | 3/5 | 4.33 | 11.9 | «Projekt hier», «Luxistyle»; ~0.002 USD je Clip |
| Gemini 2.5 flash TTS | Kore | 7.4 s | 2/5 | 4.15 | 14.1 | «Kannst du», «Luxusteil» |
| piper | de_DE-thorsten-medium | 5.9 s | 5/5 | 3.91 | 10.6 | offline, Rohdatei 0 dBFS (clippt) → Notnagel |
| piper | de_DE-thorsten-high | 5.5 s | 4/5 | 3.86 | 11.0 | «Luxus-Style» |
| piper | de_DE-kerstin-low | 6.2 s | 4/5 | 3.85 | 8.7 | |
| piper | de_DE-ramona-low | 5.9 s | 1/5 | 3.39 | 8.3 | unbrauchbar |
| espeak | — | — | — | — | — | im Container nicht installiert |

**Wahl:** `de-CH-JanNeural` — die einzige Schweizer Stimme mit voller Verständlichkeit UND lebendiger Betonung;
Gemini klingt laut P.808 am saubersten, aber Whisper hört in 2 von 2 Proben «Projekt hier» statt «Projektor» und eine
falsche Marke (bei allen fünf Schweizer/deutschen edge-Stimmen oben nie), und das Ergebnis ist nicht reproduzierbar. Leni für Beauty/Schmuck ist eine **Hypothese** (Stimme steht in Spalte 7 des Verlaufs, damit sie
messbar wird). Nachmessen: `python3 automation/reel/voiceover.py --vergleich /tmp/stimmvergleich`
(Whisper-Rückhören nur, wenn `faster-whisper` installiert ist).

## ⚠️ Lizenz — Betreiber-Entscheid

edge-tts ruft den **Vorlese-Dienst von Microsoft Edge** auf (inoffiziell). Für Werbung ist das nicht ausdrücklich
freigegeben. Die **gleichen Stimmen** gibt es offiziell über **Azure AI Speech** (Gratis-Stufe F0: 0.5 Mio. Zeichen im
Monat ≈ 4'000 Reels). `voiceover.py` nimmt Azure automatisch zuerst, sobald `AZURE_SPEECH_KEY` und
`AZURE_SPEECH_REGION` in der Umgebung stehen (Pfad ungetestet — kein Schlüssel vorhanden). Wer bis dahin nur
lizenzsauber senden will: `STIMME_MOTOR=piper` (Thorsten-Datensatz CC0) oder `STIMME_ANTEIL=0`.

## Ablauf

1. `cj_video_reel_engine.mjs` entscheidet je pid stabil per Hash (`stimme:`+pid, 518 Index-pids → 47 % ja, nicht
   mit der Musikwahl gekoppelt). Sprechtext: Hook + Kurzname + Nutzen (nur ≤ 90 Zeichen, du-Form aus `nutzen()`) +
   Preis + «jetzt bei LuxeStyle».
2. `automation/reel/voiceover.py` macht Zahlen sprechbar (`CHF 39.90` → «neununddreissig Franken neunzig»,
   `3-in-1`, `mAh`, `°`, `%`, Modellcodes wie `P62` fallen weg), probiert Fassungen lang → kurz, bis eine ≤ 9 s ist
   (sonst höchstens 12 % schneller, sonst Abbruch = Reel ohne Stimme), trimmt Stille, Hochpass 80 Hz, sanfter
   Kompressor, zweistufig auf −16 LUFS / −1.5 dBTP. Motoren: auto = azure (falls Schlüssel) → edge → piper.
   Fehlt edge-tts/piper-tts, installiert das Skript es einmal selbst (`STIMME_PIP=0` schaltet das ab).
   TLS: edge-tts nimmt sonst nur certifi → hinter dem Agent-Proxy `CERTIFICATE_VERIFY_FAILED`; das Skript setzt
   das CA-Bündel aus `SSL_CERT_FILE` (bzw. `/root/.ccr/ca-bundle.crt`).
3. `automation/reel/make_reel.sh` mit `STIMME=<wav>`: Musik als Bett (−20 LUFS), Stimme ab `STIMME_START` (0.4 s),
   `sidechaincompress` (threshold 0.03, ratio 8, attack 15 ms, release 350 ms; `STIMME_DUCK` überschreibt), Mischung
   zweistufig linear auf −14 LUFS, 48 kHz Stereo, AAC 160k. Ohne `STIMME` bleibt der alte Weg unverändert.
   `STIMME_STEMS=<dir>` legt musik_roh/musik_geduckt/stimme zum Nachmessen ab.

Verlauf `social/_musik_verlauf.txt` (TSV, ohne Kopfzeile):
`Zeit · Musikdatei · Einstieg · Thema · Reel-ID · stimme:ja|nein · Stimme (ja) bzw. Grund anteil|fehler`.
Test-Renders mit `OHNE_PUSH=1` schreiben keinen Verlauf.

## Prüfung 23.09. (Quelle: CJ-Video Sternenlicht-Projektor, Musik luxe-house1.wav ab 0.25 s)

| Datei | Lautheit | Spitze | Audio |
|---|---|---|---|
| `/tmp/reel_stimme_test_mit.mp4` | −14.1 LUFS | −1.5 dBFS | 48 kHz Stereo |
| `/tmp/reel_stimme_test_ohne.mp4` (alter Weg) | −14.5 LUFS | −1.4 dBFS | 96 kHz **Mono** |
| `/tmp/reel_stimme_test_ohne_2pass.mp4` (`LAUTHEIT_2PASS=1`) | −14.3 LUFS | −2.6 dBFS | 48 kHz Stereo |
| `/tmp/reel_stimme_test_motor.mp4` (ganzer Motor, `NEU_RENDERN OHNE_PUSH`) | −14.0 LUFS | −1.5 dBFS | 48 kHz Stereo |

Ducking aus den Spuren (100-ms-Fenster, 60 mit Sprache): Musik unter Sprache im Median **15.2 dB** leiser als ohne
Ducking (10. Perzentil 11.3 dB); Sprache über geduckter Musik energetisch **15.5 dB** (Median je Fenster 17.9 dB);
ohne Sprache 0.0 dB Ducking (kein Dauerpumpen). Rückhören des fertigen Reels mit Whisper: «Kennst du das schon?
Sternenlicht-Projektor mit Musikfunktion. Für 39,90 Franken, jetzt bei Luxestyle.» — verständlich über der Musik.

Nebenbefund: 42 von 56 Reels in `social/reels/` liegen bei −15.5/−15.6 LUFS (ältere Renders, 44.1 kHz); der jetzige
einstufige Weg schreibt 96-kHz-Mono. `LAUTHEIT_2PASS=1` behebt beides auch ohne Stimme — bewusst nicht Standard,
weil der Auftrag «ohne Stimme unverändert» lautete.
