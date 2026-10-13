"""Holt ein sauberes Bild nach vorn, wenn das Hauptbild Werbetext trägt.

DER BEFUND: Eine Stichprobe über 200 Hauptbilder im Google-Kanal — das ist genau das Bild, das
Google in den Einträgen zeigt — ergab bei ZWANZIG eingebrannten Werbetext, also 10 %.
Hochgerechnet rund 2'900 Produkte: «Universal Lenkradbezug» (13 Wörter im Bild), «4-Achsen
Drohne» (13), «Tiger Power FPV Racing Drohne» (15), «Ochsenhorn-Kauholz für Hunde» (6). Damit
ist der Befund von 3'125 auffälligen Bildern aus dem früheren Fan-out bestätigt; er war nie
überprüft worden, und er stimmt.

DER SANFTE WEG. Ein Bild zu löschen wäre hier falsch: Bei vielen Produkten ist es das einzige,
und ein Produkt ohne Bild ist im Shop wertlos. Stattdessen wird die REIHENFOLGE geändert — hat
dasselbe Produkt ein textfreies Bild weiter hinten, rückt es an die erste Stelle. Nichts geht
verloren, das Textbild bleibt als Zusatzansicht erhalten (dort ist es sogar nützlich, weil es
Masse und Funktionen zeigt), und nach aussen zeigt der Shop ein sauberes Produktfoto.

⚠️ WO NICHTS SAUBERES DA IST, WIRD NICHTS GETAN. Ein Produkt, dessen sämtliche Bilder Text
tragen, bleibt unverändert und wird im Ledger vermerkt. Es umzustellen brächte nichts, es zu
draften nähme dem Shop Ware weg, für die es keinen Ersatz gibt. Das ist eine Aufgabe für eine
neue Bildquelle, nicht für diesen Lauf.

⚠️ «NICHT LESBAR» IST NICHT «SAUBER». Ein Bild, das sich nicht laden liess, wird nie nach vorn
geholt — sonst stünde am Ende womöglich ein totes Bild an erster Stelle. Dieselbe Verwechslung
hat den Bild-Backfill heute schon 548 Produkte fälschlich abhaken lassen.

⚠️ 13.10.2026 — KARTON-/MASSBILD IST KEIN ERSATZ (Kauf-Strecke Klasse 13). Beim Tunmate-Rizinusöl rückte der
KARTON mit «4.33in/11cm» an die erste Stelle: Masslinien sind Ziffern, keine Wörter, das Bild galt als «sauber».
Ein Ersatzkandidat muss jetzt bildtext_pruefen.von_url_hauptbild() bestehen: < WORTGRENZE Wörter UND keine Massangabe
(Zahl+Einheit in/inch/cm/mm/ml/oz). Das AKTUELLE Hauptbild wird weiter nur an Wörtern gemessen — eine «50 ml» auf dem
Flaschenetikett macht ein Produktfoto nicht schmutzig. Das Ledger trägt seit heute die Medien-IDs (alt → neu) als Rückweg.

Der Lauf ist lang (ein OCR je Bild) und jederzeit fortsetzbar; der Supervisor hält ihn am Leben.
DRY=1 meldet nur.
"""
import json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bildtext_pruefen import von_url, von_url_hauptbild, WORTGRENZE
try:   # 13.10.2026: Werbetest-Sperre — fehlt der Leser, wird vorsichtshalber NICHT getauscht
    from werbetest_sperre import gesperrt as _werbetest_gesperrt
except Exception:
    def _werbetest_gesperrt(_x):
        return True

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_hauptbild_ohne_text.txt"
CAP = int(os.environ.get("CAP", "100000"))
# Wie viele Bilder je Produkt höchstens angesehen werden. Wer nach fünf Ansichten kein
# textfreies Bild gefunden hat, findet meist auch im zehnten keines — und jedes OCR kostet
# Zeit, die anderen Produkten fehlt.
MAXPRUEF = 5


def gql(q, v=None):
    with open("/tmp/_ht.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_ht.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(5)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Der Aufrufer kann ein leeres Dict nicht von
    # einer geglueckten Mutation ohne userErrors unterscheiden und quittiert dann Arbeit,
    # die nie stattfand. Lauter Abbruch statt stiller Rueckgabe.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def main():
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}

    kandidaten = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p.get("status") != "ACTIVE" or not p.get("g"):
            continue
        mc = p.get("mediaCount")
        mc = mc.get("count", 0) if isinstance(mc, dict) else (mc or 0)
        if mc < 2:            # ohne Alternative gibt es nichts umzustellen
            continue
        if p["id"] in erledigt:
            continue
        kandidaten.append(p["id"])
    print(f"Produkte mit mehreren Bildern, noch ungeprüft: {len(kandidaten)}", flush=True)
    if DRY:
        return

    f = open(LEDGER, "a")
    umgestellt = schon_sauber = ohne_alternative = gesperrt = 0
    # 05.10.2026: Hauptbilder, die der Google-Bildtausch bewusst gesetzt hat, bleiben stehen (Lehre textbild_fix: 83 von
    # 301 Tauschen zurückgedreht). Sperre nach Handle UND Produkt-ID, siehe bildtausch_sperre.py.
    from bildtausch_sperre import gesperrte_handles, gesperrte_ids
    sperre_h, sperre_id = gesperrte_handles(), gesperrte_ids()
    for gid in kandidaten[:CAP]:
        if _werbetest_gesperrt(gid):   # 13.10.2026 Werbetest A: kein Bildtausch (teuerster Zug ums Kontingent), kein Ledger
            print(f"  = {gid} übersprungen (Werbetest-Sperre)"); continue
        if gid in sperre_id:
            gesperrt += 1; f.write(f"{gid}\tbildtausch-sperre\t-\n"); f.flush(); continue
        d = gql('query($id:ID!){product(id:$id){title handle media(first:10){nodes{id '
                '... on MediaImage{status image{url}}}}}}', {"id": gid})
        p = (d.get("data") or {}).get("product")
        if not p:
            continue
        if p.get("handle") in sperre_h:
            gesperrt += 1; f.write(f"{gid}\tbildtausch-sperre\t-\n"); f.flush(); continue
        medien = [m for m in p["media"]["nodes"]
                  if m.get("image") and m.get("status") == "READY"]
        if len(medien) < 2:
            continue

        erste = von_url(medien[0]["image"]["url"])
        if erste == -1:
            continue                      # unklar → beim nächsten Lauf erneut
        if erste < WORTGRENZE:
            schon_sauber += 1
            f.write(f"{gid}\tschon-sauber\t{erste}\n")
            f.flush()
            continue

        # Das erste sauber gelesene Bild weiter hinten rückt nach vorn.
        neu = None
        mass_bilder = 0
        for m in medien[1:MAXPRUEF]:
            w, ms = von_url_hauptbild(m["image"]["url"])
            if w == -1:
                continue
            if ms:                        # 13.10.: Karton-/Massbild nie als Hauptbild
                mass_bilder += 1
                continue
            if w < WORTGRENZE:
                neu = m
                break
        if not neu:
            ohne_alternative += 1
            f.write(f"{gid}\talle-mit-text\t-\n")
            f.flush()
            continue

        r = gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m)'
                '{userErrors{message}}}',
                {"id": gid, "m": [{"id": neu["id"], "newPosition": "0"}]})
        fehler = ((r.get("data") or {}).get("productReorderMedia") or {}).get("userErrors")
        if fehler:
            print(f"  ⚠️ {p['title'][:30]}: {fehler[0]['message'][:60]}", flush=True)
            continue
        umgestellt += 1
        f.write(f"{gid}\tumgestellt\t{erste}\t{medien[0]['id']}\t{neu['id']}\n")
        f.flush()
        if umgestellt % 25 == 0:
            print(f"   {umgestellt} umgestellt · {schon_sauber} waren schon sauber · "
                  f"{ohne_alternative} ohne textfreie Alternative", flush=True)
        time.sleep(0.3)
    print(f"FERTIG: {umgestellt} Hauptbilder ersetzt, {schon_sauber} waren sauber, "
          f"{ohne_alternative} haben nur Bilder mit Text, {gesperrt} Bildtausch-Sperre")


def nachpruefen():
    """13.10.2026 — NACHPRÜFEN der früher «umgestellt»-Produkte (3'744, Ledger ohne Medien-IDs).
    Trägt das HEUTIGE Hauptbild eine Massangabe (Karton-/Massbild, bildtext_pruefen.masse) und gibt es unter den
    nächsten Bildern eines ohne Werbetext UND ohne Mass, rückt dieses nach vorn. Sonst bleibt alles, wie es ist
    (Zeile «karton-mass-ohne-ersatz» = Meldung). Jedes Produkt einmal (Ledger-Zeile «nachgeprueft-1013»).
    Vision-Stichprobe 13.10. (100 zufällige): 6 klare Massbilder, der OCR-Melder fand 6 (3 klar, 3 Produktfoto
    mit Grössenetikett) — er findet also nicht alle, aber was er findet, ist kein sauberes Produktfoto.
    ⚠️ SCHREIBT NUR MIT SCHARF=1 — und nur nach Blick aufs Bild: Der «saubere» Ersatz kann eine grosse Werbezeile
    tragen, die Tesseract nicht liest (Trinkflasche 611000: «Not just insulation, more peace of mind» = 2 Wörter
    gelesen, auch mit KACHELN). Ohne SCHARF meldet der Lauf nur (Vorschlagsliste im Log).
    ENV: NACHPRUEFEN=1 [SCHARF=1] [CAP=n] [NUR_ID=id,id]"""
    schreiben = os.environ.get("SCHARF") == "1" and not DRY
    from bildtext_pruefen import masse
    zeilen = [l.rstrip("\n").split("\t") for l in open(LEDGER)]
    fertig = {z[0] for z in zeilen if len(z) > 1 and z[1] in ("nachgeprueft-1013", "karton-mass-korrigiert",
                                                              "karton-mass-ohne-ersatz")}
    nur = {x if x.startswith("gid:") else "gid://shopify/Product/" + x
           for x in (os.environ.get("NUR_ID") or "").split(",") if x.strip()}
    ids = [z[0] for z in zeilen if len(z) > 1 and z[1] == "umgestellt" and z[0] not in fertig]
    if nur:
        ids = [i for i in ids if i in nur] or sorted(nur)
    ids = list(dict.fromkeys(ids))[:CAP]
    print(f"NACHPRÜFEN: {len(ids)} früher umgestellte Produkte · {'SCHREIBEN' if schreiben else 'NUR MELDEN'}", flush=True)
    from bildtausch_sperre import gesperrte_handles, gesperrte_ids
    sperre_h, sperre_id = gesperrte_handles(), gesperrte_ids()
    f = open(LEDGER, "a")
    korr = ohne = sauber = 0
    for gid in ids:
        if _werbetest_gesperrt(gid):   # 13.10.2026 Werbetest A
            print(f"  = {gid} übersprungen (Werbetest-Sperre)"); continue
        d = gql('query($id:ID!){product(id:$id){status handle media(first:10){nodes{id '
                '... on MediaImage{status image{url}}}}}}', {"id": gid})
        p = (d.get("data") or {}).get("product")
        if not p or p.get("status") != "ACTIVE" or "tunmate" in (p.get("handle") or "") \
                or gid in sperre_id or p.get("handle") in sperre_h:
            continue
        medien = [m for m in p["media"]["nodes"] if m.get("image") and m.get("status") == "READY"]
        if len(medien) < 2:
            continue
        n0, m0 = von_url_hauptbild(medien[0]["image"]["url"])
        if n0 == -1:
            continue
        if not m0:
            sauber += 1
            if schreiben:
                f.write(f"{gid}\tnachgeprueft-1013\t{n0}\n"); f.flush()
            continue
        neu = None
        for m in medien[1:MAXPRUEF]:
            w, ms = von_url_hauptbild(m["image"]["url"])
            if w != -1 and not ms and w < WORTGRENZE:
                neu = m
                break
        if not neu:
            ohne += 1
            print(f"  = {p['handle'][:60]}: Massbild {m0[:3]}, kein sauberer Ersatz", flush=True)
            if schreiben:
                f.write(f"{gid}\tkarton-mass-ohne-ersatz\t{n0}\t{medien[0]['id']}\t{','.join(m0[:4])}\n"); f.flush()
            continue
        print(f"  ~ {p['handle'][:60]}: Massbild {m0[:3]} → {neu['id'].split('/')[-1]}", flush=True)
        if not schreiben:
            korr += 1
            continue
        r = gql('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){userErrors{message}}}',
                {"id": gid, "m": [{"id": neu["id"], "newPosition": "0"}]})
        fe = ((r.get("data") or {}).get("productReorderMedia") or {}).get("userErrors")
        if fe:
            print(f"  ⚠️ {p['handle'][:40]}: {fe[0]['message'][:60]}", flush=True)
            continue
        korr += 1
        f.write(f"{gid}\tkarton-mass-korrigiert\t{n0}\t{medien[0]['id']}\t{neu['id']}\n"); f.flush()
        time.sleep(0.3)
    print(f"FERTIG: Nachprüfung {korr} Massbilder {'ersetzt' if schreiben else 'mit Ersatzvorschlag (nur gemeldet)'}, {ohne} ohne sauberen Ersatz, "
          f"{sauber} ohne Massangabe")


if __name__ == "__main__":
    if os.environ.get("NACHPRUEFEN") == "1":
        nachpruefen()
    else:
        main()
