#!/usr/bin/env python3
"""Fassung 3 (16.11.2026, Claude; baut auf Fassung 2 auf): Codex' lx-collection-welten/-details/-welten-card bekommen Menü-Kinder und
Nachbarn aus lx-menu-knoten (auch HTTP-Links). Codex' Menü-Schleife bleibt unverändert stehen: sie liefert weiter
den Eltern-Eintrag für den Brotkrumen-Pfad, damit sich kein Pfad und kein JSON-LD ändert. Danach überschreibt
der eingefügte Block nur die Kinder (welten) bzw. Nachbarn und Blatt-Erkennung (details).
Aufruf: python3 -I patch.py <welten.liquid> <details.liquid> <card.liquid> <lx-kopf-pfad.liquid> <ausgabeordner>. Jeder Anker genau einmal."""
import sys, os

def genau_einmal(text, alt, name):
    n = text.count(alt)
    if n != 1:
        sys.exit(f"ABBRUCH {name}: Anker {n}-mal gefunden")

def ersetze(text, alt, neu, name):
    genau_einmal(text, alt, name)
    return text.replace(alt, neu)

LOOP_ENDE = "        endfor\n      endfor\n    endfor\n  endif\n"

KNOTEN_LESEN = """  # 16.11.2026 Claude: Kinder und Nachbarn aus lx-menu-knoten (auch normale Links auf /collections/); Pfad bleibt Codex' Logik oben
  capture lx_knoten
    render 'lx-menu-knoten', menu: lx_menu, ziel: collection.handle
  endcapture
  assign lx_knoten = lx_knoten | strip
  assign lx_knoten_k = lx_knoten | split: '⟦E⟧' | first | remove_first: '⟦K⟧'
  assign lx_knoten_e = lx_knoten | split: '⟦E⟧' | last | split: '⟦G⟧' | first
  assign lx_knoten_g = lx_knoten | split: '⟦G⟧' | last | split: '⟦Z⟧' | first
  unless lx_knoten contains '⟦Z⟧'
    assign lx_knoten_k = ''
    assign lx_knoten_e = ''
    assign lx_knoten_g = ''
  endunless
"""

def nach_erstem_loop(text, einfuegen, name):
    genau_einmal(text, LOOP_ENDE, name)
    i = text.index(LOOP_ENDE) + len(LOOP_ENDE)
    return text[:i] + einfuegen + text[i:]

def welten(t):
    # Fassung 3: Menü-Knoten und Kacheln nur ausserhalb der Kompaktansicht (Seite 2, Filter) berechnen
    anker = "  assign lx_tile_count = 0\n  capture lx_category_tiles\n"
    genau_einmal(t, anker, "welten-kachelstart")
    knoten = "\n".join(("  " + z if z.strip() else z) for z in KNOTEN_LESEN.rstrip("\n").split("\n")) + "\n"
    t = t.replace(anker, "  if lx_is_compact == false\n" + knoten + "    assign lx_menu_children = lx_knoten_k | split: '¶'\n  endif\n" + "  assign lx_tile_count = 0\n  if lx_is_compact == false\n  capture lx_category_tiles\n")
    ende = "  endcapture\n\n  assign lx_has_tiles = false\n"
    genau_einmal(t, ende, "welten-kachelende")
    t = t.replace(ende, "  endcapture\n  endif\n\n  assign lx_has_tiles = false\n")
    # Eigene Sammlung nie als Eltern-Eintrag (Pfad verlinkte sonst auf sich selbst)
    eltern = "  if lx_parent == blank\n    assign lx_parent = lx_menu_parent\n  endif\n"
    genau_einmal(t, eltern, "welten-eltern")
    t = t.replace(eltern, eltern + "  if lx_parent != blank and lx_parent.id == collection.id\n    assign lx_parent = blank\n  endif\n")
    alt = """    for lx_link in lx_menu_children
      assign lx_child = lx_link.object
      if lx_link.type == 'collection_link' and lx_child != blank and lx_child.id != collection.id
"""
    genau_einmal(t, alt, "welten-kacheln")
    i = t.index(alt)
    neu = """    for lx_eintrag in lx_menu_children
      assign lx_teile = lx_eintrag | split: '¦'
      assign lx_child_handle = lx_teile | first
      assign lx_child_titel = lx_teile[1]
      assign lx_child = blank
      if lx_child_handle != blank
        assign lx_child = collections[lx_child_handle]
      endif
      if lx_child != blank and lx_child.id != blank and lx_child.id != collection.id
"""
    t = t[:i] + neu + t[i + len(alt):]
    render_alt = "render 'lx-collection-welten-card', child: lx_child, image_override: lx_image_override, image_position: lx_image_position, index: lx_tile_count"
    if t.count(render_alt) != 2:
        sys.exit("ABBRUCH welten-render: erwartet 2 Aufrufe")
    j = t.index(render_alt, i)  # erster Aufruf nach der Menü-Schleife
    t = t[:j] + render_alt + ", titel: lx_child_titel" + t[j + len(render_alt):]

    # Fassung 3: lange Kachelraster kürzen. Ab 5 Kacheln zeigt das Raster 4 (eine Reihe ab 750 px); der Knopf zeigt den Rest.
    ul_alt = """        <ul class="lx-welten__grid{% if lx_tile_count > 6 %} lx-welten__grid--many{% endif %}{% if section.settings.feature_first and lx_tile_count > 2 %} lx-welten__grid--featured{% endif %}" role="list">
          {{ lx_category_tiles }}
        </ul>
"""
    genau_einmal(t, ul_alt, "welten-raster")
    ul_neu = """        <ul id="lx-welten-grid-{{ section.id }}" class="lx-welten__grid{% if lx_tile_count > 3 %} lx-welten__grid--many{% endif %}{% if lx_tile_count > 4 %} lx-welten__grid--kurz{% endif %}{% if section.settings.feature_first and lx_tile_count > 2 %} lx-welten__grid--featured{% endif %}" role="list">
          {{ lx_category_tiles }}
        </ul>
        {%- if lx_tile_count > 4 %}
        <button type="button" id="lx-welten-mehr-{{ section.id }}" class="lx-welten__mehr" aria-expanded="false" aria-controls="lx-welten-grid-{{ section.id }}">
          {%- case request.locale.iso_code -%}
            {%- when 'fr' -%}Afficher les {{ lx_tile_count }} catégories
            {%- when 'en' -%}Show all {{ lx_tile_count }} categories
            {%- else -%}Alle {{ lx_tile_count }} Kategorien anzeigen
          {%- endcase -%}
        </button>
        <noscript><style>.lx-welten__grid--kurz>.lx-welten__item{display:block!important}.lx-welten__mehr{display:none!important}</style></noscript>
        <script>(function(){var b=document.getElementById('lx-welten-mehr-{{ section.id }}'),g=document.getElementById('lx-welten-grid-{{ section.id }}');if(!b||!g)return;b.addEventListener('click',function(){var n=(window.matchMedia('(min-width: 750px)').matches&&g.classList.contains('lx-welten__grid--featured'))?3:4;g.classList.remove('lx-welten__grid--kurz');b.setAttribute('aria-expanded','true');b.hidden=true;var it=g.children[n];var a=it&&it.querySelector('a');if(a)a.focus();});})();</script>
        {%- endif %}
"""
    t = t.replace(ul_alt, ul_neu)
    css_anker = "  .lx-welten--compact {\n    padding-block-end: .25rem;\n  }\n"
    genau_einmal(t, css_anker, "welten-css")
    css_neu = """  /* 16.11.2026 Claude: lange Kachelraster gekürzt; Pfeil überdeckt den Titel nicht */
  .lx-welten__grid--kurz > .lx-welten__item:nth-child(n+5) {
    display: none;
  }

  .lx-welten__mehr {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    margin-block-start: 1rem;
    margin-inline-end: .75rem;
    padding: .55rem .85rem;
    border: 1px solid var(--color-foreground-heading);
    border-radius: 4px;
    background: transparent;
    color: var(--color-foreground-heading);
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }

  .lx-welten__mehr[hidden] {
    display: none;
  }

  .lx-welten__mehr:focus-visible {
    outline: 3px solid var(--color-foreground-heading);
    outline-offset: 3px;
  }

  .lx-welten__grid .lx-welten__card-title {
    overflow-wrap: anywhere;
    -webkit-hyphens: auto;
    hyphens: auto;
  }

  @media (min-width: 750px) {
    .lx-welten__grid--featured.lx-welten__grid--kurz > .lx-welten__item:nth-child(4) {
      display: none;
    }
  }

  @media (min-width: 750px) and (max-width: 1099px) {
    .lx-welten__grid .lx-welten__card-title {
      padding-inline-end: 0;
    }

    .lx-welten__grid .lx-welten__card-arrow {
      top: .65rem;
      bottom: auto;
      width: 2rem;
      min-height: 2rem;
      font-size: 1rem;
    }
  }

  @media (min-width: 1100px) {
    .lx-welten__grid .lx-welten__card-title {
      padding-inline-end: 3.25rem;
    }
  }

"""
    t = t.replace(css_anker, css_neu + css_anker)
    return t

def details(t):
    t = nach_erstem_loop(t, KNOTEN_LESEN + "  assign lx_menu_siblings = lx_knoten_g | split: '¶'\n", "details-loop")
    eltern = "  if lx_parent == blank\n    assign lx_parent = lx_menu_parent\n  endif\n"
    genau_einmal(t, eltern, "details-eltern")
    t = t.replace(eltern, eltern + "  if lx_parent != blank and lx_parent.id == collection.id\n    assign lx_parent = blank\n  endif\n")
    seen = "  capture lx_sibling_links\n    assign lx_seen_ids = '|'\n"
    genau_einmal(t, seen, "details-seen")
    t = t.replace(seen, seen + "    if lx_parent != blank and lx_parent.id != blank\n      assign lx_seen_ids = lx_seen_ids | append: lx_parent.id | append: '|'\n    endif\n")
    alt_kinder_start = "  assign lx_has_children = false\n"
    genau_einmal(t, alt_kinder_start, "details-kinder")
    i = t.index(alt_kinder_start)
    ende = "  assign lx_is_leaf = false\n  if lx_parent != blank and lx_has_children == false\n    assign lx_is_leaf = true\n  endif\n"
    genau_einmal(t, ende, "details-blatt")
    j = t.index(ende) + len(ende)
    neu = """  assign lx_has_children = false
  if collection.metafields.lux.unterfilter.value != blank
    assign lx_has_children = true
  else
    assign lx_kinder_liste = lx_knoten_k | split: '¶'
    for lx_kind in lx_kinder_liste
      assign lx_kind_handle = lx_kind | split: '¦' | first
      if lx_kind_handle != blank and lx_kind_handle != collection.handle
        assign lx_kind_obj = collections[lx_kind_handle]
        if lx_kind_obj.id != blank
          assign lx_has_children = true
        endif
      endif
    endfor
  endif

  assign lx_is_leaf = false
  if lx_has_children == false
    if lx_parent != blank or lx_knoten_e != blank
      assign lx_is_leaf = true
    endif
  endif
"""
    t = t[:i] + neu + t[j:]
    alt = """    for lx_link in lx_menu_siblings
      assign lx_sibling = lx_link.object
      if lx_link.type == 'collection_link' and lx_sibling != blank and lx_sibling.id != collection.id
"""
    genau_einmal(t, alt, "details-geschwister")
    k = t.index(alt)
    neu2 = """    for lx_eintrag in lx_menu_siblings
      assign lx_teile = lx_eintrag | split: '¦'
      assign lx_sibling_handle = lx_teile | first
      assign lx_sibling_titel = lx_teile[1] | default: ''
      assign lx_sibling = blank
      if lx_sibling_handle != blank
        assign lx_sibling = collections[lx_sibling_handle]
      endif
      if lx_sibling != blank and lx_sibling.id != blank and lx_sibling.id != collection.id
"""
    t = t[:k] + neu2 + t[k + len(alt):]
    echo_alt = "          echo lx_sibling.title | escape\n"
    m = t.index(echo_alt, k)
    if t.count("echo lx_sibling.title | escape") != 2:
        sys.exit("ABBRUCH details-echo: erwartet 2")
    t = t[:m] + "          if lx_sibling_titel != blank\n            echo lx_sibling_titel | escape\n          else\n            echo lx_sibling.title | escape\n          endif\n" + t[m + len(echo_alt):]
    return t

def card(t):
    t = ersetze(t, "{{ child.title | escape }}", "{{ titel | default: child.title | escape }}", "card-titel")
    # Fassung 3: Schleife mit limit: 1 statt products.first (lädt nur ein Produkt)
    t = ersetze(t, """      assign lx_clean_product = child.products.first
      if lx_clean_product.featured_image != blank
        assign lx_card_image = lx_clean_product.featured_image
      endif
""", """      for lx_clean_product in child.products limit: 1
        if lx_clean_product.featured_image != blank
          assign lx_card_image = lx_clean_product.featured_image
        endif
      endfor
""", "card-pinnwand")
    t = ersetze(t, """    assign lx_card_product = child.products.first
    if lx_card_product != blank
      assign lx_card_image = lx_card_product.featured_image
    endif
""", """    for lx_card_product in child.products limit: 1
      assign lx_card_image = lx_card_product.featured_image
    endfor
""", "card-leer")
    return t

def pfad(t):
    # Fassung 3: Pfad verlinkt nie auf die eigene Seite (Hauptpunkt oder Unterpunkt mit derselben URL)
    t = ersetze(t, "        if sub.url == collection.url and p_title == ''\n", "        if sub.url == collection.url and p_title == '' and link.url != collection.url\n", "pfad-ebene1")
    t = ersetze(t, "          if sub2.url == collection.url and p_title == ''\n", "          if sub2.url == collection.url and p_title == '' and sub.url != collection.url\n", "pfad-ebene2")
    return t

w, d, c, k, out = sys.argv[1:6]
os.makedirs(out, exist_ok=True)
open(os.path.join(out, 'lx-collection-welten.liquid'), 'w').write(welten(open(w).read()))
open(os.path.join(out, 'lx-collection-details.liquid'), 'w').write(details(open(d).read()))
open(os.path.join(out, 'lx-collection-welten-card.liquid'), 'w').write(card(open(c).read()))
open(os.path.join(out, 'lx-kopf-pfad.liquid'), 'w').write(pfad(open(k).read()))
print("ok")
