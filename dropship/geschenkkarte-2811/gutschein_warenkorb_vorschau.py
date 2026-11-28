"""Baut eine Offline-Vorschau der vier zusammenwirkenden Warenkorb-Dateien."""
import argparse
import hashlib
import tempfile
from pathlib import Path
import json

LIQUID_START = "{%- for item in cart.items -%}"
INIT = """{%- assign lux_versandmenge = cart.item_count -%}
{%- assign lux_sprache = request.locale.iso_code | slice: 0, 2 -%}
{%- for item in cart.items -%}
  {%- if item.product.gift_card? -%}
    {%- assign lux_versandmenge = lux_versandmenge | minus: item.quantity -%}
    {%- continue -%}
  {%- endif -%}"""
AFTER_DATE = "{%- else -%}\n<li>📦&nbsp;Lieferdatum steht auf jeder Produktseite</li>"
GIFT_NOTICE = """{%- elsif cart.item_count > 0 -%}
<li>{% if lux_sprache == 'fr' %}Carte-cadeau par e-mail.{% else %}Geschenkkarte per E-Mail.{% endif %}</li>
""" + AFTER_DATE
RETURNS = "{%- if lux_editor_n == 0 -%}<li>"
RETURN_LINK = """{%- if lux_versandmenge < cart.item_count -%}
<li><a href="{{ shop.refund_policy.url | default: '/policies/refund-policy' | escape }}">{% if lux_sprache == 'fr' %}Consulter les conditions de retour{% else %}Rückgabebedingungen ansehen{% endif %}</a></li>
{%- elsif lux_editor_n == 0 -%}<li>"""


def replace_once(text, before, after):
    if text.count(before) != 1:
        raise ValueError("Unbekannter oder mehrdeutiger Ausgangstext")
    return text.replace(before, after, 1)


def cart_template(text):
    data = json.loads(text[text.index("{"):])
    before = data["sections"]["lux_cart_trust"]["settings"]["custom_liquid"]
    after = replace_once(before, LIQUID_START, INIT)
    after = replace_once(after, "if cart.item_count > 1", "if lux_versandmenge > 1")
    after = replace_once(after, AFTER_DATE, GIFT_NOTICE)
    after = replace_once(after, RETURNS, RETURN_LINK)
    quoted = lambda value: json.dumps(value, ensure_ascii=False)
    new = replace_once(text, quoted(before), quoted(after))
    # Das gesamte Objekt einschliesslich aller fremden Abschnitte muss sonst identisch sein.
    check = json.loads(new[new.index("{"):])
    check["sections"]["lux_cart_trust"]["settings"]["custom_liquid"] = before
    if check != data:
        raise ValueError("Unerwartete Änderung ausserhalb von lux_cart_trust")
    return new


FILES = {
    "templates/cart.json": "8208834c08f46cd64af206a7a76fbe8c08750259dc931c05846bdc8c47b14e54",
    "snippets/cart-summary.liquid": "fbad4dc6c91607c567467286af44c142f6154d3c4e0fd4a4e1bdd6e2eb83f969",
    "layout/theme.liquid": "0accbdc6aa0ec1f7789943f8f1e2a6e465e37558c3130c8887b999be4a665143",
    "templates/cart.lux-chlager.liquid": "f86e6d3719f979a0c56cb049488c9696e8380bcb7263b617ac34306c85b4343b",
}
GIFT_FLAG = """{%- assign lux_gutschein_im_korb = false -%}
{%- for lux_zeile in cart.items -%}
  {%- if lux_zeile.product.gift_card? -%}
    {%- assign lux_gutschein_im_korb = true -%}
    {%- break -%}
  {%- endif -%}
{%- endfor -%}"""

def summary(source):
    ch = "      {%- assign lux_alle_chlager = true -%}"
    flag = "\n".join("      " + line for line in GIFT_FLAG.splitlines())
    source = replace_once(source, ch, flag + "\n      {%- unless lux_gutschein_im_korb -%}\n" + ch)
    boundary = "      {%- comment -%} LUX-BW-HINWEIS-2711 {%- endcomment -%}"
    source = replace_once(source, boundary, "      {%- endunless -%}\n" + boundary)
    return replace_once(source, "elsif cart.items_subtotal_price >= 4000 -%}",
                        "elsif cart.items_subtotal_price >= 4000 and lux_gutschein_im_korb == false -%}")

def view(source):
    ch = "{%- assign lux_alle = true -%}"
    source = replace_once(source, ch, GIFT_FLAG + "\n" + ch)
    return replace_once(source, '"alle_chlager":', '"enthaelt_geschenkkarte":{{ lux_gutschein_im_korb | json }},"alle_chlager":')

def layout(source):
    anchor = "    var el=document.createElement('div');el.className='luxe-ship-bar';"
    # The dedicated cart view emits an explicit boolean. A /cart.js fallback can only show
    # a shipping promise when it returned all lines and each is a known non-gift.
    gate = """    var nurWaren = cart.enthaelt_geschenkkarte === false ||
      (cart.enthaelt_geschenkkarte == null && Array.isArray(cart.items) && cart.items.length > 0 &&
       cart.items.every(function(item){return item && item.gift_card === false;}));
    if(!nurWaren)return;
"""
    source = replace_once(source, anchor, gate + anchor)
    # An earlier overlapping request must not replace fresh cart data.
    anchor = "  function refresh(){fetch('/cart?view=lux-chlager'"
    source = replace_once(source, anchor,
        "  var luxKorbAnfrage=0;\n  function refresh(){var anfrage=++luxKorbAnfrage;fetch('/cart?view=lux-chlager'")
    return replace_once(source, "    .then(render).catch(function(){});",
                        "    .then(function(cart){if(anfrage===luxKorbAnfrage)render(cart);}).catch(function(){});")

def write_preview(src,dst):
    if dst.exists() or src.resolve()==dst.resolve() or dst.resolve().is_relative_to(src.resolve()):
        raise ValueError("Neuer separater Vorschauordner erforderlich")
    processors = {"templates/cart.json": cart_template, "snippets/cart-summary.liquid": summary, "layout/theme.liquid": layout, "templates/cart.lux-chlager.liquid": view}
    with tempfile.TemporaryDirectory(dir=dst.parent) as temp:
        out = Path(temp) / "vorschau"
        out.mkdir()
        for name, digest in FILES.items():
            raw = (src / name).read_bytes()
            if hashlib.sha256(raw).hexdigest() != digest:
                raise ValueError("Original inzwischen geändert: " + name)
            old = raw.decode()
            new = processors[name](old)
            file = out / name
            file.parent.mkdir(exist_ok=True, parents=True)
            file.write_bytes(new.encode())
        out.rename(dst)

if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("quelle", type=Path)
    parser.add_argument("vorschau", type=Path)
    args=parser.parse_args()
    write_preview(args.quelle,args.vorschau)
