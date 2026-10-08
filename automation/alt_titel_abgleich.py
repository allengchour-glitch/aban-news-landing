#!/usr/bin/env python3
"""alt_titel_abgleich.py — Bild-Alt-Texte tragen den AKTUELLEN Produkttitel (08.10.2026, Betreiber «weiter sauber machen»).

ANLASS: Nach dem Diamant-Lauf zeigte die Live-Seite «Lederrucksack mit Nieten und Strasssteinen», die Bilder darunter aber
«Lederrucksack mit Nieten und Diamanten – Bild 2 | LuxeStyle». GEMESSEN am Export 21:10 UTC (51'718 aktive, 361'446 Alts im
eigenen Schema): **11'730 Alts an 1'604 Produkten** nennen einen Titel, der nicht mehr gilt —
  * 1'077 Produkte mit einem anderen Titel (Auswahl-Nachrüstung «· einzeln oder 5er-Set», Material, Press-on, Kauderwelsch …),
  * 447 mit gekürztem Titel (Mass-Zusatz «· 30 × 30 cm» kam später in den Titel),
  * 80 mit einem Zusatz, den der Titel absichtlich verloren hat — darunter «& Blutdruckmessung», «zur Blutzuckermessung»,
    «mit EKG- und Blutzucker-Messung», «& Halswirbelsäulen-schonend», «– Sofort Lieferbar» (Messversprechen, die der
    Titel-Wächter entfernt hatte; Google-Bildersuche und Screenreader lasen sie weiter).
alt_nach_titel.py zieht nur Titel aus bestimmten Ledgern nach; jedes neue Werkzeug, das Titel korrigiert, liess die Bilder
zurück. Dieser Abgleich fragt nicht, WER den Titel geändert hat.

REGEL: nur Alts im eigenen Schema «<Titel> – Bild N | LuxeStyle» bzw. «<Titel> | LuxeStyle» (Erzeuger: alt_texte_nachziehen.py,
alt_text_backfill.mjs); der Titel-Teil wird zum aktuellen Titel, die Bildnummer bleibt. Handgeschriebene Alts (ohne Schema)
und Editor/POD-Ware (Tags printful/pod/selbst-gestalten) bleiben unberührt. Kandidaten aus dem Export, entschieden wird LIVE
(Titel und Alts frisch gelesen — ein Titel kann sich seit dem Export geändert haben). Rücklesen auf Gleichheit.
  python3 automation/alt_titel_abgleich.py              # trocken (Plan + Bericht)
  SCHARF=1 [CAP=n] python3 automation/alt_titel_abgleich.py
EXPORT= Bulk-Datei mit Produkten (id, title, tags) und Medien-Kindzeilen (id, alt); Standard: der Export von versprechen_wache.py.
Ledger dropship/_alt_titel_abgleich.tsv (zeit, produkt, medium, alt, neu, status) → Spalte 4 zurückschreiben = Rückweg.
"""
import collections, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

SCHARF = os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP") or 100000)
ZEIT_S = int(os.environ.get("ZEIT_S") or 2000)   # sauberes Ende VOR dem äusseren timeout (Bericht + Ledger bleiben ganz)
EXPORT = os.environ.get("EXPORT") or "/tmp/versprechen_export.jsonl"
LEDGER = os.path.join(REPO, "dropship", "_alt_titel_abgleich.tsv")
BERICHT = os.path.join(REPO, "dropship", "ALT-TITEL-ABGLEICH.md")
SCHEMA = re.compile(r"^(.*?)(?: – Bild (\d+))? \| LuxeStyle$", re.S)
POD = re.compile(r"printful|\bpod\b|selbst-gestalten|editor", re.I)
Q = 'query($id:ID!){product(id:$id){id title status tags media(first:50){nodes{id alt}}}}'
M = ('mutation($id:ID!,$m:[UpdateMediaInput!]!){productUpdateMedia(productId:$id,media:$m){media{id alt} '
     'mediaUserErrors{message}}}')


def nz(s):
    return (s or "").replace("‑", "-").replace(" ", " ").replace("\xa0", " ").strip()


def neu_alt(alt, titel):
    """Neuer Alt-Text oder None (kein Schema / schon richtig)."""
    m = SCHEMA.match(nz(alt))
    t = (titel or "").strip()
    if not m or not t or nz(m.group(1)) == nz(t):
        return None
    return f"{t} – Bild {m.group(2)} | LuxeStyle" if m.group(2) else f"{t} | LuxeStyle"


def art(alt, titel):
    x, t = nz(SCHEMA.match(nz(alt)).group(1)), nz(titel)
    return "titel+zusatz" if x.startswith(t) else "titel gekürzt" if t.startswith(x) else "anderer titel"


KANARIEN = [
    ("Elegante Quarzuhr mit Diamanten für Herren – Bild 3 | LuxeStyle", "Elegante Quarzuhr mit Strasssteinen für Herren",
     "Elegante Quarzuhr mit Strasssteinen für Herren – Bild 3 | LuxeStyle"),
    ("Smartwatch mit Herzfrequenz & Blutdruck – Bild 1 | LuxeStyle", "Smartwatch mit Herzfrequenz",
     "Smartwatch mit Herzfrequenz – Bild 1 | LuxeStyle"),
    ("Kugeliges Zierkissen | LuxeStyle", "Kugeliges Zierkissen · 30 × 30 cm", "Kugeliges Zierkissen · 30 × 30 cm | LuxeStyle"),
    ("Rotes Kleid von vorne", "Kleid", None),
    ("Kleid – Bild 2 | LuxeStyle", "Kleid", None),
    ("Kleid‑Set – Bild 2 | LuxeStyle", "Kleid-Set", None),
    ("undundundund – Bild 4 | LuxeStyle", "Armband aus Edelstahl", "Armband aus Edelstahl – Bild 4 | LuxeStyle"),
    ("Tasche – Bild 2 | LuxeStyle", "", None),
]


def selbsttest():
    f = 0
    for a, t, soll in KANARIEN:
        ist = neu_alt(a, t)
        if ist != soll:
            f += 1
            print(f"  ✗ {a!r} / {t!r}\n      ist  {ist!r}\n      soll {soll!r}")
    print(f"Selbsttest: {len(KANARIEN) - f}/{len(KANARIEN)} ok")
    return f == 0


def kandidaten():
    prod, med = {}, collections.defaultdict(list)
    for z in open(EXPORT, encoding="utf-8"):
        o = json.loads(z)
        if "__parentId" in o:
            if "alt" in o:
                med[o["__parentId"]].append(o)
        elif "title" in o:
            prod[o["id"]] = o
    out = []
    for pid, ms in med.items():
        p = prod.get(pid)
        if not p or POD.search(" ".join(p.get("tags") or [])):
            continue
        if any(neu_alt(m.get("alt"), p["title"]) for m in ms):
            out.append(pid)
    return out, len(prod)


def main():
    if not selbsttest():
        raise SystemExit("Kanarien rot — nichts geschrieben")
    if "--selbsttest" in sys.argv:
        return 0
    from kaufwille_zeile import gql                      # Eimer-Etikette eingebaut
    if not os.path.exists(EXPORT):
        raise SystemExit(f"kein Export {EXPORT}")
    kand, n_prod = kandidaten()
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {n_prod} Produkte im Export, {len(kand)} Kandidaten · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    getan = fehler = produkte = 0
    arten, bsp = collections.Counter(), collections.defaultdict(list)
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    t0, rest = time.time(), 0
    for nr, pid in enumerate(kand[:CAP]):
        if time.time() - t0 > ZEIT_S:
            rest = len(kand[:CAP]) - nr
            print(f"ZEIT: {ZEIT_S} s um, {rest} Kandidaten für den nächsten Lauf", flush=True)
            break
        p = gql(Q, {"id": pid})["product"]
        if not p or p["status"] != "ACTIVE" or POD.search(" ".join(p.get("tags") or [])):
            continue
        aend = [(m["id"], m["alt"], neu_alt(m["alt"], p["title"])) for m in p["media"]["nodes"]]
        aend = [x for x in aend if x[2]]
        if not aend:
            continue
        produkte += 1
        k = art(aend[0][1], p["title"])
        arten[k] += 1
        if len(bsp[k]) < 12:
            bsp[k].append((aend[0][1], aend[0][2]))
        if not SCHARF:
            getan += len(aend)
            continue
        r = gql(M, {"id": pid, "m": [{"id": i, "alt": n} for i, _, n in aend]})["productUpdateMedia"]
        live = {x["id"]: x["alt"] for x in (r.get("media") or [])}
        for i, a, n in aend:
            ok = not r.get("mediaUserErrors") and live.get(i) == n
            getan += ok
            fehler += not ok
            led.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), pid, i, (a or "").replace("\t", " "), n,
                                 "ok" if ok else f"FEHLER {str(r.get('mediaUserErrors'))[:60]}"]) + "\n")
        led.flush()
        time.sleep(0.2)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Bild-Alt-Texte ↔ aktueller Titel — Stand {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} UTC\n\n"
                f"Regel: `automation/alt_titel_abgleich.py` (nur Schema «<Titel> – Bild N | LuxeStyle», POD/Editor ausgenommen, "
                f"live entschieden). Export: {n_prod} aktive · Produkte {'geändert' if SCHARF else 'zu ändern'}: {produkte} · "
                f"Alt-Texte: {getan} · Fehler: {fehler} · offen für den nächsten Lauf: {rest}\n\n")
        for k, v in arten.most_common():
            f.write(f"## {k} ({v} Produkte)\n\n")
            for a, n in bsp[k]:
                f.write(f"- «{a}» → «{n}»\n")
            f.write("\n")
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {produkte} Produkte, {getan} Alt-Texte "
          f"{'gesetzt (gleich zurückgelesen)' if SCHARF else 'würden gesetzt'}, {fehler} Fehler, {rest} offen · {dict(arten)}", flush=True)
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
