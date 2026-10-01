# Meta-Anzeigen: Schulden-Plan Schweiz

Nach dem Rezept aus „i tried selling $27 ai digital products using claude“ (Alex, 23.09.2026):
schmerzhafte Nische, interaktives Werkzeug, Verkaufsseite, 3 Bild-Anzeigen testen.
Das Video meldet 4 Verkäufe für USD 108 bei USD 68 Werbekosten in 24 Stunden. Das ist ein einzelner Tag
eines Kanals, der die verwendeten Werkzeuge per Affiliate-Link verkauft. Als Erwartung taugt es nicht.

## Vor dem ersten Franken Werbung

1. **Kauf-Link muss funktionieren.** Solange das GitHub-Secret `STRIPE_API_KEY` kein geheimer Schlüssel
   ist, zeigt der Kaufen-Knopf nur auf den Shop mit „bald verfügbar“. Werbung vorher = Geld verbrennen.
2. **Kein Meta-Pixel auf abannews.com.** Meta kann deshalb nicht auf „Käufe“ optimieren wie im Video.
   Für den Test die Kampagnen-Zielsetzung **Traffic → Zielseitenaufrufe** wählen und Verkäufe im Stripe-
   Dashboard zählen. Wer dauerhaft wirbt, braucht zuerst Pixel + Cookie-Hinweis (DSG/DSGVO).
3. **Zielseite:** `https://abannews.com/schulden-oder-investieren.html` (Gratis-Rechner + Produkt).

## Die 3 Anzeigen

Bilder: `anzeige-1.png`, `anzeige-2.png`, `anzeige-3.png` (1080 × 1080). Neu erzeugen:
`node tools/schulden/anzeigen.mjs` (Playwright, siehe Kopf der Datei). Alle Zahlen stammen aus dem Rechner
(`tools/schulden/engine.js`) und sind dort nachrechenbar.

| Nr. | Primärtext | Überschrift | Beschreibung |
|---|---|---|---|
| 1 | CHF 300 übrig im Monat: in die Tilgung oder ins Depot? Der Gratis-Rechner zeigt in 2 Minuten, ab welcher Rendite sich Investieren überhaupt lohnt. Rechnet im Browser, ohne Anmeldung. | Tilgen oder investieren? | Gratis-Rechner für die Schweiz |
| 2 | Ein Kleinkredit zu 7.9 % ist eine sichere Rendite von 7.9 %, wenn man ihn tilgt. Ein Depot müsste Jahr für Jahr mehr als 8.2 % bringen, um mitzuhalten. Mit eigenen Zahlen nachrechnen. | Ab 8.2 % lohnt sich Investieren | Rechner mit Schuldzinsabzug |
| 3 | CHF 200 mehr pro Monat auf einen Kredit von CHF 15'000 zu 7.9 %: 20 Monate früher schuldenfrei und CHF 1'094 weniger Zins. Der Schulden-Plan rechnet das für alle Kredite zusammen. | 20 Monate früher schuldenfrei | Lawine oder Schneeball |

## Regeln, an denen Meta Anzeigen ablehnt

- **Keine persönlichen Eigenschaften unterstellen:** nicht „Du hast Schulden?“, „Deine Kreditkarte …“.
  Stattdessen über die Sache reden („Ein Kleinkredit zu 7.9 % …“). Alle 3 Texte oben halten das ein.
- **Keine Heilsversprechen:** nicht „schuldenfrei in 30 Tagen“, nicht „garantiert“.
- Das Produkt ist ein Rechner, kein Kredit. Die Sonderkategorie „Kredit“ trifft deshalb nicht zu. Wenn Meta
  sie trotzdem verlangt, gilt: kein Alters-, Geschlechts- oder PLZ-Targeting.

## Einstellungen für den Test

- Länder: Schweiz (deutschsprachige Anzeigen), Alter 25–65, keine Interessen (breit lassen).
- Budget: CHF 10–15 pro Tag, 3 Anzeigen in **einer** Anzeigengruppe, 4 Tage laufen lassen.
- **Abbruch-Regel:** Nach CHF 60 Werbekosten ohne Verkauf stoppen. Liegt der Preis pro Zielseitenaufruf
  über CHF 1.50, stoppen und das Bild wechseln.
- **Weiter nur, wenn:** Umsatz ≥ Werbekosten. Stripe-Gebühren und MWST (ab CHF 100'000 Umsatz) mitrechnen.
