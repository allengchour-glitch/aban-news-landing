# Hero-Video der Startseite in hoher Auflösung (08.11.2026 abends)

Auftrag des Besitzers (Bildschirmfoto der Produktwand, «kannst du das hoch auflösender machen und besser?»). Meine Auslegung: dieselbe Produktwand, nur scharf.

## Befund (GEMESSEN am 08.11.2026 mit Playwright auf luxestyle.ch)
- Das Video war als Shopify-«Video» hochgeladen. Shopify kodiert dabei auf höchstens 720p um: ausgeliefert wurde `…HD-720p-1.6Mbps-….mp4` mit **518 × 720 Pixeln** (`videoWidth`).
- Gezeigt wird es auf dem Desktop in einer Fläche von 731 × 640 CSS-Pixeln (`object-fit: cover`), also 1,4-fach hochgezogen (auf Bildschirmen mit doppelter Dichte rund 2,8-fach). Auf dem Handy 358 × 472 CSS-Pixel bei dreifacher Dichte, also rund 2-fach hochgezogen.

## Umsetzung (LIVE 08.11.2026 ca. 22:45 UTC, MAIN-Theme 213013037447)
- Neu gerendert mit `hero_video_bauen_sc.py` (Skalierungsfaktor `SC=1.2`, `CRF=25`, 30 Bilder je Sekunde, 20 s, nahtlose Schleife): **1296 × 1800 Pixel, 3,6 MB, 1,4 Mbit/s**. Bauaufruf: `SC=1.2 CRF=25 python3 hero_video_bauen_sc.py mobil 20 30` im Ordner mit einem Unterordner `img/` (Katalogbilder aus dem Bau vom 27.10.2026, nicht im Repo; die Skripte stehen in `dropship/startseite-2710/`).
- Hochgeladen als **Datei** (nicht als Video-Objekt, `automation/upload_to_shopify_cdn.mjs`, `contentType FILE`): Shopify liefert sie unverändert aus (gemessen: 3 575 429 Byte gleich der lokalen Datei, `video/mp4`, `accept-ranges: bytes`, Teilabruf HTTP 206).
  - Video: `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxe-hero-wand-0811.mp4?v=1794177202`
  - Vorschaubild: `https://cdn.shopify.com/s/files/1/0943/6856/3585/files/luxe-hero-wand-0811-poster.jpg?v=1794177208`
- Geändert ist nur `sections/luxe-edit-home.liquid` (drei Adressen im Hero-Block und die Masse des Vorschaubilds 720 × 1000 → 1296 × 1800, gleiches Seitenverhältnis). Rücklesen aus dem Theme: byte-gleich dem Soll.
- **Live nachgemessen** (Desktop 1440, doppelte Dichte, Handy 390): `videoWidth × videoHeight` jetzt **1296 × 1800** (vorher 518 × 720), das Video läuft (`paused: false`), Fläche und Seitenhöhe unverändert (731 × 640 bzw. 358 × 472; Seitenhöhe 8 721 bzw. 10 777 Pixel wie vorher). Bild gesichtet: Kacheln und Beschriftungen scharf.

## Rücknahme
`SHOPIFY_SHOP=au3j0y-hq.myshopify.com node dropship/hero-video-0811/theme_datei_schreiben.mjs dropship/hero-video-0811/sicherung/luxe-edit-home.liquid.vor-hero-0811 sections/luxe-edit-home.liquid zurueck` (Token in `/tmp/cj_shop_token.txt`, per Client-Credentials geholt). Die alten Shopify-Video-Dateien und die neuen Dateien bleiben im Shop liegen.

## Nicht gemessen
- Ladezeit auf einem echten Handy im Mobilfunknetz (die Datei ist 3,6 MB gross; das Video lädt erst nach dem Laden der Seite über `data-src`, das Vorschaubild ist das Bild, das zuerst erscheint).
- Wirkung auf Verkäufe.
- Andere Seiten, die dasselbe alte Video einbinden könnten: gesucht wurde nur in `sections/luxe-edit-home.liquid`, `templates/index.json`, `layout/theme.liquid` und `assets/luxe-edit.css` (kein weiterer Treffer).
