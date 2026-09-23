"""Heilversprechen in den SEO-Feldern (Google-Titel und -Beschreibung) — und Krankheitswörter im Handle.

Befund 23.09.2026 (Audit): heilversprechen_wache.py liest nur title und descriptionHtml. Im Suchergebnis
standen trotzdem «Vein Cream gegen Besenreiser & Krampfadern», «Kühlende Migräne-Mütze», «Der Penner
dient zur Entfernung von … Warzen» — Google meldet die Klasse «Personalized advertising: personal
hardships» für 75 Produkte. Ein entschärfter Titel über einer SEO-Beschreibung mit Krankheitsversprechen
ist dieselbe Aussage an anderer Stelle.

Vorgehen je aktivem Produkt (Massenexport, eine Bulk-Operation):
  • seo.title trifft das Muster → durch den (bereits entschärften) Produkttitel ersetzen, sofern der sauber ist.
  • seo.description trifft das Muster → Feld leeren (Google nimmt dann den Anfang des bereinigten
    Beschreibungstexts; die Ersatztabelle ergab im SEO-Satz Unsinn).
  • Handle mit Krankheitswort → nur Bericht (Umbenennen braucht 301 und ändert die Adresse bei Google).
Rücklesen je Schreibvorgang. DRY=1 zeigt nur. Bericht: dropship/HEILVERSPRECHEN-SEO.md.
"""
import json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heilversprechen_wache as hw  # noqa: E402  (MUSTER, FEHLALARM, ERSATZ, ERSATZ_RE, gql)

DRY = os.environ.get("DRY") == "1"
CACHE = "/tmp/heil_seo_export.jsonl"
BERICHT = os.path.join(hw.REPO, "dropship/HEILVERSPRECHEN-SEO.md")
LEDGER = os.path.join(hw.REPO, "dropship/_heilversprechen_seo_wache.txt")
# Krankheitswörter, die im Fliesstext-Muster fehlen, weil sie dort meist in Fehlalarm-Sätzen stehen.
ZUSATZ = re.compile(r"Krampfader|Besenreiser|Hämorrhoid|Haemorrhoid|\bWarzen?\b|Migräne|Neurodermitis|"
                    r"Schuppenflechte|Psoriasis|Ekzem|Nagelpilz|Fusspilz|Tinnitus|Inkontinenz|Depression", re.I)
HANDLE = re.compile(r"krampfader|besenreiser|hamorrhoid|haemorrhoid|(?<!sch)warze|migrane|migraene|nagelpilz|"
                    r"psoriasis|ekzem|tinnitus|inkontinenz|arthrose|rheuma|diabetes", re.I)
BULK = """{ products(query: "status:active") { edges { node { id handle title seo { title description } } } } }"""


def treffer(t):
    if not t:
        return None
    m = hw.MUSTER.search(t) or ZUSATZ.search(t)
    if not m:
        return None
    umfeld = t[max(0, m.start() - 60):m.end() + 60]
    if hw.FEHLALARM.search(umfeld):
        return None
    return m.group(0)


def export():
    s = hw.gql("{ currentBulkOperation { status } }")
    if ((s.get("data") or {}).get("currentBulkOperation") or {}).get("status") in ("CREATED", "RUNNING"):
        raise SystemExit("ABBRUCH: eine andere Bulk-Operation läuft — später erneut")
    m = hw.gql('mutation { bulkOperationRunQuery(query: """%s""") { bulkOperation { id } userErrors { message } } }' % BULK)
    if m.get("data", {}).get("bulkOperationRunQuery", {}).get("userErrors"):
        raise SystemExit(f"Bulk-Start fehlgeschlagen: {m}")
    while True:
        time.sleep(15)
        b = hw.gql("{ currentBulkOperation { status objectCount url } }")["data"]["currentBulkOperation"]
        print("   bulk:", b["status"], b["objectCount"], flush=True)
        if b["status"] == "COMPLETED":
            subprocess.run(["curl", "-sS", "-o", CACHE, b["url"]], check=True)
            return
        if b["status"] in ("FAILED", "CANCELED", "EXPIRED"):
            raise SystemExit(f"Bulk {b['status']}")


def main():
    if not (os.environ.get("CACHE_NUTZEN") == "1" and os.path.exists(CACHE)):
        export()
    n = fix = fehl = 0
    offen, handles = [], []
    for z in open(CACHE):
        p = json.loads(z)
        if "handle" not in p:
            continue
        n += 1
        if HANDLE.search(p["handle"]):
            handles.append((p["handle"], p["title"]))
        seo = p.get("seo") or {}
        neu = {}
        if treffer(seo.get("title")):
            if not treffer(p["title"]):
                neu["title"] = p["title"][:70]
            else:
                offen.append((p["handle"], "SEO-Titel", seo["title"]))
        d = seo.get("description") or ""
        if treffer(d):
            # Leeren statt flicken: die Ersatztabelle ist für Fliesstext gebaut und ergab im SEO-Satz
            # Unsinn («Cupping-Massage mit Ausdauer & Anti-Cellulite», Testlauf 23.09.). Leer = Google nimmt
            # den Anfang des (von der Hauptwache bereinigten) Beschreibungstexts.
            neu["description"] = ""
        if not neu:
            continue
        print(f"  {p['handle'][:55]:55} {json.dumps(neu, ensure_ascii=False)[:110]}")
        if DRY:
            fix += 1
            continue
        r = hw.gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{seo{title description}} userErrors{message}}}",
                   {"p": {"id": p["id"], "seo": neu}})
        pu = (r.get("data") or {}).get("productUpdate") or {}
        got = (pu.get("product") or {}).get("seo") or {}
        # Shopify speichert einen SEO-Titel gleich dem Produkttitel (und ein leeres Feld) als null —
        # null heisst «Produkttitel/Beschreibung gelten», ist also Erfolg.
        def ok(k, v):
            g = got.get(k)
            return (g or "") == v or (g is None and k == "title" and v == p["title"][:70])
        if pu.get("userErrors") or not all(ok(k, v) for k, v in neu.items()):
            fehl += 1
            print("    ⛔", pu.get("userErrors"), got)
            continue
        fix += 1
        with open(LEDGER, "a") as f:
            f.write(f"{time.strftime('%Y-%m-%d')}\t{p['id']}\t{'+'.join(neu)}\t{p['handle']}\n")
    with open(BERICHT, "w") as f:
        f.write(f"# Heilversprechen in SEO-Feldern und Handles — Stand {time.strftime('%Y-%m-%d %H:%M')} UTC\n\n")
        f.write(f"Geprüft: {n} aktive Produkte · SEO bereinigt: {fix}{' (DRY)' if DRY else ''} · Fehler: {fehl}\n\n")
        f.write("## Offen (Produkttitel selbst noch mit Muster → Hauptwache/Ersatztabelle)\n\n")
        for h, w, t in offen:
            f.write(f"- `{h}` — {w}: {t}\n")
        f.write(f"\n## Handles mit Krankheitswort ({len(handles)}) — Umbenennen nur mit 301, Betreiber-/Sichtprüfung\n\n")
        for h, t in handles:
            f.write(f"- `{h}` — {t}\n")
    print(f"FERTIG: {n} geprüft, {fix} SEO bereinigt, {len(offen)} offen, {len(handles)} Handles gemeldet, {fehl} Fehler")


if __name__ == "__main__":
    main()
