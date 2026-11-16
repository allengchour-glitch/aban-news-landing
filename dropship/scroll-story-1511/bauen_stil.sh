#!/bin/bash
# Baut theme/sections/lx-story.liquid aus theme_src/sections/lx-story.liquid und setzt theme_src/assets/lx-story.css
# in den {% stylesheet %}-Block (Platzhalter /*LX-STORY-CSS*/). Shopify lädt diesen Stil im <head> (kompilierte Theme-Stile).
set -e
H=$(cd "$(dirname "$0")" && pwd)
python3 - "$H" <<'PY'
import sys, re
h = sys.argv[1]
src = open(h + '/theme_src/sections/lx-story.liquid', encoding='utf-8').read()
css = open(h + '/theme_src/assets/lx-story.css', encoding='utf-8').read()
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)                 # Kommentare raus
css = '\n'.join(l.strip() for l in css.splitlines() if l.strip())
assert src.count('/*LX-STORY-CSS*/') == 1
assert '{%' not in css and '{{' not in css
out = src.replace('/*LX-STORY-CSS*/', css)
open(h + '/theme/sections/lx-story.liquid', 'w', encoding='utf-8').write(out)
print('lx-story.liquid', len(out), 'Zeichen, Stil', len(css), 'Zeichen')
PY
