# Redaktions-Verifikation — ehrlicher Faktencheck der KI-Entwürfe

Viele Radar-Daten tragen `[Redaktion: prüfen]` — ein bewusster Marker: nicht geprüft.
Dieses Doc hält fest, **wie** geprüft wird und **was** schon erledigt ist.

## Prinzip (was geprüft wird — und was nicht)
- **Geprüft & belegbar:** dauerhafte Fakten — existiert das Tool, stimmt die offizielle
  URL, **Firmensitz/Herkunft** + **`eu_lager`**. Quelle: offizielle Seite / Impressum /
  etablierte Profile. Nur dann wird der Marker gehoben.
- **Definition `eu_lager` (laut Daten-Schema `_integritaet`): „EU-/DSGVO-Hosting"** — also
  bietet das Tool EU-/DSGVO-konforme Datenhaltung? `true`, wenn sicher (EU/EWR-Firma hostet
  in der EU **oder** adäquates Land wie die **Schweiz** [Angemessenheitsbeschluss] **oder**
  Anbieter mit dokumentierter EU-Region, z. B. US-SaaS mit EU-Rechenzentrum). `false`, wenn
  klar kein EU-Hosting (z. B. reines US-Hosting). **`null`, wenn unsicher** — lieber ehrlich
  offen als falsch behauptet. (Firmensitz ist ein Indiz, aber nicht gleich Hosting.)
- **Bleibt `null`/ungeprüft:** Preise (`preis_eur`) und Wertungen (`worth_it_score`).
  Die ändern sich laufend bzw. sind subjektiv — die füllt ein Mensch bewusst, nicht
  „per Websuche behauptet". Lieber ehrlich leer als geschönt.

## Erledigt
- **musik-radar (18 Tools):** Firmensitze verifiziert, EU-Flags korrigiert, `aban_note`
  bereinigt (Marker entfernt). Korrekturen u. a.:
  - Endel → Berlin (Endel Sound GmbH) → EU/DACH ✓
  - LALAL.AI → OmniSale GmbH, Zug/Schweiz → DACH, DSGVO-adäquat ✓
  - LANDR → Montreal/Kanada → nicht EU
  - AIVA (Luxemburg) bestätigt; Stable Audio → Stability AI (UK), nicht EU
  - Quellen: jeweilige Firmen-/Profilseiten (siehe Commit-Recherche).

- **webbaukasten-radar (15 Tools):** Firmensitze verifiziert, EU-Flags gesetzt (0 „unbekannt",
  vorher 4), `aban_note`-Marker gehoben. Korrekturen u. a.:
  - Webnode AG → Zürich/Schweiz → `eu_lager=true` (CH DSGVO-adäquat, Hosting in Europa)
  - Wix (Israel) · 10Web (Armenien) → `eu_lager=null` (EU-Datenresidenz unsicher → ehrlich offen)
  - Framer B.V. → Amsterdam/NL ✓ · Softr Platforms GmbH → Berlin/DE ✓ (EU-Hosting)
  - bestätigt EU: Jimdo (Hamburg), IONOS (Montabaur), STRATO (Berlin), one.com (DK), Hostinger (LT);
    bestätigt Nicht-EU (US): Squarespace, Webflow, Durable, Carrd, GoDaddy.
  - Quellen: Northdata/Creditsafe/Dun&Bradstreet, EIF-Armenia/TechCrunch + Firmen-Impressen.
- **buchhaltung-radar (22 Tools):** Firmensitze verifiziert, `aban_note`-Marker gehoben. Fast alle
  sind DACH/EU (deutsche GmbHs, DATEV eG, Agicap/FR, Pleo/DK). Zoho Books → `eu_lager=true`
  (Firma Indien, aber offizielle EU-Rechenzentren Amsterdam/Dublin = DSGVO-Hosting möglich).
  Klar kein EU-Hosting: Xero (NZ), QuickBooks/Intuit (US), FreshBooks (Kanada). Preise/Scores `null`.

## Offen (gleicher Ansatz, nächste Radars)
voice-, video-, chatbot-, newsletter-, automatisierung-, dropshipping-radar
+ `data/tools.json`. Pro Radar: Herkunft/URL prüfen, EU-Flag setzen, Marker heben;
Preise/Scores bewusst `null` lassen.

> Merksatz: Verifikation heißt **belegbare, dauerhafte Fakten** bestätigen — nicht
> volatile Zahlen erfinden. Genau das ist der aban-Unterschied.
