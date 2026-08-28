#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""google_kanal_luecke_schliessen.py — publiziert nachträglich, was der Publish-Ausfall verloren hat.

WARUM ÜBERHAUPT NACHPUBLIZIEREN:
Die Ursache des Google-Schwunds ist seit dem 22.08.2026 bekannt und belegt. Die
Ereignisliste eines Einzelfalls (Polohemd 15508310557057) zeigt lückenlos:
  «included on Online Store» 02:11:21 · «Shop» 02:11:21 · «TikTok» 02:11:22 ·
  «Facebook & Instagram» 02:11:23 · «Pinterest» 02:11:24
— Google & YouTube fehlt, und es gibt auch KEIN «removed». Das Produkt wurde also nie
publiziert, nicht später entfernt. `cj_sku_import.mjs` und `cj_trending_import.mjs` riefen
`publishablePublish` auf, ohne die Antwort je zu lesen; fiel eine einzelne Publikation aus,
landete das Produkt in fünf von sechs Kanälen. Beide haben inzwischen `publishVerified()`.

Der ALTBESTAND wird davon nicht geheilt. Das ist die Aufgabe hier — aber nur für Ware, die
die Google-Regeln auch wirklich besteht. Ein Fehlgriff im Google-Kanal riskiert die
Merchant-Sperre, also genau den Kanal, der als einziger verkauft.

⚠️ DESHALB PUBLIZIERT DIESES SKRIPT NIE PAUSCHAL. Es prüft JEDES Produkt LIVE gegen
dieselben Regeln wie `google_kanal_nachziehen.py` (heikle Ware, Code im Titel, fehlende
Lieferanten-SKU, Bild, Preis) PLUS die Sperr-Tags und die Klingen-Hausregel — und es fasst
nur Produkte an, die der Wächter `google_kanal_luecke.py` als unerklärte Lücke gemeldet hat.
Alles andere bleibt draussen; ein bewusster Ausschluss ist kein Fehler.

DRY=1 zeigt nur das Urteil je Produkt (Standard-Empfehlung: erst DRY lesen, dann scharf).
IDS=<datei> liest eine Liste von Produkt-IDs (eine je Zeile, GID oder Zahl).
Ohne IDS liest es die IDs aus dem Bericht des Wächters.
"""
import json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from google_sperrliste import gesperrte_ids, id_zahl, ausschluss_tag

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
GOOG = "gid://shopify/Publication/302872297857"
BERICHT = "dropship/GOOGLE-KANAL-LUECKE.md"
LEDGER = "dropship/_google_kanal_luecke_geschlossen.txt"
DRY = os.environ.get("DRY") == "1"

# Wortgleich mit google_kanal_nachziehen.py — zwei Listen, die auseinanderlaufen, wären
# eine eigene Fehlerklasse (dieselbe Lehre wie bei der viermal kopierten Farbtabelle).
HEIKEL = re.compile(
    r'kost[üu]m|verkleid|fasnacht|halloween|per[üu]cke|maske\b|tutu\b|hexe|vampir|zombie|clown|'
    r'dessous|reizw|erotik|18\+|generalüberholt|restauriert|refurb|ersatzteil|ersatzkopf|'
    r'messer|dolch|machete|waffe|munition|armbrust|'
    r'shisha|wasserpfeife|bong\b|vape|e-?zigarette|tabak|zigarre|grinder\b|cbd\b', re.I)
CODE = re.compile(r'\b[A-Z]{2,}\d{3,}\b|\b[A-Z0-9]{8,}\b|\bUS Size\b|\bYards\b|Generation \d')
# ⚠️ 28.08.2026 — DIE SPERR-MENGE STAND HIER UND IM WÄCHTER WORTGLEICH und war in beiden
# unvollständig: elf am Produkt begründete Ausschluss-Tags fehlten (verdeckte-ueberwachung,
# google-policy-flag, nicht-google-bewerben, gmc-adult-pull, messer-nicht-bewerben …), und
# `google-gesperrt-*` — von GOOGLE SELBST gemeldete Verstösse — fiel durch beide Prüfungen
# hindurch, obwohl `google_sperrliste.py` seit dem 14.08. genau dafür existiert. Dieses
# Skript publiziert; ohne den Riegel hätte es zwölf versteckte Kameras und die 16
# Merchant-Fälle in den einzigen Kanal gestellt, der verkauft. Liste jetzt an EINER Stelle.
KLINGE = re.compile(r"\b(messer|klinge\w*|dolch|machete|axt|beil|schwert|katana)", re.I)
KLINGE_AUSN = re.compile(r"jeans|kleid|hose|shirt|hoodie|wasch|deko|figur|anhänger|"
                         r"halskette|ohrring|spielzeug|plüsch|kostüm", re.I)
# ⚠️ Heilversprechen und Messaussagen sind bei Google ein eigener Sperrgrund und tauchen in
# HEIKEL nicht auf — die Liste dort zielt auf Warengruppen, nicht auf Aussagen.
AUSSAGE = re.compile(r"blutzucker|blutdruck|\bEKG\b|harnsäure|blutfett|heilt\b|therapie", re.I)


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for i in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if d.get("errors") and "THROTTL" in json.dumps(d["errors"]).upper():
                time.sleep(4 + i * 3); continue
            if d.get("errors"):
                print("  GraphQL-Fehler:", json.dumps(d["errors"])[:170], flush=True)
                return None
        except Exception:
            pass
        time.sleep(3 + i * 2)
    return None


def lieferantenref(sku):
    s = (sku or "").strip()
    if not s:
        return False
    if "_" in s and s.split("_")[0].isdigit():
        return True                                    # Printful
    return bool(re.match(r'^(CJ|bb|fortura|LX|LXSCH)', s, re.I))


# Einmal geladen, nicht je Produkt: das Merchant-Ledger ist die zweite Quelle neben dem
# Tag am Produkt (ein Tag kann versehentlich entfernt werden, die Ledger-Zeile bleibt).
GESPERRT = gesperrte_ids()


def urteil(p):
    """Gibt None zurück, wenn das Produkt publiziert werden darf, sonst den Grund."""
    titel = p.get("title") or ""
    typ = p.get("productType") or ""
    vs = (p.get("variants") or {}).get("nodes") or []
    sku = (vs[0].get("sku") if vs else "") or ""
    bilder = (p.get("mediaCount") or {}).get("count") or 0
    try:
        preis = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
    except Exception:
        preis = 0.0
    if id_zahl(p.get("id")) in GESPERRT:
        return "von Google gemeldeter Verstoss (Merchant-Sperrliste)"
    grund = ausschluss_tag(p.get("tags"))
    if grund:
        return "Sperr-Tag: " + grund
    if HEIKEL.search(titel) or HEIKEL.search(typ):
        return "heikle Ware"
    if KLINGE.search(titel) and not KLINGE_AUSN.search(titel):
        return "Klingen-Hausregel"
    if AUSSAGE.search(titel):
        return "Mess-/Heilaussage im Titel"
    if CODE.search(titel):
        return "Code im Titel"
    if not lieferantenref(sku):
        return "keine Lieferanten-SKU"
    if bilder < 1:
        return "ohne Bild"
    if preis <= 0:
        return "ohne Preis"
    return None


def ids_lesen():
    quelle = os.environ.get("IDS")
    text = open(quelle).read() if quelle else (
        open(BERICHT).read() if os.path.exists(BERICHT) else "")
    roh = re.findall(r"(\d{10,})", text)
    return ["gid://shopify/Product/" + r for r in dict.fromkeys(roh)]


def main():
    ids = ids_lesen()
    if not ids:
        print("keine IDs gefunden — nichts zu tun")
        print("FERTIG")
        return
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {l.split("\t")[0] for l in open(LEDGER)}
    offen = [i for i in ids if i not in erledigt]
    print(f"{len(ids)} gemeldet · {len(offen)} noch offen", flush=True)

    frei, blockiert, schon = [], [], 0
    for i in range(0, len(offen), 20):
        teil = offen[i:i + 20]
        q = ('query($ids:[ID!]!){nodes(ids:$ids){... on Product{id title status productType tags '
             'mediaCount{count} priceRangeV2{minVariantPrice{amount}} '
             'variants(first:1){nodes{sku}} '
             'resourcePublications(first:10){nodes{isPublished publication{id name}}}}}}')
        d = gql(q, {"ids": teil})
        if d is None:
            # ⚠️ Eine ausgefallene Abfrage ist KEIN Ergebnis. Wer hier weitermacht,
            # hält ein Netzproblem für ein sauberes Urteil (Lehre 21.08.2026).
            print("PAUSE (Shopify antwortet nicht) — nichts publiziert")
            return
        for p in d["data"]["nodes"]:
            if not p:
                continue
            if p.get("status") != "ACTIVE":
                blockiert.append((p["id"], p.get("title", ""), "nicht ACTIVE"))
                continue
            pubs = {n["publication"]["id"]: n["isPublished"]
                    for n in p["resourcePublications"]["nodes"]}
            if pubs.get(GOOG):
                schon += 1
                continue
            g = urteil(p)
            (blockiert if g else frei).append((p["id"], p["title"], g or ""))
        time.sleep(1)

    print(f"\nschon bei Google: {schon}")
    print(f"bleibt draussen:  {len(blockiert)}")
    for _, t, g in blockiert:
        print(f"   ⛔ {t[:58]:58} — {g}")
    print(f"\nzum Publizieren:  {len(frei)}")
    for _, t, _ in frei:
        print(f"   ✅ {t[:70]}")

    if DRY:
        print("\n(DRY=1 — nichts publiziert)")
        print("FERTIG")
        return

    # Auch das NEIN gehoert ins Ledger. Ein Produkt, das hier begruendet draussen bleibt,
    # traegt keinen Tag — steht der Grund nur im Terminal, meldet der Waechter es morgen
    # erneut als unerklaerte Luecke. (Dieselbe Klasse wie der /tmp-Cursor in
    # google_feed_cull.py: eine bewusste Entscheidung, die nirgends nachlesbar ist.)
    for pid, titel, g in blockiert:
        if pid.split("/")[-1] in erledigt or pid in erledigt:
            continue
        with open(LEDGER, "a") as f:
            f.write(f"{pid}\tbleibt-draussen:{g}\t{titel[:60]}\n")

    gesetzt = 0
    for pid, titel, _ in frei:
        # ⚠️ MIT QUITTUNG. Genau das Fehlen einer Antwortprüfung hat diese Lücke erzeugt —
        # sie hier zu wiederholen wäre der teuerste Fehler dieses Skripts.
        d = gql('mutation($id:ID!,$in:[PublicationInput!]!){publishablePublish(id:$id,input:$in)'
                '{userErrors{message}}}', {"id": pid, "in": [{"publicationId": GOOG}]})
        fehler = (((d or {}).get("data") or {}).get("publishablePublish") or {}).get("userErrors")
        if d is None or fehler is None or fehler:
            print(f"   ⚠️ nicht publiziert: {titel[:50]} — {json.dumps(fehler)[:80] if fehler else 'keine Antwort'}")
            time.sleep(2)
            continue
        with open(LEDGER, "a") as f:
            f.write(f"{pid}\tpubliziert\t{titel[:60]}\n")
        gesetzt += 1
        time.sleep(1)
    print(f"\n{gesetzt} Produkte im Google-Kanal nachpubliziert")
    print("FERTIG")


if __name__ == "__main__":
    main()
