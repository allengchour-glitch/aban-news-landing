# Schweizer Lieferanten mit CH-Lager — Sichtung 03.09.2026

Betreiber-Vorgabe (03.09.): «nur CJ am Anfang, sonst Schweizer Lieferant suchen. Kann auch sonst
was sein, Hauptsache Schweizer Lager.» Spocket wurde geprüft und verworfen (US/EU-Marktplatz,
Abo USD 40–300/Mt., Nicht-EU-Zoll je Lieferant, keine API-Anbindung an unseren Stack).

Stand heute im Shop: **Fortura** (CH-Lager, 2'409 aktive Artikel, 1–2 Werktage) ist der einzige
Schweizer Lieferant — im Kern Fasnacht/Party/Kostüm/Spielzeug. Was fehlt: CH-Lager für
Haushalt, Beauty, Technik, Outdoor.

## 📌 Stand Shopcom (16.09.2026) — Korrektur: die Anmeldung IST raus

**⚠️ Der Stand vom 15.09. unten beruht auf einer falschen Annahme.** Gemessen am 16.09. über
`to:info@shopcom.ch in:sent`:

| Zeit (UTC) | Was |
|---|---|
| 05.08. 13:39 | Shopcom bittet um das ausgefüllte Dropshipping-Formular |
| **05.08. 14:05** | **Antwort RAUS — mit ausgefülltem und unterschriebenem PDF (408 KB)** |
| seither | **keine Antwort von Shopcom** (geprüft `shopcom newer_than:60d`: nur diese zwei Nachrichten) |

Der Rückstand lag also **nie bei uns**: zwischen Aufforderung und Antwort lagen **26 Minuten**.
Offen ist Shopcoms Schweigen — sechs Wochen.

**Wie der Irrtum entstand:** Die Sichtung vom 15.09. hat den *Entwurf* gelesen und daraus
geschlossen, dass nichts gesendet wurde. Ein Entwurf belegt aber nur, dass jemand etwas
geschrieben hat — nicht, dass es fehlt. **Bevor man einen Verzug auf der eigenen Seite annimmt,
fragt man den Postausgang.** Der Entwurf vom 15.09. hätte sich für eine Verspätung entschuldigt,
die es nicht gab, und ein Dokument erneut geschickt, das dort längst liegt.

**Entwurf `r-5801785141346616875` am 16.09. umgeschrieben** (nicht gesendet — Betreiber-Klick):
aus «Entschuldigung für die späte Antwort, Formular im Anhang» wurde eine sachliche Nachfrage —
Eingang bestätigen lassen, Formular auf Wunsch nochmals senden, dazu unverändert die **drei
Fragen** (Feed-Format/Rhythmus, Gebühren/Mindestumsatz, Mindestbestellwert). Der Anhang ist
bewusst nicht mehr dran: Shopcom hat ihn seit dem 05.08.

---

## 📌 Stand Shopcom (15.09.2026) — überholt, siehe oben

Shopcom hat am **05.08.** geantwortet und um das ausgefüllte Dropshipping-Formular gebeten.
~~Der Antwortentwurf lag danach sechs Wochen unversendet im Postfach~~ — **FALSCH, siehe
Korrektur oben:** die Antwort samt PDF ging am 05.08. 14:05 raus. Betreiber fragte am 15.09.:
«shopcom entwurf senden?».

- Entwurf am 15.09. neu geschrieben: Verzug benannt statt «Besten Dank für die schnelle
  Rückmeldung», Interesse bekräftigt, und **drei Fragen** ergänzt, die die Sichtung offen
  gelassen hatte: Feed-Format und Abrufrhythmus, **Gebühren/Mindestumsatz** (steht nicht
  öffentlich auf der Website), Mindestbestellwert je Auftrag.
- ✅ **Betreiber hat bestätigt (15.09.): das ausgefüllte PDF hängt am Entwurf.** Damit ist der
  einzige Blocker weg. Nachträglich repariert: Gmail hatte die Shop-Adresse im Fliesstext in eine
  Weiterleitungs-URL verwandelt (`google.com/url?q=http://luxestyle.ch&source=gmail&ust=…`) —
  Domain steht jetzt gar nicht mehr im Text, nur noch `info@luxestyle.ch` in der Signatur.
  **Lehre: eine nackte Domain im Mailtext wird beim Speichern linkifiziert und als hässliche
  Tracking-URL SICHTBAR — in Geschäftsmails Domain weglassen oder in die Signatur setzen.**
- 🔎 **Zwei Registrierungen statt einer (gefunden 15.09. im Entwurf vom 04.07.):** Shopcom hat die
  Bestätigung «bitte Formular im Anhang ausfüllen» ZWEIMAL geschickt — am **04.07.2026 23:09** an
  `alleng0@hotmail.com` und am **05.08.2026 15:39** an `allengchour@gmail.com`. Beide Male ging
  nichts zurück. Es können also zwei Händlerkonten unter zwei Adressen liegen. Dem Betreiber
  einen Satz für die Mail gegeben: Konto unter `allengchour@gmail.com` weiterführen, Doppel-
  registrierung löschen.
- 📎 **Anhänge kann ich grundsätzlich nicht lesen.** Der Gmail-Konnektor liefert nur Text;
  `get_message` auf eine Nachricht mit Anhangsteilen endet mit «caller does not have permission».
  Ob ein Formular vollständig oder richtig ausgefüllt ist, kann hier NIE beurteilt werden —
  das ist immer eine Betreiber-Prüfung. Nicht erneut versuchen.
- ⚠️ **Senden muss der Betreiber selbst.** Der Gmail-Konnektor kann einen BESTEHENDEN Entwurf
  nicht abschicken (kein `send_draft`); `send_message` würde eine neue Mail **ohne Anhang**
  erzeugen — also genau den Fehler, den wir vermeiden wollen. Gleiches gilt künftig für jede
  Mail mit Anhang.
### Was kostet Shopcom? — gemessen am 15.09.2026: **nirgends veröffentlicht**

Beide Seiten heute per WebFetch gelesen:
- `shopcom.ch/trading-hub-handel` → **keine** Kosten, Gebühren, Abopreise, Mindestumsätze oder
  Mindestbestellwerte. Einzige Volumenangabe: «Für Partner mit mehr als 10 Bestellungen pro Tag
  bieten wir eine EDI Schnittstelle an» — ebenfalls ohne Preis.
- `forms.shopcom.ch/dropshipping-de/` → **keine** Preisangaben. Das Formular fragt nur ab:
  Rechnungsadresse, Gründungsdatum, HR-Nummer, Mitarbeiterzahl, Ansprechperson, Produkt-
  kategorien, Vertriebskanäle, Shop-URL, **Besucher/Monat**, Shopsystem, Social-Follower,
  Lieferantenanzahl, **Jahresumsatz**.

**Also unbekannt — deshalb steht die Frage in der Mail.** Worauf bei der Antwort zu achten ist,
weil BigBuy genau hier teuer war:

| Kostenart | BigBuy zum Vergleich (belegt) | Shopcom |
|---|---|---|
| Einmalige Registrierung | **EUR 90** | unbekannt |
| Monatsabo für Feed/Dropshipping | **EUR 69/Mt** (EUR 51.75 im Jahresabo) | unbekannt |
| Gebühr je Bestellung | — | unbekannt |
| Fracht je Paket | EUR 27.94 in die CH (SEUR) = jede Kleinbestellung Verlust | unbekannt, CH-Inland |
| Mindestumsatz / Mindestbestellwert | — | unbekannt |

**Regel aus dem BigBuy-Fall: kein Monatsabo vor dem ersten Verkauf.** Das Abo lief von Juli bis
15.09., hat kein rentables Geschäft erzeugt, und EUR 1'000 hängen bis heute im System fest.
Ein Lieferant, der nur an Umsatz mitverdient, ist risikofrei; einer mit Grundgebühr kostet auch
in Monaten ohne Bestellung.

- Danach: Feed-URL + Konditionen an mich → `automation/shopcom_import.mjs` fertigbauen
  (Muster `fortura_import.mjs`: Titel-Wache mit norm(), Bild-Wache, tracked+DENY, Ledger,
  Kanäle) plus Bestands-/Preis-Wächter.

## Rangliste (nur belegte Angaben, alles ohne Konto geprüft)

| # | Lieferant | Lager | Sortiment | Anbindung | Lieferzeit CH | Stand / offen |
|---|---|---|---|---|---|---|
| 1 | **Shopcom AG**, Büron LU (shopcom.ch) | CH | >10'000 Produkte: Baby & Kleinkind, Beauty & Health, Haushalt, IT + Multimedia, Outdoor & Garten, Spielwaren, Marken | **täglicher CSV-Feed** (Produktdaten) + Preis/Bestand-Feed mehrmals täglich; Bestellung im B2B-Shop, neutraler Lieferschein im Shop-Namen; Shopify-Anbindung gegen Überverkauf (Bestand 5-Min-Takt); EDI/API/FTP ab >10 Bestellungen/Tag | **Bestellung bis 15:00 → Zustellung am Folgetag** (Post) | Dropshipping-Antrag: forms.shopcom.ch/dropshipping-de/ (fragt Firma, HR-Nummer, Shop-URL, Besucher/Mt., Social-Follower, Umsatzklasse). **Gebühren/Mindestumsatz nicht öffentlich** → im Antrag fragen. |
| 2 | **Dameco AG**, Kleindöttingen AG (dameco.ch) | CH | Deko, Feuerzeuge, Garten-Accessoires, Lampen/LED-Lichterketten, Kerzen, Strandkörbe, Saisonware | Händler-Registrierung im e-Shop; neutraler Versand im Shop-Namen; **keine Feed-Angabe** auf der Seite | «wenige Werktage» | Direktimporteur seit 24 Jahren, Beratung vor Ort. Feed/CSV erfragen. |
| 3 | **Telion AG**, Schlieren ZH (telion.ch) | CH | >3'000 Markenprodukte: Consumer Electronics, Beauty & Batterien, Haushalt (Bose/Sony/Smeg-Klasse) | Dienstleistung «Drop-Shipping» + «Schnittstellen & Datenanbindung» ausgewiesen, Details nur für Händler | kurz (eigenes Lager) | Fachhandels-Distributor: Händlerkonto nötig (UID vorhanden seit 08.07.). Konditionen per Telefon 044 732 15 11 / info@telion.ch. Markenware = echte Marge-Frage. |
| 4 | **Gelato** (POD, gelato.com) | Druckpartner-Netz, CH laut Gelato-CH-Seite «lokal in der Schweiz produziert»; App-Store-Länderliste nennt CH NICHT | T-Shirts, Poster, Tassen, Hüllen, Kalender, Wandbilder | Shopify-App, gratis (Gelato+ USD 29.99/Mt. optional), Bestellungen automatisch | je Produkt, Standard/Express | Interessant, weil POD das EINZIGE rankende Gut des Shops ist und Printful in EUROPA druckt (7–14 Werktage, Zoll-Risiko). **Erst im Konto prüfen, welche Produkte wirklich in CH produziert werden** — sonst ist es EU-Druck mit anderem Namen. |
| – | Prodigi (POD) | UK/EU (Venlo), kein CH-Labor belegt | Fine-Art, Textil | API/Shopify | EU→CH, Zoll | nicht besser als Printful. |
| – | Eprolo, BigBuy, BrandsGateway, Spocket | UK/US/ES/EU — **kein** CH-Lager (Marketing-Listen behaupten es, Belege fehlen) | | | Zoll ab ~CHF 62 Warenwert | BigBuy ist hier ohnehin stillgelegt (10.07.). |
| – | Watch Import, Formula Swiss, Emuca, Zentrada | unklar / nicht CH | Uhren / Supplements / Möbelbeschläge / Grosshandel | | | nicht weiterverfolgt. |

⚠️ **Zollgrenze Schweiz:** Einfuhr-MwSt. wird erst ab CHF 5 Steuerbetrag erhoben (bei 8.1 % ≈
CHF 62 Warenwert inkl. Versand). Alles aus EU-Lagern darüber bekommt der Kunde Zoll + Postgebühr
aufgebrummt — genau das, was ein CH-Lager vermeidet.

## Empfehlung
1. **Shopcom** ist der einzige Kandidat, der unserem Fortura-Muster entspricht: CSV-Feed → eigener
   Importer (wie `fortura_import.mjs`), CH-Lager, Folgetag-Lieferung, Sortiment in genau den
   Kategorien, die Fortura nicht hat. **Betreiber-Klick:** Dropshipping-Antrag ausfüllen
   (Einzelfirma, UID/HR, luxestyle.ch, Shopify, ~1'200 Besucher/Mt., TikTok 560 Follower,
   Umsatzklasse < CHF 5'000). Danach Feed-URL + Konditionen an mich → Importer + Wächter
   (Bestand/Preis mehrmals täglich, tracked+DENY, Ledger, Kanäle).
2. Dameco als zweiter Schritt für Wohnen/Deko-Saisonware (Weihnachten!), sobald ein Feed vorliegt.
3. Gelato nur als Test gegen Printful bei den POD-Rankern — nur, wenn im Konto CH-Produktion
   für T-Shirt/Tasse sichtbar ist.
4. Telion erst, wenn Markenelektronik mit belegter Marge gewollt ist.

Quellen: shopcom.ch (Startseite, trading-hub-handel, trading-hub-fulfillment, registrieren,
forms.shopcom.ch/dropshipping-de), dameco.ch/html/dropshipping-schweiz.html, telion.ch
(Services, Händlerinformationen, itreseller.ch-Profil), gelato.com/de/print-on-demand/schweiz,
apps.shopify.com/gelato-print-on-demand, prodigi.com/global-print-network,
brandsgateway.com/blog/dropshipping-suppliers-switzerland.
