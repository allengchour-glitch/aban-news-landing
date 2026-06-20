#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — i18n-Sync-/QA-Bot (stdlib, deterministisch, KEY-LOS).

Hält die Mehrsprachigkeit (DE/EN/FR/IT) synchron + prüft Qualität. Für CI/Cron gedacht.

Prüft je „Seiten-Familie" (gleicher logischer Pfad über die Sprach-Verzeichnisse):
  - hreflang-Reziprozität (jede vorhandene Sprachversion listet alle Geschwister + x-default)
  - Sitemap-Vollständigkeit (jede Seite in sitemap.xml)
  - Struktur: lang-Attribut, og:locale, JSON-LD inLanguage passend zur Sprache
  - og:image vorhanden
  - Sprach-Leftover-Heuristik (deutsche Funktionswörter in sichtbarem FR/IT-Text + JSON-LD)
  - Orphans (Seite nirgends intern verlinkt)

  python3 tools/i18n_audit.py            # nur prüfen, Exit!=0 bei harten Problemen
  python3 tools/i18n_audit.py --fix      # deterministische Fixes (hreflang + sitemap) anwenden
"""
import argparse, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

LANGS = [("de", ""), ("en", "en/"), ("fr", "fr/"), ("it", "it/")]
LOCALE = {"de": "de_DE", "en": "en_GB", "fr": "fr_FR", "it": "it_IT"}
# Gültige og:locale je Sprache (en_US + en_GB beide ok für ältere EN-Seiten):
LOCALE_OK = {"de": {"de_DE"}, "en": {"en_GB", "en_US"}, "fr": {"fr_FR"}, "it": {"it_IT"}}
PREFIXES = ("en/", "fr/", "it/")
# Verzeichnisse, die NICHT zur abannews-Mehrsprachigkeit gehören (andere Workstreams / Nicht-Seiten):
SKIP_DIR = ("dropship/", "video-prototypes/", "aban-studio/", "node_modules/", "dist/",
            "pod/", "mediakit/", "reels/", "social/", "designs/", "_site/", "data/", "functions/")
# Seiten, die bewusst NICHT mehrsprachig sind (kein „fehlt"-Alarm):
SKIP_BASENAME = {"index.html", "danke-kit.html"}
BASE = "https://abannews.com"

# Hochpräzise deutsche Funktionswörter (keine markennahen Nomen → wenig False-Positives):
DE_MARKERS = re.compile(r'\b(und|für|mit|oder|deine|dein|nicht|ohne|wird|möchtest|'
                        r'bessere Wahl|du bist|deinen|deiner)\b')


def lang_of(path):
    for code, pre in LANGS:
        if pre and path.startswith(pre):
            return code
    return "de"


def logical_of(path):
    for pre in PREFIXES:
        if path.startswith(pre):
            return path[len(pre):]
    return path


def all_pages():
    out = []
    for p in glob.glob("**/*.html", recursive=True):
        rp = p.replace(os.sep, "/")
        if any(rp.startswith(d) or ("/" + d) in ("/" + rp) for d in SKIP_DIR):
            continue
        out.append(rp)
    return out


def hreflang_block(logical, present_langs):
    lines = []
    for code in ("de", "en", "fr", "it"):
        if code in present_langs:
            pre = "" if code == "de" else code + "/"
            lines.append(f'<link rel="alternate" hreflang="{code}" href="{BASE}/{pre}{logical}">')
    xd = "de" if "de" in present_langs else next(iter(present_langs))
    xdpre = "" if xd == "de" else xd + "/"
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{BASE}/{xdpre}{logical}">')
    return "\n".join(lines)


def _strip_urls(s):
    # URLs + Datei-Slugs entfernen (Slugs wie geld-und-ki.html enthalten dt. Wörter, sind aber Dateinamen):
    s = re.sub(r'https?://[^\s"\'<>]+', ' ', s)
    s = re.sub(r'\b[\w-]+\.html\b', ' ', s)
    return s


def visible(s):
    s = re.sub(r'(?is)<script.*?</script>', ' ', s)
    s = re.sub(r'(?is)<style.*?</style>', ' ', s)
    s = re.sub(r'(?is)<head.*?</head>', ' ', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    return _strip_urls(re.sub(r'\s+', ' ', s))


def jsonld(s):
    blocks = " ".join(re.findall(r'(?is)<script type="application/ld\+json">(.*?)</script>', s))
    return _strip_urls(blocks)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--fix", action="store_true", help="deterministische Fixes anwenden (hreflang + sitemap)")
    args = ap.parse_args()

    pages = all_pages()
    fam = {}                       # logical -> {lang: path}
    for p in pages:
        fam.setdefault(logical_of(p), {})[lang_of(p)] = p

    sitemap = open("sitemap.xml", encoding="utf-8").read() if os.path.exists("sitemap.xml") else ""
    hard = []      # blockierende Probleme
    warn = []      # Hinweise (keine harten Fehler)
    hreflang_fixed = sitemap_added = 0
    sm_add = []

    for logical, bylang in sorted(fam.items()):
        base = os.path.basename(logical)
        multilingual = len(bylang) > 1
        present = set(bylang)
        block = hreflang_block(logical, present) if multilingual else None

        for code, path in bylang.items():
            s = open(path, encoding="utf-8", errors="ignore").read()

            # --- Struktur ---
            if f'<html lang="{code}"' not in s and not (code == "de" and '<html lang="de"' in s):
                if f'lang="{code}"' not in s.split(">", 2)[0] + s[:400]:
                    if f'<html lang="{code}"' not in s:
                        hard.append(f"{path}: lang-Attribut != {code}")
            m = re.search(r'og:locale" content="([^"]+)"', s)
            if m and m.group(1) not in LOCALE_OK[code]:
                hard.append(f"{path}: og:locale {m.group(1)} ungültig für {code}")
            mj = re.search(r'"inLanguage":"([^"]+)"', s)
            if mj and not (mj.group(1) == code or mj.group(1).lower().startswith(code + "-")):
                hard.append(f"{path}: JSON-LD inLanguage {mj.group(1)} != {code}")
            if 'property="og:image"' not in s and base not in ("maerkte.html",):
                warn.append(f"{path}: kein og:image")

            # --- hreflang-Reziprozität (nur mehrsprachige Familien) ---
            if multilingual and base not in SKIP_BASENAME:
                ok = all(f'hreflang="{c}"' in s and f'/{("" if c=="de" else c+"/")}{logical}"' in s
                         for c in present)
                if not ok:
                    if args.fix:
                        s2 = re.sub(r'(\n[ \t]*<link rel="alternate" hreflang="[^"]+" href="[^"]*"\s*/?>)+',
                                    "\n" + block, s, count=1)
                        if 'rel="alternate" hreflang=' not in s2:
                            mm = re.search(r'(<link rel="canonical"[^>]*>)', s2)
                            if mm:
                                s2 = s2[:mm.end()] + "\n" + block + s2[mm.end():]
                        if s2 != s:
                            open(path, "w", encoding="utf-8").write(s2); s = s2; hreflang_fixed += 1
                        else:
                            warn.append(f"{path}: hreflang nicht auto-fixbar (kein canonical/Anker) — manuell")
                    else:
                        hard.append(f"{path}: hreflang unvollständig (soll {sorted(present)})")

            # --- Sitemap-Vollständigkeit (nur mehrsprachige Familien = i18n-Scope) ---
            if base not in SKIP_BASENAME and multilingual:
                url = f"{BASE}/{path}"
                if url not in sitemap:
                    if args.fix:
                        sm_add.append(url)
                    else:
                        hard.append(f"{path}: fehlt in sitemap.xml")

            # --- Sprach-Leftover (nur FR/IT: deutsche Marker) ---
            if code in ("fr", "it"):
                if DE_MARKERS.search(visible(s)) or DE_MARKERS.search(jsonld(s)):
                    warn.append(f"{path}: möglicher Deutsch-Rest (Übersetzung prüfen)")

    # Sitemap-Fixes schreiben
    if args.fix and sm_add:
        for u in sm_add:
            if u not in sitemap:
                sitemap = sitemap.replace(
                    "</urlset>",
                    f'  <url><loc>{u}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n</urlset>')
                sitemap_added += 1
        open("sitemap.xml", "w", encoding="utf-8").write(sitemap)

    # Orphans (nur mehrsprachige Seiten, die nirgends verlinkt sind)
    hrefs = set()
    for p in pages:
        for h in re.findall(r'href="(/[^"#?]+\.html)"', open(p, encoding="utf-8", errors="ignore").read()):
            hrefs.add(h.lstrip("/"))
    for logical, bylang in fam.items():
        for code, path in bylang.items():
            if os.path.basename(path) in SKIP_BASENAME:
                continue
            if len(bylang) > 1 and path not in hrefs:
                warn.append(f"{path}: Orphan (nirgends intern verlinkt)")

    print(f"== i18n-Audit ==  Familien: {len(fam)}  Seiten: {len(pages)}")
    if args.fix:
        print(f"  Fixes: hreflang normalisiert={hreflang_fixed}, sitemap +{sitemap_added}")
    print(f"  HARTE Probleme: {len(hard)} | Hinweise: {len(warn)}")
    for x in hard[:60]:
        print("  ✗", x)
    for x in warn[:40]:
        print("  ·", x)
    if len(warn) > 40:
        print(f"  · … +{len(warn)-40} weitere Hinweise")
    return 1 if hard else 0


if __name__ == "__main__":
    sys.exit(main())
