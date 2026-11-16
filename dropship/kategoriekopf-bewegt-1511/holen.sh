#!/bin/bash
# Holt Kategorieseiten (HTML) von luxestyle.ch, höchstens 1 Abruf je 7 s, protokolliert in abrufe.log.
# Aufruf: holen.sh <ordner> <pfad-suffix> handle1 handle2 ...
B=$(dirname "$0"); Z=$1; SUF=$2; shift 2; mkdir -p "$Z"
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
for h in "$@"; do
  for v in 1 2 3; do
    code=$(curl -s -o "$Z/$h.html" -w '%{http_code}' -A "$UA" -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' -H 'Accept-Language: de-CH,de;q=0.9' "https://luxestyle.ch/collections/$h$SUF")
    echo "$(date -u +%FT%TZ) $h$SUF $code" >> "$B/abrufe.log"
    if [ "$code" = 429 ]; then echo "429 bei $h, warte 60 s"; sleep 60; continue; fi
    break
  done
  echo "$h $code $(wc -c < "$Z/$h.html")"
  sleep 7
done
