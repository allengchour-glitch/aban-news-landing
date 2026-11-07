# Super-Video-Playbook — LuxeStyle (für den autonomen Video-Bot)

> Praxis-Tipps, WIE man Mode/Dropship-Kurzvideos baut, die wirklich ziehen. Gilt zusätzlich zu
> `dropship/VIDEO-PRAEFERENZEN.md` (kein Voiceover, on-screen Text, Musik `automation/music/luxe-premium.wav`)
> und `docs/WERBEVIDEO-REGIE-PSYCHOLOGIE.md`. **Erst Daten** aus `automation/SECOND-BRAIN.md` (Thema `adcraft`)
> heranziehen, dann nach diesen Regeln bauen. **Posten macht NUR die Video-Session, nie der Generator.**

## 1. Die 3-Sekunden-Regel (wichtigster Hebel)
- **Sekunde 0–3 entscheidet alles** (Scroll-Stopp). Start MIT Bewegung/Produkt, kein Logo, kein Intro.
- **Pattern-Interrupt:** etwas Unerwartetes/Konkretes zuerst. Beispiele (on-screen Text):
  - „CHF 34.90 statt Designer-Preis 👀"
  - „Dieses Kleid ist 3× ausverkauft."
  - „POV: dein Sommer-Outfit 2026"
  - Frage-Hook: „Welcher Look ist deiner?" (Open Loop → erst CTA schließt ihn)
- Erste Sekunde = das **schönste/auffälligste** Produktbild oder die stärkste Bewegung.

## 2. Aufbau (Hook → Show → CTA)
- **0–3s Hook** · **3–18s Produkte zeigen** (3–6 Clips) · **letzte 3s klarer CTA**.
- **1 Gedanke pro Schnitt.** Nie zwei Aussagen gleichzeitig.
- **Open Loop:** Spannung/ Frage am Anfang, Auflösung (CTA) am Ende.

## 3. Länge & Tempo (pro Plattform)
| Plattform | Länge | Format |
|---|---|---|
| TikTok | **9–21 s** (kurz gewinnt) | 1080×1920 |
| Instagram Reels | 7–15 s | 1080×1920 |
| Facebook | 10–20 s | 1080×1920 / 1:1 ok |
- **Schnitt alle 2–4 s** (lieber öfter). Bei Musik: **auf den Beat schneiden** (luxe-premium hat klare Akzente).
- Kein Leerlauf — jede Sekunde zeigt Produkt oder Nutzen.

## 4. On-screen Text (weil KEIN Voiceover)
- **Groß, fett, mittig/oben**, hoher Kontrast, kurze Zeilen (max ~5 Wörter).
- Pro Clip 1 Text: **Produktname** + **Preis** + ggf. **„−10 PROZENT Code WELCOME10"**.
- ⚠️ In ffmpeg-`drawtext`: **„PROZENT" schreiben statt `%`** (sonst unsichtbar) und **keine Emoji** (DejaVu → leere Kästchen; Emoji nur in der Caption).
- **Safe-Zone TikTok/IG:** untere ~15 % + rechte ~10 % frei lassen (UI/Buttons überdecken Text).

## 5. Musik & Ton
- Ausschliesslich **`automation/music/luxe-premium.wav`**, nach aktueller Datei-, Hör- und Rechteprüfung.
- Keine Stimme, kein Voiceover und keine automatisch erzeugte Sprachspur. Der deutsche Bildschirmtext und die Caption tragen die Information.

## 6. CTA & Caption (pro Kanal unterschiedlich!)
- **Im Video (letzte 3s):** kurzer, belegbarer CTA wie „Produkt ansehen". Keine ungeprüften Preise, Rabatte oder Lieferangaben.
- **Caption:**
  - **Instagram:** keine klickbaren Links → **„Link in Bio"**. 3–5 gezielte Hashtags.
  - **Facebook:** Link ok → `luxestyle.ch/products/<handle>`.
  - **TikTok:** „Link in Bio" + 3–5 Hashtags; Hook-Satz wiederholen.
- Hashtags aus dem **gelernten Konsens-Pool** (`automation/brain_pools.sh` / SECOND-BRAIN) nehmen, nicht raten.

## 7. KI-Clips richtig prompten (Kling / Luma / Veo)
Ziel: **Produkt bleibt exakt, nur sanfte, glaubwürdige Bewegung** (kein Morphing, keine verzerrten Hände/Gesichter).
- **Gute Prompts:** „slow gentle dolly-in on the product, subtle parallax, soft natural light, fabric moves slightly in a light breeze, photoreal, fixed product shape, no distortion".
- **Vermeiden:** schnelle Kamerafahrten, Gesichts-Close-ups (KI verzerrt Gesichter/Hände), Text-im-Bild durch die KI (kommt fehlerhaft → Text per ffmpeg drüber).
- **Dauer je Clip 3–5 s**, dann im Schnitt aneinanderreihen. Mehrere kurze > ein langer.
- **Mode-spezifisch:** Stoff-Bewegung, Schmuck-Glanz/Funkeln, Lifestyle-Setting wirken; statische Freisteller animieren = langweilig → lieber echte Model-/Lifestyle-Shots (Regel 1).

## 8. Conversion-Booster (Mode/Dropship)
- Produktdetails nur verwenden, wenn sie unmittelbar vor dem Schnitt am beworbenen Produkt und an der gewählten Variante verifiziert wurden.
- Versand, Rückgabe, Bestand und Lieferzeit nur nennen, wenn der konkrete Beleg für diesen Inhalt vorliegt.
- **Nur gut bewertete / echte Lifestyle-Produkte** zeigen (good_products.csv), keine Weiss-Freisteller.

## 9. Was den Bot „lernen" lässt (Daten → besser)
- `SECOND-BRAIN.md` Thema `adcraft` = welche Hook-/Format-Muster Views ziehen → **die Top-Hooks als Vorlage** nehmen.
- Nach dem Posten: `reel-analytics.mjs` → welche Reels liefen → mehr davon (Format/Hook wiederholen).

## 10. Verboten (zerstört Marke/Reichweite)
- Fake-Dringlichkeit („nur heute"), erfundene Zahlen, Angstmache.
- Marken-Logos/Promi (IP), verzerrte KI-Gesichter, `%` im drawtext, Emoji im drawtext.
- Doppelposts: Generator schreibt nur `status=ready`; **ein Poster** plant jede freigegebene Zeile genau einmal.

---
**Kurzformel:** Hook in 3 s · 2–4-s-Schnitte · grosser Text · keine Stimme · luxe-premium-Musik · klarer CTA · echtes Produkt · ein Poster · kein Doppelpost.
