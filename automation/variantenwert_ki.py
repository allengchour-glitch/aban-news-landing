#!/usr/bin/env python3
"""variantenwert_ki.py — englische Lieferanten-Variantenwerte, die keine Tabelle kennt, per KI mit Zweitprüfer übersetzen
(09.10.2026, Betreiber «weiter»).

GEMESSEN 09.10. (variant_value_clean.py, Durchgang 13:22–15:52 UTC, `dropship/VARIANTENWERTE-ENGLISCH.md`): 3'048 Optionen
mit englischen Werten, davon nur 9 übersetzt — 15'783 Werte enthalten ein Wort, das keine Tabelle kennt («inner», «shell»,
«Without Chest Pad», «Hidden Elevator 8CM»). Auf besuchten Seiten: Plateau-Sneaker (10 Sitzungen/30 T) «Black, Hidden
Elevator 8CM», Yoga-Jumpsuit «Beige Without Chest Pad», Uhren «Black Belt Silver Case». Die Tabelle wächst Wort für Wort
(«nur mit EINER Lesart aufnehmen») — das holt den Rest nie ein.

WEG (nichts neu gebaut, nur verbunden):
  * Kandidaten = Optionen, in denen variant_value_clean.englisch() anschlägt UND wert_de() mindestens einen englischen Wert
    NICHT übersetzen kann (alles andere erledigt der Tabellen-Lauf täglich selbst).
  * Übersetzung = auswahl_werte.uebersetze_ki(): Übersetzer (zweitmodell: OpenAI → Groq gpt-oss-120b), harte Prüfung
    pruefe_ki() (Anzahl, Zahlen, Masse, Bereiche, englische Reste, jede Grundfarbe übersetzt, ≤ 32 Zeichen, eindeutig),
    danach Zweitprüfer anderer Modellfamilie (qwen) — Ledger `dropship/_auswahl_uebersetzt.jsonl` (nie zweimal gefragt).
  * Der Optionsname bleibt. Sagt die KI eine andere ART (Grösse/Länge/Volumen/Menge statt Farbe/Ausführung), wird nichts
    geschrieben (gemeldet) — dann steckt eine andere Wahl im Feld.
  * Vorrang: besuchte Seiten (30 T, Sitzungen absteigend), dann neueste Produkte. MAX je Lauf (Std. 60) — Groq hat ein
    Tageskontingent je Modell, und der Bestell-Bildvergleich braucht dasselbe Prüfmodell.
  * Editor/POD nie, linkedMetafield nie, nur ACTIVE. productOptionUpdate LEAVE_AS_IS, Rücklesen je Option.
  Ledger dropship/_variantenwert_ki.tsv.

  python3 automation/variantenwert_ki.py                  # trocken: zeigt Vorschläge (fragt die KI, schreibt nichts in Shopify)
  SCHARF=1 [MAX=n] [IDS=…] python3 automation/variantenwert_ki.py
  python3 automation/variantenwert_ki.py --selbsttest     # Selbsttests beider Bausteine
"""
import datetime as dt, json, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
EXPORT = os.environ.get("EXPORT", "/tmp/farbmuster_export.jsonl")
HANDLES = os.environ.get("HANDLES", "/tmp/gkat_fein_export.jsonl")
LEDGER = os.path.join(REPO, "dropship", "_variantenwert_ki.tsv")
SCHARF = os.environ.get("SCHARF") == "1"
MAX = int(os.environ.get("MAX") or 60)
IDS = {x if x.startswith("gid:") else f"gid://shopify/Product/{x}" for x in os.environ.get("IDS", "").split(",") if x.strip()}
OPT = re.compile(r"(?i)^(farbe|color|colour|ausf(ü|ue)hrung|muster|design|motiv|stil|style|variante|typ|modell|set)$")
ART_GLEICH = {"Farbe", "Ausführung", "Variante", "Motiv", "Muster", "Stil", "Typ", "Modell", "Set", "Material", "Form"}
POD = re.compile(r"\bpod\b|printful|selbst-gestalten|editor", re.I)
# «Color» → «Farbe» als WERT sagt nichts (CJ meint meist «bunt») — so ein Ergebnis wird gemeldet, nicht geschrieben.
LEER_WERT = re.compile(r"(?i)^\s*(farbe|farben|ausführung|variante|modell|stil|typ|muster|design|standard)\s*$|^\s*mode\s*·")


def braucht_ki(werte):
    """Englischer Wert, den die Tabellen nicht übersetzen können?"""
    import variant_value_clean as vvc
    kx = vvc.option_kontext(werte)
    return any(vvc.englisch(w) and vvc.wert_de(w, kx)[0] is None for w in werte)


def kandidaten():
    handle = {}
    try:
        for z in open(HANDLES, encoding="utf-8"):
            p = json.loads(z); handle[p["id"]] = p.get("handle")
    except OSError:
        pass
    out = []
    for z in open(EXPORT, encoding="utf-8"):
        p = json.loads(z)
        if IDS and p["id"] not in IDS:
            continue
        for o in p.get("options") or []:
            w = [v["name"] for v in o["optionValues"]]
            if OPT.match(o["name"]) and len(w) >= 1 and braucht_ki(w):
                out.append((p["id"], handle.get(p["id"]), p["title"]))
                break
    return out


def vorrang(kand):
    import variant_value_clean as vvc
    try:
        besuche = dict(vvc.besuchte_seiten(30))
    except Exception as e:
        print("Besuche nicht lesbar:", str(e)[:100]); besuche = {}
    kand = [(besuche.get(h or "", 0), int(pid.split("/")[-1]), pid, h, t) for pid, h, t in kand]
    kand.sort(key=lambda x: (-x[0], -x[1]))
    return kand


def bearbeiten(pid):
    from kaufwille_zeile import gql
    import auswahl_werte as aw
    p = gql('query($i:ID!){product(id:$i){title status tags options{id name linkedMetafield{key} optionValues{id name}}}}',
            {"i": pid})["product"]
    if not p or p["status"] != "ACTIVE" or POD.search(" ".join(p["tags"])):
        return [("—", "", "nicht aktiv / Editor")]
    erg = []
    for o in p["options"]:
        werte = [v["name"] for v in o["optionValues"]]
        if not OPT.match(o["name"]) or not braucht_ki(werte):
            continue
        if o.get("linkedMetafield"):
            erg.append((o["name"], "", "linkedMetafield")); continue
        # 09.10. (erster Trockenlauf 18/20 abgelehnt): pruefe_ki hält jedes Wort, das schon im Original steht, für einen
        # englischen Rest — im Bestand stehen aber deutsche Werte daneben («Schwarz», «Weiss»). Darum: deutsche Werte bleiben,
        # Tabellen-Wörter übersetzt wert_de(), NUR der unbekannte englische Rest geht an die KI.
        import variant_value_clean as vvc
        kx = vvc.option_kontext(werte)
        neu, ki_idx = list(werte), []
        for i, w in enumerate(werte):
            if vvc.englisch(w):
                d = vvc.wert_de(w, kx)[0]
                if d:
                    neu[i] = d
                else:
                    ki_idx.append(i)
        try:
            r = aw.uebersetze_ki(p["title"], [[werte[i] for i in ki_idx]])[0]
        except RuntimeError as e:
            erg.append((o["name"], "", "KI-PAUSE " + str(e)[:80])); break
        if not r:
            erg.append((o["name"], " | ".join(werte[i] for i in ki_idx)[:120], "abgelehnt (Prüfung/Zweitprüfer)")); continue
        art, ki_werte = r
        if art not in ART_GLEICH and art != o["name"]:
            erg.append((o["name"], f"KI sagt «{art}»: " + " | ".join(ki_werte)[:100], "art-anders (gemeldet)")); continue
        if any(LEER_WERT.match(x) for x in ki_werte):
            erg.append((o["name"], " | ".join(ki_werte)[:100], "leerwort (gemeldet)")); continue
        for i, w in zip(ki_idx, ki_werte):
            neu[i] = w
        if len({x.strip().lower() for x in neu}) != len(neu):
            erg.append((o["name"], " | ".join(neu)[:100], "kollision")); continue
        aend = " | ".join(f"{a}→{b}" for a, b in zip(werte, neu) if a != b)
        if not aend:
            erg.append((o["name"], "", "unverändert")); continue
        if not SCHARF:
            erg.append((o["name"], aend, "trocken")); continue
        upd = [{"id": v["id"], "name": n} for v, n in zip(o["optionValues"], neu) if v["name"] != n]
        m = gql("mutation($p:ID!,$o:OptionUpdateInput!,$u:[OptionValueUpdateInput!]){productOptionUpdate(productId:$p,"
                "option:$o,optionValuesToUpdate:$u,variantStrategy:LEAVE_AS_IS){userErrors{message}}}",
                {"p": pid, "o": {"id": o["id"]}, "u": upd})["productOptionUpdate"]
        if m["userErrors"]:
            erg.append((o["name"], aend, "FEHLER " + m["userErrors"][0]["message"][:80])); continue
        rl = gql('query($i:ID!){product(id:$i){options{id optionValues{name}}}}', {"i": pid})["product"]["options"]
        ist = next(([v["name"] for v in x["optionValues"]] for x in rl if x["id"] == o["id"]), None)
        erg.append((o["name"], aend, "ok" if ist == neu else "RÜCKLESEN ABWEICHEND"))
    return erg or [("—", "", "live nichts zu tun")]


def main():
    if "--selbsttest" in sys.argv:
        import variant_value_clean as vvc, auswahl_werte as aw
        a = vvc.selbsttest()
        b = aw.selbsttest() if hasattr(aw, "selbsttest") else 0
        ok = braucht_ki(["Black", "Beige Without Chest Pad"]) and not braucht_ki(["Black", "White"]) \
            and not braucht_ki(["Schwarz", "Weiss"])
        print(f"VARIANTENWERT-KI Kanarien {'3/3' if ok else 'ROT'}")
        sys.exit(0 if (a == 0 and not b and ok) else 1)
    if not os.path.exists(EXPORT):
        raise SystemExit(f"Export fehlt: {EXPORT}")
    kand = vorrang(kandidaten())
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ} · {'SCHARF' if SCHARF else 'TROCKEN'} · {len(kand)} Kandidaten "
          f"({sum(1 for k in kand if k[0])} besucht) · MAX {MAX}")
    zahl = {}
    with open(LEDGER, "a", encoding="utf-8") as led:
        folge = 0                                   # 09.10.: EINE unvollständige KI-Antwort beendete den Lauf → erst nach 3 in Folge
        for besuche, _, pid, h, titel in kand[:MAX]:
            pause = False
            for opt, aend, st in bearbeiten(pid):
                k = st.split(" ")[0]; zahl[k] = zahl.get(k, 0) + 1
                print(f"  {st[:22]:22} {besuche:3} {titel[:44]:44} {opt}: {aend[:170]}")
                if SCHARF:
                    led.write(f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{pid}\t{opt}\t{aend}\t{st}\n")
                pause = pause or st.startswith("KI-PAUSE")
            folge = folge + 1 if pause else 0
            if folge >= 3:
                print("KI dreimal in Folge nicht erreichbar — Lauf endet, nächster Lauf macht weiter"); break
    print(f"FERTIG {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}: {zahl}")


if __name__ == "__main__":
    main()
