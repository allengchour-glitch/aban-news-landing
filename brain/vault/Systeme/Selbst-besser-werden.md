---
tags: [system, methode]
gelernt: 2026-09-12
---
# Selbst besser werden — der Kreis, der sich schliesst

Das Versprechen aus dem Video: „Du baust sie einmal. Danach werden sie jeden Tag besser, an dem
du sie benutzt." Damit das hier stimmt und nicht bloss eine Behauptung bleibt, braucht es einen
Mechanismus, der bei jeder Session greift.

## Der Kreis

1. **Session-Start:** `automation/brain-wake.sh` zeigt Health-Score, Vault-Stand und die Zahl
   der offenen User-Klicks. Der Haken steht in `.claude/settings.json` und schreibt nichts.
2. **Während der Arbeit:** Skills laden sich selbst, wenn die Aufgabe passt.
3. **Wenn etwas Teures gelernt wurde:** `python3 tools/lehre.py "…"` legt die Lehre als Notiz im
   Vault ab und verweist auf den Skill, der sie künftig auslöst.
4. **Vor dem Commit:** `python3 tools/skills_pruefen.py` und `python3 tools/vault.py bauen`
   finden verrottete Verweise und kaputte Links.
5. **Session-Ende:** Stand-Block in `CLAUDE.md`, mit **Zahlen** statt Eindrücken.

## Die Bremse, die dazugehört

Ein selbstverbesserndes System, das sich selbst bewertet, lügt. Deshalb gilt
[[Messgeraet-Gegenprobe]]: jedes Werkzeug in diesem Kreis hat einen `--selbsttest`, der an einem
künstlich kaputten Fall ausschlagen **muss**. Ein Werkzeug, das immer „alles gut" sagt, ist
schlimmer als keines.

## Was schon vorher lief

`tools/daily_improvement_scan.py` mit `automation/brain-state.json` — Health-Score 100,0/100 über
2694 Seiten. Doku: `automation/BRAIN.md`.

Verwandt: [[Claude-Skills]] · [[Zweites-Gehirn]] · [[Hypothese-mit-Datum]]
