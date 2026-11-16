# Auftrag: 11 Einsprüche im Google Merchant Center (für den Besitzer oder PC-Claude)

**Warum von Hand:**
- Der Besitzer hat am 16.11.2026 den Einspruch für diese 11 Produkte freigegeben.
- Über die Schnittstelle geht er nicht: Googles Methode `triggeraction` ist nur für freigeschaltete Projekte offen. GEMESSEN 16.11. 20:25 UTC: 18 von 18 Aufrufen HTTP 403. QUELLE: Google-Doku zu `issueresolution.triggeraction`.

**Wo:** Merchant Center → Produkte → «Überprüfung erforderlich» (oder «Diagnose»). Dort die Gruppe öffnen, das Produkt wählen und «Überprüfung anfordern» bzw. «Meiner Meinung nach liegt kein Problem vor» anklicken.

**Wichtig:**
- Für «Tabak» und «Schusswaffen» **nicht** die Gruppen-Aktion für alle Produkte nehmen. Sonst gilt der Einspruch auch für das Zigarren-Etui (echtes Tabakzubehör), zwei Nachtsichtgeräte und den Switch-Gunstock. Bei diesen hat Google recht oder es ist strittig.
- Für «Lebende Tiere» ist die Gruppen-Aktion in Ordnung. Alle Produkte dort sind Zubehör für Haustiere.
- Meist trägt nur der französische Eintrag (fr) das Problem. Pro Produkt genügt ein Einspruch je Eintrag, der das Problem zeigt.

## Tabakprodukte und Zubehör für Tabakkonsum (einzeln, 6 Produkte)

Grund wählen: **«Das von mir präsentierte Produkt ermöglicht nicht direkt den Tabakkonsum oder fördert ihn»**

1. Automatischer Seifenspender
2. Magnetischer Seitenhalter für Monitor & Handy · Aluminium (bei Google auch «Doppeldisplay-Halter»)
3. Magnetische Handyhalterung mit Ladefunktion
4. Mini Lockenstab mit USB-Ladefunktion
5. Handyhalterung mit kabelloser Ladefunktion
6. Automatischer Lockenstab, USB-Ladefunktion

**Nicht anklicken:** Cigarren-Etui aus PU-Leder.

## Lokale Anforderungen: Lebende Tiere (4 Produkte, Gruppe erlaubt)

Grund wählen: **«Das von mir präsentierte Produkt ist kein lebendes Tier, sondern ein tierbezogenes Produkt»**

7. Musikalischer Hüpfball für Hunde
8. Halsbandglöckchen für Haustiere (2er-Set)
9. Multifunktions-Hundeleine mit Puffer
10. Schnüffelteppich für Hunde

## Schusswaffen und Schusswaffenteile (einzeln, 1 Produkt)

Grund wählen: **«Mein Produkt entspricht den Richtlinienanforderungen»**

11. Bluetooth Pedometer-Uhr

**Nicht anklicken:** Infrarot-Nachtsichtgerät 1080p, Binokulares Infrarot-Nachtsichtgerät, Game Gunstock für Nintendo Switch.

## Danach

- Einen Satz an Claude schicken, zum Beispiel «11 eingereicht» oder welche nicht gingen. Claude liest dann mit `merchant-bildprobleme.yml` (Modus `laender`) neu.
- Google prüft in einigen Tagen.

**Alternative ohne Klicks:** Über das «Shopping API Support Form» die Freischaltung von `triggeraction` für das Projekt `aban-imagen` beantragen. Danach kann Claude Einsprüche selbst auslösen (Werkzeug `automation/merchant_fehler_beheben.py` ist fertig).
