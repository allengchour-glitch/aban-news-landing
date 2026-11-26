#!/usr/bin/env python3
"""google_org_richtlinien.py — Rückgabe- und Versandregel als Organization-Markup (06.10.2026).

ANLASS (gemessen): Search Console meldete am 06.10. «Händlereinträge»: «shippingDetails fehlt (in offers)»,
«hasMerchantReturnPolicy fehlt (in offers)»; Live-JSON-LD der Provence-Seite: Offer ohne beide Felder, Organization
(sections/header.liquid, auf jeder Seite) nur name/logo/url. Google empfiehlt beides EINMAL für den ganzen Shop unter
`Organization` (developers.google.com/search/docs/appearance/structured-data/merchant-listing: «We recommend you provide a
global return policy / shipping policy for your business under Organization markup instead»).

FAKTEN (Kanon = shopPolicies, siehe zusagen_abgleich.py; Tarif = deliveryProfiles, gemessen 06.10.):
  Rückgabe  Schweiz, 30 Tage, per Post, Rücksendeporto trägt die Kundin, volle Erstattung.
  Versand   Schweiz, CHF 7.00; ab Bestellwert GRATIS_AB_CH gratis (Tarif, EINE Quelle ch_lager_profil.GRATIS_AB_CH: 45;
            Betreiber-Entscheid D 40.50 vorbereitet; Versprechen auf den Seiten «ab 50» = Puffer). Stellt jemand die Konstante um,
            meldet --pruefen «Markup veraltet» — nur gemeldet: der Aufseher schreibt allein bei «Markup fehlt» neu (SCHARF=1);
            «veraltet» braucht einen Handlauf SCHARF=1 (Stand 26.11.2026, fixer_keepalive.sh, im Selbsttest festgehalten).
            Liechtenstein (seit 09.10. Lieferland, Nachtrag 13.10.2026 Kauf-Strecke Klasse 16): CHF 14.90, KEIN Gratisversand
            (Zone «Liechtenstein» im General profile, gemessen 13.10.); Rückgabe 30 Tage gilt laut Richtlinie für CH und LI.
  Ein bestehendes Markup ohne LI wird beim SCHARF-Lauf ERSETZT (nicht nur eingefügt, wenn es fehlt).

  python3 automation/google_org_richtlinien.py            # Trockenlauf
  SCHARF=1 python3 automation/google_org_richtlinien.py   # Live-Datei holen, sichern (/tmp), einfügen, zurücklesen
  python3 automation/google_org_richtlinien.py --pruefen  # Wächter (Aufseher, täglich): Markup live, Tarif passt?
  python3 automation/google_org_richtlinien.py --selbsttest

NACHTRAG 26.11.2026 (Theme-Wechsel 21.11., dropship/theme-id-2611/URTEILE.md): bis 26.11. erbte das Werkzeug die feste ID 187533001089
(wg.THEME, seit 21.11. unveröffentlicht). Es wandert bewusst MIT aufs Live-Theme: sein Inhalt kommt aus GRATIS_AB_CH (50) und den Tarifen,
entspricht also dem heutigen Stand. Jeder Lauf holt die Live-ID einmal zur Laufzeit (wg.live_theme() → main_theme.gid(), fail-closed)
und liest/schreibt nur dort; der Import fragt nichts ab. --selbsttest lässt pruefen()/einfuegen() ohne Netz gegen ein Attrappen-Theme
laufen (theme_attrappe.py): nur «Markup fehlt» löst im Aufseher die Reparatur aus; ohne role MAIN wird nichts geplant oder geschrieben.
"""
import json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402  (Eimer-Etikette im Helfer)
import warenkorb_gratisversand as wg  # noqa: E402  (tarif(), live_theme())

DATEI = "sections/header.liquid"
MARKE = "LUX-ORG-RICHTLINIEN"
# 14.10.2026: url zeigt auf die Startseite (routes.root_url), nicht auf die gerade offene Seite — Organization ist die Firma,
# nicht die Seite; dazu @id #org, E-Mail, areaServed (die zweite Organization in layout/theme.liquid ist weg, S3 Schritt 9).
URL_ZEILE = '    "url": {{ request.origin | append: routes.root_url | json }}'
ANKER = URL_ZEILE + '''
  }
</script>'''
RUECKGABE_TAGE = 30
VERSAND_CHF = 7.00
from ch_lager_profil import GRATIS_AB_CH as GRATIS_AB_CHF  # noqa: E402  (eine Quelle; Entscheid D 40.50 vorbereitet)
LI_VERSAND_CHF = 14.90
LAENDER = ["CH", "LI"]
# 21.10.2026 (Spähtrupp wf_32ed9d12 OFF-2, Skeptiker bestätigt): Organization ohne sameAs — Google empfiehlt es («Recommended properties»), es klärt, dass
# luxestyle.ch und diese Konten dieselbe Firma sind (Entitätsklärung, Hygiene — KEIN belegter Index- oder Ranking-Hebel). Nur Konten, die der Skeptiker per
# curl mit HTTP 200 geprüft hat bzw. die in diesem Repo als unsere geführt sind; Threads fehlt bewusst (Handle ungeprüft, threads.net → threads.com).
SAME_AS = ["https://www.facebook.com/1049840534888592", "https://www.instagram.com/luxestyle.ch/", "https://www.tiktok.com/@luxestyle.ch",
           "https://www.pinterest.com/luxestyleCH/", "https://www.youtube.com/@luxestyle_ch"]


def markup():
    rueckgabe = {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": LAENDER,
        "returnPolicyCountry": "CH",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": RUECKGABE_TAGE,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility",
        "refundType": "https://schema.org/FullRefund",
    }
    ziel = {"@type": "DefinedRegion", "addressCountry": "CH"}
    versand = {
        "@type": "ShippingService",
        "name": "Versand Schweiz",
        "shippingConditions": [
            {"@type": "ShippingConditions", "shippingDestination": ziel,
             "orderValue": {"@type": "MonetaryAmount", "currency": "CHF", "minValue": 0, "maxValue": GRATIS_AB_CHF - 0.01},
             "shippingRate": {"@type": "MonetaryAmount", "value": VERSAND_CHF, "currency": "CHF"}},
            {"@type": "ShippingConditions", "shippingDestination": ziel,
             "orderValue": {"@type": "MonetaryAmount", "currency": "CHF", "minValue": GRATIS_AB_CHF},
             "shippingRate": {"@type": "MonetaryAmount", "value": 0, "currency": "CHF"}},
        ],
    }
    versand_li = {
        "@type": "ShippingService",
        "name": "Versand Liechtenstein",
        "shippingConditions": [
            {"@type": "ShippingConditions", "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "LI"},
             "shippingRate": {"@type": "MonetaryAmount", "value": LI_VERSAND_CHF, "currency": "CHF"}},
        ],
    }
    teil = json.dumps({"hasMerchantReturnPolicy": rueckgabe, "hasShippingService": [versand, versand_li], "sameAs": SAME_AS}, ensure_ascii=False)
    return teil[1:-1]   # ohne äussere Klammern → wird als weitere Felder ins Organization-Objekt gesetzt


def neu_aus(alt):
    block = (URL_ZEILE + ',\n'
             f'    {{%- comment -%}} {MARKE} (06.10.2026, automation/google_org_richtlinien.py) {{%- endcomment -%}}\n'
             f'    {markup()}\n  }}\n</script>')
    return alt.replace(ANKER, block, 1)


def aktualisiert(alt):
    """Ersetzt eine vorhandene (ältere) Markup-Zeile direkt unter der MARKE durch markup(); None, wenn nichts zu tun."""
    i = alt.find(MARKE)
    if i < 0:
        return None
    a = alt.find("\n", i) + 1
    e = alt.find("\n", a)
    zeile = alt[a:e]
    if '"hasMerchantReturnPolicy"' not in zeile:
        return None
    soll = "    " + markup()
    if zeile == soll:
        return None
    try:   # 26.11.2026: gleicher INHALT = aktuell (live «"minValue": 50», markup() «50.0» — nur Zahlformat, für Google gleich)
        if json.loads("{" + zeile.strip() + "}") == json.loads("{" + markup() + "}"):
            return None
    except ValueError:
        pass
    return alt[:a] + soll + alt[e:]


def tarif_li():
    """Preis(e) der aktiven Raten in der LI-Zone des General profile."""
    q = '''query($id:ID!){ deliveryProfile(id:$id){ default profileLocationGroups{ locationGroupZones(first:10){ nodes{
      zone{ countries{ code{ countryCode } } }
      methodDefinitions(first:15){ nodes{ active rateProvider{ ... on DeliveryRateDefinition{ price{ amount } } } } } } } } } }'''
    preise = set()
    # 26.11.2026: nur das General profile abfragen — die alte Abfrage über deliveryProfiles(first:10) kostete 618 Punkte
    # und blieb neben den Dauerläufern dauerhaft gedrosselt (40× «Throttled»); jetzt ~1/10.
    from ch_lager_profil import GENERAL
    prof = gql(q, {"id": GENERAL})["deliveryProfile"]
    if not prof or not prof["default"]:
        raise RuntimeError("General profile nicht (mehr) das Standard-Versandprofil — Tarif nicht lesbar")
    for p in [prof]:
        for g in p["profileLocationGroups"]:
            for z in g["locationGroupZones"]["nodes"]:
                if "LI" in [c["code"]["countryCode"] for c in z["zone"]["countries"]]:
                    preise |= {float(((m.get("rateProvider") or {}).get("price") or {}).get("amount") or -1)
                               for m in z["methodDefinitions"]["nodes"] if m["active"]}
    return sorted(preise)


def datei(theme):
    r = gql('query($id:ID!){ theme(id:$id){ role files(filenames:["%s"]){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }' % DATEI,
            {"id": theme})["theme"]
    return r["role"], r["files"]["nodes"][0]["body"]["content"]


def pruefen():
    try:
        theme = wg.live_theme()
    except RuntimeError as e:   # fail-closed; Wortlaut löst im Aufseher KEINE Reparatur aus
        print(f"⚠️ GOOGLE-ORG-RICHTLINIEN: Live-Theme nicht ermittelbar ({str(e)[:120]}) — nicht geprüft"); return 1
    role, inhalt = datei(theme)
    std, gratis = wg.tarif()
    b = []
    if role != "MAIN":
        b.append(f"Theme {theme} nicht MAIN ({role})")
    if MARKE not in inhalt:
        b.append("Markup fehlt im Live-Header (Theme-Update?) → SCHARF=1 erneut")
    elif aktualisiert(inhalt) is not None:
        b.append("Markup veraltet (z. B. ohne Liechtenstein) → SCHARF=1 erneut")
    li = tarif_li()
    if li != [LI_VERSAND_CHF]:
        b.append(f"Liechtenstein-Tarif {li} ≠ Markup {LI_VERSAND_CHF}")
    if std != VERSAND_CHF:
        b.append(f"Standardversand {std} ≠ Markup {VERSAND_CHF}")
    if gratis is None or abs(gratis - GRATIS_AB_CHF) > 0.005:
        b.append(f"Gratis-Schwelle Tarif {gratis} ≠ Markup {GRATIS_AB_CHF}")
    if b:
        print("⚠️ GOOGLE-ORG-RICHTLINIEN: " + " · ".join(b)); return 1
    print(f"GOOGLE-ORG-RICHTLINIEN ✓: Rückgabe {RUECKGABE_TAGE} T CH+LI · Versand CHF {std:.2f} / gratis ab {gratis:.2f} · LI {LI_VERSAND_CHF:.2f} = Tarif")
    return 0


def einfuegen():
    try:
        theme = wg.live_theme()
    except RuntimeError as e:
        print(f"FEHLER: Live-Theme nicht ermittelbar ({str(e)[:120]}) — nichts geschrieben"); return 1
    role, alt = datei(theme)
    if role != "MAIN":
        print(f"Theme {theme} nicht MAIN ({role}) — nichts geschrieben"); return 1
    if MARKE in alt:
        neu = aktualisiert(alt)
        if neu is None:
            print("schon drin (aktuell)"); return 0
    elif alt.count(ANKER) != 1:
        print(f"ANKER {alt.count(ANKER)}× (erwartet 1) — Header geändert, nicht blind einfügen"); return 2
    else:
        neu = neu_aus(alt)
    json.loads("{" + markup() + "}")   # gültiges JSON
    if os.environ.get("SCHARF") != "1":
        print(f"TROCKEN: {DATEI} {len(alt)} → {len(neu)} Zeichen\n{markup()[:300]}…"); return 0
    pfad = f"/tmp/header.vor-org-richtlinien.{int(time.time())}.liquid"
    open(pfad, "w").write(alt)
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){"
            "upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": theme, "files": [{"filename": DATEI, "body": {"type": "TEXT", "value": neu}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        print("FEHLER", r["userErrors"], "· Sicherung", pfad); return 1
    for _ in range(8):
        time.sleep(4)
        if datei(theme)[1] == neu:
            print(f"EINGEFÜGT + ZURÜCKGELESEN · Sicherung {pfad}"); return 0
    print("RÜCKLESEN FEHLT · Sicherung", pfad); return 1


def selbsttest():
    """Ohne Netz: Markup gültig und aus GRATIS_AB_CH, Einfügen/Aktualisieren rein, Import ohne Abfrage, ein gid()-Aufruf je Lauf."""
    import contextlib
    import io
    import main_theme
    f, n = [], 0

    def pruefe(ok, was):
        nonlocal n
        n += 1
        if not ok:
            f.append(was)

    m = json.loads("{" + markup() + "}")
    bed = m["hasShippingService"][0]["shippingConditions"]
    pruefe(GRATIS_AB_CHF == 50.0 and bed[1]["orderValue"]["minValue"] == 50.0 and abs(bed[0]["orderValue"]["maxValue"] - 49.99) < 1e-9,
           f"Gratis-Schwelle im Markup ≠ 50 ({bed[1]['orderValue']})")
    pruefe(m["hasShippingService"][1]["shippingConditions"][0]["shippingRate"]["value"] == LI_VERSAND_CHF, "LI-Tarif fehlt")
    probe = "<script>{\n" + ANKER + "\n"
    neu = neu_aus(probe)
    pruefe(MARKE in neu and aktualisiert(neu) is None, "neu_aus/aktualisiert nicht stimmig")
    alt_zeile = neu.replace(markup(), markup().replace('"LI"', '"XX"'))
    pruefe(aktualisiert(alt_zeile) == neu, "veraltete Markup-Zeile wird nicht ersetzt")
    nur_format = neu.replace('"minValue": 50.0}', '"minValue": 50}')
    pruefe(nur_format != neu and aktualisiert(nur_format) is None, "reiner Zahlformat-Unterschied (50 / 50.0) gilt als veraltet")
    ok, meld = main_theme.import_ohne_netz("google_org_richtlinien", pfad=os.path.dirname(os.path.abspath(__file__)) + os.pathsep + main_theme.HIER)
    pruefe(ok, f"Import fragt ab: {meld}")
    g = globals()
    alt_gid, alt_datei, alt_tarif, alt_li, zaehler, gelesen = main_theme.gid, g["datei"], wg.tarif, g["tarif_li"], [], []
    main_theme.gid = lambda *a, **k: zaehler.append(1) or "gid://shopify/OnlineStoreTheme/9"
    g["datei"] = lambda theme: gelesen.append(theme) or ("MAIN", neu)
    wg.tarif, g["tarif_li"] = (lambda: (VERSAND_CHF, GRATIS_AB_CHF)), (lambda: [LI_VERSAND_CHF])
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            rc = pruefen()
    finally:
        main_theme.gid, g["datei"], wg.tarif, g["tarif_li"] = alt_gid, alt_datei, alt_tarif, alt_li
    pruefe(rc == 0 and len(zaehler) == 1 and gelesen == ["gid://shopify/OnlineStoreTheme/9"], f"Lauf: gid() {len(zaehler)}×, gelesen {gelesen}, rc {rc}")
    # pruefen()/einfuegen() OHNE Netz gegen ein Attrappen-Theme: Aufseher-Vertrag (letzte Zeile; nur «Markup fehlt» repariert) und
    # MAIN-Wache vor dem Schreiben. SCHARF ist hier immer aus.
    import theme_attrappe as ta
    reiz = ta.reiz("google_org_richtlinien.py")
    pruefe(reiz == "Markup fehlt", f"Aufseher-Reizwort {reiz!r} ≠ «Markup fehlt» (fixer_keepalive.sh)")
    T = "gid://shopify/OnlineStoreTheme/0"

    def fall(fn, kopf=neu, role="MAIN", tarif_=(VERSAND_CHF, GRATIS_AB_CHF), li=(LI_VERSAND_CHF,), ohne_theme=False):
        att = ta.Attrappe({DATEI: kopf}, role)

        def lt():
            if ohne_theme:
                raise RuntimeError("Attrappe: kein eindeutiges MAIN-Theme")
            return T
        scharf = os.environ.pop("SCHARF", None)
        try:
            with ta.ohne_netz(), ta.ersetzt((g, "gql", att.gql), (wg, "live_theme", lt), (wg, "tarif", lambda: tarif_),
                                            (g, "tarif_li", lambda: list(li))):
                rc, letzte, aus = ta.lauf(fn)
        finally:
            if scharf is not None:
                os.environ["SCHARF"] = scharf
        return rc, letzte, aus, att

    veraltet = neu.replace(markup(), markup().replace('"minValue": 50.0}', '"minValue": 45.0}'))
    for name, kw, soll, stueck in (
            ("Soll-Stand", {}, "STILL", "GOOGLE-ORG-RICHTLINIEN ✓"),
            ("Markup weg (Theme-Update)", {"kopf": probe}, "REPARATUR", "Markup fehlt"),
            ("Markup veraltet (Schwelle 45)", {"kopf": veraltet}, "MELDEN", "veraltet"),
            ("Theme nicht MAIN", {"role": "UNPUBLISHED"}, "MELDEN", "nicht MAIN"),
            ("Live-Theme nicht ermittelbar", {"ohne_theme": True}, "MELDEN", "nicht ermittelbar"),
            ("LI-Tarif 9.90", {"li": (9.9,)}, "MELDEN", "Liechtenstein-Tarif"),
            ("Versand CHF 9", {"tarif_": (9.0, GRATIS_AB_CHF)}, "MELDEN", "Standardversand"),
            ("Gratis-Schwelle Tarif 45", {"tarif_": (VERSAND_CHF, 45.0)}, "MELDEN", "Gratis-Schwelle")):
        rc, letzte, _, att = fall(pruefen, **kw)
        ist = ta.aufseher(letzte, reiz)
        ok = (ist == soll and stueck in letzte and (rc == 0) == (soll == "STILL") and not att.schreibversuche and set(att.themes) <= {T}
              and (att.abfragen == 0 if kw.get("ohne_theme") else att.themes))
        pruefe(ok, f"pruefen «{name}»: {ist} (soll {soll}), rc {rc}, «{letzte[:150]}»")
    for name, kw, soll_rc, stueck, trocken in (
            ("nicht MAIN, Markup weg", {"kopf": probe, "role": "UNPUBLISHED"}, 1, "nicht MAIN", False),
            ("Live-Theme nicht ermittelbar", {"kopf": probe, "ohne_theme": True}, 1, "nichts geschrieben", False),
            ("Soll-Stand", {}, 0, "schon drin", False),
            ("Anker fehlt", {"kopf": "<script>{}</script>"}, 2, "nicht blind", False),
            ("MAIN, Markup weg (Trockenlauf)", {"kopf": probe}, 0, "TROCKEN", True),
            ("MAIN, Markup veraltet (Trockenlauf)", {"kopf": veraltet}, 0, "TROCKEN", True)):
        rc, letzte, aus, att = fall(einfuegen, **kw)
        ok = (rc == soll_rc and stueck in aus and ("TROCKEN" in aus) == trocken and not att.schreibversuche and set(att.themes) <= {T}
              and (att.abfragen == 0 if kw.get("ohne_theme") else att.themes == [T]))
        pruefe(ok, f"einfuegen «{name}»: rc {rc} (soll {soll_rc}), «{letzte[:150]}», Abfragen {att.abfragen}")
    print(f"SELBSTTEST google_org_richtlinien: {'OK' if not f else 'FEHLER'} ({n - len(f)}/{n})" + ("" if not f else " — " + " · ".join(f)))
    return 1 if f else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(pruefen() if "--pruefen" in sys.argv else einfuegen())
