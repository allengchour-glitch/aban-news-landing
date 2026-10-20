---
tags: [falle, teuer-gelernt]
quelle: Runde 16:25, 20.10.2026, Journal 🔁
gelernt: 2026-10-20
---
# posted_at ist seit dem Vorlauf die Planungszeit: Leser müssen den Plan lesen (REEL-KADENZ)

Seit dem 7-Tage-Vorlauf (18.10.2026) tragen Metricool-Zeilen in reels_seed.csv posted_at = Planungszeit; die Sendezeit steht in dropship/_vorlauf_plan.json (status=geplant + mc_ids). Die Betreiber-Ampel (12:25) und reel_kadenz_wache.py (16:25) meldeten deshalb Stille bei laufendem Posten (IG/FB 42 h, YouTube 42 h). Zusätzlich löste die Planer-Regex ^metricool:(\d+)$ die Form 'metricool:ID fb:ID' nie auf, und das Planer-Fenster -4/+2 Tage deckt +7-Tage-Pläne nicht ab. Regel: jeder Leser von posted_at leitet die Sendezeit aus dem Plan ab, Plan-Zeilen zählen nicht als Post, zurückgezogene/fehlerhafte/ausgelaufene Slots lassen den Befund stehen; Kanarienvogel in beide Richtungen mit Mutationsbeweis (reel_kadenz_wache.py --test).

Verwandt: [[Hypothese-mit-Datum]]
