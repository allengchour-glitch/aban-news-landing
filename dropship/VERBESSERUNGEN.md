# 💡 Verbesserungsvorschläge — laufendes Log (Dauerauftrag User 2026-06-13)

> Regel: in jeder Session 3–5 konkrete, priorisierte Vorschläge; Lehren sofort ins Memory.
> Ehrliche Priorisierung — der Engpass ist **Reichweite/Conversion (0 Käufe)**, nicht Katalog/Videos.

## 📌 OFFEN — User-Zusage: **Pixel + CH-Kampagne MORGEN (2026-06-14)**
Der User macht den #1-Hebel (TikTok/Meta-Pixel + bezahlte CH-Kampagne) morgen. → In der nächsten Session
**zuerst prüfen, ob Pixel/Kampagne live ist**, und Conversion-Funnel davor sauber machen:
- Ad-Landing-Kollektion (`/collections/sommer` bzw. Damen-Mode) auf saubere, **bewertete/Video-Produkte** ausrichten.
- Nur ≥4★-Produkte bewerben; <4★ raus.
- Die ~101 Produktvideos als **Ad-Creatives/Reels** bereitstellen (Gewinner-Format Produkt+CHF-Preis+Mundart).
- Nach Kampagnenstart: 2–3 Tage Daten → „Auswertung" (Add-to-Cart/Käufe vs. heute 0).

## 2026-06-13 — TikTok-Analyse (frisch, `reports/tiktok_luxestyle.ch_2026-06-13.md`)
**Zahlen:** 36 Videos · 10 769 Views (+1 389 / +15 % seit 12.06.) · **Likes 161 (±0!)** · Komm. 5 (±0) · **Shares 0 (±0)** · Ø 299 V/Video.
- **🔴 Wachstum ist hohl:** +1 389 Views kamen fast nur von 2 neuen Produkt-Videos (Smart-Diffuser XXL **1 107 V = neuer #1**, Diver-Watch „CHF 32 statt 200 / 80 % günstiger als Rolex" 795+387 V) — aber **0,5–0,8 % Eng.** = reine passive Impressionen. Likes/Komm./Shares stehen exakt still → **Reichweiten-Decke** erreicht.
- **🟢 NEU bestätigtes Gewinner-Format: Preis-VERGLEICH-Hook „CHF X statt CHF Y / Z % günstiger als <Marke>"** + Specs. Top 8 sind alle Produkt+Preis(-Anker)+Specs. Mundart („Mach dys eiges Teil" 793) bleibt stark.
- **🔴 Kern-Lehre: 0 Shares im GANZEN Account = der Grund, warum TikTok nicht expandiert.** Test-Publikum (~300–1 100), schwaches Signal, kein Push. → **Share/Save-Trigger einbauen** („Speicher dir das", „1, 2 oder 3? In die Kommentare") — Shares/Saves > Likes für Reichweite.
- **🟡 Timing-Lücke:** 16–19 UTC fast leer = **18–21 Uhr CH-Primetime** verschenkt (gepostet wird 05/09/12/20 UTC, geballt Mo/Di). → Posts in CH-Feierabend schieben.
- **⚠️ Engagement-% bei Flop-Videos (15–19 %) = Nenner-Illusion** (31 V × 6 Likes). Nicht als Erfolg werten — absolute Views + Shares zählen.

## 2026-06-13 — Runde 1
**🔴 Höchster Hebel (nur DU kannst es, bringt Käufe):**
1. **TikTok-/Meta-Pixel + EINE saubere CH-Kampagne** (Ziel „Complete Payment", CH/Frauen 18–34, DE/FR, 20 CHF/Tag).
   Ohne bezahlte/organische Reichweite bleiben Shop & Videos wirkungslos. → §10-Klicks endlich setzen.
2. **AGB-/Impressum-Domain fixen** (Klaviyo/rechtlich) — Vertrauen + E-Mail-Zustellbarkeit.

**🟡 Conversion-Optik (ich kann viel davon, teils Customizer-Klick):**
3. **Bewertungssterne (Judge.me) auf die Ad-Landing-Produkte** + 3–5 echte Reviews je Hero (NIE Fake) → Social Proof.
4. **Sticky „In den Warenkorb" + Trust-Band** (Gratis-Versand ab 65 · 30 T Rückgabe · TWINT) auf Produktseiten.
5. **Sommerkleid 3,5★ & andere <4★ aus Ads/Landing raus** (bremst Conversion) — laufend QA.

**🟢 Content/Reichweite organisch (Guthaben nutzen):**
6. **Die ~90 Produktvideos als Reels/Stories** ausspielen (TikTok/IG/FB) — Gewinner-Format Produkt+CHF-Preis+Mundart.
   Luma-Flash-Guthaben (~550 Clips) gezielt für Reels/Stories statt nur PDP.
7. **CH-Follower-Maschine 1×/Tag** (PC-Claude) konsequent laufen lassen → organische Reichweite.

**Lehre dieser Session:** ray-3.2 ≈ $3/Clip (17× teurer als Flash ~$0.17). Immer Flash. Staging-Policy verfällt
in Sekunden → Bytes parallel hochladen. `luma-api-…`-Keys = Agents-API, `luma-<uuid>` = Dream-Machine.

## 2026-06-13 — Katalogweiter Asian-Schrift-Audit (Gemini Vision)
- **1198 aktive Produkte** via öffentliche `products.json` gescannt (`automation/asian_script_audit.py`, gemini-2.5-flash).
- Pass 1: 26 mit asiatischer Schrift/„MADE IN CHINA" markiert. **Pass 2 (streng, nur PROMINENTE Overlays/Banner/
  Liefersäcke)** → **11 echte Verstösse archiviert** (bulk-update-product-status). 15 Borderline (winzige Etiketten/
  Hallmarks/Hintergrund/False-Positive wie Reifenkompressor) bewusst BEHALTEN.
- **Lehre:** 2-Pass-Audit nötig — Pass 1 (asian:true) hat ~58% False/Borderline (Mini-Tags, 925-Hallmark,
  Hintergrund-Schilder). Erst „prominent overlay/banner/bag"-Filter trennt echte Verstösse sauber.
- **⚠️ Reaktivieren mit sauberem Bild (statt löschen):** Bali-Maxikleid (4,93★) + Tech-Hero-Box (Smartwatch 5★) —
  nur Hintergrund-Chinesisch → mit Alternativbild/Luma wieder ACTIVE setzen lohnt sich.
