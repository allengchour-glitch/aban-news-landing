# 🟢 Google Merchant Center — Domain verifizieren + Free Listings AN (Schritt für Schritt)

> Ziel: Deine ~90 Marken-Produkte erscheinen **GRATIS** in Google Shopping / Google-Suche (Free Listings).
> Voraussetzung erfüllt: Produkte haben **Marke (vendor) + EAN-Barcode** gesetzt → Google-tauglich.
> Dauer: ~15 Min Klicks + 3–5 Tage Google-Prüfung. Stand 2026-06-15.

---

## TEIL A — Verbinden (von Shopify aus, am einfachsten)
1. Shopify-Admin → **Vertriebskanäle → „Google & YouTube"** (ist schon installiert). Falls nicht: im App Store „Google & YouTube" holen.
2. **Google-Konto verbinden** (das Konto, das das Merchant Center besitzen soll). Zugriff erlauben.
3. Der Kanal legt automatisch ein **Merchant Center** an (oder verbindet ein bestehendes).
4. **Einstellungen im Kanal prüfen:**
   - **Zielland / Versand: Schweiz** · **Sprache: Deutsch** · **Währung: CHF**.
   - „Produkte synchronisieren" = AN. (Der Feed wird automatisch aus den publizierten Produkten erzeugt — kein manueller Feed nötig.)

## TEIL B — Domain verifizieren & beanspruchen (Merchant Center)
> Beim Verbinden über den Shopify-Kanal passiert das oft **automatisch**. Falls im Merchant Center eine Warnung „Website nicht verifiziert/beansprucht" steht:
1. merchants.google.com öffnen → ⚙️ **Tools & Einstellungen → Unternehmensinformationen → Website**.
2. URL eintragen: **`https://luxestyle.ch`**.
3. Verifizieren — empfohlene Methode: **HTML-Tag** ODER **Google Search Console**.
   - Einfachster Weg bei Shopify: Verifizierung läuft meist automatisch über die Kanal-Verbindung. Sonst:
   - **HTML-Tag-Methode:** Google gibt ein `<meta name="google-site-verification" ...>`-Tag → in Shopify
     **Onlineshop → Themes → ⋯ → Code bearbeiten → `theme.liquid`** direkt nach `<head>` einfügen → Speichern → in Google „Verifizieren".
   - **Search-Console-Methode:** Domain in search.google.com/search-console verifizieren (DNS-TXT bei deinem Domain-Anbieter), dann im Merchant Center „beanspruchen".
4. Status muss am Ende **„Verifiziert" + „Beansprucht"** sein. ✅

## TEIL C — Free Listings einschalten
1. Merchant Center → linke Leiste **„Wachstum" → „Listings verwalten"** (bzw. „Kostenlose Produktlisten / Free listings").
2. **„Surfaces across Google" / „Kostenlose Listings" = AKTIVIEREN.** (Damit erscheinen Produkte gratis in Google-Shopping-Tab & Suche.)
3. Programm-Richtlinien akzeptieren.

## TEIL D — Feed prüfen (Produkt-Freigabe)
1. Merchant Center → **„Produkte"** → Status ansehen.
2. **Genehmigt** = erscheint gratis. **Abgelehnt** = Grund anschauen:
   - Häufig: fehlende **GTIN/Marke** → bei uns gesetzt (79 mit Barcode, Marke=vendor). Rest-EANs ggf. nachtragen.
   - **Preis-/Verfügbarkeits-Mismatch** → Produkte sind „auf Lager" (tracked:false) → passt.
3. **3–5 Tage** Google-Prüfung abwarten. Danach laufen die Free Listings.

## ⚠️ Wichtig / Stolpersteine
- **Domain-Verify ist Pflicht** — ohne sie keine Free Listings (das ist DER blockierende Klick).
- **Schweiz als Zielland** unbedingt setzen (nicht US/DE).
- Bezahlte Google-Ads (Performance Max) **erst NACH** ersten Conversion-Daten — zuerst gratis Free Listings + Meta/TikTok.
- Restliche ~11 Produkte ohne EAN: der Importer sollte `ean13` beim Anlegen mitgeben (systemisch), dann sind 100 % feed-clean.

## ✅ Was schon erledigt ist (musst du NICHT mehr machen)
- Produkte in den **Google-Kanal publiziert** (Feed befüllt).
- **Marke (vendor)** = echte Marken · **EAN-Barcodes** auf 79 Produkten.
- Kollektionen/Produkte mit SEO-Titeln + Beschreibungen.
