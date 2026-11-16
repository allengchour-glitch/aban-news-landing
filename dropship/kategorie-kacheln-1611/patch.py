#!/usr/bin/env python3
"""Wandelt Codex' lx-collection-welten/-details so um, dass Menü-Treffer über lx-menu-knoten laufen.
Aufruf: python3 -I patch.py <welten.liquid> <details.liquid> <ausgabeordner>. Jeder Anker muss genau einmal vorkommen."""
import sys, os, re

def ersetze(text, alt, neu, name):
    n = text.count(alt)
    if n != 1:
        sys.exit(f"ABBRUCH {name}: Anker {n}-mal gefunden")
    return text.replace(alt, neu)

def block(text, start, ende, name):
    i = text.find(start); j = text.find(ende, i)
    if i < 0 or j < 0 or text.count(start) != 1:
        sys.exit(f"ABBRUCH {name}: Block nicht eindeutig")
    return text[i:j + len(ende)]

KNOTEN = """  assign lx_menu_children = '' | split: ','
  assign lx_menu_parent = blank
  assign lx_menu_siblings = '' | split: ','
  # 16.11.2026 Claude: Menü-Treffer auch für normale Links auf /collections/ (lx-menu-knoten)
  capture lx_knoten
    render 'lx-menu-knoten', menu: lx_menu, ziel: collection.handle
  endcapture
  assign lx_knoten = lx_knoten | strip
  assign lx_knoten_k = lx_knoten | split: ';E=' | first | remove_first: 'K='
  assign lx_knoten_rest = lx_knoten | split: ';E=' | last
  assign lx_knoten_e = lx_knoten_rest | split: ';G=' | first
  assign lx_knoten_g = lx_knoten_rest | split: ';G=' | last
  if lx_knoten_rest contains ';G='
  else
    assign lx_knoten_g = ''
  endif
  if lx_knoten_k != blank
    assign lx_menu_children = lx_knoten_k | split: ','
  endif
  if lx_knoten_g != blank
    assign lx_menu_siblings = lx_knoten_g | split: ','
  endif
  if lx_knoten_e != blank
    assign lx_menu_parent = collections[lx_knoten_e]
    if lx_menu_parent.id == blank
      assign lx_menu_parent = blank
    endif
  endif
"""

def welten(t):
    alt = block(t, "  assign lx_menu_children = '' | split: ','", "        endfor\n      endfor\n    endfor\n  endif\n", "welten-menue")
    t = ersetze(t, alt, KNOTEN, "welten-menue")
    t = ersetze(t, """    for lx_link in lx_menu_children
      assign lx_child = lx_link.object
      if lx_link.type == 'collection_link' and lx_child != blank and lx_child.id != collection.id
""", """    for lx_child_handle in lx_menu_children
      assign lx_child = blank
      if lx_child_handle != blank
        assign lx_child = collections[lx_child_handle]
      endif
      if lx_child != blank and lx_child.id != blank and lx_child.id != collection.id
""", "welten-kacheln")
    return t

def details(t):
    alt = block(t, "  assign lx_menu_siblings = '' | split: ','", "        endfor\n      endfor\n    endfor\n  endif\n", "details-menue")
    # lx_menu wird im Original zwischen den Zeilen gesetzt: erhalten
    t = ersetze(t, alt, "  assign lx_menu = section.settings.menu\n" + KNOTEN, "details-menue")
    alt2 = block(t, "  assign lx_has_children = false\n", "      endif\n    endfor\n  endif\n", "details-kinder")
    t = ersetze(t, alt2, """  assign lx_has_children = false
  if collection.metafields.lux.unterfilter.value != blank
    assign lx_has_children = true
  else
    for lx_kind_handle in lx_menu_children
      if lx_kind_handle != blank and lx_kind_handle != collection.handle
        assign lx_has_children = true
      endif
    endfor
  endif
""", "details-kinder")
    t = ersetze(t, """    for lx_link in lx_menu_siblings
      assign lx_sibling = lx_link.object
      if lx_link.type == 'collection_link' and lx_sibling != blank and lx_sibling.id != collection.id
""", """    for lx_sibling_handle in lx_menu_siblings
      assign lx_sibling = blank
      if lx_sibling_handle != blank
        assign lx_sibling = collections[lx_sibling_handle]
      endif
      if lx_sibling != blank and lx_sibling.id != blank and lx_sibling.id != collection.id
""", "details-geschwister")
    return t

w, d, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
open(os.path.join(out, 'lx-collection-welten.liquid'), 'w').write(welten(open(w).read()))
open(os.path.join(out, 'lx-collection-details.liquid'), 'w').write(details(open(d).read()))
print("ok")
