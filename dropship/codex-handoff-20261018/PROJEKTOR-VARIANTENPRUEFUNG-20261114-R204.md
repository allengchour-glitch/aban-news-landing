# Offline-Nachprüfung: Varianten-CTA und Bildbindung

Geprüft wurden ausschliesslich das bestehende `browser-observations.json` und die bereits aufgenommenen Screenshots; keine weitere Shopanfrage oder Browserausführung.

- **Mobile CTA:** Der frühere Snapshot ohne CTA war ein Abfrageartefakt: `buttons` enthält nur die ersten 50 sichtbaren Buttons und verfehlte damit den Produktbutton. Im Screenshot `mobile-upper.png` bei 390 × 844 px ist „In den Warenkorb legen“ klar sichtbar, etwa bei y=614–666; die mobile Auswahl ist hier nicht offscreen. Der Button wurde nicht betätigt. Der Screenshot stammt aus dem Zustand nach G-Auswahl.
- **Hauptproduktbild:** Die DOM-Snapshots zeigen bei A Bild 11 (`752b9e0c…jpg`), bei E Bild 3 (`d886c463…jpg`) und bei G Bild 4 (`7b27bd25…png`) als grosses Produktbild (`width` 480 bzw. 3840 in der jeweiligen Darstellung). Damit wechselte das Produktbild mit der Variantenauswahl in Mobile und Desktop. Das separate Kartenbild mit Alt-Text „Modell: A · Grundmodell“ blieb in der DOM-Bildliste; es ist das Thumbnail der A-Auswahlkarte und kein Beleg für ein unverändertes Hauptbild.
- **Ergebnis:** Kein CTA-Offscreen-Befund und kein Bildbindungsfehler aus den vorhandenen Belegen. Keine CRO-Änderung vorgeschlagen.

Quelle: `browser-observations.json` (Browserlauf 2026-11-14 ca. 11:11 UTC), `mobile-upper.png` und `desktop-upper.png`. Screenshots zeigen ausschliesslich den oberen Produktbereich.
