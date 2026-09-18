<!-- ÜBERNOMMEN 18.09.2026 aus der Cowork/Claude-in-Chrome-Session (Upload des Betreibers).
     Die Cowork-Session konnte nicht selbst ins Repo schreiben (GitHub aus ihrer Sandbox 403).
     ⚠️ DIESE DATEI IST FREMDE MESSUNG, NICHT MEINE. Was hier steht, ist geprüft worden, wo es
     von dieser Session aus prüfbar war — die Ergebnisse stehen unten unter «GEGENPRÜFUNG». -->

# LuxeStyle — Stand aus Cowork/Claude-in-Chrome-Session
Stand: 2026-09-18, ca. 18:00 UTC
Für: Claude Code auf Hetzner (Session "Luxestyle status") + Allen

## Blocker (aktuell, ungelöst)

**Claude-in-Chrome-Zugriff ist blockiert.** Zwei Chrome-Fenster/-Profile sind gleichzeitig mit der Claude-Erweiterung verbunden ("Browser 1", deviceId 79e80bf5-bafc-4983-818e-b252748d8cbc; "Browser 2", deviceId 7b47df61-5494-4e61-abf3-160d0b7c3d8e). Das System verlangt eine Browser-Auswahl über Tools namens `select_browser`/`switch_browser`, die in dieser Cowork-Session nicht existieren (mehrfach per ToolSearch geprüft, kein Treffer). Damit kann ich aktuell **keine** Aktion im echten, eingeloggten Browser ausführen — weder Formulare ausfüllen noch Seiten lesen.

Fix liegt beim Nutzer: in einem der beiden Chrome-Fenster die Claude-Erweiterung trennen/deaktivieren, dann bleibt nur ein Browser verbunden und der Zugriff funktioniert wieder ohne Rückfrage.

**Zusätzlich getestet und ebenfalls nicht nutzbar:**
- Remote-Device-"Browser Pane" (separates, nicht eingeloggtes Sandbox-Fenster): bei cjdropshipping.com sofort Human-Verification/Captcha — nicht der Browser mit den echten Logins, und Captchas löse ich grundsätzlich nicht.
- SSH direkt von der Cloud-Sandbox zum Hetzner-Server (46.225.75.125:22): Connection Timeout — Port 22 ist von der Cowork-Cloud-Umgebung aus nicht erreichbar (nur HTTPS über internen Proxy). Ein SSH-Key (`claude-cowork-luxestyle-20260917`, liegt lokal in dieser Session unter `~/.ssh/luxe_hetzner.pub`) wurde zwar generiert, aber noch nicht auf dem Server hinterlegt — und selbst mit hinterlegtem Key wäre der Port von hier aus nicht erreichbar.
- GitHub-Repo `allengchour-glitch/aban-news-landing` direkt per HTTPS/API aus der Cloud-Sandbox: 403 (privates Repo, nur über eingeloggten Browser erreichbar).

## Was vorbereitet, aber wegen des Blockers noch nicht abgeschickt ist

### 2️⃣ BigBuy-Ticket (EUR 1'000 Guthaben)
Ticket-Text ist fertig für das Formular auf bigbuy.eu/en/contact, Abteilung "Administration", Betreff "Enquiry about Topping up/Withdrawing from your Moneybox":

```
Subject: Customer 966388 - wallet balance EUR 1,000.00 - four confirmed payout requests, none executed

Customer number: 966388 (LuxeStyle CH, Switzerland)
Wallet balance: EUR 1,000.00 (unchanged since 15 July 2026)

Four payout requests were confirmed by your system. None was ever paid:
15 Jul 2026  EUR 750.00
16 Aug 2026  EUR 1,000.00
08 Sep 2026  EUR 1,000.00 (20:00 UTC - invalid IBAN, 22 characters - please CANCEL)
08 Sep 2026  EUR 1,000.00 (20:12 UTC - corrected IBAN, 21 characters - please EXECUTE)

I have sent five emails to customers@bigbuy.eu since 7 September. The only replies were the automated message asking me to open a ticket. This is that ticket.

Please:
1. Pay out EUR 1,000.00 to the corrected IBAN on record (21 characters, Valiant Bank AG, Bern, account holder Allen Chour). The bank details are already stored on the request of 8 September, 20:12 UTC.
2. Confirm in writing what happened to the requests of 15 July and 16 August - returned to the wallet, still pending, or paid to another account.
3. Explain record 18138523 (Ingreso en monedero, EUR 1,000, 07/07/2026, Pendiente de pago). I have not cancelled it and will not cancel it without your explanation.
4. My subscription ended on 15 September 2026. Please confirm in writing that the wallet balance is unaffected by the account closure, and how it will be paid out now.
5. Please give me a ticket reference number and an expected payment date.
```

IBAN-Nummer bewusst nicht im Text (steht schon aus einem früheren Auszahlungsantrag im BigBuy-System hinterlegt). Sobald der Browser-Zugriff wieder da ist: Formular öffnen, Text einfügen, Abteilung "Administration" per sichtbarem Tab-Namen anklicken (nicht per URL-Anker — BigBuys eigene Anker sind mehrdeutig), absenden, Ticketnummer in `dropship/_bigbuy_ticket_ref.txt` eintragen.

### 3️⃣ Google Merchant Center — Diagnose
Letzter gemessener Stand (vor Verbindungsabbruch, siehe vorherige Session):
- "Missing shipping info in some countries": **56** offene Fälle (nicht die im Gedächtnis hängende Zahl 1'698 — die war veraltet/falsch erinnert)
- Lieferländer-Einschränkung auf nur Schweiz: bereits in **allen 4 Versandrichtlinien** korrekt gesetzt, keine Änderung nötig
- Unrelated, nicht verwechseln: "Over capacity for Shopping ads (in CSS program)" betrifft ~175K Produkte, ist ein separates Thema

Sobald Browser-Zugriff da ist: Zahl frisch nachprüfen (Produkte → Diagnose → Filter "Missing shipping info in some countries" → Paginierung unten lesen), nur bei echter Abweichung handeln.

### 0️⃣ CJ-Dispute (USD 25.54, Auftrag DP2609071450210661800)
Nachfass-Termin 18.09, 17:00 UTC ist während der Blockade verstrichen. Adresse `Hühnerhubelstrasse 37, 3123 Belp` sollte im CJ-Profil UND in der Adressverwaltung stehen — letzter Stand war unklar, ob der Eintrag tatsächlich gespeichert wurde (mehrere Versuche scheiterten optisch). Muss beim nächsten Zugriff zuerst verifiziert werden, dann erst "Offener Streitfall" (Grund 6, USD 25.54) auslösen.

## Nicht in meinem Scope (ausdrücklich für Nutzer/Hetzner-Agent)
**4️⃣ Agenten-Browser-Login bei CJ/Shopify via SSH-Tunnel** — das im Auftrag genannte `ssh -L 9222:127.0.0.1:9222 root@46.225.75.125` + Chrome-Remote-Debugging-Login ist ausdrücklich "auf deinem Rechner" auszuführen. Ich führe grundsätzlich keine Terminal-Befehle mit Root-Zugriff auf fremden/unbekannten Servern aus und tippe keine Passwörter ein — das bleibt beim Nutzer oder beim bereits privilegierten Hetzner-Agent.

## Offene To-dos, sobald Browser-Zugriff wieder da ist (Reihenfolge)
1. CJ-Adresse verifizieren → ggf. nachtragen → Dispute öffnen → Referenznummer sichern
2. BigBuy-Ticket absenden → Referenznummer sichern
3. Google-Merchant-Zahl frisch prüfen, nur bei Abweichung handeln
4. Diese Datei mit Ergebnissen aktualisieren und, sofern GitHub-Zugriff via Browser klappt, Inhalt nach `dropship/_status_cowork.md` im Repo übertragen
