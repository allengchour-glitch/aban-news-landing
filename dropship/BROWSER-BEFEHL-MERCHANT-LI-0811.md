# Auftrag für PC-Claude: Merchant Center, Versand für Liechtenstein (8.11.2026)

Für den PC-Claude mit Brave (Port 9222, eingeloggt, siehe `dropship/BROWSER-AGENT-SETUP.md`). Besitzer-Auftrag im Chat 8.11. («alles fix», meine Auslegung: die Merchant-Probleme beheben, die nur im Konto gehen). Hintergrund und Zahlen: `dropship/merchant-probleme-0811/README.md`.

## Befund (GEMESSEN am Export vom 08.11. 13:12)
3 201 Varianten (2 726 Produkte) tragen «Missing shipping info in some countries», nur für **Liechtenstein**. Die Schweiz ist nicht betroffen. Folge: diese Artikel erscheinen in Liechtenstein weder in Shopping-Anzeigen noch in kostenlosen Einträgen. Warum nur Liechtenstein, ist eine Vermutung: Das Merchant Center kennt keinen Versanddienst für Liechtenstein (die Länder DE und LI standen schon am 05.11. als «Setup Incomplete»).

## Grenzen (gelten vor allem anderen)
- **Nicht ändern:** Zahlungs- und Abrechnungsdaten, Konto-Inhaber, verknüpfte Google-Ads-Konten, Gewerbe- und Adressangaben, Produktdaten, Programme (Shopping-Anzeigen, kostenlose Einträge) ein- oder ausschalten. Nichts bezahlen, keine Kampagne starten.
- Bei Login-Wand, 2FA oder Sicherheitsabfrage: **anhalten** und dem Besitzer melden.
- Vor jeder Änderung den alten Zustand als Screenshot sichern, danach einen Screenshot des neuen Zustands.
- Nur die Versandeinstellung für **Liechtenstein** anfassen, den Schweizer Dienst nicht.

## Schritt 1: Lesen (nichts ändern)
1. Merchant Center, Einstellungen, **Versand und Rückgabe**: Welche Versanddienste gibt es, für welche Länder? Steht Liechtenstein irgendwo? Bildschirmfoto.
2. Merchant Center, Produkte, Diagnose: Problem «Missing shipping info in some countries», Länderliste und Zahl der Artikel. Bildschirmfoto.
3. Shopify-Admin, Einstellungen, Versand und Lieferung, Versandprofil «Allgemein»: Zone **Liechtenstein**: Tarife, Mindestbetrag, kostenloser Versand ja oder nein, Lieferzeit. **Das sind die Werte, die ins Merchant Center gehören.** Stimmen sie nicht mit Schritt 2 unten überein, gilt Shopify.

## Schritt 2: Ändern (nur wenn Schritt 1 sauber war)
Entweder **A** oder **B**; Standard ist **A**, ausser der Besitzer hat im Chat B gewählt. **Entscheid des Besitzers 10.11. ~00:00 UTC (auf gezielte Frage): A.**

**A. Versanddienst für Liechtenstein anlegen** (Merchant Center, Versand und Rückgabe, Versanddienste, neuer Dienst oder den Schweizer Dienst um das Land ergänzen, je nachdem, was die Oberfläche anbietet):
- Land: Liechtenstein; Währung CHF
- Tarif: pauschal, **CHF 14.90**, **kein** Gratisversand ab einem Betrag (so war es am 08.11. im Shopify-Versandprofil; gegen Schritt 1.3 prüfen)
- Bearbeitungszeit 1 bis 3 Werktage, Lieferzeit 15 bis 45 Tage (Wortlaut der Versandseite `luxestyle.ch/pages/versand-lieferung`; gegen Schritt 1.3 prüfen)
- Speichern, dann Bildschirmfoto.

**B. Liechtenstein aus den Zielländern nehmen** (App «Google & YouTube» im Shopify-Admin, Einstellungen, Zielländer; oder Merchant Center, Programme, Zielländer): Liechtenstein entfernen. Liechtenstein ist ein kleiner Markt (bisher 1 Bestellung, #1032). Bildschirmfoto vorher und nachher.

## Schritt 3: Prüfen und Bericht an den Besitzer (kurz, Deutsch)
- Gewählter Weg (A oder B), alte und neue Werte, Dateinamen aller Bildschirmfotos.
- Merchant Center verarbeitet Änderungen erst nach Stunden bis Tagen: die Zahl «Missing shipping info» **nicht sofort** werten. Besitzer zieht den Export «Probleme mit Artikeln» am **11.11.** neu und schickt ihn; erwartet: 0 Artikel mit «Missing shipping info».
- Was nicht ging (Oberfläche anders, Recht fehlt), offen sagen, nichts raten.
