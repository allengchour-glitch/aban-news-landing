---
tags: [system, luecke]
quelle: TikTok @herr_tech
gelernt: 2026-09-12
status: luecke-braucht-quelle
---
# System 4 — Angebots-Agent

Das Video: „Anfrage rein, eingeordnet, Angebot vorbereitet — und es liegt als **Entwurf** bei
mir. Aus zwei Stunden werden vier Minuten."

Wichtig am Vorbild: das Ergebnis ist ein **Entwurf**, nicht ein verschicktes Angebot. Der Mensch
bleibt im letzten Schritt.

## Stand hier — fehlt, und zwar an der Quelle

`automation/gen_angebote_pages.mjs` klingt passend, ist aber ein **Seitengenerator** für
`*-angebote.html`, kein Agent.

Das eigentliche Hindernis ist nicht das Schreiben des Angebots, sondern der **Eingang**:
abannews.com sammelt Anfragen über `mailto:hallo@abannews.com`. Auf dieses Postfach hat keine
Session Zugriff. Ein Agent ohne Anfrage-Eingang wäre toter Code — und dieses Repo hat schon
254 Dateien in `automation/`.

## Was es braucht (eine Entscheidung des Users)

Einen maschinenlesbaren Eingang, eines von:

- ein Formular, das in eine Datei oder einen Webhook schreibt (n8n liegt bereit,
  `social/N8N-WEBHOOK.md`)
- IMAP-Zugang zu `hallo@abannews.com`
- ein Google-Sheet, in das Anfragen fliessen

Für den Shop ist der Eingang praktisch schon da — Kundenfragen kommen als Instagram-DM, und
`automation/ig-dm-reply.mjs` beantwortet sie thematisch. Das ist die Shop-Variante dieses Systems.

Verwandt: [[Lead-Maschine]]
