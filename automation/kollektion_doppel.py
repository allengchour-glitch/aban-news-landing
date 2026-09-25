#!/usr/bin/env python3
"""kollektion_doppel.py — zwei Kollektionen mit EINER Regel sind eine Kollektion mit zwei Adressen (23.09.2026).

GEMESSEN 23.09. 23:45 UTC über 520 Kollektionen: 20 Regel-Signaturen mit mehr als einer Kollektion, 11 davon mit
mindestens zwei publizierten Adressen — halloween / halloween-2026 / fortura-halloween (Tag halloween, 230/230/230),
geschenke-unter-30 / 🎁-geschenke-bis-chf-30, fitness / fitness-training, puma / marke-puma, adidas / marke-adidas …
Jede zweite Adresse ist Duplicate Content: Google verteilt die Signale einer Seite auf zwei URLs, und die Besucherin
findet dieselbe Ware unter zwei Namen. Die ersten beiden Gruppen wurden am 23.09. von Hand zusammengelegt.

Regel: Von jeder Gruppe bleibt EINE Kollektion (die «Bleiberin»); die anderen werden von allen Kanälen abgemeldet und per
301 auf die Bleiberin gelenkt. Nichts wird gelöscht — Rückweg = Redirect löschen + wieder publizieren.

⚠️ Erster scharfer Lauf 23.09. 23:52 (13 Paare): 9 Verlierer hatten SCHON einen Redirect (dormant, solange die
Kollektion publiziert war), zwei «Bleiberinnen» (tauchen, metalldetektor) waren selbst nur Redirect-Pfade und lagen NUR auf
Inbox/POS — ohne Online-Store-Publikation gibt es keine Web-Adresse. Seither: Bleiberin MUSS im Online Store publiziert sein
(+200), ein Redirect-Pfad kann nie Bleiberin sein, Gruppen ohne Online-Store-Mitglied werden übersprungen, bestehende
Redirects werden gelesen (Ziel = Bleiberin oder eine andere Online-Store-Kollektion: ok; sonst per urlRedirectUpdate
auf die Bleiberin gedreht — keine Ketten), und die Abmeldung passiert ERST, wenn der Redirect steht.

Bleiberin (deterministisch, höchste Punktzahl):
  +200 im Online Store publiziert (Pflicht) · +100 im Menü verlinkt · +50 auf der Startseite (templates/index.json) · +50 in der Rotation (POOL/SAISON/SAISON_FEST)
  + Anzahl publizierter Kanäle · + Textlänge/200 (max. 10) · +1 wenn der Handle nur a-z0-9- enthält (kein Emoji/Prozent)
  Gleichstand → kürzerer Handle, dann alphabetisch erster (im Bericht «gleichstand»).

Sicherungen: nur Regel-Kollektionen (ruleSet) · gleiche Produktzahl in der Gruppe (Shopify rechnet nach einer
Regeländerung nach; ungleich = heute überspringen) · eine Regel allein zählt ohne UND/ODER-Unterschied · Rücklesen
(0 Publikationen + Redirect per ID) · Ledger dropship/_kollektion_doppel.txt (eine Abmeldung nie zweimal) ·
Bericht dropship/KOLLEKTION-DOPPEL.md · Ampel-Zeile über zaehlen().

  python3 automation/kollektion_doppel.py               # DRY (Standard): misst, entscheidet, schreibt nichts in Shopify
  SCHARF=1 python3 automation/kollektion_doppel.py      # meldet ab + 301 (täglich im Aufseher)
  python3 automation/kollektion_doppel.py --selbsttest
"""
import collections
import datetime
import json
import os
import re
import sys
import urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
REPO = os.path.dirname(HIER)
LEDGER = os.path.join(REPO, "dropship", "_kollektion_doppel.txt")
BERICHT = os.path.join(REPO, "dropship", "KOLLEKTION-DOPPEL.md")
SCHARF = os.environ.get("SCHARF") == "1"
NUR = set(filter(None, os.environ.get("NUR_HANDLES", "").split(",")))


def jetzt():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def signatur(rs):
    """Regelmenge als vergleichbarer Schlüssel; eine einzelne Regel hat kein UND/ODER."""
    regeln = tuple(sorted((r["column"], r["relation"], (r["condition"] or "").strip().lower()) for r in rs["rules"]))
    disj = bool(rs.get("appliedDisjunctively")) and len(regeln) > 1
    return (disj, regeln)


def signatur_text(sig):
    return ("ODER " if sig[0] else "UND ") + " · ".join(f"{c} {r} «{k}»" for c, r, k in sig[1])


def sauberer_handle(h):
    return bool(re.fullmatch(r"[a-z0-9-]+", h))


# 📱 25.09.2026: Die Android-App (Branch claude/luxstyle-play-store-app-rjuxbz, HomeScreen.kt RAILS +
# seasonFor) fragt diese Handles FEST ueber die Storefront-API ab. Ein 301 hilft ihr nicht — die API folgt
# keinem Redirect, `collection(handle:)` liefert dann null und die Reihe bleibt leer, bis ein App-Update
# durch die Play-Pruefung ist. Deshalb gewinnt ein App-Handle jede Doppel-Gruppe.
APP_HANDLES = {"damen-mode", "sub-halsketten", "sub-taschen", "premium-geschenke",
               "neu-eingetroffen", "sommer", "jacken-outdoor"}


def punkte(c, menu, start, rot):
    h = c["handle"]; p = 0; gr = []
    if h in APP_HANDLES: p += 1000; gr.append("android-app")
    if c.get("online"): p += 200; gr.append("online store")
    if h in menu: p += 100; gr.append("menü")
    if h in start: p += 50; gr.append("startseite")
    if h in rot: p += 50; gr.append("rotation")
    n = c["kanaele"]; p += n; gr.append(f"{n} kanäle")
    t = min(10, len(re.sub(r"<[^>]+>", "", c.get("descriptionHtml") or "")) // 200); p += t; gr.append(f"text {t}")
    if sauberer_handle(h): p += 1
    return p, gr


def bleiberin(cs, menu, start, rot):
    bewertet = []
    for c in cs:
        p, gr = punkte(c, menu, start, rot)
        bewertet.append((p, gr, c))
    bewertet.sort(key=lambda x: (-x[0], len(x[2]["handle"]), x[2]["handle"]))
    gleich = len(bewertet) > 1 and bewertet[0][0] == bewertet[1][0]
    return bewertet, gleich


# ---------------------------------------------------------------- Shopify
def gql(q, v=None):
    from kollektionstexte_nachbessern import gql as _g
    return _g(q, v)


def alle_kollektionen():
    out, cur = [], None
    while True:
        r = gql('query($c:String){ collections(first:250, after:$c){ pageInfo{hasNextPage endCursor} nodes{ id handle title '
                'productsCount{count} resourcePublicationsCount{count} ruleSet{ appliedDisjunctively rules{column relation condition} } } } }',
                {"c": cur})["collections"]
        out += r["nodes"]
        if not r["pageInfo"]["hasNextPage"]:
            break
        cur = r["pageInfo"]["endCursor"]
    return out


def details(c):
    d = gql('query($id:ID!){ collection(id:$id){ descriptionHtml resourcePublications(first:20){ nodes{ isPublished publication{ id name } } } } }',
            {"id": c["id"]})["collection"]
    c["descriptionHtml"] = d["descriptionHtml"]
    c["pubs"] = [x["publication"]["id"] for x in d["resourcePublications"]["nodes"] if x["isPublished"]]
    c["kanaele"] = len(c["pubs"])
    c["online"] = any(x["isPublished"] and x["publication"]["name"] == "Online Store" for x in d["resourcePublications"]["nodes"])
    return c


def menue_handles():
    r = gql('{ menus(first:20){ nodes{ items{ url items{ url items{ url } } } } } }')
    hs = set()

    def walk(items):
        for it in items:
            u = urllib.parse.unquote(it.get("url") or "")
            m = re.search(r"/collections/([^/?#]+)", u)
            if m:
                hs.add(m.group(1))
            walk(it.get("items") or [])
    for m in r["menus"]["nodes"]:
        walk(m["items"])
    return hs


def startseite_handles():
    import homepage_katalog_rotation as H
    raw = H.gql('{theme(id:"%s"){files(filenames:["templates/index.json"]){nodes{body{... on OnlineStoreThemeFileBodyText{content}}}}}}'
                % H.THEME)["data"]["theme"]["files"]["nodes"][0]["body"]["content"]
    return set(re.findall(r'"collection":\s*"([^"]+)"', raw))


def rotation_handles():
    import homepage_katalog_rotation as H
    return set(H.POOL) | {h for h, *_ in H.SAISON} | {h for _, h, *_ in H.SAISON_FEST}


def abmelden(c):
    if not c["pubs"]:
        return
    r = gql('mutation($id:ID!,$in:[PublicationInput!]!){ publishableUnpublish(id:$id, input:$in){ userErrors{field message} } }',
            {"id": c["id"], "in": [{"publicationId": p} for p in c["pubs"]]})
    ue = r["publishableUnpublish"]["userErrors"]
    if ue:
        raise RuntimeError(f"unpublish {c['handle']}: {ue}")


def redirect_lesen(handle):
    """Bestehender Redirect für /collections/<handle> → (id, target) oder None."""
    pfad = "/collections/" + urllib.parse.quote(handle)
    r = gql('query($q:String!){ urlRedirects(first:10, query:$q){ nodes{ id path target } } }', {"q": f"path:{pfad}"})
    for x in r["urlRedirects"]["nodes"]:
        if x["path"] == pfad:
            return x["id"], x["target"]
    return None


def redirect_ziel_online(target, online_handles):
    m = re.match(r"^/collections/([^/?#]+)$", target or "")
    return bool(m) and urllib.parse.unquote(m.group(1)) in online_handles


def redirect(loser, keeper, online_handles):
    """Redirect setzen oder drehen. Rückgabe: Kennung. Ziel bleibt, wenn es eine andere Online-Store-Kollektion ist."""
    pfad = "/collections/" + urllib.parse.quote(loser)
    ziel = "/collections/" + urllib.parse.quote(keeper)
    alt = redirect_lesen(loser)
    if alt:
        rid, target = alt
        if target == ziel:
            return "vorhanden"
        if redirect_ziel_online(target, online_handles):
            return f"vorhanden→{target}"
        u = gql('mutation($id:ID!,$r:UrlRedirectInput!){ urlRedirectUpdate(id:$id, urlRedirect:$r){ urlRedirect{target} userErrors{field message} } }',
                {"id": rid, "r": {"target": ziel}})["urlRedirectUpdate"]
        if u["userErrors"]:
            raise RuntimeError(f"redirect-update {loser}: {u['userErrors']}")
        return f"gedreht {target}→{ziel}"
    r = gql('mutation($r:UrlRedirectInput!){ urlRedirectCreate(urlRedirect:$r){ urlRedirect{id path target} userErrors{field message} } }',
            {"r": {"path": pfad, "target": ziel}})["urlRedirectCreate"]
    ue = r["userErrors"]
    if ue:
        raise RuntimeError(f"redirect {loser}: {ue}")
    rid = r["urlRedirect"]["id"]
    back = gql('query($id:ID!){ node(id:$id){ ... on UrlRedirect{ path target } } }', {"id": rid})["node"]
    if not back or back["target"] != ziel:
        raise RuntimeError(f"redirect {loser}: Rücklesen {back}")
    return rid


def ruecklesen_abgemeldet(c):
    n = gql('query($h:String!){ collectionByHandle(handle:$h){ resourcePublicationsCount{count} } }', {"h": c["handle"]})
    return n["collectionByHandle"]["resourcePublicationsCount"]["count"]


# ---------------------------------------------------------------- Ledger / Bericht / Ampel
def ledger_lesen():
    fertig = set()
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 6 and t[5] == "ok":
                fertig.add(t[1])
    return fertig


def ledger_schreiben(loser, keeper, sig, grund, status):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([jetzt(), loser, keeper, signatur_text(sig), grund, status]) + "\n")


def zaehlen():
    """Für die Ampel: offene Doppel laut letztem Bericht (Kopfzeile «OFFEN: n»)."""
    try:
        m = re.search(r"OFFEN: (\d+)", open(BERICHT, encoding="utf-8").read())
        return int(m.group(1)) if m else -1
    except OSError:
        return -1


# ---------------------------------------------------------------- Hauptlauf
def gruppen_finden(alle):
    grp = collections.defaultdict(list)
    for c in alle:
        rs = c.get("ruleSet")
        if not rs or not rs["rules"]:
            continue
        grp[signatur(rs)].append(c)
    return {sig: cs for sig, cs in grp.items() if len(cs) > 1 and sum(1 for c in cs if c["resourcePublicationsCount"]["count"] > 0) >= 2}


def main():
    alle = alle_kollektionen()
    gruppen = gruppen_finden(alle)
    menu, start, rot = menue_handles(), startseite_handles(), rotation_handles()
    fertig = ledger_lesen()
    zeilen, offen, erledigt, uebersprungen = [], 0, 0, 0
    print(f"{'SCHARF' if SCHARF else 'DRY'} · {len(alle)} Kollektionen · {len(gruppen)} Gruppen mit ≥2 publizierten Adressen")
    for sig, cs in sorted(gruppen.items(), key=lambda x: -max(c["productsCount"]["count"] for c in x[1])):
        cs = [details(c) for c in cs]
        zaehl = {c["productsCount"]["count"] for c in cs}
        bewertet, gleich = bleiberin(cs, menu, start, rot)
        keeper = bewertet[0][2]
        zeilen.append(f"\n### {signatur_text(sig)}\n")
        online_handles = {c["handle"] for c in cs if c.get("online")}
        if not keeper.get("online"):
            zeilen.append("- ⏭️ kein Mitglied im Online Store publiziert — keine Web-Adresse, nichts zusammenzulegen")
            for p, gr, c in bewertet:
                zeilen.append(f"- `{c['handle']}` «{c['title']}» · {p} P. ({', '.join(gr)})")
            uebersprungen += 1
            continue
        if redirect_lesen(keeper["handle"]):
            zeilen.append(f"- ⛔ Bleiberin `{keeper['handle']}` ist selbst ein Redirect-Pfad — Gruppe übersprungen (Hand)")
            uebersprungen += 1
            continue
        for p, gr, c in bewertet:
            rolle = "BLEIBT" if c is keeper else ("erledigt" if c["handle"] in fertig else "→ 301")
            zeilen.append(f"- `{c['handle']}` «{c['title']}» · {c['productsCount']['count']} Produkte · {p} P. ({', '.join(gr)}) · **{rolle}**")
        if gleich:
            zeilen.append("- ⚠️ gleichstand — Bleiberin nach Handle-Länge/Alphabet gewählt")
        if len(zaehl) > 1:
            zeilen.append(f"- ⏸️ Produktzahlen ungleich {sorted(zaehl)} — Shopify rechnet noch, heute übersprungen")
            uebersprungen += 1
            continue
        for p, gr, c in bewertet[1:]:
            if c["kanaele"] == 0 and c["handle"] in fertig:
                continue
            if NUR and c["handle"] not in NUR:
                offen += 1; continue
            grund = f"{keeper['handle']} {bewertet[0][0]} P. ({', '.join(bewertet[0][1])}) vs {p} P. ({', '.join(gr)})"
            if not SCHARF:
                print(f"  DRY: {c['handle']} → {keeper['handle']}  [{grund}]")
                offen += 1
                continue
            try:
                rid = redirect(c["handle"], keeper["handle"], online_handles)   # ERST der Redirect …
                abmelden(c)                                                     # … DANN abmelden (nie ein 404-Fenster)
                rest = ruecklesen_abgemeldet(c)
                if rest:
                    raise RuntimeError(f"nach Abmelden noch {rest} Publikationen")
                ledger_schreiben(c["handle"], keeper["handle"], sig, grund, "ok")
                print(f"  ✓ {c['handle']} 301 → {keeper['handle']} ({rid}) + abgemeldet")
                erledigt += 1
            except Exception as e:  # noqa: BLE001
                ledger_schreiben(c["handle"], keeper["handle"], sig, grund, f"fehler: {e}")
                print(f"  ✗ {c['handle']}: {e}")
                offen += 1
    kopf = [f"# Kollektionen mit gleicher Regel — Stand {jetzt()}", "",
            f"OFFEN: {offen} · erledigt heute: {erledigt} · übersprungen (Zahlen ungleich): {uebersprungen} · Gruppen: {len(gruppen)} · {'SCHARF' if SCHARF else 'DRY'}",
            "", "Regel: eine Bleiberin je Gruppe (Menü > Startseite > Rotation > Kanäle > Text), die anderen abgemeldet + 301. "
            "Ledger `dropship/_kollektion_doppel.txt`. Rückweg: Redirect löschen + publizieren.", ""]
    os.makedirs(os.path.dirname(BERICHT), exist_ok=True)
    open(BERICHT, "w", encoding="utf-8").write("\n".join(kopf + zeilen) + "\n")
    print(f"FERTIG offen={offen} erledigt={erledigt} übersprungen={uebersprungen} → {os.path.relpath(BERICHT, REPO)}")


def selbsttest():
    ok = True

    def pruefe(b, t):
        nonlocal ok
        print(("  ✔ " if b else "  ✘ ") + t)
        ok = ok and b
    a = signatur({"appliedDisjunctively": True, "rules": [{"column": "TAG", "relation": "EQUALS", "condition": "Halloween "}]})
    b = signatur({"appliedDisjunctively": False, "rules": [{"column": "TAG", "relation": "EQUALS", "condition": "halloween"}]})
    pruefe(a == b, "eine Regel: UND/ODER und Schreibweise egal")
    c = signatur({"appliedDisjunctively": True, "rules": [{"column": "TAG", "relation": "EQUALS", "condition": "a"}, {"column": "TAG", "relation": "EQUALS", "condition": "b"}]})
    d = signatur({"appliedDisjunctively": False, "rules": [{"column": "TAG", "relation": "EQUALS", "condition": "b"}, {"column": "TAG", "relation": "EQUALS", "condition": "a"}]})
    pruefe(c != d and c[1] == d[1], "zwei Regeln: Reihenfolge egal, ODER≠UND")
    cs = [{"handle": "marke-puma", "kanaele": 2, "descriptionHtml": "<p>" + "x" * 900 + "</p>"},
          {"handle": "puma", "kanaele": 2, "descriptionHtml": ""}]
    bew, gleich = bleiberin(cs, set(), set(), set())
    pruefe(bew[0][2]["handle"] == "marke-puma" and not gleich, "Text entscheidet, wenn kein Verweis: marke-puma (4 P. Text)")
    bew, gleich = bleiberin(cs, {"puma"}, set(), set())
    pruefe(bew[0][2]["handle"] == "puma", "Menü schlägt Text")
    cs2 = [{"handle": "fitness-training", "kanaele": 2, "descriptionHtml": ""}, {"handle": "fitness", "kanaele": 2, "descriptionHtml": ""}]
    bew, gleich = bleiberin(cs2, set(), set(), set())
    pruefe(gleich and bew[0][2]["handle"] == "fitness", "Gleichstand → kürzerer Handle, markiert")
    cs3 = [{"handle": "🎁-geschenke-bis-chf-30", "kanaele": 8, "descriptionHtml": ""}, {"handle": "geschenke-unter-30", "kanaele": 8, "descriptionHtml": ""}]
    bew, _ = bleiberin(cs3, {"🎁-geschenke-bis-chf-30"}, set(), set())
    pruefe(bew[0][2]["handle"].startswith("🎁"), "Emoji-Handle bleibt, wenn es im Menü steht")
    cs4 = [{"handle": "tauchen", "kanaele": 2, "online": False, "descriptionHtml": "x" * 500},
           {"handle": "tauchen-schnorcheln", "kanaele": 2, "online": True, "descriptionHtml": ""}]
    bew, _ = bleiberin(cs4, set(), set(), set())
    pruefe(bew[0][2]["handle"] == "tauchen-schnorcheln", "Online Store schlägt Text und Handle-Länge (Falle 23.09.)")
    pruefe(redirect_ziel_online("/collections/trinken-barware", {"trinken-barware"}) and not redirect_ziel_online("/collections/fitness", {"fitness-training"}), "Redirect-Ziel: nur Online-Store-Kollektionen gelten als lebendig")
    pruefe(urllib.parse.quote("🎁-geschenke-bis-chf-30") == "%F0%9F%8E%81-geschenke-bis-chf-30", "Redirect-Ziel ist der prozentkodierte Pfad")
    print("SELBSTTEST " + ("BESTANDEN" if ok else "GESCHEITERT"))
    return 0 if ok else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    main()
