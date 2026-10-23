# Neue Kreditkarte: wo sie hinterlegt werden muss (13.10.2026)

**Anlass:** Betreiber 13.10. abends: «habe neue kreditkarte wegen rechnungen».

**Quelle:** Gmail, Rechnungen und Belege der letzten 90 Tage (GEMESSEN, gelesen 13.10. ~18:45 UTC).

**Wichtig:** Kartendaten tippt nur der Betreiber ein. Die Sitzung gibt keine Zahlungsdaten ein (Hausregel: Zahlungen nur Betreiber).

## Wo die alte Karte belastet wird (Mastercard •••• 1878), nach Dringlichkeit

| # | Dienst | Wozu | Belegt (Mail) | Nächste Belastung | Wo ändern |
|---|---|---|---|---|---|
| 1 | **Shopify** (LuxeStyle) | Shop-Abo + Apps. Scheitert die Zahlung, sperrt Shopify den Shop | 01.10. CHF 28.82 und 17.09. CHF 44.68, beide «Mastercard 1878» | beim nächsten Schwellenwert bzw. Ende Oktober | https://admin.shopify.com/store/au3j0y-hq/settings/billing → Zahlungsmethode ändern. **Zusätzlich eine «alternative Zahlungsmethode» hinterlegen**, das empfiehlt Shopify selbst in der Rechnung |
| 2 | **Hetzner** (Server «luxe-waechter») | Wächter-Server: Bestell- und Lagerabgleich, Video-Downloads | 03.09. Rechnung 12,96 €, «wird von Ihrer Kreditkarte abgebucht» | Anfang November (~03.11.) | https://accounts.hetzner.com → Zahlungen → Zahlungsmethode (Kundennr. K0629623226) |
| 3 | **Google Cloud** (Gemini-API: Jury, Bildprüfung) | KI-Prüfungen der Automaten | 05.10. CHF 16.00, «Mastercard •••• 1878», Konto 01B1E3-F255B5-FBBE02 | Anfang November | https://console.cloud.google.com/billing → Zahlungsmethode (oder https://pay.google.com → Zahlungsmethoden) |
| 4 | **Netlify** | **wird NICHT gebraucht** (GEMESSEN 13.10. über die Netlify-Verbindung: Team «aban» Plan Pro, 3 Testseiten `wonderful-luxestyle`, `rad-genie-a4e528`, `regal-bunny-bcded3`, letzte Builds 18.05./19.05./12.06., keine eigene Domain; abannews.com läuft über Cloudflare, der Shop über Shopify, 0 Verweise im Repo) | 22.09. USD 20.00 | ~22.10. | **Kündigen bzw. auf Free zurückstufen statt neue Karte:** https://app.netlify.com/teams/allengchour/billing (spart USD 240 im Jahr). ✅ **Betreiber 13.10. ~19:50 UTC: auf Free zurückgestuft.** API zeigt bis Periodenende (~22.10.) weiter «Pro» → am 23.10. nachmessen (`netlify-team-services-reader get-team`, type_name) |
| 5 | **Anthropic / Claude** | diese Sitzungen | Beleg 22.07.; 11.10. Link-Verifizierung bei Anthropic Ireland | monatlich | https://claude.ai/settings/billing |
| 6 | **Etsy** (Shop AbanPlanner) | Gebühren | 01.10. CHF 0.18 «hinterlegte Kreditkarte» | monatlich (Kleinbeträge) | https://www.etsy.com/your/account/payments |
| 7 | **Semrush** | **gekündigt, belegt** (Mail noreply@semrush.com 05.10. 18:50 UTC; «active subscription» im Konto = Standardtext des Gratiskontos, SEO-Workflow 13.10.); Testabo «One Starter» lief am 02.10. über Karte 1878 an | — | **keine erwartet**, wenn die Kündigung gilt | Nur prüfen: https://www.semrush.com/billing-admin/profile/subscription. Ist dort noch ein Abo aktiv → kündigen, nicht die neue Karte eintragen |

## Ohne Karte (über PayPal oder pro Auftrag)

- **Google Payment (PayPal-Einzug):**
  - Am 27.09. wurden CHF 24.00 und CHF 19.00 an «Google Payment Corp.» bezahlt.
  - Am selben Tag hat der Betreiber den PayPal-Einzug für «Google, Inc» **storniert** (Vereinbarung B-7C734166GP2929545).
  - Gemeint ist vermutlich Google Ads oder Google Play.
  - **Folge:** Neue Google-Ads-Ausgaben können nicht mehr belastet werden. Für die geplanten Anzeigen muss die neue Karte dort eingetragen werden: https://ads.google.com → Abrechnung → Zahlungseinstellungen.
- **CJ Dropshipping:** wird pro Bestellung bezahlt (Zahllink, siehe `ZAHLUNG-LINKS-MERKEN.md`). Bei der nächsten Zahlung die neue Karte wählen. Am 13.10. sind LX1025 und LX1026 «successfully paid».
- **Mister DTF:** Rechnung 16423 vom 11.10. (Auftrag #1024). Zahlweg laut Rechnung prüfen.

## Weitere Mails seit dem 09.10., die eine Handlung brauchen (nur Betreiber)

- **Microsoft Advertising ist von Shopify Autopilot getrennt (09.10.):** Die Manager-Anfrage von Shopify muss angenommen werden. Erst dann kann Autopilot dort Anzeigen schalten. Link: https://admin.shopify.com/growth/autopilot. Das ist nur nötig, wenn Bing-Anzeigen gewünscht sind; Budget entscheidet der Betreiber.
- **Ahrefs Site Audit «crawl failed to start» (12.10.):** Bericht unter https://app.ahrefs.com/site-audit/10486687/overview. Vermutlich blockt der Bot-Schutz von Shopify den Crawler; dieselbe Ursache hatte OpenSEO, dort hilft eine Crawler-Signatur. Kein Geldthema.
- **Fruugo (13.10.):** Verkaufsangebot für einen Marktplatz. Keine Handlung nötig.
- **Influencer-Bewerbung (11.10., info@):** Entscheid des Betreibers. Keine eigenen Creator-Anfragen (Verbot vom 06.10.). Eine eingehende Bewerbung beantwortet die Sitzung nicht von sich aus.

## Nachprüfung Netlify Free — 23.10.2026 07:45 UTC (GEMESSEN)
- Netlify-Team «aban» (`6a0ace512317373217058617`): `get-team` → `type_name: "Free"`, `updated_at` 21.10.2026 00:32:36 UTC (Rückstufung wirksam, nicht erst zum Periodenende 22.10.).
- Gmail `from:netlify.com newer_than:3d`: genau ein Thread, «[Netlify] You've downgraded aban to a Free plan» (21.10. 00:32 UTC, 300 Credits/Monat im Free-Plan). **Keine Rechnung über USD 20**, keine Zahlungsmail.
- Ergebnis: Auftrag erledigt, nichts offen. Bei einer neuen Netlify-Rechnung in den nächsten Wochen trotzdem melden.
