# Liechtenstein im Google Merchant Center — Anleitung (Betreiber-Klick, ca. 5 Minuten)

Stand 22.10.2026. Anlass: Betreiber «anleitung lichtenstein und link».

## Link

**Merchant Center, Konto 5797470070:** https://merchants.google.com/mc/overview?a=5797470070
(Konto-Nummer aus `dropship/COWORK-BEFEHL.md`; der Link öffnet die Übersicht, die Seiten darunter wählst du über das Menü. Einen Direktlink auf die Versand-Seite gebe ich nicht an, weil ich ihn nicht geprüft habe.)

## Worum es geht (GEMESSEN)

- `dropship/GOOGLE-FEEDBACK.md` (Scan 22.10. 08:09 UTC): **«Missing shipping info in some countries [LI]»: 28'745 Produkte.** Die Schweiz ist **nicht** betroffen — für CH gibt es keine Versand-Meldung, nur für das Lieferland LI.
- In Shopify ist Liechtenstein seit 09.10. eingerichtet: Markt «Switzerland» = CH + LI, Zone «Liechtenstein» **CHF 14.90**, kein Gratisversand, Lieferzeit 15–45 Tage.
- Google übernimmt diesen Tarif nicht von selbst: Shopify importiert die Versandsätze nur für das **eine** Zielland des Kanals (QUELLE Shopify Help, help.shopify.com/en/manual/online-sales-channels/google/requirements). «Versand neu importieren» half in 9 Tagen nicht (GEMESSEN).

## Entscheidung

| | Wirkung | Aufwand |
|---|---|---|
| **A) Nichts tun** | Schweiz bleibt unberührt; die Produkte erscheinen in den Gratis-Einträgen nur nicht für Liechtenstein (kleiner Markt). | 0 |
| **B) LI-Versanddienst von Hand anlegen (unten)** | Die LI-Meldung sollte verschwinden, Liechtenstein wird in den Gratis-Einträgen möglich. | ca. 5 Min |

Meine Empfehlung: B, weil es nichts kostet und CH nicht berührt. Zwei Vorbehalte, beide **UNBELEGT**: (1) QUELLE Google (support.google.com/merchants/answer/14232591) sagt, der Shopify-Abgleich «may overwrite manual updates» — ob der LI-Dienst überlebt, zeigt erst der nächste Scan. (2) Die Menüwörter unten sind aus der Doku, nicht von deinem Bildschirm; heissen sie anders, such das Gleichwertige.

## Klickweg B

1. Link oben öffnen → Menü links **Einstellungen** (Zahnrad) → **Versand und Rückgaben**.
2. **Nicht** den bestehenden Schweizer Dienst ändern. Oben **Versanddienst hinzufügen** (oder «Neuer Versanddienst»).
3. Ausfüllen:
   - Name: `Liechtenstein CHF 14.90`
   - Lieferland: **Liechtenstein** (nur dieses)
   - Währung: **CHF**
   - Versandkosten: **fest 14.90**, **ohne** «kostenlos ab Betrag» (so steht es in Shopify)
   - Bearbeitungszeit: **gleich wie beim Schweizer Dienst** (dort ablesen)
   - Lieferzeit: so, dass **Bearbeitung + Lieferzeit = 15–45 Tage** ergeben (Shopify-Zone Liechtenstein)
   - Gilt für: alle Produkte
4. Speichern. Screenshot der Seite «Versand und Rückgaben» an die Sitzung schicken.
5. Nichts am Shopify-Markt ändern: **Liechtenstein bleibt dort Lieferland.**

## Nachmessung (macht die Sitzung)

- Nach 1–2 Tagen: `google_feedback_wache.py` zählt «Missing shipping info … [LI]» neu (heute 28'745). Fällt die Zahl deutlich, hat B gewirkt.
- Bleibt sie gleich oder steigt sie wieder, hat der Shopify-Abgleich den Dienst überschrieben → dann ist A die ehrliche Antwort (nichts tun, LI-Meldung hinnehmen).
- Ergebnis kommt hierher und in die Journal-Zeile.

## ERLEDIGT 22.10.2026 (Betreiber-Screenshot, Merchant Center «Shipping and returns»)
- Neuer Versanddienst **«Liechtenstein CHF 14.90»**: Sichtbarkeit grün, Status **Complete**, Kosten **Flat**, Lieferzeit beginnt bei **15** (die Spalte war im Screenshot abgeschnitten — die Obergrenze ist nicht gesehen, soll 45 sein).
- Die drei bestehenden Schweizer Dienste (`flat_7.00_CHF…`, `price_based_CHF…versand`, `flat_15.00_CHF…`) stehen unverändert, Lieferzeit je ab 10.
- **Ausgangswert für die Nachmessung:** «Missing shipping info in some countries [LI]» = **28'745** (Google-Scan 22.10. 08:09 UTC), Free-Listings-Blocker CH = 41.
- Nachmessung: nächster Vollscan (`google_feedback_wache.py`, täglich) am 23.10.; Erinnerung der Sitzung 23.10. 10:00 UTC. Fällt die Zahl deutlich → B wirkt. Bleibt sie → der Shopify-Abgleich hat den Dienst überschrieben oder Google braucht länger (dann am 25.10. erneut messen, bevor A als Antwort gilt).
