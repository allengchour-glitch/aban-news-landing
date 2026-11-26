#!/usr/bin/env python3
"""theme_gratis_schwelle_50.py — Theme-Zahlen der Gratis-Schwelle von 40.50 auf 50 (22.10.2026, Betreiber «Alle auf CHF 50»).

ANLASS: Die Kasse verlangt in allen drei Profilen ab 22.10. ~22:30 UTC CHF 50 (General profile 50 durch ChatGPT/Betreiber, CH-Lager + Druck per
gratis_schwelle_setzen.py SOLL=50). Das Theme rechnete noch mit 40.50 (Entscheid D, 13.10.): Warenkorbbalken/Drawer meldeten «gratis» ab 40.50,
Produktseiten «gratis Versand inklusive» ab 45 bzw. 40.50 — die Kasse nahm bis 50 CHF 7. Das ist ein falsches Versprechen an die Kundschaft.

Ersetzt NUR Zahlen und Hinweistexte an den Stellen, die der Entscheid D gesetzt hat (wie 13.10.: layout/theme.liquid, snippets/cart-summary.liquid, templates/product.json):
  * Balken/Drawer:  gratis ⇔ Betrag NACH Rabatt ≥ 5000; «noch X» = max(5000 − Warenwert vor Rabatt, ⌈(5000 − Betrag) · 10/9⌉)
  * Produktseite:   price_min ≥ 5556  → «gratis Versand inklusive» (auch mit 10-%-Code: 55.56 · 0,9 = 50.00)
                    price_min ≥ 5000  → «… (ohne Gutschein)»        (vorher 4500 / 4050)
Der öffentliche JSON-LD-Block (sections/header.liquid) bleibt auf Betreiber-Wort («weiterhin 40.50 für später») UNVERÄNDERT.

  python3 automation/theme_gratis_schwelle_50.py              # trocken: Anker + Zählung, schreibt nichts
  SCHARF=1 python3 automation/theme_gratis_schwelle_50.py     # sichert nach theme_backup/*.vor-gratis5000-2210, schreibt, liest zurück
  SCHARF=1 python3 automation/theme_gratis_schwelle_50.py --zurueck   # stellt die Sicherungen wieder her (nur mit Prüfsummen-Tor, s. u.)
  python3 automation/theme_gratis_schwelle_50.py --selbsttest

NACHTRAG 26.11.2026 (Theme-Wechsel 21.11., dropship/theme-id-2611/URTEILE.md): Das Werkzeug nahm Theme-ID und Lesen aus warenkorb_einig
(w.THEME, w.lese). Dort zielt jetzt jeder Lauf aufs LIVE-Theme — hier hätte das `--zurueck` die Stände vom 22.10. ungeprüft ins Live-Theme
gespielt (Masstabelle 25.11., Hilfe-Knopf, neue Startseite, Black-Week-Banner weg). Darum jetzt:
  * eigene feste ID THEME_2210 = 187533001089 — das Theme, in dem der Lauf vom 22.10. schrieb und aus dem die Sicherungen stammen
    (seit 21.11. unveröffentlicht). Der Vorwärtslauf prüft weiter «role MAIN» und hält damit von selbst an; im Live-Theme stehen die
    50er-Zahlen längst (warenkorb_gratisversand/warenkorb_einig --pruefen).
  * `--zurueck` stellt nur zurück, wenn JEDE Ziel-Datei byte-genau der Nach-Fassung entspricht (md5(Ziel) == md5(Ersetzung angewandt
    auf die Sicherung)), sonst Abbruch ohne Schreiben. Jede spätere Änderung an einer Datei sperrt den Rückweg.
"""
import hashlib
import json
import os
import re
import sys
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402  (eigener Zugang — nicht mehr über warenkorb_einig)

SCHARF = os.environ.get("SCHARF") == "1"
SUFFIX = ".vor-gratis5000-2210"
THEME_2210 = "gid://shopify/OnlineStoreTheme/187533001089"   # Ziel des Laufs vom 22.10.2026 und Herkunft der Sicherungen — bewusst fest
DATEIEN = ["layout/theme.liquid", "snippets/cart-summary.liquid", "templates/product.json", "sections/header-group.json",
           "sections/lux-assistent.liquid", "snippets/meta-tags.liquid", "templates/collection.json", "templates/index.json"]

# (Datei, alt, neu, erwartete Anzahl) — exakte Zeichenketten, jede muss genau so oft vorkommen
ERSETZUNGEN = [
    ("layout/theme.liquid", "var SCHWELLE=4050,", "var SCHWELLE=5000,", 1),
    ("layout/theme.liquid", "tot>=4050", "tot>=5000", 1),
    ("layout/theme.liquid", "((4050-tot)*10+8)/9", "((5000-tot)*10+8)/9", 1),
    ("layout/theme.liquid", "Entscheid D: Tarif ab 40.50", "Tarif ab 50 (22.10.2026, vorher Entscheid D: 40.50)", 1),
    ("layout/theme.liquid", ">= 40.50 (Tarif seit Entscheid D;", ">= 50.00 (Tarif seit 22.10.2026;", 1),
    # «noch X»: bei Tarif 50 muss der Warenwert VOR Rabatt 55.56 erreichen (2+ Artikel = -10 % auf alles): Versprechen 5000 -> 5556
    ("layout/theme.liquid", "Math.max(5000-sub,", "Math.max(5556-sub,", 1),
    ("snippets/cart-summary.liquid", "lux_gv_rest = 5000 | minus:", "lux_gv_rest = 5556 | minus:", 1),
    ("snippets/cart-summary.liquid", "cart.total_price >= 4050 -%}", "cart.total_price >= 5000 -%}", 1),
    ("snippets/cart-summary.liquid", "lux_gv_rest2 = 4050 |", "lux_gv_rest2 = 5000 |", 1),
    ("snippets/cart-summary.liquid", "Tarif gratis ab 40.50 (seit Betreiber-Entscheid D,", "Tarif gratis ab 50 (seit 22.10.2026, vorher Entscheid D 40.50,", 1),
    ("snippets/cart-summary.liquid", "⌈(40.50 − Betrag nach Rabatt)", "⌈(50 − Betrag nach Rabatt)", 1),
    ("templates/product.json", "product.price_min >= 4500", "product.price_min >= 5556", 2),
    ("templates/product.json", "product.price_min >= 4050", "product.price_min >= 5000", 2),
    # Betreiber «50 behalten, Text anpassen»: der automatische 10-%-Rabatt ab 2 Artikeln drückt Körbe von 50.00–55.55 unter 50 → Versprechen «ab CHF 50 nach Rabatt»
    # (NICHT angefasst: die Zeichenketten '<p>Gratis-Versand ab CHF 50 ·' in templates/product.json — das ist Suchlogik gegen den Beschreibungstext)
    ("layout/theme.liquid", "(ab CHF 50 Warenwert)", "(ab CHF 50 nach Rabatt)", 1),
    ("snippets/cart-summary.liquid", "bis zum Gratisversand (ab CHF 50)</span>", "bis zum Gratisversand (ab CHF 50 nach Rabatt)</span>", 1),
    ("templates/product.json", "(zusammen mit anderer Ware: gratis ab CHF 50)", "(zusammen mit anderer Ware: gratis ab CHF 50 nach Rabatt)", 2),
    ("templates/product.json", "In der Schweiz gratis ab CHF 50{% endif %}", "In der Schweiz gratis ab CHF 50 nach Rabatt{% endif %}", 1),
    ("templates/product.json", "<strong>gratis</strong> ab CHF 50</span>{% endif %}", "<strong>gratis</strong> ab CHF 50 nach Rabatt</span>{% endif %}", 1),
    ("sections/header-group.json", "in der Schweiz gratis ab CHF 50\",", "in der Schweiz gratis ab CHF 50 nach Rabatt\",", 1),
    ("sections/lux-assistent.liquid", "<b>ab CHF 50 gratis</b>; darunter", "<b>ab CHF 50 nach Rabatt gratis</b>; darunter", 1),
    ("snippets/meta-tags.liquid", "in der Schweiz gratis ab CHF 50.'", "in der Schweiz gratis ab CHF 50 nach Rabatt.'", 1),
    ("templates/collection.json", "Gratis-Versand ab CHF 50, sonst CHF 7.00.</p>", "Gratis-Versand ab CHF 50 nach Rabatt, sonst CHF 7.00.</p>", 1),
    ("templates/collection.json", "</strong> in der Schweiz ab CHF 50</span>", "</strong> in der Schweiz ab CHF 50 nach Rabatt</span>", 1),
    ("templates/index.json", "Gratis-Versand in der Schweiz ab CHF 50 · ", "Gratis-Versand in der Schweiz ab CHF 50 nach Rabatt · ", 1),
    ("templates/index.json", "<br>in der Schweiz ab CHF 50</div>", "<br>in der Schweiz ab CHF 50 nach Rabatt</div>", 1),
    ("templates/product.json", "Entscheid D: Tarif ab 40.50 → ab 45 auch mit 10-%-Code gratis, 40.50–44.99 ohne Gutschein.",
     "Tarif ab 50 (22.10.2026) → ab 55.56 auch mit 10-%-Code gratis, 50–55.55 ohne Gutschein.", 1),
]


def ersetze(dateien, nur=None):
    """Rein: (neue Texte, Fehlerliste). Jede Ersetzung muss genau die erwartete Zahl an Treffern haben (sonst Fehler, nichts wird geändert).
    nur = Menge von Dateinamen: nur deren Zeilen anwenden (für den Prüfsummen-Vergleich einzelner Sicherungen)."""
    neu, fehler = dict(dateien), []
    for datei, alt, ers, n in ERSETZUNGEN:
        if nur is not None and datei not in nur:
            continue
        t = neu.get(datei)
        if t is None:
            fehler.append(f"{datei}: Datei fehlt")
            continue
        k = t.count(alt)
        if k == 0 and t.count(ers) == n:
            continue   # schon umgestellt (idempotent)
        if k != n:
            fehler.append(f"{datei}: «{alt[:46]}» {k}× (erwartet {n}×)")
            continue
        neu[datei] = t.replace(alt, ers)
    return neu, fehler


def json_ok(text):
    """product.json: Kommentarkopf (/* … */) abschneiden und als JSON laden."""
    t = text.lstrip()
    if t.startswith("/*"):
        t = t[t.index("*/") + 2:]
    json.loads(t)
    return True


def lese(dateien, theme=THEME_2210):
    r = gql('query($id:ID!,$f:[String!]){theme(id:$id){role files(filenames:$f,first:20){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}',
            {"id": theme, "f": dateien})["theme"]
    return r["role"], {n["filename"]: n["body"]["content"] for n in r["files"]["nodes"]}


def md5(text):
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def zurueck_plan(sicherungen, ziel):
    """Rein: (Dateien zum Zurückstellen [(name, text)], Fehlerliste). Alles oder nichts: jede Ziel-Datei muss byte-genau der Nach-Fassung
    entsprechen = Ersetzungen dieses Werkzeugs, angewandt auf ihre Sicherung. Abweichung = jemand hat seither geändert → kein Rückweg."""
    fehler, plan = [], []
    for n, alt in sicherungen.items():
        nach, f = ersetze({n: alt}, nur={n})
        if f:
            fehler.append(f"{n}: Nach-Fassung nicht herstellbar ({'; '.join(f)})")
            continue
        ist = ziel.get(n)
        if ist is None:
            fehler.append(f"{n}: fehlt im Ziel-Theme")
        elif md5(ist) != md5(nach[n]):
            fehler.append(f"{n}: Prüfsumme {md5(ist)[:8]} ≠ Nach-Fassung {md5(nach[n])[:8]} (seit dem Lauf geändert)")
        else:
            plan.append((n, alt))
    return ([] if fehler else plan), fehler


def hauptlauf():
    role, f = lese(DATEIEN)
    if role != "MAIN":
        raise SystemExit(f"Theme {THEME_2210} nicht MAIN ({role}) — stillgelegt: der Lauf vom 22.10. gehört zu diesem Theme; im Live-Theme "
                         f"stehen die 50er-Zahlen (warenkorb_gratisversand/warenkorb_einig --pruefen)")
    neu, fehler = ersetze(f)
    if fehler:
        print("⛔ Anker stimmen nicht — nichts geschrieben:\n  " + "\n  ".join(fehler))
        return 1
    geaendert = [n for n in DATEIEN if neu[n] != f[n]]
    for n in DATEIEN:
        print(f"  {n}: {'ändert' if n in geaendert else 'schon umgestellt'} ({len(f[n])} → {len(neu[n])} Zeichen)")
    if not geaendert:
        print("nichts zu tun")
        return 0
    for n in geaendert:
        if n.endswith(".json"):
            json_ok(neu[n])
    rest = {n: sorted(set(re.findall(r"4050|4500", neu[n]))) for n in geaendert}
    print("  übrig gebliebene Zahlen 4050/4500:", rest)
    if not SCHARF:
        print("TROCKEN — SCHARF=1 schreibt")
        return 0
    for n in geaendert:
        pfad = os.path.join(REPO, "theme_backup", n.replace("/", "__") + SUFFIX)
        if not os.path.exists(pfad):   # die ERSTE Sicherung (Original) nie überschreiben
            open(pfad, "w", encoding="utf-8").write(f[n])
            print("  Sicherung", os.path.relpath(pfad, REPO))
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){"
            "upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": THEME_2210, "files": [{"filename": n, "body": {"type": "TEXT", "value": neu[n]}} for n in geaendert]})["themeFilesUpsert"]
    if r["userErrors"]:
        print("FEHLER", r["userErrors"])
        return 1
    for _ in range(10):
        time.sleep(4)
        _, g = lese(geaendert)
        if all(g[n] == neu[n] for n in geaendert):
            print(f"GESCHRIEBEN + ZURÜCKGELESEN: {', '.join(geaendert)}")
            return 0
    print("RÜCKLESEN FEHLT")
    return 1


def sicherungen():
    s = {}
    for n in DATEIEN:
        pfad = os.path.join(REPO, "theme_backup", n.replace("/", "__") + SUFFIX)
        if os.path.exists(pfad):
            s[n] = open(pfad, encoding="utf-8").read()
    return s


def zurueck():
    sich = sicherungen()
    if not sich:
        print("keine Sicherungen")
        return 1
    _, ziel = lese(list(sich))   # nur lesen; Ziel = THEME_2210, nie das Live-Theme
    plan, fehler = zurueck_plan(sich, ziel)
    if fehler:
        print(f"⛔ RÜCKWEG GESPERRT ({THEME_2210}) — nichts geschrieben:\n  " + "\n  ".join(fehler))
        return 1
    print(f"würde zurückstellen ({THEME_2210}, Prüfsummen = Nach-Fassung):", ", ".join(n for n, _ in plan))
    if not SCHARF:
        return 0
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){"
            "upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": THEME_2210, "files": [{"filename": n, "body": {"type": "TEXT", "value": t}} for n, t in plan]})["themeFilesUpsert"]
    print("FEHLER" if r["userErrors"] else "zurückgestellt", r["userErrors"] or "")
    return 1 if r["userErrors"] else 0


def selbsttest():
    # Probe aus der Tabelle selbst: jede Zeile steht n-mal in ihrer Datei (getrennt durch Leerzeichen)
    probe = {d: "" for d in DATEIEN}
    for datei, alt, _, n in ERSETZUNGEN:
        probe[datei] += (alt + " | ") * n
    neu, fehler = ersetze(probe)
    ok = not fehler
    for datei, alt, ers, n in ERSETZUNGEN:
        ok = ok and neu[datei].count(ers) >= n
    zweimal, f2 = ersetze(neu)
    ok = ok and not f2 and zweimal == neu                      # idempotent
    erste = ERSETZUNGEN[0]
    doppelt = dict(probe)
    doppelt[erste[0]] += erste[1]
    ok = ok and bool(ersetze(doppelt)[1])                      # ein zusätzlicher Anker (zu viele Treffer) wird abgelehnt
    fehlt = dict(probe)
    fehlt[erste[0]] = fehlt[erste[0]].replace(erste[1], "", 1)
    ok = ok and bool(ersetze(fehlt)[1])                        # fehlender Anker wird abgelehnt
    # 26.11.2026: Rückweg nur bei unveränderter Nach-Fassung (Prüfsumme), alles oder nichts
    teile = {"Tabelle (Ersetzungen, Idempotenz, Doppel-/Fehlanker)": ok}
    sich = {d: probe[d] + "REST " + d for d in DATEIEN}                  # je Datei eine Probe-Sicherung
    nach = {d: ersetze({d: t}, nur={d})[0][d] for d, t in sich.items()}  # = Stand direkt nach dem Lauf
    plan, f1 = zurueck_plan(sich, nach)
    teile["Rückweg bei unveränderter Nach-Fassung = genau die Sicherungen"] = not f1 and dict(plan) == sich
    geaendert = dict(nach)
    geaendert["layout/theme.liquid"] += "<!-- Masstabelle 25.11. -->"
    plan2, f2 = zurueck_plan(sich, geaendert)
    teile["eine abweichende Prüfsumme sperrt ALLE Dateien"] = plan2 == [] and any("layout/theme.liquid" in x and "Prüfsumme" in x for x in f2)
    plan3, f3 = zurueck_plan(sich, {d: t for d, t in nach.items() if d != "templates/index.json"})
    teile["fehlende Ziel-Datei sperrt"] = plan3 == [] and bool(f3)
    teile["Ziel fest 187533001089 (nie das Live-Theme)"] = THEME_2210.endswith("/187533001089") and lese.__defaults__ == (THEME_2210,)
    code = re.sub(r"#.*|\"\"\"[\s\S]*?\"\"\"", "", open(os.path.abspath(__file__), encoding="utf-8").read().split("def selbsttest")[0])
    teile["keine Kopplung an warenkorb_einig (THEME/lese)"] = not re.search(r"(import|from)\s+warenkorb_einig|\bw\.(THEME|lese|gql)\b", code)
    import main_theme
    imp_ok, imp_m = main_theme.import_ohne_netz("theme_gratis_schwelle_50", pfad=HIER + os.pathsep + main_theme.HIER)
    teile[f"Import ohne Abfrage ({imp_m})"] = imp_ok
    rot = [k for k, v in teile.items() if not v]
    print(f"SELBSTTEST {'OK' if not rot else 'FEHLGESCHLAGEN'}: {len(teile) - len(rot)}/{len(teile)} "
          f"({len(ERSETZUNGEN)} Ersetzungen; Rückweg nur mit Prüfsumme; Ziel fest {THEME_2210.rsplit('/', 1)[1]})" + ("" if not rot else " — " + " · ".join(rot)))
    return 0 if not rot else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(zurueck() if "--zurueck" in sys.argv else hauptlauf())
