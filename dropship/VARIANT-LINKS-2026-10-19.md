# VARIANT-LINKS 2026-10-19 — ?variant= aus den serverseitigen Produkt-Kartenlinks (Theme)

**STAND 19.10.2026 21:32 UTC: VORBEREITET UND GEPRÜFT, ABER NICHT ANGEWENDET.** Der Schreibvorgang ins Live-Theme (`themeFilesUpsert`, 5 Dateien) wurde vom
Berechtigungsprüfer der Sitzung abgelehnt («Modify Shared Resources»). Es wurde NICHTS geschrieben (gemessen 21:31: die vier Live-Dateien sind byte-gleich mit der Sicherung,
das Snippet existiert live nicht). Ich habe die Sperre nicht umgangen und keinen anderen Schreibweg versucht. Anwenden = ein Befehl (unten), sobald die Freigabe in dieser Sitzung steht.
Die Freigabe «Beides» (19.10. ~21:55 UTC) stammt aus dem Auftragstext des Workflows; ich konnte sie nicht selbst prüfen.

## Prüferbefund 19.10. ~22:00 UTC (mittel) — BEHOBEN 21:50 UTC, nachgemessen
**Befund:** Die Zielfassung kollidierte mit dem stündlichen Schreiber `automation/startseite_schlank_patch.py` (Baustein A3, `SCHARF=1` aus `fixer_keepalive.sh`). Nach dem Anwenden standen seine Anker (`INDEX_HREF`-Weiche, alter Kopfkommentar) nicht mehr im Text.
**GEMESSEN vorher (offline, HEAD-Fassung des Schlank-Patch gegen echte Live-Basis + `neu/` überlagert):** `SCHLANK: ⚠️ 5/12 Bausteine gesetzt · 3 Datei(en) offen · Anker fehlt: A3 …`, Exit 1; A3 je Datei `offen` + `anker_fehlt`; Kopfkommentar würde ein zweites Mal vorangestellt (Zähler 2). Folge wäre dauerhaft ⚠️ im Aufseher und in der Betreiber-Ampel gewesen (Fehlalarm «Theme-Update hat Bausteine überschrieben?»). Kein Kundenschaden. Der Prüfer hatte recht.
**Ursache:** zwei Schreiber, ein Ziel. Der Schlank-Patch kannte nur EINEN gültigen A3-Stand (Startseiten-Weiche).
**Behebung (Entwurf der Alternative: «A3 aus BAUSTEINE nehmen» verworfen, weil dann ein Horizon-Update den Startseiten-Stand nicht mehr zurückholt):**
- `startseite_schlank_patch.py` kennt jetzt ZWEI gültige A3-Stände (`ALTERNATIV`, aus den Ankern abgeleitet): (1) Startseiten-Stand, den NUR dieses Skript setzt; (2) Stand VARIANT-LINKS (Snippet), den NUR `anwenden.py` setzt. Beide = «gesetzt». Das Skript schreibt Stand (2) nie und überschreibt ihn nie — es ist bewusst KEIN Hintertürchen für diese Theme-Änderung (sie braucht ihre eigene Freigabe, und ein `render` ohne vorhandenes Snippet wäre ein Totalausfall der Karten). Rückweg-Hinweis bei `--zurueck A3` im Stand (2); Zeile trägt `(A3 im Stand lx-varlinks-2026-10-19, 3 Dateien)`.
- `anwenden.py` hat eine KOLLISIONSPRÜFUNG vor jedem Netzzugriff (auch im DRY-Lauf): Zielfassung gegen Schlank-Patch, sonst Exit 6 und nichts angewendet. Getestet: mit der alten HEAD-Fassung im Scratch-Baum Exit 6; mit der neuen Fassung «Kollisionsprüfung ok».
- `variant_links_wache.py` prüft zusätzlich, ob das Snippet existiert, sobald eine Datei es rendert (der Schlank-Patch kann das nicht erkennen). Fehlt es: ⚠️ «Snippet … FEHLT, wird aber von N Dateien gerendert». Die Zeile nennt immer «Snippet vorhanden/nicht vorhanden, von N Dateien gerendert» (ein totes Muster zeigte sonst still «0»).
**GEMESSEN nachher (19.10. 21:47–21:50 UTC):** Zielfassung über echte Live-Basis: `SCHLANK: 12/12 Bausteine gesetzt (A3 im Stand lx-varlinks-2026-10-19, 3 Dateien)`, Exit 0, nichts zu schreiben; Live-Ist-Stand weiter `12/12`, Exit 0; Schlank-Selbsttest `OK` (50 Fälle, vorher 34, darunter Stand VARIANT-LINKS je Datei, Mischstand, Mutation «ohne ALTERNATIV» scheitert, Kreuzprobe gegen die echten `neu/`-Dateien); Wächter-Selbsttest `OK (12 Fälle)`; `anwenden.py` DRY: Kollisionsprüfung ok, 4 Live-Dateien == Sicherung (21:49:27 UTC).
**Regel:** Zwei Schreiber auf derselben Theme-Datei brauchen vor dem Anwenden eine Kollisionsprüfung im Anwende-Skript («Schreiber B erkennt Stand A als gesetzt, findet nichts zu schreiben»), und wer einen Stand als «gesetzt» erkennt, braucht einen eigenen Wächter für dessen Abhängigkeiten (hier das Snippet). Ein stündlicher `SCHARF=1`-Schreiber darf nie einen Stand setzen, der eine eigene Freigabe braucht.

## Ehrliche Einordnung (zuerst)
- **Hygiene, Wirkung offen.** Der Mechanismus ist belegt (siehe Vorher), der Anteil an den GSC-«Alternative Seite»-16'328 ist es NICHT: 4 von 4 frisch geprüften Karten-Variantenlinks sind Google unbekannt.
  Es wird hier keine Wirkung auf diese Zahl versprochen. Nachmessen nach 4–8 Wochen (unten).
- Gewinn sicher: ein einheitliches Signal (Sitemap, hreflang, Canonical = saubere URL; interne Links jetzt auch) und kein Nachschub an Parameter-Dubletten durch Neu-Crawls.

## Vorher (GEMESSEN 19.10. 21:23–21:32 UTC, Admin-API = Quelle; Seiten per curl mit Googlebot-Kennung = Bot-Cache-Kopie, Seiteninhalt daher nur Richtwert)
| Seite | Produktlinks | davon `?variant=` |
|---|---|---|
| /collections/holzuhren | 76 | 72 (28 verschiedene Produkte) |
| /collections/abendkleider (Optionsfilter Grösse/Farbe vorhanden) | 76 | 72 |
| /collections/damenmode-favoriten | 40 | 36 |
| /fr/collections/holzuhren | 76 | 72 |
| /collections/abendkleider?filter.v.option.grösse=M | 76 | 72, **andere Variante** als ungefiltert (…582663 statt …549895) → Filter wählt bewusst vor |
| /search?q=uhr | 70 | 66 (plus Shopify-Tracking `&_pos=…&_sid=…&_ss=r`) |
| Startseite | 364 | 0 (seit 14.10. «lx-schlank A3») |
| Produktseite holz-uhr…665010 | 5 | 1 = der Selbstlink `.view-product-title` (Canonical ist sauber) |
`robots.txt` sperrt `/search` und Filter-Einzelparameter NICHT (nur sort_by, `+`, doppelte Filter) → Suche und Filterseiten sind crawlbar.
WebFetch lieferte beim Messen HTTP 429 (zweimal) → öffentliches «Nachher» per WebFetch steht aus.

## Fundstellen im Live-Theme (frisch geholt, 428 Textdateien; `grep`/Wächter)
| Datei:Zeile | Inhalt | Behandlung |
|---|---|---|
| snippets/product-card.liquid:76 | `variant_to_link.url` (nur Startseite sauber) | → Snippet |
| snippets/card-gallery.liquid:191, :208 | `product.selected_or_first_available_variant.url` | → Snippet |
| blocks/product-title.liquid:13 | dito (`closest.product`) | → Snippet |
| blocks/_product-details.liquid:20 | Selbstlink der Produktseite (`.view-product-title`) | → Snippet (siehe Risiko 1) |
| sections/section-rendering-product-card.liquid:22–24 | `…variant.url` | **bewusst unverändert** |
Nicht gefunden (geprüft): predictive-search, search-results, recently-viewed, product-recommendations, cart-drawer-Empfehlungen bauen keine eigene Variantenlinks — sie rendern `product-card`
bzw. `resource.url`/`item.url`. `within: collection`: 0 Treffer im Theme. Warenkorbzeilen (`item.url`) tragen die Variante gewollt (Warenkorb ist Disallow).

## JS-Analyse (Code gelesen, vor dem Ändern)
- `product-card.js`: `productPageUrl` = Wert des Kartenlinks → Vorladen fürs Quick-Add. Ohne `?variant=` lädt es die Produktseite; `selected_or_first_available_variant` dort ist dieselbe erste lieferbare Variante wie vorher in der Karte → identisch.
- `quick-add.js` (`productPageUrl`): hat der Link kein `variant`, hängt es die in der Karte angehakte Swatch-Variante an (`input[type=radio]:checked[data-variant-id]`), sonst nichts. Unverändert wirksam.
- Swatch auf der Karte: `#handleCardVariantUrlUpdate` setzt `variant` per `searchParams.set` auf den Link, `#updateProductUrl` übernimmt den Link aus der Antwort der Section-Rendering-API.
  Die Antwort kommt aus `sections/section-rendering-product-card.liquid` (Anfrage mit `option_values=…`, `variant-picker.js` `buildRequestUrl`). **Genau diese Datei muss die Variante weiter tragen** → bewusst NICHT geändert. Sie steht nie im Seiten-HTML (nur per JS abgerufen).
- `variant-picker.js` setzt `?variant=` nur in der Browser-Adresszeile der Produktseite (`history.replaceState`), nicht in Kartenlinks. `facets.js`, `recently-viewed-products.js`, `product-recommendations.js`, `predictive-search.js`: lesen keinen Karten-href-Parameter.
- Kartenbild je Variante / Hover-Bildwechsel / View-Transition: hängen an `variant_to_link.featured_image` bzw. `selected_or_first_available_variant.featured_media` — diese Zuweisungen bleiben unberührt (nur der href ändert sich).

## Lösung: EINE Quelle `snippets/lx-karten-href.liquid`
```
assign lx_href = product.url
if product.selected_variant and template.name != 'index'
  if template.name == 'search'  → Variante NUR bei aktivem Filter (active_values oder Preisgrenze), sonst product.url
  else                          → product.selected_variant.url
```
`product.selected_variant` ist nur bei bewusster Auswahl gesetzt (Filter auf Variantenoptionen, Produktseite mit `?variant=`); `selected_or_first_available_variant` (der alte Ausdruck) ist IMMER gesetzt — daher kam das `?variant=` an jeder Karte.
Zustände: Startseite / Standard-Kollektion / ungefilterte Suche / Produktseite ohne Parameter → `product.url`. Gefilterte Kollektion, gefilterte Suche, Produktseite mit `?variant=` → Variante bleibt (Nutzerverhalten wie bisher).
Je Aufrufer eine Zeile: `href="{% render 'lx-karten-href', product: product %}"` (`closest.product` im Block); dazu die Kopfzeile (Kommentar) der drei Dateien mit dem A3-Hinweis.
**Offline getestet (GEMESSEN 19.10. ~21:30, `ruby automation/variant_links_liquid_test.rb`, Ruby-Gem liquid 5.14, strikter Parser):** 11 Fälle + Mutationsprüfung ok (Startseite, Kollektion ohne/mit Auswahl, Suche ohne/mit Filter/mit Preisfilter, Produktseite ohne/mit Parameter, Platzhalter).
Shopify prüft die Syntax zusätzlich beim Schreiben (Liquid-Fehler → `userErrors`, nichts wird geschrieben).

## Risiken (offen, nach dem Anwenden zu prüfen)
1. **Quick-Add-Modal, Link «Details»** (`_product-details.liquid`): nach einer Variantenwahl im Modal kommt der Link aus einer Antwort mit `option_values=…`. Ist dort `product.selected_variant` NICHT gesetzt, zeigt der Link auf die Produkt-URL statt auf die gewählte Variante.
   Test nach dem Anwenden: `curl -s "https://luxestyle.ch/products/<handle>?option_values=<optionswert-id>" | grep -A2 view-product-title` → soll `?variant=` tragen. Trägt er keins → nur diese Datei aus der Sicherung zurück (`blocks/_product-details.liquid`), die vier anderen bleiben.
2. **Suche:** Shopify hängt an `product.url` im Suchkontext selbst `?_pos=…&_sid=…&_ss=r` an; das lässt sich im Theme nicht entfernen. Das Ziel «kein ?variant=» wird erreicht, nicht «kein Parameter».
3. **Edge-Cache / Bot-Cache:** unsere IP bekommt eine Cache-Kopie; ein «Nachher» von dort beweist nichts. Wahrheit = Admin-API (`variant_links_wache.py`), öffentlich = WebFetch/Fremd-IP, mit Änderungs- und Messzeit.

## Wächter und Sicherung
- `automation/variant_links_wache.py` (lesend; `--selbsttest` 8 Fälle inkl. Positiv-Kanarienvogel auf Live-Daten und Mutationsprüfung; unbekannter Schalter = Exit 2; Fehler/Kanarienvogel fehlt = «unklar»). Zeile im Aufseher (`engine_keepalive.sh`, nach THEME-KANARIEN, `bash -n` ok).
  **Heute (Patch nicht angewendet) meldet die Zeile ehrlich ⚠️ «5 Theme-Stellen … in 4 Dateien»** (gemessen 21:30 live). Offline mit den gepatchten Dateien überlagert: `VARIANT-LINKS: 0 … (263 Theme-Dateien gelesen, Kanarienvogel ok)`; seit der Nachbesserung zusätzlich `…; Snippet lx-karten-href vorhanden, von 4 Dateien gerendert` (ohne Snippet: ⚠️ FEHLT).
  Erlaubt ist nur `sections/section-rendering-product-card.liquid` (zugleich Kanarienvogel); sonst zählt ein Treffer nur mit Bedingung auf `selected_variant` in den 600 Zeichen davor.
- Sicherung (Live-Originale, md5 = API-Prüfsumme): `dropship/_theme_backup_variantlinks_2026-10-19/` (`snippets/product-card.liquid`, `snippets/card-gallery.liquid`, `blocks/product-title.liquid`, `blocks/_product-details.liquid`, dazu `sections/section-rendering-product-card.liquid` zur Ansicht).
  Fertige Zielfassung: `…/neu/`.

## Anwenden und Rückweg
```
python3 dropship/_theme_backup_variantlinks_2026-10-19/anwenden.py            # DRY: Live == Sicherung?
python3 dropship/_theme_backup_variantlinks_2026-10-19/anwenden.py --scharf   # Snippet zuerst, dann 4 Aufrufer, je Datei Rücklesen byte-genau
python3 automation/variant_links_wache.py --liste                              # Soll: «VARIANT-LINKS: 0 … Snippet lx-karten-href vorhanden, von 4 Dateien gerendert»
python3 automation/startseite_schlank_patch.py                                 # Soll: «SCHLANK: 12/12 Bausteine gesetzt (A3 im Stand lx-varlinks-2026-10-19, 3 Dateien)» (DRY, ohne SCHARF)
python3 dropship/_theme_backup_variantlinks_2026-10-19/rueckweg.py --scharf   # RÜCKWEG: Originale zurück, danach Snippet löschen
```
`anwenden.py` bricht vorab mit Exit 6 ab, wenn die Zielfassung mit dem Schlank-Patch kollidiert (offline, vor jedem Netzzugriff). Nach dem Rückweg (`rueckweg.py`) bleibt `SCHLANK` auf 12/12 (die Originale sind der Startseiten-Stand).
Ablauf-Hinweis: direkt nach dem Schreiben liefert das Rücklesen kurz noch die alte Datei (Lehre 23.09.) — `anwenden.py` wartet bis zu 24 s je Datei.
Erfolgs-/Abbruchkriterien nach dem Anwenden: Liquid-Fehler, Seite 500 oder Karte ohne Link → sofort `rueckweg.py --scharf`.

## Nachmessen (4–8 Wochen nach dem Anwenden)
1. GSC → Seitenindexierung → «Alternative Seite mit richtigem Canonical-Tag»: Zähler vorher 16'328 (19.10.) — Verlauf und Stichprobe der URLs mit `?variant=` (kommen weiter welche NEU dazu?).
2. `variant_links_wache.py` bleibt 0 (stündlich im Aufseher).
3. Stichprobe 6 URLs (holzuhren, abendkleider, damenmode-favoriten, /fr/…, /search?q=uhr, eine Produktseite): Anteil `?variant=` im Seiten-HTML soll 0 (ungefiltert) sein — mit Fremd-IP/WebFetch, nicht von unserer IP.
4. Kaufweg: Quick-Add auf einer Kollektionskarte öffnen, Variante wählen, in den Warenkorb (Betreiber/Handy-Test) — nach dem Anwenden einmal von Hand.
