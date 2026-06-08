# 🛠️ Session-Handoff — KI-Werkzeug (`ki-werkzeug.html`)

> Für die separate Tool-Session. Stand 2026-06-08. Enthält die **Antworten/Entscheidungen des Users**
> (aus dem Newsletter-Chat durchgereicht) — bitte hier weiterbauen, nicht im Newsletter-Chat.

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
  `refreshQuota()` zeigt „Pro · unbegrenzt". Vorlagenpfad live; Stripe-Link/AI-Endpoint noch offen.

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
