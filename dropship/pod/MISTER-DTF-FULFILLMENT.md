# 🖨️ Bügeltransfer-Linie — Anbieter Mister DTF (misterdtf.ch)

User-Entscheid 2026-06-09: Iron-on/Bügeltransfer-Linie über **Mister DTF** (Uetendorf BE, 100 % CH,
OEKO-TEX®, ab 1 Stück, 3–5 Werktage, Express möglich). Printful kann lose Bügelfolie NICHT → separater Anbieter.

## Produkt (im Shop angelegt)
- **„Bügeltransfer – selbst gestalten"** · `gid://shopify/Product/15423895830913` · **Status DRAFT**
- Editor-Widget (`pod/designer.js`) in der Beschreibung; Vorschau-Hintergrund = weisses Tee-Mockup.
- Varianten/Preise (CHF): **Klein/A5 11.90 · A4 16.90 · A3 24.90**. SKUs `TRANSFER-A5/A4/A3`.
- Tags: `buegeltransfer, bügelbild, diy, custom, selbst-gestalten` — **NICHT** `wunschdesign`/`printful_…`
  → wird vom Printful-Sync **bewusst ignoriert** (Mister DTF = manuelle Abwicklung).

## Einkauf (Mister DTF, exkl. MwSt)
- A3: **12.90** (1) → 11.90 (5+) → **7.90 (50+)**. Versand/Express extra. (A4/Klein günstiger.)
- Marge-Check A3: Verkauf 24.90 − Kosten ~13.95 inkl. MwSt ≈ **~11 CHF** (Kundenversand deckt Mister-DTF-Versand).

## Abwicklung (manuell, bis Anbieter-API/App)
1. Bestellung in Shopify öffnen → beim Artikel die Eigenschaft **„🖼️ Druckdatei"** (Cloudinary-PNG) herunterladen.
2. Auf **misterdtf.ch** hochladen, passende Grösse wählen (A5/A4/A3), bestellen.
3. Liefern lassen an Kund:in (oder an uns → weiterleiten). Shopify-Bestellung als erledigt markieren.

## ⚠️ Voraussetzung zum Aktivieren (ACTIVE)
- **Cloudinary** muss in `pod/designer.js` gesetzt sein (CLOUD/PRESET) — sonst trägt die Bestellung **keine
  Druckdatei** (der Editor backt sie, kann sie aber nicht hochladen). Bis dahin **DRAFT lassen**.
- Danach: ACTIVE schalten, in Kollektion „Selbst gestalten" + Menü aufnehmen, 1 Testbestellung End-to-End prüfen.

---
## ⚙️ Update 2026-06-09: Printful-App-Import = „manuelle Bestätigung" (User erledigt)
- User hat in der Printful-App **Auto-Bestätigung AUS** → „Manuelle Bestätigung importierter Aufträge".
- ⚠️ **Wichtig:** „manuell" ≠ „kein Import". Die App importiert weiter → pro Bestellung evtl. **2 Printful-Entwürfe**:
  (a) App-Entwurf OHNE Design, (b) unser API-Sync-Entwurf MIT Druckdatei (`printful_sync.mjs`, Gemini-geprüft).
  → **Den (b) mit Design bestätigen, (a) löschen.** Beide sind Entwürfe → kein Auto-Abbuchen.
- Beim 1. echten Test (nach `PRINTFUL_API_KEY`) gemeinsam verifizieren; falls störend, App-Order-Import ganz abschalten.

## Nachtrag 11.10.2026: erste Bestellung #1024 (manuell, Betreiber hat abgeschickt und bezahlt)
- Auftrag: 2 × A3 Premium Transfer Öko-Tex 100 (Bild 27 cm, Feivel 14.8 cm mittig), Versand A-Post, Lieferung direkt an die Kundin.
- **Einkauf 38.60 CHF, Verkauf 40.12 CHF, Gewinn ca. 2 CHF.** Das ist zu knapp. Die manuelle Abwicklung (Formular, Captcha, Zahlung von Hand) kostet zusätzlich Zeit.
- Künftige Bügeltransfer-Bestellungen: vor dem Verkauf rechnen (Einkauf pro A3-Bogen 12.90 + Versand 9.90). Preis oder Produkt entscheidet der Betreiber.
- Offen: Versandmail von Mister DTF (Trackingnummer) abwarten, dann Shopify #1024 als versandt markieren und die Trackingnummer eintragen.
