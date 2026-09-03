# Schweizer Lieferanten mit CH-Lager — Sichtung 03.09.2026

Betreiber-Vorgabe (03.09.): «nur CJ am Anfang, sonst Schweizer Lieferant suchen. Kann auch sonst
was sein, Hauptsache Schweizer Lager.» Spocket wurde geprüft und verworfen (US/EU-Marktplatz,
Abo USD 40–300/Mt., Nicht-EU-Zoll je Lieferant, keine API-Anbindung an unseren Stack).

Stand heute im Shop: **Fortura** (CH-Lager, 2'409 aktive Artikel, 1–2 Werktage) ist der einzige
Schweizer Lieferant — im Kern Fasnacht/Party/Kostüm/Spielzeug. Was fehlt: CH-Lager für
Haushalt, Beauty, Technik, Outdoor.

## Rangliste (nur belegte Angaben, alles ohne Konto geprüft)

| # | Lieferant | Lager | Sortiment | Anbindung | Lieferzeit CH | Stand / offen |
|---|---|---|---|---|---|---|
| 1 | **Shopcom AG**, Büron LU (shopcom.ch) | CH | >10'000 Produkte: Baby & Kleinkind, Beauty & Health, Haushalt, IT + Multimedia, Outdoor & Garten, Spielwaren, Marken | **täglicher CSV-Feed** (Produktdaten) + Preis/Bestand-Feed mehrmals täglich; Bestellung im B2B-Shop, neutraler Lieferschein im Shop-Namen; Shopify-Anbindung gegen Überverkauf (Bestand 5-Min-Takt); EDI/API/FTP ab >10 Bestellungen/Tag | **Bestellung bis 15:00 → Zustellung am Folgetag** (Post) | Dropshipping-Antrag: forms.shopcom.ch/dropshipping-de/ (fragt Firma, HR-Nummer, Shop-URL, Besucher/Mt., Social-Follower, Umsatzklasse). **Gebühren/Mindestumsatz nicht öffentlich** → im Antrag fragen. |
| 2 | **Dameco AG**, Kleindöttingen AG (dameco.ch) | CH | Deko, Feuerzeuge, Garten-Accessoires, Lampen/LED-Lichterketten, Kerzen, Strandkörbe, Saisonware | Händler-Registrierung im e-Shop; neutraler Versand im Shop-Namen; **keine Feed-Angabe** auf der Seite | «wenige Werktage» | Direktimporteur seit 24 Jahren, Beratung vor Ort. Feed/CSV erfragen. |
| 3 | **Telion AG**, Schlieren ZH (telion.ch) | CH | >3'000 Markenprodukte: Consumer Electronics, Beauty & Batterien, Haushalt (Bose/Sony/Smeg-Klasse) | Dienstleistung «Drop-Shipping» + «Schnittstellen & Datenanbindung» ausgewiesen, Details nur für Händler | kurz (eigenes Lager) | Fachhandels-Distributor: Händlerkonto nötig (UID vorhanden seit 08.07.). Konditionen per Telefon 044 732 15 11 / info@telion.ch. Markenware = echte Marge-Frage. |
| 4 | **Gelato** (POD, gelato.com) | Druckpartner-Netz, CH laut Gelato-CH-Seite «lokal in der Schweiz produziert»; App-Store-Länderliste nennt CH NICHT | T-Shirts, Poster, Tassen, Hüllen, Kalender, Wandbilder | Shopify-App, gratis (Gelato+ USD 29.99/Mt. optional), Bestellungen automatisch | je Produkt, Standard/Express | Interessant, weil POD das EINZIGE rankende Gut des Shops ist und Printful in EUROPA druckt (7–14 Werktage, Zoll-Risiko). **Erst im Konto prüfen, welche Produkte wirklich in CH produziert werden** — sonst ist es EU-Druck mit anderem Namen. |
| – | Prodigi (POD) | UK/EU (Venlo), kein CH-Labor belegt | Fine-Art, Textil | API/Shopify | EU→CH, Zoll | nicht besser als Printful. |
| – | Eprolo, BigBuy, BrandsGateway, Spocket | UK/US/ES/EU — **kein** CH-Lager (Marketing-Listen behaupten es, Belege fehlen) | | | Zoll ab ~CHF 62 Warenwert | BigBuy ist hier ohnehin stillgelegt (10.07.). |
| – | Watch Import, Formula Swiss, Emuca, Zentrada | unklar / nicht CH | Uhren / Supplements / Möbelbeschläge / Grosshandel | | | nicht weiterverfolgt. |

⚠️ **Zollgrenze Schweiz:** Einfuhr-MwSt. wird erst ab CHF 5 Steuerbetrag erhoben (bei 8.1 % ≈
CHF 62 Warenwert inkl. Versand). Alles aus EU-Lagern darüber bekommt der Kunde Zoll + Postgebühr
aufgebrummt — genau das, was ein CH-Lager vermeidet.

## Empfehlung
1. **Shopcom** ist der einzige Kandidat, der unserem Fortura-Muster entspricht: CSV-Feed → eigener
   Importer (wie `fortura_import.mjs`), CH-Lager, Folgetag-Lieferung, Sortiment in genau den
   Kategorien, die Fortura nicht hat. **Betreiber-Klick:** Dropshipping-Antrag ausfüllen
   (Einzelfirma, UID/HR, luxestyle.ch, Shopify, ~1'200 Besucher/Mt., TikTok 560 Follower,
   Umsatzklasse < CHF 5'000). Danach Feed-URL + Konditionen an mich → Importer + Wächter
   (Bestand/Preis mehrmals täglich, tracked+DENY, Ledger, Kanäle).
2. Dameco als zweiter Schritt für Wohnen/Deko-Saisonware (Weihnachten!), sobald ein Feed vorliegt.
3. Gelato nur als Test gegen Printful bei den POD-Rankern — nur, wenn im Konto CH-Produktion
   für T-Shirt/Tasse sichtbar ist.
4. Telion erst, wenn Markenelektronik mit belegter Marge gewollt ist.

Quellen: shopcom.ch (Startseite, trading-hub-handel, trading-hub-fulfillment, registrieren,
forms.shopcom.ch/dropshipping-de), dameco.ch/html/dropshipping-schweiz.html, telion.ch
(Services, Händlerinformationen, itreseller.ch-Profil), gelato.com/de/print-on-demand/schweiz,
apps.shopify.com/gelato-print-on-demand, prodigi.com/global-print-network,
brandsgateway.com/blog/dropshipping-suppliers-switzerland.
