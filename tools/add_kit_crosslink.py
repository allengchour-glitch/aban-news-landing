#!/usr/bin/env python3
# Kontextueller Link von ki-fuer-<branche>-Seiten zum passenden Shop-Kit (12 CHF,
# gleiche Branche) — wandelt Content-Leser in Kaeufer. Idempotent (data-aban-kit).
import re, glob, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "data-aban-kit"
# kit-slug -> passende ki-fuer-<alias>-Seiten (hochpraezise, nur klare Treffer)
KIT2BRANCH = {
 "aerzte": (["aerzte","zahnaerzte"], "Ärzte & Praxen"),
 "handwerker": (["handwerker","handwerk"], "Handwerk"),
 "steuerberater": (["steuerberater"], "Steuerberatung"),
 "anwaelte": (["anwaelte"], "Kanzleien"),
 "gastronomie": (["gastronomie"], "Gastronomie"),
 "coaches": (["coaches"], "Coaches & Berater"),
 "immobilienmakler": (["immobilienmakler"], "Immobilienmakler"),
 "friseure": (["friseure"], "Friseure & Salons"),
 "fotografen": (["fotografen","hochzeitsfotografen"], "Fotografen"),
 "architekten": (["architekten"], "Architekturbüros"),
 "fitnessstudios": (["fitnessstudios"], "Fitnessstudios"),
 "kosmetikstudios": (["kosmetikstudios","nagelstudios"], "Kosmetik- & Nagelstudios"),
 "kfz-werkstaetten": (["kfz-werkstaetten","motorradwerkstatt"], "KFZ-Werkstätten"),
 "maler": (["maler"], "Maler & Lackierer"),
 "hotels": (["hotels"], "Hotels & Pensionen"),
 "physiotherapeuten": (["physiotherapeuten","physiotherapie"], "Physiotherapie-Praxen"),
 "reinigungsfirmen": (["reinigungsfirmen","industriereinigung"], "Reinigungsfirmen"),
 "garten-landschaftsbau": (["garten-landschaftsbau","gartenpflege"], "Garten- & Landschaftsbau"),
 "goldschmiede": (["goldschmiede"], "Goldschmiede & Juweliere"),
}
def block(slug, label):
    return ('<aside data-aban-kit style="max-width:760px;margin:22px auto;padding:14px 16px;'
            'background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #d97706;border-radius:12px;'
            'font-size:.95rem;line-height:1.5"><strong>Direkt loslegen?</strong> Das fertige '
            f'<a href="/shop.html#kit-{slug}" style="color:#b45309;font-weight:700">KI-Starter-Kit für {label}</a> '
            '— Spickzettel, erprobte Prompts &amp; Datenschutz-Checkliste, einmalig 12 CHF.</aside>\n')
def main():
    n=0
    for slug,(aliases,label) in KIT2BRANCH.items():
        for a in aliases:
            p=os.path.join(ROOT,f"ki-fuer-{a}.html")
            if not os.path.isfile(p): continue
            h=open(p,encoding="utf-8",errors="ignore").read()
            if MARK in h: continue
            if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex',h,re.I): continue
            # vor der FAQ ("Häufige Fragen") einfügen, sonst vor </body>
            m=re.search(r'<h2[^>]*>\s*Häufige Fragen', h, re.I)
            pos = m.start() if m else h.lower().rfind("</body>")
            if pos<0: continue
            open(p,"w",encoding="utf-8").write(h[:pos]+block(slug,label)+h[pos:]); n+=1
    print(f"✔ Kit-Crosslink auf {n} Branchen-Seiten")
main()
