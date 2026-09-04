#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sie→du in Produkttexten — deterministisch, mit Lesepflicht vor dem Schreiben.

Der Shop duzt ueberall (Startseite, Warenkorb, Ratgeber, Kollektionstexte). 1'339 aktive
Produkttexte siezen trotzdem — der alte Groq-Prompt tat es. Fuer die Kundin ist das ein
Bruch mitten auf der Seite.

⚠️ NICHT PER MODELL. Am 03.09. hat gpt-oss an denselben Texten aus dem Imperativ eine Frage
gemacht («Entdeckst du unsere Kollektion») und bei 70 von 75 Absaetzen leeren Inhalt
geliefert. Die Texte sind formelhaft, also entscheiden REGELN — dieselben, die die
Kollektionstexte umgestellt haben (EINE Regelquelle, `kollektionstexte_du_form.um`).

ABLAUF: LISTE lesen → live holen → umstellen → PRUEFEN (kein «Sie» mehr, gleiche Tags,
gleiche Zahlen, Laenge plausibel) → Ergebnis in eine Datei zum LESEN. Erst `WRITE=1`
schreibt, und nur, was die Pruefung bestanden hat UND live noch unveraendert ist.
"""
import json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from shop_gql import gql                      # noqa: E402
from kollektionstexte_du_form import um       # noqa: E402  (hat seit 04.09. eine __main__-Wache)

LISTE = os.environ.get("LISTE", "dropship/_klassen/sie-anrede-im-produkttext.txt")
CAP = int(os.environ.get("CAP", "1500"))
WRITE = os.environ.get("WRITE") == "1"
PLAN = os.environ.get("PLAN", "/tmp/produkt_du.json")
LESEN = os.environ.get("LESEN", "/tmp/produkt_du.txt")
LEDGER = "dropship/_produkttexte_du_form.txt"

SIE = re.compile(r'\b(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b')
TAGS = re.compile(r'<[^>]+>')


def klartext(h):
    return re.sub(r'\s+', ' ', TAGS.sub(' ', h or ''))


def pruefen(alt, neu):
    """Was nicht besteht, wird NICHT geschrieben — es geht in den Bericht."""
    gruende = []
    if TAGS.findall(alt) != TAGS.findall(neu):
        gruende.append("tags-verändert")
    if re.findall(r'\d+', alt) != re.findall(r'\d+', neu):
        gruende.append("zahlen-verändert")
    rest = SIE.findall(klartext(neu))
    if rest:
        gruende.append("sie-rest:" + ",".join(sorted(set(rest))[:3]))
    # ⚠️ Der Imperativ kippt bei Modellen in eine Frage; bei Regeln kippt er in einen
    # Aussagesatz («und wirst du zum …»). Beides ist am Satzanfang erkennbar.
    if re.search(r'(?:^|[.!?]\s+)(?:[A-ZÄÖÜ][\wäöüß]+st)\s+du\b', klartext(neu)):
        gruende.append("frage-statt-imperativ")
    if not (0.85 <= len(neu) / max(len(alt), 1) <= 1.15):
        gruende.append("laenge")
    return gruende


def hole(ids):
    Q = ('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle title status '
         'descriptionHtml}}}')
    for i in range(0, len(ids), 50):
        d = gql(Q, {"ids": [f"gid://shopify/Product/{x}" for x in ids[i:i + 50]]})
        for p in ((d.get("data") or {}).get("nodes") or []):
            if p:
                yield p
        time.sleep(0.3)


def schreiben():
    plan = json.load(open(PLAN, encoding="utf-8"))
    led = open(LEDGER, "a", encoding="utf-8")
    n = 0
    for e in plan:
        if not e.get("neu"):
            continue
        r = gql('query($i:ID!){product(id:$i){descriptionHtml}}', {"i": e["id"]})
        live = (((r.get("data") or {}).get("product") or {}).get("descriptionHtml")) or ""
        if live != e["alt"]:
            print(f"  ⚠️ live geändert, übersprungen: {e['handle'][:44]}")
            continue
        w = gql('mutation($i:ProductInput!){productUpdate(input:$i)'
                '{product{descriptionHtml} userErrors{message}}}',
                {"i": {"id": e["id"], "descriptionHtml": e["neu"]}})
        pu = ((w.get("data") or {}).get("productUpdate") or {})
        if pu.get("userErrors") or (pu.get("product") or {}).get("descriptionHtml") != e["neu"]:
            print(f"  ⛔ {e['handle'][:44]} {str(pu.get('userErrors'))[:60]}")
            continue
        n += 1
        led.write(f"{e['id'].split('/')[-1]}\tdu-form\t{e['handle'][:60]}\n")
        if n % 100 == 0:
            led.flush(); print(f"  … {n}")
    led.flush()
    print(f"FERTIG: {n} Produkttexte auf du umgestellt")


def main():
    if WRITE:
        return schreiben()
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {z.split("\t")[0] for z in open(LEDGER, encoding="utf-8") if z.strip()}
    ids = [z.split("\t")[0].strip() for z in open(LISTE, encoding="utf-8") if z.strip()]
    ids = [i for i in ids if i not in fertig][:CAP]
    plan, offen, d = [], 0, open(LESEN, "w", encoding="utf-8")
    for p in hole(ids):
        alt = p.get("descriptionHtml") or ""
        if p.get("status") != "ACTIVE" or not SIE.search(klartext(alt)):
            continue
        neu = um(alt)
        g = pruefen(alt, neu)
        d.write(f"\n### {p['handle']} {'OK' if not g else '⛔ ' + ','.join(g)}\n"
                f"ALT: {klartext(alt)[:900]}\nNEU: {klartext(neu)[:900]}\n")
        if g:
            offen += 1
        plan.append({"id": p["id"], "handle": p["handle"],
                     "alt": alt, "neu": None if g else neu, "gruende": g})
    d.close()
    json.dump(plan, open(PLAN, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{len(plan)} Texte mit Sie-Anrede · {len(plan) - offen} bestehen die Prüfung · "
          f"{offen} bleiben liegen")
    print(f"Zum LESEN: {LESEN} — erst danach WRITE=1")


if __name__ == "__main__":
    main()
