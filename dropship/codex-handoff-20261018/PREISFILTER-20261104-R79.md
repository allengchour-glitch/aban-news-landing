# Preisfilter: enger Korrekturentwurf, R79

04.11.2026. Die heutige Gegenprobe bestätigt bei Beauty bis CHF 50 weiterhin 15 zusätzliche SEO-Seitenlinks ohne Preisparameter. Der Ist-Zustand ist unverändert fehlerhaft; dieser Entwurf wurde nicht in Shopify gespeichert.

## Konkreter Umfang zur Freigabe

Genau fünf Zeilen in `snippets/product-grid.liquid` ergänzen. Bei einem Filter des Typs `price_range` wird eine gesetzte Mindest- oder Höchstpreisgrenze als aktiver Filter gezählt. Dadurch wird der zusätzliche SEO-Pager, der absichtlich nur ungefilterte URLs baut, bei aktiven Preisgrenzen nicht ausgegeben. Auch ein ausdrücklich gesetzter Wert 0 zählt; `nil`/`nil` bleibt ungefiltert.

Die vorhandene normale Pagination, das Nachladen, übrige Filter, Sortierung, Banner, Texte, Produkte und Preise werden nicht verändert. Keine neue CSS-/JavaScript-Datei oder Installation.

Native Ausgangsstände frisch identisch: MAIN 213013037447 und UNPUBLISHED 212978598279, Snippet-MD5 `003e7ff97eb7a6312f02e1ae10679576`. Erwarteter MD5 nach genau diesem Patch: `d53feb1609ea66e1f85b049e56d06dd0`.

## Begrenzte Prüfung

- Ein öffentlicher HTML-GET auf Beauty mit Höchstpreis 50: HTTP 200, Preisfelder `50.00`, 15 Zusatzlinks verlieren Preisbedingung.
- Ausgangsdatei und Entwurf bestehen den vorhandenen Shopify-Liquid-Validator.
- Patch vorwärts und rückwärts bytegenau geprüft; fünf Ergänzungen, keine gelöschte Zeile.
- Unabhängige Codeprüfung: kein blockierender Befund. `!= nil` erfasst 0 korrekt; zusätzliche Pilot-/Sprach-/Sortierungsregeln bleiben erhalten.
- Kein Render des geänderten Codes durch Shopify und keine Browserabnahme des Entwurfs. Keine bereits behobene Livewirkung behaupten.

Vor einer genehmigten Übernahme aktuellen Theme-Status und Ausgangshash erneut prüfen. Nur dieses Snippet ändern, keinen gesamten alten Theme-Entwurf publizieren. Danach konkret unfiltriert, Mindestpreis, Höchstpreis, beide Preisgrenzen und Entfernen der Filter im tatsächlichen Entwurf prüfen; bestehende normale Pagination/Infinite-Scroll-Funktion muss erhalten bleiben. Bei Drift zuerst Diff neu prüfen. Rollback ist der exakt getestete Reverse-Patch.

Shopify-Dokumentation: https://shopify.dev/docs/storefronts/themes/navigation-search/filtering/storefront-filtering/support-storefront-filtering
