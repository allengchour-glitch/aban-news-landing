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
- Preis: **„CHF 9/Monat" ist ein Platzhalter** (~Z. 284).
- Verlinkt in `online-tools.html` + `sitemap.xml`.

## 🟢 Antworten/Wünsche des Users (UMSETZEN)
1. **Themen verlinken + Zahlung am Schluss:** In den Tool-Ergebnissen die passenden **Themen/Branchen-Hubs verlinken**; nach Erreichen des Gratis-Limits **am Ende einfach die Zahlung** zeigen.
   → User fragte „oder ist das C?": Ja — das **Einbauen des Tool-Buttons in alle 289 Branchen-Hubs (Option C)** ist gewünscht (Funnel). Es gibt ein Skript-Muster im Repo (`tools/add_branchen_funnel.py` / `tools/add_dossier_link.py`) als Vorlage.
2. **Mehr Details + Hilfe-Link** in der Ausgabe: User will „mit viel Details und Link zur Hilfe". → Ergebnisse anreichern + Hilfe/Anleitung verlinken.
3. **Kosten-Limit:** „wenn zu viel benutzen kosten → mach ein Limit." → Tageslimit beibehalten/strenger; bei echter KI zusätzlich **Budget-/Rate-Limit pro Nutzer** (Cent-Kosten je Generierung im Blick).
4. **Bilder?** → **Offen** — User fragt, ob Bilder rein sollen. Noch nicht entschieden.

## 🟡 Offene Entscheidungen (vom User bestätigen lassen)
- **Pro-Preis:** User fragt „9 ok, warum 9?" → **Preis NICHT final.** Hintergrund: 9 = Angleichung an den bestehenden „KI-Sichtbarkeits-Monitor" (9 €/Mon). Alternativen vorschlagen (z. B. 7/9/12 CHF/Mon **oder** Einmal-Lifetime), dann eintragen (`STRIPE_PRO_LINK` + Preis-Text ~Z. 284).
- **Bilder** im Tool (s. o.).

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
