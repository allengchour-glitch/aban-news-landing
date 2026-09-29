# Google Merchant — Stand und Arbeit 29.09.2026 (Betreiber: «google merchant sachen»)

Quelle: Google-Diagnosen der App «Google & YouTube» (`product.feedback`), Vollscan 28.09. 18:21 UTC über 49'544 aktive
Produkte (`automation/google_feedback_wache.py`, Bericht `dropship/GOOGLE-FEEDBACK.md`).
**1'078 Gratis-Eintrag-Blocker = 2,2 % des Katalogs.** Meldungen nur für Shopping-Anzeigen (24'189, «Over capacity CSS»)
betreffen die Gratis-Einträge nicht.

| Klasse | Produkte | Befund | Getan |
|---|---:|---|---|
| Inappropriate image | 439 | Stichprobe 24: Totenkopf/Horror (Halloween), freizügige Modelfotos, 2× Lieferantentext/Wasserzeichen, einige ohne erkennbaren Grund. 246 davon hat das OCR schon als textfrei geprüft → Google meint das **Motiv**, nicht Text | — (Motiv = Produkt; Bildtausch hilft nicht) |
| Product page unavailable | 256 | 40/40 kaufbar, HTTP 200; Crawler-Sicht nicht messbar | **A/B-Versuch** 128 Tag / 128 Kontrolle (`gfeed_nachpruefen.py`), Auswertung automatisch |
| Title under review / Image under review | 137 / 16 | Google prüft noch — zeitlich | abwarten |
| Personalized advertising (hardships/sexual/legal/belief) | 131 | betrifft personalisierte **Anzeigen**, Gratis-Eintrag meist eingeschränkt sichtbar | — |
| Restricted adult / Adult-oriented | 59 | Dessous/Erotik-nah | — (Betreiber-Sortiment) |
| **Image too small** | 23 | **Hauptbild überall gross genug (500–1920 px); klein waren Zusatzbilder (40×40 … 248×400)** — `bild_klein_fix.py` prüfte nur das Hauptbild | **54 Mini-Zusatzbilder (<250 px) in 23 Produkten entfernt**, 49 Variantenbilder geschützt, alle URLs in `dropship/_bild_mini_entfernt.tsv`; `bild_mini_entfernen.py` täglich im Aufseher |
| Promotional overlay | 9 | 5 vom OCR als sauber gelesen (stilisierter Text), 2 schon umgestellt, 2 nur Textbilder | offen (klein) |

## Was nur der Betreiber im Merchant Center sehen/tun kann
- Konto-Ebene: Warnungen/Sperren, Website-Bestätigung, Versand- und Rückgabe-Einstellungen (Merchant Center → «Diagnose»).
- «Over capacity for Shopping ads (CSS program)» = nur Anzeigen; für den Gratis-Weg nichts zu tun.

## Nachtrag 08:25 UTC — Werkzeuge melden jetzt ihren Fehlergrund
`bild_mini_entfernen.py` und `gfeed_nachpruefen.py` verschluckten in gql() jede Ausnahme (Befund zweites Gehirn, Klasse grund-verschluckt). Jetzt: letzter Grund in stderr + in der Abbruchmeldung (Test falscher Token → «401 Unauthorized»).

## Nachtrag 16:50 UTC — A/B-Ergebnis «Product page unavailable» (Google-Vollscan 16:45 UTC)
| Gruppe | vorher | noch blockiert | frei |
|---|---|---|---|
| A (Tag = Produkt-Update, 05:17 UTC) | 128 | 93 | **35 (27 %)** |
| B (Kontrolle, unverändert) | 128 | 126 | 2 (1,6 %) |
Ein harmloses Update lässt die App «Google & YouTube» die Seite neu einreichen; die Meldung war meist ein Altbefund.
Kontrollgruppe B (126) um 16:46 nachgezogen. Neuer Tageswächter `automation/gfeed_anstupsen.py` (im Aufseher): jedes aktive
Produkt mit dieser Meldung höchstens alle 7 Tage anstossen (Tag `gfeed-anstupsen-JJMMTT`, alte `gfeed-…`-Tags weg), Ledger
`dropship/_gfeed_anstupsen.tsv`. Nebenbefund desselben Scans: «Image too small» 23 → **2** (bild_mini_entfernen wirkt),
«Inappropriate image» 439 → 300.
