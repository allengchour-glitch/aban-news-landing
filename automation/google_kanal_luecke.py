#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""google_kanal_luecke.py — findet Ware, die NUR im Google-Kanal fehlt.

WARUM: Google & YouTube ist der einzige Kanal mit belegten Verkäufen. Am 22.08.2026 gezählt:
Von 4'779 seit dem 19.08. neu angelegten aktiven Produkten stehen 100 % im Online Store,
99,9 % in TikTok/Facebook/Pinterest — aber nur 98,1 % bei Google. 85 Produkte fehlen dort,
und NUR dort.

✅ DIE URSACHE IST GEFUNDEN (22.08.2026, über die Shopify-Ereignisliste eines Einzelfalls).
Beim Polohemd 15508310557057 steht lückenlos: «included on Online Store» 02:11:21 ·
«Shop» 02:11:21 · «TikTok» 02:11:22 · «Facebook & Instagram» 02:11:23 · «Pinterest» 02:11:24
— Google & YouTube fehlt, und es gibt auch KEIN «removed». Das Produkt wurde also nie
publiziert, nicht später entfernt. `cj_sku_import.mjs` und `cj_trending_import.mjs` riefen
`publishablePublish` auf, ohne die Antwort je zu lesen; fiel eine einzelne Publikation aus,
landete das Produkt in fünf von sechs Kanälen und niemand merkte es. `cj_category_fill.mjs`
hatte dafür längst `publishVerified()` — die beiden Geschwister blieben ungepatcht. Beide
haben die geprüfte Fassung jetzt, der NACHSCHUB ist damit gestoppt.

Dieser Wächter bleibt trotzdem: Er ist der Beweis, dass die Reparatur hält, und er fängt
jede künftige Publish-Lücke — egal, welcher Schreiber sie erzeugt.

⚠️ ER PUBLIZIERT NICHTS. Ein Teil der Ausschlüsse IST gewollt (Kostüm, Erotik, Refurb,
Klingen), und ein Fehlgriff im Google-Kanal riskiert die Merchant-Sperre — also genau den
Kanal, der verkauft. Das Nachpublizieren macht `google_kanal_luecke_schliessen.py`, und
zwar nur für Ware, die dieselben Regeln wie `google_kanal_nachziehen.py` besteht — LIVE
geprüft, mit Quittung, und mit `DRY=1` erst zum Lesen.

ENV: SEIT=JJJJ-MM-TT (Default: die letzten 7 Tage)
"""
import json, os, subprocess, sys, time, datetime, re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shop_kanal import im_onlineshop
from google_sperrliste import gesperrte_ids, id_zahl, ausschluss_tag

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
BERICHT = "dropship/GOOGLE-KANAL-LUECKE.md"
SEIT = os.environ.get("SEIT") or (
    datetime.date.today() - datetime.timedelta(days=7)).isoformat()
# ⚠️ 28.08.2026 — DAS FENSTER IST DER GRÖSSTE BLINDE FLECK DIESES WÄCHTERS.
# Er prüft per Vorgabe nur die letzten sieben Tage. Am 28.08. lagen 572 von 574 Lücken
# ausserhalb davon — der tägliche Lauf meldet also dauerhaft «fast nichts», während der
# Rückstand vollständig erhalten bleibt und mit jedem Tag wächst. Das ist dieselbe Klasse
# wie «FERTIG heisst: nichts mehr zu TUN, nicht: nichts mehr zu SEHEN» (21.08.).
# VOLL=1 prüft den GANZEN aktiven Katalog. Das dauert bei ~49'000 Produkten lange und
# gehört deshalb NICHT in den Aufseher (ein Lauf, der eine Stunde braucht, ist in diesem
# Container kein Lauf, Lehre 28.08.) — von Hand starten, etwa einmal im Monat.
VOLL = os.environ.get("VOLL") == "1"
FILTER = "status:active" if VOLL else f"status:active created_at:>={SEIT}"

# Tags, die einen Ausschluss ERKLÄREN, liegen seit dem 28.08.2026 in
# automation/google_sperrliste.py (`AUSSCHLUSS_TAGS` / `ausschluss_tag`). Die Menge stand
# hier UND im Schliesser wortgleich; sie ist am 28.08. auseinandergelaufen, weil elf am
# Produkt begründete Ausschluss-Tags (verdeckte-ueberwachung, google-policy-flag,
# nicht-google-bewerben, gmc-adult-pull …) in keiner der beiden standen — dieser Wächter
# hat 142 bewusste Ausschlüsse als unerklärte Lücke gemeldet, darunter zwölf versteckte
# Kameras. NEUE AUSSCHLUSS-TAGS NUR DORT EINTRAGEN.
# Dieselbe Hausregel wie in den Importern: Klingen gehören nicht in den Google-Kanal.
# ⚠️ 29.08.2026 — die Regel lag in FÜNF Dateien und musste zweimal in allen fünf repariert
# werden (28.08. deutsche Zusammensetzungen, 29.08. Waffenzubehör mit dem Waffenwort vorne).
# Sie liegt jetzt EINMAL in `automation/klingenregel.json`; die Begründung jeder Stufe steht
# in `automation/klingenregel.py`. **Neue Klingenwörter NUR dort.**
from klingenregel import ist_klinge

# Ledger der Wächter, die bewusst aus dem Google-Kanal ENTFERNEN. Ein so entfernter
# Artikel traegt keinen Tag — sein Grund steht nur hier. Ohne diese Pruefung meldet der
# Waechter jede bewusste Kuration als Fehler (der Katalog-Audit vom 22.08. hat genau so
# 27 Produkte falsch angeklagt).
# Jede Zeile: Produkt-Gid, Grund, Titel. Beim Ledger des Schliessers zaehlt NUR das
# begruendete Nein («bleibt-draussen:…») als Erklaerung — «publiziert» ist das Gegenteil
# und darf eine spaetere Entfernung nicht verdecken.
LEDGER = [("dropship/_google_kanal_gesaeubert.txt", None),
          ("dropship/_google_kanal_gesaeubert2.txt", None),
          ("dropship/_google_feed_cull.txt", None),
          ("dropship/_google_kanal_luecke_geschlossen.txt", "bleibt-draussen")]

# ⚠️ 29.08.2026 — DER WÄCHTER HAT SEINE EIGENE ALARMANLAGE ABGESTELLT.
# Der Schliesser (`google_kanal_luecke_schliessen.py`) schreibt bei jedem Nein eine
# Quittung «bleibt-draussen:<Grund>». Die meisten Gründe sind ausserhalb seiner selbst
# begründet und vom Wächter unabhängig nachprüfbar (ein Sperr-Tag am Produkt, die
# Klingen-Hausregel, eine Heilaussage im Titel). EINER ist es nicht: «heikle Ware» ist
# das Urteil seiner EIGENEN, bewusst groben Wortliste.
# Folge: Fünf Küchen-Zubehörteile, die seit dem 22.08. ausdrücklich als offene
# BETREIBER-Entscheidung in `dropship/COWORK-AUFTRAEGE.md` stehen, verschwanden aus dem
# Bericht — der Wächter meldete «keine Lücke», während sie live weiter bei Google fehlten.
# **Ein Werkzeug darf seine eigene Vermutung nicht als Erklärung akzeptieren.** Dieselbe
# Familie wie das Zombie-Ledger (25.08.) und «ein Kommentar ist ein Datum, kein Beweis».
# Sie werden deshalb NICHT verschwiegen und NICHT als Fehler gemeldet, sondern in einem
# eigenen Abschnitt des Berichts geführt, bis ein Mensch entscheidet.
SCHWACHER_GRUND = "bleibt-draussen:heikle Ware"


def gesaeubert():
    """(raus, schwach) — Produkt-ID -> Grund, aus allen Saeuberungs-Ledgern.

    `raus`    = belegte Ausschluesse; sie erklaeren die Luecke.
    `schwach` = das Wortlisten-Urteil des Schliessers; es erklaert sie NICHT
                (siehe SCHWACHER_GRUND oben), taucht aber getrennt im Bericht auf.
    """
    raus, schwach, unlesbar = {}, {}, []
    for pfad, nur in LEDGER:
        if not os.path.exists(pfad):
            continue
        for zeile in open(pfad, encoding="utf-8", errors="replace"):
            z = zeile.rstrip("\n")
            if not z.strip():
                continue
            # ⚠️ 28.08.2026 — DIE ID WIRD MIT EINEM MUSTER GEZOGEN, NICHT ÜBER SPALTEN.
            # `_google_kanal_gesaeubert.txt` ist zur Hälfte gewachsen: 88 Zeilen sind mit
            # Tabulator getrennt, 45 mit « | ». Das alte split("\t") ergab bei den 45 als
            # erstes Feld die GANZE Zeile, split("/")[-1] war dann
            # «15413739684225 | Sommerkleid … | Sperr-Tag …», isdigit() war falsch — die
            # Zeile fiel LAUTLOS weg. Der Wächter kannte 88 statt 133 IDs, und 44 der 45
            # fehlten tatsächlich im Google-Kanal: ihr dokumentierter Grund war für das
            # Werkzeug nicht vorhanden. Ein Ledger, das einen Formatwechsel still
            # schluckt, ist schlimmer als keins — es sieht vollständig aus.
            if z.lstrip().startswith("#"):
                continue                        # Kommentarzeile, keine Quittung
            m = re.search(r"/Product/(\d+)", z) or re.match(r"\s*(\d{10,})\b", z)
            if not m:
                unlesbar.append((pfad, z[:90]))
                continue
            # Der Grund steht je nach Format an anderer Stelle: bei Tabulator-Zeilen im
            # ersten Feld (ID \t Grund \t Titel), bei den «|»-Zeilen erst hinter dem Titel
            # (ID | Titel | Grund). Gefiltert wird nur auf dem Tabulator-Format
            # («bleibt-draussen:…»), sonst wird der ganze Rest als Begruendung uebernommen.
            rest = z[m.end():].strip(" \t|")
            grund = rest.split("\t")[0].strip() if "\t" in rest else rest.strip()
            grund = grund or "gesaeubert"
            if nur and not grund.startswith(nur):
                continue
            if grund == SCHWACHER_GRUND:
                schwach.setdefault(m.group(1), grund)
                continue
            raus.setdefault(m.group(1), grund)
    if unlesbar:
        print(f"  ⚠️ {len(unlesbar)} Ledger-Zeilen ohne erkennbare Produkt-ID:", flush=True)
        for pf, z in unlesbar[:5]:
            print(f"     {pf}: {z}", flush=True)
    return raus, schwach


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
            if d.get("errors"):
                if "THROTTL" in json.dumps(d["errors"]).upper():
                    time.sleep(4 + i * 3); continue
                print("  GraphQL-Fehler:", json.dumps(d["errors"])[:170], flush=True)
                return None
        except Exception:
            pass
        time.sleep(3 + i)
    return None


def main():
    raus, schwach = gesaeubert()
    # ⚠️ 28.08.2026 — DAS MERCHANT-LEDGER FEHLTE HIER GANZ. 16 Produkte, die GOOGLE SELBST
    # als Richtlinienverstoss gemeldet hat (google-gesperrt-adult/-cbd/-notlage), galten
    # diesem Wächter als unerklärte Lücke; der Schliesser, der tatsächlich publiziert,
    # hatte denselben blinden Fleck. Genau dafür wurde google_sperrliste.py am 14.08.
    # gebaut — nachdem gfeed_restore.py und google_kanal_nachziehen.py alle 16 schon
    # einmal zurückgeholt hatten. Gerettet hat uns bisher nur ein FEHLER: das 7-Tage-
    # Fenster verdeckte sie. Eine Sicherung aus einem Fehler ist keine Sicherung.
    for pid in gesperrte_ids():
        raus.setdefault(pid, "google-gesperrt (Merchant-Ledger)")
    print(f"Saeuberungs-Ledger + Merchant-Sperrliste: {len(raus)} bewusst entfernte "
          f"Produkte bekannt", flush=True)
    cur, ges, treffer, wortliste = None, 0, [], []
    while True:
        d = gql('query($c:String,$f:String){ products(first:30, after:$c, '
                'query:$f){ '
                'pageInfo{hasNextPage endCursor} nodes{ id title tags '
                'resourcePublications(first:8){ nodes{ isPublished publication{ name } } } } } }',
                {"c": cur, "f": FILTER})
        # ⚠️ Eine gescheiterte Abfrage ist KEIN Befund. Sie darf weder einen Bericht
        # erzeugen noch FERTIG melden — sonst meldet der Waechter erfundene Luecken
        # (beim Bau dieses Skripts genau so passiert: eine leere Antwort haette ALLE
        # Produkte als «fehlt bei Google» ausgegeben).
        if d is None:
            print(f"PAUSE (Shopify antwortet nicht — bei {ges} Produkten, kein Befund)")
            return
        pg = d["data"]["products"]
        for p in pg["nodes"]:
            ges += 1
            pubs = {n["publication"]["name"]: n["isPublished"]
                    for n in p["resourcePublications"]["nodes"]}
            if pubs.get("Google & YouTube"):
                continue
            if not im_onlineshop(pubs):
                continue                       # gar nicht im Shop -> anderes Thema
            pid = p["id"].split("/")[-1]
            if pid in raus:
                continue                       # bewusst gesaeubert (Grund im Ledger)
            if pid in schwach:
                # Nur das Wortlisten-Urteil des Schliessers — kein Beleg, aber auch
                # kein Fehler. Eigener Abschnitt statt Schweigen.
                wortliste.append((pid, p["title"] or ""))
                continue
            if ausschluss_tag(p["tags"]):
                continue                       # Ausschluss ist erklaert (Sperrliste)
            t = p["title"] or ""
            if ist_klinge(t):
                continue                       # Hausregel Klingen
            treffer.append((pid, t))
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
        time.sleep(0.8)

    bereich = "der GANZE aktive Katalog" if VOLL else f"aktive Produkte seit {SEIT}"
    print(f"Geprueft: {ges} — {bereich}", flush=True)
    if not VOLL:
        print("  ⚠️ Dieser Lauf sieht NUR das Zeitfenster. Aeltere Luecken bleiben "
              "unsichtbar — fuer den Rueckstand einmalig mit VOLL=1 starten.", flush=True)
    def wortlisten_abschnitt(f):
        if not wortliste:
            return
        f.write("\n## Vom Schliesser als «heikle Ware» eingestuft — Wortlisten-Urteil, "
                "keine Entscheidung\n\n")
        f.write("Diese Produkte hat `google_kanal_luecke_schliessen.py` mit seiner eigenen, "
                "bewusst groben Wortliste abgelehnt. Das ist eine Vermutung, kein Beleg — "
                "deshalb stehen sie hier statt zu verschwinden. Ein Mensch entscheidet "
                "einmal; danach gehoert das Ergebnis als richtiger Grund ins Ledger.\n\n")
        for pid, t2 in wortliste:
            f.write(f"- `{pid}` — {t2}\n")

    if treffer or wortliste:
        with open(BERICHT, "w", encoding="utf-8") as f:
            f.write("# Ware, die NUR im Google-Kanal fehlt\n\n")
            f.write(f"Stand {datetime.date.today().isoformat()} · "
                    f"{'ganzer aktiver Katalog' if VOLL else 'geprüft seit ' + SEIT} · "
                    f"{ges} aktive Produkte\n\n")
            if not VOLL:
                f.write("⚠️ Nur das Zeitfenster geprüft — ältere Lücken stehen hier NICHT. "
                        "Für den Rückstand `VOLL=1 python3 automation/google_kanal_luecke.py`.\n\n")
            f.write("Google & YouTube ist der einzige Kanal mit belegten Verkäufen.\n\n")
            f.write("⚠️ Vor dem Nachpublizieren einzeln ansehen: Ein Fehlgriff im "
                    "Google-Kanal riskiert die Merchant-Sperre.\n\n")
            if treffer:
                f.write("## Ohne jeden erkennbaren Grund draussen\n\n")
                f.write("Diese Produkte stehen im Online Store, tragen **kein** Sperr-Tag, "
                        "sind in keinem Säuberungs-Ledger vermerkt und fallen nicht unter "
                        "die Klingen-Hausregel — trotzdem fehlen sie bei Google.\n\n")
                for pid, t in treffer:
                    f.write(f"- `{pid}` — {t}\n")
            wortlisten_abschnitt(f)
        if treffer:
            print(f"⚠️ {len(treffer)} Produkte fehlen nur bei Google -> {BERICHT}")
            for pid, t in treffer[:10]:
                print(f"   {pid}  {t[:56]}")
        if wortliste:
            print(f"  {len(wortliste)} als «heikle Ware» eingestuft (Wortlisten-Urteil, "
                  f"wartet auf eine Entscheidung) -> {BERICHT}")
    else:
        if os.path.exists(BERICHT):
            os.remove(BERICHT)
            print(f"  Bericht {BERICHT} entfernt (keine Luecke mehr)")
        print("  Keine Luecke: alle neuen Produkte ohne Sperrgrund stehen im Google-Kanal.")
    # FERTIG haengt an «nichts zu TUN». Gemeldetes ist ein Rueckstand fuer den Betreiber,
    # keine offene Arbeit dieses Laufs (Lehre 21.08.: ein Melde-Waechter wird sonst nie fertig).
    print("FERTIG")


main()
