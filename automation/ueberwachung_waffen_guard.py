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
"""
import json
import os
import re
import subprocess
import sys
import time

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
GOOGLE = "gid://shopify/Publication/302872297857"
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_ueberwachung_waffen.txt"
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
                return d
        except Exception:
            pass
        time.sleep(4 + 3 * versuch)
    return None


# ── Muster: eine einzige Quelle für Importer (heikel_zweck.mjs) und Bestandsreiniger ────────
M = json.load(open(MUSTER, encoding="utf-8"))
SPERRE = [(s["n"], re.compile(s["re"], re.I)) for s in M["sperre_titel"]]
TREFFER = [(t["n"], [re.compile(r, re.I) for r in t["alle"]]) for t in M["treffer"]]
VERBOTEN_REGEL = {"ch-verbotene-waffe", "ch-verbotene-waffe-getarnt", "elektroschock-gegen-menschen"}


def heikel(titel, text):
    klar = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", f"{titel} || {text or ''}"))
    for _, s in SPERRE:
        if s.search(titel):
            return None
    for name, kette in TREFFER:
        m = [r.search(klar) for r in kette]
        if all(m):
            gruppe = "waffe" if re.search(r"waffe|elektroschock", name) else "ueberwachung"
            return {"gruppe": gruppe, "grund": name, "muster": m[-1].group(0)[:70]}
    return None


def kandidaten():
    """Export als Vorauswahl, danach ALLES live nachgeprüft (der Export ist ein Schnappschuss)."""
    gefunden = {}
    if os.path.exists(EXPORT):
        for zeile in open(EXPORT):
            p = json.loads(zeile)
            if p.get("status") != "ACTIVE":
                continue
            r = heikel(p["title"], p.get("descriptionHtml"))
            if r:
                gefunden[p["id"].split("/")[-1]] = (p["title"], r)
    # Alles, was seit dem Export dazugekommen ist — der Importer legt täglich Neues an.
    q = ('query($c:String){products(first:100,after:$c,query:"status:active created_at:>%s"){'
         'pageInfo{hasNextPage endCursor} nodes{id title descriptionHtml}}}'
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
            r = heikel(n["title"], n.get("descriptionHtml"))
            if r:
                gefunden[n["id"].split("/")[-1]] = (n["title"], r)
        seiten += 1
        if not pr["pageInfo"]["hasNextPage"]:
            break
        cur = pr["pageInfo"]["endCursor"]
    print(f"Live-Nachzug: {seiten} Seiten neuer Ware geprüft.", flush=True)
    return gefunden


LIVE = """query($id:ID!){product(id:$id){id title status
 resourcePublications(first:20){nodes{publication{id} isPublished}}}}"""


def main():
    gefunden = kandidaten()
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
        draft = pid in BILDGEPRUEFT
        zu_tun.append((pid, p["title"], p["status"], im_kanal, r, draft))

    print(f"\n{'ID':<16}{'Kanal':<7}{'Status':<8}Regel / Titel", flush=True)
    for pid, titel, status, im_kanal, r, draft in zu_tun:
        mark = " ⛔DRAFT" if draft else ""
        print(f"{pid:<16}{'JA' if im_kanal else '–':<7}{status:<8}{r['grund']}{mark}\n"
              f"{'':<31}{titel[:58]}", flush=True)
        if draft:
            print(f"{'':<31}↳ {BILDGEPRUEFT[pid]}", flush=True)

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
        tag = ("waffengesetz-verboten" if draft
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
          f"(nach Schweizer Waffenrecht verbotene Ware, bleibt im Katalog und ist "
          f"jederzeit wieder freischaltbar)", flush=True)


if __name__ == "__main__":
    main()
