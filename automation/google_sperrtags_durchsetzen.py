"""Setzt die Google-Ausschluss-Tags durch — unabhängig vom Anlegedatum.

Befund 23.09.2026 (Audit): 152 Suchtreffer, davon 87 mit einem exakten Tag aus
google_sperrliste.AUSSCHLUSS_TAGS standen im Google-Kanal (nicht-google-bewerben 33 von 34,
google-policy-flag 32/33, raucher 32/65, 18plus 28/56 …). Der Entscheid war getroffen, aber
nicht durchgesetzt: google_kanal_saeubern läuft im Aufseher mit SEIT=7 und prüft damit nur
Produkte der letzten sieben Tage — seit der Grind-Pause (05.09.) also keins mehr.
merchant_sperre_durchsetzen kennt nur 17 feste IDs.

Dieser Wächter fragt direkt «aktiv UND im Google-Kanal UND Sperr-Tag» und nimmt die Treffer
aus Google. Tags, die jede Bewerbung ausschliessen (Erotik, Rauch, 18+, nicht-bewerben …),
nehmen das Produkt zusätzlich aus den übrigen Werbekanälen (TikTok, Facebook & Instagram,
Pinterest) — dieselbe Hausregel wie in google_kanal_saeubern (29.08.). Onlineshop, Shop-App
und POS bleiben unberührt: die Ware bleibt kaufbar.

Rücklesen: publishedOnPublication je Kanal. DRY=1 zeigt nur.
"""
import json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import google_sperrliste as gs  # noqa: E402
try:
    from eimer_etikette import nachlauf  # noqa: E402
except Exception:  # pragma: no cover
    def nachlauf(d):
        return None

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_google_sperrtags_durchgesetzt.txt"
GOOGLE = "gid://shopify/Publication/302872297857"
WERBUNG = {
    "TikTok": "gid://shopify/Publication/302032716161",
    "Facebook & Instagram": "gid://shopify/Publication/302566834561",
    "Pinterest": "gid://shopify/Publication/302994456961",
}
# Tags, deren Grund für JEDE Bewerbung gilt, nicht nur für Google.
ALLE_WERBEKANAELE = {"nicht-bewerben", "18plus", "erotik", "raucher", "smoke-zubehoer",
                     "adult-nicht-bewerben", "gmc-adult-pull", "waffengesetz-verboten",
                     "verdeckte-ueberwachung", "messer-nicht-bewerben"}


def gql(q, v=None):
    for versuch in range(6):
        r = subprocess.run(["curl", "-s", "-m", "60", "-X", "POST",
                            "https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(5)
            continue
        if any("THROTTLED" in json.dumps(e) for e in d.get("errors") or []):
            time.sleep(10)
            continue
        nachlauf(d)
        return d
    raise SystemExit("ABBRUCH: Shopify antwortet nicht")


def kandidaten():
    tags = " OR ".join(f"tag:'{t}'" for t in sorted(gs.AUSSCHLUSS_TAGS))
    q = f"status:active AND publication_ids:{GOOGLE.rsplit('/', 1)[1]} AND ({tags})"
    # Kanarienvogel: ein Tag, den es nicht gibt, muss 0 ergeben — sonst ignoriert Shopify den Filter.
    kan = gql("query($q:String){productsCount(query:$q,limit:null){count}}",
              {"q": f"status:active AND publication_ids:{GOOGLE.rsplit('/', 1)[1]} AND tag:'zzz-kanarienvogel-xyz'"})
    if kan["data"]["productsCount"]["count"] != 0:
        raise SystemExit("ABBRUCH: Tag-Filter wird ignoriert (Kanarienvogel > 0)")
    raus, nach = [], None
    while True:
        d = gql("""query($q:String,$n:String){products(first:100,after:$n,query:$q){
          pageInfo{hasNextPage endCursor} nodes{id handle title tags}}}""", {"q": q, "n": nach})
        p = d["data"]["products"]
        raus += p["nodes"]
        if not p["pageInfo"]["hasNextPage"]:
            return raus
        nach = p["pageInfo"]["endCursor"]


def main():
    roh = kandidaten()
    # Shopifys tag:'kostuem' trifft auch «kostuem-hut» (Plüschmützen, 65 am 23.09.) — die Suche
    # ist nur der Vorfilter, entschieden wird am exakten Tag.
    ks = [p for p in roh if gs.ausschluss_tag(p["tags"])]
    print(f"{len(roh)} Suchtreffer, {len(ks)} mit exaktem Ausschluss-Tag im Google-Kanal")
    ok = fehl = 0
    for p in ks:
        tg = {t.lower() for t in p["tags"]}
        grund = gs.ausschluss_tag(p["tags"])
        kanaele = {"Google & YouTube": GOOGLE}
        if tg & ALLE_WERBEKANAELE:
            kanaele.update(WERBUNG)
        print(f"  {grund[:40]:40} {len(kanaele)} Kan. | {p['title'][:70]}")
        if DRY:
            continue
        d = gql("""mutation($id:ID!,$in:[PublicationInput!]!){publishableUnpublish(id:$id,input:$in){
                  userErrors{message}}}""",
                {"id": p["id"], "in": [{"publicationId": v} for v in kanaele.values()]})
        fe = (d.get("data") or {}).get("publishableUnpublish", {}).get("userErrors") or d.get("errors")
        chk = gql("query($id:ID!,$g:ID!){product(id:$id){publishedOnPublication(publicationId:$g)}}",
                  {"id": p["id"], "g": GOOGLE})
        noch = chk["data"]["product"]["publishedOnPublication"]
        if fe or noch:
            fehl += 1
            print(f"    ⚠️ nicht raus: {fe or 'noch publiziert'}")
            continue
        ok += 1
        with open(LEDGER, "a") as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{p['id']}\t{grund}\t"
                    f"{'+'.join(kanaele)}\t{p['handle']}\n")
    print(f"FERTIG: {ok} aus Werbekanälen genommen, {fehl} Fehler{' (DRY)' if DRY else ''}")


if __name__ == "__main__":
    main()
