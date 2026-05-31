# 🚀 Launch-Checkliste — was jetzt zu tun ist

> **Stand:** Mai 2026. Das Technische ist gebaut und live-fähig (49 Seiten, 158 Tools,
> 9 SEO-Vergleichsseiten, 8 Geld-Kanäle, PayPal-Zahlung, Stundensatz-Rechner,
> 6 Automatik-Workflows, Sitemap mit 99 URLs). **Was jetzt zählt, kann kein Code mehr
> leisten — nur du.** Diese Liste ist die ehrliche Reihenfolge.

---

## 🔴 Sofort (Sicherheit & Aufräumen)

- [ ] **Discord-Webhook rotieren.** Falls je ein Webhook in einem Chat stand: in Discord
      löschen → neu erstellen → die neue URL **nur** als GitHub-Secret `DISCORD_WEBHOOK_URL`
      eintragen (`Settings → Secrets and variables → Actions`), niemals in Code/Chat.
- [ ] **Alte Cloudflare-Pages-Projekte aufräumen.** Die separaten Projekte
      `radar`, `foerder`, `jobs`, `kurse` (und ggf. weitere) schlagen bei jedem Push fehl,
      weil sie im CF-Dashboard auf dieses Repo zeigen, aber kein eigenes Output-Verzeichnis
      haben. Diese Inhalte sind **jetzt Seiten in abannews** (`/radar.html` usw.).
      → Im Cloudflare-Dashboard für jedes dieser Projekte: **Git-Integration trennen oder
      Projekt löschen.** Danach ist das CI-Rauschen weg.

## 🟠 Damit Geld fließen *kann* (deine Accounts nötig)

- [ ] **Founding-PayPal testen.** `abannews.com/founding.html` öffnen, prüfen ob der
      PayPal-Button erscheint, einen echten Test-Kauf machen (als Refund zurückbuchbar).
- [ ] **„Lifetime"-Freischaltung planen.** PayPal sagt dir *dass* gezahlt wurde — den
      Premium-Zugang (Discord/Verteiler) schaltest du **manuell** frei.
- [ ] **Produkt-Zahlung** (`produkte.html`): Aktuell laufen Bestellungen per E-Mail
      (Vorkasse). Wenn du willst, je Produkt einen PayPal-Hosted-Button erstellen und die
      Button-ID hier hinterlegen lassen — dann werden die Buttons echte Kauf-Buttons.
- [ ] **Beratung** (`beratung.html`): Cal.com-Booking-Link eintragen (TODO im Code).

## 🟡 Affiliate (eigene Session / wenn du Programme hast)

- [ ] Bei Partnerprogrammen anmelden (z. B. Tool-Anbieter, Kursplattformen).
- [ ] Echte Affiliate-Links in die vorbereiteten Templates einsetzen — Marker
      `AFFILIATE-URL` in: `deals.html`, `kurse.html`, `radar.html`,
      `geld-verdienen-mit-ki.html`. Kennzeichnung mit `*` + `rel="sponsored"` ist schon
      vorbereitet (konform zur Transparenz-Seite).
- [ ] **Wichtig:** Die Tool-Database (`tools.html`) bleibt bewusst **affiliate-frei** —
      das ist ihr Trust-USP. Affiliate gehört nur in die Geld-Kanäle.

## 🟢 Besucher holen (der eigentliche Hebel — kostenlos, aber Arbeit)

> Ehrliche Wahrheit: Es gibt **keinen Knopf**, der aus 0 Besuchern Geld macht. Besucher
> kommen aus (a) Google/SEO — wirkt erst nach Wochen/Monaten, läuft jetzt automatisch an —
> und (b) **du teilst es**, dort wo deine Zielperson (DACH-Solo/Freelancer) ist.

- [ ] **Google Search Console** einrichten und `sitemap.xml` einreichen
      (`https://abannews.com/sitemap.xml`) → beschleunigt die Indexierung.
- [ ] **3 ehrliche Build-in-Public-Posts** veröffentlichen (LinkedIn + relevante
      Reddit-/Fach-Communities). Aufhänger, die funktionieren:
  - „Ich hab als Einzelperson 158 KI-Tools für DACH verglichen — hier die ehrliche Liste."
    → verlinkt `/tools.html` + eine `/vergleich-*.html`
  - „Stundensatz-Rechner für Freelancer gebaut (gratis, rechnet im Browser, kein Tracking)."
    → verlinkt `/stundensatz-rechner.html`
  - „KI-Förderungen für DE/AT/CH übersichtlich — was 2026 noch aktiv ist."
    → verlinkt `/foerder.html`
- [ ] **An 5–10 Bekannte** direkt schicken, die in die Zielgruppe passen.
- [ ] Danach: **jede Woche 2–3 Posts.** Dranbleiben schlägt Perfektion.

## 🔵 Läuft schon automatisch (nichts zu tun)

- ✅ `deploy-check` — validiert HTML/Links/JSON-LD bei jedem PR
- ✅ `build_tools_top30 --check` — hält `tools.html` synchron mit `tools.json`
- ✅ `build_compare_pages --check` — hält die 9 Vergleichsseiten synchron
- ✅ `data-freshness` (monatlich) — meldet veraltete Förder-/Kurs-/Radar-Daten per Issue
- ✅ `link-check` (monatlich) — meldet tote externe Links per Issue

## 📊 Wann du Geld verdient hast
Sichtbar in den jeweiligen Dashboards: **PayPal** (Founding/Produkte), **Affiliate-Partner**
(Provisionen), **beehiiv** (Abo-Zahlen). aban news kann das nicht für dich abrufen — dort steht's.

---

### Realistische Erwartung (ehrlich)
Dein eigenes Marketing-Playbook nennt 100–500 €/Monat nach 6–12 Monaten konsequenter Arbeit.
Das Fundament steht jetzt überdurchschnittlich gut. Der Rest ist **Marketing-Ausdauer** —
und die kann dir niemand abnehmen. Viel Erfolg. — gebaut mit aban news 🐝
