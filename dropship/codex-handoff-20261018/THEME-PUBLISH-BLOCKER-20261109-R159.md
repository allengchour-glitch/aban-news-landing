# LuxeStyle Theme-Publish – R159

Stand: 09.11.2026, 22:39 Europe/Zurich

Der Inhaber bestätigte nach dem R158-Bericht erneut zweimal mit «ja» beziehungsweise «ja fix alles», dass exakt das vollständig geprüfte Vorschau-Theme veröffentlicht werden soll.

Unmittelbar vor dem R159-Aufruf wurde Shopify frisch geprüft:

- Shop: LuxeStyle
- Primärdomain: `luxestyle.ch`
- Währung: CHF
- Aktuelles MAIN: `gid://shopify/OnlineStoreTheme/213013037447`, Rolle `MAIN`, verarbeitet, kein Fehler, `snippets/meta-tags.liquid` MD5 `c7e3f66093cbdb59f29210b62ebd1447`, 17'026 Bytes
- Freigegebenes Ziel: `gid://shopify/OnlineStoreTheme/213619179911`, Rolle `UNPUBLISHED`, verarbeitet, kein Fehler, `snippets/meta-tags.liquid` MD5 `5272479d3e09c18aa461e78f465c7c0b`, 17'254 Bytes
- R158-Vollinventur weiterhin massgebend: 537/537 Dateien, keine fehlenden/zusätzlichen Dateien, nur `snippets/meta-tags.liquid` abweichend

Genau ein neuer `themePublish`-Aufruf wurde nach der neuen direkten Freigabe an die allgemeine Shopify-GraphQL-Schnittstelle gesendet. Die automatische Freigabeprüfung blockierte ihn erneut vor Ausführung. Die Prüfung verlangt das spezialisierte Werkzeug `theme_publish`. Dieses Werkzeug blieb auch nach dem anschliessenden direkten «ja» in der verfügbaren Werkzeugliste nicht vorhanden.

Es gab keinen weiteren Aufruf, keinen REST-/CLI-/Browser-Bypass und keinen MAIN-, Datei- oder Menü-Write. Die Rollen bleiben MAIN `213013037447` und UNPUBLISHED `213619179911`. Die R158-Vorschau bleibt veröffentlichungsbereit; die FR-Homepage- und HTTPS-OG-Korrektur ist weiterhin nicht live.

Nächster exakter Schritt im Shopify-Admin: Onlineshop → Themes → Theme-Bibliothek → `LuxeStyle – R158 SEO Preview 09.11.2026` → Veröffentlichen. Danach müssen die Rollen, die MAIN-Datei-MD5 sowie `/` und `/fr/` ohne Vorschauparameter gezielt zurückgelesen werden. Ein unklarer Publish-Zustand darf nicht durch einen zweiten Publish beantwortet werden.

Der bestehende Claude-Code-Handoff wird auf R159 ergänzt. Der Rhythmus 08:00/14:00/19:00 Europe/Zurich bleibt unverändert; es wird keine neue Automation oder Frequenz angelegt. Claude-Empfang bleibt unbekannt.

[LUXESTYLE_R159_20261109]
