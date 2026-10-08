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
ANSPRUCH = re.compile(r"\b(über|ueber|mehr als|rund|fast|knapp)(\s+)" + ZAHL + r"(\s*\+?\s+)(Artikel|Produkte|Produkten)\b", re.I)


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
            aktiv = gql('query($q:String!){productsCount(query:$q,limit:null){count}}',
                        {"q": f"collection_id:{cid} status:active published_status:published"})["productsCount"]["count"]
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


if __name__ == "__main__":
    if "--kanarien" in sys.argv:
        sys.exit(0 if kanarien() else 1)
    main()
