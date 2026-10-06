# Google: Rückgabe- und Versandregel als Organization-Markup (06.10.2026)

## GEMESSEN
- Search Console (Mail 06.10. 10:59): «Händlereinträge für strukturierte Daten» — `shippingDetails` fehlt (in offers),
  `hasMerchantReturnPolicy` fehlt (in offers), `description` fehlt; «Produkt-Snippets»: `aggregateRating`/`review` fehlen.
- Live-JSON-LD Provence-Seite (curl): 3 Blöcke — Organization (nur name/logo/url, `sections/header.liquid`, jede Seite),
  ProductGroup/Product/Offer (Shopify `structured_data`) **ohne** Versand- und Rückgabe-Felder, BreadcrumbList.
- Google-Doku (merchant-listing): «We recommend you provide a global return policy / shipping policy for your business under
  `Organization` markup instead» — Offer-Ebene nur für Abweichungen.
- Fakten: Rückgabe 30 Tage, per Post, Rücksendeporto Kundin, volle Erstattung, nur CH (shopPolicies, `zusagen_abgleich.py`);
  Versand CHF 7.00, ab CHF 45 gratis (deliveryProfiles; Versprechen «ab 50» ist der Puffer).

## GETAN
- `automation/google_org_richtlinien.py`: ergänzt den Organization-Block im Header um `hasMerchantReturnPolicy`
  (MerchantReturnFiniteReturnWindow, 30 T, ReturnByMail, ReturnFeesCustomerResponsibility, FullRefund, CH) und
  `hasShippingService` (CH: Bestellwert 0–44.99 → CHF 7.00, ab 45 → CHF 0). Anker genau 1×, Live-Datei nach
  `/tmp/header.vor-org-richtlinien.*.liquid` gesichert, zurückgelesen.
- **Live geprüft**: Produktseite, Kollektion, Startseite liefern gültiges JSON (`json.loads` ok, 30 Tage, Tarife [7.0, 0]).
- Wächter `--pruefen` täglich im Aufseher: Markup im Live-Header? Tarif = Markup? Fehlt nur das Markup → neu einfügen;
  Tarif-Abweichung (z. B. Schwelle geändert) → ⚠️-Zeile, damit Markup und Checkout nie auseinanderlaufen.

## OFFEN
- Search Console prüft neu beim nächsten Crawl (Tage); dann in «Händlereinträge» nachsehen, ob die zwei Hinweise verschwinden.
- `aggregateRating`/`review`: nur mit echten Bewertungen (Judge.me-Anbindung besteht schon für Produkte mit Bewertungen;
  0 bei den meisten) — kein Fix von hier, Plan-Tag 9 (Bewertungen).
- `description fehlt` bei einzelnen Produkten: welche, sagt nur der Search-Console-Bericht (Betreiber-Blick oder API-Zugang).
