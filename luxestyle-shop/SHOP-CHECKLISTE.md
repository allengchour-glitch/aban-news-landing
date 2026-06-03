# luxestyle.ch — Shop verbessern (ehrliche Checkliste)

Priorisiert: oben = größter Effekt fürs erste Geld, unten = später. Kein Hype,
keine Tricks. Du machst die Schritte im Shopify-Admin (CHF, Schweiz) — ich kann
Texte/CSV/Preise vorbereiten.

## 🔴 Bevor du den ersten Verkauf erwarten kannst (Pflicht)

1. **Echte Fotos statt Render.** Käufer kaufen, was sie sehen. Drucke Mimi einmal,
   fotografiere sie bei Tageslicht: 1× freigestellt (weißer Hintergrund), 1× in der
   Hand (zeigt Größe), 1× auf Schreibtisch/Regal. Handy reicht. → wichtigster Hebel.
2. **Rechtliches (CH/EU).** Impressum, AGB, Widerrufsrecht, Datenschutz, Versand &
   Rückgabe. Shopify hat Vorlagen (Einstellungen → Richtlinien). Ohne das wirkt der
   Shop unseriös und du bist angreifbar. **Sonderfall personalisiert:** individuell
   gefertigte Ware ist vom Widerruf ausgenommen — das sauber in die AGB schreiben.
3. **Zahlung: TWINT aktivieren.** In der Schweiz zahlt fast jeder mit TWINT. Ohne
   TWINT verlierst du Käufer. Dazu Karte (Shopify Payments / Stripe). PayPal optional.
4. **Lieferzeit ehrlich nennen.** „Wird nach Bestellung einzeln gefertigt — Versand in
   3–5 Werktagen." Das ist kein Nachteil, das ist dein Verkaufsargument (kein Massen-
   produkt). Steht schon in den Beschreibungen, gehört auch auf die Versand-Seite.

## 🟠 Macht den Shop verkaufsstark (kurz danach)

5. **Personalisierung als Eingabefeld.** Für Namens-Anhänger/Schild/Cake-Topper: ein
   Textfeld „Dein Text" am Produkt (Shopify: Produkt → Optionen, oder eine Gratis-App
   für Zeilen-Eingabe). Sonst musst du jeden Wunsch per Mail nachfragen.
6. **Farbauswahl als Variante.** Deine PLA-Palette (weiß, schwarz, grau, rot, gelb,
   braun, grün, beige, pink, blau, violett) als Varianten-Option „Farbe". Käufer wählt
   selbst → keine Rückfrage.
7. **Preise prüfen, nicht raten.** `preis_rechner.py` mit dem **echten** Bambu-Studio-
   Gewicht + Druckzeit füttern (nicht der STL-Schätzung) und in `produkte.json`
   eintragen. Dann stimmt deine Marge wirklich.
8. **Klare Produkttitel für Suche.** „Personalisierter Namens-Schlüsselanhänger aus
   3D-Druck" schlägt „Mimi". Beschreibungen sind schon SEO-tauglich (du-Form, Begriffe).
9. **Eine Sammlung / Kategorien.** Gruppiere: Figuren · Schlüsselanhänger · Schilder ·
   Geschenke. Erleichtert das Stöbern.

## 🟡 Später, wenn die ersten Bestellungen laufen

10. **Bewertungen — ehrlich, leer starten.** Keine Fake-Reviews (Markenregel, und es
    fliegt auf). Nach echten Käufen freundlich um eine Bewertung bitten.
11. **Bundle / Cross-Sell.** „Katze + passender Anhänger" als Set. Erhöht den Warenkorb.
12. **Verpackung mit Karte.** Kleine Dankeskarte + QR zu luxestyle.ch → Wiederkäufer.
13. **Eigene Social-Kanäle.** LuxeStyle-eigene Kanäle (NICHT die aban-News-Kanäle).
    Fertige Posts liegen in `../luxestyle-3d/posts.json` — erst senden, wenn live.
14. **Reichweite.** Druck-Timelapse-Clips, „Frisch aus dem Drucker", Vorher/Nachher.
    Personalisierte Geschenke gehen auf TikTok/Insta gut.

## Was ich (Code) für dich vorbereiten kann
- Beschreibungen/Titel/CSV neu generieren (`listing_generator.py`).
- Rechts-Textbausteine (Impressum/AGB/Widerruf/Versand) als Entwurf — **kein** Ersatz
  für eine rechtliche Prüfung, aber ein guter Start.
- Preise rechnen, sobald du echte Slicer-Werte hast.

## Was nur du kannst
- Drucken, fotografieren, TWINT/Bank verknüpfen, Richtlinien bestätigen, „Aktiv" klicken.
