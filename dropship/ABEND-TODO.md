# 🌙 Abend-Arbeitsliste — LuxeStyle (Stand 2026-06-09)

> Sortiert nach Wirkung. Oben = das, was wir heute gebaut haben (Editor + Printful-Connector) scharfschalten.
> Was Claude autonom konnte, ist erledigt. Diese Liste = nur deine Browser-/Login-Klicks.

---

## 🚨 0. ZUERST: POD-Preise fixen — sonst Verlust pro Verkauf (Claude macht's, sobald Key da ist)
Die „Selbst gestalten"-Produkte sind teils **unter Printful-Kosten** (T-Shirt CHF 8, Tasse 7.50, Hoodie 28.50).
**Nicht bewerben/verkaufen, bis die Preise sitzen.** Sobald `PRINTFUL_API_KEY` gesetzt ist (Punkt 1), **reprice
ich autonom**: echte Printful-Kosten je Variante holen → Retail = Kosten ×2,3, Endung .90, Mindest-Marge ~CHF 12.
→ Du musst nur den Key setzen, den Rest mache ich. (Ziel-Beispiele: T-Shirt 24.90, Hoodie 59.90, Tasse 19.90.)

## ⭐ 1. POD → PRINTFUL SCHARFSCHALTEN (heute gebaut: Editor + Auto-Sync mit Gemini-Kontrolle)
**Wirkung:** Kunde gestaltet im Editor → Bestellung → automatischer Printful-Druckauftrag (Gemini prüft vorher).
**GitHub-Secrets:** https://github.com/allengchour-glitch/aban-news-landing/settings/secrets/actions

1. **`PRINTFUL_API_KEY`** anlegen — Printful → **Settings → Stores → API** (Token generieren).
   *(Optional `PRINTFUL_STORE_ID`, falls mehrere Stores. `PRINTFUL_AUTO_CONFIRM=0` = immer nur Entwurf statt auto-bestätigen.)*
2. **Cloudinary** (gratis Konto): **Cloud Name** + ein **Unsigned Upload-Preset** anlegen → mir schicken,
   ich trage `CLOUD`/`PRESET` in `pod/designer.js` ein. **Pflicht** — ohne das gibt's keine Druckdatei-URL
   (Editor backt sie, kann sie aber nicht hochladen).
3. **⚠️ Printful-App-Auto-Import AUS** für diese Produkte (Printful-Dashboard → Stores → Order import = manuell/aus).
   Sonst legt die App **zusätzlich** einen Auftrag **ohne** unser Design an = Doppel-Druck.
4. **Schreib „Printful steht"** → ich (a) reprice alle POD-Produkte auf gesunde Marge, (b) starte den Sync als
   `dry_run`, (c) prüfe 1–2 Test-Bestellungen (Front/Back-Platzierung) → dann läuft die Kette voll automatisch.

## 📣 2. REICHWEITE — der echte Verkaufs-Engpass (Traffic da, 0 Käufe)
**Wirkung:** Ohne das verkauft der beste Shop nichts.
1. **EINE** saubere TikTok-Kampagne: Ziel **„Complete Payment"**, Pixel `D8EKVR3C77U6KT5BTBD0`, CH / Frauen /
   18–34 / DE+FR, **20 CHF/Tag** Test, nur TikTok-Placement. **Alle Auto-/Smart-Kampagnen AUS.**
2. **AGB-/Policy-Domain:** Shopify → Einstellungen → **Richtlinien** → `aban-192.myshopify.com` → `luxestyle.ch` ersetzen.
3. **`FB_PAGE_ACCESS_TOKEN` setzen → Facebook-Posting reparieren.** Aktuell posten IG + Threads ✅, **Facebook
   scheitert** (`403 (#200) … deprecated`), weil kein echter Page-Token gesetzt ist (Code fällt auf den User-Token
   `META_ACCESS_TOKEN` zurück, den FB ablehnt). **So holen:**
   1. https://developers.facebook.com/tools/explorer → eigene App wählen.
   2. **Permissions** hinzufügen: `pages_manage_posts`, `pages_read_engagement` → **Generate Access Token**.
   3. „Get **Page** Access Token" → Seite **„LuxeStyle CH" (`1049840534888592`)** wählen → den Page-Token kopieren.
   4. *(Empfohlen: unter Token-Debugger „Extend / Long-lived" → Langzeit-Token, sonst läuft er in ~1 h ab.)*
   5. Als GitHub-Secret **`FB_PAGE_ACCESS_TOKEN`** speichern:
      https://github.com/allengchour-glitch/aban-news-landing/settings/secrets/actions
   → Danach posten alle 3 Kanäle (IG/FB/Threads). 13 Bild-Posts + 7 Stories + 3 Reels stehen schon bereit.

## 🛠️ 3. CUSTOMIZER-FEINSCHLIFF (Theme → „Anpassen")
1. **Footer-Social-Links** zeigen noch auf „Abannews" → fixen:
   FB `https://www.facebook.com/1049840534888592` · IG `https://www.instagram.com/luxestyle.ch` · Threads `https://www.threads.net/@luxestyle.ch`
2. **Judge.me-Sterne** auf Produktkacheln aktivieren (Judge.me → Widgets → Star rating als Theme-App-Embed).
3. **Sticky „In den Warenkorb"** (mobil) an, falls Theme-Option vorhanden.

## 🧩 4. OPTIONAL / SPÄTER
- **CJ-Creds** (`CJ_EMAIL`/`CJ_API_KEY`) als Secrets → nur falls neue Produkte importiert werden sollen.
- **Bügeltransfer-Linie (Iron-on, Textil):** Printful kann das NICHT → DTF-Anbieter wählen (Ninja Transfers /
  DTFSheet / StickerYou …). Editor exportiert die fertige Druckdatei anbieter-unabhängig. Start manuell oder via App/API.

---
> ✅ Schnellster Hebel heute Abend: **Punkt 1** (Printful-Key + Cloudinary). Danach mache ich Preise + Live-Test autonom.
