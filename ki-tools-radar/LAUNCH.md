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

## Schritt 3 — Online stellen auf `radar.abannews.com` (einmalig, ~15 Min)

Die Seite läuft als **Subdomain deiner bestehenden Domain abannews.com** — keine neue Domain
nötig, kein Kauf, und sie profitiert von der Autorität deiner Hauptdomain.

Am einfachsten mit **Cloudflare Pages** (gratis):

1. Auf [pages.cloudflare.com](https://pages.cloudflare.com) → „Create a project" → dein
   GitHub-Repo verbinden.
2. Build-Einstellungen:
   - **Build command:** `cd ki-tools-radar && pip install -r requirements.txt && python generate.py`
   - **Output directory:** `ki-tools-radar/dist`
3. „Deploy" — fertig. Du bekommst zuerst eine Adresse wie `…pages.dev`.
4. **Subdomain verbinden:** Im Pages-Projekt → „Custom domains" → `radar.abannews.com`
   hinzufügen. Cloudflare legt den nötigen CNAME automatisch an (wenn abannews.com schon bei
   Cloudflare liegt). Falls die Domain woanders liegt: dort einen CNAME
   `radar` → `<dein-projekt>.pages.dev` setzen.

✅ **Rechtsseiten sind schon fertig** (`impressum.html`, `datenschutz.html`) und im Footer
verlinkt — mit deinen echten Daten (Alleng Chour, Belp) und `hallo@abannews.com`. Vor dem
Live-Gang einmal selbst gegenlesen (ich bin kein Anwalt).

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
