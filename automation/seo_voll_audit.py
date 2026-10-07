#!/usr/bin/env python3
"""seo_voll_audit.py — die Prüfungen des Semrush-Site-Audits über ALLE aktiven Produkte (04.10.2026).

Betreiber: «semrush push · überprüf alle produkten und fix». Semrush crawlt im Projekt nur 100 Seiten und eine
Audit-Übersicht kostet 10'000 Einheiten — für 50'000 Produkte rechnen wir dieselben Klassen lokal auf einem
Bulk-Export (kostet nichts). Klassen (Semrush-ID in Klammern):
  titel_doppelt (6)        gleicher wirksamer Seitentitel (seo.title, sonst Produkttitel) auf mehreren Produkten
  meta_doppelt (15)        gleiche Meta-Beschreibung auf mehreren Produkten
  h1_im_text (104)         <h1> im Produkttext → zwei H1 (das Theme gibt den Produkttitel schon als H1 aus)
  meta_leer (106)          seo.description leer UND Text leer → keine Beschreibung
  titel_lang / meta_lang   wirksamer Titel > 70 / Meta > 160 Zeichen (Google schneidet)
  text_duenn (223/112)     < 40 Wörter Produkttext
  alt_leer                 Hauptbild ohne Alt-Text
Schreibt NICHTS im Shop. Ausgabe: dropship/SEO-VOLL-AUDIT.md + /tmp/seo_voll_audit.json (Handles je Klasse).
  python3 automation/seo_voll_audit.py            (neuer Bulk-Export)
  CACHE_NUTZEN=1 python3 automation/seo_voll_audit.py
"""
import collections, html, json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = "/tmp/seo_voll_export.jsonl"
BERICHT = os.path.join(REPO, "dropship/SEO-VOLL-AUDIT.md")
BULK = ('{ products(query: "status:active") { edges { node { id handle title onlineStoreUrl productType '
        'seo { title description } descriptionHtml featuredMedia { alt } } } } }')


def export():
    for _ in range(40):                       # nur EINE Bulk-Abfrage je Shop gleichzeitig
        s = gql("{ currentBulkOperation(type: QUERY) { status } }")["currentBulkOperation"]
        if not s or s["status"] not in ("CREATED", "RUNNING"):
            break
        print("   wartet auf fremde Bulk-Abfrage …", flush=True); time.sleep(30)
    m = gql('mutation { bulkOperationRunQuery(query: """%s""") { bulkOperation { id } userErrors { message } } }' % BULK)
    if m["bulkOperationRunQuery"]["userErrors"]:
        raise SystemExit(f"Bulk-Start fehlgeschlagen: {m}")
    bid = m["bulkOperationRunQuery"]["bulkOperation"]["id"]   # 07.10.2026: eigene ID (Gehirn-Regel fremder-bulk)
    while True:
        time.sleep(15)
        b = gql('query($i:ID!){node(id:$i){... on BulkOperation{id status objectCount url errorCode}}}', {"i": bid})["node"]
        print("   bulk:", b["status"], b["objectCount"], flush=True)
        if b["status"] == "COMPLETED":
            subprocess.run(["curl", "-sS", "-o", CACHE, b["url"]], check=True)
            return
        if b["status"] in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"Bulk {b['status']}")


def text(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h or ""))).strip()


def main():
    if not (os.environ.get("CACHE_NUTZEN") == "1" and os.path.exists(CACHE)):
        export()
    ps = [json.loads(z) for z in open(CACHE)]
    ps = [p for p in ps if "handle" in p and p.get("onlineStoreUrl")]
    eff_t = {p["handle"]: ((p.get("seo") or {}).get("title") or p["title"]).strip() for p in ps}
    eff_d = {p["handle"]: ((p.get("seo") or {}).get("description") or text(p.get("descriptionHtml"))[:320]).strip()
             for p in ps}
    tz = collections.Counter(v.lower() for v in eff_t.values())
    dz = collections.Counter(v.lower() for v in eff_d.values() if v)
    klassen = collections.defaultdict(list)
    for p in ps:
        h, t, d, html_ = p["handle"], eff_t[p["handle"]], eff_d[p["handle"]], p.get("descriptionHtml") or ""
        seo = p.get("seo") or {}
        if tz[t.lower()] > 1: klassen["titel_doppelt"].append(h)
        if d and dz[d.lower()] > 1: klassen["meta_doppelt"].append(h)
        if re.search(r"<h1[\s>]", html_, re.I): klassen["h1_im_text"].append(h)
        if not d: klassen["meta_leer"].append(h)
        if len(t) > 70: klassen["titel_lang"].append(h)
        if seo.get("description") and len(seo["description"]) > 160: klassen["meta_lang"].append(h)
        if len(text(html_).split()) < 40: klassen["text_duenn"].append(h)
        if not ((p.get("featuredMedia") or {}).get("alt") or "").strip(): klassen["alt_leer"].append(h)
    json.dump({"stand": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "n": len(ps), **klassen},
              open("/tmp/seo_voll_audit.json", "w"), ensure_ascii=False)
    gruppen_t = [(k, v) for k, v in tz.most_common(15) if v > 1]
    gruppen_d = [(k, v) for k, v in dz.most_common(10) if v > 1]
    md = [f"# SEO-Voll-Audit · {time.strftime('%d.%m.%Y %H:%M', time.gmtime())} UTC", "",
          f"Aktive Produkte im Onlineshop: **{len(ps)}** · Prüfungen wie Semrush Site Audit, lokal gerechnet.", "",
          "| Klasse | Produkte | Beispiele |", "|---|---:|---|"]
    for k in ("titel_doppelt", "meta_doppelt", "h1_im_text", "meta_leer", "titel_lang", "meta_lang", "text_duenn", "alt_leer"):
        md.append(f"| {k} | {len(klassen[k])} | {', '.join(klassen[k][:4])} |")
    md += ["", "## Grösste Titel-Gruppen", *[f"- {v}× «{k}»" for k, v in gruppen_t],
           "", "## Grösste Meta-Gruppen", *[f"- {v}× «{k[:110]}»" for k, v in gruppen_d], ""]
    open(BERICHT, "w").write("\n".join(md))
    print("\n".join(md[:14]))


if __name__ == "__main__":
    main()
