# R269 – Einzelnes Kampagnenmotiv für die Startseite

Der lokale Vorschlag ersetzt den bewegten Collage-Aufmacher im aktiven Startseitenpfad durch ein einziges dekoratives Higgsfield-Motiv. Überschrift, Beschreibung, beide CTA-Ziele, vorhandene Schriften und sämtliche Inhalte unter dem Hero bleiben erhalten.

Geändert werden fünf Dateien: die bestehende Startseiten-Section, die zwei bildbezogenen Werte in `templates/index.json` sowie drei Schema-Sprachdateien. Die Section erhält einen Bild-Picker und einen horizontalen Fokusregler für den Handy-Ausschnitt. Die neuen Styles gelten ausschliesslich unter `.lx-campaign-hero`; bestehende Produktkarussells bleiben erhalten.

Der aktive Still-Pfad enthält kein Video, keinen Pauseknopf und kein `data-hero-media`. Damit aktiviert das unveränderte vorhandene Skript seinen Video-Zweig hier nicht. Ohne gewähltes Kampagnenbild bleibt für andere Konfigurationen der alte Fallback verfügbar.

Das bestätigte Bild ist an `shopify://shop_images/luxe-atelier-hero-r269.webp` gebunden. Seine tatsächlichen Masse sind 3504 × 2336 Pixel. Das responsive Srcset endet deshalb bei 3504; die `sizes` berücksichtigen auf dem Handy die höhere notwendige Quellbreite durch den Porträt-Ausschnitt. Ein expliziter `image_tag`-Style verwendet eine viewportabhängige Fokusvariable, damit ein automatisch erzeugter Inline-Fokus den mobilen Regler nicht überstimmt.

Lokale Quellen-, JSONC-, Schema- und Erhaltungsprüfungen sind bestanden. Der unabhängige Quelldiff-Review hat 25 von 25 Prüfungen bestanden. Die visuelle Browserprüfung ist ausdrücklich ein lokaler Mock mit echten Shop-Styles und dem bestätigten Bild. Sie ersetzt keinen Shopify-Liquid-Render, keine Speicherung im Theme und keine Live-Veröffentlichung. Diese Schritte müssen separat belegt werden.

Die Datei `HERO-DESIGN-MANIFEST.json` enthält die aktuellen Kandidaten- und Originalhashes. Nach jeder Kandidatenänderung sind Manifest, Diff und Mock-Eingaben neu zu erzeugen. Es erfolgten durch diesen Design-Agenten keine externen Schreibaktionen.
