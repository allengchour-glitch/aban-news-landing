# Entscheide des Besitzers vom 11.11.2026 («1 2 3 4 ja 5entwurf»)

Antwort des Besitzers auf die fünf offenen Punkte aus der Google-Bildliste (Bericht 20:1x UTC). Umgesetzt am
11.11.2026 zwischen 21:16 und 21:22 UTC mit `apply.mjs` (Plan `plan.json`). Je Produkt vorher gesichert
(`sicherung/<handle>.json`), danach frisch zurückgelesen; ein zweiter Trockenlauf meldet für alle zwölf Produkte
«schon im Soll».

| Nr. | Produkt | Änderung | Beleg |
|---|---|---|---|
| 1 | `sace-lady-flussig-mascara-wasserfest-langanhal-ebb71b` | Titel «SACE LADY Flüssig-Mascara – Wasserfest & Langanhaltend» → «SACE LADY Getöntes Augenbrauen-Gel in 5 Farbtönen»; Text, SEO und 10 Alt-Texte neu; Sammlung «Mascara» → «Augenbrauen & Wimpernserum» (Tag `sort-augenbrauen-wimpernpflege`), Shopify- und Google-Kategorie «Eyebrow Enhancers» | Flasche auf allen Bildern «Tinted BROW GEL», Bilder zeigen Augenbrauen, Aufdruck «6ml»; der alte Text sprach von Wimpern, sechs Farben (Shop: fünf) und 12 ml |
| 2 | `nasenreiniger-mit-saugfunktion-130d78` | Variante «Weiss Set-USB» (CHF 28.90) gelöscht, Bild 2 (Set mit Gesichtsdampfer, Aufschrift «US Plug») vom Produkt gelöst | US-Stecker passt nicht in Schweizer Steckdosen |
| 3 | `stern-bodysuit-kit-606900` | Varianten «Rosa / Materialset» und «Rosa / Fertigprodukt» gelöscht, Bild 5 («Patrick Star sleeping bag») gelöst | fremde Figur (Markenrechte) |
| 4 | `led-lichttherapie-maske-fur-strahlende-haut-395db3` | Titel → «LED-Gesichtsmaske mit Farblicht, 3 oder 7 Farben»; Text ohne Wirkungsversprechen (Kollagen, Durchblutung, Falten) | CJ: «Small Bulb Color Light Mask», Wirkung nicht belegt |
| 4 | `smartwatch-fur-sport-und-gesundheitsuberwachun-917696` | Titel → «Smartwatch für Sport und Alltag, 1,32-Zoll-Display»; «Umfassende Gesundheitsfunktionen» → Lieferumfang | CJ: «Screen size: 1.32», Packliste mit Ladekabel |
| 4 | `gesichtshochheber-nackenmassagegerat-2a3655` | Titel → «Gesichts- und Nackenmassagegerät mit Impulsfunktion»; Heilaussagen (Schmerzpunkte, Meridiane, Nackenschmerzen) entfernt, Hinweis zu Herzschrittmacher und Schwangerschaft ergänzt | CJ: «low cycle pulse technology», «Power mode: USB» |
| 5 | vier Konsolen bzw. Festplatte, UGREEN-Empfänger, elektronischer Haustierzaun | Status DRAFT, Tag `entwurf-besitzer-1111-nicht-live` | Spiele fremder Marken (Lizenz unklar), Bilder der Marke UGREEN, Tierschutzfrage |

Die sechs Entwurfs-Produkte: `neue-x9-hd-heimspielkonsole-296512`, `kabellose-mini-hd-motion-sensing-spielekonsole-836992`,
`externe-mobile-festplatte-usb-3-0-543424`, `y2hdmax-retro-gaming-konsole-3b78d0`, `bluetooth-audio-empfanger-furs-auto-a0dc61`,
`kabelloser-elektronischer-haustierzaun-e02b75`.

**Meine Auslegung (nicht bestätigt):** «1 ja» und «4 ja» galten den Titeln; Text, SEO, Alt-Texte und beim Gel die
Kategorie habe ich mitgezogen, sonst widerspricht die Seite dem neuen Titel. Beim Nasenreiniger habe ich auch das Bild
des Sets gelöst, das nach dem Löschen niemand mehr kaufen kann. Die SEO-Beschreibung ist jetzt ein Sachtext statt der
Werbezeile mit WELCOME10 (siehe Merchant-Befund vom 09.11.).

## Gemessen (11.11. 21:17 bis 21:24 UTC)

- Admin frisch gelesen: alle zwölf Produkte im Soll; das Gel liegt in `augenbrauen-wimpernpflege`, nicht mehr in `mascara-wimperntusche`.
- Storefront (`/products/<handle>.js` und Seite): Nasenreiniger 2 Varianten, 7 Bilder; Stern-Bodysuit 14 Varianten,
  «Rosa» nicht mehr in der Auswahl, 13 Bilder; die vier neuen Titel stehen in `<title>`, H1 und Meta-Beschreibung,
  kein Liquid-Fehler; die Entwürfe liefern 404.
- Rest: Judge.me führt auf der Smartwatch-Seite im eigenen Datenfeld noch den alten Namen (das Feld schreibt Judge.me
  selbst nach, am 10.11. nach rund 20 Minuten gemessen).

## Rücknahme

`ZURUECK=1 LIVE=1 NODE_USE_ENV_PROXY=1 node dropship/entscheide-1111/apply.mjs`
(Trockenlauf ohne `LIVE=1`). Titel, Texte, SEO, Alt-Texte, Kategorie und Status kommen aus der Sicherung bzw. dem Plan
zurück. Gelöschte Varianten werden neu angelegt (gleiche Optionen, SKU, Preise, Bild) und bekommen dabei **neue IDs**;
dieser Weg ist nicht erprobt.

## Offen

- Stern-Bodysuit: die Variantenbilder 3, 4 und 6 und das Galeriebild 2 tragen Werbeschrift («DON'T let a baby mom see
  this»); gleiche Art wie die Google-Liste, noch nicht bereinigt.
- Wirkung auf Google (Merchant) und Verkäufe: ungemessen.
