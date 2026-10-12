# Bügeltransfer, Preis und Material — Stand 12.10.2026 (gemessen)

## 1. Bügeltransfer (`buegeltransfer-selbst-gestalten`, ACTIVE) — umgesetzt
- Editor-Mockup lag auf `abannews.com` (Fremd-Domain, HTTP 200, aber nicht unter unserer Kontrolle). Auf den Shopify-CDN
  kopiert (`buegeltransfer-blank-1024.jpg`, 1024², Rücklesen ok) und im Editor eingesetzt.
- Editor-Standardvariante stand auf der gelöschten A5-Variante. Jetzt auf TRANSFER-A4 (Rücklesen ok).
- SEO-Beschreibung «Gratis-Versand ab CHF 50» → «in der Schweiz» (Liechtenstein-Klasse).
- Editor-QA: 29 Editor-Produkte, 0 Befunde.
- **Offen (Betreiber):** TRANSFER-A4 hat **keinen Einkaufspreis** (Mister-DTF-Preisliste A4 fehlt im Repo), Marge unbekannt.
  Gewicht beider Varianten steht auf 0 kg (Versandtarif). A3: Einkauf 22.80 inkl. Versand (Shopify), Verkauf 35.90.

## 2. Preis — gemessen, NICHT geändert (Entscheid nötig)
Audit aller 1'340 aktiven POD-Varianten (Printful/Selbst-gestalten), Hausregel `preis_verlustschutz.boden` und
`verkauf_gewinn_wache.ziel_preis` (Gewinnziel CHF 12):
- Unter dem Boden: **0** (keine Verlustvariante).
- Unter dem Gewinnziel: **792** — vor allem die Schweiz-Sticker (Einkauf CHF 1.99–2.19, Verkauf 4.90–7.90, Ziel 9.90).
- Ohne Einkaufspreis: **478** Varianten — Marge unbekannt, nicht geschätzt.
- Die Wache hebt nur VERKAUFTE Varianten (Betreiber-Entscheid 11.10.). Eine Anhebung aller 792 ist eine Preisentscheidung
  mit Konversionsfolge und wurde deshalb nicht angewendet.
- **Entscheid:** (a) nur Sticker-Klasse auf das Ziel heben (ca. 30 Varianten), oder (b) alle 792 auf das Ziel, oder
  (c) unverändert. Mit Einkaufspreisen für die 478 fehlenden zuerst.

## 3. Material — gemessen: keine Auswahl vorhanden
- 477 aktive Selbst-gestalten-Produkte. Optionen: Grösse 468, Farbe nur 2 (Jutebeutel, Baumwolltasche), Motiv 4,
  Handymodell 1. **Keine einzige Material-Option.**
- Eine Material-Auswahl braucht je Material einen eigenen Printful-Blank mit eigener Vorlage und eigenen Varianten
  (wie bei der Farbe). Das ist ein eigener Umbau, nicht ein Schalter: Vorlagen je Material, Preis je Material, Einkauf je Material.
- Vorschlag Pilot: T-Shirt (Unisex), zwei Materialien. Braucht die Printful-Materialwahl (Katalog) und die Entscheidung,
  welche zwei Materialien angeboten werden. Nicht begonnen.
