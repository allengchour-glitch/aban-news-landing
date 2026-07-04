# BROWSER-CLAUDE AUFGABE — Google Customer Reviews Snippet in Shopify einfügen

> Für den PC-/Browser-Claude (in Shopify-Admin eingeloggt). Ziel: Google-Customer-Reviews-Opt-in aktivieren
> (kostenlose ECHTE Käufer-Bewertungen + Google-Sterne-Siegel) — greift den 0★-Trust-Blocker an.

## Schritte
1. Shopify-Admin → **Einstellungen → Checkout**.
2. Bereich **„Bestellstatus-Seite" / „Order status page" → „Zusätzliche Skripte" / „Additional scripts"** öffnen.
   (Falls neuer Checkout/Checkout-Extensibility: den Google-Customer-Reviews-Weg per App nutzen — Shopify-App-Store „Google Customer Reviews".)
3. Folgenden Snippet EINFÜGEN (unverändert — Platzhalter sind schon mit Shopify-Liquid gefüllt, delivery_country strikt "CH"):

```html
<script src="https://apis.google.com/js/platform.js?onload=renderOptIn" async defer></script>
<script>
  window.renderOptIn = function() {
    window.gapi.load('surveyoptin', function() {
      window.gapi.surveyoptin.render({
        "merchant_id": 5797470070,
        "order_id": "{{ order_number }}",
        "email": "{{ email }}",
        "delivery_country": "CH",
        "estimated_delivery_date": "{{ "now" | date: "%s" | plus: 1209600 | date: "%Y-%m-%d" }}",
        "products": [{% for line_item in line_items %}{"gtin":"{{ line_item.sku }}"}{% unless forloop.last %},{% endunless %}{% endfor %}]
      });
    });
  }
</script>
```

4. Speichern. Danach in Google Merchant Center → Customer Reviews → Opt-in-Integration verifizieren (Testbestellung ODER warten bis die nächste echte Bestellung durchläuft).
5. Zurückmelden: eingefügt ja/nein + ob Google die Integration als „aktiv/verifiziert" zeigt.

## Wichtig
- delivery_country IMMER "CH" (strikt Schweiz).
- KEINE Fake-Reviews — Google fragt nur echte Käufer nach Lieferung. Ehrlich.
- Nichts anderes am Checkout ändern.
