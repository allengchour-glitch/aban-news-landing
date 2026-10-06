#!/usr/bin/env bash
# cj_vorrang_fenster.sh — EINE Stelle für das CJ-Vorrang-Fenster (06.10.2026).
#
# ANLASS: Das Fenster stand fest auf 16:00–17:30 UTC («Punkte-Reset ~16:00», Annahme vom 15.08.). GEMESSEN 06.10.:
# CJ setzt die Punkte um 00:00 UTC zurück (Runner 23:08 «Remaining: 0», 00:09 liest wieder; CJ-Doku points.html
# «00:00 UTC»), und die vier Grind-Runner leeren den Topf bis ~04:00 (heute 04:09 bei 74'510). Um 16:00 war nichts
# mehr da: der Video-Nachfüller fand am 05.10. um 16:14 sofort 16900500 → 0 Videos; Kosten-Nachtrag und
# Bewertungen dito. Das Fenster gehört DIREKT hinter den Reset.
#
# Startstunde (UTC) aus dropship/_CJ_PUNKTE_RESET_UTC (Standard 0), Dauer 90 min. Der Wächter
# `cj_reset_wache.py` misst den Reset an den Runner-Logs und meldet, wenn die Datei nicht mehr stimmt.
#
#   source automation/cj_vorrang_fenster.sh; cj_vorrang_zeit && echo im-fenster; echo "$CJ_FENSTER_TEXT"
_cjvf_repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)"
CJ_RESET_STD=$(tr -dc 0-9 < "$_cjvf_repo/dropship/_CJ_PUNKTE_RESET_UTC" 2>/dev/null)
CJ_RESET_STD=$(( 10#${CJ_RESET_STD:-0} % 24 ))
CJ_FENSTER_TEXT=$(printf '%02d:00-%02d:30 UTC' "$CJ_RESET_STD" $(( (CJ_RESET_STD + 1) % 24 )))
cj_vorrang_zeit() {
  local jetzt=$(( 10#$(date -u +%H) * 60 + 10#$(date -u +%M) ))
  local ab=$(( CJ_RESET_STD * 60 ))
  local seit=$(( (jetzt - ab + 1440) % 1440 ))
  [ "$seit" -lt 90 ]
}
