# Passiv-Einkommen aktivieren — der „automatisierte Job"

> Ehrliche Einordnung: Das ist der Geld-Weg, der am wenigsten von dir verlangt —
> **einmal anschalten, dann läuft er ohne dich.** Dafür bringt er **wenig und
> langsam** (Affiliate-Cents, Traffic braucht Monate). Kein Reichtum, aber das, was
> du gefragt hast: automatisiert, kleines Einkommen.

---

## Was schon automatisiert ist (alles)
- **Inhalt:** 10 Radars bauen sich selbst (Generatoren, teils Cron — `*-radar/generate.py`).
- **Affiliate-Einbau:** Jeder Generator liest `affiliate.json` und verlinkt **automatisch**
  mit Transparenz-Hinweis (`rel="sponsored"`), sobald ein Link gesetzt ist.
- **Deploy:** Cloudflare Pages deployt jeden Push auf `main` automatisch.

→ Es fehlt **kein Code**. Es fehlt **ein einmaliger Schritt von dir** pro Radar.

## Der eine Schritt, den nur du machen kannst
Affiliate-Programme verlangen deine **Identität + Steuerdaten** — das kann kein Agent.
Pro Radar (fang mit **1–2** an, nicht alle 10):

1. Öffne z. B. `kurse-radar/affiliate.json` → Abschnitt `_programme`. Da steht pro
   Anbieter die **`signup`-URL** (wo du dich bewirbst) — schon kuratiert.
2. Melde dich bei **1–2** Programmen an (z. B. das, dessen Tool du am ehesten empfiehlst).
3. Du bekommst einen **persönlichen Link**. Trag ihn bei `affiliate_url` ein und
   **entferne das `_` vorm Key**.
4. Push → die Seite baut sich neu, markiert den Link mit `*` + Transparenzhinweis,
   verdient ab da Provision. Fertig. Nie wieder anfassen.

> Status heute: **alle Slots deaktiviert** (`_`-Präfix). Fallback = offizielle URL,
> keine Provision. Das ist Absicht — keine Fake-Links.

## Realistisch (damit du nicht enttäuscht wirst)
- **Höhe:** klein. Affiliate sind oft Cents bis wenige € pro Abschluss.
- **Zeit:** Traffic kommt über SEO — **Monate**, nicht Tage. Erst mit Besuchern fließt was.
- **Hebel:** Je mehr echte Inhalte + je mehr Radars live, desto mehr Einstiegspunkte.
  Das wächst von allein (selbst-wachsende Generatoren), du musst nichts tun.

## Bonus: zwei fertige Produkte (anderes Modell)
- **Daten-Produkt** (`daten-produkt/`, Seite `ki-tools-datensatz.html`): KI-Tools-
  Datensatz (CSV+JSON) als **Einmal-Verkauf**. Anschalten = Bezahllink/Marktplatz
  (dein Account) eintragen.
- **KI-Sichtbarkeits-Monitor** (`monitor/`, Seite `ki-sichtbarkeit-monitor.html`):
  **Abo (MRR)**. Anschalten = Zahlungs-/Abo-Link setzen.

> Beide brauchen — wie der Affiliate-Weg — **einmal** deinen Zahlungs-/Account-Schritt.
> Danach laufen sie automatisch.

## Die ehrliche Reihenfolge
1. **Affiliate bei 1–2 Tools anschalten** (30 Min, einmalig) — der passivste Weg.
2. **Radars live lassen** (CF-Deploy läuft schon) — Traffic baut sich auf.
3. **Geduld.** Das ist „Slow Money", kein Schalter zu Reichtum.

> Was du NICHT tun musst: weiter bauen. Es ist alles da. Der „automatisierte Job"
> ist eingerichtet — er wartet nur auf deine eine Anmeldung, dann arbeitet er für dich.
