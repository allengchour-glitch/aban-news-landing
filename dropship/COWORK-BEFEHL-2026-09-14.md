# COWORK-BEFEHL (14.09.2026, Fassung 17:00 UTC) — einmal einfügen, alles abarbeiten

> Für den PC-Claude (Cowork, Brave eingeloggt). Erledigt sind: Groq-Schlüssel (16:30 getestet, gespeichert),
> #1004 archiviert (10:50), UID (Betreiber hat keine — Einzelunternehmen ohne HR-Eintrag, keine Pflicht).
> Nach jedem Punkt: Ergebnis in EINER Zeile melden. Nichts erfinden, nichts bezahlen, nichts löschen,
> **keine App deinstallieren und keinen Token widerrufen** (die Custom-App «autopilot2» trägt den Betrieb).

```
Du arbeitest für den Shopify-Shop LuxeStyle (luxestyle.ch, Admin: admin.shopify.com/store/luxestyle-ch).
Erledige die vier Punkte der Reihe nach im Browser. Melde nach jedem Punkt in EINER Zeile: erledigt / nicht möglich + warum.
Erfinde keine Werte, bezahle nichts, lösche nichts, deinstalliere keine App.

1. ⛔ ZURÜCKGEZOGEN (15.09., nachgemessen) — BITTE NICHT AUSFÜHREN.
   Hier stand die Anweisung, im Versandprofil «Gratis ab CHF 45» abzuschalten und «ab CHF 50» zu aktivieren,
   weil der Shop überall 50 verspricht. **Das wäre ein Schaden gewesen.** GEMESSEN am 15.09. über die
   Shopify-Rabatt-API: seit dem 01.06. läuft ein automatischer Rabatt «Bundle: 2+ Artikel -10%» (ACTIVE,
   ohne Enddatum), dazu seit dem 06.08. «Mengenrabatt — 10% ab 3 Artikeln». Shopify misst die
   Versand-Schwelle am Zwischentotal NACH Rabatt. Ein Warenkorb über CHF 50 mit zwei Artikeln kommt
   also mit CHF 45 an der Kasse an — genau deshalb steht dort 45. Wer auf 50 umstellt, reisst eine
   Totzone zwischen CHF 50 und CHF 55.55 auf: Die Kundin sieht «Gratis-Versand ab CHF 50», legt für
   CHF 52 zwei Artikel in den Korb und bekommt an der Kasse trotzdem CHF 7 Versand aufgerechnet.
   **Nichts anfassen.** Zusätzlich aktiv und korrekt: ein automatischer Gratis-Versand «ab CHF 49»,
   nur für die Schweiz. Die alte Bedingung «ab CHF 65» an der Zeile «Standard CHF 7» ist ABGELAUFEN
   (endsAt 10.08.2026) und damit wirkungslos — auch die braucht keinen Klick.
   Offen bleibt nur eine Textfrage, die ich selbst erledige: Der Shop verspricht 50, gratis ist es ab 45
   (bzw. 49 ohne Rabatt). Das ist günstiger für die Kundin als versprochen, also kein Vertrauensproblem;
   ich gleiche die Aussagen an, sobald die Schwellen-Messung zwei Tage stabil ist.

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
