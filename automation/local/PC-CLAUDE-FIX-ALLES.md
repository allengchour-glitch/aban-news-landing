# 🖥️ PC-Claude Port-Auftrag: „Fix alles" (Browser) — Policies, Merchant Center, Theme

> **Für den PC-Claude (Brave-Agent, Port 9222 / CDP).** Voraussetzung: PC an, Brave offen,
> in **Shopify-Admin** (au3j0y-hq.myshopify.com) **und** Google **Merchant Center** eingeloggt.
> User-Startzeile: *„PC-Claude, mach Fix-alles."* Arbeite die Blöcke der Reihe nach ab, je mit Bestätigung.
> Diese Dinge gehen NICHT per API (Scope/MCP gesperrt) — darum Browser.

---

## BLOCK 1 — Policies/Impressum reparieren ✅ ERLEDIGT (2026-06-15, live verifiziert)
Beide E-Mail-Tippfehler sind korrigiert (Versand-Policy + AGB §8 → `info@luxestyle.ch`), alle 7 Policies konsistent.
**NICHTS mehr zu tun.** (Nur falls im Footer noch eine alte `.com`/gmail auftaucht: auf `info@luxestyle.ch` ändern.)

## BLOCK 2 — Google Merchant Center entsperren-Vorbereitung
merchants.google.com (eingeloggt).
1. **Unternehmensinfo → Website:** `https://luxestyle.ch` muss **verifiziert + beansprucht** sein. Falls nicht: über die
   Shopify-„Google & YouTube"-Kanal-Verbindung neu verbinden ODER HTML-Tag/Search-Console (siehe `dropship/GOOGLE-MERCHANT-VERIFY-GUIDE.md`).
2. **Versand/Land:** Zielland **Schweiz**, Währung **CHF**.
3. **Feed entschlacken:** Im Shopify-„Google & YouTube"-Kanal die Produkt-Auswahl auf **saubere Kollektionen** begrenzen
   (`damen-mode`, `fur-sie`, `fur-ihn`, `luxestyle-premium`, `bestseller-shop`, `premium-beauty`) — NICHT den ganzen Katalog.
   Sticker/POD/„Selbst gestalten"/Mini-Artikel ausschliessen. (Märkte sind schon auf nur-CH gesetzt → Feed bereits 8× kleiner.)
4. **Free Listings:** Wachstum → Listings → „Kostenlose Listings / Surfaces across Google" AKTIVIEREN.
5. **⚠️ Re-Review NICHT sofort klicken** — erst Block 1 (Policies) + Punkt 3 (Feed) fertig. DANN „Erneute Überprüfung beantragen".
   Re-Reviews sind begrenzt → nur EINMAL sauber beantragen, nicht spammen.

## BLOCK 3 — Theme: Premium-Startseiten-Sektion (auf Kopie, dann veröffentlichen)
> Detailschritte in `automation/local/PC-CLAUDE-CUSTOMIZER-TASK.md`. Kurz:
1. Live-Theme **duplizieren** → Kopie „LuxeStyle PRO" → **Anpassen**.
2. Nach dem Hero eine **Produktreihe „✨ Premium-Marken"** (Kollektion `luxestyle-premium`) einfügen.
3. Quadratische Produktkacheln + Judge.me-Sterne (falls leicht).
4. **Vorschau dem User zeigen** → erst nach seinem „ja" veröffentlichen.

## Sicherheits-Regeln
- Theme nur auf der **Kopie** bearbeiten, nie direkt live; Veröffentlichen nur mit User-OK.
- **Re-Review** im Merchant Center nur EINMAL, nach vollständigem Fix.
- Märkte: **nur Schweiz aktiv lassen** (DACH/Ausland bleiben DRAFT — Strikt-CH).
- Nichts Destruktives; bei Unklarheit dem User kurz rückfragen.
- Nach Erledigung: kurzes Protokoll (was gemacht, was offen) an den User.
