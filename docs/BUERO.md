# 🗂️ Das Büro — alles per E-Mail

> Ein Büro ohne Räume: eine Adresse, sechs Textbausteine, ein Werkzeug für Offerte und
> Rechnung. Gedacht für den Dienstleistungs-Teil (KI-Sichtbarkeit, Beratung, Texte) —
> also für die Aufträge mit drei- bis vierstelligen Beträgen, die keine Reichweite
> brauchen, sondern nur eine saubere Abwicklung.

## 1) Die Adressen — was heute gilt und was aufzuräumen ist

Gemessen am 2026-09-03 über alle HTML-Seiten:

| Adresse | Seiten | Zweck |
|---|---:|---|
| `hallo@abannews.com` | 121 | **Die Adresse.** Anfragen, Aufträge, Rückfragen, Support. |
| `sponsoring@abannews.com` | 42 | Werbung/Sponsoring — eigener Posteingang sinnvoll. |
| `datenschutz@abannews.com` | 13 | Rechtlich vorgeschrieben, muss bleiben. |
| `info@` · `hi@` · `support@` · `press@` · `impressum@` | 4 · 1 · 1 · 1 · 1 | **Streuverlust.** |

⚠️ **Fünf Adressen auf acht Seiten sind Einzelfälle.** Wenn dahinter kein Postfach liegt,
läuft jede Anfrage dorthin ins Leere — und eine verlorene Anfrage kostet mehr als jede
Optimierung einbringt. Zwei Wege, beide gut:
1. **Weiterleitung einrichten** (info@, hi@, support@, press@, impressum@ → hallo@). Nichts
   an den Seiten ändern, nichts geht verloren. Empfohlen.
2. Oder die acht Fundstellen auf `hallo@` umschreiben.

Was nicht geht: Adressen stehen lassen, hinter denen niemand liest.

## 2) Der Ablauf — sechs Mails, mehr braucht es nicht

| Schritt | Was passiert | Werkzeug |
|---|---|---|
| 1. Anfrage kommt | innerhalb **24 h** antworten, auch wenn nur „ich schau's mir an" | Vorlage A |
| 2. Offerte | Preis, Umfang, Frist — schriftlich | `buero.py offerte` |
| 3. Auftrag | Zusage per Mail genügt als Auftrag | Vorlage B |
| 4. Lieferung | Ergebnis + was der Kunde jetzt tun kann | Vorlage C |
| 5. Rechnung | direkt nach der Lieferung, nicht später | `buero.py rechnung --aus …` |
| 6. Erinnerung | freundlich, nach Ablauf der Frist | Vorlage D |

## 3) Das Werkzeug

```bash
# Offerte schreiben (Kunde mehrzeilig mit \n)
python3 tools/buero.py offerte --kunde "Muster GmbH\nFrau A. Beispiel\nBahnhofstrasse 1\n3000 Bern" \
                               --pos "KI-Sichtbarkeits-Audit:490" --pos "Begleitung:2:145"

# Rechnung aus der Offerte (übernimmt Kunde und Posten)
python3 tools/buero.py rechnung --aus 2026-001

# Stand: was ist offen?
python3 tools/buero.py liste
python3 tools/buero.py bezahlt --nr 2026-001
```

Jeder Lauf erzeugt zwei Dateien in `buero/`: die **druckfertige Seite**
(im Browser öffnen → Drucken → „Als PDF sichern") und den **fertigen Mailtext**.

**Vor der ersten Rechnung:** `buero/konfig.example.json` nach `buero/konfig.json` kopieren
und die IBAN eintragen. Ohne sie schreibt das Werkzeug eine sichtbare Warnung auf die
Rechnung, statt stillschweigend ein Konto wegzulassen.

**Warum kein Buchhaltungsprogramm:** für ein paar Rechnungen im Jahr sind 15–30 CHF/Monat
Abo teurer als der Nutzen. `buero/` ist in `.gitignore` — Kundenadressen und IBAN gehören
nicht in ein öffentliches Repo.

### Schweizer Besonderheiten, fest eingebaut
- **Keine MWST auf der Rechnung.** Allen Chour ist nicht MWST-pflichtig (Art. 10 Abs. 2
  lit. a MWSTG, Umsatz unter CHF 100'000; steht so im Impressum). Eine Rechnung, die
  trotzdem MWST ausweist, schuldet sie auch. Stattdessen steht der Hinweis im Fuss.
- **Keine UID** — also steht auch keine drauf.
- **Fortlaufende Nummern** je Jahr, vom Werkzeug vergeben. Lücken müsste man erklären.
- **Zahlungsfrist 30 Tage** netto (änderbar mit `--frist`).
- Eine **QR-Rechnung** ist nicht eingebaut: sie korrekt zu erzeugen braucht eine geprüfte
  Bibliothek, und eine falsch codierte QR-Rechnung verhindert Zahlungen, statt sie zu
  erleichtern. IBAN + Mitteilung reichen für jede Schweizer Banking-App.

## 4) Die sechs Vorlagen

### A — Antwort auf eine Anfrage (innerhalb 24 h)
> **Betreff:** Ihre Anfrage — kurz zurück
>
> Guten Tag {Name}
>
> danke für Ihre Nachricht. Damit ich Ihnen etwas Passendes schicken kann, drei kurze Fragen:
> 1. Um welche Website geht es (Adresse)?
> 2. Was soll am Ende besser sein — mehr Anfragen, bessere Auffindbarkeit, beides?
> 3. Bis wann brauchen Sie ein Ergebnis?
>
> Wenn es schneller gehen soll: ich schicke Ihnen vorab einen kostenlosen Kurz-Check Ihrer
> Seite (misst, wie gut KI-Antwortmaschinen sie verwerten können). Sagen Sie einfach Bescheid.
>
> Freundliche Grüsse
> Allen Chour · aban news

### B — Auftragsbestätigung
> **Betreff:** Auftrag bestätigt — {Leistung}
>
> Guten Tag {Name}
>
> danke für die Zusage. Damit ist der Auftrag festgehalten:
>
> · Leistung: {Leistung}
> · Preis: CHF {Betrag} (keine MWST, siehe Offerte {Nr})
> · Liefertermin: {Datum}
>
> Ich melde mich, sobald es fertig ist — oder früher, wenn ich etwas von Ihnen brauche.

### C — Lieferung
> **Betreff:** Fertig — {Leistung}
>
> Guten Tag {Name}
>
> die Arbeit ist erledigt, im Anhang das Ergebnis.
>
> **Die drei wichtigsten Punkte daraus:**
> 1. {Befund}
> 2. {Befund}
> 3. {Befund}
>
> Was ich an Ihrer Stelle zuerst angehen würde: {eine konkrete Sache}.
>
> Die Rechnung kommt separat. Fragen? Einfach auf diese Mail antworten.

### D — Zahlungserinnerung (nach Ablauf der Frist, freundlich)
> **Betreff:** Erinnerung: Rechnung {Nr}
>
> Guten Tag {Name}
>
> die Rechnung {Nr} über CHF {Betrag} war am {Datum} fällig — vermutlich ist sie
> untergegangen, das passiert. Falls schon überwiesen: Danke, dann hat sich das erledigt.
>
> IBAN {IBAN}, Mitteilung {Nr}.

### E — Absage (wenn ein Auftrag nicht passt)
> Guten Tag {Name}
>
> danke für die Anfrage — ich sage hier ehrlich ab: {Grund in einem Satz}. Was ich
> stattdessen empfehle: {Alternative oder Name}. Wenn sich das ändert, melden Sie sich gern.

### F — Nachfassen (14 Tage nach der Offerte, einmal)
> Guten Tag {Name}
>
> ich frage einmal kurz nach der Offerte {Nr} — passt der Umfang, oder soll ich etwas
> anpassen? Wenn es gerade nicht passt, ist das auch eine Antwort; dann lege ich es weg.

## 5) Regeln, die Geld sparen
- **24-Stunden-Regel.** Eine schnelle kurze Antwort schlägt eine späte gute.
- **Nie mündlich zusagen, was nicht in einer Mail steht.** Der Mailverlauf ist das Archiv.
- **Rechnung am Liefertag.** Jede Woche Verzug ist eine Woche später Geld.
- **Nichts versprechen, was die AGB nicht decken** — insbesondere keine Liefer- oder
  Erstattungszusagen über `agb.html` hinaus.
- **Einmal nachfassen, nicht dreimal.** Wer nach zwei Mails nicht antwortet, kauft nicht.
