# Liechtenstein bei Google: Rückgang am 21.11.2026 (Diagnose 23.11.)

Mail Merchant Center (21.11., 07–13 MEZ), nur LI: Free listings 85'278 → 66'786 (−21 %), Shopping ads 84'155 → 67'126 (−20 %). CH nicht gemeldet.

## GEMESSEN 23.11. (Shopify, nur gelesen; Workflow wf_e0512ec1-2bb)
- Markt «Switzerland» = [CH, LI], aktiv, CHF, keine Preislisten. LI ist korrekt Lieferland.
- Versand: General-Profil LI «Standard Liechtenstein» CHF 14.90 ohne Bedingung; CH-Lager LI 0.00; Druck LI 0.00. 0 aktive Google-Produkte in Profilen ohne LI-Zone (Zendrop/Collective/Gelato/Printful nur Entwürfe).
- Google-Kanal: 23'147 aktive Produkte publiziert (Ø 3,94 Varianten ≈ 91k Angebote, passt zu 85k).
- Am 21.11. keine Massenänderung im Shop (06–12 UTC 61 Produkte aktualisiert, 0 gedraftet), kein Versand-/Markt-Commit.
- product.feedback (Vollscan 17:37 UTC): «Missing shipping info [LI]» nur 4 (24.10.: 8'916; 19.10.: 30'996) — die App schreibt aber kaum frische Rückmeldungen (90,9 % leer), sie zeigt den Rückgang (noch) nicht.

## QUELLE
Google/Shopify: Die App «Google & YouTube» überträgt Versand nur aus dem General-Profil und nur für das Zielland; jede Versandänderung in Shopify löst einen Neu-Import aus, der manuelle Merchant-Einstellungen überschreiben kann
(support.google.com/merchants/answer/14232591, help.shopify.com/en/manual/online-sales-channels/google/requirements). Den LI-Versand deckt der am 22.10. vom Betreiber im Merchant Center angelegte Dienst «Liechtenstein CHF 14.90» ab (dropship/LIECHTENSTEIN-GOOGLE-NACHMESSUNG-2026-10-23.md).

## Hypothese (nicht belegt, Merchant Center ist von hier nicht lesbar)
Ein Neu-Import am 21.11. (Versandänderung oder Shopifys Umstellung auf «Market-driven shipping», Rollout seit 01.10.2026) hat den LI-Dienst überschrieben → LI-Angebote ohne Versand → fallen weg.

## Betreiber-Klick (Merchant Center, Konto 5797470070)
1. Einstellungen (Zahnrad) → Versand und Rückgaben → Versanddienste: gibt es den Dienst für **Liechtenstein** (CHF, alle Produkte, CHF 14.90)?
2. Fehlt er oder steht er auf inaktiv: neu anlegen — Land Liechtenstein, Währung CHF, Lieferzeit 15–45 Werktage, Pauschal CHF 14.90, für alle Produkte.
3. Produkte → Diagnose → Filter Land LI: «Missing shipping information» sollte in 1–3 Tagen sinken.

## ⚠️ Nachtrag 23.11. abends — Hypothese widerlegt (Merchant-Export «Produktprobleme», 19:34 Uhr, vom Betreiber)
GEMESSEN im Export (45'757 Zeilen, 20'388 Artikel-IDs): **0 Zeilen «Versandinformationen fehlen»**, auch nicht für LI. LI hat nur 216 Zeilen (alle Sprache de):
70 Artikel «Verzögerungen bei der Bildverarbeitung» (wartet) und 2 «Anzeigen-Overlay auf Bild». Der LI-Versanddienst wirkt also; die Betreiber-Klickliste oben ist hinfällig.
Auffällig: In der Schweiz tragen 40'643 Zeilen die Sprache **fr** (4'938 Produkte nur fr), in LI nur de. Hypothese (nicht belegt): Google zeigt in LI nur noch
deutschsprachige Angebote; die französischen Angebote, die bis 21.11. auch in LI zählten, fielen dort weg. Das wäre kein Schaden (LI ist deutschsprachig).
Echte Gratis-Eintrags-Sperren in CH: 41 Artikel «Anzeigen-Overlay auf Bild» (21 Produkte, wird per Bildtausch behoben), Fehleinstufungen durch Google
(«Verkauf lebender Tiere»: Hundeweste/-leine/Katzenpullover; «Tabak»: Kaffeetasse, Lockenstab; «Waffen»: Pfeffermühle; «Lokale Anforderungen»: Kinderschuhe; «Bild zu klein»: Wimpernkrümmer)
→ im Merchant Center je Artikel «Überprüfung beantragen». 22'397 «Zu viele Produkte (CSS)» betreffen nur Shopping-Anzeigen.
