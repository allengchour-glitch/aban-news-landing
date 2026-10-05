# Französisch (Plan Punkt 10) — Stand 05.10.2026, 05:20–06:40 UTC

Betreiber 03.10.: «Französisch ja». Auftrag: fr-Übersetzung messen, Lücken selbst schliessen (kein bezahltes
KI-Modell), veröffentlichen nur wenn Menü + Policies + Top-58 + Hauptkollektionen vollständig und Stichprobe fehlerfrei.

## Vorher (gemessen 05:20 UTC, Admin-GraphQL)
| Bereich | Messung |
|---|---|
| `shopLocales` | de primär · **fr published:true** · en/it published:false |
| WebPresence luxestyle.ch (`gid://shopify/MarketWebPresence/70968934785`) | alternateLocales = **en, it** — fr fehlt → `/fr/` nicht erreichbar |
| MENU / LINK | 17/18 bzw. 181/186 Felder fr (fehlend: «Basteln & DIY», Orders, Profile, Adventskalender 🎄, Malen nach Zahlen, Diamond Painting) |
| SHOP_POLICY | 6/6 fr, **AGB `outdated`** (DE am 05.10. geändert), **Versand-Policy 18 «tu»-Formen / 0 «vous»** |
| Top-Produktseiten (ShopifyQL, Landeseiten 90 T, 200 Zeilen → 158 ACTIVE) | Top-58: **35 mit ≥ 3 fr-Keys, 22 mit 0, 1 mit 2**; 6 davon POD (nie anfassen) |
| Kollektionen gesamt 533 | **10 mit fr-Titel**, 523 ohne; Menü-Kollektionen 143 gefunden (2 Emoji-Handles nicht auflösbar), **141 ohne fr** |
| Theme (ONLINE_STORE_THEME / LOCALE_CONTENT) | 4'519 / 4'431 Felder, fr 4'609 / 4'599 — vollständig |
| PRODUCT_OPTION | 3'000 Felder, **fr 0** (Farbe/Grösse überall deutsch) |
| PAGE | 222 Seiten, **0 mit fr-body** |
| Interne `/en/`- oder `/it/`-Links | Menü 0/186, Seiten 0/222, Startseiten-Quelltext 0 hreflang, Live-Theme 435 Dateien: 20 Treffer = alle `help.shopify.com/en/…` in `locales/*.schema.json` (extern) → 0 interne |

## Getan (alle Texte von Hand, Bündel ≤ 10 Mutationen, live zurückgelesen)
Ledger **`dropship/_fr_uebersetzung_2026-10-05.jsonl`** (745 Zeilen, je `resourceId/key/alt/neu/digest`; umkehrbar über `translationsRemove`).

| Was | Felder | Ressourcen |
|---|---|---|
| Menü-/Link-Titel | 6 | 1 Menu + 5 Links |
| Versand-Policy fr neu («vous», aus aktuellem DE) + AGB fr neu (Stand 5. Oktober 2026, §7 CH-Rückgabe) | 2 | 2 ShopPolicy — zurückgelesen: 0 tu-Formen, `outdated:false` |
| Optionsnamen der Top-58 (Farbe→Couleur, Grösse→Taille, Stein-Stil, Ringgrösse, Edition, Variante) | 72 | 72 ProductOption |
| Produkte Top-58 ohne fr: Titel, body_html, product_type, meta_title/meta_description | 96 + 5 | 22 + 1 (`kristall-set-3-teilig`: alte fr beschrieb 3 Steine, DE sagt seit 04.10. 8 Spitzen → neu) |
| Menü-Kollektionen: title, meta_title, meta_description, body_html | 564 | 141 Collections |

Regeln dabei: Bausteine (Lieferzeit-Box, «Sorglos shoppen», Produktdetails, Ratgeber-Box) gespiegelt; interne Links in
fr-Texten mit `/fr/`-Präfix; Meta-Texte sagen «livraison 10–20 jours ouvrables» statt der im DE-Meta teils noch stehenden
«7–14 Tage»; «hypoallergen» aus Metas nicht übernommen (steht nicht im Produkttext); DE «Gratis Versand ab CHF 45»
(babykleidung, baby-kinder-sets, strampler-bodys) im FR als CHF 50 geschrieben (Versprechen-Regel 02.10.);
«Ultraschall Anti-Bell-Gerät» aus kleine-geschenke-Text nicht übernommen (TSchV-Klasse, gedraftet).
Tag-Bilanz DE↔FR je body_html geprüft (0 Abweichungen), 0 ß, 0 Deutsch-Reste (Wortliste über 740 Werte).

**6 POD-Produkte unter den Top-58 ausgelassen** (Hausregel Editor/POD nie anfassen): shirt-zum-selbstgestalten,
pod-sticker-surfboard, shirt-1-august, tasse-1-august, schweiz-magnet-fondue, shirt-eidgenoss → ersetzt durch die
nächsten 6 aktiven Nicht-POD-Landeseiten (oversized-sonnenbrille…, reise-hangematte…, herren-sommerhemd-monsieur…,
elegantes-sommerkleid-a-linie…, herren-strickshirt-riviera…, wide-leg-hose-largo…).

## Nachher (gemessen 06:35 UTC)
- MENU 18/18, LINK 186/186, SHOP_POLICY 6/6, outdated 0.
- Top-58 (ohne POD): **58/58 mit ≥ 3 fr-Keys, 0 outdated** (`automation/fr_stand.py`).
- Menü-Kollektionen **143/143 vollständig** (title, body_html, meta_title, meta_description).
- Stichprobe 5 live zurückgelesen (Montre «Executive», Robe ligne A, Mode femme, Calendriers de l'Avent, Versand-Policy): Inhalt deckt sich mit DE, HTML intakt, `outdated:false`.
- **NICHT veröffentlicht:** `webPresenceUpdate` (alternateLocales → [fr]) wurde vom Auto-Modus-Prüfer als
  «Production Deploy» abgelehnt. WebPresence luxestyle.ch steht weiter auf [en, it]; `/fr/` liefert bis dahin 404
  (curl aus dem Container: 429, Rate-Limit — WebFetch erst nach Veröffentlichung sinnvoll).

## Offen
1. **Veröffentlichen** (Hauptlauf mit Freigabe oder Betreiber): `webPresenceUpdate(id:"gid://shopify/MarketWebPresence/70968934785", input:{alternateLocales:["fr"]})` — en/it raus ist geprüft (0 interne Links). Danach `WebFetch https://luxestyle.ch/fr/` (HTTP 200, französisches Menü) und `python3 automation/fr_stand.py` → «/fr live».
   Betreiber-Klickweg: Shopify Admin → Einstellungen → Märkte → Schweiz → Domains und Sprachen → Französisch hinzufügen, Englisch/Italienisch entfernen.
2. 222 Seiten (Über uns, Kontakt, FAQ, Ratgeber-Seiten) ohne fr — Fusszeile führt auf deutsche Seiten. Reihenfolge: Kontakt, Über uns, FAQ, Grössentabelle, Firmen & Vereine.
3. PRODUCT_OPTION-Namen ausserhalb der Top-58 (≈ 2'900) und Optionswerte (Schwarz/Weiss …) überall deutsch.
4. 390 Kollektionen ausserhalb des Menüs ohne fr; Produkte ausserhalb der Top-58 ohne fr (`translate_content.mjs` braucht Gemini — Kontingent leer).
5. DE-Texte mit «Gratis Versand ab CHF 45» (babykleidung, baby-kinder-sets, strampler-bodys) widersprechen dem Versprechen CHF 50 — DE-Seite korrigieren (nicht mein Bereich, nur gemessen).
6. DE-Metas mit «schnelle Lieferung (7–14 Tage)» (herrenuhr-executive, aroma-diffuser-mist, herren-strickshirt-riviera) widersprechen 10–20 WT.
7. 2 Menü-Kollektionen mit Emoji-Handle (`%F0%9F%8E%81-geschenke-bis-chf-30`, `%F0%9F%92%8E-premium-ab-chf-80`) über `collectionByIdentifier` nicht auflösbar → fr-Stand ungemessen.

## Werkzeuge
- `automation/fr_stand.py` — Ampel-Zeile «FR: …» (fehlend/veraltet Menü-Links-Policies, Top-58 < 3 Keys oder outdated, Menü-Kollektionen, /fr live?). Nur lesen, ~40 Anfragen.
- Scratch: `scratchpad/fr/register.py` (Bündel-Registrierer mit Ledger), `prod_fr.py`, `coll_fr_1.py`, `coll_fr_2.py`, `neu_versand_fr.html`, `neu_agb_fr.html`.
