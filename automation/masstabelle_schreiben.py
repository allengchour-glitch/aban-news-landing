#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""masstabelle_schreiben.py — die Masstabelle DES MODELLS auf die Produktseite (12.10.2026).

ANLASS (Messrunde 12.10., Prüfer «Top-Produktseiten»): 23 der 60 meistbesuchten Produktseiten sind CJ-Kleidung/-Schuhe
mit Grössenwahl (64 % der Sitzungen) — keine zeigt die Masse des Modells. Die Seite blendet nur den allgemeinen
Grössen-Guide ein, der sagt «steht auf der Produktseite eine eigene Tabelle, gilt die». CJ liefert die Tabelle als BILD
in der Beschreibung; Aurora S = Taille 37 cm flach = 74 cm Umfang, der Guide führt 74 cm als L. Shopweit haben 98,7 %
der 14'367 CJ-Mode-Produkte mit Grösse keine Massangabe.

QUELLE: dropship/_masstabellen.json — je Produkt zwei UNABHÄNGIGE Lesungen desselben Tabellenbilds (Leser + Prüfer,
Workflow «masstabellen-lesen», Vision). Geschrieben wird nur, wenn
  · beide Lesungen dieselben Grössen und Spalten haben und jede Zahl höchstens 1 (cm) abweicht,
  · die Grössen eine Teilmenge der Shop-Grössen sind (XXL = 2XL …),
  · jede Spalte mit der Grösse nicht fällt (Ausnahme: Spalten, die bei Schuhen konstant sein dürfen),
  · Einheit cm oder Zoll (Zoll × 2,54) ist.
Was durchfällt, steht im Bericht mit Grund — nie geraten.

SCHREIBEN: Block <div class="ls-masstabelle"> vor dem Faktenblock (ls-produktdetails); eine aus dem allgemeinen Guide
kopierte Tabelle («📏 Grössentabelle (Damen, cm)» mit 84–88 …) wird entfernt. Idempotent (vorhandener Block wird ersetzt).
produkttext_duenn.py lässt fremde <div> stehen. Ledger dropship/_masstabellen_ledger.tsv (Altwert für den Rückweg).

  python3 automation/masstabelle_schreiben.py            Trockenlauf: Urteil je Produkt + HTML-Vorschau
  SCHARF=1 python3 automation/masstabelle_schreiben.py   schreiben + zurücklesen (Aufseher täglich: hält Blöcke stehen)
  python3 automation/masstabelle_schreiben.py --selbsttest
"""
import html, json, os, re, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
DATEN = os.path.join(REPO, "dropship", "_masstabellen.json")
LEDGER = os.path.join(REPO, "dropship", "_masstabellen_ledger.tsv")
BERICHT = os.path.join(REPO, "dropship", "MASSTABELLEN.md")
SCHARF = os.environ.get("SCHARF") == "1"
TOLERANZ = 1.0
ORDNUNG = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"]
GENERISCH = re.compile(r"<h4>\s*📏\s*Grössentabelle \(Damen, cm\)\s*</h4>\s*<table>.*?</table>", re.S)
# Shopify kann HTML-Kommentare entfernen → das Blockende wird an der festen Struktur erkannt (h4, table, p, /div)
BLOCK = re.compile(r'<div class="ls-masstabelle">.*?</table>\s*<p>.*?</p>\s*</div>(?:<!--/ls-masstabelle-->)?', re.S)


def norm_gr(g):
    g = str(g).strip().upper().replace(" ", "")
    return {"XXL": "2XL", "XXXL": "3XL", "XXXXL": "4XL", "XXXXXL": "5XL"}.get(g, g)


def rang(g):
    g = norm_gr(g)
    if g in ORDNUNG:
        return ORDNUNG.index(g)
    try:
        return 100 + float(g.replace(",", "."))
    except ValueError:
        return None


# Reihenfolge zählt: «Länge (Bustier)» enthält «bust» → «länge» vor «bust» prüfen; «fusslänge» vor «länge»
KANON = [("brust", "brust"), ("fuss", "fusslänge"), ("innenbein", "innenbein"), ("körper", "körpergrösse"), ("länge", "länge"),
         ("laenge", "länge"), ("taille", "taille"), ("hüfte", "hüfte"), ("huefte", "hüfte"), ("saum", "saumweite"),
         ("schulter", "schulter"), ("ärmel", "ärmel"), ("bust", "brust")]


def kanon(name):
    n = name.strip().lower()
    return next((k for w, k in KANON if w in n), n)


def in_cm(t):
    f = 2.54 if t.get("einheit") == "inch" else 1.0
    return {norm_gr(z["groesse"]): [round(w * f * 2) / 2 for w in z["werte"]] for z in t.get("zeilen") or []}


def urteil(eintrag, shop_groessen):
    """→ (ok: bool, grund: str, tabelle | None)"""
    a, b = eintrag.get("leser") or {}, eintrag.get("pruefer") or {}
    if not a.get("gefunden"):
        return False, "kein Tabellenbild gefunden", None
    if not b or not b.get("gefunden"):
        return False, "keine Zweitlesung", None
    if a.get("einheit") not in ("cm", "inch") or b.get("einheit") not in ("cm", "inch"):
        return False, f"Einheit unklar ({a.get('einheit')}/{b.get('einheit')})", None
    fg = eintrag.get("freigabe")   # 12.10.: Hand-Freigabe nur für Spalten, die BEIDE gleich gelesen haben (Grund im Datensatz)
    if fg:
        idx = [i for i, sp in enumerate(a["spalten"]) if kanon(sp) in {kanon(x) for x in fg["spalten"]}]
        if not idx or len(idx) != len(fg["spalten"]):
            return False, f"Freigabe-Spalten fehlen: {fg['spalten']}", None
        def teil(t):
            return {**t, "sicherheit": "hoch", "spalten": [fg["namen"].get(t["spalten"][i], t["spalten"][i]) for i in idx],
                    "zeilen": [{"groesse": z["groesse"], "werte": [z["werte"][i] for i in idx]} for z in t["zeilen"]]}
        a, b = teil(a), teil(b)
    if a.get("sicherheit") != "hoch" or b.get("sicherheit") != "hoch":
        return False, f"Lesung nicht sicher ({a.get('sicherheit')}/{b.get('sicherheit')}) — {a.get('bemerkung', '')[:90]}", None
    # 12.10.: Spalten nach Grundbedeutung vergleichen («Rocklänge» = «Länge», «Brust (Bluse)» = «Brust») — die ZAHLEN entscheiden
    sa, sb = [kanon(x) for x in a["spalten"]], [kanon(x) for x in b["spalten"]]
    if sa != sb:
        return False, f"Spalten verschieden: {a['spalten']} / {b['spalten']}", None
    if any("unklar" in x.lower() for x in a["spalten"] + b["spalten"]):
        return False, f"Spalte unklar: {a['spalten']} / {b['spalten']}", None
    ta, tb = in_cm(a), in_cm(b)
    if set(ta) != set(tb):
        return False, f"Grössen verschieden: {sorted(ta)} / {sorted(tb)}", None
    for g in ta:
        if len(ta[g]) != len(sa) or len(tb[g]) != len(sa):
            return False, f"Zeile {g} unvollständig", None
        for i, (x, y) in enumerate(zip(ta[g], tb[g])):
            if abs(x - y) > TOLERANZ:
                return False, f"{g}/{a['spalten'][i]}: {x} ≠ {y}", None
    shop = {norm_gr(g) for g in shop_groessen}
    if shop:   # Zeilen, die der Shop nicht verkauft, fallen weg; mind. 2 Zeilen und ≥ 50 % der Shop-Grössen müssen bleiben
        ta = {g: w for g, w in ta.items() if g in shop}
        if len(ta) < 2 or len(ta) < 0.5 * len(shop):
            return False, f"Tabelle passt nicht zu den Shop-Grössen (Tabelle {sorted(in_cm(a))}, Shop {sorted(shop)})", None
    reihe = sorted(ta, key=lambda g: (rang(g) is None, rang(g) or 0))
    if any(rang(g) is None for g in reihe):
        return False, f"Grösse nicht einordenbar: {[g for g in reihe if rang(g) is None]}", None
    for i, sp in enumerate(a["spalten"]):
        werte = [ta[g][i] for g in reihe]
        if any(w2 < w1 for w1, w2 in zip(werte, werte[1:])):
            return False, f"Spalte {sp} fällt mit der Grösse: {werte}", None
    return True, "ok", {"spalten": a["spalten"], "reihe": reihe, "werte": ta,
                        "messart": a.get("messart") if a.get("messart") == b.get("messart") else "unklar"}


def block_html(t):
    zahl = lambda w: (f"{w:.1f}".rstrip("0").rstrip(".")).replace(".", ",")
    kopf = "".join(f"<th>{html.escape(s)}</th>" for s in t["spalten"])
    zeilen = "".join(f"<tr><td>{g}</td>" + "".join(f"<td>{zahl(w)}</td>" for w in t["werte"][g]) + "</tr>" for g in t["reihe"])
    hinweis = {"flach": "Flach gemessen (halber Umfang): Brust, Taille und Hüfte × 2 ergibt den Umfang. ",
               "umfang": "Umfang gemessen. "}.get(t["messart"], "")
    return ('<div class="ls-masstabelle"><h4>📏 Masse dieses Modells (cm, laut Hersteller)</h4>'
            f"<table><thead><tr><th>Grösse</th>{kopf}</tr></thead><tbody>{zeilen}</tbody></table>"
            f"<p>{hinweis}Von Hand gemessen, ±2 cm. Tipp: ein gut sitzendes Stück flach hinlegen und vergleichen; "
            "die Schnitte fallen oft kleiner aus als EU-Grössen — im Zweifel eine Grösse grösser.</p>"
            "</div><!--/ls-masstabelle-->")


def gleich(x, y):
    n = lambda h: re.sub(r">\s+<", "><", re.sub(r"<!--.*?-->", "", h or "", flags=re.S)).strip()
    return n(x) == n(y)


def einsetzen(alt, block):
    neu = BLOCK.sub("", alt)
    neu = GENERISCH.sub("", neu) if "84–88" in alt or "84-88" in alt else neu
    for anker in ('<div class="ls-produktdetails"', '<p class="ls-liefer"'):
        i = neu.find(anker)
        if i >= 0:
            return neu[:i] + block + neu[i:]
    return neu + block


def selbsttest():
    t = {"leser": {"gefunden": True, "sicherheit": "hoch", "einheit": "cm", "messart": "flach", "spalten": ["Brust", "Länge"],
                   "zeilen": [{"groesse": "S", "werte": [40, 120]}, {"groesse": "M", "werte": [42, 121]}]},
         "pruefer": {"gefunden": True, "sicherheit": "hoch", "einheit": "cm", "messart": "flach", "spalten": ["Rocklänge" if False else "Brust", "Länge"],
                     "zeilen": [{"groesse": "M", "werte": [42.5, 121]}, {"groesse": "S", "werte": [40, 120]}]}}
    faelle = [
        (urteil(t, ["S", "M", "L"])[0], True),
        (urteil(t, ["L", "XL"])[0], False),                                                     # Grössen nicht im Shop
        (urteil({**t, "pruefer": {**t["pruefer"], "zeilen": [{"groesse": "S", "werte": [44, 120]},
                                                            {"groesse": "M", "werte": [42, 121]}]}}, ["S", "M"])[0], False),  # Abweichung
        (urteil({**t, "pruefer": None}, ["S", "M"])[0], False),                                  # keine Zweitlesung
        (urteil({"leser": {**t["leser"], "zeilen": [{"groesse": "S", "werte": [44, 120]}, {"groesse": "M", "werte": [42, 121]}]},
                 "pruefer": {**t["pruefer"], "zeilen": [{"groesse": "S", "werte": [44, 120]}, {"groesse": "M", "werte": [42, 121]}]}},
                ["S", "M"])[0], False),                                                         # Spalte fällt
        (norm_gr("xxl") == "2XL", True),
        (gleich('<div>\n<p>a</p>\n</div><!--x-->', '<div><p>a</p></div>'), True),
        (kanon("Rocklänge") == kanon("Länge") and kanon("Brust (Bluse)") == "brust" and kanon("Länge (Bustier)") == "länge", True),
        (urteil({**t, "pruefer": {**t["pruefer"], "sicherheit": "mittel"}}, ["S", "M"])[0], False),     # unsicher → nie
        ("ls-masstabelle" in einsetzen('<p>x</p><div class="ls-produktdetails">y</div>', block_html(urteil(t, ["S", "M"])[2])), True),
        (einsetzen('<h4>📏 Grössentabelle (Damen, cm)</h4><table><tr><td>84–88</td></tr></table><p>z</p>', "B").count("84–88"), 0),
        (einsetzen(einsetzen('<p>x</p><div class="ls-produktdetails">y</div>', block_html(urteil(t, ["S", "M"])[2])).replace("<!--/ls-masstabelle-->", ""),
                   block_html(urteil(t, ["S", "M"])[2])).count('class="ls-masstabelle"'), 1),     # idempotent, auch ohne Kommentar
        (bool(titel_widerspruch("Herrenhemd «Monsieur» Kurzarm", {"spalten": ["Brust", "Ärmel"], "reihe": ["S"], "werte": {"S": [106, 65]}})), True),
        (titel_widerspruch("Herrenhemd «Monsieur» Langarm", {"spalten": ["Brust", "Ärmel"], "reihe": ["S"], "werte": {"S": [106, 65]}}), None),
    ]
    ok = sum(a == b for a, b in faelle)
    print(f"SELBSTTEST {ok}/{len(faelle)}")
    return 0 if ok == len(faelle) else 1


def titel_widerspruch(titel, t):
    """13.10.: «Herren-Sommerhemd … Kurzarm» bekam eine Tabelle mit Ärmel 65–69 cm — die Bilder zeigten ein Langarm-Hemd,
    CJ sagt «Long sleeves». Falsch war der TITEL. Widerspricht die Tabelle dem Titel, wird nicht geschrieben (Grund im
    Bericht): erst Titel/Bilder klären. Kurzarm/Shorts/Mini → Ärmel > 35 cm bzw. Länge > 110 cm (Hose) ist ein Widerspruch."""
    ti = titel.lower()
    sp = [kanon(x) for x in t.get("spalten", [])]
    def maxwert(name):
        if name not in sp:
            return None
        i = sp.index(name)
        return max((t["werte"][g][i] for g in t.get("reihe", []) if len(t["werte"].get(g, [])) > i), default=None)
    arm = maxwert("ärmel")
    if re.search(r"kurzarm|ärmellos|aermellos|tanktop|\btop\b.*träger", ti) and arm and arm > 35:
        return f"Titel «{titel[:40]}» sagt kurz/ärmellos, Tabelle Ärmel bis {arm:g} cm — Titel oder Bilder prüfen"
    if re.search(r"\bshorts?\b|kurze hose|bermuda", ti):
        lg = maxwert("länge")
        if lg and lg > 70:
            return f"Titel «{titel[:40]}» sagt Shorts, Tabelle Länge bis {lg:g} cm — Titel oder Bilder prüfen"
    return None


def main():
    from seo_autopilot import gql
    daten = json.load(open(DATEN, encoding="utf-8"))
    zeilen, geschrieben, fehler = [], 0, 0
    for e in daten:
        h = e["handle"]
        p = gql('query($h:String!){productByHandle(handle:$h){id title status descriptionHtml options{name values}}}', {"h": h}).get("productByHandle")
        if not p:
            zeilen.append((h, False, "Produkt nicht gefunden")); continue
        gr = next((o["values"] for o in p["options"] if re.search(r"gr(ö|oe)sse|size", o["name"], re.I)), [])
        ok, grund, t = urteil(e, gr)
        if ok:
            wid = titel_widerspruch(p.get("title") or "", t)
            if wid:
                ok, grund = False, wid
        zeilen.append((h, ok, grund))
        if not ok:
            continue
        alt = p["descriptionHtml"] or ""
        neu = einsetzen(alt, block_html(t))
        if gleich(neu, alt):   # Shopify setzt Zeilenumbrüche zwischen Tags und entfernt Kommentare → bereinigt vergleichen
            continue
        if not SCHARF:
            print(f"  (trocken) {h}: {len(t['reihe'])} Grössen × {len(t['spalten'])} Masse"); continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}',
                {"i": {"id": p["id"], "descriptionHtml": neu}})["productUpdate"]
        zur = ((r.get("product") or {}).get("descriptionHtml")) or ""
        if r["userErrors"] or "ls-masstabelle" not in zur:
            fehler += 1; print(f"  ✗ {h}: {r['userErrors']}"); continue
        geschrieben += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{h}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{json.dumps(alt, ensure_ascii=False)}\n")
        time.sleep(0.4)
    # 12.10.2026: 14 Produkte trugen eine KOPIE des allgemeinen Guides als «📏 Grössentabelle (Damen, cm)» — der Guide sagt
    # «steht eine eigene Tabelle auf der Seite, gilt diese»; bei Lumea XS–3XL, verkauft XS–L. Kopie weg, Guide bleibt (Theme).
    kopien = json.load(open(os.path.join(REPO, "data", "masstabelle_generische_kopien.json"), encoding="utf-8"))
    weg = 0
    for h in kopien:
        p = gql('query($h:String!){productByHandle(handle:$h){id descriptionHtml}}', {"h": h}).get("productByHandle")
        if not p or not GENERISCH.search(p["descriptionHtml"] or "") or "84–88" not in (p["descriptionHtml"] or ""):
            continue
        neu = GENERISCH.sub("", p["descriptionHtml"])
        if not SCHARF:
            print(f"  (trocken) Kopie weg: {h}"); weg += 1; continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}',
                {"i": {"id": p["id"], "descriptionHtml": neu}})["productUpdate"]
        if r["userErrors"] or GENERISCH.search(((r.get("product") or {}).get("descriptionHtml")) or ""):
            fehler += 1; continue
        weg += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{h}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{json.dumps(p['descriptionHtml'], ensure_ascii=False)}\n")
    if weg:
        print(f"  allgemeine Kopien entfernt: {weg}")
    gut = sum(1 for z in zeilen if z[1])
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Masstabellen des Modells — Stand {time.strftime('%Y-%m-%d %H:%M')} UTC\n\n"
                f"{len(zeilen)} Produkte mit Doppellesung · {gut} bestanden · {len(zeilen) - gut} nicht geschrieben (Grund unten). "
                f"Regel: `automation/masstabelle_schreiben.py`, Daten `dropship/_masstabellen.json`.\n\n| Produkt | Urteil |\n|---|---|\n"
                + "\n".join(f"| `{h}` | {'✅ ' if ok else '— '}{g} |" for h, ok, g in zeilen) + "\n")
    print(f"MASSTABELLEN: {gut}/{len(zeilen)} bestanden{f' · geschrieben {geschrieben}, Fehler {fehler}' if SCHARF else ' (TROCKEN)'} → dropship/MASSTABELLEN.md")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(selbsttest() if "--selbsttest" in sys.argv else main())
