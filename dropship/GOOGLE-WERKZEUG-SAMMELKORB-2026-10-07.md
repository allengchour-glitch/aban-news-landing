# Google-Kategorie: Sammelkorb «Werkzeug» (07.10.2026, Verbesserungsrunde 12:25, Plan-Tag 7)

## GEMESSEN
- Neuimporte der letzten 4 h: 497, davon 490 aktiv, 483 im Google-Kanal, alle mit Google-Kategorie.
  **110 davon unter «Hardware > Tools»** (Typ «Werkzeug & Heimwerken», Tags `werkzeug`/`heimwerken`). Darunter Kalimba,
  Uhrenbeweger, Magnet-Lehrtafel, Kerzenhalter, Eierschneider, Wattestäbchen, Gitarrensaiten, LED-Licht fürs Gesicht.
- Bestand: **1'188 aktive Produkte** vom Typ «Werkzeug & Heimwerken».
  - 566 tragen ein Werkzeugwort im Titel.
  - 89 sind eindeutig etwas anderes (Kerzenformen, Backformen, Haarschneider, Kinderdeko).
  - 533 sind unklar.
- Ursache: Die CJ-Gruppe «Werkzeug» stempelt alles, was ihre Suche liefert, als Werkzeug. Es ist dieselbe Klasse wie
  der Sammelkorb «Aufbewahrung & Organizer» vom 20.08.
- Die allgemeinen Titelregeln (`kategorie_wache.TITELREGELN`) sind für diese Ware zu grob. Beispiele: «Crimpzange für
  Kabelschuhe» würde zu Schuhen, «Reifen Glanz- und Pflegecreme» zu Beauty. Sie taugen hier nicht als Umzugsregel.
- Wird das Google-Feld nur geleert, liest der Feed die Shopify-Kategorie. Die steht ebenfalls auf «Hardware > Tools».
  Nur löschen hilft also nicht; ein Umzug braucht einen positiven Zielpfad.

## GETAN
`automation/google_kategorie_umzug.py` (läuft täglich im Aufseher, eigener Bulk-Export, Ledger mit Rückweg):
1. Zuerst die vorhandenen Werkzeug-Verfeinerungen (Crimpzange → Pliers, Lineal → Measuring).
2. Dann **`WERKZEUGWORT`**: Ein echtes Werkzeug bleibt «Tools» (Feile, Schraubendreher, Schraubenschlüssel …).
3. Erst danach **`TO_KREUZ`**, 15 eindeutige Warenwörter. Ziele:
   - Fahrzeugpflege, Diagnosegerät, Starthilfe
   - Schirm, Golf, Musikinstrument, Gitarrenzubehör
   - Kerzenhalter, Kerzen- und Seifenform
   - Uhrenbeweger, Wattestäbchen
   - Staubsauger und Zubehör, Putzartikel, Küchenhelfer

   Jeder Zielpfad wird beim Start gegen Googles Taxonomie geprüft.
4. Kanarienvögel 65/65, darunter 3 Fehltreffer aus dem eigenen Trockenlauf:
   - «Schirm-Haken»
   - «Flaschenöffner für Kältemittel»
   - «Bohrstaubsauger»

   Zwei alte Erwartungen wurden korrigiert: Kerzen- und Epoxidformen gehen jetzt nach «Craft Molds» statt zu bleiben.
5. Scharf: **70 gesetzt, 0 Fehler** (63 aus Tools, 7 Haustier-Verfeinerungen). Zurückgelesen 4/4 (Kalimba ×2, Regenschirm ×2).
   Rückweg: Spalte 2 von `dropship/_google_kategorie_umzug.tsv`.
6. Wächter: Der Aufseher-Tageslauf erfasst neue Importe. Was die CJ-Gruppe morgen wieder als Werkzeug stempelt, zieht
   der nächste Lauf um.

## OFFEN
- 533 unklare «Werkzeug»-Produkte bleiben vorerst «Tools» (Autopflege-Grenzfälle, Messgeräte, Elektronikteile).
  Erweiterung nur mit neuen eindeutigen Warenwörtern plus Kanarienvogel.
- Shopify-Kategorie, Produkttyp und Tags (Kollektion «Werkzeug») der umgezogenen Produkte sind noch der alte Sammelkorb.
  Das ist eigene Klasse für die nächste Runde: `kategorie_wache` müsste «Werkzeug & Heimwerken» als Sammeltyp mit
  Werkzeugwort-Schutz führen.
- An der Quelle: Der Importer sollte die Gruppe «Werkzeug» nur bei Werkzeugwort als Werkzeug typisieren.

## Nachtrag 15:05 UTC — Shop-Seite nachgezogen (Betreiber «mache verbesserung»)
- **Neu:** `automation/werkzeug_korb_shop.py`.
  - Quelle ist allein das Umzugs-Ledger: Zeilen mit «alt = Hardware > Tools» und einem Ziel ausserhalb von Hardware.
  - Es fasst nur Produkte an, die heute noch den Typ «Werkzeug & Heimwerken» tragen.
  - Je Produkt drei Änderungen:
    - **Shopify-Kategorie:** Shopifys offizielle Zuordnung des Google-Pfads, vorher gegen die Taxonomie des Shops geprüft.
    - **Produkttyp:** über `produkttyp_vereinheitlichen.aus_kategorie`, ergänzt um zwei Zweige ohne Tabellenwert.
    - **Tags:** `werkzeug` und `heimwerken` fallen weg, das Produkt verlässt damit die Werkzeug-Kollektion.
- **Selbsttest:** 8/8.
- **Scharfer Lauf: 80 nachgezogen, 0 Fehler.** Das sind die 63 von heute und 17 aus dem Umzug vom 06.10.: Backformen, Nagelknipser, Haarschneider, Küchentuch.
- **Rücklesen 2/2:**
  - Kalimba → Musikinstrumente / Musical Instruments.
  - Regenschirm → Accessoires / Parasols & Rain Umbrellas.
  - Beide ohne Werkzeug-Tag.
  - Ein zweiter Lauf findet 0 Produkte, das Werkzeug ist also idempotent.
- **Aufseher:** läuft täglich direkt nach `google_kategorie_umzug.py`, in derselben Sperre. Neu umgezogene Produkte bekommen ihre Shop-Seite also gleich mit.
- **Rückweg:** Ledger `dropship/_werkzeug_korb_shop.tsv` mit Typ alt/neu und Kategorie alt/neu.
- **Weiter offen:**
  - Der Importer typisiert die Gruppe «Werkzeug» an der Quelle noch pauschal. Der tägliche Nachzug fängt das zwar ab, aber erst nach bis zu 24 h.
  - 533 unklare Produkte bleiben vorerst Werkzeug.
