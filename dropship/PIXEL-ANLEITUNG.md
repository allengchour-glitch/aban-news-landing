# 🎯 PIXEL-ANLEITUNG — LuxeStyle CH (Stand 2026-06-23)

## ✅ Was technisch FERTIG ist (von mir verifiziert, du musst nichts tun)
- **TikTok-Pixel `D8EKVR3C77U6KT5BTBD0`** ist eingebaut und **feuert live** (`ttq.load` + `ttq.page` im Code).
- **Meta/Facebook-Pixel** `1676528663551701` + **Google** `2613605355430` feuern ebenfalls.
- **Consent ist NICHT blockiert** (alle `dataSharingState` = optimized/unrestricted).
- Täglicher VPS-Healthcheck bestätigt: `luxe.pixel_status = OK pid=1 load=1 page=1 wpm=1`.

**→ Am Pixel selbst ist nichts kaputt. Er sammelt Daten, sobald Traffic kommt.**

## 🟡 Was NUR DU klicken kannst (kein API-Weg) — damit der Pixel was bringt
Der Pixel hat aktuell wenig Daten, weil **0 Käufe** = er kann noch nicht auf „Kauf" optimieren.
So aktivierst du ihn richtig:

### Schritt 1 — TikTok-Ads-Konto fertig einrichten (5 Min, einmalig)
1. Geh auf **ads.tiktok.com** → einloggen.
2. Falls eine Wand „Add business info" kommt: **Industry = Retail/E-Commerce**, **Firmenname = LuxeStyle**, **Zahlungsmethode (Karte) hinterlegen**.
3. Das ist der Block, der die Kampagne bisher verhindert hat — ohne das startet keine Anzeige.

### Schritt 2 — Kampagne auf das richtige Ziel
- **Erst „Add to Cart" (Warenkorb)** als Optimierungs-Ziel wählen — NICHT gleich „Kauf".
  Grund: Bei 0 Käufen hat der Pixel zu wenig Kauf-Events; er lernt schneller mit dem häufigeren ATC-Event.
- **Pixel D8EKVR** auswählen, **CH / 18–34 / DE+FR**, nur TikTok-Placement, kleines Budget (z. B. 20 CHF/Tag).
- Sobald genug ATC-Events fliessen → auf **„Complete Payment"** umstellen.

### Schritt 3 (optional) — Klicks/Kosten automatisch lesen
- Gib mir/dem Bot einen **TikTok-Marketing-API-Token** → dann liest der VPS Klicks+Kosten autonom
  (Metafeld `luxe.tiktok_stats`). Aktuell ist der `null`, weil der Token fehlt.

## 🔴 Wenn du denkst der Pixel „geht nicht"
Meist ist es **kein Pixel-Problem**, sondern: kein bezahlter Traffic (Kampagne nicht live) → keine Events
im TikTok-Dashboard. Sobald Schritt 1+2 erledigt sind, siehst du Events einlaufen.

## 🧰 Womit ich dir SOFORT helfen kann (ohne deine Klicks)
- Pixel-Feuern jederzeit erneut verifizieren (Live-HTML-Check).
- Content/Reels bauen, die Buy-Intent-Traffic bringen (läuft).
- Kampagnen-Bot ist auf „Add to Cart" vorkonfiguriert (wartet nur auf das eingerichtete Ads-Konto).
