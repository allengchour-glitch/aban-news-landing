# Verkaufsseiten-Audit — gemessen, nicht geschätzt

> Auftrag des Users (2026-09-16): „Verkaufsseiten und so" — abannews für Geld verdienen
> durchsehen. Methode wie bei den Handschrift-Runden: erst nachsehen, was wirklich passiert,
> dann ändern, dann gegenprüfen.

## Stand 2026-09-16

### ✅ Erledigt

**1. Shop-Bundle zeigte keine Ersparnis.** Das Bundle „Alle KI-Starter-Kits" (CHF 79) lag neben
20 Einzel-Kits (CHF 12) + 2 Zusatzpaketen (CHF 19) — Einzelsumme CHF 266. Der Rabatt war real
und gross (70 %), stand aber nirgends. `shop.html` berechnet ihn jetzt selbst aus denselben
Daten, die auch die Karten füllen (kein separat gepflegter, sofort veraltender Wert):
**„Spare CHF 187 (70 %) gegenüber Einzelkauf"** auf der Bundle-Karte.

**2. `js/shop-config.js` war ein kaputter Notfall-Schirm.** Diese Datei ist der Fallback, falls
`/data/shop-products.json` nicht lädt (Netzfehler) — sie zeigte noch **3 von 22 Paketen, in
EUR statt CHF, mit leeren Kauf-Links.** Ein Besucher hätte im Fehlerfall einen kaputten
Mini-Shop gesehen statt der echten 22 Pakete. Jetzt 1:1 mit `data/shop-products.json`
synchronisiert (22 Einträge, CHF, echte Stripe-Links).

**Geprüft:** `html-validate shop.html` ohne Befund; Bundle-Karte per Playwright gerendert und
als Bild kontrolliert (Screenshot); die Ersparnis-Formel unabhängig in Python nachgerechnet
(CHF 187 / 70 % stimmt); `js/shop-config.js` mit `node --check` auf Syntax geprüft, 22 Einträge
mit `title`+`buy` verifiziert.

**Zur Einordnung:** die eigentliche Verkaufskette (Katalog → Stripe → geschützter Download) ist
gesund. `tools/shop_selfcheck.py` lief grün (7 ok, 1 Hinweis — `DOWNLOAD_SALT` lokal nicht
gesetzt, das ist in dieser Umgebung normal). Alle 22 Stripe-Zahlungslinks einzeln getestet
(`curl`) — alle antworten mit **200**, kein toter Link.

---

### 🔴 Offen — brauchen eine Entscheidung oder einen Zugang, den ich hier nicht habe

**3. Premium-Briefing zeigt einen anderen Preis als das echte Produkt — und der Kauf-Knopf war
noch nie verkabelt.**

`premium-briefing.html` zeigt **„19 € / Monat"** und **„190 € / Jahr"**, mit leerem
Checkout-Link (`PREMIUM.monthly.url = ""`). Der Knopf fällt darum ehrlich auf „Auf die Liste —
Start in Kürze" zurück (kein kaputter Link, aber auch kein Umsatz).

Es gibt aber bereits ein **echtes, verkabeltes** Premium-Abo — nur an anderer Stelle:
`founding.html` nennt zweimal unabhängig **„€9/mo · €89/Jahr"** als den regulären
Premium-Preis, und `js/pay-config.js` hat dafür fertige Lemon-Squeezy-Checkout-Links
(`PREMIUM_MONTHLY_URL`/`PREMIUM_YEARLY_URL`).

**Warum ich das nicht einfach verkabelt habe:** Die beiden Seiten beschreiben inhaltlich
**unterschiedliche Produkte**, nicht nur unterschiedliche Preise für dasselbe:
- `founding.html`s „Premium" (€9/Monat) = Zusatz zum **täglichen** Newsletter (Voll-Archiv,
  Tool-Datenbank, tägliche Märkte-Ansicht, werbefrei).
- `premium-briefing.html`s „Premium" (angezeigt 19 €/Monat) = ein **monatlicher** Tiefen-Report
  mit Hype-Watch-Verdikten und Leseliste — die Seite grenzt sich in der eigenen FAQ explizit vom
  Tages-Newsletter ab.

Den €9-Link einfach in die 19-€-Seite einzusetzen, hiesse: Kund:in zahlt/erwartet laut
Seitentext etwas anderes, als der Checkout tatsächlich freischaltet. Das wäre genau die Art
Fehler, die diese Session teuer gelernt hat (erst prüfen, dann verkabeln).

**Braucht eine Entscheidung vom User:**
- Ist „Premium-Briefing" ein eigenes, noch zu bauendes Produkt (dann braucht es einen eigenen
  Lemon-Squeezy-/Stripe-Checkout mit echtem Preis) — oder
- ist es dieselbe Idee wie `founding.html`s Premium und die Seite sollte auf €9/€89 + den
  vorhandenen Link umgestellt werden (dann sage ich Bescheid, das ist eine Zeile Arbeit) — oder
- soll die Seite ganz raus/auf founding.html umleiten?

**4. Neun fertige Produkte haben gar keinen Kauf-Link — nur einen Mail-Fallback.**

`js/checkout-config.js` ist die zentrale Verkabelungsstelle für die „neueren" Einzel-/
Abo-Produkte. Von elf Einträgen ist **nur einer** (`MONITOR_ABO_URL`, KI-Sichtbarkeits-Monitor,
9 €/Monat) mit einem echten Stripe-Link belegt. Die restlichen neun sind leer:

| Konstante | Produkt | Preis | verlinkt von |
|---|---|---:|---|
| `PAKET_BUY_URL` | KI-Sichtbarkeit Komplett-Paket | 29 € einmalig | — |
| `DATENSATZ_ABO_URL` | KI-Tools-Datensatz Abo | 9 €/Monat | — |
| `VORLAGEN_BUY_URL` | Klartext-Vorlagen-Set | 19 € | — |
| `NOTFALL_BUY_URL` | Der Notfall-Ordner | 19 € | `notfall-ordner.html`, `digitale-produkte.html` |
| `NOTFALL_EN_BUY_URL` | The Emergency Binder (EN) | 19 € | `en/…` |
| `COMPLIANCE_BUY_URL` | KI-Compliance-Paket | 39 € | Compliance-Seiten |
| `SCHNELLSTART_BUY_URL` | KI-Schnellstart-Workbook | 29 € | Schnellstart-Seite |
| `AUDIT_BUY_URL` | KI-Sichtbarkeits-Audit Workbook | 29 € | Audit-Seite |
| `TEXTE_STARTER_URL` | Texte-Service Starter | CHF 49 einmalig | — |
| `TEXTE_FLAT_URL` | Texte-Service Monats-Flat | CHF 39/Monat | — |

Jede dieser Seiten fällt ehrlich auf eine Mail-Anfrage zurück (kein toter Button — das Muster
ist bewusst so gebaut) — aber das heisst: ein Kauf, der auf den 22 Kits ein Klick ist, ist hier
eine Rückfrage per Mail. Bei digitalen Einmal-Produkten wie dem Notfall-Ordner ist das die
grösste messbare Reibung zwischen „will kaufen" und „hat gekauft".

**Warum ich das nicht selbst geschlossen habe:** Für Stripe-Produkte gäbe es einen fertigen,
narrensicheren Weg — `automation/stripe_sync.py` legt Produkt+Preis+Payment-Link idempotent an,
genau das Muster, das schon die 22 Kits verkabelt. Er braucht nur `STRIPE_API_KEY` als
Env-Variable (kein Dashboard-Zugriff nötig) und einen kleinen zweiten Katalog (analog
`data/kit-catalog.json`) für diese neun Produkte. Ohne den Key kann ich weder neue
Stripe-Produkte anlegen noch bestehende Lemon-Squeezy-Produkte finden — beides braucht Zugang,
den ich in dieser Session nicht habe.

**Zum Scharfstellen:** entweder `STRIPE_API_KEY` (dann baue ich den zweiten Katalog + Sync
selbst und verkabele alle neun automatisch — safe, no-op ohne Key, exakt wie bei den Kits),
oder der User trägt bestehende Lemon-Squeezy-/Stripe-Links direkt in `js/checkout-config.js`
ein (die Datei ist genau dafür gebaut, ein Eintrag pro Zeile).

---

## Nicht angefasst (bewusst)

- Die Preistexte der 22 Kits selbst (Titel/Beschreibung) — solide, konkret, ohne Hype-Floskeln
  (schon in der Handschrift-Runde bereinigt).
- Die FAQ auf `shop.html` — deckt Format, Zahlung, Widerruf, Vorkenntnisse ab; keine Lücke
  gefunden.
- `digitale-produkte.html`s „Prompt-Pack Pro" (`href="#"`, „bald") — ausdrücklich als „bald"
  markiert, kein Bug.
