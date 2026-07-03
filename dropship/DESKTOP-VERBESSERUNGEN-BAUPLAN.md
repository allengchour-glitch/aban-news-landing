# Desktop-View-Verbesserungen — Bauplan (Referenz: Galaxus)

> User 2026-07-03: „desktop sicht verbessern mit header? und alle verbesserung" — Vorbild Galaxus
> (klickbare Kategorie-Navigation, Breadcrumbs, klare Kopfzeile). Theme-Code = THEME-SESSION-Lane.
> CizQ6 liefert nur den Bauplan; Umsetzung durch Theme-Session ODER Browser-Claude im Theme-Editor.
> Ziel: Findbarkeit + Vertrauen auf Desktop = mehr Conversion. Mobile bleibt separat (Sticky-ATC etc. schon da).

## Priorisiert (oben = grösster Hebel)

### 1. Sticky Header (bleibt beim Scrollen oben)
- Logo links · grosse **Suchleiste mittig** (mit Autosuggest) · rechts: Konto, Wunschliste, **Warenkorb mit Zähler**.
- Immer sichtbar beim Scrollen (position: sticky). Wie Galaxus-Kopfzeile.

### 2. Mega-Menü / Dropdown-Navigation (der Kern von „zum Klicken")
- Hauptkategorien als Menü-Leiste: **Damen · Herren · Schmuck · Beauty · Gadgets & Elektronik · Gaming · Wohnen · Selbst gestalten · Sale**.
- Beim Hover/Klick öffnet sich ein Panel mit **Unterkategorien** (z. B. Schmuck → Halsketten/Ohrringe/Armbänder; Gadgets → Audio/Laden/Smart Home).
- Nutzt die bestehenden Collections (auch die neuen Gaming/Elektronik/PC). Leere/dünne Collections NICHT verlinken (Trust-Leak).

### 3. Breadcrumbs auf Collection- + Produktseiten
- Klickbarer Pfad: `Start > Kategorie > Unterkategorie > Produkt` (Galaxus-Style, oben links).
- Verbessert Navigation UND SEO (strukturierte Daten BreadcrumbList).

### 4. Collection-Seite: Sidebar-Layout + mehr Spalten
- Links **Filter-Sidebar** (Preis, Marke, Verfügbarkeit, Produkttyp — Filter existieren schon), rechts Produktgrid.
- Desktop **4 Spalten** statt 2; klare Karten (Bild, Titel, Preis + Streichpreis, Sterne, Schnell-ansehen).

### 5. Produktseite Desktop: 2-Spalten mit sticky Buy-Box
- Links grosse **Bildergalerie** (Thumbnails), rechts **sticky Buy-Box**: Titel, Preis, Varianten, Menge, ATC, **Trust-Badges**, Lieferzeit-Snippet, Zahlungslogos.
- Darunter: Beschreibung, Reviews (Judge.me), „Passt dazu".

### 6. Trust-Leiste direkt unter dem Header
- 4 Icons + Text: **Gratis-Versand ab CHF 50** · 30 Tage Rückgabe · Schweizer Shop · Sichere Zahlung (TWINT/Visa/MC/Klarna).

### 7. Footer aufräumen
- Spalten: Kategorien · Hilfe/Rechtliches (AGB/Widerruf/Impressum/Datenschutz) · Kontakt · Newsletter.
- **Zahlungslogos** sichtbar (Vertrauen). Social-Links.

## Wichtig (Ehrlichkeit + Konsistenz)
- Nur befüllte Collections verlinken (leere = Absprung).
- Preise/Lieferzeiten bleiben ehrlich (siehe delivery_block.mjs + honest_compareat.mjs — schon gesetzt).
- Konsistente Tags/product_type, damit Mega-Menü + Filter sauber greifen (Gaming/gaming etc. vereinheitlichen).

## Umsetzung
- **Theme-Session** (bevorzugt, Theme-Lane) ODER **Browser-Claude** im Shopify-Theme-Editor:
  Header/Menü über die Theme-Navigation + Sektions-Einstellungen; Breadcrumbs via Snippet; Collection/Produkt-Templates anpassen.
- Nach Umsetzung: Desktop-Screenshot zur Kontrolle (Header sticky, Menü klickbar, Breadcrumbs da, 4 Spalten, Buy-Box sticky).
