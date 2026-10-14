---
tags: [falle, teuer-gelernt]
quelle: dropship/CH-LAGER-PROFIL-2026-10-13.md §Nachtrag 14.10.
gelernt: 2026-10-14
---
# Anspruch vor der Arbeit braucht Beweis danach (leeres Tageslog)

Der Aufseher setzt touch auf das Log, bevor er einen Tageswächter startet. Stirbt der Lauf beim stündlichen Container-Neustart, bevor Python etwas geschrieben hat (gepuffert), bleibt ein leeres Log mit frischem Datum — der Tag gilt als erledigt. absturz_nachholen holte nur Logs mit Traceback/Error nach: psa_schuhe_wache und ch_lager_profil liefen 15 h nicht. Fix: leeres Log mit mtime vor dem Container-Start = still gestorben → nachholen (max 3x/Tag).

Verwandt: [[Hypothese-mit-Datum]]
