# Baut die Korrekturfassung von lx-kopf-bewegt.liquid aus der alten Fassung (theme_alt). Schreibt theme/snippets/.
import sys
D='/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/bewegt1511/'
s=open(D+'theme_alt/snippets/lx-kopf-bewegt.liquid').read()
def ers(alt,neu):
    global s
    assert s.count(alt)==1, ('nicht eindeutig/fehlt', alt[:80])
    s=s.replace(alt,neu)
ers("  Kopffotos geladen sind (Klasse lx-kb-drift): sonst wird ein spaeter geladenes, schon vergroessertes Foto zum LCP-Element.\n{%- endcomment -%}",
"""  Kopffotos geladen sind (Klasse lx-kb-drift): sonst wird ein spaeter geladenes, schon vergroessertes Foto zum LCP-Element.
  16.11.2026 (Korrekturrunde): Fotos per overflow:clip beschnitten (overflow:hidden setzte die Mindesthoehe des Rasterelements
  auf 0 und aenderte den Ausschnitt; clip-path nur als Rueckfall, es aendert die Bildglaettung). Clip nur, wenn das Produkt Mitglied der Sammlung ist und die hinterlegte Ausfuehrung
  kaufbar ist; Weihnachtskugeln nur bis 06.01.2027. Buehne in <template>: ohne JavaScript wird nichts geladen, der Textabstand
  haengt an der Klasse lx-kb-clip. Anhalten stellt die Parallaxe auf 0 (CSS-Pfad und Skript-Rueckfall). Unter 1100 px pausiert
  das Video. Ein abgebrochenes play() (AbortError) entfernt den Clip nicht. Clips 960x720 (eigene Dateien lx-kb-*).
{%- endcomment -%}""")
a=s.index('{%- liquid'); e=s.index('-%}\n{%- if teil ==')+3
s=s[:a]+open(D+'korrektur_liquid.txt').read().rstrip('\n')+s[e:]
ers('.lx-kk.lx-kb-an .lx-kk__bilder picture{overflow:hidden}','.lx-kk.lx-kb-an .lx-kk__bilder picture{overflow:clip}\n@supports not (overflow:clip){.lx-kk.lx-kb-an .lx-kk__bilder picture{clip-path:inset(0)}}')
ers('.lx-kk.lx-kb-halt .lx-kk__bilder img,.lx-kk.lx-kb-weg .lx-kk__bilder img,.lx-kk.lx-kb-halt .lx-kk__bilder,.lx-kk.lx-kb-halt .lx-kb__clip{animation-play-state:paused}',
    '.lx-kk.lx-kb-halt .lx-kk__bilder img,.lx-kk.lx-kb-weg .lx-kk__bilder img{animation-play-state:paused}\n.lx-kk.lx-kb-halt .lx-kk__bilder,.lx-kk.lx-kb-halt .lx-kb__clip{animation:none!important;translate:none!important}')
ers('.lx-kk .lx-kk__text{padding-right:calc(var(--lxkb-w) * .9 + 1rem)}','.lx-kk.lx-kb-clip .lx-kk__text{padding-right:calc(var(--lxkb-w) * .9 + 1rem)}')
a=s.index('{%- assign lxkb_gif'); b=s.index('<div class="lx-kb" hidden',a); e=s.index('\n',b)+1
s=s[:a]+'<template class="lx-kb-vorlage"><div class="lx-kb" aria-hidden="true" data-lx-kb="{{ lxkb_id }}" data-video="{{ lxkb_v }}" style="--lxkb-pos:{{ lxkb_pos }};--lxkb-z:{{ lxkb_z }}"><img class="lx-kb__amb" src="{{ lxkb_b }}" alt="" width="960" height="720" decoding="async"><div class="lx-kb__clip"><img class="lx-kb__poster" src="{{ lxkb_b }}" alt="" width="960" height="720" decoding="async"></div></div></template>\n'+s[e:]
a=s.index('<script>(function(){'); e=s.index('})();</script>')+len('})();</script>')
s=s[:a]+open(D+'korrektur_js.txt').read().rstrip('\n')+s[e:]
open(D+'theme/snippets/lx-kopf-bewegt.liquid','w').write(s)
print('geschrieben', len(s.encode()), 'Byte')
