#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""test_klingen_tor.py — Kanarienvoegel fuer das Klingen-Tor (Ping-Pong 22.09.2026).

Prueft das EINE Tor `klinge_ch_wache.klingen_tor(titel, tags)`, das der Rueckholer
`cj_versand_ch_revive.py` und der RUECKHOL-Pfad in `cj_verfuegbarkeit.py` vor jeder
Status-ACTIVE-Mutation aufrufen, in BEIDE Richtungen:

  MUSS SPERREN (True):
    - die zwei Retraktionsmesser (im Revive erreichbar: DRAFT + cj-nicht-versendbar-ch
      + vid im Pruef-Ledger, nie quittiert)
    - die fuenf Klingen, die der Revive am 16.09. zurueckholte (inkl. Fuda-Taschenmesser
      aus der zurueckgesandten Bestellung #1017)
    - der Samurai-Katana vom 21.09. 22:10Z — ueber den Titel UND allein ueber den Tag
    - Teppich-/Cuttermesser (Wortstamm «messer», kein Zubehoer-Wort)
  DARF NICHT SPERREN (False):
    - Kuechenhelfer ohne Klinge im Paket (Messerblock, Knoblauchpresse, Schaeler, Schere)
    - Messgeraete («…messer» als Endung: Herzfrequenzmesser)

⚠️ Die Titel stehen hier WOERTLICH wie am 22.09.2026 live im Shop gemessen (Voll-Export
ueber productByHandle, nicht ueber `title:messer*` — Shopify sucht Wort-ANFAENGE und
findet «Taschenmesser» nie). Aendert jemand einen Titel im Shop, veraltet der Kanarien-
vogel hier, nicht die Regel: darum liest `--live` die Handles zusaetzlich frisch nach.

Aufruf:  python3 automation/test_klingen_tor.py            (Exit 0 = alle richtig)
         python3 automation/test_klingen_tor.py --live     (+ Shop: alle 8 Handles DRAFT?)
"""
import json
import os
import ssl
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from klinge_ch_wache import klingen_tor, SPERR_TAG          # noqa: E402
from klingenregel import ist_handklinge                     # noqa: E402

# (handle, titel wie gemessen 22.09.2026, tags-im-Test)
MUSS_SPERREN = [
    # die zwei Retraktionsmesser — «erreichbar» fuer den Revive
    ("alu-retraktionsmesser-mit-5-ersatzklingen-244098", "Alu-Retraktionsmesser mit 5 Ersatzklingen", []),
    ("aluminium-einziehmesser-mit-5-ersatzklingen-108289", "Aluminium Einziehmesser mit 5 Ersatzklingen", []),
    # die fuenf vom 16.09. (Revive-Ledger, Block nach der Quittung der Wache)
    ("kochmesser-damaststahl-olivenholz-609400", "Kochmesser Damaststahl Olivenholz", []),
    ("damast-kochmesser-set-602200", "Damast Kochmesser-Set", []),
    ("damast-kuchenmesser-set-619600", "Damast Küchenmesser-Set", []),
    ("fuda-taschenmesser-aus-damaststahl-634100", "Fuda Taschenmesser aus Damaststahl", []),
    ("klingen-set-mit-metallgriff-604200", "Klingen-Set mit Metallgriff", []),
    # der Katana vom 21.09. — Titel ohne «Deko», Handle mit
    ("samurai-schwert-deko-089216", "Japanischer Samurai mit Katana-Schwert, 30 cm", []),
]
# Nur der Tag, Titel harmlos: das Urteil einer Wache haelt auch ohne Regeltreffer.
NUR_TAG = [("(kein Handle)", "Geschenkbox aus Holz", [SPERR_TAG])]
# Klassen ohne Handle
KLASSE_SPERREN = ["Teppichmesser mit Ersatzklingen", "Cuttermesser 18 mm", "Edelstahl-Messerset"]
DARF_NICHT = [
    "Messerblock aus Bambus",
    "Knoblauchpresse aus Edelstahl",
    "Sparschäler mit Keramikklinge",
    "Küchenschere mit Flaschenöffner",
    "Herzfrequenzmesser mit Brustgurt",
    "Messerschärfer 3-stufig",
]


def pruefen():
    fehler = []
    for h, t, tags in MUSS_SPERREN + NUR_TAG:
        g, grund = klingen_tor(t, tags)
        print(f"  {'✓' if g else '✗'} SPERRT  {t[:48]:50} {grund}")
        if not g:
            fehler.append(f"NICHT gesperrt: {h} «{t}»")
    for h, t, tags in MUSS_SPERREN:
        if not ist_handklinge(t):
            fehler.append(f"ist_handklinge False (nur der Tag wuerde halten): {h} «{t}»")
    for t in KLASSE_SPERREN:
        g, grund = klingen_tor(t, [])
        print(f"  {'✓' if g else '✗'} SPERRT  {t[:48]:50} {grund}")
        if not g:
            fehler.append(f"NICHT gesperrt: «{t}»")
    for t in DARF_NICHT:
        g, grund = klingen_tor(t, [])
        print(f"  {'✓' if not g else '✗'} FREI    {t[:48]:50} {grund}")
        if g:
            fehler.append(f"FALSCH gesperrt: «{t}» ({grund})")
    return fehler


def live():
    """Alle Kanarien-Handles frisch aus dem Shop: Status muss DRAFT sein, Titel wie hier."""
    tok = "/tmp/cj_shop_token.txt"
    if not os.path.exists(tok):
        return ["--live: kein Token (/tmp/cj_shop_token.txt) — nicht gemessen"]
    ctx = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
    hs = [h for h, _, _ in MUSS_SPERREN]
    q = "{" + " ".join(f'p{i}: productByHandle(handle:"{h}"){{handle title status tags}}'
                       for i, h in enumerate(hs)) + "}"
    req = urllib.request.Request("https://au3j0y-hq.myshopify.com/admin/api/2026-01/graphql.json",
                                 data=json.dumps({"query": q}).encode(),
                                 headers={"X-Shopify-Access-Token": open(tok).read().strip(),
                                          "Content-Type": "application/json"})
    d = json.loads(urllib.request.urlopen(req, timeout=60, context=ctx).read())
    if d.get("data") is None:
        return ["--live: GraphQL ohne data: " + json.dumps(d)[:160]]
    fehler = []
    titel = {h: t for h, t, _ in MUSS_SPERREN}
    for v in d["data"].values():
        if not v:
            fehler.append("--live: Handle nicht gefunden"); continue
        g, grund = klingen_tor(v["title"], v["tags"])
        ok = v["status"] == "DRAFT" and g
        print(f"  {'✓' if ok else '✗'} LIVE    {v['handle'][:44]:46} {v['status']:6} "
              f"{'Tag' if SPERR_TAG in v['tags'] else 'kein Tag':8} {grund[:40]}")
        if v["status"] != "DRAFT":
            fehler.append(f"--live: {v['handle']} ist {v['status']} (Ping-Pong laeuft wieder)")
        if not g:
            fehler.append(f"--live: {v['handle']} wuerde das Tor passieren")
        if v["title"] != titel.get(v["handle"]):
            print(f"    (Titel geaendert: jetzt «{v['title']}» — Kanarienvogel hier nachziehen)")
    return fehler


if __name__ == "__main__":
    f = pruefen()
    if "--live" in sys.argv:
        f += live()
    if f:
        print("\nFEHLER:")
        for z in f:
            print("  -", z)
        sys.exit(1)
    print("\nOK: Klingen-Tor sperrt alle Kanarienvoegel und laesst Kuechenhelfer ohne Klinge durch")
    sys.exit(0)
