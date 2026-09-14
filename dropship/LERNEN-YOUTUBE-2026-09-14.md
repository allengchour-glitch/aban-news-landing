# LERNEN — YouTube-Runde 14.09.2026 («lerne im youtube sachen»)

Marken: **GEMESSEN** = hier selbst nachgeprüft · **QUELLE** = fremde Angabe, plausibel · **BEHAUPTUNG** = Verkaufsversprechen.
Werkzeug: `tools/yt_lernen.mjs` (Kapitelmarken + Beschreibung; Transkripte gehen nicht). 13 Abrufe, danach Drossel.

## 1. Was abgerufen wurde (GEMESSEN 09:25–09:35 UTC)

| Video | Kanal · Datum · Aufrufe | Ertrag | Motiv des Absenders |
|---|---|---|---|
| `Z_oy0Qpr83g` «The Only Google Merchant Center Tutorial You Need in 2026» | KeyCommerce · 29.06.2026 · 3'830 | 9 Kapitel, davon **15 Minuten «Website Requirements Before You Create an Account»** (00:44–15:40), 14 Min «Optimizing Your Product Data & Feed», 17 Min «Resolve a GMC Suspension» | Agentur: verkauft Strategiegespräch + Sperr-Aufhebung («300+ reinstated») → QUELLE mit Motiv |
| `IcfXR6D16-c` «Produktseite mit hoher Konversionsrate (2026)» | Judge.me · 29.01.2026 · 13'398 | 15 Kapitel: Layout, Bilder, Titel, Beschreibung, **produktspezifische FAQ**, Ankündigungsleiste, Bewertungen, **UGC-Videokarussell** | App-Anbieter: Kapitel «Bewertungen einbinden» ist Eigenwerbung |
| `_E3TLxpUcwI` «Enable Free Listings [2026]» | Shortcut Academy · 04.02.2026 · 361 | keine Kapitel, keine Beschreibung → **nichts** | — |
| `NSnIRNowwJI` «Average Shopify Conversion Rate 2026» | codingtutor · 03.08.2026 · 11 | nichts → Zahlen stattdessen aus dem Shopify-Blog (unten) | — |
| `TFzixqET9ds`, `zGPCTF32aMY` (Dropshipping Schweiz) | — | **keine Seite** (Abrufe 11–13 = Drossel) → nächste Runde zuerst | — |

Ersatzquellen (QUELLE): Shopify-Blog «Ecommerce conversion rate» (Aug 2026): **1,4 %** Ø (Statista Q1 2026), 2,66 % (Dynamic Yield), **Mobile 2,0 % vs Desktop 3,7 %** (Contentsquare), ~70 % des Verkehrs mobil.
Google «Misrepresentation»-Richtlinie (offiziell): aktuelle Kontaktangaben + «Über uns», eigene Marke/Logo, AGB + Versandinfo vor dem Kauf, Rückgabe klar auffindbar, Gesamtpreis/Währung vollständig, Zertifikate aktuell.

## 2. Gegenprobe am eigenen Shop (GEMESSEN, Admin-API 09:40–09:55 UTC)

**a) Merchant-Website-Anforderungen (KeyCommerce-Kapitel 1 + Google-Richtlinie)**
- 6 Shop-Richtlinien vorhanden: Kontakt, Impressum, Datenschutz, Rückgabe, Versand, AGB (alle mit URL).
- Footer: 14 Einträge, **alle 14 Zielseiten veröffentlicht** (versand-lieferung, tracking, rueckgabe, garantie, faq, kontakt-support, ueber-uns, impressum, cookie-richtlinie, data-sharing-opt-out, merkliste, alle-kategorien, AGB, Datenschutz).
- Kontakt & Support: Adresse ✔ · Mail ✔ · Telefon ✗ · Über uns: Adresse ✔ Mail ✔ · Impressum: Adresse ✔ Mail ✔ **Telefon ✔** · Shop-Profil-Telefon leer.
- **UID (CHE-Nr.) steht auf KEINER Seite** — die Nummer ist im Repo nicht bekannt → Betreiber-Klick (COWORK-AUFTRAEGE).
- Lieferzeit-Staffel ist auf vier Seiten UND im Produkt-Accordion **identisch** (CH-Lager 1–2 · EU 2–7 · Druck 7–14 · Direkt 10–20 Werktage); Wächter `versandaussagen_wahrheit.py` hält sie. Nichts zu reparieren — vorher gemessen, nicht «korrigiert» (Falle 20.08.).
→ **Fazit: Anforderungen erfüllt bis auf die UID.** Der Kanal verkauft ja seit Monaten (4 von 10 Bestellungen).

**b) Produktseiten-Checkliste (Judge.me-Kapitel) gegen `templates/product.json` LIVE**
- Bewertungs-Widget + Sterne-Badge ✔ (Judge.me-App-Blöcke) · Ankündigungsleiste ✔ (5 rotierende Botschaften) · Accordion «Versand & Lieferung» + «Rückgabe & Umtausch» ✔ · Faktenblock `lux_spezifikationen` liest `mm-google-shopping.material` — **9 von 25** neuesten CJ-Produkten tragen es.
- ⚠️ Die Backup-Fassung `theme_backup/product.json` (30.08.) hatte noch eine dritte Zeile «Material & Pflege» mit Floskeltext («Hochwertige Materialien sorgfältig ausgewählt…») — **live ist sie weg.** Beinahe eine Reparatur an einem zwei Wochen alten Backup. **Backup ≠ live.**
- Fehlt: produktspezifische FAQ ✗ · UGC-Kundenvideos ✗ (CJ-Produktvideos liegen für eine Teilmenge in der Galerie, #36). Beides braucht echte Kundeninhalte (#31 Einwilligung) — nichts, was man erfinden darf (NIE Fake-Reviews/UGC).

**c) Conversion**
- Eigener Trichter (Stand 14.09., 30 Tage): ~1'300 Sitzungen · 77 % mobil · 12 Warenkörbe · **1 Abschluss ≈ 0,08 %**. QUELLE-Ø 1,4 % wären bei 1'300 Sitzungen **18 Bestellungen**.
- Warenkorbrate 0,9 % — der Verlust liegt zwischen Warenkorb und Kasse (Endbetrag-Befund 09.09., Nachmessung #68 am 23.09.). Die Videos lehren Produktseiten-Aufbau; der Engpass ist Verkehr (1'300 Sitzungen) und die Kasse — nicht das Layout.

## 3. Lehren
1. **Aufrufe und Kapitel VOR dem Abruf prüfen.** 11 und 361 Aufrufe ohne Kapitel = zwei von zwölf Abrufen verschenkt, und die zwei Schweiz-Videos fielen in die Drossel. Reihenfolge: Datum ≥ 2026, Aufrufe ≥ 1'000, Kanal mit Beschreibungs-Kapiteln (Agenturen, App-Anbieter) — die haben ein Motiv, aber auch Inhalt, der sich messen lässt.
2. **Backup ≠ live.** Ein Befund aus `theme_backup/` ist ein Befund über die Vergangenheit. Vor jeder Theme-Reparatur die LIVE-Datei per `theme.files(filenames:[…])` holen.
3. **Zwei Quellen mit Motiv wurden brauchbar, weil beide gegen eine motivlose Referenz gemessen wurden** (Google-Richtlinie, eigener Bestand). Ohne Referenz wäre «Merchant-Anforderungen» eine Sperr-Angst-Verkaufsseite geblieben.

## 4. Offen
- Betreiber: UID ins Impressum (Nummer nicht im Repo).
- Nächste YouTube-Runde: zuerst `TFzixqET9ds` («Verkaufen in der Schweiz») und `zGPCTF32aMY` (ECOMVERSE Schweizerdeutsch), dann Kapitel 36:13–50:09 von KeyCommerce (Feed-Optimierung) gegen `automation/google_feed/`.

## 5. Nachtrag 17:20 UTC — Betreiber-Link `bTojWZdiG60` «Claude kann jetzt ALLES in Shopify (Tutorial)»

**Quelle:** Kanal Vilius (@ViliusLite, «Online-Millionär», verkauft Kurse), ~3 Wochen alt. YouTube drosselt uns seit der
Morgenrunde (HTTP 429, auch nach 90 s Pause) → **Titel/Kanal über den oEmbed-Endpunkt** (`youtube.com/oembed?url=…`,
ungedrosselt, kein Transkript, keine Kapitel). Inhalt laut Suchtreffer: «Shopify-Shop mit Claude Code 2026 optimieren,
ohne selbst zu programmieren». Deckungsgleich mit dem Thema von gestern (`LERNEN-SHOPIFY-CLAUDE-2026-09-13.md` §2:
Shopify AI Toolkit) und dem deutschen Blog digitalsprung.de (QUELLE): vier Ebenen — Shopify-Connector (Chat-Verwaltung),
Storefront MCP (KI-Einkaufsassistent für Kundinnen, läuft automatisch), Dev MCP/AI Toolkit (Claude Code + Doku/Schema/
Validierung, nur im Duplicate-Theme mit Git), Claude for Chrome. Grenze: Checkout-Kern nur mit Plus.

**Gegenprobe am eigenen Shop (GEMESSEN 17:10 UTC):**
- Ebenen 1 und 3 sind hier Alltag: Shopify-Connector + Admin-API (`autopilot2`), Theme-Änderungen mit Backup und
  Rücklesen — das Video beschreibt, was diese Sitzung seit Juni tut. **Nichts Neues zu übernehmen.**
- Ebene 2, der KI-Einkaufsassistent, ist der eine Punkt, den noch niemand gemessen hatte:
  - `luxestyle.ch/api/mcp` → 200, aber **nur `search_shop_policies_and_faqs`** (alter Endpunkt, Abschaltung 31.08.2026
    angekündigt, antwortet noch).
  - `luxestyle.ch/api/ucp/mcp` → 200, **10 Werkzeuge**: get/create/update/complete/cancel_checkout, get/create/update/
    cancel_cart, get_order. Katalogsuche (`search_catalog`) verlangt ein UCP-Agentenprofil bzw. JWT — meine Probe mit
    einer Nicht-Profil-URL: 422 «Missing ucp version». Das ist Shopify-Standard, kein Schalter bei uns.
  - **Fazit: Der Shop ist für KI-Einkaufsagenten (UCP) bereits erreichbar; einstellen muss der Betreiber nichts.**
    Ob je ein Agent kauft, ist nicht messbar, bis eine Bestellung mit UCP-Quelle auftaucht — die Bestell-Ampel würde
    sie wie jede andere zeigen.
- Nicht übernommen: WebMCP (Browser-Werkzeuge für Agenten im Tab der Kundin) — laut Doku auf jedem Liquid-Theme
  «live today», Agentenunterstützung nur Chromium; nichts zu tun.

**Lehre:** Wenn YouTube drosselt, liefert oEmbed Titel und Kanal in einer Sekunde — genug, um zu entscheiden, ob ein
Video eine zweite Runde wert ist. Dieses war es nicht: ein Kurs-Kanal erklärt den Connector, den wir betreiben.
