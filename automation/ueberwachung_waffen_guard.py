"""Nimmt verdeckte Überwachungstechnik und Waffen gegen Menschen aus dem Google-Kanal.

BEFUND (14.08.2026). Der Säuberungslauf vom 12.08. hat 88 Produkte aus dem Google-Kanal
genommen und gilt seither als erledigt. Er hat aber nur dort gegriffen, wo der Verkäufer sein
Produkt selbst benannt hat — «versteckte Kamera», «Teleskopschlagstock», ein Klingen-Nomen oder
die Wortendung «…waffe». Wer es anders nennt, stand weiter im Feed:

  • «SQ13 Wireless Mini-Kamera» — die klassische Spionagekamera-Modellreihe, im Text aber rein
    technisch beschrieben («Bewegungserkennung», «90 Minuten Aufnahme»), kein einziges Tarnwort.
    Ihre beiden SQ11-Zwillinge wurden am 12.08. entfernt, sie selbst nicht.
  • Vier Würfelkameras derselben Bauform mit dem Satz «lässt sich diskret platzieren»
    (43×35×25 mm bzw. 30×30×30 mm, eine wiegt 34,6 g). Das Muster vom 12.08. verlangte
    «diskret» PLUS ein Aufnahmewort DIREKT dahinter — hier folgt «platzieren».
  • Eine Sonnenbrille mit eingebauter Kamera: «Das Design ist einer normalen Brille
    nachempfunden, was eine diskrete Nutzung ermöglicht.»
  • Ein sprachaktivierter Rekorder mit 60 Stunden Laufzeit, der per Magnet an fremden
    Metalloberflächen haftet — «ermöglicht eine diskrete Platzierung».
  • «Automatischer Feder-Abwehrstock» statt Teleskopschlagstock, «Selbstverteidigungs-
    WERKZEUG» statt «…waffe», «PC Defense Stick» statt Schlagstock, «Übungsstab mit
    Bambusgelenk» statt Nunchaku, «Schmetterlings-Schwert» statt Butterfly-Messer.

Drei davon waren zusätzlich als «Aufbewahrung & Organizer» deklariert, einer als «Werkzeug &
Heimwerken» — sie rutschen durch jede Warengruppenprüfung. Google führt verdeckte Überwachung
unter «Dishonest behavior»; die Sanktion ist die Sperrung des KONTOS, und Google ist der
einzige Kanal mit belegten Verkäufen (52 Klicks, +206 %).

ZAHL: 18 Treffer, davon 13 noch live im Google-Kanal (5 hatte der 12.08.-Lauf schon erwischt;
der Lauf prüft sie trotzdem live nach, statt sich auf den Export vom 12.08. zu verlassen).

FEHLTREFFER AUS DEM PROBELAUF, alle vor dem Scharfschalten aussortiert (Sperren mit Begründung
in heikel_zweck.json):
  • 6 Kamera-/Wanzen-DETEKTOREN. Sie SUCHEN versteckte Kameras. Ausgerechnet das Schutzgerät
    aus dem Kanal zu nehmen wäre die Umkehrung des Zwecks.
  • 8 Ansteck-/Kragenclip-/Konferenzmikrofone («unauffällige Befestigung am Kragen») — Video-
    zubehör, keine Wanzen.
  • 16 Mini-Drohnen mit Kamera, ein FPV-Rahmen, ein 5-mm-Sportkamera-Adapter, eine TF-Karte,
    ein USB-Ladegerät für Kamera-Akkus, ein Insta360-Gehäuse.
  • 5 Elektroschock-Hundehalsbänder und eine Mückenklatsche — richten sich nicht gegen
    Menschen. (Reizstrom am Hund ist eine Tierschutzfrage, nicht diese hier.)
  • 3 Paar Militär-/Wanderstiefel, eine taktische Weste, ein Box-Target, fünf Polizei-
    Spielfiguren («Schlagstock» in der Zubehörliste), ein Modellauto-Set («Selbstverteidigungs-
    streitkräfte Typ 16 Gepanzerter Tank») und die «Washed Machete Jeans» — eine Waschung.
  • «Bluetooth-Verlustobjektfinder»: der erste Entwurf traf ihn über «Mini-GPS-Tracker für
    unauffälligen GEBRAUCH» plus das Wort «Kameratrigger». «Gebrauch» ist daraufhin aus der
    Verbliste geflogen — es beschreibt die Handhabung durch den Besitzer, nicht das Verstecken.
  • Der teuerste Beinahe-Fehler war eine falsch gesetzte SPERRE, kein falscher Treffer: Die
    Sperren liefen zuerst über den ganzen Beschreibungstext, und weil im Lieferumfang der
    A9-Spionagekamera «eine Halterung» steht, meldete der Probelauf 0 Kameras. Sperren prüfen
    jetzt nur den TITEL — also das, was das Produkt IST.

ENTSCHEIDUNG, und wo dieses Skript bewusst NICHT selbst entscheidet:
  • Überwachungstechnik → nur aus dem Google-Kanal, Tag `verdeckte-ueberwachung`. Die Ware
    bleibt aktiv im Shop; sie ist in der Schweiz nicht verboten, ihr heimlicher EINSATZ ist es.
  • Waffen → aus dem Google-Kanal, Tag `waffe-pruefen`.
  • DRAFT gibt es nur für nach Schweizer Recht verbotene Ware — und bei vier der fünf Fälle
    steht der Beweis dafür NICHT im Text, sondern im BILD: «PC Defense Stick Gehstock-Paar»
    zeigt ein Tonfa-Paar, der «Übungsstab mit Bambusgelenk» zwei Stahlstäbe an einer Kette
    (Nunchaku), das «Selbstverteidigungswerkzeug» wirbt auf dem Produktbild mit «Strong
    electric arc», und das «Schmetterlings-Schwert» ist ein Balisong, bei dem das Listing
    ausdrücklich auch eine «spitze Klinge ohne Öffnung» anbietet (ein Trainer ist nur mit
    stumpfer, ungeschliffener UND gelochter Klinge zulässig). Alle vier sind in BILDGEPRUEFT
    einzeln aufgeführt. Ein Mustertreffer allein draftet NIE — er meldet den Fall zur
    Bildprüfung. Sonst würde aus einem Wort im Fliesstext ein Verkaufsstopp.
  • Rechtsgrundlage der DRAFT-Fälle: Art. 4 Abs. 1 Bst. c–e WG nennt Schmetterlingsmesser,
    Schlagstöcke/Tonfa/Nunchaku und Elektroschockgeräte ausdrücklich; nach Art. 5 ist bereits
    das ANBIETEN verboten. Dieselbe Behandlung wie beim Butterfly-Messer am 12.08.

DIE QUELLE IST MITREPARIERT: `automation/heikel_zweck.mjs` (dieselben Muster, dieselbe JSON)
hängt in `cj_category_fill.mjs` VOR dem Publizieren. Zwei der 18 Fälle wurden nach dem letzten
Säuberungslauf importiert — ein Bestandsreiniger allein hätte sie am nächsten Tag wieder
vorgefunden.

DRY=1 meldet nur. Ledger: dropship/_ueberwachung_waffen.txt (Zeile für Zeile geschrieben und
geflusht — der Prozess wird hier regelmässig mitten im Lauf abgebrochen). Eine gescheiterte
Anfrage kommt NICHT ins Ledger: der Fall gilt dann als offen und wird beim nächsten Lauf
erneut versucht.

SCHUSSWAFFEN-ZUBEHÖR (14.10.2026, zweiter Teil dieses Laufs). GEMESSEN 14.10. über alle 54'523 aktiven Produkte (Titel,
Typ, Tags, Beschreibung): 10 Stück Schusswaffen-Zubehör PER REGEL — «Zielfernrohr-Halterungszubehör»
(im Google-Kanal, ohne Tag: die Titel-Sperre «Halterung» oben ist für Kamera-Zubehör gedacht und hat die Waffen-Regeln
beschattet), zwei Gewehr-Zweibeine als «Taktisches Outdoor-Stativ», ein Schulterholster als «Taktische Brusttasche», eine
Holster-Bauchtasche, eine Pistolen-/Magazintasche, ein Holster-Montageset, dazu «AK74 Zielfernrohrbrücke», «Glock-Holster»
und ein Gewehrriemen, die zwar «waffe-pruefen» trugen, aber auf TikTok, Facebook/Instagram und Pinterest standen.
Regel: google_sperrliste.ist_schusswaffen_zubehoer() (Daten automation/data/schusswaffen_zubehoer_regel.json, Importer-
Zwilling schusswaffen_zubehoer.mjs). Folge: Tag «waffe-pruefen» → google_sperrtags_durchsetzen nimmt die Ware aus Google
und allen Werbe-/Social-Kanälen; der Laden bleibt. Dieser Teil ist MELDEND, bis SCHARF=1 gesetzt ist (dann tagsAdd in
Bündeln à 20 + Ledger-Zeile «schusswaffen-zubehoer»); Werbetest-Sperre wird gefragt, Kanarien sind Pflicht (0 Fehler).
Er draftet NIE — falsch benannte Waffenteile (Bild ≠ Titel) entscheidet ein Mensch (dropship/WAFFEN-ZUBEHOER-2026-10-14.md).

⚠️ NACHBESSERUNG 14.10. (Richter): «10 Stück aktiv» war FALSCH. Die Nachprüfung am Bild (1'735 Bilder: ganz «Werkzeug &
Heimwerken» + 660 taktisch/Holster/Optik/Licht/Tasche-Titel) fand ≥ 13 WEITERE Waffenteile, alle G T F P, kein Tag:
AR-15-Schlüssel als «Multifunktions-Schraubenschlüssel», Waffenlicht als «T6 Taschenlampe Set», Magazintasche als «Taktische
Sporttasche», Gewehrfutterale als «Taktische Angeltasche/Angelrucksack», Laser-Boresight als «Infrarot-Kalibrator» … Der
Vorschlag «CJ-Namen holen, dann trifft stark-en» ist GEMESSEN nur ein Teil: 29 CJ-Namen geholt — der Schienenhalter heisst
dort «Scope Bracket», alle anderen sind ebenso harmlos («Infrared calibrator», «Multifunctional tactical wrench», «Outdoor
tactical fishing gear backpack»). Darum drei Wege in diesem Teil:
  1. bild_geprueft (Regeldatei): am Bild bestimmte Ware → wie ein Treffer (Tag), egal was Titel/CJ-Name sagen.
  2. CJ-Namen aus dropship/_cj_name_en.tsv (Werkzeug automation/schusswaffen_en_namen.py, nur lesen) → en=… in der Regel;
     Cache-Produkte, deren CJ-Name allein verdächtig ist (gs.swz_en_verdacht), werden auch ausserhalb des SEIT-Fensters
     live nachgeprüft.
  3. bild_pruefen: NEUE aktive Ware (nach bild_pruefen.ab) mit «taktisch/military/jagd …» + «Tasche/Werkzeug/Lampe/
     Halterung …» → dropship/_waffen_bild_pruefen.json (Format von bild_kontaktbogen_liste.py) zur Bildprüfung; kein Tag.
    python3 automation/ueberwachung_waffen_guard.py --selbsttest     Kanarien + Handlisten + Cache-Leser, ohne Netz
"""
import json
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import google_sperrliste as gs  # noqa: E402  (14.10.2026: Schusswaffen-Zubehör-Regel)
try:
    from werbetest_sperre import gesperrt as werbetest_gesperrt  # noqa: E402
except Exception:  # pragma: no cover — ohne Sperrdatei-Leser lieber nichts schreiben als blind
    def werbetest_gesperrt(_pid):
        return True
try:
    from eimer_etikette import nachlauf  # noqa: E402
except Exception:  # pragma: no cover
    def nachlauf(_d):
        return 0
from schusswaffen_en_namen import en_namen  # noqa: E402  (14.10.2026: CJ-Namen der Bestandsware, nur Cache lesen)

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json"
# 14.10.2026: erst beim Gebrauch Pflicht — der Selbsttest läuft ohne Token.
TOK = open("/tmp/cj_shop_token.txt").read().strip() if os.path.exists("/tmp/cj_shop_token.txt") else ""
GOOGLE = "gid://shopify/Publication/302872297857"
WERBUNG = {"T": "gid://shopify/Publication/302032716161",   # TikTok
           "F": "gid://shopify/Publication/302566834561",   # Facebook & Instagram
           "P": "gid://shopify/Publication/302994456961"}   # Pinterest
DRY = os.environ.get("DRY") == "1"
SCHARF = os.environ.get("SCHARF") == "1"   # nur für den Schusswaffen-Zubehör-Teil (14.10.2026)
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_ueberwachung_waffen.txt"
BILD_PRUEFEN = "dropship/_waffen_bild_pruefen.json"   # 14.10.2026: neue Ware zur Bildprüfung (kein Tag)
EN = en_namen()                                       # {pid: CJ-productNameEn} aus dropship/_cj_name_en.tsv
MUSTER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "heikel_zweck.json")

# Am Produktbild bestimmte Bauform → nach Schweizer Recht verbotene Ware → DRAFT.
# Der Text allein gibt das bei keinem der vier her; deshalb steht hier eine Liste und kein
# Muster. Wer sie erweitert, hat vorher das Bild angesehen.
BILDGEPRUEFT = {
    "15495190020481": "federgetriebener Teleskopschlagstock (19 cm → 39 cm), Verkäufer nennt ihn «Abwehrstock»",
    "15463465943425": "Tonfa-Paar mit Quergriff, Verkäufer nennt es «Gehstock-Paar»",
    "15463586726273": "Nunchaku: zwei Edelstahlstäbe an einer Kette, Verkäufer nennt es «Übungsstab»",
    "15477388280193": "Balisong; Listing bietet ausdrücklich «spitze Klinge ohne Öffnung» an",
    "15454473388417": "Elektroschockgerät, Produktbild wirbt mit «Strong electric arc»",
    "16608572670343": "grüner Laser-Einschiesser (Boresight) mit 8 Kaliber-Adaptern, Marke «ohhunt» — Laser für Schusswaffen (06.10.2026)",
}


def gql(query, variables=None):
    """Gibt die Antwort zurück oder None. None heisst «keine Antwort», nicht «keine Daten»."""
    with open("/tmp/_uwg.json", "w") as f:
        f.write(json.dumps({"query": query, "variables": variables or {}}))
    for versuch in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60", SHOP,
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_uwg.json"],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                nachlauf(d)   # 14.10.2026: Eimer-Boden — der Wochenlauf liest den ganzen Katalog mit Beschreibung
                return d
        except Exception:
            pass
        time.sleep(4 + 3 * versuch)
    return None


# ── Muster: eine einzige Quelle für Importer (heikel_zweck.mjs) und Bestandsreiniger ────────
M = json.load(open(MUSTER, encoding="utf-8"))
SPERRE = [(s["n"], re.compile(s["re"], re.I)) for s in M["sperre_titel"]]
TREFFER = [(t["n"], [re.compile(r, re.I) for r in t["alle"]]) for t in M["treffer"]]
VERBOTEN_REGEL = {"ch-verbotene-waffe", "ch-verbotene-waffe-getarnt", "elektroschock-gegen-menschen",
                  "schusswaffen-laser"}  # 06.10.2026: Laser-Zielgerät/Boresight für Schusswaffen (Art. 4 Abs. 2 WG)
# 05.10.2026: Konsolen-Jailbreak/Custom Firmware — der TEXT ist hier die Funktion (kein Bild nötig):
# Art. 39a Abs. 3 URG verbietet schon das Anbieten → DRAFT wie BILDGEPRUEFT, Tag kopierschutz-umgehung.
UMGEHUNG_REGEL = {"kopierschutz-umgehung-konsole"}


def heikel(titel, text):
    klar = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", f"{titel} || {text or ''}"))
    for _, s in SPERRE:
        if s.search(titel):
            return None
    for name, kette in TREFFER:
        m = [r.search(klar) for r in kette]
        if all(m):
            gruppe = ("waffe" if re.search(r"waffe|elektroschock", name)
                      else "umgehung" if name in UMGEHUNG_REGEL else "ueberwachung")
            return {"gruppe": gruppe, "grund": name, "muster": m[-1].group(0)[:70]}
    return None


def kandidaten():
    """Export als Vorauswahl, danach ALLES live nachgeprüft (der Export ist ein Schnappschuss).

    Gibt (gefunden, zubehoer, pruefen) zurück: heikel_zweck-Treffer wie bisher und — seit 14.10.2026 — Schusswaffen-Zubehör
    nach gs.ist_schusswaffen_zubehoer (pid → (titel, grund), mit CJ-Namen aus EN) sowie neue Ware zur Bildprüfung
    (pid → (titel, bild-url, grund)). Die Live-Abfrage holt dafür auch Typ, Tags, Anlagezeit und Hauptbild.
    """
    gefunden, zubehoer, pruefen = {}, {}, {}

    def zub(pid, titel, typ, tags, html, angelegt="", bild=""):
        z = gs.ist_schusswaffen_zubehoer(titel, typ or "", tags or [], html or "", EN.get(pid, ""))
        if z:
            zubehoer[pid] = (titel, z + (" [CJ-Name]" if EN.get(pid) and not gs.ist_schusswaffen_zubehoer(
                titel, typ or "", tags or [], html or "") else ""))
        elif (angelegt and angelegt >= gs.SWZ_BILD_PRUEFEN_AB and pid not in gs.SWZ_BILD and pid not in gs.SWZ_BILD_OK):
            b = gs.swz_bild_pruefen(titel, typ or "", EN.get(pid, ""))
            if b:
                pruefen[pid] = (titel, bild, b)

    if os.path.exists(EXPORT):
        for zeile in open(EXPORT):
            p = json.loads(zeile)
            if p.get("status") != "ACTIVE":
                continue
            pid = p["id"].split("/")[-1]
            r = heikel(p["title"], p.get("descriptionHtml"))
            if r:
                gefunden[pid] = (p["title"], r)
            zub(pid, p["title"], p.get("productType"), p.get("tags"), p.get("descriptionHtml"))
    # Alles, was seit dem Export dazugekommen ist — der Importer legt täglich Neues an.
    q = ('query($c:String){products(first:100,after:$c,query:"status:active created_at:>%s"){'
         'pageInfo{hasNextPage endCursor} nodes{id title productType tags descriptionHtml createdAt '
         'featuredMedia{preview{image{url}}}}}}'
         % os.environ.get("SEIT", "2026-08-11"))
    cur, seiten = None, 0
    while True:
        d = gql(q, {"c": cur})
        if d is None:
            print("⚠️ Live-Nachzug abgebrochen (keine Antwort) — Ergebnis unvollständig, "
                  "nichts wird geschrieben.", flush=True)
            sys.exit(1)
        pr = d["data"]["products"]
        for n in pr["nodes"]:
            pid = n["id"].split("/")[-1]
            r = heikel(n["title"], n.get("descriptionHtml"))
            if r:
                gefunden[pid] = (n["title"], r)
            bild = (((n.get("featuredMedia") or {}).get("preview") or {}).get("image") or {}).get("url") or ""
            zub(pid, n["title"], n.get("productType"), n.get("tags"), n.get("descriptionHtml"), n.get("createdAt") or "", bild)
        seiten += 1
        if not pr["pageInfo"]["hasNextPage"]:
            break
        cur = pr["pageInfo"]["endCursor"]
    print(f"Live-Nachzug: {seiten} Seiten neuer Ware geprüft · CJ-Namen im Cache: {len(EN)}", flush=True)
    return gefunden, zubehoer, pruefen


LIVE = """query($id:ID!){product(id:$id){id title status
 resourcePublications(first:20){nodes{publication{id} isPublished}}}}"""


def heikel_lauf(gefunden):
    """Der bisherige Lauf (heikel_zweck.json): Google-Kanal raus + Tag, DRAFT nur für BILDGEPRUEFT/Umgehung."""
    print(f"\nTreffer im Katalog: {len(gefunden)}", flush=True)

    zu_tun = []
    for pid, (titel, r) in sorted(gefunden.items()):
        d = gql(LIVE, {"id": "gid://shopify/Product/" + pid})
        if d is None or not (d.get("data") or {}).get("product"):
            print(f"  ⚠️ {pid} keine Antwort — bleibt offen, nächster Lauf versucht es erneut",
                  flush=True)
            continue
        p = d["data"]["product"]
        im_kanal = any(n["isPublished"] for n in p["resourcePublications"]["nodes"]
                       if n["publication"]["id"] == GOOGLE)
        draft = pid in BILDGEPRUEFT or r["grund"] in UMGEHUNG_REGEL
        zu_tun.append((pid, p["title"], p["status"], im_kanal, r, draft))

    print(f"\n{'ID':<16}{'Kanal':<7}{'Status':<8}Regel / Titel", flush=True)
    for pid, titel, status, im_kanal, r, draft in zu_tun:
        mark = " ⛔DRAFT" if draft else ""
        print(f"{pid:<16}{'JA' if im_kanal else '–':<7}{status:<8}{r['grund']}{mark}\n"
              f"{'':<31}{titel[:58]}", flush=True)
        if draft:
            print(f"{'':<31}↳ {BILDGEPRUEFT.get(pid) or 'Text: ' + r['muster']}", flush=True)

    offen = [x for x in zu_tun if x[3] or (x[5] and x[2] == "ACTIVE")]
    print(f"\nZu ändern: {len(offen)} von {len(zu_tun)} "
          f"(der Rest wurde bereits am 12.08. aus dem Kanal genommen)", flush=True)
    if DRY:
        print("DRY=1 — nichts geschrieben.", flush=True)
        return

    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    raus = gedraftet = 0
    for pid, titel, status, im_kanal, r, draft in zu_tun:
        gid = "gid://shopify/Product/" + pid
        if pid in erledigt and not im_kanal and not (draft and status == "ACTIVE"):
            continue
        getan = []
        if im_kanal:
            a = gql('mutation($id:ID!,$i:[PublicationInput!]!){publishableUnpublish(id:$id,'
                    'input:$i){userErrors{message}}}', {"id": gid, "i": [{"publicationId": GOOGLE}]})
            if a is None or ((a.get("data") or {}).get("publishableUnpublish") or {}).get("userErrors"):
                print(f"  ⚠️ {pid} Kanal-Entfernung fehlgeschlagen — Fall bleibt offen", flush=True)
                continue
            raus += 1
            getan.append("google-kanal-entfernt")
        tag = ("kopierschutz-umgehung" if r["gruppe"] == "umgehung"
               else "waffengesetz-verboten" if draft
               else ("waffe-pruefen" if r["gruppe"] == "waffe" else "verdeckte-ueberwachung"))
        a = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": gid, "t": [tag]})
        if a is None:
            print(f"  ⚠️ {pid} Tag fehlgeschlagen — Fall bleibt offen", flush=True)
            continue
        getan.append("tag:" + tag)
        if draft and status == "ACTIVE":
            a = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                    {"i": {"id": gid, "status": "DRAFT"}})
            if a is None or ((a.get("data") or {}).get("productUpdate") or {}).get("userErrors"):
                print(f"  ⚠️ {pid} DRAFT fehlgeschlagen — Fall bleibt offen", flush=True)
                continue
            gedraftet += 1
            getan.append("draft")
        f.write(f"{pid}\t{r['gruppe']}\t{r['grund']}\t{','.join(getan)}\t{titel}\n")
        f.flush()
        os.fsync(f.fileno())
        print(f"  ✔ {pid} {', '.join(getan)} — {titel[:46]}", flush=True)
        time.sleep(0.3)
    print(f"\nFERTIG: {raus} aus dem Google-Kanal · {gedraftet} auf DRAFT "
          f"(nach Schweizer Recht verbotene Ware — Waffengesetz bzw. Art. 39a URG —, bleibt im Katalog und ist "
          f"jederzeit wieder freischaltbar)", flush=True)


# ── Schusswaffen-Zubehör (14.10.2026) ──────────────────────────────────────────────────────────────────────────────
ZUB_TAG = "waffe-pruefen"
ZUB_LIVE = ("query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status tags productType descriptionHtml "
            "g:publishedOnPublication(publicationId:\"%s\") t:publishedOnPublication(publicationId:\"%s\") "
            "f:publishedOnPublication(publicationId:\"%s\") p:publishedOnPublication(publicationId:\"%s\")}}}"
            % (GOOGLE, WERBUNG["T"], WERBUNG["F"], WERBUNG["P"]))


def selbsttest():
    """Ohne Netz: Kanarien der Regel + Bildprüf-Kanarien + Handlisten (0 Fehler Pflicht), zwei Stichproben gegen heikel(),
    CJ-Namen-Cache lesbar und der Bildprüf-Stichtag gesetzt."""
    n, f = gs.schusswaffen_kanarien()
    for titel, soll, ist in f:
        print(f"  ✗ «{titel}» soll {soll}, Regel sagt «{ist}»", flush=True)
    ok_heikel = heikel("Laser-Boresight für Gewehr und Flinte", "") is not None and heikel("Kinder-Rucksack", "") is None
    ok_rest = gs.SWZ_BILD_PRUEFEN_AB.startswith("20") and all(k.isdigit() for k in EN)
    print(f"Schusswaffen-Zubehör-Kanarien: {n - len(f)}/{n} · heikel()-Stichprobe {'ok' if ok_heikel else 'FALSCH'} · "
          f"Handliste {len(gs.SWZ_BILD)} bildgeprüft / {len(gs.SWZ_BILD_OK)} keine Waffe · CJ-Namen im Cache {len(EN)} · "
          f"Bildprüfung ab {gs.SWZ_BILD_PRUEFEN_AB} {'ok' if ok_rest else 'FALSCH'}", flush=True)
    return not f and ok_heikel and ok_rest


def bild_pruefen_vormerken(pruefen):
    """Neue Ware zur Bildprüfung in dropship/_waffen_bild_pruefen.json (Format bild_kontaktbogen_liste.py), je pid einmal.
    Schreibt nicht bei DRY=1. Was ein Mensch entschieden hat (bild_geprueft/bild_ok in der Regeldatei), fällt heraus."""
    if not pruefen:
        print("Zur Bildprüfung vorgemerkt: 0 neue", flush=True)
        return
    for pid, (titel, url, grund) in sorted(pruefen.items()):
        print(f"  🔎 {pid} {titel[:60]} ← {grund}", flush=True)
    if DRY:
        print(f"Zur Bildprüfung: {len(pruefen)} (DRY=1 — nicht vorgemerkt)", flush=True)
        return
    try:
        alt = json.load(open(BILD_PRUEFEN, encoding="utf-8"))
    except Exception:
        alt = []
    alt = [a for a in alt if a.get("id") not in gs.SWZ_BILD and a.get("id") not in gs.SWZ_BILD_OK]
    da = {a.get("id") for a in alt}
    neu = [{"id": pid, "titel": t, "url": u, "grund": g, "datum": time.strftime("%Y-%m-%d", time.gmtime())}
           for pid, (t, u, g) in sorted(pruefen.items()) if pid not in da]
    tmp = BILD_PRUEFEN + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(alt + neu, f, ensure_ascii=False, indent=1)
    os.replace(tmp, BILD_PRUEFEN)
    print(f"Zur Bildprüfung vorgemerkt: {len(neu)} neu, {len(alt) + len(neu)} offen in {BILD_PRUEFEN} "
          f"(ansehen: python3 automation/bild_kontaktbogen_liste.py {BILD_PRUEFEN} waffen)", flush=True)


def zubehoer_lauf(zubehoer, gefunden, pruefen=None):
    """Meldet jedes Schusswaffen-Zubehör mit Kanälen; SCHARF=1 (und nicht DRY) setzt «waffe-pruefen» per tagsAdd.

    Nie productUpdate(tags:) (ersetzt ALLE Tags), nie DRAFT. Kanäle nimmt google_sperrtags_durchsetzen heraus, sobald
    der Tag steht (Google über AUSSCHLUSS_TAGS, TikTok/FB-IG/Pinterest über ALLE_WERBEKANAELE).
    14.10.2026 (Nachbesserung): dazu IMMER die bildgeprüfte Handliste (gs.SWZ_BILD) und die Cache-Produkte, deren CJ-Name
    allein verdächtig ist (gs.swz_en_verdacht) — beide unabhängig vom SEIT-Fenster; die zweiten mit der ganzen Regel
    (Titel/Typ/Tags/Text live + CJ-Name) entschieden.
    """
    print(f"\n── Schusswaffen-Zubehör: {len(zubehoer)} Treffer (Regel gs.ist_schusswaffen_zubehoer) · "
          f"Handliste {len(gs.SWZ_BILD)} · CJ-Namen {len(EN)} ──", flush=True)
    n, f = gs.schusswaffen_kanarien()
    if f:
        print(f"⚠️ Schusswaffen-Zubehör-Kanarien: {len(f)} von {n} falsch — Regel übersprungen, nichts geschrieben",
              flush=True)
        return False
    en_extra = {pid for pid, en in EN.items() if pid not in zubehoer and gs.swz_en_verdacht(en)}
    bild = {pid: g for pid, g in gs.SWZ_BILD.items() if pid not in zubehoer}
    pids = sorted(set(zubehoer) | en_extra | set(bild))
    live = {}
    for i in range(0, len(pids), 50):
        d = gql(ZUB_LIVE, {"ids": ["gid://shopify/Product/" + p for p in pids[i:i + 50]]})
        if d is None:
            print("⚠️ Live-Abfrage der Treffer ohne Antwort — nichts geschrieben, nächster Lauf versucht es erneut",
                  flush=True)
            return False
        for nd in d["data"]["nodes"]:
            if nd:
                live[nd["id"].split("/")[-1]] = nd
    for pid in sorted(en_extra):
        nd = live.get(pid)
        if nd:
            z = gs.ist_schusswaffen_zubehoer(nd["title"], nd.get("productType") or "", nd.get("tags") or [],
                                             nd.get("descriptionHtml") or "", EN[pid])
            if z:
                zubehoer[pid] = (nd["title"], z + " [CJ-Name]")
    for pid, g in bild.items():
        if live.get(pid):
            zubehoer[pid] = (live[pid]["title"], "bild: " + g[:110])
    pids = sorted(zubehoer)
    bild_pruefen_vormerken(pruefen or {})
    offen = []
    print(f"{'ID':<16}{'Kanäle':<8}{'Tag':<5}Titel / Grund", flush=True)
    for pid in pids:
        nd = live.get(pid)
        if not nd or nd.get("status") != "ACTIVE":
            continue
        kan = "".join(k for k, a in (("G", "g"), ("T", "t"), ("F", "f"), ("P", "p")) if nd.get(a)) or "–"
        hat = ZUB_TAG in [str(t).lower() for t in nd.get("tags") or []]
        neben = " (auch heikel_zweck)" if pid in gefunden else ""
        print(f"{pid:<16}{kan:<8}{'ja' if hat else 'NEIN':<5}{nd['title'][:60]}\n"
              f"{'':<29}↳ {zubehoer[pid][1]}{neben}", flush=True)
        if not hat:
            offen.append((pid, nd["title"], zubehoer[pid][1], kan))
    print(f"Ohne «{ZUB_TAG}»: {len(offen)} (davon im Google-Kanal: {sum(1 for o in offen if 'G' in o[3])})",
          flush=True)
    if not offen:
        return True
    if DRY or not SCHARF:
        print(f"{'DRY=1' if DRY else 'Ohne SCHARF=1'} — Schusswaffen-Zubehör nur gemeldet, kein Tag gesetzt.", flush=True)
        return True
    gesperrt = [o for o in offen if werbetest_gesperrt(o[0])]
    for o in gesperrt:
        print(f"  ⏸ {o[0]} übersprungen (Werbetest-Sperre) — {o[1][:50]}", flush=True)
    offen = [o for o in offen if o not in gesperrt]
    getaggt = 0
    with open(LEDGER, "a") as led:
        for i in range(0, len(offen), 20):          # Alias-Bündel à 20 (ein Aufruf statt zwanzig)
            teil = offen[i:i + 20]
            q = "mutation(" + ",".join(f"$id{j}:ID!" for j in range(len(teil))) + ",$t:[String!]!){" + " ".join(
                f"m{j}:tagsAdd(id:$id{j},tags:$t){{userErrors{{message}}}}" for j in range(len(teil))) + "}"
            v = {"t": [ZUB_TAG], **{f"id{j}": "gid://shopify/Product/" + o[0] for j, o in enumerate(teil)}}
            a = gql(q, v)
            if a is None:
                print(f"  ⚠️ Bündel {i // 20 + 1}: keine Antwort — {len(teil)} Fälle bleiben offen", flush=True)
                continue
            for j, (pid, titel, grund, kan) in enumerate(teil):
                ue = ((a.get("data") or {}).get(f"m{j}") or {}).get("userErrors")
                if ue or (a.get("data") or {}).get(f"m{j}") is None:
                    print(f"  ⚠️ {pid} Tag nicht gesetzt: {ue} — Fall bleibt offen", flush=True)
                    continue
                led.write(f"{pid}\twaffe\tschusswaffen-zubehoer\ttag:{ZUB_TAG}\t{titel}\t{grund}\n")
                led.flush()
                os.fsync(led.fileno())
                getaggt += 1
                print(f"  ✔ {pid} tag:{ZUB_TAG} [{kan}] — {titel[:50]}", flush=True)
            time.sleep(0.5)
    print(f"FERTIG Schusswaffen-Zubehör: {getaggt} getaggt · Kanäle nimmt google_sperrtags_durchsetzen heraus", flush=True)
    return True


def main():
    if "--selbsttest" in sys.argv or "--kanarien" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if not TOK:
        sys.exit("ABBRUCH: /tmp/cj_shop_token.txt fehlt")
    gefunden, zubehoer, pruefen = kandidaten()
    heikel_lauf(gefunden)
    zubehoer_lauf(zubehoer, gefunden, pruefen)


if __name__ == "__main__":
    main()
