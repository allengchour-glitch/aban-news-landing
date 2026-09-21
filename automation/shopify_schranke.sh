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
for _s in 1 2; do
  eval "exec $((6+_s))>/tmp/shopify_slot_${_s}.lock"
  if flock -n $((6+_s)); then _SLOT=$_s; break; fi
done
if [ -z "${_SLOT:-}" ]; then
  exec 7>/tmp/shopify_slot_1.lock
  flock -w 900 7 || exit 0
fi
exec "$@"
