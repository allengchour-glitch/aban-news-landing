# Codex R158 «SEO-Vorschau»: eine Datei ins MAIN-Theme (09.11.2026)

**Auslegung (meine, nicht bestätigt):** Codex' Vorschau-Theme `213619179911` («LuxeStyle – R158 SEO Preview 09.11.2026», UNPUBLISHED) enthält eine nützliche Änderung; Besitzer-Antwort auf meine gezielte Frage: «mach was du willst einfach das beste draus machen und immer live».

## Was geändert wurde (LIVE, nur `snippets/meta-tags.liquid` im MAIN-Theme `213013037447`)
1. **Startseite auf `/fr`:** `og:description` und Meta-Beschreibung französisch statt deutsch («LuxeStyle : mode, beauté, technologie et maison. Livraison en Suisse et au Liechtenstein. Livraison gratuite dès CHF 50.»). Deutsch bleibt Wort für Wort gleich.
2. **`og:image`:** `http:` → `https:` (Seitenbild und Logo).

## Warum nicht die Vorschau veröffentlichen
MAIN hat sich seit Codex' Kopie geändert (`templates/product.json`, 09.11. 23:19 UTC). Ein Veröffentlichen der Vorschau hätte diese Änderung zurückgesetzt. Gemessen (Admin-API, 09.11.): die Vorschau weicht von MAIN nur in `meta-tags.liquid` ab (und in `product.json` wegen der späteren MAIN-Änderung). Darum nur diese eine Datei.

## Ablauf und Messung
- `apply.mjs`: Trockenlauf ist Vorgabe, `LIVE=1` schreibt. Vorbedingungen: MAIN ist MAIN, Vorschau ist UNPUBLISHED, Prüfsumme der gelesenen Datei passt zum Inhalt, MAIN-Datei hat genau den von Codex kopierten Stand (md5 `c7e3f660…`), Vorschau-Datei den geprüften (`5272479d…`); vor dem Schreiben nochmals lesen (Lese-Schreib-Fenster), danach bis zu 8 × 4 s zurücklesen.
- **Live 09.11. (Sicherung 23:22 UTC):** Rücklesen 1: md5 `5272479d3e09c18aa461e78f465c7c0b` = Soll. Sicherung `sicherung/meta-tags.liquid.vor` (md5 `c7e3f660…`).
- **Storefront (curl mit Browser-Kopf, je ein Aufruf, 7 s Pause, 23:2x UTC):** `/` HTTP 200, `og:description` deutsch unverändert; `/fr` HTTP 200, `og:description` und `description` französisch; Produktseite HTTP 200; `og:image` überall `https`, 0 `http:`-Inhalte in den Meta-Tags; 0 Liquid-Fehler auf allen drei Seiten.
- **Rücknahme:** `ZURUECK=1 LIVE=1 node dropship/codex-r158-meta-0911/apply.mjs` (Trockenlauf der Rücknahme gefahren: Sicherung hat den erwarteten Stand, MAIN steht auf dem Soll).

## Grenzen
- Wirkung auf Google (Snippets `/fr`) **unbekannt**; `/fr` trägt für Produkt, Sammlung und Blog `noindex`, die Startseite nicht.
- Auf jeder Seite stehen zwei `og:image`-Tags (eines aus diesem Snippet, eines mit dem Logo aus einer anderen Quelle): vorbestehend, nicht angefasst.
- Codex' weitere Berichte (R159 bis R161: Ranking, SEO-CJ-Grind, Webcams, Menü-IA) sind Behauptungen und vor dem Anwenden am Live-Stand nachzumessen; hier nicht eingespielt.
