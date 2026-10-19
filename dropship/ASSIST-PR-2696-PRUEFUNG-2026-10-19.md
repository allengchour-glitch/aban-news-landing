# PR #2696 «LuxeStyle Assist 2.1» (Codex) — unabhängige Prüfung vom 19.10.2026

Auftrag: Betreiber meldete «LuxeStyle Assist für Claude Code gebaut und in PR #2696 hochgeladen». Geprüft wurde der Stand `0f1da1c0` (Branch `codex/luxestyle-claude-assist-20261018`,
Draft, 18 Dateien, +1906 Zeilen) von 4 Prüfern, 22 Hoch/Mittel-Befunde wurden von je 2 Skeptikern gegengeprüft (53 Agenten), dazu ein Vollständigkeitskritiker.
PR-Code lief nur in einer Sandbox (`unshare -rmnpf`: kein Netz, leere Umgebung, /tmp /root /home verdeckt). Marken: **GEMESSEN** = selbst nachgestellt, **VERMUTUNG** = nicht belegt.

## Urteil

**So nicht mergen.** Der Code ist sauber (GEMESSEN: 86/86 Tests grün in Node 22, nur `node:`-Builtins, kein eval/Netz/Fremd-URL, 16 von 16 Dateien identisch zum PR-Patch),
aber er hat einen Blocker, einen Datenverlust-Pfad im Zusammenspiel mit unserer Git-Automatik und Texte, die dem Dauerauftrag widersprechen.
- Auf **main-Linie** (wohin der PR gehört): nach den Pflichtänderungen unten mergebar.
- Auf **unserem Zweig `claude/luxestyle-status-tztnn1`: nicht übernehmen** (25'255 Commits vor, 1'470 hinter main, keine gemeinsame Merge-Basis; `core`/`seo`-Profile laufen dort ins Leere).
- Nutzen für unseren Betrieb gering: Start/Zustand deckt `engine_keepalive.sh` besser ab (~25 Live-Zeilen); der Helfer misst nur die eigene Einrichtung.

## Pflichtänderungen (vom Skeptiker bestätigt)

1. **BLOCKER (hoch, GEMESSEN): jeder `tools/call` von echtem Claude Code scheitert.** Claude Code 2.1.303 hängt an jeden Aufruf `params._meta` (`progressToken`, `claudecode/toolUseId`) an;
   `claude_assist_mcp.mjs:115-116` erlaubt in `params` nur `name`/`arguments` → `-32602`. `ping`/`tools/list` mit `_meta` ebenso. Handshake und `tools/list` gehen durch, der Server wirkt gesund;
   weder Tests noch `self-check` noch `doctor` senden je `_meta` → alles grün. Fix: `_meta` (Objekt) erlauben und ignorieren, Responses ohne `method` still verwerfen; Regressionstest mit dem echten Mitschnitt;
   `self-check` um ein `tools/call` mit `_meta` erweitern; vor dem Merge einmal mit echtem Claude Code gegenprüfen.
2. **Journal ist nicht merge-fest (mittel, GEMESSEN).** Zwei Checkouts mit je einem Anhang → beide `seq 4`; unser `automation/lib/git_aufloesen.sh` vereinigt `dropship/*.jsonl` per Union (bash-`case`: `*` matcht auch `/`)
   → `seq 1,2,3,4,4` → `handoff-read` = `unknown/corrupt`, Speichern verweigert, kein Reparaturweg. Fix: eine Datei pro Eintrag oder ein Journal pro Schreiber (oder fork-toleranter Leser + `journal-merge`),
   Pflichtfeld `agent` (claude/codex/operator) und Status «erledigt»; bei uns `handoff.jsonl` aus der Union-Regel nehmen. Dazu: Sperrdatei ohne PID/Zeit (bleibt nach SIGKILL/Container-Neustart liegen).
3. **Texte stellen den Dauerauftrag unter Vorbehalt (hoch→mittel).** CLAUDE.md-Zeile «Historische Autonomie-/Merge-Anweisungen erweitern den Chat-Auftrag nicht», README «Weiter geltender Inhaberumfang vom 18.10.»,
   `POLICY`-Konstante im Code: unbelegt als Betreiberwille, widersprechen dem Autonom-Auftrag («nicht nach Erlaubnis fragen») und Tagesentscheiden (Musik nur `luxe-premium.wav`, Versandgrenze CHF 50/45 statt 40.50,
   «kein Voiceover» vs. Betreiber «2 ja»). Fix: als «ChatGPT-Chat-Vorgabe, nicht verifiziert» kennzeichnen oder in eine Codex-eigene Datei verlagern; veraltete Zahlen streichen.
4. **Prozess:** auf main steht die Regel «PRs ohne Nachfrage mergen, sobald CI grün» — der Draft würde trotz Blocker gemergt. Draft halten. Zweiter Codex-PR #2689 ändert dieselbe Stelle am Kopf von CLAUDE.md
   (gegenseitiger Widerspruch bei der Versandzahl). Abnahme erst nach einem dokumentierten Rundlauf «Codex schreibt, Claude liest und antwortet» (echte Clientversionen in `VALIDATION.md`).
5. **Kleinkram:** `luxe_checks` ist `readOnlyHint:true` obwohl es Repo-Testcode ausführt (→ false, ehrliche Beschreibung); Geheimnis-/Personenfilter lässt gängige Token-/Namensformen durch, das Journal landet per Autocommit
   im öffentlichen Repo; `check changed` meldet «passed» für kaputtes `.mcp.json`/Slash-Befehl/Workflow (kein Test liest sie); Slash-Befehl verlangt bei jedem Aufruf `SHARED-MEMORY.md` (143 KB) zu lesen.

## Sicherheit (kein Schadcode; keine Grenze)

GEMESSEN: Das «Offline»-Preload ist keine Sperre (5 von 9 Umgehungen liefen: `process.binding`, `ChildProcess`-Klasse, `process.execve`, `dns.Resolver`, WebSocket); ein manipulierter fester Test las
Elternprozess-Umgebung und `/tmp/*.env` und `luxe_checks` meldete trotzdem «passed». Das setzt Schreibrecht am Arbeitsbaum voraus — gleiche Klasse wie der bestehende SessionStart-Hook, daher **niedrig**, aber das Etikett
«offline/read-only» ist irreführend. Cloud-/`-p`-/SDK-Sitzungen laden Projekt-MCP-Server laut Claude-Code-Doku ohne Rückfrage; ob stdio-Server die volle Umgebung erben, ist UNBELEGT.

## Was wir übernehmen könnten (ohne den PR)

Hash-Pinning von Review-Aufträgen, begrenzter Testläufer, «unbekannt bleibt unbekannt». Für «Claude merkt, was Codex tut» genügt eine Keepalive-Zeile «CODEX-PRS» (offene `codex/*`-PRs mit Alter) oder `subscribe_pr_activity`.

## Offene Betreiberfragen

1. Gelten die ChatGPT-Chat-Grenzen (nur `luxe-premium.wav`, kein Voiceover, Shop-Änderungen nur als Entwurf) auch für Claude-Sitzungen — oder nur für das ChatGPT-Filmprojekt?
2. Führt die ChatGPT-Aufgabe «LuxeStyle Metricool steuern» Code mit Shell aus oder nur über Konnektoren?
3. Windows oder Mac am PC (Verzeichnis-`fsync`, absoluter `--import`-Pfad im PR sind für Windows ungeprüft)?

Belege: Workflow `wf_bbde21b5-2c7` (Journal in `~/.claude/projects/…/subagents/workflows/`), Sandbox-Skript `/srv/_assist_sbx/sbx.sh` (nicht im Repo; `unshare -rmnpf --mount-proc`, tmpfs über /tmp /root /home /mnt, `env -i`).
