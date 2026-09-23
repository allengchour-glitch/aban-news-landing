#!/bin/bash
# mit_textsperre.sh — nimmt die geteilte Produkttext-Sperre (fd 8) und fuehrt dann den Befehl aus.
#   bash automation/shopify_schranke.sh bash automation/mit_textsperre.sh python3 automation/<werkzeug>.py
# 23.09.2026: Reihenfolge IMMER Shopify-Platz zuerst, Text-Sperre danach (vorher umgekehrt im Aufseher →
# Deadlock mit produkttexte_du_form, das einen Platz haelt und je Produkt auf die Text-Sperre wartet).
# Wartet hoechstens 240 s auf die Sperre; die Sperre wird an den Befehl vererbt (exec) und endet mit ihm.
exec 8>/tmp/lock_produkttext.lock
flock -w 240 8 || { echo "$(date -u +%H:%M) Text-Sperre 240 s belegt — naechster Lauf: $*"; exit 0; }
exec "$@"
