# Codex-Auftrag: Muster-Reel «Wasserwellen-Lampe» (2.11.2026)

**Anlass:** Der Besitzer will ein Reel aus Produktfotos von Codex bauen lassen und mit dem Muster von Claude vergleichen («lass mal codex eins machen und vergleichen»). Es geht um ein **Muster zur Ansicht**, nichts wird veröffentlicht. Claudes Muster ist dir bewusst nicht gezeigt; baue deine eigene Fassung.

Marken: **GEMESSEN** = selbst nachgestellt (Befehl und Ausgabe) · **QUELLE** = fremde Angabe · **BEHAUPTUNG** = ungeprüft · **SETZUNG** = Annahme.

## Produkt und Eingaben (für beide gleich)
Produkt: **LED Wasserwellen Projektionsleuchte**, Shop luxestyle.ch, Handle `led-wasserwellen-projektionsleuchte-677504`. Die Lampe wirft bewegte Wasserwellen-Lichtmuster an Wand und Decke (die Produktseite hat dazu ein Fremdvideo, das du NICHT verwendest).

Drei saubere Fotos (HTTP 200, `image/jpeg`; alle anderen Produktfotos tragen Fremdschrift oder zeigen andere Produkte, nimm nur diese):
1. Produkt auf Weiss: https://cdn.shopify.com/s/files/1/0943/6856/3585/files/9de03875-2206-4cf1-908d-8669310bf0e1_trans.jpg
2. Warmes Licht an einer Zimmerwand: https://cdn.shopify.com/s/files/1/0943/6856/3585/files/6a74321a-b49c-4289-9f57-3fbd4df161aa_trans.jpg
3. Warmes Licht, Lampe auf dem Tisch: https://cdn.shopify.com/s/files/1/0943/6856/3585/files/b1c21ce7-8d40-479b-ac5c-886968e76c1b_trans.jpg

Musik (im Repo): `automation/music/luxe-premium.wav` (Besitzer-Regel: die «neue Musik»; liegt auf `main`, mit Sparse-Checkout holen, nicht das ganze Repo klonen).

## Vorgaben (verbindlich)
- **Format:** 1080×1920 (9:16), 24–30 fps, H.264 + AAC, **8 bis 10 Sekunden**.
- **Ohne Stimme.** Nur Musik und Text im Bild (Besitzer-Regel, `dropship/VIDEO-PRAEFERENZEN.md`).
- **Text deutsch, Schweizer Rechtschreibung** (kein «ß»), kurz, im Bild lesbar. Erlaubt: Produktname, ein bis zwei kurze Stimmungszeilen, am Ende `LuxeStyle · luxestyle.ch`. **Verboten:** Preis, Rabatt, Lieferzeit, Bewertungen, Gesundheits-/Wasserdicht-/Materialversprechen, englischer Fremdtext, Wasserzeichen.
- **Nur Kostenloses:** `ffmpeg` (und was ohnehin im Repo-Werkzeug liegt). **Keine** bezahlten oder externen Bild-/Video-KI-Dienste (kein MiniMax, Gemini, Veo, Sora o. ä.), kein Aufladen, kein neuer Zugang.
- Es ist ein **Foto-Reel**: nichts zeigen, was die Lampe nicht kann. Keine erfundene Bewegung als Produktversprechen.
- Eigene Gestaltung ausdrücklich erlaubt (Übergänge, Zoom, Schnittfolge, Typografie, Farbe). Das ist der Punkt des Vergleichs.

## Nicht tun
- **Nicht** `.github/workflows/product-reel.yml`, `reel-render.yml`, `reel-autopost.yml` oder `dropship/ads/render_product_reel.sh` ausführen oder auslösen: sie legen das Reel in die Social-Queue (`automation/reels_seed.csv`) und committen auf `main`.
- **Nichts veröffentlichen, nichts in eine Queue legen**, kein Metricool/Meta/TikTok, `dropship/_SOCIAL_STOPP` nie neu anlegen.
- Kein Shopify-/CJ-/Printful-Zugriff, kein `LIVE=1`.
- Keine Geheimnisse in Dateien. Nie das ganze Repo klonen (über 10 GB): Sparse-Checkout.

## Abgabe
1. Branch `codex/reel-lampe-20261102` von `origin/main`, **Entwurf-PR** nach `main`, nie direkt auf `main`.
2. Dateien (nur diese):
   - `dropship/reel-vergleich-0211/codex-lampe.mp4` (das Reel)
   - `dropship/reel-vergleich-0211/codex-lampe.sh` (der **vollständige Befehl/das Skript**, mit dem es entstand; nachspielbar)
   - `dropship/reel-vergleich-0211/codex-lampe.md` (kurze Notiz, deutsch)
3. Die Notiz nennt (je mit GEMESSEN/SETZUNG): Dauer, Dateigrösse und `ffprobe`-Ausgabe (Auflösung, Codec, fps, Dauer), die Schnittfolge mit Zeiten, den genauen Text je Abschnitt, was du bewusst anders machst als ein einfacher Zoom auf drei Fotos, und was noch nicht gut ist.
4. **Selbstprüfung vor dem PR:** drei Einzelbilder aus dem Video ziehen und ansehen (Text lesbar? Rand abgeschnitten? Fremdschrift im Bild?). Befund in die Notiz, auch wenn er unschön ist.
5. Keine Behauptung über «Qualität» ohne Beleg; eine Meinung ist ein Urteil des Besitzers.

## Zurück an Claude
Claude spielt `codex-lampe.sh` nach, prüft Format und Text gegen die Vorgaben und legt beide Reels (Claude und Codex) nebeneinander für den Besitzer. Veröffentlichen entscheidet der Besitzer.
