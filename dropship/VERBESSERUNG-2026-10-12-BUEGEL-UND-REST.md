# Bügeltransfer und Restliste — Stand 12.10.2026 (gemessen, Auftrag «fix du alles»)

## Bügeltransfer (`buegeltransfer-selbst-gestalten`)
- **Spiegeln: NICHT nötig, nicht geändert.** Der Anbieter misterdtf.ch (Startseite, heute abgerufen) schreibt:
  «Sie muss weder gespiegelt, noch sonst speziell bearbeitet werden.» Ein Spiegel-Umbau im Editor hätte den Druck verdreht.
- **Größe A4 aus dem Verkauf genommen:** Der Anbieter führt auf seiner Seite nur A3 und Meterware. Der A4-Einkauf war
  nicht belegt (Einkauf fehlte). Variante `TRANSFER-A4` (55784678621569) gelöscht. Gemessen vorher: 0 Bestellungen mit A4.
- Editor-Standardvariante auf `TRANSFER-A3` (55784678654337) umgestellt, nur dieses Attribut in der Produkt-HTML geändert.
  Gemessen nachher: 1 Variante, Option «Gross (A3, ~30×21 cm)». Der Größenwert verschwand mit der Variante.
  Ein separater Schritt zum Entfernen des Größenwerts wurde von der Berechtigungsprüfung abgelehnt; er war nicht nötig.
- Pflicht-Editor-QA `automation/pod_editor_qa.mjs`: 29 Editor-Produkte, 0 Befunde.
- **Anbieterpreise gemessen 12.10. (exkl. MwSt.):** A3 Premium Transfer Öko-Tex 100: 1 Bogen 12.90 · ab 5 11.90 ·
  ab 10 10.90 · ab 25 8.90 · ab 50 7.90. Versand 3–5 Werktage, Express +50 %.
  Verkauf A3 35.90 · Einkauf 12.90 + Versand 9.90 = 22.80 (Notiz 11.10.) → Gewinn nach Hausregel ≈ 12.8 CHF (gerechnet).
- Offen (Betreiber): Gewicht beider Varianten steht auf 0 kg (nicht gemessen, nicht geschätzt). Shopify-Erfüllung von #1024
  mit Sendungsnummer.

## Kristall-Set (`kristall-set-3-teilig`)
- Handle auf den Titel «Kristallspitzen-Set 8-teilig in Holzbox» gebracht: neuer Handle `kristallspitzen-set-8-teilig-holzbox`.
- Weiterleitung 301 `/products/kristall-set-3-teilig` → neuer Handle (gemessen: `urlRedirects`).
- SKU bleibt `LX-23-KRISTALL-SET-3-TEILIG`, weil Bestellung #1020 und die CJ-Zuordnung daran hängen.

## Tasche zum Selbstgestalten (`tote-zum-selbstgestalten`, DRAFT)
- Einkauf geschätzt: Printful ca. CHF 15.84 (USD 17.60, Umrechnung wie im Auftrag 1–8) + Versandangebot Printful 8.62
  (Angebot über `/shipping/rates`, kein Auftrag) = **24.46**. Gesetzt als Einkaufspreis.
- Verkaufspreis nach Hausregel `ziel_preis` (Gewinnziel 12): **37.90**, gesetzt. Produkt bleibt DRAFT.
  Aktivierung = Betreiber-Entscheid.

## Google-Kanal (Gewinn nicht betroffen, Shop bleibt)
- **Kinder Freizeitschuhe** (`kinder-freizeitschuhe-e3de89`): 15 Bilder, größtes 527 px, kein größeres beim Lieferanten.
  Aus dem Google-Kanal genommen. Im Shop bleibt es.
- **Herren Fleece Sport-Freizeitschuhe** (`herren-fleece-sport-freizeitschuhe-483776`): alle 10 Bilder 800×800, aber auf
  allen ist die Marke «AIB» auf dem Schuh zu sehen, dazu Fremdlogos und Fremdtext im Hintergrund (gesichtet als Kontaktbogen).
  Aus dem Google-Kanal genommen. Die Markenfrage (Markenware-Regel) ist offen.
- 429-Seiten von 12.10.: `keramik-futternapf-fur-katzen-erhoht-065024`, `herren-sommer-t-shirt-mit-reverskragen-606700`,
  `vintage-leder-halbschuhe-fur-madchen-337728` antworten jetzt alle **HTTP 200**. Die Google-Diagnose ist damit überholt.

## Sticker-Klasse (Preis) — Entscheid
- Schweiz- und Motiv-Sticker (EK 1.99–2.19, Verkauf 4.90–7.90) liegen unter dem Gewinnziel 9.90, sind aber nicht verlustbringend
  (Gewinn bei 4.90 nach Hausregel ≈ 8.7 CHF, gerechnet). Entscheid: **keine Massen-Anhebung**. Die Betreiber-Regel
  «nur verkaufte Varianten heben» (11.10.) bleibt; die Wache hebt sie, sobald sie verkauft werden.

## Nicht erledigt — braucht dich oder eine Freigabe
- **Liechtenstein-Theme-Stellen:** Theme-Schreibsperre. Liste mit wörtlichen Ersetzungen: `dropship/LI-THEME-PATCH-2026-10-12.md`.
- **Cookie-Banner über dem Editor (Handy):** Theme, gleiche Sperre.
- **Judge.me «⭐ Bestbewertet» im Suchfeld:** nur im Judge.me-Admin änderbar (Betreiber-Klick). Die Aussage ist unbelegt, bis Bewertungen da sind.
- **Stop-Hook** `/root/.claude/stop-hook-git-check.sh`: Freigabe nötig, Vorschlag in `dropship/STOP-HOOK-VORSCHLAG-2026-10-12.md`.
- **Google Ads «sirene-test» pausieren:** in dieser Session gibt es kein Google-Ads-Werkzeug (Betreiber-Klick).
- **Material-Auswahl:** nicht begonnen. Braucht je Material eine Printful-Vorlage, eigene Preise und einen Editor-Umbau.
- **Herren Fleece Marke «AIB»:** Markenfrage, siehe oben.
