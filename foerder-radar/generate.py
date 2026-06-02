#!/usr/bin/env python3
"""Förder-Radar — static generator for a DACH funding-program directory.

Reads foerderungen.json (curated real programs) and renders a German-language,
filterable, SEO-oriented static directory: an index with client-side filtering,
one page per program, plus region/type/area hubs. Monetization-ready: a clearly
labeled lead-gen / consultant CTA slot per program (fill via leadgen.json).

Pure stdlib, no deps. DSGVO-safe (system fonts, no tracking). German-first
(Fördermittel are DACH-specific — depth in German is the moat, per strategy).

IMPORTANT (honesty): funding amounts/deadlines change. This site never invents
them — it links to the official source and shows an "ohne Gewähr" disclaimer.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from datetime import date
from pathlib import Path

# Brand tokens (shared with KI-Tools Radar / Aban).
ACCENT, ACCENT_H = "#d97706", "#b45309"
BG, BG_ALT = "#fffbf5", "#fef3c7"
TEXT, MUTED, SUCCESS, BORDER = "#1f2937", "#6b7280", "#059669", "#e5e7eb"

SITE_NAME = "Förder-Radar"
TAGLINE = "Fördermittel für DACH — klar sortiert, ehrlich erklärt"
BASE_URL = "https://foerder.abannews.com"   # subdomain (set up like radar)
NEWSLETTER_URL = "https://abannews.com"

REGION_NAME = {"DE": "Deutschland", "AT": "Österreich", "CH": "Schweiz", "EU": "EU"}

# Lead-Magnet / Beratungs-Anfrage: ehrlicher Mail-Fallback (kein erfundener Berater).
LEAD_MAIL = "hallo@abannews.com"

# Matcher-Klassifikation. Wir erfinden NICHTS: wir gruppieren nur die in
# foerderungen.json bereits vorhandenen `bereich`- und `zielgruppe`-Werte in
# wenige, im Funnel auswählbare Buckets. Ein Programm, das nicht passt, taucht
# einfach nicht auf — es werden keine Programme/Beträge dazuerfunden.
#
# Vorhaben/Zweck → Liste passender `bereich`-Stichworte (Teil-Match, case-insensitive).
ZWECK_GROUPS = [
    ("digitalisierung", "Digitalisierung & KI",
     ["digitalisierung", "ki", "software", "it-sicherheit", "cybersecurity",
      "cybersicherheit", "tech", "technologie", "online-marketing", "deep-tech"]),
    ("gruendung", "Gründung & Startup",
     ["gründung", "startup-finanzierung", "skalierung", "wachstum"]),
    ("investition", "Investition & Finanzierung",
     ["investition", "finanzierung", "beteiligung", "betriebsmittel"]),
    ("forschung", "Forschung & Innovation",
     ["forschung", "innovation", "entwicklung", "grundlagenforschung",
      "kommerzialisierung", "technologietransfer", "wissenschaft", "nachwuchs"]),
    ("energie", "Energie & Nachhaltigkeit",
     ["energie", "nachhaltigkeit", "klimaschutz", "effizienz", "industrie"]),
    ("international", "Internationalisierung & Export",
     ["internationalisierung", "export", "international", "messen"]),
    ("weiterbildung", "Weiterbildung & Qualifizierung",
     ["weiterbildung", "qualifizierung", "coaching", "beratung"]),
    ("sonstiges", "Etwas anderes / unsicher", []),  # zeigt alle (Fallback)
]

# Unternehmensgröße → Liste passender `zielgruppe`-Stichworte.
GROESSE_GROUPS = [
    ("solo", "Solo / Freiberuflich",
     ["soloselbstständige", "selbstständige", "freiberufler", "kleinstunternehmen",
      "einzel", "gründer", "gründerin"]),
    ("gruendung", "In Gründung",
     ["gründer", "gründerin", "startup", "scaleup", "tech-gründer",
      "junge unternehmen", "studierende", "hochschulabsolventen"]),
    ("kmu", "Kleines/mittleres Unternehmen (KMU)",
     ["kmu", "kleinunternehmen", "mittelstand", "handwerk", "unternehmen"]),
    ("gross", "Großunternehmen",
     ["großunternehmen", "konsortien"]),
    ("forschung", "Forschung / Hochschule",
     ["wissenschaftler", "forschung", "hochschulen", "universitäten",
      "postdocs", "nachwuchswissenschaftler", "forschungsvereinigungen"]),
    ("egal", "Egal / passt nicht genau", []),  # zeigt alle (Fallback)
]


def matches_group(values, keywords):
    """True, wenn irgendein Programmwert ein Gruppen-Stichwort (Teil-Match) enthält.
    Leere keywords-Liste = Fallback-Bucket, matcht immer."""
    if not keywords:
        return True
    low = [str(v).lower() for v in (values or [])]
    return any(kw in v for v in low for kw in keywords)


def matcher_index(progs):
    """Kompakter Datensatz für den clientseitigen Matcher (kein Tracking)."""
    out = []
    for p in progs:
        zweck = [gid for gid, _, kw in ZWECK_GROUPS if kw and matches_group(p.get("bereich", []), kw)]
        groesse = [gid for gid, _, kw in GROESSE_GROUPS if kw and matches_group(p.get("zielgruppe", []), kw)]
        out.append({
            "id": slug(p["id"]),
            "name": p["name"],
            "traeger": p.get("traeger", ""),
            "region": p.get("region", ""),
            "art": p.get("art", ""),
            "kurz": p.get("kurz", ""),
            "url": p.get("url", "#"),
            "z": zweck,      # Zweck-Gruppen-IDs
            "g": groesse,    # Größen-Gruppen-IDs
        })
    return out


def slug(v: str) -> str:
    v = v.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        v = v.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", v).strip("-") or "x"


def e(v) -> str:
    return html.escape(str(v if v is not None else ""))


def clip(text: str, limit: int = 155) -> str:
    """Trim a meta description to a word boundary (cleaner SERP snippets)."""
    text = " ".join(str(text or "").split())
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:–-")
    return (cut or text[:limit]) + "…"


def page(title, description, body, canonical):
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(canonical)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="{ACCENT}">
<style>
:root{{--accent:{ACCENT};--accent-h:{ACCENT_H};--bg:{BG};--bg-alt:{BG_ALT};
--text:{TEXT};--muted:{MUTED};--success:{SUCCESS};--border:{BORDER};--card:#fff;}}
@media(prefers-color-scheme:dark){{:root{{--bg:#1a1714;--bg-alt:#2a2420;--text:#f3f0ec;
--muted:#a8a29e;--border:#3a332d;--card:#241f1b;--accent-h:#f59e0b;}}}}
*{{box-sizing:border-box;}}
body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
background:var(--bg);color:var(--text);line-height:1.6;}}
a{{color:var(--accent-h);}}
.wrap{{max-width:900px;margin:0 auto;padding:0 20px;}}
header{{background:var(--bg-alt);border-bottom:1px solid var(--border);padding:20px 0;}}
header h1{{margin:0;font-size:1.4rem;}} header a{{text-decoration:none;color:var(--text);}}
header .tag{{color:var(--muted);font-size:.95rem;margin:4px 0 0;}}
main{{padding:26px 0;}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin:0 0 12px;}}
.card h2{{margin:0 0 4px;font-size:1.12rem;}} .card h2 a{{text-decoration:none;color:var(--text);}}
.badges{{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}}
.b{{display:inline-block;background:var(--bg-alt);border-radius:6px;padding:2px 9px;font-size:.78rem;}}
.b.art{{background:var(--accent);color:#fff;}} .b.reg{{background:var(--success);color:#fff;}}
.cta{{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;padding:9px 16px;
border-radius:8px;font-weight:600;margin-top:8px;}} .cta:hover{{background:var(--accent-h);}}
.lead{{background:var(--bg-alt);border:1px dashed var(--accent);border-radius:10px;padding:12px 16px;margin:14px 0;font-size:.92rem;}}
.filter{{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px;}}
.filter select,.filter input{{padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:.95rem;}}
.filter input{{flex:1;min-width:160px;}}
.disc{{color:var(--muted);font-size:.82rem;border-top:1px solid var(--border);margin-top:22px;padding-top:12px;}}
.nl{{background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin:20px 0;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;}}
.nl span{{color:var(--muted);flex:1;min-width:200px;}} .nl .cta{{margin-top:0;}}
footer{{border-top:1px solid var(--border);padding:20px 0;color:var(--muted);font-size:.85rem;}}
h1{{font-size:1.6rem;}}
.matcher-teaser{{background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin:0 0 18px;}}
.matcher-teaser h2{{margin:0 0 6px;font-size:1.15rem;}}
.matcher{{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;margin:0 0 18px;}}
.matcher h2{{margin:0 0 6px;}}
.m-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:12px 0;}}
.m-grid label{{font-weight:600;font-size:.92rem;}}
.m-grid select{{display:block;width:100%;margin-top:4px;padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:.95rem;font-weight:400;}}
.m-reset{{background:none;border:1px solid var(--border);color:var(--text);border-radius:8px;padding:9px 14px;cursor:pointer;margin-left:8px;}}
.m-count{{color:var(--muted);font-size:.9rem;margin:8px 0;}}
.m-results .card{{margin:0 0 10px;}}
.m-leadform{{background:var(--bg-alt);border:1px solid var(--border);border-radius:10px;padding:16px;margin-top:16px;}}
.m-leadform h3{{margin:0 0 4px;}}
.m-leadform label{{display:block;margin:10px 0 4px;font-weight:600;font-size:.92rem;}}
.m-leadform textarea{{width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:.95rem;font-family:inherit;}}
.m-consent{{font-weight:400;display:flex;gap:8px;align-items:flex-start;font-size:.88rem;color:var(--muted);}}
.m-consent input{{margin-top:3px;}}
.m-hint{{font-size:.9rem;margin-top:8px;}}
.m-lead-ad{{background:var(--bg);border:1px dashed var(--accent);border-radius:10px;padding:12px 16px;font-size:.92rem;}}
button.cta{{border:none;cursor:pointer;font-size:.95rem;font-family:inherit;}}
</style>
</head>
<body>
<header><div class="wrap">
<a href="/"><h1>🧭 {e(SITE_NAME)}</h1></a>
<div class="tag">{e(TAGLINE)}</div>
</div></header>
<main><div class="wrap">
{body}
<aside class="nl"><strong>📬 Förder- &amp; KI-News</strong>
<span>Neue Programme &amp; KI-Tipps für DACH — kostenlos von Aban News.</span>
<a class="cta" href="{e(NEWSLETTER_URL)}" target="_blank" rel="noopener">Kostenlos abonnieren →</a></aside>
</div></main>
<footer><div class="wrap">
© {date.today().year} {e(SITE_NAME)} · <a href="/impressum.html">Impressum</a> ·
<a href="/datenschutz.html">Datenschutz</a> · Angaben ohne Gewähr
</div></footer>
</body>
</html>"""


def jsonld(p):
    data = {"@context": "https://schema.org", "@type": "GovernmentService",
            "name": p["name"], "serviceType": p.get("art", "Förderung"),
            "provider": {"@type": "Organization", "name": p.get("traeger", "")},
            "areaServed": REGION_NAME.get(p.get("region"), p.get("region", "")),
            "url": BASE_URL + f"/programm/{slug(p['id'])}.html"}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def card(p):
    badges = (f'<span class="b reg">{e(REGION_NAME.get(p.get("region"), p.get("region","")))}</span>'
              f'<span class="b art">{e(p.get("art",""))}</span>'
              + "".join(f'<span class="b">{e(b)}</span>' for b in p.get("bereich", [])))
    search = " ".join([p["name"], p.get("traeger", ""), p.get("art", "")]
                      + p.get("bereich", []) + p.get("zielgruppe", [])).lower()
    return f"""<article class="card" data-s="{e(search)}" data-region="{e(p.get('region',''))}" data-art="{e(p.get('art',''))}">
<h2><a href="/programm/{e(slug(p['id']))}.html">{e(p['name'])}</a></h2>
<div class="badges">{badges}</div>
<p>{e(p.get('kurz',''))}</p>
<p style="color:var(--muted);font-size:.85rem">Träger: {e(p.get('traeger','—'))}</p>
</article>"""


def itemlist(members, lang="de"):
    """ItemList JSON-LD for hub pages (Google list eligibility)."""
    elems = [{"@type": "ListItem", "position": i + 1, "name": p["name"],
              "url": BASE_URL + f"/programm/{slug(p['id'])}.html"}
             for i, p in enumerate(members)]
    data = {"@context": "https://schema.org", "@type": "ItemList", "itemListElement": elems}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def lead_slot(p, leadgen):
    """Clearly labeled lead-gen / consultant CTA. Filled via leadgen.json."""
    entry = leadgen.get(p["id"]) or leadgen.get("_default")
    if not entry:
        return ""
    return (f'<div class="lead"><strong>Beratung gewünscht?</strong> {e(entry.get("text",""))}'
            f' <a class="cta" href="{e(entry.get("url","#"))}" rel="sponsored noopener" '
            f'target="_blank">{e(entry.get("cta","Kostenlose Erstberatung"))} →</a>'
            f'<br><small style="color:var(--muted)">Anzeige · unabhängig von der Programm-Info</small></div>')


def program_page(p, leadgen, disclaimer):
    badges = (f'<span class="b reg">{e(REGION_NAME.get(p.get("region"), p.get("region","")))}</span>'
              f'<span class="b art">{e(p.get("art",""))}</span>'
              + "".join(f'<span class="b">{e(b)}</span>' for b in p.get("bereich", [])))
    zg = ", ".join(e(z) for z in p.get("zielgruppe", [])) or "—"
    region = REGION_NAME.get(p.get("region"), p.get("region", "—"))
    art = p.get("art", "Förderung")
    # Official source = the primary action: place it right after the TLDR.
    # External link to an official source: no link equity, reverse-tabnabbing-safe.
    src_cta = (f'<a class="cta" href="{e(p.get("url","#"))}" target="_blank" '
               f'rel="noopener nofollow">Offizielle Quelle ansehen →</a>')
    body = f"""{jsonld(p)}
<p><a href="/">← Alle Förderungen</a></p>
<h1>{e(p['name'])}</h1>
<div class="badges">{badges}</div>
<p>{e(p.get('kurz',''))}</p>
{src_cta}
<p><strong>Träger:</strong> {e(p.get('traeger','—'))}<br>
<strong>Region:</strong> {e(region)}<br>
<strong>Art:</strong> {e(art)}<br>
<strong>Zielgruppe:</strong> {zg}</p>
{lead_slot(p, leadgen)}
<p class="disc">⚠️ {e(disclaimer)}</p>"""
    # Unique, keyword-rich title per program (Art + Region + year vary).
    title = f"{p['name']} — {art}-Förderung {region} {date.today().year} | {SITE_NAME}"
    meta = clip(f"{p['name']}: {art}-Förderung für {zg} in {region}. {p.get('kurz','')}")
    return page(title, meta, body,
                BASE_URL + f"/programm/{slug(p['id'])}.html")


def matcher_block(progs, leadgen, embed_data=True):
    """Der 3-Fragen-Funnel als wiederverwendbarer HTML-Block.

    embed_data=True hängt das JSON + Skript an (für die eigene /matcher.html-Seite
    und die Startseite). Filtert clientseitig die echten Programme aus
    foerderungen.json — keine erfundenen Treffer, keine Tracking-Requests."""
    reg_opts = "".join(f'<option value="{e(r)}">{e(REGION_NAME.get(r,r))}</option>'
                       for r in ["DE", "AT", "CH", "EU"])
    zweck_opts = "".join(f'<option value="{e(gid)}">{e(label)}</option>'
                         for gid, label, _ in ZWECK_GROUPS)
    groesse_opts = "".join(f'<option value="{e(gid)}">{e(label)}</option>'
                           for gid, label, _ in GROESSE_GROUPS)
    # Lead-Slot: vorhandener leadgen-Mechanismus (Anzeige) ODER ehrlicher Mail-Fallback.
    entry = leadgen.get("_default")
    if entry:
        lead_cta = (f'<p class="m-lead-ad">{e(entry.get("text",""))} '
                    f'<a class="cta" href="{e(entry.get("url","#"))}" rel="sponsored noopener" '
                    f'target="_blank">{e(entry.get("cta","Kostenlose Erstberatung"))} →</a>'
                    f'<br><small style="color:var(--muted)">Anzeige · unabhängig von der Programm-Info</small></p>')
    else:
        lead_cta = ""
    # Mail-Fallback-Formular (kein Backend, kein Tracking): baut einen mailto-Link.
    lead_form = f"""<form id="m-lead" class="m-leadform" novalidate>
  <h3>Passende Förderung in Ruhe finden lassen</h3>
  <p style="color:var(--muted);font-size:.92rem">Optional: Schreib kurz, worum es geht. Wir
  melden uns per E-Mail und helfen dir, die offiziellen Programme einzuordnen — unverbindlich,
  ohne Kosten. Wir sind kein Förderträger und keine Anwaltskanzlei.</p>
  <label>Worum geht es? (Vorhaben, Branche, Bundesland)<br>
  <textarea id="m-msg" rows="3" placeholder="z. B. Digitalisierung im Handwerk, Bayern, 8 Mitarbeitende"></textarea></label>
  <label class="m-consent"><input type="checkbox" id="m-ok"> Ich bin einverstanden, dass meine
  Angaben zur Beantwortung meiner Anfrage per E-Mail verarbeitet werden
  (<a href="/datenschutz.html">Datenschutz</a>). Es erfolgt kein Tracking.</label>
  <p><button type="submit" class="cta" id="m-send">Anfrage per E-Mail vorbereiten →</button></p>
  <p id="m-hint" class="m-hint" hidden></p>
</form>"""
    block = f"""<section class="matcher" id="matcher" aria-label="Förder-Matcher">
<h2>Förder-Matcher: 3 Fragen, passende Programme</h2>
<p style="color:var(--muted)">Beantworte drei kurze Fragen — wir zeigen dir aus {len(progs)}
echten Programmen die, die zu deinem Vorhaben passen. Mit Link zur offiziellen Quelle.
Alles im Browser, ohne Tracking.</p>
<div class="m-grid">
  <label>1. Region / Sitz<br>
  <select id="m-region"><option value="">Bitte wählen</option>{reg_opts}</select></label>
  <label>2. Vorhaben / Zweck<br>
  <select id="m-zweck"><option value="">Bitte wählen</option>{zweck_opts}</select></label>
  <label>3. Unternehmensgröße<br>
  <select id="m-groesse"><option value="">Bitte wählen</option>{groesse_opts}</select></label>
</div>
<p><button type="button" class="cta" id="m-go">Passende Förderungen anzeigen →</button>
<button type="button" class="m-reset" id="m-reset" hidden>Zurücksetzen</button></p>
<div id="m-count" class="m-count" hidden></div>
<div id="m-results" class="m-results" aria-live="polite"></div>
<div id="m-after" hidden>
{lead_cta}
{lead_form}
</div>
<p class="disc" style="margin-top:14px">⚠️ Angaben ohne Gewähr. Der Matcher ist eine Orientierung,
keine Förderzusage. Maßgeblich sind allein die offiziellen Angaben der Förderträger.</p>
</section>"""
    if embed_data:
        data = json.dumps(matcher_index(progs), ensure_ascii=False, separators=(",", ":"))
        # Harden the JSON island against a "</script>" breakout if program data ever
        # contains "<", ">" or "&" (json.dumps does not escape them). Escaping them as
        # \uXXXX keeps the text valid JSON (JSON.parse decodes it back transparently).
        data = (data.replace("&", "\\u0026").replace("<", "\\u003c")
                .replace(">", "\\u003e"))
        block += (f'\n<script id="m-data" type="application/json">{data}</script>'
                  f'\n<script src="/matcher.js" defer></script>')
    return block


def matcher_page(progs, leadgen, disclaimer):
    body = (f'<p><a href="/">← Alle Förderungen</a></p>'
            f'<h1>Förder-Matcher — finde passende Förderprogramme</h1>'
            f'<p>Du weißt nicht, welche der vielen Förderprogramme zu dir passen? '
            f'Drei Fragen genügen: Region, Vorhaben und Unternehmensgröße. '
            f'Der Matcher filtert aus {len(progs)} echten DACH- und EU-Programmen die '
            f'passenden heraus und verlinkt jeweils die offizielle Quelle.</p>'
            + matcher_block(progs, leadgen, embed_data=True))
    title = f"Förder-Matcher {date.today().year} — passende Förderung in 3 Fragen | {SITE_NAME}"
    meta = clip("Finde in 3 Fragen passende Förderprogramme für dein Vorhaben in DACH & EU — "
                "nach Region, Zweck und Unternehmensgröße, mit Link zur offiziellen Quelle.")
    return page(title, meta, body, BASE_URL + "/matcher.html")


def build(data_path: Path, out: Path, here: Path):
    db = json.loads(data_path.read_text(encoding="utf-8"))
    progs = db.get("programme", [])
    disclaimer = db.get("disclaimer", "Angaben ohne Gewähr — bitte offiziell prüfen.")
    lg_path = here / "leadgen.json"
    leadgen = json.loads(lg_path.read_text(encoding="utf-8")).get("links", {}) if lg_path.exists() else {}

    import shutil
    if out.exists():
        shutil.rmtree(out)
    (out / "programm").mkdir(parents=True)
    (out / "region").mkdir(parents=True)
    (out / "art").mkdir(parents=True)

    regions = sorted({p["region"] for p in progs if p.get("region")})
    arten = sorted({p["art"] for p in progs if p.get("art")})
    # Zielgruppen- und Bereichs-Hubs (nur ab 3 Programmen → keine dünnen Seiten).
    import collections
    zg_count = collections.Counter(z for p in progs for z in p.get("zielgruppe", []))
    br_count = collections.Counter(b for p in progs for b in p.get("bereich", []))
    zielgruppen = sorted([z for z, n in zg_count.items() if n >= 3])
    bereiche = sorted([b for b, n in br_count.items() if n >= 3])

    # Index with client-side filters
    reg_opts = "".join(f'<option value="{e(r)}">{e(REGION_NAME.get(r,r))}</option>' for r in regions)
    art_opts = "".join(f'<option value="{e(a)}">{e(a)}</option>' for a in arten)
    filt = (f'<div class="filter">'
            f'<input id="q" type="search" placeholder="Suchen (z. B. KI, Gründung, Energie)…" aria-label="Suche">'
            f'<select id="fr"><option value="">Alle Regionen</option>{reg_opts}</select>'
            f'<select id="fa"><option value="">Alle Arten</option>{art_opts}</select></div>')
    cards = "\n".join(card(p) for p in progs)
    reg_links = " · ".join(f'<a href="/region/{slug(r)}.html">{e(REGION_NAME.get(r,r))}</a>' for r in regions)
    art_links = " · ".join(f'<a href="/art/{slug(a)}.html">{e(a)}</a>' for a in arten)
    zg_links = " · ".join(f'<a href="/fuer/{slug(z)}.html">{e(z)}</a>' for z in zielgruppen)
    br_links = " · ".join(f'<a href="/bereich/{slug(b)}.html">{e(b)}</a>' for b in bereiche)
    matcher_teaser = (
        '<section class="matcher-teaser">'
        '<h2>Nicht sicher, was zu dir passt?</h2>'
        '<p>Drei Fragen — Region, Vorhaben, Unternehmensgröße — und der Förder-Matcher '
        'zeigt dir die passenden Programme aus dem Verzeichnis. Ohne Tracking, im Browser.</p>'
        '<p><a class="cta" href="/matcher.html">Zum Förder-Matcher →</a></p>'
        '</section>')
    home = (f'<h1>{len(progs)} Förderprogramme für den DACH-Raum</h1>'
            f'{matcher_teaser}'
            f'<p class="tag" style="color:var(--muted)">Nach Region: {reg_links} · Nach Art: {art_links}</p>'
            f'<p class="tag" style="color:var(--muted)">Für: {zg_links}</p>'
            f'<p class="tag" style="color:var(--muted)">Themen: {br_links}</p>'
            f'{filt}<p id="nores" hidden>Keine Treffer.</p>{cards}'
            f'<script src="/filter.js" defer></script>'
            f'<p class="disc">⚠️ {e(disclaimer)}</p>')
    (out / "index.html").write_text(
        page(f"{SITE_NAME} {date.today().year} — {TAGLINE}",
             clip(f"{len(progs)} Förderprogramme (Zuschuss, Kredit, Stipendium) für Gründer und "
                  f"KMU in DACH & EU, klar sortiert mit Link zur offiziellen Quelle."),
             home, BASE_URL + "/"), encoding="utf-8")

    for p in progs:
        (out / "programm" / f"{slug(p['id'])}.html").write_text(
            program_page(p, leadgen, disclaimer), encoding="utf-8")

    for r in regions:
        members = [p for p in progs if p.get("region") == r]
        body = (f'{itemlist(members)}<p><a href="/">← Alle Förderungen</a></p><h1>Förderungen in {e(REGION_NAME.get(r,r))}</h1>'
                + "\n".join(card(p) for p in members) + f'<p class="disc">⚠️ {e(disclaimer)}</p>')
        (out / "region" / f"{slug(r)}.html").write_text(
            page(f"Förderungen {REGION_NAME.get(r,r)} {date.today().year} — {SITE_NAME}",
                 clip(f"{len(members)} Förderprogramme (Zuschuss, Kredit, Stipendium) in "
                      f"{REGION_NAME.get(r,r)} für Gründer und KMU, klar sortiert."), body,
                 BASE_URL + f"/region/{slug(r)}.html"), encoding="utf-8")

    for a in arten:
        members = [p for p in progs if p.get("art") == a]
        body = (f'{itemlist(members)}<p><a href="/">← Alle Förderungen</a></p><h1>{e(a)}-Förderungen</h1>'
                + "\n".join(card(p) for p in members) + f'<p class="disc">⚠️ {e(disclaimer)}</p>')
        (out / "art" / f"{slug(a)}.html").write_text(
            page(f"{a}-Förderungen im DACH-Raum {date.today().year} — {SITE_NAME}",
                 clip(f"{len(members)} {a}-Förderprogramme für Gründer und KMU in DACH & EU, "
                      f"klar sortiert mit Link zur offiziellen Quelle."), body,
                 BASE_URL + f"/art/{slug(a)}.html"), encoding="utf-8")

    # Zielgruppen-Hubs ("Förderungen für Gründer/KMU/…")
    (out / "fuer").mkdir(exist_ok=True)
    for z in zielgruppen:
        members = [p for p in progs if z in p.get("zielgruppe", [])]
        body = (f'{itemlist(members)}<p><a href="/">← Alle Förderungen</a></p><h1>Förderungen für {e(z)}</h1>'
                f'<p class="tag" style="color:var(--muted)">{len(members)} Programme für {e(z)} in DACH & EU.</p>'
                + "\n".join(card(p) for p in members) + f'<p class="disc">⚠️ {e(disclaimer)}</p>')
        (out / "fuer" / f"{slug(z)}.html").write_text(
            page(f"Förderungen für {z} im DACH-Raum {date.today().year} — {SITE_NAME}",
                 clip(f"{len(members)} Förderprogramme für {z} in DACH & EU — Zuschuss, Kredit "
                      f"und mehr, klar sortiert."), body,
                 BASE_URL + f"/fuer/{slug(z)}.html"), encoding="utf-8")

    # Bereichs-Hubs ("KI-Förderung", "Digitalisierungs-Förderung", …)
    (out / "bereich").mkdir(exist_ok=True)
    for b in bereiche:
        members = [p for p in progs if b in p.get("bereich", [])]
        body = (f'{itemlist(members)}<p><a href="/">← Alle Förderungen</a></p><h1>{e(b)}-Förderungen</h1>'
                f'<p class="tag" style="color:var(--muted)">{len(members)} Programme im Bereich {e(b)}.</p>'
                + "\n".join(card(p) for p in members) + f'<p class="disc">⚠️ {e(disclaimer)}</p>')
        (out / "bereich" / f"{slug(b)}.html").write_text(
            page(f"{b}-Förderungen im DACH-Raum {date.today().year} — {SITE_NAME}",
                 clip(f"{len(members)} Förderprogramme im Bereich {b} für Gründer und KMU in "
                      f"DACH & EU, klar sortiert."), body,
                 BASE_URL + f"/bereich/{slug(b)}.html"), encoding="utf-8")

    # filter.js (no deps, no tracking)
    (out / "filter.js").write_text(FILTER_JS, encoding="utf-8")

    # Matcher-Seite + Matcher-JS (clientseitig, kein Tracking)
    (out / "matcher.html").write_text(
        matcher_page(progs, leadgen, disclaimer), encoding="utf-8")
    (out / "matcher.js").write_text(
        MATCHER_JS.replace("__LEAD_MAIL__", LEAD_MAIL), encoding="utf-8")

    # Legal pages (operator: Alleng Chour, abannews.com / Belp CH).
    imp = """<p><a href="/">← Startseite</a></p><h1>Impressum</h1>
<h2>Angaben gemäß § 5 TMG (DE) / § 14 UGB (AT) / OR (CH)</h2>
<p><strong>Förder-Radar</strong><br>Alleng Chour<br>Hühnerhubelstrasse 37<br>3123 Belp<br>Schweiz</p>
<h2>Kontakt</h2><p>E-Mail: <a href="mailto:hallo@abannews.com">hallo@abannews.com</a></p>
<h2>Haftung für Inhalte</h2><p>Die Förder-Informationen werden sorgfältig zusammengestellt, sind aber
unverbindlich und ohne Gewähr. Maßgeblich sind allein die Angaben der jeweiligen Förderträger. Für
externe Links ist der jeweilige Anbieter verantwortlich.</p>
<h2>Kennzeichnung</h2><p>Als „Anzeige" markierte Beratungs-/Partnerangebote sind bezahlte Platzierungen
bzw. Vermittlungslinks. Die redaktionelle Programm-Information ist davon unabhängig.</p>"""
    (out / "impressum.html").write_text(
        page(f"Impressum — {SITE_NAME}", "Impressum.", imp, BASE_URL + "/impressum.html"),
        encoding="utf-8")
    dat = f"""<p><a href="/">← Startseite</a></p><h1>Datenschutzerklärung</h1>
<h2>Verantwortlicher</h2><p>Alleng Chour, Hühnerhubelstrasse 37, 3123 Belp, Schweiz ·
<a href="mailto:hallo@abannews.com">hallo@abannews.com</a></p>
<h2>Allgemeines</h2><p>Diese Website ist statisch, ohne Nutzerkonten, ohne Tracking und ohne
Werbe-Cookies. Es werden nur technisch nötige Daten verarbeitet.</p>
<h2>Hosting</h2><p>Auslieferung über Cloudflare Pages (EU/Standardvertragsklauseln, AV-Vertrag nach Art. 28 DSGVO).</p>
<h2>Beratungs-/Partnerlinks</h2><p>Erst beim Klick auf einen als „Anzeige" markierten Link wirst du zum
Partner weitergeleitet, der dann nach seiner eigenen Datenschutzerklärung Daten verarbeitet.</p>
<h2>Deine Rechte</h2><p>Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch (Art. 15–21 DSGVO)
sowie Beschwerde bei einer Aufsichtsbehörde. Stand: {date.today().strftime('%m/%Y')}.</p>"""
    (out / "datenschutz.html").write_text(
        page(f"Datenschutz — {SITE_NAME}", "Datenschutzerklärung.", dat, BASE_URL + "/datenschutz.html"),
        encoding="utf-8")

    # sitemap + robots
    urls = ([BASE_URL + "/", BASE_URL + "/matcher.html"]
            + [BASE_URL + f"/programm/{slug(p['id'])}.html" for p in progs]
            + [BASE_URL + f"/region/{slug(r)}.html" for r in regions]
            + [BASE_URL + f"/art/{slug(a)}.html" for a in arten]
            + [BASE_URL + f"/fuer/{slug(z)}.html" for z in zielgruppen]
            + [BASE_URL + f"/bereich/{slug(b)}.html" for b in bereiche])
    today = date.today().isoformat()
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append(f"  <url><loc>{e(u)}</loc><lastmod>{today}</lastmod></url>")
    sm.append("</urlset>")
    (out / "sitemap.xml").write_text("\n".join(sm), encoding="utf-8")
    (out / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\n"
        "User-agent: PerplexityBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\n"
        f"Sitemap: {BASE_URL}/sitemap.xml\n", encoding="utf-8")

    # 404 (Cloudflare Pages serviert es automatisch bei unbekannten Pfaden)
    (out / "404.html").write_text(page(
        f"404 — Seite nicht gefunden | {SITE_NAME}",
        "Diese Seite gibt es nicht (mehr).",
        '<h1>404 — Seite nicht gefunden</h1>\n'
        '<p>Diese Seite gibt es nicht (mehr). Zur <a href="/">Übersicht aller '
        'Förderungen</a> oder direkt zum <a href="/matcher.html">Förder-Matcher</a>.</p>',
        BASE_URL + "/404.html"), encoding="utf-8")

    # _headers (Cloudflare Pages) — Security-Header für die Subdomain.
    # Strikte CSP ist sicher: nur externe same-origin Scripts (filter.js/matcher.js),
    # keine Inline-Scripts/Handler; nur Inline-Styles -> style-src 'unsafe-inline'.
    (out / "_headers").write_text(
        "/*\n"
        "  X-Frame-Options: DENY\n"
        "  X-Content-Type-Options: nosniff\n"
        "  Referrer-Policy: strict-origin-when-cross-origin\n"
        "  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()\n"
        "  Content-Security-Policy: default-src 'self'; script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; "
        "connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'\n",
        encoding="utf-8")

    total = (1 + 1 + len(progs) + len(regions) + len(arten)  # +1 index, +1 matcher
             + len(zielgruppen) + len(bereiche) + 2)  # +2 legal pages
    print(f"Built {total} pages ({len(progs)} programs, {len(regions)} regions, "
          f"{len(arten)} types, {len(zielgruppen)} audiences, {len(bereiche)} topics) → {out}/")
    return total


FILTER_JS = """// Förder-Radar — client-side filter (no deps, no tracking)
(function(){
  var q=document.getElementById('q'),fr=document.getElementById('fr'),fa=document.getElementById('fa');
  if(!q)return;
  var cards=[].slice.call(document.querySelectorAll('article.card')),no=document.getElementById('nores');
  function run(){
    var t=q.value.trim().toLowerCase(),r=fr.value,a=fa.value,n=0;
    cards.forEach(function(c){
      var ok=(!t||(c.dataset.s||'').indexOf(t)!==-1)&&(!r||c.dataset.region===r)&&(!a||c.dataset.art===a);
      c.style.display=ok?'':'none'; if(ok)n++;
    });
    if(no)no.hidden=n>0;
  }
  [q,fr,fa].forEach(function(el){el.addEventListener('input',run);});
})();
"""


MATCHER_JS = """// Förder-Radar — Matcher (3 Fragen, clientseitig, kein Tracking, kein Backend)
(function(){
  var node=document.getElementById('m-data'); if(!node)return;
  var DATA=[]; try{DATA=JSON.parse(node.textContent||'[]');}catch(e){return;}
  var REGION={DE:'Deutschland',AT:'Österreich',CH:'Schweiz',EU:'EU'};
  var $=function(id){return document.getElementById(id);};
  var fReg=$('m-region'),fZw=$('m-zweck'),fGr=$('m-groesse');
  var go=$('m-go'),reset=$('m-reset'),count=$('m-count'),res=$('m-results'),after=$('m-after');
  function esc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML;}
  function match(p){
    var reg=fReg.value,zw=fZw.value,gr=fGr.value;
    if(reg && p.region!==reg) return false;
    // 'sonstiges'/'egal' = Fallback-Buckets: keine Filterung auf dieser Dimension.
    if(zw && zw!=='sonstiges' && (p.z||[]).indexOf(zw)===-1) return false;
    if(gr && gr!=='egal' && (p.g||[]).indexOf(gr)===-1) return false;
    return true;
  }
  function badge(cls,txt){return '<span class="b '+cls+'">'+esc(txt)+'</span>';}
  function render(){
    var hits=DATA.filter(match);
    if(!fReg.value && !fZw.value && !fGr.value){
      count.hidden=true; res.innerHTML=''; after.hidden=true; reset.hidden=true; return;
    }
    reset.hidden=false;
    count.hidden=false;
    count.textContent=hits.length===0
      ? 'Keine Treffer für diese Kombination. Versuch eine breitere Auswahl (z. B. „Etwas anderes").'
      : hits.length+' passende Förderung'+(hits.length===1?'':'en')+' gefunden:';
    res.innerHTML=hits.map(function(p){
      return '<article class="card">'
        +'<h2 style="font-size:1.08rem;margin:0 0 4px"><a href="/programm/'+esc(p.id)+'.html">'+esc(p.name)+'</a></h2>'
        +'<div class="badges">'+badge('reg',REGION[p.region]||p.region)+badge('art',p.art)+'</div>'
        +'<p>'+esc(p.kurz)+'</p>'
        +'<p style="color:var(--muted);font-size:.85rem">Träger: '+esc(p.traeger||'—')+'</p>'
        +'<a class="cta" href="'+esc(p.url||'#')+'" target="_blank" rel="noopener nofollow">Offizielle Quelle ansehen →</a>'
        +' <a class="cta" style="background:transparent;color:var(--accent-h);border:1px solid var(--border)" href="/programm/'+esc(p.id)+'.html">Mehr Infos</a>'
        +'</article>';
    }).join('');
    // Lead-Anfrage erst zeigen, wenn der Funnel durchlaufen wurde.
    after.hidden=false;
  }
  go.addEventListener('click',render);
  [fReg,fZw,fGr].forEach(function(s){s.addEventListener('change',function(){
    if(!count.hidden) render();
  });});
  reset.addEventListener('click',function(){
    fReg.value='';fZw.value='';fGr.value='';
    count.hidden=true;res.innerHTML='';after.hidden=true;reset.hidden=true;
  });

  // Lead-Formular: baut einen mailto-Link (kein Backend, kein Tracking).
  var form=$('m-lead');
  if(form){
    form.addEventListener('submit',function(ev){
      ev.preventDefault();
      var hint=$('m-hint');
      if(!$('m-ok').checked){
        hint.hidden=false; hint.style.color='var(--accent-h)';
        hint.textContent='Bitte bestätige kurz die Einwilligung, dann bereiten wir die E-Mail vor.';
        return;
      }
      var msg=($('m-msg').value||'').trim();
      var ctx='Region: '+(REGION[fReg.value]||fReg.value||'—')
        +' | Vorhaben: '+(fZw.options[fZw.selectedIndex]?fZw.options[fZw.selectedIndex].text:'—')
        +' | Größe: '+(fGr.options[fGr.selectedIndex]?fGr.options[fGr.selectedIndex].text:'—');
      var body='Hallo Aban-Team,\\n\\nich suche passende Förderungen.\\n'+ctx
        +'\\n\\nMein Vorhaben:\\n'+(msg||'(bitte ergänzen)')+'\\n\\nDanke!';
      var href='mailto:__LEAD_MAIL__?subject='+encodeURIComponent('Förder-Anfrage über den Matcher')
        +'&body='+encodeURIComponent(body);
      hint.hidden=false; hint.style.color='var(--success)';
      hint.innerHTML='Dein E-Mail-Programm öffnet sich. Falls nicht: schreib direkt an '
        +'<a href="mailto:__LEAD_MAIL__">__LEAD_MAIL__</a>.';
      window.location.href=href;
    });
  }
})();
"""


def main():
    here = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(here / "foerderungen.json"))
    ap.add_argument("--out", default=str(here / "dist"))
    args = ap.parse_args()
    build(Path(args.data), Path(args.out), here)


if __name__ == "__main__":
    main()
