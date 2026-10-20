#!/usr/bin/env python3
"""judgeme_nach_stopp_ausblenden.py — blendet die Importer-Bewertungen NACH dem Import-Stopp aus (umkehrbar). 20.10.2026.

STANDARD = TROCKENLAUF (liest nur Judge.me, schreibt weder dorthin noch ins Ledger). Geschrieben wird erst mit `--scharf`, und das nur auf ausdrückliche Anweisung des
Betreibers («ja, ausblenden»): Bewertungen ausblenden ist eine Entscheidung für einen Menschen (judgeme_fake_wache.py).

Warum es die Liste gibt: Am 16.–18.10. schrieb eine zweite Sitzung auf `main` 1'191 Importer-Bewertungen nach Judge.me — nur 4–5 Sterne (Rosinenauswahl,
seit 23.08. verboten) mit je erfundener Absenderadresse `cj-import+<zufall>@luxestyle.ch` —, obwohl `dropship/_bewertungen_stopp.txt` den Import seit 12.10. anhält.

    python3 automation/judgeme_nach_stopp_ausblenden.py              # Trockenlauf: Zählung + Stichprobe, nichts wird geschrieben
    python3 automation/judgeme_nach_stopp_ausblenden.py --scharf     # PUT curated=spam (Hide) je veröffentlichter Bewertung, mit Rücklesen
    python3 automation/judgeme_nach_stopp_ausblenden.py --liste-neu  # Liste frisch von Judge.me lesen (nur lesend) — VOR --scharf, damit neu Dazugekommene mitkommen
    python3 automation/judgeme_nach_stopp_ausblenden.py --zurueck    # PUT curated=ok (Rückweg) für alles, was das Ledger als ausgeblendet führt (ok / put-ok)
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


def ausgeblendete_ids(pfad=LEDGER):
    """IDs, die dieses Skript per PUT ausgeblendet hat (Ergebnis ok / put-ok / Rücklese-Fehler nach erfolgreichem PUT). Zeilenende wird entfernt
    (Prüfung 20.10.: ohne rstrip fand der Rückweg nie eine ID)."""
    ids = []
    try:
        for z in open(pfad, encoding="utf-8"):
            f = z.rstrip("\n").split("\t")
            if len(f) >= 4 and f[2] == "ausblenden" and f[0].isdigit() and (f[3] in ("ok", "put-ok") or f[3].startswith("ruecklesen-fehl")):
                if int(f[0]) not in ids:
                    ids.append(int(f[0]))
    except OSError:
        pass
    return ids


def liste_neu(env, ab):
    """Liest Judge.me NEUESTE ZUERST bis zur AB-ID und schreibt die Importer-Bewertungen darüber in die TSV (nur lesend). → Anzahl."""
    frei = lade_freigabe()
    basis = {"api_token": env["JUDGEME_PRIVATE_TOKEN"], "shop_domain": env.get("JUDGEME_SHOP_DOMAIN", "au3j0y-hq.myshopify.com"),
             "per_page": 100}
    treffer, seite = [], 1
    while seite <= 100:
        d = hole(f"{API}/reviews?" + urllib.parse.urlencode({**basis, "page": seite}))
        revs = d.get("reviews") or []
        treffer += [r for r in revs if nach_stopp(r, ab, frei)]
        if not revs or min(int(r.get("id") or 0) for r in revs) <= ab or len(revs) < 100:
            break
        seite += 1
        time.sleep(0.3)
    treffer.sort(key=lambda r: int(r["id"]))
    tmp = LISTE + ".teil"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(f"# Judge.me-Bewertungen NACH dem Import-Stopp (ID > {ab}, Importer-Absender), neu gelesen {time.strftime('%FT%TZ', time.gmtime())}.\n")
        f.write("# Spalten: id\tcreated_at\tpublished\tcurated\thandle   (E-Mail bewusst nicht gespeichert)\n")
        for r in treffer:
            f.write(f"{r['id']}\t{str(r.get('created_at'))[:19]}\t{int(bool(r.get('published')))}\t{r.get('curated')}\t{r.get('product_handle')}\n")
    os.replace(tmp, LISTE)
    return len(treffer)


def selbsttest():
    ok = True
    ids = lade_liste()
    ok &= len(ids) == len(set(ids)) and len(ids) > 1000 and ids == sorted(ids)
    da, ab = lade_stopp()
    ok &= da and bool(ab) and all(i > ab for i in ids)
    # Rückweg-Parser gegen ein Temp-Ledger (Fund 1 der Prüfung): ok, put-ok und Rücklese-Fehler zählen, übersprungen/lesen nicht
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".tsv", delete=False, encoding="utf-8") as f:
        f.write("11\tt\tausblenden\tok\n12\tt\tausblenden\tput-ok\n13\tt\tausblenden\truecklesen-fehl:published=True curated=ok\n"
                "14\tt\tausblenden\tuebersprungen:Sicherung\n15\tt\tlesen\tfehl:X\n16\tt\twiederherstellen\tok\n11\tt\tausblenden\tok\n")
    erg = ausgeblendete_ids(f.name)
    os.unlink(f.name)
    rueck_ok = erg == [11, 12, 13]
    print(f"SELBSTTEST: {len(ids)} IDs, sortiert/eindeutig, alle > AB-ID {ab} → {'ok' if ok else 'FEHLER'}; Rückweg-Parser {erg} → {'ok' if rueck_ok else 'FEHLER (erwartet [11, 12, 13])'}")
    return bool(ok and rueck_ok)


def main(modus):
    env = lade_env()
    if not env.get("JUDGEME_PRIVATE_TOKEN"):
        print("ABBRUCH: kein privater Judge.me-Token (/tmp/judgeme.env)")
        return 2
    da, ab = lade_stopp()
    if not da or not ab:
        print("ABBRUCH: Stopp-Datei oder eindeutige Zeile AB-ID fehlt — ohne Grenze wird nichts geschrieben")
        return 2
    if modus == "liste":
        print(f"Liste neu gelesen: {liste_neu(env, ab)} Bewertungen über AB-ID {ab} → {os.path.relpath(LISTE, REPO)} (nur gelesen)")
        return 0
    frei = lade_freigabe()
    ids = lade_liste()
    zaehl = {"ok": 0, "uebersprungen": 0, "fehler": 0, "schon": 0}
    ziel = "spam" if modus == "scharf" else "ok"
    rueck = modus == "zurueck"
    schreibt = modus in ("scharf", "zurueck")           # NUR dann darf das Ledger (und Judge.me) etwas bekommen — Trockenlauf bleibt lokal sauber
    if rueck:
        ids = ausgeblendete_ids()
    for n, rid in enumerate(ids, 1):
        time.sleep(0.2 if not schreibt else 0.0)        # Trockenlauf: keine 1'191 GETs ohne Pause
        try:
            r = lies(env, rid)
        except Exception as e:                        # noqa: BLE001
            zaehl["fehler"] += 1
            if schreibt:
                ledger(rid, time.strftime("%FT%TZ", time.gmtime()), "lesen", f"fehl:{type(e).__name__}")
            continue
        if not rueck:
            if not nach_stopp(r, ab, frei):
                zaehl["uebersprungen"] += 1
                if schreibt:
                    ledger(rid, time.strftime("%FT%TZ", time.gmtime()), "ausblenden", "uebersprungen:Sicherung (ID/Absender/Freigabe)")
                continue
            if not r.get("published"):
                zaehl["schon"] += 1
                continue
        if not schreibt:
            zaehl["ok"] += 1
            continue
        akt = "wiederherstellen" if rueck else "ausblenden"
        res = put(env, rid, ziel)
        if res != "ok":
            zaehl["fehler"] += 1
            ledger(rid, time.strftime("%FT%TZ", time.gmtime()), akt, res)
            continue
        ledger(rid, time.strftime("%FT%TZ", time.gmtime()), akt, "put-ok")      # SOFORT: der Rückweg findet die ID auch, wenn das Rücklesen scheitert
        try:
            zur = lies(env, rid)
            gut = (zur.get("curated") == "spam" and not zur.get("published")) if not rueck else (zur.get("curated") == "ok")
            res = "ok" if gut else f"ruecklesen-fehl:published={zur.get('published')} curated={zur.get('curated')}"
        except Exception as e:                        # noqa: BLE001
            res = f"ruecklesen-fehl:{type(e).__name__}"
        zaehl["ok" if res == "ok" else "fehler"] += 1
        ledger(rid, time.strftime("%FT%TZ", time.gmtime()), akt, res)
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
    if arg == ["--liste-neu"]:
        sys.exit(main("liste"))
    print(f"Unbekannte Schalter {arg!r} — erlaubt: (keiner)=Trockenlauf, --liste-neu (nur lesen), --scharf, --zurueck, --selbsttest")
    sys.exit(2)
