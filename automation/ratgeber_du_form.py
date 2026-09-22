#!/usr/bin/env python3
"""Ratgeber (Blog-Artikel) und Seiten Sie → du — mit demselben Sicherheitsnetz wie die Produkttexte.

ANLASS (22.09.2026): 207 von 309 veröffentlichten Artikeln und 18 von 115 Seiten siezen noch
(Messung über articles/pages). Aufgabe 18 hatte nur zwei Ratgeber von Hand gewandelt.

Regeln: LIVE-Text holen, `um()` wandeln, Warnmuster prüfen (WARN/WARN2/warn3 aus
produkttexte_du_form) — ein Treffer → NICHT schreiben, Bericht `dropship/DU-FORM-VERDACHT.md`
(Abschnitt Ratgeber). Rechtstexte (AGB, Datenschutz, Impressum, Widerruf, Cookie) bleiben unberührt.
`articleUpdate` verlangt `HTML!` (Lehre 15.09.), `pageUpdate` `String`.

  DRY=1 (Standard) zeigen · FIX=1 schreiben · NUR=artikel|seiten
"""
import html as H, json, os, re, subprocess, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from kollektionstexte_du_form import um            # noqa: E402
from produkttexte_du_form import WARN, warn2, warn3, gql, SIE, text  # noqa: E402

FIX = os.environ.get("FIX") == "1"
NUR = os.environ.get("NUR", "")
LEDGER = os.path.join(REPO, "dropship", "_ratgeber_du_form_done.txt")
VERDACHT = os.path.join(REPO, "dropship", "DU-FORM-VERDACHT.md")
RECHT = re.compile(r"agb|datenschutz|impressum|widerruf|cookie|data-sharing|opt-out|rechtlich|privacy|terms|refund|shipping-policy|versandbedingungen|zahlungsbedingungen")


def alle(typ):
    cur, out = None, []
    while True:
        d = gql('query($c:String){%s(first:50,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle title body isPublished}}}' % typ, {"c": cur})
        t = d["data"][typ]; out += t["nodes"]
        if not t["pageInfo"]["hasNextPage"]:
            return out
        cur = t["pageInfo"]["endCursor"]


def main():
    done = set()
    if os.path.exists(LEDGER):
        done = {z.split("\t")[0] for z in open(LEDGER) if z.strip()}
    heute = time.strftime("%Y-%m-%d")
    verdacht, n_du, n_warn, n_skip, n_fehler = [], 0, 0, 0, 0
    for typ, mut, feld in (("articles", "articleUpdate", "article"), ("pages", "pageUpdate", "page")):
        if NUR and not typ.startswith(NUR[:4]):
            continue
        for o in alle(typ):
            key = f"{typ}:{o['handle']}"
            if key in done or not o["isPublished"] or RECHT.search(o["handle"]):
                continue
            alt = o["body"] or ""
            if not SIE.search(text(alt)):
                continue
            neu = um(alt); tn = text(neu)
            m = WARN.search(tn) or warn2(tn) or warn3(tn)
            if m:
                n_warn += 1; i = max(0, m.start() - 60)
                verdacht.append((key, m.group(0), tn[i:m.end() + 60])); continue
            if neu == alt:
                n_skip += 1; continue
            # Nur ANREDE zählt: ein grosses «Sie» mitten im Satz. Am Satzanfang («Sie ist wasserdicht», «Sie sollten
            # breit sein») ist es das Produkt/der Plural — 475 von 489 Resten am 22.09. waren genau das.
            rest = sum(1 for r in SIE.finditer(tn)
                       if r.start() > 0 and not re.search(r"[.!?:„»«\"]\s?$", tn[max(0, r.start() - 3):r.start()])
                       and not re.match(r"Sie (?:und|&|oder) Ihn\b", tn[r.start():r.start() + 14])
                       and not re.search(r"\b[Ff]ür[ -]$", tn[max(0, r.start() - 5):r.start()]))
            # Ratgeber sind lang: ein halb geduzter Artikel ist schlechter als ein gesiezter → nur schreiben,
            # wenn keine ANREDE mehr übrig ist (VOLL=1, Standard). Die halben landen im Bericht.
            if os.environ.get("VOLL", "1") == "1" and rest:
                n_warn += 1; verdacht.append((key, f"Rest {rest}× Sie", tn[:120])); continue
            if not FIX:
                print(f"  [DRY] {key[:60]:62s} Sie {len(SIE.findall(text(alt)))} → {rest}"); n_du += 1; continue
            try:
                typname = "HTML!" if typ == "articles" else "String!"
                r = gql('mutation($id:ID!,$b:%s){%s(id:$id,%s:{body:$b}){%s{id} userErrors{message}}}' % (typname, mut, feld, feld),
                        {"id": o["id"], "b": neu})
                pu = (r.get("data") or {}).get(mut) or {}
                if pu.get("userErrors") or not pu.get(feld):
                    n_fehler += 1; print(f"  FEHLER {key}: {pu.get('userErrors') or r.get('errors')}"); continue
                # Rücklesen
                q = 'query($id:ID!){node(id:$id){... on Article{body} ... on Page{body}}}'
                back = ((gql(q, {"id": o["id"]}).get("data") or {}).get("node") or {}).get("body")
                if back != neu:
                    n_fehler += 1; print(f"  FEHLER {key}: Rücklesen weicht ab"); continue
                n_du += 1
                with open(LEDGER, "a") as f:
                    f.write(f"{key}\t{heute}\t{'teilweise' if rest else 'du'}\n")
            except Exception as e:  # noqa: BLE001
                n_fehler += 1; print(f"  FEHLER {key}: {type(e).__name__}: {str(e)[:100]}")
            time.sleep(0.3)
    if verdacht:
        with open(VERDACHT, "a") as f:
            f.write(f"\n## Ratgeber/Seiten {heute} ({'DRY' if not FIX else 'FIX'}) — nicht geschrieben\n\n| Handle | Muster | Kontext |\n|---|---|---|\n")
            for k, mu, ctx in verdacht:
                f.write(f"| `{k}` | {mu} | …{ctx.replace('|', '/')}… |\n")
    print(f"RATGEBER-DU: {n_du} {'setzbar' if not FIX else 'geschrieben'} · {n_warn} Verdacht · {n_skip} ohne Wirkung · {n_fehler} Fehler")


if __name__ == "__main__":
    main()
