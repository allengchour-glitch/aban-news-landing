# 🚨 Google Merchant Center ENTSPERREN — kompletter Fix-Plan (Konto gesperrt)

> **Befund 2026-06-15:** Merchant-Konto **gesperrt** („Fehler"), 0 genehmigt, **106'650** nicht genehmigt.
> Das ist eine **Konto-Sperre** (meist Policy **„Misrepresentation"/Untrustworthy**), nicht nur Produkt-Ablehnung.
> **NICHT vorschnell „Erneute Überprüfung beantragen"** — Re-Reviews sind begrenzt. **Erst alles fixen, dann beantragen.**

## Warum gesperrt? (typische Gründe bei neuem Dropship-Shop)
1. **Vertrauen/Transparenz unklar** — fehlende/inkonsistente Impressum-, Kontakt-, Versand-, Rückgabe-, Datenschutz-Angaben.
2. **Riesiger, unsauberer Feed** (106'650 = Varianten × Märkte × Sticker/POD-Kram) bei 0 Verkäufen wirkt unseriös.
3. **Inkonsistente Daten** (z.B. E-Mail-Tippfehler in den Policies, Preis/Verfügbarkeit-Mismatch).

---

## ✅ FIX-CHECKLISTE (in dieser Reihenfolge, DANN Re-Review)

### 1. Vertrauen wasserdicht machen (Admin — der wichtigste Punkt)
- [ ] **Impressum/Kontaktseite** mit **echter Geschäftsadresse** (Belp), **info@luxestyle.ch**, Telefon/Kontaktformular.
- [ ] **Versand-Policy**: Lieferzeiten + Kosten (Gratis ab CHF 65), Versand aus … — vollständig.
- [ ] **Rückgabe-/Widerrufs-Policy**: 30 Tage, Ablauf, Adresse.
- [ ] **Datenschutz + AGB** vorhanden & verlinkt (Footer).
- [ ] ⚠️ **2 E-MAIL-TIPPFEHLER KORRIGIEREN** (lösen genau solche Sperren aus):
      - Versand-Policy: „info@luxestyle.**com**" → **`info@luxestyle.ch`**
      - AGB §8 Gewährleistung: „allengchour@**gmail.com**" → **`info@luxestyle.ch`**
      *(Admin → Einstellungen → Richtlinien. API-Scope für Policies fehlt mir → dein Klick.)*
- [ ] **Zahlungsarten sichtbar** (TWINT/Karten) + **SSL** (hat Shopify).

### 2. Feed radikal entschlacken (von 106k auf sauber)
- [ ] Google-Kanal → **nicht den ganzen Katalog** einspeisen. Stattdessen **nur kuratierte Kollektionen**:
      `damen-mode`, `fur-sie`, `fur-ihn`, `luxestyle-premium`, `bestseller-shop`, `schuhe`, `premium-beauty`.
- [ ] **Sticker/Magnete/POD-„Selbst gestalten"/Mini-Artikel** aus dem Feed nehmen (blähen + wirken billig).
- [ ] **Mehrere Märkte/Sprachen** prüfen: nur **CH/de** einspeisen, nicht alle Länder (multipliziert den Feed).
- [ ] Shopify → Google-Kanal → „Produkt-Verfügbarkeit/Feed-Regeln" → auf die Kollektionen begrenzen.
      *(Kanal-Konfig = Marketing/Theme-Session; die Produkt-Felder/Marke/Barcode sind von mir schon sauber.)*

### 3. Produkt-Konsistenz (grösstenteils erledigt)
- [x] **Marke = echter `vendor`** (YSL/MK/Casio…) + **EAN-Barcodes** (79 Produkte) ✓ (von mir gesetzt).
- [x] Premium-Produkte: saubere Bilder, Beschreibungen, CHF-Preise ✓.
- [ ] Falls Restbestände mit „MADE IN CHINA"/Fremdtext/kaputten Bildern auftauchen → archivieren (Misrepresentation-Risiko).
      Katalogweit prüfbar mit `automation/image-audit.mjs` (braucht `GEMINI_API_KEY`).

### 4. Erst JETZT: Re-Review beantragen
- [ ] Merchant Center → Konto-Status → **„Erneute Überprüfung beantragen"**. Bearbeitung 3–7 Tage.
- [ ] Nach Freigabe: **Free Listings AN** (Wachstum → Listings) + **Domain verifiziert** (siehe `GOOGLE-MERCHANT-VERIFY-GUIDE.md`).

---

## 🤝 Aufgabenteilung
| Aufgabe | Wer |
|---|---|
| Policies/Impressum/Kontakt + E-Mail-Tippfehler | **USER** (Admin, API-Scope fehlt mir) |
| Feed auf saubere Kollektionen begrenzen + nur CH/de | **Marketing/Theme-Session** (Kanal-Konfig) |
| Produkt-Felder (Marke/Barcode/Bilder/Texte) | **Produkt-Session (ich)** — erledigt |
| Re-Review-Klick | **USER** (Merchant Center) |

## ⏱️ Realismus
Eine Entsperrung dauert **3–7 Tage** nach sauberem Re-Review. Bis dahin laufen **Meta/TikTok organisch** (Worker) + die **gratis CH-Kanäle** (`GRATIS-WERBUNG-SCHWEIZ.md`: tutti.ch, FB-Gruppen) als Reichweite weiter — die brauchen **kein** Merchant Center.
