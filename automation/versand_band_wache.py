#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""versand_band_wache.py — der Versandsatz im Produkttext muss zur Kasse passen (12.10.2026).

ANLASS. Das Abendkleid «Sirène» kostet 49,90 CHF und schrieb «Versand CHF 7, ab CHF 50 gratis — mit einem
zweiten Artikel ist er bei diesem Kleid also inklusive». Die Kasse rechnet anders: gemessen am 12.10. mit
draftOrderCalculate (nur lesend, nichts angelegt): 44,90 CHF → Standard 7,00 · 45,00 CHF → «Kostenloser Versand»
· 49,90 / 49,99 / 50,00 → gratis. Die Schwelle der Kasse ist also 45 CHF für eine Einzelbestellung (Tarif, seit
02.10.), die öffentliche Zusage bleibt «gratis ab CHF 50» (Betreiber 02.10., «Versprechen = CHF 50»).
Ein Satz «Versand CHF 7» ist damit für Preise 45–49,99 CHF FALSCH: der Kunde sieht 7 CHF, die Kasse
verlangt keine.

GEFUNDEN 12.10. (Voll-Export 53'568 aktive Produkte): 1'464 in der Spanne 45–49,99 CHF; davon 2 mit dem
falschen Satz (Sirène, Wecker-Armband mit «darunter kostet der Versand CHF 7» in der FAQ). Kontrolle: unter
45 CHF 10 Treffer (richtig), ab 50 CHF 2 (kein Satz zum Versandbetrag).

NACHTRAG 13.10.2026 abends (Betreiber-Entscheid D, vorbereitet): Das Band beginnt bei UNTER = ch_lager_profil.GRATIS_AB_CH
(eine Quelle; heute 45, nach der Profil-Umstellung automation/gratis_schwelle_setzen.py 40.50). Die Zusage «gratis ab CHF 50»
bleibt erlaubt und stimmt weiter (2+ Artikel: 50 × 0,9 = 45 ≥ 40.50); eine genannte 40.50 ist dagegen KEINE Zusage (Regel 2,
Kanarien). Die Ist-Schwelle liest die Wache live aus dem General profile (`ist_schwelle()`) und meldet, wenn sie von UNTER abweicht.

REGEL. Preis UNTER ≤ p < 50 → kein Versandbetrag in Produkt- oder FAQ-Text. Ersetzt wird NUR ein Satz aus
RUECKSCHREIBEN, der wörtlich und genau einmal im HTML steht. Alles andere wird nur gemeldet.

REGEL 2 (13.10.2026, Kassen-Prüfung wf_2a13fa79, Richter Platz 3): Jede GENANNTE Gratis-Schwelle muss «50» sein.
Gemessen 13.10.: 11 Stellen nannten 45 oder 65 — 7× der Ratgeber «Adventskalender zum Befüllen» (rät zu Körben aus Stickern
+ Magneten: −10 % ab 2 Artikeln lässt sich nicht mit Versandrabatten kombinieren, 47.00 → 42.30 → die Kasse verlangt CHF 7,
obwohl der Text «gratis ab 45» verspricht), 3 Produkttexte/SEO mit 45, 1 SEO-Text mit 65. «ab 50» stimmt für jeden Korb
(1 Artikel gratis ab 45, 2+ Artikel ab 50 Warenwert, WELCOME10 ebenso), «ab 45» nicht. Geprüft: Produkte (Beschreibung,
seo.title, seo.description), Blog-Artikel (body, summary, SEO-Metafeld), Seiten (body, SEO-Metafeld). Geändert wird NUR mit
den festen Satzmustern in SCHWELLE_FIX (Zahl → 50, «in der Schweiz» ergänzt, LI hat keinen Gratisversand); was danach noch
eine falsche Schwelle trägt, wird nur gemeldet. `--kanarien` prüft Finder und Satzmuster ohne Netz.

  python3 automation/versand_band_wache.py           # Trockenlauf (Standard): nur Befunde
  SCHARF=1 python3 automation/versand_band_wache.py  # schreibt, liest zurück, Ledger dropship/_versand_band.tsv
Der Voll-Export läuft über bulkOperationRunQuery; fremde Exporte werden NIE abgebrochen (Lehre 07.10.).
"""
import os, re, sys, time, json, urllib.request
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from seo_autopilot import gql  # noqa: E402

LEDGER = os.path.join(REPO, "dropship", "_versand_band.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
try:
    from ch_lager_profil import GRATIS_AB_CH as UNTER   # eine Quelle (45; Entscheid D 40.50 vorbereitet)
except Exception:  # pragma: no cover
    UNTER = 45.0
OBEN = 50.0

# Exakte Ersetzungen. Jede Zeile: (alter Satz, neuer Satz). Nur was hier steht, wird geschrieben.
RUECKSCHREIBEN = [
    # Gegenprobe 12.10. (wf_52c03c1d): Die Kasse gibt Einzelbestellungen ab 45 CHF gratis, die Zusage bleibt
    # «ab 50». Der neue Satz verspricht nicht mehr als die Zusage und nennt die Schweiz (Liechtenstein hat
    # keinen Gratisversand: 14,90 CHF bei 49,90 und 50,00 gemessen).
    ("Versand CHF 7, ab CHF 50 gratis — mit einem zweiten Artikel ist er bei diesem Kleid also inklusive.",
     "Versand in der Schweiz ab CHF 50 gratis."),
    ("Innerhalb der Schweiz liefern wir ab einem Bestellwert von CHF 50 gratis, darunter kostet der Versand CHF 7.",
     "Innerhalb der Schweiz liefern wir ab einem Bestellwert von CHF 50 gratis."),
]

INNER = ('{ products(query: "status:active") { edges { node { id handle priceRangeV2 { minVariantPrice { amount } } '
         'descriptionHtml seo { title description } } } } }')

# ── REGEL 2: genannte Gratis-Schwelle ≠ 50 ─────────────────────────────────────────────────────────────────────────
_GR = (r'(?:gratis|kostenlos(?:er|e)?|versandkostenfrei|portofrei|frei\s+haus|gratis-?versand|kostenlose[rn]?\s+versand|'
       r'versand\s+gratis|versand\s+kostenlos)')
_BETRAG = r'(?:CHF|Fr\.?|SFr\.?)\s?(\d{2,3})(?:[.,](?:00|–|-))?|(\d{2,3})(?:[.,](?:00|–|-))?\s?(?:CHF|Fr\.?|Franken)'
SCHWELLE_RX = [
    re.compile(_GR + r'[^.<]{0,60}?\b(?:ab|über|ueber)\s+(?:einem\s+(?:bestell|waren|einkaufs)wert\s+von\s+)?(?:' + _BETRAG + ')', re.I),
    re.compile(r'\b(?:ab|über)\s+(?:einem\s+(?:bestell|waren|einkaufs)wert\s+von\s+)?(?:' + _BETRAG + r')[^.<]{0,50}?' + _GR, re.I),
    # «Bleibt deine Bestellung unter CHF 45, kommen CHF 7 Versand dazu» nennt die Schwelle indirekt (Advent-Ratgeber 13.10.)
    re.compile(r'\bunter\s+(?:CHF|Fr\.?)\s?(\d{2,3})\b[^.<]{0,40}?\bCHF\s?7(?:\.00)?\s+Versand', re.I),
]
# Feste Satzmuster (Reihenfolge zählt). Nur diese schreiben; Zahl → 50, «in der Schweiz» dazu, wo es fehlt.
SCHWELLE_FIX = [
    (re.compile(r'(Gratis-Versand in der Schweiz ab CHF ?)(?:40[.,]50|45|65)\b'), r'\g<1>50'),
    (re.compile(r'(Gratis-Versand) ab (CHF ?)(?:40[.,]50|45|65)\b'), r'\1 in der Schweiz ab \g<2>50'),
    (re.compile(r'(Versand CHF 7, )gratis ab (CHF ?)(?:40[.,]50|45|65)\b'), r'\1in der Schweiz gratis ab \g<2>50'),
    (re.compile(r'\bab (CHF ?)(?:40[.,]50|45|65)( Bestellwert ist (?:der Versand|er)) gratis'), r'ab \g<1>50\2 in der Schweiz gratis'),
    (re.compile(r'(Innerhalb der Schweiz liefern wir ab einem Bestellwert von CHF )(?:40[.,]50|45|65)( gratis)'), r'\g<1>50\2'),
    (re.compile(r'\b(unter CHF ?)(?:40[.,]50|45|65)(, kommen CHF 7 Versand dazu)'), r'\g<1>50\2'),
]
SCHWELLE_KANARIEN = [   # (Text, erwartete Zahl der Funde, Text nach Fix oder None = unverändert)
    ("Gratis-Versand in der Schweiz ab CHF 45 · 30 Tage Rückgabe", 1, "Gratis-Versand in der Schweiz ab CHF 50 · 30 Tage Rückgabe"),
    ("Jetzt bestellen. Gratis-Versand ab CHF 45, 30 Tage Rückgabe.", 1, "Jetzt bestellen. Gratis-Versand in der Schweiz ab CHF 50, 30 Tage Rückgabe."),
    ("Zahlung mit TWINT, Gratis-Versand ab CHF 65, 30 Tage", 1, "Zahlung mit TWINT, Gratis-Versand in der Schweiz ab CHF 50, 30 Tage"),
    ("Versand CHF 7, gratis ab CHF 45 Ansehen", 1, "Versand CHF 7, in der Schweiz gratis ab CHF 50 Ansehen"),
    ("ab CHF 45 Bestellwert ist der Versand gratis (Stand)", 1, "ab CHF 50 Bestellwert ist der Versand in der Schweiz gratis (Stand)"),
    ("kostet der Versand CHF 7, ab CHF 45 Bestellwert ist er gratis.", 1, "kostet der Versand CHF 7, ab CHF 50 Bestellwert ist er in der Schweiz gratis."),
    ("Innerhalb der Schweiz liefern wir ab einem Bestellwert von CHF 45 gratis, darunter", 1,
     "Innerhalb der Schweiz liefern wir ab einem Bestellwert von CHF 50 gratis, darunter"),
    ("Gratis-Versand in der Schweiz ab CHF 50", 0, None),
    # 13.10. abends (Entscheid D): die Tarif-Zahl 40.50 ist KEINE Zusage — «ab 50» bleibt die einzige genannte Schwelle
    ("Gratis-Versand ab CHF 40.50, 30 Tage Rückgabe", 1, "Gratis-Versand in der Schweiz ab CHF 50, 30 Tage Rückgabe"),
    ("Versand CHF 7, gratis ab CHF 40.50", 1, "Versand CHF 7, in der Schweiz gratis ab CHF 50"),
    ("Ab 45 Grad Wassertemperatur waschen, kostenlos", 0, None),       # keine Währung → keine Schwelle
    ("Set ab CHF 45 – Lieferung 10–20 Tage", 0, None),                 # Preis, kein Gratiswort
    ("Bleibt deine Shop-Bestellung unter CHF 45, kommen CHF 7 Versand dazu.", 1,
     "Bleibt deine Shop-Bestellung unter CHF 50, kommen CHF 7 Versand dazu."),
    ("Für Kinder unter CHF 45 Budget: Sticker, Versand je nach Korb.", 0, None),   # kein «CHF 7 Versand»
]


def schwelle_funde(t):
    """[(zahl, ausschnitt)] aller genannten Gratis-Schwellen ≠ 50 (Text ohne Tags erwartet)."""
    out = []
    for rx in SCHWELLE_RX:
        for m in rx.finditer(t or ""):
            v = next((g for g in m.groups() if g), None)
            if v and v != "50":
                out.append((v, (t or "")[max(0, m.start() - 30):m.end() + 20]))
    return out


def _klartext(h):
    import html as _h
    return re.sub(r"\s+", " ", _h.unescape(re.sub(r"<[^>]+>", " ", h or "")))


def schwelle_fix(s):
    """→ (neuer Text, Zahl der Ersetzungen). Nur feste Satzmuster."""
    n = 0
    for rx, ers in SCHWELLE_FIX:
        s, k = rx.subn(ers, s)
        n += k
    return s, n


def schwelle_kanarien():
    fehler = 0
    for t, soll_n, soll_fix in SCHWELLE_KANARIEN:
        ist_n = len(schwelle_funde(t))
        neu, _ = schwelle_fix(t)
        ok = ist_n == soll_n and (neu == (soll_fix if soll_fix is not None else t)) and not schwelle_funde(neu)
        fehler += not ok
        print(f"  {'✓' if ok else '✗'} {t[:60]:62} Funde {ist_n} → {neu[:70] if neu != t else '(unverändert)'}")
    print(f"KANARIEN Schwelle {len(SCHWELLE_KANARIEN) - fehler}/{len(SCHWELLE_KANARIEN)}")
    return fehler == 0


def voll_export():
    """Aktive Produkte über den Bulk-Export. Startet nur den EIGENEN Vorgang und liest seine ID zurück."""
    d = gql('mutation($q:String!){ bulkOperationRunQuery(query:$q){ bulkOperation{ id status } userErrors{ field message } } }',
            {"q": INNER})["bulkOperationRunQuery"]
    if d["userErrors"]:
        raise RuntimeError(f"Bulk-Start abgelehnt: {d['userErrors']}")
    oid = d["bulkOperation"]["id"]
    while True:
        op = gql('query($i:ID!){ node(id:$i){ ... on BulkOperation { status errorCode objectCount url } } }',
                 {"i": oid})["node"]
        if op["status"] in ("COMPLETED", "FAILED", "CANCELED", "EXPIRED"):
            break
        time.sleep(15)
    if op["status"] != "COMPLETED" or not op.get("url"):
        raise RuntimeError(f"Bulk nicht abgeschlossen: {op}")
    zeilen = []
    with urllib.request.urlopen(op["url"], timeout=300) as f:
        for raw in f:
            o = json.loads(raw)
            if str(o.get("id", "")).startswith("gid://shopify/Product/"):
                zeilen.append(o)
    return zeilen


def preis(o):
    try:
        return float(((o.get("priceRangeV2") or {}).get("minVariantPrice") or {}).get("amount") or 0)
    except (TypeError, ValueError):
        return 0.0


def befunde(zeilen):
    """Produkte in der Spanne UNTER–49,99 CHF mit mindestens einem falschen Versandsatz."""
    treffer = []
    for o in zeilen:
        p = preis(o)
        if not (UNTER <= p < OBEN):
            continue
        html = o.get("descriptionHtml") or ""
        gefunden = [(alt, neu) for alt, neu in RUECKSCHREIBEN if html.count(alt) >= 1]
        if gefunden:
            treffer.append((o, p, gefunden))
    return treffer


def schreiben(o, gefunden):
    """Ersetzt die Sätze, prüft am HTML des Lesezugriffs. Gibt (ok, Grund) zurück."""
    html = o["descriptionHtml"]
    neu = html
    for alt, ers in gefunden:
        if neu.count(alt) != 1:
            return False, f"Satz nicht genau einmal ({neu.count(alt)}x)"
        neu = neu.replace(alt, ers)
    d = gql('mutation($i:ProductInput!){ productUpdate(input:$i){ product{ id descriptionHtml } userErrors{ field message } } }',
            {"i": {"id": o["id"], "descriptionHtml": neu}})["productUpdate"]
    if d["userErrors"]:
        return False, f"Shopify: {d['userErrors']}"
    zurueck = d["product"]["descriptionHtml"]
    for alt, ers in gefunden:
        if alt in zurueck or ers not in zurueck:
            return False, "Rücklesen stimmt nicht"
    return True, "zurückgelesen"


def ledger(zeile):
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join(zeile) + "\n")


def _alle(kind, felder):
    """Alle Artikel oder Seiten (kind = 'articles' | 'pages')."""
    out, c = [], None
    while True:
        d = gql('query($c:String){ %s(first:100, after:$c){ pageInfo{ hasNextPage endCursor } nodes{ %s } } }' % (kind, felder),
                {"c": c})[kind]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        c = d["pageInfo"]["endCursor"]


def regel2(zeilen):
    """→ Liste von Aufträgen {art, id, name, felder:{feld:(alt, neu)}, rest:[funde nach Fix]}."""
    auftraege = []

    def pruefe(art, oid, name, felder):
        auftrag = {"art": art, "id": oid, "name": name, "felder": {}, "rest": []}
        for feld, (wert, html) in felder.items():
            klar = _klartext(wert) if html else (wert or "")
            if not schwelle_funde(klar):
                continue
            neu, n = schwelle_fix(wert or "")
            rest = schwelle_funde(_klartext(neu) if html else neu)
            if n and not rest:
                auftrag["felder"][feld] = (wert, neu)
            else:
                auftrag["rest"] += [(feld, z, a) for z, a in (rest or schwelle_funde(klar))]
        if auftrag["felder"] or auftrag["rest"]:
            auftraege.append(auftrag)

    for o in zeilen:
        seo = o.get("seo") or {}
        pruefe("produkt", o["id"], o["handle"], {"descriptionHtml": (o.get("descriptionHtml"), True),
                                                  "seo.title": (seo.get("title"), False),
                                                  "seo.description": (seo.get("description"), False)})
    for a in _alle("articles", 'id handle body summary blog{ handle } '
                   'seo: metafield(namespace:"global", key:"description_tag"){ value }'):
        pruefe("artikel", a["id"], f"{a['blog']['handle']}/{a['handle']}",
               {"body": (a.get("body"), True), "summary": (a.get("summary"), True),
                "description_tag": ((a.get("seo") or {}).get("value"), False)})
    for p in _alle("pages", 'id handle body seo: metafield(namespace:"global", key:"description_tag"){ value }'):
        pruefe("seite", p["id"], p["handle"], {"body": (p.get("body"), True),
                                               "description_tag": ((p.get("seo") or {}).get("value"), False)})
    return auftraege


def regel2_schreiben(a, zeilen_nach_id):
    """Schreibt die Felder eines Auftrags, liest zurück. → (ok, Grund)."""
    f = a["felder"]
    if a["art"] == "produkt":
        inp = {"id": a["id"]}
        if "descriptionHtml" in f:
            inp["descriptionHtml"] = f["descriptionHtml"][1]
        if "seo.title" in f or "seo.description" in f:
            seo = (zeilen_nach_id.get(a["id"]) or {}).get("seo") or {}
            inp["seo"] = {"title": f.get("seo.title", (None, seo.get("title")))[1],          # Lehre 30.09.: seo immer
                          "description": f.get("seo.description", (None, seo.get("description")))[1]}   # als Ganzes
        d = gql('mutation($i:ProductInput!){ productUpdate(input:$i){ product{ descriptionHtml seo{ title description } } '
                'userErrors{ field message } } }', {"i": inp})["productUpdate"]
        if d["userErrors"]:
            return False, f"Shopify: {d['userErrors']}"
        pr = d["product"]
        zurueck = {"descriptionHtml": pr["descriptionHtml"], "seo.title": pr["seo"]["title"],
                   "seo.description": pr["seo"]["description"]}
    else:
        kind = "article" if a["art"] == "artikel" else "page"
        body = {k: v[1] for k, v in f.items() if k in ("body", "summary")}
        zurueck = {}
        if body:
            if kind == "article":
                d = gql('mutation($id:ID!,$a:ArticleUpdateInput!){ articleUpdate(id:$id, article:$a){ article{ body summary } '
                        'userErrors{ field message } } }', {"id": a["id"], "a": body})["articleUpdate"]
                if d["userErrors"]:
                    return False, f"Shopify: {d['userErrors']}"
                zurueck.update(d["article"])
            else:
                d = gql('mutation($id:ID!,$p:PageUpdateInput!){ pageUpdate(id:$id, page:$p){ page{ body } '
                        'userErrors{ field message } } }', {"id": a["id"], "p": body})["pageUpdate"]
                if d["userErrors"]:
                    return False, f"Shopify: {d['userErrors']}"
                zurueck.update(d["page"])
        if "description_tag" in f:
            d = gql('mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{ value } '
                    'userErrors{ message } } }', {"m": [{"ownerId": a["id"], "namespace": "global", "key": "description_tag",
                                                       "type": "single_line_text_field", "value": f["description_tag"][1]}]})
            ms = d["metafieldsSet"]
            if ms["userErrors"]:
                return False, f"Shopify: {ms['userErrors']}"
            zurueck["description_tag"] = ms["metafields"][0]["value"]
    for feld, (_, neu) in f.items():
        if (zurueck.get(feld) or "").strip() != (neu or "").strip():
            return False, f"Rücklesen {feld} stimmt nicht"
    return True, "zurückgelesen"


def ist_schwelle():
    """Ist-Schwelle «Kostenloser Versand» CH im General profile (live) — None, wenn nicht lesbar."""
    try:
        from warenkorb_gratisversand import tarif
        return tarif()[1]
    except Exception as e:  # noqa: BLE001
        print(f"Ist-Schwelle nicht lesbar: {type(e).__name__}: {str(e)[:120]}")
        return None


def main():
    if "--kanarien" in sys.argv:
        return 0 if schwelle_kanarien() else 1
    ist = ist_schwelle()
    if ist is not None and abs(ist - UNTER) > 0.005:
        print(f"⚠️ VERSAND-BAND: Kasse gratis ab {ist:.2f}, Wache rechnet mit {UNTER:.2f} → ch_lager_profil.GRATIS_AB_CH / "
              f"automation/gratis_schwelle_setzen.py prüfen")
    elif ist is not None:
        print(f"Ist-Schwelle Kasse: gratis ab {ist:.2f} = Band-Beginn")
    if not schwelle_kanarien():
        print("ABBRUCH: Kanarien Schwelle rot")
        return 1
    zeilen = voll_export()
    print(f"Voll-Export: {len(zeilen)} aktive Produkte")
    treffer = befunde(zeilen)
    print(f"Spanne {UNTER:.2f}–49,99 CHF mit falschem Versandsatz: {len(treffer)}")
    for o, p, gefunden in treffer:
        print(f"  {p:6.2f}  {o['handle'][:60]}  ({len(gefunden)} Satz/Sätze)")
    r2 = regel2_lauf(zeilen)
    if not SCHARF:
        print("Trockenlauf — nichts geschrieben. SCHARF=1 zum Schreiben.")
        return r2
    ok = fehl = 0
    for o, p, gefunden in treffer:
        gut, grund = schreiben(o, gefunden)
        ledger([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), o["handle"], f"{p:.2f}",
                "ok" if gut else "fehler", grund])
        ok += gut
        fehl += not gut
    print(f"geschrieben: {ok} · Fehler: {fehl}")
    return 0 if fehl == 0 else 1


def regel2_lauf(zeilen):
    auftraege = regel2(zeilen)
    fix = [a for a in auftraege if a["felder"]]
    rest = [a for a in auftraege if a["rest"]]
    print(f"REGEL 2 Gratis-Schwelle ≠ 50: {len(auftraege)} Stellen-Träger · {len(fix)} mit festem Satzmuster · "
          f"{len(rest)} nur gemeldet")
    for a in auftraege:
        for feld, (alt, neu) in a["felder"].items():
            print(f"  ✎ {a['art']:7} {a['name'][:55]:57} {feld}")
        for feld, z, aus in a["rest"]:
            print(f"  ⚠ {a['art']:7} {a['name'][:55]:57} {feld} «{z}» …{aus[:80]}…")
    if not SCHARF:
        return 0
    nach_id = {o["id"]: o for o in zeilen}
    fehl = 0
    for a in fix:
        gut, grund = regel2_schreiben(a, nach_id)
        ledger([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), f"schwelle:{a['art']}:{a['name']}",
                ",".join(a["felder"]), "ok" if gut else "fehler", grund])
        print(f"  {'✓' if gut else '✗'} {a['art']} {a['name'][:60]} — {grund}")
        fehl += not gut
    return 0 if fehl == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
