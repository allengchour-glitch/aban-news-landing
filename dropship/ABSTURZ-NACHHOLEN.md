# Absturz nachholen — Tagesläufe mit Log-Alter-Tor (24.09.2026)

**Befund (08:30 UTC):** Ein Shopify-Aussetzer um 02:17 UTC liess sechs Tagesläufe mit Traceback enden. Ihr Tor im
Aufseher fragt nur «Log älter als 24 h?» — der Absturz hatte das Log frisch geschrieben, also wären sie erst
morgen 02:17 wieder drangekommen:

| Lauf | Wirkung, solange er steht |
|---|---|
| neuheiten_rotation | Startseiten-Reihe «Neu eingetroffen» dreht nicht |
| google_kanal_saeubern | Google-Kanal wird nicht gesäubert |
| querbeet | Querbeet-Reihe veraltet |
| kollektion_leer | leere Kollektionen bleiben unentdeckt |
| versandprofil_poster | Versandprofil-Prüfung fällt aus |
| versandschwelle_rabatt | Versandschwellen-Prüfung fällt aus |

**Regel (automation/fixer_keepalive.sh, `absturz_nachholen`):** 48 von 49 Log-Alter-Toren starten zusätzlich neu, wenn
das Log mit Traceback/Error/Exception endet, der Absturz ≥ 60 min zurückliegt und heute höchstens 3 Nachholversuche
liefen (Zähler `/tmp/_nachgeholt_<lauf>_<datum>`). Ausnahme: `klassen_kontrolle` hat eine eigene Fortsetzungslogik.
Probe mit synthetischen Logs: Absturz → 3 Starts, 4. gesperrt; FERTIG-Log → kein Start; frischer Absturz → kein Start.
Wirksam ab dem nächsten Aufseher-Start (Schleife = ein `while … done`, beim Start ganz gelesen).

**Nachtrag 09:15 UTC:** Der laufende Aufseher trägt die alte Fassung (kein Container-Neustart seit 07:03; der Neustart
des Aufsehers von Hand wurde vom Berechtigungsfilter abgelehnt — bleibt dem nächsten Start überlassen). Die sechs
Läufe deshalb einmal mit exakt den Aufseher-Befehlen (gleiche Sperren, gleiche Schalter) nachgeholt.
**Beifund:** `versandprofil_poster` stand mit `bash -c "… versandprofil_poster.py" --scharf` im Aufseher — das Argument
lag ausserhalb der Zeichenkette, bash nahm es als `$0`, Python sah es nie. Der Wächter lief seit seinem Einbau nur als
Probelauf. Korrigiert; Suche nach derselben Form im Aufseher und in engine_keepalive: keine weitere.
