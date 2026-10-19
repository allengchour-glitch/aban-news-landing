#!/usr/bin/env python3
"""Wendet den Theme-Patch VARIANT-LINKS-2026-10-19 an: Snippet lx-karten-href zuerst, danach die vier Aufrufer aus neu/ (je Datei einzeln, userErrors prüfen, Rücklesen byte-genau).

    python3 dropship/_theme_backup_variantlinks_2026-10-19/anwenden.py            # DRY: prüft nur, ob Live == Sicherung (nichts wird geschrieben)
    python3 dropship/_theme_backup_variantlinks_2026-10-19/anwenden.py --scharf   # schreibt ins Haupttheme (Betreiber-Freigabe «Beides» 19.10. ~21:55 UTC)
Vorprüfung bricht mit Exit 3 ab, wenn eine Live-Datei von der Sicherung abweicht (jemand hat dazwischen geschrieben → erst neu holen, neu patchen).
Rückweg: rueckweg.py --scharf (gleicher Ordner). Ein unbekannter Schalter bricht mit Exit 2 ab, startet NIE einen Lauf.
KOLLISIONSPRÜFUNG (19.10., Prüferbefund): VOR jedem Netzzugriff, auch im DRY-Lauf, wird die Zielfassung gegen den stündlichen Schreiber
automation/startseite_schlank_patch.py (Baustein A3, SCHARF=1 aus fixer_keepalive.sh) gehalten: er muss alle Bausteine als «gesetzt» erkennen
und nichts zu schreiben finden. Sonst Exit 6 — nichts wird angewendet (sonst 5/12 statt 12/12, doppelter Kopfkommentar, dauerhaft ⚠️ SCHLANK).
Danach zusätzlich: python3 automation/startseite_schlank_patch.py  (Soll: «SCHLANK: 12/12 Bausteine gesetzt (A3 im Stand lx-varlinks-2026-10-19, 3 Dateien)»).
Danach: python3 automation/variant_links_wache.py --liste  (Soll: «VARIANT-LINKS: 0 …») und ruby automation/variant_links_liquid_test.rb.
"""
import hashlib, os, sys, time
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HIER, "..", "..", "automation"))
THEME = "gid://shopify/OnlineStoreTheme/187533001089"
SNIPPET = "snippets/lx-karten-href.liquid"
CALLER = ["snippets/product-card.liquid", "snippets/card-gallery.liquid", "blocks/product-title.liquid", "blocks/_product-details.liquid"]
a = sys.argv[1:]
if a not in ([], ["--scharf"]):
    print("unbekannter Schalter", a, "— Abbruch (kein Lauf). Erlaubt: (ohne) · --scharf"); sys.exit(2)

def datei(basis, f):
    return open(os.path.join(HIER, basis, f), encoding="utf-8", newline="").read()

def schlank_kollision():
    """Offline. Hält die drei A3-Zieldateien gegen startseite_schlank_patch.py. → Liste von Problemen (leer = keine Kollision)."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("startseite_schlank_patch", os.path.join(HIER, "..", "..", "automation", "startseite_schlank_patch.py"))
    sp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sp)
    probleme = []
    for f in ["snippets/product-card.liquid", "snippets/card-gallery.liquid", "blocks/product-title.liquid"]:
        t = datei("neu", f)
        neu_t, ber = sp.anwenden(t, [b for b in sp.BAUSTEINE if b[1] == f])
        if neu_t != t or any(st != "gesetzt" for _, st in ber):
            probleme.append(f"{f}: {[st for _, st in ber]}, würde schreiben: {neu_t != t}")
    return probleme

_kollision = schlank_kollision()
if _kollision:
    print("ABBRUCH (Exit 6): Zielfassung kollidiert mit automation/startseite_schlank_patch.py (stündlicher Schreiber, Baustein A3):")
    for p in _kollision:
        print("  ", p)
    print("→ erst die A3-Erkennung (ALTERNATIV in startseite_schlank_patch.py) nachziehen, dann erneut. Nichts angewendet, nichts gelesen.")
    sys.exit(6)
print("Kollisionsprüfung ok: Schlank-Patch erkennt die Zielfassung (3 Dateien, alle Bausteine gesetzt, nichts zu schreiben)")
import kollektion_leer as kl   # erst jetzt (Token/Netz); die Kollisionsprüfung oben ist offline

def lesen(f):
    n = kl.gql('query($id:ID!,$f:[String!]!){ theme(id:$id){ files(filenames:$f, first:1){ nodes{ body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }', {"id": THEME, "f": [f]})["theme"]["files"]["nodes"]
    return n[0]["body"]["content"] if n else None

for f in CALLER:
    if lesen(f) != datei("", f):
        print("ABBRUCH: Live-Datei weicht von der Sicherung ab:", f); sys.exit(3)
if lesen(SNIPPET) is not None and lesen(SNIPPET) != datei("neu", SNIPPET):
    print("ABBRUCH: Snippet existiert live schon in anderer Fassung"); sys.exit(3)
print("Vorprüfung ok: 4 Live-Dateien == Sicherung", time.strftime("%H:%M:%S", time.gmtime()), "UTC")
if not a:
    print("DRY: nichts geschrieben. Mit --scharf anwenden."); sys.exit(0)

for f in [SNIPPET] + CALLER:
    neu = datei("neu", f)
    r = kl.gql('mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id, files:$files){ upsertedThemeFiles{filename} userErrors{filename code message} } }',
               {"id": THEME, "files": [{"filename": f, "body": {"type": "TEXT", "value": neu}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        print("FEHLER userErrors", f, r["userErrors"], "→ rueckweg.py --scharf erwägen"); sys.exit(4)
    ok = False
    for _ in range(8):             # direkt nach dem Schreiben liefert das Rücklesen kurz noch die alte Datei (23.09.)
        time.sleep(3)
        if lesen(f) == neu:
            ok = True; break
    print(("OK   " if ok else "NICHT BESTÄTIGT "), f, "md5", hashlib.md5(neu.encode()).hexdigest(), time.strftime("%H:%M:%S", time.gmtime()), "UTC")
    if not ok:
        print("STOPP: Rücklesen weicht ab → rueckweg.py --scharf"); sys.exit(5)
print("FERTIG. Jetzt messen: variant_links_wache.py --liste · startseite_schlank_patch.py (Soll 12/12 + «A3 im Stand lx-varlinks») · öffentliche Seiten per WebFetch (Edge-Cache: Minuten).")
