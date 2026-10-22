#!/usr/bin/env python3
"""warenkorb_einig.py — EIN Rechenweg für alles, was der Warenkorb über Versand und Lieferzeit sagt (09.10.2026).

ANLASS (Betreiber «verbessere mehr», gemessen 09.10. 11:30 UTC, eigener Testkorb im Handy-Browser):
  14 Tage Landeseiten (ShopifyQL): Sirène 227 / Provence 178 / Aurora 158 Sitzungen → 8 Warenkorb → 6 Kasse → 0 Kauf.
  Abbruch-Körbe: 3× Leinen-Set 39.90 (→ 46.90 mit Versand), 1× Sirène 49.90.
  Derselbe Warenkorb (1× Leinen-Set 39.90) sagte GLEICHZEITIG:
    oben  (layout/theme.liquid, Versandbalken):   «🚚 Noch CHF 5.10 bis zum Gratis-Versand»
    unten (snippets/cart-summary.liquid, 06.10.): «noch CHF 10.10 bis zum Gratisversand (ab CHF 50)»
    Liste (templates/cart.json, lux_cart_trust):  «Lieferzeit … (CH-Lager 1–2 Werktage)» — das Set kommt aus Asien,
                                                    die Produktseite sagt «Lieferung voraussichtlich 23. Okt. – 6. Nov.»
  Die 5.10 waren FALSCH: jeder weitere Artikel löst den Automatik-Rabatt «Bundle: 2+ Artikel -10%» aus (gemessen
  /cart.js: 2× Leinen → items_subtotal_price 7980, total_price 7182). Wer für 5.90 dazulegt, hat 45.80 Ware → 41.22
  nach Rabatt → die Kasse verlangt weiter CHF 7. Die 10.10 stimmen für den Einzelkorb, rechneten aber im 2er-Korb
  zu hoch (50 − Betrag NACH Rabatt).

REGEL (eine, hier definiert, Liquid + JS + Kanarien daraus):
  gratis  ⇔  total_price (NACH Rabatt) ≥ TARIF (45.00 — die aktive Nullrate im General profile, Lehre 14.08.)
  noch X  =  max(VERSPRECHEN − items_subtotal_price (VOR Rabatt),  ⌈(TARIF − total_price) · 10/9⌉)
             (erster Term: jeder Zusatzartikel bringt −10 %, 50 × 0,9 = 45; zweiter: weitere Rabatte, z. B. ein Code)
  Lieferzeit im Warenkorb = die LANGSAMSTE Ware im Korb, mit denselben Tags und Tagen wie der Produktseiten-Block
  `lux_delivery` (templates/product.json): fortura/ch-lager/blitzversand wie Kasse: Bearbeitung (P1D) + 1–2 Werktage, Schluss 12 Uhr
  — nur mit Tag profil-ch-lager, sonst wie Asien
  (LUX-KASSENDATUM, seit 13.10.2026) · eu-lager +3..+10 · Druck auf Bestellung +9..+19 Kalendertage, Sa/So → Montag ·
  sonst Direktversand Asien wie Kasse: Bearbeitung (P1D) + 9–19 Werktage, Schluss 12 Uhr (LUX-KASSENDATUM).
  Die Zahlen (1 / 1–2 / 9–19) prüft automation/kassen_lieferdatum_wache.py gegen Bearbeitungszeit und Transitregel.
  JS_NEU = der Live-Balken vom 13.10.2026 23:03 (LUX-CHLAGER-KORB: alle_chlager aus /cart?view=lux-chlager, Rückfall auf das
  Merkmal data-lux-alle-chlager der Zusammenfassung). TARIF folgt ch_lager_profil.GRATIS_AB_CH (Entscheid D: 40.50 live seit 13.10.2026).
  LI_NEU unten = der Live-Block lux_cart_trust vom 13.10.2026 abends (LUX-KASSENDATUM, P1D, 9/19, Zeichen profil-ch-lager);
  vorher stand hier die Kalendertage-Fassung vom 09.10. — ein Reparaturlauf hätte die Kassen-Rechnung überschrieben.
  Ändert sich der Live-Block, LI_NEU nachziehen (kassen_lieferdatum_wache prüft die Zahlen, nicht diese Vorlage).

  python3 automation/warenkorb_einig.py --kanarien   # Rechenregel gegen Fälle (auch: X dazulegen ⇒ wirklich gratis)
  python3 automation/warenkorb_einig.py              # Trockenlauf: zeigt die drei Ersetzungen
  SCHARF=1 python3 automation/warenkorb_einig.py     # Live-Dateien holen, sichern (/tmp), ersetzen, zurücklesen
  python3 automation/warenkorb_einig.py --pruefen    # Wächter (Aufseher, täglich): Marken live, Tarif, Kanarien,
                                                     # + --live: echter Testkorb im Handy-Browser, alle «noch»-Zahlen gleich
"""
import json, math, os, re, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402

THEME = "gid://shopify/OnlineStoreTheme/187533001089"
from ch_lager_profil import GRATIS_AB_CH  # noqa: E402  (eine Quelle für die Tarif-Schwelle)
TARIF, VERSAND = int(round(GRATIS_AB_CH * 100)), 700                                 # Rappen
# Versprechen = Warenwert VOR Rabatt, ab dem auch der Mengenrabatt (-10 % auf alles ab 2 Artikeln) den Betrag nicht unter den Tarif drückt: TARIF / 0,9 aufgerundet
# (Tarif 45 -> 50.00, früher fest 5000; Tarif 50 seit 22.10.2026 -> 55.56).
VERSPRECHEN = -(-TARIF * 10 // 9)
MARKE = "LUX-WARENKORB-EINIG"


def noch(sub, tot):
    """Rappen, die an Ware noch fehlen (0 = gratis). sub = vor Rabatt, tot = nach Rabatt."""
    if tot >= TARIF:
        return 0
    return max(VERSPRECHEN - sub, ((TARIF - tot) * 10 + 8) // 9)


KANARIEN = [  # (Name, Warenwert vor Rabatt, nach Rabatt, erwartet «noch») — 22.10.2026 für Tarif 50 / Versprechen 55.56 neu gerechnet
    ("1× Leinen 39.90", 3990, 3990, 1566),
    ("1× Sirène 49.90 (knapp unter Tarif)", 4990, 4990, 566),
    ("1× 45.90", 4590, 4590, 966),
    ("2× 24.90 → 44.82", 4980, 4482, 576),
    ("39.90 + 5.90 → 41.22", 4580, 4122, 976),
    ("2× Leinen → 71.82", 7980, 7182, 0),
    ("Code zusätzlich: 52.00 → 42.12", 5200, 4212, 876),
    ("2× 19.90 → 35.82 (unter 50)", 3980, 3582, 1576),
    ("1× 35.00", 3500, 3500, 2056),
    ("1× 50.00 (Tarif gratis)", 5000, 5000, 0),
]


def kanarien(still=False):
    f = 0
    for name, sub, tot, soll in KANARIEN:
        ist = noch(sub, tot)
        # Gegenprobe der Zusage: wer genau «noch» dazulegt (ein Zusatzartikel ⇒ −10 % auf alles), hat Gratisversand.
        nach = (sub + ist) * 9 // 10 if ist and (tot == sub) else (tot + ist * 9 // 10 if ist else tot)
        ok = ist == soll and (ist == 0 or nach >= TARIF)
        f += not ok
        if not ok or not still:
            print(f"  {'✓' if ok else '✗'} {name}: noch {ist/100:.2f} (soll {soll/100:.2f}) · nach Dazulegen {nach/100:.2f}")
    if not still:
        print(f"WARENKORB-KANARIEN {len(KANARIEN) - f}/{len(KANARIEN)}")
    return f == 0


# ── Ersetzung 1: Versandbalken in layout/theme.liquid (JS) ─────────────────────────────────────────────────────────
JS_ANFANG = "    var el=document.createElement('div');el.className='luxe-ship-bar';\n"
JS_ENDE = "    anchors[0].parentNode.insertBefore(el,anchors[0]);\n"
JS_NEU = JS_ANFANG + """    // LUX-WARENKORB-EINIG (09.10.2026, automation/warenkorb_einig.py) — derselbe Rechenweg wie cart-summary:
    // gratis, sobald der Betrag NACH Rabatt >= 45.00 (Tarif; Entscheid D «40.50» vorbereitet); «noch X» = 50 - Warenwert
    // VOR Rabatt, weil jeder weitere Artikel «2+ Artikel -10%» ausloest. Gemessen 09.10.: 1x 39.90 zeigte hier «noch 5.10», darunter
    // «noch 10.10»; wer 5.90 dazulegt, hat 45.80 Ware -> 41.22 -> die Kasse verlangte (bei Tarif 45) CHF 7.
    // LUX-CHLAGER-KORB (13.10.2026, Entscheid C): traegt JEDE Position das Zeichen profil-ch-lager, rechnet die Kasse in der Schweiz
    // 0.00 (Profil «CH-Lager»). Das Zeichen kennt nur Liquid -> eigene Ansicht /cart?view=lux-chlager (templates/cart.lux-chlager.liquid)
    // liefert alle_chlager; faellt sie aus, gilt /cart.js (ohne Zeichen = Regel oben, nie zu frueh gratis).
    // Faellt die Ansicht aus (gemessen 13.10.: Cloudflare-Pruefseite statt JSON fuer unsere IP), gilt das vom Server gerenderte
    // Merkmal der Warenkorb-Zusammenfassung (cart-summary, data-lux-alle-chlager) — sonst sagte der Balken «+ CHF 7», darunter «Gratis».
    var chlDom=document.querySelector('.lux-gratisversand[data-lux-alle-chlager="1"]');
    var sub=cart.items_subtotal_price, tot=(cart.total_price!=null?cart.total_price:sub),
        chl=(cart.alle_chlager===true)||(cart.alle_chlager===undefined&&!!chlDom);
    var gratis=chl||tot>=%(TARIF)d, rest=gratis?0:Math.max(%(VERSPRECHEN)d-sub, Math.floor(((%(TARIF)d-tot)*10+8)/9));
    var end=((tot+(gratis?0:VERSAND))/100).toFixed(2);
    if(chl){el.innerHTML='🎉 <strong>Gratis-Versand in der Schweiz</strong> · Ware ab Schweizer Lager · Du zahlst <strong>CHF '+end+'</strong>';}
    else if(gratis){el.innerHTML='🎉 <strong>Gratis-Versand gesichert</strong> · Du zahlst <strong>CHF '+end+'</strong>';}
    else{
      el.innerHTML='🚚 Noch <strong>CHF '+(rest/100).toFixed(2)+'</strong> bis zum Gratis-Versand (ab CHF 50 Warenwert)'+
      '<div class="track"><div class="fill" style="width:'+Math.min(100,Math.round(sub/%(VERSPRECHEN)d*100))+'%%"></div></div>'+
      '<div style="margin-top:6px;color:#5b5346">Aktuell CHF '+(tot/100).toFixed(2)+' + CHF '+(VERSAND/100).toFixed(2)+
      ' Versand = <strong style="color:#2b2b2b">CHF '+end+'</strong></div>';}
""".replace("%(TARIF)d", str(TARIF)).replace("%(VERSPRECHEN)d", str(VERSPRECHEN)).replace("%%", "%") + JS_ENDE

# ── Ersetzung 2: Hinweis in snippets/cart-summary.liquid (Liquid, Drawer + /cart) ─────────────────────────────────────
LQ_ALT = "          {%- assign lux_gv_rest = 5000 | minus: cart.total_price -%}\n"
LQ_NEU = ("          {%- comment -%} LUX-WARENKORB-EINIG (09.10.2026): 50 − Warenwert VOR Rabatt (jeder Zusatzartikel = −10 %),\n"
          "              mindestens ⌈(45 − Betrag nach Rabatt) · 10/9⌉ — derselbe Rechenweg wie der Versandbalken. {%- endcomment -%}\n"
          f"          {{%- assign lux_gv_rest = {VERSPRECHEN} | minus: cart.items_subtotal_price -%}}\n"
          f"          {{%- assign lux_gv_rest2 = {TARIF} | minus: cart.total_price | times: 10 | plus: 8 | divided_by: 9 -%}}\n"
          "          {%- if lux_gv_rest2 > lux_gv_rest -%}{%- assign lux_gv_rest = lux_gv_rest2 -%}{%- endif -%}\n")

# ── Ersetzung 3: Lieferzeit-Zeile in templates/cart.json (lux_cart_trust) ─────────────────────────────────────────────
LI_ALT = "<li>📦&nbsp;Lieferzeit steht auf jeder Produktseite (CH-Lager 1–2 Werktage)</li>"
LI_NEU = """{%- comment -%} LUX-WARENKORB-EINIG (09.10.2026, automation/warenkorb_einig.py): Lieferdatum der LANGSAMSTEN Ware im
Korb, dieselben Tags/Tage wie der Produktseiten-Block lux_delivery (templates/product.json). Vorher stand hier pauschal
«CH-Lager 1–2 Werktage», auch wenn der Korb nur Direktversand aus Asien enthielt. {%- endcomment -%}
{%- assign lux_rang = -1 -%}
{%- assign lux_ohne_marke = false -%}
{%- for item in cart.items -%}
  {%- assign t = item.product.tags -%}
  {%- if t contains 'fortura' or t contains 'ch-lager' or t contains 'blitzversand' -%}{%- assign r = 0 -%}{%- unless t contains 'profil-ch-lager' -%}{%- assign lux_ohne_marke = true -%}{%- endunless -%}
  {%- elsif t contains 'eu-lager' -%}{%- assign r = 1 -%}
  {%- elsif t contains 'printful_personalized_product' or t contains 'prodigi_personalized_product' or t contains 'selbst-gestalten' -%}{%- assign r = 2 -%}
  {%- else -%}{%- assign r = 3 -%}{%- endif -%}
  {%- if r > lux_rang -%}{%- assign lux_rang = r -%}{%- endif -%}
{%- endfor -%}
{%- if lux_rang >= 0 -%}
  {%- assign now_s = 'now' | date: '%s' | plus: 0 -%}
  {%- case lux_rang -%}
    {%- when 0 -%}{%- assign lx_stufe = shop.metafields.luxe.ch_lager_stufe.value | default: 1 | plus: 0 -%}{%- if lux_ohne_marke -%}{%- assign lx_stufe = 0 -%}{%- endif -%}{%- if lx_stufe >= 1 -%}{%- assign lx_tmin = 1 -%}{%- assign lx_tmax = 2 -%}{%- else -%}{%- assign lx_tmin = 9 -%}{%- assign lx_tmax = 19 -%}{%- endif -%}{%- assign lux_lager = 'aus dem Schweizer Lager' -%}
    {%- when 1 -%}{%- assign d_from = now_s | plus: 259200 -%}{%- assign d_to = now_s | plus: 864000 -%}{%- assign lux_lager = 'aus dem EU-Lager' -%}
    {%- when 2 -%}{%- assign d_from = now_s | plus: 777600 -%}{%- assign d_to = now_s | plus: 1641600 -%}{%- assign lux_lager = 'Druck auf Bestellung' -%}
    {%- else -%}{%- assign lx_tmin = 9 -%}{%- assign lx_tmax = 19 -%}{%- assign lux_lager = 'Direktversand aus Asien' -%}
  {%- endcase -%}
  {%- comment -%} LUX-KASSENDATUM 13.10.2026: Rang 0 (nur Schweizer Lager) und Rang 3 (Asien) = dieselbe Rechnung wie lux_delivery
  (templates/product.json) und die Kasse: Werktage Mo–Fr, Annahmeschluss 12 Uhr, Bearbeitung P1D, Transit lx_tmin–lx_tmax Werktage. {%- endcomment -%}
  {%- if lux_rang == 0 or lux_rang == 3 -%}
    {%- assign lx_h = 'now' | date: '%H' | plus: 0 -%}
    {%- assign lx_w = 'now' | date: '%w' | plus: 0 -%}
    {%- assign lx_von = 1 | plus: lx_tmin -%}
    {%- if lx_h >= 12 or lx_w == 0 or lx_w == 6 -%}{%- assign lx_von = lx_von | plus: 1 -%}{%- endif -%}
    {%- assign lx_bis = lx_von | plus: lx_tmax | minus: lx_tmin -%}
    {%- assign lx_t = lx_h | times: -3600 | plus: 43200 | plus: now_s -%}
    {%- assign lx_n = 0 -%}
    {%- for lx_i in (1..35) -%}
      {%- assign lx_t = lx_t | plus: 86400 -%}
      {%- assign lx_wt = lx_t | date: '%w' | plus: 0 -%}
      {%- unless lx_wt == 0 or lx_wt == 6 -%}
        {%- assign lx_n = lx_n | plus: 1 -%}
        {%- if lx_n == lx_von -%}{%- assign d_from = lx_t -%}{%- endif -%}
        {%- if lx_n == lx_bis -%}{%- assign d_to = lx_t -%}{%- break -%}{%- endif -%}
      {%- endunless -%}
    {%- endfor -%}
  {%- endif -%}
  {%- assign wf = d_from | date: '%w' | plus: 0 -%}
  {%- if wf == 6 -%}{%- assign d_from = d_from | plus: 172800 -%}{%- elsif wf == 0 -%}{%- assign d_from = d_from | plus: 86400 -%}{%- endif -%}
  {%- assign wt = d_to | date: '%w' | plus: 0 -%}
  {%- if wt == 6 -%}{%- assign d_to = d_to | plus: 172800 -%}{%- elsif wt == 0 -%}{%- assign d_to = d_to | plus: 86400 -%}{%- endif -%}
  {%- assign months = 'Jan.,Feb.,März,Apr.,Mai,Juni,Juli,Aug.,Sept.,Okt.,Nov.,Dez.' | split: ',' -%}
  {%- assign mf = d_from | date: '%-m' | minus: 1 -%}{%- assign mt = d_to | date: '%-m' | minus: 1 -%}
<li>📦&nbsp;Lieferung voraussichtlich <strong>{{ d_from | date: '%-d' }}. {{ months[mf] }} – {{ d_to | date: '%-d' }}. {{ months[mt] }}</strong> ({{ lux_lager }}{% if cart.item_count > 1 %}, langsamster Artikel{% endif %})</li>
{%- else -%}
<li>📦&nbsp;Lieferdatum steht auf jeder Produktseite</li>
{%- endif -%}"""


def lese(dateien):
    r = gql('query($id:ID!,$f:[String!]){theme(id:$id){role files(filenames:$f,first:10){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}',
            {"id": THEME, "f": dateien})["theme"]
    return r["role"], {n["filename"]: n["body"]["content"] for n in r["files"]["nodes"]}


def cart_json_ersetzen(text):
    """templates/cart.json: Kommentarkopf behalten, JSON laden, nur die Lieferzeile in lux_cart_trust tauschen."""
    k = text.find("{", text.find("*/") + 2 if text.lstrip().startswith("/*") else 0)
    kopf, j = text[:k], json.loads(text[k:])
    cl = j["sections"]["lux_cart_trust"]["settings"]["custom_liquid"]
    if MARKE in cl:
        return None, "schon drin"
    if cl.count(LI_ALT) != 1:
        return None, f"Lieferzeile {cl.count(LI_ALT)}× gefunden (erwartet 1)"
    j["sections"]["lux_cart_trust"]["settings"]["custom_liquid"] = cl.replace(LI_ALT, LI_NEU)
    return kopf + json.dumps(j, ensure_ascii=False, indent=2) + "\n", "ok"


def plane():
    role, f = lese(["layout/theme.liquid", "snippets/cart-summary.liquid", "templates/cart.json"])
    if role != "MAIN":
        raise SystemExit(f"Theme nicht MAIN ({role})")
    neu, bericht = {}, []
    t = f["layout/theme.liquid"]
    if MARKE in t:
        bericht.append("theme.liquid: schon drin")
    else:
        a, e = t.find(JS_ANFANG), t.find(JS_ENDE)
        if t.count(JS_ANFANG) != 1 or t.count(JS_ENDE) != 1 or not (0 <= a < e):
            raise SystemExit(f"theme.liquid: Anker {t.count(JS_ANFANG)}/{t.count(JS_ENDE)} — Balken hat sich geändert, nicht blind ersetzen")
        neu["layout/theme.liquid"] = t[:a] + JS_NEU + t[e + len(JS_ENDE):]
        bericht.append(f"theme.liquid: Balken-Rechnung {e + len(JS_ENDE) - a} → {len(JS_NEU)} Zeichen")
    s = f["snippets/cart-summary.liquid"]
    if MARKE in s:
        bericht.append("cart-summary: schon drin")
    elif s.count(LQ_ALT) != 1:
        raise SystemExit(f"cart-summary: alte Zeile {s.count(LQ_ALT)}× (erwartet 1)")
    else:
        neu["snippets/cart-summary.liquid"] = s.replace(LQ_ALT, LQ_NEU)
        bericht.append("cart-summary: «noch» = 50 − Warenwert vor Rabatt")
    c, st = cart_json_ersetzen(f["templates/cart.json"])
    if c:
        neu["templates/cart.json"] = c
        bericht.append("cart.json: Lieferdatum der langsamsten Ware statt «CH-Lager 1–2 Werktage»")
    elif st != "schon drin":
        raise SystemExit("cart.json: " + st)
    else:
        bericht.append("cart.json: schon drin")
    return f, neu, bericht


def schreiben():
    if not kanarien():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    alt, neu, bericht = plane()
    print("\n".join("  " + b for b in bericht))
    if not neu:
        print("nichts zu tun"); return 0
    if os.environ.get("SCHARF") != "1":
        print("TROCKEN — SCHARF=1 schreibt"); return 0
    stempel = int(time.time())
    for name in neu:
        pfad = f"/tmp/{name.replace('/', '__')}.vor-einig.{stempel}"
        open(pfad, "w", encoding="utf-8").write(alt[name])
        print("  Sicherung", pfad)
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){"
            "upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": THEME, "files": [{"filename": n, "body": {"type": "TEXT", "value": v}} for n, v in neu.items()]})["themeFilesUpsert"]
    if r["userErrors"]:
        print("FEHLER", r["userErrors"]); return 1
    for _ in range(10):
        time.sleep(4)
        _, f = lese(list(neu))
        if all(MARKE in f[n] for n in neu):
            print(f"GESCHRIEBEN + ZURÜCKGELESEN: {', '.join(neu)}"); return 0
    print("RÜCKLESEN FEHLT"); return 1


LIVE_JS = r"""
import { starte } from '%s/tools/browser.mjs';
const b = await starte();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, locale: 'de-CH' });
const p = await ctx.newPage();
await p.goto('https://luxestyle.ch/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
const erg = {};
for (const [name, items] of Object.entries(JSON.parse(process.argv[2]))) {
  const c = await p.evaluate(async (items) => {
    const warte = (ms) => new Promise(r => setTimeout(r, ms));   // Shopify-Bot-Schutz (429) bei schnellen Folgeabrufen
    await fetch('/cart/clear.js', { method: 'POST' }); await warte(2500);
    for (const [id, q] of items) { await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, quantity: q }) }); await warte(2500); }
    const r = await fetch('/cart.js'); if (r.status !== 200) throw new Error('cart.js HTTP ' + r.status);
    return await r.json();
  }, items);
  await p.waitForTimeout(4000);
  await p.goto('https://luxestyle.ch/cart?einig=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(3500);
  erg[name] = { sub: c.items_subtotal_price, tot: c.total_price, text: await p.evaluate(() => document.body.innerText) };
}
await p.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
console.log(JSON.stringify(erg));
await b.close();
"""


def live_test():
    """Echter Testkorb (Handy-Browser, Storefront), danach geleert. → Liste Befunde, None = Browser nicht verfügbar."""
    # Leinen-Set (Asien, 39.90) einzeln und doppelt — die Landeseite mit den meisten Kassengängen.
    faelle = {"1x": [[55747875733889, 1]], "2x": [[55747875733889, 2]]}
    pfad = "/tmp/warenkorb_einig_live.mjs"
    open(pfad, "w").write(LIVE_JS % REPO)
    try:
        pr = subprocess.run(["/opt/node22/bin/node", pfad, json.dumps(faelle)], capture_output=True, text=True, timeout=180)
        zeilen = [z for z in pr.stdout.strip().splitlines() if z.startswith("{")]
        if not zeilen:
            raise RuntimeError("keine Ausgabe · " + " ".join(z for z in pr.stderr.splitlines() if "Error" in z)[:200])
        erg = json.loads(zeilen[-1])
    except Exception as e:  # noqa: BLE001
        print(f"  Live-Test nicht möglich: {type(e).__name__}: {str(e)[:240]}")
        return None
    befunde = []
    for name, e in erg.items():
        zahlen = sorted(set(re.findall(r"[Nn]och\s*CHF\s*([\d'.]+)", e["text"])))
        soll = noch(e["sub"], e["tot"])
        if soll:
            if zahlen != [f"{soll/100:.2f}"]:
                befunde.append(f"{name}: «noch»-Zahlen {zahlen} ≠ Regel {soll/100:.2f}")
        elif zahlen:
            befunde.append(f"{name}: gratis laut Tarif, Seite sagt noch {zahlen}")
        if "CH-Lager 1–2 Werktage" in e["text"]:
            befunde.append(f"{name}: «CH-Lager 1–2 Werktage» bei Asien-Ware")
        if "Lieferung voraussichtlich" not in e["text"]:
            befunde.append(f"{name}: kein Lieferdatum im Warenkorb")
        print(f"  live {name}: Ware {e['sub']/100:.2f} → {e['tot']/100:.2f} · noch {zahlen or ['gratis']} · Regel {soll/100:.2f}")
    return befunde


def pruefen():
    befunde = []
    if not kanarien(still=True):
        befunde.append("Kanarien rot")
    role, f = lese(["layout/theme.liquid", "snippets/cart-summary.liquid", "templates/cart.json"])
    if role != "MAIN":
        befunde.append(f"Theme nicht MAIN ({role})")
    for n, c in f.items():
        if MARKE not in c:
            befunde.append(f"{n}: Marke fehlt (Theme-Update überschrieben?) → SCHARF=1 erneut")
    if LI_ALT in f.get("templates/cart.json", ""):   # die alte Zeile, nicht das Wort (der neue Kommentar nennt es)
        befunde.append("cart.json: alte Zeile «CH-Lager 1–2 Werktage» wieder da")
    from warenkorb_gratisversand import tarif
    std, gratis = tarif()
    if std != VERSAND / 100 or gratis != TARIF / 100:
        befunde.append(f"Tarif geändert: Versand {std} / gratis ab {gratis} ≠ {VERSAND/100:.2f} / {TARIF/100:.2f} → Regel anpassen")
    live = ""
    if "--live" in sys.argv:
        lb = live_test()
        if lb is None:
            live = " · Testkorb NICHT gelaufen (Shop/Browser) — nur statisch geprüft"   # nie «ok» ohne Messung
        else:
            befunde += lb
            live = " · Testkorb live ok"
    if befunde:
        print("⚠️ WARENKORB-EINIG: " + " · ".join(befunde)); return 1
    print(f"WARENKORB-EINIG ✓: 3 Stellen ein Rechenweg · Tarif {std:.2f}/gratis ab {gratis:.0f} · Kanarien {len(KANARIEN)}/{len(KANARIEN)}" + live)
    return 0


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    sys.exit(pruefen() if "--pruefen" in sys.argv else schreiben())
