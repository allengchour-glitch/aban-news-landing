#!/usr/bin/env python3
"""
pod-shop/generate.py — Statische Storefront für personalisierte Print-on-Demand-Produkte.

Reines Python-stdlib-Generat → dist/. Kein Build-Step, kein Tracking, System-Fonts,
Aban-Voice (anti-hype, du-Form). Die Design-Erzeugung übernimmt der bestehende
Namens-Generator (/namen-generator.html auf der Hauptseite); dieser Shop ist der
Katalog + Verkauf drumherum.

Daten-Integrität: Preise/Lieferzeiten werden NICHT erfunden — null/„noch nicht geprüft",
bis sie beim POD-Anbieter real kalkuliert sind. Kein Offer-JSON-LD für ungeprüfte Preise.
Checkout: nutzt den Shopify-Link aus pod-config.json, falls aktiv — sonst Mail-Fallback
(nie ein toter Button).
"""
import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "dist"

ACCENT, ACCENT_HOVER = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "aban Namens-Shop"
BASE_URL = "https://shop.abannews.com"
LANG = "de"
# Design-Tool und Newsletter liegen auf der Hauptseite (Cross-Linking).
DESIGN_URL = "https://abannews.com/namen-generator.html"
NEWSLETTER_URL = "https://abannews.beehiiv.com/subscribe"


def e(v):
    return html.escape(str(v if v is not None else ""))


def slugify(v):
    v = (v or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        v = v.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", v).strip("-") or "x"


REDAKTION_RE = re.compile(r"\[Redaktion:[^\]]*\]\s*")


def clean(t):
    return REDAKTION_RE.sub("", str(t or "")).strip()


def load():
    data = json.loads((ROOT / "data" / "produkte.json").read_text(encoding="utf-8"))
    cfg = json.loads((ROOT / "pod-config.json").read_text(encoding="utf-8"))
    return data, cfg


def shop_url(cfg):
    sh = cfg.get("shopify", {})
    base = sh.get("produkt_basis_url")  # nur aktiv, wenn ohne '_' eingetragen
    return base


def checkout_link(p, cfg):
    base = shop_url(cfg)
    if base:
        return f"{base}{p['id']}", "shopify"
    fb = cfg.get("kontakt_fallback", "mailto:hallo@abannews.com")
    return fb, "mail"


CSS = f"""
:root{{--accent:{ACCENT};--accent-h:{ACCENT_HOVER};--bg:{BG};--bg-alt:{BG_ALT};
--text:{TEXT};--muted:{MUTED};--success:{SUCCESS};--border:{BORDER};--card:#fff;}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--bg:#1a1714;--bg-alt:#2a2420;
--text:#f3f0ec;--muted:#a8a29e;--border:#3a332d;--card:#241f1b;--accent-h:#f59e0b;}}}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
background:var(--bg);color:var(--text);line-height:1.6;}}
a{{color:var(--accent-h);}}
.skip{{position:absolute;left:-999px;}}.skip:focus{{left:8px;top:8px;background:var(--accent);color:#fff;padding:8px;border-radius:6px;}}
.wrap{{max-width:900px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:18px 0;}}
header h1{{margin:0;font-size:1.35rem;}}header a{{text-decoration:none;color:var(--text);}}
header .tag{{color:var(--muted);font-size:.93rem;margin:4px 0 0;}}
main{{padding:26px 0;}}
.hero{{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px;margin:0 0 20px;}}
.hero h2{{margin:0 0 8px;font-size:1.5rem;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:11px 20px;
border-radius:9px;font-weight:600;margin-top:6px;}}.cta:hover{{background:var(--accent-h);}}
.cta.ghost{{background:transparent;color:var(--accent-h);border:1px solid var(--accent);}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px;}}
.card h3{{margin:0 0 4px;font-size:1.1rem;}}.card h3 a{{text-decoration:none;color:var(--text);}}
.thumb{{height:120px;border-radius:8px;background:var(--bg-alt);display:grid;place-items:center;margin:0 0 12px;
font-size:2.4rem;color:var(--accent);}}
.price{{font-weight:700;}}.price.na{{color:var(--muted);font-weight:600;}}
.flag{{display:inline-block;border-radius:999px;padding:2px 9px;font-size:.76rem;font-weight:600;background:var(--success);color:#fff;}}
.meta{{color:var(--muted);font-size:.88rem;margin:4px 0;}}
.chip{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 8px;font-size:.8rem;margin:2px 4px 2px 0;}}
.note{{background:var(--bg-alt);border-left:3px solid var(--accent);padding:10px 14px;border-radius:6px;margin:14px 0;font-size:.92rem;}}
.steps{{counter-reset:s;list-style:none;padding:0;display:grid;gap:8px;margin:10px 0;}}
.steps li{{counter-increment:s;background:var(--card);border:1px solid var(--border);border-radius:9px;
padding:10px 12px 10px 40px;position:relative;}}
.steps li::before{{content:counter(s);position:absolute;left:10px;top:10px;width:22px;height:22px;border-radius:50%;
background:var(--accent);color:#fff;font-weight:700;font-size:12px;display:grid;place-items:center;}}
footer{{border-top:1px solid var(--border);padding:22px 0;color:var(--muted);font-size:.85rem;}}
"""


def shell(*, title, description, body, canonical, jsonld=None):
    ld = ""
    for b in (jsonld or []):
        ld += f'<script type="application/ld+json">{json.dumps(b, ensure_ascii=False)}</script>\n'
    return f"""<!DOCTYPE html>
<html lang="{LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{e(canonical)}">
<meta name="theme-color" content="{ACCENT}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>{CSS}</style>
{ld}</head>
<body>
<a class="skip" href="#main">Zum Inhalt springen</a>
<header><div class="wrap">
<a href="/"><h1>🏷️ {e(SITE_NAME)}</h1></a>
<div class="tag">Personalisierte Produkte mit deinem Namen — gedruckt und versandt aus der EU.</div>
</div></header>
<main id="main"><div class="wrap">
{body}
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · ein Projekt von <a href="https://abannews.com">aban news</a> ·
<a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a>
</div></footer>
</body>
</html>"""


ICONS = {"schluesselanhaenger-acryl": "🔑", "namensschild-3d": "🪧",
         "grusskarte-personalisiert": "💌", "tasse-mit-name": "☕", "poster-name": "🖼️"}


def price_str(p):
    v = p.get("preis_eur")
    if isinstance(v, (int, float)):
        return f'<span class="price">ab {v} €</span>'
    return '<span class="price na">Preis folgt</span>'


def card(p):
    return f"""<article class="card">
<div class="thumb">{ICONS.get(p['id'], '🏷️')}</div>
<h3><a href="/produkt/{e(p['id'])}.html">{e(p['name'])}</a></h3>
<p class="meta">{e(p['kurz'])}</p>
<p>{price_str(p)} {'<span class="flag">EU-Versand</span>' if p.get('eu_lager') else ''}</p>
</article>"""


def product_page(p, cfg):
    link, kind = checkout_link(p, cfg)
    cta_label = "Jetzt bestellen" if kind == "shopify" else "Per Mail bestellen"
    note = f'<div class="note">{e(clean(p["aban_note"]))}</div>' if clean(p.get("aban_note")) else ""
    body = f"""<p class="meta"><a href="/">← Alle Produkte</a></p>
<div class="hero">
  <div class="thumb" style="height:160px;font-size:3.5rem">{ICONS.get(p['id'],'🏷️')}</div>
  <h2>{e(p['name'])}</h2>
  <p>{e(p['kurz'])}</p>
  <p>{price_str(p)} {'<span class="flag">EU-Versand</span>' if p.get('eu_lager') else ''}</p>
  <p class="meta">Material: {e(p.get('material','—'))} · Personalisierung: {e(p.get('personalisierung','—'))}</p>
  <p>
    <a class="cta" href="{e(p.get('design_quelle', DESIGN_URL))}" target="_blank" rel="noopener">1. Design erstellen</a>
    <a class="cta ghost" href="{e(link)}"{' target="_blank" rel="noopener"' if kind=='shopify' else ''}>2. {cta_label}</a>
  </p>
</div>
{note}
<h3>So funktioniert's</h3>
<ol class="steps">
<li>Deinen Namen oder dein Wort im Design-Tool eingeben und das fertige Design herunterladen.</li>
<li>Produkt bestellen — wir drucken auf Bestellung, kein Lager, kein Überschuss.</li>
<li>Druck und Versand laufen über einen Partner mit EU-Lager. Du bekommst es nach Hause.</li>
</ol>
<p class="meta">Personalisierte Artikel sind vom Widerruf ausgenommen — bitte Schreibweise vor dem Bestellen prüfen.</p>"""
    # Bewusst KEIN Offer-JSON-LD, solange preis_eur null ist (keine erfundenen Preise).
    pj = {"@context": "https://schema.org", "@type": "Product", "name": p["name"],
          "description": p["kurz"], "category": "Personalisiertes Produkt"}
    if isinstance(p.get("preis_eur"), (int, float)):
        pj["offers"] = {"@type": "Offer", "price": p["preis_eur"], "priceCurrency": "EUR",
                        "availability": "https://schema.org/MadeToOrder"}
    crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": SITE_NAME, "item": BASE_URL + "/"},
        {"@type": "ListItem", "position": 2, "name": p["name"], "item": f"{BASE_URL}/produkt/{p['id']}.html"}]}
    return shell(title=f"{p['name']} — {SITE_NAME}", description=p["kurz"],
                 body=body, canonical=f"{BASE_URL}/produkt/{p['id']}.html", jsonld=[pj, crumb])


def home(data, cfg):
    cards = "\n".join(card(p) for p in data["produkte"])
    fb = "" if shop_url(cfg) else ('<div class="note">Hinweis: Der Shop ist noch nicht live geschaltet. '
                                   'Bestellungen laufen aktuell per Mail. Sobald der Checkout verbunden ist, '
                                   'erscheint hier der direkte Bestell-Button.</div>')
    body = f"""<div class="hero">
<h2>Dein Name. Dein Produkt. Auf Bestellung gedruckt.</h2>
<p>Gib deinen Namen oder ein Wort ein, lade das fertige Design herunter und bestell es als
Schlüsselanhänger, Namensschild, Karte, Tasse oder Poster. Print-on-Demand — wir produzieren
erst, wenn du bestellst. Kein Lager, kein Überschuss, Versand aus der EU.</p>
<p><a class="cta" href="{e(DESIGN_URL)}" target="_blank" rel="noopener">Design-Tool öffnen →</a></p>
</div>
{fb}
<h3>Produkte</h3>
<div class="grid">{cards}</div>
<div class="note" style="margin-top:22px">Ehrlich: Das ist eine Print-on-Demand-/Dropshipping-Variante.
Du verdienst an der Spanne zwischen Druckkosten und Verkaufspreis — keine Reichtums-Versprechen,
sondern ein sauberes kleines Produkt-Geschäft ohne eigenes Lager.</div>"""
    site = [{"@context": "https://schema.org", "@type": "Store", "name": SITE_NAME, "url": BASE_URL + "/"},
            {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": p["name"],
                 "url": f"{BASE_URL}/produkt/{p['id']}.html"} for i, p in enumerate(data["produkte"])]}]
    return shell(title=f"{SITE_NAME} — personalisierte Produkte mit deinem Namen",
                 description="Schlüsselanhänger, Namensschilder, Karten, Tassen und Poster mit deinem Namen — "
                             "auf Bestellung gedruckt, Versand aus der EU. Design selbst erstellen, dann bestellen.",
                 body=body, canonical=BASE_URL + "/", jsonld=site)


def legal():
    imp = ("<h2>Impressum</h2><p><strong>Allen Chour</strong><br>Hühnerhubelstrasse 37<br>"
           "3123 Belp<br>Schweiz</p><p>Kontakt: <a href=\"mailto:hallo@abannews.com\">hallo@abannews.com</a></p>"
           "<p>Print-on-Demand-Shop von aban news. Produkte werden auf Bestellung über Partner mit "
           "EU-Lager gedruckt und versandt.</p>")
    dat = ("<h2>Datenschutz</h2><p>Diese Seite ist statisch und setzt kein Tracking, keine Cookies und "
           "keine 3rd-Party-Skripte. Beim Bestellvorgang (Shopify/POD-Partner) gelten deren "
           "Datenschutz-Bestimmungen; dort werden die für Druck und Versand nötigen Daten verarbeitet.</p>"
           "<p>Verantwortlich: Allen Chour, Belp (CH) · <a href=\"mailto:hallo@abannews.com\">hallo@abannews.com</a></p>")
    return imp, dat


def w(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build():
    data, cfg = load()
    if OUT.exists():
        import shutil
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    w(OUT / "index.html", home(data, cfg))
    for p in data["produkte"]:
        w(OUT / "produkt" / f"{p['id']}.html", product_page(p, cfg))
    imp, dat = legal()
    w(OUT / "impressum.html", shell(title=f"Impressum — {SITE_NAME}", description="Impressum.",
      body=imp, canonical=BASE_URL + "/impressum.html"))
    w(OUT / "datenschutz.html", shell(title=f"Datenschutz — {SITE_NAME}", description="Datenschutz: kein Tracking.",
      body=dat, canonical=BASE_URL + "/datenschutz.html"))
    w(OUT / "404.html", shell(title=f"Nicht gefunden — {SITE_NAME}", description="Seite nicht gefunden.",
      body='<h2>404</h2><p><a href="/">← Zum Shop</a></p>', canonical=BASE_URL + "/404.html"))
    w(OUT / "favicon.svg",
      f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" '
      f'fill="{ACCENT}"/><text x="32" y="44" font-size="34" text-anchor="middle" fill="#fff">🏷️</text></svg>')
    w(OUT / "robots.txt", f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n")
    today = date.today().isoformat()
    urls = ["/", "/impressum.html", "/datenschutz.html"] + [f"/produkt/{p['id']}.html" for p in data["produkte"]]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f"<url><loc>{BASE_URL}{u}</loc><lastmod>{today}</lastmod></url>" for u in urls]
    sm.append("</urlset>")
    w(OUT / "sitemap.xml", "\n".join(sm))
    w(OUT / "_headers", "/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n"
      "  Referrer-Policy: strict-origin-when-cross-origin\n"
      "  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
      "base-uri 'self'; form-action 'self'\n")
    print(f"Built {2 + 1 + len(data['produkte'])} HTML pages from {len(data['produkte'])} products → {OUT}")


if __name__ == "__main__":
    build()
