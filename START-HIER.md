# 🚀 START HIER — dein kompletter Weg zu Abonnenten & Einnahmen

> Alles ist gebaut. Diese Seite ist dein **einziger Einstiegspunkt**: was fertig ist, was nur
> noch DU tun musst (braucht deine Accounts), und in welcher Reihenfolge.
> **Ehrliche Erwartung:** kein schnelles Geld. Mit konsequentem Umsetzen realistisch
> 100–500 €/Monat nach 6–12 Monaten, mit Stapeln mehr. Details: `ki-geld-projekt/MARKETING-PLAYBOOK.md`.

---

## ✅ Was bereits FERTIG ist (von Claude gebaut)
- **📬 Aban News** — Newsletter-Landing (beehiiv), Founding/Sponsoring/Rechtsseiten.
- **📡 KI-Tools Radar** — ~8.270 Seiten, 11 Sprachen, voll-SEO + GEO, Affiliate-fähig.
- **🧭 Förder-Radar** — 99 Seiten, 63 echte Förderprogramme, Lead-Gen-fähig.
- **🤖 KI-Jobs Radar** — täglich auto-aktualisiert (2 Quellen), Sponsoring-fähig.
- **📄 2 Lead-Magnete (PDF)** — KI-Tools + Förderungen, als Anmelde-Geschenk.
- **🎯 Lead-Magnet-Landingpage** — `gratis-ki-tools.html` (PDF gegen Newsletter-Anmeldung).
- **📘 Strategie** — Marketing-Playbook + 2-Wochen-LinkedIn-Content-Plan.
- **💳 Auszahlungs-Erklärung** — Stripe/PayPal, sicher (siehe unten).

## 🔧 Was nur DU tun kannst (braucht deine Accounts) — in Reihenfolge

### Schritt 1 — Live schalten (~30 Min, einmalig)
Pro Projekt auf **Cloudflare Pages** (gratis): Repo verbinden → Build-Command + Output setzen → Subdomain.
| Projekt | Build-Command | Output | Subdomain |
|---|---|---|---|
| KI-Tools Radar | `cd ki-tools-radar && pip install -r requirements.txt && python generate.py` | `ki-tools-radar/dist` | `radar.abannews.com` |
| Förder-Radar | `cd foerder-radar && python generate.py` | `foerder-radar/dist` | `foerder.abannews.com` |
| KI-Jobs Radar | `cd jobs-radar && python fetch_jobs.py && python generate.py` | `jobs-radar/dist` | `jobs.abannews.com` |
> Detail-Anleitung: `ki-tools-radar/LAUNCH.md`. **Tipp aus dem Playbook:** beim Tools-Radar mit
> wenigen Sprachen/Seiten starten und hochfahren (Google-Qualitäts-Filter).

### Schritt 2 — Geld-Quellen aktivieren
1. **Affiliate** (KI-Tools Radar): bei 2–3 Programmen anmelden → Codes in `ki-tools-radar/affiliate.json`.
   Anleitung: `ki-tools-radar/GELD-VERDIENEN.md`. Bevorzugt **recurring** (Jasper, GetResponse, Systeme.io).
2. **Förder-Lead-Gen**: einen Fördermittel-Berater als Partner gewinnen → Link in `foerder-radar/leadgen.json`.
3. **Job-Sponsoring**: Arbeitgeber/Recruiter → Stelle in `jobs-radar/sponsors.json`.
4. **Newsletter-Sponsor** (ab ~500 Abos): Flat 50–250 €/Platzierung (kein CPM unter 5.000 Abos).

### Schritt 3 — Abonnenten gewinnen (der eigentliche Hebel)
1. **Lead-Magnet-Landingpage** `gratis-ki-tools.html` live (gehört zur Newsletter-Seite) →
   Link überall verwenden.
2. **beehiiv:** Willkommens-Mail so einstellen, dass sie das PDF `downloads/top-30-ki-tools-dach-2026.pdf`
   verlinkt (lade es in beehiiv hoch oder verlinke die Live-URL). **beehiiv-Empfehlungsnetzwerk aktivieren** —
   stärkster passiver Wachstumskanal.
3. **LinkedIn:** 2-Wochen-Plan abarbeiten (`ki-geld-projekt/LINKEDIN-CONTENT-PLAN.md`). Als Person posten,
   Link zur Landingpage in Kommentar 1.
4. **Im Newsletter** alle 3 Radars + das PDF anteasern → Cross-Promotion.

---

## 💳 Wo Bankdaten/Auszahlung (sicher!)
- Fast alles läuft über **Stripe** (oder PayPal). Einmal Stripe mit deiner CH-IBAN einrichten = zentrale Auszahlung.
- Bankdaten **nur auf der offiziellen Plattform-Seite** (https) eingeben — **nie** per Chat/Mail/Screenshot.
- **Niemand Seriöses verlangt vorab Geld**, damit du verdienen darfst — das ist immer Betrug.
- US-Affiliates fragen evtl. ein **W-8BEN** (normal, bestätigt CH-Steuerpflicht). Bei echtem Umsatz: Treuhänder fragen.

## 📅 Realistische Reihenfolge fürs erste Quartal
- **Woche 1:** KI-Tools Radar live + Lead-Magnet-Landingpage live + beehiiv-Willkommensmail mit PDF.
- **Woche 1–2:** LinkedIn-Plan starten (3×/Woche), Empfehlungsnetzwerk an.
- **Woche 2–4:** Affiliate-Programme anmelden + Codes eintragen. Förder-/Jobs-Radar live.
- **Monat 2–3:** Cross-Promotion mit 3–5 passenden Newslettern, erste Sponsor-Ansprache ab ~500 Abos.

## Das 80/20 — wenn du wenig Zeit hast
1. **beehiiv-Empfehlungsnetzwerk + Lead-Magnet** (passivstes Wachstum).
2. **3×/Woche ehrlich auf LinkedIn** als Person, Link zur `gratis-ki-tools.html`.
3. **Radars live** als selbstlaufender Affiliate-/Zitations-Motor.

Mehr braucht es zum Start nicht. Alles andere ist Kür — und alles ist schon gebaut.
