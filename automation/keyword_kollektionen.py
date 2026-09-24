#!/usr/bin/env python3
"""keyword_kollektionen.py — Lücken-Kollektionen aus dem Keywordplan (dropship/KEYWORDPLAN-2026-09.md, Abschnitt C3; 24.09.2026).

GEMESSEN 23.09. (Titelzähler `title:*x* status:active`, EXACT): Midikleid 142, Vorhang 58, Kratzbaum 41, Hundebett 23, Wanddeko 22,
Hängematte 15 — für jedes dieser Kaufkeywords (Google-Suggest Rang 1 für «kaufen»/«schweiz») gab es KEINE Landeseite; die Ware lag nur
in Sammelkollektionen (sub-kleider, kissen-wohntextilien, katzenwelt, hundewelt, sport-outdoor). Eine Smart-Collection mit Regel
TITLE CONTAINS ist die Landeseite, die das Keyword im Titel, im SEO-Titel und in der URL trägt.

Regeln des Hauses: du-Form, kein Eszett, keine CH-Lager-Zusage (CJ-Ware), «Gratis-Versand ab CHF 50» in der SEO-Beschreibung,
SEO-Titel ≤ 65, SEO-Beschreibung ≤ 155 (wie kollektionstexte_nachbessern.py). Publiziert in denselben Kanälen wie `katzenwelt`
(Online Store, Shop, TikTok, Facebook & Instagram, Google & YouTube, Pinterest — zur Laufzeit gelesen, nie geraten).
Nach dem Anlegen: `automation/kollektion_doppel.py` (DRY) — eine neue Kollektion darf keine bestehende Regel doppeln.

  python3 automation/keyword_kollektionen.py            # DRY: Zähler, Texte, Prüfungen — nichts geschrieben
  SCHARF=1 python3 automation/keyword_kollektionen.py   # anlegen (idempotent: vorhandene nur Text/SEO nachziehen), publizieren, rücklesen
"""
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kollektionstexte_nachbessern import gql  # noqa: E402

SCHARF = os.environ.get("SCHARF") == "1"
REFERENZ = "katzenwelt"   # Kanäle werden von dieser Kollektion übernommen
FUSS = ("<p>🚚 Lieferzeit auf jeder Produktseite · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · "
        "Kauf auf Rechnung mit Klarna · TWINT</p>")

PLAN = [
    dict(handle="midikleider", titel="Midikleider", regeln=["Midikleid"],
         text="<p>Midikleider für Damen: wadenlang, feminin und passend zu Sneakern wie zu Absätzen. Hier findest du Midikleider "
              "in vielen Farben und Schnitten – mit Print, in Uni, mit langen Ärmeln oder als Wickelkleid. Die Grössentabelle steht "
              "auf jeder Produktseite.</p>",
         seo_t="Midikleider kaufen | LuxeStyle Schweiz",
         seo_d="Midikleider für Damen online kaufen: mit Print, in Uni, Langarm oder als Wickelkleid bei LuxeStyle Schweiz. "
               "Gratis-Versand ab CHF 50, 30 Tage Rückgabe."),
    dict(handle="kratzbaeume", titel="Kratzbäume", regeln=["Kratzbaum"],
         text="<p>Kratzbäume für Katzen: vom kompakten Kratzbrett bis zum grossen Kletterbaum mit Höhle und Liegefläche. Sisal schont "
              "deine Möbel, Plüsch macht den Lieblingsplatz gemütlich. Masse und Belastbarkeit stehen auf jeder Produktseite.</p>",
         seo_t="Kratzbaum kaufen | LuxeStyle Schweiz",
         seo_d="Kratzbaum online kaufen: Kratzbretter bis grosse Kletterbäume mit Sisal und Höhle bei LuxeStyle Schweiz. "
               "Gratis-Versand ab CHF 50, 30 Tage Rückgabe."),
    dict(handle="hundebetten", titel="Hundebetten", regeln=["Hundebett"],
         text="<p>Hundebetten für kleine und grosse Hunde: weiche Kissen, Körbe mit Rand, orthopädische Matten und waschbare Bezüge. "
              "Achte auf die Liegemasse deines Hundes – sie stehen in jeder Produktbeschreibung.</p>",
         seo_t="Hundebett kaufen | LuxeStyle Schweiz",
         seo_d="Hundebett online kaufen: Kissen, Körbe mit Rand und orthopädische Matten für kleine und grosse Hunde bei "
               "LuxeStyle Schweiz. Gratis-Versand ab CHF 50."),
    dict(handle="vorhaenge", titel="Vorhänge", regeln=["Vorhang", "Gardine"],
         text="<p>Vorhänge und Gardinen für Wohnzimmer, Schlafzimmer und Bad: blickdicht oder transparent, mit Ösen oder Schlaufen, "
              "dazu Duschvorhänge und Türvorhänge. Die Masse stehen auf jeder Produktseite.</p>",
         seo_t="Vorhänge kaufen | LuxeStyle Schweiz",
         seo_d="Vorhänge online kaufen: blickdicht oder transparent, mit Ösen oder Schlaufen, dazu Dusch- und Türvorhänge bei "
               "LuxeStyle Schweiz. Gratis-Versand ab CHF 50."),
    dict(handle="wanddeko", titel="Wanddeko", regeln=["Wanddeko", "Wandbild", "Wandtattoo", "Wandbehang"],
         text="<p>Wanddeko für dein Zuhause: Wandbilder, Wandtattoos und Wandbehänge für Wohnzimmer, Flur und Schlafzimmer. "
              "Format und Material stehen auf jeder Produktseite.</p>",
         seo_t="Wanddeko kaufen | LuxeStyle Schweiz",
         seo_d="Wanddeko online kaufen: Wandbilder, Wandtattoos und Wandbehänge für Wohnzimmer, Flur und Schlafzimmer bei "
               "LuxeStyle Schweiz. Gratis-Versand ab CHF 50."),
    # nicht=[…]: TITLE NOT_CONTAINS, nur bei EINER Einschluss-Regel (UND-Menge) — Katzen-Hängematte und Yoga-Hängemattenstoff
    # standen in der ersten Lesung (24.09.) neben Garten-Hängematten.
    dict(handle="haengematten", titel="Hängematten", regeln=["Hängematte"], nicht=["Katze", "Yoga"],
         text="<p>Hängematten für Garten, Balkon und Reise: leichte Reise-Hängematten zum Aufhängen zwischen zwei Bäumen und "
              "Hängematten mit Gestell. Belastbarkeit und Masse stehen auf jeder Produktseite.</p>",
         seo_t="Hängematte kaufen | LuxeStyle Schweiz",
         seo_d="Hängematte online kaufen: Reise-Hängematten und Hängematten mit Gestell für Garten, Balkon und Camping bei "
               "LuxeStyle Schweiz. Gratis-Versand ab CHF 50."),
]


def pruefen(k):
    f = []
    for feld in ("titel", "text", "seo_t", "seo_d"):
        if "ß" in k[feld]:
            f.append(f"{feld}: Eszett")
        if re.search(r"\b(Sie|Ihnen|Ihr|Ihre)\b", k[feld]):
            f.append(f"{feld}: Sie-Anrede")
        if re.search(r"(?i)blitzversand|1–2 werktage|schweizer lager|ch-lager", k[feld]):
            f.append(f"{feld}: CH-Lager-Zusage")
    if len(k["seo_t"]) > 65:
        f.append(f"seo_t {len(k['seo_t'])} > 65")
    if len(k["seo_d"]) > 155:
        f.append(f"seo_d {len(k['seo_d'])} > 155")
    if "Gratis-Versand ab CHF 50" not in k["seo_d"]:
        f.append("seo_d ohne USP")
    norm = lambda t: t.lower().replace("ä", "a").replace("ö", "o").replace("ü", "u")   # Vorhang/Vorhänge, Kratzbaum/Kratzbäume
    if norm(k["regeln"][0])[:5] not in norm(k["seo_t"]):
        f.append("Hauptkeyword fehlt im SEO-Titel")
    return f


def zaehler(wort):
    r = gql('query($q:String!){ productsCount(query:$q, limit:null){count precision} }', {"q": f"status:active title:*{wort}*"})["productsCount"]
    return r["count"], r["precision"]


def kanaele():
    d = gql('query($h:String!){ collectionByHandle(handle:$h){ resourcePublications(first:10){ nodes{ isPublished publication{ id name } } } } }',
            {"h": REFERENZ})["collectionByHandle"]
    return [(n["publication"]["id"], n["publication"]["name"]) for n in d["resourcePublications"]["nodes"] if n["isPublished"]]


def anlegen(k, pubs):
    c = gql('query($h:String!){ collectionByHandle(handle:$h){ id title descriptionHtml seo{title description} ruleSet{appliedDisjunctively rules{column relation condition}} } }', {"h": k["handle"]})["collectionByHandle"]
    nicht = k.get("nicht") or []
    assert not (nicht and len(k["regeln"]) > 1), f"{k['handle']}: NOT_CONTAINS geht nur mit einer Einschluss-Regel (UND)"
    ruleset = {"appliedDisjunctively": len(k["regeln"]) > 1,
               "rules": [{"column": "TITLE", "relation": "CONTAINS", "condition": w} for w in k["regeln"]]
                        + [{"column": "TITLE", "relation": "NOT_CONTAINS", "condition": w} for w in nicht]}
    if not c:
        r = gql('mutation($i:CollectionInput!){ collectionCreate(input:$i){ collection{id} userErrors{field message} } }',
                {"i": {"title": k["titel"], "handle": k["handle"], "descriptionHtml": k["text"] + FUSS, "sortOrder": "BEST_SELLING",
                       "seo": {"title": k["seo_t"], "description": k["seo_d"]}, "ruleSet": ruleset}})["collectionCreate"]
        if r["userErrors"]:
            raise RuntimeError(f"{k['handle']}: {r['userErrors']}")
        cid = r["collection"]["id"]
        print(f"  ✓ angelegt {k['handle']} ({cid})")
    else:
        cid = c["id"]
        upd = {}
        if c["title"] != k["titel"]:
            upd["title"] = k["titel"]
        if (c.get("seo") or {}).get("title") != k["seo_t"] or (c.get("seo") or {}).get("description") != k["seo_d"]:
            upd["seo"] = {"title": k["seo_t"], "description": k["seo_d"]}
        if (c.get("descriptionHtml") or "") != k["text"] + FUSS:
            upd["descriptionHtml"] = k["text"] + FUSS
        live = c.get("ruleSet") or {}
        if bool(live.get("appliedDisjunctively")) != ruleset["appliedDisjunctively"] or \
           [(r["column"], r["relation"], r["condition"]) for r in live.get("rules", [])] != [(r["column"], r["relation"], r["condition"]) for r in ruleset["rules"]]:
            upd["ruleSet"] = ruleset
        if upd:
            r = gql('mutation($i:CollectionInput!){ collectionUpdate(input:$i){ userErrors{field message} } }', {"i": dict(upd, id=cid)})["collectionUpdate"]
            if r["userErrors"]:
                raise RuntimeError(f"{k['handle']} update: {r['userErrors']}")
            print(f"  ✓ nachgezogen {k['handle']}: {sorted(upd)}")
        else:
            print(f"  = unverändert {k['handle']}")
    # Per API angelegte Kollektionen sind NICHT automatisch im Onlineshop (Lehre 12.06.) → jeden Kanal einzeln prüfen + setzen
    fehlend = []
    for pid, name in pubs:
        p = gql('query($id:ID!,$p:ID!){ collection(id:$id){ p:publishedOnPublication(publicationId:$p) } }', {"id": cid, "p": pid})["collection"]["p"]
        if not p:
            fehlend.append({"publicationId": pid})
    if fehlend:
        r = gql('mutation($id:ID!,$i:[PublicationInput!]!){ publishablePublish(id:$id,input:$i){ userErrors{message} } }', {"id": cid, "i": fehlend})["publishablePublish"]
        if r["userErrors"]:
            raise RuntimeError(f"{k['handle']} publish: {r['userErrors']}")
        print(f"    publiziert in {len(fehlend)} Kanälen")
    return cid


def ruecklesen(k, cid):
    c = gql('query($id:ID!){ collection(id:$id){ handle productsCount{count} resourcePublicationsCount{count} seo{title} ruleSet{appliedDisjunctively rules{condition}} } }',
            {"id": cid})["collection"]
    n = gql('query($q:String!){ productsCount(query:$q, limit:null){count} }', {"q": f"collection_id:{cid.split('/')[-1]} status:active"})["productsCount"]["count"]
    print(f"    Rücklesen {c['handle']}: {c['productsCount']['count']} Mitglieder ({n} aktiv), {c['resourcePublicationsCount']['count']} Kanäle, "
          f"SEO «{c['seo']['title']}», Regeln {[r['condition'] for r in c['ruleSet']['rules']]} {'ODER' if c['ruleSet']['appliedDisjunctively'] else 'UND'}")
    return c["productsCount"]["count"]


def main():
    pubs = kanaele()
    print(f"{'SCHARF' if SCHARF else 'DRY'} · Kanäle von {REFERENZ}: {[n for _, n in pubs]}")
    fehler = 0
    for k in PLAN:
        f = pruefen(k)
        z = [(w,) + zaehler(w) for w in k["regeln"]]
        print(f"\n{k['handle']} «{k['titel']}» · Regel TITLE CONTAINS {' ODER '.join(k['regeln'])} · Titelzähler {[(w, n) for w, n, _ in z]}")
        print(f"  SEO {len(k['seo_t'])}/{len(k['seo_d'])} Zeichen · Text {len(re.sub('<[^>]+>', '', k['text']))} Zeichen")
        if f:
            print(f"  ✗ Prüfung: {f}"); fehler += 1; continue
        if sum(n for _, n, _ in z) < 10:
            print("  ⏭️ unter 10 aktive Titel — nicht angelegt"); continue
        if not SCHARF:
            continue
        cid = anlegen(k, pubs)
        time.sleep(3)
        if ruecklesen(k, cid) == 0:
            time.sleep(8)
            ruecklesen(k, cid)
    if fehler:
        sys.exit(f"{fehler} Kollektion(en) mit Textfehler — nichts davon angelegt")
    print("\nFERTIG")


if __name__ == "__main__":
    main()
