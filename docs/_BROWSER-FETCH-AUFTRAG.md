# 🌐 Browser-Abruf-Auftrag — Seiten holen, die mich (Code) blocken

> **Zweck:** Wenn die Code-Session eine Seite nicht laden kann, weil sie
> **automatisierte Requests blockt** (HTTP 403, 429, CAPTCHA, Bot-Schutz), holt der
> **Browser-Agent** sie mit einem echten Browser und gibt den Inhalt zurück.
>
> **Scope — wichtig (ehrlich):** Nur **öffentliche** Seiten, die ein Mensch im
> Browser normal sehen kann, und die *nur* Bots aussperren. **Nicht** umgehen:
> Logins, Paywalls, Zugriffssperren, „nur für Mitglieder". Das ist Inhalt holen,
> kein Zugang erzwingen.

## So läuft es
1. **Code-Session** trägt unten eine URL ein (mit Grund + wohin das Ergebnis soll).
2. **Browser-Agent** öffnet die URL im Browser, kopiert den relevanten Inhalt
   (oder speichert den Seitenquelltext als Datei `fetch-inbox/<name>.html` + push).
3. **Code-Session** verarbeitet das (z. B. AEO-Report) und meldet das Ergebnis.

> Ergebnis-Ablage: kurzer Text → direkt unter den Eintrag schreiben. Ganze Seite →
> als `fetch-inbox/<name>.html` committen (Ordner anlegen, ist ok).

---

## Offene Abrufe (Code-Session füllt das)

<!-- VORLAGE:
### [Datum] — <URL>
- **Warum blockiert:** [z. B. HTTP 403 Cloudflare]
- **Was ich brauche:** [z. B. den sichtbaren Text / den HTML-Quelltext]
- **Wohin:** [`fetch-inbox/<name>.html` oder Text hier drunter]
- **Ergebnis (Browser-Agent füllt):** …
-->

_(aktuell keine offenen Abrufe — die Code-Session trägt hier ein, sobald sie irgendwo blockiert wird.)_

---

## Ergebnis-Rückmeldung
Wenn erledigt: kurze Notiz auch in `docs/_HANDBACK.md` („Abruf X geliefert"), damit
die Code-Session es beim Sync sieht. Oder Aban gibt direkt im Chat Bescheid.
