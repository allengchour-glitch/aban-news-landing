"""Setzt die Google-Merchant-Sperren durch — und zwar so oft, wie es nötig ist.

DER BEFUND (14.08.2026): `merchant_issue_fix.py` hatte am 09.08. 17 Produkte wegen von
Google SELBST gemeldeter Richtlinienverstösse aus dem Google-&-YouTube-Kanal genommen und
getaggt. Fünf Tage später standen 16 davon wieder drin (das 17., ein Hörgerät, war
inzwischen durch den Medizinprodukte-Guard auf DRAFT und damit ohnehin aus dem Kanal).

  google-gesperrt-adult    5   «Restricted adult content»
  google-gesperrt-cbd      3   «Illegal drugs» (CBD-Gesichtspflege InnovaGoods)
  google-gesperrt-notlage  8   «Personalized advertising: personal hardships»

WER SIE ZURÜCKGEHOLT HAT — aus den Ledgern belegt, nicht vermutet:
  14 × `gfeed_restore.py`           (Zeile «zurueck-im-google-kanal»)
   2 × `google_kanal_nachziehen.py` (Zeile «im-google-kanal»)
Beide prüfen vor dem Publizieren nur, ob das Produkt noch ACTIVE ist. Eine Kanal-Sperre bei
weiterhin verkäuflicher Ware sieht für sie aus wie ein Versehen. Beide lesen ab sofort
`google_sperrliste.py` — dieses Skript hier ist die Reparatur, nicht die Lösung.

PROBELAUF (DRY, 14.08.): 16 Kandidaten, 16 echte Treffer, 0 Fehltreffer. Es gibt hier
keine Wortmuster und keine Vermutung über Richtlinien — die Liste stammt Zeile für Zeile
aus dem Merchant-Center-Export, jede ID trägt zusätzlich den passenden Sperr-Tag live am
Produkt. Geprüft wurde jede ID einzeln über `resourcePublicationsV2`; nur wer wirklich in
Publication 302872297857 stand, wurde angefasst.

WAS BEWUSST NICHT PASSIERT: Kein Produkt wird gedraftet, keines gelöscht, keines aus dem
Onlineshop oder aus TikTok/Meta/Pinterest genommen. Im eigenen Shop darf all das verkauft
werden — es darf nur nicht über Google beworben werden.

⚠️ OFFEN FÜR DEN BETREIBER: «Personalized advertising: personal hardships» (8 Artikel:
Schwangerschaftskissen, Gehstock, Notfallknopf …) beschränkt bei Google streng genommen nur
die PERSONALISIERTE Werbung, nicht den kostenlosen Eintrag. Der Ausschluss aus dem ganzen
Kanal ist hier die vorsichtige Auslegung und kostet etwas Gratis-Reichweite. Das lässt sich
im Merchant Center genauer regeln; bis dahin gilt die vorsichtige Variante — der Kanal ist
der einzige mit belegten Verkäufen (52 Klicks, +206 %), eine Kontosperre wiegt schwerer.

Kann und soll wiederholt laufen: was schon draussen ist, wird gemeldet und nicht angefasst.

  DRY=1   meldet nur.
"""
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from google_sperrliste import (GOOGLE_PUB, GOOGLE_PUB_ID, LEDGER as SPERR_LEDGER,
                               gesperrte_ids, tag_gesperrt)

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
PROTOKOLL = "dropship/_merchant_sperre_durchgesetzt.txt"


def gql(q, v=None):
    """Gibt None zurück, wenn keine ECHTE Antwort kam.

    ⚠️ Eine gescheiterte Anfrage ist kein Ergebnis: würde sie als «nicht im Kanal»
    durchgehen, quittierte das Protokoll eine Sperre, die nie stattgefunden hat.
    """
    with open("/tmp/_msd.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_msd.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
        except Exception:
            pass
        time.sleep(4)
    return None


ABFRAGE = ('query($id:ID!){node(id:$id){... on Product{id title status tags '
           'resourcePublicationsV2(first:25){nodes{isPublished publication{id}}}}}}')


def main():
    if not os.path.exists(SPERR_LEDGER):
        print(f"⚠️ Sperr-Ledger {SPERR_LEDGER} fehlt — nichts zu tun.", flush=True)
        return
    grund = {}
    for zeile in open(SPERR_LEDGER, encoding="utf-8"):
        teile = zeile.rstrip("\n").split("\t")
        if teile and teile[0].strip():
            grund[teile[0].strip()] = teile[1] if len(teile) > 1 else "google-gesperrt"
    ids = sorted(gesperrte_ids())
    print(f"Sperrliste: {len(ids)} Produkte | DRY={DRY}", flush=True)

    raus = schon_draussen = nicht_aktiv = unklar = 0
    ohne_tag = []
    f = None if DRY else open(PROTOKOLL, "a", encoding="utf-8")
    for pid in ids:
        d = gql(ABFRAGE, {"id": f"gid://shopify/Product/{pid}"})
        if d is None:
            # Regel 6: keine Antwort ist nicht «keine Daten» — Fall bleibt offen.
            print(f"  ⚠️ {pid}: keine Antwort — bleibt offen für den nächsten Lauf", flush=True)
            unklar += 1
            continue
        n = (d.get("data") or {}).get("node")
        if not n:
            print(f"  ⚠️ {pid}: nicht gefunden (gelöscht?) — bleibt offen", flush=True)
            unklar += 1
            continue
        titel = (n.get("title") or "")[:52]
        drin = any(p["isPublished"] and p["publication"]["id"].endswith(GOOGLE_PUB_ID)
                   for p in n["resourcePublicationsV2"]["nodes"])
        if not tag_gesperrt(n.get("tags")):
            ohne_tag.append((pid, titel))
        if not drin:
            if n["status"] != "ACTIVE":
                nicht_aktiv += 1
            else:
                schon_draussen += 1
            continue
        print(f"  raus [{grund.get(pid, '?')}] {titel}", flush=True)
        if DRY:
            raus += 1
            continue
        r = gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,'
                'input:$p){userErrors{message}}}',
                {"id": n["id"], "p": [{"publicationId": GOOGLE_PUB}]})
        if r is None:
            print(f"     ⚠️ keine Antwort — bleibt offen", flush=True)
            unklar += 1
            continue
        e = ((r.get("data") or {}).get("publishableUnpublish") or {}).get("userErrors") or []
        if e:
            print(f"     ⚠️ {e[0].get('message')}", flush=True)
            unklar += 1
            continue
        # Tag notfalls nachtragen: ohne ihn greift nur noch der Ledger-Schutz.
        if not tag_gesperrt(n.get("tags")):
            gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}',
                {"id": n["id"], "t": [grund.get(pid, "google-gesperrt")]})
        raus += 1
        f.write(f"{time.strftime('%Y-%m-%d')}\t{pid}\t{grund.get(pid, '')}\t"
                f"erneut-aus-google-kanal\t{titel}\n")
        f.flush()          # Regel 5: nach JEDER Zeile
        time.sleep(0.25)
    if f:
        f.close()

    print(f"\n{'(DRY) ' if DRY else ''}FERTIG: {raus} aus dem Google-Kanal genommen, "
          f"{schon_draussen} waren schon draussen, {nicht_aktiv} nicht aktiv "
          f"(damit ohnehin aus dem Feed), {unklar} offen für den nächsten Lauf", flush=True)
    if ohne_tag:
        print(f"Ohne Sperr-Tag am Produkt (nur per Ledger geschützt): {len(ohne_tag)}", flush=True)
        for pid, t in ohne_tag[:10]:
            print(f"   {pid}  {t}", flush=True)


if __name__ == "__main__":
    main()
