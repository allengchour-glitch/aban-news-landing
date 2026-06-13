# 🛒 LuxeStyle auf Ricardo.ch verkaufen — Anleitung + Anbindung

> Ziel: zusätzlicher **Schweizer Verkaufskanal** mit echten Käufern. Ricardo (SMG-Gruppe) hat — anders
> als Tutti (kein offizielles API) — eine **offizielle, kostenlose Händler-Schnittstelle** zum direkten
> Listen aus dem Shop-System.

## Was Ricardo technisch ist
- **.NET-Webservice**, Requests als **JSON ODER SOAP**.
- Services: `SystemService` (Referenzdaten/Kategorien), `ArticleService` (**InsertArticle** = Inserat anlegen),
  `SearchService`, `CustomerService`, `SellerAccountService`, `SecurityService` (Token).
- **Auth (zweistufig):** Partnership-Credentials (Header `Ricardo-Username` / `Ricardo-Password` + Partnership-Key)
  → temporäre Credential → **Token** (läuft ab, erneuern via `SecurityService.RefreshTokenCredential`).

## Einmalige Einrichtung (nur DU)
1. **Verkäuferkonto** auf ricardo.ch — für Mengen idealerweise **kommerziell/Händler** (Pro-Konto).
2. **Schnittstelle freischalten + Partnership-Key anfordern:**
   help.ricardo.ch → „Schnittstellen-Anbindung aufschalten" (Partnership-Key = API-Zugang für die Integration).
3. Zugangsdaten als Secrets bereitstellen (NICHT ins Repo):
   `RICARDO_PARTNER_KEY`, `RICARDO_USERNAME`, `RICARDO_PASSWORD` (+ ggf. `RICARDO_API_BASE`).

## Zwei Wege zum Listen
- **A — Fertiger Connector (am wenigsten Aufwand):** Middleware/Apps die Shop→Ricardo syncen
  (z. B. green-solutions, peleides, diglin). Konto verbinden, Produkte mappen, fertig. ⚠️ Einzelne
  Dritt-Connectoren haben Abschalt-Daten (einer 01.09.2026) → auf gepflegten Anbieter achten.
- **B — Eigener Lister (autonom, wie unsere anderen Pipelines):** `automation/ricardo_lister.mjs`
  liest aktive Produkte aus `https://luxestyle.ch/products.json` (sauber gefiltert — archivierte/China-Artikel
  sind raus), authentifiziert per Token und ruft `ArticleService.InsertArticle`. Finalisiert wird der genaue
  Endpoint/Feld-Mapping, sobald der Partnership-Key + die offizielle API-Doku (Login) vorliegen.

## Wichtige Listing-Felder (InsertArticle, typisch)
Titel, Beschreibung (HTML/Plain), `CategoryId` (aus `SystemService` mappen), Startpreis/Sofortkauf-Preis,
Bilder (Upload/URL), Laufzeit, Versandoptionen, Zahlungsarten, Menge/Lagerbestand. Preis = unser CHF-Shop-Preis.

## Empfehlung
Ricardo lohnt sich (Reichweite + Verkäufe in CH). **Tutti per API nicht möglich** → Ricardo nehmen.
Wenn du den Partnership-Key + Händlerkonto hast: sag „Ricardo aktivieren", dann finalisiere ich `ricardo_lister.mjs`
(echte Endpoints + Kategorie-Mapping) und es listet die Produkte automatisch — sauber, ohne die archivierten Artikel.

## Quellen
- Ricardo: Technische Schnittstelle: https://help.ricardo.ch/hc/de/articles/115002955649
- Anbindung aufschalten: https://help.ricardo.ch/hc/de/articles/115002955769
- Anbindung entwickeln: https://help.ricardo.ch/hc/de/articles/115002955709
- API-Referenz (PHP-Lib diglin): https://github.com/diglin/ricardo
