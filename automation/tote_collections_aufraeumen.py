"""Nimmt leere Kategorieseiten aus dem Shop und meldet betroffene Menuelinks.

WARUM ES DIESES WERKZEUG BRAUCHT (2026-08-09): Sobald ein Marge- oder Verfuegbarkeits-Audit
Produkte auf DRAFT setzt, laufen die zugehoerigen Marken- und Nischen-Kollektionen leer —
`tommy-hilfiger`, `guess`, `police`, `reebok` wurden so zu Seiten, die mit HTTP 200 antworten
und «Keine Produkte gefunden» zeigen. Der Kunde klickt eine Marke an und landet im Nichts.
Solche Seiten gehoeren aus allen Kanaelen genommen (nie geloescht — sobald wieder Ware da ist,
koennen sie zurueck).

Quelle ist `dropship/_coll_live_check.txt` (Status TOTE-SEITE), also der echte Kundenblick,
nicht der Admin-Zaehler.

Zusaetzlich wird das Menue geprueft: ein Link auf eine unveroeffentlichte Kollektion liefert 404 —
unsichtbar im Admin, aber sofort sichtbar fuer den Kunden.

DRY=1 meldet nur.
"""
import json, subprocess, os, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
QUELLE = "dropship/_coll_live_check.txt"
LEDGER = "dropship/_tote_colls_entfernt.txt"
PUBS = ["301970915713", "301971014017", "302032716161",
        "302566834561", "302872297857", "302994456961"]


def gql(q, v=None):
    grund = "kein Versuch ausgefuehrt"
    drossel = 0; versuche = 0       # Drosselungen zaehlen nicht als Fehlversuch
    while versuche < 4:
        r = subprocess.run(["curl", "-s", "--max-time", "50",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        # ⚠️ 17.09.2026: Hier stand `except Exception: pass` — der GRUND wurde
        # verschluckt. 15 Waechter meldeten «Shopify antwortet nicht», und keiner
        # konnte sagen warum. Ein Fehler ohne Grund ist eine Sackgasse fuer den,
        # der ihn als naechstes liest.
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
            grund = str(d.get("errors") or d)[:300]
            # THROTTLED ist kein Fehler, sondern eine Bitte um Geduld: der Eimer
            # fuellt sich mit restoreRate pro Sekunde, eine teure Abfrage braucht
            # laenger als der feste Kurzschlaf.
            if "THROTTLED" in grund.upper():
                # ⚠️ 21.09.2026: der feste 12-s-Schlaf reichte nicht. Nach JEDEM stuendlichen
                # Container-Neustart startet der Aufseher ~25 Waechter auf EINEN 2000-Punkte-
                # Eimer (100/s Nachlauf); wer hier nach 4 Versuchen aufgab, schrieb einen
                # Traceback ins Log und wartete auf den naechsten Aufseher-Zyklus — 30 min fuer
                # die 13 Reiniger, 24 h fuer die Tageswaechter (Start nach Log-ALTER). Gemessen
                # 09:08-Runde: 4 von 21 Waechtern so gestorben. Shopify sagt
                # in throttleStatus, wie lange es dauert — fragen statt raten (menue_links, frueh).
                drossel += 1
                wartezeit = 12.0
                try:
                    _k = (d.get("extensions") or {}).get("cost") or {}
                    _t = _k.get("throttleStatus") or {}
                    _fehlt = float(_k.get("requestedQueryCost") or 0) - float(_t.get("currentlyAvailable") or 0)
                    _rate = float(_t.get("restoreRate") or 0)
                    if _fehlt > 0 and _rate > 0:
                        wartezeit = min(30.0, _fehlt / _rate + 0.5)
                except Exception:
                    pass
                time.sleep(wartezeit)
                if drossel < 12:
                    continue
                grund = "12x gedrosselt (Eimer dauerhaft leer): " + grund
                break
        except Exception as e:
            roh = (r.stdout or "")[:200]
            grund = "Antwort unlesbar (" + type(e).__name__ + "): " + roh
        versuche += 1
        time.sleep(3)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird. Letzter Grund: " + grund)


def menu_links():
    """alle Menue-URLs sammeln (verschachtelt bis 3 Ebenen)"""
    d = gql('{menus(first:10){nodes{handle title items{title url items{title url items{title url}}}}}}')
    urls = []

    def walk(it, pfad):
        urls.append((pfad + " > " + it["title"], it.get("url") or ""))
        for c in it.get("items") or []:
            walk(c, pfad + " > " + it["title"])
    for m in ((d.get("data") or {}).get("menus") or {}).get("nodes") or []:
        for it in m["items"]:
            walk(it, m["handle"])
    return urls


def main():
    if not os.path.exists(QUELLE):
        print("erst coll_live_check.py laufen lassen"); return
    tot = []
    for l in open(QUELLE):
        t = l.rstrip("\n").split("\t")
        if len(t) >= 2 and t[1] == "TOTE-SEITE":
            tot.append((t[0], t[3] if len(t) > 3 else ""))
    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    tot = [t for t in tot if t[0] not in done]
    print(f"{len(tot)} leere Kategorieseiten zu entfernen | DRY={DRY}", flush=True)
    if not tot:
        return

    f = open(LEDGER, "a")
    handles = {h for h, _ in tot}
    for h, titel in tot:
        d = gql('query($h:String!){collectionByHandle(handle:$h){id}}', {"h": h})
        c = (d.get("data") or {}).get("collectionByHandle")
        if not c:
            print(f"  {h}: nicht gefunden", flush=True); continue
        print(f"  ⛔ /collections/{h}  «{titel[:40]}» → aus allen Kanälen nehmen", flush=True)
        if DRY:
            continue
        for pub in PUBS:
            gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p)'
                '{userErrors{message}}}',
                {"id": c["id"], "p": [{"publicationId": "gid://shopify/Publication/" + pub}]})
            time.sleep(0.08)
        f.write(f"{h}\tunpublished\t{titel}\n"); f.flush()

    # Menuelinks, die jetzt ins Leere zeigen
    betroffen = [(lbl, u) for lbl, u in menu_links()
                 if any(u.rstrip("/").endswith("/collections/" + h) for h in handles)]
    if betroffen:
        print("\n⚠️ Diese Menülinks zeigen jetzt auf entfernte Kollektionen (404 für Kunden):", flush=True)
        for lbl, u in betroffen:
            print(f"   {lbl}  →  {u}", flush=True)
    else:
        print("\n✅ Kein Menülink betroffen.", flush=True)


if __name__ == "__main__":
    main()
