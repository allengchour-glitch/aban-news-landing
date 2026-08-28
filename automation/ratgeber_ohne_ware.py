#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ratgeber_ohne_ware — Ratgeber, die Ware bewerben, die es nicht gibt.

WARUM (gemessen 28.08.2026 über 90 Tage):
Suchverkehr ist der EINZIGE Kanal, der in diesem Shop verkauft — 480 Sitzungen in 60 Tagen mit
4 Kassengaengen, waehrend 6'060 Social-Sitzungen NULL ergaben. Der Suchverkehr landet auf genau
vier Seiten, und eine davon ist ein Ratgeber:
`/blogs/ratgeber/faszienrolle-uebungen-anleitung` — 77 Sitzungen, **0 Warenkoerbe**.
Der Grund stand im Text: **der Shop fuehrt keine einzige Faszienrolle.** Und es ist kein
Einzelfall — dieselbe Wellness-Strecke bewirbt namentlich und mit exakten Preisen
«Akupressur-Matte Premium Set CHF 49.90», «Recovery-Set Premium CHF 129.90»,
«Himalaya Salzkristall-Lampe CHF 24.90», «Yoga-Matte Premium TPE CHF 39.90»,
«Premium Ätherische Öle Set 6er CHF 29.90». Aktive Produkte dazu: **null, alle fuenf.**

Das ist zweierlei zugleich:
  1. Ein Verkaufsleck — Menschen mit Kaufabsicht finden nichts.
  2. Eine Falschaussage — ein benannter Artikel zu einem benannten Preis, den niemand kaufen
     kann, ist dieselbe Klasse wie die konstruierten Streichpreise vom 24.08.

WAS GEPRUEFT WIRD — nachpruefbar statt geraten:
  A) VERSPRECHEN: Verweistext, der auf eine Kollektion zeigt und im Satz einen CHF-Preis traegt
     («<a href="/collections/x">Faszienrolle Premium 3er-Set</a> für CHF 44.90»).
     Existiert dazu kein aktives Produkt → Falschversprechen.
  B) SACKGASSE: Der Ratgeber verlinkt ueberhaupt kein aktives Produkt.

⚠️ ER MELDET NUR. Frueher stand hier ein FIX, der das meistverkaufte Produkt einer verlinkten
   Kollektion angehaengt hat — der Trockenlauf schlug unter einem DUFTKERZEN-Ratgeber einen
   «Vakuumierer» vor und unter einem AKUPRESSUR-Ratgeber einen «Luftventil-Halter».
   Ein halbwegs passender Ersatz ist ein Koederwechsel und schlimmer als die Luecke
   (dieselbe Lehre wie bei den toten Landeseiten, Schwelle 0.70). Die Reparatur ist die WARE
   oder der TEXT — beides gehoert entschieden, nicht nebenbei automatisiert.

⚠️ Und eine Lehre aus dem eigenen Fehlschlag: Die erste Fassung meldete «12 ergaenzt», waehrend
   Shopify jede Mutation mit «Type mismatch String!/HTML» abgelehnt hatte. Der Fehler stand auf
   GraphQL-Ebene, geprueft wurden nur `userErrors` — und der Lauf verbuchte Misserfolg als
   Erfolg und schrieb 12 falsche Ledger-Zeilen. Deshalb bricht `gql` bei `errors` jetzt sichtbar ab.

ENV: LIMIT (Ratgeber je Lauf)
"""

import json
import os
import re
import subprocess
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
BERICHT = os.path.join(REPO, "dropship", "RATGEBER-OHNE-WARE.md")

# Verweistexte, die KEIN Produktname sind — reine Knoepfe. Der erste Lauf hielt «Hier ansehen»
# fuer einen Artikel und meldete «kein Produkt zu ansehen».
KNOPF = re.compile(r"^(hier\s+)?(ansehen|entdecken|shoppen|kaufen|mehr|jetzt|zum\s+shop|"
                   r"alle\s+\w+|zur?\s+\w+|hier|link|weiterlesen)\s*$", re.I)

FUELL = {"premium", "set", "der", "die", "das", "und", "mit", "fuer", "für", "aus", "im",
         "zum", "zur", "bei", "ein", "eine", "3er", "6er", "2er", "5er", "hier", "shop",
         "luxestyle", "bestseller", "wellness", "komplett", "komplettset", "kollektion"}


def gql(q, v=None):
    p = "/tmp/_row.json"
    with open(p, "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@" + p], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5); continue
        if d.get("errors"):
            if "Throttled" in json.dumps(d["errors"]):
                time.sleep(6); continue
            # ⚠️ NICHT verschlucken — ein Berechtigungs- oder Typfehler sah sonst aus wie
            # «keine Daten», und der Lauf meldete zufrieden Vollzug.
            print("   ⚠️ Shopify-Fehler:", json.dumps(d["errors"])[:180])
            return {}
        if d.get("data") is not None:
            return d
        time.sleep(5)
    return {}


def ratgeber():
    q = """query($c:String){articles(first:50, after:$c, query:"published_status:published"){
      pageInfo{hasNextPage endCursor} nodes{ id title handle body } }}"""
    aus, cur = [], None
    while True:
        d = gql(q, {"c": cur})
        a = (d.get("data") or {}).get("articles") or {}
        if not a:
            break
        aus += a.get("nodes") or []
        if not (a.get("pageInfo") or {}).get("hasNextPage"):
            break
        cur = a["pageInfo"]["endCursor"]
    return aus


def wortgrenze(begriff, text):
    """Ganzes Wort — inklusive deutscher Anhaenge. Fuenf Substring-Fallen sind genug."""
    b = re.escape(begriff)
    return re.search(rf"(?<![\wäöüß]){b}\w{{0,5}}(?![\wäöüß])", text, re.I) is not None


def kennwort(name):
    """Das unterscheidende Wort eines Produktnamens — laengstes Nicht-Fuellwort."""
    worte = [w.strip("«»\"'()-–—,.") for w in re.split(r"[\s\-–—/]+", name)]
    worte = [w for w in worte if len(w) >= 6 and w.lower() not in FUELL and not w.isdigit()]
    return max(worte, key=len) if worte else None


def gibt_es(begriff, cache):
    """Gibt es dazu Ware? BEI EINEM ALARM LIEGT DIE BEWEISLAST UMGEKEHRT.

    ⚠️ Der erste Lauf meldete «kein Produkt zu Diffuser» — der Shop fuehrt Dutzende, nur
    geschrieben «Diffus**o**r». Und «Brille» fand «Sonnen**brille**» nicht, weil eine strenge
    Wortgrenze deutsche Zusammensetzungen ausschliesst (die Umkehrung der Substring-Falle).
    Hier wird deshalb ABSICHTLICH grosszuegig gesucht: als Teilzeichenkette und mit der
    er/or-Schreibvariante. Ein zu grosszuegiges «gibt es» heisst nur, dass ein Fall nicht
    gemeldet wird — ein erfundener Alarm dagegen macht den ganzen Bericht wertlos.
    """
    k = begriff.lower()
    if k in cache:
        return cache[k]
    # ⚠️ KEIN `title:`-Filter. Shopifys Titelsuche ist in diesem Shop unzuverlaessig:
    # `title:Sonnenbrille` liefert NICHTS, die reine Wortsuche findet sie sofort. Auf genau
    # diesen Filter hatte ich am 28.08. den Befund «der Shop hat keine einzige Faszienrolle»
    # gestuetzt — es gibt zwei aktive. Eine leere Trefferliste aus einem stillen Filter sieht
    # aus wie ein leerer Katalog.
    varianten = {begriff}
    if begriff.endswith("er"):
        varianten.add(begriff[:-2] + "or")
    if begriff.endswith("or"):
        varianten.add(begriff[:-2] + "er")
    treffer = []
    for v in varianten:
        d = gql('query($q:String!){products(first:20, query:$q){nodes{title status}}}',
                {"q": f"status:active AND {v}"})
        n = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
        # ⚠️ KEIN Nachfilter auf den Titel. Shopify sucht auch in Beschreibung und Tags —
        # «Duftkerzen» fand «Duftkerze im Aluminiumgehaeuse» nicht, «Beauty» keinen der drei
        # zurueckgelieferten Beauty-Artikel. Gemeldet wird deshalb NUR, wenn die Suche
        # ueberhaupt nichts findet. Das ist der konservative Weg: lieber einen Fall
        # uebersehen als einen erfinden — ein Bericht mit Falschalarmen wird nicht gelesen.
        treffer += [x["title"] for x in n]
        time.sleep(0.25)
    cache[k] = treffer
    return treffer


def produkt_aktiv(handle, cache):
    if handle in cache:
        return cache[handle]
    d = gql('query($q:String!){products(first:1, query:$q){nodes{status}}}', {"q": f"handle:{handle}"})
    n = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    cache[handle] = bool(n) and n[0]["status"] == "ACTIVE"
    time.sleep(0.2)
    return cache[handle]


def main():
    limit = int(os.environ.get("LIMIT", "0"))
    arts = ratgeber()
    if not arts:
        print("PAUSE: keine Ratgeber gelesen (Shopify?)")
        return
    if limit:
        arts = arts[:limit]
    print(f"{len(arts)} veröffentlichte Ratgeber")

    cache_n, cache_h = {}, {}
    versprechen, sackgassen = [], []

    for a in arts:
        body = a.get("body") or ""

        # A) Benannte Ware mit Preis, die auf eine Kollektion zeigt.
        for m in re.finditer(r'<a href="/collections/[^"]+">([^<]{6,70})</a>(.{0,60})', body, re.S):
            name, danach = m.group(1).strip(), m.group(2)
            if not re.search(r"CHF\s*\d", danach):
                continue
            if KNOPF.match(name):
                continue
            k = kennwort(name)
            if not k:
                continue
            if not gibt_es(k, cache_n):
                preis = re.search(r"CHF\s*[\d'’.]+", danach)
                versprechen.append((a, name, preis.group(0) if preis else "—", k))

        # B) Ueberhaupt kein aktives Produkt verlinkt.
        handles = re.findall(r'href="/products/([^"#?]+)', body)
        if not any(produkt_aktiv(h, cache_h) for h in handles):
            sackgassen.append((a, len(handles)))

    if versprechen or sackgassen:
        with open(BERICHT, "w") as f:
            f.write("# Ratgeber ohne Ware\n\n")
            f.write("Suchverkehr ist der einzige Kanal, der in diesem Shop verkauft. "
                    "Ein Ratgeber, der rankt und die Leserin ins Leere schickt, "
                    "verschenkt genau die Kaufabsicht, die am teuersten zu bekommen ist.\n\n")
            if versprechen:
                f.write("## ⚠️ Benannte Ware zu benanntem Preis — die es nicht gibt\n\n")
                f.write("Das ist nicht nur eine Lücke, sondern eine Falschaussage: "
                        "ein Artikel mit Namen und Preis, den niemand kaufen kann.\n\n")
                f.write("| Ratgeber | verspricht | Preis | kein Produkt zu |\n|---|---|---|---|\n")
                for a, name, preis, k in versprechen:
                    f.write(f'| [{a["title"][:45]}](/blogs/ratgeber/{a["handle"]}) '
                            f'| {name[:45]} | {preis} | `{k}` |\n')
                f.write("\n")
            if sackgassen:
                f.write("## Ratgeber ohne einen einzigen kaufbaren Produktlink\n\n")
                f.write("| Ratgeber | Produktlinks (alle tot/keine) |\n|---|---:|\n")
                for a, n in sackgassen:
                    f.write(f'| [{a["title"][:60]}](/blogs/ratgeber/{a["handle"]}) | {n} |\n')
        print(f"   Bericht → {os.path.relpath(BERICHT, REPO)}")
        for a, name, preis, k in versprechen[:10]:
            print(f'   ⚠️ «{name[:40]}» {preis} — kein Produkt zu «{k}» ({a["handle"][:35]})')
    elif os.path.exists(BERICHT):
        os.remove(BERICHT)

    print(f"FERTIG: {len(arts)} geprüft, {len(versprechen)} Falschversprechen, "
          f"{len(sackgassen)} ohne kaufbaren Produktlink")


if __name__ == "__main__":
    main()
