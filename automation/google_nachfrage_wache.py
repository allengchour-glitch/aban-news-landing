#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""google_nachfrage_wache.py — verschwinden Produkte, die über Google nachweislich Besucher oder Warenkörbe bringen? (12.10.2026)

ANLASS (GEMESSEN 12.10., ShopifyQL, nur Menschen): Die Google-Gratis-Einträge (utm_campaign = sag_organic) sind der Kanal mit
der besten Quote — 90 T: 44 Sitzungen → 6 Warenkörbe → 5 Kasse → 1 Kauf (TikTok-Werbung: 144 → 2 → 2 → 0). Aber sie brachen
ein: Juli 7–27 Sitzungen je Woche, seit August 0–4. Von den 48 Juli-Sitzungen landeten **34 auf Produkten, die heute nicht
mehr verkauft werden** (BigBuy-Ende, «cj-nicht-versendbar-ch», «keine-lieferanten-ref», Verlust-Draft, Dubletten).
Jeder Grund war für sich richtig — aber niemand fragte, ob es für die Google-Nachfrage einen ERSATZ gibt.

REGEL: Ein Produkt mit Google-Nachfrage (≥ 1 Sitzung über sag_organic oder Google-Suche ohne utm in 120 T) gilt als
«weg», wenn es nicht ACTIVE ist ODER nicht im Kanal «Google & YouTube» liegt. Für jedes verschwundene Produkt:
  1. Weiterleitung des alten Pfads (urlRedirects) auf ein aktives Produkt → Ersatz «Weiterleitung».
  2. Sonst aktive Produkte mit ähnlichem Titel (Jaccard der Kernwörter ≥ ERSATZ_SCHWELLE) im Google-Kanal → Ersatz «Zwilling».
  3. Grund aus den Tags (Verlust → Preis prüfen, Dublette → Zwilling, ohne Lieferanten-Ref → Lieferant suchen,
     nicht versendbar / BigBuy → nicht behebbar).
Schreibt NUR lesend: Bericht dropship/GOOGLE-NACHFRAGE.md + Stand dropship/_google_nachfrage_stand.json.
Wer ein Produkt mit Google-Nachfrage draftet, findet es hier wieder — mit der Frage nach dem Ersatz.

  python3 automation/google_nachfrage_wache.py              # messen + Bericht
  python3 automation/google_nachfrage_wache.py --selbsttest
"""
import datetime, json, os, re, sys, unicodedata

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
sys.path.insert(0, os.path.join(REPO, "tools"))

GOOGLE = "gid://shopify/Publication/302872297857"
TAGE = int(os.environ.get("TAGE", "120"))
ERSATZ_SCHWELLE = 0.5
STAND = os.path.join(REPO, "dropship", "_google_nachfrage_stand.json")
BERICHT = os.path.join(REPO, "dropship", "GOOGLE-NACHFRAGE.md")
STOPP = {"und", "mit", "fur", "fuer", "der", "die", "das", "aus", "von", "damen", "herren", "set", "stuck", "stueck", "neu",
         "inkl", "the", "and", "with", "xl", "xxl", "cm", "mm"}

# Grund → (Urteil, behebbar). Reihenfolge = Vorrang.
GRUENDE = [
    (re.compile(r"bigbuy|bb-"), "Lieferant beendet (BigBuy)", False),
    (re.compile(r"nicht-versendbar|nicht-lieferbar|klinge|verbot|waffe"), "nicht in die Schweiz lieferbar", False),
    (re.compile(r"heilaussage|regulatorisch|heilversprechen"), "rechtlich ausgeschlossen (Heilaussage)", False),
    (re.compile(r"kost[uü]e?m"), "bewusst nicht bei Google (Kostüm)", False),
    (re.compile(r"nicht-fit|sortiment-raus"), "Sortiment-Entscheid", False),
    (re.compile(r"verlust|marge"), "Verlust → Preis/EK prüfen", True),
    (re.compile(r"dup|dedup|doppel"), "Dublette → Zwilling muss aktiv sein", True),
    (re.compile(r"lieferanten-ref|getarnt"), "ohne Lieferant → Lieferant suchen", True),
    (re.compile(r"ausverkauft"), "beim Lieferanten ausverkauft", False),
    (re.compile(r"saison|sommer-20\d\d"), "Saison (Sommerware)", False),
]


def kernwoerter(titel):
    t = unicodedata.normalize("NFKD", (titel or "").lower()).encode("ascii", "ignore").decode()
    return {w for w in re.findall(r"[a-z0-9]+", t) if len(w) >= 4 and w not in STOPP and not w.isdigit()}


def jaccard(a, b):
    return len(a & b) / len(a | b) if a and b else 0.0


def grund(tags, sku=""):
    s = " ".join(tags or []).lower() + " " + (sku or "").lower()
    for rx, urteil, behebbar in GRUENDE:
        if rx.search(s):
            return urteil, behebbar
    if not (sku or "").strip():
        return "ohne Lieferant → Lieferant suchen", True
    return "Grund unbekannt (kein Grund-Tag)", True


def nachfrage():
    """{handle: {'sitz': n, 'korb': n, 'kauf': n, 'quelle': set}} — Google-Gratis-Einträge + Google-Suche ohne utm."""
    from werbetest_trichter import ql
    out = {}
    for bed, quelle in (("utm_campaign = 'sag_organic'", "Gratis-Eintrag"),
                        ("referrer_name = 'google' AND utm_source IS NULL", "Google-Suche")):
        rows = ql("FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_completed_checkout "
                  f"GROUP BY landing_page_path WHERE human_or_bot_session = 'human' AND landing_page_type = 'Product' AND {bed} "
                  f"SINCE -{TAGE}d UNTIL today ORDER BY sessions DESC LIMIT 1000")
        for r in rows:
            p = r.get("landing_page_path") or ""
            if "/products/" not in p:
                continue
            h = p.split("/products/")[1].split("?")[0].split("/")[0]
            e = out.setdefault(h, {"sitz": 0, "korb": 0, "kauf": 0, "quelle": set()})
            e["sitz"] += int(r.get("sessions") or 0)
            e["korb"] += int(r.get("sessions_with_cart_additions") or 0)
            e["kauf"] += int(r.get("sessions_that_completed_checkout") or 0)
            e["quelle"].add(quelle)
    return out


def produkt(gql, h):
    return gql('query($h:String!){ productByHandle(handle:$h){ id handle title status tags '
               'g:publishedOnPublication(publicationId:"%s") variants(first:1){ nodes{ sku } } } }' % GOOGLE, {"h": h}).get("productByHandle")


def weiterleitung(gql, h):
    d = gql('query($q:String!){ urlRedirects(first:3, query:$q){ nodes{ path target } } }', {"q": f"path:/products/{h}"})
    for n in ((d.get("urlRedirects") or {}).get("nodes") or []):
        if n.get("path", "").rstrip("/") == f"/products/{h}" and "/products/" in (n.get("target") or ""):
            return n["target"].split("/products/")[1].split("?")[0]
    return None


def zwilling(gql, titel, eigene_id):
    kw = kernwoerter(titel)
    if not kw:
        return None
    # 12.10.: nur das LÄNGSTE Kernwort suchen — die Shopify-Suche verknüpft Wörter mit UND, ein Zusatzwort («Eisseide»)
    # liess den echten Zwilling («U-förmiges Schwangerschaftskissen») durchfallen. Die Ähnlichkeit entscheidet danach.
    such = sorted(kw, key=len, reverse=True)[0]
    d = gql('query($q:String!){ products(first:30, query:$q){ nodes{ id handle title status '
            'g:publishedOnPublication(publicationId:"%s") } } }' % GOOGLE, {"q": f"status:active {such}"})
    best = None
    for n in ((d.get("products") or {}).get("nodes") or []):
        if n["id"] == eigene_id or n["status"] != "ACTIVE" or not n.get("g"):
            continue
        j = jaccard(kw, kernwoerter(n["title"]))
        if j >= ERSATZ_SCHWELLE and (not best or j > best[1]):
            best = (n["handle"], round(j, 2))
    return best


def main():
    from seo_autopilot import gql
    nf = nachfrage()
    zeilen, zahl = [], {"mit_nachfrage": len(nf), "weg": 0, "ersatz": 0, "ohne_ersatz": 0, "ohne_ersatz_korb": 0, "behebbar": 0}
    for h, e in sorted(nf.items(), key=lambda x: (-x[1]["korb"], -x[1]["sitz"])):
        p = produkt(gql, h)
        if p and p["status"] == "ACTIVE" and p.get("g"):
            continue
        zahl["weg"] += 1
        ersatz, art = None, ""
        ziel = weiterleitung(gql, h)
        if ziel:
            q = produkt(gql, ziel)
            if q and q["status"] == "ACTIVE" and q.get("g"):
                ersatz, art = ziel, "Weiterleitung"
        if not ersatz and p:
            z = zwilling(gql, p["title"], p["id"])
            if z:
                ersatz, art = z[0], f"Zwilling (Ähnlichkeit {z[1]})"
        urteil, behebbar = grund(p["tags"] if p else [], ((p or {}).get("variants") or {}).get("nodes", [{}])[0].get("sku", "") if p else "")
        if not p:
            urteil, behebbar = "Handle existiert nicht mehr", True
        if ersatz:
            zahl["ersatz"] += 1
        else:
            zahl["ohne_ersatz"] += 1
            zahl["ohne_ersatz_korb"] += e["korb"] > 0
            zahl["behebbar"] += behebbar
        zeilen.append({"handle": h, "titel": (p or {}).get("title", ""), "status": (p or {}).get("status", "WEG"),
                       "google_kanal": bool((p or {}).get("g")), "sitz": e["sitz"], "korb": e["korb"], "kauf": e["kauf"],
                       "quelle": sorted(e["quelle"]), "grund": urteil, "behebbar": behebbar, "ersatz": ersatz, "ersatz_art": art})
    stand = {"stand": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "tage": TAGE, **zahl, "zeilen": zeilen}
    json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Google-Nachfrage: verschwundene Produkte — Stand {stand['stand']} ({TAGE} Tage)\n\n"
                f"Produkte mit Google-Besuch: {zahl['mit_nachfrage']} · heute nicht mehr bei Google: {zahl['weg']} · "
                f"mit aktivem Ersatz: {zahl['ersatz']} · **ohne Ersatz: {zahl['ohne_ersatz']}** "
                f"(davon mit Warenkorb {zahl['ohne_ersatz_korb']}, behebbar {zahl['behebbar']})\n\n"
                "Quelle: ShopifyQL (utm_campaign = sag_organic + Google-Suche ohne utm, nur Menschen). Regel: "
                "`automation/google_nachfrage_wache.py`. Nichts wird geändert — die Liste ist die Arbeitsliste.\n\n"
                "| Sitz. | Korb | Kauf | Produkt | Status | Grund | Ersatz |\n|---:|---:|---:|---|---|---|---|\n")
        for z in zeilen:
            f.write(f"| {z['sitz']} | {z['korb']} | {z['kauf']} | {(z['titel'] or z['handle'])[:60]} (`{z['handle']}`) | "
                    f"{z['status']}{'' if z['google_kanal'] else ', nicht im Google-Kanal'} | {z['grund']} | "
                    f"{('`' + z['ersatz'][:45] + '` ' + z['ersatz_art']) if z['ersatz'] else '—'} |\n")
    print(f"GOOGLE-NACHFRAGE ({TAGE} T): {zahl['mit_nachfrage']} Produkte mit Google-Besuch · {zahl['weg']} weg · "
          f"{zahl['ersatz']} mit Ersatz · {zahl['ohne_ersatz']} ohne Ersatz (Warenkorb {zahl['ohne_ersatz_korb']}, "
          f"behebbar {zahl['behebbar']}) → dropship/GOOGLE-NACHFRAGE.md")
    return 0


def selbsttest():
    f = 0
    pruef = [
        (jaccard(kernwoerter("Rizinusöl-Wickel-Set mit Bio-Öl"), kernwoerter("Rizinusöl-Wickel wiederverwendbar · Bauch & Nacken")) >= 0.25, True, "Rizinus-Zwilling teilt Kernwörter"),
        (jaccard(kernwoerter("U-förmiges Schwangerschaftskissen aus Eisseide"), kernwoerter("U-förmiges Schwangerschaftskissen")) >= ERSATZ_SCHWELLE, True, "Kissen = Zwilling"),
        (jaccard(kernwoerter("Elektrischer Fleischwolf 5L"), kernwoerter("Elektrische Zahnbürste")) >= ERSATZ_SCHWELLE, False, "Fleischwolf ≠ Zahnbürste"),
        (grund(["cj-nicht-versendbar-ch"])[0], "nicht in die Schweiz lieferbar", "Versand-Tag"),
        (grund(["marge-verlust-draft", "verlust-auto-draft"])[0], "Verlust → Preis/EK prüfen", "Verlust-Tag"),
        (grund(["keine-lieferanten-ref"])[0], "ohne Lieferant → Lieferant suchen", "ohne Ref"),
        (grund([], "bb-12345")[0], "Lieferant beendet (BigBuy)", "BigBuy über SKU"),
        (grund(["duplikat-auto-draft"])[0], "Dublette → Zwilling muss aktiv sein", "Dublette"),
        (grund(["sortiment-dedup-draft"])[1], True, "Dedup behebbar"),
        (grund(["bild-ok"], "CJ-123")[0], "Grund unbekannt (kein Grund-Tag)", "ohne Grund-Tag"),
        (grund(["bild-audit-flag"], "")[0], "ohne Lieferant → Lieferant suchen", "ohne SKU = ohne Lieferant"),
        (grund(["heilaussage", "regulatorisch-pruefen"], "CJ-1")[1], False, "Heilaussage nicht behebbar"),
        (grund(["kostuem", "kinderkostuem"], "fortura-CK1")[0], "bewusst nicht bei Google (Kostüm)", "Kostüm"),
        (grund(["sommer-2026", "sandalen"], "CJNS1")[0], "Saison (Sommerware)", "Sommerware"),
    ]
    for ist, soll, name in pruef:
        ok = ist == soll
        f += not ok
        print(f"  {'OK  ' if ok else 'FEHL'} {name} → {ist}")
    print("SELBSTTEST", "OK" if not f else f"FEHLER ({f})")
    return 0 if not f else 1


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
