"""Holt verkäufliche Ware in den Google-Kanal, die dort ohne Grund fehlt.

DER BEFUND (11.08.2026, aus dem Katalog-Export): 3'686 aktive Produkte sind im Onlineshop
sichtbar, aber NICHT im Google-Kanal. Es ist kein Ausfall — os=true bei allen —, sondern eine
über Monate gewachsene Kanal-Auswahl. Nur ein Teil davon gehört wirklich draussen:

    2'408  heikle Ware        Kostüm/Fasnacht, Erotik, Refurb, Messer, Rauchzubehör
       95  Code im Titel      unlesbare Anzeigentexte
       72  keine Lieferanten-SKU   unbestellbar (Risikoklasse #1008)
    1'111  ohne Grund draussen ← darum geht es hier

Unter den 1'111 stehen ausgerechnet die Bewertungssieger: Slim Wallet (5,0★), Herrenuhr (5,0★),
dazu Markenschmuck bis CHF 194.90. Google ist der einzige Kanal mit belegten Verkäufen — vier
von zehn Bestellungen; über TikTok kam in der gesamten Historie keine einzige. Ein kostenloser
Eintrag kostet nichts und ist damit der billigste Hebel, den der Shop hat.

⚠️ WAS DRAUSSEN BLEIBT UND WARUM: Kostüm/Erotik/Refurb riskieren eine Kontosperre — die wiegt
schwerer als jede Reichweite. Messer und Rauchzubehör (Shisha, Vape) fallen unter Googles
Beschränkungen für Waffen und Tabak; die Shisha stand im ersten Entwurf noch in der
Veröffentlichungsliste und wurde erst beim Durchsehen der teuersten Kandidaten entdeckt.
Titel mit Artikelcodes ergeben unlesbare Anzeigen. Ware ohne Lieferanten-Referenz kann man
nicht nachbestellen — sie zu bewerben, führt geradewegs zur nächsten Erstattung.

Grundlage ist der lokale Export (/tmp/export.jsonl), nicht die API: 29'000 Produkte live zu
scannen, während ein Dutzend Reiniger dasselbe tun, erschöpft Shopifys Abfragebudget — dann
antwortet die API mit «Throttled», und Auswertungen melden fälschlich «keine Daten».

DRY=1 meldet nur.
"""
import json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from google_sperrliste import gesperrte_ids, id_zahl, tag_gesperrt

# ⛔ NACHKONTROLLE 14.08.2026: Dieses Skript hat zwei Produkte in den Google-Kanal
# publiziert, die wegen von GOOGLE SELBST gemeldeter Richtlinienverstösse dort
# herausgenommen worden waren — «Pailletten Neckholder Minikleid» (Restricted adult content,
# 15492325933441) und «Mundspülung» (personal hardships, 15492080435585); beide stehen mit
# «im-google-kanal» im eigenen Ledger. Die Ausschlussliste unten kennt nur WORTMUSTER im
# Titel; ein bereits gemeldeter Verstoss steht aber nicht im Titel, sondern als Tag am
# Produkt. Beides wird jetzt geprüft: Sperr-Ledger und Tag.

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
GOOG = "gid://shopify/Publication/302872297857"
LEDGER = "dropship/_google_kanal_nachziehen.txt"

# ⚠️ 04.09.2026: Diese Liste war die ALTE, ungeankerte Fassung — «messer|dolch|machete|
# waffe|maske\b|grinder\b». Damit galten Waffelstrick-Pullover als Waffe, Schlafmasken als
# Kostuem und ein Seifengrinder als Rauchzubehoer, und die gepflegte Klingenregel war
# beschattet (HEIKEL wird VOR ihr geprueft). Der Schliesser wurde am 29.08. repariert,
# dieser Zwilling nicht. Jetzt EINE Quelle — und die Klingenfrage beantwortet
# ausschliesslich ist_klinge().
from google_sperrliste import HEIKEL
from klingenregel import ist_klinge
CODE = re.compile(r'\b[A-Z]{2,}\d{3,}\b|\b[A-Z0-9]{8,}\b|\bUS Size\b|\bYards\b|Generation \d')


def lieferantenref(sku):
    s = (sku or "").strip()
    if not s:
        return False
    if "_" in s and s.split("_")[0].isdigit():
        return True                                   # Printful
    return bool(re.match(r'^(CJ|bb|fortura|LX|LXSCH)', s, re.I))


def gql(q, v=None):
    with open("/tmp/_gkn.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_gkn.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    sperr = gesperrte_ids()
    kandidaten, gruende = [], {}
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE" or p.get("g") or not p.get("os"):
            continue
        # ⛔ Von Google gemeldeter Verstoss — steht im Ledger oder als Tag am Produkt.
        # Das ist keine Vermutung über eine Richtlinie, sondern eine bereits erfolgte
        # Meldung; ein zweiter Verstoss danach kostet das ganze Merchant-Konto.
        if id_zahl(p["id"]) in sperr or tag_gesperrt(p.get("tags")):
            gruende["Google-Sperre (gemeldeter Verstoss)"] = \
                gruende.get("Google-Sperre (gemeldeter Verstoss)", 0) + 1
            continue
        titel, typ = p["title"], (p.get("productType") or "")
        vs = (p.get("variants") or {}).get("nodes") or []
        sku = (vs[0].get("sku") if vs else "") or ""
        preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
        bilder = (p.get("mediaCount") or {}).get("count") or 0
        grund = None
        if HEIKEL.search(titel) or HEIKEL.search(typ) or ist_klinge(titel):
            grund = "heikle Ware"
        elif CODE.search(titel):
            grund = "Code im Titel"
        elif not lieferantenref(sku):
            grund = "keine Lieferanten-SKU"
        elif bilder < 1:
            grund = "ohne Bild"
        elif preis <= 0:
            grund = "ohne Preis"
        if grund:
            gruende[grund] = gruende.get(grund, 0) + 1
            continue
        kandidaten.append((p["id"], titel, preis))

    print(f"aktiv, im Shop, nicht bei Google: {sum(gruende.values()) + len(kandidaten)}", flush=True)
    for k, v in sorted(gruende.items(), key=lambda x: -x[1]):
        print(f"   bleibt draussen – {k}: {v}", flush=True)
    print(f"→ nachziehen: {len(kandidaten)}", flush=True)

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    offen = [k for k in kandidaten if k[0] not in done]
    if DRY:
        for gid, t, pr in sorted(offen, key=lambda x: -x[2])[:12]:
            print(f"   CHF {pr:>7.2f}  {t[:56]}", flush=True)
        return

    f = open(LEDGER, "a")
    n = 0
    for gid, titel, preis in offen:
        # ⚠️ Status live gegenprüfen: Der Export ist ein Schnappschuss. Zwischen Export und
        # Lauf kann ein anderer Reiniger das Produkt bewusst gedraftet haben — es dann zu
        # veröffentlichen, würde genau diese Entscheidung rückgängig machen.
        d = gql('query($id:ID!){node(id:$id){... on Product{status tags}}}', {"id": gid})
        knoten = (d.get("data") or {}).get("node") or {}
        if knoten.get("status") != "ACTIVE":
            f.write(f"{gid}\tinzwischen-nicht-aktiv\n")
            continue
        if tag_gesperrt(knoten.get("tags")):
            # Zwischen Export und Lauf gesperrt. ⚠️ NICHT quittieren: die Sperre kann mit
            # Unterlagen aufgehoben werden, ein Ledger-Eintrag hielte das Produkt für immer
            # aus dem Kanal.
            print(f"  ⛔ gesperrt, bleibt draussen: {titel[:46]}", flush=True)
            continue
        r = gql('mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p)'
                '{userErrors{message}}}', {"id": gid, "p": [{"publicationId": GOOG}]})
        errs = ((r.get("data") or {}).get("publishablePublish") or {}).get("userErrors")
        if errs:
            print(f"  ⚠️ {titel[:40]}: {errs[0]['message']}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\tim-google-kanal\t{titel}\n")
        if n % 100 == 0:
            f.flush()
            print(f"  … {n}/{len(offen)}", flush=True)
        time.sleep(0.15)
    f.flush()
    print(f"FERTIG: {n} Produkte in den Google-Kanal aufgenommen")


if __name__ == "__main__":
    main()
