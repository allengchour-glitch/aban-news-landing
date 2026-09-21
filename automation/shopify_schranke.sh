#!/bin/bash
# Schranke: hoechstens ZWEI Shopify-Waechter zugleich (21.09.2026, gemessen 09:44: drei
# Reiniger hielten den Eimer bei 15/2000, ein vierter starb mit «12x gedrosselt»).
# Aufruf:  bash automation/shopify_schranke.sh <befehl …>
# Nimmt Platz 1 oder 2 (flock ohne Warten); ist keiner frei, wartet er bis 15 min auf
# Platz 1. Der Platz haengt am Datei-Deskriptor und wird per `exec` an den Befehl
# VERERBT — der Kernel gibt ihn beim Prozessende frei, keine PID-Datei, keine Ruine.
#
# ⚠️ WARUM EINE EIGENE DATEI (teuer gelernt 21.09.2026, 10:11–16:20): dieselbe Logik stand
# sechs Stunden lang INLINE in zwei `bash -c "…"`-Strings des Aufsehers. Die inneren
# Anfuehrungszeichen um `exec $((6+_s))>…` schlossen den aeusseren String; `$_s` und
# `$((6+_s))` wurden von der AEUSSEREN Shell expandiert (leer bzw. 6), und der Rest der
# Zeile wurde als Dateiname ausgefuehrt: «line 412: /tmp/shopify_slot_.lock; flock …:
# No such file or directory». Folge: KEINER der 49 Tages-Waechter und keiner der 13
# Reiniger startete — 89 Fehlermeldungen im Aufseher-Log, die niemand las, waehrend die
# Sandbox-Probe des Bausteins (3 Prozesse / 2 Plaetze) gruen war. Ein Test des Bausteins
# ist kein Test des Einbaus. Eine Datei hat keine Quoting-Ebenen.
# Deskriptoren 21/22 — NICHT 7/8: die vier Produkttext-Werkzeuge halten ihr gemeinsames
# Schloss auf Deskriptor 8 (TXTLOCK im Aufseher), und `exec 8>` haette es hier stillschweigend
# ersetzt = freigegeben (gemessen 21.09. beim Nachlesen, nicht im Betrieb).
# Zwei Reihen (21.09., 16:40 gemessen): mit EINER Reihe hielten zwei Katalog-Scanner
# (textbild_fix, cj_verfuegbarkeit, je 20–40 min) beide Plaetze, und 25 leichte
# Tages-Waechter warteten dahinter — bei stuendlichem Container-Neustart waeren sie nie
# drangekommen. Darum: SCHRANKE_NAME=reiniger_slot SCHRANKE_PLAETZE=1 fuer die schweren
# Reiniger (EIN Scanner zugleich, ~100 Punkte/s = Nachlauf des Eimers), Standard
# shopify_slot mit 2 Plaetzen fuer die Tages-Waechter. Hoechstens drei Prozesse am Eimer.
_NAME="${SCHRANKE_NAME:-shopify_slot}"; _N="${SCHRANKE_PLAETZE:-2}"
for _s in $(seq 1 "$_N"); do
  eval "exec $((20+_s))>/tmp/${_NAME}_${_s}.lock"
  if flock -n $((20+_s)); then _SLOT=$_s; break; fi
done
if [ -z "${_SLOT:-}" ]; then
  # Warten OHNE Frist: 25 Waechter standen um 16:22 in der Reihe, ein 15-min-Timeout haette
  # die meisten mit exit 0 entlassen und der Aufseher haette sie zwei Minuten spaeter erneut
  # gestartet (Zaehler-/Anspruchs-Rauschen). Ein Wartender haelt nichts; die Reihe rueckt
  # nach, sobald ein Platz frei wird; der stuendliche Container-Neustart ist die Obergrenze.
  exec 21>"/tmp/${_NAME}_1.lock"
  flock 21
fi
exec "$@"
