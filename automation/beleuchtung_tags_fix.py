#!/usr/bin/env python3
"""Hält die Kollektion «Beleuchtung» (sub-beleuchtung + beleuchtung-lampen, Regel TAG=beleuchtung)
sauber — in beiden Richtungen (23.09.2026, Audit-Befund 2).

GEMESSEN 23.09. 18:00 UTC: sub-beleuchtung zeigte 31 aktive Artikel, davon 6 fachfremd (NS21-
Gamepad, Leuchtendes Hai-T-Shirt, BRUDER-Rundumleuchte, Kinder-Wintermütze, Aroma-Diffuser,
Wellness-Bundle); gleichzeitig trugen 163 aktive Produkte den Tag `lampe`, aber nicht
`beleuchtung` — darunter Tisch-, Wand-, Decken- und Nachttischlampen.
URSACHE: automation/cat_tags.mjs Zeile 42 `/\\blampe\\b|leuchte|…/` — `\\blampe\\b` findet kein
Kompositum («Tischlampe»), nacktes `leuchte` findet «leuchtende» und «Rundumleuchte».

EINE Wahrheit: entschieden wird mit `istBeleuchtung()` aus cat_tags.mjs (derselbe Code, den die
Importer benutzen) — dieses Skript ruft Node dafür auf, statt die Regex nachzubauen. Wer die Regel
ändert, ändert sie dort und prüft sie mit `node automation/cat_tags.mjs --test`.

Ablauf:  (1) Kanarienvögel von cat_tags.mjs müssen OK sein, sonst Abbruch
         (2) Kandidaten: alle Produkte mit Tag beleuchtung (jeder Status) + aktive mit Tag lampe
             + /tmp/export.jsonl (aktive Titel, nur wenn jünger als 48 h)
         (3) HINZU  = ACTIVE, ohne Tag, istBeleuchtung(Titel)
             WEG    = mit Tag, NICHT istBeleuchtung(Titel), ohne Schutz-Tag `beleuchtung-manuell`
         (4) vor dem Schreiben jedes Produkt LIVE nachlesen (Titel/Status/Tags) und neu entscheiden
         (5) tagsAdd / tagsRemove nacheinander, Eimer-Etikette nach jeder Antwort
         (6) zurücklesen: jedes geschriebene Produkt + Kollektionszahl vorher/nachher
Sicherung der alten Tags: /tmp/beleuchtung_tags_sicherung_<datum>.json (Liste mit id/titel/tags).

Umgebung: DRY=1 (nur zeigen) · MAX=400 (Deckel pro Lauf; mehr = Regel kaputt → Abbruch)
Letzte Zeile «FERTIG …» = Lauf sauber (Konvention von fixer_keepalive.sh).
Schutz: Ein Produkt, das von Hand in «Beleuchtung» gehört, bekommt den Tag `beleuchtung-manuell`.
"""
import json, os, subprocess, sys, time, urllib.request
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from eimer_etikette import nachlauf  # noqa: E402

SHOP = "au3j0y-hq.myshopify.com"
DRY = os.environ.get("DRY") == "1"
MAX = int(os.environ.get("MAX", "400"))
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
NODE = "/opt/node22/bin/node" if os.path.exists("/opt/node22/bin/node") else "node"
TAG = "beleuchtung"
SCHUTZ = "beleuchtung-manuell"
KOLLEKTIONEN = ["sub-beleuchtung"]
# Einzelfälle, die der Titel nicht verrät (Beschreibung gelesen 23.09.): nie in «Beleuchtung»
NIE = {
    "Leuchte LED tragbar",  # Sport & Outdoor: Taschenlampe für Jagd/Patrouille laut Beschreibung
}


def token():
    return open("/tmp/cj_shop_token.txt").read().strip()


def gql(q, v=None, versuche=8):
    body = json.dumps({"query": q, "variables": v or {}}).encode()
    for i in range(versuche):
        try:
            req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json", data=body,
                                         headers={"X-Shopify-Access-Token": token(),
                                                  "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:  # Netz: warten, nochmals
            print("  Netz:", str(e)[:120]); time.sleep(2 * (i + 1)); continue
        if d.get("errors"):
            if "hrottled" in json.dumps(d["errors"]):
                time.sleep(3 * (i + 1)); continue
            raise RuntimeError("GraphQL: " + json.dumps(d["errors"])[:400])
        if d.get("data") is None:
            time.sleep(2 * (i + 1)); continue
        nachlauf(d)
        return d["data"]
    raise RuntimeError("Shopify blieb stumm — nichts quittiert")


def hat_tag(tags, name):
    """Gross/klein-blind wie Shopify (23.09.: «Beleuchtung» galt beim ersten Lauf als fehlend)."""
    return any(t.lower() == name for t in tags or [])


def zaehle(q):
    r = gql('query($q:String!){productsCount(query:$q,limit:null){count precision}}', {"q": q})["productsCount"]
    return r["count"], r["precision"]


def alle(q):
    out, cur = [], None
    while True:
        d = gql('query($q:String!,$c:String){products(first:250,query:$q,after:$c){pageInfo{hasNextPage endCursor}'
                ' nodes{id title status productType tags}}}', {"q": q, "c": cur})["products"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        cur = d["pageInfo"]["endCursor"]


def klassifiziere(paare):
    """Ruft istBeleuchtung(titel, productType) aus cat_tags.mjs für eine Liste auf (eine Node-Instanz).
    paare = [(titel, productType), ...]; NIE-Titel sind immer False."""
    js = ("import {istBeleuchtung} from './cat_tags.mjs';"
          "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{"
          "process.stdout.write(JSON.stringify(JSON.parse(s).map(([t,x])=>istBeleuchtung(t,x))));});")
    titel = [[t or "", x or ""] for t, x in paare]
    r = subprocess.run([NODE, "--input-type=module", "-e", js], input=json.dumps(titel), cwd=HIER,
                       capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError("Node-Klassifizierer: " + r.stderr[:400])
    res = json.loads(r.stdout)
    if len(res) != len(titel):
        raise RuntimeError("Node-Klassifizierer: Länge stimmt nicht")
    return [False if t.strip() in NIE else r for (t, _), r in zip(titel, res)]


def kollektionszahlen():
    z = {}
    for h in KOLLEKTIONEN:
        c = gql('query($h:String!){collectionByHandle(handle:$h){id}}', {"h": h})["collectionByHandle"]
        if c:
            z[h] = zaehle(f"status:active AND collection_id:{c['id'].split('/')[-1]}")
    return z


def main():
    t = subprocess.run([NODE, os.path.join(HIER, "cat_tags.mjs"), "--test"], capture_output=True, text=True)
    if t.returncode != 0:
        print("⛔ Kanarienvögel in cat_tags.mjs schlagen fehl — kein Lauf:\n" + t.stdout[-800:]); return 2
    kanarie = zaehle("status:active AND tag:beleuchtung-xqzv-kanarie")
    if kanarie[0] != 0:
        print("⛔ Kanarienvogel-Suche liefert", kanarie, "— Suchfilter unzuverlässig, kein Lauf"); return 2

    vorher = kollektionszahlen()
    print("Kollektion vorher:", vorher, "| aktiv mit Tag:", zaehle("status:active AND tag:beleuchtung"))

    kand = {}
    for p in alle(f"tag:{TAG}"):
        kand[p["id"]] = p
    for p in alle("status:active AND tag:lampe"):
        kand.setdefault(p["id"], p)
    export_alt = None
    if os.path.exists(EXPORT):
        alter_h = (time.time() - os.path.getmtime(EXPORT)) / 3600
        if alter_h <= 48:
            n = 0
            for zeile in open(EXPORT, encoding="utf-8"):
                try:
                    p = json.loads(zeile)
                except ValueError:
                    continue
                if p.get("status") == "ACTIVE" and p.get("id") not in kand:
                    kand[p["id"]] = {"id": p["id"], "title": p.get("title", ""), "status": "ACTIVE",
                                     "productType": p.get("productType", ""), "tags": p.get("tags", []),
                                     "quelle": "export"}
                    n += 1
            print(f"Export {EXPORT} ({alter_h:.0f} h alt): {n} weitere aktive Titel geprüft")
        else:
            export_alt = alter_h
            print(f"⚠️ Export {EXPORT} ist {alter_h:.0f} h alt — nur Live-Kandidaten (Tag beleuchtung/lampe)")

    liste = list(kand.values())
    urteil = klassifiziere([(p["title"], p.get("productType", "")) for p in liste])
    hinzu, weg = [], []
    for p, ja in zip(liste, urteil):
        hat = hat_tag(p["tags"], TAG)
        if ja and not hat and p["status"] == "ACTIVE":
            hinzu.append(p)
        elif hat and not ja and not hat_tag(p["tags"], SCHUTZ) and p.get("quelle") != "export":
            # WEG nur aus der LIVE-Liste: die Tags im Export sind bis 48 h alt (Trockenlauf 23.09.
            # zeigte sechs längst bereinigte Produkte erneut als «mit Tag»)
            weg.append(p)
    print(f"Plan: HINZU {len(hinzu)} · WEG {len(weg)} (von {len(liste)} Kandidaten)")
    for p in sorted(weg, key=lambda x: x["status"]):
        print(f"  − {p['status'][:1]} {p['title'][:90]}")
    for p in hinzu:
        print(f"  + {p['title'][:90]}")
    if len(hinzu) + len(weg) > MAX:
        print(f"⛔ {len(hinzu) + len(weg)} Änderungen > MAX={MAX} — Regel prüfen, kein Schreiben"); return 3
    if DRY or not (hinzu or weg):
        print("DRY — nichts geschrieben" if DRY else "Nichts zu tun.")
        print(f"FERTIG {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC · Plan +{len(hinzu)}/−{len(weg)}{' (DRY)' if DRY else ''}")
        return 0

    # Sicherung der alten Tags (vor jedem Schreiben)
    sich = f"/tmp/beleuchtung_tags_sicherung_{datetime.now(timezone.utc):%Y%m%d_%H%M}.json"
    json.dump([{"id": p["id"], "title": p["title"], "tags": p["tags"]} for p in hinzu + weg],
              open(sich, "w"), ensure_ascii=False)
    print("Sicherung:", sich)

    geschrieben = {"hinzu": [], "weg": []}
    for art, gruppe in (("hinzu", hinzu), ("weg", weg)):
        for p in gruppe:
            live = gql('query($id:ID!){product(id:$id){id title status productType tags}}', {"id": p["id"]})["product"]
            if not live:
                continue
            ja = klassifiziere([(live["title"], live["productType"])])[0]
            hat = hat_tag(live["tags"], TAG)
            if art == "hinzu" and not (ja and not hat and live["status"] == "ACTIVE"):
                continue
            if art == "weg" and not (hat and not ja and not hat_tag(live["tags"], SCHUTZ)):
                continue
            mut = "tagsAdd" if art == "hinzu" else "tagsRemove"
            # Shopify-Tags sind für Regeln und Suche gross/klein-blind («Beleuchtung» = «beleuchtung»):
            # beim Entfernen jede vorhandene Schreibweise nennen
            welche = [TAG] if art == "hinzu" else [t for t in live["tags"] if t.lower() == TAG]
            r = gql(f'mutation($id:ID!,$t:[String!]!){{{mut}(id:$id,tags:$t){{userErrors{{message}}}}}}',
                    {"id": p["id"], "t": welche})[mut]
            if r["userErrors"]:
                print("  FEHLER", p["title"][:60], r["userErrors"]); continue
            geschrieben[art].append(p["id"])

    # Zurücklesen
    ok = falsch = 0
    for art, ids in geschrieben.items():
        for i in range(0, len(ids), 50):
            ns = gql('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title tags}}}', {"ids": ids[i:i + 50]})["nodes"]
            for n in ns:
                soll = art == "hinzu"
                if hat_tag(n["tags"], TAG) == soll:
                    ok += 1
                else:
                    falsch += 1; print("  ⚠️ Rücklesen falsch:", n["title"][:70])
    print(f"Geschrieben: +{len(geschrieben['hinzu'])} / −{len(geschrieben['weg'])} · rückgelesen OK {ok}, falsch {falsch}")
    time.sleep(5)  # Smart-Kollektion braucht einen Moment
    print("Kollektion nachher:", kollektionszahlen(), "| aktiv mit Tag:", zaehle("status:active AND tag:beleuchtung"))
    if export_alt:
        print(f"Hinweis: Export war {export_alt:.0f} h alt — Lampen ohne Tag lampe wurden nicht gesucht")
    if falsch:
        print(f"⚠️ {falsch} Rücklesefehler — kein FERTIG"); return 1
    print(f"FERTIG {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC · +{len(geschrieben['hinzu'])}/−{len(geschrieben['weg'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
