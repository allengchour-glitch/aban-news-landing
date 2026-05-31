#!/usr/bin/env python3
"""Ein-Befehl-Gesundheitscheck für die aban-news-Site.

Bündelt alle Prüfungen, die sonst von Hand laufen:
  - jede JSON-LD parst
  - keine kaputten root-relativen internen Links
  - sitemap.xml & archive.rss sind valides XML
  - data/tools.json & data/glossary.json sind valides JSON
  - <img>-Hygiene: alt + loading vorhanden (Warnung)
  - hreflang-Cluster auf den i18n-Seiten konsistent (Warnung)

    python3 automation/validate_site.py
Exit: 0 = ok (Warnungen erlaubt), 1 = harte Fehler. CI-tauglich.
"""
import glob
import json
import os
import re
import sys
import xml.dom.minidom
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

errors, warnings = [], []
LD = re.compile(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', re.S)
LINK = re.compile(r'(?:href|src)="(/[^"#?]+)"')
IMG = re.compile(r'<img\b[^>]*>', re.S)


def html_files():
    for f in glob.glob("**/*.html", recursive=True):
        if f.startswith((".git", "node_modules")):
            continue
        yield f


def check_jsonld():
    n = 0
    for f in html_files():
        for m in LD.findall(open(f, encoding="utf-8", errors="ignore").read()):
            n += 1
            try:
                json.loads(m)
            except json.JSONDecodeError as e:
                errors.append(f"JSON-LD ungültig in {f}: {e}")
    print(f"  JSON-LD-Blöcke geprüft: {n}")


def resolves(p):
    p = p.lstrip("/")
    return any(os.path.exists(c) for c in
               [p, p + ".html", os.path.join(p, "index.html"),
                p.rstrip("/") + "/index.html"])


def check_links():
    broken = {}
    for f in html_files():
        if "/data/" in f or f.startswith("data/"):
            continue
        for h in LINK.findall(open(f, encoding="utf-8", errors="ignore").read()):
            if not resolves(h):
                broken.setdefault(h, set()).add(f)
    for h, fs in broken.items():
        errors.append(f"kaputter interner Link {h} (z.B. {sorted(fs)[0]})")
    print(f"  interne Links: {'ok' if not broken else str(len(broken))+' kaputt'}")


def check_xml(path):
    if not os.path.exists(path):
        warnings.append(f"{path} fehlt")
        return
    try:
        xml.dom.minidom.parse(path)
        print(f"  {path}: valides XML")
    except Exception as e:
        errors.append(f"{path} kein valides XML: {e}")


def check_json(path):
    try:
        d = json.load(open(path, encoding="utf-8"))
        key = "tools" if "tools" in d else "entries" if "entries" in d else None
        print(f"  {path}: valides JSON ({len(d[key]) if key else '?'} Einträge)")
    except Exception as e:
        errors.append(f"{path} kein valides JSON: {e}")


def check_images():
    no_alt = no_lazy = total = 0
    for f in html_files():
        for tag in IMG.findall(open(f, encoding="utf-8", errors="ignore").read()):
            if "${" in tag:  # JS-Template
                continue
            total += 1
            if "alt=" not in tag:
                no_alt += 1
                warnings.append(f"<img> ohne alt in {f}")
            if "loading=" not in tag:
                no_lazy += 1
    print(f"  <img>: {total} · ohne alt: {no_alt} · ohne loading: {no_lazy}")
    if no_lazy:
        warnings.append(f"{no_lazy} <img> ohne loading-Attribut")


def check_hreflang():
    for slug in ("beratung", "produkte", "transparenz"):
        for pre in ("", "en/", "fr/", "it/"):
            p = f"{pre}{slug}.html"
            if not os.path.exists(p):
                continue
            head = open(p, encoding="utf-8").read().split("</head>")[0]
            c = head.count('<link rel="alternate" hreflang=')
            if c != 5:
                warnings.append(f"hreflang: {p} hat {c} statt 5 <link> im <head>")
    print("  hreflang-Cluster geprüft (i18n-Geld-Seiten)")


def main():
    print("aban news — Site-Validierung")
    check_jsonld()
    check_links()
    check_xml("sitemap.xml")
    check_xml("archive.rss")
    check_json("data/tools.json")
    check_json("data/glossary.json")
    check_images()
    check_hreflang()
    if warnings:
        print(f"\n⚠️  {len(warnings)} Warnungen (z.B.):")
        for w in warnings[:15]:
            print("   -", w)
        if len(warnings) > 15:
            print(f"   … und {len(warnings)-15} weitere")
    if errors:
        print(f"\n❌ {len(errors)} FEHLER:")
        for e in errors:
            print("   -", e)
        return 1
    print("\n✅ Alles grün — keine harten Fehler.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
