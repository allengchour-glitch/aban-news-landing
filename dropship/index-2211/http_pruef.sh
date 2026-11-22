#!/usr/bin/env bash
# Prueft Seiten nacheinander: HTTP-Status, noindex, Groesse (Bytes); Pause zwischen den Abrufen.
IN="$1"; OUT="$2"; PAUSE="${3:-75}"
: > "$OUT"
while read -r u; do
  [ -z "$u" ] && continue
  f=$(mktemp)
  code=$(curl -s -o "$f" -w '%{http_code}' -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' -H 'Accept: text/html,application/xhtml+xml' -H 'Accept-Language: de-CH,de;q=0.9' "$u")
  size=$(stat -c%s "$f")
  ni=$(grep -c -i -E '<meta[^>]+name="robots"[^>]+noindex' "$f")
  sperre=$(grep -c -i 'Verifying your connection' "$f")
  canon=$(grep -o -i -E '<link rel="canonical" href="[^"]+"' "$f" | head -1 | sed 's/.*href="//;s/"$//')
  echo -e "$u\t$code\t$size\tnoindex=$ni\tsperre=$sperre\tcanonical=$canon" >> "$OUT"
  rm -f "$f"
  python3 -c "import time,sys; time.sleep(float(sys.argv[1]))" "$PAUSE"
done < "$IN"
echo FERTIG >> "$OUT"
