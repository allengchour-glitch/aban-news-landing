---
tags: [falle, teuer-gelernt]
quelle: Journal 22.09. Nachtrag 12
gelernt: 2026-09-22
---
# Blockierender Lock im Stunden-Container ist ein Nie

produkttexte_du_form_reparatur.py nahm /tmp/lock_produkttext.lock mit LOCK_EX ohne NB und stand hinter dem Du-Form-Stundenlauf, der bis zum Container-Neustart schreibt. Der Aufseher hätte ihn jede Stunde neu gestartet, er wäre nie drangekommen. Regel: Sekundär-Läufer nehmen Text-Locks nur nicht-blockierend (kurzes Probieren, dann Meldung + Exit 0), und der Aufseher prüft mit flock -n vor dem Start.

Verwandt: [[Hypothese-mit-Datum]]
