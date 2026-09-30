# COWORK-AUFTRAG: Google Merchant Center, alles in einem Durchgang (01.10.2026)

> **Für wen:** Cowork / PC-Claude im eingeloggten Browser des Betreibers (merchants.google.com, Konto 5797470070, luxestyle.ch).
> **Warum nicht aus der Cloud:** Merchant Center braucht die Google-Anmeldung. Die Cloud-Session hat keine, und über die
> Shopify-API gibt es keinen Schreibzugriff auf Merchant-Einstellungen.
> **Regeln:** Nichts bezahlen. Keine Shopping-Ads-Kampagne starten. Nichts löschen, was nicht unten steht. Passwort/2FA
> gibt der Betreiber selbst ein. **Nie «Complete remaining actions» für Deutschland ausführen** (das schaltet DE frei).
> Jeden Schritt mit einem Screenshot quittieren; die Screenshots schickt der Betreiber in den Chat der Cloud-Session.

## Was gemessen ist (Stand 30.09./01.10.)
| Thema | Merchant Center (Stand 04.08., Gedächtnis) | Shop (live gemessen) | Befund |
|---|---|---|---|
| Länder | Feed-Länder **DE + CH** | Markt nur **CH** | DE raus |
| Versandkosten | Standardversand Schweiz CHF **7.90**, gratis ab **60** | Allgemeines Profil: Standard **7.00**; «Kostenloser Versand» ab **45** aktiv; Regel ab **50** inaktiv; Regel ab **65** vorhanden; Versandrichtlinie sagt «gratis ab CHF **50**» | Drei Zahlen, keine stimmt mit Google überein |
| Lieferzeit | **6–14** Werktage | Produktseiten: **10–20** Werktage (Direktversand ab Lieferantenlager) | Google verspricht zu schnell |
| Rückgabe | 30 Tage, gratis, verifiziert | Richtlinie: 30 Tage freiwillig, unbenutzte Ware | passt |
| Store-Qualität CH | «Great»: Versandkosten/Rückgabefrist/-kosten Exceptional, HD-Bilder Good, Bilder je Angebot Incomplete, **Lieferzeit fehlt** | — | Lieferzeit nachtragen |
| Store-Qualität DE | «Good», alle 6 Incomplete | — | verschwindet mit DE |
| Diagnosen (Free Listings) | 714 Blocker bei 49'231 aktiven (1,4 %) | — | siehe Schritt 6 |

**Schon automatisch in Arbeit (nichts klicken):** «Product page unavailable» (`gfeed_anstupsen.py`), «Image too small»
(`bild_mini_entfernen.py`), «Inappropriate image» (`google_bild_tausch.py`, Pilot bis 03.10.), Google-Kategorien
(`google_kategorie_fein.py`).

## ⚠️ Vorab-Entscheid des Betreibers (eine Zeile im Chat genügt)
**Ab welchem Betrag ist der Versand gratis: 45, 50 oder 65?** Der Shop gibt heute ab CHF 45 gratis (aktive Regel),
die Versandrichtlinie und die Texte sagen 50, eine dritte Regel steht auf 65. Google muss dieselbe Zahl zeigen wie
die Kasse, sonst droht «Mismatched shipping cost». **Empfehlung: 50** (steht schon in Richtlinie, Bannern und Reels).
Nach dem Entscheid stellt die Cloud-Session die Shopify-Regeln um; Cowork setzt in Schritt 2 dieselbe Zahl bei Google.
Solange kein Entscheid da ist: Schritt 2 auf «Versand aus Shopify übernehmen» stellen (Variante A), dann folgt Google
automatisch dem Shop.

---

## Der Auftrag (1:1 in Cowork einfügen)

```
Du arbeitest in meinem eingeloggten Browser auf merchants.google.com (Konto luxestyle.ch, ID 5797470070).
Acht Schritte der Reihe nach. Nach jedem Schritt: Screenshot. Nichts bezahlen, keine Ads-Kampagne,
nie «Complete remaining actions» für Deutschland.

1) DEUTSCHLAND ENTFERNEN
   Weg: Zahnrad/Einstellungen → «Markets» bzw. «Business info → Shipping and returns» und
   «Products → Feeds/Data sources → Shopify-Quelle → Countries». Überall, wo «Germany/Deutschland» als
   Zielland steht: entfernen. «Switzerland» bleibt.
   Falle: der Länder-Editor hat schon einmal beim Speichern ein Land verworfen → nach dem Speichern die
   Seite NEU LADEN und prüfen, dass nur «Switzerland» übrig ist.
   Quittung: Screenshot der Länderliste nach dem Neuladen (nur CH).

2) VERSAND AN DEN SHOP ANGLEICHEN
   Weg: Einstellungen → «Shipping and returns» → Versanddienst «Standardversand Schweiz».
   Variante A (bevorzugt): Gibt es «Automatically import shipping settings from Shopify» / Versand aus der
   Shopify-App übernehmen → einschalten und den manuellen Dienst deaktivieren.
   Variante B (falls A fehlt): Dienst bearbeiten → Kosten CHF 7.00, gratis ab CHF <ENTSCHEID: 50>.
   Quittung: Screenshot des Versanddienstes nach dem Speichern.

3) LIEFERZEIT EINTRAGEN (fehlt in der Store-Qualität CH)
   Im selben Versanddienst: Bearbeitungszeit 1–3 Werktage, Transitzeit 9–17 Werktage
   (zusammen 10–20 Werktage wie auf den Produktseiten). Bestellschluss: 23:00, Zeitzone Europe/Zurich.
   Werktage: Montag–Freitag. Bei Variante A: prüfen, ob Google die Lieferzeit mit übernimmt;
   wenn nicht, die Lieferzeit hier manuell ergänzen.
   Quittung: Screenshot mit der Lieferzeit.

4) RÜCKGABE NUR PRÜFEN, NICHT ÄNDERN
   Einstellungen → «Return policy»: 30 Tage, Rückgabe kostenlos, Land Schweiz. Stimmt das: nichts tun.
   Auf keinen Fall auf «nur defekte Ware» umstellen (sonst fällt «Exceptional» weg).
   Quittung: Screenshot.

5) UNTERNEHMENSANGABEN
   Einstellungen → «Business info»: Name LuxeStyle, Website https://luxestyle.ch (verifiziert + beansprucht?),
   Kundenservice-Kontakt (E-Mail info@luxestyle.ch) vorhanden? Fehlt etwas: nur die E-Mail ergänzen,
   KEINE Telefonnummer oder Adresse erfinden.
   Quittung: Screenshot «Business info».

6) DIAGNOSEN, DIE EINE HAND BRAUCHEN
   Products → «Needs attention» / Diagnostics. Liste nach Grund gruppieren und Screenshot machen.
   a) «Personalized advertising: personal hardships» (~67) und «Sexual interests» (~39): betrifft nur
      personalisierte Werbung, KEIN Einspruch — nur zählen.
   b) «Restricted adult content» (~39), «Adult-oriented content» (~7): nur zählen, nichts ändern.
   c) «Title under review» / «Image under review»: warten, nichts tun.
   d) Gibt es bei einem Grund den Knopf «Request review» für MEHR als 20 Produkte und ist der Grund
      «Inappropriate image» oder «Promotional overlay»: NICHT drücken (die Cloud tauscht die Bilder
      gerade selbst aus, Auswertung 03.10.).
   e) «6 products need to be updated» (Übersicht, falls noch da): öffnen, Screenshot mit Produktname + Grund.
   Quittung: Screenshot jeder Gruppe (Grund + Anzahl) und der 6 Produkte.

7) STORE-QUALITÄT ZURÜCKMELDEN
   «Store quality» / «Shopping experience scorecard» → Land Switzerland → Screenshot aller 6 Kennzahlen.
   Wenn Deutschland nach Schritt 1 noch gelistet ist: ebenfalls Screenshot.
   Quittung: Screenshot(s).

8) OPTIONAL: AKTION WELCOME10
   Nur wenn unter «Marketing → Promotions» ohne Kosten und ohne Ads-Konto möglich:
   Aktion «10 % auf die erste Bestellung», Code WELCOME10, Land Schweiz, gültig ab heute bis 31.12.2026,
   alle Produkte. Braucht es ein Ads-Konto oder eine Zahlung: überspringen und melden.
   Quittung: Screenshot oder «übersprungen, weil …».

Am Ende: alle Screenshots und eine Zeile je Schritt (erledigt / übersprungen + Grund).
```

---

## Was die Cloud-Session danach macht
- **Nach dem Versand-Entscheid:** Shopify-Versandregeln auf EINE Schwelle bringen (allgemeines Profil, Kasse
  mit Testkorb prüfen), Richtlinie und Banner abgleichen.
- **Nach Schritt 6e:** die 6 Produkte im Shop reparieren oder draften.
- **Nach Schritt 7:** Store-Qualität im Gedächtnis nachführen; «Bilder je Angebot» bleibt die Daueraufgabe
  (Bild-Backfill, 856 Fortura-Produkte haben beim Lieferanten nur ein Bild).
- **Messung, ob es gewirkt hat:** `google_feedback_wache.py` (täglich, Ampel-Zeile «GOOGLE: …») und die
  nächste Store-Qualität-Mail.
