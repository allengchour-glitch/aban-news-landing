# Theme-Entwurf 26.10.2026 — Ähnliche Produkte mehr anzeigen + Video-Zeile

Stand: 26.10.2026. Ziel: der **unveröffentlichte** Entwurf «Horizon · LuxeStyle Premium (Entwurf 25.10. b)»,
Theme-ID `212498841991` (Rolle UNPUBLISHED). Das live Theme (`187533001089`, Rolle MAIN) wurde nicht angefasst,
nichts wurde veröffentlicht, im Shop wurde nichts geschrieben (das Metafeld `luxe.videos` gibt es im Shop bis heute nicht).

Diese Ordner spiegeln die Theme-Struktur: jede Datei hier liegt unter demselben Pfad im Entwurf (gemessen: byte-gleich).

## Was geändert wurde

| Datei | Neu/geändert | Inhalt |
|---|---|---|
| `sections/product-recommendations.liquid` | geändert | Knopf «Mehr aus [Kategorie] ansehen» unter dem Raster; vier neue Einstellungen (Schalter, Beschriftung, Ausschlussliste, Mindestzahl) |
| `templates/product.json` | geändert | Empfehlungen: `max_products` 4 → **10**, `columns` 4 → **5** (Handy bleibt 2); Knopf-Einstellungen; neuer Abschnitt `luxe_videos` nach den Empfehlungen |
| `templates/index.json` | geändert, **eine Zeile** | Video-Zeile als Snippet-Aufruf am Anfang des letzten Abschnitts `trust_advantages` (siehe «Grenze 25 Abschnitte») |
| `sections/luxe-videos.liquid` | neu | Abschnitt «LuxeStyle Videos» (Einstellungen «Überschrift», «Maximale Anzahl» 4 bis 12) |
| `snippets/luxe-videos-zeile.liquid` | neu | Zeile mit scroll-snap, 9:16, 4 Karten sichtbar (Desktop) / 1,3 (Handy), Pfeile nur mit Maus |
| `snippets/luxe-video-karte.liquid` | neu | eine Karte: Link (neuer Tab, `noopener`), Vorschaubild lazy mit width/height, Abspiel-Symbol, Plattform-Beschriftung |

Ausserhalb des Themes: `automation/videos_zeile.mjs`, `automation/lib/videos_zeile.mjs` (+ `_test.mjs`, 100 Fälle,
15 von 15 Mutationen erkannt), `data/luxe-videos-quellen.json`, ein Schritt-Eintrag in
`.github/workflows/luxestyle-automation-tests.yml`.

### Knopf «Mehr aus [Kategorie] ansehen»
Zielsammlung = unter den Sammlungen des Produkts (`product.collections`) die mit der **kleinsten** Produktzahl, die
mindestens 15 Produkte hat und deren Handle nicht in `frontpage, all, alle-produkte, neu-eingetroffen, sale, unter-chf-25`
steht. Gibt es keine, erscheint kein Knopf. Die Ausschlussliste und die Mindestzahl stehen als Einstellungen im Abschnitt
(Theme-Editor), müssen also nicht im Code geändert werden. Emojis im Sammlungstitel («🔥 Gerade im Trend») fallen in
der Beschriftung weg.
Beobachtung: bei gleich grossen Sammlungen gewinnt die erste in Shopifys Reihenfolge; ein Abendkleid landet bei
«Highlights – Schmuck & Mode» (26 Produkte), weil `abend-look` (8) und `damenmode-favoriten` (12) unter 15 liegen und
«Highlights» kleiner ist als «Abendkleider & Cocktailkleider» (117). Will der Besitzer das nicht, trägt er `highlights`
in die Ausschlussliste ein.

### Video-Zeile
- Daten: Shop-Metafeld `luxe.videos` (Typ json), Liste von `{plattform, titel, url, vorschau}`, neueste zuerst.
- Produktseite: hat das Produkt das Metafeld `luxe.video_url` (Typ url), steht dieses Video zuerst (Titel/Vorschau aus
  der Liste, wenn dieselbe Adresse dort steht; sonst «Video zu diesem Artikel», bei YouTube Vorschau aus der ID).
- **Leer = nichts:** ist das Metafeld leer, gibt der Abschnitt nichts aus, auch kein CSS. Einzig Shopifys leerer
  Wrapper `<section class="shopify-section section-luxe-videos"></section>` bleibt (Höhe 0).
- Sicherheit: kein iframe, keine externen Skripte; nur https und nur TikTok-/YouTube-Hosts (im Theme **und** im Werkzeug,
  dieselbe Regel); die Plattform folgt aus der Adresse, nicht aus dem Feld; alle Texte werden escaped.

## Aktualisieren der Video-Liste

1. `data/luxe-videos-quellen.json` füllen: `"tiktok"`: Video-Adressen (`https://www.tiktok.com/@luxestyle.ch/video/<Nummer>`),
   `"youtube"`: Kanal-IDs (`UC…`, 24 Zeichen; die neuesten 6 Videos kommen automatisch) oder einzelne Video-Adressen.
   **Die konkreten Adressen fehlen noch** (Stand 26.10.2026), die Listen sind leer.
2. Trockenlauf: `/opt/node22/bin/node automation/videos_zeile.mjs` (Vorgabe, braucht keine Zugangsdaten, schreibt nichts).
3. Schreiben: `LIVE=1 /opt/node22/bin/node automation/videos_zeile.mjs`. Der Lauf schreibt nur, wenn die Liste gültig und
   nicht leer ist und höchstens die Hälfte der Quellen ausfiel (`LEER=1` / `TROTZDEM=1` heben die beiden Sperren auf, die
   Gültigkeitsprüfung nie), und liest das Metafeld danach frisch nach. **Der Schreibweg (LIVE=1) ist nicht ausgeführt
   worden**; die GraphQL-Dokumente stimmen mit dem Admin-Schema überein (`MetafieldsSetInput`, `userErrors`, per
   Schema-Abfrage nur lesend geprüft). Ob die App das Schreibrecht für Shop-Metafelder hat, zeigt erst der erste Lauf.

Bekannte Eigenheiten der Quellen (am 26.10.2026 gemessen):
- **TikTok-oEmbed** lieferte für das geprüfte öffentliche Beispielvideo **weder Titel noch `thumbnail_url`**. Dann zeigt die
  Karte den dunklen Platzhalter mit dem Titel «TikTok-Video von LuxeStyle». Ob die Videos von @luxestyle.ch ein Vorschaubild
  liefern, klärt der erste echte Trockenlauf; `vorschau` lässt sich zur Not von Hand in die Liste setzen.
- Der **YouTube-RSS-Feed** antwortete für dieselbe Kanal-ID abwechselnd mit 200, 404 und 500. Das Werkzeug fasst darum bei
  404/429/5xx bis zu viermal nach; ein dauerhaft fehlender Feed wird im Bericht genannt, der Rest läuft weiter.
- **@Handle-Adressen** von YouTube lassen sich nicht in eine Kanal-ID auflösen und werden abgelehnt (Kanal-ID verwenden).

## Grenze: 25 Abschnitte in `templates/index.json`

Die Startseite hat bereits 25 Abschnitte, das Shopify-Maximum (der Upload eines 26. wurde mit «sections: must have a maximum
of 25» abgelehnt). Darum steht die Video-Zeile dort als Snippet-Aufruf ganz am Anfang von `custom_liquid` im letzten
Abschnitt `trust_advantages` (über den Vertrauenskarten, nach allen Produktlisten). Auf der Startseite ist die Zeile damit nicht im
Theme-Editor einstellbar (Überschrift «Videos», Maximum 8, im Aufruf). Wird irgendwo ein Abschnitt frei, kann man den
Abschnitt «LuxeStyle Videos» im Editor einfügen und den Aufruf aus `custom_liquid` löschen.

## Zurücknehmen

- **Ganz:** den Entwurf nicht veröffentlichen. Das live Theme ist unverändert.
- **Nur Knopf:** im Abschnitt «Ähnliche Produkte» «Knopf zur Sammlung zeigen» ausschalten; Anzahl 4 und Spalten 4 wieder einstellen.
- **Nur Video-Zeile:** in `templates/product.json` den Abschnitt `luxe_videos` samt Eintrag in `order` löschen; in
  `templates/index.json` die Anfangszeile `{%- comment -%} 26.10.2026: Video-Zeile … {%- render 'luxe-videos-zeile', … -%}`
  aus `custom_liquid` von `trust_advantages` löschen. Die drei neuen Dateien können liegen bleiben oder gelöscht werden.

## Was der Besitzer noch tun muss

1. **Entwurf veröffentlichen** (Klick im Admin: Onlineshop → Themes → «Horizon · LuxeStyle Premium (Entwurf 25.10. b)» →
   Veröffentlichen; Rückfall = `187533001089`). Nicht Teil dieser Arbeit.
2. **Video-Adressen** in `data/luxe-videos-quellen.json` eintragen und den Lauf starten (siehe oben).
3. Optional pro Produkt das Metafeld `luxe.video_url` setzen (Admin → Produkt → Metafelder, Typ URL).

## Messwerte (26.10.2026, Entwurf, Chromium, je Seite neuer Browser-Kontext)

- Empfehlungen: 10 Karten bei 3 von 3 Produkten (Halloween-Schaukelgeist, Abendkleid «Sirène», Tasse «Alphorn»), 5 Spalten
  Desktop 1440 / 2 Spalten Mobil 390; der Knopf zeigte auf `halloween` / `highlights` / `schweiz-edition` (jeweils HTTP 200)
  und deckt sich mit der Berechnung aus der Admin-API; keine eigenen Konsolenfehler.
- Video-Zeile mit dem echten Liquid von Shopify und Testdaten (temporärer Testabschnitt, danach aus dem Entwurf gelöscht):
  Fremd-Adresse, `javascript:`, Dublette und Präfix-Falle richtig behandelt, HTML im Titel escaped, 9:16 (Verhältnis 1,778),
  4 Karten sichtbar Desktop, 1,3 Mobil, Pfeil blättert, leere Liste und nur ungültige Einträge geben nichts aus.
- Leeres Metafeld: Server-HTML von Startseite und Produktseite unverändert (Unterschied = nur der leere Wrapper),
  Seitenhöhen vorher/nachher gleich (Start 11743 / 10812 px, Produkt 3097 / 3524 px, Desktop / Mobil, ohne geladene Empfehlungen).
