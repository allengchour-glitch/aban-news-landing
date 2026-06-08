#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""generate_dossiers.py — Themen-Dossiers aus echten Newsletter-Ausgaben.

Bündelt die realen Ausgaben aus archive/index.html (kuratierte Quelle der Wahrheit:
data-topics/kind/preview) zu vertieften Dauer-Seiten je Thema. ERFINDET KEINE FAKTEN —
nutzt nur, was in den Ausgaben steht; die Dossier-Intros sind ehrliche Theme-Rahmen.

Erzeugt:
  dossiers.html                      — Übersicht aller Dossiers
  dossier/<slug>.html                — je Thema eine In-Depth-Leseroute
  archive/topics.json                — Themen-Map für den Reader (verwandte Ausgaben)
  og-dossiers.png, og-dossier-<slug>.png

Run:  python3 generate_dossiers.py
"""
import glob
import html as _html
import json
import os
import re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
A, AD, CR, INK, MU, BG = (217,119,6),(180,83,9),(254,243,199),(31,41,55),(107,114,128),(255,251,245)

# --- Dossier-Definitionen (Cluster über vorhandene data-topics) --------------
DOSSIERS = [
    {"slug": "ki-werkzeugkasten", "emoji": "🧰",
     "title": "Der KI-Werkzeugkasten",
     "sub": "Jeden Freitag ein ehrlicher Tool-Test — hier gebündelt zur Leseroute.",
     "blurb": "Welche KI-Tools sich wirklich lohnen — und welche nur gut klingen. Diese Ausgaben "
              "nehmen Werkzeuge in der Praxis auseinander: was bleibt, was fliegt, was du dir sparen kannst. "
              "Ehrlich getestet, mit Datenschutz-Blick für den DACH-Raum.",
     "topics": {"werkzeugkasten", "tool-test"}},
    {"slug": "ki-datenschutz-dach", "emoji": "🔒",
     "title": "KI & Datenschutz im DACH-Raum",
     "sub": "DSGVO, EU AI Act und was das praktisch für deine Arbeit heißt.",
     "blurb": "KI nutzen, ohne sich rechtlich zu verheddern: Diese Ausgaben ordnen Datenschutz, EU-Regulierung "
              "und DACH-spezifische Fragen ein — praxisnah, ohne Panik und ohne Hype. Keine Rechtsberatung, "
              "aber die richtige Sortierung, bevor du Tools im Betrieb einsetzt.",
     "topics": {"datenschutz", "dach"}},
    {"slug": "ki-prompts-die-funktionieren", "emoji": "💡",
     "title": "Prompts, die wirklich funktionieren",
     "sub": "Erprobte Prompts und Arbeitsweisen — zum Kopieren und Anpassen.",
     "blurb": "Kein Prompt-Voodoo, sondern was im Alltag echte Zeit spart. Diese Ausgaben sammeln erprobte "
              "Prompts und Arbeitsweisen für Texte, Recherche und Routine — direkt übernehmbar.",
     "topics": {"prompts"}},
    {"slug": "anti-hype-reality-checks", "emoji": "🔍",
     "title": "Anti-Hype & Reality-Checks",
     "sub": "Was die Schlagzeile verspricht — und was davon stimmt.",
     "blurb": "Die Signatur von aban news: KI-Behauptungen gegen die Realität halten. Diese Ausgaben trennen "
              "Substanz von Marketing — damit du Entscheidungen auf Fakten triffst, nicht auf LinkedIn-Lärm.",
     "topics": {"anti-hype", "news-recap"}},
]

CSS = """*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--amber-lt:#fde9c8;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4;--bg:#fffbf5;--card:#fff}
@media(prefers-color-scheme:dark){:root{--amber:#f0a93a;--amber-dk:#fbbf24;--amber-lt:#5a4422;--cream:#3a2f1c;--ink:#f3ede2;--ink2:#d6cdbd;--muted:#9c9384;--line:#3a352d;--bg:#1a1712;--card:#231f19}}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
a{color:var(--amber-dk)}
:focus-visible{outline:3px solid var(--amber-dk);outline-offset:2px;border-radius:4px}
.skip{position:absolute;left:-9999px}.skip:focus{left:8px;top:8px;background:var(--amber-dk);color:#fff;padding:10px;border-radius:8px}
header.site{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;align-items:center;justify-content:space-between;padding:14px 20px}
.brand{font-weight:800;color:var(--amber);text-decoration:none}
.btn{display:inline-block;background:var(--amber-dk);color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:9px;border:0;cursor:pointer;font-size:1rem}
.btn:hover{filter:brightness(1.05)}.btn.ghost{background:transparent;color:var(--amber-dk);border:1px solid var(--amber-lt)}
.crumbs{font-size:.85rem;color:var(--muted);padding:16px 0 0}.crumbs a{color:var(--amber-dk)}
.hero{padding:26px 0 10px}
.hero .em{font-size:2.4rem;line-height:1}
.hero h1{font-size:clamp(24px,4.2vw,34px);font-weight:800;letter-spacing:-.02em;line-height:1.14;margin:.4rem 0 .5rem}
.hero p.lead{font-size:clamp(16px,2.2vw,18px);color:var(--ink2)}
.meta{color:var(--muted);font-size:.9rem;margin-top:.5rem}
section{padding:14px 0}h2{font-size:1.25rem;margin:18px 0 10px}
.intro{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin:14px 0}
.route{list-style:none;counter-reset:r;margin:10px 0}
.route li{position:relative;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:14px 16px 14px 56px;margin:10px 0}
.route li::before{counter-increment:r;content:counter(r);position:absolute;left:14px;top:14px;width:30px;height:30px;border-radius:50%;background:var(--cream);color:var(--amber-dk);font-weight:800;display:flex;align-items:center;justify-content:center;border:1px solid var(--amber-lt)}
.route .d{font-size:.8rem;color:var(--muted)}
.route .t{font-weight:700;font-size:1.04rem;margin:.1rem 0}.route .t a{color:var(--ink);text-decoration:none}.route .t a:hover{color:var(--amber-dk)}
.route .p{color:var(--ink2);font-size:.93rem;margin-top:.2rem}
.route .start{display:inline-block;font-size:.7rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--amber-dk);background:var(--cream);border:1px solid var(--amber-lt);border-radius:99px;padding:.05rem .5rem;margin-left:.4rem;vertical-align:middle}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}
@media(max-width:600px){.grid{grid-template-columns:1fr}}
.dcard{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;text-decoration:none;color:inherit;transition:transform .12s,border-color .12s,box-shadow .12s}
.dcard:hover{transform:translateY(-2px);border-color:var(--amber);box-shadow:0 6px 18px rgba(0,0,0,.07)}
.dcard .em{font-size:1.7rem}.dcard h3{margin:.3rem 0 .2rem;font-size:1.1rem}
.dcard p{color:var(--muted);font-size:.9rem}.dcard .n{color:var(--amber-dk);font-weight:700;font-size:.82rem;margin-top:.5rem}
.buybox{background:linear-gradient(135deg,var(--cream),var(--card));border:1px solid var(--amber-lt);border-radius:16px;padding:22px;text-align:center;margin:20px 0}
.note{font-size:.85rem;color:var(--muted);margin-top:10px}
footer{border-top:1px solid var(--line);margin-top:30px;padding:24px 0;font-size:.82rem;color:var(--muted)}
footer a{color:var(--muted)}"""

SHELL = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<meta name="description" content="__DESC__">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://abannews.com/__CANON__">
<meta property="og:title" content="__OGT__">
<meta property="og:description" content="__DESC__">
<meta property="og:type" content="website">
<meta property="og:url" content="https://abannews.com/__CANON__">
<meta property="og:image" content="https://abannews.com/__OGIMG__">
<meta property="og:locale" content="de_DE"><meta property="og:site_name" content="aban news">
<meta name="theme-color" content="#d97706">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="aban news" href="/archive.rss">
__LD__
<style>__CSS__</style>
</head>
<body>
<a class="skip" href="#main">Zum Inhalt</a>
<header class="site"><div class="wrap">
  <a href="/" class="brand">☕ aban news</a>
  <a href="https://abannews.beehiiv.com/subscribe" class="btn ghost">Newsletter gratis</a>
</div></header>
<main id="main"><div class="wrap">
__BODY__
</div></main>
<footer><div class="wrap">© 2026 aban news · Allen Chour · Belp (CH) ·
<a href="/dossiers.html">Themen-Dossiers</a> · <a href="/archive/">Archiv</a> ·
<a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a></div></footer>
<script defer src="/js/assistant.js"></script>
</body>
</html>
"""


def e(s):
    return _html.escape(str(s or ""), quote=True)


# --- archive/index.html parsen (kuratierte Quelle) ---------------------------
def parse_issues():
    src = open(os.path.join(ROOT, "archive", "index.html"), encoding="utf-8").read()
    issues = []
    for m in re.finditer(r'<article class="arc-card"([^>]*)>(.*?)</article>', src, re.S):
        attrs, inner = m.group(1), m.group(2)

        def at(name):
            mm = re.search(rf'{name}="([^"]*)"', attrs)
            return mm.group(1) if mm else ""
        kind = at("data-kind")
        topics = [t for t in at("data-topics").split() if t]
        date = at("data-date")
        tm = re.search(r'<h2 class="arc-card-title"><a href="([^"]+)">(.*?)</a>', inner, re.S)
        if not tm:
            continue
        url, title = tm.group(1), _html.unescape(re.sub(r"<[^>]+>", "", tm.group(2))).strip()
        pm = re.search(r'<p class="arc-card-preview">(.*?)</p>', inner, re.S)
        preview = _html.unescape(re.sub(r"<[^>]+>", "", pm.group(1))).strip() if pm else ""
        mins = 0
        mn = re.search(r'·\s*(\d+)\s*Min', inner)
        if mn:
            mins = int(mn.group(1))
        num = (re.search(r'/(\d{3})-', url) or [None, ""])[1]
        nice = ""
        dm = re.search(r'<time datetime="[^"]*">(.*?)</time>', inner, re.S)
        if dm:
            nice = _html.unescape(dm.group(1)).strip()
        issues.append({"url": url, "title": title, "preview": preview, "date": date,
                       "nice": nice, "mins": mins, "topics": topics, "kind": kind, "num": num})
    return issues


def font(size, bold=True):
    cands = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"] + glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    for c in cands:
        if c and os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def _wrap(d, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textbbox((0, 0), t, font=fnt)[2] <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def og(path, badge, title):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(img)
    d.ellipse([W-520,-260,W+260,360], fill=CR); d.rectangle([0,0,16,H], fill=A)
    d.text((70,70), "☕  aban news", font=font(34), fill=AD)
    bf = font(24); bb = d.textbbox((0,0), badge, font=bf)
    d.rounded_rectangle([70,140,70+(bb[2]-bb[0])+44,140+(bb[3]-bb[1])+26], radius=18, fill=CR)
    d.text((92,152), badge, font=bf, fill=AD)
    y = 220
    for ln in _wrap(d, title, font(74), W-140)[:3]:
        d.text((70, y), ln, font=font(74), fill=INK); y += 88
    d.text((70, H-78), "abannews.com/dossiers  ·  ehrlich, kein Hype", font=font(26, bold=False), fill=MU)
    img.save(path, "PNG")


def ld(obj):
    return '<script type="application/ld+json">\n' + json.dumps(obj, ensure_ascii=False) + '\n</script>'


def render_dossier(dos, issues):
    members = [it for it in issues if it["kind"] == "ausgabe" and (set(it["topics"]) & dos["topics"])]
    members.sort(key=lambda x: x["date"])  # chronologisch = Leseroute
    total_min = sum(it["mins"] for it in members) or len(members) * 4
    canon = f"dossier/{dos['slug']}.html"
    ogimg = f"og-dossier-{dos['slug']}.png"
    desc = f"{dos['sub']} {len(members)} Ausgaben aus dem aban-news-Archiv, als vertiefte Leseroute."

    route = []
    for i, it in enumerate(members):
        start = '<span class="start">Start hier</span>' if i == 0 else ""
        route.append(
            f'<li><div class="d">Ausgabe {e(it["num"])} · {e(it["nice"] or it["date"])}'
            f'{" · " + str(it["mins"]) + " Min" if it["mins"] else ""}</div>'
            f'<div class="t"><a href="{e(it["url"])}">{e(it["title"])}</a>{start}</div>'
            f'<div class="p">{e(it["preview"])}</div></li>')

    others = "".join(
        f'<a class="dcard" href="/dossier/{e(o["slug"])}.html"><span class="em">{o["emoji"]}</span>'
        f'<h3>{e(o["title"])}</h3><p>{e(o["sub"])}</p></a>'
        for o in DOSSIERS if o["slug"] != dos["slug"])

    item_list = ld({"@context": "https://schema.org", "@type": "ItemList",
                    "name": dos["title"], "description": dos["sub"],
                    "itemListElement": [
                        {"@type": "ListItem", "position": i + 1,
                         "url": "https://abannews.com" + it["url"], "name": it["title"]}
                        for i, it in enumerate(members)]})

    body = f"""<nav class="crumbs"><a href="/">Start</a> › <a href="/dossiers.html">Dossiers</a> › {e(dos['title'])}</nav>
  <section class="hero">
    <div class="em">{dos['emoji']}</div>
    <h1>{e(dos['title'])}</h1>
    <p class="lead">{e(dos['sub'])}</p>
    <p class="meta">{len(members)} Ausgaben · ca. {total_min} Min Lesen · laufend ergänzt</p>
  </section>
  <div class="intro"><p>{e(dos['blurb'])}</p></div>
  <section>
    <h2>Die Leseroute</h2>
    <ol class="route">{''.join(route)}</ol>
  </section>
  <section>
    <div class="buybox">
      <p style="font-weight:700;font-size:1.1rem;margin-bottom:.4rem">Neue Ausgaben zu diesem Thema automatisch bekommen</p>
      <p style="color:var(--ink2);margin-bottom:.8rem">Der tägliche Newsletter (Mo–Fr, 5 Min) liefert sie frei Haus — ehrlich, ohne Hype.</p>
      <a class="btn" href="https://abannews.beehiiv.com/subscribe">Kostenlos abonnieren →</a>
      <p class="note">Jederzeit kündbar · kein Tracking · kein Spam.</p>
    </div>
  </section>
  <section>
    <h2>Weitere Dossiers</h2>
    <div class="grid">{others}</div>
    <p class="note" style="margin-top:.8rem"><a href="/archive/">→ Alle {sum(1 for it in issues if it['kind']=='ausgabe')} Ausgaben im Archiv durchsuchen</a></p>
  </section>"""

    page = (SHELL.replace("__TITLE__", e(f"{dos['title']} — Themen-Dossier · aban news"))
            .replace("__OGT__", e(f"{dos['title']} — Themen-Dossier"))
            .replace("__DESC__", e(desc)).replace("__CANON__", canon)
            .replace("__OGIMG__", ogimg).replace("__LD__", item_list)
            .replace("__CSS__", CSS).replace("__BODY__", body))
    os.makedirs(os.path.join(ROOT, "dossier"), exist_ok=True)
    open(os.path.join(ROOT, "dossier", f"{dos['slug']}.html"), "w", encoding="utf-8").write(page)
    og(os.path.join(ROOT, ogimg), "THEMEN-DOSSIER", dos["title"])
    return members


def render_index(issues, counts):
    cards = "".join(
        f'<a class="dcard" href="/dossier/{e(d["slug"])}.html"><span class="em">{d["emoji"]}</span>'
        f'<h3>{e(d["title"])}</h3><p>{e(d["sub"])}</p>'
        f'<div class="n">{counts[d["slug"]]} Ausgaben →</div></a>'
        for d in DOSSIERS)
    n_aus = sum(1 for it in issues if it["kind"] == "ausgabe")
    body = f"""<nav class="crumbs"><a href="/">Start</a> › Themen-Dossiers</nav>
  <section class="hero">
    <div class="em">📚</div>
    <h1>Themen-Dossiers — der Newsletter, vertieft</h1>
    <p class="lead">Aus {n_aus} echten Ausgaben zu In-Depth-Leserouten gebündelt. Ein Thema, von Anfang bis aktuell — zum Einsteigen, Nachholen und Tieferbohren.</p>
  </section>
  <section><div class="grid">{cards}</div></section>
  <section>
    <div class="buybox">
      <p style="font-weight:700;font-size:1.1rem;margin-bottom:.4rem">Lieber täglich frisch?</p>
      <p style="color:var(--ink2);margin-bottom:.8rem">Mo–Fr in 5 Minuten: 3 Updates, 1 Tool, 1 Prompt. Ehrlich, ohne Hype.</p>
      <a class="btn" href="https://abannews.beehiiv.com/subscribe">Kostenlos abonnieren →</a>
      <p class="note">Jederzeit kündbar · kein Tracking.</p>
    </div>
    <p class="note"><a href="/archive/">→ Oder alle Ausgaben im Archiv durchsuchen</a></p>
  </section>"""
    page = (SHELL.replace("__TITLE__", "Themen-Dossiers — der KI-Newsletter vertieft · aban news")
            .replace("__OGT__", "Themen-Dossiers — der KI-Newsletter vertieft")
            .replace("__DESC__", "Echte aban-news-Ausgaben, zu vertieften Themen-Leserouten gebündelt: Werkzeugkasten, Datenschutz im DACH-Raum, Prompts, Anti-Hype.")
            .replace("__CANON__", "dossiers.html").replace("__OGIMG__", "og-dossiers.png")
            .replace("__LD__", "").replace("__CSS__", CSS).replace("__BODY__", body))
    open(os.path.join(ROOT, "dossiers.html"), "w", encoding="utf-8").write(page)
    og(os.path.join(ROOT, "og-dossiers.png"), "THEMEN-DOSSIERS", "Der Newsletter, vertieft")


def write_topics_json(issues, dossier_map):
    freq = {}
    for it in issues:
        for t in it["topics"]:
            freq[t] = freq.get(t, 0) + 1
    data = {"updated": "2026-06-08", "freq": freq, "issues": {}}
    for it in issues:
        data["issues"][it["url"]] = {
            "title": it["title"], "date": it["date"], "preview": it["preview"],
            "t": it["topics"], "kind": it["kind"], "num": it["num"],
            "dossiers": dossier_map.get(it["url"], [])}
    open(os.path.join(ROOT, "archive", "topics.json"), "w", encoding="utf-8").write(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")))


def main():
    issues = parse_issues()
    counts, dossier_map = {}, {}
    for dos in DOSSIERS:
        members = render_dossier(dos, issues)
        counts[dos["slug"]] = len(members)
        for it in members:
            dossier_map.setdefault(it["url"], []).append(dos["slug"])
    render_index(issues, counts)
    write_topics_json(issues, dossier_map)
    print(f"✓ Dossiers: {len(DOSSIERS)} Themen aus {len(issues)} Ausgaben "
          f"({', '.join(f'{k}={v}' for k, v in counts.items())}) + topics.json + OGs")


if __name__ == "__main__":
    main()
