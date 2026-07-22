# FORTURA AG — CH-Dropship-Lieferant (Onboarding 2026-07-22)

**Status: Vertrag unterschrieben + per Zoho (info@luxestyle.ch) an rpapini@fortura.ch gesendet. Passwort gesetzt.
Warten auf FTP-Feed-Zugang von Fortura.**

- Lieferant: FORTURA AG, Zunzgen BL, UID CHE-116.267.495. Sortiment: Spielzeug (BRUDER), Süsswaren, Geschenke, Party, Saisonales (~14k lagernd).
- Kundennr: 544341 (in /tmp/fortura_kundennr.txt, nicht im Repo).
- Vorteile vs. BigBuy/CJ: CH-Lager, DPD-Versand CHF 9.50, 1-2 Tage, täglicher Bestands-Feed → ghost-sale-sicher.
- Konditionen bis 31.12.2026: Setup CHF 200 (gutgeschrieben), Versand 9.50/Paket, Retoure Nichtgefallen 5.- + 20%,
  Kreditlimit 2000, netto 10 Tage. ⚠️ Logistikfee ab 2027 unbestimmt (Info Aug 2026, dann 20 Tage Sonderkündigungsrecht).
- Mail: info@luxestyle.ch läuft über ZOHO MAIL EU (mx.zoho.eu). Login: mail.zoho.eu.

## OFFEN
- [ ] FTP-Zugangsdaten von Fortura erhalten → in /tmp legen (nicht Repo), FORTURA_CSV setzen
- [ ] Ersten echten CSV-Feed laden → COLMAP in automation/fortura_import.mjs gegen echte Header verifizieren
- [ ] DRY=1 Testlauf, dann scharf. XML-Bestell-Anbindung (Opacc.ORDERS/DELVRY) für Auto-Fulfillment.

## TOOL
`automation/fortura_import.mjs` — Grundgerüst fertig (gegen Vertrags-Anlage-1-Spec): tracked+DENY+echte Menge,
Internet_VE-Bündel, DE-Titel, Bilder, cat_tags, Dubletten-/Bild-Wache, Preis = max(UVP, EK*2.2, EK+9.50+6).
