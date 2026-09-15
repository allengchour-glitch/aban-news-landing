# -*- coding: utf-8 -*-
"""marge_wahrheit.py — misst, welche AKTIVEN Varianten unter den echten Vollkosten stehen.

Warum es dieses Werkzeug braucht: der bestehende Preisboden ist ABSOLUT (CHF 14.90/16.90).
Bestellung #1015 lag mit 22.90 weit darueber und war trotzdem ein Verlust (EK 20.84).
Ein absoluter Boden kann Verluste nicht verhindern — nur ein Boden AUF DIE KOSTEN kann das.

⚠️⚠️ DIE FRACHT STECKT SCHON IN unitCost — NICHT ZWEIMAL ABZIEHEN (Fehler vom 15.09.).
`automation/cj_kosten_backfill.mjs` schreibt ausdruecklich «Warenkosten (CJ-Preis USD x 0.9)
+ VOLLE Fracht». Mein erster Lauf zog 4.50 noch einmal ab und meldete 229'374 Verlustartikel —
eine Zahl, die durch meinen eigenen Rechenfehler entstand.

VOLLKOSTEN = unitCost (Ware + Fracht) + Zahlungsgebuehr + Waehrungsverlust.
  Gebuehr       2.9 % + 0.30
  Waehrung      1.5 %      CJ rechnet USD, wir kassieren CHF (QUELLE, nicht selbst gemessen)

VERSANDERLOES: unter der Gratis-Schwelle zahlt die Kundin CHF 7. Gemessen an den eigenen
Bestellungen traegt genau dieser Betrag das Geschaeft — 3 von 5 waeren ohne ihn Verluste.
Deshalb rechnet dieses Werkzeug BEIDE Faelle: mit Versanderloes und ohne (Gratis-Schwelle).

⚠️ unitCost FEHLT heisst UNBEKANNT, nicht 0. Solche Varianten zaehlen in eine eigene Spalte
   und werden NIE als "hohe Marge" gefuehrt — genau der Fehler, den preis_marge.mjs oben nennt.

   python3 tools/marge_wahrheit.py [export.jsonl]
   python3 tools/marge_wahrheit.py --selbsttest
"""
import json, sys, collections

GEB_P, GEB_F, FX = 0.029, 0.30, 0.015
VERSAND = 7.00   # was die Kundin unter der Schwelle zahlt

def netto(preis, ek, versand=0.0):
    """Was bleibt. `versand` = Versanderloes der Kundin (0 = Gratisversand)."""
    ein = preis + versand
    return ein - ek - (ein * GEB_P + GEB_F) - ein * FX

def mindestpreis(ek, versand=0.0):
    """Preis, bei dem exakt null uebrig bleibt."""
    return (ek + GEB_F) / (1 - GEB_P - FX) - versand

def selbsttest():
    f = 0
    # Am echten Fall geeicht: #1015 war ein Verlust, #1014 ein guter Verkauf.
    # An den ECHTEN Bestellungen geeicht (Warenwert, EK, Versanderloes 7.-):
    # mit Versanderloes war KEINE ein Verlust, ohne ihn waeren es drei gewesen.
    for name, preis, ek, vers, soll_verlust in [
        ("#1015 mit Versand", 15.90, 20.84, 7.0, False),
        ("#1015 ohne Versand",15.90, 20.84, 0.0, True),
        ("#1011 mit Versand", 14.90, 16.92, 7.0, False),
        ("#1011 ohne Versand",14.90, 16.92, 0.0, True),
        ("#1014 mit Versand", 34.90, 19.45, 7.0, False),
        ("#1014 ohne Versand",34.90, 19.45, 0.0, False),
    ]:
        ist = netto(preis, ek, vers) <= 0
        if ist != soll_verlust:
            print(f"FEHLER {name}: netto {netto(preis,ek):.2f}, erwartet Verlust={soll_verlust}"); f += 1
    # Die Umkehrfunktion muss zum Nulldurchgang passen.
    for ek in (5.0, 20.84, 60.0):
        for vers in (0.0, 7.0):
            p = mindestpreis(ek, vers)
            if abs(netto(p, ek, vers)) > 0.01:
                print(f"FEHLER Mindestpreis EK {ek} Versand {vers}: {netto(p,ek,vers):.4f}"); f += 1
            if netto(p - 0.10, ek, vers) >= 0:
                print(f"FEHLER 10 Rp darunter nicht negativ (EK {ek}, Versand {vers})"); f += 1
    # Unbekannter EK darf NIE als Gewinn durchgehen -> wird ausserhalb behandelt, hier nur Doku.
    print("SELBSTTEST: %d Fehler" % f)
    return f

def main(pfad):
    preis_von, ek_von, titel = {}, {}, {}
    for zeile in open(pfad, encoding="utf-8"):
        o = json.loads(zeile)
        i = o["id"]
        if "/Product/" in i:
            titel[i] = o.get("title", "")
        elif "/ProductVariant/" in i:
            p = o.get("__parentId")
            try: preis = float(o.get("price") or 0)
            except ValueError: continue
            uc = ((o.get("inventoryItem") or {}).get("unitCost") or {}).get("amount")
            preis_von.setdefault(p, []).append((i, preis, o.get("sku") or ""))
            if uc is not None:
                ek_von[i] = float(uc)

    verlust, knapp, ok, unbekannt = [], 0, 0, 0
    for pid, vs in preis_von.items():
        for vid, preis, sku in vs:
            if vid not in ek_von:
                unbekannt += 1; continue
            # Der harte Fall: Gratisversand (Korb ueber der Schwelle) — dort gibt es
            # keinen Versanderloes, der einen zu knappen Preis auffaengt.
            n = netto(preis, ek_von[vid], 0.0)
            if n <= 0:   verlust.append((n, preis, ek_von[vid], titel.get(pid, "")[:52], sku))
            elif n < 3:  knapp += 1
            else:        ok += 1

    ges = len(verlust) + knapp + ok + unbekannt
    print(f"AKTIVE VARIANTEN GESAMT: {ges}")
    print(f"  mit bekanntem Einkaufspreis : {ges-unbekannt}")
    print(f"  ohne Einkaufspreis (UNBEKANNT, nicht 0): {unbekannt}\n")
    print(f"  🔴 VERLUST sobald der Versand gratis ist: {len(verlust)}")
    print(f"  🟡 unter CHF 3 Gewinn        : {knapp}")
    print(f"  🟢 ab CHF 3 Gewinn           : {ok}")
    if verlust:
        s = sum(v[0] for v in verlust)
        print(f"\n  Summe, wenn JEDE einmal im Gratisversand verkauft wuerde: CHF {s:.2f}")
        print(f"  Schlimmste zehn:")
        for n, preis, ek, t, sku in sorted(verlust)[:10]:
            print(f"   {n:8.2f}  Preis {preis:7.2f}  EK {ek:7.2f}  {t}")
    return verlust

if __name__ == "__main__":
    if "--selbsttest" in sys.argv: sys.exit(1 if selbsttest() else 0)
    main(sys.argv[1] if len(sys.argv) > 1 else "/tmp/marge_export.jsonl")
