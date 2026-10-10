#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""lieferblock_li.py — Lieferzeit-Kasten im Produkttext nennt wieder Liechtenstein (10.10.2026).

ANLASS: Liechtenstein ist seit 09.10. Lieferland (Markt «Switzerland» = [CH, LI], Zone CHF 14.90). Der Kasten
`<p class="ls-liefer" data-tier="…">📦 Lieferzeit Schweiz: … · Versand nur in die Schweiz</p>` stand am 10.10. in
458 von 52'348 aktiven Produkten (Voll-Export 06:39). Herkunft: `liechtenstein_raus.py` (22.09., Weg B) hatte
«und nach Liechtenstein» aus 5'739 Texten gestrichen, und `versand_jenachland.py` schrieb den Satz ohne LI weiter.
Der Importer-Baustein (`delivery_block.mjs`) sagt bereits «Versand nur in die Schweiz und nach Liechtenstein» —
genau diese Form stellt das Werkzeug her, damit im Shop EINE Formulierung steht.

WAS ES ANFASST: nur den einen `<p class="ls-liefer">`-Kasten; darin «Versand nur in die Schweiz» ohne LI-Zusatz.
Ein «nur … Schweiz»-Satz AUSSERHALB des Kastens wird gemeldet, nicht geschrieben (Handarbeit, Kontext lesen).
Der Text kommt unmittelbar vor dem Schreiben LIVE (Lehre 15.08.: ein Export ist eine Kandidatenliste, keine
Textbasis) und unter dem gemeinsamen Produkttext-Schloss `/tmp/lock_produkttext.lock`.

    python3 automation/lieferblock_li.py --kanarien
    python3 automation/lieferblock_li.py --export DATEI.jsonl           # Trockenlauf über einen Voll-Export
    python3 automation/lieferblock_li.py --export DATEI.jsonl --scharf  # schreiben
    TAGE=2 python3 automation/lieferblock_li.py --scharf               # Wächter: zuletzt geänderte Produkte (Aufseher, täglich)
Ledger: dropship/_lieferblock_li.tsv (Zeit, Produkt-ID, Handle).
"""
import fcntl
import json
import os
import re
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

ALT = re.compile(r"Versand nur in die Schweiz(?! und nach Liechtenstein)")
NEU = "Versand nur in die Schweiz und nach Liechtenstein"
KASTEN = re.compile(r'<p class="ls-liefer"[^>]*>.*?</p>', re.S)
NUR_CH = re.compile(r"(ausschliesslich|nur)\s+(nach|in die|innerhalb der|in der)\s+(<strong>)?Schweiz(?!\s+und\s+nach\s+Liechtenstein)", re.I)
LEDGER = os.path.join(REPO, "dropship", "_lieferblock_li.tsv")


def heilen(html):
    """→ (neuer Text, Zahl ersetzter Kästen, Zahl «nur CH»-Sätze ausserhalb des Kastens)."""
    n = 0

    def im_kasten(m):
        nonlocal n
        neu, k = ALT.subn(NEU, m.group(0))
        n += k
        return neu
    neu = KASTEN.sub(im_kasten, html or "")
    draussen = len(NUR_CH.findall(KASTEN.sub("", neu)))
    return neu, n, draussen


def kanarien():
    k = ('<p class="ls-liefer" data-tier="china" style="x">📦 <strong>Lieferzeit</strong> Schweiz: <strong>10–20 Werktage'
         '</strong> <span style="opacity:.7;">· Direktversand ab Lieferantenlager · Versand nur in die Schweiz</span></p>')
    faelle = [
        (k + "<p>Text</p>", 1, 0, NEU),
        (k.replace("Versand nur in die Schweiz", NEU), 0, 0, NEU),                       # schon richtig: nichts doppelt
        ("<p>Wir liefern nur in die Schweiz.</p>", 0, 1, "nur in die Schweiz."),          # ausserhalb: melden, nicht schreiben
        (k + "<p>Versand nur in die Schweiz</p>", 1, 1, NEU),                            # Kasten ja, Fliesstext nein
        ('<p class="ls-liefer" data-tier="pod">Druck auf Bestellung · Versand nur in die Schweiz</p>', 1, 0, NEU),
    ]
    f = 0
    for html, n_soll, d_soll, muss in faelle:
        neu, n, d = heilen(html)
        if n != n_soll or d != d_soll or muss not in neu or "Liechtenstein und nach Liechtenstein" in neu or neu.count(NEU) > max(1, n_soll + html.count(NEU)):
            f += 1
            print("  ✗", html[:70], n, d)
    print(f"LIEFERBLOCK-LI-KANARIEN {len(faelle) - f}/{len(faelle)}")
    return f == 0


def kandidaten_export(pfad):
    out = []
    for z in open(pfad, encoding="utf-8"):
        d = json.loads(z)
        h = d.get("descriptionHtml") or ""
        if "ls-liefer" in h and ALT.search(h):
            out.append(d["id"])
    return out


def kandidaten_live(gql, tage):
    seit = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - tage * 86400))
    out, after = [], None
    while True:
        d = gql('query($q:String!,$a:String){products(first:100,after:$a,query:$q){pageInfo{hasNextPage endCursor} '
                'nodes{id descriptionHtml}}}', {"q": f'updated_at:>{seit} AND "nur in die Schweiz"', "a": after})["products"]
        out += [n["id"] for n in d["nodes"] if "ls-liefer" in (n["descriptionHtml"] or "") and ALT.search(n["descriptionHtml"])]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        after = d["pageInfo"]["endCursor"]


def main():
    if not kanarien():
        print("⚠️ LIEFERBLOCK-LI: Kanarien rot — nichts geschrieben")
        return 1
    if "--kanarien" in sys.argv:
        return 0
    from kaufwille_zeile import gql
    scharf = "--scharf" in sys.argv
    if "--export" in sys.argv:
        ids = kandidaten_export(sys.argv[sys.argv.index("--export") + 1])
    else:
        ids = kandidaten_live(gql, float(os.environ.get("TAGE", "2")))
    if not ids:
        print("LIEFERBLOCK-LI: 0 Kästen ohne Liechtenstein")
        return 0
    if not scharf:
        print(f"LIEFERBLOCK-LI: {len(ids)} Kandidaten (trocken, --scharf schreibt)")
        return 0
    schloss = open("/tmp/lock_produkttext.lock", "w")
    fcntl.flock(schloss, fcntl.LOCK_EX)          # gemeinsames Schloss der Produkttext-Schreiber: warten, nicht überspringen
    ok = draussen_n = fehl = 0
    for pid in ids:
        p = gql('query($id:ID!){product(id:$id){handle status descriptionHtml}}', {"id": pid})["product"]
        if not p:
            continue
        neu, n, draussen = heilen(p["descriptionHtml"])
        draussen_n += bool(draussen)
        if not n:
            continue
        r = gql('mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{descriptionHtml} userErrors{message}}}',
                {"p": {"id": pid, "descriptionHtml": neu}})["productUpdate"]
        ist = (r.get("product") or {}).get("descriptionHtml") or ""
        if r["userErrors"] or (ALT.search(ist) and "ls-liefer" in ist and heilen(ist)[1]):
            fehl += 1
            print("  ⚠️", p["handle"], r["userErrors"])
            continue
        ok += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{pid.rsplit('/', 1)[-1]}\t{p['handle']}\n")
    zeile = f"LIEFERBLOCK-LI: {ok} Kästen um Liechtenstein ergänzt · {fehl} Fehler"
    if draussen_n:
        zeile += f" · {draussen_n} Texte mit «nur … Schweiz» ausserhalb des Kastens (von Hand)"
    print(("⚠️ " if fehl else "") + zeile)
    return 1 if fehl else 0


if __name__ == "__main__":
    sys.exit(main())
