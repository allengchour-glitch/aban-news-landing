# Befehle für Claude im Browser (PC-Claude mit Brave) · Stand 27.10.2026

Zwei getrennte Aufträge. Jeden Block einzeln in den Browser-Claude kopieren. Beide ändern nur, was dasteht.
Die Zahlen stammen von den Live-Seiten `luxestyle.ch/pages/versand-lieferung` und `luxestyle.ch/pages/rueckgabe` (am 27.10. gelesen).

---

## Block A: Google Merchant Center, Versand und Rückgabe eintragen (ERLEDIGT 27.10. 22:3x UTC, per Screenshot gegengelesen)

> Ergebnis: CH-Versand «flat_7.00» (CHF 7.00, Bearbeitung 1–3 + Transit 9–17) und «kostenloser versand» (ab CHF 50.00; Google erlaubte «gratis ab» plus Mindestwert nicht gemeinsam, darum nur Mindestwert 50.00 mit «Free shipping»). LI «LI_flat_14.90_CHF». Die Altregel «flat_15.00 … international» (nur CH, alle Produkte) wurde auf Anweisung gelöscht. Rückgabe: «Standard for Switzerland» und «Standard for Liechtenstein», beide Verified, 30 Tage, Customer responsibility, Link /pages/rueckgabe, Erstattung 14 Tage, Umtausch nicht akzeptiert. Die Gratis-Schwelle bleibt bei Google 50 (Versprechen), im Shopify-Checkout 45 (Puffer für Rabattcodes), siehe `dropship/VERSAND-SCHWELLE.md`. Offen: Google prüft die Richtlinien bis zu 10 Tage.

```
Du bist in meinem eingeloggten Browser. Ich bin Inhaber von LuxeStyle CH (luxestyle.ch).
Auftrag: Im Google Merchant Center die Versand- und Rückgabe-Angaben eintragen, die dort fehlen
(Bericht "Store quality": Delivery time, Shipping cost, Return window, Return cost = "Incomplete").

1. Öffne https://merchants.google.com, wähle das Konto von luxestyle.ch, gehe zu
   Einstellungen (Zahnrad) > "Versand und Rückgabe" (englisch "Shipping and returns").
   Wenn dort schon Versandservices stehen: nichts löschen, nichts überschreiben, nur ergänzen oder
   die fehlenden Felder füllen. Wenn die Seite von der Shopify-App verwaltet wird und gesperrt ist:
   stoppen und mir das melden.

2. VERSAND, Schweiz (CH), Währung CHF:
   - Bearbeitungszeit: 1 bis 3 Werktage
   - Transportzeit: 9 bis 17 Werktage
   - Versandkosten: CHF 7.00 pauschal
   - Gratisversand ab einem Bestellwert von CHF 50.00 (Versand dann CHF 0.00)

3. VERSAND, Liechtenstein (LI), Währung CHF:
   - Bearbeitungszeit: 1 bis 3 Werktage
   - Transportzeit: 14 bis 42 Werktage (Summe 15 bis 45 Tage, wie auf der Seite)
   - Versandkosten: CHF 14.90 pauschal, KEIN Gratisversand

4. RÜCKGABE (Rückgabeland Schweiz; gilt für Liechtenstein mit):
   - Rückgabefrist: 30 Tage
   - Rücksendekosten: Kunde zahlt (nimm die Option "Kunde zahlt die tatsächlichen Versandkosten"
     oder die nächstliegende; trage KEINEN erfundenen Pauschalbetrag ein)
   - Rückgabeart: per Post
   - Link zur Rückgabe-Richtlinie: https://luxestyle.ch/pages/rueckgabe

5. Speichern. Danach die gespeicherten Werte neu laden und mit der Liste oben vergleichen.

Regeln:
- Nichts an Zahlung, Abrechnung, Anzeigen, Nutzern oder anderen Einstellungen ändern.
- Bei Login, 2FA, Captcha oder einer unklaren Option: anhalten und mich fragen. Nichts raten.
- Wenn eine Option fehlt oder anders heisst: nenne mir die angebotenen Werte, nimm keinen Ersatzwert.

Bericht am Schluss, kurz:
- je Punkt: eingetragen / schon vorhanden / nicht möglich (mit Grund)
- ein Screenshot der gespeicherten Versand- und der Rückgabe-Seite
```

---

## Block B: Search Console, Indexierung beantragen (nächste Fünferliste)

Erst ab Mittwoch 28.10.: das Tageskontingent ("rund zehn pro Tag") ist heute mit den zehn Anträgen vom 27.10. vermutlich aufgebraucht.
Alle fünf Seiten laden mit HTTP 200 und haben 74 bis 466 Produkte (Shopify, 27.10.).

```
Du bist in meinem eingeloggten Browser. Auftrag: In der Google Search Console der Property
https://luxestyle.ch/ für diese fünf Adressen die Indexierung beantragen:

1. https://luxestyle.ch/collections/kinder-lauflernschuhe
2. https://luxestyle.ch/collections/damen-strickjacken-cardigan
3. https://luxestyle.ch/collections/herren-pullover-strick
4. https://luxestyle.ch/collections/damen-sneaker
5. https://luxestyle.ch/collections/damen-pumps

Je Adresse: search.google.com/search-console öffnen, oben bei "URL-Prüfung" die Adresse einfügen,
Enter, danach "Indexierung beantragen" wählen und den Test abwarten (dauert ca. eine Minute).
Zwischen zwei Adressen 20 Sekunden warten.

Regeln:
- Nur diese fünf Adressen, nichts anderes anklicken (kein Sitemap-Upload, keine Entfernungen).
- Meldet die Search Console "Kontingent überschritten": anhalten, notieren, bei welcher Adresse das war.
- Steht bei einer Adresse schon "URL ist bei Google" und "Indexiert": nicht erneut beantragen, nur melden.

Bericht: je Adresse "beantragt", "schon indexiert" oder "Kontingent erschöpft".
```

---

## Block C: alte Rückgaberegel «luxestyle return policy» aufräumen (zusammen mit Block B am 28.10.)

Im Merchant Center steht unter «Standard for Switzerland» eine Unterzeile «luxestyle return policy» mit «30 days» und «Free» (0 Produkte, laut Browser-Claude). «Free» widerspricht der Seite (Kunde zahlt die Rücksendung).

```
Öffne im Merchant Center Versand und Rückgabe > Rückgaberichtlinien. Prüfe die Zeile «luxestyle return policy»
(30 days, Free): Wie viele Produkte nutzen sie, hat sie ein Rückgabelabel, und was bedeutet das «+ 1» in der Zeile
«Standard for Switzerland»? Hat sie 0 Produkte und kein Label, lösche genau diese eine Richtlinie (hiermit erlaubt).
Sonst nichts löschen, sondern melden. Danach beide Zeilen (Schweiz, Liechtenstein) neu laden und abfotografieren.
```

---

Hinweis: Das Theme `212645413255` (neue Startseite) hat der Besitzer am 27.10. um 21:09 UTC selbst veröffentlicht; ein Veröffentlichen-Befehl ist nicht nötig. Rückfall bei Problemen: Theme `212591444359`.
