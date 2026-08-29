#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Branchen-Hub-Generator.

Listet ALLE ki-fuer-*.html (root) auf einer einzigen crawlbaren Hub-Seite
(branchen.html) — der zentrale Indexierungs-Hebel: so erreicht Google jede
Branchenseite in 1 Klick von einer gut verlinkten Seite. Label = Titel-Teil
vor dem Gedankenstrich. Alphabetisch sortiert. Markentreue Inline-Shell.

  python3 tools/build_branchen_hub.py
"""
import os, re, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def titel_of(path):
    """Voller Seitentitel ohne Marken-Suffix."""
    s = open(path, encoding="utf-8", errors="ignore").read(4000)
    m = re.search(r"<title>(.*?)</title>", s, re.S)
    t = html.unescape(m.group(1)).strip() if m else os.path.basename(path)
    t = re.split(r"\s*\|\s*", t)[0].strip()
    return re.sub(r"\s*\(20\d\d\)\s*$", "", t).strip()


def label_of(path):
    # vor dem ersten Gedankenstrich abschneiden
    t = re.split(r"\s+[—–-]\s+", titel_of(path))[0].strip()
    return re.sub(r"\s*\(20\d\d\)\s*$", "", t).strip()


def ueberschriften(path):
    """Alle Zwischenueberschriften einer Seite, ohne Nummerierung."""
    s = open(path, encoding="utf-8", errors="ignore").read()
    out = []
    for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", s, re.I | re.S):
        t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
        t = re.sub(r"^\d+[.)]\s*", "", t).strip()
        if len(t) > 3:
            out.append(t)
    return out


def eindeutig(items):
    """Zwei Seiten koennen denselben Kurz-Titel haben — "KI fuer Wintergartenbau"
    stand zweimal untereinander im Hub, in den uebersetzten Huben bis zu 18-mal
    (die deutschen Slug-Varianten fallen in der Uebersetzung zusammen). Fuer
    Leserinnen sind zwei identische Zeilen nicht unterscheidbar.

    Stufe 1 gibt kollidierenden Eintraegen ihren Untertitel zurueck. Reicht das
    nicht (die Uebersetzung hat beiden Varianten denselben Titel gegeben, obwohl
    die Texte verschieden sind), haengt Stufe 2 die erste Zwischenueberschrift an,
    die die Seite NICHT mit ihren Kollisionspartnern teilt. Ein fest gewaehltes
    "erstes H2" taugt dafuer nicht: die Seiten beginnen alle mit demselben
    Standard-Abschnitt ("Worum es hier nicht geht")."""
    def gruppiere(paare):
        z = {}
        for lbl, *_ in paare:
            z[lbl] = z.get(lbl, 0) + 1
        return z

    z = gruppiere(items)
    stufe1 = [((voll if z[lbl] > 1 and voll and voll != lbl else lbl), href, path, lbl)
              for lbl, href, voll, path in items]

    z2 = gruppiere(stufe1)
    gruppen = {}
    for lbl, _href, path, _kurz in stufe1:
        if z2[lbl] > 1:
            gruppen.setdefault(lbl, []).append(path)
    kopf = {}
    for lbl, pfade in gruppen.items():
        hs = {p: ueberschriften(p) for p in pfade}
        for p in pfade:
            andere = set()
            for q in pfade:
                if q != p:
                    andere |= set(hs[q])
            eigen = next((h for h in hs[p] if h not in andere), "")
            kopf[p] = eigen

    out = []
    for lbl, href, path, kurz in stufe1:
        eigen = kopf.get(path)
        if eigen:
            # Der Untertitel aus Stufe 1 unterscheidet hier nichts mehr (beide
            # Seiten tragen denselben) — also zurueck auf den kurzen Titel, damit
            # die Zeile nicht auf 160 Zeichen anwaechst.
            lbl = kurz + " \u00b7 " + eigen
        out.append((lbl, href))
    return out


CONF = [
    dict(lang="de", glob="ki-fuer-*.html", base="/", out="branchen.html",
         home="/", subscribe_label="Gratis abonnieren",
         title="KI für deine Branche — alle {n} Branchen-Guides | aban news",
         desc="KI praktisch erklärt für {n}+ Branchen — von Handwerk über Praxen bis Gastronomie und Tierberufe. Konkrete Anwendungsfälle, ehrliche Grenzen, kein Hype. Wähle deine Branche.",
         canon="https://abannews.com/branchen.html",
         ogtitle="KI für deine Branche — alle Branchen-Guides",
         ogdesc="KI praktisch erklärt für über {n} Branchen. Konkrete Fälle, ehrliche Grenzen, kein Hype.",
         h1="KI für deine Branche",
         lead="Konkrete KI-Anwendungsfälle für über {n} Branchen — von Handwerk über Praxen, Gastronomie und Kanzleien bis zu Tierberufen. Immer ehrlich: was KI dir abnimmt und wo ihre Grenzen sind. Kein Hype, kein Vorwissen nötig.",
         ph="Branche suchen … (z. B. Friseur, Praxis, Café)", filter_aria="Branche filtern",
         cta_h="Deine Branche ist nicht dabei?",
         cta_p="Abonniere den Newsletter — ich zeige täglich, wo KI im Business wirklich hilft, quer durch alle Branchen. Gratis, ehrlich, in 5 Minuten.",
         cta_btn="Gratis abonnieren →",
         nav=[("/online-tools.html","Tools"),("/geld-und-ki.html","Geld &amp; KI"),("/founding.html","Premium")],
         foot=[("/online-tools.html","Tools"),("/geld-und-ki.html","Geld &amp; KI"),("/founding.html","Premium"),("/impressum.html","Impressum"),("/datenschutz.html","Datenschutz")]),
    dict(lang="en", glob="en/ki-fuer-*.html", base="/", out="en/branchen.html",
         home="/en/", subscribe_label="Subscribe free",
         title="AI for your industry — all {n} industry guides | aban news",
         desc="AI explained practically for {n}+ industries — from trades and clinics to hospitality and animal professions. Concrete use cases, honest limits, no hype. Pick your industry.",
         canon="https://abannews.com/en/branchen.html",
         ogtitle="AI for your industry — all industry guides",
         ogdesc="AI explained practically for over {n} industries. Concrete cases, honest limits, no hype.",
         h1="AI for your industry",
         lead="Concrete AI use cases for over {n} industries — from trades and clinics to hospitality, law firms and animal professions. Always honest: what AI takes off your plate and where its limits are. No hype, no prior knowledge needed.",
         ph="Search industry … (e.g. barber, clinic, café)", filter_aria="Filter industries",
         cta_h="Your industry not listed?",
         cta_p="Subscribe to the newsletter — every weekday I show where AI genuinely helps in business, across all industries. Free, honest, in 5 minutes.",
         cta_btn="Subscribe free →",
         nav=[("/en/maerkte.html","Markets"),("/en/geld-und-ki.html","Money &amp; AI"),("/en/founding.html","Premium")],
         foot=[("/en/geld-und-ki.html","Money &amp; AI"),("/en/founding.html","Premium"),("/impressum.html","Imprint"),("/datenschutz.html","Privacy")]),
    dict(lang="fr", glob="fr/ki-fuer-*.html", base="/", out="fr/branchen.html",
         home="/fr/", subscribe_label="S'abonner gratuitement",
         title="L'IA pour votre secteur — les {n} guides sectoriels | aban news",
         desc="L'IA expliquée concrètement pour plus de {n} secteurs — de l'artisanat aux cabinets, la restauration et les métiers animaliers. Cas d'usage concrets, limites honnêtes, sans hype. Choisissez votre secteur.",
         canon="https://abannews.com/fr/branchen.html",
         ogtitle="L'IA pour votre secteur — tous les guides",
         ogdesc="L'IA expliquée concrètement pour plus de {n} secteurs. Cas concrets, limites honnêtes, sans hype.",
         h1="L'IA pour votre secteur",
         lead="Cas d'usage concrets de l'IA pour plus de {n} secteurs — de l'artisanat aux cabinets, la restauration, les études et les métiers animaliers. Toujours honnête : ce que l'IA vous enlève et où sont ses limites. Sans hype, sans prérequis.",
         ph="Rechercher un secteur … (ex. coiffeur, cabinet, café)", filter_aria="Filtrer les secteurs",
         cta_h="Votre secteur n'y est pas ?",
         cta_p="Abonnez-vous à la newsletter — chaque jour ouvré, je montre où l'IA aide vraiment en entreprise, tous secteurs confondus. Gratuit, honnête, en 5 minutes.",
         cta_btn="S'abonner gratuitement →",
         nav=[],
         foot=[("/fr/","Accueil"),("/impressum.html","Mentions légales"),("/datenschutz.html","Confidentialité")]),
    dict(lang="it", glob="it/ki-fuer-*.html", base="/", out="it/branchen.html",
         home="/it/", subscribe_label="Abbonati gratis",
         title="L'IA per il tuo settore — le {n} guide settoriali | aban news",
         desc="L'IA spiegata in modo concreto per oltre {n} settori — dall'artigianato agli studi, ristorazione e professioni con gli animali. Casi d'uso concreti, limiti onesti, senza hype. Scegli il tuo settore.",
         canon="https://abannews.com/it/branchen.html",
         ogtitle="L'IA per il tuo settore — tutte le guide",
         ogdesc="L'IA spiegata in modo concreto per oltre {n} settori. Casi concreti, limiti onesti, senza hype.",
         h1="L'IA per il tuo settore",
         lead="Casi d'uso concreti dell'IA per oltre {n} settori — dall'artigianato agli studi, ristorazione, professioni legali e con gli animali. Sempre onesto: cosa ti toglie l'IA e dove sono i suoi limiti. Senza hype, senza conoscenze pregresse.",
         ph="Cerca un settore … (es. parrucchiere, studio, caffè)", filter_aria="Filtra i settori",
         cta_h="Il tuo settore non c'è?",
         cta_p="Iscriviti alla newsletter — ogni giorno feriale mostro dove l'IA aiuta davvero in azienda, in tutti i settori. Gratis, onesto, in 5 minuti.",
         cta_btn="Abbonati gratis →",
         nav=[],
         foot=[("/it/","Home"),("/impressum.html","Note legali"),("/datenschutz.html","Privacy")]),
]


def build(cfg):
    files = sorted(glob.glob(cfg["glob"]))
    items = eindeutig(sorted(((label_of(f), "/" + f, titel_of(f), f) for f in files),
                             key=lambda x: x[0].lower()))
    n = len(items)
    cards = "\n".join(f'    <li><a href="{href}">{html.escape(lbl)}</a></li>' for lbl, href in items)
    navlinks = "\n".join(f'      <a href="{h}">{t}</a>' for h, t in cfg["nav"])
    footlinks = "\n".join(f'    <a href="{h}">{t}</a>' for h, t in cfg["foot"])
    g = lambda k: cfg[k].format(n=n)

    page = f"""<!DOCTYPE html>
<html lang="{cfg['lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{g('title')}</title>
<meta name="description" content="{g('desc')}">
<link rel="canonical" href="{cfg['canon']}">
<meta property="og:type" content="website">
<meta property="og:title" content="{g('ogtitle')}">
<meta property="og:description" content="{g('ogdesc')}">
<meta property="og:url" content="{cfg['canon']}">
<meta property="og:image" content="https://abannews.com/og-hype.png">
<meta name="twitter:card" content="summary">
<style>
  :root{{--amber-dk:#b45309;--accent:#d97706;--bg:#fffbf5;--field:#fffdf9;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4}}
  *{{box-sizing:border-box}}
  body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}}
  a{{color:var(--amber-dk)}}
  header{{border-bottom:1px solid var(--line);background:#fff}}
  header .wrap{{max-width:1040px;margin:0 auto;display:flex;align-items:center;gap:1rem;padding:14px 20px}}
  .brand{{display:flex;align-items:center;gap:.5rem;font-weight:800;text-decoration:none;color:var(--ink)}}
  .brand .dot{{width:10px;height:10px;border-radius:50%;background:var(--accent);display:inline-block}}
  .hnav{{margin-left:auto;display:flex;align-items:center;gap:1.1rem;font-size:.92rem;flex-wrap:wrap}}
  .hnav a{{color:var(--muted);text-decoration:none}}
  .btn{{background:var(--amber-dk);color:#fff;text-decoration:none;font-weight:600;padding:8px 15px;border-radius:8px;font-size:.9rem}}
  main{{max-width:1040px;margin:0 auto;padding:0 20px}}
  h1{{font-size:2rem;line-height:1.2;margin:34px 0 10px}}
  .lead{{font-size:1.12rem;color:var(--ink2);max-width:70ch}}
  .note{{background:var(--field);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:10px;padding:14px 16px;margin:22px 0;color:var(--ink2);font-size:.96rem}}
  .filter{{width:100%;max-width:420px;font-size:1rem;padding:11px 14px;border:1px solid var(--line);border-radius:10px;background:var(--field);margin:8px 0 18px}}
  ul.cols{{list-style:none;padding:0;margin:0;columns:3;column-gap:26px}}
  ul.cols li{{break-inside:avoid;margin:0 0 8px}}
  ul.cols a{{text-decoration:none;font-size:.95rem}}
  ul.cols a:hover{{text-decoration:underline}}
  @media(max-width:880px){{ul.cols{{columns:2}}}}
  @media(max-width:560px){{ul.cols{{columns:1}}}}
  .cta{{background:var(--field);border:1px solid var(--line);border-radius:14px;padding:20px;margin:34px 0;text-align:center}}
  footer{{border-top:1px solid var(--line);margin-top:40px;background:#fff}}
  footer .wrap{{max-width:1040px;margin:0 auto;padding:18px 20px;color:var(--muted);font-size:.88rem;display:flex;gap:14px;flex-wrap:wrap}}
  footer a{{color:var(--muted)}}
</style>
</head>
<body>
<header>
  <div class="wrap">
    <a href="{cfg['home']}" class="brand"><span class="dot"></span> aban news</a>
    <nav class="hnav" aria-label="Navigation">
{navlinks}
      <a href="https://abannews.beehiiv.com/subscribe" class="btn" target="_blank" rel="noopener">{cfg['subscribe_label']}</a>
    </nav>
  </div>
</header>

<main id="main">
  <h1>{g('h1')}</h1>
  <p class="lead">{g('lead')}</p>

  <input type="search" id="filter" class="filter" placeholder="{g('ph')}" aria-label="{g('filter_aria')}">

  <ul class="cols" id="list">
{cards}
  </ul>

  <div class="cta">
    <h2 style="margin-top:0">{g('cta_h')}</h2>
    <p style="margin:.4rem 0 1rem;color:var(--ink2)">{g('cta_p')}</p>
    <a href="https://abannews.beehiiv.com/subscribe" class="btn" target="_blank" rel="noopener">{g('cta_btn')}</a>
  </div>
</main>

<footer>
  <div class="wrap">
    <span>© 2026 aban news · Allen Chour · Belp (CH)</span>
{footlinks}
  </div>
</footer>
<script>
(function(){{
  var f=document.getElementById('filter'),items=[].slice.call(document.querySelectorAll('#list li'));
  f.addEventListener('input',function(){{
    var q=f.value.trim().toLowerCase();
    items.forEach(function(li){{li.style.display=li.textContent.toLowerCase().indexOf(q)>-1?'':'none';}});
  }});
}})();
</script>
<script defer src="/js/announce.js"></script>
</body>
</html>
"""
    open(cfg["out"], "w", encoding="utf-8").write(page)
    print(f"{cfg['out']} erzeugt mit {n} Branchen-Links.")


def main():
    for cfg in CONF:
        build(cfg)

if __name__ == "__main__":
    main()
