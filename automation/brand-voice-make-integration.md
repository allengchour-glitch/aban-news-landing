# Brand-Voice-Validator — Make.com Integration

So baust du das Voice-Quality-Gate vor jeden Publish-Step in deine Make-Pipelines.

## TL;DR

```
... Content-Generation ...
        |
        v
[HTTP Request]  POST https://validator.abannews.com/validate
        |
        v
[Router]
        |
        +--> {{passed}} = true  --> Publish (Gmail / LinkedIn / Reddit ...)
        |
        +--> {{passed}} = false --> Slack-Alert + Markiere fuer Manual-Review
```

---

## 1) Validator-Service deployen

### Option A — Hetzner-VPS (~4 EUR/Monat, empfohlen)

```bash
ssh root@your-vps

# Clone aus dem aban-deploy Repo
git clone https://github.com/allengchour-glitch/aban-news-landing.git /opt/aban
cd /opt/aban/automation

# Docker build & run
docker build -t aban-voice -f brand-voice-validator-Dockerfile .
docker run -d --restart=always -p 8080:8080 --name aban-voice aban-voice

# Mit Caddy/Nginx als HTTPS-Reverse-Proxy auf validator.abannews.com mappen
```

Caddyfile-Snippet:
```
validator.abannews.com {
    reverse_proxy localhost:8080
}
```

### Option B — Cloudflare Workers (0 EUR, Python-Worker)

Cloudflare unterstuetzt seit 2024 Python-Workers. Port die `validate()`-Funktion
1:1, ohne Flask. Endpoint dann auf `https://validator.abannews.workers.dev/validate`.

### Option C — Lokaler Test

```bash
cd ~/aban-deploy/automation
pip install flask
python brand-voice-validator-api.py
# laeuft auf http://localhost:8080
```

Tunnel mit `cloudflared tunnel --url http://localhost:8080` fuer Make-Zugriff.

---

## 2) Make-Modul einfuegen — Step-by-Step

In **JEDEM** Publish-Scenario (Newsletter, LinkedIn, Reddit):

### Schritt 1 — HTTP-Request-Modul einfuegen

1. In Make: oeffne dein Scenario.
2. Zwischen "Content-Generation" und "Publish-Step": **+ Add module** -> **HTTP** -> **Make a request**.
3. Konfiguration:
   - **URL:** `https://validator.abannews.com/validate`
   - **Method:** `POST`
   - **Headers:**
     - Name: `Content-Type`  Value: `application/json`
   - **Body type:** `Raw`
   - **Content type:** `JSON (application/json)`
   - **Request content:**
     ```json
     {
       "text": "{{<vorheriger-Module-Output>}}",
       "channel": "linkedin"
     }
     ```
     (channel je nach Pipeline: `linkedin` / `newsletter` / `reddit`)
   - **Parse response:** `Yes`

### Schritt 2 — Router einfuegen

1. Nach dem HTTP-Modul: **+ Add module** -> **Flow Control** -> **Router**.
2. Zwei Routen anlegen:

**Route 1: PASSED (publish)**
- Filter:
  - Label: `Voice OK`
  - Condition: `{{HTTP-module.data.passed}}` `=` `true`
- Nach Filter: dein **Publish-Step** (Gmail Send / LinkedIn Create Post / Reddit Submit).

**Route 2: FAILED (alert)**
- Filter:
  - Label: `Voice FAIL`
  - Condition: `{{HTTP-module.data.passed}}` `=` `false`
- Nach Filter: **Slack -> Send a message** an `#aban-voice-alerts`:
  ```
  Voice-Gate FAILED (Channel: {{1.channel}})
  Score: {{HTTP-module.data.score}}/10
  Violations:
  {{HTTP-module.data.violations[].type}}
  Suggestions:
  {{HTTP-module.data.suggestions[]}}
  ---
  Original text:
  {{<vorheriger-Module-Output>}}
  ```
- Optional: in Google-Sheets-Tab `manual_review` schreiben (Date, Channel, Score, Text).

### Schritt 3 — Test

1. Klicke in Make oben rechts auf **Run once**.
2. Trigger das Scenario mit Test-Daten, die ein Forbidden-Word enthalten
   (z.B. "Das ist revolutionaer.").
3. Erwartung: HTTP-Modul gibt `passed=false`, Router schickt es auf Route 2,
   Slack-Alert kommt.

---

## 3) Pipeline-spezifische Channel-Werte

| Pipeline           | `channel`      |
|--------------------|----------------|
| Newsletter (Gmail) | `newsletter`   |
| LinkedIn Auto-Post | `linkedin`     |
| Reddit Auto-Reply  | `reddit`       |
| Sonstiges          | `generic`      |

Die Channel-Wahl setzt automatisch passende Limits (max_length, max_hashtags, etc.).

---

## 4) curl-Test (vor Make-Setup pruefen)

```bash
# Positiv-Test
curl -X POST https://validator.abannews.com/validate \
     -H "Content-Type: application/json" \
     -d '{"text":"Ich teste heute meinen neuen Newsletter. Anti-Hype, klar, persoenlich.","channel":"linkedin"}'

# erwartet: {"passed": true, "score": 10.0, ...}

# Negativ-Test
curl -X POST https://validator.abannews.com/validate \
     -H "Content-Type: application/json" \
     -d '{"text":"Dieses revolutionaere, bahnbrechende Game-Changer-Tool!","channel":"linkedin"}'

# erwartet: {"passed": false, "score": ~5.5, "violations": [{...}]}
```

---

## 5) Lokale Pre-Commit-Pruefung (optional)

CLI funktioniert ohne Service:

```bash
python voice-linter-cli.py --channel newsletter issue-2026-05-28.md
python voice-linter-cli.py --channel linkedin --strict posts/*.md
echo "Test text" | python voice-linter-cli.py --channel generic -
```

Exit-Code 0 = pass, 1 = fail. In git-pre-commit-hook einbaubar.

---

## 6) Threshold-Tuning

`PASS_THRESHOLD = 7.0` in `brand-voice-validator-api.py` ist der Default.
Wenn zu viele False-Positives -> auf 6.0 senken.
Wenn zu lax -> auf 8.0 erhoehen.

Forbidden-Phrases triggern automatisch `passed=false`, unabhaengig vom Score.
Diese Liste in `FORBIDDEN` pflegen.

---

## 7) Monitoring

- **Uptime:** UptimeRobot Free-Tier auf `https://validator.abannews.com/health`.
- **Logs:** `docker logs aban-voice -f` (Hetzner) oder Cloudflare-Worker-Tail.
- **Sheets:** Tab `manual_review` zaehlen — wenn >5/Tag, sind Rules wahrscheinlich zu streng.
