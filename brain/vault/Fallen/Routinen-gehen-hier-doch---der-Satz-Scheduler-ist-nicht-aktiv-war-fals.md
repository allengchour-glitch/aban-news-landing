---
tags: [falle, teuer-gelernt]
quelle: Session
gelernt: 2026-09-30
---
# Routinen gehen hier doch - der Satz Scheduler ist nicht aktiv war falsch

GEMESSEN 30.09.2026: mcp__Claude_Code_Remote__create_trigger legt eine echte wiederkehrende Routine an. Beleg: trig_014EJWgLC9AmpW3kDZkAUQqu, cron CRON_TZ=Europe/Zurich 56 8 * * *, enabled true, next_run_at gesetzt. CLAUDE.md behauptete seit Monaten 'Scheduler (CronCreate/ScheduleWakeup) ist hier nicht aktiv -> kein echter Cron-Loop ueber Stunden moeglich' und leitete daraus ab, Autonomie sei nur Charge fuer Charge moeglich. Der Satz nennt die falschen Werkzeuge: CronCreate und ScheduleWakeup sind nicht der Weg, create_trigger ist es. ACHTUNG die echte Grenze liegt woanders: eine so angelegte Routine fuehrt KEINE Connectors mit (gemessen, der connectors-Parameter wird von dieser Organisation abgelehnt), die gefeuerte Sitzung hat also keine mcp__Shopify__*-Tools und kann am Shop nichts aendern.

Verwandt: [[Hypothese-mit-Datum]]
