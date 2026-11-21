# R303 – Mobiler Startseitenfilm – 21.11.2026

Nach erneuter Rückmeldung zur Handy-Version den öffentlichen Film im Shopify-Haupttheme «LuxeStyle – Startseite 21.11.2026» (`214565814663`) nochmals geprüft. Shop `94368563585`, `luxestyle.ch`, CHF. Die verifizierte mobile R302-Quelldatei war 5’810’056 Byte gross. Bei gedrosselter Verbindung musste der Browser während des Abspielens wiederholt nachladen.

## Live-Korrektur

Den freigegebenen stummen 32-Sekunden-Film mit allen 18 Produkten auf 360 × 640, 30 fps, H.264/yuv420p mit Web-Start optimiert. Shopify Video `78154744136071`, `READY`, quittierter Upload HTTP 204. Das Original von Shopify zurückgelesen und bytegleich mit der neuen Eingabedatei geprüft. SHA-256 `76239d58ef27ce44735425f0ba9b6493713f6388a3648cf8ae234a73954195ea`, 1’287’296 Byte, rund 78 % kleiner. SSIM 0,9905 gegenüber dem unverändert auf diese Grösse skalierten Ausgangsfilm.

Handys im Querformat erhalten ebenfalls die leichte Datei. Bei einer länger ausstehenden Wiedergabe zeigt der Player das Standbild und verwendet nach der Pufferung dieselbe Datei weiter. Desktop behält seine 1920 × 1080-Datei. Layout unberührt.

Genau `assets/luxe-scroll-hero.js` und `templates/index.json` geprüft, mit Versions-ID `5bf1c2697d2e717d32c5c5e2da12e9eba933e347` gespeichert, veröffentlicht und über Admin-Prüfsummen sowie öffentlichen Abruf bestätigt.

## Öffentlicher Handybrowsertest

Chromium mit Handy-Viewport 390 × 844, geleertem Cache, 1 Mbit/s, 130 ms Latenz und vierfach gebremster CPU. Beim ersten Abspielen in der Messung nach der Veröffentlichung brauchte die Seite rund 19 Sekunden bis zum ersten `playing`.

| Filmquelle | Nachpufferungen nach Start | Verworfene Bilder |
|---|---:|---:|
| Bisherige 5,8-MB-Ausgabe | 12 | 16 von 280 |
| Neue 1,3-MB-Ausgabe | 0 | 2 von 375 |

Zusätzlich die Quellenwahl am Desktop und im Handy-Querformat, das Standbild bei reduzierter Bewegung und bei simuliertem längerem Nachladen sowie die Wiederaufnahme mit derselben Datei öffentlich geprüft. Die Messung stammt aus dem Browserlabor, ein Test auf dem Handy des Inhabers liegt offen.

Lokale Messdaten: `/tmp/luxe-mobile-video-20261121/before-125000.json`, `after-125000.json` und `browser-check.json`. [Öffentliche Startseite](https://luxestyle.ch/) · [Shopify-Theme](https://admin.shopify.com/store/au3j0y-hq/themes/214565814663/editor)
