# 👑 TikTok-King — Mastery-Plan & Lernschleife (User 2026-06-20 „werde TikTok King")

> Ziel: LuxeStyle auf TikTok dominieren — alle Formate beherrschen, aus Daten lernen, Gewinner verstärken.
> Diese Datei = die TikTok-Wahrheit. Jede Session: laufen lassen + nachführen („update dich immer").

## 🎬 Welche Formate gehen automatisch (ehrlich)
| Format | Automatisierbar? | Wie |
|---|---|---|
| **Video-Post (Feed/„Reel")** | ✅ JA | Browser (`tiktok-upload-browser.mjs`, klickt jetzt komplett durch) + API (`tiktok-autopost.mjs`) |
| **Foto/Karussell-Post** | ⚙️ machbar | API Content-Posting `media_type=PHOTO` (PULL_FROM_URL Bilder) — TODO einbauen |
| **TikTok Stories** | ❌ NUR Handy-App | TikTok-Stories haben **kein Web-Studio + kein öffentliches API** → nur in der App. KEINE Automation möglich. |
| **Trend-Sound drauflegen** | ❌ NUR Handy-App | Lizenz-Trend-Sounds gehen nur in-app → drum Reels STUMM hochladen, Sound legst du in der App drauf (oder Eigen-Musik für Meta). |

→ **Für „Stories" auf TikTok gibt es keinen Bot-Weg** (Meta-IG/FB-Stories dagegen schon: `social/story_queue.csv` + Worker). Ehrlich halten, nicht versprechen.

## 🧠 Die Lernschleife (DAS macht zum King) — jede Session
1. **Analysieren:** `node automation/local/tiktok-bot.mjs analyze` (eingeloggt) + `python tools/tiktok_analyze.py --user @luxestyle.ch` (öffentlich).
2. **Lernen:** `node automation/brain/brain.mjs` → Gewinner-Hooks/Hashtags/Formate in `knowledge.json` (Ratsche: Gewinner bleiben, Verlierer geblockt).
3. **Trends klauen:** `node automation/trends/trend_scan.mjs` (Google-Trends-CH + KI-Ideen, STRIKT CH/Mundart) → neue Hook-Ideen.
4. **Queue auffüllen:** beste Captions+Preise → `reels_seed.csv`/`tiktok_queue.csv` (nur Top-Produkte).
5. **Engagen:** `tiktok-bot.mjs engage` (Kommentare beantworten, Spam-Filter).
6. **Posten:** Giga-Bot (Browser live → API nach Audit).

## 🏆 Bewiesene Gewinner-Regeln (aus echten Daten, NICHT raten)
- **Produkt + konkreter Preis** schlägt generische Marken-/Kategorie-Karten ~20:1 (Boho-Midi CHF 39.90 = 797 Views).
- **Mundart-Hook in der 1. Sekunde** („Mach dys eiges Teil", „Das mues i ha") — filtert DE raus, zieht CH.
- **Preis-Vergleich** „CHF X statt CHF Y" + **Save-Trigger** („Merk der s") = mehr Saves/Reichweite.
- **Safe-Zone:** eingebrannter Text endet bei ~78% Höhe (y≤1500/1920), nie unter der Plattform-Caption.
- **Hashtags CH:** #schweiz #schweizmode #ootdschweiz #fyp + Stadt rotieren (Zürich/Basel/Bern…). DE-Tags geblockt.
- **Frequenz:** 2× posten/Tag optimal (>4 riskiert Drosselung), Engagement/Analyse öfter.
- **Format-QA vor Post:** `video-qa.mjs` (Portrait, >250KB, keine asiat. Schrift/Watermark).

## 📊 Aktueller Stand (2026-06-20)
- TikTok = stärkster Klick-Treiber: **897 Sessions/30T** zum Shop (vs FB 208, IG 5).
- Giga-Bot postet Video-Feed live (Browser, klickt selbst durch); API nach App-Audit = ganz ohne Browser.
- Engpass bleibt Conversion (0 Käufe) — TikTok bringt Reichweite, Kauf braucht Pixel/Kampagne + Checkout-Fix.

## 🔜 Nächste King-Upgrades (autonom, wenn Zeit)
- Foto/Karussell-Posts per API (`media_type=PHOTO`) — neue Format-Vielfalt.
- Trend-Sound-Vorschläge automatisch in die Caption („Sound-Tipp: …") da Sound nur manuell geht.
- A/B: 2 Hooks pro Produkt testen, Gewinner ins Gehirn.
