#!/usr/bin/env python3
"""weiterleitung_ziel_wache.py — Weiterleitungen, deren ZIEL inzwischen tot ist (täglich im Aufseher).

ANLASS (Messrunde 13.10.2026, Platz 9; GEMESSEN 13.10. ~10:00 UTC an allen 1'657 URL-Weiterleitungen):
  - 146 Produkt→Produkt-Weiterleitungen zeigen auf 51 inzwischen GEDRAFTETE Produkte (Champion-/Puma-Trainingsanzug,
    Gürteltasche «Safta», Wanduhr «Versa» …). Eine Weiterleitung führt den Besucher dann auf eine 404-Seite —
    genau das, was sie verhindern sollte. tote_landeseiten.py sieht das nie: Es fragt nur «hat der Pfad eine
    Weiterleitung?», nicht «lebt ihr Ziel noch?».
  - 28 Weiterleitungen zeigen auf abgemeldete Kollektionen OHNE eigene Weiterleitung (klima-ventilatoren 21, die
    BigBuy-Marken adidas/puma/reebok/under-armour/gant, tauchen-schnorcheln, metalldetektoren-schatzsuche) = 404.
  - 21 zeigen auf abgemeldete Kollektionen MIT eigener Weiterleitung (sub-uhren → uhren …) = zwei Sprünge.
WARUM ES WIEDERKOMMT: Die täglichen Wächter draften laufend Ware und melden Kollektionen ab. Jede Weiterleitung, die
heute stimmt, kann morgen ins Leere zeigen.

REGEL (ein Ziel gilt als tot, wenn es für Besucher eine 404 ist):
  Produkt   : nicht ACTIVE oder nicht im Onlineshop veröffentlicht.
  Kollektion: nicht im Onlineshop veröffentlicht (eine veröffentlichte, leere Kollektion ist KEINE 404 → nur gezählt).
  Hat das tote Ziel selbst eine Weiterleitung, folgt Shopify ihr (Kette) → das Endziel zählt.
REPARATUR (FIX=1):
  1. Kette mit lebendem Endziel → die Quelle direkt auf das Endziel drehen (ein Sprung statt zwei).
  2. Totes Ziel ohne eigene Weiterleitung → Ersatz wählen und
     a) dem toten Ziel selbst eine Weiterleitung geben (deckt auch Google-Besucher, die direkt dort landen),
     b) jede Quelle direkt auf den Ersatz drehen.
     Ersatz Produkt: eindeutiger Zwilling (tote_landeseiten.ersatz, ≥ 0,70, kein neues langes Wort, veröffentlicht)
       → Kategorie aus dem Produkt (tote_landeseiten.kategorie_ziel) → Kategorie aus dem Quell-Handle.
     Ersatz Kollektion: Tabelle KOLL_ERSATZ (Hausregel 29.08.: Markenanfrage → Kategorie, nie eine fremde Marke)
       → Kategorie aus dem Handle.
     Klinge (klingenregel.ist_handklinge) → nie umleiten, nur melden (Hausregel 16.09.).
  Kein Ersatz → bleibt im Bericht («Mensch entscheidet»). Nie veröffentlichen, nie löschen.
SICHERHEIT: DRY ist Standard; FIX=1 schreibt höchstens MAX (300) Änderungen je Lauf. Ledger
  dropship/_weiterleitung_ziel_ledger.tsv (zeit, lauf, art, redirect-id, pfad, alt, neu, wie) — Rückweg:
  `--zurueck LAUF=<kennung>` (FIX=1) dreht Ziele zurück und löscht die angelegten Weiterleitungen.
  `--selbsttest` prüft die Auflöse-Logik ohne Netz.
"""
import datetime as dt, json, os, re, sys, urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

LEDGER = os.path.join(REPO, "dropship", "_weiterleitung_ziel_ledger.tsv")
BERICHT = os.path.join(REPO, "dropship", "WEITERLEITUNG-ZIELE.md")
ONLINE_STORE = "gid://shopify/Publication/301970915713"
FIX = os.environ.get("FIX") == "1"
MAX = int(os.environ.get("MAX", "300"))
LAUF = os.environ.get("LAUF") or f"{dt.datetime.utcnow():%Y-%m-%dT%H%M}"

# Abgemeldete Kollektionen → Kategorie (GEMESSEN 13.10.: alle Ziele veröffentlicht, mit aktiver Ware).
# Marken (BigBuy-Ende 15.09., alle Produkte DRAFT) gehen auf die Warengruppe, nie auf eine andere Marke.
KOLL_ERSATZ = {
    "adidas": "sport-outdoor", "puma": "sport-outdoor", "reebok": "sport-outdoor", "under-armour": "sport-outdoor",
    "gant": "sonnenbrillen-alle",                 # die 15 Gant-Artikel waren ausnahmslos Sonnenbrillen
    "klima-ventilatoren": "haushaltsgeraete",     # TITEL_ZIEL «ventilator» → haushaltsgeraete
    "tauchen-schnorcheln": "sommer",              # Schwimmbrillen, Schnorchel, Neopren → Sommer & Strand
    "metalldetektoren-schatzsuche": "outdoor-garten",
}
# Feinere Warenwörter VOR der Kategorie aus tote_landeseiten (Trockenlauf 13.10.: Sonnenbrillen landeten über das
# Geschlechtswort «damen» auf Damen-Mode, Bohrer/Notizbücher/Gürteltasche/IPL blieben ohne Ziel). Gebunden, erster
# Treffer gewinnt; «ipl» nur als ganzes Wort (Lehre 12.08.: «L-IPL-iner» — darum Bindestriche NICHT zu Leerzeichen
# machen, der Selbsttest fing genau das am 13.10.). Geprüft gegen Titel UND Handle.
WARENWORT = [
    (re.compile(r"sonnenbrille"), "sonnenbrillen-alle"),
    (re.compile(r"(?<![\w-])ipl(?!\w)"), "ipl-haarentfernung"),   # «IPL-Gerät» ja, «L-IPL-iner» nein
    (re.compile(r"bohrer|\bwerkzeug"), "werkzeug-maschinen"),
    (re.compile(r"notizbuch|notizblock"), "buro-home-office"),
    (re.compile(r"g(ü|u|ue)rteltasche|umh(ä|a|ae)ngetasche|handtasche"), "sub-taschen"),
    (re.compile(r"kissenbezug"), "kissen-wohntextilien"),
]


def pfad_von(url):
    """Pfad ohne Query, entschlüsselt, ohne Schrägstrich am Ende — für Vergleiche."""
    p = urllib.parse.urlparse(url).path if url.startswith("http") else url.split("?")[0].split("#")[0]
    p = urllib.parse.unquote(p)
    return p.rstrip("/") or "/"


def art_handle(pfad):
    m = re.match(r"^(?:/[a-z]{2}(?:-[a-z]{2})?)?/(products|collections)/([^/]+)$", pfad)
    return (m.group(1), m.group(2)) if m else (None, None)


def aufloesen(ziel, weiterleitung, lebt, tiefe=0):
    """→ ("ok", endpfad, hops) | ("tot", toter_pfad, hops) | ("fremd", pfad, hops).
    weiterleitung: {pfad: ziel}; lebt(art, handle) → True/False/None (None = unbekannt → als lebend behandeln)."""
    p = pfad_von(ziel)
    art, h = art_handle(p)
    if art is None or (art == "collections" and h == "all"):
        return ("fremd" if art is None else "ok"), p, tiefe
    if lebt(art, h) is not False:
        return "ok", p, tiefe
    if p in weiterleitung and tiefe < 5:
        return aufloesen(weiterleitung[p], weiterleitung, lebt, tiefe + 1)
    return "tot", p, tiefe


def selbsttest(leise=False):
    leben = {("products", "a"): True, ("products", "b"): False, ("products", "c"): False,
             ("collections", "k"): False, ("collections", "z"): True, ("collections", "x"): False}
    lebt = lambda a, h: leben.get((a, h))
    wl = {"/products/c": "/collections/z", "/collections/k": "/collections/x", "/collections/x": "/collections/z",
          "/products/schleife": "/products/schleife"}
    faelle = [
        ("/products/a", ("ok", "/products/a", 0)),
        ("/products/a?variant=1", ("ok", "/products/a", 0)),
        ("/products/b", ("tot", "/products/b", 0)),
        ("/products/c", ("ok", "/collections/z", 1)),
        ("/collections/k", ("ok", "/collections/z", 2)),
        ("/collections/all", ("ok", "/collections/all", 0)),
        ("/pages/faq", ("fremd", "/pages/faq", 0)),
        ("/collections/%e2%ad%90-bestseller", ("ok", "/collections/⭐-bestseller", 0)),  # unbekannt = lebend
        ("https://luxestyle.ch/products/b/", ("tot", "/products/b", 0)),
        ("/fr/products/b", ("tot", "/fr/products/b", 0)),
    ]
    fehler = 0
    for ziel, soll in faelle:
        ist = aufloesen(ziel, wl, lebt)
        ok = ist == soll
        fehler += not ok
        if not leise or not ok:
            print(f"  {'✓' if ok else '✗'} {ziel:42} → {ist}" + ("" if ok else f"  (soll {soll})"))
    # Schleife darf nicht hängen
    leben[("products", "schleife")] = False
    ist = aufloesen("/products/schleife", wl, lebt)
    ok = ist[0] == "tot" and ist[2] == 5
    fehler += not ok
    if not leise or not ok:
        print(f"  {'✓' if ok else '✗'} Schleife bricht nach 5 Sprüngen ab → {ist}")
    def wort(t):
        t = t.lower()
        return next((z for m, z in WARENWORT if m.search(t)), None)
    for titel, soll in [("Damensonnenbrille Italia Independent 0218", "sonnenbrillen-alle"),
                        ("IPL-Haarentfernungsgerät mit Kühlfunktion", "ipl-haarentfernung"),
                        ("Lipliner L-IPL-iner nude", None), ("Bohrer Wolfcraft SDS-Plus Beton", "werkzeug-maschinen"),
                        ("Notizbuch Oxford European Book A4", "buro-home-office"),
                        ("gurteltasche-safta-446", "sub-taschen"), ("Kissenbezug Naturals", "kissen-wohntextilien"),
                        ("Wanduhr Versa Metall", None), ("Trainingsanzug Champion Damen", None)]:
        ist = wort(titel)
        ok = ist == soll
        fehler += not ok
        if not leise or not ok:
            print(f"  {'✓' if ok else '✗'} Warenwort {titel[:40]:42} → {ist}")
    for k, v in KOLL_ERSATZ.items():
        if k == v or v in KOLL_ERSATZ:
            fehler += 1
            print(f"  ✗ KOLL_ERSATZ {k} → {v} ist selbst ein Ersatzfall")
    if not leise or fehler:
        print(f"SELBSTTEST {'OK' if not fehler else f'{fehler} FEHLER'}")
    return fehler == 0


# ── ab hier mit Netz ──────────────────────────────────────────────────────────────────────

def lade_netz():
    global TL, gql, ist_handklinge
    import tote_landeseiten as TL           # gql mit Eimer-Etikette + Drossel-Warten, ersatz(), kategorie_ziel()
    gql = TL.gql
    ist_handklinge = TL.ist_handklinge


def alle_weiterleitungen():
    aus, c = [], None
    while True:
        d = gql('query($c:String){urlRedirects(first:250,after:$c){pageInfo{hasNextPage endCursor} '
                'nodes{id path target}}}', {"c": c})
        u = (d.get("data") or {}).get("urlRedirects")
        if not u:
            raise RuntimeError(f"urlRedirects nicht lesbar: {str(d.get('errors'))[:200]}")
        aus += u["nodes"]
        if not u["pageInfo"]["hasNextPage"]:
            return aus
        c = u["pageInfo"]["endCursor"]


def status_holen(handles, art):
    """{handle: knoten|None} in Paketen; Produkte mit status, Kollektionen nur mit Veröffentlichung."""
    aus, hs = {}, sorted(handles)
    feld = ("products", "id handle title status productType tags publishedOnPublication(publicationId:$p)") \
        if art == "products" else ("collections", "id handle title publishedOnPublication(publicationId:$p)")
    for i in range(0, len(hs), 40):
        teil = hs[i:i + 40]
        q = " OR ".join('handle:"%s"' % h.replace('"', "") for h in teil)
        d = gql('query($q:String!,$p:ID!){%s(first:100,query:$q){nodes{%s}}}' % feld, {"q": q, "p": ONLINE_STORE})
        knoten = ((d.get("data") or {}).get(feld[0]) or {}).get("nodes")
        if knoten is None:
            raise RuntimeError(f"{art} nicht lesbar: {str(d.get('errors'))[:200]}")
        for n in knoten:
            aus[n["handle"]] = n
    return {h: aus.get(h) for h in hs}


def ist_lebend(art, n):
    if not n:
        return False
    if art == "products":
        return n["status"] == "ACTIVE" and bool(n["publishedOnPublication"])
    return bool(n["publishedOnPublication"])


def produkt_veroeffentlicht(handle):
    s = status_holen({handle}, "products").get(handle)
    return ist_lebend("products", s)


def warenwort_ziel(texte):
    for t in texte:
        t = (t or "").lower()
        for muster, ziel in WARENWORT:
            if muster.search(t):
                return ("/collections/" + ziel) if TL.kollektion_taugt(ziel) else None
    return None


def ersatz_fuer(toter_pfad, info, quellen):
    """→ (neues_ziel, wie) oder (None, grund)."""
    art, h = art_handle(toter_pfad)
    if art == "collections":
        z = KOLL_ERSATZ.get(h)
        if z and TL.kollektion_taugt(z):
            return "/collections/" + z, "KOLL_ERSATZ"
        k = TL.kategorie_ziel(None, h)
        return (k, "Kategorie aus Handle") if k else (None, "keine Ersatz-Kategorie")
    p = info.get(("products", h))
    titel = (p or {}).get("title", "")
    if titel and ist_handklinge(titel):
        return None, "Klinge — nie umleiten"
    if p:
        z = TL.ersatz(titel, p.get("productType"))
        if z and produkt_veroeffentlicht(z[0]["handle"]) and z[0]["handle"] != h:
            return "/products/" + z[0]["handle"], f"Zwilling {z[1]:.2f}"
    w = warenwort_ziel([titel, h])
    if w:
        return w, "Warenwort"
    if p:
        k = TL.kategorie_ziel(p, h)
        if k:
            return k, "Kategorie aus Produkt"
    for q in [h] + [art_handle(pfad_von(x))[1] or "" for x in quellen]:
        k = TL.kategorie_ziel(None, q)
        if k:
            return k, "Kategorie aus Handle"
    return None, "kein eindeutiges Ziel"


def ledger(art, rid, pfad, alt, neu, wie):
    neu_datei = not os.path.exists(LEDGER)
    with open(LEDGER, "a", encoding="utf-8") as f:
        if neu_datei:
            f.write("zeit\tlauf\tart\tid\tpfad\talt\tneu\twie\n")
        f.write("\t".join([dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), LAUF, art, rid, pfad,
                           alt, neu, wie]).replace("\n", " ") + "\n")


def drehen(rid, ziel):
    d = gql('mutation($id:ID!,$r:UrlRedirectInput!){urlRedirectUpdate(id:$id,urlRedirect:$r)'
            '{urlRedirect{target} userErrors{field message}}}', {"id": rid, "r": {"target": ziel}})
    u = (d.get("data") or {}).get("urlRedirectUpdate") or {}
    if u.get("userErrors") or "errors" in d:
        return str(u.get("userErrors") or d.get("errors"))[:160]
    return None


def anlegen(pfad, ziel):
    d = gql('mutation($r:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$r)'
            '{urlRedirect{id} userErrors{field message}}}', {"r": {"path": pfad, "target": ziel}})
    u = (d.get("data") or {}).get("urlRedirectCreate") or {}
    if u.get("userErrors") or "errors" in d:
        return None, str(u.get("userErrors") or d.get("errors"))[:160]
    return u["urlRedirect"]["id"], None


def zurueck():
    kennung = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("LAUF=")), None)
    if not kennung:
        print("--zurueck verlangt LAUF=<kennung> (aus dem Ledger)"); return 1
    zeilen = [z.rstrip("\n").split("\t") for z in open(LEDGER, encoding="utf-8")][1:]
    zeilen = [z for z in zeilen if len(z) >= 8 and z[1] == kennung]
    print(f"Rückweg {kennung}: {len(zeilen)} Zeilen" + ("" if FIX else " (DRY — FIX=1 schreibt)"))
    for z in reversed(zeilen):
        art, rid, pfad, alt = z[2], z[3], z[4], z[5]
        if not rid.startswith("gid://shopify/UrlRedirect/"):
            continue
        if not FIX:
            print(f"  {art:7} {pfad} → {alt or '(löschen)'}"); continue
        if art == "gedreht":
            fehler = drehen(rid, alt)
        else:
            d = gql('mutation($id:ID!){urlRedirectDelete(id:$id){deletedUrlRedirectId userErrors{message}}}', {"id": rid})
            fehler = str(((d.get("data") or {}).get("urlRedirectDelete") or {}).get("userErrors") or "") or None
        print(f"  {'FEHLER ' + fehler if fehler else 'ok'} {art} {pfad}")
    return 0


def main():
    if "--selbsttest" in sys.argv:
        return 0 if selbsttest() else 1
    if not selbsttest(leise=True):
        print("ABBRUCH: Selbsttest rot"); return 1
    lade_netz()
    if "--zurueck" in sys.argv:
        return zurueck()

    wl = alle_weiterleitungen()
    karte = {pfad_von(r["path"]): r["target"] for r in wl}
    ziele = {"products": set(), "collections": set()}
    for r in wl:
        art, h = art_handle(pfad_von(r["target"]))
        if art and not (art == "collections" and h == "all"):
            ziele[art].add(h)
    # auch die Ziele der Ketten-Glieder kennen (ein totes Ziel kann selbst weiterleiten)
    info = {}
    for art in ("products", "collections"):
        for h, n in status_holen(ziele[art], art).items():
            info[(art, h)] = n
    lebt = lambda art, h: ist_lebend(art, info[(art, h)]) if (art, h) in info else None

    stat = {"gesamt": len(wl), "ok": 0, "fremd": 0, "kette": 0, "tot": 0}
    kette, tot = [], {}
    for r in wl:
        zustand, endpfad, hops = aufloesen(r["target"], karte, lebt)
        if zustand == "fremd":
            stat["fremd"] += 1
        elif zustand == "ok" and hops == 0:
            stat["ok"] += 1
        elif zustand == "ok":
            stat["kette"] += 1
            kette.append((r, endpfad))
        else:
            stat["tot"] += 1
            tot.setdefault(endpfad, []).append(r)
    print(f"Weiterleitungen {stat['gesamt']}: Ziel lebt {stat['ok']} · Kette {stat['kette']} · ins Leere {stat['tot']} "
          f"({len(tot)} tote Ziele) · Seiten/Blog/Datei {stat['fremd']}")

    schreibt = 0
    gedreht, angelegt, offen, fehler = [], [], [], []

    def darf():
        return FIX and schreibt < MAX

    # 1. Ketten glätten
    for r, endpfad in kette:
        if not FIX:
            gedreht.append((r["path"], r["target"], endpfad, "Kette geglättet (Vorschau)")); continue
        if not darf():
            break
        e = drehen(r["id"], endpfad)
        if e:
            fehler.append((r["path"], e)); continue
        ledger("gedreht", r["id"], r["path"], r["target"], endpfad, "Kette geglättet")
        gedreht.append((r["path"], r["target"], endpfad, "Kette geglättet")); schreibt += 1

    # 2. tote Ziele ersetzen (meiste Quellen zuerst)
    for toter, quellen in sorted(tot.items(), key=lambda kv: -len(kv[1])):
        art, h = art_handle(toter)
        if art == "products" and (art, h) not in info:
            info[(art, h)] = status_holen({h}, "products").get(h)
        neu, wie = ersatz_fuer(toter, info, [q["path"] for q in quellen])
        if neu and pfad_von(neu) == toter:   # 13.10.: Tabelle zeigte auf genau die tote Kollektion (handy-powerbanks)
            neu, wie = None, "Ersatz wäre das tote Ziel selbst"
        if not neu:
            offen.append((toter, len(quellen), wie)); continue
        if not FIX:
            gedreht.append((f"{len(quellen)} Quelle(n)", toter, neu, wie)); continue
        if not darf():
            offen.append((toter, len(quellen), "Deckel MAX erreicht")); continue
        rid, e = anlegen(toter, neu)
        if e and "taken" not in e:
            fehler.append((toter, e))
        elif rid:
            ledger("angelegt", rid, toter, "", neu, wie)
            angelegt.append((toter, neu, wie)); schreibt += 1
        for q in quellen:
            if not darf():
                break
            e = drehen(q["id"], neu)
            if e:
                fehler.append((q["path"], e)); continue
            ledger("gedreht", q["id"], q["path"], q["target"], neu, wie)
            gedreht.append((q["path"], q["target"], neu, wie)); schreibt += 1

    modus = "FIX" if FIX else "DRY"
    print(f"{modus}: gedreht {len(gedreht)} · angelegt {len(angelegt)} · offen {len(offen)} · Fehler {len(fehler)}")
    for f in fehler[:10]:
        print("  FEHLER", f)

    jetzt = dt.datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    z = [f"# Weiterleitungen ins Leere — Stand {jetzt} UTC ({modus}, Lauf {LAUF})", "",
         "Erzeugt von `automation/weiterleitung_ziel_wache.py` (täglich im Aufseher). Regel und Anlass: Kopf des Skripts.", "",
         f"- Weiterleitungen gesamt: {stat['gesamt']}",
         f"- Ziel lebt: {stat['ok']} · zwei Sprünge (Kette): {stat['kette']} · ins Leere: {stat['tot']} "
         f"({len(tot)} tote Ziele) · Seiten/Blog/Datei (nicht geprüft): {stat['fremd']}",
         f"- Dieser Lauf: gedreht {len(gedreht)} · angelegt {len(angelegt)} · offen {len(offen)} · Fehler {len(fehler)}", ""]
    if offen:
        z += ["## Offen (Mensch entscheidet)", "", "| totes Ziel | Quellen | Grund |", "|---|---:|---|"]
        z += [f"| {t} | {n} | {g} |" for t, n, g in offen] + [""]
    if angelegt:
        z += ["## Neu angelegt (totes Ziel → Ersatz)", ""] + [f"- {t} → {n} ({w})" for t, n, w in angelegt[:80]] + [""]
    if gedreht:
        z += ["## Gedreht" + (" (Vorschau)" if not FIX else ""), ""]
        z += [f"- {p} : {a} → {n} ({w})" for p, a, n, w in gedreht[:120]]
        if len(gedreht) > 120:
            z.append(f"- … {len(gedreht) - 120} weitere (Ledger)")
        z.append("")
    if fehler:
        z += ["## Fehler", ""] + [f"- {p}: {e}" for p, e in fehler] + [""]
    open(BERICHT, "w", encoding="utf-8").write("\n".join(z))
    print("Bericht:", os.path.relpath(BERICHT, REPO))
    return 0


if __name__ == "__main__":
    sys.exit(main())
