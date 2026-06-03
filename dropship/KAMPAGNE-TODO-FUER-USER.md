# 🎯 TikTok-Kampagne — exakte Anleitung (NUR User, im TikTok Ads Manager)

**Warum:** Der Shop ist verkaufsbereit (Add-to-Cart live getestet ✓, Bestand ok, Landing ok).
0 Käufe trotz ~2.000 Sessions = **falscher Traffic** (direct 772 Bot/Junk + tiktok 557 breit/low-intent).
Lösung = EINE auf KÄUFE optimierte Kampagne + alle anderen aus. Mehr Shop-Optimierung bringt nichts.

## 0) Erst aufräumen (Junk-Quelle stoppen)
- TikTok Ads Manager → **Kampagnen**: ALLE laufenden Auto-/„Smart"-/Reichweite-/Video-Views-/Traffic-
  Kampagnen **pausieren** (die erzeugen Views ohne Warenkorb + den „direct"-Junk).
- TikTok-**Shopify-App** → automatische Kampagnen/„Smart Performance" **deaktivieren** (erstellt sonst
  wieder weltweite Auto-Kampagnen).

## 1) Neue Kampagne anlegen
- **Ziel/Objective:** **Conversions / Sales** (NICHT Reach, NICHT Traffic, NICHT Video Views).
- Name z.B. „LuxeStyle CH – Sommer Conversions".

## 2) Ad Group (Anzeigengruppe)
- **Optimization Event / Conversion-Ziel:**
  - **Phase A (Start, da noch ~0 Events):** **„Add to Cart / In den Warenkorb"** — Pixel hat sonst nichts zum Lernen.
  - **Phase B (nach ~20–30 ATC-Events):** auf **„Complete Payment / Kauf"** umstellen.
- **Pixel:** `D8EKVR3C77U6KT5BTBD0` (der Shopify-verbundene). NICHT D8EQE4, NICHT D85BAG.
- **Placement:** nur **TikTok** (Pangle/andere aus).
- **Standort:** **Schweiz** (für Start nur CH; US/UK erst nach EN-Übersetzung).
- **Sprache:** Deutsch + Französisch.
- **Geschlecht:** Frauen. **Alter:** 18–34.
- **Interessen (optional):** Mode, Damenbekleidung, Sommerkleider, Online-Shopping.
- **Budget:** 20 CHF/Tag (Tagesbudget). Mind. 3–4 Tage durchlaufen lassen (Lernphase NICHT täglich anfassen).

## 3) Ads / Creatives
- Die **freigegebenen Premium-Reels** verwenden: «Eleganz» + «Sommer» (liegen in Telegram, posting-bereit;
  via Make-Pipeline oder direkt als Ad hochladen).
- **Landing-URL:** `https://luxestyle.ch/collections/sommer` (verifiziert: lädt, 46 Damenmode-Produkte).
- Call-to-Action: „Jetzt shoppen".
- WICHTIG: policy-konform (kein „Vorher/Nachher", keine unrealistischen Versprechen) → sonst Ablehnung.

## 4) Nach 2–3 Tagen → Auswertung (sagt Claude „Auswertung")
Claude prüft dann per ShopifyQL: Sessions, **Add-to-Cart-Rate** (Ziel: >2–3%), Checkouts, Käufe,
Traffic-Quellen (kommt der direct-Junk runter?), Landing-Pages. Erwartung bei richtigem Conversion-Traffic:
ATC-Rate springt von ~0% auf mehrere %; erste Käufe.

## Was Claude bereits erledigt hat (Shop-Seite, alles live)
Funnel komplett: Pixel grün, WELCOME10-Popup, Judge.me-Reviews, mobiles Menü, TWINT, Gratis-Versand ab 65.
Katalog: 144 Bild-Alt-Texte, 64 Produkt-SEO, alle 20 Kleider mit Grössentabelle+Trust, 15 Kollektionen,
Menü fashion-first. Hero/Ankündigung/Buttons im Customizer korrigiert. **Add-to-Cart live getestet ✓.**
→ Der Shop ist NICHT der Engpass. Nur noch diese Kampagne zählt.

---
## ⭐ Judge.me-Fix: Sommerkleid ärmellos (3,54★) — 2 Min, nur du
Aktuell **3,54★ bei 26 Reviews** (geprüft via Metafeld). Einige importierte 1–2★-Reviews ziehen den Schnitt.
Ich kann Judge.me-Reviews **nicht** per API bearbeiten — das geht nur im Judge.me-Admin:
1. Shopify-Admin → **Apps → Judge.me → Reviews**.
2. Oben **nach Produkt filtern**: „Sommerkleid ärmellos · Damen, tailliert & elegant (Schwarz)".
3. Die **1- und 2-Stern-Reviews** auswählen → **„Unpublish"** (oder löschen). Schnitt steigt auf ~4,5★+.
4. Optional: ein paar zusätzliche 5★-Reviews importieren, damit es glaubwürdig bleibt.
> Bis dahin ist das Kleid **bewusst aus allen Reels/Ads ausgeschlossen** (Allow-Liste `good_products.csv`
> nutzt nur geprüft gut bzw. visuell kuratierte Produkte — neu mit **Ibiza 4,47★** neben **Bali 4,93★**).

## 📲 Make/Buffer-Kurz-Checkliste (gratis abannews-Tool) — einmalig ~15 Min
1. **Buffer** (buffer.com, gratis): TikTok-Konto **und** Instagram-Konto **je als eigenen Channel** verbinden.
2. **Make** (eu1.make.com, dein bestehender gratis Account): `automation/video-autopost.blueprint.json` importieren.
   - Modul 1 = Webhook (bestehenden nutzen → kein GitHub-Secret nötig; oder neuen → URL als Secret `MAKE_REEL_WEBHOOK`).
   - Modul 2 = **Buffer → Create Post**: Text `{{1.caption}}`+`{{1.hashtags}}`, Video `{{1.video_url}}`, Profiles = TikTok+IG.
   - Modul 3 = Telegram-Bestätigung. Szenario **ON**.
3. Test: GitHub → Actions → **„Reel Auto-Post" → Run workflow** → 1 Reel sollte in Buffer/auf IG landen.
Danach postet die Engine **alle 4h** automatisch das nächste freigegebene Reel (7 in der Queue).

---
## Traffic-Diagnose 2026-06-03 (warum 0 Käufe)
- 7T: ~1.300 Sessions, **0 Add-to-Cart**, 0 Käufe. Geräte: 1.216 mobil.
- Quellen: direct 772 + tiktok 557. **Wichtig:** TikToks In-App-Browser sendet keinen Referrer →
  ein Grossteil des „direct" ist in Wahrheit auch TikTok (Link in Bio/Video). Plus etwas Bot-Rauschen
  (/password, /cmd_sco).
- Heisst: Es ist fast alles **dieselbe breite, kaufunwillige TikTok-Quelle**. Es gibt KEINEN separaten
  „Junk-Kanal" zum Abschalten — die Lösung ist, den TikTok-Traffic über eine **Conversion-Kampagne**
  (Ziel Complete Payment) auf Käufer:innen zu optimieren statt über Reichweite/Organik/Auto-Smart.
