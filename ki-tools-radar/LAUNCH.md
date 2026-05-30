# 🚀 KI-Tools Radar — Start-Anleitung (ohne Technik-Kauderwelsch)

Diese Seite verdient **passiv** Geld: Leute suchen bei Google nach KI-Tools, landen auf
deinen Vergleichsseiten, klicken auf einen Tool-Link — und wenn sie dort etwas kaufen,
bekommst du eine Provision. Die Seite baut sich **von selbst** neu, du musst nichts tippen.

Du musst nur **drei Dinge** einmalig erledigen. Kein Programmieren nötig.

---

## Schritt 1 — Bei Affiliate-Programmen anmelden (= so verdienst du)

Melde dich bei den Programmen der Tools an, die du empfiehlst. Am besten lohnen sich
**„recurring"-Programme** (du bekommst jeden Monat Provision, solange der Kunde zahlt):

| Tool | Programm | Provision |
|------|----------|-----------|
| Jasper | jasper.ai → „Affiliates" | 30 % wiederkehrend |
| GetResponse | getresponse.com → „Affiliate" | 40–60 % |
| Systeme.io | systeme.io → „Affiliate" | 60 % lebenslang |
| Writesonic | writesonic.com | 30 % lebenslang |
| ElevenLabs | elevenlabs.io | 20 % |

Du bekommst von jedem Programm einen **persönlichen Link** (z. B. `https://jasper.ai?fpr=deinname`).

## Schritt 2 — Deine Links eintragen

Öffne die Datei `affiliate.json`. Trage deine Links so ein (zwischen die `{ }` bei `"links"`):

```json
"links": {
  "jasper":      { "affiliate_url": "https://jasper.ai?fpr=DEINNAME" },
  "getresponse": { "affiliate_url": "https://getresponse.com/?a=DEINCODE" }
}
```

Die Tool-Namen (`jasper`, `getresponse`, …) sind die `id` aus der Tool-Datenbank.
Fertig — die Seite markiert diese Links automatisch mit `*` und einem Transparenz-Hinweis
(das ist in Deutschland Pflicht). Tools ohne Eintrag bleiben normale Links (keine Provision).

## Schritt 3 — Online stellen (einmalig, ~15 Min)

Am einfachsten mit **Cloudflare Pages** (gratis):

1. Konto auf [pages.cloudflare.com](https://pages.cloudflare.com) anlegen.
2. „Create a project" → dein GitHub-Repo verbinden.
3. Einstellungen:
   - **Build command:** `cd ki-tools-radar && python generate.py`
   - **Output directory:** `ki-tools-radar/dist`
4. „Deploy" — fertig. Du bekommst eine Adresse wie `ki-tools-radar.pages.dev`.
5. Optional: eigene Domain kaufen (z. B. bei Namecheap/Cloudflare, ~10 €/Jahr) und verbinden.
   Dann in `generate.py` ganz oben `BASE_URL` auf deine Domain setzen.

> **Noch fehlt:** Eine `datenschutz.html` und `impressum.html` (in Deutschland Pflicht).
> Die kannst du aus deinem Newsletter-Projekt kopieren (`datenschutz.html`, `impressum.html`)
> und ins `dist/` legen — Adresse/Namen anpassen.

---

## Was danach passiert (Automatik)

- **Jeden Montag** baut sich die Seite automatisch neu (GitHub Actions).
- Wenn du neue Tools in `data/tools.json` einträgst, baut sie sich **sofort** neu.
- Du machst nichts mehr — außer ab und zu neue Tools/Affiliate-Links ergänzen.

## Wie du mehr verdienst

1. **Über deinen Newsletter teasern** („Ich hab alle KI-Tools verglichen → ki-tools-radar.de").
   Das bringt sofort erste Besucher (Google dauert ein paar Wochen).
2. **Mehr Tools = mehr Google-Seiten = mehr Besucher.** Die Datenbank hat schon 143.
3. Später: Display-Werbung oder Newsletter-Ad-Network dazunehmen.

Viel Erfolg! 🎯
