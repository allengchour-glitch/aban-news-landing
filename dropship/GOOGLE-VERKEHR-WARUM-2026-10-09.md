# Warum so wenig Google-Besuche? (09.10.2026, Betreiber «nur 18 google suche ist wenig warum»)

## Gemessen

**Google-Sitzungen aus der Schweiz** (ShopifyQL, `referrer_name = google`, `session_country`):

| Monat | Juni | Juli | August | September | Oktober (1.–9.) |
|---|---|---|---|---|---|
| Sitzungen | 22 | 127 | 104 | 75 | 23 (≈ 77/Monat) |

- Die Wochenkurve zeigte im Juli bis zu 183. Davon kamen aber 115 aus den USA und weitere aus PL, CA, JP, MX usw.
  Für den Shop zählen nur die Schweizer Besuche, und die liegen seit August bei 20–25 pro Woche.
- **Die 18 waren eine Woche**. In 30 Tagen waren es 91 (2 Warenkörbe, 1 Kauf). Bing 7, DuckDuckGo 6.
- **Wo Google-Besucher landen** (30 T): Produktseite 71, Startseite 15, Kollektion 5, **Ratgeber 0**.
  - Fast alles kommt über Produkteinträge: Gratis-Einträge im Shopping-Tab und Bild-/Produktsuche.
  - Die Ratgeber und die SEO-Texte bringen aus der Suche noch nichts.
- **Der Juli-Treiber ist weg:**
  - Das «Rizinusöl-Wickel-Set» brachte allein 34 der 98 Google-Produktbesuche. Heute ist es DRAFT, weil CJ es nicht in
    die Schweiz liefert (Tag `cj-nicht-versendbar-ch`). Das ist richtig so.
  - Dazu kam Saisonware: mobile Klimaanlage, Kühlmatten, Pool-Liege und Artikel zum 1. August.
- **Search Console** zeichnet laut Google-Mail vom 07.10. Impressionen erst **seit 05.10.2026** auf, dem Tag der
  Verifizierung. Suchanfragen und Klickrate sind deshalb noch nicht auswertbar. Ich habe keinen Zugang zur Search
  Console, nur ihre Mails.
- **Technik geprüft:**
  - robots.txt hat nur die Shopify-Standardsperren. Canonical ist gesetzt, hreflang de/fr vorhanden.
  - Die Sitemap hat 147 Teile, davon 106 mit Produkten.
  - Die Indexierungsmeldungen vom 07.10. (alternative Seite mit Canonical, 404, Weiterleitung, noindex) sind übliches
    Shopify-Rauschen.
- **Fehler gefunden:** `<meta name="description">`, also der Text unter dem blauen Google-Link, war **doppelt escaped**.
  - Gemessen: «Hemd &amp;amp; Wide-Leg-Hose». Google zeigt dann «&amp;» im Snippet.
  - Ursache: `page_description` liefert Shopify schon escaped. Für og:description war das behoben, für diese Zeile nicht.
  - Betroffen sind ≈ 5 % der Produkte (118 von 2'500), dazu jede Seite mit Anführungszeichen.

## Getan

- `automation/meta_beschreibung_escape.py`:
  - Die Regel entschlüsselt erst die Entitäten und escaped dann genau einmal.
  - Kanarien 3/3. Live geschrieben, Sicherung in /tmp, zurückgelesen.
  - **Ausgeliefert geprüft:** 6/6 Abrufe zeigen «Hemd &amp; Wide-Leg-Hose», also einfach escaped.
- Wächter im Aufseher (täglich `--pruefen`): Fehlt die Formel nach einem Theme-Update, schreibt er sie einmal neu.

## Warum es strukturell wenig bleibt (Einschätzung, an den Zahlen oben)

1. **Gratis-Einträge entscheiden über Preis, Lieferzeit, Bewertungen und Bilder.**
   - Schweizer Händler liefern in 1–2 Tagen. Die meisten CJ-Artikel brauchen 10–20 Werktage.
   - Store-Quality September (Mail 29.09.): Gesamt «Great», «Images per offer» aber «Incomplete».
   - Es gibt keine Produktbewertungen im Feed: 0 verifizierte Judge.me-Käufe, und Googles Bewertungsprogramm braucht
     viele Bewertungen.
2. **Neue Domain, kaum Verweise.** Die 52'000 Lieferantenprodukte stehen mit ähnlichen Texten in vielen anderen Shops.
   Google rankt davon wenig. Ratgeber brauchen Monate.
3. **Saison:** Der Sommer brachte Klima- und Pool-Ware, der Herbst ist ruhiger.

## Hebel

| Wer | Was |
|---|---|
| Betreiber | **Search Console → Leistung** (Suchanfragen, Seiten, CTR) nach ~2 Wochen als Export/Screenshot. Erst dann lässt sich gezielt an Titeln arbeiten |
| Betreiber | **Merchant Center → Versand: Lieferzeit** eintragen. Die Scorecard meldete im September «Lieferzeit fehlt» |
| Ich | Google-Kanal auf Ware schärfen, die in Google gewinnen kann: CH-Lager (Fortura, Blitzversand 1–3 Tage), Saison Herbst/Weihnachten, Preis vs. Galaxus/Zalando. Nächste Verbesserungsrunden |
| Ich | Weiterhin Google-Blocker abbauen (752, davon 504 in Prüfung bzw. ohne genanntes Ziel) und die Feinkategorien halten |
