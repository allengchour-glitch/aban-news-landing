---
tags: [system, lead, luecke]
quelle: TikTok @herr_tech
gelernt: 2026-09-12
status: luecke
---
# System 3 — Lead-Maschine

Das Video: „Wer kommentiert, bekommt automatisch eine Nachricht. Wer passt, bekommt einen
Terminlink mit meinem Team. Wer nicht passt, bekommt etwas Kostenloses und bleibt in der Liste.
Das läuft, während ich schlafe — ich sehe nur noch die Termine im Kalender."

Im Video ist das Schlüsselwort **WEBINAR**: Kommentar mit dem Wort löst die Kette aus.

## Die Kette

```
Kommentar mit Schlüsselwort
   → automatische DM mit dem Link
   → Qualifizierung (passt / passt nicht)
   → passt:       Terminlink
   → passt nicht: etwas Kostenloses, bleibt in der Liste
```

## Stand hier — gemessene Lücke

Vorhanden sind die **Bausteine**:

| Baustein | Datei | kann |
|---|---|---|
| DM-Antwort | `automation/ig-dm-reply.mjs` | antwortet auf eingehende DMs nach Themen-Erkennung |
| Kommentar-Antwort | `automation/social-comment-reply.mjs` | antwortet **öffentlich** unter Posts |
| Moderation | `automation/social-comment-moderate.mjs` | erkennt Spam |

Was **fehlt**, ist die Kette: Es gibt keinen Weg von *Kommentar mit Schlüsselwort* zu
*private DM* zu *Qualifizierung* zu *Liste*. `social-comment-reply.mjs` antwortet öffentlich,
`ig-dm-reply.mjs` wartet passiv auf DMs. Niemand verbindet die zwei.

## Warum das hier der interessanteste Hebel ist

[[Masse-ist-kein-Hebel]] sagt: mehr Reichweite bringt nichts, weil die Kaufabsicht fehlt. Ein
Kommentar mit einem Schlüsselwort **ist** ein Absichtssignal — das einzige kostenlose, das dieses
Konto erzeugt. Genau das fängt bisher niemand auf.

## Was es braucht

Meta-Scopes `instagram_manage_comments` **und** `instagram_manage_messages`. Ohne die zweite
Erlaubnis kann kein Skript auf einen Kommentar privat antworten.

Verwandt: [[Content-Maschine]] · [[Drei-User-Klicks]]
