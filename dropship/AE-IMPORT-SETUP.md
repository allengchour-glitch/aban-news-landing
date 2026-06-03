# AliExpress-Import — Setup (LuxeStyle CH)

> **Warum nötig?** Der CJ-Katalog ist für saubere Treffer leergesucht. AliExpress hat einen
> riesigen, frischen Katalog — aber **keine offene API**. Es gibt zwei legitime Wege. Wähle einen.

---

## ⚡ Weg A — DSers (schnell, kein Code, empfohlen für Sofort-Start)
Der offizielle AliExpress→Shopify-Dropshipping-Standard. **Reine Klick-Lösung**, kein API-Key nötig.

1. Shopify Admin → **Apps** → App Store → **„DSers"** installieren (kostenlos).
2. DSers mit deinem **AliExpress-Konto** verbinden.
3. DSers-Browser-Erweiterung installieren → auf AliExpress Produkte „To DSers" pushen.
4. In DSers: Titel/Preis/Beschreibung anpassen → **„Push to Shopify"**.
5. Danach kann ich (Claude) die importierten Produkte in Shopify **veredeln**: deutsche Copy,
   CHF-Preise auf `.90`, Tags für Smart-Collections, Publish in alle 6 Kanäle, Video.

➡️ **Was du tun musst:** Schritte 1–4 (nur du, dein AliExpress-Login).
➡️ **Was ich übernehme:** Schritt 5 (Veredelung + Einsortierung + Marketing) — sag einfach Bescheid,
   sobald Produkte als Draft im Shop liegen.

---

## 🔧 Weg B — AliExpress Open Platform API (automatisierbar wie CJ)
Damit kann mein Skript `dropship/ae_import.mjs` Produkte **automatisch suchen & anreichern**.
Braucht einmalig API-Credentials von dir.

### 1. Developer-Account + App anlegen
- Gehe zu **https://openservice.aliexpress.com** (AliExpress Open Platform) und registriere dich.
- Erstelle eine **App** → du bekommst **App Key** + **App Secret**.

### 2. Affiliate/Portals freischalten (für die Such-API)
- Aktiviere **AliExpress Affiliate / Portals** (https://portals.aliexpress.com) → du bekommst eine
  **Tracking ID**.
- Beantrage in der App die API-Gruppe **„aliexpress.affiliate.*"** (Produkt-Suche + Detail).
  *(Für Dropshipping-Detaildaten `aliexpress.ds.*` ist zusätzlich ein OAuth-Access-Token nötig —
  optional, später.)*

### 3. Credentials hinterlegen
Als Environment-Variablen (oder mir hier im Chat zum Setzen geben — ich speichere sie NICHT im Repo):
```
AE_APP_KEY=...
AE_APP_SECRET=...
AE_TRACKING_ID=...        # deine Portals-Tracking-ID
# optional für DS-Methoden:
AE_ACCESS_TOKEN=...
```

### 4. Lauf
```
AE_APP_KEY=... AE_APP_SECRET=... AE_TRACKING_ID=... \
  /opt/node22/bin/node dropship/ae_import.mjs "kueche gadget" "sommer outdoor" "schuhe herren"
```
→ schreibt `/tmp/ae_enriched.json` (Name, CHF-Preis, Bilder, Bestellzahl, Video).
Danach wie bei CJ: **Bilder HTTP-200 prüfen → create-product (ACTIVE) → publish in 6 Kanäle**.

### Signatur (im Skript implementiert)
- Gateway `https://api-sg.aliexpress.com/sync`, `sign_method=sha256`.
- Params alphabetisch sortiert, `key+value` konkateniert, `HMAC-SHA256(appSecret)` → hex uppercase.
- `timestamp` in **Millisekunden**. Bei erstem echten Lauf ggf. Pfad in `pickList()` / Timestamp-Format
  an die tatsächliche API-Antwort anpassen (Response-Struktur variiert je nach Region/Version).

---

## Empfehlung
- **Sofort Produkte wollen** → Weg A (DSers), ich veredle.
- **Automatik wie bei CJ** → Weg B, gib mir App Key/Secret/Tracking-ID, dann laufe ich das Skript.

Beide Wege sind ToS-konform. **Kein Scraping** — das wäre gegen die AliExpress-Nutzungsbedingungen,
fragil und riskant für den Shop.
