# Aroma-Ware: Shopify- und Google-Kategorie nachgezogen (07.10.2026, Verbesserungsrunde 16:25, Plan-Tag 7 Google)

## GEMESSEN
- **Auslöser:** Die Ampel meldete «unbekannte Typen 1 (Wellness & Aromatherapie)».
- **Bestand:** 154 aktive Produkte dieses Typs. Den Typ hatte `produkttyp_vereinheitlichen` am 05.10. vergeben; vorher standen 152 Diffuser als «Beauty-Tools».
- **Shopify-Kategorie:** 150 × `hb-3-2-5` «Cosmetic Tools», 2 × `hb-3-10`, je 1 × `hb` und ohne.
- **Google-Kategorie:** **152 × «Health & Beauty > Personal Care > Hair Care»**. Luftbefeuchter liefen im Google-Feed also als Haarpflege.
- **Ursache:**
  - Am 05.10. wurde nur der Typ korrigiert; seine Geschwisterfelder (Kategorie, Google) blieben auf dem alten Stand.
  - `kategorie_wache` kannte den neuen Typ nicht. Neue Diffuser bekamen deshalb gar keine Kategorie.

## GETAN
- **Neues Werkzeug `automation/aroma_kategorie.py`:**
  - **Regel:** Der Titel wird am ersten «für» geteilt, das Kopfstück entscheidet:

    | Kopfstück enthält | Ware | Shopify-ID | Google-Kategorie |
    |---|---|---|---|
    | Befeuchter / Vernebler | Luftbefeuchter | `hg-9-1-9` | Humidifiers |
    | «diffus» | Duft-Diffuser | `hg-3-39-5` | Home Fragrance Accessories |
    | Öl | Duftöl | `hg-3-40-3` | Fragrance Oil |

  - **Kanarien 12/12.** Darunter «Pinguin-Aromadiffusor mit Duftölen» (Gerät). Dieser Fehltreffer stammt aus dem eigenen Trockenlauf.
  - **Ergebnis:** SCHARF 154 / 0 Fehler (101 Befeuchter, 50 Diffuser, 3 Duftöle). Je Produkt aus der Antwort zurückgelesen; ein zweiter Lauf findet 0.
- **`kategorie_wache.py`:**
  - Neuer Tabelleneintrag «Wellness & Aromatherapie» → `hg-3-39-5`.
  - **`typen_abgleich()`** im `--test`: meldet jeden Typ, den `produkttyp_vereinheitlichen` (TAX/VORRANG) oder `produkttyp_aus_kategorie.mjs` vergibt und die Tabelle nicht kennt.
  - Gegenprobe: Vor dem Eintrag meldete der Abgleich genau diesen Typ, danach «alle bekannt». Kanarien 26/26.
- **Aufseher:** `aroma_kategorie.py` läuft täglich nach dem Google-Umzug und erfasst auch neue Aroma-Ware.

## OFFEN
- Keine Betreiber-Klicks.
- Google prüft die neuen Kategorien beim nächsten Feed-Abgleich.
