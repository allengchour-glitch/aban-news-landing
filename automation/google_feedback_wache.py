#!/usr/bin/env python3
"""google_feedback_wache.py — liest täglich die Google-Diagnosen, die die App «Google & YouTube» als
`product.feedback` an jedes Produkt schreibt, und zählt die Blocker für die GRATIS-EINTRÄGE (Free Listings —
der einzige Kanal mit Verkäufen, gemessen 14.09./22.09.). Task #100, gebaut 23.09.2026.

GEMESSEN 22.09. (Vollscan 51'326 aktive): 21'485 Meldungen, davon 21'180 «Over capacity for Shopping ads (in CSS
program) in [Shopping_ads] [CH]» — betrifft NUR Shopping Ads (bezahlte Anzeigen, die wir nicht schalten) und ist
kein Blocker für Gratis-Einträge. Der Rest sind die echten Blocker: 371 «Product page unavailable», 26 «Image too
small», 18 «Unable to show image», 7 «Promotional overlay», 3 «Guns and Parts». Bis heute gab es dafür keinen
Wächter — der Vollscan war eine Handmessung.

REGEL: Eine Meldung mit «[Shopping_ads]» im Text zählt nicht (nur Anzeigen). Alles andere («[]» = alle Ziele) ist
ein Free-Listings-Blocker. Je Klasse werden Handles gesammelt (bis HANDLES_MAX), für «Product page unavailable»
zusätzlich gemessen, wie viele davon KEINE onlineStoreUrl haben (= nicht im Onlineshop publiziert, aber im
Google-Kanal → Google sieht eine 404; das ist die Reparatur-Kandidatin für einen späteren Fixer).

Abfrage: products(first:250, query:"status:active") { feedback{details{app{title} messages{message}}} } —
GEMESSEN 23.09.: 47 Punkte je 250 Produkte, ~206 Seiten für 51k aktive; Eimer-Etikette nach jeder Antwort.
Schreibt NUR am Ende (Teil-Läufe hinterlassen keinen halben Stand). Stand: dropship/_google_feedback_stand.json,
Bericht: dropship/GOOGLE-FEEDBACK.md. Ampel-Zeile «GOOGLE: N Blocker · M warten bei Google …» liest den Stand.

13.10.2026 «WARTET BEI GOOGLE» (Urteil B1): «Image under review» und «Title under review» sind die Prüf-Warteschlange bei
Google, kein Fehler bei uns (GEMESSEN 12.10.: 638 + 5 der 1'082 «Blocker»). Sie zählen NICHT mehr als Blocker, sondern
getrennt als `wartet` (Handles OHNE Deckel in `handles_wartet`). «Image not processed» bleibt Blocker. Verweildauer:
dropship/_google_pruefung_seit.json {handle: seit} — je VOLLSTÄNDIGEM Scan neue Handles eintragen, verschwundene löschen
(Teil-Scan: nur eintragen). Einmal vorbefüllt mit --pruefung-vorbefuellen aus der Git-Geschichte des Stands.
Testlauf ohne den echten Stand zu berühren: GFW_STAND / GFW_BERICHT / GFW_TEIL / GFW_SEIT auf Scratch-Pfade + SEITEN_MAX.
"""
import datetime, json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eimer_etikette import nachlauf, bilanz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.environ.get("GFW_STAND") or os.path.join(ROOT, "dropship", "_google_feedback_stand.json")
BERICHT = os.environ.get("GFW_BERICHT") or os.path.join(ROOT, "dropship", "GOOGLE-FEEDBACK.md")
PRUEFUNG_SEIT = os.environ.get("GFW_SEIT") or os.path.join(ROOT, "dropship", "_google_pruefung_seit.json")
STAND_REL = "dropship/_google_feedback_stand.json"        # für die Git-Geschichte (--pruefung-vorbefuellen)
SHOP = "au3j0y-hq.myshopify.com"
TOK = (os.environ.get("SHOPIFY_ADMIN_TOKEN") or (open("/tmp/cj_shop_token.txt").read() if os.path.exists("/tmp/cj_shop_token.txt") else "")).strip()
HANDLES_MAX = int(os.environ.get("HANDLES_MAX", "300"))
SEITEN_MAX = int(os.environ.get("SEITEN_MAX", "400"))
NUR_ANZEIGEN = re.compile(r"\[Shopping_ads\]")
# 08.10.2026: «Personalized advertising: …» (personal hardships, sexual interests, legal restrictions) regelt nur das TARGETING
# personalisierter Werbung (QUELLE support.google.com/adspolicy/answer/143465: «unable to use advertiser-curated audiences») —
# Gratis-Einträge nutzen keine Zielgruppen; schon am 08.08. im CJ-Import-Log: «Google verbietet Remarketing auf Schwangerschaft».
# GEMESSEN 07.10.: 291 der 1'114 gemeldeten «Blocker» waren solche Meldungen (Umstandsmode, Stillkissen, Orthesen, Strumpfhosen).
# Sie werden getrennt ausgewiesen, nicht als Free-Listings-Blocker gezählt. «Restricted adult content» bleibt ein Blocker.
NUR_PERSONALISIERT = re.compile(r"^\s*Personalized advertising:", re.I)
# 08.10. GEMESSEN (863 Produkte): «Image under review», «Inappropriate image», «Restricted adult content» u. a. tragen die
# Zielliste «[]», nur «Product page unavailable», «Promotional overlay», «Image too small» nennen [Free_listings,Shopping_ads].
# Bedeutung unbelegt → nur zählen (Spalte im Bericht), nicht umdeuten.
ZIEL_LEER = re.compile(r" in \[\]")
TEIL = os.environ.get("GFW_TEIL") or "/tmp/google_feedback_teil.json"   # Zwischenstand je Seite (überlebt Neustarts in /tmp)
# 13.10.2026 (Urteil B1): Prüf-Warteschlange bei Google — kein Fehler bei uns, kein Blocker. «Image not processed» bleibt Blocker.
WARTET = {"Image under review", "Title under review"}
WARTET_TAGE = 14                                        # Verweildauer, ab der die Ampel «n > 14 T» zählt
TEIL_MAX_H = float(os.environ.get("TEIL_MAX_H", "8"))


def gql(q, v=None):
    grund = "kein Versuch"
    drossel = 0
    for versuch in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "90", f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "--data-binary", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            grund = "kein JSON"; time.sleep(5); continue
        if d.get("data") is not None:
            nachlauf(d)
            return d
        grund = str(d.get("errors") or d)[:300]
        if "THROTTLED" in grund.upper():
            drossel += 1; time.sleep(min(30, 6 * drossel)); continue
        time.sleep(5)
    raise RuntimeError("Shopify hat auf keinen Versuch mit Daten geantwortet — kein Stand geschrieben. Letzter Grund: " + grund)


def klasse(msg):
    """Meldungstext ohne die Ziel-/Land-Klammern → Klassenname."""
    return re.sub(r"\s+in$", "", re.sub(r"\s*\[[^\]]*\]", "", msg).strip().rstrip(".")).strip()


LAENDER = re.compile(r"\[((?:[A-Z]{2})(?:\s*,\s*[A-Z]{2})*)\]\.?\s*$")


def laender(txt):
    """Länderkürzel am Ende der Meldung («… [Free_listings,Shopping_ads] [LI].») → {'LI'} ; ohne Angabe → leer."""
    m = LAENDER.search(txt or "")
    return {x.strip() for x in m.group(1).split(",")} if m else set()


def trifft_ch(txt):
    """02.10.2026: 1'771 «Missing shipping info … [LI]» liessen die Ampel von 723 auf 2'568 springen — der Shop lieferte damals
    nur in die Schweiz. Eine Meldung nur für andere Länder blockiert die Schweizer Gratis-Einträge NICHT → eigene Liste
    «nur Ausland», nicht in den Blockern. Ohne Länderangabe zählt sie (vorsichtig) mit.
    12.10.2026: Seit 09.10. ist Liechtenstein wieder Lieferland (Markt «Switzerland» = CH + LI). Die Blocker-Zahl bleibt die
    Schweizer Zahl; Meldungen für ein ANDERES Lieferland trennt teile_ausland() ab und weist sie eigens aus."""
    l = laender(txt)
    return not l or "CH" in l


def lieferlaender():
    """Lieferländer GEMESSEN aus Shopify Markets (aktive Märkte, Länder-Regionen) — nie aus einer Notiz.
    ANLASS 12.10.2026: Der Bericht schrieb «Shop liefert nur CH» (Stand 22.09.) und riet, Liechtenstein im Merchant Center
    zu entfernen — seit 09.10. ist LI aber Lieferland. 28'226 Produkte trugen «Missing shipping info … [LI]».
    → set der Ländercodes, None wenn nicht messbar (dann bleibt alles «nur Ausland» wie bisher)."""
    try:
        d = gql("{ markets(first:50){ nodes{ status conditions{ regionsCondition{ regions(first:250){ nodes{ "
                "... on MarketRegionCountry{ code } } } } } } } }")
        out = set()
        for m in d["data"]["markets"]["nodes"]:
            if m.get("status") != "ACTIVE":
                continue
            for r in ((((m.get("conditions") or {}).get("regionsCondition") or {}).get("regions") or {}).get("nodes") or []):
                if r.get("code"):
                    out.add(r["code"])
        return out or None
    except Exception:
        return None


def teile_ausland(nur_ausland, liefer):
    """«nur Ausland» (Schlüssel «Klasse [LI]») trennen: → (Lieferland ohne CH, Rest). Ohne gemessene Lieferländer: ({}, alles)."""
    andere_liefer = set(liefer or ()) - {"CH"}
    lief, rest = {}, {}
    for k, v in (nur_ausland or {}).items():
        m = re.search(r"\[([A-Z, ]+)\]\s*$", k)
        cc = {x.strip() for x in m.group(1).split(",")} if m else set()
        (lief if cc & andere_liefer else rest)[k] = v
    return lief, rest


def einordnen(txt):
    """Meldung der App «Google & YouTube» → 'anzeigen' | 'ausland' | 'personalisiert' | 'wartet' | 'blocker'.
    Reihenfolge = Zählschleife in main(): nur Anzeigen → anderes Land → nur personalisierte Werbung → Prüfung bei Google
    (13.10., WARTET) → Free-Listings-Blocker."""
    if NUR_ANZEIGEN.search(txt):
        return "anzeigen"
    if not trifft_ch(txt):
        return "ausland"
    if NUR_PERSONALISIERT.search(txt):
        return "personalisiert"
    if klasse(txt) in WARTET:
        return "wartet"
    return "blocker"


def seit_neu(alt, jetzt, heute, vollstaendig):
    """Verweildauer-Ledger fortschreiben (rein, ohne Datei): neue Handles bekommen `heute`, vorhandene behalten ihr Datum.
    Nur ein VOLLSTÄNDIGER Scan darf verschwundene Handles löschen (ein Teil-Scan hat sie vielleicht nur nicht erreicht)."""
    if vollstaendig:
        return {h: alt.get(h, heute) for h in sorted(jetzt)}
    neu = dict(alt)
    for h in jetzt:
        neu.setdefault(h, heute)
    return dict(sorted(neu.items()))


def seit_lesen():
    try:
        return json.load(open(PRUEFUNG_SEIT, encoding="utf-8"))
    except Exception:
        return {}


def seit_schreiben(seit):
    tmp = PRUEFUNG_SEIT + ".neu"
    json.dump(seit, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    os.replace(tmp, PRUEFUNG_SEIT)


def wartet_zusammenfassung(seit, handles, heute):
    """(Anzahl mit Verweildauer > WARTET_TAGE, ältestes Datum oder None) über die gegebenen Handles."""
    h0 = datetime.date.fromisoformat(heute)
    ds = [seit[h] for h in set(handles) if h in seit]
    ueber = sum(1 for d in ds if (h0 - datetime.date.fromisoformat(d)).days > WARTET_TAGE)
    return ueber, (min(ds) if ds else None)


def wartet_felder(stand, seit, heute):
    """Zusammenfassung in den Stand schreiben (Ampel + Bericht lesen sie, kein zweiter Rechenweg)."""
    hs = [h for v in (stand.get("handles_wartet") or {}).values() for h in v]
    ueber, aeltestes = wartet_zusammenfassung(seit, hs, heute)
    stand["wartet_summe"] = sum((stand.get("wartet") or {}).values())
    stand["wartet_ueber_tage"] = WARTET_TAGE
    stand["wartet_ueber"] = ueber
    stand["wartet_aeltestes"] = aeltestes
    return stand


def pruefung_vorbefuellen():
    """Einmalig (13.10.2026, Urteil B1): Ledger aus der Git-Geschichte des Stands vorbefüllen. Je Handle zählt der Beginn der
    LAUFENDEN Prüfung: fehlt der Handle in einer Fassung, deren Liste VOLLSTÄNDIG ist (Zahl == Länge, kein HANDLES_MAX-Deckel),
    ist er nachweislich verschwunden → ein späteres Wiederauftauchen beginnt neu. Fehlt er nur in einer gedeckelten Liste,
    bleibt das alte Datum (unbekannt ≠ verschwunden). Zusätzlich gemeldet: frühestes Datum überhaupt (Vergleichszahl)."""
    r = subprocess.run(["git", "-C", ROOT, "log", "--format=%H", "--", STAND_REL], capture_output=True, text=True)
    fassungen = []
    for c in r.stdout.split():
        g = subprocess.run(["git", "-C", ROOT, "show", f"{c}:{STAND_REL}"], capture_output=True, text=True)
        try:
            fassungen.append(json.loads(g.stdout))
        except Exception:
            continue
    try:
        fassungen.append(json.load(open(STAND, encoding="utf-8")))          # Arbeitsstand (evtl. noch nicht committet)
    except Exception:
        pass
    lauf, frueh = {}, {}
    for s in sorted(fassungen, key=lambda s: s.get("stand", "")):
        datum = (s.get("stand") or "")[:10]
        if not datum:
            continue
        da, komplett = set(), True
        for k in WARTET:
            lst = list((s.get("handles_wartet") or {}).get(k) or []) or list((s.get("handles") or {}).get(k) or [])
            zahl = (s.get("wartet") or {}).get(k, (s.get("klassen") or {}).get(k, 0)) or 0
            da |= set(lst)
            if len(set(lst)) < zahl:
                komplett = False
        for h in da:
            lauf.setdefault(h, datum)
            frueh[h] = min(frueh.get(h, datum), datum)
        if komplett:
            for h in [h for h in lauf if h not in da]:
                del lauf[h]
    alt = seit_lesen()
    neu = dict(alt)
    for h, d in lauf.items():
        neu[h] = min(alt.get(h, d), d)
    seit_schreiben(dict(sorted(neu.items())))
    vor = sum(1 for d in neu.values() if d < datetime.date.today().isoformat())
    print(f"VORBEFÜLLT: {len(neu)} Handles ({len(fassungen)} Fassungen; laufende Prüfung {len(lauf)}, je gesehen {len(frueh)}; "
          f"{vor} mit Datum vor heute; ältestes {min(neu.values()) if neu else '–'}) → {PRUEFUNG_SEIT}")


def bericht_schreiben(stand):
    """Bericht aus dem Stand — auch für Umrechnungen ohne Neuscan (--umrechnen)."""
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Google-Diagnosen (product.feedback der App «Google & YouTube») — Stand {stand['stand']}\n\n")
        f.write(f"Gescannt: {stand['gescannt']} aktive Produkte in {stand['seiten']} Seiten ({'vollständig' if stand['vollstaendig'] else '⚠️ DECKEL erreicht'}), "
                f"{stand['dauer_s']} s. Meldungen nur für Shopping Ads (ignoriert): {stand['anzeigen_meldungen']}.\n\n")
        f.write(f"## Free-Listings-Blocker: {stand['blocker']}\n\n| Klasse | Produkte | davon ohne onlineStoreUrl | davon Ziel «[]» |\n|---|---:|---:|---:|\n")
        for k, v in stand["klassen"].items():
            f.write(f"| {k} | {v} | {stand['ohne_onlineStoreUrl'].get(k, 0)} | {(stand.get('ziel_leer') or {}).get(k, '–')} |\n")
        if stand.get("wartet"):
            aelt = stand.get("wartet_aeltestes")
            f.write(f"\n## Wartet bei Google (Prüfung, kein Fehler bei uns): {stand.get('wartet_summe', sum(stand['wartet'].values()))}\n\n"
                    + "\n".join(f"- {k}: {v}" for k, v in stand["wartet"].items())
                    + f"\n\nVerweildauer (dropship/_google_pruefung_seit.json): {stand.get('wartet_ueber', '–')} länger als "
                      f"{stand.get('wartet_ueber_tage', WARTET_TAGE)} Tage, ältestes seit {aelt or '–'}"
                    + (" — ⚠️ Handle-Liste gedeckelt (umgerechneter Altstand), Zahl unvollständig" if stand.get("wartet_gedeckelt") else "")
                    + ".\nNicht reagieren, solange die Verweildauer kurz ist: Google prüft. Wer hier ein Bild tauscht, setzt die Prüfung neu.\n")
        f.write("\nZiel «[]» = die App nennt kein betroffenes Ziel («… in [] [CH]» statt «in [Free_listings,Shopping_ads]»). "
                "Was das bei Google heisst, ist UNBELEGT (keine Doku gefunden, 08.10.) — Wahrheit = Status im Merchant Center.\n")
        liefer = stand.get("lieferlaender")
        lief, rest = teile_ausland(stand.get("nur_ausland"), liefer)
        if lief:
            f.write(f"\n## Weiteres Lieferland betroffen (Lieferländer gemessen in Shopify Markets: {', '.join(liefer)})\n\n"
                    "Blockiert die Schweiz NICHT, aber die Gratis-Einträge in diesem Lieferland.\n\n"
                    + "\n".join(f"- {k}: {v}" for k, v in lief.items())
                    + "\n\n«Missing shipping info … [LI]»: In Shopify gibt es den Tarif (General profile, Zone «Liechtenstein» "
                      "CHF 14.90, seit 09.10.), Google hat ihn nicht übernommen. Abhilfe (Betreiber, UNBELEGT welcher Klick "
                      "reicht): App «Google & YouTube» → Einstellungen → Versand neu importieren, sonst im Merchant Center "
                      "einen Versandservice für Liechtenstein (CHF 14.90) anlegen. NICHT das Land entfernen — LI ist Lieferland. "
                      "Wirkung = diese Zahl beim nächsten Scan.\n")
        if rest:
            f.write("\n## Nur andere Länder (kein Lieferland — blockiert keinen Verkauf)\n\n"
                    + "\n".join(f"- {k}: {v}" for k, v in rest.items())
                    + "\n\nAbhilfe (Betreiber, optional): im Google Merchant Center unter Zielländer/Versand das Land entfernen.\n")
        if stand.get('nur_personalisiert'):
            f.write("\n## Nur personalisierte Werbung (blockiert Gratis-Einträge NICHT — Targeting-Regel, siehe Kopf)\n\n"
                    + "\n".join(f"- {k}: {v}" for k, v in stand["nur_personalisiert"].items()) + "\n")
        if stand.get('andere_apps'):
            f.write("\n## Meldungen anderer Kanal-Apps (kein Google-Blocker)\n\n" + "\n".join(f"- {k}: {v}" for k, v in stand["andere_apps"].items()) + "\n")
        f.write("\n«ohne onlineStoreUrl» = nicht im Onlineshop publiziert, aber im Google-Kanal — Google sieht eine 404. "
                "Reparatur: Onlineshop-Publikation nachziehen oder aus dem Google-Kanal nehmen (Fixer folgt).\n\n")
        for k, hs in stand['handles'].items():
            f.write(f"### {k} ({stand['klassen'][k]})\n\n" + "\n".join(f"- {h}" for h in hs[:60]) + ("\n- …" if stand['klassen'][k] > 60 else "") + "\n\n")
        seit = seit_lesen()
        for k, hs in (stand.get("handles_wartet") or {}).items():
            alt_zuerst = sorted(set(hs), key=lambda h: (seit.get(h, "9999"), h))
            f.write(f"### wartet: {k} ({(stand.get('wartet') or {}).get(k, len(hs))}) — die ältesten zuerst\n\n"
                    + "\n".join(f"- {h} (seit {seit.get(h, '?')})" for h in alt_zuerst[:40]) + ("\n- …" if len(alt_zuerst) > 40 else "") + "\n\n")


def main():
    if "--kanarienvogel" in sys.argv:
        faelle = [("Missing shipping info in some countries in [Free_listings,Shopping_ads] [LI].", False),
                  ("Inappropriate image in [Free_listings,Shopping_ads] [CH].", True),
                  ("Product page unavailable in [Free_listings] [CH, LI].", True),
                  ("Image too small", True)]
        ok = sum(trifft_ch(t) == soll for t, soll in faelle)
        for t, soll in faelle:
            print(f"{'✓' if trifft_ch(t) == soll else '✗'} {t} → {trifft_ch(t)}")
        aus = {"Missing shipping info in some countries [LI]": 5, "Alcoholic beverages [LI]": 1, "Missing shipping info [DE]": 3}
        teil = [(teile_ausland(aus, {"CH", "LI"}), ({"Missing shipping info in some countries [LI]": 5, "Alcoholic beverages [LI]": 1},
                                                   {"Missing shipping info [DE]": 3})),
                (teile_ausland(aus, {"CH"}), ({}, aus)),
                (teile_ausland(aus, None), ({}, aus))]          # nicht messbar → wie bisher alles «nur Ausland»
        for i, (ist, soll) in enumerate(teil):
            print(f"{'✓' if ist == soll else '✗'} teile_ausland Fall {i + 1} → Lieferland {list(ist[0])}")
        ok += sum(ist == soll for ist, soll in teil)
        faelle = faelle + teil
        pers = [("Personalized advertising: Sexual interests in [Free_listings,Shopping_ads] [CH].", True),
                ("Personalized advertising: personal hardships in [Free_listings] [CH].", True),
                ("Restricted adult content in [Free_listings,Shopping_ads] [CH].", False),   # bleibt Blocker
                ("Adult-oriented content in [Free_listings] [CH].", False)]
        ok += sum(bool(NUR_PERSONALISIERT.search(t)) == soll for t, soll in pers)
        for t, soll in pers:
            print(f"{'✓' if bool(NUR_PERSONALISIERT.search(t)) == soll else '✗'} nur-personalisiert {t} → {bool(NUR_PERSONALISIERT.search(t))}")
        wart = [("Image under review in [] [CH,LI].", "wartet"),
                ("Title under review in [] [CH].", "wartet"),
                ("Image not processed in [Free_listings,Shopping_ads] [CH,LI].", "blocker"),
                ("Inappropriate image in [] [CH,LI].", "blocker"),
                ("Image under review in [Shopping_ads] [CH].", "anzeigen"),
                ("Image under review in [] [LI].", "ausland")]
        ok += sum(einordnen(t) == soll for t, soll in wart)
        for t, soll in wart:
            print(f"{'✓' if einordnen(t) == soll else '✗'} einordnen {t} → {einordnen(t)} (soll {soll})")
        alt = {"a": "2026-09-20", "b": "2026-10-12"}
        led = [(seit_neu(alt, {"b", "c"}, "2026-10-13", True), {"b": "2026-10-12", "c": "2026-10-13"}),   # voll: a weg, c neu
               (seit_neu(alt, {"c"}, "2026-10-13", False), {"a": "2026-09-20", "b": "2026-10-12", "c": "2026-10-13"}),  # Teil: nichts löschen
               (wartet_zusammenfassung({"a": "2026-09-20", "b": "2026-10-12"}, ["a", "b", "x"], "2026-10-13"), (1, "2026-09-20"))]
        ok += sum(ist == soll for ist, soll in led)
        for i, (ist, soll) in enumerate(led):
            print(f"{'✓' if ist == soll else '✗'} Verweildauer Fall {i + 1} → {ist}")
        print(f"Kanarienvögel {ok}/{len(faelle) + len(pers) + len(wart) + len(led)}")
        return
    if "--pruefung-vorbefuellen" in sys.argv:
        pruefung_vorbefuellen()
        return
    if "--umrechnen" in sys.argv:          # 08.10.2026: alten Stand nach neuer Regel umrechnen, ohne 35-min-Neuscan
        st = json.load(open(STAND, encoding="utf-8"))
        np_ = st.setdefault("nur_personalisiert", {})
        for k in [k for k in st["klassen"] if NUR_PERSONALISIERT.search(k)]:
            np_[k] = np_.get(k, 0) + st["klassen"].pop(k)
            st.setdefault("handles_personalisiert", {})[k] = st["handles"].pop(k, [])
            st["ohne_onlineStoreUrl"].pop(k, None)
        st["nur_personalisiert"] = dict(sorted(np_.items(), key=lambda x: -x[1]))
        wt = st.setdefault("wartet", {})                 # 13.10.2026 (B1): Prüf-Warteschlange aus den Blockern umbuchen
        hw = st.setdefault("handles_wartet", {})
        for k in [k for k in st["klassen"] if k in WARTET]:
            wt[k] = wt.get(k, 0) + st["klassen"].pop(k)
            hw[k] = list(dict.fromkeys(hw.get(k, []) + st["handles"].pop(k, [])))
            st["ohne_onlineStoreUrl"].pop(k, None)
            (st.get("ziel_leer") or {}).pop(k, None)
            st["wartet_gedeckelt"] = True                # Altstand: Handle-Liste trug HANDLES_MAX — Verweildauer nur Teilmenge
        st["wartet"] = dict(sorted(wt.items(), key=lambda x: -x[1]))
        heute = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        if hw:
            seit = seit_neu(seit_lesen(), {h for v in hw.values() for h in v}, heute, False)   # nur ergänzen, nie löschen
            seit_schreiben(seit)
            wartet_felder(st, seit, heute)
        st["blocker"] = sum(st["klassen"].values())
        ll = lieferlaender() if TOK else None
        if ll:
            st["lieferlaender"] = sorted(ll)
        json.dump(st, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        bericht_schreiben(st)
        print(f"UMGERECHNET: {st['blocker']} Free-Listings-Blocker · {sum(st.get('wartet', {}).values())} warten bei Google · "
              f"nur personalisiert {sum(st['nur_personalisiert'].values())}")
        return
    if not TOK:
        print("kein Shop-Token → No-op"); return
    cursor, seiten, gescannt = None, 0, 0
    klassen, handles, ohne_url, andere, ausland, personal, handles_pers, ziel_leer = {}, {}, {}, {}, {}, {}, {}, {}
    wartet, handles_wartet = {}, {}
    anzeigen_meldungen = 0
    t0 = time.time()
    # 03.10.2026 FORTSETZEN: Der Vollscan (~206 Seiten, Eimer-Wartezeiten) braucht länger als eine Stunde; der Container
    # startet etwa stündlich neu. Heute wurde der Lauf um 07:11, 08:09 und 08:31 gestartet und jedes Mal abgebrochen
    # (Stand blieb auf 02.10. 13:26). Nach jeder Seite wird der Zwischenstand gesichert; ein neuer Start
    # setzt dort fort, wenn der Teilstand jünger als TEIL_MAX_H ist.
    teil_alt = None
    try:
        if time.time() - os.path.getmtime(TEIL) < TEIL_MAX_H * 3600:
            teil_alt = json.load(open(TEIL, encoding="utf-8"))
    except Exception:
        teil_alt = None
    if teil_alt:
        cursor, seiten, gescannt = teil_alt["cursor"], teil_alt["seiten"], teil_alt["gescannt"]
        klassen, handles, ohne_url = teil_alt["klassen"], teil_alt["handles"], teil_alt["ohne_url"]
        andere, ausland, anzeigen_meldungen = teil_alt["andere"], teil_alt["ausland"], teil_alt["anzeigen"]
        personal, handles_pers = teil_alt.get("personal", {}), teil_alt.get("handles_pers", {})
        ziel_leer = teil_alt.get("ziel_leer", {})
        wartet, handles_wartet = teil_alt.get("wartet", {}), teil_alt.get("handles_wartet", {})
        t0 -= teil_alt.get("dauer_s", 0)
        print(f"FORTSETZEN ab Seite {seiten} ({gescannt} gescannt)", flush=True)
    while True:
        d = gql("query($c:String){ products(first:250, after:$c, query:\"status:active\"){ pageInfo{hasNextPage endCursor} "
                "nodes{ handle onlineStoreUrl feedback{ details{ app{title} messages{ message } } } } } }", {"c": cursor})
        pg = d["data"]["products"]; seiten += 1
        for n in pg["nodes"]:
            gescannt += 1
            for det in ((n.get("feedback") or {}).get("details") or []):
                app = ((det.get("app") or {}).get("title") or "?")
                for m in det.get("messages") or []:
                    txt = m.get("message") or ""
                    # 23.09.: product.feedback traegt die Diagnosen ALLER Kanal-Apps. Der erste Lauf zaehlte 33'863
                    # «Dieses Produkt ist in Shop nicht auffindbar» als Google-Blocker — das ist die App «Shop»
                    # (Shop-Kanal), nicht «Google & YouTube». Fremde Apps werden getrennt gezaehlt.
                    if app != "Google & YouTube":
                        k = f"[{app}] " + klasse(txt)
                        andere[k] = andere.get(k, 0) + 1
                        continue
                    art = einordnen(txt)
                    if art == "anzeigen":
                        anzeigen_meldungen += 1; continue
                    k = klasse(txt)
                    if art == "ausland":
                        ka = f"{k} [{','.join(sorted(laender(txt)))}]"
                        ausland[ka] = ausland.get(ka, 0) + 1
                        continue
                    if art == "personalisiert":
                        personal[k] = personal.get(k, 0) + 1
                        hp = handles_pers.setdefault(k, [])
                        if len(hp) < HANDLES_MAX:
                            hp.append(n["handle"])
                        continue
                    if art == "wartet":             # 13.10.2026 (B1): Prüfung bei Google — Handles OHNE Deckel
                        wartet[k] = wartet.get(k, 0) + 1
                        hw = handles_wartet.setdefault(k, [])
                        if not hw or hw[-1] != n["handle"]:
                            hw.append(n["handle"])
                        continue
                    klassen[k] = klassen.get(k, 0) + 1
                    if ZIEL_LEER.search(txt):
                        ziel_leer[k] = ziel_leer.get(k, 0) + 1
                    h = handles.setdefault(k, [])
                    if len(h) < HANDLES_MAX:
                        h.append(n["handle"])
                    if not n.get("onlineStoreUrl"):
                        ohne_url[k] = ohne_url.get(k, 0) + 1
        if not pg["pageInfo"]["hasNextPage"] or seiten >= SEITEN_MAX:
            break
        cursor = pg["pageInfo"]["endCursor"]
        tmp = TEIL + ".neu"
        json.dump({"cursor": cursor, "seiten": seiten, "gescannt": gescannt, "klassen": klassen, "handles": handles,
                   "ohne_url": ohne_url, "andere": andere, "ausland": ausland, "anzeigen": anzeigen_meldungen, "personal": personal, "handles_pers": handles_pers, "ziel_leer": ziel_leer,
                   "wartet": wartet, "handles_wartet": handles_wartet,
                   "dauer_s": round(time.time() - t0)}, open(tmp, "w", encoding="utf-8"), ensure_ascii=False)
        os.replace(tmp, TEIL)
    voll = seiten < SEITEN_MAX
    blocker = sum(klassen.values())
    stand = {"stand": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "gescannt": gescannt, "seiten": seiten,
             "vollstaendig": voll, "blocker": blocker, "klassen": dict(sorted(klassen.items(), key=lambda x: -x[1])),
             "ohne_onlineStoreUrl": ohne_url, "anzeigen_meldungen": anzeigen_meldungen, "handles": handles,
             "andere_apps": dict(sorted(andere.items(), key=lambda x: -x[1])),
             "nur_ausland": dict(sorted(ausland.items(), key=lambda x: -x[1])),
             "nur_personalisiert": dict(sorted(personal.items(), key=lambda x: -x[1])),
             "ziel_leer": ziel_leer,
             "lieferlaender": sorted(lieferlaender() or []) or None,   # gemessen (Markets), für teile_ausland()
             "handles_personalisiert": handles_pers,          # google_bildtausch_bilanz liest sie mit (Bildsignal)
             "wartet": dict(sorted(wartet.items(), key=lambda x: -x[1])),   # 13.10. (B1): Prüfung bei Google, kein Blocker
             "handles_wartet": handles_wartet,                # ohne Deckel; google_bildtausch_bilanz: Gruppe «in Prüfung»
             "dauer_s": round(time.time() - t0)}
    heute = stand["stand"][:10]
    seit = seit_neu(seit_lesen(), {h for v in handles_wartet.values() for h in v}, heute, voll)
    seit_schreiben(seit)
    wartet_felder(stand, seit, heute)
    json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    try:
        os.remove(TEIL)
    except FileNotFoundError:
        pass
    bericht_schreiben(stand)
    print(f"FERTIG: {gescannt} gescannt · {blocker} Free-Listings-Blocker (Google) · {stand['wartet_summe']} warten bei Google "
          f"({stand['wartet_ueber']} > {WARTET_TAGE} T, ältestes {stand['wartet_aeltestes'] or '–'}) · andere Apps {sum(andere.values())} · {dict(list(stand['klassen'].items())[:5])} · {bilanz()}")


if __name__ == "__main__":
    main()
