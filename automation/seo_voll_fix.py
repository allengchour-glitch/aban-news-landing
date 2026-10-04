#!/usr/bin/env python3
"""seo_voll_fix.py — repariert die Klassen aus seo_voll_audit.py (04.10.2026, Betreiber «überprüf alle produkten und fix»).

Ändert NUR seo.title, seo.description und den Alt-Text des Hauptbilds — nie Produkttitel oder Text.
  titel_doppelt  → SEO-Titel = Titel + Unterscheidung (Damen/Herren/Kinder, Grösse aus Handle, Grössenbereich, Farbe)
  meta_doppelt   → Meta = Titel(+Unterscheidung) + erster Sachsatz des Texts + Versand/Rückgabe (≤ 155, eindeutig)
  titel_lang     → SEO-Titel an Wortgrenze ≤ 70
  meta_lang      → Meta an Satz-/Wortgrenze ≤ 155
  alt_leer       → Alt-Text = Produkttitel
Altwerte → dropship/_seo_voll_fix_ledger.tsv (handle, feld, alt, neu). Liest LIVE vor dem Schreiben.
  DRY=1 python3 automation/seo_voll_fix.py       (Standard: trocken)
  SCHARF=1 python3 automation/seo_voll_fix.py
"""
import collections, html, json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHARF = os.environ.get("SCHARF") == "1"
LEDGER = os.path.join(REPO, "dropship/_seo_voll_fix_ledger.tsv") if SCHARF else "/tmp/seo_voll_fix_trocken.tsv"
FLOSKEL = re.compile(r"\b(hochwertig\w*|perfekt\w*|ideal\w*|sorgt für|veredelt|Sie\b|Ihr\w*|Ihnen|Warum bei|Marke:|Details|"
                     r"jedes Outfit|Highlight|unverzichtbar)\b", re.I)
FARBE = re.compile(r"\b(schwarz|weiss|weiß|rot|blau|grün|gelb|rosa|pink|lila|violett|grau|braun|beige|gold|silber|orange|bunt|türkis)\w*", re.I)
Q = """query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title tags descriptionHtml
  seo{title description} options{name values} featuredMedia{ id alt } } }"""


def text(h):
    h = re.sub(r'<p class="ls-liefer".*?</p>', " ", h or "", flags=re.S)
    h = re.sub(r"</(p|h\d|li|div|tr)>|<br\s*/?>", " ¶ ", h, flags=re.I)        # Blockende = Satzende
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def kuerzen(s, n):
    if len(s) <= n:
        return s
    s = _kuerzen(s, n)
    if s.count("(") > s.count(")"):                      # nie mit offener Klammer enden
        s = s[:s.rfind("(")].rstrip(" ,;:–-·")
    return s


def _kuerzen(s, n):
    s = s[:n + 1]
    for z in (". ", " · ", " – "):
        i = s.rfind(z)
        if i > n * 0.6:
            return s[:i + (1 if z == ". " else 0)].strip()
    return s[:s.rfind(" ")].rstrip(" ,;:–-·")


def merkmale(p):
    t = set(x.lower() for x in p["tags"])
    m = {}
    if t & {"damenkostuem", "damen", "damenmode"}: m["wer"] = "Damen"
    elif t & {"herrenkostuem", "herren", "herrenmode"}: m["wer"] = "Herren"
    elif t & {"kinderkostuem", "kinder", "kindermode"} or "kinder" in p["handle"]: m["wer"] = "Kinder"
    g = re.search(r"-gr-(\d+(?:-\d+)?)", p["handle"])
    if g: m["gr"] = "Gr. " + g.group(1)
    t_ = text(p["descriptionHtml"])
    mm = re.search(r"(?:ca\.\s*)?(\d{1,3}(?:[.,]\d)?\s?(?:x\s?\d{1,3}\s?)?cm)\b", t_)
    if mm: m["mass"] = "ca. " + mm.group(1).replace(" ", " ")
    fa = FARBE.search(t_) or FARBE.search(p["title"])
    if fa: m["farbtext"] = fa.group(0).capitalize()
    for o in p["options"]:
        if re.search(r"grösse|groesse|size", o["name"], re.I) and o["values"] and o["values"][0] != "Default Title":
            v = o["values"]
            m.setdefault("bereich", f"Gr. {v[0]}" + (f"–{v[-1]}" if len(v) > 1 else ""))
        if re.search(r"farbe|color", o["name"], re.I) and len(o["values"]) == 1:
            m["farbe"] = o["values"][0]
    return m


def unterscheidung(gruppe):
    """Erstes Merkmal, dessen Werte in der Gruppe alle verschieden sind; sonst Kombination wer+bereich."""
    for k in ("wer", "gr", "bereich", "farbe", "mass", "farbtext"):
        w = [g["m"].get(k) for g in gruppe]
        if all(w) and len(set(w)) == len(w):
            return {g["handle"]: w[i] for i, g in enumerate(gruppe)}
    w = [" ".join(x for x in (g["m"].get("wer"), g["m"].get("bereich")) if x) for g in gruppe]
    if all(w) and len(set(w)) == len(w):
        return {g["handle"]: w[i] for i, g in enumerate(gruppe)}
    return {}


def erster_satz(p):
    titel = p["title"].lower()
    for s in re.split(r"(?<=[.!?])\s+|\s*¶\s*", text(p["descriptionHtml"])):
        s = s.strip(" ¶")
        if s.lower().startswith(titel):
            s = s[len(titel):].lstrip(" :–-·")
        if (25 <= len(s) <= 120 and s[-1:] in ".!?" and not FLOSKEL.search(s) and "CHF" not in s
                and not re.search(r"\b(z|bzw|ca|inkl|evtl)\.$|wie im Titel|^\w+:", s)
                and "Lieferzeit" not in s and not s.startswith(("💎", "✨", "👉", "📦"))):
            return s
    return ""


def schreibe(p, feld, alt, neu):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([time.strftime("%Y-%m-%d"), p["handle"], feld, (alt or "").replace("\t", " "), neu]) + "\n")
    if not SCHARF:
        return True
    if feld in ("seo.title", "seo.description"):
        k = feld.split(".")[1]
        seo = {"title": (p["seo"] or {}).get("title"), "description": (p["seo"] or {}).get("description")}
        seo[k] = neu
        # ⚠️ 04.10.2026: SEOInput ERSETZT beide Felder — fehlt «title», ist er danach leer (63 frisch gesetzte
        # Titel wurden so vom Meta-Schritt gelöscht). Darum immer beide schicken und den Stand im Speicher nachführen.
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{message}}}",
                {"p": {"id": p["id"], "seo": {"title": seo["title"] or "", "description": seo["description"] or ""}}})["productUpdate"]
        if not r.get("userErrors"):
            p["seo"] = seo
    else:
        r = gql("mutation($p:ID!,$m:[UpdateMediaInput!]!){productUpdateMedia(productId:$p,media:$m){mediaUserErrors{message}}}",
                {"p": p["id"], "m": [{"id": p["featuredMedia"]["id"], "alt": neu}]})["productUpdateMedia"]
    fehler = r.get("userErrors") or r.get("mediaUserErrors")
    if fehler:
        print("   ⚠️", p["handle"], feld, fehler)
    return not fehler


def main():
    a = json.load(open("/tmp/seo_voll_audit.json"))
    live = {}
    def hol(h):
        if h not in live:
            live[h] = gql(Q, {"h": h})["productByIdentifier"]
            if live[h]:
                live[h]["m"] = merkmale(live[h])
        return live[h]
    zahl = collections.Counter()
    # 1) doppelte Titel — gruppenweise
    gruppen = collections.defaultdict(list)
    for h in a.get("titel_doppelt", []):
        p = hol(h)
        if p:
            gruppen[((p["seo"] or {}).get("title") or p["title"]).lower()].append(p)
    neu_titel = {}
    for key, g in gruppen.items():
        u = unterscheidung(g)
        for p in g:
            if p["handle"] in u:
                neu_titel[p["handle"]] = kuerzen(f'{p["title"]} {u[p["handle"]]}', 70)
            else:
                zahl["titel_ohne_merkmal"] += 1
    for h, t in neu_titel.items():
        p = live[h]
        if (p["seo"] or {}).get("title") != t and schreibe(p, "seo.title", (p["seo"] or {}).get("title"), t):
            zahl["titel_doppelt"] += 1
            if zahl["titel_doppelt"] <= 6: print("  T", h[:44].ljust(45), "→", t)
    # 2) zu lange Titel
    for h in a.get("titel_lang", []):
        p = hol(h)
        if not p: continue
        alt = (p["seo"] or {}).get("title") or p["title"]
        t = kuerzen(alt, 70)
        if t != alt and schreibe(p, "seo.title", (p["seo"] or {}).get("title"), t):
            zahl["titel_lang"] += 1
            if zahl["titel_lang"] <= 4: print("  L", alt[:60], "→", t)
    # 3) doppelte / zu lange Metas
    gesehen = set()
    for h in a.get("meta_doppelt", []) + a.get("meta_lang", []):
        p = hol(h)
        if not p: continue
        name = neu_titel.get(h) or (p["seo"] or {}).get("title") or p["title"]
        name = re.sub(r"\s*[|–-]\s*LuxeStyle.*$", "", name)
        name = re.sub(r"\s*[–-]\s*[A-Z]{0,3}\d{2,}[A-Z0-9]*\s*$", "", name)      # Lieferantencode am Ende («– Y104S»)
        lager = "Ab Schweizer Lager, " if "ch-lager" in [x.lower() for x in p["tags"]] else ""
        satz = erster_satz(p)
        motiv = re.search(r"«[^»]+»", name)
        if satz and motiv and motiv.group(0) in satz:          # POD: Motiv steht schon im Satz
            m = kuerzen(f"{satz} {lager}Gratis-Versand ab CHF 50, 30 Tage Rückgabe.", 155)
        else:
          m = kuerzen(f"{name}: {satz} {lager}Gratis-Versand ab CHF 50, 30 Tage Rückgabe." if satz else
                    f"{name} bei LuxeStyle Schweiz. {lager}Gratis-Versand ab CHF 50, 30 Tage Rückgabe.", 155)
        if m.lower() in gesehen:
            zusatz = p["m"].get("mass") or p["m"].get("farbtext") or p["m"].get("bereich")
            if not zusatz:
                zahl["meta_ohne_merkmal"] += 1
                continue
            m = kuerzen(f"{name} ({zusatz}): {satz} {lager}Gratis-Versand ab CHF 50.", 155)
        gesehen.add(m.lower())
        if (p["seo"] or {}).get("description") != m and schreibe(p, "seo.description", (p["seo"] or {}).get("description"), m):
            zahl["meta"] += 1
            if zahl["meta"] <= 6: print("  M", h[:40].ljust(41), "→", m)
    # 4) Alt-Text
    for h in a.get("alt_leer", []):
        p = hol(h)
        if not p or not p.get("featuredMedia") or (p["featuredMedia"].get("alt") or "").strip():
            continue
        if schreibe(p, "alt", "", p["title"][:120]):
            zahl["alt"] += 1
    print(("SCHARF" if SCHARF else "TROCKEN"), dict(zahl))


if __name__ == "__main__":
    main()
