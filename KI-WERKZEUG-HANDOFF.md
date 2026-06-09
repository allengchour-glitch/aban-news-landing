# 🛠️ Session-Handoff — KI-Werkzeug (`ki-werkzeug.html`)

> Für die separate Tool-Session. Stand 2026-06-09. Enthält die **Antworten/Entscheidungen des Users**
> (aus dem Newsletter-Chat durchgereicht) — bitte hier weiterbauen, nicht im Newsletter-Chat.

## 📌 2026-06-09 — Kunden-Überblick + Funnel + Gemini-Kontrolle (alles live auf `main`)
- **PR #480 gemergt → live:** Feature-Überblick „Alles für deinen Betrieb" (5 Karten) unter dem Hero,
  „Gratis vs Pro"-Vergleichsblock (Preis folgt Branchen-Stufe, `#pro-price-2`), Branchen-Guide + Hilfe-Link
  in jedem Text-Ergebnis (`#t-more`, Anker `#hilfe`), 4 kaputte Fahrplan-Slugs gefixt (alle 20 Branchen →
  echte Seite, sonst `/online-tools.html`), JSON-LD-Preise 9.90/19.90.
- **PR #480 (Teil 2) — Funnel:** `tools/add_branchen_funnel.py` um KI-Werkzeug-Hauptbutton erweitert +
  idempotent in **alle 289 `ki-fuer-*.html`** eingespielt (Branchen-Traffic → Tool).
- **PR #487:** Gemini-Kritik-Workflow-Default zeigte auf tote `/dossier/ki-werkzeugkasten.html` → jetzt
  `/ki-werkzeug.html` + `/online-tools.html`.
- **Gemini-Kontrolle gelaufen (7/10), Report `reports/site-critique-abannews-2026-06-09.md`.** Behoben:
  **PR #488** — `online-tools.html` Umlaut-/Grammatik-Fix (war durchgängig „fuer Selbststaendige", URLs geschont).
- **🟡 OFFENE USER-ENTSCHEIDUNGEN aus der Gemini-Kritik (bewusst NICHT autonom umgesetzt):**
  1. **Shop/Premium/Preise aus der Startseiten-Nav entfernen** — Gemini empfiehlt es fürs Abo-Ziel,
     widerspricht aber der Monetarisierung (Shop/Founding/Pro) + dem neuen Funnel → **User-Call.**
  2. **CTA-Beschriftung vereinheitlichen** („Gratis abonnieren" / „5-Min-Briefing gratis →" / „Newsletter gratis")
     → Marken-/Copy-Entscheidung.
  3. Mobile-Sticky-CTA **existiert bereits** (`.sticky-sub`/`.mcta`, nach Scroll) — kein Handlungsbedarf.
  4. „Frag aban"-FAB (`js/assistant.js`, fixed unten-rechts) überlappt evtl. Newsletter-Vorschau — FAB-typisch,
     ohne Render schwer prüfbar → offen gelassen.

## Stand (live-bereit, Demo-Modus)
- Seite: `ki-werkzeug.html` → live unter `abannews.com/ki-werkzeug.html` (PR #477 gemergt).
- **Texte erstellen** (Branche → Stichworte → Entwurf: Produkttext / Social-Post / Bewertungs-Antwort / Kunden-Mail) + **KI-Fahrplan** (3 Fragen → Plan + Checkliste).
- Aktuell **vorlagenbasiert im Browser** (kein Datenversand) — passt zur „kein Login/Upload"-Linie.
- **Vorbereitete Schalter im Code** (für „scharf schalten"):
  - `AI_ENDPOINT` (~Z. 330/507) → echte KI über kleinen **Cloudflare-Worker** (versteckt den API-Key).
  - `STRIPE_PRO_LINK` (~Z. 323/329/541) → echter Stripe-Kauf (1 Zeile).
  - **Tageslimit** via `localStorage` (~Z. 344–350; `LIMIT`-Konstanten ~Z. 498–528): gratis **5 Texte + 1 Fahrplan/Tag**, danach Pro-Kaufbutton.
- Preis: **CHF 9.90/Monat — ENTSCHIEDEN** (`#pro-price`).
- Verlinkt in `online-tools.html` + `sitemap.xml`.
- **NEU (umgesetzt): Pro hebt das Tageslimit auf.** `isPro()`/`setPro()`/`applyPro()` + localStorage-Flag
  `aban_kw_pro`. Aktivierung per **Checkout-Rückkehr `?pro=ok`** ODER **Freischalt-Code** (`PRO_UNLOCK_CODE`,
  Default `aban-pro`). `quota()` gibt bei Pro `left=Infinity` → Vorlagen unbegrenzt, kein Upsell;
  `refreshQuota()` zeigt „Pro · unbegrenzt".
- **NEU (umgesetzt): Kunden-Überblick auf der Seite** („vorbereite so viel wie möglich für kunden",
  „mach die seite mit gutem überblick"): (1) **„Alles für deinen Betrieb"**-Feature-Grid direkt unter dem Hero
  (5 Karten: Produkttext / Social-Post / Bewertungs-Antwort / Kunden-Mail / KI-Fahrplan, reuse `.steps`/`.step`);
  (2) **„Gratis vs Pro"-Vergleichsblock** vor der Kaufbox (`.compare`/`.plan`, `#pro-price-2` folgt der Branchen-Stufe
  via `updateProTier`); Zwischen-Überschriften `.ov-h`/`.ov-sub` für klare Gliederung.
- **NEU (umgesetzt): 2 Preis-Stufen nach Branche** (`updateProTier`, `PROPLUS_BRANCHEN`):
  - **Standard `STRIPE_PRO_LINK` = CHF 9.90** (`https://buy.stripe.com/6oUdRbfKKcfq03ZbaR5wI05`) — die meisten Branchen.
  - **Pro+ `STRIPE_PROPLUS_LINK` = CHF 19.90** (`https://buy.stripe.com/6oU00l1TUcfqg2XdiZ5wI06`) — regulierte/sensible:
    Praxis/Therapie, Immobilien/Makler, Beratung/Coaching. Preis + Kauf-Link folgen automatisch der Branchen-Auswahl.
- ⚠️ **User-TODO (sonst kein Auto-Unlock):** in **beiden** Stripe-Payment-Links „After payment → Redirect" auf
  `https://abannews.com/ki-werkzeug.html?pro=ok` setzen. Sonst muss der Käufer den Freischalt-Code nutzen.
- **AI_ENDPOINT** weiter offen (echte KI). Hinweis: Client-Unlock (`?pro=ok`/Code) ist UX und umgehbar — kostenlos ist
  aber nur die Vorlage (0 Grenzkosten). Die echte **Kosten-/Pro-Durchsetzung muss der Worker** machen.

## 🟢 Antworten/Wünsche des Users (UMSETZEN)
1. **Themen verlinken + Zahlung am Schluss:** In den Tool-Ergebnissen die passenden **Themen/Branchen-Hubs verlinken**; nach Erreichen des Gratis-Limits **am Ende einfach die Zahlung** zeigen.
   → User fragte „oder ist das C?": Ja — das **Einbauen des Tool-Buttons in alle 289 Branchen-Hubs (Option C)** ist gewünscht (Funnel). Es gibt ein Skript-Muster im Repo (`tools/add_branchen_funnel.py` / `tools/add_dossier_link.py`) als Vorlage.
2. **Mehr Details + Hilfe-Link** in der Ausgabe: User will „mit viel Details und Link zur Hilfe". → Ergebnisse anreichern + Hilfe/Anleitung verlinken.
3. **Kosten-Limit:** „wenn zu viel benutzen kosten → mach ein Limit." → Tageslimit beibehalten/strenger; bei echter KI zusätzlich **Budget-/Rate-Limit pro Nutzer** (Cent-Kosten je Generierung im Blick).
4. **Bilder?** → **Offen** — User fragt, ob Bilder rein sollen. Noch nicht entschieden.

## 🟡 Offene Entscheidungen
- **Pro-Preis:** ✅ **ENTSCHIEDEN — CHF 9.90/Monat.** (Eingetragen.)
- **`PRO_AI_DAILY_CAP`-Wert:** Default 50/Tag gesetzt; finalen Wert mit KI-Budget festlegen.
- **Bilder** im Tool: weiterhin offen (User-Entscheidung).

## 💡 Learnings (vom User: „aktualisiere memory und lerne")
- **„Unbegrenzt" muss verlustsicher sein.** User-Vorgabe: *„Pro = unbegrenzt, nicht dass ich minus mache."*
  → Trennung nach Grenzkosten: **Vorlagen = 0 €/Aufruf → für Pro echt unbegrenzt** (sicher);
  **echte KI = Cent/Aufruf → „unbegrenzt (faire Nutzung)"** mit Cap.
- **Kosten-Bremse gehört serverseitig.** Client-`localStorage`-Limits sind UX und **umgehbar** →
  der echte Fair-Use-/Budget-Cap (`PRO_AI_DAILY_CAP`) muss im **Cloudflare-Worker hinter `AI_ENDPOINT`**
  erzwungen werden. Niemals dort den API-Key ins Frontend legen.
- **Preis-Anker nutzen:** 9.90 lehnt sich an den bestehenden 9-€/Mon-Monitor an → konsistentes Pricing.
- **Pro-Freischaltung ohne Backend möglich:** `?pro=ok`-Redirect nach Stripe-Success + manueller
  Freischalt-Code überbrücken die Zeit, bis Stripe-Webhooks stehen.

## ⚠️ Vom User nötig zum Scharfschalten (kann die Session NICHT selbst)
- **Stripe-Konto** + fertiger Payment-Link → in `STRIPE_PRO_LINK`.
- **KI-API-Schlüssel mit Budget** (z. B. Gemini/OpenAI) → in den Cloudflare-Worker hinter `AI_ENDPOINT` (jede echte Generierung kostet Cent-Beträge → daher Punkt 3, Limit).

## Nächste Schritte (aus der Tool-Session, Auswahl)
- **A)** Echte KI + Stripe scharfschalten (sobald Konten da).
- **B)** EN/FR/IT-Versionen des Tools.
- **C)** Tool-Button automatisch in alle 289 Branchen-Hubs (Funnel) — **vom User gewünscht** (s. Punkt 1).
- **D)** So lassen, User testet selbst.

> Empfehlung für die Tool-Session: **Punkt 1–3 umsetzen** (Themen-Links, mehr Details+Hilfe, Limit härter),
> **C** vorbereiten (Funnel-Skript), und **Preis/Bilder** beim User abfragen, bevor A scharf geschaltet wird.
