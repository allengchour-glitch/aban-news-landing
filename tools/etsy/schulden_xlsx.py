#!/usr/bin/env python3
"""Schulden-Plan Schweiz als Excel-Vorlage (für Etsy/Gumroad). Monat-für-Monat-Tilgungsplan nur mit Formeln.

    pip install openpyxl && python3 tools/etsy/schulden_xlsx.py
    → content/etsy/schulden-plan/Schulden-Plan-Schweiz.xlsx

Rechenlogik identisch mit tools/schulden/engine.js: Zins auflaufen (Jahreszins/12), Mindestraten zahlen,
dann Extra + frei gewordene Raten nach Reihenfolge (Lawine: höchster Zins zuerst · Schneeball: kleinste
Schuld zuerst). Drei Rechenblätter: gewählte Methode, andere Methode, nur Mindestraten → Vergleich.
"""
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[2]
ZIEL = ROOT / "content" / "etsy" / "schulden-plan" / "dateien" / "Schulden-Plan-Schweiz.xlsx"
N, MONATE = 8, 360  # bis 8 Schulden, 30 Jahre

AKZ, CREME, LINIE, TINTE, GRAU = "B45309", "FEF3C7", "E7DFD2", "1F2937", "6B7280"
titel = Font(bold=True, size=18, color=TINTE)
fett = Font(bold=True, color=TINTE)
kopf, kopf_fill = Font(bold=True, color="FFFFFF"), PatternFill("solid", fgColor=AKZ)
eingabe, summe_fill = PatternFill("solid", fgColor="FFF2B8"), PatternFill("solid", fgColor=CREME)
rand = Border(bottom=Side(style="thin", color=LINIE))
CHF = '"CHF" #,##0;[Red]"CHF" -#,##0'
CHF2 = '"CHF" #,##0.00'
BEISPIEL = [("Kreditkarte", 3200, 12, 120), ("Kleinkredit", 15000, 7.9, 350),
            ("Auto-Leasing", 9000, 4.9, 280), ("Darlehen Familie", 2000, 0, 50)]
# Eingaben im Blatt „Plan“
R0 = 6                      # erste Schuld-Zeile
EXTRA, METHODE, START = "Plan!$C$16", "Plan!$C$17", "Plan!$C$18"


def verlauf(wb, name, methode, extra):
    """Ein Rechenblatt: Monat für Monat. methode/extra sind Formeln (Zellbezug oder Konstante)."""
    v = wb.create_sheet(name)
    v.sheet_view.showGridLines = False
    v["A1"], v["B1"] = "Methode", f"={methode}"
    v["A2"], v["B2"] = "Extra pro Monat", f"={extra}"
    v["A3"] = "Budget pro Monat"
    v["B3"] = f"=SUMPRODUCT((Plan!$C${R0}:$C${R0+N-1}>0)*Plan!$E${R0}:$E${R0+N-1})+B2"
    v["B3"].number_format = CHF
    # Pro Schuld 6 Spalten: Start · Zins · Mindestrate · Rest · Extra · Ende   (Spalte B = Monat-Pool)
    cols = lambda i: [3 + i * 6 + k for k in range(6)]
    for i in range(N):
        p = R0 + i
        c = cols(i)
        v.cell(4, c[0], f"=Plan!B{p}").font = fett
        # Reihenfolge-Wert: Lawine = Zins hoch zuerst (Gleichstand: kleiner Betrag), Schneeball = kleiner Betrag zuerst
        v.cell(5, c[0], f'=IF(Plan!C{p}<=0,-1E+15,IF($B$1="Lawine",Plan!D{p}*1E+9-Plan!C{p},-Plan!C{p}*1000+Plan!D{p}))')
        v.cell(5, c[1], "Rang")
        for j, t in enumerate(["Start", "Zins", "Mindestrate", "Rest", "Extra", "Ende"]):
            z = v.cell(6, c[j], t)
            z.font, z.fill = kopf, kopf_fill
    scores = ",".join(f"{L(cols(i)[0])}$5" for i in range(N))
    for i in range(N):
        c = cols(i)
        sc = f"{L(c[0])}$5"
        vorher = ",".join(f"{L(cols(j)[0])}$5" for j in range(i)) or None
        # Rang = 1 + Anzahl höherer Werte + Gleichstände weiter oben (Zeilenreihenfolge)
        gleich = "+".join(f"({L(cols(j)[0])}$5={sc})" for j in range(i)) or "0"
        hoeher = "+".join(f"({L(cols(j)[0])}$5>{sc})" for j in range(N))
        v.cell(5, c[2], f"=1+{hoeher}+{gleich}")
    v["A6"], v["B6"] = "Monat", "frei für Extra"
    for z in (v["A6"], v["B6"]):
        z.font, z.fill = kopf, kopf_fill
    rang = lambda i: f"{L(cols(i)[2])}$5"
    for m in range(1, MONATE + 1):
        r = 6 + m
        v.cell(r, 1, m)
        mins = "+".join(f"{L(cols(i)[2])}{r}" for i in range(N))
        v.cell(r, 2, f"=MAX(0,$B$3-({mins}))").number_format = CHF2
        for i in range(N):
            c = cols(i)
            p = R0 + i
            S, Z, M, RE, EX, EN = (f"{L(x)}{r}" for x in c)
            v.cell(r, c[0], f"=MAX(0,Plan!C{p})" if m == 1 else f"={L(c[5])}{r-1}")
            v.cell(r, c[1], f"={S}*Plan!D{p}/100/12")
            v.cell(r, c[2], f"=MIN(Plan!E{p},{S}+{Z})")
            v.cell(r, c[3], f"={S}+{Z}-{M}")
            vor = "+".join(f"({rang(j)}<{rang(i)})*{L(cols(j)[3])}{r}" for j in range(N) if j != i)
            v.cell(r, c[4], f"=MIN({RE},MAX(0,$B{r}-({vor})))")
            v.cell(r, c[5], f"=IF({RE}-{EX}<0.005,0,{RE}-{EX})")
    last = 6 + MONATE
    # Kennzahlen je Blatt (oben rechts in Zeile 1–3 hinter den Blöcken)
    k = 3 + N * 6 + 1
    ende_cols = [L(cols(i)[5]) for i in range(N)]
    zins_cols = [L(cols(i)[1]) for i in range(N)]
    v.cell(1, k, "Zinsen total")
    v.cell(1, k + 1, "=" + "+".join(f"SUM({c}7:{c}{last})" for c in zins_cols)).number_format = CHF2
    v.cell(2, k, "Schuldenfrei nach Monaten")
    # Hilfsspalte „offen total“ je Monat — bewusst KEINE Matrixformel (INDEX((A)+(B),0) rechnet Google Sheets
    # nicht verlässlich). MATCH auf eine normale Spalte funktioniert in Excel, Sheets und LibreOffice gleich.
    ht = L(k + 3)
    v.cell(6, k + 3, "offen total").font = fett
    for m in range(1, MONATE + 1):
        r = 6 + m
        v.cell(r, k + 3, "=" + "+".join(f"{c}{r}" for c in ende_cols))
    v.cell(2, k + 1, f'=IFERROR(MATCH(0,{ht}7:{ht}{last},0),"über 30 Jahre")')
    for i in range(N):
        v.cell(3, cols(i)[0], "frei ab Monat")
        c = L(cols(i)[5])
        v.cell(3, cols(i)[1], f'=IF(Plan!C{R0+i}<=0,"",IFERROR(MATCH(0,{c}7:{c}{last},0),"über 30 J."))')
    v.freeze_panes = "C7"
    return v, k


def main():
    wb = Workbook()
    p = wb.active
    p.title = "Plan"
    p.sheet_view.showGridLines = False
    for col, w in zip("ABCDEFG", [3, 30, 15, 12, 15, 16, 22]):
        p.column_dimensions[col].width = w
    p["B1"] = "Schulden-Plan Schweiz"
    p["B1"].font = titel
    p["B2"] = "Gelbe Felder ausfüllen. Der Plan rechnet Monat für Monat, wann du schuldenfrei bist."
    p["B2"].font = Font(color=GRAU, italic=True)
    for c, t in zip("BCDEFG", ["Schuld", "Offen (CHF)", "Zins % p. a.", "Rate pro Monat", "Schuldenfrei (Monat)", "Warnung"]):
        z = p[f"{c}5"]
        z.value, z.font, z.fill = t, kopf, kopf_fill
    for i in range(N):
        r = R0 + i
        n, bet, zins, rate = BEISPIEL[i] if i < len(BEISPIEL) else ("", 0, 0, 0)
        for c, val, fmt in (("B", n, None), ("C", bet, CHF), ("D", zins, "0.0"), ("E", rate, CHF)):
            z = p[f"{c}{r}"]
            z.value, z.fill = val, eingabe
            if fmt:
                z.number_format = fmt
        p[f"G{r}"] = f'=IF(AND(C{r}>0,E{r}<=C{r}*D{r}/100/12),"Rate deckt Zins nicht!","")'
        p[f"G{r}"].font = Font(color="B91C1C", bold=True)
        for c in "BCDEFG":
            p[f"{c}{r}"].border = rand
    p["B16"], p["C16"] = "Extra pro Monat (CHF)", 300
    p["B17"], p["C17"] = "Methode", "Lawine"
    p["B18"], p["C18"] = "Startmonat", "=DATE(YEAR(TODAY()),MONTH(TODAY())+1,1)"
    for c in ("C16", "C17", "C18"):
        p[c].fill = eingabe
    p["C16"].number_format, p["C18"].number_format = CHF, "MMM YYYY"
    p["D17"] = "Lawine = höchster Zins zuerst (günstigste) · Schneeball = kleinste Schuld zuerst"
    p["D17"].font = Font(color=GRAU, italic=True)
    dv = DataValidation(type="list", formula1='"Lawine,Schneeball"')
    p.add_data_validation(dv)
    dv.add("C17")

    gew, k = verlauf(wb, "Monatsplan", METHODE, EXTRA)
    andere, _ = verlauf(wb, "Rechnung andere Methode", f'IF({METHODE}="Lawine","Schneeball","Lawine")', EXTRA)
    ohne, _ = verlauf(wb, "Rechnung ohne Extra", METHODE, "0")
    for s in (andere, ohne):
        s.sheet_state = "hidden"
    kz = L(k + 1)
    for i in range(N):
        r = R0 + i
        c = 3 + i * 6 + 1
        p[f"F{r}"] = f"=Monatsplan!{L(c)}3"
        p[f"F{r}"].alignment = Alignment(horizontal="right")

    # Ergebnis
    p["B20"] = "Ergebnis"
    p["B20"].font = Font(bold=True, size=13, color=AKZ)
    erg = [
        ("Schuldenfrei nach (Monaten)", f"=Monatsplan!{kz}2", "0"),
        ("Schuldenfrei im", f'=IF(ISNUMBER(C21),EDATE(C18,C21-1),"—")', "MMMM YYYY"),
        ("Zinsen total (gewählte Methode)", f"=Monatsplan!{kz}1", CHF),
        ("Zinsen mit der anderen Methode", f"='Rechnung andere Methode'!{kz}1", CHF),
        ("Zinsen nur mit Mindestraten", f"='Rechnung ohne Extra'!{kz}1", CHF),
        ("Ersparnis durch das Extra", "=C25-C23", CHF),
        ("Schuldenfrei nur mit Mindestraten (Monate)", f"='Rechnung ohne Extra'!{kz}2", "0"),
    ]
    for i, (lab, f, fmt) in enumerate(erg):
        r = 21 + i
        p[f"B{r}"] = lab
        z = p[f"C{r}"]
        z.value, z.number_format, z.font, z.fill = f, fmt, fett, summe_fill
        p[f"B{r}"].border = z.border = rand
    p["B29"] = ('Tipp: Die Lawine kostet am wenigsten Zins. Der Schneeball bringt schneller ein erstes Erfolgserlebnis. '
                'Nimm die Methode, bei der du durchhältst.')
    p["B29"].font = Font(color=GRAU, italic=True)
    p.conditional_formatting.add(f"C{R0}:E{R0+N-1}", FormulaRule(formula=[f'$G{R0}<>""'], fill=PatternFill("solid", fgColor="FEE2E2")))

    h = wb.create_sheet("Anleitung", 1)
    h.sheet_view.showGridLines = False
    h.column_dimensions["A"].width = 110
    zeilen = [
        ("Schulden-Plan Schweiz — so geht's", titel), ("", None),
        ("1. Blatt „Plan“: bis zu 8 Schulden eintragen: offener Betrag, Jahreszins aus dem Vertrag, heutige Rate.", None),
        ("2. Extra pro Monat eintragen: was du zusätzlich zahlen kannst. Auch CHF 50 zählen.", None),
        ("3. Methode wählen: Lawine (höchster Zins zuerst, günstigste) oder Schneeball (kleinste Schuld zuerst).", None),
        ("4. Ergebnis lesen: schuldenfrei-Datum, Zinsen total, Vergleich mit der anderen Methode und ohne Extra.", None),
        ("5. Blatt „Monatsplan“: Monat für Monat, was bei jeder Schuld passiert. Frei werdende Raten gehen automatisch", None),
        ("   an die nächste Schuld in der Reihenfolge.", None), ("", None),
        ("Rot in der Spalte „Warnung“: Die Rate deckt nicht einmal die Zinsen, die Schuld wächst. Das hat Vorrang.", fett),
        ("Leasing: vorzeitige Auflösung ist oft teuer. Die normale Rate laufen lassen und Extra-Geld auf andere Schulden lenken.", None),
        ("Schweiz: Private Schuldzinsen sind in der Regel von den Steuern abziehbar (Bund: bis Vermögenserträge + CHF 50'000).", None),
        ("Zuerst eine Notreserve von etwa drei Monatsausgaben, dann tilgen.", None),
        ("Hilfe, wenn es nicht aufgeht: kantonale Budget- und Schuldenberatungen, kostenlos (Übersicht: schulden.ch).", None), ("", None),
        ("Dazu gehört die Offline-App schulden-plan.html (im Browser öffnen): zusätzlich „tilgen oder investieren?“.", None), ("", None),
        ("Modellrechnung ohne Gebühren und Verzugszinsen, keine Finanz- oder Schuldenberatung. Private Nutzung.", Font(color=GRAU)),
        ("© aban news · abannews.com", Font(color=GRAU)),
    ]
    for i, (z, f) in enumerate(zeilen, 1):
        c = h.cell(i, 1, z)
        if f:
            c.font = f
    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    wb.save(ZIEL)
    print(f"→ {ZIEL.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
