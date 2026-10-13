#!/usr/bin/env python3
"""editor_rueckgabe_satz.py — Editor-Produkte nennen den Rückgabe-Ausschluss im Text (13.10.2026, Kauf-Strecke Klasse 7).

ANLASS (dropship/KAUFSTRECKE-SEITEN-2026-10-13.md, Klasse 7): Die Rückgaberichtlinie schliesst «nach deinen Wünschen gestaltete
Artikel» aus. Die Seite versprach trotzdem überall «30 Tage Rückgabe» (Leiste, Akkordeon, Warenkorb — seit 13.10. im Theme mit
Bedingung `product.description contains 'lspod-designer'` gelöst). 26 von 31 Editor-Produkten nannten den Ausschluss im Text
(Kasten `ls-pod-retoure`), 5 nicht (Kissen, Mauspad, Strandtuch, Spiral-Notizbuch, Kuscheldecke); gemessen 13.10. 22:30 UTC
waren es 6 aktive (dazu die transparente iPhone-Hülle).

Hängt bei Editor-Produkten OHNE Ausschluss-Satz denselben Kasten ans Textende — der Editor-Block (div.lspod-designer + Skript)
bleibt unberührt; Rücklesen prüft, dass er byte-gleich drinsteht. Danach IMMER `node automation/pod_editor_qa.mjs` (0 Befunde).
Werbetest-Sperre und Aurora werden ausgelassen. Rückweg: alter Text je Produkt in dropship/_editor_rueckgabe_satz_alt.jsonl.

    python3 automation/editor_rueckgabe_satz.py            # Trockenlauf (zeigt nur)
    python3 automation/editor_rueckgabe_satz.py --scharf   # schreiben + zurücklesen
    python3 automation/editor_rueckgabe_satz.py --zurueck  # alte Texte aus dem Ledger zurückschreiben
Wächter: automation/versprechen_wache.py zählt «EDITOR-RÜCKGABE» (Theme-Bedingung + Produkte ohne Satz) täglich.
"""
import hashlib
import json
import os
import re
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_editor_rueckgabe_satz.tsv")
ALT = os.path.join(REPO, "dropship", "_editor_rueckgabe_satz_alt.jsonl")
AUSNAHMEN = {"gid://shopify/Product/15422934647169"}   # Aurora = Google-Ads-Testprodukt
MARKER = "lspod-designer"
# Satz, an dem ein vorhandener Ausschluss erkannt wird (Kasten der übrigen 26) — dieselben Zeichenfolgen prüft der Wächter.
HAT_SATZ = ("ls-pod-retoure", "Rückgabe aus Meinungsänderung")
KASTEN = ('\n<div class="ls-pod-retoure" style="background:#fff7e6;border-left:3px solid #e0a300;border-radius:4px;padding:9px 12px;'
          'margin:12px 0;font-size:14px;line-height:1.5;">↩️ <strong>Rückgabe bei personalisierter Ware:</strong> Jedes Stück wird '
          'eigens nach deinem Entwurf gedruckt und lässt sich deshalb nicht weiterverkaufen — eine Rückgabe aus Meinungsänderung ist '
          'darum ausgeschlossen. Bei Druckfehlern, Beschädigung oder falscher Lieferung ersetzen wir es selbstverständlich. '
          '<a href="/policies/refund-policy">Rückgaberichtlinie</a>\n</div>')
SUCHEN = ["tag:printful_personalized_product", "tag:prodigi_personalized_product", "tag:selbst-gestalten", "lspod-designer",
          "title:*gestalten*"]


def ist_editor(html):
    return MARKER in (html or "")


def hat_satz(html):
    return any(s in (html or "") for s in HAT_SATZ)


def editor_block(html):
    """Der heilige Teil: div.lspod-designer … + Skript-Tag. Muss nach dem Schreiben gleich sein."""
    return re.findall(r'<div class="lspod-designer"[^>]*></div>|<script[^>]*lspod-designer[^>]*></script>', html or "")


def kandidaten():
    gef = {}
    for q in SUCHEN:
        nach = None
        while True:
            d = gql('query($q:String!,$a:String){products(first:100,after:$a,query:$q){pageInfo{hasNextPage endCursor} '
                    'nodes{id handle title status descriptionHtml}}}', {"q": f"status:active AND ({q})", "a": nach})["products"]
            for p in d["nodes"]:
                if p["status"] == "ACTIVE" and ist_editor(p["descriptionHtml"]):
                    gef[p["id"]] = p
            if not d["pageInfo"]["hasNextPage"]:
                break
            nach = d["pageInfo"]["endCursor"]
    return gef


def zurueck():
    n = 0
    for z in open(ALT, encoding="utf-8"):
        o = json.loads(z)
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{id} userErrors{message}}}",
                {"p": {"id": o["id"], "descriptionHtml": o["alt"]}})["productUpdate"]
        print(o["handle"], "zurück" if not r["userErrors"] else r["userErrors"])
        n += not r["userErrors"]
    print(f"ZURÜCK: {n}")


def main():
    if "--zurueck" in sys.argv:
        return zurueck()
    scharf = "--scharf" in sys.argv
    try:
        from werbetest_sperre import gesperrt
    except Exception:  # noqa: BLE001
        def gesperrt(_):
            return False
    gef = kandidaten()
    offen = [p for p in gef.values() if not hat_satz(p["descriptionHtml"])]
    print(f"Editor-Produkte aktiv: {len(gef)} · ohne Ausschluss-Satz: {len(offen)}")
    ok = fehl = 0
    for p in sorted(offen, key=lambda x: x["handle"]):
        if p["id"] in AUSNAHMEN or gesperrt(p["id"]) or gesperrt(p["handle"]):
            print(f"  übersprungen (Sperre/Aurora): {p['handle']}")
            continue
        alt = p["descriptionHtml"]
        neu = alt.rstrip() + KASTEN
        print(f"  {'SCHREIBE' if scharf else '[DRY]'} {p['handle']}  ({len(alt)} → {len(neu)} Zeichen)")
        if not scharf:
            continue
        with open(ALT, "a", encoding="utf-8") as f:
            f.write(json.dumps({"zeit": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "id": p["id"], "handle": p["handle"],
                                "alt": alt}, ensure_ascii=False) + "\n")
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{descriptionHtml} userErrors{message}}}",
                {"p": {"id": p["id"], "descriptionHtml": neu}})["productUpdate"]
        got = (r.get("product") or {}).get("descriptionHtml") or ""
        gut = not r["userErrors"] and hat_satz(got) and editor_block(got) == editor_block(alt) and ist_editor(got)
        ok += gut
        fehl += not gut
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), p["id"], p["handle"],
                               hashlib.md5(alt.encode()).hexdigest(), str(len(alt)), "ok" if gut else f"FEHLER {r['userErrors']}"]) + "\n")
    if scharf:
        print(f"FERTIG: {ok} ergänzt, {fehl} Fehler — jetzt node automation/pod_editor_qa.mjs (0 Befunde Pflicht)")
    return 1 if fehl else 0


if __name__ == "__main__":
    sys.exit(main() or 0)
