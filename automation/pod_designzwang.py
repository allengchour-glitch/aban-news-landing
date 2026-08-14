#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LuxeStyle — pod_designzwang.py   (2026-08-14)

BEFUND (dropship/FEHLERSUCHE-14-08.md, Abschnitt [warenkorb])
------------------------------------------------------------
Alle «Selbst gestalten»-Produkte (Print-on-Demand) liessen sich über den normalen
Kaufknopf «In den Warenkorb legen» UND über den Express-Knopf «Mit shop kaufen»
OHNE Design in den Warenkorb legen. Live belegt: POST /cart/add.js auf Variante
55777948074369 («Unisex T-Shirt – Selbst gestalten», M) → HTTP 200, properties = {},
Warenkorb checkoutfähig. Jede solche Bestellung geht als Druckauftrag OHNE Druckdatei
raus: entweder Blankoware an die Kundin oder ein hängender Auftrag beim POD-Partner.

ZAHLEN AUS DEM PROBELAUF (dry)
------------------------------
Die Regel greift über `product.description contains 'lspod-designer'`
ODER Tag `wunschdesign` / `selbst-gestalten`.
  * 39 Produkte im Voll-Export tragen den Designer-Block, 38 davon die POD-Tags,
    33 sind ACTIVE — es sind exakt die «… – Selbst gestalten»/«… zum Selbstgestalten».
  * 1 Produkt trägt den Designer-Block, aber KEINEN POD-Tag:
    15422946804097 «Transparente iPhone®-Hülle – Selbst gestalten» (ACTIVE, Tags nur
    bild-ok, tech). Genau deshalb ist der Designer-Block und nicht der Tag das
    Hauptmerkmal — eine Tag-Regel hätte dieses Produkt ungeschützt gelassen.
  * FEHLTREFFER: 0. Die Zeichenkette `lspod-designer` steht in keiner anderen
    Beschreibung des Katalogs; die beiden Tags tragen ausschliesslich POD-Produkte
    (live gegen die Shopify-Suche geprüft, 38 Treffer, alle POD).

ENTSCHEIDUNG — der schonendste Weg
----------------------------------
NICHT angefasst: pod/designer.js, die Produktbeschreibungen, die Produkt-Daten
(Status/Preise/Kanäle) und die Bestell-Logik. Der Editor bleibt unberührt.
Geändert wird ausschliesslich das Theme, an genau den Stellen, die einen Kauf OHNE
Design auslösen können — gesteuert von EINEM Schnipsel als einziger Wahrheit:

  1. NEU  snippets/lspod-designzwang.liquid  → gibt "1" aus, wenn ein Produkt nur
          mit eigenem Design gekauft werden darf. Einzige Regel im ganzen Theme.
  2. blocks/buy-buttons.liquid   → für solche Produkte werden `add-to-cart` und
          `accelerated-checkout` («Mit shop kaufen»/Shop Pay/PayPal-Express) gar
          nicht erst gerendert; stattdessen steht dort ein Sprungknopf zum Gestalter.
          Auch der Mengen-Block entfällt: ein Formular ohne Textfeld und ohne
          Submit-Knopf kann auch nicht per Enter-Taste abgeschickt werden.
          ⚠️ Das <form> selbst und das versteckte Feld name="id" BLEIBEN stehen —
          designer.js liest daraus die gewählte Variante (getVariantId()).
          Würde man das Formular entfernen, fiele der Editor auf die erste Variante
          zurück und die Kundin bekäme die falsche Grösse.
  3. sections/product-information.liquid → die klebende Kaufleiste am unteren Rand
          (zweiter «In den Warenkorb legen»-Knopf, auf dem Handy der auffälligste)
          wird für diese Produkte nicht gerendert. Ihr Web-Component verlangt den
          Knopf als requiredRef — deshalb die ganze Leiste weg statt nur den Knopf.
  4. snippets/quick-add.liquid → das «+» auf der Produktkachel in Kollektionen
          (settings.mobile_quick_add ist AN) legte POD-Ware ebenfalls direkt in den
          Warenkorb. Für Designzwang-Produkte entfällt die Schnellkauf-Taste; die
          Kachel bleibt und verlinkt wie immer auf die Produktseite.
          Der «Auswählen»-Dialog klont die Produktseite und erbt damit Punkt 2.
  5. snippets/cart-summary.liquid → zweite Schicht: liegt trotzdem eine POD-Zeile
          OHNE Design-Eigenschaft im Warenkorb (alter Warenkorb, direkter
          /cart/add.js-Aufruf), wird die Kasse gesperrt und erklärt, was fehlt.
          Der Editor schreibt immer eine Eigenschaft «🎨 Design» (DE) bzw.
          «🎨 Design»/«🖼️ Print file» (EN) — daran wird erkannt.

QUELLE (Regel 7): Die Regel hängt am Designer-Block selbst, nicht an einer Liste.
Jedes künftige POD-Produkt ist geschützt, sobald pod_inject_designer.mjs den Block
einspritzt — und ein Produkt, das den Tag trägt, aber (noch) keinen Designer hat,
fällt auf die sichere Seite: kein Kaufknopf statt Blanko-Druckauftrag.

Aufruf:  DRY_RUN=1 python3 automation/pod_designzwang.py   (nur zeigen)
         python3 automation/pod_designzwang.py             (schreiben)
Token:   /tmp/cj_shop_token.txt
"""
import json, os, re, subprocess, sys, tempfile

SHOP = "au3j0y-hq.myshopify.com"
API = "2024-10"
THEME = "gid://shopify/OnlineStoreTheme/187533001089"
TOKEN = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY_RUN") == "1"
MARK = "LSPOD-DESIGNZWANG"


def gql(query, variables=None):
    payload = json.dumps({"query": query, "variables": variables or {}})
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        f.write(payload)
        p = f.name
    out = subprocess.run(
        ["curl", "-s", "-X", "POST", f"https://{SHOP}/admin/api/{API}/graphql.json",
         "-H", f"X-Shopify-Access-Token: {TOKEN}", "-H", "Content-Type: application/json",
         "--data-binary", "@" + p],
        capture_output=True, text=True).stdout
    os.unlink(p)
    try:
        d = json.loads(out)
    except Exception:
        raise SystemExit("Keine Antwort von Shopify (Regel 6: das ist kein Ergebnis): " + out[:300])
    if "errors" in d:
        raise SystemExit("GraphQL-Fehler: " + json.dumps(d["errors"])[:500])
    return d["data"]


def lade(filenames):
    d = gql("""query($f:[String!]){ theme(id:"%s"){ files(first:25, filenames:$f){
        nodes{ filename body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }""" % THEME,
            {"f": filenames})
    return {n["filename"]: (n["body"] or {}).get("content", "") for n in d["theme"]["files"]["nodes"]}


def schreibe(files):
    d = gql("""mutation($id:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){
        themeFilesUpsert(themeId:$id, files:$f){
          upsertedThemeFiles{ filename }
          userErrors{ filename message }
          themeFilesUpsertUserErrors: userErrors{ message } } }""",
            {"id": THEME, "f": [{"filename": k, "body": {"type": "TEXT", "value": v}} for k, v in files.items()]})
    r = d["themeFilesUpsert"]
    if r["userErrors"]:
        raise SystemExit("Upsert-Fehler: " + json.dumps(r["userErrors"]))
    return [x["filename"] for x in r["upsertedThemeFiles"]]


# ---------------------------------------------------------------- 1) Schnipsel
SNIPPET = """{%- doc -%}
  """ + MARK + """ — einzige Wahrheit: Darf dieses Produkt NUR mit eigenem Design
  gekauft werden? Gibt "1" aus, sonst nichts.

  Erkannt wird der eingespritzte Gestalter-Block (pod_inject_designer.mjs) und
  hilfsweise die POD-Tags. Der Block ist das Hauptmerkmal, weil ein POD-Produkt
  ohne Tag existiert (15422946804097 «Transparente iPhone®-Hülle – Selbst gestalten»).

  @param {object} product - Produkt-Objekt (auch line_item.product möglich)
{%- enddoc -%}
{%- liquid
  assign lspod_treffer = false
  if product.description contains 'lspod-designer'
    assign lspod_treffer = true
  elsif product.tags contains 'wunschdesign'
    assign lspod_treffer = true
  elsif product.tags contains 'selbst-gestalten'
    assign lspod_treffer = true
  endif
  if lspod_treffer
    echo '1'
  endif
-%}"""

# ------------------------------------------------------- 2) blocks/buy-buttons
BB_CAPTURE = """{%- comment -%} """ + MARK + """: Produkte mit eigenem Gestalter dürfen nicht ohne Design gekauft werden. {%- endcomment -%}
{%- capture lspod_designzwang -%}{%- render 'lspod-designzwang', product: product -%}{%- endcapture -%}

<span
  class="buy-buttons-block buy-buttons-block--{{ block.id }}\""""

BB_QTY_ALT = """          {% content_for 'block', type: 'quantity', id: 'quantity' %}"""
BB_QTY_NEU = """          {%- comment -%} """ + MARK + """: kein Mengenfeld — ein Formular ohne Textfeld kann nicht per Enter abgeschickt werden. {%- endcomment -%}
          {% unless lspod_designzwang == '1' %}
            {% content_for 'block', type: 'quantity', id: 'quantity' %}
          {% endunless %}"""

BB_BTN_ALT = """          {% content_for 'block',
            type: 'add-to-cart',
            id: 'add-to-cart',
            can_add_to_cart: can_add_to_cart,
            add_to_cart_text: add_to_cart_text
          %}

          {% content_for 'block',
            type: 'accelerated-checkout',
            id: 'accelerated-checkout',
            can_add_to_cart: can_add_to_cart,
            form_obj: form
          %}"""

BB_BTN_NEU = """          {%- comment -%} """ + MARK + """: Kaufknopf UND Express-Bezahlknopf entfallen — gekauft wird
          unten im Gestalter mit «Mit meinem Design in den Warenkorb». Das <form> mit dem
          versteckten Feld name="id" bleibt stehen: designer.js liest daraus die gewählte Variante. {%- endcomment -%}
          {% if lspod_designzwang == '1' %}
            <div class="lspod-designzwang">
              <a class="button lspod-designzwang__button" href="#lspod-start">
                {%- if request.locale.iso_code == 'en' -%}
                  🎨 Create your design first
                {%- else -%}
                  🎨 Zuerst dein Design gestalten
                {%- endif -%}
              </a>
              <p class="lspod-designzwang__note">
                {%- if request.locale.iso_code == 'en' -%}
                  This item is printed with your own design. Create it in the designer below and
                  add it to the cart there — that way your print file travels with the order.
                {%- else -%}
                  Dieses Produkt wird mit deinem eigenen Design bedruckt. Du gestaltest es weiter
                  unten und legst es dort mit «🛒 Mit meinem Design in den Warenkorb» ab — nur so
                  geht deine Druckdatei mit der Bestellung mit.
                {%- endif -%}
              </p>
            </div>
            <script>
              (function () {
                var setzen = function () {
                  var d = document.querySelector('.lspod-designer');
                  if (d && !d.id) d.id = 'lspod-start';
                };
                if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setzen);
                else setzen();
              })();
            </script>
          {% else %}
            {% content_for 'block',
              type: 'add-to-cart',
              id: 'add-to-cart',
              can_add_to_cart: can_add_to_cart,
              add_to_cart_text: add_to_cart_text
            %}

            {% content_for 'block',
              type: 'accelerated-checkout',
              id: 'accelerated-checkout',
              can_add_to_cart: can_add_to_cart,
              form_obj: form
            %}
          {% endif %}"""

BB_STYLE_ALT = """{% render 'buy-buttons-styles' %}"""
BB_STYLE_NEU = """{% render 'buy-buttons-styles' %}

{%- comment -%} """ + MARK + """ {%- endcomment -%}
<style>
  .lspod-designzwang__button { width: 100%; text-align: center; }
  .lspod-designzwang__note { font-size: 0.875rem; opacity: 0.8; margin-top: 0.5rem; }
</style>"""

# --------------------------------------------- 3) sections/product-information
PI_ALT = """{% if section.settings.enable_sticky_add_to_cart %}"""
PI_NEU = """{%- comment -%} """ + MARK + """: klebende Kaufleiste ist ein zweiter Kaufknopf ohne Design — für
Gestalter-Produkte ganz weglassen (ihr Web-Component verlangt den Knopf als requiredRef). {%- endcomment -%}
{%- capture lspod_designzwang -%}{%- render 'lspod-designzwang', product: product -%}{%- endcapture -%}
{% if section.settings.enable_sticky_add_to_cart and lspod_designzwang != '1' %}"""

# ------------------------------------------------------- 4) snippets/quick-add
QA_ALT = """<quick-add-component"""
QA_NEU = """{%- comment -%} """ + MARK + """: Schnellkauf «+» auf der Kachel legte POD-Ware ohne Design in den
Warenkorb. Für Gestalter-Produkte entfällt die Taste; die Kachel verlinkt weiterhin auf die Seite. {%- endcomment -%}
{%- capture lspod_designzwang -%}{%- render 'lspod-designzwang', product: product -%}{%- endcapture -%}
{%- unless lspod_designzwang == '1' -%}
<quick-add-component"""
QA_ENDE_ALT = """</quick-add-component>"""
QA_ENDE_NEU = """</quick-add-component>
{%- endunless -%}"""

# ---------------------------------------------------- 5) snippets/cart-summary
CS_ALT = """<div class="cart__ctas">
  <button
    type="submit"
    id="checkout"
    class="cart__checkout-button button"
    name="checkout"
    {% if cart == empty %}
      disabled
    {% endif %}
    form="cart-form"
  >"""

CS_NEU = """{%- comment -%} """ + MARK + """ — zweite Schicht: eine POD-Zeile ohne Design-Eigenschaft darf nicht
zur Kasse. Der Gestalter schreibt immer «🎨 Design» (bzw. «🖼️ Druckdatei»/«Print file») an die Zeile. {%- endcomment -%}
{%- assign lspod_ohne_design = 0 -%}
{%- assign lspod_titel = '' -%}
{%- assign lspod_url = '' -%}
{%- for lspod_item in cart.items -%}
  {%- capture lspod_zwang -%}{%- render 'lspod-designzwang', product: lspod_item.product -%}{%- endcapture -%}
  {%- if lspod_zwang == '1' -%}
    {%- assign lspod_hat_design = false -%}
    {%- for lspod_p in lspod_item.properties -%}
      {%- if lspod_p.first contains 'Design' or lspod_p.first contains 'Druckdatei' or lspod_p.first contains 'Print file' -%}
        {%- if lspod_p.last != blank -%}
          {%- assign lspod_hat_design = true -%}
        {%- endif -%}
      {%- endif -%}
    {%- endfor -%}
    {%- unless lspod_hat_design -%}
      {%- assign lspod_ohne_design = lspod_ohne_design | plus: 1 -%}
      {%- assign lspod_titel = lspod_item.product.title -%}
      {%- assign lspod_url = lspod_item.url -%}
    {%- endunless -%}
  {%- endif -%}
{%- endfor -%}

{%- if lspod_ohne_design > 0 -%}
  <div class="lspod-cart-warnung">
    <p>
      {%- if request.locale.iso_code == 'en' -%}
        <strong>Your design is still missing.</strong> «{{ lspod_titel }}» is printed with your own
        artwork. Please open the item, create your design and add it to the cart from the designer —
        then remove the line without a design here.
      {%- else -%}
        <strong>Hier fehlt noch dein Design.</strong> «{{ lspod_titel }}» wird mit deinem eigenen
        Motiv bedruckt. Bitte öffne den Artikel, gestalte ihn und lege ihn im Gestalter in den
        Warenkorb — die Zeile ohne Design kannst du hier entfernen.
      {%- endif -%}
    </p>
    <a class="button" href="{{ lspod_url }}">
      {%- if request.locale.iso_code == 'en' -%}🎨 Create design{%- else -%}🎨 Design gestalten{%- endif -%}
    </a>
  </div>
{%- endif -%}

<div class="cart__ctas">
  <button
    type="submit"
    id="checkout"
    class="cart__checkout-button button"
    name="checkout"
    {% if cart == empty or lspod_ohne_design > 0 %}
      disabled
    {% endif %}
    form="cart-form"
  >"""

CS_ADD_ALT = """  {% if additional_checkout_buttons and settings.show_accelerated_checkout_buttons %}"""
CS_ADD_NEU = """  {% if additional_checkout_buttons and settings.show_accelerated_checkout_buttons and lspod_ohne_design == 0 %}"""

CS_STYLE_ALT = """{% stylesheet %}
  .cart-actions {"""
CS_STYLE_NEU = """{% stylesheet %}
  /* """ + MARK + """ */
  .lspod-cart-warnung {
    border: 1px solid rgba(128, 128, 128, 0.4);
    border-radius: 4px;
    padding: 1rem;
    margin-block-end: 0.75rem;
    font-size: 0.875rem;
    display: grid;
    gap: 0.75rem;
  }

  .cart-actions {"""


def ersetze(text, alt, neu, wo):
    if text.count(alt) != 1:
        raise SystemExit(f"ABBRUCH {wo}: Anker {alt[:60]!r} kommt {text.count(alt)}× vor (erwartet 1×). "
                         "Theme wurde geändert — Patch prüfen, nichts geschrieben.")
    return text.replace(alt, neu)


def main():
    ziele = ["blocks/buy-buttons.liquid", "sections/product-information.liquid",
             "snippets/quick-add.liquid", "snippets/cart-summary.liquid",
             "snippets/lspod-designzwang.liquid"]
    alt = lade(ziele)
    neu = {}

    if alt.get("snippets/lspod-designzwang.liquid", "").strip() != SNIPPET.strip():
        neu["snippets/lspod-designzwang.liquid"] = SNIPPET

    bb = alt["blocks/buy-buttons.liquid"]
    if MARK not in bb:
        bb = ersetze(bb, """<span
  class="buy-buttons-block buy-buttons-block--{{ block.id }}\"""", BB_CAPTURE, "buy-buttons/capture")
        bb = ersetze(bb, BB_QTY_ALT, BB_QTY_NEU, "buy-buttons/quantity")
        bb = ersetze(bb, BB_BTN_ALT, BB_BTN_NEU, "buy-buttons/buttons")
        bb = ersetze(bb, BB_STYLE_ALT, BB_STYLE_NEU, "buy-buttons/style")
        neu["blocks/buy-buttons.liquid"] = bb

    pi = alt["sections/product-information.liquid"]
    if MARK not in pi:
        neu["sections/product-information.liquid"] = ersetze(pi, PI_ALT, PI_NEU, "product-information/sticky")

    qa = alt["snippets/quick-add.liquid"]
    if MARK not in qa:
        qa = ersetze(qa, QA_ALT, QA_NEU, "quick-add/start")
        qa = ersetze(qa, QA_ENDE_ALT, QA_ENDE_NEU, "quick-add/ende")
        neu["snippets/quick-add.liquid"] = qa

    cs = alt["snippets/cart-summary.liquid"]
    if MARK not in cs:
        cs = ersetze(cs, CS_ALT, CS_NEU, "cart-summary/checkout")
        cs = ersetze(cs, CS_ADD_ALT, CS_ADD_NEU, "cart-summary/express")
        cs = ersetze(cs, CS_STYLE_ALT, CS_STYLE_NEU, "cart-summary/style")
        neu["snippets/cart-summary.liquid"] = cs

    if not neu:
        print("Nichts zu tun — Theme trägt den Schutz bereits.")
        return

    for k, v in neu.items():
        print(f"{k}: {len(alt.get(k,''))} → {len(v)} Zeichen")
    if DRY:
        os.makedirs("/tmp/lspod_patch", exist_ok=True)
        for k, v in neu.items():
            p = "/tmp/lspod_patch/" + k.replace("/", "__")
            open(p, "w").write(v)
        print("DRY_RUN — nichts geschrieben. Vorschau unter /tmp/lspod_patch/")
        return

    print("geschrieben:", schreibe(neu))


if __name__ == "__main__":
    main()
