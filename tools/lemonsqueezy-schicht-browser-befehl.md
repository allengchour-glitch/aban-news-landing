# Browser-Befehl — „Schicht" bei Lemon Squeezy als Pay-What-You-Want einrichten

Du bist ein Browser-Agent. Richte für den Autor (aban news / Allen Chour) ein
digitales Pay-What-You-Want-Produkt für den Roman **„Schicht"** ein und liefere
am Ende den **Checkout-Link** zurück.

## Feste Regeln
- **Login / E-Mail-Bestätigung / 2FA / Zahlungs-/Steuerdaten macht der Mensch.**
  Dort anhalten und übergeben — niemals Konto-/Bank-/Steuerdaten selbst eingeben.
- Nach jedem Schritt ✓CHECK. Stimmt er nicht → STOP, melden, nicht raten.
- Wenn ein Pflichtfeld unklar ist (z. B. Steuerkategorie) → fragen, nicht raten.

## Dateien (vom Menschen bereitzustellen / hochzuladen)
Die fertigen Buchdateien liegen lokal in `downloads/` bzw. `ausgabe-schicht/`:
- `schicht.pdf`, `schicht.epub`  (DE, Gesamtausgabe)
- `the-seam.pdf`, `the-seam.epub` (EN, Complete Edition)
(Optional zusätzlich die Einzelbände `schicht-band-0N.*`.)

## Schritte
```
1. lemonsqueezy.com öffnen → einloggen.
   ✓ CHECK: Dashboard sichtbar. Sonst → Login an Mensch übergeben.

2. Falls noch kein Store existiert: Store anlegen
   (Name z. B. "aban news", Währung EUR).
   ✓ CHECK: Store-Dashboard offen. Steuer-/Auszahlungsdaten = MENSCH.

3. Products → "New Product".
   - Name: Schicht — eine Ruhrgebiet-Saga in drei Bänden
   - Description (einfügen):
     "Eine Ruhrgebiet-Generationensaga 1905–1989. Eine Bergmannsfamilie, eine
      Zeche, ein im Streik verratenes Versprechen — getragen über drei
      Generationen bis zur letzten Schicht. Drei Bände, 48 Kapitel.
      PDF & ePub, dazu die englische Ausgabe „The Seam". Einmaliger Kauf,
      kein Abo, sofortiger Download."
   ✓ CHECK: Produktentwurf angelegt.

4. Pricing → "Pay what you want" aktivieren.
   - Mindestbetrag: 0 (oder 1 €, falls 0 nicht erlaubt).
   - Vorgeschlagener Betrag: 7 €.
   ✓ CHECK: PWYW aktiv, Vorschlag 7 € gesetzt.

5. Digitale Dateien hochladen (Mensch wählt die Dateien):
   schicht.pdf, schicht.epub, the-seam.pdf, the-seam.epub.
   ✓ CHECK: alle vier Dateien als Download angehängt.

6. Produkt veröffentlichen / "Publish".
   ✓ CHECK: Status "Published".

7. "Share" / Produktlink öffnen und den Checkout-/Buy-Link KOPIEREN
   (Form: https://<store>.lemonsqueezy.com/buy/XXXXXXXX oder /checkout/buy/...).
   ✓ CHECK: Link kopiert.

8. MELDEN: den kopierten Checkout-Link + Status aller CHECKs.
```

## Danach (erledigt der Repo-Assistent)
Den zurückgegebenen Link in `schicht.html` bei `var SCHICHT_BUY_URL = "..."`
eintragen, committen, deployen → der „Was ist es dir wert?"-Button ist live.

## Wenn etwas klemmt
- Steuer-/Auszahlungs-Onboarding verlangt persönliche Daten → an Mensch übergeben.
- PWYW-Option nicht auffindbar → STOP & melden (ggf. Festpreis 7 € als Rückfall,
  aber erst nach Rückfrage).
- Datei-Upload schlägt fehl → exakten Fehlertext melden.
