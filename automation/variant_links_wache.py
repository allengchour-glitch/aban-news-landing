#!/usr/bin/env python3
"""variant_links_wache.py — tragen serverseitig gerenderte Produkt-Kartenlinks im LIVE-Theme noch ein ?variant= ohne Zustandsbedingung? (19.10.2026). Nur lesend.

ANLASS (Spähtrupps 19.10. abends): 72 von 76 Produktlinks je Kollektionsseite trugen ?variant=<id> (Horizon baut sie aus
`selected_or_first_available_variant.url`), jede Produktseite hatte einen Selbstlink mit ?variant=. Das vereinheitlicht die Signale
(Sitemap, hreflang, Canonical, interne Links) nicht. Seit 19.10. gibt es EINE Quelle: snippets/lx-karten-href.liquid — Standard = product.url,
?variant= nur bei bewusster Auswahl (product.selected_variant: Filter auf Variantenoptionen, Produktseite mit ?variant=; Suche nur bei aktivem Filter).
⚠️ Ehrlich: Hygiene. Der Anteil an den GSC-«Alternative Seite»-Zählern ist NICHT belegt → Nachmessen nach 4–8 Wochen.

WAS DER WÄCHTER PRÜFT: jede .liquid-/.json-Datei des Haupttheme (ohne locales/ und config/) auf `…variant….url`. Ein Treffer ist in Ordnung, wenn
  (a) die Datei in ERLAUBT steht (Section-Rendering-API: wird nur per JavaScript für die Swatch-/Quick-Add-Auswahl abgerufen, steht nie im Seiten-HTML), oder
  (b) in den 600 Zeichen davor eine Bedingung auf `selected_variant` steht (`if`/`elsif`/`unless` … `selected_variant`; NICHT `selected_or_first_available_variant`).
Alles andere ist ein Befund. Der erlaubte Treffer in section-rendering-product-card.liquid ist zugleich der POSITIV-KANARIENVOGEL: fehlt er
(Muster kaputt, Datei umgebaut, nichts gelesen), meldet die Zeile «unklar», niemals «0».
Fehler (kein Token, kein Netz, zu wenig Dateien) = «unklar», nie «0».

ZWEITE PRÜFUNG (19.10., Prüferbefund zum Zusammenspiel mit startseite_schlank_patch.py): Der stündliche Schreiber erkennt den Stand VARIANT-LINKS
als «gesetzt» — er kann aber nicht merken, wenn das Snippet snippets/lx-karten-href.liquid fehlt (Theme-Update, Löschen im Editor). Rendern
Karten ein fehlendes Snippet, steht in jedem Kartenlink ein Liquid-Fehler statt der URL. Darum meldet diese Zeile ⚠️, sobald eine Theme-Datei
`{% render 'lx-karten-href' %}` enthält, das Snippet aber nicht in der Dateiliste steht. Die Zeile nennt immer, ob das Snippet vorhanden ist und
von wie vielen Dateien es gerendert wird (so fällt ein totes Muster auf, statt still «0» zu zeigen; Positiv-Kanarienvogel des Musters: Selbsttest).

Kosten: 5 Listenabfragen (Dateiname + checksumMd5); Inhalt wird nur für Dateien gelesen, deren Prüfsumme sich seit dem letzten Lauf geändert hat (Stand /tmp/variant_links_cache.json;
nach einem Container-Neustart einmal alles, ~20 Abfragen).

    python3 automation/variant_links_wache.py              # eine Zeile (Aufseher)
    python3 automation/variant_links_wache.py --liste      # Zeile + jeder Treffer (Datei:Zeile)
    python3 automation/variant_links_wache.py --selbsttest # Kanarien + Mutationsprüfung, KEIN Shopify-Zugriff
Ein unbekannter Schalter bricht mit Exit 2 ab und startet NIE einen Lauf.
"""
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
THEME = "gid://shopify/OnlineStoreTheme/187533001089"
CACHE = "/tmp/variant_links_cache.json"
MIN_DATEIEN = 150          # weniger gelesene Theme-Dateien = die Messung ist unvollständig → unklar
RUECKBLICK = 600           # Zeichen vor dem Treffer, in denen die Bedingung stehen muss

# Treffer-Muster: Variablenpfad mit «variant» im Namen, dann .url (selected_or_first_available_variant.url, variant_to_link.url, first_available_variant.url …)
MUSTER = re.compile(r"(?<![A-Za-z0-9_])[A-Za-z0-9_.]*variant[A-Za-z0-9_]*\.url\b")
# Bedingung auf die BEWUSST gesetzte Auswahl — selected_variant, nicht selected_or_first_available_variant
BEDINGUNG = re.compile(r"(?m)(?:\{%-?\s*|^[ \t]*)(?:if|elsif|unless)\s[^\n%]*\bselected_variant\b")

# Datei → Begründung. Der Treffer dort ist gewollt UND dient als Positiv-Kanarienvogel.
ERLAUBT = {
    "sections/section-rendering-product-card.liquid":
        "Section-Rendering-API: nur per JavaScript für die Swatch-/Quick-Add-Auswahl (option_values) abgerufen, die gewählte Variante MUSS in den Link; nie im Seiten-HTML",
}
KANARIEN_DATEI = "sections/section-rendering-product-card.liquid"
SNIPPET_DATEI = "snippets/lx-karten-href.liquid"
# ruft eine Datei das Karten-Snippet auf? ({% render 'lx-karten-href' %}, auch {%- render "lx-karten-href", … -%})
RENDER = re.compile(r"""\{%-?\s*render\s+['"]lx-karten-href['"]""")


def rendert(text):
    return bool(RENDER.search(text))


def snippet_luecke(dateinamen, renderer):
    """Dateien, die das Snippet rendern, obwohl es nicht in der Dateiliste steht. [] = in Ordnung (oder es ruft niemand auf)."""
    return sorted(renderer) if renderer and SNIPPET_DATEI not in dateinamen else []


def scannen(dateiname, text, muster=MUSTER):
    """→ Liste von (zeile, ausschnitt, bedingt). Reine Funktion (Selbsttest)."""
    treffer = []
    for m in muster.finditer(text):
        zeile = text.count("\n", 0, m.start()) + 1
        davor = text[max(0, m.start() - RUECKBLICK):m.start()]
        bedingt = bool(BEDINGUNG.search(davor))
        a = text.rfind("\n", 0, m.start()) + 1
        e = text.find("\n", m.end())
        ausschnitt = text[a:(e if e != -1 else len(text))].strip()[:150]
        treffer.append((zeile, ausschnitt, bedingt))
    return treffer


def auswerten(inhalte, scan=scannen):
    """inhalte: {datei: text}. → (befunde [(datei, zeile, ausschnitt)], kanarien_ok, n_dateien)."""
    befunde, kanarien = [], False
    for datei in sorted(inhalte):
        for zeile, ausschnitt, bedingt in scan(datei, inhalte[datei]):
            if datei in ERLAUBT:
                if datei == KANARIEN_DATEI:
                    kanarien = True
                continue
            if bedingt:
                continue
            befunde.append((datei, zeile, ausschnitt))
    return befunde, kanarien, len(inhalte)


def zeile_text(befunde, kanarien, n, luecke=(), snippet=None):
    """snippet = (vorhanden: bool, anzahl_renderer: int) oder None (Tests). luecke = Dateien, die ein fehlendes Snippet rendern."""
    if n < MIN_DATEIEN:
        return f"VARIANT-LINKS: unklar (nur {n} Theme-Dateien gelesen, erwartet ≥ {MIN_DATEIEN})"
    if not kanarien:
        return "VARIANT-LINKS: unklar (Positiv-Kanarienvogel fehlt: der erlaubte Treffer in section-rendering-product-card.liquid wurde nicht gefunden — Muster oder Datei prüfen)"
    if luecke:
        return (f"⚠️ VARIANT-LINKS: Snippet {SNIPPET_DATEI} FEHLT, wird aber von {len(luecke)} Dateien gerendert ({', '.join(luecke[:5])}) — "
                "jeder Kartenlink zeigt einen Liquid-Fehler statt der URL. Sofort: Snippet aus dropship/_theme_backup_variantlinks_2026-10-19/neu/snippets/ "
                "zurückspielen ODER dort rueckweg.py --scharf (Originale zurück)")
    if befunde:
        dateien = sorted({b[0] for b in befunde})
        return (f"⚠️ VARIANT-LINKS: {len(befunde)} Theme-Stellen mit ?variant=-Karten-href ohne Zustandsbedingung in {len(dateien)} Dateien: "
                + ", ".join(f"{b[0]}:{b[1]}" for b in befunde[:8]) + (" …" if len(befunde) > 8 else "")
                + " — Theme-Schreiber mit altem Stand? Vorlage: dropship/VARIANT-LINKS-2026-10-19.md (Rückweg/Neuanwendung: dropship/_theme_backup_variantlinks_2026-10-19/)")
    info = ""
    if snippet is not None:
        info = f"; Snippet lx-karten-href {'vorhanden' if snippet[0] else 'nicht vorhanden'}, von {snippet[1]} Dateien gerendert"
    return f"VARIANT-LINKS: 0 Theme-Stellen mit ?variant=-Karten-href ({n} Theme-Dateien gelesen, Kanarienvogel ok{info})"


# ---------------------------------------------------------------- live
def live_inhalte():
    sys.path.insert(0, HIER)
    import kollektion_leer as kl

    liste, cur = {}, None
    while True:
        d = kl.gql('query($id:ID!,$c:String){ theme(id:$id){ files(first:100, after:$c){ pageInfo{hasNextPage endCursor} nodes{ filename checksumMd5 } } } }',
                   {"id": THEME, "c": cur})["theme"]["files"]
        for n in d["nodes"]:
            f = n["filename"]
            if f.endswith((".liquid", ".json")) and not f.startswith(("locales/", "config/")):
                liste[f] = n["checksumMd5"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]

    try:
        cache = json.load(open(CACHE))
        if not isinstance(cache, dict):
            cache = {}
    except (OSError, ValueError):
        cache = {}

    neu_cache, inhalte, lesen = {}, {}, []
    for f, md5 in liste.items():
        c = cache.get(f)
        if c and c.get("md5") == md5 and "treffer" in c and "rendert" in c:
            neu_cache[f] = c
            inhalte[f] = None            # aus dem Cache: nur das Scan-Ergebnis zählt
        else:
            lesen.append(f)
    for i in range(0, len(lesen), 20):
        teil = lesen[i:i + 20]
        nodes = kl.gql('query($id:ID!,$f:[String!]!){ theme(id:$id){ files(filenames:$f, first:20){ nodes{ filename body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }',
                       {"id": THEME, "f": teil})["theme"]["files"]["nodes"]
        got = set()
        for n in nodes:
            text = (n.get("body") or {}).get("content")
            if text is None:
                continue
            got.add(n["filename"])
            inhalte[n["filename"]] = text
        fehlt = [f for f in teil if f not in got]
        if fehlt:
            raise RuntimeError(f"{len(fehlt)} Theme-Dateien nicht lesbar ({fehlt[0]} …)")
    return liste, cache, neu_cache, inhalte


def live_pruefen():
    liste, cache, neu_cache, inhalte = live_inhalte()
    gelesen, aus_cache, renderer = {}, {}, set()
    for f in liste:
        if inhalte.get(f) is not None:
            gelesen[f] = inhalte[f]
            if rendert(inhalte[f]):
                renderer.add(f)
        else:
            aus_cache[f] = neu_cache[f]["treffer"]
            if neu_cache[f].get("rendert"):
                renderer.add(f)

    def scan_mit_cache(datei, text):
        return [tuple(t) for t in aus_cache[datei]] if text is None else scannen(datei, text)

    # Cache-Treffer und frisch gelesene zusammen auswerten
    alle = {f: inhalte.get(f) for f in liste}
    befunde, kanarien, n = auswerten(alle, scan_mit_cache)
    neu = dict(neu_cache)
    for f, text in gelesen.items():
        neu[f] = {"md5": liste[f], "treffer": [list(t) for t in scannen(f, text)], "rendert": rendert(text)}
    try:
        json.dump(neu, open(CACHE, "w"))
    except OSError:
        pass
    return befunde, kanarien, n, snippet_luecke(set(liste), renderer), (SNIPPET_DATEI in liste, len(renderer))


# ---------------------------------------------------------------- Selbsttest
def selbsttest():
    f = []
    alt_karte = "<a href=\"{% if template.name == 'index' %}{{ product.url }}{% else %}{{ product.selected_or_first_available_variant.url }}{% endif %}\">"
    neu_karte = "<a href=\"{% render 'lx-karten-href', product: product %}\">"
    snippet = ("{%- liquid\n  assign lx_href = product.url\n  if product.selected_variant and template.name != 'index'\n"
               "      assign lx_href = product.selected_variant.url\n  endif\n-%}\n{{- lx_href -}}\n")
    kanarien_text = "assign url = product.selected_or_first_available_variant.url\n"
    fuell = {f"snippets/x{i}.liquid": "nichts" for i in range(MIN_DATEIEN)}

    def lauf(extra):
        d = dict(fuell)
        d.update(extra)
        return auswerten(d)

    # 1 Positiv-Kanarienvogel: die alte Karte MUSS gefunden werden (sonst taugt das Muster nichts)
    b, k, n = lauf({KANARIEN_DATEI: kanarien_text, "snippets/product-card.liquid": alt_karte})
    if len(b) != 1 or not zeile_text(b, k, n).startswith("⚠️"):
        f.append(f"alte Karte nicht erkannt: {b}")
    # 2 variant_to_link.url und first_available_variant.url werden ebenfalls erkannt
    b, k, n = lauf({KANARIEN_DATEI: kanarien_text, "snippets/a.liquid": '<a href="{{ variant_to_link.url }}">', "blocks/b.liquid": '{{ closest.product.first_available_variant.url }}'})
    if len(b) != 2:
        f.append(f"Variablenformen nicht erkannt: {b}")
    # 3 neue Karte (Snippet-Aufruf) + Snippet mit Bedingung = sauber
    b, k, n = lauf({KANARIEN_DATEI: kanarien_text, "snippets/product-card.liquid": neu_karte, "snippets/lx-karten-href.liquid": snippet})
    if b or not zeile_text(b, k, n).startswith("VARIANT-LINKS: 0 "):
        f.append(f"saubere Fassung als Befund gemeldet: {b}")
    # 4 selected_or_first_available_variant ist KEINE Bedingung (die Falle des alten Musters)
    b, k, n = lauf({KANARIEN_DATEI: kanarien_text, "snippets/c.liquid": "{% if product.selected_or_first_available_variant %}<a href=\"{{ product.selected_or_first_available_variant.url }}\">{% endif %}"})
    if len(b) != 1:
        f.append(f"selected_or_first_available_variant fälschlich als Bedingung gewertet: {b}")
    # 5 ohne Kanarienvogel (Datei fehlt / Muster tot) = unklar, NIE «0»
    b, k, n = lauf({"snippets/product-card.liquid": neu_karte})
    z = zeile_text(b, k, n)
    if "unklar" not in z or "VARIANT-LINKS: 0 " in z:
        f.append(f"fehlender Kanarienvogel muss unklar sein: {z}")
    # 6 zu wenige Dateien = unklar
    z = zeile_text(*auswerten({KANARIEN_DATEI: kanarien_text}))
    if "unklar" not in z:
        f.append(f"zu wenige Dateien müssen unklar sein: {z}")
    # 7 Mutationsprüfung: ein Muster, das nichts findet, MUSS an Test 1 scheitern
    tot = re.compile(r"ZZZ_gibt_es_nicht")
    b, k, n = auswerten(dict(fuell, **{KANARIEN_DATEI: kanarien_text, "snippets/product-card.liquid": alt_karte}), lambda d, t: scannen(d, t, tot))
    if b:
        f.append("Mutation (totes Muster) fand trotzdem etwas")
    if k or "unklar" not in zeile_text(b, k, n):
        f.append("Mutation (totes Muster) muss als unklar enden, nicht als 0")
    # 8 Bedingung weit weg (> RUECKBLICK Zeichen) zählt nicht
    weit = "{% if product.selected_variant %}x{% endif %}" + (" " * (RUECKBLICK + 50)) + "<a href=\"{{ product.selected_or_first_available_variant.url }}\">"
    b, k, n = lauf({KANARIEN_DATEI: kanarien_text, "snippets/d.liquid": weit})
    if len(b) != 1:
        f.append(f"weit entfernte Bedingung darf nicht schützen: {b}")
    # 9 Positiv-Kanarienvogel des render-Musters: alle Schreibweisen werden gefunden, fremde und ähnlich heissende Snippets nicht
    def render_fehler():
        x = [f"render-Muster findet nicht: {t}" for t in ("{% render 'lx-karten-href', product: product %}", "{%- render \"lx-karten-href\" -%}", "x {%render 'lx-karten-href'%}")
             if not rendert(t)]
        x += [f"render-Muster findet Fremdes: {t}" for t in ("{% render 'lx-karten-href-alt' %}", "{% render 'card-gallery' %}", "lx-karten-href ohne render")
              if rendert(t)]
        return x
    f += render_fehler()
    # 10 Snippet fehlt, aber jemand ruft es auf → Lücke und ⚠️-Zeile (nie «0»)
    luecke = snippet_luecke({"snippets/product-card.liquid"}, {"snippets/product-card.liquid", "blocks/product-title.liquid"})
    z = zeile_text([], True, MIN_DATEIEN, luecke, (False, 2))
    if luecke != ["blocks/product-title.liquid", "snippets/product-card.liquid"] or not z.startswith("⚠️ VARIANT-LINKS: Snippet snippets/lx-karten-href.liquid FEHLT"):
        f.append(f"fehlendes Snippet nicht gemeldet: {luecke} / {z[:80]}")
    # 11 Snippet da → keine Lücke; niemand ruft es auf (Patch nicht angewendet) → keine Lücke, Zeile nennt «von 0 Dateien gerendert»
    if snippet_luecke({SNIPPET_DATEI, "snippets/product-card.liquid"}, {"snippets/product-card.liquid"}) or snippet_luecke({"snippets/x.liquid"}, set()):
        f.append("Lücke gemeldet, obwohl keine besteht")
    z = zeile_text([], True, MIN_DATEIEN, [], (False, 0))
    if not z.startswith("VARIANT-LINKS: 0 ") or "von 0 Dateien gerendert" not in z:
        f.append(f"Zeile ohne Snippet-Angabe: {z}")
    # 12 Mutation: mit einem toten render-Muster MUSS der Test 9 anschlagen (sonst hätte er keine Zähne)
    global RENDER
    echt, RENDER = RENDER, re.compile(r"ZZZ_gibt_es_nicht")
    try:
        if not render_fehler():
            f.append("Mutation (totes render-Muster) wurde von Test 9 nicht bemerkt")
    finally:
        RENDER = echt
    print("SELBSTTEST variant_links_wache:", "OK (12 Fälle)" if not f else "FEHLER " + " | ".join(f))
    return 0 if not f else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["--selbsttest"]:
        sys.exit(selbsttest())
    if a not in ([], ["--liste"]):
        print(f"unbekannter Schalter {a!r} — Abbruch (kein Lauf). Erlaubt: (ohne) · --liste · --selbsttest")
        sys.exit(2)
    try:
        befunde, kanarien, n, luecke, snippet = live_pruefen()
    except Exception as e:      # kein Token, kein Netz, Shopify-Fehler: unklar, nie 0
        print(f"VARIANT-LINKS: unklar ({type(e).__name__}: {str(e)[:100]})")
        sys.exit(0)
    print(zeile_text(befunde, kanarien, n, luecke, snippet))
    if a == ["--liste"]:
        for datei, z, s in befunde:
            print(f"  {datei}:{z}  {s}")
