# Audit-Liste vom 07.11.2026: Prüfung und Korrekturen

Der Besitzer schickte am 07.11.2026 eine Liste von Befunden (Quelle unbekannt, vermutlich eine KI-Prüfung der Live-Seite; die Liste bricht bei «Nicht klickbare Links in YouTube Shorts» ab). **Jeder Punkt wurde am Live-Shop nachgemessen**, nichts wurde auf Verdacht geändert. Marken: **GEMESSEN** = hier am 07.11.2026 (ca. 19:45 bis 21:30 UTC) gemessen · **QUELLE** = Drittquelle · **Hypothese** = nicht belegt.

| # | Behauptung | Urteil | Was geschah |
|---|---|---|---|
| 1 | `/fr/`-Seiten liefern deutschen Text (Duplicate Content) | **bestätigt** | `noindex` auf nicht übersetzte `/fr/`-Seiten (live) |
| 2 | FAQ-Satz «Alles rund um Alles ab Schweizer Lager bei LuxeStyle» | **bestätigt** | Satz in `templates/collection.json` korrigiert (live) |
| 3 | Emoji im Produkt-Handle (Beispiel 🦃 Black Friday) | **in anderer Form bestätigt** | 14 Handles auf ASCII, alte Adressen leiten per 301 um (live) |
| 4 | «Versand nur in der Schweiz» auf `plusch-hamster-18-cm-fga25780` | **nicht nachvollziehbar** | nichts geändert |
| 5 | Wiederholte TikTok-Links («Kuscheldecke Hasenfell-Imitat», «Halterung …») auf Kleider-/Schuhseiten | **heute nicht nachvollziehbar** | nichts geändert (Stand vor dem 01.11. wahrscheinlich) |
| 6 | Links in YouTube Shorts nicht klickbar (Satz abgebrochen) | **als Plattformregel bestätigt** | nicht durch uns behebbar, Alternativen unten |

## 1. `/fr/` mit deutschem Text

- GEMESSEN: `https://luxestyle.ch/fr/products/unterwasche-fur-damen-639300` und `…/elegantes-halterneck-kleid-639800` liefern `<html lang="fr">`, **deutschen** Titel und deutsche Meta-Beschreibung, Selbst-Canonical (`/fr/…`) und `hreflang` de/fr/x-default. Die Oberfläche ist französisch («Ajouter au panier»), der Produkttext deutsch.
- GEMESSEN: Stichprobe 120 zufällige Produkte (Admin API, `translatableResource` für `fr`): **0** mit französischem Titel, Beschreibung oder SEO-Text. Die Sprache `fr` ist veröffentlicht, `en` und `it` nicht (`shopLocales`).
- GEMESSEN (Search Console, 04.08. bis 04.11.2026): `/fr/`-Seiten stehen im Google-Index und haben Einblendungen, aber **in den 25 Zeilen mit den meisten Klicks nur 1 Klick insgesamt**, alle übrigen 0. Ein `noindex` kostet also keinen messbaren Verkehr.
- **Korrektur (live, 07.11.):** in `layout/theme.liquid` vor `</head>` ein Block (`lx-audit-0711`): bei nicht primärer Sprache und Vorlage `product`, `collection`, `article` oder `blog` wird `<meta name="robots" content="noindex, follow">` ausgegeben. Live gemessen: `/fr/products/…`, `/fr/collections/…`, `/fr/blogs/…` haben `noindex`; `/`, `/fr`, `/fr/cart`, alle deutschen Seiten nicht.
- **Nachmessung und Review-Kandidat (08.11., nicht live):** `/fr`, `/fr/pages/versand-lieferung`, `/fr/pages/rueckgabe`, `/fr/pages/impressum` und `/fr/pages/alle-kategorien` sind ebenfalls ganz oder teilweise deutsch, aber indexierbar. Der V2-Kandidat migriert nur den exakt bekannten V1-Block und ergänzt deshalb `index`, `page` und `list-collections`. Er gilt nur für `fr` als nicht primäre Sprache. Das boolesche Shop-Metafeld `luxe.fr_index_ready` kann die Sperre erst nach vollständigem, aktuellem Übersetzungsbeleg aufheben; dieser Patch enthält keinen Setter. Unbekannte oder doppelte Altblöcke werden abgewiesen. Kein Theme-Write oder Publish wurde mit diesem Kandidaten ausgeführt.
- **Nicht änderbar vom Theme aus:** die `hreflang`-Tags schreibt Shopify selbst (im Theme-Dump steht kein `hreflang`). Sie zeigen weiter auf die `/fr/`-Adressen. Google ignoriert `hreflang` auf `noindex`-Seiten; das ist harmlos.
- **Entscheid des Besitzers (Standard «bleibt»):** (a) die Sprache `fr` ganz abschalten (dann verschwindet auch die französische Oberfläche für Romandie-Kundschaft), (b) Produkte tatsächlich übersetzen (56 000 Produkte, grosser Aufwand), (c) so lassen. Empfehlung: so lassen, bis Übersetzungen existieren.
- Die Aussage «massive Duplicate-Content-Abstrafung» ist nicht belegt (Google kennt keine Strafe dafür); belegt ist nur, dass deutsche Inhalte doppelt unter `/fr/` im Index stehen. Wirkung der Änderung auf die Indexierung: **ungemessen**, nachmessen in 2 bis 4 Wochen (`inspect_urls` auf ein paar `/fr/`-Adressen, erwartet «Ausgeschlossen durch noindex-Tag»).
- Rücknahme: den Block `lx-audit-0711` in `layout/theme.liquid` löschen (oder `ZURUECK=1 LIVE=1 node dropship/audit-0711/apply_theme.mjs`, das stellt beide Dateien aus `sicherung/` wieder her).

## 2. FAQ-Satz in Sammlungen

- GEMESSEN: `https://luxestyle.ch/collections/blitzversand-schweiz` zeigte im FAQ-Kasten unter der Produktliste «Alles rund um 🇨🇭 Alles ab Schweizer Lager bei LuxeStyle – …». Ursache: der Block `lux_faq` in `templates/collection.json` setzt `{{ collection.title }}` in «Alles rund um … bei LuxeStyle» ein. Das gilt für **alle** Sammlungen (kein Generator-Fehler, sondern eine feste Vorlage); auffällig wird es nur, wo der Titel selbst mit «Alles» beginnt.
- **Korrektur (live):** der Satz heisst jetzt «Kuratierte Auswahl, faire Preise, Lieferdatum beim Artikel und in der Kasse – bei LuxeStyle.» (ohne Titel). Live gemessen: alter Satz weg, neuer da.
- Nicht angefasst: die Überschrift «Häufige Fragen zu {{ collection.title }}», die Antwort «meist 2–3 Werktage» (offener Entscheid des Besitzers seit 05.11.), und der Fakt, dass der FAQ-Kasten auf `/fr/` deutsch bleibt.

## 3. Handles mit Emoji

- GEMESSEN: das genannte Beispiel `🦃-black-friday-mega-deal-40-auf-premium-set` **gibt es nicht** (Admin-Suche nach «Black Friday»: 0 Produkte, Katalog 56 492 Produkte ohne Treffer, beide URL-Formen HTTP 404).
- GEMESSEN (Bulk-Abfrage 56 492 Produkte): **16** Produkte haben Zeichen ausser `a-z 0-9 -` im Handle, alle ACTIVE: 14 mit Emoji am Ende (Paar-Tassen, Paar-Shirts, Aroma-Diffuser, Wandlampe, Solarleuchte, Autoduft, Dusch-Organizer, Plüschleopard) und 2 mit ® (iPhone-Hüllen «Selbst gestalten»). Handles stehen in `handles_vor.json`.
- **Korrektur (live, 14 Produkte):** `productUpdate` mit `redirectNewHandle: true` (`apply_handles.mjs`). GEMESSEN danach: bei **14 von 14** antwortet die alte Adresse mit 301 auf die neue, die neue mit 200. Bei einem Produkt (`mr-mrs-partner-shirts-…`) existierte schon eine ältere Umleitung des alten Pfads auf `/collections/selbst-gestalten`; sie wurde auf die neue Produktadresse umgebogen (`urlRedirectUpdate`, Redirect-ID `1734872007041`).
- **Bewusst NICHT geändert:** die zwei ®-Handles (`hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten`, `transparente-iphone®-hulle-selbst-gestalten`). Editor- und Werkzeugdaten (`pod/editor-hintergruende.json`, `automation/lib/pod_auswahl_spec.mjs`, Ledger) adressieren sie nach Handle; eine Umbenennung ohne Nachziehen dieser Daten kann den Editor-Hintergrund still brechen. Mit `MIT_MARKEN=1` ginge es, dann zuerst diese Dateien anpassen. Die ®-Adressen funktionieren (Prozent-Kodierung), das Risiko beim Teilen ist klein.
- Nachgezogen: `automation/pod_couple_mockups.mjs` (8 Handles) auf die neuen Handles. `google-merchant-feed.xml` (im Repo) wird vom täglichen Feed-Job neu erzeugt.
- Rücknahme: `ZURUECK=1 LIVE=1 node dropship/audit-0711/apply_handles.mjs` (liest `handles_vor.json`; setzt die Emoji-Handles wieder ein, die Weiterleitungen drehen sich automatisch).

## 4. «Versand nur in der Schweiz»

- GEMESSEN: auf `plusch-hamster-18-cm-fga25780` steht im Kopf und im Fuss «Lieferung nur in die Schweiz & nach Liechtenstein» bzw. «Versand in die Schweiz und nach Liechtenstein»; **kein** «Versand nur in der Schweiz». Dasselbe auf den zwei Kleidungsseiten. Stichprobe 16 zufällige Fortura- und CJ-Produktseiten: **0** Treffer für «nur in der Schweiz» ohne Liechtenstein. Im Repo steht der Satz nur in `uhren-schmuck-kaufen-schweiz.html` (gehört nicht zum Shop).
- Urteil: für den Stand vom 07.11. nicht reproduzierbar. Falls die Prüfung ältere Texte sah (Hypothese), sind sie inzwischen weg.

## 5. TikTok-Links auf Produktseiten

- GEMESSEN: auf `damen-maxikleid-mit-print-619100` und `sandalen-fur-frauen-606100` kommt «TikTok» nur im TikTok-Pixel-Skript und in einem Kommentar vor, **kein** Link «Kuscheldecke Hasenfell-Imitat Tie-Dye» oder «Halterung für …». Der Abschnitt `luxe_videos` auf der Produktseite ist leer ausgegeben.
- Ursache der Beschreibung (Hypothese, gestützt durch den Code): `sections/luxe-videos.liquid` zeigte früher auf **jeder** Produktseite die shopweite Videoliste (Shop-Metafeld `luxe.videos`, 11 Einträge, darunter die zwei genannten TikTok-Videos). Seit dem 01.11. (Kommentar `lx-meister-0111` im Abschnitt) erscheint auf Produktseiten nur noch das Video, das zum Produkt gehört (`product.metafields.luxe.video_url`).
- Offen, klein: das Metafeld `luxe.videos` enthält weiter den Eintrag «Kuscheldecke Hasenfell-Imitat Tie-Dye» (das TikTok-Video, das der Besitzer am 04.11. entfernen lassen wollte). Er wird heute nirgends ausgegeben; beim nächsten Pflegelauf von `automation/videos_zeile.mjs` streichen.

## 6. Links in YouTube Shorts

- QUELLE: Google Help («Some Updates to Links on YouTube») und TechCrunch (10.08.2023): **seit dem 31.08.2023 sind Links in Shorts-Beschreibungen, Shorts-Kommentaren und im vertikalen Live-Feed nicht mehr klickbar.** Unsere sieben Shorts tragen in der Beschreibung die volle Adresse mit `https://…?utm_source=youtube…` (GEMESSEN an den zwei noch geplanten Shorts); das hilft nicht, die Plattform macht sie nicht klickbar.
- Die Beschreibung des bereits veröffentlichten Shorts (E7tx0nVBju8) liess sich von hier nicht lesen (YouTube liefert die Seite ohne Beschreibung). Ob die Prüfung etwas anderes meinte, ist wegen des abgebrochenen Satzes **unbekannt**.
- Ähnlich, aber durch die Plattform gewollt: Instagram- und Facebook-Texte («Link in Bio») und TikTok-Texte («Shop: luxestyle.ch/tt») sind keine klickbaren Links.
- Mögliche Wege (alle brauchen den Besitzer oder den PC-Claude im Browser, nicht von hier machbar): Kanal-Links in «Anpassen → Profil → Links» auf `luxestyle.ch/ig`-ähnliche Kurzlinks setzen; im Studio je Short ein «Verwandtes Video» (Langvideo) verknüpfen; Produkte über YouTube Shopping taggen (Voraussetzungen ungeprüft).

## Dateien und Tests

| Datei | Inhalt |
|---|---|
| `apply_theme.mjs` | Theme-Änderung 1 und 2 (Trockenlauf Vorgabe, `LIVE=1`, `ZURUECK=1`), liest zurück und vergleicht |
| `apply_theme_test.mjs` | 22 Prüfungen (Idempotenz, Fehlerfälle, 12 Liquid-Fälle mit LiquidJS: `LIQUIDJS=<…/liquidjs/dist/liquid.node.cjs.js>`, ohne die Bibliothek werden diese 12 übersprungen) |
| `apply_handles.mjs` | Handle-Bereinigung (Trockenlauf Vorgabe; braucht `KATALOG=<katalog.json aus automation/katalog_bulk.mjs>`) |
| `apply_handles_test.mjs` | 11 Prüfungen (Emoji, ®, Kollisionen, leere Handles) |
| `handles_vor.json` | Karte alt → neu der 14 umbenannten Produkte (für die Rücknahme) |
| `sicherung/` | `layout/theme.liquid` und `templates/collection.json` vor der Änderung (`.vor`) |

Die Tests laufen von Hand (`node dropship/audit-0711/apply_theme_test.mjs`, `apply_handles_test.mjs`), sie sind nicht in der CI verdrahtet.

## Lehren

1. Eine KI-Prüfung der Live-Seite nennt Beispiele, die es nicht (mehr) gibt (Black-Friday-Produkt, Hamster-Satz, TikTok-Links). Jeden Punkt mit eigener Messung gegenprüfen, dann nur das Belegte ändern; hier traf 3 von 6 Punkten zu, 2 nicht mehr, 1 ist Plattformregel.
2. Eine Handle-Umbenennung mit `redirectNewHandle` kann an einer bereits vorhandenen Weiterleitung für den alten Pfad scheitern (sie bleibt, zeigte hier auf eine Sammlung): nach dem Schreiben alle alten Adressen einzeln auf das Ziel prüfen.
3. `hreflang` kommt bei Shopify von der Plattform, nicht aus dem Theme; im Theme lassen sich nur `canonical` und `robots` steuern.
