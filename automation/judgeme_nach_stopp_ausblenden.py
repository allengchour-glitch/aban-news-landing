#!/usr/bin/env python3
"""judgeme_nach_stopp_ausblenden.py — blendet die Importer-Bewertungen NACH dem Import-Stopp aus (umkehrbar). 20.10.2026.

STANDARD = TROCKENLAUF (liest nur, schreibt nichts). Geschrieben wird erst mit `--scharf`, und das nur auf ausdrückliche Anweisung des
Betreibers («ja, ausblenden»): Bewertungen ausblenden ist eine Entscheidung für einen Menschen (judgeme_fake_wache.py).

Warum es die Liste gibt: Am 16.–18.10. schrieb eine zweite Sitzung auf `main` 1'191 Importer-Bewertungen nach Judge.me — nur 4–5 Sterne (Rosinenauswahl,
seit 23.08. verboten) mit je erfundener Absenderadresse `cj-import+<zufall>@luxestyle.ch` —, obwohl `dropship/_bewertungen_stopp.txt` den Import seit 12.10. anhält.

    python3 automation/judgeme_nach_stopp_ausblenden.py              # Trockenlauf: Zählung + Stichprobe, nichts wird geschrieben
    python3 automation/judgeme_nach_stopp_ausblenden.py --scharf     # PUT curated=spam (Hide) je veröffentlichter Bewertung, mit Rücklesen
    python3 automation/judgeme_nach_stopp_ausblenden.py --zurueck    # PUT curated=ok (Rückweg) für alles, was das Ledger als «ok» führt
    python3 automation/judgeme_nach_stopp_ausblenden.py --selbsttest

SICHERUNG je ID vor dem Schreiben (frisch von Judge.me gelesen, nicht aus der Liste): ID > AB-ID der Stopp-Datei UND Absender = Importer-Muster UND
noch veröffentlicht UND nicht in `dropship/_judgeme_freigabe.txt`. Trifft eines nicht zu, wird die ID übersprungen und im Ledger vermerkt.
Ledger: dropship/_judgeme_nach_stopp_ausgeblendet.tsv (id, Zeit, Aktion, Ergebnis). Löschen (endgültig) geht nur im Judge.me-Admin.
Ein unbekannter Schalter startet NIE einen Lauf.
"""
import os, sys, time, urllib.parse, urllib.request, json

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from judgeme_fake_wache import lade_env, hole, lade_stopp, lade_freigabe, nach_stopp, API  # noqa: E402  (Modul startet nichts beim Import)

REPO = os.path.dirname(HIER)
LISTE = os.path.join(REPO, "dropship", "_judgeme_nach_stopp_ids.tsv")
LEDGER = os.path.join(REPO, "dropship", "_judgeme_nach_stopp_ausgeblendet.tsv")


def lade_liste(pfad=LISTE):
    """→ Liste der IDs (int) aus der TSV (Kommentarzeilen mit # überspringen)."""
    ids = []
    for zeile in open(pfad, encoding="utf-8"):
        if not zeile.strip() or zeile.startswith("#"):
            continue
        teile = zeile.split("\t")
        if teile[0].strip().isdigit():
            ids.append(int(teile[0]))
    return ids


def put(env, rid, curated):
    """PUT curated=…; → 'ok' | 'put-fehl:<grund>'. Rücklesen macht der Aufrufer."""
    url = f"{API}/reviews/{rid}?" + urllib.parse.urlencode({"api_token": env["JUDGEME_PRIVATE_TOKEN"],
                                                            "shop_domain": env.get("JUDGEME_SHOP_DOMAIN", "au3j0y-hq.myshopify.com")})
    grund = "unbekannt"
    for v in range(4):
        try:
            req = urllib.request.Request(url, data=json.dumps({"curated": curated}).encode(), method="PUT",
                                         headers={"Content-Type": "application/json", "User-Agent": "luxestyle-nach-stopp/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                r.read()
            return "ok"
        except urllib.error.HTTPError as e:
            grund = f"HTTP {e.code}"
            if e.code not in (429, 500, 502, 503, 504):
                break
        except Exception as e:                       # Netz/Timeout
            grund = type(e).__name__
        time.sleep(3 * (v + 1))
    return f"put-fehl:{grund}"


def lies(env, rid):
    url = f"{API}/reviews/{rid}?" + urllib.parse.urlencode({"api_token": env["JUDGEME_PRIVATE_TOKEN"],
                                                            "shop_domain": env.get("JUDGEME_SHOP_DOMAIN", "au3j0y-hq.myshopify.com")})
    d = hole(url)
    return d.get("review") or d


def ledger(*felder):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join(str(x) for x in felder) + "\n")


def selbsttest():
    ok = True
    ids = lade_liste()
    ok &= len(ids) == len(set(ids)) and len(ids) > 1000 and ids == sorted(ids)
    da, ab = lade_stopp()
    ok &= da and bool(ab) and all(i > ab for i in ids)
    print(f"SELBSTTEST: {len(ids)} IDs, sortiert/eindeutig, alle > AB-ID {ab} → {'ok' if ok else 'FEHLER'}")
    return ok


def main(modus):
    env = lade_env()
    if not env.get("JUDGEME_PRIVATE_TOKEN"):
        print("ABBRUCH: kein privater Judge.me-Token (/tmp/judgeme.env)")
        return 2
    da, ab = lade_stopp()
    if not da or not ab:
        print("ABBRUCH: Stopp-Datei oder Zeile AB-ID fehlt — ohne Grenze wird nichts geschrieben")
        return 2
    frei = lade_freigabe()
    ids = lade_liste()
    zaehl = {"ok": 0, "uebersprungen": 0, "fehler": 0, "schon": 0}
    ziel = "spam" if modus == "scharf" else "ok"
    rueck = modus == "zurueck"
    if rueck:                                         # nur, was dieses Skript selbst ausgeblendet hat
        try:
            ids = [int(z.split("\t")[0]) for z in open(LEDGER, encoding="utf-8")
                   if z.split("\t")[2:4] == ["ausblenden", "ok"]]
        except OSError:
            ids = []
    for n, rid in enumerate(ids, 1):
        try:
            r = lies(env, rid)
        except Exception as e:                        # noqa: BLE001
            zaehl["fehler"] += 1
            ledger(rid, time.strftime("%FT%TZ", time.gmtime()), "lesen", f"fehl:{type(e).__name__}")
            continue
        if not rueck:
            if not nach_stopp(r, ab, frei):
                zaehl["uebersprungen"] += 1
                ledger(rid, time.strftime("%FT%TZ", time.gmtime()), "ausblenden", "uebersprungen:Sicherung (ID/Absender/Freigabe)")
                continue
            if not r.get("published"):
                zaehl["schon"] += 1
                continue
        if modus == "trocken":
            zaehl["ok"] += 1
            continue
        res = put(env, rid, ziel)
        if res == "ok":
            zur = lies(env, rid)
            gut = (zur.get("curated") == "spam" and not zur.get("published")) if not rueck else (zur.get("curated") == "ok")
            res = "ok" if gut else f"ruecklesen-fehl:published={zur.get('published')} curated={zur.get('curated')}"
        zaehl["ok" if res == "ok" else "fehler"] += 1
        ledger(rid, time.strftime("%FT%TZ", time.gmtime()), "wiederherstellen" if rueck else "ausblenden", res)
        time.sleep(0.4)
        if n % 100 == 0:
            print(f"… {n}/{len(ids)} {zaehl}", flush=True)
    kopf = {"trocken": "TROCKENLAUF (nichts geschrieben)", "scharf": "SCHARF ausgeblendet", "zurueck": "ZURÜCK auf sichtbar"}[modus]
    print(f"{kopf}: {zaehl} von {len(ids)} IDs (AB-ID {ab})")
    return 0


if __name__ == "__main__":
    arg = sys.argv[1:]
    if not arg:
        sys.exit(main("trocken"))
    if arg == ["--selbsttest"]:
        sys.exit(0 if selbsttest() else 1)
    if arg == ["--scharf"]:
        sys.exit(main("scharf"))
    if arg == ["--zurueck"]:
        sys.exit(main("zurueck"))
    print(f"Unbekannte Schalter {arg!r} — erlaubt: (keiner)=Trockenlauf, --scharf, --zurueck, --selbsttest")
    sys.exit(2)
