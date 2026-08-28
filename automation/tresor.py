#!/usr/bin/env python3
"""Tresor — Zugangsdaten überleben den Snapshot-Rewind.

DAS PROBLEM: Der Container stellt regelmässig einen alten Disk-Snapshot her (fester Stand
24.08.2026 15:36). Dabei wird auch /tmp zurückgedreht. Eine Datei, die VOR dem Snapshot
angelegt wurde, überlebt (deshalb ist /tmp/secrets_env.sh vom 02.08. noch da); alles, was
DANACH entsteht, ist weg. Die Judge.me-Token vom 28.08. waren schon nach Stunden verschwunden,
und der tägliche Bewertungs-Import endete als No-op. Ins Repo dürfen sie nicht — es ist
ÖFFENTLICH.

DIE LÖSUNG: ein Shop-Metafeld. Es liegt bei Shopify, nicht auf dieser Platte, überlebt also
jeden Rewind und jeden Container-Wechsel. Die Definition ist ausdrücklich mit
`access: {storefront: NONE}` angelegt — von der API bestätigt, nicht bloss angenommen. Damit
ist es nur über die Admin-API lesbar, für die man ohnehin ein Token braucht.

⚠️ Das ist KEIN Passwortmanager. Es schützt gegen Datenverlust, nicht gegen einen Angreifer,
der bereits Admin-Zugriff auf den Shop hat — der käme an dieselben Daten auch sonst.

  tresor.py setzen <name> <schluessel>=<wert> [...]   speichern
  tresor.py holen  <name>                             als KEY=WERT ausgeben
  tresor.py env    <name> <zieldatei>                 als `export KEY=WERT` schreiben (chmod 600)
  tresor.py liste                                     gespeicherte Namen zeigen (OHNE Werte)
"""
import json, os, subprocess, sys

SHOP = "au3j0y-hq.myshopify.com"
SHOP_GID = "gid://shopify/Shop/94368563585"
NS = "ls_tresor"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def token():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(REPO, "automation", "shop_token_refresh.sh")],
                       capture_output=True)
    t = open(p).read().strip()
    if not t:
        print("kein Shopify-Token — Tresor nicht erreichbar", file=sys.stderr)
        sys.exit(1)
    return t


def gql(q, v=None):
    b = {"query": q}
    if v:
        b["variables"] = v
    r = subprocess.run(["curl", "-s", "--max-time", "40",
                        f"https://{SHOP}/admin/api/2024-10/graphql.json",
                        "-H", "X-Shopify-Access-Token: " + token(),
                        "-H", "Content-Type: application/json",
                        "-d", json.dumps(b)], capture_output=True, text=True)
    return json.loads(r.stdout)


def lesen(name):
    d = gql('query($ns:String!,$k:String!){shop{metafield(namespace:$ns,key:$k){value}}}',
            {"ns": NS, "k": name})
    mf = ((d.get("data") or {}).get("shop") or {}).get("metafield")
    if not mf:
        return None
    try:
        return json.loads(mf["value"])
    except Exception:
        return None


def schreiben(name, daten):
    d = gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{field message}}}',
            {"m": [{"ownerId": SHOP_GID, "namespace": NS, "key": name,
                    "type": "json", "value": json.dumps(daten)}]})
    ue = ((d.get("data") or {}).get("metafieldsSet") or {}).get("userErrors") or []
    if ue or "errors" in d:
        print("FEHLER:", str(ue or d["errors"])[:200], file=sys.stderr)
        return False
    return True


def main():
    if len(sys.argv) < 2:
        print(__doc__); return 1
    befehl = sys.argv[1]

    if befehl == "setzen":
        name = sys.argv[2]
        daten = lesen(name) or {}
        for paar in sys.argv[3:]:
            if "=" not in paar:
                print("erwartet SCHLUESSEL=WERT, bekam:", paar, file=sys.stderr); return 1
            k, _, w = paar.partition("=")
            daten[k] = w
        if not schreiben(name, daten):
            return 1
        # Gegenprobe: zurücklesen, aber NUR die Schlüsselnamen zeigen.
        zurueck = lesen(name) or {}
        print(f"gespeichert unter «{name}»: {len(zurueck)} Schlüssel ({', '.join(sorted(zurueck))})")
        return 0

    if befehl == "holen":
        daten = lesen(sys.argv[2])
        if daten is None:
            print("nichts gespeichert", file=sys.stderr); return 1
        for k, w in daten.items():
            print(f"{k}={w}")
        return 0

    if befehl == "env":
        name, ziel = sys.argv[2], sys.argv[3]
        daten = lesen(name)
        if daten is None:
            print("nichts gespeichert", file=sys.stderr); return 1
        # ⚠️ Erst mit engen Rechten anlegen, DANN schreiben — sonst steht der Inhalt
        # für einen Moment mit umask-Standardrechten da.
        fd = os.open(ziel, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            for k, w in daten.items():
                f.write(f"export {k}={w}\n")
        print(f"{ziel} geschrieben ({len(daten)} Schlüssel, Rechte 600)")
        return 0

    if befehl == "liste":
        d = gql('query($ns:String!){shop{metafields(first:25,namespace:$ns){nodes{key updatedAt}}}}',
                {"ns": NS})
        n = (((d.get("data") or {}).get("shop") or {}).get("metafields") or {}).get("nodes") or []
        print(f"{len(n)} Einträge im Tresor:")
        for x in n:
            print(f"   {x['key']:20s} zuletzt {x['updatedAt'][:16]}")
        return 0

    print("unbekannter Befehl:", befehl, file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
