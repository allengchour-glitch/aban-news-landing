# Mehr Bewertungen — was geht noch? (01.10.2026, Betreiber «sammle mehr bewertungen für produkten»)

## GEMESSEN
- Judge.me: **13'851 Bewertungen**, alle importiert (echte CJ-Kommentare desselben Produkts, `cj_reviews_import.mjs`, täglich im Aufseher,
  Reihenfolge `bewertungen_prio.py`: sichtbare Reihen zuerst). Stichprobe 100: alle `source web`, `verified nothing` — **0 von eigenen Käufern**.
- Die 29 meistbesuchten Produktseiten der letzten 60 Tage (ShopifyQL, nur Menschen): **2 mit Bewertung** (Boho-Set 22, Tutu-Kleid 10).
- Die übrigen CJ-Seiten (Provence, Aurora, Sirène, Sneaker, Fleurette, Kühlmatte, Rettangolo, Herzschlag-Kissen, Leselupe, Pinguin …)
  **stehen alle schon im Import-Ledger** — CJ hat für sie **keinen einzigen Kommentar**. Kristall-Set und «Shirt selbst gestalten» haben
  keine CJ-Quelle. Der Import-Weg ist für die Seiten, die Kundinnen wirklich besuchen, **ausgeschöpft**.

## Was NICHT gemacht wird
- Bewertungen erfinden, umschreiben oder von ähnlichen Produkten übernehmen = UWG Art. 3 (Hausregel «NIE Fake-Reviews»).
- Nur gute Bewertungen zeigen (Rosinenauswahl) — seit 23.08. holt der Import alle Sterne (MIN_SCORE=1).

## Was noch geht — nur über echte Käufer
1. **Judge.me-Bewertungsanfrage nach Lieferung** (Judge.me-Admin → Settings → Review requests): an, Versand **21 Tage nach Erfüllung**
   (Lieferung aus China 10–20 Werktage — sonst fragt die Mail, bevor das Paket da ist), Erinnerung nach 7 Tagen.
2. **Gutschein für JEDE Bewertung mit Foto** (Judge.me → Review coupons), z. B. 10 % auf die nächste Bestellung — ausdrücklich unabhängig
   von den Sternen (sonst gekaufte Bewertung). Ein Kundenfoto wirkt stärker als zehn Lieferanten-Texte.
3. Betrifft heute 6 Bestellungen (4 behaltene externe Kunden + #1020/#1021) — es bleibt eine kleine Zahl, bis mehr verkauft wird.
Beides sind Einstellungen im Judge.me-Admin (die API bietet keine Einstellungs-Endpunkte) → Betreiber-Klick.
