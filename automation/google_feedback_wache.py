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
Bericht: dropship/GOOGLE-FEEDBACK.md. Ampel-Zeile «GOOGLE: N Free-Listings-Blocker …» liest den Stand.
"""
import datetime, json, os, re, subprocess, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eimer_etikette import nachlauf, bilanz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(ROOT, "dropship", "_google_feedback_stand.json")
BERICHT = os.path.join(ROOT, "dropship", "GOOGLE-FEEDBACK.md")
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
TEIL = "/tmp/google_feedback_teil.json"            # Zwischenstand je Seite (überlebt Container-Neustarts in /tmp)
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
    """02.10.2026: 1'771 «Missing shipping info … [LI]» liessen die Ampel von 723 auf 2'568 springen — der Shop liefert seit
    22.09. bewusst nur in die Schweiz (Liechtenstein gestrichen). Eine Meldung nur für andere Länder blockiert die Schweizer
    Gratis-Einträge NICHT → eigene Liste «nur Ausland», nicht in den Blockern. Ohne Länderangabe zählt sie (vorsichtig) mit."""
    l = laender(txt)
    return not l or "CH" in l


def bericht_schreiben(stand):
    """Bericht aus dem Stand — auch für Umrechnungen ohne Neuscan (--umrechnen)."""
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Google-Diagnosen (product.feedback der App «Google & YouTube») — Stand {stand['stand']}\n\n")
        f.write(f"Gescannt: {stand['gescannt']} aktive Produkte in {stand['seiten']} Seiten ({'vollständig' if stand['vollstaendig'] else '⚠️ DECKEL erreicht'}), "
                f"{stand['dauer_s']} s. Meldungen nur für Shopping Ads (ignoriert): {stand['anzeigen_meldungen']}.\n\n")
        f.write(f"## Free-Listings-Blocker: {stand['blocker']}\n\n| Klasse | Produkte | davon ohne onlineStoreUrl | davon Ziel «[]» |\n|---|---:|---:|---:|\n")
        for k, v in stand["klassen"].items():
            f.write(f"| {k} | {v} | {stand['ohne_onlineStoreUrl'].get(k, 0)} | {(stand.get('ziel_leer') or {}).get(k, '–')} |\n")
        f.write("\nZiel «[]» = die App nennt kein betroffenes Ziel («… in [] [CH]» statt «in [Free_listings,Shopping_ads]»). "
                "Was das bei Google heisst, ist UNBELEGT (keine Doku gefunden, 08.10.) — Wahrheit = Status im Merchant Center.\n")
        if stand.get('nur_ausland'):
            f.write("\n## Nur andere Länder (blockiert die Schweiz NICHT — Shop liefert nur CH)\n\n"
                    + "\n".join(f"- {k}: {v}" for k, v in stand["nur_ausland"].items())
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


def main():
    if "--kanarienvogel" in sys.argv:
        faelle = [("Missing shipping info in some countries in [Free_listings,Shopping_ads] [LI].", False),
                  ("Inappropriate image in [Free_listings,Shopping_ads] [CH].", True),
                  ("Product page unavailable in [Free_listings] [CH, LI].", True),
                  ("Image too small", True)]
        ok = sum(trifft_ch(t) == soll for t, soll in faelle)
        for t, soll in faelle:
            print(f"{'✓' if trifft_ch(t) == soll else '✗'} {t} → {trifft_ch(t)}")
        pers = [("Personalized advertising: Sexual interests in [Free_listings,Shopping_ads] [CH].", True),
                ("Personalized advertising: personal hardships in [Free_listings] [CH].", True),
                ("Restricted adult content in [Free_listings,Shopping_ads] [CH].", False),   # bleibt Blocker
                ("Adult-oriented content in [Free_listings] [CH].", False)]
        ok += sum(bool(NUR_PERSONALISIERT.search(t)) == soll for t, soll in pers)
        for t, soll in pers:
            print(f"{'✓' if bool(NUR_PERSONALISIERT.search(t)) == soll else '✗'} nur-personalisiert {t} → {bool(NUR_PERSONALISIERT.search(t))}")
        print(f"Kanarienvögel {ok}/{len(faelle) + len(pers)}")
        return
    if "--umrechnen" in sys.argv:          # 08.10.2026: alten Stand nach neuer Regel umrechnen, ohne 35-min-Neuscan
        st = json.load(open(STAND, encoding="utf-8"))
        np_ = st.setdefault("nur_personalisiert", {})
        for k in [k for k in st["klassen"] if NUR_PERSONALISIERT.search(k)]:
            np_[k] = np_.get(k, 0) + st["klassen"].pop(k)
            st.setdefault("handles_personalisiert", {})[k] = st["handles"].pop(k, [])
            st["ohne_onlineStoreUrl"].pop(k, None)
        st["nur_personalisiert"] = dict(sorted(np_.items(), key=lambda x: -x[1]))
        st["blocker"] = sum(st["klassen"].values())
        json.dump(st, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        bericht_schreiben(st)
        print(f"UMGERECHNET: {st['blocker']} Free-Listings-Blocker · nur personalisiert {sum(st['nur_personalisiert'].values())}")
        return
    if not TOK:
        print("kein Shop-Token → No-op"); return
    cursor, seiten, gescannt = None, 0, 0
    klassen, handles, ohne_url, andere, ausland, personal, handles_pers, ziel_leer = {}, {}, {}, {}, {}, {}, {}, {}
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
                    if NUR_ANZEIGEN.search(txt):
                        anzeigen_meldungen += 1; continue
                    k = klasse(txt)
                    if not trifft_ch(txt):
                        ka = f"{k} [{','.join(sorted(laender(txt)))}]"
                        ausland[ka] = ausland.get(ka, 0) + 1
                        continue
                    if NUR_PERSONALISIERT.search(txt):
                        personal[k] = personal.get(k, 0) + 1
                        hp = handles_pers.setdefault(k, [])
                        if len(hp) < HANDLES_MAX:
                            hp.append(n["handle"])
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
             "handles_personalisiert": handles_pers,          # google_bildtausch_bilanz liest sie mit (Bildsignal)
             "dauer_s": round(time.time() - t0)}
    json.dump(stand, open(STAND, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    try:
        os.remove(TEIL)
    except FileNotFoundError:
        pass
    bericht_schreiben(stand)
    print(f"FERTIG: {gescannt} gescannt · {blocker} Free-Listings-Blocker (Google) · andere Apps {sum(andere.values())} · {dict(list(stand['klassen'].items())[:5])} · {bilanz()}")


if __name__ == "__main__":
    main()
