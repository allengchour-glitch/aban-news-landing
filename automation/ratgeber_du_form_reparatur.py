#!/usr/bin/env python3
"""Reparatur für Ratgeber/Seiten, die vor Regel 2h geduzt wurden (22.09.2026): «So tragen du» → «So trägst du»,
«– hören du auf dich» → «– hör auf dich». Liest jeden Eintrag aus dropship/_ratgeber_du_form_done.txt, wendet
um() erneut an (Regel 2h wirkt auf schon geduzte Texte), dazu Imperative nach Gedankenstrich/Doppelpunkt;
schreibt nur, wenn sich etwas ändert UND kein Warnmuster anschlägt; liest zurück.  DRY=1 zeigt nur.
"""
import os, re, sys, time
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from kollektionstexte_du_form import um  # noqa: E402
from produkttexte_du_form import WARN, WARN4, warn2, warn3, gql, text  # noqa: E402
from produkttexte_du_form_reparatur import saetze, _satz  # noqa: E402  (Satzanfang «Xst du» → Imperativ, «und Xst du» → «und X-e»)
DRY = os.environ.get("DRY") == "1"
LEDGER = os.path.join(REPO, "dropship", "_ratgeber_du_form_done.txt")
IMP = {'hören': 'hör', 'schauen': 'schau', 'nehmen': 'nimm', 'lassen': 'lass', 'geben': 'gib', 'lesen': 'lies', 'sehen': 'sieh', 'halten': 'halt', 'gönnen': 'gönn', 'werfen': 'wirf'}


def imp(v):
    if v in IMP: return IMP[v]
    if v.endswith('eln'): return v[:-3] + 'le'
    if v.endswith('ern'): return v[:-1] + 'e'
    return v[:-2] + 'e' if v.endswith('en') else v


def repariere(html_):
    # Imperativ nach Gedankenstrich/Doppelpunkt/Bindestrich: «– hören du auf dich» → «– hör auf dich»
    t = re.sub(r'(?<=[–—:\-] )([a-zäöüß]{3,}(?:en|ern|eln)) du (dich|dir)\b', lambda m: imp(m.group(1)) + ' ' + m.group(2), html_)
    t = re.sub(r'(?<=[–—:\-] )([a-zäöüß]{3,}(?:en|ern|eln)) du\b', lambda m: imp(m.group(1)), t)
    return saetze(um(saetze(t, _satz)), _satz)


def main():
    keys = [z.split("\t")[0] for z in open(LEDGER) if z.strip()]
    n_ok = n_warn = n_same = n_err = 0
    for key in keys:
        typ, h = key.split(":")
        nodes = gql('{%s(first:1,query:"handle:%s"){nodes{id body}}}' % (typ, h))["data"][typ]["nodes"]
        if not nodes: continue
        alt = nodes[0]["body"] or ""; neu = repariere(alt)
        if neu == alt: n_same += 1; continue
        tn = text(neu); m = WARN.search(tn) or warn2(tn) or warn3(tn) or WARN4.search(tn)
        if m: n_warn += 1; print(f"  WARN {key}: {m.group(0)[:60]}"); continue
        if DRY: n_ok += 1; print(f"  [DRY] {key}"); continue
        mut, feld, typname = ("articleUpdate", "article", "HTML!") if typ == "articles" else ("pageUpdate", "page", "String!")
        r = gql('mutation($id:ID!,$b:%s){%s(id:$id,%s:{body:$b}){%s{id} userErrors{message}}}' % (typname, mut, feld, feld), {"id": nodes[0]["id"], "b": neu})
        pu = (r.get("data") or {}).get(mut) or {}
        back = ((gql('query($id:ID!){node(id:$id){... on Article{body} ... on Page{body}}}', {"id": nodes[0]["id"]}).get("data") or {}).get("node") or {}).get("body")
        if pu.get("userErrors") or back != neu: n_err += 1; print(f"  FEHLER {key}: {pu.get('userErrors')}"); continue
        n_ok += 1
        time.sleep(0.3)
    print(f"REPARATUR: {n_ok} {'reparierbar' if DRY else 'repariert'} · {n_warn} Warnung · {n_same} unverändert · {n_err} Fehler")


if __name__ == "__main__":
    main()
