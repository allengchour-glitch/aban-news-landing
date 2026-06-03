# Mobiles Menü kompakt machen — „wie Galaxus" (1 Klick)

Stand 2026-05-31. Problem (User-Screenshots): das Handy-Menü ist endlos lang, weil ALLE
Unterkategorien sofort ausgeklappt untereinander stehen → viel Scrollen.
Gewünscht: Oberkategorie antippen → erst DANN erscheinen die Unterkategorien (Drill-down/Akkordeon).

## Befund (read-only verifiziert)
- Die Menü-**Struktur ist schon perfekt** (Menu `main-menu`, ID 310224093569): jede Oberkategorie
  hat ihre Unterpunkte als echte Kind-Items (z. B. „💎 Schmuck + Uhren" → Damen-Schmuck /
  Herren-Schmuck / Uhren / Sonnenbrillen). → **Kein Menü-Umbau nötig.**
- Ursache = EINE Theme-Einstellung im Live-Theme „Horizon · LuxeStyle Branded“
  (Theme-ID 187043086721, MAIN), Datei `sections/header-group.json`,
  Section `header_section` → Block `header-menu` (Typ `_header-menu`):

  ```
  "drawer_accordion": false           ← URSACHE (alles ausgeklappt)
  "drawer_accordion_expand_first": false
  "drawer_dividers": false
  ```

  - `false` (jetzt) = Unterkategorien sofort sichtbar → langes Scrollen
  - `true` = antippen → Unterkategorien klappen auf = **Galaxus-Verhalten** ✅

## Warum nur du das kannst
Das Live/MAIN-Theme ist für die API **schreibgesperrt** (Theme-Writes blockiert).
Diesen Schalter kann nur dein Klick im Customizer umlegen.

## Die 1-Klick-Anleitung (≈30 Sekunden)
1. Shopify Admin → **Online Store → Themes**
2. Bei „Horizon · LuxeStyle Branded“ → **Customize**
3. Oben in der Mitte den Bereich **Header** anklicken (öffnet die Header-Einstellungen links)
4. Block **Menu** anklicken
5. Schalter **„Drawer accordion“** (dt. evtl. „Akkordeon im Menü-Drawer“) → **aktivieren**
   - Optional für klarere Optik: **„Drawer dividers“** ebenfalls aktivieren (Trennlinien)
   - **„Expand first“ NICHT** aktivieren (sonst startet die erste Kategorie offen)
6. Oben rechts **Save**

## Verifikation
Storefront am Handy öffnen (oder im Customizer auf Mobil-Vorschau umschalten) → Menü-Drawer öffnen:
- nur die ~17 Oberkategorien sichtbar, kompakt
- Antippen z. B. von „Schmuck + Uhren“ klappt Damen-/Herren-Schmuck, Uhren, Sonnenbrillen auf
