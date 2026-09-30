# LuxeStyle als App (PWA) — 30.09.2026

Betreiber 30.09.: «kannst du das auch in shop machen und app» → auf Nachfrage «alle 3» (Shopify-Shop-App, Social-Apps, eigene App).

## GEMESSEN
- Theme `layout/theme.liquid` (Live, 35'334 Zeichen) hatte **kein** Web-App-Manifest, kein `apple-touch-icon`, keine `theme-color`.

## GETAN
- Theme-Assets: `luxestyle-manifest.json.liquid` (name/short_name «LuxeStyle», `display: standalone`, Start `/?utm_source=app&utm_medium=homescreen`
  → Besuche aus der App sind in Shopify-Analytics als eigene Quelle messbar), Symbole `luxestyle-app-180/192/512.png` + `512-maskable`
  (goldenes «LS» auf #121212, Markenfarben aus social/brand).
- `<head>`: `<link rel="manifest">`, `theme-color`, `apple-touch-icon`, `apple-mobile-web-app-title`, `mobile-web-app-capable`.
  Live-Datei vorher gesichert (`/tmp/theme_liquid_backup_vor_pwa.liquid`, md5 3f23618a…), zurückgelesen: Block drin, Rest byte-gleich.
- **Geprüft:** Storefront liefert `<link rel="manifest">` aus, Manifest HTTP 200 `application/json`, Liquid gerendert (Symbol-URLs echt);
  Chromium CDP `Page.getAppManifest` → 0 Fehler, `getInstallabilityErrors` → nur `in-incognito` (Testbrowser) = installierbar.

## So installiert man sie
- **iPhone (Safari):** luxestyle.ch → Teilen → «Zum Home-Bildschirm» → Symbol «LuxeStyle».
- **Android (Chrome):** luxestyle.ch → Menü ⋮ → «App installieren» / «Zum Startbildschirm hinzufügen».

## Grenzen / OFFEN
- Kein Service Worker (Shopify erlaubt keinen auf der Wurzel-Domain) → keine Offline-Seite, keine Push-Nachrichten.
- **Shopify «Shop»-App:** zeigt automatisch dieselben Produktbilder wie der Webshop — Tatis Fotos erscheinen dort, sobald sie im Shop sind
  (wartet auf Speicherplatz, Aufräumung läuft).
- Ein Hinweis «App installieren» auf der Seite ist bewusst NICHT eingebaut (kein neues Popup ohne Messung).
