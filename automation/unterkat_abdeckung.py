#!/usr/bin/env python3
"""unterkat_abdeckung.py — messen, wo eine grosse Hauptkategorie keine (oder zu grobe) Unterkategorien hat (22.10.2026).

ANLASS: Betreiber-Screenshot der App «Elektronik & Technik» (22.10.): «so viele Produkte — kann man besser filtern oder Unterkategorien
erstellen?». Die Chips oben in der App sind die Menü-Unterpunkte der Hauptkategorie (main-menu → Punkt → Unterpunkte); ein Produkt, das in
keiner dieser Unterkollektionen steht, ist in der App nur über die lange Gesamtliste erreichbar. GEMESSEN 22.10.: Elektronik & Technik
4'515 aktive Produkte, 1'432 (31 %) in KEINER Unterkollektion, die Chips-Reihenfolge stellte «Lifestyle & Trends» (2'641) und
«Elektronik-Kleinteile» vor die starken Gruppen.

Je Hauptmenü-Punkt (Ziel = Kollektion) werden alle AKTIVEN Produkte samt Kollektionsmitgliedschaft gelesen (nur lesen):
  aktiv        Zahl aktiver Produkte der Hauptkollektion
  ohne         davon in KEINER der Menü-Unterkollektionen (die Hauptkollektion selbst und Geschwister ausserhalb zählen nicht)
  anteil_ohne  ohne / aktiv
  gross        Unterkollektionen mit mehr als GROSS_ANTEIL der Hauptkollektion (zu grob, Chip sagt nichts)
  woerter      häufigste Titelwörter der Produkte ohne Unterkollektion (Hinweis, welche Unterkollektion fehlt)

  python3 automation/unterkat_abdeckung.py                     # alle Hauptmenü-Punkte, schreibt dropship/_unterkat_abdeckung.json
  python3 automation/unterkat_abdeckung.py --nur elektronik-technik
  python3 automation/unterkat_abdeckung.py --zeile             # eine Ampelzeile aus dem letzten Stand
  python3 automation/unterkat_abdeckung.py --selbsttest

Reihenfolge der Chips: `chip_reihenfolge()` bewertet Unterpunkte nach Grösse und Nähe zur Hauptkategorie (Lifestyle & Trends zuletzt);
das Werkzeug ändert das Menü NICHT (siehe automation/menue_unterkat_ordnen.py).
"""
import collections
import json
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
STAND = os.path.join(REPO, "dropship", "_unterkat_abdeckung.json")
SCHWELLE_ANTEIL = float(os.environ.get("SCHWELLE_ANTEIL", "0.20"))   # ab so viel Anteil ohne Unterkollektion → Befund
MIN_AKTIV = int(os.environ.get("MIN_AKTIV", "300"))                  # kleine Kategorien brauchen keine Unterteilung
GROSS_ANTEIL = float(os.environ.get("GROSS_ANTEIL", "0.50"))         # eine Unterkollektion mit > 50 % der Hauptkategorie ist zu grob
STOPP = {"mit", "und", "für", "fuer", "aus", "der", "die", "das", "von", "bei", "set", "stück", "stueck", "für", "zum", "zur", "den", "dem",
         "ein", "eine", "einer", "damen", "herren", "kinder", "neue", "neuer", "neues", "hochwertige", "hochwertiger", "multifunktionale"}


def handle_aus_url(url):
    """Kollektions-Handle aus der Menü-URL. Prozent-kodierte Handles (z. B. «%F0%9F%8E%81-geschenke-…» für «🎁-geschenke-…») werden dekodiert (22.10. Prüfung):
    die Admin-API kennt den Handle mit dem Emoji, die Menü-URL liefert ihn kodiert."""
    m = re.search(r"/collections/([^/?#]+)", url or "")
    return urllib.parse.unquote(m.group(1)) if m else None


def abdeckung(produkte, kinder, eltern):
    """produkte = [{titel, kollektionen:set(handle)}] der AKTIVEN Hauptkollektion; kinder = Handles der Menü-Unterpunkte.
    Liefert {aktiv, ohne, anteil_ohne, je_kind:{handle:n}, woerter:[(wort,n)]}. Die Hauptkollektion zählt nicht als Unterkollektion."""
    kinder = {k for k in kinder if k and k != eltern}
    je = collections.Counter()
    ohne = []
    k_alle, k_ohne = collections.Counter(), collections.Counter()   # Kollektionen ausserhalb des Menüs: Mitglieder gesamt / in der Lücke
    for p in produkte:
        hit = p["kollektionen"] & kinder
        for k in hit:
            je[k] += 1
        for k in p["kollektionen"] - kinder - {eltern}:
            k_alle[k] += 1
        if not hit:
            ohne.append(p)
            for k in p["kollektionen"] - kinder - {eltern}:
                k_ohne[k] += 1
    w = collections.Counter()
    for p in ohne:
        for tok in re.findall(r"[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-]{4,}", p["titel"] or ""):
            if tok.lower() not in STOPP:
                w[tok.lower()] += 1
    n = len(produkte)
    return {"aktiv": n, "ohne": len(ohne), "anteil_ohne": round(len(ohne) / n, 3) if n else 0.0,
            "je_kind": dict(je), "woerter": w.most_common(25), "koll_alle": dict(k_alle), "koll_ohne": dict(k_ohne)}


def chip_reihenfolge(kinder, groessen, eltern=None):
    """Sortiert Unterpunkte für die Chip-Reihe: die Hauptkategorie selbst zuerst, dann mittelgrosse Fachgruppen vor Riesen-Sammelgruppen.
    groessen = {handle: aktive Produkte}. Sammelgruppen (> 1.5× Median UND handle in SAMMEL) und Kleinstgruppen (< 30) kommen zuletzt."""
    SAMMEL = {"trends-gadgets", "bestseller", "neu-eingetroffen", "angebote", "sale"}
    werte = sorted(v for v in groessen.values() if v)
    med = werte[len(werte) // 2] if werte else 0

    def rang(h):
        g = groessen.get(h, 0)
        if h == eltern:
            return (0, 0)
        if h in SAMMEL or (med and g > 3 * med):
            return (3, -g)
        if g < 30:
            return (2, -g)
        return (1, -g)
    return sorted(kinder, key=rang)


def kollektionen_lesen(gql, handle):
    """Alle aktiven Produkte der Kollektion mit Titel und Kollektions-Handles (100er-Seiten, 0.6 s je Seite gemessen 22.10.)."""
    out, cur = [], None
    for _ in range(400):
        q = ('{ collectionByHandle(handle:"%s"){ products(first:100%s){ pageInfo{hasNextPage endCursor} nodes{ status title '
             'collections(first:50){ nodes{ handle } } } } } }') % (handle, (', after:"%s"' % cur) if cur else "")
        c = gql(q)["collectionByHandle"]
        if not c:
            return None
        p = c["products"]
        for x in p["nodes"]:
            if x["status"] == "ACTIVE":
                out.append({"titel": x["title"], "kollektionen": {n["handle"] for n in x["collections"]["nodes"]}})
        if not p["pageInfo"]["hasNextPage"]:
            break
        cur = p["pageInfo"]["endCursor"]
    return out


def nachfahren(items):
    """Handles ALLER Unterpunkte (Kinder und Enkel): ein Enkel-Chip («Powerbanks» unter «Handy-Zubehör») ordnet das Produkt genauso ein."""
    out = []
    for s in items or []:
        h = handle_aus_url(s.get("url"))
        if h:
            out.append(h)
        out += nachfahren(s.get("items"))
    return out


def menue_punkte(gql):
    d = gql('{ menus(first:5, query:"handle:main-menu"){ nodes{ items{ title url items{ title url items{ title url items{ title url } } } } } } }')
    return d["menus"]["nodes"][0]["items"]


def kandidaten(gql, a, aktiv_eltern, anzahl=40):
    """Beste BESTEHENDE Kollektionen, die Produkte der Lücke abdecken würden. Gefiltert: genug Lücken-Produkte (>= 15), thematisch passend
    (>= 50 % der Kollektion liegen in der Hauptkategorie), nicht die Hauptkategorie in Kleinformat (<= 60 % ihrer Grösse), veröffentlicht
    im Onlineshop und im Headless-Kanal. Reihenfolge: Zahl der abgedeckten Lücken-Produkte."""
    out = []
    for h, n_ohne in sorted(a["koll_ohne"].items(), key=lambda x: -x[1])[:anzahl]:
        if n_ohne < 15:
            break
        c = gql('query($h:String!){collectionByHandle(handle:$h){id title productsCount{count} '
                'os: publishedOnPublication(publicationId:"gid://shopify/Publication/301970915713") '
                'hl: publishedOnPublication(publicationId:"gid://shopify/Publication/391626359175")}}', {"h": h})["collectionByHandle"]
        if not c:
            continue
        gesamt = c["productsCount"]["count"]
        anteil = a["koll_alle"].get(h, 0) / gesamt if gesamt else 0
        if anteil < 0.5 or gesamt > 0.6 * aktiv_eltern or not (c["os"] and c["hl"]):
            continue
        out.append({"handle": h, "titel": c["title"], "luecke": n_ohne, "gesamt": gesamt, "im_eltern": round(anteil, 2)})
    return out


def messen(nur=None):
    from lux_assistent import _gql
    gql = _gql()
    ergebnis = []
    for it in menue_punkte(gql):
        h = handle_aus_url(it["url"])
        if not h or (nur and h != nur):
            continue
        kinder = nachfahren(it["items"])
        if not kinder:
            ergebnis.append({"titel": it["title"], "handle": h, "aktiv": None, "kinder": []})
            continue
        t = time.time()
        prod = kollektionen_lesen(gql, h)
        if prod is None:
            continue
        a = abdeckung(prod, kinder, h)
        a.update({"titel": it["title"], "handle": h, "kinder": kinder, "sekunden": round(time.time() - t, 1)})
        a["gross"] = sorted(k for k, n in a["je_kind"].items() if a["aktiv"] and n / a["aktiv"] > GROSS_ANTEIL)
        a["kandidaten"] = kandidaten(gql, a, a["aktiv"]) if a["anteil_ohne"] >= SCHWELLE_ANTEIL and a["aktiv"] >= MIN_AKTIV else []
        a.pop("koll_alle", None)
        a["koll_ohne"] = dict(sorted(a["koll_ohne"].items(), key=lambda x: -x[1])[:40])
        ergebnis.append(a)
        print(f"{it['title'][:28]:28s} aktiv {a['aktiv']:6d} · ohne Unterkollektion {a['ohne']:6d} ({int(100 * a['anteil_ohne'])} %) · zu grob {a['gross']}")
    return ergebnis


# Hauptpunkte, deren Hauptkollektion selbst das Thema ist (Chip mit gleichem Handle = «Jacken & Mäntel» bzw. «Sport & Fitness»): dort ist «Produkt ohne
# Unterkollektion» das Thema des Hauptpunkts, kein Mangel (Messartefakt, 22.10.: Herbst & Übergang 84 %, Sport & Party 67 %).
AUSNAHMEN = {"jacken-outdoor": "Hauptkollektion = Thema «Jacken & Mäntel»", "fitness-training": "Hauptkollektion = Thema «Sport & Fitness»"}


def befunde(ergebnis):
    return [e for e in ergebnis if e.get("aktiv") and e["aktiv"] >= MIN_AKTIV and e["handle"] not in AUSNAHMEN
            and (e["anteil_ohne"] >= SCHWELLE_ANTEIL or e.get("gross"))]


def zeile(ergebnis=None):
    if ergebnis is None:
        try:
            st = json.load(open(STAND, encoding="utf-8"))
            ergebnis = st["kategorien"]
            alter_t = (datetime.now(timezone.utc) - datetime.strptime(st["gemessen"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)).days
        except Exception:
            return None
        if alter_t > 10:
            return f"🗂️ UNTERKATEGORIEN: Messung seit {alter_t} Tagen nicht erneuert (automation/unterkat_abdeckung.py)"
    b = befunde(ergebnis)
    if not b:
        return None
    teile = [f"{e['titel']} {int(100 * e['anteil_ohne'])} % ohne Unterkollektion" + (f", zu grob: {', '.join(e['gross'])}" if e.get("gross") else "") for e in b[:4]]
    return f"🗂️ UNTERKATEGORIEN: {len(b)} grosse Hauptkategorie(n) schlecht unterteilt ({'; '.join(teile)}) — dropship/UNTERKATEGORIEN-ABDECKUNG.md"


BERICHT = os.path.join(REPO, "dropship", "UNTERKATEGORIEN-ABDECKUNG.md")


def bericht(ergebnis, gemessen):
    z = [f"# Unterkategorien: Wo fehlen Chips? (gemessen {gemessen})", "",
         "Die Chips oben in der App (und die Menü-Unterpunkte im Web) sind die Unterpunkte der Hauptkategorie im Menü `main-menu`. "
         "Ein Produkt, das in keiner Unterkollektion (Kind oder Enkel) steht, erreicht man nur über die lange Gesamtliste.", "",
         f"Befund-Schwelle: ≥ {MIN_AKTIV} aktive Produkte UND (≥ {int(SCHWELLE_ANTEIL * 100)} % ohne Unterkollektion ODER eine Unterkollektion mit > {int(GROSS_ANTEIL * 100)} % der Hauptkategorie).", "",
         "| Hauptkategorie | aktiv | ohne Unterkollektion | Anteil | zu grobe Unterkollektion | Befund |", "|---|---:|---:|---:|---|---|"]
    bef = {e["handle"] for e in befunde(ergebnis)}
    z.insert(5, "Ausnahmen (Hauptkollektion ist selbst das Thema, kein Befund): " + "; ".join(f"`{h}` — {w}" for h, w in AUSNAHMEN.items()) + "."); z.insert(6, "")
    for e in ergebnis:
        if not e.get("aktiv"):
            z.append(f"| {e['titel']} | – | – | – | – | keine Unterpunkte oder zu klein |")
            continue
        z.append(f"| {e['titel']} | {e['aktiv']} | {e['ohne']} | {int(100 * e['anteil_ohne'])} % | {', '.join(e.get('gross') or []) or '–'} | {'⚠️' if e['handle'] in bef else 'ok'} |")
    for e in ergebnis:
        if e["handle"] in bef and e.get("woerter"):
            z += ["", f"## {e['titel']} — häufigste Titelwörter der Produkte OHNE Unterkollektion", "",
                  ", ".join(f"{w} ({n})" for w, n in e["woerter"][:20]),
                  ""] + ([ "Bestehende Kollektionen, die Lücken-Produkte abdecken (noch nicht im Menü unter dieser Kategorie):", "",
                          "| Kollektion | Handle | Lücken-Produkte | Grösse gesamt | davon in der Kategorie |", "|---|---|---:|---:|---:|"]
                          + [f"| {c['titel']} | `{c['handle']}` | {c['luecke']} | {c['gesamt']} | {int(100 * c['im_eltern'])} % |" for c in e.get("kandidaten") or []]
                          + [""] if e.get("kandidaten") else []) + [
                  "Hinweis: Eine fehlende Unterkollektion zeigt sich hier als Wortgruppe (z. B. «mikrofon», «projektor»). Erst prüfen, ob es die Kollektion schon gibt "
                  "(`automation/menue_unterkat_ordnen.py` hängt vorhandene Fachkollektionen ins Menü), sonst `automation/data/suchbegriff_kollektionen.json` (Feeder oder neue Kollektion)."]
    open(BERICHT, "w", encoding="utf-8").write("\n".join(z) + "\n")


def schreiben(ergebnis):
    gemessen = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    stand = {"gemessen": gemessen, "schwelle_anteil": SCHWELLE_ANTEIL, "kategorien": ergebnis}
    tmp = STAND + ".tmp"
    json.dump(stand, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, STAND)
    bericht(ergebnis, gemessen)


def selbsttest():
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()

    def faelle(m):
        f = []
        P = lambda t, *k: {"titel": t, "kollektionen": set(k)}
        prod = [P("Smartwatch A", "eltern", "uhren"), P("Smartwatch B", "eltern", "uhren"), P("Mikrofon X", "eltern", "mikrofone"), P("Mikrofon Y", "eltern", "mikrofone"),
                P("Kabel", "eltern", "kabel", "eltern")]
        a = m.abdeckung(prod, ["uhren", "kabel", "eltern"], "eltern")
        if a["ohne"] != 2 or a["aktiv"] != 5:
            f.append(f"A ohne/aktiv {a['ohne']}/{a['aktiv']} (soll 2/5)")
        if a["je_kind"].get("eltern"):
            f.append("B die Hauptkollektion zählt als eigene Unterkollektion")
        if a["woerter"] and a["woerter"][0][0] != "mikrofon":
            f.append(f"C Titelwörter der Lücke {a['woerter'][:2]}")
        if a["koll_ohne"] != {"mikrofone": 2} or a["koll_alle"] != {"mikrofone": 2}:
            f.append(f"G Kollektions-Zähler der Lücke {a['koll_ohne']} / {a['koll_alle']}")
        if abs(a["anteil_ohne"] - 0.4) > 1e-9:
            f.append(f"D Anteil {a['anteil_ohne']}")
        gr = {"eltern": 4000, "trends-gadgets": 2600, "uhren": 600, "audio": 300, "klein": 12, "laden": 500}
        r = m.chip_reihenfolge(list(gr), gr, "eltern")
        if r[0] != "eltern" or r[-1] != "trends-gadgets" or r.index("klein") < r.index("laden"):
            f.append(f"E Chip-Reihenfolge {r}")
        if m.abdeckung([], ["a"], "e")["anteil_ohne"] != 0.0:
            f.append("F leere Kategorie")
        if m.handle_aus_url("https://x.ch/collections/%F0%9F%8E%81-geschenke-bis-chf-30?x=1") != "🎁-geschenke-bis-chf-30" or m.handle_aus_url("/collections/uhren") != "uhren" \
                or m.handle_aus_url("/pages/kontakt") is not None or m.handle_aus_url(None) is not None:
            f.append("H Handle aus URL (kodierter Emoji-Handle, normaler, Nicht-Kollektion, None)")
        return f
    fehler = faelle(sys.modules[__name__])
    mut = [("Hauptkollektion zählt als Kind", "kinder = {k for k in kinder if k and k " + "!= eltern}", "kinder = {k for k in kinder if k}"),
           ("Lücke nicht gezählt", "if not hit:\n            ohne.append(p)", "if False:\n            ohne.append(p)"),
           ("Sammelgruppe nicht nach hinten", "return (" + "3, -g)", "return (1, -g)"),
           ("Kleinstgruppen vorn", "return (" + "2, -g)", "return (0, -g)"),
           ("Handle bleibt kodiert", "return urllib.parse." + "unquote(m.group(1)) if m else None", "return m.group(1) if m else None"),
           ("Lücken-Zähler zählt alle", "            ohne.append(p)\n            for k in p[\"kollektionen\"] - kinder - {eltern}:\n                k_ohne[k] += 1\n",
            "            ohne.append(p)\n")]
    erkannt = 0
    for name, alt, neu in mut:
        if quelle.count(alt) != 1:
            fehler.append(f"Mutant «{name}»: Stelle {quelle.count(alt)}× (soll 1×)")
            continue
        m = types.ModuleType("mutant")
        m.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, neu), "mutant", "exec"), m.__dict__)
        try:
            if faelle(m):
                erkannt += 1
            else:
                fehler.append(f"Mutant «{name}» NICHT erkannt")
        except Exception:
            erkannt += 1
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 8 Fälle, {erkannt}/{len(mut)} Mutanten erkannt")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zeile" in sys.argv:
        z = zeile()
        print(z or "UNTERKATEGORIEN: ok oder noch nicht gemessen")
        sys.exit(0)
    nur = sys.argv[sys.argv.index("--nur") + 1] if "--nur" in sys.argv else None
    erg = messen(nur)
    if not nur:
        schreiben(erg)
        print(zeile(erg) or "UNTERKATEGORIEN: ok")
