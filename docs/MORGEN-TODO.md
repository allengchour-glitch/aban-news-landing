# Abend-To-Do (nur DU) — Stand 2026-06-08

> Alles Code-seitige ist gebaut & gemergt. Hier stehen nur Schritte, die ein
> **Konto/Login/Secret** brauchen — das kann ich nicht. Reihenfolge = Wirkung.
> Sobald ein Punkt erledigt ist: sag mir das Stichwort in Klammern, dann macht
> die Maschine (Sync/Workflows) den Rest automatisch.

## 🔴 1. `STRIPE_API_KEY` setzen — der grösste Umsatz-Hebel (~2 Min)  → Stichwort: „sync"
Aktuell sind nur **5 von 11** Kits kaufbar; EN-Shop hat **0** Kauflinks; das Bundle (CHF 79) auch nicht.
- Stripe-Dashboard → Developers → API keys → **Secret key** (`sk_live_…`) kopieren
- Als **GitHub-Secret `STRIPE_API_KEY`** setzen (Repo → Settings → Secrets → Actions)
- Dann „sync" sagen → `stripe_sync.py` legt **alle fehlenden Kauflinks + Bundle (DE+EN)** an,
  ich verdrahte sie in `shop-products*.json` + ins Product/Offer-Schema.
- 🔒 Falls der Key je im Chat stand → in Stripe **rotieren**.

## 🔴 2. Cloudflare-Deploy-Token reparieren — sonst geht nichts live (~3 Min)
Jeder Deploy schlägt fehl (Auth-Fehler 10000, `radar`-Projekt-Scope). Bis das fixt ist, sieht
**niemand** die neuen Seiten.
- dash.cloudflare.com → Profil → **API Tokens**
- Token mit **Account › Cloudflare Pages › Edit** + **Account › Account Settings › Read**
  (alle Pages-Projekte im Scope, inkl. `radar`)
- als Repo-Secret **`CLOUDFLARE_API_TOKEN`** setzen → Deploy läuft, alle Seiten gehen live.

## 🟡 3. Premium-Briefing-Checkout anlegen (~3 Min)  → Stichwort: „briefing-link"
`premium-briefing.html` zeigt €19/Monat bzw. €190/Jahr, aber der Button fällt auf „Start in Kürze".
- Lemon Squeezy → **New Product → Subscription**, monatlich **19 €** + jährlich **190 €**, Publish
- beide Checkout-Links an mich → ich trage sie ein (Button wird sofort scharf).

## 🟡 4. Erste Newsletter-Ausgabe senden (~10 Min)  → Stichwort: „promote"
Die Maschine baut bild-reiche Ausgaben (`build_issue.py`); **Versand bleibt bei dir** (beehiiv).
- Entwurf prüfen → in beehiiv einfügen → senden
- danach „promote" sagen → ich spiegle die gesendete Ausgabe ins öffentliche Archiv (RSS/Index).

## 🟢 5. Reichweite — das eigentliche Nadelöhr (laufend, ~5 Min/Tag)
Substanz steht (268 DE + je 262 EN/FR/IT Hubs, voll mit Schema). Es fehlen **Besucher**:
- 1–2 Branchen-Hubs/Tag organisch teilen (LinkedIn / Reddit / WhatsApp-Gruppen)
- **beehiiv-Empfehlungsprogramm** aktivieren (erlaubter Wachstumshebel)
- optional: LinkedIn-OAuth setzen (`docs/LINKEDIN-AUTOPOST.md`) → Autopilot postet werktags mit

## 🟢 6. AGB anwaltlich gegenlesen (vor scharfem Verkauf)
`agb.html` ist nach CH-Recht für digitale Produkte gebaut — vor echtem Verkaufsstart kurz prüfen lassen.

---
**Status jederzeit:** `python3 tools/abanctl.py status` · `python3 tools/growth_audit.py`
**Schon erledigt (musst du nicht):** Premium €9/€89 (Lemon Squeezy, live) · Founding €69 (PayPal, live) ·
5 Kits kaufbar · Preise + Product/Offer-Schema auf allen Shop-Seiten · Funnel + BreadcrumbList in allen
Hubs (DE/EN/FR/IT) · growth_audit/consistency/link-check grün.
