# Mods für Codex: das Plugin `luxe-codex`

Gegenstück zu den Claude-Code-Mods (Leitplanken, Befehle, Schreibzähler, Sparmodus) für die **Codex CLI** (gebaut gegen 0.165.0). Auftrag des Besitzers am 28.10.2026: «programmiere mods für codex».

## Was drin ist

| Teil | Wirkt als | Zweck |
|---|---|---|
| `hooks/leitplanken.mjs` | PreToolUse-Hook | lehnt Force-Push, `pkill`/`killall`, `git add -A`, das Anlegen von `dropship/_SOCIAL_STOPP`, `LIVE=1` ohne Trockenlauf desselben Skripts in dieser Sitzung und Geheimnisse im geschriebenen Text ab. Jeder Grund nennt den Ausweg. |
| `hooks/schreibzaehler.mjs` | PostToolUse + SessionStart | zählt erfolgreiche schreibende Zugriffe nach aussen (Shop, Social, Mail, LIVE-Läufe) und zeigt sie als Statuszeile. Lesende Aufrufe zählen nie. |
| `hooks/kontext.mjs` | SessionStart + UserPromptSubmit | gibt Codex die fünf wichtigsten Projektregeln mit; bei eingeschaltetem Sparmodus den Stil-Hinweis. |
| `skills/sparmodus` | Skill | schaltet den Sparmodus an, aus oder zeigt den Stand. |
| `skills/stand`, `shop-puls`, `lieferbar`, `trend`, `regeln` | Skills | die lesenden Befehle des Claude-Mods. Keiner schreibt am Shop oder verschickt etwas. |
| `skills/zweitmeinung` | Skill + `RUBRIK.md` | die Prüfanweisung für Codex als Gegenleser. |
| `automation/codex_zweitmeinung.mjs` | Werkzeug (nicht Teil des Plugins) | startet einen Zweitmeinungs-Lauf in einem leeren Sandkasten, mit Vorab-Suche nach Geheimnissen, leerer Umgebung und Erkennung des Nutzungslimits. Trockenlauf ist Vorgabe. |

Die Hooks sind eine **Gedächtnisstütze, keine Sicherheitsgrenze**: ein Fehler im Hook blockiert die Arbeit nie (Exit 0), bleibt aber nie stumm (Meldung in der Statuszeile).

## Einspielen

Voraussetzung: Node 18 oder neuer im `PATH` der Hooks.

```bash
codex plugin marketplace add /pfad/zum/repo/codex-mods
codex plugin add luxe-codex@luxe-lokal
codex plugin list            # luxe-codex@luxe-lokal  installed, enabled
```

### Hooks einmal als vertrauenswürdig bestätigen

Codex führt Hooks erst aus, wenn der Mensch sie geprüft hat. Das ist so gewollt. In Codex `/hooks` öffnen, die Hooks von `luxe-codex` ansehen und bestätigen. **Den Schalter `--dangerously-bypass-hook-trust` nicht benutzen.** Ohne diese Bestätigung laufen die Skills, die Hooks aber nicht.

## Lernmodus (zum ersten echten Lauf)

Die Namen der Werkzeuge, die Codex an Hooks meldet, sind aus der Binärdatei nicht ablesbar. Darum entscheiden die Hooks an der **Form** der Eingabe. Mit `LUXE_CODEX_LERNEN=1` schreibt jeder Hook eine gekürzte Zeile (Hook, Ereignis, Werkzeugname, Form der Eingabe) in `<Zustandsordner>/gesehen.jsonl`. Zustandsordner: `LUXE_CODEX_ZUSTAND`, sonst `CLAUDE_PLUGIN_DATA`, sonst `$CODEX_HOME/luxe-codex`.

## Auswege

Wie im Claude-Mod, nur nach dem ausdrücklichen Ja des Besitzers im Chat: `LUXE_FORCE_OK=1`, `LUXE_KILL_OK=1`, `LUXE_ADD_OK=1`, `LUXE_LIVE_OK=1` vor den Befehl; im Text einer Testdatei der Marker `luxe-geheim-ok`.

## Was NICHT bestätigt ist (laut Binärdatei, nicht im echten Lauf gesehen)

- Das Protokoll der Hooks (Eingabe auf stdin, Ausgabe als JSON, `deny` mit Grund) ist aus den Schemas in `luxe-codex/test/schemas/` gelesen, die in der Codex-Binärdatei stecken. Jeder Test prüft die Ausgabe dagegen. Ein echter Lauf mit bestätigten Hooks steht aus (am 28.10. war das Nutzungslimit des Besitzers bis 12:06 erreicht, und die Hooks brauchen die Bestätigung oben).
- Die Werkzeugnamen und die Form von `tool_input` und `tool_response` für Shell und Patch.
- Ob `${CLAUDE_PLUGIN_ROOT}` im Hook-Befehl von der Shell oder von Codex ersetzt wird (beides funktioniert).
- Ob das Feld `timeout` in Sekunden gilt.

## Tests

```bash
node codex-mods/luxe-codex/test/hook_io_test.mjs      # Grundgerüst und Schema-Prüfer
node codex-mods/luxe-codex/test/leitplanken_test.mjs
node codex-mods/luxe-codex/test/schreibzaehler_test.mjs
node codex-mods/luxe-codex/test/modus_test.mjs
node codex-mods/luxe-codex/test/befehle_test.mjs
node automation/lib/codex_zweitmeinung_test.mjs
```

Alle Tests laufen ohne Netz und ohne Modell; der Test des Läufers benutzt einen falschen `codex`.
