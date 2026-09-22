#!/usr/bin/env python3
"""Liechtenstein aus allen sichtbaren Zusagen streichen — Weg B (Betreiber-Entscheid 22.09.2026).

WARUM: Der Shop hat genau EINEN Markt («Switzerland», Regionen [CH]); ein Warenkorb mit Lieferland LI
bekommt 0 Versandoptionen (tools/testkorb_ausland.py, Kanarienvogel CH = 2). Versprochen wurde LI trotzdem:
13 sichtbare Stellen (7 veroeffentlichte Seiten + 6x Rechtstexte im Checkout) UND — erst am 22.09. gemessen —
in 5'739 Produkttexten, weil `versand_jenachland.py` seit dem 05.09. den Block «Versand nur in die Schweiz
und nach Liechtenstein» schrieb (Stichprobe 5 von 6 live bestaetigt). Weg A (LI einschalten) ist ein
Betreiber-Klick, den die Sicherungsschicht dieser Sitzung verweigert (marketUpdate, 19.09.).

DREI KLASSEN, EINE PHRASENTABELLE:
  seiten    — veroeffentlichte Seiten (unveroeffentlichte bleiben unangetastet: sieht niemand)
  policies  — shopPolicies (SHIPPING/REFUND/TERMS), die Shopify im Checkout verlinkt
  produkte  — NUR innerhalb des <p class="ls-liefer">-Blocks; ausserhalb darf sich kein Zeichen aendern
              (Sicherung wie in versand_jenachland). Kandidaten: Inhalts-Suche «nach Liechtenstein» UND
              das Ledger _versand_jenachland.txt (die Inhalts-Suche ist fuer einen Teil des Bestands blind).
Quittung NUR nach Ruecklesen ohne «Liechtenstein». Rest mit Kontext in dropship/LIECHTENSTEIN-RAUS.md.

Nutzung:  DRY=1 python3 automation/liechtenstein_raus.py            (zeigt nur)
          NUR=seiten|policies|produkte  CAP=n  (Produkte je Lauf, Standard 1500)
Haelt /tmp/lock_produkttext.lock NICHT selbst — der Aufseher gibt es (TXTLOCK, flock -w 240).
"""
import os, re, sys, time

DRY = os.environ.get("DRY") == "1"
NUR = os.environ.get("NUR", "")
CAP = int(os.environ.get("CAP", "1500"))
BLOCK = re.compile(r'<p class="ls-liefer"[^>]*>.*?</p>', re.S)

PHRASEN = [
    (re.compile(r'\s*<li>\s*<strong>Liechtenstein:</strong>[^<]*</li>'), ''),            # eigener Listenpunkt
    (re.compile(r'Schweiz\s*(?:&amp;|&|und|oder|/)\s*(?:nach\s+|in\s+)?Liechtenstein'), 'Schweiz'),
    (re.compile(r'Schweiz\s*\(inkl\.\s*Liechtenstein\)'), 'Schweiz'),
    (re.compile(r'\bCH\s*(?:&amp;|&|und|oder|/)\s*(?:nach\s+)?(?:LI|FL|Liechtenstein)\b'), 'CH'),
    (re.compile(r'Switzerland\s*(?:&amp;|&|and|or|/)\s*(?:to\s+)?Liechtenstein'), 'Switzerland'),
    (re.compile(r'Switzerland\s*\(incl\.\s*Liechtenstein\)'), 'Switzerland'),
]


def raus(t):
    for rx, ers in PHRASEN:
        t = rx.sub(ers, t)
    return t


def kontexte(t, n=60):
    return [re.sub(r"\s+", " ", t[max(0, m.start()-n):m.end()+n]) for m in re.finditer("Liechtenstein", t)]


def diff_zeilen(alt, neu):
    out = []
    for m in re.finditer("Liechtenstein", alt):
        a, b = max(0, m.start()-50), m.end()+40
        out.append("   - " + re.sub(r"\s+", " ", alt[a:b]))
    for k in kontexte(neu, 50):
        out.append("   ! bleibt: " + k)
    return out


# Shopify-Anbindung erst hier — damit die Phrasentabelle ohne Token testbar bleibt.
def _shop():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from produkttexte_du_form import gql, REPO  # noqa: E402
    return gql, REPO


# ------------------------------------------------------------------ Seiten
def seiten(gql, LEDGER):
    offen, n_ok = [], 0
    cur = None; alle = []
    while True:
        d = gql('query($c:String){ pages(first:100, after:$c){ nodes{ id handle isPublished body } '
                'pageInfo{hasNextPage endCursor} } }', {"c": cur})
        pg = d["data"]["pages"]; alle += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]: break
        cur = pg["pageInfo"]["endCursor"]
    for s in alle:
        if not s["isPublished"] or "Liechtenstein" not in (s["body"] or ""): continue
        alt = s["body"]; neu = raus(alt)
        print(f"SEITE /pages/{s['handle']}: {alt.count('Liechtenstein')} → {neu.count('Liechtenstein')}")
        for z in diff_zeilen(alt, neu): print(z)
        if neu == alt:
            offen.append((f"/pages/{s['handle']}", kontexte(alt))); continue
        if DRY: continue
        r = gql('mutation($id:ID!,$b:String!){ pageUpdate(id:$id, page:{body:$b}){ page{ id body } userErrors{ message } } }',
                {"id": s["id"], "b": neu})
        pu = (r.get("data") or {}).get("pageUpdate") or {}
        if pu.get("userErrors"):
            offen.append((f"/pages/{s['handle']}", ["FEHLER: " + pu["userErrors"][0]["message"]])); continue
        live = ((pu.get("page") or {}).get("body") or "")
        if "Liechtenstein" in live:
            offen.append((f"/pages/{s['handle']}", kontexte(live)))
        else:
            n_ok += 1
        open(LEDGER, "a").write(f"{s['id']}\tseite\t{'ersetzt' if 'Liechtenstein' not in live else 'teilweise'}\n")
    return n_ok, offen


# ------------------------------------------------------------------ Rechtstexte
def policies(gql, LEDGER):
    offen, n_ok = [], 0
    d = gql('{ shop { shopPolicies { id type body } } }')
    for p in d["data"]["shop"]["shopPolicies"]:
        alt = p["body"] or ""
        if "Liechtenstein" not in alt: continue
        neu = raus(alt)
        print(f"POLICY {p['type']}: {alt.count('Liechtenstein')} → {neu.count('Liechtenstein')}")
        for z in diff_zeilen(alt, neu): print(z)
        if neu == alt:
            offen.append((p["type"], kontexte(alt))); continue
        if DRY: continue
        r = gql('mutation($p:ShopPolicyInput!){ shopPolicyUpdate(shopPolicy:$p){ shopPolicy{ id body } userErrors{ message } } }',
                {"p": {"type": p["type"], "body": neu}})
        pu = (r.get("data") or {}).get("shopPolicyUpdate") or {}
        if pu.get("userErrors"):
            offen.append((p["type"], ["FEHLER: " + pu["userErrors"][0]["message"]])); continue
        live = ((pu.get("shopPolicy") or {}).get("body") or "")
        if "Liechtenstein" in live:
            offen.append((p["type"], kontexte(live)))
        else:
            n_ok += 1
        open(LEDGER, "a").write(f"{p['id']}\tpolicy\t{'ersetzt' if 'Liechtenstein' not in live else 'teilweise'}\n")
    return n_ok, offen


# ------------------------------------------------------------------ Produkte
def kandidaten_produkte(gql, fertig, JENACHLAND):
    ids = []
    seen = set(fertig)
    # 1) live: Inhalts-Suche — ⚠️ fuer einen Teil des Bestands blind (versand_jenachland-Lehre 13.09.)
    cur = None
    while len(ids) < CAP:
        d = gql('query($c:String,$q:String){ products(first:100, after:$c, query:$q){ pageInfo{hasNextPage endCursor} nodes{ id } } }',
                {"c": cur, "q": '"nach Liechtenstein"'})
        pg = (d.get("data") or {}).get("products")
        if not pg: print("PAUSE (Shopify stumm) — kein Ergebnis ist kein Befund."); break
        for p in pg["nodes"]:
            if p["id"] not in seen: seen.add(p["id"]); ids.append(p["id"])
        if not pg["pageInfo"]["hasNextPage"]: break
        cur = pg["pageInfo"]["endCursor"]
    n_live = len(ids)
    # 2) Ledger von versand_jenachland (der Schreiber der Phrase) — deckt, was die Suche nicht sieht
    if os.path.exists(JENACHLAND):
        for z in open(JENACHLAND):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 2 and t[1] == "ersetzt" and t[0] not in seen and len(ids) < CAP:
                seen.add(t[0]); ids.append(t[0])
    print(f"Kandidaten: {n_live} aus der Inhalts-Suche + {len(ids)-n_live} aus dem jenachland-Ledger (CAP {CAP})")
    return ids


def produkte(gql, LEDGER, JENACHLAND):
    fertig = set()
    if os.path.exists(LEDGER):
        fertig = {z.split("\t")[0] for z in open(LEDGER) if "\tprodukt\t" in z}
    ids = kandidaten_produkte(gql, fertig, JENACHLAND)
    if not ids:
        print("FERTIG: keine Produkte mehr mit Liechtenstein im Lieferblock"); return 0, []
    n_ok = n_ohne = n_offen = n_err = 0; offen = []
    for i, pid in enumerate(ids, 1):
        d = gql('query($id:ID!){ product(id:$id){ id title status descriptionHtml } }', {"id": pid})
        p = (d.get("data") or {}).get("product")
        if not p:
            open(LEDGER, "a").write(f"{pid}\tprodukt\tweg\n"); continue
        alt = p["descriptionHtml"] or ""
        if "Liechtenstein" not in alt:
            n_ohne += 1; open(LEDGER, "a").write(f"{pid}\tprodukt\tohne\n"); continue
        neu = BLOCK.sub(lambda m: raus(m.group(0)), alt)
        if BLOCK.sub("§", alt) != BLOCK.sub("§", neu):          # Sicherung: ausserhalb des Blocks nichts
            n_offen += 1; offen.append((p["title"][:60], ["Aenderung ausserhalb des Blocks — uebersprungen"])); continue
        if neu == alt:                                          # LI steht AUSSERHALB des Blocks → Mensch
            n_offen += 1; offen.append((p["title"][:60], kontexte(alt)))
            open(LEDGER, "a").write(f"{pid}\tprodukt\toffen-ausserhalb\n"); continue
        if DRY:
            if i <= 5:
                print(f"  ~ {p['title'][:50]}"); [print(z) for z in diff_zeilen(alt, neu)]
            n_ok += 1; continue
        r = gql('mutation($in:ProductInput!){ productUpdate(input:$in){ product{ id descriptionHtml } userErrors{ message } } }',
                {"in": {"id": pid, "descriptionHtml": neu}})
        pu = (r.get("data") or {}).get("productUpdate") or {}
        if pu.get("userErrors") or not (pu.get("product") or {}).get("id"):
            n_err += 1; print(f"  X {p['title'][:40]}: {(pu.get('userErrors') or [{'message':'keine Bestaetigung'}])[0]['message']}"); continue
        live = (pu["product"].get("descriptionHtml") or "")
        if "Liechtenstein" in live:
            n_offen += 1; offen.append((p["title"][:60], kontexte(live)))
            open(LEDGER, "a").write(f"{pid}\tprodukt\tteilweise\n")
        else:
            n_ok += 1; open(LEDGER, "a").write(f"{pid}\tprodukt\tersetzt\n")
        if i % 100 == 0: print(f"  … {i}/{len(ids)}: {n_ok} ersetzt · {n_ohne} ohne · {n_offen} offen · {n_err} Fehler", flush=True)
    print(f"PRODUKTE: {n_ok} ersetzt · {n_ohne} ohne LI · {n_offen} offen · {n_err} Fehler{' (DRY)' if DRY else ''}")
    return n_ok, offen


def bericht(BERICHT, zeilen, offen):
    with open(BERICHT, "w") as f:
        f.write("# Liechtenstein raus — Weg B (Betreiber-Entscheid 22.09.2026)\n\n")
        f.write(f"Stand: {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())} · Werkzeug `automation/liechtenstein_raus.py`\n\n")
        f.write("Warum: Markt «Switzerland» = [CH]; LI-Korb 0 Versandoptionen. Eine Zusage, die die Kasse bricht, ist keine.\n\n")
        for z in zeilen: f.write(f"- {z}\n")
        f.write("\n## Offen (braucht einen Menschen)\n\n" if offen else "\n## Offen\n\nnichts.\n")
        for wo, ktx in offen:
            f.write(f"- **{wo}**\n"); [f.write(f"  - …{k}…\n") for k in ktx]


def main():
    gql, REPO = _shop()
    LEDGER = os.path.join(REPO, "dropship", "_liechtenstein_raus_done.txt")
    BERICHT = os.path.join(REPO, "dropship", "LIECHTENSTEIN-RAUS.md")
    JENACHLAND = os.path.join(REPO, "dropship", "_versand_jenachland.txt")
    zeilen, offen = [], []
    if NUR in ("", "seiten"):
        n, o = seiten(gql, LEDGER); zeilen.append(f"Seiten: {n} bereinigt, {len(o)} offen"); offen += o
    if NUR in ("", "policies"):
        n, o = policies(gql, LEDGER); zeilen.append(f"Rechtstexte: {n} bereinigt, {len(o)} offen"); offen += o
    if NUR in ("", "produkte"):
        n, o = produkte(gql, LEDGER, JENACHLAND); zeilen.append(f"Produkte (dieser Lauf): {n} bereinigt, {len(o)} offen"); offen += o
    if not DRY: bericht(BERICHT, zeilen, offen)
    print(" · ".join(zeilen))


if __name__ == "__main__":
    main()
