# 🎬 REEL-REGELN (verbindlich) — IMMER vor dem Reel-Bauen lesen

> **Zweck:** Jede „Verbesserung: …"-Rückmeldung des Users wird hier sofort als feste Regel eingetragen,
> damit derselbe Fehler **nie zweimal** passiert. Diese Datei ist die Wahrheit für alle Reels.
> Workflow: User sagt „Verbesserung: X" → ich trage X hier als Regel ein → ich wende es ab sofort immer an.

## Feste Regeln (Stand 2026-06-03)
1. **Nur echte, authentisch fotografierte Model-/Lifestyle-Shots.** KEINE weissen Katalog-Freisteller,
   KEINE Varianten-/Farb-Grids, KEINE Spiegel-Selfies mit Handy vorm Gesicht, KEINE KI-gerenderten/„stock"-Bilder.
2. **Nur echte, im Shop gelistete Kleider/Produkte.** Im Zweifel Produkt vorher verifizieren.
3. **Ganze Produktpalette, premium präsentiert** — NICHT nur Damenmode. Reels für **alles Mögliche**:
   Mode (Damen+Herren), Schmuck, Accessoires, Schuhe, Taschen, Sonnenbrillen, Wohnen/Deko, **Tech-Gadgets**,
   Beauty, Wellness usw. Immer sauber/edel präsentiert (keine Billig-Stock-Optik). *(Update 03.06.: User
   „mach nicht nur Mode für Frauen, mach alles Mögliche" — hebt die frühere „keine Gadgets"-Regel auf.)*
4. **Preisfrei im Reel** — kein Preis einblenden (Preis erst im Shop). Outro darf „-10% WELCOME10 · luxestyle.ch".
5. **Musik:** elegant.wav (ruhig/edel). Marken-Intro + -Outro.
6. **Format:** 9:16 vertikal, 1080×1920.
7. **Kuratieren statt ersetzen:** Wenn der User einzelne Bilder streicht („letztes Bild raus"), Reel neu rendern;
   Bilder NICHT ungefragt durch andere ersetzen. Nur auf Wunsch mehr/andere Shots.
7b. **Nur Produkte mit GUTER Bewertung + GUTEM Bild — keine Random-Auswahl.** Reel-Produkte müssen
   (a) eine gute Judge.me-Bewertung haben (Richtwert **≥ 4,3★**, idealerweise viele Reviews) UND
   (b) ein authentisches, hochwertiges Model-/Lifestyle-Bild (Regel 1). Schlecht bewertete ausschliessen
   (z.B. „Sommerkleid ärmellos" 3,3★ NICHT verwenden). Im Zweifel Rating im Shop/Judge.me prüfen.
8. **Hook in den ersten 1–2 Sek** (grosser Text) — entscheidet ~80% der Reichweite (GRATIS-WACHSTUM §A).
   Preisfrei, kurz, gern eine Frage („Welches Kleid ist dein Favorit?").
9. **Freigabe-Workflow:** Reel EINZELN per Telegram zur Freigabe (ja/nein/Kommentar), erst nach „ja" posten.

## Verbesserungs-Log (chronologisch — neue Punkte kommen oben dazu)
- 2026-06-08: **Print-Werbevideo „Selbst gestalten" — Entscheidung (User):** Stimme **bleibt**
  (ElevenLabs + Musik), aber **beides verbessern** — Skript + On-Screen-Text UND Stimme natürlicher,
  **mit Gemini-Hilfe**. Umsetzung (eigener, konfliktarmer Weg, fasst die von der Video-Session
  gepflegte `werbevideo.yml`/`render_masterpiece.sh` NICHT an):
  • `automation/gemini_ad_copy.mjs` schreibt Copy (Hook + Voiceover + 3 On-Screen-Schritte, DE+EN)
    via Gemini; ohne `GEMINI_API_KEY` → bewährte Fallback-Texte. URL fürs TTS als „luxestyle punkt c h".
  • **3-Schritte** (Produkt wählen → Design hochladen → fertig) als zusätzliche Still-Captions —
    nutzt die bestehende Caption-Ebene, KEIN Engine-Umbau.
  • Stimme ruhiger: `tts_eleven.sh` jetzt env-überschreibbar (`ELEVENLABS_STABILITY`/`_STYLE`/`_SIMILARITY`,
    Defaults unverändert); empfohlen stability 0.62 / style 0.15.
  • Eigener Workflow `.github/workflows/werbevideo-print.yml` (manuell). Secrets: GEMINI_API_KEY, ELEVENLABS_API_KEY.
- 2026-06-08: **Selbst-Lernen (learn_from_analytics.mjs):** Hashtag-Pools aus echten TikTok-Daten (tiktok_luxestyle.ch_2026-06-08.json) neu gesetzt → Top-Performer: #schweizmode #ootdschweiz #sommerkleid #fashionschweiz #ootd #schweiz. auto_render.sh nutzt sie automatisch.
- 2026-06-03: **Echte TikTok-Daten analysiert** (Tool `tools/tiktok_analyze.py --user @luxestyle.ch --seed-video <url> --insecure`,
  von abannews gebaut, yt-dlp, kein API/Login; Report in `reports/`). 15 Videos, 2.769 Views, ~0 Engagement.
  **Lehre:** Preis-Anker-Caption **„CHF X statt Designer-Preis – gleicher Look 👀"** zog **771 Views** vs. nur
  24–35 bei generischen „Sommer-Kollektion ✨"-Captions. Wow-/Gadget-Hooks (Diffuser 1.085, Watch-Dupe 371) ziehen
  am meisten Views. → `auto_render.sh`: Preis-Anker-Caption als #1-Template, Reach-Tags #fyp/#foryou/#luxestylech
  ergänzt. On-Screen-Hook bleibt preisfrei (Regel 4) — der Preis steht nur in der Caption. Engagement (Likes/Kommentare)
  bleibt das Hauptproblem (Account klein/neu) → künftig stärkere Hooks + Fragen testen, Tool regelmässig laufen lassen.
- 2026-06-03: **Themen-Vielfalt in die Allow-Liste (User: „ja alles").** Katalog nach Schmuck/Accessoires
  geprüft: fast alle Schmuck-Bilder sind **weisse Freisteller** (Armband, Ketten, Ohrring-Set, Bucket-Hat)
  → per Regel 1 NICHT geeignet. Nur echte Lifestyle-Shots aufgenommen: **Strand-Strohtasche** (Modell hält Tasche)
  + **Cat-Eye-Sonnenbrille** (Frau trägt sie). Beide `.webp` — Engine dekodiert das via ffmpeg problemlos.
  In `good_products.csv` **interleaved** (Tasche nach Pos.1, Brille nach Pos.4) → jedes 5er-Reel mischt
  Kleid+Accessoire. Lehre: CJ-Schmuckbilder sind meist Freisteller → vor Aufnahme IMMER visuell prüfen.
- 2026-06-03: **Autopost weg von Make → Eigentool (User: „make nicht brauchen, eigenes Tool oder von abannews").**
  `post-next-reel.mjs` postet jetzt wie das abannews-Eigentool `social/post.py`: direkt per **Telegram**
  (Zero-Relay) und/oder über **n8n** (gratis, self-hosted, `social/n8n-publish-workflow.json`) an IG/TikTok —
  via generischem `PUBLISH_WEBHOOK_URL`. Kein hartkodierter Make-Link mehr; `MAKE_REEL_WEBHOOK` nur Legacy-Alias.
  Workflow + SETUP + KAMPAGNE-TODO entsprechend umgeschrieben. **Make ist nicht mehr nötig.**
- 2026-06-03: **Rating-Audit (Judge.me-Metafelder).** Geprüft: fast alle Produkte haben `reviews.rating = null`
  (keine Reviews). Echt ≥4,3★ verifiziert: **Bali 4,93★** (15) + **Ibiza 4,47★** (15) → Ibiza neu in
  `good_products.csv` aufgenommen (echter Model-Shot). **Sommerkleid ärmellos = 3,54★ (26)** → bleibt aus
  allen Reels/Ads draussen (Regel 7b). Judge.me-Review-Bearbeitung geht NICHT per API → User-TODO in
  KAMPAGNE-TODO-FUER-USER.md (1–2★ im Judge.me-Admin „Unpublish"). Lehre: vor „verifiziert gut" das
  `reviews.rating`-Metafeld wirklich abfragen, nicht annehmen.
- 2026-06-03: **Caption-Engine entwirrt.** Auto-Render erzeugte für jedes Reel dieselbe Generic-Caption →
  TikTok/IG werten Triplicate-Text als Spam (Reichweite sinkt). Fix: `auto_render.sh` hat jetzt 5 rotierende,
  conversion-fokussierte Caption-Templates (benennen das gezeigte Top-Produkt, z.B. «Savanna») + 3 rotierende
  Hashtag-Sets. Regel ab jetzt: **jedes Reel = eigener Text, Produkt benannt, immer WELCOME10 + luxestyle.ch.**
  Die 3 alten Auto-Reels (1222/1226/1228) nachträglich auf eigene Captions gesetzt.
- 2026-06-03: „Verbesserung: keine random Bilder, nur gute Bilder mit guter Bewertung" → neue Regel 7b
  (nur Produkte mit Judge.me ≥4,3★ + authentischem Top-Bild; schlecht bewertete raus).
- 2026-06-03: „Verbesserung: mach nicht nur Mode für Frauen, mach alles Mögliche" → Regel 3 erweitert:
  ganze Produktpalette inkl. Tech-Gadgets/Wohnen/Beauty/Herren; frühere „keine Gadgets"-Regel aufgehoben.
- 2026-06-03: «Sommer» (Hook „Sommer-Looks, die auffallen") + «Premium #52» (Hook „Sommer-Mode 2026")
  = FREIGEGEBEN (User: „die 3 sind ok"). Alle 3 Reels publish-ready unter reels/.
- 2026-06-03: «Eleganz» v2 mit Hook „Welcher Look ist deiner?" = FREIGEGEBEN (User: „passt alles"). → Hook-Polish (Regel 8) ist ab jetzt Standard für alle Reels.
- 2026-06-03: Regel-Datei angelegt, mit allen bisher gelernten Präferenzen (oben) als Seed.
<!-- NEUE VERBESSERUNGEN HIER EINTRAGEN, Format: -->
<!-- - YYYY-MM-DD: „Verbesserung: <O-Ton>" → Regel: <was ich künftig immer mache> -->
- 2026-06-08: „Verbesserung: Bali-Video löschen und nicht mehr posten (gilt überall), kam zu oft vor, keine asiatischen Frauen." → Regel: **KEINE asiatischen Models** in Bildern/Reels/Posts. Bali («Strand-Maxikleid») komplett aus der Pipeline entfernt (good_products.csv, product_reels.csv, reels_seed.csv, posts_image.csv) + alle Bali-Medien gelöscht (reels/, social/enhanced, social/static). Bei der Produktauswahl für good_products.csv/Reels künftig **immer das Hero-Bild prüfen** → keine asiatischen Models aufnehmen. Zusätzlich: ein Produkt nicht zu oft wiederholen (Abwechslung).
