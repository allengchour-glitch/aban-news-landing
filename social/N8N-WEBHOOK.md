# Webhook-Fanout mit n8n — LinkedIn / X / Mastodon ohne bezahltes SaaS

> So postet `social/post.py` auch dorthin, wo es keine offene API gibt (LinkedIn, X):
> dein **n8n** empfängt den Webhook und fächert an die Plattformen. n8n ist gratis,
> self-hostbar und EU — und steht als Top-Tool in deinem eigenen Automatisierungs-Radar.
> Kein Zapier/Make-Abo nötig.

## So hängt es zusammen
```
social/post.py  ──POST {id,text,url,tags}──►  n8n Webhook  ──►  LinkedIn
   (GitHub-Cron, Mo/Mi/Fr)                                  ├──►  X / Twitter
                                                            └──►  Mastodon
```

## Einrichten (einmalig)

### 1. n8n bereitstellen
- **Schnell & gratis:** n8n Cloud (Testphase) — oder
- **Self-Hosted (EU/Datenhoheit):** `npx n8n` lokal, oder Docker auf einem kleinen Server.
  Anleitung: https://docs.n8n.io/hosting/

### 2. Workflow importieren
1. In n8n: **Workflows → Import from File**.
2. Datei `social/n8n-publish-workflow.json` wählen.
3. Es erscheint der Flow: **Webhook → Text bauen → LinkedIn / X / Mastodon**.

### 3. Credentials verbinden (der einzige etwas größere Schritt)
Pro Plattform einmalig in n8n autorisieren — das ist genau der OAuth-Teil, den ein
Skript nicht sauber kann:
- **LinkedIn**: im LinkedIn-Node → Credential → „LinkedIn OAuth2" verbinden.
- **X / Twitter**: im X-Node → Credential → „Twitter OAuth2" verbinden.
- **Mastodon**: im HTTP-Node → Header-Auth-Credential anlegen:
  Name `Authorization`, Wert `Bearer DEIN_TOKEN`. `MASTODON_INSTANCE` als n8n-Env setzen
  oder die URL im Node fest eintragen.

> Plattformen, die du nicht brauchst: Node einfach löschen oder deaktivieren.

### 4. Aktivieren & URL holen
1. Workflow oben rechts **aktivieren** (Toggle „Active").
2. Im **Webhook-Node** die **Production URL** kopieren
   (Form: `https://DEIN-n8n/webhook/aban-publish`).

### 5. Mit dem Publisher verbinden
GitHub → Repo → **Settings → Secrets and variables → Actions → New repository secret**:
- Name: `PUBLISH_WEBHOOK_URL`
- Secret: *(die kopierte n8n-Production-URL)*

Fertig. Ab jetzt schickt `social/post.py` (manuell oder per Mo/Mi/Fr-Cron) jeden Post
zusätzlich an n8n, das ihn an LinkedIn, X und Mastodon weiterreicht.

## Testen
- In n8n den Webhook-Node auf **„Listen for test event"** stellen.
- Lokal: `PUBLISH_WEBHOOK_URL="https://…/webhook-test/aban-publish" python3 social/post.py --id fin-stundensatz`
- In n8n siehst du die eingegangenen Daten unter `{{ $json.body }}` (`text`, `url`, `id`, `tags`).

## Eingehende Felder
| Feld | Beispiel |
|------|----------|
| `text` | Post-Text (mehrzeilig) |
| `url` | optionaler Link (z. B. abannews.com/finanz-rechner.html) |
| `id` | Post-ID aus posts.json |
| `tags` | Liste von Hashtag-Begriffen ohne `#` |

> Hinweis: X begrenzt auf 280 Zeichen — bei langen Posts im X-Node kürzen
> (z. B. nur die erste Zeile + Link). LinkedIn/Mastodon sind unkritisch.
