---
tags: [blockiert, deploy, nur-user]
quelle: CLAUDE.md
gelernt: 2026-08-29
---
# Der Live-Deploy von abannews.com steht

**Seit 29.08.2026 ~03:00 UTC.** abannews.com zeigt den Stand von Commit `9394a0e`. Alles danach
— rund 90 Merges, die Chat-Entfernung, die Suche, das Fahrmodell, das dichtere Produktraster —
ist **nicht live**.

Ursache ist dieselbe [[GitHub-Spam-Markierung]]: der Hetzner-Poller
(`server/auto-deploy.sh`, Timer alle 3 min) fetcht **anonym** per HTTPS und bekommt 404.

## Fix — nur der User

Fine-grained PAT (Contents: read) als `GITHUB_TOKEN` in `/etc/abannews/deploy.env` legen, dann
`bash /opt/abannews/server/auto-deploy.sh`. Anleitung: `server/README.md`.

## Nicht erneut Stunden verbrennen

Cloud-Sessions haben keine Cloudflare- oder Server-Zugänge. Kontrolle, ob es wieder läuft:

```bash
curl -sL https://abannews.com/traumhaus.html | grep -c carStandT   # > 0 = live
```

Verwandt: [[abannews]]
