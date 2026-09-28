# «mach webseite sauber» — Prüfung 28.09.2026

**Gemessen (echte Besucher-IP über Hetzner, mobil 390 px, ganze Seite + WebFetch + Admin-API):**
- Startseite, Kollektion Halloween und Produktseite (Rizinusöl-Wickel): keine Fehlertexte, kein seitliches Scrollen, Preise sichtbar, Versandzusage richtig.
- Produktreihen: gefüllt (WebFetch listet Produkte unter Trend, Herbst, Halloween, Bestbewertet). Die leeren Flächen auf dem Ganzseiten-Foto kommen vom verzögerten Nachladen.
- «Shop nach Kategorie»: 16/16 Kataloge im Onlineshop veröffentlicht, mit Bild, gefüllt.
- Hauptmenü: 175 Einträge, alle Links führen auf veröffentlichte, gefüllte Kollektionen (`menue_links.py`).
- Bewertungs-Karussell: 15 Bilder, alle HTTP 200.

**Behoben:**
- Die Überschrift der Bewertungs-Sektion lautete «Das sagen unsere Kundinnen und Kunden» (4.28 von 5 · 13'818 Bewertungen). Die Bewertungen sind aber echte, übersetzte Kommentare von CJ-Käufer:innen, nicht von unserer Kundschaft. Das ist irreführend (UWG).
- Neu steht dort: «Das sagen Käuferinnen und Käufer zu unseren Produkten» mit dem Hinweis «Bewertungen von Käufer:innen dieser Produkte, teils vom Hersteller übernommen und ins Deutsche übersetzt.»
- Die Live-Datei wurde vorher gesichert, die Änderung ist zurückgelesen.
- Auftragskasten: `merge.directoryRenames=false`. Ein leerer `auftraege/offen/` liess git neue Aufträge nach `erledigt/` verschieben.

**Vorschläge (Betreiber-Entscheid, grosse sichtbare Änderung):**
1. Startseite straffen: 25 Sektionen, rund 12'000 px auf dem Handy. Kandidaten zum Ausblenden: pl_kinder, pl_senioren, pl_spass_gadgets, pl_wechsel_taschen, product_list_L3EDnA, pl_querbeet.
2. Hauptmenü von 175 auf rund 40 Einträge kürzen (Hauptkategorien plus wenige Unterpunkte).
