# 🆓 Autonom & gratis arbeiten — auch ohne GitHub Actions

GitHub Actions ist account-weit gesperrt (zu hohe Nutzung). Hier alle Wege, die **gratis**
sind und **ohne Kreditkarte** funktionieren — geordnet nach „am wenigsten Aufwand".

## Überblick
| Weg | Gratis? | Karte? | Autonom? | Aufwand |
|---|---|---|---|---|
| **A. GitHub entsperren lassen** | ✅ | ❌ | ✅ (wie vorher, jetzt leichtere Last) | Support-Mail |
| **B. PC-lokal (dein Immer-an-PC)** | ✅ | ❌ | ✅ (per Cron auf dem PC) | 1× einrichten |
| **C. GitLab Cloud-Runner** | ✅ (400 Min/Mt) | ✅ einmal (kein Abbuchen) | ✅ | mittel |
| **D. GitLab-Runner auf deinem PC** | ✅ unbegrenzt | ❌ | ✅ | mittel |

**Empfehlung:** Zuerst **A** versuchen (Support-Mail: „Nutzung reduziert, 0 aktive Crons,
bitte Actions reaktivieren"). Wenn GitHub dauerhaft zickt → **B** (dein PC läuft eh immer).

---

## A. GitHub entsperren (am einfachsten)
Die Cron-Last ist schon auf ~0 gesenkt (PR #828). Antworte auf die GitHub-Sperr-Mail oder
öffne ein Ticket auf https://support.github.com. Danach läuft wieder alles wie gewohnt.

## B. PC-lokal — gratis, kartenlos, autonom  ⭐ empfohlen als Fallback
Dein PC läuft immer → er kann die Jobs direkt ausführen, ohne GitHub/GitLab.

**ABAN-Files hochladen:**
1. Repo auf den PC klonen (oder vorhandenen Klon nutzen).
2. Secrets einmalig setzen:
   ```bash
   export YT_CLIENT_ID=...  YT_CLIENT_SECRET=...  YT_REFRESH_TOKEN=...
   ```
   Refresh-Token verloren? → `python3 video-prototypes/aban-files/get_yt_refresh_token.py`
3. Hochladen:
   ```bash
   bash video-prototypes/aban-files/run-local.sh 6        # 6 Folgen (YouTube-Limit/Tag)
   ```
   Nächster Tag: `bash run-local.sh 7` für den Rest.

**Autonom per Cron (PC):** z. B. `crontab -e` →
```
0 7 * * * cd /pfad/zum/repo && bash video-prototypes/aban-files/run-local.sh 2 >> /tmp/aban.log 2>&1
```
→ lädt täglich 2 Folgen, bis alle durch sind. Komplett gratis, kein Limit, keine Karte.

## C. GitLab Cloud-Runner
Siehe `docs/GITLAB-SETUP.md`. 400 Gratis-Minuten/Monat, aber **einmalige Karten-Verifizierung**
(kein Abbuchen).

## D. GitLab-Runner auf deinem PC (gratis, ohne Karte)
GitLab-Projekt anlegen (wie C), aber statt Cloud-Runner einen **eigenen Runner** auf dem PC
registrieren (`gitlab-runner register`). Dann laufen die `.gitlab-ci.yml`-Jobs auf deinem PC →
unbegrenzt gratis, keine Karte. Mehr Setup als B, lohnt nur wenn du GitLab ohnehin nutzt.

---

## Was bringt das WIRKLICH? (ehrlich)
- **ABAN Files** ist messbar tot (~2–3 Views/Tag). Diese Wege bringen die Folgen zwar hoch,
  ändern aber nichts an der Reichweite. Aufwand nur, wenn du sie aus Prinzip oben haben willst.
- **LuxeStyle-Umsatz** hängt **nicht** an der Automatik, sondern an **Traffic-Qualität** →
  die 3 User-Klicks (TikTok-Pixel + Conversion-Kampagne + AGB) bzw. Pinterest. Kein Skript ersetzt das.
- **Fazit:** „Gratis & autonom" ist technisch gelöst (B/D). Der eigentliche Hebel bleibt menschlich.

## Sicherheit
Secrets **nur** als Env/Secret auf dem PC bzw. in GitLab-Variablen — **nie** in den Code/Chat committen.
