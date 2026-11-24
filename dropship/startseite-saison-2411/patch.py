"""Patch: drei neue Startseiten-Reihen (christmas/winter/gifts) aus eigenen Pools, Karten direkt aus dem Pool-Produkt (kein all_products)."""
import json, sys
SRC = sys.argv[1]; OUT = sys.argv[2]
t = open(SRC).read()
OLD_GROUPS = "{% assign lx_edit_groups = 'jewellery|schmuck,home|wohnen-dekoration' | split: ',' %}"
NEW_GROUPS = "{% assign lx_edit_groups = 'christmas|weihnachten-2026,winter|winter-kaelte,jewellery|schmuck,gifts|premium-geschenke,home|wohnen-dekoration' | split: ',' %}"
assert t.count(OLD_GROUPS) == 1
t = t.replace(OLD_GROUPS, NEW_GROUPS)
i = t.index(NEW_GROUPS)
A = "{% if lx_edit_key == 'jewellery' %}\n        {% assign lx_edit_entries"
a = t.index(A, i)
assert t.count(A) == 1
cap = t.index("{% capture lx_edit_cards %}", a)
end = t.index("{% endcapture %}", cap) + len("{% endcapture %}")
assert end - a < 9000, end - a
alt = t[a:end]
ROW = """{% if lx_edit_count < lx_edit_show %}
                {% capture lx_edit_ok %}{% render 'lx-rot-ok', p: lx_edit_p, stops: lx_trend_stops %}{% endcapture %}
                {% if lx_edit_ok != blank %}{% assign lx_edit_count = lx_edit_count | plus: 1 %}{% render 'lx-edit-karte', p: lx_edit_p, sid: section.id %}{% endif %}
              {% endif %}"""
neu = """{% comment %}Saison-Reihen (24.11.2026): Weihnachten, Winter und Geschenkideen ziehen vier Karten aus je einer eigenen Pool-Sammlung (startseite-pool-weihnachten/-winter/-geschenke, Fenster 12, alle vier Stunden ein anderes). Die Karten kommen direkt aus dem Pool-Produkt (Snippet lx-edit-karte), nicht über all_products: das kennt höchstens 20 Handles je Seite, Trends und Schmuck/Wohnen brauchen schon 17. Fehlt ein Pool oder hat er weniger als 12 Produkte, erscheint die Reihe nicht.{% endcomment %}
      {% if lx_edit_neu %}
        {% assign lx_rot_slot = 'now' | date: '%s' | plus: 0 | divided_by: 14400 %}
        {% assign lx_edit_win = 12 %}
        {% assign lx_edit_show = 4 %}
        {% case lx_edit_key %}{% when 'christmas' %}{% assign lx_edit_pool_handle = 'startseite-pool-weihnachten' %}{% when 'winter' %}{% assign lx_edit_pool_handle = 'startseite-pool-winter' %}{% else %}{% assign lx_edit_pool_handle = 'startseite-pool-geschenke' %}{% endcase %}
        {% assign lx_edit_pool = collections[lx_edit_pool_handle] %}
        {% assign lx_edit_count = 0 %}
        {% capture lx_edit_cards %}
          {% if lx_edit_pool != blank and lx_edit_pool.products_count >= lx_edit_win %}
            {% assign lx_pool_n = lx_edit_pool.products_count | at_most: 50 %}
            {% capture lx_rot_start %}{% render 'lx-rot-start', slot: lx_rot_slot, n: lx_pool_n %}{% endcapture %}
            {% assign lx_rot_start = lx_rot_start | plus: 0 %}
            {% assign lx_edit_rest = lx_edit_win | minus: lx_pool_n | plus: lx_rot_start %}
            {% for lx_edit_p in lx_edit_pool.products offset: lx_rot_start limit: lx_edit_win %}
              ROW
            {% endfor %}
            {% if lx_edit_rest > 0 %}
              {% for lx_edit_p in lx_edit_pool.products limit: lx_edit_rest %}
              ROW
              {% endfor %}
            {% endif %}
          {% endif %}
        {% endcapture %}
      {% else %}
      """.replace("ROW", ROW)
t = t[:a] + "{% assign lx_edit_neu = false %}{% if lx_edit_key == 'christmas' or lx_edit_key == 'winter' or lx_edit_key == 'gifts' %}{% assign lx_edit_neu = true %}{% endif %}\n      " + neu + alt + "\n      {% endif %}" + t[end:]
EB = "<p class=\"lx-eyebrow\">{{ 'luxe_home.extra.eyebrow' | t }}</p><h2 id=\"lx-edit-title-"
assert t.count(EB) == 1
t = t.replace(EB, "{% assign lx_edit_eyebrow = 'luxe_home.extra.eyebrow' %}{% if lx_edit_neu %}{% assign lx_edit_eyebrow = 'luxe_home.extra.' | append: lx_edit_key | append: '_eyebrow' %}{% endif %}<p class=\"lx-eyebrow\">{{ lx_edit_eyebrow | t }}</p><h2 id=\"lx-edit-title-")
open(OUT, 'w').write(t)
print('ok', len(t))
