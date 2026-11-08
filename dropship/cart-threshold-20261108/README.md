# Warenkorb-Freiversand: enger Korrekturkandidat vom 08.11.2026

Status: **lokal geprüft, nicht im Shopify-MAIN-Theme angewendet**.

## Live-Befund

Der direkt gelesene Shop-Quelltext enthält aktuell diese Rechnung:

```js
var SCHWELLE=5000, VERSAND=700, letzt=null;
var gratis=chl||tot>=5000,
    rest=gratis?0:Math.max(5556-sub, Math.floor(((5000-tot)*10+8)/9));
```

Bei CHF 22.90 Warenwert und dem im Warenkorb sichtbaren 10-%-Abzug ergibt das
fälschlich CHF 32.66 Restbetrag. Bei CHF 27.90 werden CHF 27.66 angezeigt. Die
Rechnung behandelt CHF 50 als Schwelle **nach** Rabatt und rechnet dadurch auf
CHF 55.56 Warenwert hoch.

Die dokumentierte LuxeStyle-Regel trennt zwei Werte:

- öffentlich: Gratisversand ab CHF 50 Warenwert;
- Shopify-Tarif: gratis ab CHF 45 nach Rabatt.

Der Korrekturkandidat in `automation/lib/cart_shipping_progress.mjs` verwendet
daher `WARENWERT=5000` für Text und Balken sowie `TARIF=4500` für die
Versandentscheidung. Die zwei gemessenen Warenkörbe zeigen damit CHF 27.10 und
CHF 22.10; CHF 50 mit WELCOME10 ergibt CHF 45 und Gratisversand.

## Sichere Anwendung

`patchThemeSource(source)` bearbeitet nur eine **frisch gelesene lokale Kopie**
der aktuellen Theme-Datei. Vier exakte Fragmente müssen je genau einmal
vorliegen; bei Abweichung bricht die Funktion ohne Kandidat ab. Das Modul hat
keinen Netzwerk- oder Shopify-Schreibpfad.

Vor einer produktiven Übernahme sind weiterhin nötig:

1. aktuelle MAIN-Datei frisch lesen und Hash sichern;
2. den kleinen Diff gegen genau diese Datei prüfen;
3. erst mit legitimem Theme-Schreibzugang anwenden;
4. CHF 22.90, CHF 27.90 und CHF 50 mit und ohne WELCOME10 im Drawer und auf der
   Warenkorbseite prüfen;
5. Checkout-Tarif für eine Schweizer Adresse gegenlesen.

Die öffentliche CHF-50-Schwelle, die interne CHF-45-Schwelle und bestehende
Versandtarife werden durch diesen Branch nicht geändert.

## Test

```bash
node --test automation/lib/cart_shipping_progress_test.mjs
```
