# Wachstums-Backlog — 100-Agenten-YouTube/Web-Recherche (2026-06-24)

Quelle: Workflow `youtube-learnings-abannews` (100 Themen, 396 Taktiken, 108 Agenten, ~6,6 M Tokens).
Ziel: zahlende Kund:innen (Newsletter-Abos, Service-Leads 490/900 CHF, Affiliate, Shop).

## ✅ Verifiziert (curl/Code-Check am 2026-06-24, nicht nur Agenten-Inferenz)
- **KI-Bots werden an der Cloudflare-Edge geblockt:** `PerplexityBot → 403`, `ChatGPT-User → 403`,
  während `Googlebot → 200` und normale Browser `→ 200`. robots.txt erlaubt die Bots; die Sperre kommt
  aus dem **Cloudflare-Dashboard** (Super Bot Fight Mode / „Block AI bots"). **→ einziger #1-Hebel, nur User.**
- **Service-Formulare nutzen `mailto:`** (verifiziert ki-automation.html). `inserat-submit.js` braucht **D1**
  (`env.DB`, sonst 503) → ein `lead.js`-POST würde ohne D1 fehlschlagen. mailto **nicht** blind ersetzen, bis D1 steht.
- **Keine echte Telefonnummer im Impressum** → `tel:`-Taktik verworfen (kein Erfinden).

## 🔴 TOP 3 (höchster Hebel)
1. **mailto→echter POST + Tracking** für Service-Leads — ABER erst wenn **D1 gebunden** ist (sonst 503). User-gated.
2. **Answer-First-Block + echte Frage-H2/H3 + ausgebautes FAQPage-Schema** über alle 688 programmatischen Seiten
   (ein Batch-Lauf → AEO-Zitierbarkeit + Anti-Thin-Content). Autosafe, aber sorgfältig/idempotent bauen.
3. **Cloudflare-Edge-Block für KI-Bots aufheben** (verifiziert 403) — **ein Dashboard-Klick, nur User**, sonst sind
   alle On-Page-AEO-Maßnahmen bei Perplexity/ChatGPT wirkungslos.

## 🟢 Autosafe (ohne User, reiner Code/Content) — priorisiert
1. Service-Formular-Felder: `autocomplete`/`inputmode`/`type=email` (Friktion ↓, Mobile). **[erledigt 2026-06-24]**
2. Answer-First-Block (40–60 Wörter, fett, CHF/Fazit in ersten 50 W.) direkt unter H1 auf 238 Kaufberater + 450 KI-Themen.
3. FAQPage-Schema 3→5–8 Q&A, jede Antwort kontextfrei 40–60 W. mit 1 CHF-Zahl; Schema-Text == sichtbarer DOM-Text.
4. Zentrales Organization-`@id`-Schema mit `sameAs` (verifizierter Gap: 6701 Org-Vorkommen, nur 4 mit sameAs) + Author/Byline.
5. Echte HTML-Vergleichstabelle pro Kaufberater (0 Tabellen heute) — Modell | CHF | Eignung | Schwäche + „Stand Juni 2026".
6. Sichtbares „Zuletzt geprüft"-Datum + `dateModified` — **nur** hochzählen, wenn Textkern sich wirklich änderte (kein Fake-Stempel).
7. Title-Format vereinheitlichen: `| aban` → Bindestrich, Keyword vorne, Zahl+(2026), 51–60 Zeichen.
8. First-Party Affiliate-Redirect `/go/{ziel}` (serverseitig zählbar) + konkrete CTAs („Aktuelle Preise auf eBay prüfen →").
9. Interne Links: Geld-Seiten gezielt füttern (KI-Themen→/ki-automation; Kaufberater→eBay-CTA+Newsletter; 3–5 thematische Geschwister, KEINE Zufalls-Links).
10. Newsletter-Popup: Zeit-Trigger 6–10 s + Exit-Intent, Scroll 60→40 %, Zahl/Frequenz-Headline, Ich-Form-CTA.
11. Service-Seiten: 3-Tier-Decoy (Mitte „beliebteste Wahl"), Outcome-Zeilen, ehrlicher Markt-Anker, „Nicht für dich, wenn…".
12. Zweifel-Killer-Microcopy unter Haupt-CTAs + Sticky-CTA + genau 1 dominanter CTA/Seite.
13. Tool-/Rechner-Ergebnisse als Funnel schließen (datengetriggertes Mini-Angebot, reines Frontend-JS).
14. AEO-Eigenbeweis `/aeo-beweis.html` (echte datierte Screenshots „Frage → abannews zitiert") + Q&A-Schema auf Service-Seiten.
15. Schweiz-Lokalisierung: ss→ss-Lint, `lang=de-CH`+hreflang, EUR→CHF (Apostroph 1'200), nDSG als Primärbegriff, CH-Geo-Schema.
16. Branchen-LPs vertiefen statt dünn klonen (Thin-Content-Schutz; 7 zahlungsstarke Branchen vertiefen, Rest noindex/Hub).
17. Static-Site-Audit als CI-Gate (Orphans, 404s, Schema-Pflichtfelder, Affiliate-200) — link_guard ist heute Shopify-only.
18. Uniqueness-Gate + Methodik-Block gegen Scaled-Content-Deindexierung (März-2026-Update).
19. Content-Atomisierung: Text-Derivate + Volltext-RSS (`/feed.xml`, Kategorie-Feeds) aus archive/ — Erzeugen autosafe, Posten User.
20. Original-Daten-Seite `/daten` (Jobtrend aus Adzuna + eBay-Preisindex, datiert) als Zitat-/Backlink-Magnet.
21. Performance-Template: LCP `eager`/`fetchpriority=high` + CLS `width/height` (heute 1069× lazy, 0× fetchpriority).

## 🔑 Needs-User (hebelstark, aber braucht Keys/Geld/Account/Dashboard)
- **Cloudflare: KI-Bots entsperren** (verifiziert 403) — höchster Engpass, 1 Klick.
- D1/KV-Binding aktivieren → schaltet echten Lead-POST + First-Party-Conversion-Tracking frei.
- Affiliate-IDs (beehiiv 50 %, GetResponse 33 % lifetime, Infomaniak/bexio CH) — höchster Lifetime-Hebel.
- AEO-Prompt-Monitoring scharf (OPENAI/PERPLEXITY-Keys) → Live-Proof fürs 490-CHF-Angebot.
- Cal.com/Calendly-Embed, Welcome-Mail-Serie (Versand-Anbieter), GSC-Striking-Distance, CH-Verzeichnis-Citations + TWINT.

## Reihenfolge (Vorschlag)
Erst die verifizierten **Autosafe-Batch-Wins** (Answer-First + FAQ-Schema + interne Links + Tabellen) sorgfältig &
idempotent bauen → größter organischer/AEO-Hebel ohne User. Parallel User auf den **Cloudflare-Block** stoßen
(macht die AEO-Arbeit bei Perplexity/ChatGPT überhaupt erst wirksam).
