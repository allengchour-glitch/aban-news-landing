#!/usr/bin/env python3
"""google_nachfrage_luecke.py — Google-Nachfrage, die an einem Entwurf hängt, wird zum CJ-Suchauftrag (02.10.2026).

ANLASS (Betreiber «weiter push überall»): Google bringt als einziger Kanal Käufe, die Sitzungen fielen aber von
84 pro Woche (Juli) auf 10 (Ende September). GEMESSEN 02.10. (ShopifyQL, 150 T): 61 von 185 Produktseiten, auf
denen Google-Besucher landeten, sind heute Entwürfe. Sie trugen 213 von 373 Google-Sitzungen (57 %), allen voran
«Wasserdichter Packsack · Dry Bag 20L» (82) und das Rizinusöl-Wickel-Set (55). Ein Entwurf fällt aus den
Gratis-Einträgen. Ein 301 auf ein «ähnliches» Produkt bringt die Einträge nicht zurück, weil Google nur listet, was
aktiv und kaufbar ist. Die CJ-Suchliste war gleichzeitig leer (Grow-Plan, 32 Aufträge erledigt).

  Je toter Google-Landeseite (Entwurf/archiviert/gelöscht), die Nachfrage zeigte (≥ MIN_SITZ Sitzungen oder ≥ 1 Warenkorb):
  * Hausregeln zuerst: Klinge/Waffe/Kostüm/Erotik/Tabak (google_kanal_luecke.grund), Medizin/Therapie, topische Kosmetik,
    Markenware (BigBuy-Marken: Ersatz wäre Fälschung oder fremde Marke) → nur Ledger, kein Auftrag
  * Gemini nennt einen generischen englischen CJ-Suchbegriff + Saison; Sommerware ausserhalb Apr–Aug → «saison-später»
    (nächster Lauf ab April holt sie nach, weil das Ledger nur «auftrag» und «verboten» als endgültig zählt)
  * Auftrag VORNE in automation/cj_search_queue.txt (Importer mit Titel-/Bild-Wache, Klingen-/Medizin-Sperren)
  Ledger dropship/_google_nachfrage_luecke.tsv: handle, datum, ergebnis, suchbegriff, sitzungen, warenkoerbe.
  python3 automation/google_nachfrage_luecke.py [--trocken] [--kanarienvogel]
"""
import datetime as dt, json, os, re, sys, urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from seo_autopilot import gql
from google_kanal_luecke import grund as google_risiko
from titel_kauderwelsch_wache import gemini

LEDGER = os.path.join(REPO, "dropship", "_google_nachfrage_luecke.tsv")
QUEUE = os.path.join(HIER, "cj_search_queue.txt")
BERICHT = os.path.join(REPO, "dropship", "GOOGLE-NACHFRAGE-LUECKE.md")
MIN_SITZ = int(os.environ.get("MIN_SITZ", "2"))
TAGE = int(os.environ.get("TAGE", "180"))
ENDGUELTIG = {"auftrag", "verboten", "marke", "eigen"}

MEDIZIN = re.compile(r"therapie|rotlicht|rollstuhl|lähmung|laehmung|heil|orthes|bandage|hörgerät|hoergeraet|"
                     r"blutdruck|schmerz|serum|anti-aging|creme|lotion|nagelpflege|essenz|bienengift", re.I)
SOMMER = re.compile(r"pool|strand|bikini|badeanzug|sandale|sonnenschirm|kühlung|kuehlung|kühlmatte|kühlbox|klima|ventilator|luftmatratze|"
                    r"schlauchboot|floating|wasserpistole|sonnenhut|flip.?flop", re.I)
# Herstellermarken aus BigBuy/Fortura: ein CJ-Ersatz wäre ein anderes Produkt unter falscher Erwartung
MARKE = re.compile(r"\b(intex|paul hewitt|clinique|timberland|luminarc|orbegozo|domo|esperanza|innovagoods|ociotrends|"
                   r"alvarez|hunter|bellevue|deborah|tunmate)\b", re.I)


def sommerzeit(heute=None):
    return (heute or dt.date.today()).month in (4, 5, 6, 7, 8)


def ledger():
    d = {}
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding="utf-8"):
            f = z.rstrip("\n").split("\t")
            if len(f) >= 3 and f[0] != "handle":
                d[f[0]] = f
    return d


def landeseiten():
    q = (f"FROM sessions SHOW sessions, sessions_with_cart_additions WHERE referrer_name = 'google' "
         f"AND landing_page_type = 'Product' GROUP BY landing_page_path SINCE -{TAGE}d UNTIL today "
         f"ORDER BY sessions DESC LIMIT 1000")
    d = gql("query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}", {"q": q})["shopifyqlQuery"]
    if d.get("parseErrors"):
        raise RuntimeError(f"ShopifyQL: {d['parseErrors']}")
    out = []
    for r in d["tableData"]["rows"]:
        p = r["landing_page_path"]
        if "/products/" not in p:
            continue
        out.append((urllib.parse.unquote(p.split("/products/")[1].split("?")[0]),
                    int(r["sessions"]), int(r["sessions_with_cart_additions"])))
    return out


def produkt(handle):
    return gql("query($h:String!){p:productByHandle(handle:$h){status title tags onlineStoreUrl}}", {"h": handle})["p"]


EIGEN = re.compile(r"^(tasse|shirt|kissen|tote|pod|sticker|schweiz-sticker|schweiz-magnet|kleid-.*selbst-gestalten)", re.I)


def vorpruefung(titel, tags, handle=""):
    """Hausregeln ohne KI. Gibt (ergebnis, grund) oder None zurück. Lager-Tags (ausverkauft, keine-lieferanten-ref …)
    zählen hier NICHT — genau deren Produkte sollen ersetzt werden; nur der Inhalt (Titel) entscheidet."""
    if EIGEN.search(handle) or any(t.lower() in ("pod", "printful", "selbst-gestalten") for t in tags):
        return "eigen", "eigenes Design (Druck) — kein CJ-Ersatz"
    g = google_risiko(titel, [])
    if g:
        return "verboten", g
    if MEDIZIN.search(titel):
        return "verboten", "Medizin/Therapie/topische Kosmetik"
    if MARKE.search(titel):
        return "marke", "Herstellermarke — kein generischer Ersatz"
    return None


PROMPT = """Ein Schweizer Onlineshop verkaufte dieses Produkt; Google-Besucher kamen dafür, jetzt ist es nicht mehr lieferbar.
Produkt: «{titel}»
Gib einen kurzen, GENERISCHEN englischen Suchbegriff (2–5 Wörter, keine Marke, keine Farbe, keine Zahlen ausser
Volumen/Grösse, wenn sie das Produkt ausmachen, z. B. «dry bag 20l»), mit dem man beim Grosshändler CJdropshipping
dasselbe Produkt findet. Sag ausserdem, ob es Sommerware ist (nur im Sommer gekauft: Pool, Strand, Kühlung).
Antworte NUR als JSON: {{"suchbegriff": "...", "sommer": true/false}}"""


def suchbegriff(titel):
    a = gemini(PROMPT.format(titel=titel))
    s = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", str(a.get("suchbegriff", "")).lower())).strip()
    if not (2 <= len(s.split()) <= 6):
        raise ValueError(f"unbrauchbarer Suchbegriff «{a.get('suchbegriff')}»")
    return s, bool(a.get("sommer"))


def queue_vorne(zeilen, grund=None):
    """Neue Aufträge NACH dem Kopfkommentar, VOR allen offenen Zeilen (der Runner nimmt die ersten 4 ohne #).
    grund = Kommentar über dem Block (Standard: dieses Skript); auch semrush_luecken_einbauen.py nutzt die Funktion."""
    alt = open(QUEUE, encoding="utf-8").read().split("\n")
    vorhanden = {z.strip().lower() for z in alt}
    neu = [z for z in zeilen if z.lower() not in vorhanden and f"#done {z}".lower() not in vorhanden]
    if not neu:
        return 0
    kopf = 0
    while kopf < len(alt) and alt[kopf].startswith("#") and not alt[kopf].startswith("#done"):
        kopf += 1
    block = [f"# {dt.date.today()} " + (grund or "google_nachfrage_luecke.py: Google-Besucher landeten auf heute toten Seiten → Ersatz suchen")] + neu
    tmp = QUEUE + ".tmp"
    open(tmp, "w", encoding="utf-8").write("\n".join(alt[:kopf] + block + alt[kopf:]))
    os.replace(tmp, QUEUE)
    return len(neu)


def kanarienvogel():
    faelle = [("Rotlicht-Therapie-Gurt für Katzen & Hunde", [], "verboten"),
              ("Kostüm Marsupilami", [], "verboten"),
              ("Schlauchboot «Intex Excursion 5» · 5 Personen", [], "marke"),
              ("Anti-Aging Serum Hyaluron + Vitamin C", [], "verboten"),
              ("Wasserdichter Packsack · Dry Bag 20L", [], None),
              ("U-förmiges Schwangerschaftskissen aus Eisseide", ["keine-lieferanten-ref", "ausverkauft-lieferant"], None),
              ("Tasse «Hopp Schwiiz»", [], "eigen")]
    ok = 0
    for t, tags, soll in faelle:
        v = vorpruefung(t, tags, "tasse-text-hoppschwiiz" if t.startswith("Tasse") else "x")
        ist = v[0] if v else None
        ok += ist == soll
        print(f"  {'✓' if ist == soll else '✗'} {t[:50]} → {ist} (soll {soll})")
    s1 = sommerzeit(dt.date(2026, 7, 1)) and not sommerzeit(dt.date(2026, 10, 2))
    ok += s1
    print(f"  {'✓' if s1 else '✗'} Saisonfenster Juli ja / Oktober nein")
    print(f"Kanarienvögel {ok}/{len(faelle) + 1}")
    return ok == len(faelle) + 1


def main():
    if "--kanarienvogel" in sys.argv:
        sys.exit(0 if kanarienvogel() else 1)
    trocken = "--trocken" in sys.argv
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}{' · TROCKEN' if trocken else ''}", flush=True)
    led = ledger()
    seiten = landeseiten()
    neu_ledger, auftraege, zaehl = [], [], {}
    for h, s, c in seiten:
        if s < MIN_SITZ and c < 1:
            continue
        alt = led.get(h)
        if alt and (alt[2] in ENDGUELTIG or (alt[2] == "saison-später" and not sommerzeit())):
            continue
        p = produkt(h)
        if p and p["status"] == "ACTIVE" and p["onlineStoreUrl"]:
            continue                                  # lebt — nichts zu tun (kein Ledger, damit ein späterer Tod zählt)
        titel = (p or {}).get("title") or h.replace("-", " ")
        v = vorpruefung(titel, (p or {}).get("tags") or [], h)
        if v:
            erg, begr = v
        else:
            try:
                begr, sommer = suchbegriff(titel)
            except Exception as e:
                print(f"  ? {h}: {e}", file=sys.stderr)
                continue
            erg = "saison-später" if (sommer or SOMMER.search(titel)) and not sommerzeit() else "auftrag"
            if erg == "auftrag":
                auftraege.append(f"search:{begr}")
        zaehl[erg] = zaehl.get(erg, 0) + 1
        neu_ledger.append([h, str(dt.date.today()), erg, begr, str(s), str(c)])
        print(f"  {erg:14} {s:>3} Sitz. {c} WK · {titel[:55]} → {begr}")
    n = 0
    if not trocken:
        if auftraege:
            n = queue_vorne(auftraege)
        neu = not os.path.exists(LEDGER)
        with open(LEDGER, "a", encoding="utf-8") as f:
            if neu:
                f.write("handle\tdatum\tergebnis\tsuchbegriff_oder_grund\tsitzungen\twarenkoerbe\n")
            for z in neu_ledger:
                f.write("\t".join(z) + "\n")
        tot = sum(1 for h, s, c in seiten)
        with open(BERICHT, "w", encoding="utf-8") as f:
            f.write(f"# Google-Nachfrage-Lücke (automatisch, {dt.datetime.utcnow():%Y-%m-%d %H:%M} UTC)\n\n"
                    f"Google-Landeseiten {TAGE} T: {tot}. Neu bewertet: {len(neu_ledger)} — "
                    + ", ".join(f"{k} {v}" for k, v in sorted(zaehl.items())) + f". CJ-Aufträge vorne eingereiht: {n}.\n\n"
                    "| Seite | Sitz. | WK | Ergebnis | Suchbegriff / Grund |\n|---|---|---|---|---|\n")
            for z in neu_ledger:
                f.write(f"| {z[0]} | {z[4]} | {z[5]} | {z[2]} | {z[3]} |\n")
    print(f"FERTIG: {len(neu_ledger)} tote Google-Seiten bewertet · {n} CJ-Suchaufträge vorne · "
          + ", ".join(f"{k} {v}" for k, v in sorted(zaehl.items())))


if __name__ == "__main__":
    main()
