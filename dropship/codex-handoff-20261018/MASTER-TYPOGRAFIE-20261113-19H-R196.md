# Derselbe Projektormaster: gemessener Typografie-Delta

13.11.2026, 19h-Lauf. Master-ID `luxe_sternenprojektor_master_20261018`. R195/Core4, R194-Briefing und R195-Quellenmatrix gelesen. Deren geprüfter Stand enthält allgemeine Schriftgrössen/Safezones, aber keine vermessene 360-/390px-Textprobe. **Neu ist ausschliesslich diese lokale technische Layoutprüfung, kein Film oder Produktbild.**

## Konkrete Korrektur

In der vorhandenen Schrift **DejaVu Sans Bold, 68px bei 1080×1920**, messen Hook A einzeilig 968px, Hook B 1226px und das Produktlabel 858px. Alle überschreiten die vorgesehene Textbreite von 732px. Statt Schrift zu verkleinern, werden die unveränderten Texte wie unten umbrochen. Der CTA passt mit 652px einzeilig.

| Inhalt / Zeitbindung | Geplanter Umbruch | Textursprung / tatsächliche Ink-BBox bei 1080px |
|---|---|---|
| Hook A, 0–2.4s, Frames 0–71 | `Vom Gerät` / `zum Lichtbild.` | (108,300): [108,300,512,354]; (108,382): [108,382,648,435] |
| Hook B, Alternative für dieselben Frames | `Was steckt hinter` / `diesem Licht?` | (108,300): [108,300,784,353]; (108,382): [108,382,635,435] |
| Produktlabel, 6–10.2s, Frames 180–305 | `Sternenlicht-` / `Projektor` | (108,300): [108,300,608,353]; (108,382): [108,382,466,449] |
| CTA, 14.4–18s, Frames 432–539 | `Produkt ansehen` | (108,1302): [108,1302,760,1355] |

Alle vier Texte bleiben 68px fett; Zeilenursprünge 82px auseinander, Pillow-Anker `lt`. Der sichtbare Produktname bleibt «Sternenlicht-Projektor»; der vorhandene Bindestrich ist die Umbruchstelle. Hook B bleibt Schnittalternative desselben Masters, kein weiterer Tagespost. Die übrigen Frames enthalten weiterhin keinen zusätzlichen Text.

## Raster- und Safezone-Gegenprobe

Die tatsächlich gezeichneten Textausschnitte wurden auf **390px und 360px Breite** skaliert und in einer einzigen technischen Tafel angesehen. Nominale Schriftgrösse: **24.56px bei 390px / 22.67px bei 360px**; dies ist die skalierte Schriftgrösse, nicht die Glyphenhöhe. Tatsächliche Ink-BBoxes und quantisierte Raster-BBoxes beider Grössen stehen im JSON. Kein Text läuft aus seiner Zone; Hook B ist mit 676px die breiteste neue Zeile und hat noch 56px Abstand zur rechten Textgrenze.

Kritische Textzone: x108–840/y300–1440. Für neue Aufnahmen präziser reservieren: vollständiges Gerät und echte Projektion innerhalb x120–840/y520–1230, damit die bis y449 reichende Beschriftung und der CTA darunter keinen Produktteil verdecken. Dies ist eine Aufnahme-/Layoutvorgabe, kein Beleg vorhandener passender Filmaufnahmen. Die Textfläche ist Cream `#F4EBDD` auf **deckender** dunkler Taupefläche `#302B28`; berechneter sRGB-Kontrast **11.83:1**. Transparenz oder ein späterer anderer Hintergrund erfordern eine neue Kontrastprüfung.

Die grüne Kontur in der PNG ist eine technische Messhilfe und gehört nicht in den Film. Die Tafel zeigt ausgeschnittene Textbereiche im tatsächlichen 390-/360px-Massstab, keine vollständige Plattformvorschau. App-UI, Profilraster, dynamischer Filmkontrast und menschliche Lesegeschwindigkeit sind damit nicht abgenommen. Die kleine offizielle Wortmarke aus dem R194-Endbild wurde hier nicht separat geprüft.

## Werkzeug, Belege und unveränderter Rest

Vorhandenes Pillow/ImageFont/ImageDraw, keine Installation. Verwendete Textschrift: `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`, SHA-256 `a4c5bc453ca281d90ea079e596da7ae0dfeb5777497c29ec254e76d97ff6f890`. Die reguläre DejaVu Sans dient nur der technischen Tafelbeschriftung; Pfad/Hash ebenfalls im JSON. Keine Produktaufnahme wurde benutzt, verändert oder durch ein schematisches Produkt ersetzt.

R194-Hooks, sechs Captions/UTMs und der 18s-/540-Frame-Plan bleiben inhaltlich erhalten. R195-Ausschluss des ungeeigneten Detailausschnitts 17.20–18.80s bleibt verbindlich. Native Hochkantquelle, tatsächliche Einheits-/A-Motivbindung, kommerzielle Rechte und professionelle Bild-/Ton-/Plattformabnahme bleiben offen. Die technische Tafel schliesst keines dieser Tore. Keine wiederholte Frame-/Musikprüfung, Tagesreports, API-Aufrufe, MP4-/Musikrenders, Uploads oder produktive Code-/Plattformänderungen. Die reine Dokumentation wird separat gespeichert.

[Technische Textprobe](MASTER-TEXTPROBE-360-390-20261113-R196.png) · [Messbelege](MASTER-TYPOGRAFIE-20261113-19H-R196.json).
