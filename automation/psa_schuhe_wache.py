#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""psa_schuhe_wache.py — keine «Sicherheitsschuhe» ohne Prüfnorm (13.10.2026, Betreiber «4 entscheide du sauber»).

GEMESSEN 13.10. (Voll-Export + Admin-API): 134 aktive CJ-Schuhe, alle im Google-Kanal, nennen sich «Sicherheitsschuhe»,
«Schutzschuhe», «Sicherheitsstiefel», «Sicherheits-Sneaker» (230 Vorkommen in Titel, Text, SEO) — KEINER nennt eine Norm
(EN ISO 20345, S1/S3: 0 Treffer in den Schuhtexten), keiner hat ein Zertifikat. «Sicherheitsschuh» ist in der Schweiz und
der EU die Bezeichnung für persönliche Schutzausrüstung (PSA, Kategorie II; PSAV SR 930.115 / VO (EU) 2016/425, Norm
EN ISO 20345). Wer ihn ohne Konformität so anbietet, verspricht Schutz, den niemand geprüft hat — UWG-Risiko und, schlimmer,
ein Fuss auf der Baustelle.

ENTSCHEID (Variante A): Bezeichnung → «Arbeitsschuh/-stiefel/-Sneaker» (die Stahlkappe bleibt als Ausstattung genannt),
dazu ein Hinweis im Text: keine geprüfte PSA. Variante B (Zertifikate bei CJ) verworfen: dauert, und ohne geprüfte
Unterlagen bliebe die Bezeichnung trotzdem falsch.

REGEL: nur Schuhe (Typ oder Titel: schuh/stiefel/sneaker/boot), nur PSA-Bezeichnungen — «Arbeitsschuh», «Stahlkappe»,
«rutschfest» bleiben. Der Hinweis-Absatz trägt die Marke `data-psa-hinweis`; er nennt «Sicherheitsschuhe» bewusst und wird
beim Prüfen herausgeschnitten.

    python3 automation/psa_schuhe_wache.py --kanarien   # Ersetzungsregeln gegen Beispiele
    python3 automation/psa_schuhe_wache.py              # Trockenlauf: Liste der Änderungen
    SCHARF=1 python3 automation/psa_schuhe_wache.py     # schreiben (Altwerte ins Ledger), täglich im Aufseher
    LAUF=<lauf-id> python3 automation/psa_schuhe_wache.py --zurueck   # Rückweg aus dem Ledger
Quelle der Kandidaten: Voll-Export /tmp/export.jsonl (≤ 30 h) — die Titelsuche findet nur Wortanfänge — plus Live-Gegenprüfung.
"""
import datetime as dt
import json
import os
import re
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

LEDGER = os.path.join(REPO, "dropship", "_psa_schuhe_ledger.jsonl")
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX", "400"))

SCHUH = re.compile(r"schuh|stiefel|sneaker|\bboots?\b|stiefelette", re.I)
# Reihenfolge: lange Formen zuerst. (Muster, Ersatz) — Ersatz behält die Grossschreibung des ersten Buchstabens.
ERSATZ = [
    (r"arbeits-?\s*(?:und|&|\+|/)\s*sicherheits-?schuh(e|en|s)?", r"Arbeitsschuh\1"),
    (r"arbeitssicherheits-?schuh(e|en|s)?", r"Arbeitsschuh\1"),
    (r"sicherheits-?arbeits(schuh|stiefel)(e|en|n|s)?", r"Arbeits\1\2"),
    (r"industrie-?schutzschuh(e|en|s)?", r"Industrie-Arbeitsschuh\1"),
    (r"arbeitsschutz-?schuh(e|en|s)?", r"Arbeitsschuh\1"),
    (r"sicherheits-?halbschuh(e|en|s)?", r"Arbeits-Halbschuh\1"),
    (r"sicherheits-?schuh(e|en|s)?", r"Arbeitsschuh\1"),
    (r"sicherheitschuh(e|en|s)?", r"Arbeitsschuh\1"),
    (r"sicherheits-?stiefel(n|s)?", r"Arbeitsstiefel\1"),
    (r"sicherheits-?sneakers?", r"Arbeits-Sneaker"),
    (r"sicherheits-?boots?", r"Arbeitsstiefel"),
    (r"schutzschuh(e|en|s)?", r"Arbeitsschuh\1"),
    (r"safety\s?shoes?", r"Arbeitsschuhe"),
    # «europäische Stahlkappe» klingt nach EU-Norm, ohne Beleg (GEMESSEN Trockenlauf 13.10.) → nur «Stahlkappe»
    (r"europäische(n|r|s)?\s+(?=stahl)", r""),
]
ERSATZ_RX = [(re.compile(m, re.I), e) for m, e in ERSATZ]
BEZEICHNUNG = re.compile(r"sicherheits-?\w*schuh|sicherheitschuh|sicherheits-?stiefel|sicherheits-?sneaker|sicherheits-?boot|"
                         r"schutzschuh|safety\s?shoe", re.I)
HINWEIS = ('<p data-psa-hinweis="1"><strong>Hinweis:</strong> Robuster Arbeitsschuh – keine geprüfte persönliche '
           'Schutzausrüstung (PSA) nach EN ISO 20345. Wo Sicherheitsschuhe vorgeschrieben sind, bitte zertifizierte '
           'Schuhe tragen.</p>')
HINWEIS_RX = re.compile(r'<p data-psa-hinweis="1">.*?</p>', re.S)


def _gross(alt, neu):
    if not neu:
        return neu
    return neu[:1].upper() + neu[1:] if alt[:1].isupper() else neu[:1].lower() + neu[1:]


def ersetzen(text):
    """PSA-Bezeichnungen → Arbeitsschuh-Formen; Doppelungen («Arbeitsschuhe Arbeitsschuhe») zusammenziehen."""
    if not text:
        return text
    rest = HINWEIS_RX.split(text)
    hinweise = HINWEIS_RX.findall(text)
    neu_teile = []
    for teil in rest:
        for rx, e in ERSATZ_RX:
            teil = rx.sub(lambda m, e=e: _gross(m.group(0), m.expand(e)), teil)
        teil = re.sub(r"\b(Arbeits(?:schuh\w*|stiefel\w*))\s*(?:[,/&+]|und|oder)?\s*\1\b", r"\1", teil, flags=re.I)
        teil = re.sub(r"\b(Arbeitsschuh\w*)\s+(Arbeitsschuh\w*)\b", r"\1", teil, flags=re.I)
        neu_teile.append(teil)
    out = neu_teile[0]
    for h, t in zip(hinweise, neu_teile[1:]):
        out += h + t
    return out


# GEMESSEN Trockenlauf 13.10.: «Schutzschuhe für Fussverletzungen» ist ein Verbandsschuh (Medizin), kein Sicherheitsschuh —
# «Arbeitsschuh» wäre dort falsch. Medizinischer Zusammenhang = nicht anfassen.
# «Schutzschuhe für Senioren» = Seniorenschuh (Sturz/Rutsch), auch kein PSA-Schuh → ebenfalls nicht anfassen.
MEDIZIN = re.compile(r"verletzung|verband|orthop|gips|post-?op|diabet|wund|fraktur|vorfuss|entlastung|senior|ältere", re.I)


def ist_schuh(p):
    if MEDIZIN.search((p.get("title") or "") + " " + (p.get("productType") or "")):
        return False
    return bool(SCHUH.search(p.get("productType") or "") or SCHUH.search(p.get("title") or ""))


def braucht_hinweis(p):
    roh = HINWEIS_RX.sub("", p.get("descriptionHtml") or "")
    return ist_schuh(p) and (BEZEICHNUNG.search(p.get("title") or "") or BEZEICHNUNG.search(roh)
                              or re.search(r"stahlkappe|zehenschutzkappe|durchtritt", (p.get("title") or "") + roh, re.I))


def plan(p):
    """→ dict mit den neuen Feldern (nur geänderte) oder None."""
    if not ist_schuh(p):
        return None
    neu = {}
    t = ersetzen(p["title"])
    if t != p["title"]:
        neu["title"] = t
    d = p.get("descriptionHtml") or ""
    d2 = ersetzen(d)
    if braucht_hinweis(p) and 'data-psa-hinweis="1"' not in d2:
        d2 = d2.rstrip() + "\n" + HINWEIS
    if d2 != d:
        neu["descriptionHtml"] = d2
    st, sd = (p.get("seo") or {}).get("title"), (p.get("seo") or {}).get("description")
    st2, sd2 = ersetzen(st), ersetzen(sd)
    if (st2, sd2) != (st, sd):
        neu["seo"] = {"title": st2, "description": sd2}
    return neu or None


KANARIEN = [
    # (Typ, Titel, erwarteter Titel; None = nicht anfassen)
    ("Herrenschuhe", "Leichte Sicherheitsschuhe mit Stahlkappe", "Leichte Arbeitsschuhe mit Stahlkappe"),
    ("Schuhe", "Sicherheits-Schuhe mit Stahlkappe", "Arbeitsschuhe mit Stahlkappe"),
    ("Sportschuhe", "Sicherheitschuhe mit Stahlkappe", "Arbeitsschuhe mit Stahlkappe"),
    ("Herrenschuhe", "Militär-Sicherheitsstiefel mit Stahlkappe", "Militär-Arbeitsstiefel mit Stahlkappe"),
    ("Sportschuhe", "Leichte Sicherheits-Sneaker mit Stahlkappe", "Leichte Arbeits-Sneaker mit Stahlkappe"),
    ("Sportschuhe", "Leichte Industrieschutzschuhe", "Leichte Industrie-Arbeitsschuhe"),
    ("Herrenschuhe", "Deo-Zehenkappe leichter Schutzschuh", "Deo-Zehenkappe leichter Arbeitsschuh"),
    ("Herrenschuhe", "Arbeitsschuhe Sicherheitsschuhe Herren", "Arbeitsschuhe Herren"),
    ("Herrenschuhe", "Arbeits- und Sicherheitsschuhe für Herren", "Arbeitsschuhe für Herren"),
    ("Sportschuhe", "Stahlkappe Arbeitsschuhe", None),
    ("Herrenschuhe", "Herren Arbeitsstiefel", None),
    ("Gaming-Zubehör", "S1 Mini Wireless Bygoad mit Maus-Tastatur", None),
    ("Herrenschuhe", "Viersaisonale Arbeitssicherheitsschuhe für Herren", "Viersaisonale Arbeitsschuhe für Herren"),
    ("Herrenschuhe", "Arbeits- & Sicherheitsschuhe mit Stahlkappe", "Arbeitsschuhe mit Stahlkappe"),
    ("Herrenschuhe", "Schutzschuhe für Fussverletzungen", None),
    ("Herrenschuhe", "Schutzschuhe für Senioren", None),
    ("Sportschuhe", "Atmungsaktive Sicherheits-Halbschuhe mit Stahlkappe", "Atmungsaktive Arbeits-Halbschuhe mit Stahlkappe"),
    ("Haushalt", "Kantenschutz für Möbel · 8 Stück", None),
    ("Herrenschuhe", "Arbeitsschuhe mit europäischer Stahlkappe", "Arbeitsschuhe mit Stahlkappe"),
    ("Herrenschuhe", "Leichte Sicherheits-Arbeitsschuhe für Herren", "Leichte Arbeitsschuhe für Herren"),
    ("Uhren", "Sicherheits-Armbanduhr mit SOS", None),
]


def kanarien():
    fehler = []
    for typ, titel, soll in KANARIEN:
        p = {"title": titel, "productType": typ, "descriptionHtml": "", "seo": {"title": None, "description": None}}
        pl = plan(p)
        ist = (pl or {}).get("title")
        if ist != soll:
            fehler.append((titel, soll, ist))
    # Hinweis: genau einmal, Prüfung schneidet ihn heraus
    p = {"title": "Leichte Sicherheitsschuhe", "productType": "Schuhe", "descriptionHtml": "<p>Diese Sicherheitsschuhe …</p>",
         "seo": {"title": "Sicherheitsschuhe | LuxeStyle", "description": None}}
    pl = plan(p)
    d = pl["descriptionHtml"]
    if d.count('data-psa-hinweis="1"') != 1 or "Diese Arbeitsschuhe" not in d or pl["seo"]["title"] != "Arbeitsschuhe | LuxeStyle":
        fehler.append(("Hinweis/SEO", "1 Hinweis + Arbeitsschuhe", d[:120]))
    p2 = {"title": "Leichte Arbeitsschuhe", "productType": "Schuhe", "descriptionHtml": d, "seo": {"title": None, "description": None}}
    if plan(p2) is not None:
        fehler.append(("zweiter Lauf", "keine Änderung", plan(p2)))
    return len(KANARIEN) + 2, fehler


def gql(q, v=None):
    from kaufwille_zeile import gql as g
    return g(q, v)


Q = """query($ids:[ID!]!){nodes(ids:$ids){... on Product{id handle title productType status descriptionHtml
  seo{title description}}}}"""


def kandidaten():
    if not os.path.exists(EXPORT) or time.time() - os.path.getmtime(EXPORT) > 30 * 3600:
        raise SystemExit(f"⚠️ PSA-SCHUHE: Export fehlt/zu alt ({EXPORT}) — nichts geprüft")
    ids = []
    for z in open(EXPORT, encoding="utf-8"):
        try:
            x = json.loads(z)
        except Exception:
            continue
        if x.get("status") == "ACTIVE" and (BEZEICHNUNG.search(x.get("title") or "")
                                            or (SCHUH.search((x.get("title") or "") + " " + (x.get("productType") or ""))
                                                and re.search(r"stahlkappe|zehenschutzkappe|durchtritt", x.get("title") or "", re.I))):
            ids.append(x["id"])
    out = []
    for i in range(0, len(ids), 25):
        out += [n for n in gql(Q, {"ids": ids[i:i + 25]})["nodes"] if n and n["status"] == "ACTIVE"]
    return out


def schreiben(p, neu, lauf):
    eingabe = {"id": p["id"]}
    if "title" in neu:
        eingabe["title"] = neu["title"]
    if "descriptionHtml" in neu:
        eingabe["descriptionHtml"] = neu["descriptionHtml"]
    if "seo" in neu:
        eingabe["seo"] = neu["seo"]
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps({"lauf": lauf, "zeit": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "id": p["id"],
                            "handle": p["handle"], "alt": {"title": p["title"], "descriptionHtml": p["descriptionHtml"],
                                                           "seo": p["seo"]}, "neu": list(neu)}, ensure_ascii=False) + "\n")
    r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title descriptionHtml seo{title description}} "
            "userErrors{field message}}}", {"p": eingabe})["productUpdate"]
    if r["userErrors"]:
        return f"abgelehnt {r['userErrors']}"
    pr = r["product"]
    if "title" in neu and pr["title"] != neu["title"]:
        return "Titel nicht zurückgelesen"
    if BEZEICHNUNG.search(pr["title"]) or BEZEICHNUNG.search(HINWEIS_RX.sub("", pr["descriptionHtml"] or "")):
        return "Bezeichnung noch da"
    return ""


def zurueck(lauf):
    n = 0
    for z in open(LEDGER, encoding="utf-8"):
        e = json.loads(z)
        if e["lauf"] != lauf:
            continue
        a = e["alt"]
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{message}}}",
                {"p": {"id": e["id"], "title": a["title"], "descriptionHtml": a["descriptionHtml"], "seo": a["seo"]}})
        n += not r["productUpdate"]["userErrors"]
    print(f"ZURÜCK {lauf}: {n} Produkte wiederhergestellt")


def main():
    n, f = kanarien()
    for t, s, i in f:
        print(f"  ✗ «{t}» soll {s!r} ist {i!r}")
    if "--kanarien" in sys.argv:
        print(f"KANARIEN: {n - len(f)}/{n}")
        return 1 if f else 0
    if f:
        print(f"⚠️ PSA-SCHUHE: Kanarien {len(f)} rot — nichts geschrieben")
        return 1
    if "--zurueck" in sys.argv:
        zurueck(os.environ["LAUF"])
        return 0
    lauf = dt.datetime.utcnow().strftime("%Y-%m-%dT%H%MZ")
    ps = kandidaten()
    plaene = [(p, plan(p)) for p in ps]
    plaene = [(p, pl) for p, pl in plaene if pl]
    print(f"Kandidaten {len(ps)} · zu ändern {len(plaene)}{' (SCHARF, Lauf ' + lauf + ')' if SCHARF else ' (Trockenlauf)'}")
    ok = fehler = 0
    for p, pl in plaene[:MAX]:
        print(f"  {p['handle'][:44]:44} | {p['title'][:52]:52} → {pl.get('title', '=')[:52]} | {','.join(pl)}")
        if SCHARF:
            e = schreiben(p, pl, lauf)
            if e:
                fehler += 1
                print(f"    ⚠️ {e}")
            else:
                ok += 1
    rest = sum(1 for p in ps if BEZEICHNUNG.search(p["title"]) and ist_schuh(p)) - (ok if SCHARF else 0)
    print(f"PSA-SCHUHE: {len(plaene)} zu ändern · geschrieben {ok} · Fehler {fehler}" + (f" · Lauf {lauf}" if SCHARF else "")
          + (f" · Titel mit Bezeichnung offen {max(0, rest)}" if SCHARF else ""))
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
