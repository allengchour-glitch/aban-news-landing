---
tags: [blockiert, github, nur-user]
quelle: CLAUDE.md
gelernt: 2026-08-30
---
# Das GitHub-Konto ist als Spam markiert

GitHubs eigene Meldung aus der Search-API: `Validation Failed: User flagged as spammy`.

Damit ist belegt, dass drei Dinge, die monatelang als getrennte Rätsel im Gedächtnis standen,
**ein** Problem sind:

1. „Actions has been disabled for this user" — siehe [[Actions-Sperre]]
2. die harten API-Rate-Limits
3. dass Repo **und** Benutzerprofil für alle ausser dem Besitzer **404** liefern

Markierte Konten werden öffentlich unsichtbar geschaltet. Das Repo ist weiterhin als *public*
angelegt und existiert.

## Konsequenzen für jede Session

- **Ein 404 auf dieses Repo ist kein Beweis, dass es fehlt.** Erst anmelden, dann urteilen.
  Authentifizierter REST-Zugriff funktioniert vollständig (`list_branches`, `pull_request_read`,
  `push`, `merge_pull_request`). Benutzer existiert, ID 284760098.
- **Nur GraphQL ist gedrosselt.** Draft-PR auf „ready for review" setzen klemmt deshalb. Dann
  weiterarbeiten, Commits sammeln sich im selben PR, später ein Merge. Nicht hämmern.
- Ein zweiter PR für dasselbe head nach base geht nicht.
- **Ein anonymer Gegentest aus der Cloud-Session ist wertlos** — der Agent-Proxy liefert selbst
  403/404.
- PC- und Terminal-Claude brauchen `gh auth login`, danach klonen und pushen sie normal.

## Nur der User kann das lösen

Einspruch bei **support.github.com/contact**, Konto-Wiederherstellung beantragen
(„account flagged as spam, request reinstatement"). Es löst sich nicht von selbst.

Verwandt: [[Live-Deploy]] · [[Actions-Sperre]] · [[Stale-Ref-Falle]]
