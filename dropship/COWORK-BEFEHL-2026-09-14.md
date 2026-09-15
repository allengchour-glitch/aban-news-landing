# COWORK-BEFEHL (14.09.2026, Fassung 17:00 UTC) — einmal einfügen, alles abarbeiten

> Für den PC-Claude (Cowork, Brave eingeloggt). Erledigt sind: Groq-Schlüssel (16:30 getestet, gespeichert),
> #1004 archiviert (10:50), UID (Betreiber hat keine — Einzelunternehmen ohne HR-Eintrag, keine Pflicht).
> Nach jedem Punkt: Ergebnis in EINER Zeile melden. Nichts erfinden, nichts bezahlen, nichts löschen,
> **keine App deinstallieren und keinen Token widerrufen** (die Custom-App «autopilot2» trägt den Betrieb).

```
Du arbeitest für den Shopify-Shop LuxeStyle (luxestyle.ch, Admin: admin.shopify.com/store/luxestyle-ch).
Erledige die vier Punkte der Reihe nach im Browser. Melde nach jedem Punkt in EINER Zeile: erledigt / nicht möglich + warum.
Erfinde keine Werte, bezahle nichts, lösche nichts, deinstalliere keine App.

1. ⛔ VORERST NICHT AUSFÜHREN — stattdessen EINE Messung (15.09.).
   Hier stand: «Gratis ab CHF 45» abschalten, «ab CHF 50» aktivieren, weil der Shop überall 50 verspricht.
   Das könnte die Kundin schlechter stellen. Was ich GEMESSEN habe (Shopify-Admin-API, 15.09. 05:20 UTC):

   Versandzone Domestic (CH), Profil «General profile»:
   | Zustand | Tarif | Bedingung |
   |---|---|---|
   | AKTIV | Standard CHF 7.00 | ohne Bedingung |
   | AKTIV | Standard CHF 0.00 | Gesamtpreis ≥ 65 |
   | **inaktiv** | Kostenloser Versand | Gesamtpreis ≥ 50 |
   | **AKTIV** | Kostenloser Versand | Gesamtpreis ≥ **45** |

   Automatische Rabatte, ebenfalls gemessen: «Bundle: 2+ Artikel -10%» AKTIV seit 01.06. (ohne Enddatum),
   «Mengenrabatt — 10% ab 3 Artikeln» AKTIV seit 06.08., dazu ein automatischer Gratis-Versand «ab CHF 49»
   nur für die Schweiz. Die alte Bedingung «ab 65» ist nicht abgelaufen, sondern hängt aktiv an der
   Zeile «Standard CHF 7» — sie ist aber harmlos, weil die 45er-Stufe früher greift.

   **Was NICHT gemessen ist:** ob Shopifys Bedingung «Gesamtpreis» vor oder nach Rabatt rechnet. Rechnet
   sie danach, ist die 45 genau richtig: Ein Korb über CHF 50 mit zwei Artikeln kommt nach dem
   10-Prozent-Rabatt mit CHF 45 an. Wer dann auf 50 umstellt, reisst eine Totzone zwischen CHF 50 und
   CHF 55.55 auf — die Kundin sieht «gratis ab 50», legt für CHF 52 zwei Artikel ein und zahlt trotzdem
   CHF 7. Rechnet sie davor, ist die 45 nur grosszügiger als versprochen und schadet niemandem.
   **In beiden Fällen ist Nichtstun die sichere Wahl.**

   DEIN AUFTRAG IST DESHALB NUR EINE MESSUNG, KEINE ÄNDERUNG:
   Lege im Shop zwei Testkörbe an und geh bis zur Versandwahl (nicht bezahlen):
   (a) **zwei** Artikel, zusammen rund CHF 52 · (b) **ein** Artikel, rund CHF 52.
   Melde für beide: Zwischentotal vor Rabatt, Zwischentotal nach Rabatt, angezeigte Versandkosten.
   Zeigt (a) CHF 7.00 und (b) gratis, rechnet Shopify nach Rabatt — dann bleibt die 45 für immer stehen
   und ich gleiche stattdessen die Texte an. Zeigen beide gratis, entscheidet der Betreiber neu.

2. GOOGLE MERCHANT CENTER — LIEFERLAND NUR SCHWEIZ (~1'700 Produkte stehen auf «Missing shipping info», weil der
   Feed auf Deutschland zielt): merchants.google.com → Einstellungen → Versand & Rückgabe: jeden Versanddienst
   öffnen, Lieferland = nur Schweiz (Deutschland/andere entfernen). Dann Produkte → Diagnose: Zahl
   «Missing shipping info» ablesen und melden (vorher/nachher).

3. SHOPIFY INBOX (kostenloser Chat): Shopify-Admin → Apps → Shopify App Store → «Shopify Inbox» installieren →
   im Onlineshop-Chat die Begrüssung setzen: «Hoi! Fragen zu Versand, Grösse oder Rückgabe? Wir antworten innert 24 h.»
   Benachrichtigung an info@luxestyle.ch aktivieren.

4. NUR PRÜFEN, NICHT ÄNDERN: Shopify-Admin → Einstellungen → Apps und Vertriebskanäle → App entwickeln:
   Liste der selbst erstellten Apps mit «letzte Aktivität» abschreiben und melden. Nichts deinstallieren,
   keinen Token widerrufen — «autopilot2» ist der Betrieb der Cloud-Sitzung.

5. STARTSEITEN-META-DESCRIPTION KÜRZEN (gemessen 196 Zeichen, Google schneidet bei ~150): Shopify-Admin → Onlineshop →
   Einstellungen (Preferences) → «Titel und Meta-Beschreibung» → Meta-Beschreibung ersetzen durch:
   «LuxeStyle CH: Mode, Schmuck, Beauty & Gadgets. Gratis-Versand ab CHF 50, 30 Tage Rückgabe, Rechnung mit
   Klarna · TWINT. Aus der Schweiz.» (136 Zeichen). Speichern, Zeichenzahl melden.

6. ✅ ERLEDIGT, KEIN ENTSCHEID NÖTIG (Stand 15.09. 05:00 UTC): Die Frage «BigBuy-Pack wirklich gekündigt?»
   ist beantwortet — JA, und zwar aus unserem eigenen Bestand: `automation/bigbuy_abschied.py` trägt seit
   dem 16.08. im Kopf «Der Betreiber hat das BigBuy-Abo Pack Ecommerce am 16.08.2026 gekündigt; es bleibt
   bis 15.09.2026 aktiv», und das Journal hält die Bestätigungsmail von BigBuy vom 16.08. 11:12 UTC fest.
   Heute ist der Stichtag. Der Aufseher hat das Skript planmässig gestartet; GEMESSEN 15.09. 05:00 UTC:
   aktive BigBuy-Produkte 260 → 194 und fallend, Ledger `dropship/_bigbuy_abschied.txt`.
   Die PC-Routine «BigBuy-Ende» (16.09. 05:00 UTC) ist damit ein Doppel unserer eigenen Arbeit und findet
   morgen voraussichtlich nichts mehr vor. Du musst nichts klicken. Rückgängig wäre: Produkte mit Tag
   `bigbuy-abschied` wieder auf ACTIVE — aber ohne Paket gibt es keine Bestandsprüfung mehr, also wären
   es Geisterverkäufe wie #1006/#1008/#1009.

7. SHOPIFY-CHAT EINSCHALTEN (ersetzt Punkt 3, die App «Shopify Inbox/Messaging» ist schon installiert — gemessen 14.09.):
   Onlineshop → Themes → Anpassen (veröffentlichtes Theme) → linke Leiste, drittes Symbol «App-Embeds» → «Online store chat»
   einschalten → Speichern. Dann Apps → Inbox → Einstellungen → Begrüssung: «Hoi! Fragen zu Versand, Grösse oder Rückgabe?
   Wir antworten innert 24 h.» Benachrichtigung an info@luxestyle.ch. Melden: ist der Chat-Knopf auf luxestyle.ch sichtbar?

8. BALLAST-APP ENTFERNEN: Einstellungen → Apps und Vertriebskanäle → «Hextom: Currency Converter» deinstallieren (der Shop
   verkauft nur in CHF; die App lädt auf jeder Seite ein Skript). Ebenso «SEOWILL – Sticky Cart» (Embed ist aus, das Theme
   hat den Knopf selbst). NICHTS anderes deinstallieren — insbesondere nicht autopilot2, Judge.me, Printful, CJdropshipping,
   Klaviyo, Clarity, Search & Discovery, Flow, Forms, Swiss Post Labels, UpPromote.

9. NUR ENTSCHEIDEN (Frage an den Betreiber): Shopify zeigt Produkte nur dann direkt in ChatGPT/Copilot (Agentic Storefront),
   wenn der Shop einen aktiven Markt «USA» hat (Shopify-Hilfe «Selling on ChatGPT»). LuxeStyle hat nur «Schweiz». Empfehlung
   der Cloud-Sitzung: KEIN US-Markt (USD, US-Versand, englische Texte, CH-Lager nicht lieferbar). Wenn der Betreiber es trotzdem
   will: Einstellungen → Märkte → Markt hinzufügen → USA (dann melden, ich passe Versandtexte an).

10. BING WEBMASTER TOOLS (ChatGPT sucht über Bing): bing.com/webmasters → luxestyle.ch (Verifikation ist im Theme hinterlegt)
   → Sitemaps → prüfen, ob https://luxestyle.ch/sitemap.xml eingereicht ist; wenn nicht, einreichen. Zahl «indexierte Seiten» melden.

Am Ende: zehn Zeilen Bericht, in derselben Reihenfolge.
```
