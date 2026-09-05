#!/usr/bin/env python3
"""Wache über die fremde Social-Warteschlange (Shop-Metafeld luxestyle.social_queue, 05.09.2026).

Eine andere Session («Cloud-Redaktion», 06:00) füllt das Feld sieben Tage voraus, ein PC-Skript
(luxestyle-social/social-post.mjs) postet daraus täglich auf Instagram und legt den Eintrag in die
TikTok-Queue. Dieses Skript kennt KEINE der hiesigen Wachen (post_guard: Produkt-Ledger, Live-IG,
_SOCIAL_STOPP) und prüft die Ware beim Posten nicht. Es respektiert aber `status: "pausiert"`.

Genau dort setzt diese Wache an — sie MELDET (Standard) und PAUSIERT mit FIX=1 Einträge, die
  1. ein Produkt bewerben, das nicht ACTIVE / nicht im Onlineshop / im Preis abweichend ist,
  2. ein Risiko-Tag tragen (abgekündigt, nicht CH-versendbar, Heilaussage, Waffe, Lizenz, …),
  3. topische Kosmetik sind (Betreiber 30.08.: Cremes/Seren aus China nicht bewerben),
  4. laut Produkt-Ledger schon gepostet wurden (Doppelpost-Regel, 7 Schichten seit 12.07.),
  5. eine Aussage tragen, die für DIESES Produkt falsch ist (CH-Lager, 1–2 Tage, «Link in Bio», #fyp),
  6. ein Bild verlinken, das nicht antwortet.
Pausieren ist umkehrbar (status zurück auf «bereit»); der Grund steht im Eintrag (`grund`).
Bericht: dropship/SOCIAL-QUEUE-WACHE.md (nur bei Befund, sonst gelöscht).
Regel dahinter: Ein zweiter Poster mit eigenem Ledger ist die Doppelpost-Klasse vom 26.07. —
wer ihn nicht abschalten kann, prüft wenigstens seine Eingabe.
"""
import json, os, re, ssl, sys, urllib.request, datetime, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from gfeed_restore import lieferantenref          # EINE Regel für die SKU-Form (Lehre 11.08.)
except Exception:                                      # Import darf die Wache nie verhindern
    def lieferantenref(sku):
        s = (sku or "").strip(); kern = re.sub(r"^cj-", "", s, flags=re.I)
        return bool(s) and bool(re.match(r"^(CJ[A-Z]{2}[0-9A-Z]{6,}|\d{9,}|[0-9a-f]{8}-)", kern, re.I) or re.match(r"^(bb[-_]?[SV0-9]|fortura|LX[-_]|LXSCH[-_]|\d+_\d+)", s, re.I))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOK = open("/tmp/cj_shop_token.txt").read().strip()
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
FIX = os.environ.get("FIX") == "1"
BERICHT = os.path.join(ROOT, "dropship", "SOCIAL-QUEUE-WACHE.md")
HEUTE = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

RISIKO = {"cj-abgekuendigt", "cj-nicht-versendbar-ch", "medizinprodukt-pruefen", "heilaussage-pruefen",
          "waffengesetz-verboten", "verdeckte-ueberwachung", "abhoergeraet-pruefen", "lizenz-risiko",
          "nicht-bewerben", "nur-onlineshop", "niedrig-bewertet-nicht-bewerben", "marge-verlust-draft",
          "duplikat-auto-draft", "preis-pruefen-cj-spanne", "keine-lieferanten-ref", "ausverkauft-lieferant",
          "regulatorisch-pruefen", "klinge-ch-unverifiziert", "lizenz-nicht-bewerben", "ghost-sale-schutz-bb-draft",
          "18plus", "raucher", "outdoor-messer"}
# topische Kosmetik (Betreiber 30.08.): Creme/Serum/Lotion/Maske — Geräte (Bürste, Roller, LED) nicht
KOSMETIK = re.compile(r"\b(creme|crème|serum|lotion|gesichtsmaske|tuchmaske|peeling|toner|essenz)\b", re.I)
# Aussagen, die nur für CH-Lager-Ware wahr sind, plus Scam-Signale
FALSCH_OHNE_CHLAGER = re.compile(r"(ch-lager|schweizer lager|schwiizer lager|ab lager|1\s*[–-]\s*2\s*(tag|täg|werktag)|aus der schweiz|us de schwiiz|us dr schwiiz)", re.I)
IMMER_FALSCH = re.compile(r"(link in (der )?bio|#fyp\b|#foryou\b|#viral\b)", re.I)


def gql(q, v=None):
    req = urllib.request.Request("https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                                 data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                 headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
    for i in range(6):
        try:
            d = json.loads(urllib.request.urlopen(req, context=CTX, timeout=60).read())
        except Exception as e:
            if i == 5:
                raise
            import time; time.sleep(3 * (i + 1)); continue
        if d.get("errors") and "Throttled" in json.dumps(d["errors"]):
            import time; time.sleep(4); continue
        return d
    return d


def produkt_keys(handle, titel, pid):
    """Dieselbe Ableitung wie post_guard.produktKey — name aus « », sonst pid, sonst Slug ohne Ziffernende."""
    keys = set()
    m = re.search(r"[«\"„]([^»\"“]{2,40})[»\"“]", titel or "")
    if m:
        keys.add("name:" + re.sub(r"[^a-zäöüß0-9]", "", m.group(1).lower()))
    if pid:
        keys.add("pid:" + str(pid))
    slug = re.sub(r"-\d{6,}$", "", (handle or "").lower())
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    if len(slug) >= 6:
        keys.add("slug:" + slug)
    return keys


def ledger():
    p = os.path.join(ROOT, "dropship", "_posted_produkte.txt")
    try:
        return {l.strip() for l in open(p) if l.strip()}
    except FileNotFoundError:
        return set()


def bild_antwortet(url):
    try:
        r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--cacert",
                            "/root/.ccr/ca-bundle.crt", "-I", "--max-time", "20", url], capture_output=True, text=True)
        return r.stdout.strip() == "200"
    except Exception:
        return True   # Netzfehler ist kein Befund


def main():
    d = gql('{ shop { id metafield(namespace:"luxestyle", key:"social_queue") { value updatedAt } } }')["data"]["shop"]
    mf = d.get("metafield")
    if not mf:
        print("KEIN Metafeld luxestyle.social_queue — nichts zu prüfen"); return
    q = json.loads(mf["value"])
    gepostet = ledger()
    befunde, geprueft = [], 0
    for e in q.get("eintraege", []):
        if e.get("status") == "gepostet":
            continue
        if e.get("status") == "pausiert" and e.get("wache"):
            continue   # von uns pausiert — bleibt, bis ein Mensch es zurücksetzt
        geprueft += 1
        h = e.get("handle", ""); gruende = []
        p = gql('query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status tags '
                'priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}} '
                'resourcePublicationsV2(first:8){nodes{publication{name} isPublished}} variants(first:10){nodes{sku}} } }', {"h": h})["data"]["productByIdentifier"]
        if not p:
            gruende.append(f"Produkt «{h}» existiert nicht (exakter Handle)")
        else:
            if p["status"] != "ACTIVE":
                gruende.append(f"Produkt ist {p['status']}")
            kan = {n["publication"]["name"] for n in p["resourcePublicationsV2"]["nodes"] if n["isPublished"]}
            if not ({"Online Store", "Onlineshop"} & kan):
                gruende.append("nicht im Onlineshop veröffentlicht")
            try:
                pr = float(p["priceRangeV2"]["minVariantPrice"]["amount"])
                if abs(pr - float(str(e.get("preis", "0")).replace("'", ""))) > 0.01:
                    gruende.append(f"Preis in der Queue {e.get('preis')} ≠ live {pr:.2f}")
            except ValueError:
                gruende.append(f"Preis unlesbar: {e.get('preis')!r}")
            tags = {t.lower() for t in p.get("tags") or []}
            r = sorted(tags & RISIKO)
            if r:
                gruende.append("Risiko-Tag: " + ", ".join(r))
            if KOSMETIK.search(p["title"] or ""):
                gruende.append("topische Kosmetik — wird nicht beworben (Betreiber 30.08.)")
            # Ohne prüfbare Lieferanten-Referenz ist die Ware nicht bestellbar (#1008-Klasse) — die
            # handkuratierte Ur-Ware (JADE-SET-001, WALLET-BLK …) trägt bild-ok und erfundenen Bestand.
            skus = [v["sku"] for v in p["variants"]["nodes"]]
            if not any(lieferantenref(x) for x in skus):
                gruende.append("keine prüfbare Lieferanten-Referenz (SKU " + ", ".join(str(x) for x in skus[:3]) + ") — nicht bestellbar, nicht bewerben")
            keys = produkt_keys(p["handle"], p["title"], p["id"].rsplit("/", 1)[-1])
            if keys & gepostet:
                gruende.append("laut Produkt-Ledger schon gepostet: " + ", ".join(sorted(keys & gepostet)))
            texte = " ".join(str(e.get(k, "")) for k in ("captionTiktok", "captionInstagram"))
            if "ch-lager" not in tags and FALSCH_OHNE_CHLAGER.search(texte):
                gruende.append("Caption behauptet Schweizer Lager/1–2 Tage — Produkt ist Direktversand (10–20 Werktage)")
            m = IMMER_FALSCH.search(texte)
            if m:
                gruende.append(f"Caption trägt «{m.group(0)}» (kein Bio-Link / Massen-Tag)")
        if e.get("bild") and not bild_antwortet(e["bild"]):
            gruende.append("Bild-URL antwortet nicht mit 200")
        if gruende:
            befunde.append((e, gruende))
            if FIX:
                e["status"] = "pausiert"
                e["grund"] = " · ".join(gruende)
                e["wache"] = f"cloud-tztnn1 {HEUTE}"
    print(f"geprüft: {geprueft} · Befunde: {len(befunde)} · FIX={'1' if FIX else '0'}")
    for e, g in befunde:
        print(f"⛔ {e.get('datum')} {e.get('handle')}: " + " · ".join(g))
    if befunde and FIX:
        r = gql('mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{key updatedAt} userErrors{field message} } }',
                {"m": [{"ownerId": d["id"], "namespace": "luxestyle", "key": "social_queue", "type": "json",
                        "value": json.dumps(q, ensure_ascii=False)}]})
        ue = r["data"]["metafieldsSet"]["userErrors"]
        print("Metafeld geschrieben" if not ue else f"FEHLER beim Schreiben: {ue}")
    if befunde:
        with open(BERICHT, "w") as fh:
            fh.write(f"# Social-Queue-Wache — Stand {HEUTE} (UTC)\n\n"
                     "Einträge der fremden Warteschlange `luxestyle.social_queue`, die so nicht rausgehen dürfen. "
                     f"{'Pausiert (status: pausiert, Grund im Eintrag).' if FIX else 'NUR gemeldet (FIX=1 pausiert).'}\n\n")
            for e, g in befunde:
                fh.write(f"- **{e.get('datum')}** `{e.get('handle')}` — {e.get('titel')}\n")
                for x in g:
                    fh.write(f"  - {x}\n")
    elif os.path.exists(BERICHT):
        os.remove(BERICHT)
    print("FERTIG")


if __name__ == "__main__":
    main()
