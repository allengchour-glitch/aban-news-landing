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
