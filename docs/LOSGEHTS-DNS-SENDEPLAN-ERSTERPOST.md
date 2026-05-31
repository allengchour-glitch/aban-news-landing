# 🎯 Los geht's — DNS-Verify, Sendeplan & der erste Post

> Drei Dinge, die dir die Go-Live-Schritte abnehmen. Alles kopierfertig.

---

## TEIL 1 — Domain in der Search Console verifizieren (DNS)

Der einzige Teil, der manchmal hakt. Du brauchst Zugriff auf die DNS-Einstellungen
deiner Domain `abannews.com` (sehr wahrscheinlich bei **Cloudflare**, da die Seite
auf Cloudflare Pages läuft).

### Weg A — Domain-Property (empfohlen, deckt alle Subdomains ab)

1. https://search.google.com/search-console öffnen → **Property hinzufügen**.
2. Linke Box **„Domain"** wählen → `abannews.com` eingeben → **Weiter**.
3. Google zeigt einen **TXT-Eintrag** wie:
   `google-site-verification=XXXXXXXXXXXXXXXXXXXX`
   → **kopieren**.
4. In einem neuen Tab **Cloudflare** öffnen → Domain `abannews.com` →
   **DNS → Records → Add record**:
   - **Type:** TXT
   - **Name:** `@`  (das steht für die Root-Domain)
   - **Content:** den kopierten `google-site-verification=…`-Wert einfügen
   - **TTL:** Auto → **Save**
5. Zurück zu Google → **Verifizieren**.
   (Cloudflare-DNS ist meist in Sekunden aktiv; falls „nicht gefunden": 5–15 Min
   warten, nochmal klicken.)

### Weg B — falls Domain-Verifizierung zickt: URL-Präfix + HTML-Tag

1. Property-Typ **„URL-Präfix"** → `https://abannews.com` eingeben.
2. Methode **„HTML-Tag"** wählen → Google gibt ein `<meta name="google-site-verification" …>`.
3. **Schick mir dieses Meta-Tag** — ich baue es in `index.html` ein, du pushst,
   nach dem Deploy klickst du „Verifizieren". (Das ist mein Teil, den ich übernehmen kann.)

### Danach (beide Wege)
- Search Console → **Sitemaps** → `sitemap.xml` eintragen → **Senden**.
- **Bing** (https://www.bing.com/webmasters): „Import from Google Search Console" →
  spart die ganze Verifizierung nochmal.

---

## TEIL 2 — Auto-Post-Sendeplan (Telegram/Discord)

> Erst die Secrets setzen (siehe `social/SECRETS-EINRICHTEN.md`), dann **einzeln**
> senden — nie `--all` (das wäre Spam). Ein Post pro Tag, Werktags.
>
> Versand pro Post (lokal oder als GitHub-Action mit `--id`):
> `python social/post.py --id <ID>`

| Tag | Befehl | Inhalt |
|-----|--------|--------|
| **Mo** | `python social/post.py --id p19-ratgeber-hub` | Der Hub (Überblick zuerst) |
| **Di** | `python social/post.py --id p20-chatgpt-vs-claude` | Tool-Vergleich (hohe Nachfrage) |
| **Mi** | `python social/post.py --id p21-dsgvo` | DSGVO (zieht im DACH am besten) |
| **Do** | `python social/post.py --id p22-prompts` | Prompts schreiben |
| **Fr** | `python social/post.py --id p23-halluzinationen` | Halluzinationen erkennen |

**Woche 2** (Rest): `p24-automatisierung` (Mo), `p25-email` (Di), dann von vorn
mit den Stärksten, die Resonanz hatten.

> Tipp: `--dry-run` anhängen zeigt den Text, ohne zu senden. Erst testen, dann scharf.

---

## TEIL 3 — Dein erster LinkedIn-Post (heute, kopierfertig)

> Als **Person** posten (nicht Unternehmensseite — bessere Reichweite).
> Den Link bewusst in den **ersten Kommentar**, nicht in den Post (LinkedIn drosselt
> Posts mit externen Links im Haupttext).

### Post (alles zwischen den Linien kopieren)

---
Die meisten KI-Guides verkaufen dir ein Gefühl. Ich wollte das Gegenteil.

In den letzten Wochen habe ich für Selbstständige eine Reihe ehrlicher KI-Guides
geschrieben — keine Tool-Listen zum Wegklicken, keine Affiliate-Masche. Jeder
löst ein konkretes Problem:

→ Welches Tool für welche Aufgabe (ChatGPT vs. Claude)
→ KI DSGVO-konform nutzen (die 5-Fragen-Prüfung)
→ Wann sich Automatisierung wirklich lohnt
→ Bessere Prompts in 4 Schritten
→ Erfundene Fakten erkennen, bevor sie teuer werden

Alles gratis, alles ohne Anmeldung. Ich teile den Weg offen — Feedback erwünscht:
Welches Thema fehlt dir noch?
---

### Erster Kommentar (direkt nach dem Posten)

---
Alle Guides an einem Ort 👉 https://abannews.com/ki-ratgeber.html
---

### Danach (erste 60 Min zählen für LinkedIn)
- Jede Antwort auf Kommentare zügig beantworten.
- Den Post 2–3 Leuten direkt schicken, die er interessieren könnte.
- Nicht löschen-und-neu-posten, wenn er langsam startet — Geduld.

---

## Reihenfolge für HEUTE (30 Min)

1. **LinkedIn-Post** raus (Teil 3) — 5 Min.
2. **Search Console**: Domain-Property + TXT bei Cloudflare (Teil 1) — 15 Min.
3. **Sitemap einreichen** (Search Console + Bing) — 5 Min.
4. **PayPal** einmal selbst durchklicken (`founding.html` → €69) — 5 Min.

Telegram/Discord-Secrets + KDP-Upload kannst du diese Woche nachziehen.
