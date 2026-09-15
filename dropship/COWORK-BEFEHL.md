# COWORK-BEFEHL — Fassung 15.09.2026, 11:10 UTC

> Ersetzt `COWORK-BEFEHL-2026-09-14.md`. Vier der zehn Punkte sind mit der Storefront- und der
> Admin-API **selbst gemessen und erledigt bzw. geschlossen** worden. Übrig bleiben die Punkte,
> für die es wirklich einen Browser oder ein fremdes Konto braucht.
> Nichts erfinden, nichts bezahlen, **keine App deinstallieren, keinen Token widerrufen**
> (`autopilot2` trägt den Betrieb).

## ✅ GESCHLOSSEN — nicht mehr anfassen

**1. Versandschwelle 45 → 50: ENDGÜLTIG NEIN. Die 45 ist kein Fehler, sie ist die Korrektur.**
Am 15.09. mit vier echten Warenkörben über die Storefront-API gemessen
(`tools/versand_testkorb.py`, Lieferadresse Belp BE):

| Korb | vor Rabatt | Rabatt | nach Rabatt | Versand |
|---|---|---|---|---|
| 2 × CHF 23.00 | 46.00 | 4.60 | 41.40 | **CHF 7.00 — kein Gratisversand** |
| 2 × CHF 23.50 | 47.00 | 4.70 | 42.30 | **CHF 7.00 — kein Gratisversand** |
| 2 × CHF 25.00 | 50.00 | 5.00 | 45.00 | **gratis** |
| 2 × CHF 26.90 | 53.80 | 5.38 | 48.42 | gratis |
| 1 × CHF 51.00 | 51.00 | 0.00 | 51.00 | gratis |

**Shopify prüft die Bedingung «Gesamtpreis ≥ 45» auf dem Betrag NACH dem automatischen Rabatt.**
Ein Korb über 45 Franken kann also trotzdem CHF 7 kosten — bewiesen an den ersten zwei Zeilen.

Daraus folgt die eigentliche Erkenntnis: Mit dem automatischen 10-%-Rabatt ab 2 Artikeln beginnt
der Gratisversand bei **genau CHF 50 vor Rabatt** (Zeile 3). Das ist exakt das, was der Shop
verspricht. Bei einem einzelnen Artikel greift er ab 45 — grosszügiger als versprochen, schadet
niemandem. **Wer auf 50 umstellt, verschiebt die echte Schwelle für Zwei-Artikel-Körbe auf
CHF 55.56** und macht aus einer eingehaltenen Zusage einen gebrochenen Versprechen. Punkt
geschlossen, bitte nie wieder aufmachen.

**6. BigBuy-Abschied** — erledigt, 0 aktive BigBuy-Produkte. Kein Klick nötig.

**8. «Ballast-Apps entfernen» — die Begründung war falsch, gemessen.**
Behauptet war: «Hextom lädt auf jeder Seite ein Skript». Gemessen am 15.09.: der Shop hat
**0 ScriptTags**, und weder Hextom noch SEOWILL stehen als App-Embed im Theme
(`config/settings_data.json` kennt genau 6 Embeds: Judge.me, UpPromote, Clarity aktiv;
Google/YouTube, Clarity-BrandAgents, SEOWILL deaktiviert). **Beide Apps laden nichts.**
Deinstallieren ist Aufräumen, kein Geschwindigkeitsgewinn — also kein Vorrang und kein Risiko,
es zu lassen.

## 🖱️ OFFEN — braucht Browser oder fremdes Konto

**2. GOOGLE MERCHANT: LIEFERLAND NUR SCHWEIZ.** ⭐ Der grösste freie Hebel, den wir haben.
merchants.google.com → Einstellungen → Versand & Rückgabe → jeden Versanddienst öffnen →
Lieferland **nur Schweiz** (Deutschland und andere entfernen). Danach Produkte → Diagnose:
Zahl «Missing shipping info» vorher/nachher melden (zuletzt ~1'700).
Google-Gratis-Einträge sind der einzige Kanal mit belegten Verkäufen.

**5. STARTSEITEN-META-BESCHREIBUNG — dringender als gedacht.**
Gemessen am 15.09. über `shop { description }`: **211 Zeichen**, und sie endet mit
«… mit schnellem Versand in die Schweiz **und nach Deutschland**». Der Shop liefert **nur in die
Schweiz**. Dieser Satz steht unter jedem Google-Treffer der Startseite. Es gibt keine Mutation
dafür (`shopUpdate` existiert nicht) — nur im Admin änderbar:
Onlineshop → Einstellungen → «Titel und Meta-Beschreibung» → ersetzen durch:

```
Mode, Schmuck, Beauty & Gadgets aus der Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe, Kauf auf Rechnung mit Klarna oder TWINT.
```
(133 Zeichen, keine Deutschland-Zusage.) Speichern, Zeichenzahl melden.

**7. CHAT EINSCHALTEN — Stand gemessen, damit niemand im Leeren sucht.**
Installiert sind **zwei** Chat-Apps: «Messaging» (Shopify Inbox) und «Chatty» (avada-faqs).
Auf luxestyle.ch ist **kein einziger Chat-Knopf sichtbar** (WebFetch, 15.09.), und im Theme steht
**kein** Chat-App-Embed. Also: Onlineshop → Themes → Anpassen → App-Embeds → Chat einschalten →
Speichern. Danach melden, **welche** der beiden Apps den Knopf liefert — die andere gehört weg,
zwei Chat-Fenster auf einer Seite sind schlimmer als keins.

**9. NUR ENTSCHEIDEN: US-Markt für ChatGPT?** Empfehlung unverändert **nein** (USD, US-Versand,
englische Texte, CH-Lager nicht lieferbar). Nur wenn der Betreiber es ausdrücklich will:
Einstellungen → Märkte → USA.

**10. BING WEBMASTER TOOLS** (ChatGPT sucht über Bing): bing.com/webmasters → luxestyle.ch →
Sitemaps → prüfen, ob `https://luxestyle.ch/sitemap.xml` eingereicht ist; sonst einreichen.
Zahl «indexierte Seiten» melden.

**4. NUR PRÜFEN, NICHTS ÄNDERN:** Einstellungen → Apps → App entwickeln: Liste der eigenen Apps
mit «letzte Aktivität» abschreiben. Nichts deinstallieren, keinen Token widerrufen.
