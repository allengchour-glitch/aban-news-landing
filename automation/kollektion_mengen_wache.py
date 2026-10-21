#!/usr/bin/env python3
"""kollektion_mengen_wache.py — Mengenangaben in Kollektionstexten («über 7'000 Artikel») gegen den kaufbaren Bestand (08.10.2026).

ANLASS (Plan Tag 10 «SEO: Kollektionstexte Saison», Betreiber «verbessere weiter»). GEMESSEN 08.10. über alle 551 Kollektionen:
12 Mengenangaben, davon drei falsch gegen die AKTIVEN, im Onlineshop veröffentlichten Produkte der Kollektion:
  wohnen-dekoration «über 7'000 Artikel» → aktiv 4'913 · gaming «über 400 Artikel» → aktiv 368 ·
  weihnachten-2026 «rund 160 Artikel, die du heute bestellen kannst» → aktiv 250.
Die Zahlen stammen aus dem Tag, an dem der Text geschrieben wurde; Draften (Klingen, BigBuy, ausverkauft) und Neuimporte
verschieben sie danach jeden Tag. Eine Mengenangabe ist eine Tatsachenbehauptung — sie muss heute stimmen.

REGEL (nur Sammelangaben mit Mengenwort, nur Artikel/Produkte):
  «über / mehr als N»      stimmt, wenn aktiv ≥ N            — sonst «über <aktiv abgerundet>»
  «rund / fast / knapp N»  stimmt, wenn |aktiv − N| ≤ 20 %   — sonst «rund <aktiv gerundet>»
  Abrunden/Runden auf zwei gültige Stellen (4'913 → «über 4'900», 368 → «über 360», 250 → «rund 250»), Tausender mit «'»;
  «über» heisst echt mehr (980 aktiv → «über 970»), «fast/knapp» wird «rund» (fast 50 bei 53 wäre falsch).
  Teilmengen ohne Mengenwort («47 Modelle», «1000 Teile») werden NICHT angefasst, nur gezählt — sie beschreiben Merkmale.
  Unter 20 aktiven Produkten wird die Zahl nicht nachgeführt, sondern gemeldet (eine Kollektion mit 12 Artikeln, die «über
  10» verspricht, braucht einen neuen Text, keine neue Zahl).
Schreibt descriptionHtml und seo.description (collectionUpdate), Altwert im Ledger dropship/_kollektion_mengen.tsv,
zurückgelesen. Täglich im Aufseher.

  python3 automation/kollektion_mengen_wache.py --kanarien  ·  python3 automation/kollektion_mengen_wache.py  ·  SCHARF=1 …
"""
import html as htmlmod, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
LEDGER = os.path.join(REPO, "dropship", "_kollektion_mengen.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
MIN_AKTIV = 20
ZAHL = r"(\d{1,3}(?:['’]\d{3})+|\d+)"
ANSPRUCH = re.compile(r"\b(über|ueber|mehr als|rund|fast|knapp)(\s+)" + ZAHL + r"(\s*\+?\s+)(Artikel|Produkte|Produkten|Kostüme|Kostueme)\b", re.I)
# 13.10.2026 (Messrunde): «Über 2'000 Kostüme» stand auf kostueme-ch-lager bei 1'545 aktiven — das Nomen «Kostüme» fehlte.


def zahl(s):
    return int(re.sub(r"\D", "", s))


def schoen(n):
    """4913 → «4'913»."""
    return f"{n:,}".replace(",", "'")


def stufe(n):
    return 10 if n < 100 else 10 ** (len(str(n)) - 2)


def soll(wort, n, aktiv):
    """→ (Wort, neue Zahl) oder None, wenn die Angabe stimmt. Zwei gültige Stellen; «über» heisst echt mehr."""
    w = wort.lower()
    if w in ("über", "ueber", "mehr als"):
        if aktiv > n:
            return None
        neu = (aktiv // stufe(aktiv)) * stufe(aktiv)
        if neu >= aktiv:
            neu -= stufe(aktiv)
        return (wort, neu) if neu > 0 else None
    if aktiv and abs(aktiv - n) / aktiv <= 0.2:
        return None
    rund = "Rund" if wort[:1].isupper() else "rund"          # «fast 50» bei 53 wäre falsch → immer «rund»
    return (rund, int(round(aktiv / stufe(aktiv)) * stufe(aktiv)))


def ersetzen(text, aktiv):
    """Text (HTML oder Klartext) → (neu, [(alt, neu)])."""
    aend = []
    def f(m):
        n = zahl(m.group(3))
        z = soll(m.group(1), n, aktiv)
        if z is None:
            return m.group(0)
        neu = z[0] + m.group(2) + schoen(z[1]) + m.group(4) + m.group(5)
        aend.append((m.group(0), neu))
        return neu
    return ANSPRUCH.sub(f, text or ""), aend


KANARIEN = [   # (Text, aktiv, Soll-Text)
    ("Bei LuxeStyle findest du über 7'000 Artikel für Wohnen", 4913, "Bei LuxeStyle findest du über 4'900 Artikel für Wohnen"),
    ("findest du über 400 Artikel — Controller", 368, "findest du über 360 Artikel — Controller"),
    ("Weihnachten 2026: rund 160 Artikel, die du heute bestellen kannst", 250, "Weihnachten 2026: rund 250 Artikel, die du heute bestellen kannst"),
    ("über 3'000 Produkte für Hund, Katze & Co.", 3304, "über 3'000 Produkte für Hund, Katze & Co."),
    ("über 600 Artikel Handy-Zubehör", 644, "über 600 Artikel Handy-Zubehör"),
    ("rund 1'200 Artikel", 1180, "rund 1'200 Artikel"),
    ("von 100 bis 1000 Teile, tolle Motive", 278, "von 100 bis 1000 Teile, tolle Motive"),       # Merkmal, kein Anspruch
    ("Pantoffeln aus Leder (47 Modelle)", 183, "Pantoffeln aus Leder (47 Modelle)"),             # Teilmenge, nur gezählt
    ("mehr als 50 Artikel", 51, "mehr als 50 Artikel"),
    ("mehr als 50 Artikel", 50, "mehr als 40 Artikel"),                                         # «mehr als» heisst echt mehr
    ("knapp 90 Produkte", 47, "rund 50 Produkte"),                                             # «knapp/fast» → «rund»
    ("Über 1'000+ Artikel", 980, "Über 970+ Artikel"),
    ("Über 2'000 Kostüme und Verkleidungen", 1545, "Über 1'500 Kostüme und Verkleidungen"),
    ("über 200 Kostüme", 250, "über 200 Kostüme"),
    ("Kostüme ab 2 Werktagen", 1545, "Kostüme ab 2 Werktagen"),                                # keine Mengenangabe
]


def kanarien():
    ok = 0
    for t, a, s in KANARIEN:
        ist, _ = ersetzen(t, a)
        gut = ist == s; ok += gut
        if not gut:
            print(f"  ✗ {t!r} (aktiv {a}) → {ist!r} (soll {s!r})")
    print(f"MENGEN-KANARIEN {ok}/{len(KANARIEN)}")
    return ok == len(KANARIEN)


def ist_kaufbar(n):
    """Kaufbar = nicht getrackt (CJ-Direktversand: immer bestellbar) oder Bestand > 0. Fehlende Felder gelten als ausverkauft, wenn getrackt."""
    return (not n.get("tracksInventory")) or (n.get("totalInventory") or 0) > 0


def zaehle_kaufbar(gql, cid):
    """Aktive, im Onlineshop veröffentlichte Produkte der Kollektion, die man jetzt BESTELLEN kann.
    21.10.2026 (Spähtrupp wf_3b017e9f T2, GEMESSEN): «Über 1'500 Kostüme … die bei uns im Schweizer Lager liegen» stand bei 1'521 aktiven, aber nur
    992 kaufbaren Produkten (528 getrackte Fortura-Artikel mit Bestand 0 seit der Bestandsumstellung vom 20.10.). Der Zähler `productsCount
    (collection_id … status:active)` sieht das nicht, und `collection_id` + `inventory_total` in EINER Suche liefert 0 (Shopify-Eigenheit,
    GEMESSEN) — darum blättern wir über die Produkte und prüfen die Felder selbst."""
    n, cur = 0, None
    while True:
        d = gql('query($c:String,$q:String!){products(first:250,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                'nodes{totalInventory tracksInventory}}}',
                {"c": cur, "q": f"collection_id:{cid} status:active published_status:published"})["products"]
        n += sum(1 for x in d["nodes"] if ist_kaufbar(x))
        if not d["pageInfo"]["hasNextPage"]:
            return n
        cur = d["pageInfo"]["endCursor"]


def klar(s):
    return re.sub(r"\s+", " ", htmlmod.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def main():
    if not kanarien():
        print("PAUSE: Kanarienvögel scheitern — nichts geschrieben"); sys.exit(1)
    from kaufwille_zeile import gql
    cur, gesehen, plan, melden = None, 0, [], []
    while True:
        d = gql('query($c:String){collections(first:200,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle '
                'descriptionHtml seo{title description} resourcePublicationsCount{count}}}}', {"c": cur})["collections"]
        for n in d["nodes"]:
            gesehen += 1
            if not n["resourcePublicationsCount"]["count"]:
                continue
            seo_d = (n["seo"] or {}).get("description") or ""
            if not (ANSPRUCH.search(klar(n["descriptionHtml"])) or ANSPRUCH.search(seo_d)):
                continue
            cid = n["id"].split("/")[-1]
            aktiv = zaehle_kaufbar(gql, cid)   # «aktiv» heisst hier seit 21.10.2026: kaufbar (aktiv + veröffentlicht + bestellbar)
            if aktiv < MIN_AKTIV:
                melden.append((n["handle"], aktiv, klar(n["descriptionHtml"])[:80])); continue
            neu_d, a1 = ersetzen(n["descriptionHtml"], aktiv)
            neu_s, a2 = ersetzen(seo_d, aktiv)
            if a1 or a2:
                plan.append((n, aktiv, neu_d, neu_s, a1 + a2))
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    print(f"Kollektionen {gesehen} · falsche Mengenangaben {len(plan)} · zu klein zum Nachführen {len(melden)}")
    for n, aktiv, _, _, aend in plan:
        print(f"  {n['handle'][:30]:30} aktiv {aktiv:6} · " + " · ".join(f"«{a}» → «{b}»" for a, b in aend))
    for h, a, t in melden:
        print(f"  ⚠️ {h}: aktiv {a} < {MIN_AKTIV} — Text neu schreiben: {t}")
    ok = fe = 0
    if SCHARF and plan:
        with open(LEDGER, "a", encoding="utf-8") as led:
            for n, aktiv, neu_d, neu_s, aend in plan:
                inp = {"id": n["id"], "descriptionHtml": neu_d}
                if neu_s != ((n["seo"] or {}).get("description") or ""):
                    inp["seo"] = {"title": (n["seo"] or {}).get("title"), "description": neu_s}
                r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{descriptionHtml seo{description}} userErrors{message}}}',
                        {"i": inp})["collectionUpdate"]
                c = (r or {}).get("collection") or {}
                gut = r and not r["userErrors"] and not ersetzen(c.get("descriptionHtml") or "", aktiv)[1] \
                    and not ersetzen((c.get("seo") or {}).get("description") or "", aktiv)[1]
                ok += bool(gut); fe += not gut
                led.write("\t".join([n["handle"], "gesetzt" if gut else "fehler", str(aktiv), time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()),
                                     " | ".join(f"{a} → {b}" for a, b in aend),
                                     json.dumps({"descriptionHtml": n["descriptionHtml"], "seo": n["seo"]}, ensure_ascii=False)]) + "\n")
    print(f"FERTIG: KOLLEKTION-MENGEN {len(plan)} falsch{f' · gesetzt {ok} · fehler {fe}' if SCHARF else ' (TROCKEN)'} · melden {len(melden)}")


def selbsttest():
    f = []

    def ok(n, b): f.append((n, bool(b)))
    ok("ungetrackt mit Bestand 0 = kaufbar (CJ)", ist_kaufbar({"tracksInventory": False, "totalInventory": 0}))
    ok("getrackt mit Bestand 0 = ausverkauft", not ist_kaufbar({"tracksInventory": True, "totalInventory": 0}))
    ok("getrackt mit Bestand 5 = kaufbar", ist_kaufbar({"tracksInventory": True, "totalInventory": 5}))
    ok("getrackt ohne Bestandsfeld = ausverkauft", not ist_kaufbar({"tracksInventory": True, "totalInventory": None}))
    seiten = [{"products": {"pageInfo": {"hasNextPage": True, "endCursor": "x"}, "nodes": [
                  {"tracksInventory": True, "totalInventory": 0}, {"tracksInventory": True, "totalInventory": 3}]}},
              {"products": {"pageInfo": {"hasNextPage": False, "endCursor": None}, "nodes": [
                  {"tracksInventory": False, "totalInventory": 0}, {"tracksInventory": True, "totalInventory": -2}]}}]
    it = iter(seiten)
    ok("zaehle_kaufbar blättert über alle Seiten (1 + 1 = 2 kaufbar von 4)", zaehle_kaufbar(lambda q, v=None: next(it), "1") == 2)
    ok("Behauptung 'über 1'500' bei 992 kaufbar → 'über 990'", ersetzen("Über 1'500 Kostüme im Lager", 992)[0] == "Über 990 Kostüme im Lager")
    import inspect
    ok("main() zählt kaufbar (nicht den alten productsCount)", "zaehle_kaufbar(gql, cid)" in inspect.getsource(main) and "productsCount" not in inspect.getsource(main))
    ok("Behauptung 'über 900' bei 992 kaufbar bleibt", ersetzen("Über 900 Kostüme im Lager", 992)[0] == "Über 900 Kostüme im Lager")
    for n, b in f:
        print(("  ok   " if b else "  FEHL ") + n)
    return 0 if all(b for _, b in f) and kanarien() else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    main()
