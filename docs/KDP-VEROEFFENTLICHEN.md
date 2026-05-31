# Anti-Hype auf Amazon KDP veröffentlichen

Schritt-für-Schritt-Anleitung, um das eBook *Anti-Hype* als **Kindle-eBook** und
als **Taschenbuch** über Amazon Kindle Direct Publishing (KDP) zu verkaufen.
Alle Dateien, auf die hier verwiesen wird, baut dieses Repo selbst — du lädst sie
nur hoch.

> Ehrlich vorweg: KDP bringt keinen Selbstläufer-Traffic. Der Verkauf läuft über
> deinen Newsletter, deine Seite (`buch.html`, *pay what you want*) und Geduld.
> KDP ist ein zusätzlicher Kanal, kein Wunder.

## Was du brauchst

- Ein kostenloses KDP-Konto auf [kdp.amazon.com](https://kdp.amazon.com).
- Einmalig: Steuerangaben (Steuer-Interview im Konto) und eine IBAN für die
  Auszahlung. Ohne das zahlt Amazon nicht aus.
- Die fertigen Dateien aus `downloads/` (siehe unten).

## Die Dateien (vorher bauen)

```bash
pip install reportlab pillow
python3 generate_ebook.py            # eBook-PDF + ePub (alle Sprachen)
python3 generate_kdp_print.py        # Taschenbuch-Innenteil (Deutsch)
python3 generate_kdp_cover.py        # Kindle-Frontcover
python3 generate_kdp_wrap_cover.py --pages 27   # Taschenbuch-Wraparound-Cover
```

| Produkt | Datei | Hinweis |
|---------|-------|---------|
| Kindle-Innenteil | `downloads/anti-hype-ebook.epub` | KDP akzeptiert ePub direkt |
| Kindle-Cover | `downloads/kdp-cover-ebook.png` | 1600×2560 px |
| Taschenbuch-Innenteil | `downloads/anti-hype-print-de.pdf` | Trim 12,7 × 20,32 cm (5"×8"), aktuell **27 Seiten** |
| Taschenbuch-Cover | `downloads/kdp-cover-paperback.png` | Wraparound inkl. Rücken + Anschnitt |

**Einzige Quelle der Wahrheit:** Der Buchtext steht in `generate_ebook.py`
(`CONTENT`). Änderst du ihn, ändern sich eBook **und** Print zugleich. Die
Seitenzahl kann sich dadurch verschieben — dann das Wraparound-Cover mit der
neuen Zahl neu bauen.

## Teil 1 — Kindle-eBook

1. KDP → **Create** → **Kindle eBook**.
2. **Language:** Deutsch. **Title:** `Anti-Hype`. **Subtitle:**
   `Wie deutsche Solopreneure KI ohne Bullshit einsetzen`.
3. **Author:** `Aban (Allen Chour)`.
4. **Description:** kurzer Klappentext (Vorlage unten). Keine erfundenen Zitate.
5. **Keywords (7 Felder):** z. B. `KI für Selbstständige`, `KI ohne Hype`,
   `ChatGPT Solopreneur`, `KI DACH`, `Produktivität KI`, `KI Tools deutsch`,
   `Newsletter KI`.
6. **Categories:** zwei passende wählen (z. B. *Computer & Internet → Künstliche
   Intelligenz* und *Wirtschaft → Selbstständigkeit*).
7. **Manuscript:** `anti-hype-ebook.epub` hochladen. **Cover:**
   `kdp-cover-ebook.png`.
8. Im Previewer durchblättern.
9. **Preis & Tantieme:** Für die 70-%-Stufe muss der Preis zwischen **2,99 € und
   9,99 €** liegen. Empfehlung zum Start: **3,99 €**. Eine eigene ISBN ist beim
   Kindle-eBook **nicht** nötig.

## Teil 2 — Taschenbuch

1. Beim Buch → **Create Paperback** (oder separat anlegen, gleiche Metadaten).
2. **ISBN:** „Assign me a free KDP ISBN" wählen (kostenlos).
3. **Print options:** Schwarz-weiß auf weißem Papier, **Trim Size 5 × 8 in
   (12,7 × 20,32 cm)** — genau das Format, das `generate_kdp_print.py` baut.
4. **Manuscript:** `anti-hype-print-de.pdf` hochladen.
5. **Cover:** `kdp-cover-paperback.png` hochladen (fertiger Wraparound).
6. **Wichtig — Rückenbreite:** KDP zeigt nach dem Upload die *endgültige*
   Seitenzahl. Weicht sie von 27 ab, das Cover neu bauen:
   `python3 generate_kdp_wrap_cover.py --pages <KDP-Zahl>` und erneut hochladen.
   (Bei dieser geringen Seitenzahl bleibt der Rücken ohnehin ohne Text.)
7. Previewer prüfen (Ränder, Bund), dann Preis setzen — KDP nennt die
   Mindest-Druckkosten; darüber wählst du deine Marge.

## Beschreibung (Klappentext-Vorlage)

> Die meisten KI-Ratgeber verkaufen dir ein Gefühl. Dieses Buch nicht.
> Aus über 200 Ausgaben eines täglichen KI-Newsletters für DACH-Profis: ein
> Denkmodell, das Substanz von Show trennt, plus konkrete Abläufe, die wirklich
> Zeit sparen. Der 3-Fragen-Bullshit-Filter, dein minimaler KI-Stack, fünf
> Abläufe für den Alltag, sieben Hype-Fallen, eine 5-Minuten-Datenschutz-Prüfung
> — und eine Werkstatt mit Kopier-Vorlagen, einem durchgerechneten Arbeitstag und
> einem Klartext-Glossar. Für Selbstständige, die mit KI Geld verdienen wollen,
> nicht darüber reden. Kein Affiliate-Müll, keine erfundenen Erfolgsgeschichten.

## Nach dem Launch

- In `js/buch-config.js` `KDP_URL` auf die Amazon-Produktseite setzen. Dann
  erscheint der **„Auf Amazon (Kindle/Print)"**-Button automatisch auf
  `buch.html` (in allen vier Sprachen) — der *pay-what-you-want*-Download bleibt
  parallel bestehen.
- Im Newsletter und auf der Seite ankündigen. Bewertungen ehrlich entstehen
  lassen — niemals selbst erfinden oder kaufen.

## Weitere Sprachen

`generate_kdp_print.py de en` baut zusätzlich die englische Print-Datei. Aktuell
ist nur die **deutsche** Ausgabe auf vollen Buchumfang ausgebaut; en/fr/it sind
noch die kompakten Fassungen. Vor einer fremdsprachigen KDP-Veröffentlichung dort
erst den Inhalt in `CONTENT` erweitern.
