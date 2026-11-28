"""Build a local preview from the verified 28.11.2026 theme export. No Shopify access."""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile

THEME = "214565814663"
LABELS = {
    "locales/en.default.schema.json": "Hide for gift cards",
    "locales/de.schema.json": "Bei Geschenkkarten ausblenden",
    "locales/fr.schema.json": "Masquer pour les cartes-cadeaux",
}
FILES = {
    "locales/en.default.schema.json": "d3ca246ea066b7dcf41acb8ced4e5aab86e702b69c8b5f0ec7d1cab232a3eecf",
    "locales/de.schema.json": "645fe82b488c1434450b89e6278fd48f30177cc7e381fa0b65a670b34865e159",
    "locales/fr.schema.json": "5dc99f3ccea11e5c9266e5f3397531262ce9171ff79f4a31c4969d5a42407c75",
    "templates/product.json": "5f7f25f74dc400f5b12401de23f7cd1e7fa114d495bf5522edd5e143e94d8726",
    "blocks/accordion.liquid": "27e42e1b8e42513f33eb6d87343a3cb16058401fe9a2a3764026d37afcfb9f10",
    "snippets/meta-tags.liquid": "ae33f3f770da2d5bf62f9e41d0b35806986521b9c4b28ce2a9f9c5623289cf73",
}
GUARDED = ("lux_delivery", "lux_trust")
OPEN = "{% unless closest.product.gift_card? %}"
CLOSE = "{% endunless %}"
HIDE = "hide_for_gift_cards"
ACCORDION = "accordion_xfeWHx"

def replace_once(source, before, after):
    if source.count(before) != 1:
        raise ValueError("Source anchor missing or ambiguous")
    return source.replace(before, after, 1)

def product_blocks(source):
    body = json.loads(source[source.index("{"):])
    return body["sections"]["main"]["blocks"]["product-details"]["blocks"]

def product_template(source):
    blocks = product_blocks(source)
    for block_id in GUARDED:
        liquid = blocks[block_id]["settings"]["custom_liquid"]
        quote = lambda value: json.dumps(value, ensure_ascii=False)
        source = replace_once(source, quote(liquid), quote(OPEN + liquid + CLOSE))
    faq = blocks[ACCORDION]
    if [r["settings"]["heading"] for r in faq["blocks"].values()] != ["Versand & Lieferung", "Rückgabe & Umtausch"]:
        raise ValueError("Accordion content has changed")
    anchor = ('"accordion_xfeWHx": {\n              "type": "accordion",\n'
              '              "name": "t:names.accordion",\n              "settings": {\n')
    return replace_once(source, anchor, anchor + '                "hide_for_gift_cards": true,\n')

def accordion(source):
    start = "<div\n  class=\"accordion accordion--"
    source = replace_once(source, start, "{% unless closest.product.gift_card? and block_settings.hide_for_gift_cards %}\n" + start)
    end = "</div>\n\n{% stylesheet %}"
    source = replace_once(source, end, "</div>\n{% endunless %}\n\n{% stylesheet %}")
    option = '''    {
      "type": "checkbox",
      "id": "hide_for_gift_cards",
      "label": "t:settings.hide_for_gift_cards",
      "default": false
    },
'''
    anchor = '  "settings": [\n'
    return replace_once(source, anchor, anchor + option)

def meta(source):
    anchor = "{%- if request.page_type == 'product' -%}\n<script>\ndocument.addEventListener('DOMContentLoaded'"
    return replace_once(source, anchor, anchor.replace("== 'product' -%}", "== 'product' and product.gift_card? != true -%}"))

def build(src, dst):
    if dst.exists() or dst.resolve() == src.resolve() or dst.resolve().is_relative_to(src.resolve()):
        raise ValueError("Choose a separate, new preview directory")
    changes = {}
    transforms = {
        "templates/product.json": product_template,
        "blocks/accordion.liquid": accordion,
        "snippets/meta-tags.liquid": meta,
    }
    for name in FILES:
        raw = (src / name).read_bytes()
        if hashlib.sha256(raw).hexdigest() != FILES[name]:
            raise ValueError(f"Source has changed: {name}. Fetch and review again.")
        text = raw.decode("utf-8")
        if name in LABELS:
            original = '    "gift_card_form": '
            label = json.dumps(LABELS[name], ensure_ascii=False)
            changes[name] = replace_once(text, original, f'    "hide_for_gift_cards": {label},\n' + original)
        else:
            changes[name] = transforms[name](text)
    with tempfile.TemporaryDirectory(dir=dst.parent) as stage:
        out = Path(stage) / "preview"
        for name, source in changes.items():
            target = out / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(source.encode("utf-8"))
        if dst.exists():
            raise FileExistsError(dst)
        out.rename(dst)

if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("source", type=Path)
    cli.add_argument("preview", type=Path)
    args = cli.parse_args()
    build(args.source, args.preview)

