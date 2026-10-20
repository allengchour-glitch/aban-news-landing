#!/usr/bin/env python3
"""cj_sku.py — EINE Quelle für «Ist das eine CJ-SKU, und welcher CJ-Stamm steckt darin?» (20.10.2026).

ANLASS (Runde 22:00, Vollmessung über alle 552'927 Shopify-Varianten): 23'186 Varianten tragen eine «nackte» CJ-SKU
(ohne «CJ-»), und die verbreitete Regel `^CJ[A-Z]{2}\\d{6,}` erkannte 3'466 davon NICHT. Es sind die Formen mit längerem
Buchstabenteil und/oder Optionsanhang:
    CJYDQXHB00011-BROWN-39     (CJ + 6 Buchstaben + 5 Ziffern + «-» + Option)      ← 3'123
    CJZBGJZZ00080-14K-15CM     (Anhang beginnt mit Ziffern)
    CJJJYSSD00017-A            (Anhang ein Buchstabe)
    CJJJJTJT22925              (Produkt-SKU ohne Anhang, 6 Buchstaben)
Folge im Bestellmotor (`cj_order_engine.ist_cj`): Bestellung gälte als «anderer Lieferant», der Kunde hätte bezahlt, bei CJ
würde NICHTS bestellt. Im Lagerabgleich (`produkt_sku`) und in den Auslistungs-Wächtern (`cj_ref`) fehlten diese Produkte
ganz — ein bei CJ ausgelistetes Produkt blieb im Verkauf. 32 Agenten (Workflow wf_becd84b7-451) fanden ~14 Stellen.

Diese Datei hat KEINE Abhängigkeiten (nur `re`), damit jeder Verbraucher sie ohne Seiteneffekte einbinden kann.

  ist_cj_form(sku)  True, wenn hinter einem optionalen «CJ-» die FORM einer CJ-Referenz steht (pid-Zahl, pid-UUID, Varianten-SKU
                    mit/ohne Anhang, Produkt-SKU-Stamm). Das Präfix allein genügt NICHT (Slugs wie «CJ-ANTIGRAV-HUMID»).
  nackt(sku)        True für CJ-SKUs ohne «CJ-» (CJYD…, CJZB…).
  stamm(sku)        productSku-Stamm für product/query, sonst None:
                       CJLS291603531EV            → CJLS2916035      (Anhang = 2 Ziffern + 2 Buchstaben, Form A)
                       CJYDQXHB00011-BROWN-39     → CJYDQXHB00011    (Anhang hinter «-», Form B)
                       CJJJJTJT22925              → CJJJJTJT22925    (Stamm ohne Anhang)
  variant_sku(sku)  die variantSku für product/query?variantSku=… (Präfix «CJ-» ab, sonst unverändert), oder None.
  form(sku)         Name der Form für Statistik/Meldung.

  python3 automation/cj_sku.py --selbsttest       Proben + Mutationsbeweis
  python3 automation/cj_sku.py --liste DATEI      Bevölkerungsprobe: erste Spalte jeder Zeile = SKU; zählt Formen, meldet «unbekannt»
"""
import re
import sys

_UUID = r"[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}"
_PRAEFIX = re.compile(r"^CJ-", re.I)
# Form A: Stamm + Varianten-Anhang (2 Ziffern + 2 Buchstaben), z. B. CJLS291603531EV → Stamm CJLS2916035
_A = re.compile(r"^(CJ[A-Z]{2,8}\d{5,9})(\d{2}[A-Z]{2})$", re.I)
# Form B: Stamm (5–9 Ziffern) mit oder ohne «-Option», z. B. CJYDQXHB00011-BROWN-39 oder CJJJJTJT22925
_B = re.compile(r"^(CJ[A-Z]{2,8}\d{5,9})(?:-.*)?$", re.I | re.S)
# Weitester Rahmen (wie cj_real_luecke.cj_form): CJ + 2–8 Buchstaben + mind. 5 Ziffern
_WEIT = re.compile(r"^CJ[A-Z]{2,8}\d{5,}", re.I)


def kern(sku):
    """SKU ohne Randleerzeichen und ohne führendes «CJ-»."""
    return _PRAEFIX.sub("", (sku or "").strip(), count=1)


def nackt(sku):
    s = (sku or "").strip()
    return bool(re.match(r"^CJ", s, re.I)) and not _PRAEFIX.match(s)


def form(sku):
    k = kern(sku)
    if not (sku or "").strip().upper().startswith("CJ"):
        return None
    if re.fullmatch(r"\d{10,20}", k):
        return "pid-zahl"
    if re.fullmatch(_UUID, k):
        return "pid-uuid"
    if _A.match(k):
        return "variante-a"
    m = _B.match(k)
    if m:
        return "variante-b" if "-" in k[len(m.group(1)):] else "stamm"
    if _WEIT.match(k):
        return "weit"
    return None


def ist_cj_form(sku):
    return form(sku) is not None


def stamm(sku):
    k = kern(sku)
    if not k.upper().startswith("CJ"):
        return None
    m = _A.match(k)
    if m:
        return m.group(1).upper()
    m = _B.match(k)
    if m:
        return m.group(1).upper()
    return None


def variant_sku(sku):
    """variantSku für CJ; None, wenn die SKU keine Varianten-/Stamm-Form ist (pid-Formen haben keine)."""
    if form(sku) in ("variante-a", "variante-b", "stamm", "weit"):
        return kern(sku)
    return None


# Alte Regel der Auslistungs-Wächter (cj_ausgelistet_sichtbar/ek_luecke_cj): bleibt für alles, was sie traf, unverändert variantSku
_ALT_VAR = re.compile(r"^(?:CJ-)?(CJ[A-Z]{2,4}[0-9]{6,}[A-Z0-9]*)$")


def abfrage(sku):
    """→ (feld, wert) für CJ `product/query?<feld>=<wert>` oder None, wenn die SKU keine CJ-Referenz ist.
       pid-Zahl/UUID hinter «CJ-»        → ('pid', pid)
       alles, was die alte Wächter-Regel traf → ('variantSku', …) — unverändert, damit bestehende Urteile gleich bleiben
       Optionsanhang («CJYDQXHB00011-BROWN-39») → ('variantSku', ganze SKU ohne «CJ-»); Wert VOR dem Einsetzen in eine URL quoten
       Stamm ohne Anhang («CJJJJTJT22925») → ('productSku', Stamm)  — als variantSku gäbe CJ «nicht gefunden»
    Der Wert wird NICHT ge-quotet (Leerzeichen kommen vor): urllib.parse.quote(wert, safe='') beim Bauen der URL."""
    s = (sku or "").strip()
    f = form(s)
    if f is None:
        return None
    k = kern(s)
    if f in ("pid-zahl", "pid-uuid"):
        return ("pid", k) if _PRAEFIX.match(s) else None
    m = _ALT_VAR.match(s.upper())
    if m:
        return ("variantSku", m.group(1))
    if f == "stamm":
        return ("productSku", stamm(s))
    return ("variantSku", k)


def _selbsttest():
    faelle = []

    def ok(name, bedingung):
        faelle.append((name, bool(bedingung)))

    gut = ["CJYD225829901AZ", "CJ-CJYD225829901AZ", "CJLS291603531EV", "CJJJJTJT22925", "CJYDQXHB00011-BROWN-39",
           "CJZBGJZZ00080-14K-15CM", "CJJJJFKD00942-3STYLE-30X50CM", "CJJJCWGX00422-S-GOLDEN", "CJJJYSSD00017-A",
           "CJBJPFMZ00313-S0482A813 STYLE-Q10PCS", "CJXFLPJY00276-3", "CJJZGJSD00830-A 6INCH", "CJJZGJSD00802-7.5X7.5CM-Q4PCS",
           "cj-cjyd225829901az", "CJ-2608071241571604000", "CJ-65D5329E-AA72-4C3A-9F00-1234567890AB", "CJBJMRJF00040-EU plug"]
    for s in gut:
        ok(f"erkannt: {s}", ist_cj_form(s))
    schlecht = ["", None, "fortura-123456", "bb-1234567", "LX-BUNDLE-ABC", "5599797_4012", "WATCH-001", "CJ-ANTIGRAV-HUMID", "cj-bag-capri",
                "CJ", "CJ-", "CJYD12", "XCJYD225829901AZ", "CJ 123"]
    for s in schlecht:
        ok(f"verworfen: {s!r}", not ist_cj_form(s))
    # Stamm für product/query
    erwartet = {"CJLS291603531EV": "CJLS2916035", "CJ-CJLS291603531EV": "CJLS2916035", "CJYDQXHB00011-BROWN-39": "CJYDQXHB00011",
                "CJJJJTJT22925": "CJJJJTJT22925", "CJXFLPJY00276-3": "CJXFLPJY00276", "cjyd225829901az": "CJYD2258299",
                "CJBJMRJF00040-EU plug": "CJBJMRJF00040", "CJ-2608071241571604000": None, "fortura-1": None, "": None}
    for s, soll in erwartet.items():
        ok(f"Stamm {s!r} → {soll!r}", stamm(s) == soll)
    ok("variant_sku behält Option und Leerzeichen", variant_sku("CJ-CJBJMRJF00040-EU plug") == "CJBJMRJF00040-EU plug")
    ok("variant_sku für pid-Form = None", variant_sku("CJ-2608071241571604000") is None)
    ok("nackt: ohne Präfix wahr, mit Präfix falsch", nackt("CJYD225829901AZ") and not nackt("CJ-CJYD225829901AZ") and not nackt("fortura-1"))
    # abfrage(): welches CJ-Feld
    ok("abfrage pid", abfrage("CJ-2608071241571604000") == ("pid", "2608071241571604000"))
    ok("abfrage pid ohne Präfix = keine CJ-Referenz", abfrage("2608071241571604000") is None)
    ok("abfrage alte Form bleibt variantSku", abfrage("CJ-CJLY291609201AZ") == ("variantSku", "CJLY291609201AZ") and abfrage("CJYD304327501AZ") == ("variantSku", "CJYD304327501AZ"))
    ok("abfrage Optionsanhang = variantSku mit Anhang", abfrage("CJYDQXHB00011-BROWN-39") == ("variantSku", "CJYDQXHB00011-BROWN-39"))
    ok("abfrage Leerzeichen bleibt erhalten", abfrage("CJBJMRJF00040-EU plug") == ("variantSku", "CJBJMRJF00040-EU plug"))
    ok("abfrage Stamm ohne Anhang = productSku", abfrage("CJJJJTJT22925") == ("productSku", "CJJJJTJT22925"))
    ok("abfrage Fremd-SKU = None", abfrage("fortura-123") is None and abfrage("") is None and abfrage(None) is None)
    ok("Form-Namen", (form("CJYDQXHB00011-BROWN-39"), form("CJJJJTJT22925"), form("CJLS291603531EV"), form("CJ-2608071241571604000"))
       == ("variante-b", "stamm", "variante-a", "pid-zahl"))
    # Gegenprobe Altregel: sie hätte genau die Hyphen-Formen verfehlt
    alt = re.compile(r"^CJ[A-Z]{2}\d{6,}")
    ok("Altregel verfehlt die Hyphen-Form (Anlass)", not alt.match("CJYDQXHB00011-BROWN-39") and not alt.match("CJJJJTJT22925"))
    for n, r in faelle:
        print(("  ok   " if r else "  FEHL ") + n)
    return all(r for _, r in faelle)


def _liste(pfad):
    import collections
    z = collections.Counter(); bsp = {}
    for zeile in open(pfad, encoding="utf-8"):
        s = zeile.split("\t")[0].strip()
        if not s:
            continue
        f = form(s) or "UNBEKANNT"
        z[f] += 1; bsp.setdefault(f, s)
    for f, n in z.most_common():
        print(f"{n:7d}  {f:12s} z. B. {bsp[f]}")
    return 1 if z.get("UNBEKANNT") else 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        print("Selbsttest cj_sku:")
        sys.exit(0 if _selbsttest() else 1)
    if "--liste" in sys.argv:
        sys.exit(_liste(sys.argv[sys.argv.index("--liste") + 1]))
    print(__doc__)
