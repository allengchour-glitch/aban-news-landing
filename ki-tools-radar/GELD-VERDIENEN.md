# 💰 Geld verdienen mit KI-Tools Radar — dein praktischer Leitfaden

Herzlichen Glückwunsch: Die Seite steht, die Technik läuft.  
Jetzt geht es darum, wie aus Besuchern tatsächlich Einnahmen werden.  
Diese Anleitung erklärt es Schritt für Schritt — ehrlich, ohne Versprechen, die nicht haltbar sind.

---

## 🤔 Wie verdient diese Seite Geld?

Das Modell heißt **Affiliate-Marketing** und funktioniert so:

1. Jemand sucht bei Google nach einem KI-Tool.
2. Er landet auf einer Seite von KI-Tools Radar.
3. Er klickt auf deinen persönlichen Affiliate-Link.
4. Er kauft das Tool (oder abonniert es).
5. Der Anbieter zahlt dir eine **Provision** — automatisch, ohne dass der Käufer mehr bezahlt.

Du musst nichts verkaufen, nichts versenden, niemanden anrufen.  
Die Seite arbeitet rund um die Uhr für dich.

**Recurring-Provisionen sind Gold wert:**  
Bei vielen Programmen bekommst du nicht nur einmal Geld, sondern jeden Monat, solange der Kunde dabei bleibt.  
Beispiel: Jemand abonniert ein Tool für 50 € / Monat, du bekommst 30 % → 15 € jeden Monat.  
Nach 12 Monaten sind das 180 € aus einem einzigen Klick.

---

## 📊 Realistische Erwartungen

Kurz und ehrlich:

- **Monat 1–3:** Kaum Google-Traffic. SEO braucht Zeit. Die ersten Besucher kommen aus deinem Newsletter.
- **Monat 3–6:** Google fängt an, einzelne Seiten zu indexieren. Erster organischer Traffic.
- **Monat 6–12:** Wenn du regelmäßig neue Tools hinzufügst, wächst die Sichtbarkeit spürbar.
- **Realistisches Ziel nach 12 Monaten:** Einige hundert Besucher pro Monat, erste Provisionen.  
  Kleine Nischenseiten verdienen typisch 100–500 € / Monat — manche deutlich mehr, manche weniger.

Was bestimmt den Erfolg?
- Wie viele Besucher kommen (Traffic).
- Ob du bei den richtigen Programmen angemeldet bist (Conversion & Provision).
- Ob du die Seite mit der Zeit pflegst (neue Tools, neue Seiten).

Es ist kein Schnell-reich-werden-Plan. Es ist ein kleines, wachsendes Standbein.

---

## ✅ Schritt 1: Bei Affiliate-Programmen anmelden

In der Datei `affiliate.json` (liegt im Projektordner) stehen die besten Programme bereits aufgelistet.  
Du musst dich bei jedem einzeln bewerben — die meisten nehmen Solo-Betreiber problemlos an.

**Wo anmelden? Suche bei Google nach "[Tool-Name] affiliate program".**  
Meistens findest du die Anmeldeseite direkt auf der Website des Anbieters.

### Empfohlene Programme (mit Konditionen):

| Tool | Provision | Art |
|---|---|---|
| **Jasper** | 30 % | Recurring (12 Monate) |
| **GetResponse** | 40–60 % | Recurring (12 Monate) |
| **Systeme.io** | 60 % | Lifetime |
| **Writesonic** | 30 % | Lifetime |
| **ElevenLabs** | 20 % | Recurring (12 Monate) |
| **Semrush** | bis 200 $ pro Sale | Einmalig + Abo |
| **Canva** | variabel | Einmalig |

**Priorität:** Fang mit den recurring- und lifetime-Programmen an.  
Die zahlen über Zeit am meisten.

Wenn du bei einem Programm angenommen wirst, bekommst du einen persönlichen Link (sieht etwa so aus: `https://jasper.ai/?fpr=DEIN-CODE`).  
Den brauchst du für Schritt 2.

---

## 🔗 Schritt 2: Deine Links eintragen

Öffne die Datei `affiliate.json` im Projektordner.  
Dort siehst du ein leeres `"links"`-Objekt.  
Trage für jedes Tool, bei dem du angenommen wurdest, deinen persönlichen Link ein.

**Beispiel — so sieht es vorher aus:**
```json
{
  "links": {}
}
```

**Und so nach dem Eintragen:**
```json
{
  "links": {
    "jasper": "https://jasper.ai/?fpr=DEIN-PERSOENLICHER-CODE",
    "systeme": "https://systeme.io/?sa=DEIN-CODE",
    "elevenlabs": "https://elevenlabs.io/?ref=DEIN-CODE"
  }
}
```

Die Tool-ID (z. B. `"jasper"`) muss genau so geschrieben sein wie in der Datei `data/tools.json`.

**Was passiert dann automatisch:**  
Die Seite erkennt den eingetragenen Link und markiert ihn mit einem `*` und einem Hinweis wie *"Partnerlink — für dich kostenlos, wir erhalten eine Provision."*  
Das ist keine Kür, sondern **Pflicht** — das deutsche UWG (Gesetz gegen unlauteren Wettbewerb) verlangt, dass Affiliate-Links klar gekennzeichnet sind.  
Die Kennzeichnung passiert automatisch, du musst nichts weiter tun.

Nach dem nächsten Build sind die Links live.

---

## 📣 Schritt 3: Besucher bekommen

### a) Aban News Newsletter — der schnellste Weg

Du hast bereits eine Leserschaft.  
Schreib einen kurzen Teaser im nächsten Newsletter:  
*"Ich habe eine neue Seite gebaut: KI-Tools Radar. Über 200 Tools, 11 Sprachen, kostenlos. Hier schaust du rein: radar.abannews.com"*

Das sind sofortige Besucher von Menschen, die dir bereits vertrauen.  
Ein Klick aus dem Newsletter ist mehr wert als zehn zufällige Besucher aus dem Nirgendwo.

### b) Google SEO — der wichtigste langfristige Kanal

Die gute Nachricht: Das ist bereits erledigt.

Die Seite hat beim Start:
- **6.688 Seiten** in 11 Sprachen
- Korrekte Sitemaps (damit Google alle Seiten findet)
- Strukturierte Daten (damit Google den Inhalt versteht)
- Mehrsprachige hreflang-Tags

Du musst nichts konfigurieren. Google wird die Seiten nach und nach einlesen.  
Das dauert Wochen bis Monate — aber dann arbeitet es dauerhaft für dich.

### c) Social Media — gezielt, nicht überall

Teile keine leere Startseite. Teile konkrete Seiten, die für sich sprechen.

Beispiele, die gut funktionieren:
- *"ChatGPT vs. Claude — welches ist besser für Texte?"* (Vergleichsseite)
- *"Die 5 besten KI-Tools für Freelancer"* (Kategorienseite)
- *"ElevenLabs im Test: lohnt sich das?"* (Tool-Detail)

LinkedIn funktioniert gut für KI-Themen.  
Du musst nicht täglich posten — eine gute Seite pro Woche reicht.

---

## ⏳ Schritt 4: Geduld + nachlegen

Die Seite baut sich automatisch wöchentlich neu auf.  
**Je mehr Tools du in `data/tools.json` einträgst, desto mehr Seiten entstehen — und desto mehr Einstiegspunkte bei Google.**

Konkret: Füge jede Woche 3–5 neue Tools hinzu.  
Konzentriere dich auf Tools, bei deren Affiliate-Programmen du bereits angemeldet bist.

Ein neues Tool in `data/tools.json` → automatisch neue Detail-Seite in 11 Sprachen → potenziell 11 neue Google-Einträge.  
Das summiert sich.

Du musst keinen Code anfassen. Nur die JSON-Datei pflegen und den Rest die Technik machen lassen.

---

## 💸 Was kostet mich das?

Eigentlich nichts.

| Kostenposten | Betrag |
|---|---|
| Domain `radar.abannews.com` | 0 € (Subdomain deiner bestehenden Domain) |
| Hosting (Cloudflare Pages) | 0 € |
| Werbung / Ads | 0 € |
| Tracking-Tools | 0 € |
| **Gesamt** | **0 €** |

Die einzige Investition ist deine Zeit: Links eintragen, neue Tools hinzufügen, ab und zu im Newsletter erwähnen.

---

## 🤝 Zum Schluss

KI-Tools Radar ist keine Maschine, die von alleine reich macht.  
Es ist ein ehrliches kleines Projekt: nützlicher Inhalt, transparente Empfehlungen, faire Kennzeichnung.

Wenn du regelmäßig nachlegt und ein bisschen Geduld mitbringst, kann daraus ein solides Nebeneinkommen werden.  
Kein Drama, kein Hype — einfach konsequent dranbleiben.

Viel Erfolg, Aban.
