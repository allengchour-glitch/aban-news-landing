# R273 – Freigegebener Film, nativer Einbau vorbereitet

Der Inhaber hat den konkreten Film mit «mach live» kreativ und zur Veröffentlichung freigegeben. Dieselbe Freigabe nicht erneut anfordern. Der eine Master bleibt `luxe-home-atelier-multishot-20261116`, Original-SHA-256 `84b01590961a9f6f85d27921118c658d9839c5df1290ccfe82592fc2763f38f6`.

## Tatsächlich angelegt

- Video `gid://shopify/Video/78096309289351`, Dateiname `luxe-atelier-scroll-master-r272.mp4`, READY; Referenz `shopify://files/videos/luxe-atelier-scroll-master-r272.mp4`.
- Standbild `gid://shopify/MediaImage/78096308339079`, `luxe-atelier-scroll-poster-r272.jpg`, READY; Referenz `shopify://shop_images/luxe-atelier-scroll-poster-r272.jpg`.
- Shopify-Original 1080 × 1440 ist exakt hashgleich zum freigegebenen Master. Die vom Video-Picker gelieferten MP4-Quellen sind Shopify-Transkodierungen; der Kandidat wählt maximal 810 × 1080, 15 Sekunden. Das ist keine native 4K- oder 1440p-Ausgabe des Pickers.

## Noch fehlender Zugang

`themeDuplicate` für MAIN 214169584007 gab `newTheme:null` und leere `userErrors` zurück. Eine gezielte Namensabfrage fand keine bestätigte Kopie; der neueste bekannte Entwurf ist älter als MAIN. Ergebnis der Kopieraktion bleibt unbekannt. Nicht blind erneut ausführen, nicht MAIN bearbeiten und keine veraltete Kopie veröffentlichen.

Der Inhaber wurde um eine aktuelle Kopie im Shopify-Admin gebeten. Kein bestätigter angemeldeter Browser-Zugang oder authentifizierter vorhandener Helfer zum Kopieren steht zur Verfügung. Die alternative Mutation `themeCreate` benötigt eine vollständige verifizierte Theme-ZIP; dieses Neun-Dateien-Paket ist nur ein Patch und keine vollständige Theme-Quelle. Keine alten Themes löschen oder fremde Änderungen zurückrollen.

## Konkreter Einbau nach bestätigter Kopie

1. Shopidentität und Theme-Rollen frisch lesen. Der Zielentwurf muss UNPUBLISHED und eine aktuelle vollständige Kopie des dann gültigen MAIN sein. Bei Änderungen die R273-Basis neu abgleichen.
2. `DEPLOYMENT-MANIFEST.json` enthält neun vollständige Dateien und acht erwartete Quell-MD5. Das neue JS darf zuvor nicht existieren. Vor Änderungen alle betroffenen Originale frisch lesen und den Diff gegen den echten Zielentwurf prüfen. Drift blockiert den gespeicherten Vollersatz; Übersetzungen neu zusammenführen.
3. `deployment/` enthält vollständige Laufzeit-Sprachdateien für Deutsch/Englisch/Französisch, keine *.additions.json. Alle bisherigen Schlüssel und Werte sind erhalten. Das Index-JSON bindet die echten Video-/Poster-Ressourcen und setzt `hero_scroll_enabled=true` ausschliesslich im lokalen Kandidaten. Alle anderen Index-Daten sind gleich.
4. Im bestätigten Entwurf erst Sprach-/Schema-/Moduldateien, dann owning Section und Index übernehmen. Kaufwege, Versandgrenzen, Kontodomäne und übrige Seiten erhalten. Sämtliche Pending-Dateien mit dem konkreten Diff vergleichen.
5. Native Vorschau auf Desktop und Mobilgerät: Liquid aufgelöst, genau ein neuer Scroll-Owner, richtiges Standbild und Video, übersetzte Steuerungen, vollständige Produkte, lesbarer Text, Header, normale Navigation, Halt/Tastatur/Reduced Motion. Keine gewöhnliche Autoplay-Schleife aktivieren. Das isolierte R272-Chromium-PASS ersetzt diesen Schritt nicht.
6. Shopify-CDN mit realem Vorwärts-/Rückwärts-Seeking und echten Zielgeräten prüfen. Die gewählte Transkodierung hat 3-Sekunden-Keyframes statt 0.5 Sekunden im Original; acht öffentliche Chromium-Seeks bestanden, eine iPhone-/Safari-Abnahme ist noch offen.
7. Erst nach erfolgreicher nativer Prüfung speichern, alle neun Dateien frisch zurücklesen, dann die vorhandene ausdrückliche Veröffentlichungsfreigabe verwenden. Keine weitere Eigentümerfreigabe für denselben Umfang nötig. Eine technische Publisher-Verweigerung nicht umgehen. Danach MAIN-Rolle und öffentliche Startseite neu prüfen; erst dann «live» melden.

Ein Paket, ein gespeichertes Video und ein gesetztes lokales Aktivierungsflag sind keine Veröffentlichung. Der aktuelle öffentliche Shop zeigt weiterhin den alten Aufmacher.
