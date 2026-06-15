# 🖥️ PC-Claude Port-Aufgabe: Theme-Customizer professionalisieren

> **Für den PC-Claude (Brave-Agent, Port 9222 / CDP).** Voraussetzung: PC an, Brave offen, in Shopify-Admin
> eingeloggt (au3j0y-hq.myshopify.com). User-Startzeile: *„PC-Claude, mach die Customizer-Aufgabe."*
>
> **Wichtig:** Arbeite auf einer **unveröffentlichten Theme-Kopie**, NICHT direkt am Live-Theme. Am Ende dem
> User die Vorschau zeigen → er entscheidet über „Veröffentlichen". Nichts veröffentlichen ohne sein OK.

## Vorbereitung
1. Admin → **Onlineshop → Themes**.
2. Beim Live-Theme „Horizon · LuxeStyle …" → **⋯ → Duplizieren** (Sicherungskopie). Die Kopie umbenennen in
   **„LuxeStyle PRO (PC-Claude)"**.
3. Diese Kopie → **Anpassen** öffnen. Oben auf **📱 Mobil** umschalten.

## Aufgaben (in dieser Reihenfolge, je danach „Speichern")

### A) Produktkacheln = quadratisch (grösster „sauber"-Effekt)
- Für JEDE Sektion mit Produktraster auf der Startseite (z.B. „Empfohlene Produkte", „Kollektion", „Neu"):
  Sektion anklicken → Einstellung **„Bildverhältnis / Image ratio"** → von „Adapt/Anpassen" auf **„Quadratisch/Square"**.
- Falls vorhanden: **„Zweites Bild bei Hover zeigen"** = AN.

### B) Hero (oberste Sektion „Bild mit Text"/„Slideshow")
- **Bild:** ein ruhiges, hochwertiges Mode-Foto hochladen (Frau im Look, viel Weissraum, beige/neutral).
  Falls keins da: aus `reels/`-Frames oder Produkt-Lifestyle-Bild nehmen, NICHT grelle Collage.
- **Überschrift:** „Premium-Looks & Marken — schweizweit geliefert"
- **Text:** „Mode · Schmuck · Designer-Marken · Gratis-Versand ab CHF 65"
- **Button:** „Jetzt entdecken" → Link `/collections/neu`.
- Overlay/Abdunklung 20–30 % für Lesbarkeit, Text links-unten.

### C) Judge.me-Sterne auf den Produktkacheln
- In der Produktkarten-Sektion → Block hinzufügen → **App-Block „Judge.me Star Rating / Preview Badge"** → unter dem Titel platzieren.
- Auf der Produktseite-Vorlage ebenfalls den Judge.me-„Review Widget"-Block einfügen (falls noch nicht da).

### D) Sticky „In den Warenkorb" (Mobil) + Zahlungs-Icons
- Customizer → oben Dropdown → **Produkte → Standardprodukt**.
- Block **„Sticky/Schwebende Kaufleiste"** aktivieren (falls Theme ihn hat).
- Beim Kaufbutton **Zahlungs-Icons** (TWINT/Visa/Mastercard/PayPal) als Block/Bild einfügen + Trust-Zeile
  „🇨🇭 Schweizer Shop · 30 Tage Rückgabe".

### E) Ankündigungsleiste
- Text: „🇨🇭 Gratis-Versand ab CHF 65 · 30 Tage Rückgabe · –10 % mit Code WELCOME10". Dezente Farbe.

## Abschluss
- **Speichern.** Dem User die **Vorschau-URL** der Kopie schicken (im Themes-Menü „Vorschau").
- Erst nach seinem **„ja, veröffentlichen"** → „Als Theme veröffentlichen". Sonst Kopie liegen lassen.
- Kurzes Protokoll, was geändert wurde, an den User (Telegram/Chat).

## Sicherheits-Regeln
- NIE das aktuelle Live-Theme direkt bearbeiten (immer auf der Kopie).
- Bei „Bildverhältnis/Block nicht gefunden" → überspringen + melden, nicht erzwingen.
- Keine Drittanbieter-Apps neu installieren.
