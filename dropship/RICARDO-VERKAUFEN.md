# 🛒 LuxeStyle auf Ricardo.ch verkaufen — der reale Weg (korrigiert 2026-06-13)

> Zusätzlicher Schweizer Verkaufskanal. **Korrektur:** Es gibt KEINEN öffentlich beantragbaren
> „Partnership-Key" und keine self-serve SOAP-API mehr (die alte diglin/Magento-SOAP ist Legacy).
> Der **offizielle, aktuelle Weg ist ein PRODUKT-FEED**, den Ricardo **manuell einrichtet**.

## So läuft die Anbindung wirklich
1. **Gewerbliches/Profi-Verkäuferkonto** auf ricardo.ch (für Mengen/kommerziell).
2. **Feed-Details an `accountmanagement@ricardo.ch` senden** → Ricardo richtet den Feed-Import manuell ein
   (Format/Spec gibt Ricardo dabei vor; sie bestätigen die akzeptierte Struktur + Pull-Intervall).
3. **Feed bereitstellen** (öffentliche URL): `automation/ricardo_feed.mjs` erzeugt `ricardo_feed.csv`
   aus dem öffentlichen Shop (`products.json`) — nur **aktive** Produkte, archivierte/China-Artikel fehlen
   automatisch. Datei hosten (roher GitHub-URL, Shopify-Files oder Webspace) → URL an Ricardo.

## 🔒 Sicherheit (wichtig)
- **Du gibst KEINE Zugangsdaten/Logins/Keys an mich oder ein Tool.** Der Feed-Weg braucht das nicht —
  ich erzeuge nur die Datendatei, du machst Konto + Feed-Setup **direkt bei Ricardo**.
- Kein autonomes Hintergrund-Posten: Ricardo zieht den Feed, **du** steuerst Freigabe/Preise im Konto.

## Feed erzeugen
```
node automation/ricardo_feed.mjs            # alle aktiven Produkte → ricardo_feed.csv
node automation/ricardo_feed.mjs --limit 200
```
Spalten: id, sku, title, description, brand, price, currency(CHF), condition, availability, product_type, image, link.
(Falls Ricardo eine andere Struktur/CSV/XML verlangt → ich passe das Mapping an die von Ricardo gelieferte Spec an.)

## E-Mail-Entwurf an accountmanagement@ricardo.ch
> Betreff: Produkt-Feed-Anbindung für gewerblichen Verkäufer (LuxeStyle CH / luxestyle.ch)
>
> Guten Tag, wir möchten unseren Shopify-Shop LuxeStyle (luxestyle.ch) als gewerblicher Verkäufer
> per Produkt-Feed an Ricardo anbinden. Bitte teilen Sie uns das gewünschte Feed-Format/die Spezifikation
> und das Vorgehen mit. Eine Beispiel-Feed-URL (CSV) können wir bereitstellen. Besten Dank.

## Hinweis zur Legacy-API
`automation/ricardo_lister.mjs` (SOAP/JSON-InsertArticle) bleibt nur als **Referenz/Legacy** liegen —
NICHT der aktuelle Weg. Primär = der Feed oben.

## Tutti
Kein offizielles API/Feed zum Inserieren → **nicht** für automatisierte Anbindung geeignet.
